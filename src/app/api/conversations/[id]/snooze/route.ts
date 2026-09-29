import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { publish } from "@/lib/realtime"

/**
 * POST /api/conversations/[id]/snooze
 * Snoozes a conversation until a specified timestamp or duration:
 * - duration: "1h" | "3h" | "tomorrow_9am" | "2d" | ISO date string
 * - snoozedUntil: ISO date string
 *
 * DELETE /api/conversations/[id]/snooze
 * Immediately wakes up (unsnoozes) conversation back to OPEN.
 */
export const POST = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { duration, snoozedUntil: explicitUntil, reason } = body

  const existing = await db.conversation.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  let untilDate = new Date()
  if (explicitUntil) {
    const parsed = new Date(explicitUntil)
    if (!isNaN(parsed.getTime())) untilDate = parsed
    else untilDate.setHours(untilDate.getHours() + 3)
  } else if (duration === "1h") {
    untilDate.setHours(untilDate.getHours() + 1)
  } else if (duration === "3h") {
    untilDate.setHours(untilDate.getHours() + 3)
  } else if (duration === "tomorrow_9am") {
    untilDate.setDate(untilDate.getDate() + 1)
    untilDate.setHours(9, 0, 0, 0)
  } else if (duration === "2d") {
    untilDate.setDate(untilDate.getDate() + 2)
  } else {
    // Default 3 hours
    untilDate.setHours(untilDate.getHours() + 3)
  }

  const currentFlowState =
    existing.flowState && typeof existing.flowState === "object" ? (existing.flowState as Record<string, any>) : {}

  const updatedFlowState = {
    ...currentFlowState,
    _snooze: {
      snoozedUntil: untilDate.toISOString(),
      snoozedAt: new Date().toISOString(),
      snoozedByStaffId: session.staffId || null,
      reason: reason || null,
    },
  }

  const updated = await db.conversation.update({
    where: { id },
    data: {
      status: "SNOOZED",
      flowState: updatedFlowState,
    },
  })

  publish({
    type: "conversation",
    conversationId: id,
    tenantId: updated.tenantId || undefined,
  })

  return NextResponse.json({
    success: true,
    conversation: updated,
    snoozedUntil: untilDate.toISOString(),
  })
})

export const DELETE = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const existing = await db.conversation.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  const currentFlowState =
    existing.flowState && typeof existing.flowState === "object" ? { ...(existing.flowState as Record<string, any>) } : {}

  delete currentFlowState._snooze

  const updated = await db.conversation.update({
    where: { id },
    data: {
      status: "OPEN",
      flowState: currentFlowState,
    },
  })

  publish({
    type: "conversation",
    conversationId: id,
    tenantId: updated.tenantId || undefined,
  })

  return NextResponse.json({
    success: true,
    conversation: updated,
  })
})
