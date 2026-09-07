import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"

const allowed = new Set(["OWNER", "ADMIN", "MANAGER", "SUPER_ADMIN"])
export const GET = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant(); if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !allowed.has(tenant.role)) return NextResponse.json({ error: "Clinical audit access is restricted" }, { status: 403 })
  const patientId = new URL(request.url).searchParams.get("patientId")
  const logs = await db.auditLog.findMany({ where: { tenantId: tenant.tenantId, ...(patientId ? { entityId: patientId } : {}), entity: { startsWith: "Hosp" } }, orderBy: { createdAt: "desc" }, take: 200 })
  return NextResponse.json({ logs })
})
