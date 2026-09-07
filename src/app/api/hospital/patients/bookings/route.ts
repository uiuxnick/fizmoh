import { withErrors } from "@/lib/api-handler"
import { resolveHospTenantId } from "@/lib/hospital"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

/** Public patient lookup for the booking portal. Only exact MRN + mobile
 * matches are accepted, and the response contains booking details rather than
 * the patient's clinical record. */
export const POST = withErrors(async (req: NextRequest) => {
  const tenantId = await resolveHospTenantId(req)
  const body = await req.json().catch(() => ({}))
  const mrn = String(body.mrn || "").trim()
  const mobile = String(body.mobile || "").trim()
  if (!mrn || !mobile) return NextResponse.json({ error: "MRN and mobile are required" }, { status: 400 })

  const patient = await db.hospPatient.findFirst({ where: { tenantId, mrn, mobile }, select: { id: true } })
  if (!patient) return NextResponse.json({ found: false, bookings: [] })

  const [appointments, chemo] = await Promise.all([
    db.hospDoctorAppointment.findMany({
      where: { tenantId, patientId: patient.id, status: { notIn: ["CANCELLED", "COMPLETED"] } },
      select: { appointmentRef: true, appointmentDate: true, appointmentTime: true, status: true, doctor: { select: { name: true } } },
      orderBy: { appointmentDate: "asc" }, take: 20,
    }),
    db.hospChemoBooking.findMany({
      where: { tenantId, patientId: patient.id, status: { notIn: ["CANCELLED", "COMPLETED"] } },
      select: { bookingRef: true, bookingDate: true, status: true, doctor: { select: { name: true } }, bed: { select: { bedNumber: true } } },
      orderBy: { bookingDate: "asc" }, take: 20,
    }),
  ])

  return NextResponse.json({
    found: true,
    bookings: [
      ...appointments.map(a => ({ type: "Doctor appointment", reference: a.appointmentRef, date: a.appointmentDate.toISOString(), time: a.appointmentTime, status: a.status, provider: a.doctor.name })),
      ...chemo.map(c => ({ type: "Chemotherapy day care", reference: c.bookingRef, date: c.bookingDate.toISOString(), status: c.status, provider: c.doctor.name, bed: c.bed.bedNumber })),
    ],
  })
})
