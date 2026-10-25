import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "PLATFORM", "MANAGER"]

export const GET = withErrors(withModule("APPOINTMENTS", async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const service = await db.aptService.findFirst({
    where: { id, tenantId: tenant.tenantId },
    include: {
      category: true,
      providerServices: { include: { provider: true } },
      customFields: true,
    },
  })

  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 })
  return NextResponse.json({ service })
}))

export const PUT = withErrors(withModule("APPOINTMENTS", async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (tenant.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only workspace administrators can edit services" }, { status: 403 })
  }
  const { id } = await params

  const body = await req.json().catch(() => ({}))
  const { providerIds, ...updateData } = body

  const service = await db.aptService.update({
    where: { id },
    data: updateData,
  })

  if (Array.isArray(providerIds)) {
    await db.aptProviderService.deleteMany({ where: { serviceId: id } })
    if (providerIds.length > 0) {
      await db.aptProviderService.createMany({
        data: providerIds.map((providerId: string) => ({
          tenantId: tenant.tenantId,
          serviceId: id,
          providerId,
        })),
      })
    }
  }

  return NextResponse.json({ service })
}))

export const DELETE = withErrors(withModule("APPOINTMENTS", async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (tenant.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only workspace administrators can delete services" }, { status: 403 })
  }
  const { id } = await params

  await db.aptService.delete({ where: { id } })
  return NextResponse.json({ success: true })
}))
