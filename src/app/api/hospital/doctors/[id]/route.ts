import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { resolveHospTenantId } from "@/lib/hospital"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

const access = new Set(["OWNER", "ADMIN", "MANAGER", "SUPER_ADMIN", "PLATFORM"])

async function guard(request: Request) {
  const tenant = currentTenant()
  if (!tenant?.role || !access.has(tenant.role)) return NextResponse.json({ error: "Hospital management access required" }, { status: 403 })
  return null
}

export const GET = withErrors(withModule("HOSPITAL", async (request, context: { params: Promise<{ id: string }> }) => {
  const denied = await guard(request); if (denied) return denied
  const tenantId = await resolveHospTenantId(request)
  const id = (await context.params).id
  const doctor = await db.hospDoctor.findFirst({ where: { id, tenantId }, include: { department: true, schedules: true, unavailable: true, _count: { select: { appointments: true, chemoBookings: true } } } })
  return doctor ? NextResponse.json(doctor) : NextResponse.json({ error: "Doctor not found" }, { status: 404 })
}))

export const PUT = withErrors(withModule("HOSPITAL", async (request, context: { params: Promise<{ id: string }> }) => {
  const denied = await guard(request); if (denied) return denied
  const tenantId = await resolveHospTenantId(request)
  const id = (await context.params).id
  const body = await request.json().catch(() => ({}))
  const existing = await db.hospDoctor.findFirst({ where: { id, tenantId } })
  if (!existing) return NextResponse.json({ error: "Doctor not found" }, { status: 404 })
  const departmentId = body.departmentId ? String(body.departmentId) : existing.departmentId
  const department = await db.hospDepartment.findFirst({ where: { id: departmentId, tenantId, isActive: true } })
  if (!department) return NextResponse.json({ error: "Department not found" }, { status: 400 })
  const doctor = await db.hospDoctor.update({ where: { id }, data: {
    departmentId,
    name: body.name === undefined ? existing.name : String(body.name).trim(),
    specialization: body.specialization === undefined ? existing.specialization : (body.specialization ? String(body.specialization).trim() : null),
    photo: body.photo === undefined ? existing.photo : (body.photo ? String(body.photo) : null),
    mobile: body.mobile === undefined ? existing.mobile : (body.mobile ? String(body.mobile).trim() : null),
    email: body.email === undefined ? existing.email : (body.email ? String(body.email).trim() : null),
    languages: body.languages === undefined ? existing.languages : (body.languages ? String(body.languages).trim() : null),
    isActive: body.isActive === undefined ? existing.isActive : Boolean(body.isActive),
  }, include: { department: true, schedules: true } })
  if (Array.isArray(body.schedules)) {
    await db.$transaction(async tx => {
      await tx.hospDoctorSchedule.deleteMany({ where: { doctorId: id } })
      if (body.schedules.length) await tx.hospDoctorSchedule.createMany({ data: body.schedules.map((s: any) => ({ doctorId: id, dayOfWeek: Number(s.dayOfWeek), startTime: String(s.startTime), endTime: String(s.endTime), appointmentDuration: Number(s.appointmentDuration || 30), isActive: s.isActive !== false })) })
    })
  }
  const tenant = currentTenant()
  await db.auditLog.create({ data: { tenantId, action: "HOSPITAL_DOCTOR_UPDATED", entity: "HospDoctor", entityId: id, staffId: tenant?.staffId ?? null, details: { fields: Object.keys(body).slice(0, 20) } } })
  return NextResponse.json(doctor)
}))

export const DELETE = withErrors(withModule("HOSPITAL", async (request, context: { params: Promise<{ id: string }> }) => {
  const denied = await guard(request); if (denied) return denied
  const tenantId = await resolveHospTenantId(request)
  const id = (await context.params).id
  const doctor = await db.hospDoctor.findFirst({ where: { id, tenantId }, include: { _count: { select: { appointments: true, chemoBookings: true } } } })
  if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 })
  // Clinical history is never destroyed. Deletion in the UI is an archive.
  const updated = await db.hospDoctor.update({ where: { id }, data: { isActive: false } })
  const tenant = currentTenant()
  await db.auditLog.create({ data: { tenantId, action: "HOSPITAL_DOCTOR_ARCHIVED", entity: "HospDoctor", entityId: id, staffId: tenant?.staffId ?? null, details: { appointments: doctor._count.appointments, chemoBookings: doctor._count.chemoBookings } } })
  return NextResponse.json({ doctor: updated, archived: true })
}))
