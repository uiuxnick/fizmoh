import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { sessionFromRequest } from "@/lib/auth"
import { callingStatus, enableCalling, placeCall, fallbackNumber } from "@/lib/calling"
import { ringingCalls } from "@/lib/live-calls"
import { createAuditLog } from "@/lib/slots-server"
import { z } from "zod"

/**
 * Call history, and whether calling works at all.
 *
 * The history is derived from CALL messages the webhook already records, so
 * there is no separate table to keep in step with the thread.
 */
export const GET = withErrors(withModule("CALLS", async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)

  const messages = await db.message.findMany({
    where: { type: "CALL" },
    orderBy: { createdAt: "desc" },
    take: Math.min(200, parseInt(searchParams.get("limit") || "100")),
    include: {
      conversation: { select: { id: true, customerName: true, customerPhone: true } },
    },
  })

  const calls = messages.map(message => ({
    id: message.id,
    conversationId: message.conversationId,
    customerName: message.conversation?.customerName ?? "Unknown",
    customerPhone: message.conversation?.customerPhone ?? "",
    direction: message.direction,
    summary: message.content,
    at: message.createdAt,
  }))

  const status = await callingStatus();

  return NextResponse.json({
    calls,
    // Anything ringing right now, so an app that has just reconnected picks up
    // a call it was not listening for when the webhook arrived.
    ringing: ringingCalls().map(call => ({
      callId: call.callId,
      conversationId: call.conversationId,
      customerName: call.customerName,
      from: call.from,
      offer: call.offer,
      receivedAt: call.receivedAt,
    })),
    calling: {
      ...status,
      // What to do instead while WhatsApp calling is off.
      fallbackNumber: await fallbackNumber(),
    },
  })
}))

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("enable"), enabled: z.boolean() }),
  z.object({
    action: z.literal("call"),
    to: z.string().trim().regex(/^\+[1-9]\d{7,14}$/),
    sdp: z.string().max(20000).optional(),
  }),
])

export const POST = withErrors(withModule("CALLS", async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const staffId = session?.kind === "staff" ? session.staffId : null
  if (!staffId) return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const parsed = actionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  if (parsed.data.action === "enable") {
    const staff = await db.staff.findUnique({ where: { id: staffId } })
    if (!staff || !["SUPER_ADMIN", "MANAGER"].includes(staff.role)) {
      return NextResponse.json({ error: "Only an administrator can change this" }, { status: 403 })
    }
    const result = await enableCalling(parsed.data.enabled)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

    await createAuditLog({
      staffId: staffId,
      action: parsed.data.enabled ? "ENABLE_CALLING" : "DISABLE_CALLING",
      entity: "SETTING",
      entityId: "calling",
    })
    return NextResponse.json({ ok: true })
  }

  const result = await placeCall(parsed.data.to, parsed.data.sdp)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true, callId: result.callId })
}))
