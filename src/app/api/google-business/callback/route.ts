import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { completeBusinessConnection } from "@/lib/google-business-oauth"
import { getConfigValue } from "@/lib/app-config"

/**
 * Where Google sends the operator back to, holding the one-time code.
 *
 * This request carries the staff member's own browser session cookie — the
 * same one that resolves currentTenant() on any other page load — so no
 * separate auth check is needed here, matching the existing Calendar
 * callback (google/callback/route.ts) this mirrors.
 */
export const GET = withErrors(async (request: NextRequest) => {
  const { searchParams, origin } = new URL(request.url)
  const baseUrl = (await getConfigValue("base_url")) || origin
  const settings = `${baseUrl.replace(/\/$/, "")}/settings`

  const error = searchParams.get("error")
  if (error) return NextResponse.redirect(`${settings}?googleBusiness=${encodeURIComponent(error)}`)

  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const expected = request.cookies.get("google_business_oauth_state")?.value

  // Without this check any page on the internet could link a visiting admin's
  // browser to an attacker's Google account.
  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(`${settings}?googleBusiness=invalid_state`)
  }

  const result = await completeBusinessConnection(code, baseUrl)
  if (!result.ok) return NextResponse.redirect(`${settings}?googleBusiness=${encodeURIComponent(result.error || "failed")}`)

  const response = NextResponse.redirect(`${settings}?googleBusiness=connected`)
  response.cookies.delete("google_business_oauth_state")
  return response
})
