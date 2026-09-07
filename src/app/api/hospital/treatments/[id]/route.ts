import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

const canManage = new Set(["OWNER", "ADMIN", "MANAGER", "SUPER_ADMIN", "PLATFORM"])
function tenantGuard() { const t = currentTenant(); return t?.tenantId && t.role && canManage.has(t.role) ? t : null }

export const GET = withErrors(withModule("HOSPITAL", async (_request, context: { params: Promise<{ id: string }> }) => {
  const tenant = tenantGuard(); if (!tenant) return NextResponse.json({ error: "Hospital management access required" }, { status: 403 })
  const record = await db.hospTreatmentRecord.findFirst({ where: { id: (await context.params).id, tenantId: tenant.tenantId }, include: { patient: true } })
  return record ? NextResponse.json({ treatment: record }) : NextResponse.json({ error: "Treatment record not found" }, { status: 404 })
}))

export const PUT = withErrors(withModule("HOSPITAL", async (request, context: { params: Promise<{ id: string }> }) => {
  const tenant = tenantGuard(); if (!tenant) return NextResponse.json({ error: "Hospital management access required" }, { status: 403 })
  const id = (await context.params).id; const body = await request.json().catch(() => ({}))
  const existing = await db.hospTreatmentRecord.findFirst({ where: { id, tenantId: tenant.tenantId } }); if (!existing) return NextResponse.json({ error: "Treatment record not found" }, { status: 404 })
  const updated = await db.hospTreatmentRecord.update({ where: { id }, data: { treatmentType: body.treatmentType === undefined ? existing.treatmentType : String(body.treatmentType).trim(), status: body.status === undefined ? existing.status : String(body.status), notes: body.notes === undefined ? existing.notes : (body.notes ? String(body.notes).slice(0, 5000) : null), occurredAt: body.occurredAt ? new Date(body.occurredAt) : existing.occurredAt }, include: { patient: true } })
  await db.auditLog.create({ data: { tenantId: tenant.tenantId, action: "PATIENT_TREATMENT_UPDATED", entity: "HospTreatmentRecord", entityId: id, staffId: tenant.staffId ?? null, details: { fields: Object.keys(body) } } })
  return NextResponse.json({ treatment: updated })
}))

export const DELETE = withErrors(withModule("HOSPITAL", async (_request, context: { params: Promise<{ id: string }> }) => {
  const tenant = tenantGuard(); if (!tenant) return NextResponse.json({ error: "Hospital management access required" }, { status: 403 })
  const id = (await context.params).id; const existing = await db.hospTreatmentRecord.findFirst({ where: { id, tenantId: tenant.tenantId } }); if (!existing) return NextResponse.json({ error: "Treatment record not found" }, { status: 404 })
  const updated = await db.hospTreatmentRecord.update({ where: { id }, data: { status: "VOIDED", notes: `${existing.notes ? `${existing.notes}\n` : ""}[Voided by staff ${tenant.staffId || "operator"} on ${new Date().toISOString()}]` } })
  await db.auditLog.create({ data: { tenantId: tenant.tenantId, action: "PATIENT_TREATMENT_VOIDED", entity: "HospTreatmentRecord", entityId: id, staffId: tenant.staffId ?? null, details: { preserved: true } } })
  return NextResponse.json({ treatment: updated, voided: true })
}))
