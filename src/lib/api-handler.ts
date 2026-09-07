import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { resolveTenant, withTenant, type TenantContext } from "@/lib/tenant"

/**
 * Wraps a route handler so an unexpected failure returns usable JSON instead
 * of a stack trace.
 *
 * Most routes here had no error handling at all: a malformed body, a missing
 * relation or a dropped database connection surfaced as Next's default 500,
 * which renders an HTML error page. Client code calling `res.json()` on that
 * then throws a parse error, so the admin panel showed "Network error" for
 * problems that had nothing to do with the network and left no usable trace.
 *
 * The message returned to the caller is deliberately generic. The detail goes
 * to the server log with the method and path attached, so a report of "it
 * failed at 14:32" can be matched to a specific request.
 */

type Handler<C> = (request: NextRequest, context: C) => Promise<Response> | Response

/**
 * Resolved workspaces, briefly.
 *
 * Resolution is two queries and the answer changes when somebody is added to
 * or removed from a workspace — rare, and a few seconds of staleness costs
 * nothing next to two queries on every request the panel makes. Short enough
 * that a revoked membership stops working while the person is still watching
 * the screen.
 */
const RESOLVED_TTL_MS = 15_000
const resolved = new Map<string, { tenant: TenantContext | null; at: number }>()

async function tenantFor(request: NextRequest): Promise<TenantContext | null> {
  // Set by the proxy after it verified the session. A request that reaches a
  // handler without it is public, and public work runs unscoped.
  const staffId = request.headers.get("x-wptour-staff-id")
  const host = request.headers.get("host")

  /*
   * A workspace named by the request.
   *
   * Every business is reached at the same address, so a customer-facing page
   * has no other way to say whose catalogue it is asking for. For a signed-in
   * person this is only a proposal: resolveTenant checks membership, and a
   * staff member naming a workspace they do not belong to gets nothing.
   */
  // The cookie is httpOnly and set by exactly one place: the audited
  // impersonate endpoint (and the ordinary workspace switcher for a member's
  // own workspaces). The header and query string are plain request input —
  // anyone can send either. For a real member neither matters: resolveTenant
  // checks membership regardless of where the slug came from. But the
  // platform-operator escalation (a SUPER_ADMIN with no membership at all,
  // opening a customer's workspace) has no membership check to fall back on,
  // so it must only ever trust the cookie — a client-supplied header or query
  // string granting that escalation would let any operator read any tenant's
  // data with nothing recorded anywhere.
  const cookieNamed = request.cookies.get("fizmoh_workspace")?.value || null
  const untrustedNamed =
    request.headers.get("x-fizmoh-workspace") ||
    (() => {
      try { return new URL(request.url).searchParams.get("workspace") } catch { return null }
    })()
  const named = untrustedNamed || cookieNamed

  if (!staffId && !host && !named) return null

  const key = `${host ?? ""}|${staffId ?? ""}|${named ?? ""}`
  const hit = resolved.get(key)
  if (hit && Date.now() - hit.at < RESOLVED_TTL_MS) return hit.tenant

  const tenant = await resolveTenant({ host, staffId, slug: named, trustedSlug: cookieNamed }).catch(() => null)
  resolved.set(key, { tenant, at: Date.now() })
  // The map is keyed by host and person, so it is bounded by the number of
  // people using the platform — but a long-lived process deserves a ceiling.
  if (resolved.size > 5_000) resolved.clear()
  return tenant
}

/**
 * Every route runs inside the workspace it belongs to.
 *
 * Entering the scope here rather than in each handler is deliberate: there are
 * 115 of them, and a route that forgets is not a missing line, it is one
 * business reading another's data. The middleware cannot do this — it runs in
 * a separate context from the handler, so async-local storage set there would
 * not be visible by the time the query runs.
 */
export function withErrors<C>(handler: Handler<C>): Handler<C> {
  return async (request: NextRequest, context: C) => {
    try {
      const tenant = await tenantFor(request)
      return tenant
        ? await withTenant(tenant, async () => handler(request, context))
        : await handler(request, context)
    } catch (error) {
      const path = (() => {
        try { return new URL(request.url).pathname } catch { return "unknown" }
      })()
      console.error(`[api] ${request.method} ${path} failed:`, error)

      // Prisma's known errors map onto meaningful HTTP statuses; anything else
      // is genuinely unexpected and stays a 500.
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          return NextResponse.json({ error: "That record already exists" }, { status: 409 })
        }
        if (error.code === "P2025") {
          return NextResponse.json({ error: "Record not found" }, { status: 404 })
        }
        if (error.code === "P2003") {
          return NextResponse.json(
            { error: "This record is still referenced by something else and cannot be changed" },
            { status: 409 },
          )
        }
      }

      if (error instanceof SyntaxError) {
        return NextResponse.json({ error: "Malformed request body" }, { status: 400 })
      }

      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
    }
  }
}
