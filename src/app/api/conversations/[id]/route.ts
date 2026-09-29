import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { publish } from "@/lib/realtime"

// GET single conversation (lightweight, no messages)
export const GET = withErrors(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      customer: true,
      assignedStaff: true,
    },
  })
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  return NextResponse.json({ conversation })
})

// PATCH conversation — update botActive, status, assignedStaffId, labels
export const PATCH = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const body = await request.json()
  const { botActive, status, assignedStaffId, labels } = body

  const existing = await db.conversation.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })

  const data: any = {}
  if (typeof botActive === "boolean") {
    data.botActive = botActive
    data.automationPaused = !botActive
  }
  if (status) data.status = status
  if (assignedStaffId !== undefined) data.assignedStaffId = assignedStaffId || null
  if (labels !== undefined) {
    if (Array.isArray(labels)) {
      data.labels = labels.map(String).filter(Boolean)
    } else if (typeof labels === "string") {
      try {
        const parsed = JSON.parse(labels)
        data.labels = Array.isArray(parsed)
          ? parsed.map(String).filter(Boolean)
          : (labels.trim() && labels.trim() !== "[]" ? [labels.trim()] : [])
      } catch {
        data.labels = labels.trim() && labels.trim() !== "[]" ? [labels.trim()] : []
      }
    } else if (labels === null) {
      data.labels = []
    }
  }

  const conversation = await db.conversation.update({ where: { id }, data })

  if (data.labels !== undefined) {
    if (existing.customerId) {
      await db.customer.update({
        where: { id: existing.customerId },
        data: { tags: data.labels },
      }).catch(() => {})
    } else if (existing.customerPhone) {
      await db.customer.updateMany({
        where: { phone: existing.customerPhone },
        data: { tags: data.labels },
      }).catch(() => {})
    }
  }

  if (data.status === "RESOLVED") {
    // Asynchronously extract and learn facts in background if auto-learn is enabled
    import("@/lib/chat-training")
      .then(m => m.handleConversationAutoLearn(id, conversation.tenantId || undefined))
      .catch(err => console.error("Background chat auto-learning error:", err))
  }

  publish({
    type: "conversation",
    conversationId: id,
    tenantId: conversation.tenantId || undefined,
  })
  return NextResponse.json({ conversation })
})
