import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { db } from "@/lib/db"
import { consentUrl, oauthConfigured } from "@/lib/google-oauth"
import { getConfigValue } from "@/lib/app-config"
import crypto from "crypto"

/**
 * Sends a staff member to Google's consent screen.
 */
export const GET = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const staff = await db.staff.findUnique({ where: { id: session.staffId } })
  if (!staff) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 403 })
  }

  if (!(await oauthConfigured())) {
    return NextResponse.json({ error: "Google OAuth client ID is not configured on the server" }, { status: 400 })
  }

  const baseUrl = (await getConfigValue("base_url")) || new URL(request.url).origin
  const state = crypto.randomBytes(16).toString("hex")
  const url = await consentUrl(baseUrl, state)
  if (!url) return NextResponse.json({ error: "Could not build the consent URL" }, { status: 500 })

  const response = NextResponse.json({ url })
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/",
  })
  return response
})
