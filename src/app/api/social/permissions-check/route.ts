import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { decryptSecret } from "@/lib/secret-box"
import { checkFacebookPermissions, REQUIRED_FACEBOOK_PERMISSIONS, REQUIRED_INSTAGRAM_PERMISSIONS } from "@/lib/social/social-oauth"

/**
 * Checks what a connected account's token actually carries right now — a
 * real, live signal, not the same thing as Meta App Review approval status
 * (which only appears in the Meta Developer dashboard). See the comment on
 * checkFacebookPermissions for the exact distinction.
 */
export const GET = withErrors(withModule("SOCIAL_INBOX", async (request: NextRequest) => {
  const accountId = new URL(request.url).searchParams.get("accountId") || ""
  const account = await db.socialAccount.findUnique({ where: { id: accountId } })
  if (!account) return NextResponse.json({ error: "No such account" }, { status: 404 })

  if (account.channel === "FACEBOOK") {
    const result = await checkFacebookPermissions(decryptSecret(account.accessToken))
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 })
    return NextResponse.json({ required: REQUIRED_FACEBOOK_PERMISSIONS, ...result, checkable: true })
  }

  // Instagram Login tokens have no equivalent, verified introspection
  // endpoint — shown honestly as "requested at connect", not a live check.
  return NextResponse.json({
    required: REQUIRED_INSTAGRAM_PERMISSIONS, granted: REQUIRED_INSTAGRAM_PERMISSIONS, missing: [],
    checkable: false,
    note: "Instagram does not expose a live token-introspection endpoint the way Facebook's debug_token does — these are the permissions requested when this account was connected, not a live re-check.",
  })
}))
