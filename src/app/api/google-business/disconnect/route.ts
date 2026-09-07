import { NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"
import { disconnectBusiness } from "@/lib/google-business-oauth"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "MANAGER", "MARKETING"]

export const POST = withErrors(withModule("DIGITAL_QR", async () => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only marketing or workspace administrators can disconnect Google Business Profile" }, { status: 403 })
  }
  await disconnectBusiness()
  return NextResponse.json({ ok: true })
}))
