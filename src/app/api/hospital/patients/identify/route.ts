import { withErrors } from "@/lib/api-handler"
import { resolveHospTenantId } from "@/lib/hospital"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"

export const POST = withErrors(async (req: NextRequest) => {
  const tenantId = await resolveHospTenantId(req)
  const { mrn, mobile } = await req.json()

  let patient: any = null
  if (mrn) {
    patient = await db.hospPatient.findFirst({ where: { tenantId, mrn } })
  }
  if (!patient && mobile) {
    patient = await db.hospPatient.findFirst({ where: { tenantId, mobile } })
  }

  if (!patient) {
    return NextResponse.json({ found: false })
  }

  // Return masked data for confirmation
  return NextResponse.json({
    found: true,
    id: patient.id,
    mrn: patient.mrn,
    fullName: patient.fullName,
    mobileMasked: patient.mobile.slice(0, -4).replace(/./g, "*") + patient.mobile.slice(-4),
  })
})
