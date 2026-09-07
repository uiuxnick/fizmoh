import { NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"
import { listGoogleLocations } from "@/lib/google-business-sync"

/** Locations under the connected account, for the campaign's Google-location picker. */
export const GET = withErrors(withModule("DIGITAL_QR", async () => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })

  const { db } = await import("@/lib/db")
  const integration = await db.googleIntegration.findUnique({ where: { tenantId: tenant.tenantId } })
  if (!integration) return NextResponse.json({ error: "No Google account connected" }, { status: 400 })
  if (!integration.googleAccountId) {
    return NextResponse.json({
      error: "Connected, but Google has not yet returned an account — this usually means the platform's Business Profile API access request is still pending approval.",
      pendingApproval: true,
    }, { status: 409 })
  }

  const result = await listGoogleLocations(integration.googleAccountId)
  if (!result.ok) return NextResponse.json({ error: result.error, pendingApproval: result.pendingApproval || false }, { status: 409 })
  return NextResponse.json({ locations: result.locations })
}))
