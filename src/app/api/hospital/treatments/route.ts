import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

export const GET = withErrors(withModule("HOSPITAL", async (request: NextRequest) => {
  const tenant = currentTenant(); if (!tenant?.tenantId) return NextResponse.json({ error: "No workspace" }, { status: 400 })
  const patientId = new URL(request.url).searchParams.get("patientId") || undefined
  const treatments = await db.hospTreatmentRecord.findMany({ where: { tenantId: tenant.tenantId, ...(patientId ? { patientId } : {}) }, orderBy: { occurredAt: "desc" }, take: 100 })
  return NextResponse.json({ treatments })
}))

export const POST = withErrors(withModule("HOSPITAL", async (request: NextRequest) => {
  const tenant = currentTenant(); if (!tenant?.tenantId) return NextResponse.json({ error: "No workspace" }, { status: 400 })
  const body = await request.json().catch(() => null)
  const patientId = String(body?.patientId ?? ""); const treatmentType = String(body?.treatmentType ?? "").trim()
  if (!patientId || !treatmentType) return NextResponse.json({ error: "Patient and treatment type are required" }, { status: 400 })
  const patient = await db.hospPatient.findFirst({ where: { id: patientId, tenantId: tenant.tenantId } })
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 })
  const treatment = await db.hospTreatmentRecord.create({ data: { tenantId: tenant.tenantId, patientId, treatmentType, status: String(body?.status ?? "COMPLETED"), notes: body?.notes ? String(body.notes).slice(0, 5000) : null, recordedBy: tenant.staffId ?? null } })
  await db.auditLog.create({ data: { tenantId: tenant.tenantId, action: "PATIENT_TREATMENT_CREATED", entity: "HospTreatmentRecord", entityId: treatment.id, staffId: tenant.staffId ?? null, details: { patientId, treatmentType } } })
  return NextResponse.json({ treatment }, { status: 201 })
}))
