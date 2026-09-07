import { withErrors } from "@/lib/api-handler"
import { resolveHospTenantId } from "@/lib/hospital"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"

export const GET = withErrors(async (req?: Request) => {
  const tenantId = await resolveHospTenantId(req)
  const sessions = await db.hospTreatmentSession.findMany({
    where: { tenantId, isActive: true },
    orderBy: { sortOrder: "asc" },
  })
  return NextResponse.json(sessions)
})
