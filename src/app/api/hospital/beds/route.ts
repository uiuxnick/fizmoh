import { withErrors } from "@/lib/api-handler"
import { resolveHospTenantId } from "@/lib/hospital"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { startOfDay, endOfDay } from "date-fns"

export const GET = withErrors(async (req: NextRequest) => {
  const tenantId = await resolveHospTenantId(req)
  const url = new URL(req.url)
  const wardType = url.searchParams.get("wardType") // NORMAL | SPECIAL
  const dateStr = url.searchParams.get("date")
  const sessionId = url.searchParams.get("sessionId") || undefined

  const date = dateStr ? new Date(dateStr) : new Date()

  const ward = await db.hospWard.findFirst({ where: { tenantId, wardType: wardType || "NORMAL" } })
  if (!ward) return NextResponse.json({ beds: [] })

  const beds = await db.hospBed.findMany({
    where: { wardId: ward.id, isActive: true },
    orderBy: { bedNumber: "asc" },
    include: {
      blocks: {
        where: {
          startDatetime: { lte: endOfDay(date) },
          endDatetime: { gte: startOfDay(date) },
        },
      },
      holds: {
        where: {
          bookingDate: { gte: startOfDay(date), lte: endOfDay(date) },
          expiresAt: { gt: new Date() },
          ...(sessionId ? { sessionId } : {}),
        },
      },
      bookings: {
        where: {
          bookingDate: { gte: startOfDay(date), lte: endOfDay(date) },
          ...(sessionId ? { sessionId } : {}),
          status: { notIn: ["CANCELLED", "RESCHEDULED"] },
        },
        include: { patient: { select: { fullName: true, mrn: true } } },
      },
    },
  })

  const result = beds.map(bed => {
    let status = "AVAILABLE"
    let booking: any = null
    if (bed.blocks.length > 0) status = "BLOCKED"
    else if (bed.bookings.length > 0) {
      status = bed.bookings[0].status === "CHECKED_IN" ? "OCCUPIED"
              : bed.bookings[0].status === "COMPLETED" ? "CLEANING" : "BOOKED"
      booking = bed.bookings[0]
    } else if (bed.holds.length > 0) status = "HELD"

    return { id: bed.id, bedNumber: bed.bedNumber, status, booking }
  })

  return NextResponse.json({ ward: { id: ward.id, name: ward.name, wardType: ward.wardType, totalBeds: ward.totalBeds }, beds: result })
})
