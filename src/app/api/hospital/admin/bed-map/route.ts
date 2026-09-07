import { withErrors } from "@/lib/api-handler"
import { resolveHospTenantId } from "@/lib/hospital"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { startOfDay, endOfDay } from "date-fns"

export const GET = withErrors(async (req: NextRequest) => {
  const tenantId = await resolveHospTenantId(req)
  const url = new URL(req.url)
  const dateStr = url.searchParams.get("date")
  const sessionId = url.searchParams.get("sessionId") || undefined
  const date = dateStr ? new Date(dateStr) : new Date()

  const wards = await db.hospWard.findMany({
    where: { tenantId },
    orderBy: { wardType: "asc" },
    include: {
      beds: {
        where: { isActive: true },
        orderBy: { bedNumber: "asc" },
        include: {
          blocks: { where: { startDatetime: { lte: endOfDay(date) }, endDatetime: { gte: startOfDay(date) } } },
          holds: { where: { bookingDate: { gte: startOfDay(date), lte: endOfDay(date) }, expiresAt: { gt: new Date() }, ...(sessionId ? { sessionId } : {}) } },
          bookings: {
            where: { bookingDate: { gte: startOfDay(date), lte: endOfDay(date) }, ...(sessionId ? { sessionId } : {}), status: { notIn: ["CANCELLED", "RESCHEDULED"] } },
            include: { patient: { select: { fullName: true, mrn: true, mobile: true } }, doctor: { select: { name: true } }, session: true },
          },
        },
      },
    },
  })

  const result = wards.map(ward => ({
    id: ward.id,
    name: ward.name,
    wardType: ward.wardType,
    totalBeds: ward.totalBeds,
    beds: ward.beds.map(bed => {
      let status = "AVAILABLE"
      let data: any = null
      if (bed.blocks.length > 0) { status = "BLOCKED"; data = { reason: bed.blocks[0].reason } }
      else if (bed.bookings.length > 0) {
        const b = bed.bookings[0]
        status = b.status === "CHECKED_IN" || b.status === "OCCUPIED" ? "OCCUPIED"
               : b.status === "COMPLETED" ? "CLEANING" : "BOOKED"
        data = { bookingRef: b.bookingRef, patient: b.patient, doctor: b.doctor, session: b.session, status: b.status }
      }
      else if (bed.holds.length > 0) { status = "HELD"; data = { expiresAt: bed.holds[0].expiresAt } }
      return { id: bed.id, bedNumber: bed.bedNumber, status, data }
    }),
  }))

  return NextResponse.json(result)
})
