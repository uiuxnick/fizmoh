import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"

export const GET = withErrors(async (req: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const providers = await db.aptProvider.findMany({
    where: { tenantId: tenant.tenantId },
    include: {
      providerServices: { include: { service: true } },
      schedules: true,
      leaves: true,
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json({ providers })
})

export const POST = withErrors(async (req: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { name, role, specialty, description, photoUrl, staffId, serviceIds } = body

  if (!name) return NextResponse.json({ error: "Provider name is required" }, { status: 400 })

  const provider = await db.aptProvider.create({
    data: {
      tenantId: tenant.tenantId,
      name,
      role: role || "Provider",
      specialty,
      description,
      photoUrl,
      staffId,
      status: "ACTIVE",
    },
  })

  // Create default Mon-Fri working schedules (09:00 - 17:00)
  const defaultSchedules: any[] = []
  for (let day = 0; day <= 6; day++) {
    const isWorking = day >= 1 && day <= 5 // Mon-Fri default
    defaultSchedules.push({
      tenantId: tenant.tenantId,
      providerId: provider.id,
      dayOfWeek: day,
      isWorkingDay: isWorking,
      shiftsJson: JSON.stringify([{ start: "09:00", end: "17:00" }]),
      breaksJson: JSON.stringify([{ start: "13:00", end: "14:00" }]),
    })
  }
  await db.aptSchedule.createMany({ data: defaultSchedules })

  if (Array.isArray(serviceIds) && serviceIds.length > 0) {
    await db.aptProviderService.createMany({
      data: serviceIds.map((serviceId: string) => ({
        tenantId: tenant.tenantId,
        providerId: provider.id,
        serviceId,
      })),
    })
  }

  return NextResponse.json({ provider }, { status: 201 })
})
