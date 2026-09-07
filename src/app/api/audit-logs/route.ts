import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant } from "@/lib/tenant"

/**
 * Audit Logs API
 * Per BRD §8: "Every payment approval/rejection, booking modification, and refund
 * is logged with user, timestamp, and reason."
 *
 * Supported query params:
 *  - action   : filter by AuditLog.action (e.g. APPROVE_PAYMENT, REFUND)
 *  - entity   : filter by AuditLog.entity (ORDER, PAYMENT, TOUR, CUSTOMER)
 *  - entityId : filter by AuditLog.entityId (substring search)
 *  - staffId  : filter by acting staff member
 *  - from     : ISO date — logs createdAt >= from
 *  - to       : ISO date — logs createdAt <= to
 *  - limit    : max results (default 100, max 500)
 *  - search   : substring against entityId, reason, action
 */
export const GET = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const tenant = currentTenant()
  if (session?.kind !== "staff" || !tenant?.tenantId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { searchParams } = new URL(request.url)

  const action = searchParams.get("action")
  const entity = searchParams.get("entity")
  const entityId = searchParams.get("entityId")
  const staffId = searchParams.get("staffId")
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const search = searchParams.get("search")
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500)

  const where: any = { tenantId: tenant.tenantId }
  if (action) where.action = action
  if (entity) where.entity = entity
  if (entityId) where.entityId = { contains: entityId }
  if (staffId) where.staffId = staffId

  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) where.createdAt.lte = new Date(to)
  }

  if (search) {
    where.OR = [
      { entityId: { contains: search } },
      { reason: { contains: search } },
      { action: { contains: search } },
      { entity: { contains: search } },
    ]
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: {
        staff: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        order: { select: { id: true, orderNumber: true, customerName: true, tour: { select: { name: true } } } },
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    db.auditLog.count({ where }),
  ])

  // Normalize details field (can be JSON object or stringified JSON in seed data)
  const items = logs.map(l => {
    let details: any = l.details
    if (typeof details === "string") {
      try { details = JSON.parse(details) } catch { /* keep raw string */ }
    }
    return { ...l, details }
  })

  // Aggregate counts per action for the filter panel
  const actionCounts: Record<string, number> = {}
  for (const l of items) {
    actionCounts[l.action] = (actionCounts[l.action] || 0) + 1
  }

  return NextResponse.json({ logs: items, total, actionCounts })
})
