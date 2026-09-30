import { withErrors } from "@/lib/api-handler"
import { storeMedia } from "@/lib/media-store"
import { NextRequest, NextResponse } from "next/server"
import { after } from "next/server"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { verifyWebhookSignature, downloadMedia, downloadMediaBytes, sendInteractiveMessage, sendCtaUrlMessage, getWhatsAppConfig, showTyping, showTypingWithReadReceipt } from "@/lib/whatsapp"
import { aiChat, detectIntent, analyzePaymentScreenshot, transcribeAudio } from "@/lib/ai"
import { sendWhatsApp } from "@/lib/notifications"
import { formatCurrency, formatDate } from "@/lib/helpers"
import { confirmOrderOnce, sendOrderConfirmationWA } from "@/lib/confirm-order"
import { sessionExpiryFrom } from "@/lib/whatsapp-session"
import { runBotFlows, resumeFlow, flowWouldMatch, runNewConversationFlow } from "@/lib/botflow-engine"
import { shouldSendAwayMessage } from "@/lib/business-hours"
import { publish, notifyStaff } from "@/lib/realtime"
import { rememberCall, forgetCall } from "@/lib/live-calls"
import { tenantForPhoneNumberId } from "@/lib/whatsapp-accounts"
import { withTenant, currentTenant } from "@/lib/tenant"
import { getConfigValue } from "@/lib/app-config"
import {
  isOptInMessage,
  isOptOutMessage,
  recordOptIn,
  recordOptOut,
  OPT_IN_CONFIRMATION,
  OPT_OUT_CONFIRMATION,
} from "@/lib/optout"

/**
 * WhatsApp Webhook Handler (Meta Cloud API)
 *
 * Per BRD §6.5: Conversational Commerce
 * - Receives messages from WhatsApp
 * - Stores in conversation
 * - AI assistant auto-responds (if bot active)
 * - Handles: availability, booking, order status, payment screenshots, FAQs
 * - Human handoff when needed
 */

export const GET = withErrors(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  // Read through the same resolver the rest of the integration uses, so a
  // token set in the admin panel works as well as one set in the environment.
  const { webhookVerifyToken } = await getWhatsAppConfig()
  const verifyToken = webhookVerifyToken

  if (mode === "subscribe" && verifyToken && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
})

export const POST = withErrors(async (request: NextRequest) => {
  const bodyText = await request.text()

  const signature = request.headers.get("x-hub-signature-256") || ""
  const replay = request.headers.get("x-fizmoh-replay") === process.env.CRON_SECRET
  if (!replay && !(await verifyWebhookSignature(bodyText, signature))) {
    console.error("WhatsApp webhook signature verification FAILED")
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let body: any
  try {
    body = JSON.parse(bodyText)
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  if (!body.object) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  // Acknowledge before processing. Meta retries any delivery it considers slow
  // or failed, and processing here does two sequential LLM round-trips — a
  // synchronous handler turns every slow model call into a duplicate delivery.
  after(async () => {
    try {
      await processWebhook(body)
    } catch (error) {
      console.error("WhatsApp webhook processing error:", error)
    }
  })

  return NextResponse.json({ success: true })
})

// ─── Message parsing ───

function parseMessage(msg: any): { content: string; mediaId: string | null; messageType: string } {
  const type = msg.type

  if (type === "text") {
    return { content: msg.text?.body || "", mediaId: null, messageType: "TEXT" }
  }
  if (type === "sticker") {
    return { content: "[sticker]", mediaId: msg.sticker?.id || null, messageType: "STICKER" }
  }
  if (type === "image") {
    return { content: "[Image]", mediaId: msg.image?.id || null, messageType: "IMAGE" }
  }
  if (type === "audio") {
    return { content: "[Voice note]", mediaId: msg.audio?.id || null, messageType: "AUDIO" }
  }
  if (type === "interactive") {
    const content = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "[Interactive]"
    return { content, mediaId: null, messageType: "INTERACTIVE" }
  }
  if (type === "document") {
    return { content: `[Document: ${msg.document?.filename || "file"}]`, mediaId: msg.document?.id || null, messageType: "DOCUMENT" }
  }
  if (type === "location") {
    return { content: `[Location: ${msg.location?.latitude}, ${msg.location?.longitude}]`, mediaId: null, messageType: "LOCATION" }
  }
  if (type === "button") {
    return { content: msg.button?.text || "[Button]", mediaId: null, messageType: "BUTTON" }
  }
  if (type === "order") {
    const items = msg.order?.product_items || []
    const summary = items.map((i: any) => `${i.quantity}x ${i.product_retailer_id}`).join(", ")
    const notes = msg.order?.text ? ` (Notes: ${msg.order.text})` : ""
    return { content: `[WhatsApp Cart Order: ${summary}]${notes}`, mediaId: null, messageType: "ORDER" }
  }
  return { content: `[${type}]`, mediaId: null, messageType: "TEXT" }
}
/**
 * Phone number patterns always allowed through the bot gate, regardless of
 * tenant-level bot_enabled / bot_whitelist_only settings.
 *
 * These are the platform development numbers. Per-tenant test numbers should
 * be added through the dashboard (Settings → Bot → Whitelist), which writes
 * them to the "bot_whitelist" systemSetting key and is read at runtime by
 * isTestPhoneNumber() so no deploy is needed.
 */
const PLATFORM_WHITELIST_PATTERNS = [
  "97684646",
  "91711089",
  "9545775",
  "77174255",
  "7717425",
  "98314456",
]

async function getTenantWhitelistPatterns(): Promise<string[]> {
  try {
    const raw = (await getConfigValue("bot_whitelist").catch(() => "")).trim()
    if (!raw) return []
    // Stored as comma- or newline-separated phone fragments
    return raw.split(/[,\n]+/).map(s => s.trim().replace(/\D/g, "")).filter(Boolean)
  } catch {
    return []
  }
}

async function isTestPhoneNumber(phone?: string | null): Promise<boolean> {
  if (!phone) return false
  const digits = phone.replace(/\D/g, "")
  if (PLATFORM_WHITELIST_PATTERNS.some(p => digits.includes(p))) return true
  const tenantPatterns = await getTenantWhitelistPatterns()
  return tenantPatterns.some(p => p && digits.includes(p))
}

// ─── Conversation resolution ───

async function resolveConversation(from: string, customerName: string, customerId: string) {
  const isWhitelisted = await isTestPhoneNumber(from)

  const aiAssistantOn = (await getConfigValue("ai_assistant_enabled").catch(() => "")).trim().toLowerCase()
  const botOn = (await getConfigValue("bot_enabled").catch(() => "")).trim().toLowerCase()
  const waBotOn = (await getConfigValue("wa_bot_enabled").catch(() => "")).trim().toLowerCase()
  const autoReplyOn = (await getConfigValue("auto_reply_enabled").catch(() => "")).trim().toLowerCase()
  const whitelistOnly = (await getConfigValue("bot_whitelist_only").catch(() => "")).trim().toLowerCase()
  const isWhitelistOnly = whitelistOnly === "true" || whitelistOnly === "1"

  const anyExplicitlyEnabled =
    aiAssistantOn === "true" || aiAssistantOn === "1" || aiAssistantOn === "on" ||
    waBotOn === "true" || waBotOn === "1" || waBotOn === "on" ||
    botOn === "true" || botOn === "1" || botOn === "on" ||
    autoReplyOn === "true" || autoReplyOn === "1" || autoReplyOn === "on"

  const allExplicitlyDisabled =
    (aiAssistantOn === "false" || aiAssistantOn === "off" || aiAssistantOn === "0") &&
    (waBotOn === "false" || waBotOn === "off" || waBotOn === "0") &&
    (botOn === "false" || botOn === "off" || botOn === "0")

  const isBotDisabledForTenant = allExplicitlyDisabled && !anyExplicitlyEnabled

  // Whitelisted numbers always get the bot. Other numbers only if tenant hasn't disabled it and not whitelist-only.
  const isBotActive = isWhitelisted || (!isBotDisabledForTenant && !isWhitelistOnly)

  // Prefer a live conversation. A CLOSED one is reopened rather than duplicated
  // so the agent keeps the full history on the thread.
  const existing = await db.conversation.findFirst({
    where: { customerPhone: from },
    orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
  })

  if (existing) {
    if (isWhitelisted) {
      if (!existing.botActive || existing.automationPaused) {
        return db.conversation.update({
          where: { id: existing.id },
          data: { status: "OPEN", botActive: true, automationPaused: false },
        })
      }
    } else if (existing.automationPaused || !existing.botActive) {
      // If a customer writes back to an old closed/resolved conversation, reopen fresh with AI:
      if (existing.status === "CLOSED" || existing.status === "RESOLVED") {
        return db.conversation.update({
          where: { id: existing.id },
          data: { status: "OPEN", botActive: isBotActive, automationPaused: !isBotActive },
        })
      }
      // Ongoing conversation paused by human/tenant reply: AI MUST REMAIN OFF until manually turned on!
      return existing
    } else if (existing.status === "CLOSED" || existing.status === "RESOLVED" || existing.status === "SNOOZED") {
      return db.conversation.update({
        where: { id: existing.id },
        data: { status: "OPEN", botActive: isBotActive, automationPaused: !isBotActive },
      })
    }
    return existing
  }

  // Brand new conversation: AI is enabled by default for all incoming customers!
  return db.conversation.create({
    data: {
      customerPhone: from,
      customerName,
      customerId,
      status: "OPEN",
      botActive: isBotActive,
      automationPaused: !isBotActive,
      assignedStaffId: null, // do not lock to human agent so AI handles replies until a tenant responds
      tenantId: currentTenant()?.tenantId || null,
    },
  })
}

// ─── Main processing ───

async function processWebhook(body: any) {
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      /*
       * Which business this payload is for.
       *
       * The number it was sent to is the only thing in the payload that says
       * so, and it is looked up rather than assumed. While exactly one number
       * is connected the answer is always the same — but the day a second one
       * is, this is the line that decides whose inbox a stranger's message
       * lands in.
       */
      const tenant = await tenantForPhoneNumberId(change.value?.metadata?.phone_number_id)

      /*
       * A payload nobody owns is dropped, not processed.
       *
       * It used to be handled inside `withTenant({ tenantId: "" })`, and an
       * empty string is not a workspace: the scoped Prisma client treats it as
       * "no scope" and runs every query unscoped. So an unrecognised number
       * searched every workspace's customers by phone, and could attach a
       * stranger's message to a real business's conversation — the exact thing
       * `tenantForPhoneNumberId` returns null to prevent.
       *
       * It already records the number it could not place, so this is silent
       * only in the sense that nothing is written to somebody else's inbox.
       */
      if (!tenant?.tenantId) {
        console.error(
          "[webhook] dropped a payload for an unrecognised number:",
          change.value?.metadata?.phone_number_id ?? "(none)",
        )
        continue
      }

      await withTenant(tenant, () => processChange(change))
    }
  }
}

async function processChange(change: any) {
  /*
   * The two payloads a coexistence onboarding produces.
   *
   * Both are asked for at the moment a business connects a number that is
   * still running on their phone, and both used to arrive here and be
   * dropped — so the inbox opened empty for a business that had been talking
   * to these same customers for years, which reads as "this tool lost my
   * history". They are handled before anything else because neither is a
   * message arriving now, and nothing downstream should treat them as one.
   */
  if (change.field === "history") {
    for (const chunk of change.value?.history || []) {
      await importHistoryChunk(chunk).catch(error => {
        console.error("Could not import a history chunk:", error)
      })
    }
    return
  }

  if (change.field === "smb_app_state_sync") {
    for (const entry of change.value?.state_sync || []) {
      await importContact(entry).catch(error => {
        console.error("Could not import a contact:", error)
      })
    }
    return
  }

  {
    {
      /*
       * Messages the business sent from their own phone.
       *
       * A number connected through coexistence is answered in two places: the
       * owner's WhatsApp Business app and this inbox. Meta echoes anything
       * typed on the phone under `message_echoes`, and without storing them
       * the panel shows a customer's question with no reply beside it — so
       * somebody answers again, and the customer is told the same thing twice
       * by two different people.
       *
       * They are stored as ordinary outbound messages because that is what
       * they are; only the sender differs, and the transcript should read the
       * way the conversation actually happened.
       */
      for (const echo of change.value?.message_echoes || []) {
        try {
          await processEcho(echo)
        } catch (error) {
          console.error(`Failed to process echoed message ${echo?.id}:`, error)
        }
      }

      const messages = change.value?.messages || []
      const contacts = change.value?.contacts || []

      // Meta sends one contact per unique sender, not one per message, so the
      // two arrays are not index-aligned. Key by wa_id instead.
      const contactByWaId = new Map<string, any>()
      for (const c of contacts) {
        if (c?.wa_id) contactByWaId.set(c.wa_id, c)
      }

      for (const msg of messages) {
        try {
          await processMessage(msg, contactByWaId.get(msg.from))
        } catch (error) {
          console.error(`Failed to process WhatsApp message ${msg?.id}:`, error)
        }
      }

      // Voice calls arrive under `calls` (WhatsApp Business Calling API).
      for (const call of change.value?.calls || []) {
        try {
          await processCall(call)
        } catch (error) {
          console.error(`Failed to process call ${call?.id}:`, error)
        }
      }

      // Delivery and read receipts arrive on the same webhook under `statuses`.
      // Without handling these, every outbound message stays SENT forever and
      // campaign delivered/read analytics are permanently zero.
      for (const status of change.value?.statuses || []) {
        try {
          await processStatus(status)
        } catch (error) {
          console.error(`Failed to process status for ${status?.id}:`, error)
        }
      }
    }
  }
}

/**
 * WhatsApp voice call events.
 *
 * Records the call against the customer's conversation, and — when the event
 * carries an SDP offer — holds that offer in memory and rings the apps, which
 * are the WebRTC endpoint that answers it. Meta allows roughly 30 to 60
 * seconds between this webhook and an accept, so nothing here may wait on
 * anything slow.
 */
async function processCall(call: any) {
  const from = call?.from
  const callId = call?.id
  const status = String(call?.event || call?.status || "unknown").toUpperCase()
  if (!from || !callId) return

  const offer = call?.session?.sdp_type === "offer" ? String(call.session.sdp || "") : ""
  const direction = String(call?.direction || "").toUpperCase()

  let customer = await db.customer.findFirst({ where: { phone: from } })
  if (!customer) {
    customer = await db.customer.create({
      data: {
        phone: from,
        whatsappOptIn: true,
        optInSource: "WHATSAPP_INBOUND",
        optInAt: new Date(),
        tenantId: currentTenant()?.tenantId || null,
      },
    })
  }

  const conversation = await resolveConversation(from, customer.name || "Unknown", customer.id)

  const label =
    status === "CONNECT" ? "📞 Incoming WhatsApp call"
    : status === "TERMINATE" ? "📞 Call ended"
    : `📞 Call ${status.toLowerCase()}`

  await db.message.create({
    data: {
      externalId: `call_${callId}`,
      conversationId: conversation.id,
      customerId: customer.id,
      direction: "INBOUND",
      type: "CALL",
      content: label,
      status: "SENT",
    },
  }).catch(() => {
    // Duplicate call event — Meta redelivers these like any other webhook.
  })

  await db.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(), lastMessageText: label, unreadCount: { increment: 1 } },
  })

  if (status === "CONNECT") {
    await notifyStaff({
      type: "INCOMING_CALL",
      title: "Incoming WhatsApp call",
      message: `${customer.name || from} is calling`,
      forRole: "CHAT_AGENT",
      data: { conversationId: conversation.id, callId, from },
    })
  }

  // A call that has ended cannot be answered, and its offer is dead weight.
  if (status === "TERMINATE" || status === "REJECT") forgetCall(callId)

  // An inbound connect carrying an offer is a phone ringing. Everything the
  // app needs to answer travels with the event, because fetching it afterwards
  // spends seconds out of a window measured in tens of them.
  if (status === "CONNECT" && offer && direction !== "BUSINESS_INITIATED") {
    rememberCall({
      callId,
      from,
      conversationId: conversation.id,
      customerName: customer.name || from,
      offer,
    })
    publish({
      type: "call",
      conversationId: conversation.id,
      status,
      callId,
      from,
      customerName: customer.name || from,
      offer,
      ringing: true,
    })

    // A phone with the app closed hears nothing from the event stream, and a
    // call cannot wait for somebody to open it: this wakes the device itself.
    try {
      const { pushIncomingCall } = await import("@/lib/device-push")
      await pushIncomingCall({
        callId,
        conversationId: conversation.id,
        customerName: customer.name || from,
        from,
        offer,
        tenantId: conversation.tenantId || currentTenant()?.tenantId || undefined,
      })
    } catch (error) {
      console.error("VoIP push for incoming call failed:", error)
    }
    return
  }

  publish({ type: "call", conversationId: conversation.id, status, callId, ringing: false, tenantId: conversation.tenantId || currentTenant()?.tenantId || undefined })
}

const STATUS_RANK: Record<string, number> = { SENT: 1, DELIVERED: 2, READ: 3 }

async function processStatus(status: any) {
  const externalId = status?.id
  if (!externalId) return

  const next = String(status.status || "").toUpperCase() // sent | delivered | read | failed
  if (!next) return

  const message = await db.message.findUnique({
    where: { externalId },
    select: { id: true, status: true },
  })

  if (message) {
    // Meta does not guarantee ordering, so a late "delivered" must not
    // overwrite a "read" that already arrived.
    const isRegression =
      next !== "FAILED" &&
      (STATUS_RANK[next] ?? 0) <= (STATUS_RANK[message.status] ?? 0)

    if (!isRegression) {
      await db.message.update({
        where: { id: message.id },
        data: {
          status: next,
          ...(next === "FAILED" && status.errors?.[0]
            ? { caption: String(status.errors[0].title || status.errors[0].message).slice(0, 200) }
            : {}),
        },
      })
    }
  }

  // Roll the same receipt up into campaign analytics.
  const recipient = await db.campaignRecipient.findFirst({
    where: { externalId },
    select: { id: true, campaignId: true, status: true },
  })
  if (!recipient) return

  if (next === "DELIVERED") {
    await db.campaignRecipient.update({
      where: { id: recipient.id },
      data: { deliveredAt: new Date() },
    })
    await db.campaign.update({
      where: { id: recipient.campaignId },
      data: { totalDelivered: { increment: 1 } },
    })
  } else if (next === "READ") {
    await db.campaignRecipient.update({
      where: { id: recipient.id },
      data: { readAt: new Date() },
    })
    await db.campaign.update({
      where: { id: recipient.campaignId },
      data: { totalRead: { increment: 1 } },
    })
  } else if (next === "FAILED" && recipient.status !== "FAILED") {
    await db.campaignRecipient.update({
      where: { id: recipient.id },
      data: { status: "FAILED", error: String(status.errors?.[0]?.title || "Delivery failed").slice(0, 500) },
    })
    await db.campaign.update({
      where: { id: recipient.campaignId },
      data: { totalBounced: { increment: 1 } },
    })
  }
}

async function processMessage(msg: any, contact: any) {
  const from = msg.from // customer phone
  const customerName = contact?.profile?.name || "Unknown"
  const type = msg.type
  const { content, mediaId, messageType } = parseMessage(msg)

  // ─── Find or create customer + conversation ───
  let customer = await db.customer.findFirst({ where: { phone: from } })
  if (!customer) {
    customer = await db.customer.create({
      data: {
        phone: from,
        name: customerName,
        whatsappOptIn: true,
        optInSource: "WHATSAPP_INBOUND",
        optInAt: new Date(),
      },
    })
  }

  const hasArabicScript = /[\u0600-\u06FF]/.test(content)
  if (hasArabicScript && customer.preferredLang !== "ar") {
    customer = await db.customer.update({
      where: { id: customer.id },
      data: { preferredLang: "ar" },
    })
  }

  const conversation = await resolveConversation(from, customerName, customer.id)

  // Only show blue ticks + typing animation when the AI/bot will actually reply.
  // When AI is disabled, a human agent will respond — we must not send fake typing cues.
  if (msg.id && conversation.botActive && !conversation.automationPaused) {
    void showTypingWithReadReceipt(msg.id)
  }

  // Meta's media id is not a URL and its download link expires within minutes,
  // so storing the id meant nothing could ever render what a customer sent —
  // an image arrived as an empty bubble. Pull the bytes now and keep a path the
  // inbox can display.
  let storedMediaUrl: string | null = mediaId
  if (mediaId) {
    try {
      const media = await downloadMediaBytes(mediaId)
      if (media.success && media.base64) {
        const stored = await storeMedia(
          Buffer.from(media.base64, "base64"),
          media.mimeType || "application/octet-stream",
        )
        storedMediaUrl = stored.url
      }
    } catch (error) {
      // Keep the id rather than dropping the message: the text still matters,
      // and the inbox says plainly when an attachment could not be fetched.
      console.error("Could not store inbound media:", error)
    }
  }

  // ─── Store inbound message (deduped on the WhatsApp message id) ───
  try {
    await db.message.create({
      data: {
        externalId: msg.id || null,
        conversationId: conversation.id,
        customerId: customer.id,
        direction: "INBOUND",
        type: messageType,
        content,
        mediaUrl: storedMediaUrl,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // Meta redelivered a message we already handled — nothing more to do.
      return
    }
    throw error
  }

  publish({ type: "message", conversationId: conversation.id, direction: "INBOUND", preview: content.slice(0, 120), tenantId: conversation.tenantId || currentTenant()?.tenantId || undefined })

  // Reaches staff when nobody has the panel open: the browser through
  // OneSignal, the phones through Apple directly.
  try {
    const { getNotificationPrefs } = await import("@/app/api/notification-prefs/route")
    const prefs = await getNotificationPrefs()
    // Somebody who switched off "New WhatsApp message" meant it. The message
    // is still stored and still appears in the inbox; it just does not buzz.
    if (prefs.NEW_MESSAGE !== false) {
      const [{ sendPush }, { pushMessage }] = await Promise.all([
        import("@/lib/push"),
        import("@/lib/device-push"),
      ])
      const activeTenantId = conversation.tenantId || currentTenant()?.tenantId || undefined
      await Promise.all([
        sendPush({
          title: customer.name || conversation.customerPhone,
          message: content.slice(0, 160),
          url: "/whatsapp",
          tenantId: activeTenantId,
        }),
        pushMessage({
          title: customer.name || conversation.customerPhone,
          body: content.slice(0, 160),
          conversationId: conversation.id,
          tenantId: activeTenantId,
        }),
      ])
    }
  } catch (error) {
    console.error("Push for inbound message failed:", error)
  }

  const inboundAt = new Date()
  await db.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: inboundAt,
      lastMessageText: content,
      unreadCount: { increment: 1 },
      // Inbound message restarts Meta's 24h freeform window.
      sessionExpiresAt: sessionExpiryFrom(inboundAt),
    },
  })

  // Consent keywords are honoured before anything else — including while a
  // human agent owns the conversation. Meta policy is not conditional on
  // whether our bot happens to be active.
  if (type === "text" || type === "button" || type === "interactive") {
    if (isOptOutMessage(content)) {
      await recordOptOut(customer.id)
      await sendWhatsApp({ to: from, body: OPT_OUT_CONFIRMATION, allowOutsideSession: true })
      return
    }
    if (isOptInMessage(content)) {
      await recordOptIn(customer.id)
      await sendWhatsApp({ to: from, body: OPT_IN_CONFIRMATION, allowOutsideSession: true })
      return
    }
  }

  /*
   * The whole bot can be switched off for a workspace, not just this thread.
   *
   * botActive is per conversation and defaults true on every new thread, so
   * there was no way to stop the bot — or even its away message — answering a
   * workspace's customers without touching every conversation one at a time.
   * This has to run before the away-message send below: that message is itself
   * an automated reply, and "the bot is off" has to mean off, not "off except
   * for the one message explaining that it's off."
   */
  const isWhitelisted = await isTestPhoneNumber(from)

  const aiAssistantOn = (await getConfigValue("ai_assistant_enabled").catch(() => "")).trim().toLowerCase()
  const botOn = (await getConfigValue("bot_enabled").catch(() => "")).trim().toLowerCase()
  const waBotOn = (await getConfigValue("wa_bot_enabled").catch(() => "")).trim().toLowerCase()
  const autoReplyOn = (await getConfigValue("auto_reply_enabled").catch(() => "")).trim().toLowerCase()
  const whitelistOnly = (await getConfigValue("bot_whitelist_only").catch(() => "")).trim().toLowerCase()
  const isWhitelistOnly = whitelistOnly === "true" || whitelistOnly === "1"

  const anyExplicitlyEnabled =
    aiAssistantOn === "true" || aiAssistantOn === "1" || aiAssistantOn === "on" ||
    waBotOn === "true" || waBotOn === "1" || waBotOn === "on" ||
    botOn === "true" || botOn === "1" || botOn === "on" ||
    autoReplyOn === "true" || autoReplyOn === "1" || autoReplyOn === "on"

  const allExplicitlyDisabled =
    (aiAssistantOn === "false" || aiAssistantOn === "off" || aiAssistantOn === "0") &&
    (waBotOn === "false" || waBotOn === "off" || waBotOn === "0") &&
    (botOn === "false" || botOn === "off" || botOn === "0")

  const isBotDisabled = allExplicitlyDisabled && !anyExplicitlyEnabled

  // Whitelisted numbers always receive bot replies.
  // Non-whitelisted numbers are rejected if bot is disabled or if workspace is in whitelist-only mode.
  if (!isWhitelisted) {
    if (isBotDisabled) {
      console.log(`[bot] Bot disabled for tenant ${currentTenant()?.tenantId || "default"} and sender ${from} is not whitelisted. Ignoring automated reply.`)
      return
    }
    if (isWhitelistOnly) {
      console.log(`[bot] Tenant ${currentTenant()?.tenantId || "default"} is in whitelist-only mode. Sender ${from} is not whitelisted. Ignoring.`)
      return
    }
    // If conversation automation is paused (either because tenant replied, human handoff, or manual pause):
    if (!conversation.botActive || conversation.automationPaused) {
      console.log(`[bot] Chat ${conversation.id} automation is paused (tenant replied or manual pause). Awaiting human response.`)
      return
    }
  }

  // Away message outside business hours (BRD §6.5.6). The AI keeps working
  // unless the operator explicitly turned that off — a booking assistant that
  // clocks off with the staff is not much of an assistant.
  {
    const tenantId = conversation.tenantId || currentTenant()?.tenantId || null
    let willFlowMatch = false
    if (Boolean(conversation.flowState)) {
      willFlowMatch = true
    } else {
      try {
        willFlowMatch = await flowWouldMatch({
          tenantId: tenantId || "",
          conversationId: conversation.id,
          customerId: customer.id,
          customerPhone: from,
          message: content,
        })
      } catch {}
    }

    const away = await shouldSendAwayMessage(conversation.id, tenantId, willFlowMatch)
    if (away.send) {
      await sendWhatsApp({ to: from, body: away.message, allowOutsideSession: true })
      await db.message.create({
        data: {
          conversationId: conversation.id,
          customerId: customer.id,
          direction: "BOT",
          type: "TEXT",
          content: away.message,
          isAiGenerated: false,
          status: "SENT",
        },
      })
      publish({ type: "message", conversationId: conversation.id, direction: "BOT", preview: away.message.slice(0, 120), tenantId: conversation.tenantId || currentTenant()?.tenantId || undefined })
    }
    if (away.blockBot) return
  }

  /*
   * Whether this is the very first thing this customer has ever sent.
   *
   * Counted from the messages on the thread, not from whether the conversation
   * row was just created: a thread reopened after being closed is not a new
   * customer. The inbound message has already been stored by this point, so a
   * genuinely first message leaves exactly one.
   */
  const messagesOnThread = await db.message.count({ where: { conversationId: conversation.id } })
  const isFirstContact = messagesOnThread <= 1

  try {
    /*
     * First contact is answered with the menu whatever form it arrived in.
     *
     * Only text, button and interactive messages reached the greeting below, so
     * someone opening with a 👋 sticker, a GIF, a photo or a voice note got
     * silence — and a first photo was handed to the payment-screenshot reader,
     * which is the wrong reading of an image from a customer who has no order
     * yet. Restricted to the genuine first message: a sticker or photo sent
     * later in a live conversation still goes wherever it went before, so this
     * cannot talk over a human agent mid-thread.
     */
    if (isFirstContact && type !== "text" && type !== "interactive" && type !== "button") {
      const opening = {
        tenantId: currentTenant()?.tenantId || "",
        conversationId: conversation.id,
        customerId: customer.id,
        customerPhone: from,
        message: content,
        buttonId: undefined as string | undefined,
      }
      // The workspace's own welcome flow still gets first refusal, exactly as
      // it does for a first text message.
      const welcome = await runNewConversationFlow(opening)
      if (welcome.matched) {
        if (welcome.handoff) {
          await handoffToAgent({ from, conversationId: conversation.id, customerId: customer.id, intent: "BOT_FLOW_HANDOFF" })
        }
        return
      }
      const visualFlow = await runBotFlows(opening)
      if (visualFlow.matched) {
        if (visualFlow.handoff) {
          await handoffToAgent({ from, conversationId: conversation.id, customerId: customer.id, intent: "BOT_FLOW_HANDOFF" })
        }
        return
      }
      return
    }

    if (type === "audio" && mediaId) {
      await handleVoiceNote(from, mediaId, conversation.id, customer.id)
      return
    }

    if ((type === "image" || type === "document") && mediaId) {
      // ── Check if an active bot-flow is waiting at an upload/drawing node ──
      // If yes, treat the media as the answer to that QUESTION and advance the
      // flow. Only fall through to payment-screenshot logic if no flow is waiting.
      const flowHandled = await handleFlowMediaUpload({
        from,
        mediaId,
        externalId: msg.id || undefined,
        mediaType: type as "image" | "document",
        mimeType: msg.image?.mime_type || msg.document?.mime_type || "image/jpeg",
        filename: msg.document?.filename || undefined,
        customerId: customer.id,
        conversationId: conversation.id,
      })
      if (flowHandled) return

      if (type === "image") {
        await handlePaymentScreenshot({
          from,
          customerName,
          mediaId,
          customerId: customer.id,
          conversationId: conversation.id,
        })
      }
      return
    }

    if (type === "order" && msg.order) {
      await handleWhatsAppCatalogOrder({
        from,
        customerName,
        msgOrder: msg.order,
        conversationId: conversation.id,
        customerId: customer.id,
      })
      return
    }

    if (type === "text" || type === "interactive" || type === "button" || type === "sticker") {
      const replyId =
        msg.interactive?.button_reply?.id ||
        msg.interactive?.list_reply?.id ||
        null

      const hardcodedOn = (await getConfigValue("hardcoded_flows_enabled").catch(() => "")).trim().toLowerCase()
      const isHardcodedFlowsEnabled = hardcodedOn === "true" || hardcodedOn === "1" || hardcodedOn === "on"

      const waFlowsOn = (await getConfigValue("wa_flows_enabled").catch(() => "")).trim().toLowerCase()
      const isDynamicFlowsEnabled = !(waFlowsOn === "false" || waFlowsOn === "off" || waFlowsOn === "0")

      // ─── Post-Booking Action Buttons ───
      if (replyId === "bk_chat_ai") {
        await db.conversation.update({
          where: { id: conversation.id },
          data: { botActive: true, automationPaused: false },
        }).catch(() => {})
        await sendWhatsApp({
          to: from,
          body: /[\u0600-\u06FF]/.test(content) || customer.preferredLang === "ar"
            ? "🤖 تفضل بسؤالك، وسأقوم بمساعدتك فوراً! 🙏"
            : "🤖 How can I help you? Feel free to ask any question! 🙏",
          allowOutsideSession: true,
        })
        return
      }

      if (replyId === "bk_chat_human") {
        await handoffToAgent({
          from,
          conversationId: conversation.id,
          customerId: customer.id,
          intent: "HUMAN_AGENT_REQUESTED",
        })
        return
      }

      // ─── Restaurant Interactive Button Handlers (Legacy Hardcoded) ───
      if (isHardcodedFlowsEnabled) {
      if (replyId?.startsWith("call_waiter_") || replyId === "rest_waiter") {
        const orderId = replyId.startsWith("call_waiter_") ? replyId.replace(/^call_waiter_/, "").trim() : null
        const tenantId = conversation.tenantId || currentTenant()?.tenantId || ""
        const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { name: true, slug: true } })
        const businessName = tenant?.name || "Restaurant"
        const slug = tenant?.slug || "kitchen"

        let tableNumber: string | null = null
        let tableId: string | null = null
        let branchId: string | null = null

        if (orderId) {
          const order = await db.kitchenOrder.findUnique({ where: { id: orderId } })
          if (order) {
            tableNumber = order.tableNumber || null
            tableId = order.tableId || null
            branchId = order.branchId || null
          }
        }

        if (!tableNumber && customer.notes?.includes("table:")) {
          const m = customer.notes.match(/table:([^\s,;]+)/)
          if (m) tableNumber = m[1]
        }

        if (!tableNumber) {
          const recentOrder = await db.kitchenOrder.findFirst({
            where: { tenantId, customerPhone: from, status: { not: "CANCELLED" } },
            orderBy: { createdAt: "desc" },
          })
          if (recentOrder?.tableNumber) {
            tableNumber = recentOrder.tableNumber
            tableId = recentOrder.tableId || null
            branchId = recentOrder.branchId || null
          }
        }

        if (tableNumber) {
          const { callWaiter } = await import("@/lib/restaurant")
          await callWaiter({
            tenantId,
            branchId,
            tableId,
            tableNumber,
            requestType: "ASSISTANCE",
            message: `Customer ${from} called waiter via WhatsApp`,
          }).catch(e => console.error("Call waiter failed:", e))

          const body = `🔔 *Staff Notified!*\n\nOur restaurant team has been notified for Table *${tableNumber}*. A server will assist you shortly!\n\nThank you for dining at ${businessName}.`
          await sendWhatsApp({ to: from, body, allowOutsideSession: true })
          await db.message.create({
            data: {
              conversationId: conversation.id,
              customerId: customer.id,
              direction: "BOT",
              type: "TEXT",
              content: body,
              status: "SENT",
            },
          }).catch(() => {})
          return
        } else {
          // Table unknown: prompt for table number
          const prompt = `🔔 *Call Waiter (${businessName})*\n\nPlease reply with your *table number* so our staff can assist you immediately:`
          await db.conversation.update({
            where: { id: conversation.id },
            data: {
              flowState: JSON.stringify({
                waitingFor: "WAITER_TABLE_NUMBER",
                tenantId,
                slug,
                businessName,
                startedAt: new Date().toISOString(),
              }),
            },
          }).catch(() => {})
          await sendWhatsApp({ to: from, body: prompt, allowOutsideSession: true })
          return
        }
      }

      if (replyId?.startsWith("request_bill_")) {
        const orderId = replyId.replace(/^request_bill_/, "").trim()
        const tenantId = conversation.tenantId || currentTenant()?.tenantId || ""
        const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
        const businessName = tenant?.name || "Restaurant"

        let tableNumber: string | null = null
        let tableId: string | null = null
        let branchId: string | null = null

        if (orderId) {
          const order = await db.kitchenOrder.findUnique({ where: { id: orderId } })
          if (order) {
            tableNumber = order.tableNumber || null
            tableId = order.tableId || null
            branchId = order.branchId || null
          }
        }

        if (!tableNumber && customer.notes?.includes("table:")) {
          const m = customer.notes.match(/table:([^\s,;]+)/)
          if (m) tableNumber = m[1]
        }

        const { callWaiter } = await import("@/lib/restaurant")
        await callWaiter({
          tenantId,
          branchId,
          tableId,
          tableNumber,
          requestType: "BILL",
          message: `Customer ${from} requested bill via WhatsApp`,
        }).catch(e => console.error("Request bill failed:", e))

        const body = `🧾 *Bill Requested!*\n\nOur staff has been notified to bring the bill${tableNumber ? ` to Table *${tableNumber}*` : ""}.\n\nThank you for dining with us at ${businessName}!`
        await sendWhatsApp({ to: from, body, allowOutsideSession: true })
        return
      }

      if (replyId?.startsWith("pay_order_") || replyId === "rest_pay") {
        const orderId = replyId.startsWith("pay_order_") ? replyId.replace(/^pay_order_/, "").trim() : null
        const tenantId = conversation.tenantId || currentTenant()?.tenantId || ""
        const order = orderId
          ? await db.kitchenOrder.findUnique({ where: { id: orderId } })
          : await db.kitchenOrder.findFirst({
              where: { tenantId, customerPhone: from, paymentStatus: { not: "PAID" }, status: { not: "CANCELLED" } },
              orderBy: { createdAt: "desc" },
            })

        if (order) {
          const payUrl = `https://app.fizmoh.cloud/api/amwalpay/create-session?orderId=KIT-${order.id}`
          const body =
            `💳 *Pay Restaurant Order #${order.orderNumber || order.id.slice(-6).toUpperCase()}*\n\n` +
            `Order: ${order.orderType}${order.tableNumber ? ` (Table #${order.tableNumber})` : ""}\n` +
            `Total Amount: *${order.totalAmount.toFixed(3)} ${order.currency || "OMR"}*\n\n` +
            `Tap below to complete payment securely with card:`

          const cta = await sendCtaUrlMessage({
            to: from,
            body,
            buttonText: "Pay Online Now",
            url: payUrl,
          })
          if (!cta.success) {
            await sendWhatsApp({ to: from, body: `${body}\n\n👉 ${payUrl}`, allowOutsideSession: true })
          }
        } else {
          await sendWhatsApp({
            to: from,
            body: `💳 You have no pending unpaid restaurant bills. If you'd like to order, view our menu online!`,
            allowOutsideSession: true,
          })
        }
        return
      }

      if (replyId === "rest_menu") {
        const tenantId = conversation.tenantId || currentTenant()?.tenantId || ""
        const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { slug: true, name: true } })
        const slug = tenant?.slug || "kitchen"
        let tableNum: string | null = null
        if (customer.notes?.includes("table:")) {
          const m = customer.notes.match(/table:([^\s,;]+)/)
          if (m) tableNum = m[1]
        }

        if (!tableNum) {
          const prompt =
            `🍽️ *${tenant?.name || "Restaurant"} — Welcome!*\n\n` +
            `To help us serve you better, please reply with your *table number*.\n\n` +
            `Example: reply *5* if you're sitting at Table 5\n\n` +
            `_(If you are ordering for Takeaway or Delivery, reply *0*)_`

          await db.conversation.update({
            where: { id: conversation.id },
            data: {
              flowState: JSON.stringify({
                waitingFor: "TABLE_NUMBER",
                tenantId,
                slug,
                businessName: tenant?.name || "Restaurant",
                startedAt: new Date().toISOString(),
              }),
            },
          }).catch(() => {})
          await sendWhatsApp({ to: from, body: prompt, allowOutsideSession: true })
        } else {
          const tableParam = tableNum && tableNum !== "0" ? `?table=${encodeURIComponent(tableNum)}` : ""
          const menuUrl = `https://app.fizmoh.cloud/menu/${slug}${tableParam}`
          const body =
            `🍽️ *${tenant?.name || "Restaurant"} — Menu & Online Ordering*\n\n` +
            (tableNum && tableNum !== "0" ? `Table *${tableNum}* — ` : "") +
            `Explore our chef's specialties, fresh dishes, and customize your meal.\n\nTap below to open our interactive digital menu inside WhatsApp:`

          const cta = await sendCtaUrlMessage({
            to: from,
            body,
            buttonText: "Open Digital Menu",
            url: menuUrl,
          })
          if (!cta.success) {
            await sendWhatsApp({ to: from, body, allowOutsideSession: true })
          }
        }
        return
      }

      if (replyId === "rest_order") {
        const tenantId = conversation.tenantId || currentTenant()?.tenantId || ""
        const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { slug: true, name: true } })
        const slug = tenant?.slug || "kitchen"
        let tableNum: string | null = null
        if (customer.notes?.includes("table:")) {
          const m = customer.notes.match(/table:([^\s,;]+)/)
          if (m) tableNum = m[1]
        }
        const tableParam = tableNum && tableNum !== "0" ? `?table=${encodeURIComponent(tableNum)}` : ""
        const menuUrl = `https://app.fizmoh.cloud/menu/${slug}${tableParam}`
        const body =
          `🍽️ *Place an Order (${tenant?.name || "Restaurant"})*\n\n` +
          `🛵 *Home Delivery* — Fast to your address\n` +
          `🥡 *Self Pickup* — Fresh and ready\n` +
          `🍽️ *Dine-In* ${tableNum ? `(Table #${tableNum})` : "— Order to your table"}\n\n` +
          `Tap below to open interactive menu & order:`

        const cta = await sendCtaUrlMessage({
          to: from,
          body,
          buttonText: "Open Menu & Order",
          url: menuUrl,
        })
        if (!cta.success) {
          await sendWhatsApp({ to: from, body, allowOutsideSession: true })
        }
        return
      }
      } // end if (isHardcodedFlowsEnabled) for restaurant interactive buttons

      // ─── 0. Restaurant Flow State Resumption (Legacy Hardcoded) ───
      // Handles multi-step conversational state: TABLE_NUMBER, WAITER_TABLE_NUMBER, SEARCH_QUERY
      if (isHardcodedFlowsEnabled) {
        const conv = await db.conversation.findUnique({
          where: { id: conversation.id },
          select: { flowState: true },
        }).catch(() => null)
        let fs: any = null
        try { fs = typeof conv?.flowState === "string" ? JSON.parse(conv.flowState) : conv?.flowState } catch {}

        if (fs?.waitingFor === "TABLE_NUMBER") {
          const tableNum = content.trim().replace(/[^\d]/g, "") || content.trim().slice(0, 6)
          const slug = fs.slug || "kitchen"
          const businessName = fs.businessName || "Restaurant"

          await db.conversation.update({
            where: { id: conversation.id },
            data: { flowState: Prisma.DbNull },
          }).catch(() => {})

          // Store in customer notes for future messages
          await db.customer.update({
            where: { id: customer.id },
            data: { notes: `table:${tableNum}` },
          }).catch(() => {})

          const tableParam = tableNum && tableNum !== "0"
            ? `?table=${encodeURIComponent(tableNum)}`
            : ""
          const menuUrl = `https://app.fizmoh.cloud/menu/${slug}${tableParam}`
          const body =
            `🍽️ *${businessName} — Menu & Online Ordering*\n\n` +
            (tableNum && tableNum !== "0" ? `Table *${tableNum}* — ` : "") +
            `Explore our chef's specialties, fresh dishes, and customize your meal.\n\nTap below to open our interactive digital menu inside WhatsApp:`

          const cta = await sendCtaUrlMessage({
            to: from,
            body,
            buttonText: "Open Digital Menu",
            url: menuUrl,
          }).catch(() => ({ success: false }))

          if (!cta.success) {
            await sendWhatsApp({ to: from, body, allowOutsideSession: true }).catch(() => {})
          }

          await db.message.create({
            data: {
              conversationId: conversation.id,
              customerId: customer.id,
              direction: "BOT",
              type: "TEXT",
              content: body,
              status: "SENT",
            },
          }).catch(() => {})
          return
        }

        if (fs?.waitingFor === "WAITER_TABLE_NUMBER") {
          const tableNum = content.trim().replace(/[^\d]/g, "") || content.trim().slice(0, 6)
          const tenantId = fs.tenantId || conversation.tenantId || ""
          const businessName = fs.businessName || "Restaurant"

          await db.conversation.update({
            where: { id: conversation.id },
            data: { flowState: Prisma.DbNull },
          }).catch(() => {})

          if (tableNum) {
            await db.customer.update({
              where: { id: customer.id },
              data: { notes: `table:${tableNum}` },
            }).catch(() => {})

            const { callWaiter } = await import("@/lib/restaurant")
            await callWaiter({
              tenantId,
              tableNumber: tableNum,
              requestType: "ASSISTANCE",
              message: `Customer ${from} called waiter via WhatsApp (Table ${tableNum})`,
            }).catch(e => console.error("Call waiter failed:", e))

            const body = `🔔 *Staff Notified!*\n\nOur restaurant team has been notified for Table *${tableNum}*. A waiter will assist you shortly!\n\nThank you for dining at ${businessName}.`
            await sendWhatsApp({ to: from, body, allowOutsideSession: true })
          } else {
            await sendWhatsApp({
              to: from,
              body: `Please tell our server or scan the QR code on your table for instant service. 🙏`,
              allowOutsideSession: true,
            })
          }
          return
        }

        if (fs?.waitingFor === "SEARCH_QUERY") {
          const query = content.trim()
          const tenantId = fs.tenantId || conversation.tenantId || ""
          const slug = fs.slug || "kitchen"

          await db.conversation.update({
            where: { id: conversation.id },
            data: { flowState: Prisma.DbNull },
          }).catch(() => {})

          const matches = await db.menuItem.findMany({
            where: {
              tenantId,
              isAvailable: true,
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { nameAr: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
              ],
            },
            take: 5,
            select: { name: true, price: true, currency: true },
          }).catch(() => [])

          let tableNum: string | null = null
          if (customer.notes?.includes("table:")) {
            const m = customer.notes.match(/table:([^\s,;]+)/)
            if (m) tableNum = m[1]
          }
          const tableParam = tableNum && tableNum !== "0" ? `?table=${encodeURIComponent(tableNum)}` : ""
          const menuUrl = `https://app.fizmoh.cloud/menu/${slug}${tableParam}`

          let replyMsg = ""
          if (matches.length > 0) {
            replyMsg =
              `🔍 *Dishes matching "${query}":*\n\n` +
              matches.map((m: any) => `• *${m.name}* — ${m.price.toFixed(3)} ${m.currency || "OMR"}`).join("\n") +
              `\n\nTap below to customize and order:`
          } else {
            replyMsg = `🔍 We couldn't find any dishes matching "${query}".\n\nTap below to browse our full menu:`
          }

          const cta = await sendCtaUrlMessage({
            to: from,
            body: replyMsg,
            buttonText: "Open Menu & Order",
            url: menuUrl,
          }).catch(() => ({ success: false }))

          if (!cta.success) {
            await sendWhatsApp({ to: from, body: replyMsg, allowOutsideSession: true })
          }
          return
        }
      } // end if (isHardcodedFlowsEnabled) for section 0

      // ─── 1, 2, 3. Dynamic Visual BotFlows (Builder Flows & Welcome) ───
      if (isDynamicFlowsEnabled) {
        const effectiveTenantId = conversation.tenantId || currentTenant()?.tenantId || ""

        // ─── 1. Active Visual Flow Session Resumption ───
        // If the customer is mid-flow answering questions, buttons, or list choices, resume it.
        const midFlow = await resumeFlow({
          tenantId: effectiveTenantId,
          conversationId: conversation.id,
          customerId: customer.id,
          customerPhone: from,
          message: content,
          buttonId: replyId || undefined,
        })
        if (midFlow.matched) {
          if (midFlow.handoff) {
            await handoffToAgent({ from, conversationId: conversation.id, customerId: customer.id, intent: "FLOW" })
          }
          return
        }

        // ─── 2. Dashboard Visual BotFlows (Keyword, Intent, Catch-All Triggers) ───
        // Evaluates published visual BotFlows for this tenant.
        const visualFlow = await runBotFlows({
          tenantId: effectiveTenantId,
          conversationId: conversation.id,
          customerId: customer.id,
          customerPhone: from,
          message: content,
          buttonId: replyId || undefined,
        })
        if (visualFlow.matched) {
          if (visualFlow.handoff) {
            await handoffToAgent({ from, conversationId: conversation.id, customerId: customer.id, intent: "BOT_FLOW_HANDOFF" })
          }
          return
        }

        // ─── 3. Welcome BotFlow for First Contact ───
        if (isFirstContact) {
          const welcome = await runNewConversationFlow({
            tenantId: effectiveTenantId,
            conversationId: conversation.id,
            customerId: customer.id,
            customerPhone: from,
            message: content,
            buttonId: replyId || undefined,
          })
          if (welcome.matched) {
            if (welcome.handoff) {
              await handoffToAgent({ from, conversationId: conversation.id, customerId: customer.id, intent: "BOT_FLOW_HANDOFF" })
            }
            return
          }
        }
      } // end if (isDynamicFlowsEnabled)

      // ─── 3.5 Restaurant Keyword Direct Response (Legacy Hardcoded) ───
      if (isHardcodedFlowsEnabled) {
      const normText = content.trim().toLowerCase()
      const isMenuQuery = /^(menu|منيو|قائمة|the menu|show menu|digital menu|food|اكل|طعام)$/i.test(normText)
      const isWaiterQuery = /^(waiter|call waiter|نادل|طلب نادل|خدمة|جرس|احتاج نادل)$/i.test(normText)
      const isBillQuery = /^(bill|فاتورة|حساب|الحساب|check please|طلب الحساب)$/i.test(normText)

      if (isMenuQuery || isWaiterQuery || isBillQuery) {
        const tenantId = conversation.tenantId || currentTenant()?.tenantId || ""
        const hasRestaurant = await db.menuItem.findFirst({
          where: { tenantId },
          select: { id: true },
        }).catch(() => null)

        if (hasRestaurant) {
          const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { slug: true, name: true } })
          const slug = tenant?.slug || "kitchen"
          const businessName = tenant?.name || "Restaurant"

          let tableNum: string | null = null
          if (customer.notes?.includes("table:")) {
            const m = customer.notes.match(/table:([^\s,;]+)/)
            if (m) tableNum = m[1]
          }
          if (!tableNum) {
            const recentOrder = await db.kitchenOrder.findFirst({
              where: { tenantId, customerPhone: from, status: { not: "CANCELLED" } },
              orderBy: { createdAt: "desc" },
            })
            if (recentOrder?.tableNumber) tableNum = recentOrder.tableNumber
          }

          if (isWaiterQuery) {
            if (tableNum) {
              const { callWaiter } = await import("@/lib/restaurant")
              await callWaiter({
                tenantId,
                tableNumber: tableNum,
                requestType: "ASSISTANCE",
                message: `Customer ${from} called waiter via WhatsApp`,
              }).catch(() => {})

              const body = `🔔 *Staff Notified!*\n\nOur restaurant team has been notified for Table *${tableNum}*. A server will assist you shortly!\n\nThank you for dining at ${businessName}.`
              await sendWhatsApp({ to: from, body, allowOutsideSession: true })
              return
            } else {
              const prompt = `🔔 *Call Waiter (${businessName})*\n\nPlease reply with your *table number* so our staff can assist you immediately:`
              await db.conversation.update({
                where: { id: conversation.id },
                data: {
                  flowState: JSON.stringify({
                    waitingFor: "WAITER_TABLE_NUMBER",
                    tenantId,
                    slug,
                    businessName,
                    startedAt: new Date().toISOString(),
                  }),
                },
              }).catch(() => {})
              await sendWhatsApp({ to: from, body: prompt, allowOutsideSession: true })
              return
            }
          }

          if (isBillQuery) {
            const { callWaiter } = await import("@/lib/restaurant")
            await callWaiter({
              tenantId,
              tableNumber: tableNum,
              requestType: "BILL",
              message: `Customer ${from} requested bill via WhatsApp`,
            }).catch(() => {})

            const body = `🧾 *Bill Requested!*\n\nOur staff has been notified to bring the bill${tableNum ? ` to Table *${tableNum}*` : ""}.\n\nThank you for dining with us at ${businessName}!`
            await sendWhatsApp({ to: from, body, allowOutsideSession: true })
            return
          }

          if (isMenuQuery) {
            if (!tableNum) {
              const prompt =
                `🍽️ *${businessName} — Welcome!*\n\n` +
                `To help us serve you better, please reply with your *table number*.\n\n` +
                `Example: reply *5* if you're sitting at Table 5\n\n` +
                `_(If you are ordering for Takeaway or Delivery, reply *0*)_`

              await db.conversation.update({
                where: { id: conversation.id },
                data: {
                  flowState: JSON.stringify({
                    waitingFor: "TABLE_NUMBER",
                    tenantId,
                    slug,
                    businessName,
                    startedAt: new Date().toISOString(),
                  }),
                },
              }).catch(() => {})
              await sendWhatsApp({ to: from, body: prompt, allowOutsideSession: true })
              return
            } else {
              const tableParam = tableNum && tableNum !== "0" ? `?table=${encodeURIComponent(tableNum)}` : ""
              const menuUrl = `https://app.fizmoh.cloud/menu/${slug}${tableParam}`
              const body =
                `🍽️ *${businessName} — Menu & Online Ordering*\n\n` +
                (tableNum && tableNum !== "0" ? `Table *${tableNum}* — ` : "") +
                `Explore our chef's specialties, fresh dishes, and customize your meal.\n\nTap below to open our interactive digital menu inside WhatsApp:`

              const cta = await sendCtaUrlMessage({
                to: from,
                body,
                buttonText: "Open Digital Menu",
                url: menuUrl,
              })
              if (!cta.success) {
                await sendWhatsApp({ to: from, body, allowOutsideSession: true })
              }
              return
            }
          }
        }
      }
      } // end if (isHardcodedFlowsEnabled) for section 3.5

      // ─── 4. AI Assistant / Human Fallback (Knowledge Base & RAG) ───
      await handleTextMessage({
        from,
        content,
        conversationId: conversation.id,
        customerId: customer.id,
        preferredLang: /[\u0600-\u06FF]/.test(content) ? "ar" : (customer.preferredLang || "en"),
      })
      return
    }
  } catch (aiError) {
    console.error("AI processing error:", aiError)
    /*
     * The number a customer is told to ring is the business's own.
     *
     * This apology carried one workspace's support line, hardcoded, so a
     * customer of any other business who hit an error was sent to a company
     * they had never contacted. Where no number is configured the sentence is
     * dropped rather than filled in — an apology with no phone number is
     * honest; one with a stranger's is not.
     */
    const support = (await getConfigValue("business_phone")).trim()
    await sendWhatsApp({
      to: from,
      body: support
        ? `I'm having trouble processing your message right now. Please try again or contact us at ${support}. 🙏`
        : "I'm having trouble processing your message right now. Please try again shortly. 🙏",
      allowOutsideSession: true,
    })
  }
}

// ─── Handlers ───

async function handleVoiceNote(
  from: string,
  mediaId: string,
  conversationId: string,
  customerId: string,
) {
  const media = await downloadMediaBytes(mediaId)
  if (!media.success || !media.base64) {
    await sendWhatsApp({
      to: from,
      body: "I couldn't download that voice note — could you send it again, or type your message?",
      allowOutsideSession: true,
    })
    return
  }

  const audio = Buffer.from(media.base64, "base64")
  const { text, error } = await transcribeAudio(audio, media.mimeType || "audio/ogg")

  // The recording is kept either way, so an agent can listen even when the
  // transcription is poor or the customer was talking over traffic.
  await db.message.updateMany({
    where: { conversationId, type: "AUDIO" },
    data: { caption: text ? `Transcript: ${text.slice(0, 500)}` : `audio/${media.mimeType}` },
  })

  if (!text) {
    console.error("Voice note not transcribed:", error)
    await sendWhatsApp({
      to: from,
      body: "I couldn't make that out — could you type it, or say it again a little more slowly? 🎤",
      allowOutsideSession: true,
    })
    await notifyStaff({
      type: "NEW_MESSAGE",
      title: "Voice note could not be transcribed",
      message: `${from} sent a voice note that could not be read: ${error ?? "unknown reason"}`,
      data: { conversationId },
    })
    return
  }

  // Recorded as what the customer said, so the transcript is in the thread the
  // assistant reads and an agent can see what was actually asked.
  await db.message.create({
    data: {
      conversationId,
      customerId,
      direction: "INBOUND",
      type: "TEXT",
      content: text,
      isAiGenerated: false,
      status: "SENT",
    },
  })

  // From here it is an ordinary message: the same flows, the same assistant,
  // the same booking path a typed message would take.
  await handleTextMessage({
    from,
    content: text,
    conversationId,
    customerId,
    preferredLang: (await db.customer.findFirst({ where: { id: customerId }, select: { preferredLang: true } }))?.preferredLang || "en",
  })
}

/**
 * handleFlowMediaUpload
 *
 * Called when an inbound WhatsApp message is an image or document AND a bot
 * flow session is active for that conversation.
 *
 * If the current node is a QUESTION whose name contains "drawing", "upload",
 * "photo", "media", "file", or "attachment" (all the EMADI upload steps), the
 * media is:
 *   1. Stored as a message row so the inbox shows the attachment.
 *   2. The media URL (whatsapp_media://<mediaId>) is saved into the flow
 *      session answers under the question's `name` key.
 *   3. The flow is advanced by calling resumeFlow with content "Uploaded",
 *      which satisfies the (required: false) QUESTION and moves to SAVE_LEAD.
 *   4. Any open EMADI lead/RFQ for this conversation gets the mediaId appended
 *      to its attachments list in systemSetting.
 *
 * Returns true if the media was handled by the flow; false means fall through
 * to the normal payment-screenshot handler.
 */
async function handleFlowMediaUpload(params: {
  from: string
  mediaId: string
  externalId?: string
  mediaType: "image" | "document"
  mimeType: string
  filename?: string
  customerId: string
  conversationId: string
}): Promise<boolean> {
  const { from, mediaId, externalId, mediaType, mimeType, filename, customerId, conversationId } = params

  // ── 1. Check for an active flow session ──
  const conv = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { flowState: true, tenantId: true, botActive: true },
  })
  if (!conv?.flowState || !conv.botActive) return false

  let session: { flowId?: string; nodeId?: string; answers?: Record<string, string>; startedAt?: string } = {}
  try {
    session = typeof conv.flowState === "string"
      ? JSON.parse(conv.flowState as string)
      : (conv.flowState as any)
  } catch { return false }

  if (!session?.flowId || !session?.nodeId) return false

  // ── 2. Find the current node ──
  const flow = await db.botFlow.findFirst({
    where: { id: session.flowId, tenantId: conv.tenantId || undefined },
  })
  if (!flow || !flow.isActive) return false

  const { normalizeFlowGraph } = await import("@/lib/flow-normalizer")
  const graph = normalizeFlowGraph(flow.publishedNodes || flow.nodes, flow.publishedEdges || flow.edges)
  const node = graph.nodes.find((n: any) => n.id === session.nodeId)
  if (!node) return false

  // ── 3. Only intercept QUESTION nodes that expect a file/media upload ──
  const isUploadNode =
    node.type === "QUESTION" &&
    /receipt|screenshot|proof|transfer|drawing|upload|photo|media|file|attachment|measurement|blueprint|bank|payment|image/i.test(
      (node.data?.name || "") + " " + (node.data?.text || "") + " " + (node.data?.inputType || "")
    )

  if (!isUploadNode) return false

  // ── 4. Build a persistent media URL ──
  // whatsapp_media:// is recognised by the inbox image renderer. We also try to
  // download and store the bytes so the backend record is self-contained.
  let storedUrl = `whatsapp_media://${mediaId}`
  try {
    const { downloadMediaBytes } = await import("@/lib/whatsapp")
    const dl = await downloadMediaBytes(mediaId)
    if (dl.success && dl.base64 && dl.mimeType) {
      const { storeMedia } = await import("@/lib/media-store")
      const buffer = Buffer.from(dl.base64, "base64")
      const originalName = filename || `receipt-${Date.now()}.${dl.mimeType.split("/")[1] || "jpg"}`
      const stored = await storeMedia(buffer, dl.mimeType, originalName)
      if (stored?.url) storedUrl = stored.url
    }
  } catch { /* keep whatsapp_media:// fallback */ }

  // ── 5. Update the existing message row (never create a duplicate row) ──
  try {
    if (externalId) {
      await db.message.updateMany({
        where: { conversationId, externalId },
        data: {
          mediaUrl: storedUrl,
          type: mediaType === "image" ? "IMAGE" : "DOCUMENT",
          caption: filename || undefined,
        },
      })
    } else {
      const recent = await db.message.findFirst({
        where: { conversationId, direction: "INBOUND" },
        orderBy: { createdAt: "desc" },
      })
      if (recent && Date.now() - new Date(recent.createdAt).getTime() < 15000) {
        await db.message.update({
          where: { id: recent.id },
          data: {
            mediaUrl: storedUrl,
            type: mediaType === "image" ? "IMAGE" : "DOCUMENT",
            caption: filename || undefined,
          },
        })
      }
    }
  } catch { /* non-critical */ }

  // ── 6. Append the attachment to the EMADI lead if one exists ──
  try {
    const tenantId = conv.tenantId || ""
    const leadKey = `corporate_lead_attachments_${conversationId}`
    const existingRow = await db.systemSetting.findFirst({ where: { tenantId, key: leadKey } })
    const existing: string[] = existingRow?.value ? JSON.parse(existingRow.value).urls || [] : []
    const updated = [...existing, storedUrl]
    if (existingRow) {
      await db.systemSetting.update({
        where: { id: existingRow.id },
        data: { value: JSON.stringify({ urls: updated }), type: "JSON" },
      })
    } else {
      await db.systemSetting.create({
        data: { tenantId, key: leadKey, value: JSON.stringify({ urls: updated }), type: "JSON" },
      })
    }

    // Also update any lead/rfq record for this conversation
    const lead = await db.lead.findFirst({ where: { tenantId, conversationId } })
    if (lead) {
      const existingAnswers: Record<string, any> =
        lead.answers && typeof lead.answers === "object" && !Array.isArray(lead.answers)
          ? (lead.answers as Record<string, any>)
          : {}
      const existingAttachments: string[] = Array.isArray(existingAnswers.attachments)
        ? existingAnswers.attachments
        : []
      await db.lead.update({
        where: { id: lead.id },
        data: {
          answers: {
            ...existingAnswers,
            attachments: [...existingAttachments, storedUrl],
            drawings_url: storedUrl,
            receipt_url: storedUrl,
          },
        },
      })
    }
  } catch { /* non-critical — the message row is still saved */ }

  // ── 7. Advance the flow — treat media receipt as the answer "Uploaded" ──
  try {
    // Record receipt url into session answers so it persists into registration / lead
    const qName = node.data?.name || "payment_receipt"
    session.answers = {
      ...(session.answers || {}),
      [qName]: storedUrl,
      payment_receipt: storedUrl,
      payment_receipt_url: storedUrl,
      receipt_screenshot: storedUrl,
    }
    await db.conversation.update({
      where: { id: conversationId },
      data: { flowState: JSON.stringify(session) },
    })

    const { resumeFlow, syncTrainingCourseRegistration } = await import("@/lib/botflow-engine")
    const tenantId = conv.tenantId || ""

    if (session.answers?.full_name) {
      await syncTrainingCourseRegistration({
        tenantId,
        conversationId,
        customerId,
        customerPhone: from,
        answers: session.answers,
        flowId: flow.id,
      }).catch(err => console.warn("[flow] sync in handleFlowMediaUpload:", err))
    }

    await resumeFlow({
      tenantId,
      conversationId,
      customerId,
      customerPhone: from,
      message: storedUrl || "Uploaded",
      channel: "WHATSAPP",
    })
  } catch { /* if resumeFlow fails, the customer still sees the saved-image confirmation */ }

  return true
}

async function handlePaymentScreenshot(params: {
  from: string
  customerName: string
  mediaId: string
  customerId: string
  conversationId: string

}) {
  const { from, customerName, mediaId, customerId, conversationId } = params

  // If the guided flow is waiting on a screenshot, attach it to that exact
  // If the conversation or flow is waiting on a screenshot, attach it to that exact order
  let flowOrderId: string | null = null
  try {
    const conv = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { flowState: true, bookingState: true },
    })
    const fs = typeof conv?.flowState === "string" ? JSON.parse(conv.flowState) : (conv?.flowState as any)
    if (fs?.answers?.order_id) flowOrderId = String(fs.answers.order_id)
    const bs = typeof conv?.bookingState === "string" ? JSON.parse(conv.bookingState) : (conv?.bookingState as any)
    if (bs?.orderId) flowOrderId = String(bs.orderId)
  } catch {}

  const pendingOrder = flowOrderId
    ? await db.order.findUnique({ where: { id: flowOrderId }, include: { tour: true, slot: true } })
    : await db.order.findFirst({
        where: { customerId, orderStatus: "PENDING_PAYMENT" },
        include: { tour: true, slot: true },
        orderBy: { createdAt: "desc" },
      })

  // No pending order, or an order with no payment row to attach to: either way
  // the customer gets an answer instead of silence.
  const payment = pendingOrder
    ? await db.payment.findFirst({
        where: { orderId: pendingOrder.id, status: { in: ["PENDING", "SUBMITTED"] } },
        orderBy: { createdAt: "desc" },
      })
    : null

  if (!pendingOrder || !payment) {
    await sendWhatsApp({
      to: from,
      body: "Thanks for the image! If this is a payment screenshot, please share your order number so I can attach it to your booking. 📎",
      allowOutsideSession: true,
    })
    return
  }

  // Meta's media URL needs a bearer token and expires in ~5 minutes, so it is
  // useless as a stored image src. Pull the bytes and keep a data URI the
  // finance screen can actually render.
  const media = await downloadMediaBytes(mediaId)
  const screenshotUrl = media.success && media.base64
    ? `data:${media.mimeType};base64,${media.base64}`
    : `whatsapp_media://${mediaId}`

  // Run the same fraud analysis the web payment path uses, so a WhatsApp
  // screenshot is not trusted more than one uploaded through the site.
  let analysis: Awaited<ReturnType<typeof analyzePaymentScreenshot>> | null = null
  if (media.success && screenshotUrl.startsWith("data:")) {
    analysis = await analyzePaymentScreenshot(screenshotUrl, pendingOrder.totalAmount, "OMR")
  }

  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: "SUBMITTED",
      screenshotUrl,
      // Left null on purpose: the real reference comes off the bank statement
      // during verification. A synthetic one here is unreconcilable.
      bankReference: analysis?.referenceNumber ?? null,
      bankName: analysis?.bankName ?? null,
      transferDate: new Date(),
      screenshotOcr: analysis ? JSON.stringify(analysis) : undefined,
      fraudFlags: analysis?.fraudFlags?.length ? JSON.stringify(analysis.fraudFlags) : undefined,
      fraudScore: analysis ? 1 - (analysis.confidence ?? 0) : undefined,
    },
  })

  await db.order.update({
    where: { id: pendingOrder.id },
    data: { paymentStatus: "SUBMITTED" },
  })

  /*
   * The booking is confirmed as soon as the screenshot arrives; the money is
   * still checked by a person afterwards.
   *
   * These are two different questions. The seat is held for someone who has
   * said they paid, so they get their confirmation and voucher immediately,
   * while paymentStatus stays SUBMITTED and the payment sits in the approval
   * queue exactly as before. Staff approval is unchanged — it marks the
   * payment APPROVED and, because confirmOrderOnce claims the confirmation
   * atomically, it will not re-book the seats this call already took.
   *
   * The trade is deliberate and worth naming: a seat is committed and a
   * voucher issued before anyone has seen the transfer land. A rejected
   * payment has to release that seat.
   */
  const confirmed = await confirmOrderOnce(pendingOrder.id)

  /*
   * The confirmation repeats the whole booking back.
   *
   * This is the last message before a human checks the transfer, so it is the
   * customer's receipt: if a date or a headcount is wrong, this is where they
   * notice, while it is still trivial to change. Sent in the language they
   * picked at the start of the conversation.
   */
  const convForLang = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { flowState: true, customer: { select: { preferredLang: true } } },
  })
  let flowLang = convForLang?.customer?.preferredLang || "en"
  try {
    const fs = typeof convForLang?.flowState === "string" ? JSON.parse(convForLang.flowState) : (convForLang?.flowState as any)
    if (fs?.answers?.lang) flowLang = fs.answers.lang
  } catch {}
  const ar = flowLang === "ar"
  const when = pendingOrder.slot
    ? `${formatDate(pendingOrder.slot.date)} ${ar ? "الساعة" : "at"} ${pendingOrder.slot.startTime}`
    : ""
  const seats = pendingOrder.paxAdult ?? 0

  await sendWhatsApp({
    to: from,
    allowOutsideSession: true,
    body: ar
      ? `✅ تم استلام صورة التحويل للطلب ${pendingOrder.orderNumber}\n\n` +
        `🎫 ${pendingOrder.tour.name}\n` +
        (when ? `📅 ${when}\n` : "") +
        (seats ? `👥 ${seats} شخص\n` : "") +
        `💰 ${formatCurrency(pendingOrder.totalAmount)}\n` +
        (confirmed ? `🎟️ رمز القسيمة: *${confirmed.voucherCode}*\n` : "") +
        `\n${confirmed ? "تم تأكيد حجزك ✅ وسيقوم فريقنا بمراجعة التحويل." : "سيقوم فريقنا بالتحقق من التحويل وتأكيد الحجز."} 🙏`
      : `✅ Payment screenshot received for ${pendingOrder.orderNumber}\n\n` +
        `🎫 ${pendingOrder.tour.name}\n` +
        (when ? `📅 ${when}\n` : "") +
        (seats ? `👥 ${seats} person${seats === 1 ? "" : "s"}\n` : "") +
        `💰 ${formatCurrency(pendingOrder.totalAmount)}\n` +
        (confirmed ? `🎟️ Voucher: *${confirmed.voucherCode}*\n` : "") +
        `\n${confirmed ? "Your booking is confirmed ✅ — our team is checking the transfer." : "Our team is verifying the transfer and will confirm your booking."} 🙏`,
  })

  // Send the structured confirmation with Track Order + Contact buttons
  if (confirmed) {
    await sendOrderConfirmationWA({
      phone: from,
      orderRef: pendingOrder.orderNumber,
      tourName: pendingOrder.tour.name,
      slotDate: pendingOrder.slot?.date ? String(pendingOrder.slot.date) : null,
      slotTime: pendingOrder.slot?.startTime ?? null,
      paxAdult: pendingOrder.paxAdult ?? 1,
      paxChild: pendingOrder.paxChild ?? 0,
      totalAmount: pendingOrder.totalAmount,
      voucherCode: confirmed.voucherCode,
      lang: ar ? "ar" : "en",
      conversationId,
      customerId,
      tenantId: currentTenant()?.tenantId || undefined,
    }).catch(() => null)
  } else {
    await sendOrderConfirmationWA({
      phone: from,
      orderRef: pendingOrder.orderNumber,
      tourName: pendingOrder.tour.name,
      slotDate: pendingOrder.slot?.date ? String(pendingOrder.slot.date) : null,
      slotTime: pendingOrder.slot?.startTime ?? null,
      paxAdult: pendingOrder.paxAdult ?? 1,
      paxChild: pendingOrder.paxChild ?? 0,
      totalAmount: pendingOrder.totalAmount,
      voucherCode: "",
      lang: ar ? "ar" : "en",
      conversationId,
      customerId,
      tenantId: currentTenant()?.tenantId || undefined,
    }).catch(() => null)
  }

  await notifyStaff({
    type: "PAYMENT_SUBMITTED",
    title: "Payment screenshot from WhatsApp",
    message: `${pendingOrder.orderNumber} - ${customerName} - ${formatCurrency(pendingOrder.totalAmount)}${
      analysis && !analysis.matchesExpected
        ? ` ⚠️ amount mismatch (detected ${analysis.detectedAmount ?? "none"})`
        : ""
    }`,
    forRole: "FINANCE",
    data: {
      orderId: pendingOrder.id,
      paymentId: payment.id,
      matchesExpected: analysis?.matchesExpected ?? null,
      fraudFlags: analysis?.fraudFlags ?? [],
    },
  })

  if (flowOrderId) {
    await db.conversation.update({
      where: { id: conversationId },
      data: { bookingState: Prisma.DbNull, flowState: Prisma.DbNull },
    }).catch(() => {})
  }
}

async function handleTextMessage(params: {
  from: string
  content: string
  conversationId: string
  customerId: string
  preferredLang: string
}) {
  const { from, content, conversationId, customerId, preferredLang } = params

  /*
   * The workspace can switch the AI off.
   *
   * Everything above this point — the guided booking flow, buttons, the menu —
   * keeps working; this only governs whether an unmatched message is answered
   * by the LLM or handed to a person. A business that wants a scripted bot and
   * human replies, or that is watching its AI spend, needs to be able to say so
   * without losing the booking flow with it.
   */
  const isWhitelisted = await isTestPhoneNumber(from)
  const aiAssistantVal = (await getConfigValue("ai_assistant_enabled").catch(() => "")).trim().toLowerCase()
  const waBotVal = (await getConfigValue("wa_bot_enabled").catch(() => "")).trim().toLowerCase()
  const botVal = (await getConfigValue("bot_enabled").catch(() => "")).trim().toLowerCase()

  const anyAiExplicitlyEnabled =
    aiAssistantVal === "true" || aiAssistantVal === "1" || aiAssistantVal === "on" ||
    waBotVal === "true" || waBotVal === "1" || waBotVal === "on" ||
    botVal === "true" || botVal === "1" || botVal === "on"

  const allAiExplicitlyDisabled =
    (aiAssistantVal === "false" || aiAssistantVal === "off" || aiAssistantVal === "0") &&
    (waBotVal === "false" || waBotVal === "off" || waBotVal === "0")

  if (!isWhitelisted && allAiExplicitlyDisabled && !anyAiExplicitlyEnabled) {
    await db.conversation.update({
      where: { id: conversationId },
      data: { botActive: false, automationPaused: true, status: "PENDING" },
    }).catch(() => {})
    return
  }

  const waFlowsOn = (await getConfigValue("wa_flows_enabled").catch(() => "")).trim().toLowerCase()
  const isDynamicFlowsEnabled = !(waFlowsOn === "false" || waFlowsOn === "off" || waFlowsOn === "0")

  let intent: { intent: string; sentiment: string; needsHumanHandoff: boolean } = {
    intent: "GENERAL",
    sentiment: "NEUTRAL",
    needsHumanHandoff: false,
  }
  try {
    const detected = await detectIntent(content)
    if (detected) intent = detected
  } catch {}

  const convRow = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { tenantId: true },
  })
  const effectiveTenantId = convRow?.tenantId || currentTenant()?.tenantId || ""

  if (isDynamicFlowsEnabled) {
    // A flow waiting on an answer takes precedence over everything: the customer
    // is part-way through a form and their reply belongs to it.
    const resumed = await resumeFlow({
      tenantId: effectiveTenantId,
      conversationId,
      customerId,
      customerPhone: from,
      message: content,
    })
    if (resumed.matched) {
      await db.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      })
      return
    }

    // Operator-authored flows win over a generated reply: they're deterministic,
    // free, and somebody deliberately built them for this exact case.
    const flow = await runBotFlows({
      tenantId: effectiveTenantId,
      conversationId,
      customerId,
      customerPhone: from,
      message: content,
      intent: intent.intent,
    })
    if (flow.matched) {
      await db.conversation.update({
        where: { id: conversationId },
        data: { intent: intent.intent, sentiment: intent.sentiment },
      })
      if (flow.handoff) {
        await handoffToAgent({ from, conversationId, customerId, intent: intent.intent })
      }
      return
    }
  }

  // Record what we detected, but only ever turn the bot OFF here. Flipping it
  // back on would override an agent who deliberately took the conversation.
  await db.conversation.update({
    where: { id: conversationId },
    data: {
      intent: intent.intent,
      sentiment: intent.sentiment,
      ...(intent.needsHumanHandoff ? { botActive: false, automationPaused: true, status: "PENDING" } : {}),
    },
  })

  if (intent.needsHumanHandoff) {
    await handoffToAgent({ from, conversationId, customerId, intent: intent.intent })
    return
  }

  // The twenty most recent messages, oldest first.
  //
  // This previously ordered ascending and took twenty, which is the twenty
  // OLDEST messages in the conversation. On any thread longer than that the
  // assistant was reading a conversation from hours earlier and never saw the
  // message it was replying to — which is why "show me all my bookings" was
  // answered with bank transfer instructions left over from an old exchange.
  const history = await db.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  const aiMessages = history
    .reverse()
    .map(m => ({
      role: (m.direction === "INBOUND" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    }))

  // The agent watching the inbox sees the same "typing" the customer does,
  // so a slow reply reads as work in progress rather than a dead conversation.
  publish({ type: "typing", conversationId, who: "bot", tenantId: effectiveTenantId || undefined })

  const aiResponse = await aiChat(aiMessages, preferredLang, from, effectiveTenantId)
  const sendResult = await sendWhatsApp({ to: from, body: aiResponse, allowOutsideSession: true })

  await db.message.create({
    data: {
      conversationId,
      customerId,
      direction: "BOT",
      type: "TEXT",
      content: aiResponse,
      isAiGenerated: true,
      status: sendResult.success ? "SENT" : "FAILED",
    },
  })

  await db.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date(), lastMessageText: aiResponse, botActive: true, automationPaused: false },
  })

  publish({ type: "message", conversationId, direction: "BOT", preview: String(aiResponse).slice(0, 120), tenantId: currentTenant()?.tenantId || undefined })
}

async function handoffToAgent(params: {
  from: string
  conversationId: string
  customerId: string
  intent: string
}) {
  const { from, conversationId, customerId, intent } = params

  // 1. Immediately pause bot on this conversation so it never responds again
  await db.conversation.update({
    where: { id: conversationId },
    data: { botActive: false, automationPaused: true, status: "PENDING" },
  }).catch(() => {})

  // Per BRD §6.5.6 the handoff has to actually reach a human, with context.
  try {
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { assignedStaffId: true, customerName: true },
    })

    await notifyStaff({
      type: "CHAT_HANDOFF",
      title: "Chat needs a human agent",
      message: `${conversation?.customerName || from} — detected intent: ${intent}`,
      forRole: "CHAT_AGENT",
      forStaffId: conversation?.assignedStaffId || null,
      data: { conversationId, customerPhone: from, intent },
    })
  } catch (err) {
    console.error("Staff notification error:", err)
  }

  // 2. Do NOT send automated message if bot is disabled or AI is disabled
  const isWhitelisted = await isTestPhoneNumber(from)
  const aiAssistantVal = (await getConfigValue("ai_assistant_enabled").catch(() => "")).trim().toLowerCase()
  const botOn = (await getConfigValue("bot_enabled").catch(() => "")).trim().toLowerCase()
  const waBotOn = (await getConfigValue("wa_bot_enabled").catch(() => "")).trim().toLowerCase()
  const isBotDisabled =
    (aiAssistantVal === "false" || aiAssistantVal === "off" || aiAssistantVal === "0") &&
    (botOn === "false" || botOn === "off" || botOn === "0") &&
    (waBotOn === "false" || waBotOn === "off" || waBotOn === "0")

  if ((!isWhitelisted && isBotDisabled) || intent === "AI_DISABLED") {
    return
  }

  const handoffText = "I'm connecting you with one of our team members who will assist you shortly. 🙏"

  await sendWhatsApp({ to: from, body: handoffText, allowOutsideSession: true })

  await db.message.create({
    data: {
      conversationId,
      customerId,
      direction: "BOT",
      type: "TEXT",
      content: handoffText,
      isAiGenerated: true,
      status: "SENT",
    },
  })

  publish({ type: "message", conversationId, direction: "BOT", preview: handoffText.slice(0, 120), tenantId: currentTenant()?.tenantId || undefined })
}


/**
 * A message the business sent from the WhatsApp Business app on their phone.
 *
 * Recorded against the same conversation as everything else, marked as coming
 * from the phone rather than from this panel, so an agent reading the thread
 * can see who said what and where.
 */
/**
 * The conversations a business already had, before they connected.
 *
 * Meta delivers up to eighteen months of history in three phases of chunks
 * after a coexistence onboarding, keyed by the customer's phone number. Each
 * message is stored as though it had arrived normally — because it did, just
 * on the owner's phone rather than here.
 *
 * What this deliberately does NOT do is run any of the machinery that a live
 * message runs. No bot, no AI reply, no notification, no unread count, no
 * "typing…". A history import is hundreds of messages arriving at once, and
 * answering questions a customer asked five months ago — or waking somebody's
 * phone three hundred times — would be worse than having no history at all.
 */
async function importHistoryChunk(chunk: any) {
  const progress = chunk?.metadata?.progress
  const phase = chunk?.metadata?.phase
  console.log(`[history] phase ${phase}, chunk ${chunk?.metadata?.chunk_order}, ${progress}% complete`)

  for (const thread of chunk?.threads || []) {
    // The thread is named by the customer's phone number. Without one there is
    // nobody to attribute the conversation to.
    const phone = String(thread?.id ?? "").replace(/\D/g, "")
    if (!phone) continue

    const messages = (thread?.messages || []).filter((m: any) => m?.id)
    if (messages.length === 0) continue

    // Everything already held for this customer, in one query rather than one
    // per message: a chunk can carry hundreds and this runs inside a webhook
    // that Meta will time out.
    const ids = messages.map((m: any) => String(m.id))
    const known = new Set(
      (await db.message.findMany({ where: { externalId: { in: ids } }, select: { externalId: true } }))
        .map(m => m.externalId),
    )
    const fresh = messages.filter((m: any) => !known.has(String(m.id)))
    if (fresh.length === 0) continue

    let customer = await db.customer.findFirst({ where: { phone } })
    if (!customer) {
      customer = await db.customer.create({
        data: {
          phone,
          // The name comes from the contact sync, which arrives separately and
          // may be behind or ahead of this. The number is what is known now.
          name: phone,
          whatsappOptIn: true,
          optInSource: "WHATSAPP_INBOUND",
          optInAt: new Date(),
        },
      })
    }

    const conversation = await resolveConversation(phone, customer.name || phone, customer.id)

    await db.message.createMany({
      data: fresh.map((message: any) => {
        // `from` is the sender's number: the customer's on an inbound message,
        // the business's on their own reply.
        const inbound = String(message.from ?? "").replace(/\D/g, "") === phone
        const type = String(message.type ?? "text")
        const content =
          message?.text?.body ??
          message?.[type]?.caption ??
          `[${type}]`
        return {
          externalId: String(message.id),
          conversationId: conversation.id,
          customerId: customer!.id,
          direction: inbound ? "INBOUND" : "OUTBOUND",
          type: type.toUpperCase(),
          content,
          // What the phone recorded, not when this webhook arrived — a history
          // import stamped with today's date is not a history.
          createdAt: message?.timestamp
            ? new Date(Number(message.timestamp) * 1000)
            : new Date(),
          status: String(message?.history_context?.status ?? "DELIVERED").toUpperCase(),
          // Nobody in this panel typed these, and putting a name against words
          // somebody never wrote is worse than leaving it blank.
          senderId: null,
        }
      }),
      // Two chunks can overlap, and a unique violation must not abandon the
      // rest of the thread.
      skipDuplicates: true,
    })

    // The conversation's own clock follows its newest message, so an imported
    // thread sorts where it belongs in the inbox rather than at the top.
    const newest = fresh.reduce((latest: number, m: any) => {
      const at = Number(m?.timestamp ?? 0)
      return at > latest ? at : latest
    }, 0)
    if (newest > 0) {
      const at = new Date(newest * 1000)
      const current = await db.conversation.findUnique({
        where: { id: conversation.id },
        select: { lastMessageAt: true },
      })
      if (!current?.lastMessageAt || current.lastMessageAt < at) {
        await db.conversation
          .update({ where: { id: conversation.id }, data: { lastMessageAt: at } })
          .catch(() => {})
      }
    }
  }
}

/**
 * A contact from the owner's phone.
 *
 * Only additions are acted on. A removal means they deleted somebody from
 * their phone's address book, which says nothing about whether that person is
 * a customer here — and deleting the record would take their bookings and
 * their conversation with it.
 */
async function importContact(entry: any) {
  if (entry?.type !== "contact" || entry?.action !== "add") return

  const phone = String(entry?.contact?.phone_number ?? "").replace(/\D/g, "")
  if (!phone) return

  const name = String(entry?.contact?.full_name ?? entry?.contact?.first_name ?? "").trim()
  const existing = await db.customer.findFirst({ where: { phone }, select: { id: true, name: true } })

  if (!existing) {
    await db.customer.create({
      data: {
        phone,
        name: name || phone,
        whatsappOptIn: true,
        optInSource: "WHATSAPP_INBOUND",
        optInAt: new Date(),
      },
    })
    return
  }

  // An imported name fills a gap; it does not overwrite one somebody here has
  // already corrected. The placeholder is the phone number itself.
  if (name && (!existing.name || existing.name === phone)) {
    await db.customer.update({ where: { id: existing.id }, data: { name } })
  }
}

async function processEcho(echo: any) {
  const to = String(echo?.to ?? "").replace(/\D/g, "")
  if (!to) return

  // Deduped on Meta's own id: an echo can arrive more than once, and a
  // conversation that repeats the business's own words is worse than one
  // missing them.
  const seen = await db.message.findFirst({ where: { externalId: echo.id }, select: { id: true } })
  if (seen) return

  const customer = await db.customer.findFirst({ where: { phone: to } })
  if (!customer) return

  const conversation = await db.conversation.findFirst({
    where: { customerId: customer.id },
    orderBy: { lastMessageAt: "desc" },
  })
  if (!conversation) return

  const text =
    echo?.text?.body ??
    echo?.[echo?.type]?.caption ??
    (echo?.type ? `[${echo.type}]` : "")

  await db.message.create({
    data: {
      conversationId: conversation.id,
      customerId: customer.id,
      externalId: echo.id ?? null,
      direction: "OUTBOUND",
      type: (echo?.type ?? "text").toUpperCase(),
      content: text,
      status: "SENT",
      // Nobody in this panel typed it, and pretending a staff member did would
      // put a name against words they never wrote.
      senderId: null,
      createdAt: echo?.timestamp ? new Date(Number(echo.timestamp) * 1000) : new Date(),
    },
  }).catch(error => {
    console.error("Could not store an echoed message:", error)
  })

  await db.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(), botActive: false, automationPaused: true },
  }).catch(() => {})
}

async function handleWhatsAppCatalogOrder(params: {
  from: string
  customerName: string
  msgOrder: any
  conversationId: string
  customerId: string
}) {
  const { from, customerName, msgOrder, conversationId, customerId } = params
  const items = msgOrder?.product_items || []
  const notes = msgOrder?.text || ""

  let totalAmount = 0
  const parsedItems = items.map((i: any) => {
    const qty = Number(i.quantity) || 1
    const price = Number(i.item_price) || 0
    totalAmount += qty * price
    return {
      productId: i.product_retailer_id,
      quantity: qty,
      price: price,
      currency: i.currency || "OMR",
    }
  })

  const tenantId = currentTenant()?.tenantId || null
  const orderNumber = `WA-${Date.now().toString().slice(-6)}`

  let kitchenOrderId: string | null = null
  if (tenantId) {
    const created = await db.kitchenOrder.create({
      data: {
        tenantId,
        orderType: "TAKEAWAY",
        customerName: customerName || from,
        customerPhone: from,
        itemsJson: JSON.stringify(parsedItems),
        totalAmount,
        currency: "OMR",
        status: "PENDING",
        specialNotes: `WhatsApp Catalog Order (${orderNumber})${notes ? `: ${notes}` : ""}`,
      },
    }).catch((e) => { console.error("Catalog order database insert error:", e); return null })
    kitchenOrderId = created?.id ?? null
  }

  const itemsList = parsedItems.map((i: { quantity: number; productId: string; price: number }) => `• ${i.quantity}x ${i.productId} (${i.price.toFixed(3)} OMR)`).join("\n")
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.fizmoh.cloud"
  const orderStatusUrl = kitchenOrderId
    ? `${baseUrl}/track/KIT-${kitchenOrderId}`
    : `${baseUrl}/shop`

  const replyText = `🛍️ *Order Received! #${orderNumber}*\n\n*Items:*\n${itemsList}\n\n💰 *Total:* ${totalAmount.toFixed(3)} OMR${notes ? `\n📝 *Notes:* ${notes}` : ""}\n\nYour order has been sent to our kitchen! Tap below to track your order status:`

  const { sendCtaUrlMessage } = await import("@/lib/whatsapp")
  const sent = await sendCtaUrlMessage({
    to: from,
    body: replyText,
    buttonText: "Track My Order",
    url: orderStatusUrl,
  })

  // Fallback to plain text if CTA failed
  if (!sent.success) {
    await sendWhatsApp({ to: from, body: `${replyText}\n\n👉 ${orderStatusUrl}`, allowOutsideSession: true })
  }

  await db.message.create({
    data: {
      conversationId,
      customerId,
      direction: "BOT",
      type: "TEXT",
      content: `${replyText}\n${orderStatusUrl}`,
      isAiGenerated: false,
      status: "SENT",
    },
  })

  // Follow-up: Contact / Waiter button
  await sendInteractiveMessage({
    to: from,
    body: "Need help with your order? 💬",
    buttons: [
      { id: `call_waiter_${kitchenOrderId || ""}`, title: "🔔 Call Waiter" },
      { id: "bk_chat_ai", title: "🤖 AI Assistant" },
    ],
  }).catch(() => null)
}
