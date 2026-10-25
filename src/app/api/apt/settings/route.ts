import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "PLATFORM", "MANAGER"]

export const GET = withErrors(withModule("APPOINTMENTS", async (_req: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let settings = await db.aptSettings.findUnique({
    where: { tenantId: tenant.tenantId },
  })

  if (!settings) {
    settings = await db.aptSettings.create({
      data: { tenantId: tenant.tenantId },
    })
  }

  return NextResponse.json({ settings })
}))

export const PUT = withErrors(withModule("APPOINTMENTS", async (req: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (tenant.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only workspace administrators can change appointment settings" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (typeof body.isEnabled === "boolean") data.isEnabled = body.isEnabled
  if (typeof body.autoConfirm === "boolean") data.autoConfirm = body.autoConfirm
  if (typeof body.defaultTimezone === "string") data.defaultTimezone = body.defaultTimezone
  if (Number.isFinite(Number(body.cancellationDeadlineHours))) {
    data.cancellationDeadlineHours = Math.max(0, Math.min(168, Math.floor(Number(body.cancellationDeadlineHours))))
  }
  if (typeof body.cancellationPolicyText === "string") data.cancellationPolicyText = body.cancellationPolicyText.slice(0, 2000)
  if (typeof body.reminder24h === "boolean") data.reminder24h = body.reminder24h
  if (typeof body.reminder2h === "boolean") data.reminder2h = body.reminder2h
  if (typeof body.reminder30m === "boolean") data.reminder30m = body.reminder30m

  const settings = await db.aptSettings.upsert({
    where: { tenantId: tenant.tenantId },
    create: { tenantId: tenant.tenantId, ...data },
    update: data,
  })

  return NextResponse.json({ settings })
}))
