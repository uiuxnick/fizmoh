import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { publish } from "@/lib/realtime"

/**
 * POST /api/conversations/bulk-update
 *
 * Performs batch updates on conversations:
 * - action: "resolve" | "open" | "assign" | "add_label" | "remove_label" | "snooze"
 * - conversationIds: string[]
 * - assignedStaffId?: string
 * - label?: string
 * - duration?: string
 */
export const POST = withErrors(async (req: NextRequest) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { conversationIds, action, assignedStaffId, label, duration } = body

  if (!Array.isArray(conversationIds) || conversationIds.length === 0) {
    return NextResponse.json({ error: "conversationIds array is required" }, { status: 400 })
  }

  if (!action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 })
  }

  const convos = await db.conversation.findMany({
    where: { id: { in: conversationIds } },
    select: { id: true, customerId: true, customerPhone: true, labels: true, flowState: true, tenantId: true },
  })

  if (convos.length === 0) {
    return NextResponse.json({ success: true, count: 0 })
  }

  if (action === "resolve") {
    await db.conversation.updateMany({
      where: { id: { in: conversationIds } },
      data: { status: "RESOLVED" },
    })
  } else if (action === "open") {
    await db.conversation.updateMany({
      where: { id: { in: conversationIds } },
      data: { status: "OPEN" },
    })
  } else if (action === "assign") {
    await db.conversation.updateMany({
      where: { id: { in: conversationIds } },
      data: { assignedStaffId: assignedStaffId || null },
    })
  } else if (action === "snooze") {
    let untilDate = new Date()
    if (duration === "1h") untilDate.setHours(untilDate.getHours() + 1)
    else if (duration === "tomorrow_9am") {
      untilDate.setDate(untilDate.getDate() + 1)
      untilDate.setHours(9, 0, 0, 0)
    } else {
      untilDate.setHours(untilDate.getHours() + 3)
    }

    for (const c of convos) {
      const curFlow = c.flowState && typeof c.flowState === "object" ? (c.flowState as Record<string, any>) : {}
      await db.conversation.update({
        where: { id: c.id },
        data: {
          status: "SNOOZED",
          flowState: {
            ...curFlow,
            _snooze: {
              snoozedUntil: untilDate.toISOString(),
              snoozedAt: new Date().toISOString(),
              snoozedByStaffId: session.staffId || null,
            },
          },
        },
      })
    }
  } else if (action === "add_label" && label) {
    const cleanLabel = String(label).trim()
    for (const c of convos) {
      let existingLabels: string[] = []
      if (Array.isArray(c.labels)) existingLabels = (c.labels as string[]).map(String)
      else if (typeof c.labels === "string") {
        try {
          const parsed = JSON.parse(c.labels)
          existingLabels = Array.isArray(parsed) ? parsed.map(String) : [c.labels]
        } catch {
          existingLabels = [c.labels]
        }
      }
      if (!existingLabels.includes(cleanLabel)) {
        const nextLabels = [...existingLabels, cleanLabel]
        await db.conversation.update({
          where: { id: c.id },
          data: { labels: nextLabels },
        })
        if (c.customerId) {
          await db.customer.update({
            where: { id: c.customerId },
            data: { tags: nextLabels },
          }).catch(() => {})
        } else if (c.customerPhone) {
          await db.customer.updateMany({
            where: { phone: c.customerPhone },
            data: { tags: nextLabels },
          }).catch(() => {})
        }
      }
    }
  } else if (action === "remove_label" && label) {
    const cleanLabel = String(label).trim()
    for (const c of convos) {
      let existingLabels: string[] = []
      if (Array.isArray(c.labels)) existingLabels = (c.labels as string[]).map(String)
      else if (typeof c.labels === "string") {
        try {
          const parsed = JSON.parse(c.labels)
          existingLabels = Array.isArray(parsed) ? parsed.map(String) : [c.labels]
        } catch {
          existingLabels = [c.labels]
        }
      }
      if (existingLabels.includes(cleanLabel)) {
        const nextLabels = existingLabels.filter(l => l !== cleanLabel)
        await db.conversation.update({
          where: { id: c.id },
          data: { labels: nextLabels },
        })
        if (c.customerId) {
          await db.customer.update({
            where: { id: c.customerId },
            data: { tags: nextLabels },
          }).catch(() => {})
        } else if (c.customerPhone) {
          await db.customer.updateMany({
            where: { phone: c.customerPhone },
            data: { tags: nextLabels },
          }).catch(() => {})
        }
      }
    }
  }

  // Realtime notification
  for (const c of convos) {
    publish({
      type: "conversation",
      conversationId: c.id,
      tenantId: c.tenantId || undefined,
    })
  }

  return NextResponse.json({
    success: true,
    count: convos.length,
    action,
  })
})
