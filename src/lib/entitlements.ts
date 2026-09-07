import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { effectiveModules, type Module } from "@/lib/module-registry"
export type { Module } from "@/lib/module-registry"

/**
 * What a plan buys.
 *
 * A module is a whole section of the product — the tour catalogue, visa
 * enquiries, broadcasts — not a feature flag. Plans list the ones they
 * include, and a route that belongs to a module refuses to run for a workspace
 * whose plan does not.
 *
 * The check lives on the route rather than only in the sidebar. Hiding a menu
 * item stops nobody: the endpoint is still one fetch away, and an API that
 * trusts its own navigation is not access control.
 */

export type Limit = "staff" | "contacts" | "messagesPerMonth" | "numbers" | "qrCampaigns" | "qrScansPerMonth"

type JsonRecord = Record<string, unknown>

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
}

function numericLimits(value: unknown): Partial<Record<Limit, number>> {
  const source = record(value)
  const result: Partial<Record<Limit, number>> = {}
  for (const key of ["staff", "contacts", "messagesPerMonth", "numbers", "qrCampaigns", "qrScansPerMonth"] as Limit[]) {
    const n = Number(source[key])
    if (Number.isFinite(n) && n > 0) result[key] = Math.round(n)
  }
  return result
}

/** Active add-ons are additive: removing a base plan module never removes a
 * separately purchased capability. Quantities apply to metered add-ons. */
export async function activeAddonsFor(tenantId: string) {
  return db.tenantAddon.findMany({
    where: { tenantId, status: { in: ["ACTIVE", "PAST_DUE"] } },
    include: { addon: true },
    orderBy: { createdAt: "asc" },
  })
}

/** What a plan allows, or null where it sets no ceiling. */
export async function limitsFor(tenantId: string): Promise<Partial<Record<Limit, number>>> {
  const subscription = await db.subscription.findFirst({
    where: { tenantId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  })
  const base = numericLimits(subscription?.limitSnapshot ?? subscription?.plan.limits)
  const addons = await activeAddonsFor(tenantId)
  for (const assignment of addons) {
    const multiplier = Math.max(1, assignment.quantity)
    const addonLimits = numericLimits(assignment.addon.limits)
    for (const key of Object.keys(addonLimits) as Limit[]) {
      base[key] = (base[key] ?? 0) + (addonLimits[key] ?? 0) * multiplier
    }
  }
  return base
}

/**
 * Whether one more of something is allowed.
 *
 * Counts what exists rather than trusting a running total. A counter that
 * drifts — a failed delete, a restored backup, a bug — either lets somebody
 * past their plan forever or locks them out of a plan they are paying for, and
 * both are worse than the query.
 *
 * A limit that is not set is not a limit. An unknown plan gets no ceiling
 * rather than a ceiling of zero: failing open here means somebody uses more
 * than they bought, failing closed means a paying customer cannot add a member
 * of staff because a plan row is missing.
 */
export async function withinLimit(limit: Limit): Promise<{ ok: boolean; used?: number; cap?: number }> {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return { ok: true }
  // A platform operator may inspect a tenant's complete workspace while
  // impersonating it. This bypasses plan enforcement for visibility only;
  // data remains scoped to the tenant and every access is audit-recorded.
  if (tenant.role === "PLATFORM") return { ok: true }

  const cap = (await limitsFor(tenant.tenantId))[limit]
  if (!cap || cap <= 0) return { ok: true }

  const used = await countFor(limit, tenant.tenantId)
  return { ok: used < cap, used, cap }
}

async function countFor(limit: Limit, tenantId: string): Promise<number> {
  switch (limit) {
    case "staff":
      return db.tenantMember.count({ where: { tenantId } })
    case "contacts":
      return db.customer.count({ where: { tenantId } })
    case "numbers":
      return db.whatsAppAccount.count({ where: { tenantId } })
    case "messagesPerMonth": {
      const start = new Date()
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      return db.message.count({
        where: { tenantId, direction: "OUTBOUND", createdAt: { gte: start } },
      })
    }
    case "qrCampaigns":
      return db.qrCampaign.count({ where: { tenantId } })
    case "qrScansPerMonth": {
      const start = new Date()
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      return db.qrScan.count({ where: { tenantId, scannedAt: { gte: start } } })
    }
  }
}

/** The refusal a caller gets when a plan's ceiling is reached. */
export function limitReached(limit: Limit, used?: number, cap?: number): Response {
  const what: Record<Limit, string> = {
    staff: "people",
    contacts: "contacts",
    messagesPerMonth: "messages this month",
    numbers: "WhatsApp numbers",
    qrCampaigns: "QR campaigns",
    qrScansPerMonth: "QR scans this month",
  }
  return NextResponse.json(
    {
      error: `Your plan allows ${cap} ${what[limit]}${used !== undefined ? ` and you have ${used}` : ""}. Upgrade to add more.`,
      limit,
      used,
      cap,
      upgrade: true,
    },
    { status: 402 },
  )
}

/** Everything included in the plan a workspace is currently on. */
export async function modulesFor(tenantId: string): Promise<Module[]> {
  const subscription = await db.subscription.findFirst({
    where: { tenantId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE", "PENDING_PAYMENT"] } },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  })
  let rawModules = subscription?.moduleSnapshot ?? subscription?.plan.modules
  if (!rawModules || !Array.isArray(rawModules) || rawModules.length === 0) {
    const defaultPlan = await db.plan.findFirst({ where: { slug: "growth" } })
      ?? await db.plan.findFirst({ orderBy: { createdAt: "asc" } })
    rawModules = defaultPlan?.modules ?? []
  }
  const modules = effectiveModules(rawModules)
  const addons = await activeAddonsFor(tenantId)
  for (const assignment of addons) {
    const moduleKey = assignment.addon.module as Module | null
    if (moduleKey && !modules.includes(moduleKey)) modules.push(moduleKey)
  }
  return modules
}

export async function addonFor(tenantId: string, slug: string) {
  const assignment = await db.tenantAddon.findFirst({
    where: { tenantId, status: { in: ["ACTIVE", "PAST_DUE"] }, addon: { slug } },
    include: { addon: true },
  })
  return assignment
}

export async function hasAddon(tenantId: string, slug: string): Promise<boolean> {
  return !!(await addonFor(tenantId, slug))
}

/**
 * The modules available to whoever is asking.
 *
 * Outside a workspace — the customer-facing site, a cron run, this
 * installation before it had tenants — everything is available. There is no
 * subscription to consult and no second business to protect, and returning
 * nothing would take the product away from the people already using it.
 */
export async function currentModules(): Promise<Module[] | null> {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return null
  if (tenant.role === "PLATFORM") return null
  return modulesFor(tenant.tenantId)
}

/** Whether the caller's plan includes a module. Unscoped callers get true. */
export async function hasModule(module: Module): Promise<boolean> {
  const modules = await currentModules()
  return modules === null || modules.includes(module)
}

type Handler<C> = (request: NextRequest, context: C) => Promise<Response> | Response

/**
 * Wraps a route so it only runs for a plan that includes the module.
 *
 * The refusal is a 402 rather than a 403: nothing is wrong with the request or
 * the person making it, the workspace simply has not bought this part of the
 * product. The distinction matters to the client, which should offer an
 * upgrade rather than an error.
 */
export function withModule<C>(module: Module, handler: Handler<C>): Handler<C> {
  return async (request: NextRequest, context: C) => {
    const suspended = await suspensionOf(request)
    if (suspended) return suspended
    if (await hasModule(module)) return handler(request, context)
    return NextResponse.json(
      {
        error: `Your plan does not include ${title(module)}.`,
        module,
        upgrade: true,
      },
      { status: 402 },
    )
  }
}

function title(module: Module): string {
  return module.toLowerCase().replace(/_/g, " ")
}


/**
 * A suspended workspace, if this request would change anything.
 *
 * Suspension is read-only, not shut off. A business behind on a payment can
 * still open its inbox, read its customers and export what it owns — it simply
 * cannot add more. Cutting off access to a customer list somebody spent two
 * years building, over a card that expired, is not a payment reminder; it is
 * hostage-taking, and it makes the reinstatement no easier to collect.
 */
async function suspensionOf(request: NextRequest): Promise<Response | null> {
  if (request.method === "GET" || request.method === "HEAD") return null
  const tenant = currentTenant()
  if (!tenant?.tenantId) return null

  const row = await db.tenant.findUnique({
    where: { id: tenant.tenantId },
    select: { status: true, suspendedReason: true },
  })
  if (row?.status !== "SUSPENDED") return null

  return NextResponse.json(
    {
      error: row.suspendedReason || "This workspace is suspended.",
      suspended: true,
      upgrade: true,
    },
    { status: 402 },
  )
}
