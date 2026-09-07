import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"

const TYPES = ["CALL", "MESSAGE", "QUOTE", "MEETING", "FOLLOW_UP", "OTHER"]
const PRIORITIES = ["LOW", "NORMAL", "HIGH"]

/** Update a task, including completing or reopening it. */
export const PATCH = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const existing = await db.crmTask.findFirst({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = String(body.title).trim().slice(0, 300)
  if (body.notes !== undefined) data.notes = body.notes ? String(body.notes).slice(0, 2000) : null
  if (body.type !== undefined && TYPES.includes(body.type)) data.type = body.type
  if (body.priority !== undefined && PRIORITIES.includes(body.priority)) data.priority = body.priority
  if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId || null
  if (body.dueAt !== undefined) {
    if (!body.dueAt) data.dueAt = null
    else {
      const d = new Date(body.dueAt)
      if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "That due date could not be read" }, { status: 400 })
      data.dueAt = d
    }
  }
  // Completion records who closed it, so a finished task still answers "by whom".
  if (body.completed !== undefined) {
    data.completedAt = body.completed ? new Date() : null
    data.completedBy = body.completed ? session.staffId ?? null : null
  }

  const task = await db.crmTask.update({
    where: { id },
    data,
    include: { customer: { select: { id: true, name: true, phone: true } } },
  })
  return NextResponse.json({ task })
})

/** Tasks carry no audit weight of their own, so these really are deleted. */
export const DELETE = withErrors(async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const existing = await db.crmTask.findFirst({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 })
  await db.crmTask.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
