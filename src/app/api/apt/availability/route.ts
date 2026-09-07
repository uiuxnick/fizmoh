import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { generateAvailableSlots } from "@/lib/apt-slots"
import { currentTenant } from "@/lib/tenant"
import { localDateKey } from "@/lib/timezone"

export const GET = withErrors(async (req: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const serviceId = searchParams.get("serviceId")
  const date = searchParams.get("date") || localDateKey(new Date())
  const providerId = searchParams.get("providerId") || undefined
  const branchId = searchParams.get("branchId") || undefined

  if (!serviceId) {
    return NextResponse.json({ error: "serviceId is required" }, { status: 400 })
  }

  const slots = await generateAvailableSlots({
    tenantId: tenant.tenantId,
    serviceId,
    date,
    providerId,
    branchId,
  })

  return NextResponse.json({ date, slots })
})
