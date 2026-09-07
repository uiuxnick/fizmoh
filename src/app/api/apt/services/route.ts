import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"

export const GET = withErrors(async (req: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const services = await db.aptService.findMany({
    where: { tenantId: tenant.tenantId },
    include: {
      category: true,
      providerServices: {
        include: { provider: true },
      },
      customFields: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ services })
})

export const POST = withErrors(async (req: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const {
    name, nameAr, description, categoryId, durationMins, bufferMins,
    price, currency, onlineInPerson, isBookingEnabled, isWhatsappEnabled,
    providerIds,
  } = body

  if (!name) {
    return NextResponse.json({ error: "Service name is required" }, { status: 400 })
  }

  const service = await db.aptService.create({
    data: {
      tenantId: tenant.tenantId,
      name,
      nameAr,
      description,
      categoryId: categoryId || null,
      durationMins: Number(durationMins) || 30,
      bufferMins: Number(bufferMins) || 0,
      price: Number(price) || 0,
      currency: currency || "OMR",
      onlineInPerson: onlineInPerson || "IN_PERSON",
      isBookingEnabled: isBookingEnabled !== false,
      isWhatsappEnabled: isWhatsappEnabled !== false,
      status: "ACTIVE",
    },
  })

  if (Array.isArray(providerIds) && providerIds.length > 0) {
    await db.aptProviderService.createMany({
      data: providerIds.map((providerId: string) => ({
        tenantId: tenant.tenantId,
        serviceId: service.id,
        providerId,
      })),
    })
  }

  return NextResponse.json({ service }, { status: 201 })
})
