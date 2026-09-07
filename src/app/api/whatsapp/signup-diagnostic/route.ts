import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"

/**
 * What Facebook sent back when Embedded Signup produced no code.
 *
 * Exists because this failure has been diagnosed from screenshots twice and
 * got it wrong twice. The browser knows the answer and nobody was reading it:
 * asking an operator to open developer tools in the middle of connecting their
 * WhatsApp number is not a diagnostic that will actually happen.
 *
 * Staff only, and it writes to the log rather than the database — this is a
 * breadcrumb for whoever is looking at a failure now, not a record worth
 * keeping. The access token is stripped before anything is written: it is a
 * live credential for that person's Facebook account, and the reason the
 * sign-up failed is never the token's value.
 */
export const POST = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Nothing to record" }, { status: 400 })

  const response = body.response ?? {}
  const auth = response.authResponse ?? {}

  console.error("[embedded signup] no code returned:", JSON.stringify({
    staffId: session.staffId,
    configId: body.configId ?? null,
    flow: body.existingApp ? "whatsapp_business_app_onboarding" : "standard",
    status: response.status ?? null,
    error: response.error ?? null,
    errorDescription: response.error_description ?? null,
    // Shape, not contents. Which fields came back is the diagnosis; the token
    // itself is a credential and is never written down.
    authResponseKeys: Object.keys(auth),
    hasCode: !!auth.code,
    hasAccessToken: !!auth.access_token || !!auth.accessToken,
    grantedScopes: auth.grantedScopes ?? null,
    expiresIn: auth.expiresIn ?? null,
    // Anything unexpected at the top level, so a field nobody predicted is
    // still visible.
    topLevelKeys: Object.keys(response),
  }))

  return NextResponse.json({ recorded: true })
})
