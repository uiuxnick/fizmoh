import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"
import { getConfigValue } from "@/lib/app-config"
import { businessConsentUrl, businessOauthConfigured } from "@/lib/google-business-oauth"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "MANAGER", "MARKETING"]

/** Sends a staff member to Google's consent screen for Business Profile access. */
export const GET = withErrors(withModule("DIGITAL_QR", async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only marketing or workspace administrators can connect Google Business Profile" }, { status: 403 })
  }
  if (!(await businessOauthConfigured())) {
    return NextResponse.json({ error: "Google OAuth is not configured on the server" }, { status: 400 })
  }

  const baseUrl = (await getConfigValue("base_url")) || new URL(request.url).origin
  const state = crypto.randomBytes(16).toString("hex")
  const url = await businessConsentUrl(baseUrl, state)
  if (!url) return NextResponse.json({ error: "Could not build the consent URL" }, { status: 500 })

  const response = NextResponse.json({ url })
  response.cookies.set("google_business_oauth_state", state, {
    httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/",
  })
  return response
}))
