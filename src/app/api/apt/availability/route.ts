import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { generateAvailableSlots } from "@/lib/apt-slots"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { localDateKey } from "@/lib/timezone"

export const GET = withErrors(withModule("APPOINTMENTS", async (req: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const serviceId = searchParams.get("serviceId")
  const date = searchParams.get("date") || localDateKey(new Date())
  const providerId = searchParams.get("providerId") || undefined
  const branchId = searchParams.get("branchId") || undefined

  if (!serviceId) {
    return NextResponse.json({ error: "serviceId is required" }, { status: 400 })
  }

  const service = await db.aptService.findFirst({
    where: { id: serviceId, tenantId: tenant.tenantId, status: "ACTIVE", isBookingEnabled: true },
    select: { id: true },
  })
  if (!service) {
    return NextResponse.json({ error: "Service not found or inactive" }, { status: 404 })
  }

  const slots = await generateAvailableSlots({
    tenantId: tenant.tenantId,
    serviceId,
    date,
    providerId,
    branchId,
  })

  return NextResponse.json({ date, slots })
}))
