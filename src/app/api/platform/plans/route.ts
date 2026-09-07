import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { requirePlatformAdmin } from "../tenants/route"
import { MODULE_KEYS, MODULE_REGISTRY, normalizeModules } from "@/lib/module-registry"

/**
 * The plans on sale, and what each one includes.
 *
 * Only the platform operator writes here. A plan decides what a customer may
 * use and what they are charged for it, so a customer editing one is a
 * customer setting their own price.
 */

/** Every module a plan can include. Kept in one place so the UI cannot invent one. */
export const MODULES = MODULE_KEYS

export const GET = withErrors(async (request: NextRequest) => {
  if (!(await requirePlatformAdmin(request))) {
    return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 })
  }
  const [plans, addons] = await Promise.all([raw.plan.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { subscriptions: true } } },
  }), raw.planAddon.findMany({ orderBy: { sortOrder: "asc" } })])
  return NextResponse.json({ plans, addons, modules: MODULE_REGISTRY })
})

export const POST = withErrors(async (request: NextRequest) => {
  const admin = await requirePlatformAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const name = String(body?.name ?? "").trim()
  if (!name) return NextResponse.json({ error: "A plan needs a name" }, { status: 400 })

  const slug = String(body?.slug ?? name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  const existing = await raw.plan.findUnique({ where: { slug } })
  if (existing) return NextResponse.json({ error: "A plan with that address already exists" }, { status: 409 })

  const plan = await raw.plan.create({
    data: {
      slug,
      name,
      description: body?.description ? String(body.description).slice(0, 300) : null,
      // Minor units throughout, so nobody stores 9.99 as a float and loses a baisa.
      priceMonthly: Math.max(0, Math.round(Number(body?.priceMonthly) || 0)),
      priceYearly: Math.max(0, Math.round(Number(body?.priceYearly) || 0)),
      currency: String(body?.currency ?? "OMR").toUpperCase().slice(0, 3),
      trialDays: Math.min(Math.max(Number(body?.trialDays) ?? 14, 0), 365),
      modules: cleanModules(body?.modules),
      limits: cleanLimits(body?.limits),
      isPublic: body?.isPublic !== false,
      sortOrder: Number(body?.sortOrder) || 0,
    },
  })

  await raw.platformAuditEvent.create({
    data: {
      tenantId: null,
      actorStaffId: admin.id,
      action: "CREATE_PLAN",
      entity: "PLAN",
      entityId: plan.id,
      after: { name: plan.name, slug: plan.slug, priceMonthly: plan.priceMonthly } as any,
      reason: `Created subscription plan ${plan.name}`,
    },
  }).catch(() => {})

  return NextResponse.json({ plan }, { status: 201 })
})

/** Only modules this build knows about. An unknown one would silently do nothing. */
export function cleanModules(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return normalizeModules(value)
}

/** Ceilings, as whole numbers. Zero and absent both mean no ceiling. */
export function cleanLimits(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const out: Record<string, number> = {}
  for (const key of ["staff", "contacts", "messagesPerMonth", "numbers"]) {
    const raw = (value as Record<string, unknown>)[key]
    const number = Math.round(Number(raw))
    if (Number.isFinite(number) && number > 0) out[key] = number
  }
  return out
}
