import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { resolveHospTenantId } from "@/lib/hospital"
import { verifiedPatientPhone } from "@/lib/hospital-patient-access"
import { raw } from "@/lib/db"

export const GET = withErrors(async (request: NextRequest) => {
  const tenantId = await resolveHospTenantId(request)
  const tenant = await raw.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } })
  if (!tenant) return NextResponse.json({ error: "Hospital unavailable" }, { status: 503 })
  return NextResponse.json({ workspace: tenant.slug, phone: await verifiedPatientPhone(request, tenantId) }, { headers: { "Cache-Control": "no-store" } })
})
