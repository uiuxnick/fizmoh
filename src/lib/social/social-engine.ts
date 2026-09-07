/**
 * The shared inbound pipeline for Facebook Messenger and Instagram DMs.
 *
 * Deliberately separate from WhatsApp's handleTextMessage (webhook/route.ts)
 * rather than a shared refactor of it — that function is booking-flow and
 * WhatsApp-specific (resumeFlow, runBotFlows, guided booking), none of which
 * this spec asks for on social. What genuinely is shared — Conversation,
 * Message, Lead, the AI provider layer, audit logs, tenant scoping — is
 * reused directly; nothing here duplicates a table or a config system.
 *
 * A reply that is not sent immediately is still a real Message row —
 * direction "BOT", status "DRAFT" — so the unified inbox has one thing to
 * render whether a reply is pending approval or already sent. "DRAFT" and
 * "PENDING_APPROVAL" are additive string values on the same status column
 * WhatsApp's own messages use (SENT/DELIVERED/READ/FAILED) — Postgres does
 * not enforce an enum here, so this never risks an existing row or query.
 */

import { raw } from "@/lib/db"
import { tenantOf, withTenant, currentTenant, type TenantContext } from "@/lib/tenant"
import { createAuditLog } from "@/lib/slots-server"
import { publish } from "@/lib/realtime"
import { messengerAdapter } from "@/lib/social/messenger-adapter"
import { instagramAdapter } from "@/lib/social/instagram-adapter"
import { detectSocialEscalation, generateSocialReply, canAutoSendReply, type Tone } from "@/lib/social/social-ai"
import { isWithinWindow } from "@/lib/review-reply-schedule"
import type { InboundSocialMessage, InboundSocialComment, SocialChannel, SocialChannelAdapter } from "@/lib/social/types"

function adapterFor(channel: SocialChannel): SocialChannelAdapter {
  return channel === "FACEBOOK" ? messengerAdapter : instagramAdapter
}

function channelLabel(channel: SocialChannel): string {
  return channel === "FACEBOOK" ? "Messenger" : "Instagram"
}

/** Resolves which tenant owns a Page/IG account from the webhook payload alone — the same pattern the public QR routes use for an unauthenticated request. */
export async function withSocialAccountTenant<T>(
  channel: SocialChannel, externalAccountId: string,
  work: (ctx: { tenant: TenantContext; account: NonNullable<Awaited<ReturnType<typeof raw.socialAccount.findFirst>>> }) => Promise<T>,
): Promise<T | { error: string; status: number }> {
  const account = await raw.socialAccount.findFirst({ where: { channel, externalAccountId } })
  if (!account) return { error: "No tenant has connected this account", status: 404 }
  const tenant = await tenantOf(account.tenantId)
  if (!tenant) return { error: "No such workspace", status: 404 }
  return withTenant(tenant, () => work({ tenant, account }))
}

export function isRouteError(v: unknown): v is { error: string; status: number } {
  return !!v && typeof v === "object" && "error" in v && "status" in v
}

const SOCIAL_PHONE_PREFIX = (channel: SocialChannel, id: string) => `social:${channel.toLowerCase()}:${id}`

async function findOrCreateCustomerAndConversation(channel: SocialChannel, senderExternalId: string, senderName: string | null) {
  const { db } = await import("@/lib/db")
  const tenant = currentTenant()
  if (!tenant?.tenantId) throw new Error("No workspace in scope")

  const customer = await db.customer.upsert({
    where: { tenantId_socialId: { tenantId: tenant.tenantId, socialId: senderExternalId } },
    create: {
      tenantId: tenant.tenantId, socialId: senderExternalId,
      phone: SOCIAL_PHONE_PREFIX(channel, senderExternalId), name: senderName,
      source: channel, channel: channel,
      socialUsername: senderName ? (channel === "INSTAGRAM" && !senderName.startsWith("@") ? `@${senderName}` : senderName) : null,
      facebookOptIn: channel === "FACEBOOK",
      instagramOptIn: channel === "INSTAGRAM",
      whatsappOptIn: false,
      optInSource: `${channel}_INBOUND`, optInAt: new Date(),
    },
    update: senderName ? {
      name: senderName,
      socialUsername: channel === "INSTAGRAM" && !senderName.startsWith("@") ? `@${senderName}` : senderName,
      channel: channel,
    } : {},
  })

  let conversation = await db.conversation.findFirst({ where: { customerId: customer.id, channel } })
  const isNew = !conversation
  if (!conversation) {
    conversation = await db.conversation.create({
      data: {
        tenantId: tenant.tenantId, customerId: customer.id, customerPhone: customer.phone,
        customerName: senderName, externalUserId: senderExternalId, channel, status: "OPEN",
      },
    })
  } else if (senderName && !conversation.customerName) {
    // The name lookup can succeed on a later message even when it failed (or
    // wasn't attempted) on the first one — backfill rather than leaving the
    // conversation stuck on the generic placeholder forever.
    conversation = await db.conversation.update({ where: { id: conversation.id }, data: { customerName: senderName } })
  }
  return { customer, conversation, isNew }
}

async function settingsFor(channel: SocialChannel) {
  const { db } = await import("@/lib/db")
  const tenant = currentTenant()
  if (!tenant?.tenantId) return null
  return db.socialAutomationSettings.findUnique({ where: { tenantId_channel: { tenantId: tenant.tenantId, channel } } })
}

async function withinRateLimits(channel: SocialChannel, dailyLimit: number, hourlyLimit: number): Promise<boolean> {
  const { db } = await import("@/lib/db")
  const dayAgo = new Date(Date.now() - 24 * 60 * 60_000)
  const hourAgo = new Date(Date.now() - 60 * 60_000)
  const [daily, hourly] = await Promise.all([
    db.message.count({ where: { direction: "BOT", status: { in: ["SENT", "DELIVERED", "READ"] }, createdAt: { gte: dayAgo }, conversation: { channel } } }),
    db.message.count({ where: { direction: "BOT", status: { in: ["SENT", "DELIVERED", "READ"] }, createdAt: { gte: hourAgo }, conversation: { channel } } }),
  ])
  return daily < dailyLimit && hourly < hourlyLimit
}

/** A very simple, honest lead capture — an email or a local-format phone number volunteered in the message, nothing inferred beyond that. */
function extractLeadContact(text: string): { email?: string; phone?: string } {
  const email = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0]
  const phone = text.match(/(\+?\d[\d\s-]{7,14}\d)/)?.[0]?.replace(/[\s-]/g, "")
  return { email, phone }
}

/** The whole inbound-DM pipeline. Called from the webhook route, already inside the owning tenant's scope. */
export async function processInboundSocialMessage(inbound: InboundSocialMessage): Promise<void> {
  const { db } = await import("@/lib/db")
  const tenant = currentTenant()
  if (!tenant?.tenantId) return

  // Idempotency: Meta retries webhook deliveries; this is the same dedup key
  // WhatsApp's own wamid uses.
  const existing = await db.message.findUnique({ where: { externalId: inbound.externalMessageId } })
  if (existing) return

  const { customer, conversation, isNew } = await findOrCreateCustomerAndConversation(inbound.channel, inbound.senderExternalId, inbound.senderName)

  await db.message.create({
    data: {
      tenantId: tenant.tenantId, conversationId: conversation.id, customerId: customer.id,
      externalId: inbound.externalMessageId, direction: "INBOUND", type: inbound.mediaType || "TEXT",
      content: inbound.text || "", mediaUrl: inbound.mediaUrl || null, createdAt: inbound.timestamp,
    },
  })
  await db.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: inbound.timestamp,
      lastMessageText: inbound.text || (inbound.mediaType ? `[${inbound.mediaType.toLowerCase()}]` : null),
      unreadCount: { increment: 1 },
    },
  })

  const preview = inbound.text || (inbound.mediaType ? `[${inbound.mediaType.toLowerCase()}]` : "")
  publish({ type: "message", conversationId: conversation.id, direction: "INBOUND", preview: preview.slice(0, 120), tenantId: tenant.tenantId })

  // Same delivery path as an inbound WhatsApp message — the browser bell via
  // OneSignal, phones via Apple push — so a DM does not go unnoticed just
  // because it arrived on a different channel.
  try {
    const { getNotificationPrefs } = await import("@/app/api/notification-prefs/route")
    const prefs = await getNotificationPrefs()
    if (prefs.NEW_MESSAGE !== false) {
      const [{ sendPush }, { pushMessage }] = await Promise.all([import("@/lib/push"), import("@/lib/device-push")])
      await Promise.all([
        sendPush({ title: customer.name || channelLabel(inbound.channel), message: preview.slice(0, 160), url: "/whatsapp", tenantId: tenant.tenantId }),
        pushMessage({ title: customer.name || channelLabel(inbound.channel), body: preview.slice(0, 160), conversationId: conversation.id, tenantId: tenant.tenantId }),
      ])
    }
  } catch (error) {
    console.error("Push for inbound social message failed:", error)
  }

  // Nothing to reply to automatically for an attachment-only message — the AI
  // grounding rules below only ever work from real text.
  if (!inbound.text) return

  const settings = await settingsFor(inbound.channel)
  if (!settings?.enabled || !settings.dmAutoReplyEnabled) return // message is in the inbox either way — just no automation
  if (conversation.automationPaused || !conversation.botActive) return

  const account = await db.socialAccount.findFirst({ where: { tenantId: tenant.tenantId, channel: inbound.channel, externalAccountId: inbound.recipientAccountId, isActive: true } })
  if (!account) return

  const earlyEscalation = detectSocialEscalation(inbound.text, Array.isArray(settings.handoffKeywords) ? settings.handoffKeywords as string[] : [])
  if (earlyEscalation.escalate) {
    await escalate(conversation.id, earlyEscalation.reason || "Customer needs a person")
    return
  }

  const excludedKeywords = Array.isArray(settings.excludedKeywords) ? (settings.excludedKeywords as string[]) : []
  if (excludedKeywords.some(w => (inbound.text || "").toLowerCase().includes(w.toLowerCase()))) {
    await escalate(conversation.id, "Message mentions an excluded topic")
    return
  }

  const { hasModule } = await import("@/lib/entitlements")
  if (canAutoSendReply(settings, false) && await hasModule("FLOWS")) {
    if (!await withinRateLimits(inbound.channel, settings.dailyMessageLimit, settings.hourlyMessageLimit)) { await escalate(conversation.id, "Reply limit reached"); return }
    const { withSocialFlowDelivery } = await import("@/lib/flow-delivery")
    const { runBotFlows, resumeFlow, runNewConversationFlow } = await import("@/lib/botflow-engine")
    const { decryptSecret } = await import("@/lib/secret-box")
    const ctx = { tenantId: tenant.tenantId, conversationId: conversation.id, customerId: customer.id,
      customerPhone: customer.phone, message: inbound.text, channel: inbound.channel }
    const result = await withSocialFlowDelivery({ adapter: adapterFor(inbound.channel), token: decryptSecret(account.accessToken), recipient: inbound.senderExternalId, beforeSend: async () => {
      const fresh = await db.conversation.findUnique({ where: { id: conversation.id } })
      const latest = await settingsFor(inbound.channel)
      if (!fresh?.botActive || fresh.automationPaused || !latest?.enabled || !latest.dmAutoReplyEnabled || !canAutoSendReply(latest, false) || !await withinRateLimits(inbound.channel, latest.dailyMessageLimit, latest.hourlyMessageLimit)) throw new Error("Social automation paused or limit reached")
    } }, async () => {
      const resumed = await resumeFlow(ctx)
      if (resumed.matched) return resumed
      const matched = await runBotFlows(ctx)
      if (matched.matched) return matched
      return isNew ? runNewConversationFlow(ctx) : matched
    })
    if (result.handoff) await escalate(conversation.id, "Flow requested a person")
    if (result.matched) return
  }

  // A brand-new conversation gets the welcome message instead of (not in
  // addition to) an AI reply to the first message — the two would double up.
  if (isNew && settings.welcomeMessage) {
    await queueOrSendReply({ channel: inbound.channel, conversation, account, text: settings.welcomeMessage, settings, isAiGenerated: false })
    return
  }

  if (!isWithinWindow(new Date(), settings.timezone, settings.businessHoursStart || "00:00", settings.businessHoursEnd || "23:59") && settings.awayMessage) {
    await queueOrSendReply({ channel: inbound.channel, conversation, account, text: settings.awayMessage, settings, isAiGenerated: false })
    return
  }

  const keywordRules = await db.socialKeywordReply.findMany({ where: { tenantId: tenant.tenantId, channel: inbound.channel, isActive: true } })
  const matchedKeyword = keywordRules.find(rule =>
    rule.keywords.split(",").map(k => k.trim().toLowerCase()).filter(Boolean).some(k => (inbound.text || "").toLowerCase().includes(k)),
  )
  if (matchedKeyword) {
    await queueOrSendReply({ channel: inbound.channel, conversation, account, text: matchedKeyword.reply, settings, isAiGenerated: false })
    return
  }

  const extraKeywords = Array.isArray(settings.handoffKeywords) ? (settings.handoffKeywords as string[]) : []
  const escalation = detectSocialEscalation(inbound.text, extraKeywords)
  if (escalation.escalate) {
    await escalate(conversation.id, escalation.reason || "Flagged for review")
    // Still worth a drafted reply for the human to review quickly, never sent automatically.
  }

  const withinLimits = await withinRateLimits(inbound.channel, settings.dailyMessageLimit, settings.hourlyMessageLimit)
  if (!withinLimits) {
    await escalate(conversation.id, "Daily or hourly reply limit reached")
    return
  }

  const history = await db.message.findMany({
    where: { conversationId: conversation.id }, orderBy: { createdAt: "desc" }, take: 6,
  })
  const tenantRow = await db.tenant.findUnique({ where: { id: tenant.tenantId }, select: { name: true } })

  let replyText: string
  try {
    replyText = await generateSocialReply({
      message: inbound.text || "",
      businessName: tenantRow?.name || "",
      businessInfo: (settings.businessInfo as Record<string, unknown>) || null,
      customInstructions: settings.customInstructions,
      tone: settings.tone as Tone,
      customTone: settings.customTone,
      language: "Match the customer's latest message",
      history: history.reverse().map(m => ({ role: m.direction === "INBOUND" ? "user" as const : "assistant" as const, content: m.content })),
    })
  } catch (error) {
    console.error("Social reply generation failed; handing off")
    if (settings.fallbackReply) await queueOrSendReply({ channel: inbound.channel, conversation, account, text: settings.fallbackReply, settings, isAiGenerated: false, forceDraft: true })
    await escalate(conversation.id, "AI could not draft a reply")
    return
  }

  await queueOrSendReply({
    channel: inbound.channel, conversation, account, text: replyText, settings,
    isAiGenerated: true, forceDraft: escalation.escalate,
  })

  const lead = extractLeadContact(inbound.text || "")
  if (lead.email || lead.phone) {
    await db.lead.create({
      data: {
        tenantId: tenant.tenantId, conversationId: conversation.id, customerId: customer.id,
        flowName: `${inbound.channel}_DM`, answers: { ...lead, channel: inbound.channel }, status: "NEW",
      },
    })
    await createAuditLog({ action: "SOCIAL_LEAD_CAPTURED", entity: "Lead", entityId: conversation.id, details: lead })
  }
}

async function escalate(conversationId: string, reason: string) {
  const { db } = await import("@/lib/db")
  const conversation = await db.conversation.findUnique({ where: { id: conversationId } })
  const labels = Array.isArray(conversation?.labels) ? conversation.labels.map(String) : []
  await db.conversation.update({ where: { id: conversationId }, data: { automationPaused: true, status: "PENDING", labels: [...new Set([...labels, reason])] } })
  await createAuditLog({ action: "SOCIAL_CONVERSATION_ESCALATED", entity: "Conversation", entityId: conversationId, details: { reason } })
}

interface QueueParams {
  channel: SocialChannel
  conversation: { id: string; tenantId: string | null }
  account: { id: string; accessToken: string }
  text: string
  settings: { mode: string; requireApproval: boolean; fullyAutomaticConfirmedByOwner: boolean; replyDelaySeconds?: number }
  isAiGenerated: boolean
  forceDraft?: boolean
}

/**
 * Sends immediately only when AUTOMATIC mode is on, the owner has explicitly
 * confirmed it, approval is not otherwise required, and nothing forced a
 * draft (an escalation). Every other case creates the same Message row with
 * status DRAFT — visible and actionable in the inbox, sent only when a
 * person approves it.
 */
async function queueOrSendReply(params: QueueParams) {
  const { db } = await import("@/lib/db")
  const { decryptSecret } = await import("@/lib/secret-box")
  const tenant = currentTenant()
  if (!tenant?.tenantId) return

  const canAutoSend = canAutoSendReply(params.settings, params.forceDraft || false)

  const conversationWithRecipient = await db.conversation.findUnique({ where: { id: params.conversation.id } })
  if (!conversationWithRecipient?.externalUserId) return

  if (!canAutoSend) {
    await db.message.create({
      data: {
        tenantId: tenant.tenantId, conversationId: params.conversation.id, direction: "BOT", type: "TEXT",
        content: params.text, status: "DRAFT", isAiGenerated: params.isAiGenerated,
      },
    })
    return
  }

  await db.$transaction(async tx => {
    const message = await tx.message.create({ data: {
      tenantId: tenant.tenantId, conversationId: params.conversation.id, direction: "BOT", type: "TEXT",
      content: params.text, status: "QUEUED", isAiGenerated: params.isAiGenerated,
    } })
    await tx.socialReplyJob.create({ data: { tenantId: tenant.tenantId, messageId: message.id, accountId: params.account.id,
      recipientId: conversationWithRecipient.externalUserId!, channel: params.channel,
      dueAt: new Date(Date.now() + (params.settings.replyDelaySeconds || 0) * 1000),
    } })
  })
  if (!params.settings.replyDelaySeconds) {
    const { runSocialReplyQueue } = await import("./social-reply-queue")
    await runSocialReplyQueue()
  }
}

/** A staff member typing a brand-new reply into the inbox, not editing an AI draft. Media is sent as an attachment, exactly like WhatsApp's own composer; content becomes the caption stored on the row (Meta's Send API itself has no separate caption field). */
export async function sendNewSocialMessage(
  conversationId: string, staffId: string, text: string,
  media?: { url: string; type: "IMAGE" | "VIDEO" | "AUDIO" | "FILE" } | null,
): Promise<{ ok: boolean; error?: string }> {
  const { db } = await import("@/lib/db")
  const { decryptSecret } = await import("@/lib/secret-box")
  const conversation = await db.conversation.findUnique({ where: { id: conversationId } })
  if (!conversation || !conversation.externalUserId) return { ok: false, error: "This conversation has no channel recipient" }

  const account = await db.socialAccount.findFirst({ where: { tenantId: conversation.tenantId || undefined, channel: conversation.channel, isActive: true } })
  if (!account) return { ok: false, error: "No active connected account for this channel" }

  const adapter = adapterFor(conversation.channel as SocialChannel)
  const token = decryptSecret(account.accessToken)
  const result = media
    ? await adapter.sendAttachment(token, conversation.externalUserId, media.url, media.type)
    : await adapter.sendText(token, conversation.externalUserId, text)

  await db.message.create({
    data: {
      tenantId: conversation.tenantId, conversationId, direction: "BOT", type: media?.type || "TEXT",
      content: text, mediaUrl: media?.url || null, status: result.ok ? "SENT" : "FAILED",
      isAiGenerated: false, senderId: staffId, externalId: result.externalMessageId,
    },
  })
  if (result.ok) {
    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date(), lastMessageText: text || (media ? `[${media.type.toLowerCase()}]` : null) },
    })
  }
  await createAuditLog({ staffId, action: result.ok ? "SOCIAL_REPLY_SENT" : "SOCIAL_REPLY_FAILED", entity: "Conversation", entityId: conversationId, details: { error: result.error } })
  return result.ok ? { ok: true } : { ok: false, error: result.error }
}

/** Sending a drafted or edited reply from the inbox — the manual-approval path for every mode. */
export async function sendSocialMessageNow(messageId: string, staffId: string, textOverride?: string): Promise<{ ok: boolean; error?: string }> {
  const { db } = await import("@/lib/db")
  const { decryptSecret } = await import("@/lib/secret-box")
  const message = await db.message.findUnique({ where: { id: messageId }, include: { conversation: true } })
  if (!message) return { ok: false, error: "No such message" }
  if (message.status === "SENT") return { ok: true }
  if (!message.conversation.externalUserId) return { ok: false, error: "This conversation has no channel recipient" }

  const account = await db.socialAccount.findFirst({ where: { tenantId: message.tenantId || undefined, channel: message.conversation.channel, isActive: true } })
  if (!account) return { ok: false, error: "No active connected account for this channel" }

  const text = textOverride?.trim() || message.content
  const adapter = adapterFor(message.conversation.channel as SocialChannel)
  const isComment = Array.isArray(message.conversation.labels) && message.conversation.labels.includes("COMMENT")
  const result = isComment
    ? await adapter.replyToComment(decryptSecret(account.accessToken), message.conversation.externalUserId, text)
    : await adapter.sendText(decryptSecret(account.accessToken), message.conversation.externalUserId, text)

  await db.message.update({
    where: { id: messageId },
    data: { content: text, status: result.ok ? "SENT" : "FAILED", externalId: result.externalMessageId, senderId: staffId },
  })
  await createAuditLog({ staffId, action: result.ok ? "SOCIAL_REPLY_SENT" : "SOCIAL_REPLY_FAILED", entity: "Message", entityId: messageId, details: { error: result.error } })
  return result.ok ? { ok: true } : { ok: false, error: result.error }
}

/** Regenerates a draft reply for a message that has not been sent yet. */
export async function regenerateSocialReply(messageId: string): Promise<{ ok: boolean; error?: string; text?: string }> {
  const { db } = await import("@/lib/db")
  const message = await db.message.findUnique({ where: { id: messageId }, include: { conversation: true } })
  if (!message || message.status === "SENT") return { ok: false, error: "No such draft" }

  const settings = await db.socialAutomationSettings.findUnique({
    where: { tenantId_channel: { tenantId: message.tenantId || "", channel: message.conversation.channel } },
  })
  const tenantRow = await db.tenant.findUnique({ where: { id: message.tenantId || undefined }, select: { name: true } })
  const priorInbound = await db.message.findFirst({
    where: { conversationId: message.conversationId, direction: "INBOUND" }, orderBy: { createdAt: "desc" },
  })

  try {
    const text = await generateSocialReply({
      message: priorInbound?.content || "",
      businessName: tenantRow?.name || "",
      businessInfo: (settings?.businessInfo as Record<string, unknown>) || null,
      customInstructions: settings?.customInstructions || null,
      tone: (settings?.tone as Tone) || "professional",
      customTone: settings?.customTone || null,
      language: "en",
      history: [],
    })
    await db.message.update({ where: { id: messageId }, data: { content: text } })
    return { ok: true, text }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Regeneration failed" }
  }
}
