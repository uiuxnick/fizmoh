import { withErrors } from "@/lib/api-handler"
import { resolveHospTenantId } from "@/lib/hospital"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { startOfDay, endOfDay, addMinutes } from "date-fns"

export const POST = withErrors(async (req: NextRequest) => {
  const tenantId = await resolveHospTenantId(req)
  const { bedId, bookingDate, sessionId, patientRef } = await req.json()
  if (!bedId || !bookingDate || !patientRef || String(patientRef).length < 8) {
    return NextResponse.json({ error: "Bed, booking date, and patient session are required" }, { status: 400 })
  }

  const date = new Date(bookingDate)
  const settings = await db.hospSettings.findUnique({ where: { tenantId } })
  const holdMins = settings?.holdDurationMins || 5

  // Check bed is in this tenant
  const bed = await db.hospBed.findFirst({ where: { id: bedId, tenantId } })
  if (!bed) return NextResponse.json({ error: "Bed not found" }, { status: 404 })

  // Check not already booked
  const existing = await db.hospChemoBooking.findFirst({
    where: {
      bedId,
      bed: { tenantId },
      bookingDate: { gte: startOfDay(date), lte: endOfDay(date) },
      ...(sessionId ? { sessionId } : {}),
      status: { notIn: ["CANCELLED", "RESCHEDULED"] },
    },
  })
  if (existing) return NextResponse.json({ error: "Bed already booked" }, { status: 409 })

  // Check not already held
  const existingHold = await db.hospBedHold.findFirst({
    where: {
      bedId,
      bed: { tenantId },
      bookingDate: { gte: startOfDay(date), lte: endOfDay(date) },
      ...(sessionId ? { sessionId } : {}),
      expiresAt: { gt: new Date() },
    },
  })
  if (existingHold) return NextResponse.json({ error: "Bed temporarily held" }, { status: 409 })

  // Check for existing block
  const block = await db.hospBedBlock.findFirst({
    where: {
      bedId,
      bed: { tenantId },
      startDatetime: { lte: endOfDay(date) },
      endDatetime: { gte: startOfDay(date) },
    },
  })
  if (block) return NextResponse.json({ error: "Bed is blocked" }, { status: 409 })

  const hold = await db.hospBedHold.create({
    data: {
      bedId,
      bookingDate: date,
      sessionId: sessionId || null,
      patientRef,
      expiresAt: addMinutes(new Date(), holdMins),
    },
  })

  return NextResponse.json({ hold, expiresAt: hold.expiresAt, holdMins })
})

export const DELETE = withErrors(async (req: NextRequest) => {
  const url = new URL(req.url)
  const holdId = url.searchParams.get("holdId")
  const patientRef = url.searchParams.get("patientRef")
  if (holdId && patientRef) {
    await db.hospBedHold.deleteMany({ where: { id: holdId, patientRef } })
  }
  return NextResponse.json({ ok: true })
})
