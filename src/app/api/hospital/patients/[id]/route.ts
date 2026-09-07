import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { resolveHospTenantId } from "@/lib/hospital"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

const access = new Set(["OWNER", "ADMIN", "MANAGER", "SUPER_ADMIN", "PLATFORM"])
async function guard() { const tenant = currentTenant(); return !tenant?.role || !access.has(tenant.role) ? NextResponse.json({ error: "Hospital management access required" }, { status: 403 }) : null }

export const GET = withErrors(withModule("HOSPITAL", async (request, context: { params: Promise<{ id: string }> }) => {
  const denied = await guard(); if (denied) return denied
  const tenantId = await resolveHospTenantId(request); const id = (await context.params).id
  const patient = await db.hospPatient.findFirst({ where: { id, tenantId }, include: { chemoBookings: { include: { doctor: true, bed: true, session: true }, orderBy: { bookingDate: "desc" }, take: 20 }, appointments: { include: { doctor: true }, orderBy: { appointmentDate: "desc" }, take: 20 }, treatments: { orderBy: { occurredAt: "desc" }, take: 50 }, _count: { select: { chemoBookings: true, appointments: true, treatments: true } } } })
  return patient ? NextResponse.json(patient) : NextResponse.json({ error: "Patient not found" }, { status: 404 })
}))

export const PUT = withErrors(withModule("HOSPITAL", async (request, context: { params: Promise<{ id: string }> }) => {
  const denied = await guard(); if (denied) return denied
  const tenantId = await resolveHospTenantId(request); const id = (await context.params).id; const body = await request.json().catch(() => ({}))
  const existing = await db.hospPatient.findFirst({ where: { id, tenantId } }); if (!existing) return NextResponse.json({ error: "Patient not found" }, { status: 404 })
  const patient = await db.hospPatient.update({ where: { id }, data: {
    mrn: body.mrn === undefined ? existing.mrn : String(body.mrn).trim(),
    fullName: body.fullName === undefined ? existing.fullName : String(body.fullName).trim(),
    mobile: body.mobile === undefined ? existing.mobile : String(body.mobile).trim(),
    email: body.email === undefined ? existing.email : (body.email ? String(body.email).trim() : null),
    dob: body.dob === undefined ? existing.dob : (body.dob ? new Date(body.dob) : null),
    gender: body.gender === undefined ? existing.gender : (body.gender ? String(body.gender).trim() : null),
    nationalId: body.nationalId === undefined ? existing.nationalId : (body.nationalId ? String(body.nationalId).trim() : null),
    emergContact: body.emergContact === undefined ? existing.emergContact : (body.emergContact ? String(body.emergContact).trim() : null),
  } })
  const tenant = currentTenant(); await db.auditLog.create({ data: { tenantId, action: "HOSPITAL_PATIENT_UPDATED", entity: "HospPatient", entityId: id, staffId: tenant?.staffId ?? null, details: { fields: Object.keys(body).slice(0, 20) } } })
  return NextResponse.json(patient)
}))

export const DELETE = withErrors(withModule("HOSPITAL", async (request, context: { params: Promise<{ id: string }> }) => {
  const denied = await guard(); if (denied) return denied
  const tenantId = await resolveHospTenantId(request); const id = (await context.params).id
  const patient = await db.hospPatient.findFirst({ where: { id, tenantId }, include: { _count: { select: { chemoBookings: true, appointments: true, treatments: true, waitlist: true } } } })
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 })
  if (Object.values(patient._count).some(Number)) return NextResponse.json({ error: "This clinical record is referenced by bookings or treatment history and cannot be deleted. Update the record instead." }, { status: 409 })
  await db.hospPatient.delete({ where: { id } })
  const tenant = currentTenant(); await db.auditLog.create({ data: { tenantId, action: "HOSPITAL_PATIENT_DELETED", entity: "HospPatient", entityId: id, staffId: tenant?.staffId ?? null, details: { mrn: patient.mrn } } })
  return NextResponse.json({ deleted: true })
}))
