import { raw } from "@/lib/db"
import {
  PLATFORM,
  currentTenant,
  requireTenant,
  withTenant,
  type TenantContext,
} from "@/lib/tenant-context"
import { effectiveModules } from "@/lib/module-registry"

export { PLATFORM, currentTenant, requireTenant, withTenant }
export type { TenantContext }

/**
 * Resolving a request to a workspace, and what a workspace is entitled to.
 *
 * Everything here uses the unscoped client deliberately: these are the queries
 * that decide which business is in scope, so they cannot themselves be scoped
 * to one. Nothing else in the codebase should reach for `raw`.
 */

/**
 * Resolves a workspace from the host, then from the signed-in member.
 *
 * The subdomain proposes and the membership decides. A URL is a claim anybody
 * can type; membership is the fact that settles it.
 */
export async function resolveTenant(params: {
  host?: string | null
  staffId?: string | null
  slug?: string | null
  trustedSlug?: string | null
}): Promise<TenantContext | null> {
  const trustedSlug = params.trustedSlug?.trim().toLowerCase() || null
  const rawHost = params.host?.split(":")[0].toLowerCase() || null

  // 1. Check custom domain resolution first
  if (rawHost && !rawHost.endsWith(".fizmoh.cloud") && rawHost !== "localhost" && rawHost !== "187.127.119.207" && rawHost !== "127.0.0.1") {
    const tenantByDomain = await raw.tenant.findFirst({
      where: { customDomain: rawHost, status: { notIn: ["CANCELLED"] } },
    })
    if (tenantByDomain) {
      if (!params.staffId) return { tenantId: tenantByDomain.id, slug: tenantByDomain.slug }
      const membership = await raw.tenantMember.findUnique({
        where: { tenantId_staffId: { tenantId: tenantByDomain.id, staffId: params.staffId } },
      })
      if (membership) {
        return { tenantId: tenantByDomain.id, slug: tenantByDomain.slug, role: membership.role, staffId: params.staffId }
      }
      if (tenantByDomain.slug === trustedSlug && await isPlatformOperator(params.staffId)) {
        return { tenantId: tenantByDomain.id, slug: tenantByDomain.slug, role: "PLATFORM", staffId: params.staffId }
      }
      return { tenantId: tenantByDomain.id, slug: tenantByDomain.slug }
    }
  }

  const slug = params.slug?.trim().toLowerCase() || slugFromHost(params.host)

  if (slug) {
    const tenant = await raw.tenant.findUnique({ where: { slug } })
    // A host that names a workspace and does not match one is refused here.
    // Falling through to the caller's own workspace would mean any address
    // resolved to something, which reads as "the URL does not matter" — and
    // the day it does matter, it fails open.
    if (!tenant) return null
    {
      if (!params.staffId) return { tenantId: tenant.id, slug: tenant.slug }
      const membership = await raw.tenantMember.findUnique({
        where: { tenantId_staffId: { tenantId: tenant.id, staffId: params.staffId } },
      })
      if (!membership) {
        /*
         * The platform's own operator, opening a customer's workspace.
         *
         * They belong to no workspace — that is what makes them the operator
         * rather than a customer — so membership can never be the test for
         * them. Support work is impossible otherwise: every real question is
         * "what does their screen show", and answering it by reading the
         * database is how people give confidently wrong answers.
         *
         * The entry is recorded by the endpoint that starts it. Being able to
         * do this quietly is the part that would be unacceptable — which is
         * why this only fires when the workspace came from that endpoint's
         * own cookie, never from a header or query string anyone can set.
         */
        if (slug === trustedSlug && await isPlatformOperator(params.staffId)) {
          return { tenantId: tenant.id, slug: tenant.slug, role: "PLATFORM", staffId: params.staffId }
        }
        /*
         * A stale cookie is not an attempt to get somewhere.
         *
         * The workspace cookie outlives the session that set it, so signing
         * out of an impersonated workspace and back in as somebody else leaves
         * it naming a workspace the new person does not belong to. Refusing
         * then does not protect anything — it locks an owner out of their own
         * workspace, and every screen reports "Workspace context required"
         * while the flow list sits empty.
         *
         * Only when the cookie is the sole source. A slug from a header or a
         * query string is still refused outright: that is somebody asking for
         * a workspace, and being quietly moved elsewhere would hide it.
         */
        if (slug === trustedSlug) {
          const own = await raw.tenantMember.findFirst({
            where: { staffId: params.staffId },
            include: { tenant: true },
          })
          if (own?.tenant) {
            return { tenantId: own.tenant.id, slug: own.tenant.slug, role: own.role, staffId: params.staffId }
          }
        }

        // Somebody signed in, on a workspace they do not belong to. Refused
        // rather than quietly redirected to their own: silently moving
        // somebody hides the fact that they were somewhere they should not
        // have been.
        return null
      }
      return {
        tenantId: tenant.id,
        slug: tenant.slug,
        role: membership.role,
        staffId: params.staffId,
      }
    }
  }

  // No workspace in the host — the platform's own domain. Fall back to the
  // one this person belongs to, which is the single-workspace case and the
  // only one that exists today.
  if (params.staffId) {
    const membership = await raw.tenantMember.findFirst({
      where: { staffId: params.staffId },
      include: { tenant: true },
      orderBy: { invitedAt: "asc" },
    })
    if (membership) {
      return {
        tenantId: membership.tenantId,
        slug: membership.tenant.slug,
        role: membership.role,
        staffId: params.staffId,
      }
    }
  }

  return null
}

/**
 * `acme.fizmoh.cloud` → `acme`; the platform's own hosts → null.
 *
 * Kept for the day a business points its own domain here. Today every
 * workspace is reached at app.fizmoh.cloud, so this returns null for real
 * traffic and membership decides on its own.
 */
export function slugFromHost(host?: string | null): string | null {
  if (!host) return null
  const name = host.split(":")[0].toLowerCase()
  const reserved = new Set(["app", "www", "api", "admin", "localhost", "fizmoh"])
  const parts = name.split(".")
  if (parts.length < 3) return null
  const first = parts[0]
  return reserved.has(first) ? null : first
}

/**
 * Whether a plan includes a module, for the guard that will sit on every route
 * the module owns.
 */
export async function tenantHasModule(tenantId: string, module: string): Promise<boolean> {
  const subscription = await raw.subscription.findFirst({
    where: { tenantId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
    include: { plan: true },
  })
  if (!subscription) return false
  return effectiveModules(subscription.plan.modules).includes(module as never)
}

/** What a tenant has used this month, against what its plan allows. */
export async function usage(tenantId: string, metric: string): Promise<number> {
  const period = new Date().toISOString().slice(0, 7)
  const row = await raw.usageCounter.findUnique({
    where: { tenantId_metric_period: { tenantId, metric, period } },
  })
  return row?.used ?? 0
}

/** Counts something a plan meters. Called where the work happens, not near it. */
export async function countUsage(tenantId: string, metric: string, by = 1): Promise<void> {
  const period = new Date().toISOString().slice(0, 7)
  await raw.usageCounter
    .upsert({
      where: { tenantId_metric_period: { tenantId, metric, period } },
      update: { used: { increment: by } },
      create: { tenantId, metric, period, used: by },
    })
    .catch(() => {
      // A counter that fails must never stop a message going out. It is
      // billing information, not a precondition for doing the work.
    })
}


/**
 * The workspace a record belongs to, as a scope to run in.
 *
 * Used by the public paths — a customer booking a tour, paying for an order —
 * where nobody is signed in and, on a single shared hostname, nothing about
 * the request says which business is being dealt with. The record does: a tour
 * belongs to exactly one workspace, and everything that follows from booking
 * it belongs to the same one.
 */
export async function tenantOf(tenantId: string | null | undefined): Promise<TenantContext | null> {
  if (!tenantId) return null
  const tenant = await raw.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, slug: true },
  })
  return tenant ? { tenantId: tenant.id, slug: tenant.slug } : null
}


/**
 * Runs work once for each business, inside that business's scope.
 *
 * Scheduled jobs have no request and therefore no workspace, so every query
 * they make reads across all of them. That was invisible while one business
 * existed and becomes wrong the moment two do — a reminder sweep would collect
 * both companies' bookings into one pass and send them through whichever
 * WhatsApp number happened to be loaded.
 *
 * With no workspaces at all the work still runs once, unscoped, which is the
 * installation as it was before any of this existed.
 */
export async function forEachTenant<T>(
  work: (tenant: TenantContext | null) => Promise<T>,
): Promise<{ tenant: string; result: T }[]> {
  const tenants = await raw.tenant.findMany({
    where: { status: { notIn: ["CANCELLED"] } },
    select: { id: true, slug: true },
    orderBy: { createdAt: "asc" },
  })

  if (tenants.length === 0) {
    return [{ tenant: "", result: await work(null) }]
  }

  const results: { tenant: string; result: T }[] = []
  for (const tenant of tenants) {
    const context: TenantContext = { tenantId: tenant.id, slug: tenant.slug }
    // Sequential on purpose. These jobs send messages through a rate-limited
    // API, and running every workspace at once would spend one business's
    // allowance on another's queue.
    results.push({ tenant: tenant.slug, result: await withTenant(context, () => work(context)) })
  }
  return results
}


/**
 * Whether this person runs the installation rather than a business on it.
 *
 * The test is deliberately structural rather than a flag somebody can set: a
 * platform operator is an active SUPER_ADMIN who is a member of no workspace.
 * Joining one makes you a customer and takes the keys away, which is the
 * correct trade — nobody should be able to look into every other business from
 * inside one of them.
 */
export async function isPlatformOperator(staffId: string | null | undefined): Promise<boolean> {
  if (!staffId) return false
  const staff = await raw.staff.findUnique({
    where: { id: staffId },
    select: { role: true, isActive: true, tenantId: true },
  })
  if (!staff?.isActive || staff.role !== "SUPER_ADMIN" || staff.tenantId !== null) return false
  const membership = await raw.tenantMember.findFirst({ where: { staffId }, select: { id: true } })
  return !membership
}
