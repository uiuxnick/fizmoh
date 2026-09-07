import { withErrors } from "@/lib/api-handler"
import { resolveHospTenantId } from "@/lib/hospital"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"

export const GET = withErrors(async (req?: Request) => {
  const tenantId = await resolveHospTenantId(req)
  let s = await db.hospSettings.findUnique({ where: { tenantId } })
  if (!s) {
    s = await db.hospSettings.create({ data: { tenantId } })
  }
  return NextResponse.json(s)
})

export const PUT = withErrors(async (req: NextRequest) => {
  const tenantId = await resolveHospTenantId(req)
  const body = await req.json()
  const data = {
    hospitalName: body.hospitalName == null ? undefined : String(body.hospitalName),
    sessionMode: body.sessionMode == null ? undefined : String(body.sessionMode),
    holdDurationMins: body.holdDurationMins == null ? undefined : Math.min(60, Math.max(1, Number(body.holdDurationMins))),
  }
  const s = await db.hospSettings.upsert({
    where: { tenantId },
    create: { tenantId, ...data },
    update: data,
  })
  return NextResponse.json(s)
})
