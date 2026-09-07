type JsonObject = Record<string, any>
type LoginResult = { ok: boolean; error?: string; account?: { id: string; username: string; name: string | null; accessToken: string; expiresAt: Date } }

// Preserve numeric IDs before JSON.parse can round them. Match complete JSON
// strings as well, so digits inside a string cannot be rewritten.
export function parseInstagramResponse(raw: string): JsonObject {
  try {
    const parsed = JSON.parse(raw.replace(/"(?:\\.|[^"\\])*"|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g, (value, number) => {
      return number && /^\d{16,}$/.test(number) ? `"${number}"` : value
    }))
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    return Array.isArray(parsed.data) && parsed.data.length === 1 ? parsed.data[0] || {} : parsed
  } catch { return {} }
}

function accountId(value: unknown): string | null {
  if (typeof value === "string" && /^[1-9]\d*$/.test(value)) return value
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return String(value)
  return null
}

export async function exchangeInstagramLogin(input: {
  code: string; appId: string; appSecret: string; redirectUri: string; version: string
}, request: typeof fetch = fetch): Promise<LoginResult> {
  const diagnosticId = crypto.randomUUID()
  const secrets = [input.code, input.appSecret]
  // Allowlisted metadata only: never log provider bodies, URLs, tokens or secrets.
  function diagnostic(stage: string, data: JsonObject = {}) {
    console.error("[instagram-oauth]", { diagnosticId, stage, ...data })
  }
  async function call(url: string, init?: RequestInit) {
    const res = await request(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(10000) })
    const data = parseInstagramResponse(await res.text())
    return { ok: res.ok && !data.error, status: res.status, data }
  }
  function failure(stage: string, result: { status: number; data: JsonObject }) {
    let message = String(result.data.error?.message || result.data.error_message || "")
    for (const secret of secrets) {
      if (secret) message = message.split(secret).join("[redacted]").split(encodeURIComponent(secret)).join("[redacted]")
    }
    message = message.replace(/https?:\/\/\S+|[A-Za-z0-9_%-]{40,}/g, "[redacted]").slice(0, 300)
    diagnostic(stage, {
      status: result.status,
      message,
      code: typeof result.data.error?.code === "number" ? result.data.error.code : undefined,
      traceId: typeof result.data.error?.fbtrace_id === "string" && /^[\w-]{1,100}$/.test(result.data.error.fbtrace_id) ? result.data.error.fbtrace_id : undefined,
    })
  }
  try {
    const short = await call("https://api.instagram.com/oauth/access_token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: input.appId, client_secret: input.appSecret, grant_type: "authorization_code", redirect_uri: input.redirectUri, code: input.code }),
    })
    if (!short.ok || typeof short.data.access_token !== "string" || !short.data.access_token) {
      failure("short-token-failed", short)
      return { ok: false, error: `[short token] Instagram authorization failed (${diagnosticId}). Please reconnect.` }
    }
    const permissions = Array.isArray(short.data.permissions) ? short.data.permissions : String(short.data.permissions || "").split(",")
    secrets.push(short.data.access_token)
    diagnostic("short-token", { length: short.data.access_token.length, permissions: permissions.filter((p: unknown) => typeof p === "string" && /^instagram_business_[a-z_]+$/.test(p)) })

    // Permissions and token prefixes do not establish lifetime. Meta documents
    // this exchange without a Graph version, and returns the actual expires_in.
    const long = await call(`https://graph.instagram.com/access_token?${new URLSearchParams({ grant_type: "ig_exchange_token", client_secret: input.appSecret, access_token: short.data.access_token })}`)
    if (!long.ok || typeof long.data.access_token !== "string" || !long.data.access_token || !Number.isFinite(Number(long.data.expires_in)) || Number(long.data.expires_in) <= 0 || Number(long.data.expires_in) > 366 * 86400) {
      failure("long-token-failed", long)
      // Read-only diagnostics using the valid short token; never persist it or
      // treat profile success as proof of a long-lived connection.
      for (const fields of ["user_id,username", "id,username", ""]) {
        try {
          const query = new URLSearchParams({ access_token: short.data.access_token })
          if (fields) query.set("fields", fields)
          const result = await call(`https://graph.instagram.com/${input.version}/me?${query}`)
          diagnostic("short-profile-probe", { fields: fields || "(none)", version: input.version, status: result.status, hasUserId: Boolean(accountId(result.data.user_id)), hasId: Boolean(accountId(result.data.id)), hasUsername: typeof result.data.username === "string" })
          if (result.ok) break
          failure("short-profile-probe-failed", result)
          if (result.data.error?.code !== 100) break
        } catch {
          diagnostic("short-profile-probe-unavailable")
          break
        }
      }
      return { ok: false, error: `[long token] Instagram token exchange failed (${diagnosticId}). Please check Instagram Login setup.` }
    }
    const accessToken: string = long.data.access_token
    secrets.push(accessToken)
    const expiresAt = new Date(Date.now() + Number(long.data.expires_in) * 1000)
    diagnostic("long-token", { expiresIn: Number(long.data.expires_in) })

    // /me avoids relying on the app-scoped ID returned by the code exchange.
    // user_id, unlike id, is the professional account ID used by webhooks.
    let profile: JsonObject = {}
    for (const fields of ["user_id,username", "id,username", ""]) {
      const query = new URLSearchParams({ access_token: accessToken })
      if (fields) query.set("fields", fields)
      const result = await call(`https://graph.instagram.com/${input.version}/me?${query}`)
      diagnostic("profile", { fields: fields || "(none)", version: input.version, status: result.status, hasUserId: Boolean(accountId(result.data.user_id)), hasId: Boolean(accountId(result.data.id)), hasUsername: typeof result.data.username === "string" })
      if (result.ok) {
        profile = result.data
        if (accountId(profile.user_id) && typeof profile.username === "string" && profile.username.trim()) break
      } else {
        failure("profile-failed", result)
        // Only field/node errors justify trying a smaller projection.
        if (result.data.error?.code !== 100) break
      }
    }
    const id = accountId(profile.user_id)
    if (!id || typeof profile.username !== "string" || !profile.username.trim()) {
      return { ok: false, error: `[profile] Instagram did not return a verified professional account ID and username (${diagnosticId}). Check Instagram Login setup and account access.` }
    }
    diagnostic("profile-verified")
    return { ok: true, account: { id, username: profile.username, name: typeof profile.name === "string" ? profile.name : null, accessToken, expiresAt } }
  } catch {
    diagnostic("request-failed")
    return { ok: false, error: `Instagram request failed or timed out (${diagnosticId}). Please retry.` }
  }
}
