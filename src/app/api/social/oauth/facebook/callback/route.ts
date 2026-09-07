import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { getConfigValue } from "@/lib/app-config"
import { completeFacebookConnection, subscribePageWebhook, saveSocialAccount } from "@/lib/social/social-oauth"
import { createAuditLog } from "@/lib/slots-server"
import { currentTenant } from "@/lib/tenant"

/**
 * Every Page the person manages is connected — most businesses manage one,
 * and there is no clean way to ask "which one?" mid-redirect without a second
 * round trip. Any Page beyond the first stays connected but inactive; the
 * account list lets an operator pick a different one active at any time.
 */
export const GET = withErrors(async (request: NextRequest) => {
  const { searchParams, origin } = new URL(request.url)
  const baseUrl = (await getConfigValue("base_url")) || origin
  const settings = `${baseUrl.replace(/\/$/, "")}/settings?section=social`

  const error = searchParams.get("error")
  if (error) return NextResponse.redirect(`${settings}&social=${encodeURIComponent(error)}`)

  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const expected = request.cookies.get("social_fb_oauth_state")?.value
  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(`${settings}&social=invalid_state`)
  }

  const result = await completeFacebookConnection(code, baseUrl)
  if (!result.ok || !result.pages) return NextResponse.redirect(`${settings}&social=${encodeURIComponent(result.error || "failed")}`)
  if (result.pages.length === 0) return NextResponse.redirect(`${settings}&social=no_pages_found`)

  for (const [i, page] of result.pages.entries()) {
    await saveSocialAccount({
      channel: "FACEBOOK", externalAccountId: page.id, name: page.name, profilePicUrl: page.profilePicUrl, accessToken: page.pageAccessToken,
    })
    if (i > 0) {
      // saveSocialAccount makes the newest connection active; only the first
      // page in this batch should end up active, so the rest step back down.
      const { db } = await import("@/lib/db")
      const tenant = currentTenant()
      if (tenant?.tenantId) {
        await db.socialAccount.updateMany({ where: { tenantId: tenant.tenantId, channel: "FACEBOOK", externalAccountId: page.id }, data: { isActive: false } })
      }
    }
    const subscribed = await subscribePageWebhook(page.id, page.pageAccessToken)
    // Persisted regardless of outcome — a silent webhook-subscribe failure is
    // exactly why messages sent to a "Connected" Page never reached the inbox
    // with no visible reason anywhere.
    const { db } = await import("@/lib/db")
    const tenant = currentTenant()
    if (tenant?.tenantId) {
      await db.socialAccount.updateMany({
        where: { tenantId: tenant.tenantId, channel: "FACEBOOK", externalAccountId: page.id },
        data: { webhookSubscribed: subscribed.ok, lastError: subscribed.ok ? null : subscribed.error || "Webhook subscription failed" },
      })
    }
  }

  const tenant = currentTenant()
  await createAuditLog({ staffId: tenant?.staffId, action: "SOCIAL_FACEBOOK_CONNECTED", entity: "SocialAccount", entityId: result.pages[0].id, details: { pages: result.pages.map(p => p.name) } })

  const response = NextResponse.redirect(`${settings}&social=connected`)
  response.cookies.delete("social_fb_oauth_state")
  return response
})
