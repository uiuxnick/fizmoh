import { describe, expect, test, spyOn } from "bun:test"
import { exchangeInstagramLogin, parseInstagramResponse } from "../src/lib/social/instagram-login"

const input = { code: "test-code", appId: "123", appSecret: "test-secret", redirectUri: "https://example.com/callback", version: "v21.0" }
function fixture(responses: Array<[number, unknown]>) {
  const calls: Array<{ url: URL; init?: RequestInit }> = []
  const request = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: new URL(String(url)), init })
    const next = responses.shift()
    if (!next) throw new Error("Unexpected request")
    return new Response(typeof next[1] === "string" ? next[1] : JSON.stringify(next[1]), { status: next[0] })
  }) as typeof fetch
  return { calls, request }
}
const short = { access_token: "IGAA-test-short-token", user_id: "28153510427652771", permissions: ["instagram_business_basic"] }
const long = { access_token: "test-long-token", expires_in: 5184000 }

describe("Instagram Business Login", () => {
  test("preserves large numeric IDs and does not rewrite digits inside strings", () => {
    expect(parseInstagramResponse('{"user_id":28153510427652771,"username":"x28153510427652771"}')).toEqual({ user_id: "28153510427652771", username: "x28153510427652771" })
    expect(parseInstagramResponse('{"data":[{"user_id":28153510427652771}]}').user_id).toBe("28153510427652771")
    expect(parseInstagramResponse("not json")).toEqual({})
  })
  test("IGAA token with permissions still uses unversioned exchange and actual expiry", async () => {
    const f = fixture([[200, short], [200, long], [200, { user_id: "17841400000000001", id: short.user_id, username: "test_account" }]])
    const before = Date.now()
    const result = await exchangeInstagramLogin(input, f.request)
    expect(result.ok).toBe(true)
    expect(result.account?.id).toBe("17841400000000001")
    expect(result.account?.accessToken).toBe(long.access_token)
    expect(result.account!.expiresAt.getTime()).toBeGreaterThanOrEqual(before + long.expires_in * 1000)
    expect(f.calls[1].url.pathname).toBe("/access_token")
    expect(f.calls[2].url.pathname).toBe("/v21.0/me")
    expect(f.calls[2].url.searchParams.get("fields")).toBe("user_id,username")
    expect(f.calls.slice(1).every(c => !c.init?.method || c.init.method === "GET")).toBe(true)
  })
  test("handles wrapped responses and never substitutes an app-scoped ID for the webhook account", async () => {
    const f = fixture([[200, { data: [short] }], [200, long], [400, { error: { code: 100 } }], [200, { id: short.user_id, username: "test" }], [200, { id: short.user_id }]])
    const result = await exchangeInstagramLogin(input, f.request)
    expect(result.ok).toBe(false)
    expect(result.account).toBeUndefined()
    expect(f.calls.slice(2).map(c => c.url.searchParams.get("fields"))).toEqual(["user_id,username", "id,username", null])
  })
  test("does not retry authorization errors with alternative fields", async () => {
    const f = fixture([[200, short], [200, long], [400, { error: { code: 190 } }]])
    expect((await exchangeInstagramLogin(input, f.request)).ok).toBe(false)
    expect(f.calls).toHaveLength(3)
  })
  test("does not save an assumed 60-day token when exchange fails", async () => {
    const f = fixture([[200, short], [400, { error: { code: 100, message: input.appSecret } }], [200, { user_id: "17841400000000001", username: "test" }]])
    const result = await exchangeInstagramLogin(input, f.request)
    expect(result.ok).toBe(false)
    expect(result.error).not.toContain(input.appSecret)
    expect(result.account).toBeUndefined()
    expect(f.calls).toHaveLength(3)
    expect(f.calls[2].url.searchParams.get("access_token")).toBe(short.access_token)
  })
  test("probes all minimal fields after exchange failure without saving or POSTing", async () => {
    const fail: [number, unknown] = [400, { error: { code: 100, message: "Unsupported request - method type: get" } }]
    const f = fixture([[200, short], fail, fail, fail, fail])
    expect((await exchangeInstagramLogin(input, f.request)).account).toBeUndefined()
    expect(f.calls.slice(2).map(c => c.url.searchParams.get("fields"))).toEqual(["user_id,username", "id,username", null])
    expect(f.calls.slice(2).every(c => !c.init?.method)).toBe(true)
  })
  test("network exceptions cannot expose request credentials", async () => {
    const request = (async () => { throw new Error(`https://example.com/?access_token=${short.access_token}`) }) as typeof fetch
    const result = await exchangeInstagramLogin(input, request)
    expect(result.ok).toBe(false)
    expect(result.error).not.toContain(short.access_token)
  })
  test("provider error diagnostics redact credentials and URLs", async () => {
    const log = spyOn(console, "error").mockImplementation(() => {})
    try {
      const f = fixture([[200, short], [400, { error: { code: 100, message: `${input.appSecret} ${short.access_token} ${input.code} https://graph.instagram.com/?secret=other` } }], [400, { error: { code: 190 } }]])
      await exchangeInstagramLogin(input, f.request)
      const output = JSON.stringify(log.mock.calls)
      for (const secret of [input.appSecret, input.code, short.access_token, "https://graph.instagram.com"]) expect(output).not.toContain(secret)
      expect(output).toContain("[redacted]")
    } finally { log.mockRestore() }
  })
})
