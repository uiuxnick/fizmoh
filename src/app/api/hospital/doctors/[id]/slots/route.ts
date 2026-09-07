import { withErrors } from "@/lib/api-handler"
import { resolveHospTenantId } from "@/lib/hospital"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { addMinutes, format, parse, isBefore, isAfter, startOfDay, endOfDay } from "date-fns"

export const GET = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const tenantId = await resolveHospTenantId(req)
  const url = new URL(req.url)
  const dateStr = url.searchParams.get("date") // YYYY-MM-DD
  if (!dateStr) return NextResponse.json({ slots: [] })

  const date = new Date(dateStr)
  const dayOfWeek = date.getDay()

  const doctor = await db.hospDoctor.findFirst({
    where: { id, tenantId },
    include: {
      schedules: { where: { dayOfWeek, isActive: true } },
      unavailable: { where: { date: { gte: startOfDay(date), lte: endOfDay(date) } } },
    },
  })
  if (!doctor) return NextResponse.json({ slots: [] })
  if (doctor.unavailable.length > 0) return NextResponse.json({ slots: [], unavailable: true })

  // Existing appointments that day
  const booked = await db.hospDoctorAppointment.findMany({
    where: {
      tenantId,
      doctorId: id,
      appointmentDate: { gte: startOfDay(date), lte: endOfDay(date) },
      status: { notIn: ["CANCELLED"] },
    },
    select: { appointmentTime: true },
  })
  const bookedTimes = new Set(booked.map(b => b.appointmentTime))

  const slots: string[] = []
  for (const sched of doctor.schedules) {
    let current = parse(sched.startTime, "HH:mm", date)
    const end = parse(sched.endTime, "HH:mm", date)
    while (isBefore(current, end)) {
      const t = format(current, "HH:mm")
      if (!bookedTimes.has(t)) slots.push(t)
      current = addMinutes(current, sched.appointmentDuration)
    }
  }

  return NextResponse.json({ slots })
})
