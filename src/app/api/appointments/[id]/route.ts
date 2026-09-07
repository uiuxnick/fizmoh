import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { sessionFromRequest } from "@/lib/auth"
import { syncAppointmentToCalendar, removeEvent } from "@/lib/google-calendar"
import { createAuditLog } from "@/lib/slots-server"
import { APPOINTMENT_STATUSES, slotIsFree } from "@/lib/appointments"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
  phone: z.string().trim().max(30).optional(),
  service: z.string().trim().min(1).max(120).optional(),
  companyName: z.string().trim().max(200).optional(),
  companyWebsite: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(2000).optional(),
  scheduledAt: z.coerce.date().optional(),
  durationMins: z.coerce.number().int().min(5).max(480).optional(),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  assignedStaffId: z.string().max(100).nullable().optional(),
})

export const GET = withErrors(withModule("APPOINTMENTS", async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params
  const appointment = await db.appointment.findUnique({ where: { id }, include: { customer: true } })
  if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
  return NextResponse.json({ appointment })
}))

export const PATCH = withErrors(withModule("APPOINTMENTS", async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const { id } = await context.params
  const existing = await db.appointment.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Appointment not found" }, { status: 404 })

  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid changes" }, { status: 400 })
  const changes = parsed.data

  // Moving one appointment on top of another is as bad as double-booking a
  // new one, so the same check applies.
  if (changes.scheduledAt && changes.scheduledAt.getTime() !== existing.scheduledAt.getTime()) {
    if (!(await slotIsFree(changes.scheduledAt))) {
      return NextResponse.json({ error: "Something is already booked at that time" }, { status: 409 })
    }
  }

  const appointment = await db.appointment.update({
    where: { id },
    data: {
      ...changes,
      email: changes.email === "" ? null : changes.email,
    },
  })

  // A moved, renamed or cancelled appointment has to reach the calendar, or
  // the entry says one thing and the panel says another.
  await syncAppointmentToCalendar(id)

  await createAuditLog({
    staffId: session.staffId,
    action: changes.status ? "SET_APPOINTMENT_STATUS" : "UPDATE_APPOINTMENT",
    entity: "APPOINTMENT",
    entityId: id,
    details: JSON.stringify({ reference: existing.reference, changes: Object.keys(changes) }),
  })

  return NextResponse.json({ appointment: await db.appointment.findUnique({ where: { id } }) })
}))

export const DELETE = withErrors(withModule("APPOINTMENTS", async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Sign in first" }, { status: 401 })
  const staff = await db.staff.findUnique({ where: { id: session.staffId } })
  if (!staff || !["SUPER_ADMIN", "MANAGER"].includes(staff.role)) {
    return NextResponse.json({ error: "Only an administrator can delete an appointment" }, { status: 403 })
  }

  const { id } = await context.params
  const existing = await db.appointment.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Appointment not found" }, { status: 404 })

  await removeEvent(existing.reference)
  await db.appointment.delete({ where: { id } })

  await createAuditLog({
    staffId: session.staffId,
    action: "DELETE_APPOINTMENT",
    entity: "APPOINTMENT",
    entityId: id,
    details: JSON.stringify({ reference: existing.reference, name: existing.name }),
  })

  return NextResponse.json({ deleted: true })
}))
