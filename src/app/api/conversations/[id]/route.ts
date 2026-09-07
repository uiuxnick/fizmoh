import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"

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
  if (typeof botActive === "boolean") data.botActive = botActive
  if (status) data.status = status
  if (assignedStaffId !== undefined) data.assignedStaffId = assignedStaffId || null
  if (labels) data.labels = labels

  const conversation = await db.conversation.update({ where: { id }, data })
  return NextResponse.json({ conversation })
})
