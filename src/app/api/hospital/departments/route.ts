import { resolveHospTenantId } from "@/lib/hospital"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"

export async function GET(req?: Request) {
  const tenantId = await resolveHospTenantId(req)
  const depts = await db.hospDepartment.findMany({
    where: { tenantId, isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { doctors: true } } },
  })
  return NextResponse.json(depts)
}

export const POST = withErrors(async (req: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !["OWNER", "SUPER_ADMIN", "MANAGER"].includes(tenant.role)) {
    return NextResponse.json({ error: "Only hospital administrators can manage departments" }, { status: 403 })
  }
  const tenantId = await resolveHospTenantId(req)
  const body = await req.json()
  const d = await db.hospDepartment.create({
    data: {
      tenantId,
      name: String(body.name || "").trim(),
      description: body.description == null ? null : String(body.description),
      isActive: body.isActive !== false,
      sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
    },
  })
  return NextResponse.json(d, { status: 201 })
})
