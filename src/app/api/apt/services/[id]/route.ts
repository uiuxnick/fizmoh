import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"

export const GET = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const tenant = currentTenant()
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
})

export const PUT = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const tenant = currentTenant()
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const body = await req.json()
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
})

export const DELETE = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const tenant = currentTenant()
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  await db.aptService.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
