import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

const SOCIAL_CHANNELS = ["FACEBOOK", "INSTAGRAM"]

/** Recent audit trail + failed sends — the operational "what happened" view. */
export const GET = withErrors(withModule("SOCIAL_INBOX", async () => {
  const [logs, failedMessages] = await Promise.all([
    db.auditLog.findMany({
      where: { action: { startsWith: "SOCIAL_" } }, orderBy: { createdAt: "desc" }, take: 100,
      include: { staff: { select: { name: true } } },
    }),
    db.message.findMany({
      where: { direction: "BOT", status: "FAILED", conversation: { channel: { in: SOCIAL_CHANNELS } } },
      orderBy: { createdAt: "desc" }, take: 50,
      include: { conversation: { select: { channel: true, customerName: true, id: true } } },
    }),
  ])

  return NextResponse.json({
    logs: logs.map(l => ({ id: l.id, action: l.action, entity: l.entity, entityId: l.entityId, details: l.details, staffName: l.staff?.name || null, createdAt: l.createdAt })),
    failedMessages: failedMessages.map(m => ({ id: m.id, conversationId: m.conversation.id, channel: m.conversation.channel, customerName: m.conversation.customerName, content: m.content, createdAt: m.createdAt })),
  })
}))
