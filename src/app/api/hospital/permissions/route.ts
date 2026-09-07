import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"

const managers = new Set(["OWNER", "SUPER_ADMIN", "ADMIN"])
const roles = new Set(["CLINICAL", "ADMINISTRATIVE", "HOSPITAL_MANAGER", "VIEWER"])

export const GET = withErrors(async () => {
  const tenant = currentTenant(); if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !managers.has(tenant.role)) return NextResponse.json({ error: "Permission management is restricted" }, { status: 403 })
  const members = await db.tenantMember.findMany({ where: { tenantId: tenant.tenantId }, include: { staff: { select: { id: true, name: true, email: true, isActive: true } } }, orderBy: { invitedAt: "asc" } })
  return NextResponse.json({ members })
})

export const PATCH = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant(); if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !managers.has(tenant.role)) return NextResponse.json({ error: "Permission management is restricted" }, { status: 403 })
  const body = await request.json().catch(() => null); const memberId = String(body?.memberId ?? ""); const role = String(body?.role ?? "")
  if (!memberId || !roles.has(role)) return NextResponse.json({ error: "Valid member and hospital role are required" }, { status: 400 })
  const permissions = body?.permissions && typeof body.permissions === "object" ? body.permissions : {}
  const member = await db.tenantMember.updateMany({ where: { id: memberId, tenantId: tenant.tenantId }, data: { role, permissions } })
  if (!member.count) return NextResponse.json({ error: "Member not found" }, { status: 404 })
  await db.platformAuditEvent.create({ data: { tenantId: tenant.tenantId, actorStaffId: tenant.staffId ?? null, action: "HOSPITAL_PERMISSION_UPDATED", entity: "TenantMember", entityId: memberId, after: { role, permissions } } })
  return NextResponse.json({ updated: true })
})
