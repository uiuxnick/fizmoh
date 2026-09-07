import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { decryptSecret } from "@/lib/secret-box"
import { canAutoSendReply } from "./social-ai"
import { messengerAdapter } from "./messenger-adapter"
import { instagramAdapter } from "./instagram-adapter"

export async function runSocialReplyQueue() {
  const tenantId = currentTenant()?.tenantId
  if (!tenantId) return { sent: 0 }
  // A crashed send has an unknown delivery outcome. Never automatically resend it.
  const interrupted = await db.socialReplyJob.updateMany({ where: { tenantId, status: "SENDING", updatedAt: { lt: new Date(Date.now() - 300_000) } }, data: { status: "UNKNOWN", error: "Delivery interrupted; check the conversation before retrying." } })
  if (interrupted.count) await db.auditLog.create({ data: { tenantId, action: "SOCIAL_DELIVERY_UNKNOWN", entity: "SocialReplyJob", entityId: tenantId, details: { count: interrupted.count, message: "Check delivery before retrying interrupted sends" } } })
  const jobs = await db.socialReplyJob.findMany({ where: { tenantId, status: "WAITING", dueAt: { lte: new Date() } }, orderBy: { dueAt: "asc" }, take: 25 })
  let sent = 0
  for (const job of jobs) {
    const claimed = await db.socialReplyJob.updateMany({ where: { id: job.id, tenantId, status: "WAITING" }, data: { status: "SENDING" } })
    if (!claimed.count) continue
    try {
      const message = await db.message.findFirst({ where: { id: job.messageId, tenantId }, include: { conversation: true } })
      const settings = await db.socialAutomationSettings.findUnique({ where: { tenantId_channel: { tenantId, channel: job.channel } } })
      const account = await db.socialAccount.findFirst({ where: { id: job.accountId, tenantId, isActive: true, status: "CONNECTED" } })
      const allowed = settings && settings.enabled && (job.kind === "COMMENT" || job.kind === "PRIVATE_REPLY" ? settings.commentAutoReplyEnabled : settings.dmAutoReplyEnabled) && canAutoSendReply(settings, false)
      const lastInbound = message ? await db.message.findFirst({ where: { conversationId: message.conversationId, direction: "INBOUND" }, orderBy: { createdAt: "desc" } }) : null
      const expired = job.kind === "DM" && (!lastInbound || Date.now() - lastInbound.createdAt.getTime() >= 86_400_000)
      if (!message || message.status !== "QUEUED" || !allowed || !account || message.conversation.automationPaused || !message.conversation.botActive || expired) {
        if (message?.status === "QUEUED") await db.message.update({ where: { id: message.id }, data: { status: "DRAFT" } })
        await db.socialReplyJob.update({ where: { id: job.id }, data: { status: "CANCELLED", error: "Automation paused, approval required, account unavailable, or reply window expired." } })
        continue
      }
      const [hourly, daily] = await Promise.all([3_600_000, 86_400_000].map(ms => db.message.count({ where: { tenantId, direction: "BOT", status: { in: ["SENT", "DELIVERED", "READ"] }, createdAt: { gte: new Date(Date.now() - ms) }, conversation: { channel: job.channel } } })))
      if (hourly >= settings.hourlyMessageLimit || daily >= settings.dailyMessageLimit) {
        await db.socialReplyJob.update({ where: { id: job.id }, data: { status: "WAITING", dueAt: new Date(Date.now() + 3_600_000) } })
        continue
      }
      const adapter = job.channel === "FACEBOOK" ? messengerAdapter : instagramAdapter
      const result = job.kind === "COMMENT"
        ? await adapter.replyToComment(decryptSecret(account.accessToken), job.recipientId, message.content)
        : job.kind === "PRIVATE_REPLY"
        ? await adapter.sendPrivateReplyToComment(decryptSecret(account.accessToken), job.recipientId, message.content)
        : await adapter.sendText(decryptSecret(account.accessToken), job.recipientId, message.content)
      await db.message.update({ where: { id: message.id }, data: { status: result.ok ? "SENT" : "FAILED", externalId: result.externalMessageId } })
      await db.socialReplyJob.update({ where: { id: job.id }, data: { status: result.ok ? "DONE" : "FAILED", error: result.error?.slice(0, 500) } })
      if (result.ok) {
        sent++
        await db.conversation.update({ where: { id: message.conversationId }, data: { lastMessageAt: new Date(), lastMessageText: message.content } })
      }
    } catch {
      await db.auditLog.create({ data: { tenantId, action: "SOCIAL_DELIVERY_UNKNOWN", entity: "Message", entityId: job.messageId, details: { message: "Check actual delivery before retrying" } } })
      await db.socialReplyJob.update({ where: { id: job.id }, data: { status: "UNKNOWN", error: "Delivery interrupted; check the conversation before retrying." } })
    }
  }
  return { sent }
}
