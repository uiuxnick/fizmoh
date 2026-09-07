import { withErrors } from "@/lib/api-handler"
import { resolveHospTenantId } from "@/lib/hospital"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { startOfDay, endOfDay } from "date-fns"

export const GET = withErrors(async (req?: Request) => {
  const tenantId = await resolveHospTenantId(req)
  const today = new Date()

  const [normalWard, specialWard] = await Promise.all([
    db.hospWard.findFirst({ where: { tenantId, wardType: "NORMAL" } }),
    db.hospWard.findFirst({ where: { tenantId, wardType: "SPECIAL" } }),
  ])

  async function wardStats(ward: any) {
    if (!ward) return null
    const total = ward.totalBeds
    const booked = await db.hospChemoBooking.count({
      where: { tenantId, bed: { wardId: ward.id }, bookingDate: { gte: startOfDay(today), lte: endOfDay(today) }, status: { notIn: ["CANCELLED", "RESCHEDULED"] } },
    })
    const held = await db.hospBedHold.count({
      where: { bed: { wardId: ward.id }, bookingDate: { gte: startOfDay(today), lte: endOfDay(today) }, expiresAt: { gt: today } },
    })
    const blocked = await db.hospBedBlock.count({
      where: { bed: { wardId: ward.id }, startDatetime: { lte: endOfDay(today) }, endDatetime: { gte: startOfDay(today) } },
    })
    return { name: ward.name, wardType: ward.wardType, total, booked, held, blocked, available: Math.max(0, total - booked - held - blocked) }
  }

  const [normal, special, totalApts] = await Promise.all([
    wardStats(normalWard),
    wardStats(specialWard),
    db.hospDoctorAppointment.count({ where: { tenantId, appointmentDate: { gte: startOfDay(today), lte: endOfDay(today) }, status: { notIn: ["CANCELLED"] } } }),
  ])

  return NextResponse.json({
    date: today.toISOString(),
    normal,
    special,
    totalChemo: (normal?.booked || 0) + (special?.booked || 0),
    totalBeds: 30,
    totalAvailable: (normal?.available || 0) + (special?.available || 0),
    doctorAppointmentsToday: totalApts,
  })
})
