import { exchangeInstagramLogin } from "@/lib/social/instagram-login"
import { getConfigValue } from "@/lib/app-config"
import { encryptSecret, decryptSecret } from "@/lib/secret-box"
import { currentTenant } from "@/lib/tenant"
import type { SocialChannel } from "@/lib/social/types"

/**
 * OAuth for Facebook Pages and Instagram Professional accounts.
 *
 * Two genuinely different flows, both landing in the same SocialAccount
 * table:
 *
 *   - Facebook Pages use the standard Facebook Login dialog
 *     (facebook.com/{v}/dialog/oauth) with the platform's existing Meta app
 *     (meta_app_id/secret — the same app Embedded Signup already uses, just a
 *     different scope and redirect URI, not a second Facebook app).
 *   - Instagram uses Instagram Login for Business — its own dialog
 *     (instagram.com/oauth/authorize), its own token host
 *     (graph.instagram.com / api.instagram.com), and its own app id/secret,
 *     even though both live under the same Meta Developer app.
 *
 * Every version-pinned URL below reads META_GRAPH_VERSION rather than a
 * literal string, so a Meta API deprecation is one setting, not a code change.
 */

const FB_SCOPES = "pages_show_list,pages_manage_metadata,pages_messaging,pages_read_engagement,business_management"
const IG_SCOPES = "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments"

export const REQUIRED_FACEBOOK_PERMISSIONS = FB_SCOPES.split(",")
export const REQUIRED_INSTAGRAM_PERMISSIONS = IG_SCOPES.split(",")

async function graphVersion(): Promise<string> {
  return (await getConfigValue("meta_graph_version")) || "v26.0"
}

// ── Facebook Pages ──────────────────────────────────────────────────────────

export async function facebookOauthConfigured(): Promise<boolean> {
  return Boolean(await getConfigValue("meta_app_id")) && Boolean(await getConfigValue("meta_app_secret"))
}

export function facebookRedirectUri(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/api/social/oauth/facebook/callback`
}

export async function facebookConsentUrl(baseUrl: string, state: string): Promise<string | null> {
  const appId = await getConfigValue("meta_app_id")
  if (!appId) return null
  const version = await graphVersion()
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: facebookRedirectUri(baseUrl),
    response_type: "code",
    scope: FB_SCOPES,
    state,
  })
  return `https://www.facebook.com/${version}/dialog/oauth?${params}`
}

export interface DiscoveredPage { id: string; name: string; pageAccessToken: string; category?: string; profilePicUrl?: string }

/**
 * Trades the code for a long-lived user token, then lists the Pages that
 * user manages — the Page's own access token (returned alongside it) is
 * already long-lived when derived from a long-lived user token, so no
 * separate Page-token exchange step is needed.
 */
export async function completeFacebookConnection(code: string, baseUrl: string): Promise<{ ok: boolean; error?: string; pages?: DiscoveredPage[] }> {
  const appId = await getConfigValue("meta_app_id")
  const appSecret = await getConfigValue("meta_app_secret")
  if (!appId || !appSecret) return { ok: false, error: "Meta app is not configured" }
  const version = await graphVersion()

  const tokenRes = await fetch(
    `https://graph.facebook.com/${version}/oauth/access_token?${new URLSearchParams({
      client_id: appId, client_secret: appSecret, redirect_uri: facebookRedirectUri(baseUrl), code,
    })}`,
  )
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) return { ok: false, error: tokenData.error?.message || "Facebook did not return a token" }

  // Short-lived (~1-2h) user token → long-lived (~60 days).
  const longRes = await fetch(
    `https://graph.facebook.com/${version}/oauth/access_token?${new URLSearchParams({
      grant_type: "fb_exchange_token", client_id: appId, client_secret: appSecret, fb_exchange_token: tokenData.access_token,
    })}`,
  )
  const longData = await longRes.json()
  const userToken = longData.access_token || tokenData.access_token

  const pagesRes = await fetch(`https://graph.facebook.com/${version}/me/accounts?fields=id,name,access_token,category,picture&access_token=${encodeURIComponent(userToken)}`)
  const pagesData = await pagesRes.json()
  if (!pagesRes.ok) return { ok: false, error: pagesData.error?.message || `Graph API returned ${pagesRes.status}` }

  const pages: DiscoveredPage[] = (pagesData.data || []).map((p: Record<string, unknown>) => ({
    id: String(p.id), name: String(p.name), pageAccessToken: String(p.access_token),
    category: p.category ? String(p.category) : undefined,
    profilePicUrl: (p.picture as { data?: { url?: string } } | undefined)?.data?.url,
  }))
  return { ok: true, pages }
}

/** Subscribes a connected Page to this app's webhook — messages, postbacks, and its feed for comments. */
export async function subscribePageWebhook(pageId: string, pageAccessToken: string): Promise<{ ok: boolean; error?: string }> {
  const version = await graphVersion()
  try {
    const res = await fetch(`https://graph.facebook.com/${version}/${pageId}/subscribed_apps`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ subscribed_fields: "messages,messaging_postbacks,feed", access_token: pageAccessToken }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) return { ok: false, error: data.error?.message || `Graph API returned ${res.status}` }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

// ── Instagram ────────────────────────────────────────────────────────────────

export async function instagramOauthConfigured(): Promise<boolean> {
  return Boolean(await getConfigValue("meta_instagram_app_id")) && Boolean(await getConfigValue("meta_instagram_app_secret"))
}

export function instagramRedirectUri(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/api/social/oauth/instagram/callback`
}

export async function instagramConsentUrl(baseUrl: string, state: string): Promise<string | null> {
  const appId = await getConfigValue("meta_instagram_app_id")
  if (!appId) return null
  const params = new URLSearchParams({
    client_id: appId, redirect_uri: instagramRedirectUri(baseUrl), response_type: "code", scope: IG_SCOPES, state,
  })
  return `https://www.instagram.com/oauth/authorize?${params}`
}

export interface DiscoveredInstagramAccount { id: string; username: string; name: string | null; accessToken: string; expiresAt: Date | null }

export async function completeInstagramConnection(code: string, baseUrl: string): Promise<{ ok: boolean; error?: string; account?: DiscoveredInstagramAccount }> {
  const appId = await getConfigValue("meta_instagram_app_id")
  const appSecret = await getConfigValue("meta_instagram_app_secret")
  if (!appId || !appSecret) return { ok: false, error: "Instagram app is not configured" }

  return exchangeInstagramLogin({
    code, appId, appSecret, redirectUri: instagramRedirectUri(baseUrl), version: await graphVersion(),
  })
}

/**
 * Best-effort — Instagram Login's own webhook-subscription call is less
 * consistently documented than the Page equivalent. Failure here is logged
 * and non-fatal: the account still connects, and webhook delivery should be
 * verified against the Instagram app's own dashboard (Webhooks product,
 * "messages"/"comments" fields) rather than assumed working from this call
 * alone.
 */
export async function subscribeInstagramWebhook(igUserId: string, accessToken: string): Promise<{ ok: boolean; error?: string }> {
  const version = await graphVersion()
  try {
    const res = await fetch(`https://graph.instagram.com/${version}/${igUserId}/subscribed_apps`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ subscribed_fields: "messages,comments", access_token: accessToken }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error?.message || `Instagram API returned ${res.status}` }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

// ── Persistence ──────────────────────────────────────────────────────────────

export async function saveSocialAccount(params: {
  channel: SocialChannel; externalAccountId: string; name: string | null; username?: string | null
  profilePicUrl?: string | null; accessToken: string; tokenExpiresAt?: Date | null
}): Promise<void> {
  const tenant = currentTenant()
  if (!tenant?.tenantId) throw new Error("No workspace in scope")
  const { db } = await import("@/lib/db")

  // Connecting a new account for a channel becomes the active one; every
  // other account on that channel steps down rather than silently competing.
  await db.socialAccount.updateMany({ where: { channel: params.channel }, data: { isActive: false } })
  await db.socialAccount.upsert({
    where: { tenantId_channel_externalAccountId: { tenantId: tenant.tenantId, channel: params.channel, externalAccountId: params.externalAccountId } },
    create: {
      tenantId: tenant.tenantId, channel: params.channel, externalAccountId: params.externalAccountId,
      name: params.name, username: params.username || null, profilePicUrl: params.profilePicUrl || null,
      accessToken: encryptSecret(params.accessToken), tokenExpiresAt: params.tokenExpiresAt || null,
      isActive: true, status: "CONNECTED",
    },
    update: {
      name: params.name, username: params.username || null, profilePicUrl: params.profilePicUrl || null,
      accessToken: encryptSecret(params.accessToken), tokenExpiresAt: params.tokenExpiresAt || null,
      isActive: true, status: "CONNECTED", lastError: null,
    },
  })
}

export async function activeSocialAccount(channel: SocialChannel) {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return null
  const { db } = await import("@/lib/db")
  const row = await db.socialAccount.findFirst({ where: { tenantId: tenant.tenantId, channel, isActive: true } })
  if (!row) return null
  return { ...row, accessToken: decryptSecret(row.accessToken) }
}

export async function disconnectSocialAccount(id: string): Promise<void> {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return
  const { db } = await import("@/lib/db")
  await db.socialAccount.deleteMany({ where: { id, tenantId: tenant.tenantId } })
}

export interface PermissionCheckResult {
  ok: boolean
  error?: string
  /** What this specific token actually carries right now — not the same thing as Meta App Review status, see the note below. */
  granted?: string[]
  missing?: string[]
  /** True once the token demonstrably lacks a required scope — a real signal that App Review / Advanced Access has not been granted for it yet, distinct from "not connected". */
  likelyPendingAppReview?: boolean
}

/**
 * What this actually checks, and what it cannot: debug_token reports the
 * scopes genuinely present on a live token — real, verifiable, not a guess.
 * It does NOT report whether Meta's App Review has approved this app for
 * Advanced Access (that status only appears in the Meta Developer dashboard,
 * under App Review → Permissions and Features). A missing scope here is
 * still the closest a live API call gets to "App Review is probably not
 * approved yet" — a token issued before approval simply cannot carry a
 * permission the app was never granted.
 */
export async function checkFacebookPermissions(pageAccessToken: string): Promise<PermissionCheckResult> {
  const appId = await getConfigValue("meta_app_id")
  const appSecret = await getConfigValue("meta_app_secret")
  if (!appId || !appSecret) return { ok: false, error: "Meta app is not configured" }
  const version = await graphVersion()

  try {
    const res = await fetch(
      `https://graph.facebook.com/${version}/debug_token?${new URLSearchParams({ input_token: pageAccessToken, access_token: `${appId}|${appSecret}` })}`,
    )
    const data = await res.json()
    if (!res.ok || !data.data) return { ok: false, error: data.error?.message || `Graph API returned ${res.status}` }

    const granted: string[] = data.data.scopes || []
    const missing = REQUIRED_FACEBOOK_PERMISSIONS.filter(p => !granted.includes(p))
    return { ok: true, granted, missing, likelyPendingAppReview: missing.length > 0 }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

/**
 * Health-check + refresh sweep, called from cron for the current tenant.
 *
 * Facebook Page tokens derived from a long-lived user token do not expire on
 * a fixed schedule — only when a permission is revoked or the password
 * changes — so they are validated, not refreshed. Instagram long-lived
 * tokens do expire (60 days) and are refreshed once past 24h old and inside
 * a week of expiring, per Meta's own refresh rule.
 */
export async function refreshSocialTokensForTenant(): Promise<{ checked: number; refreshed: number; failed: number }> {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return { checked: 0, refreshed: 0, failed: 0 }
  const { db } = await import("@/lib/db")
  const version = await graphVersion()
  const accounts = await db.socialAccount.findMany({ where: { status: { not: "DISCONNECTED" } } })

  let refreshed = 0, failed = 0
  for (const account of accounts) {
    const token = decryptSecret(account.accessToken)
    if (account.channel === "INSTAGRAM") {
      const soonToExpire = account.tokenExpiresAt && account.tokenExpiresAt.getTime() - Date.now() < 7 * 24 * 60 * 60_000
      if (!soonToExpire) continue
      try {
        const res = await fetch(`https://graph.instagram.com/refresh_access_token?${new URLSearchParams({ grant_type: "ig_refresh_token", access_token: token })}`)
        const data = await res.json()
        if (!res.ok || !data.access_token) throw new Error(data.error?.message || `Instagram returned ${res.status}`)
        await db.socialAccount.update({
          where: { id: account.id },
          data: { accessToken: encryptSecret(data.access_token), tokenExpiresAt: new Date(Date.now() + (data.expires_in || 5184000) * 1000), status: "CONNECTED", lastError: null },
        })
        refreshed++
      } catch (error) {
        await db.socialAccount.update({ where: { id: account.id }, data: { status: "ERROR", lastError: String(error) } })
        failed++
      }
    } else {
      try {
        const res = await fetch(`https://graph.facebook.com/${version}/me?fields=id&access_token=${encodeURIComponent(token)}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error?.message || `Graph API returned ${res.status}`)
        }
        if (account.status !== "CONNECTED") await db.socialAccount.update({ where: { id: account.id }, data: { status: "CONNECTED", lastError: null } })
      } catch (error) {
        await db.socialAccount.update({ where: { id: account.id }, data: { status: "ERROR", lastError: String(error) } })
        failed++
      }
    }
  }
  return { checked: accounts.length, refreshed, failed }
}
