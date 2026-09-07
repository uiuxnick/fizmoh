import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

const SOCIAL_CHANNELS = ["FACEBOOK", "INSTAGRAM"]

/** Real, query-computed numbers only — per channel and combined. */
export const GET = withErrors(withModule("SOCIAL_INBOX", async () => {
  const [receivedByChannel, sentByChannel, aiReplies, humanReplies, escalated, failed, leadsGenerated] = await Promise.all([
    Promise.all(SOCIAL_CHANNELS.map(async channel => ({
      channel, count: await db.message.count({ where: { direction: "INBOUND", conversation: { channel } } }),
    }))),
    Promise.all(SOCIAL_CHANNELS.map(async channel => ({
      channel, count: await db.message.count({ where: { direction: "BOT", status: "SENT", conversation: { channel } } }),
    }))),
    db.message.count({ where: { direction: "BOT", isAiGenerated: true, status: "SENT", conversation: { channel: { in: SOCIAL_CHANNELS } } } }),
    db.message.count({ where: { direction: "BOT", isAiGenerated: false, status: "SENT", conversation: { channel: { in: SOCIAL_CHANNELS } } } }),
    db.conversation.count({ where: { channel: { in: SOCIAL_CHANNELS }, automationPaused: true } }),
    db.message.count({ where: { direction: "BOT", status: "FAILED", conversation: { channel: { in: SOCIAL_CHANNELS } } } }),
    db.lead.count({ where: { flowName: { in: ["FACEBOOK_DM", "INSTAGRAM_DM"] } } }),
  ])

  // Average time from a customer's message to the bot's own reply — the same
  // "response time" shape as the review-reply module's analytics.
  const recentReplies = await db.message.findMany({
    where: { direction: "BOT", status: "SENT", conversation: { channel: { in: SOCIAL_CHANNELS } } },
    orderBy: { createdAt: "desc" }, take: 300,
    select: { createdAt: true, conversationId: true },
  })
  let avgResponseMinutes: number | null = null
  if (recentReplies.length) {
    const deltas: number[] = []
    for (const reply of recentReplies) {
      const priorInbound = await db.message.findFirst({
        where: { conversationId: reply.conversationId, direction: "INBOUND", createdAt: { lte: reply.createdAt } },
        orderBy: { createdAt: "desc" },
      })
      if (priorInbound) deltas.push(reply.createdAt.getTime() - priorInbound.createdAt.getTime())
    }
    if (deltas.length) avgResponseMinutes = Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length / 60000)
  }

  return NextResponse.json({
    receivedByChannel, sentByChannel, aiReplies, humanReplies, escalated, failedMessages: failed,
    leadsGenerated, avgResponseMinutes,
  })
}))
