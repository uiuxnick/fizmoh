import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { getConfigValue } from "@/lib/app-config"
import { completeInstagramConnection, subscribeInstagramWebhook, saveSocialAccount } from "@/lib/social/social-oauth"
import { createAuditLog } from "@/lib/slots-server"
import { currentTenant } from "@/lib/tenant"

export const GET = withErrors(async (request: NextRequest) => {
  const { searchParams, origin } = new URL(request.url)
  const baseUrl = (await getConfigValue("base_url")) || origin
  const settings = `${baseUrl.replace(/\/$/, "")}/settings?section=social`

  const error = searchParams.get("error")
  if (error) return NextResponse.redirect(`${settings}&social=${encodeURIComponent(error)}`)

  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const expected = request.cookies.get("social_ig_oauth_state")?.value
  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(`${settings}&social=invalid_state`)
  }

  const result = await completeInstagramConnection(code, baseUrl)
  if (!result.ok || !result.account) return NextResponse.redirect(`${settings}&social=${encodeURIComponent(result.error || "failed")}`)

  await saveSocialAccount({
    channel: "INSTAGRAM", externalAccountId: result.account.id, name: result.account.name, username: result.account.username,
    accessToken: result.account.accessToken, tokenExpiresAt: result.account.expiresAt,
  })
  const subscribed = await subscribeInstagramWebhook(result.account.id, result.account.accessToken)
  {
    const { db } = await import("@/lib/db")
    const tenant = currentTenant()
    if (tenant?.tenantId) {
      await db.socialAccount.updateMany({
        where: { tenantId: tenant.tenantId, channel: "INSTAGRAM", externalAccountId: result.account.id },
        data: { webhookSubscribed: subscribed.ok, lastError: subscribed.ok ? null : subscribed.error || "Webhook subscription failed" },
      })
    }
  }

  const tenant = currentTenant()
  await createAuditLog({ staffId: tenant?.staffId, action: "SOCIAL_INSTAGRAM_CONNECTED", entity: "SocialAccount", entityId: result.account.id, details: { username: result.account.username } })

  const response = NextResponse.redirect(`${settings}&social=connected`)
  response.cookies.delete("social_ig_oauth_state")
  return response
})
