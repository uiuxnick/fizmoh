/**
 * Facebook and Instagram comment/mention automation — the same rules as DMs,
 * scoped down: a comment reply is public, so it is always short, and an
 * escalated comment is never auto-answered even when DM automation is fully
 * automatic for this tenant.
 */

import { currentTenant } from "@/lib/tenant"
import { createAuditLog } from "@/lib/slots-server"
import { messengerAdapter } from "@/lib/social/messenger-adapter"
import { instagramAdapter } from "@/lib/social/instagram-adapter"
import { detectSocialEscalation, generateSocialReply, canAutoSendReply, type Tone } from "@/lib/social/social-ai"
import type { InboundSocialComment, SocialChannel } from "@/lib/social/types"

function adapterFor(channel: SocialChannel) {
  return channel === "FACEBOOK" ? messengerAdapter : instagramAdapter
}

export async function processInboundSocialComment(inbound: InboundSocialComment): Promise<void> {
  const { db } = await import("@/lib/db")
  const tenant = currentTenant()
  if (!tenant?.tenantId) return

  const existing = await db.message.findUnique({ where: { externalId: inbound.commentId } })
  if (existing) return

  const settings = await db.socialAutomationSettings.findUnique({
    where: { tenantId_channel: { tenantId: tenant.tenantId, channel: inbound.channel } },
  })

  // The comment is logged either way — visible in the inbox as its own kind
  // of conversation row — but nothing is drafted or sent without automation on.
  const customer = await db.customer.upsert({
    where: { tenantId_socialId: { tenantId: tenant.tenantId, socialId: inbound.fromExternalId } },
    create: {
      tenantId: tenant.tenantId, socialId: inbound.fromExternalId,
      phone: `social:${inbound.channel.toLowerCase()}:${inbound.fromExternalId}`, name: inbound.fromName,
      source: inbound.channel,
    },
    update: inbound.fromName ? { name: inbound.fromName } : {},
  })

  let conversation = await db.conversation.findFirst({
    where: { customerId: customer.id, channel: inbound.channel, externalUserId: inbound.commentId },
  })
  if (!conversation) {
    conversation = await db.conversation.create({
      data: {
        tenantId: tenant.tenantId, customerId: customer.id, customerPhone: customer.phone,
        customerName: inbound.fromName, channel: inbound.channel, externalUserId: inbound.commentId,
        status: "OPEN", labels: ["COMMENT"],
      },
    })
  }

  await db.message.create({
    data: {
      tenantId: tenant.tenantId, conversationId: conversation.id, customerId: customer.id,
      externalId: inbound.commentId, direction: "INBOUND", type: "TEXT", content: inbound.text, createdAt: inbound.timestamp,
    },
  })

  if (!settings?.enabled || !settings.commentAutoReplyEnabled || conversation.automationPaused || !conversation.botActive) return

  const account = await db.socialAccount.findFirst({ where: { tenantId: tenant.tenantId, channel: inbound.channel, externalAccountId: inbound.recipientAccountId, isActive: true } })
  if (!account) return

  // ─── 1. Keyword-Triggered Comment-to-DM & Auto-Reply ───
  const keywordRules = await db.socialKeywordReply.findMany({
    where: { tenantId: tenant.tenantId, channel: inbound.channel, isActive: true },
  })
  const lower = (inbound.text || "").toLowerCase()
  const matchedRule = keywordRules.find(r => {
    const list = r.keywords.split(",").map(k => k.trim().toLowerCase()).filter(Boolean)
    return list.some(k => lower.includes(k))
  })

  if (matchedRule) {
    let publicReplyText: string | null = null
    let privateReplyText: string | null = null
    try {
      const parsed = JSON.parse(matchedRule.reply)
      if (parsed && typeof parsed === "object") {
        if (parsed.public) publicReplyText = String(parsed.public)
        if (parsed.private) privateReplyText = String(parsed.private)
      } else {
        publicReplyText = matchedRule.reply
      }
    } catch {
      publicReplyText = matchedRule.reply
    }

    // Automatically enroll commenter into contact list with channel opt-in for future campaigns
    await db.customer.update({
      where: { id: customer.id },
      data: {
        facebookOptIn: inbound.channel === "FACEBOOK" ? true : customer.facebookOptIn,
        instagramOptIn: inbound.channel === "INSTAGRAM" ? true : customer.instagramOptIn,
        optInSource: "COMMENT_REPLY",
        optInAt: new Date(),
      },
    })

    const canAutoSend = canAutoSendReply(settings, false)

    await db.$transaction(async tx => {
      // Dispatch public comment reply if configured
      if (publicReplyText) {
        const publicMsg = await tx.message.create({
          data: {
            tenantId: tenant.tenantId, conversationId: conversation.id,
            direction: "BOT", type: "TEXT", content: publicReplyText,
            status: canAutoSend ? "QUEUED" : "DRAFT", isAiGenerated: false,
          },
        })
        if (canAutoSend) {
          await tx.socialReplyJob.create({
            data: {
              tenantId: tenant.tenantId, messageId: publicMsg.id, accountId: account.id,
              channel: inbound.channel, recipientId: inbound.commentId, kind: "COMMENT",
              dueAt: new Date(Date.now() + settings.replyDelaySeconds * 1000),
            },
          })
        }
      }

      // Dispatch private DM reply if configured
      if (privateReplyText) {
        const privateMsg = await tx.message.create({
          data: {
            tenantId: tenant.tenantId, conversationId: conversation.id,
            direction: "BOT", type: "TEXT", content: privateReplyText,
            status: canAutoSend ? "QUEUED" : "DRAFT", isAiGenerated: false,
          },
        })
        if (canAutoSend) {
          await tx.socialReplyJob.create({
            data: {
              tenantId: tenant.tenantId, messageId: privateMsg.id, accountId: account.id,
              channel: inbound.channel, recipientId: inbound.commentId, kind: "PRIVATE_REPLY",
              dueAt: new Date(Date.now() + settings.replyDelaySeconds * 1000),
            },
          })
        }
      }
    })

    if (canAutoSend && !settings.replyDelaySeconds) {
      const { runSocialReplyQueue } = await import("./social-reply-queue")
      await runSocialReplyQueue()
    }
    return
  }

  // ─── 2. AI & Escalation Fallback ───
  const extraKeywords = Array.isArray(settings.handoffKeywords) ? (settings.handoffKeywords as string[]) : []
  const escalation = detectSocialEscalation(inbound.text, extraKeywords)
  if (escalation.escalate) {
    await db.conversation.update({ where: { id: conversation.id }, data: { automationPaused: true, labels: ["COMMENT", escalation.reason || "ESCALATED"] } })
    await createAuditLog({ action: "SOCIAL_COMMENT_ESCALATED", entity: "Conversation", entityId: conversation.id, details: escalation })
    return
  }

  const tenantRow = await db.tenant.findUnique({ where: { id: tenant.tenantId }, select: { name: true } })
  let replyText: string
  try {
    replyText = await generateSocialReply({
      message: inbound.text, businessName: tenantRow?.name || "",
      businessInfo: (settings.businessInfo as Record<string, unknown>) || null,
      customInstructions: (settings.customInstructions || "") + " This is a public comment reply — keep it to one short sentence.",
      tone: settings.tone as Tone, customTone: settings.customTone, language: "Match the customer's message", history: [],
    })
  } catch (error) {
    console.error("Comment reply generation unavailable; handed to staff")
    await db.conversation.update({ where: { id: conversation.id }, data: { automationPaused: true, status: "PENDING" } })
    await createAuditLog({ action: "SOCIAL_COMMENT_ESCALATED", entity: "Conversation", entityId: conversation.id, details: { reason: "AI answer unavailable" } })
    return
  }

  const { decryptSecret } = await import("@/lib/secret-box")
  const canAutoSend = canAutoSendReply(settings, false)

  if (!canAutoSend) {
    await db.message.create({
      data: { tenantId: tenant.tenantId, conversationId: conversation.id, direction: "BOT", type: "TEXT", content: replyText, status: "DRAFT", isAiGenerated: true },
    })
    return
  }

  await db.$transaction(async tx => {
    const message = await tx.message.create({ data: { tenantId: tenant.tenantId, conversationId: conversation.id, direction: "BOT", type: "TEXT", content: replyText, status: "QUEUED", isAiGenerated: true } })
    await tx.socialReplyJob.create({ data: { tenantId: tenant.tenantId, messageId: message.id, accountId: account.id, channel: inbound.channel, recipientId: inbound.commentId, kind: "COMMENT", dueAt: new Date(Date.now() + settings.replyDelaySeconds * 1000) } })
  })
  if (!settings.replyDelaySeconds) {
    const { runSocialReplyQueue } = await import("./social-reply-queue")
    await runSocialReplyQueue()
  }
}
