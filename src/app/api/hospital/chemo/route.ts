import { withErrors } from "@/lib/api-handler"
import { resolveHospTenantId } from "@/lib/hospital"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { startOfDay, endOfDay, format } from "date-fns"
import { nanoid } from "nanoid"
import { sendHospitalBookingUpdate } from "@/lib/vertical-whatsapp"

function makeRef(date: Date, suffix: string) {
  const d = format(date, "yyMMdd")
  return "CHEMO-" + d + "-" + suffix.padStart(3, "0")
}

export const GET = withErrors(async (req: NextRequest) => {
  const tenantId = await resolveHospTenantId(req)
  const url = new URL(req.url)
  const dateStr = url.searchParams.get("date")
  const wardType = url.searchParams.get("wardType")

  const where: any = { tenantId }
  if (dateStr) {
    const d = new Date(dateStr)
    where.bookingDate = { gte: startOfDay(d), lte: endOfDay(d) }
  }
  if (wardType) {
    where.bed = { ward: { wardType } }
  }

  const bookings = await db.hospChemoBooking.findMany({
    where,
    include: {
      patient: true,
      doctor: { include: { department: true } },
      bed: { include: { ward: true } },
      session: true,
    },
    orderBy: { bookingDate: "asc" },
  })
  return NextResponse.json(bookings)
})

export const POST = withErrors(async (req: NextRequest) => {
  const tenantId = await resolveHospTenantId(req)
  const body = await req.json()
  const { bedId, bookingDate, sessionId, patientId, doctorId, holdId, patientRef, source = "WEB" } = body
  if (!bedId || !bookingDate || !patientId || !doctorId) {
    return NextResponse.json({ error: "Patient, doctor, bed, and booking date are required" }, { status: 400 })
  }
  const [patient, doctor, bed, session] = await Promise.all([
    db.hospPatient.findFirst({ where: { id: patientId, tenantId } }),
    db.hospDoctor.findFirst({ where: { id: doctorId, tenantId, isActive: true } }),
    db.hospBed.findFirst({ where: { id: bedId, tenantId, isActive: true } }),
    sessionId ? db.hospTreatmentSession.findFirst({ where: { id: sessionId, tenantId, isActive: true } }) : null,
  ])
  if (!patient || !doctor || !bed || (sessionId && !session)) {
    return NextResponse.json({ error: "Invalid patient, doctor, bed, or session" }, { status: 400 })
  }

  const date = new Date(bookingDate)

  // Verify hold exists and belongs to this request
  if (holdId) {
    const hold = await db.hospBedHold.findFirst({
      where: { id: holdId, bedId, patientRef, expiresAt: { gt: new Date() }, bed: { tenantId } },
    })
    if (!hold) {
      return NextResponse.json({ error: "Hold expired. Please select bed again." }, { status: 409 })
    }
  }

  // Final double-booking check within transaction
  const count = await db.hospChemoBooking.count({
    where: {
      tenantId,
      bedId,
      bookingDate: { gte: startOfDay(date), lte: endOfDay(date) },
      ...(sessionId ? { sessionId } : {}),
      status: { notIn: ["CANCELLED", "RESCHEDULED"] },
    },
  })
  if (count > 0) {
    return NextResponse.json({ error: "This bed was just booked by another patient. Please select another bed." }, { status: 409 })
  }

  const bookingRef = makeRef(date, nanoid(6).toUpperCase())

  const booking = await db.$transaction(async (tx) => {
    // Delete hold
    if (holdId) await tx.hospBedHold.deleteMany({ where: { id: holdId, patientRef, bed: { tenantId } } })
    // Create booking
    return tx.hospChemoBooking.create({
      data: { tenantId, bookingRef, patientId, doctorId, bedId, sessionId: sessionId || null, bookingDate: date, source },
      include: {
        patient: true,
        doctor: true,
        bed: { include: { ward: true } },
        session: true,
      },
    })
  })

  await sendHospitalBookingUpdate({ phone: booking.patient.mobile, patientName: booking.patient.fullName, reference: booking.bookingRef, type: "chemo", date: format(booking.bookingDate, "yyyy-MM-dd"), time: booking.session ? `${booking.session.startTime} - ${booking.session.endTime}` : null, doctor: booking.doctor.name, bed: booking.bed.bedNumber })

  return NextResponse.json(booking, { status: 201 })
})
