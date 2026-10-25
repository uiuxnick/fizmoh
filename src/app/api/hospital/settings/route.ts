import { withErrors } from "@/lib/api-handler"
import { resolveHospTenantId } from "@/lib/hospital"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withModule } from "@/lib/entitlements"

export const GET = withErrors(withModule("HOSPITAL", async (req?: Request) => {
  const tenantId = await resolveHospTenantId(req)
  let s = await db.hospSettings.findUnique({ where: { tenantId } })
  if (!s) {
    s = await db.hospSettings.create({ data: { tenantId } })
  }
  return NextResponse.json(s)
}))

export const PUT = withErrors(withModule("HOSPITAL", async (req: NextRequest) => {
  const actor = currentTenant()
  if (!actor?.tenantId) return NextResponse.json({ error: "Staff sign-in required" }, { status: 401 })
  if (actor.role && !["OWNER", "SUPER_ADMIN", "MANAGER", "ADMIN"].includes(actor.role)) {
    return NextResponse.json({ error: "Only hospital administrators can modify hospital settings" }, { status: 403 })
  }
  const tenantId = await resolveHospTenantId(req)
  const body = await req.json()
  const data = {
    hospitalName: body.hospitalName == null ? undefined : String(body.hospitalName).trim(),
    sessionMode: body.sessionMode == null ? undefined : String(body.sessionMode),
    holdDurationMins: body.holdDurationMins == null ? undefined : Math.min(60, Math.max(1, Number(body.holdDurationMins))),
  }
  const s = await db.hospSettings.upsert({
    where: { tenantId },
    create: { tenantId, ...data },
    update: data,
  })
  return NextResponse.json(s)
}))

