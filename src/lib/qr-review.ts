/**
 * Digital QR Addons — shared helpers for the customer review journey.
 *
 * Kept separate from the route files so the funnel-stage transitions (what
 * moves a session from STARTED to RATED to CONFIRMED, and never backwards)
 * live in one place instead of being re-implemented slightly differently by
 * each endpoint.
 */

import { createHash } from "node:crypto"
import { NextResponse } from "next/server"
import { db, raw } from "@/lib/db"
import { tenantOf, withTenant, type TenantContext } from "@/lib/tenant"
import { checkRateLimit, requestIp } from "@/lib/rate-limit"

export const REVIEW_SESSION_STATUSES = [
  "STARTED", "RATED", "INPUT_GIVEN", "AI_GENERATED",
  "SUGGESTION_SELECTED", "EDITED", "CONFIRMED", "ROUTED_GOOGLE", "ROUTED_PRIVATE",
] as const

/** Anonymous fingerprint for "was this a repeat scan" — never stores an IP. */
export function scanFingerprint(ip: string, userAgent: string, qrCodeId: string): string {
  return createHash("sha256").update(`${ip}:${userAgent}:${qrCodeId}`).digest("hex")
}

/** A session plus enough of its campaign/QR to render the customer page. */
export async function loadSessionContext(sessionId: string) {
  return db.reviewSession.findUnique({
    where: { id: sessionId },
    include: { campaign: true, qrCode: true, suggestions: true },
  })
}


/**
 * Resolves a public session route's tenant scope from the session id alone.
 *
 * Every one of these routes is unauthenticated — anonymous customers hold no
 * session cookie a normal request would use to know which business they are
 * dealing with. The ReviewSession row itself carries the tenantId, the same
 * way an order or a payment does for the other public customer-facing routes,
 * so that row is the source of truth for scope rather than anything the
 * client claims.
 */
export async function withSessionTenant<T>(
  sessionId: string,
  work: (ctx: { tenant: TenantContext }) => Promise<T>,
): Promise<T | { error: string; status: number }> {
  const stub = await raw.reviewSession.findUnique({ where: { id: sessionId }, select: { tenantId: true } })
  if (!stub) return { error: "No such review session", status: 404 }
  const tenant = await tenantOf(stub.tenantId)
  if (!tenant) return { error: "No such workspace", status: 404 }
  return withTenant(tenant, () => work({ tenant }))
}

export function isRouteError(v: unknown): v is { error: string; status: number } {
  return !!v && typeof v === "object" && "error" in v && "status" in v
}

/**
 * Rate limiting for the public, anonymous QR endpoints — spec section 45.
 *
 * These routes need no login, which is the point, but it also means the
 * entire customer journey is open to anyone on the internet with the token.
 * `bucket` scopes the limit to what actually matters: AI generation is real
 * per-call API cost and gets the tightest limit; everything else just
 * prevents scripted junk piling into the analytics and the approval queue.
 * Returns a 429 response to send back immediately, or null to continue.
 */
const LIMITS: Record<string, { limit: number; windowMs: number }> = {
  scan: { limit: 20, windowMs: 60_000 },
  generate: { limit: 8, windowMs: 60_000 },
  write: { limit: 40, windowMs: 60_000 },
}

export function qrRateLimited(headers: Headers, bucket: keyof typeof LIMITS): NextResponse | null {
  const ip = requestIp(headers)
  const { limit, windowMs } = LIMITS[bucket]
  const result = checkRateLimit(`qr:${bucket}:${ip}`, limit, windowMs)
  if (result.allowed) return null
  return NextResponse.json(
    { error: "Too many requests — please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
  )
}
