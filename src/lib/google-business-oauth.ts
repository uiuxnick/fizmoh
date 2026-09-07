import { getConfigValue } from "@/lib/app-config"
import { encryptSecret, decryptSecret } from "@/lib/secret-box"
import { currentTenant } from "@/lib/tenant"

/**
 * Connects a real Google Business Profile account, for real average
 * rating / review count on the Digital QR dashboard.
 *
 * Reuses the platform's own Google OAuth client (google_oauth_client_id /
 * secret — the same one the Calendar "Connect" button uses) rather than
 * asking for a second Google Cloud project: one client can request more than
 * one scope, and this is one more scope, not a different application. Only
 * the redirect path and requested scope differ from google-oauth.ts, which is
 * why this stays a separate module and a separate token store
 * (GoogleIntegration, not the calendar's SystemSetting keys) — a tenant
 * connecting Calendar and Business Profile are two independent grants and
 * must not overwrite each other.
 *
 * IMPORTANT, and told to the operator wherever this is surfaced: connecting
 * here proves nothing about API *access*. Google's Business Profile APIs
 * (Account Management, Business Information, Reviews) all sit behind a
 * separate, manually-reviewed "Business Profile API Access Request" that
 * Google approves case by case — connecting can succeed while every
 * subsequent API call still 403s until that request is approved. Every
 * caller in this file treats that 403 as an expected, named state
 * ("ERROR" / lastError), never as a crash and never papered over as success.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const TOKEN_URL = "https://oauth2.googleapis.com/token"
const SCOPE = "https://www.googleapis.com/auth/business.manage email"

const ACCOUNTS_API = "https://mybusinessaccountmanagement.googleapis.com/v1"

/** One cached access token per workspace — a business account is its own tenant's, never shared. */
const cachedByTenant = new Map<string, { token: string; expiresAt: number }>()

function tokenScope(): string {
  return currentTenant()?.tenantId ?? ""
}

export async function businessOauthConfigured(): Promise<boolean> {
  return Boolean(await getConfigValue("google_oauth_client_id")) &&
    Boolean(await getConfigValue("google_oauth_client_secret"))
}

export function businessRedirectUri(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/api/google-business/callback`
}

export async function businessConsentUrl(baseUrl: string, state: string): Promise<string | null> {
  const clientId = await getConfigValue("google_oauth_client_id")
  if (!clientId) return null
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: businessRedirectUri(baseUrl),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  })
  return `${AUTH_URL}?${params}`
}

interface ConnectResult {
  ok: boolean
  error?: string
  email?: string
}

/** Trades the one-time code for tokens and stores a GoogleIntegration row for the current tenant. */
export async function completeBusinessConnection(code: string, baseUrl: string): Promise<ConnectResult> {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return { ok: false, error: "No workspace in scope" }

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
      redirect_uri: businessRedirectUri(baseUrl),
      grant_type: "authorization_code",
    }),
  })
  const data = await response.json()
  if (!data.refresh_token) {
    return { ok: false, error: data.error_description || data.error || "Google did not return a refresh token" }
  }

  let email: string | undefined
  try {
    if (data.id_token) {
      const payload = JSON.parse(Buffer.from(data.id_token.split(".")[1], "base64url").toString())
      email = payload.email
    }
  } catch { /* the address is a nicety, not a requirement */ }

  const { db } = await import("@/lib/db")

  // Whether the account/location APIs are actually reachable — this is the
  // first real signal of whether Google has approved API access yet. Never
  // block the connection on this: the OAuth grant is real either way, and the
  // operator should see "connected, pending API access" rather than nothing.
  let accountId: string | null = null
  let accountName: string | null = null
  let status = "CONNECTED"
  let lastError: string | null = null
  try {
    const accountsRes = await fetch(`${ACCOUNTS_API}/accounts`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    })
    if (accountsRes.ok) {
      const body = await accountsRes.json()
      const first = body.accounts?.[0]
      if (first) { accountId = first.name; accountName = first.accountName || null }
    } else {
      status = "ERROR"
      lastError = `Google returned ${accountsRes.status} listing accounts — Business Profile API access is likely still pending Google's approval.`
    }
  } catch (error) {
    status = "ERROR"
    lastError = String(error)
  }

  await db.googleIntegration.upsert({
    where: { tenantId: tenant.tenantId },
    create: {
      tenantId: tenant.tenantId,
      accessToken: encryptSecret(data.access_token),
      refreshToken: encryptSecret(data.refresh_token),
      tokenExpiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
      googleEmail: email || null,
      googleAccountId: accountId,
      googleAccountName: accountName,
      status, lastError,
    },
    update: {
      accessToken: encryptSecret(data.access_token),
      refreshToken: encryptSecret(data.refresh_token),
      tokenExpiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
      googleEmail: email || null,
      googleAccountId: accountId,
      googleAccountName: accountName,
      status, lastError,
    },
  })
  cachedByTenant.set(tokenScope(), { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 })

  return { ok: true, email }
}

export async function disconnectBusiness(): Promise<void> {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return
  cachedByTenant.delete(tokenScope())
  const { db } = await import("@/lib/db")
  await db.googleIntegration.deleteMany({ where: { tenantId: tenant.tenantId } })
}

/** A live access token for the current tenant's connected account, or null. */
export async function businessAccessToken(): Promise<string | null> {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return null

  const cached = cachedByTenant.get(tokenScope())
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token

  const { db } = await import("@/lib/db")
  const row = await db.googleIntegration.findUnique({ where: { tenantId: tenant.tenantId } })
  if (!row) return null

  const [clientId, clientSecret] = await Promise.all([
    getConfigValue("google_oauth_client_id"),
    getConfigValue("google_oauth_client_secret"),
  ])
  if (!clientId || !clientSecret) return null

  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: decryptSecret(row.refreshToken),
        grant_type: "refresh_token",
      }),
    })
    const data = await response.json()
    if (!data.access_token) {
      if (data.error === "invalid_grant") {
        console.error("Business Profile access was revoked for tenant", tenant.tenantId, "— clearing the connection")
        await disconnectBusiness()
      }
      return null
    }
    cachedByTenant.set(tokenScope(), { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 })
    await db.googleIntegration.update({
      where: { tenantId: tenant.tenantId },
      data: { accessToken: encryptSecret(data.access_token), tokenExpiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000) },
    })
    return data.access_token
  } catch (error) {
    console.error("Business Profile token refresh failed:", error)
    return null
  }
}

export interface GoogleBusinessStatus {
  ready: boolean
  connected: boolean
  email: string | null
  accountName: string | null
  status: "CONNECTED" | "ERROR" | "DISCONNECTED" | null
  lastError: string | null
  lastSyncAt: string | null
}

export async function businessIntegrationStatus(): Promise<GoogleBusinessStatus> {
  const tenant = currentTenant()
  const ready = await businessOauthConfigured()
  if (!tenant?.tenantId) return { ready, connected: false, email: null, accountName: null, status: null, lastError: null, lastSyncAt: null }

  const { db } = await import("@/lib/db")
  const row = await db.googleIntegration.findUnique({ where: { tenantId: tenant.tenantId } })
  if (!row) return { ready, connected: false, email: null, accountName: null, status: null, lastError: null, lastSyncAt: null }

  return {
    ready,
    connected: true,
    email: row.googleEmail,
    accountName: row.googleAccountName,
    status: row.status as GoogleBusinessStatus["status"],
    lastError: row.lastError,
    lastSyncAt: row.lastSyncAt ? row.lastSyncAt.toISOString() : null,
  }
}
