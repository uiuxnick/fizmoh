import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { completeConnection } from "@/lib/google-oauth"
import { getConfigValue } from "@/lib/app-config"
import { createAuditLog } from "@/lib/slots-server"
import { sessionFromRequest } from "@/lib/auth"

/** Where Google sends the operator back to, holding the one-time code. */
export const GET = withErrors(async (request: NextRequest) => {
  const { searchParams, origin } = new URL(request.url)
  const baseUrl = (await getConfigValue("base_url")) || origin
  const settings = `${baseUrl.replace(/\/$/, "")}/settings`

  const error = searchParams.get("error")
  if (error) return NextResponse.redirect(`${settings}?google=${encodeURIComponent(error)}`)

  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const expected = request.cookies.get("google_oauth_state")?.value

  // Without this check any page on the internet could link a visiting admin's
  // browser to an attacker's Google account.
  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(`${settings}?google=invalid_state`)
  }

  const result = await completeConnection(code, baseUrl)
  if (!result.ok) return NextResponse.redirect(`${settings}?google=${encodeURIComponent(result.error || "failed")}`)

  const session = await sessionFromRequest(request)
  if (session?.kind === "staff") {
    await createAuditLog({
      staffId: session.staffId,
      action: "CONNECT_GOOGLE",
      entity: "SETTING",
      entityId: "google_oauth_refresh_token",
      details: JSON.stringify({ account: result.email }),
    })
  }

  const response = NextResponse.redirect(`${settings}?google=connected`)
  response.cookies.delete("google_oauth_state")
  return response
})
