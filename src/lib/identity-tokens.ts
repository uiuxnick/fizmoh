import { createPublicKey, createVerify } from "crypto"
import { getConfigValue } from "@/lib/app-config"

/**
 * Verifying the identity tokens Google and Apple hand out.
 *
 * The rule this file exists to enforce: a token proves who somebody is, not
 * that they are allowed in. Both are checked separately, and the allowed-in
 * half is a Staff row that already exists — otherwise anybody with a Gmail
 * account could sign into somebody else's inbox.
 *
 * Verified against the provider's published keys rather than by asking the
 * provider about the token: one round trip fewer on a screen somebody is
 * waiting on, and no dependency on a tokeninfo endpoint that is rate limited.
 */

interface Jwk {
  kid: string
  n?: string
  e?: string
  alg?: string
  kty: string
}

interface KeyCache {
  keys: Jwk[]
  fetchedAt: number
}

const cache = new Map<string, KeyCache>()
/** Providers rotate slowly; an hour is well inside their published cadence. */
const KEY_TTL_MS = 60 * 60_000

async function keysFrom(url: string): Promise<Jwk[]> {
  const cached = cache.get(url)
  if (cached && Date.now() - cached.fetchedAt < KEY_TTL_MS) return cached.keys

  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error(`Could not fetch signing keys (${response.status})`)
  const data = await response.json()
  const keys: Jwk[] = data?.keys ?? []
  cache.set(url, { keys, fetchedAt: Date.now() })
  return keys
}

function base64UrlToBuffer(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64")
}

function decodeSegment(segment: string): any {
  return JSON.parse(base64UrlToBuffer(segment).toString("utf8"))
}

export interface VerifiedIdentity {
  subject: string
  email: string
  emailVerified: boolean
  name?: string
}

/**
 * Checks a token's signature, issuer, audience and expiry.
 *
 * Every one of those matters. A token signed by the right provider but issued
 * for a different application is a valid token belonging to somebody else's
 * app, and accepting it would let that app's users in here.
 */
async function verify(
  token: string,
  options: { jwksUrl: string; issuers: string[]; audiences: string[] },
): Promise<VerifiedIdentity> {
  const parts = token.split(".")
  if (parts.length !== 3) throw new Error("Malformed token")

  const header = decodeSegment(parts[0])
  const payload = decodeSegment(parts[1])

  const keys = await keysFrom(options.jwksUrl)
  const jwk = keys.find(key => key.kid === header.kid)
  if (!jwk) throw new Error("Token was signed with an unknown key")

  const publicKey = createPublicKey({ key: jwk as any, format: "jwk" })
  const verifier = createVerify("RSA-SHA256")
  verifier.update(`${parts[0]}.${parts[1]}`)
  if (!verifier.verify(publicKey, base64UrlToBuffer(parts[2]))) {
    throw new Error("Token signature does not check out")
  }

  if (!options.issuers.includes(String(payload.iss))) throw new Error("Token came from elsewhere")

  const audience = String(payload.aud)
  if (!options.audiences.filter(Boolean).includes(audience)) {
    throw new Error("Token was issued for a different application")
  }

  const now = Math.floor(Date.now() / 1000)
  if (Number(payload.exp) < now) throw new Error("Token has expired")
  if (Number(payload.iat) > now + 300) throw new Error("Token is from the future")

  const email = String(payload.email || "").toLowerCase()
  if (!email) throw new Error("Token carries no email address")

  return {
    subject: String(payload.sub),
    email,
    // Google sends a boolean, Apple a string. Both lie about nothing else.
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    name: payload.name ? String(payload.name) : undefined,
  }
}

/**
 * The client IDs this server will accept a Google token for.
 *
 * One per platform, because Google issues a token to whichever client asked
 * for it: the phone app's token carries the iOS client id, and the dashboard's
 * carries the web one. They are read from the same settings the Calendar
 * connection uses, so there is one place a client id is written down.
 */
async function googleAudiences(): Promise<string[]> {
  const [web, ios, android] = await Promise.all([
    getConfigValue("google_oauth_client_id"),
    getConfigValue("google_ios_client_id"),
    getConfigValue("google_android_client_id"),
  ])
  return [ios, android, web, process.env.GOOGLE_CLIENT_ID].filter(Boolean) as string[]
}

export async function verifyGoogleToken(idToken: string): Promise<VerifiedIdentity> {
  return verify(idToken, {
    jwksUrl: "https://www.googleapis.com/oauth2/v3/certs",
    issuers: ["https://accounts.google.com", "accounts.google.com"],
    audiences: await googleAudiences(),
  })
}

export function verifyAppleToken(idToken: string): Promise<VerifiedIdentity> {
  return verify(idToken, {
    jwksUrl: "https://appleid.apple.com/auth/keys",
    issuers: ["https://appleid.apple.com"],
    // The app's bundle id, and the Services ID if the dashboard ever uses it.
    audiences: [process.env.APNS_BUNDLE_ID, process.env.APPLE_SERVICE_ID].filter(
      Boolean,
    ) as string[],
  })
}
