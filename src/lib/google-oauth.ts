import { getConfigValue, saveConfigValues, clearConfigValue } from "@/lib/app-config"
import { currentTenant } from "@/lib/tenant"

/**
 * Connects a real Google account, so appointments can carry a Meet link.
 *
 * A service account cannot create one. Google answers `hangoutsMeet` with
 * "Invalid conference type value" for any calendar that is not owned by a
 * Workspace user, and a service account on a plain Cloud project never is.
 * Meet links belong to a person, so a person has to grant access once.
 *
 * The service account still handles tour bookings — it needs no consent and
 * cannot be revoked by someone leaving. This is only for the Meet link, and
 * the calendar falls back to the service account whenever nobody is connected.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const TOKEN_URL = "https://oauth2.googleapis.com/token"
/*
 * `email` is requested alongside the calendar scope purely so the connected
 * address is known. Without it the account cannot be named back to the
 * operator, and — more importantly — the shared calendar cannot be shared with
 * it, because sharing needs an address to share with.
 */
const SCOPE = "https://www.googleapis.com/auth/calendar.events email"

/*
 * One cached access token per workspace, not one per process.
 *
 * Each business connects its own Google account, so a single shared entry
 * would put one company's appointment on another company's calendar for as
 * long as the token lasted — with no error anywhere, because the token is
 * perfectly valid, just not theirs.
 */
const cachedByTenant = new Map<string, { token: string; expiresAt: number }>()

function tokenScope(): string {
  return currentTenant()?.tenantId ?? ""
}

export async function oauthConfigured(): Promise<boolean> {
  return Boolean(await getConfigValue("google_oauth_client_id")) &&
    Boolean(await getConfigValue("google_oauth_client_secret"))
}

export async function oauthConnected(): Promise<boolean> {
  return Boolean(await getConfigValue("google_oauth_refresh_token"))
}

export function redirectUri(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/api/google/callback`
}

/**
 * Where to send the operator to grant access.
 *
 * `access_type=offline` with `prompt=consent` is what makes Google return a
 * refresh token. Without both, a second authorisation returns only an access
 * token and the connection silently stops working an hour later.
 */
export async function consentUrl(baseUrl: string, state: string): Promise<string | null> {
  const clientId = await getConfigValue("google_oauth_client_id")
  if (!clientId) return null
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(baseUrl),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  })
  return `${AUTH_URL}?${params}`
}

/** Trades the one-time code for a refresh token and stores it. */
export async function completeConnection(code: string, baseUrl: string): Promise<{ ok: boolean; error?: string; email?: string }> {
  const clientId = await getConfigValue("google_oauth_client_id")
  const clientSecret = await getConfigValue("google_oauth_client_secret")
  if (!clientId || !clientSecret) return { ok: false, error: "Google OAuth is not configured" }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri(baseUrl),
      grant_type: "authorization_code",
    }),
  })
  const data = await response.json()
  if (!data.refresh_token) {
    // An account that has already granted access returns no refresh token
    // unless prompt=consent forced the screen again — which is why it does.
    return { ok: false, error: data.error_description || data.error || "Google did not return a refresh token" }
  }

  // The id token carries the address without a second round trip, and works
  // even when the userinfo endpoint is unavailable.
  let email: string | undefined
  try {
    if (data.id_token) {
      const payload = JSON.parse(Buffer.from(data.id_token.split(".")[1], "base64url").toString())
      email = payload.email
    }
    if (!email) {
      const profile = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      if (profile.ok) email = (await profile.json()).email
    }
  } catch { /* the address is a nicety, not a requirement */ }

  await saveConfigValues({
    google_oauth_refresh_token: data.refresh_token,
    ...(email ? { google_oauth_account: email } : {}),
  })
  cachedByTenant.set(tokenScope(), { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 })

  /*
   * The shared calendar is owned by the service account, so a freshly
   * connected person can read it but not write to it — and the first
   * appointment they tried to create would fail with "You need to have writer
   * access to this calendar". The service account owns it, so it can hand out
   * that access itself rather than making somebody click through sharing
   * settings.
   */
  if (email) {
    const { grantWriterAccess } = await import("@/lib/google-calendar")
    const granted = await grantWriterAccess(email)
    if (!granted.ok) console.error("Could not share the calendar with", email, "-", granted.error)
  }

  return { ok: true, email }
}

export async function disconnect(): Promise<void> {
  cachedByTenant.delete(tokenScope())
  await clearConfigValue("google_oauth_refresh_token")
  await clearConfigValue("google_oauth_account")
}

/** A live access token for the connected account, or null if nobody is connected. */
export async function userAccessToken(): Promise<string | null> {
  const cached = cachedByTenant.get(tokenScope())
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token

  const [clientId, clientSecret, refreshToken] = await Promise.all([
    getConfigValue("google_oauth_client_id"),
    getConfigValue("google_oauth_client_secret"),
    getConfigValue("google_oauth_refresh_token"),
  ])
  if (!clientId || !clientSecret || !refreshToken) return null

  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    })
    const data = await response.json()
    if (!data.access_token) {
      // A revoked or expired grant must not be retried on every booking.
      if (data.error === "invalid_grant") {
        console.error("Google account access was revoked — clearing the connection")
        await disconnect()
      }
      return null
    }
    cachedByTenant.set(tokenScope(), { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 })
    return data.access_token
  } catch (error) {
    console.error("Google token refresh failed:", error)
    return null
  }
}
