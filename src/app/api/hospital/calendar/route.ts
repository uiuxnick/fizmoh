import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { resolveHospTenantId } from "@/lib/hospital"
import { withModule } from "@/lib/entitlements"
import { sessionFromRequest } from "@/lib/auth"

export const GET = withErrors(withModule("HOSPITAL", async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const tenantId = await resolveHospTenantId(request)
  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get("month") // e.g. "2026-08"

  const now = new Date()
  const year = monthParam ? parseInt(monthParam.split("-")[0], 10) : now.getFullYear()
  const month = monthParam ? parseInt(monthParam.split("-")[1], 10) - 1 : now.getMonth()

  const startDate = new Date(year, month, 1, 0, 0, 0)
  const endDate = new Date(year, month + 1, 0, 23, 59, 59)

  const chemoBookings = await db.hospChemoBooking.findMany({
    where: {
      tenantId,
      bookingDate: { gte: startDate, lte: endDate },
    },
    include: {
      patient: true,
      doctor: true,
      bed: { include: { ward: true } },
      session: true,
    },
    orderBy: { bookingDate: "asc" },
  })

  const doctorApts = await db.hospDoctorAppointment.findMany({
    where: {
      tenantId,
      appointmentDate: { gte: startDate, lte: endDate },
    },
    include: {
      patient: true,
      doctor: true,
    },
    orderBy: { appointmentDate: "asc" },
  })

  // Group by date (YYYY-MM-DD)
  const eventsByDate: Record<string, { chemo: any[]; doctor: any[]; total: number }> = {}

  for (const c of chemoBookings) {
    const dStr = c.bookingDate.toISOString().split("T")[0]
    if (!eventsByDate[dStr]) eventsByDate[dStr] = { chemo: [], doctor: [], total: 0 }
    eventsByDate[dStr].chemo.push({
      id: c.id,
      bookingRef: c.bookingRef,
      patientName: c.patient?.fullName || "Patient",
      mrn: c.patient?.mrn,
      mobile: c.patient?.mobile,
      bedNumber: c.bed?.bedNumber,
      wardName: c.bed?.ward?.name,
      sessionName: c.session?.name,
      sessionTime: c.session ? `${c.session.startTime} - ${c.session.endTime}` : "08:00 - 14:00",
      doctorName: c.doctor?.name,
      status: c.status,
    })
    eventsByDate[dStr].total++
  }

  for (const d of doctorApts) {
    const dStr = d.appointmentDate.toISOString().split("T")[0]
    if (!eventsByDate[dStr]) eventsByDate[dStr] = { chemo: [], doctor: [], total: 0 }
    eventsByDate[dStr].doctor.push({
      id: d.id,
      appointmentRef: d.appointmentRef,
      patientName: d.patient?.fullName || "Patient",
      mrn: d.patient?.mrn,
      mobile: d.patient?.mobile,
      doctorName: d.doctor?.name,
      specialization: d.doctor?.specialization,
      appointmentTime: d.appointmentTime || "10:30",
      status: d.status,
    })
    eventsByDate[dStr].total++
  }

  return NextResponse.json({
    year,
    month: month + 1,
    eventsByDate,
    stats: {
      totalChemoMonth: chemoBookings.length,
      totalDoctorMonth: doctorApts.length,
      activeDays: Object.keys(eventsByDate).length,
    },
  })
}))
