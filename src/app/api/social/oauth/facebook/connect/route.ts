import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"
import { getConfigValue } from "@/lib/app-config"
import { facebookConsentUrl, facebookOauthConfigured } from "@/lib/social/social-oauth"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "MANAGER", "MARKETING"]

export const GET = withErrors(withModule("SOCIAL_INBOX", async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only marketing or workspace administrators can connect a Facebook Page" }, { status: 403 })
  }
  if (!(await facebookOauthConfigured())) {
    return NextResponse.json({ error: "The Meta app is not configured on the server" }, { status: 400 })
  }

  const baseUrl = (await getConfigValue("base_url")) || new URL(request.url).origin
  const state = crypto.randomBytes(16).toString("hex")
  const url = await facebookConsentUrl(baseUrl, state)
  if (!url) return NextResponse.json({ error: "Could not build the consent URL" }, { status: 500 })

  const response = NextResponse.json({ url })
  response.cookies.set("social_fb_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" })
  return response
}))
