import { raw } from "@/lib/db"
import { MODULE_REGISTRY, effectiveModules } from "@/lib/module-registry"
import { OFFICIAL_PLANS, ALLOWED_PLAN_SLUGS } from "@/lib/official-plans"
import { ensureOfficialFourPlans } from "@/lib/official-plans-server"

function resolvePlanLimits(slug: string, existingLimits: any) {
  const s = (slug || "").toLowerCase().trim()
  const matched = OFFICIAL_PLANS.find(p => p.slug === s)
  if (matched) {
    return { ...matched.limits, ...(typeof existingLimits === "object" && existingLimits !== null ? existingLimits : {}) }
  }

  const baseLimits = typeof existingLimits === "object" && existingLimits !== null ? { ...existingLimits } : {}
  if (!baseLimits.messagesPerMonth) {
    if (s.includes("free") || s.includes("starter")) baseLimits.messagesPerMonth = 1000
    else if (s.includes("basic")) baseLimits.messagesPerMonth = 100000
    else if (s.includes("growth") || s.includes("enterprise")) baseLimits.messagesPerMonth = -1
    else baseLimits.messagesPerMonth = 100000
  }
  if (!baseLimits.numbers) {
    if (s.includes("free") || s.includes("basic")) baseLimits.numbers = 1
    else if (s.includes("growth")) baseLimits.numbers = 2
    else if (s.includes("enterprise")) baseLimits.numbers = 5
    else baseLimits.numbers = 1
  }
  if (!baseLimits.contacts) {
    if (s.includes("free")) baseLimits.contacts = 1000
    else if (s.includes("basic")) baseLimits.contacts = 100000
    else if (s.includes("growth") || s.includes("enterprise")) baseLimits.contacts = -1
    else baseLimits.contacts = 100000
  }
  if (!baseLimits.staff) {
    if (s.includes("free")) baseLimits.staff = 1
    else if (s.includes("basic")) baseLimits.staff = 3
    else if (s.includes("growth")) baseLimits.staff = 10
    else if (s.includes("enterprise")) baseLimits.staff = -1
    else baseLimits.staff = 3
  }
  return baseLimits
}

/** Public catalogue shared by the API and server-rendered pricing page. */
export async function getPublicPlanCatalogue() {
  if (typeof raw?.plan?.count === "function") {
    await ensureOfficialFourPlans().catch(err => console.error("[plans] sync failed:", err))
  }

  if (typeof raw?.planAddon?.count === "function") {
    const { DEFAULT_ADDONS, ensureDefaultAddons } = await import("@/lib/addon-catalog")
    const currentCount = await raw.planAddon.count().catch(() => 0)
    if (currentCount < DEFAULT_ADDONS.length) {
      await ensureDefaultAddons().catch(err => console.error("[addons] sync failed:", err))
    }
  }

  const [plans, addons] = await Promise.all([
    raw.plan.findMany({
      where: {
        isPublic: true,
        slug: { in: [...ALLOWED_PLAN_SLUGS] },
      },
      orderBy: { sortOrder: "asc" },
      select: { id: true, slug: true, name: true, description: true, priceMonthly: true, priceYearly: true, currency: true, trialDays: true, modules: true, limits: true, sortOrder: true },
    }),
    raw?.planAddon?.findMany
      ? raw.planAddon.findMany({
          where: { isPublic: true },
          orderBy: { sortOrder: "asc" },
          select: { id: true, slug: true, name: true, description: true, module: true, priceMonthly: true, priceYearly: true, currency: true, limits: true, sortOrder: true },
        }).catch(() => [])
      : Promise.resolve([]),
  ])

  // Fallback to in-memory OFFICIAL_PLANS if database has no rows yet
  const effectivePlanList = plans.length > 0 ? plans : OFFICIAL_PLANS.map((p, idx) => ({
    id: `plan_${p.slug}`,
    slug: p.slug,
    name: p.name,
    description: p.description,
    priceMonthly: p.priceMonthly,
    priceYearly: p.priceYearly,
    currency: p.currency,
    trialDays: p.trialDays,
    modules: p.modules,
    limits: p.limits,
    sortOrder: p.sortOrder ?? idx,
  }))

  return {
    plans: effectivePlanList.map(plan => {
      const officialMeta = OFFICIAL_PLANS.find(p => p.slug === plan.slug)
      return {
        ...plan,
        nameAr: officialMeta?.nameAr || plan.name,
        descriptionAr: officialMeta?.descriptionAr || plan.description,
        featuresEn: officialMeta?.featuresEn || [],
        featuresAr: officialMeta?.featuresAr || [],
        badge: officialMeta?.badge,
        badgeAr: officialMeta?.badgeAr,
        isPopular: officialMeta?.isPopular ?? false,
        isAllInclusive: officialMeta?.isAllInclusive ?? false,
        modules: effectiveModules(plan.modules),
        limits: resolvePlanLimits(plan.slug, plan.limits),
      }
    }),
    addons: addons || [],
    modules: MODULE_REGISTRY,
  }
}

