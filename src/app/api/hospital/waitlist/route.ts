import { withErrors } from "@/lib/api-handler"
import { resolveHospTenantId } from "@/lib/hospital"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withModule } from "@/lib/entitlements"

export const POST = withErrors(withModule("HOSPITAL", async (req: NextRequest) => {
  const tenantId = await resolveHospTenantId(req)
  const body = await req.json()
  const { patientId, doctorId, preferredDate, wardType } = body
  if (!patientId || !preferredDate) {
    return NextResponse.json({ error: "Patient ID and preferred date are required" }, { status: 400 })
  }
  const patient = await db.hospPatient.findFirst({
    where: { id: String(patientId), tenantId },
    select: { mobile: true },
  })
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 })
  const mobile = body.mobile ? String(body.mobile).trim() : patient.mobile

  const entry = await db.hospWaitlist.create({
    data: {
      tenantId,
      patientId: String(patientId),
      doctorId: doctorId ? String(doctorId) : undefined,
      preferredDate: new Date(preferredDate),
      wardType: wardType ? String(wardType) : undefined,
      mobile,
      status: "WAITING",
    },
    include: { patient: true },
  })
  return NextResponse.json(entry, { status: 201 })
}))

export const GET = withErrors(withModule("HOSPITAL", async (req: NextRequest) => {
  const tenantId = await resolveHospTenantId(req)
  const url = new URL(req.url)
  const dateStr = url.searchParams.get("date")
  const where: any = { tenantId }
  if (dateStr) where.preferredDate = new Date(dateStr)
  const list = await db.hospWaitlist.findMany({ where, include: { patient: true }, orderBy: { createdAt: "asc" } })
  return NextResponse.json(list)
}))

