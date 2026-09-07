import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant } from "@/lib/tenant"

const TYPES = ["CALL", "MESSAGE", "QUOTE", "MEETING", "FOLLOW_UP", "OTHER"]
const PRIORITIES = ["LOW", "NORMAL", "HIGH"]

/**
 * Follow-up tasks.
 *
 * Reads default to open work, soonest first, because that is the question
 * being asked almost every time: what do I owe someone today.
 */
export const GET = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const params = new URL(request.url).searchParams
  const scope = params.get("scope") ?? "open"
  const customerId = params.get("customerId")
  const assigneeId = params.get("assigneeId")

  const where: Record<string, unknown> = {}
  if (customerId) where.customerId = customerId
  if (assigneeId === "me") where.assigneeId = session.staffId
  else if (assigneeId) where.assigneeId = assigneeId
  if (scope === "open") where.completedAt = null
  if (scope === "done") where.completedAt = { not: null }
  if (scope === "overdue") {
    where.completedAt = null
    where.dueAt = { lt: new Date() }
  }

  const tasks = await db.crmTask.findMany({
    where,
    // Undated tasks sort last: a task with a date is a commitment, one
    // without is an intention.
    orderBy: [{ completedAt: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: Math.min(Number(params.get("limit")) || 100, 200),
    include: { customer: { select: { id: true, name: true, phone: true } } },
  })

  return NextResponse.json({ tasks })
})

export const POST = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  const tenantId = currentTenant()?.tenantId
  if (!tenantId) return NextResponse.json({ error: "No workspace in context" }, { status: 400 })

  const body = await request.json().catch(() => null)
  const title = String(body?.title ?? "").trim()
  if (!title) return NextResponse.json({ error: "A task needs a title" }, { status: 400 })

  const dueAt = body?.dueAt ? new Date(body.dueAt) : null
  if (dueAt && Number.isNaN(dueAt.getTime())) {
    return NextResponse.json({ error: "That due date could not be read" }, { status: 400 })
  }

  const task = await db.crmTask.create({
    data: {
      tenantId,
      customerId: body?.customerId || null,
      title: title.slice(0, 300),
      notes: body?.notes ? String(body.notes).slice(0, 2000) : null,
      type: TYPES.includes(body?.type) ? body.type : "FOLLOW_UP",
      priority: PRIORITIES.includes(body?.priority) ? body.priority : "NORMAL",
      dueAt,
      // Unassigned by default rather than self-assigned: a task nobody has
      // picked up should be visible as such.
      assigneeId: body?.assigneeId || null,
      createdById: session.staffId ?? null,
    },
    include: { customer: { select: { id: true, name: true, phone: true } } },
  })

  return NextResponse.json({ task }, { status: 201 })
})
