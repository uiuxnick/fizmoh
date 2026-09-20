import { withErrors } from "@/lib/api-handler"
import { resolveHospTenantId } from "@/lib/hospital"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { canReadPatient } from "@/lib/hospital-patient-access"
import { checkSharedRateLimit as checkRateLimit, requestIp } from "@/lib/rate-limit"

export const POST = withErrors(async (req: NextRequest) => {
  const tenantId = await resolveHospTenantId(req)
  const { mrn, mobile } = await req.json()
  const rate = await checkRateLimit(`patient-identify:${requestIp(req.headers)}`, 10, 60_000)
  if (!rate.allowed) return NextResponse.json({ error: "Please try again later" }, { status: 429 })
  if (typeof mobile !== "string" || !await canReadPatient(req, tenantId, mobile)) {
    return NextResponse.json({ error: "Verify your registered mobile number first" }, { status: 401 })
  }

  let patient: any = null
  if (mrn) {
    patient = await db.hospPatient.findFirst({ where: { tenantId, mrn: String(mrn), mobile } })
  }
  if (!mrn && mobile) {
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
