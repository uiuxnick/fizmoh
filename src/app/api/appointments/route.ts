import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { sessionFromRequest } from "@/lib/auth"
import { notifyStaff } from "@/lib/realtime"
import { syncAppointmentToCalendar } from "@/lib/google-calendar"
import { createAuditLog } from "@/lib/slots-server"
import { appointmentReference, appointmentsEnabled, appointmentServices, appointmentSlots, defaultDurationMins, slotIsFree } from "@/lib/appointments"
import { checkRateLimit, requestIp } from "@/lib/rate-limit"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
  phone: z.string().trim().max(30).optional(),
  service: z.string().trim().min(1).max(120),
  companyName: z.string().trim().max(200).optional(),
  companyWebsite: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(2000).optional(),
  scheduledAt: z.coerce.date(),
  durationMins: z.coerce.number().int().min(5).max(480).optional(),
  source: z.enum(["ADMIN", "WHATSAPP", "WEB"]).default("ADMIN"),
  customerId: z.string().max(100).optional(),
})

export const GET = withErrors(withModule("APPOINTMENTS", async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const search = searchParams.get("search")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (from || to) {
    where.scheduledAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    }
  }
  if (search) {
    where.OR = [
      { reference: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { companyName: { contains: search, mode: "insensitive" } },
    ]
  }

  const [appointments, services, enabled, duration, slots] = await Promise.all([
    db.appointment.findMany({
      where,
      orderBy: { scheduledAt: "desc" },
      take: Math.min(200, parseInt(searchParams.get("limit") || "100")),
    }),
    appointmentServices(),
    appointmentsEnabled(),
    defaultDurationMins(),
    appointmentSlots(),
  ])

  return NextResponse.json({ appointments, services, enabled, defaultDurationMins: duration, slots })
}))

export const POST = withErrors(withModule("APPOINTMENTS", async (request: NextRequest) => {
  if (!(await appointmentsEnabled())) {
    return NextResponse.json({ error: "Appointments are turned off" }, { status: 403 })
  }

  const session = await sessionFromRequest(request)
  // A booking form open to the public needs a limit; a signed-in member of
  // staff entering a morning's calls does not.
  if (session?.kind !== "staff") {
    const rate = checkRateLimit(`appointments:${requestIp(request.headers)}`, 10, 60 * 60 * 1000)
    if (!rate.allowed) return NextResponse.json({ error: "Too many attempts" }, { status: 429 })
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid appointment details" }, { status: 400 })
  const body = parsed.data

  if (!Number.isFinite(body.scheduledAt.getTime())) {
    return NextResponse.json({ error: "That date could not be read" }, { status: 400 })
  }

  // Two people can pick the same slot in the gap between loading the times and
  // submitting, so the clash is checked here rather than only in the browser.
  if (!(await slotIsFree(body.scheduledAt))) {
    return NextResponse.json({ error: "That time has just been taken — please pick another" }, { status: 409 })
  }

  const appointment = await db.appointment.create({
    data: {
      reference: appointmentReference(),
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      service: body.service,
      companyName: body.companyName || null,
      companyWebsite: body.companyWebsite || null,
      notes: body.notes || null,
      scheduledAt: body.scheduledAt,
      durationMins: body.durationMins ?? (await defaultDurationMins()),
      source: session?.kind === "staff" ? "ADMIN" : body.source,
      customerId: body.customerId || null,
      createdById: session?.kind === "staff" ? session.staffId : null,
    },
  })

  // The calendar write also mints the Meet link, so it is awaited here rather
  // than fired and forgotten: the caller wants the link in the response.
  await syncAppointmentToCalendar(appointment.id)
  const saved = await db.appointment.findUnique({ where: { id: appointment.id } })

  await notifyStaff({
    type: "NEW_BOOKING",
    title: "New appointment",
    message: `${appointment.reference} · ${appointment.name} · ${appointment.service}`,
    data: { appointmentId: appointment.id },
  })

  if (session?.kind === "staff") {
    await createAuditLog({
      staffId: session.staffId,
      action: "CREATE_APPOINTMENT",
      entity: "APPOINTMENT",
      entityId: appointment.id,
      details: JSON.stringify({ reference: appointment.reference, service: appointment.service }),
    })
  }

  return NextResponse.json({ appointment: saved }, { status: 201 })
}))
