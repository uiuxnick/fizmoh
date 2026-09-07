import { withErrors } from "@/lib/api-handler"
import { resolveHospTenantId } from "@/lib/hospital"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { startOfDay, endOfDay, format } from "date-fns"
import { nanoid } from "nanoid"
import { sendHospitalBookingUpdate } from "@/lib/vertical-whatsapp"

export const GET = withErrors(async (req: NextRequest) => {
  const tenantId = await resolveHospTenantId(req)
  const url = new URL(req.url)
  const dateStr = url.searchParams.get("date")
  const patientId = url.searchParams.get("patientId")

  const where: any = { tenantId }
  if (dateStr) {
    const d = new Date(dateStr)
    where.appointmentDate = { gte: startOfDay(d), lte: endOfDay(d) }
  }
  if (patientId) where.patientId = patientId

  const apts = await db.hospDoctorAppointment.findMany({
    where,
    include: { patient: true, doctor: { include: { department: true } } },
    orderBy: { appointmentDate: "asc" },
  })
  return NextResponse.json(apts)
})

export const POST = withErrors(async (req: NextRequest) => {
  const tenantId = await resolveHospTenantId(req)
  const body = await req.json()
  const { patientId, doctorId, appointmentDate, appointmentTime, source = "WEB" } = body
  if (!patientId || !doctorId || !appointmentDate || !appointmentTime) {
    return NextResponse.json({ error: "Patient, doctor, date, and time are required" }, { status: 400 })
  }
  const [patient, doctor] = await Promise.all([
    db.hospPatient.findFirst({ where: { id: patientId, tenantId } }),
    db.hospDoctor.findFirst({ where: { id: doctorId, tenantId, isActive: true } }),
  ])
  if (!patient || !doctor) return NextResponse.json({ error: "Patient or doctor not found" }, { status: 404 })

  const date = new Date(appointmentDate)
  if (Number.isNaN(date.getTime())) return NextResponse.json({ error: "Invalid appointment date" }, { status: 400 })
  const appointmentRef = "APT-" + format(date, "yyMMdd") + "-" + nanoid(6).toUpperCase()

  const apt = await db.hospDoctorAppointment.create({
    data: { tenantId, appointmentRef, patientId, doctorId, appointmentDate: date, appointmentTime, source },
    include: { patient: true, doctor: { include: { department: true } } },
  })
  await sendHospitalBookingUpdate({ phone: apt.patient.mobile, patientName: apt.patient.fullName, reference: apt.appointmentRef, type: "doctor", date: format(apt.appointmentDate, "yyyy-MM-dd"), time: apt.appointmentTime, doctor: apt.doctor.name })
  return NextResponse.json(apt, { status: 201 })
})
