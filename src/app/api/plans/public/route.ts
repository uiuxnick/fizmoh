import { NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { MODULE_REGISTRY, effectiveModules } from "@/lib/module-registry"

function resolvePlanLimits(slug: string, existingLimits: any) {
  const s = (slug || "").toLowerCase()
  const baseLimits = typeof existingLimits === "object" && existingLimits !== null ? { ...existingLimits } : {}

  if (!baseLimits.messagesPerMonth) {
    if (s.includes("starter") || s.includes("basic")) baseLimits.messagesPerMonth = 1000
    else if (s.includes("growth") || s.includes("pro") || s.includes("business")) baseLimits.messagesPerMonth = 10000
    else if (s.includes("enterprise") || s.includes("unlimited")) baseLimits.messagesPerMonth = 50000
    else baseLimits.messagesPerMonth = 5000
  }
  if (!baseLimits.numbers) {
    if (s.includes("starter") || s.includes("basic")) baseLimits.numbers = 1
    else if (s.includes("growth") || s.includes("pro") || s.includes("business")) baseLimits.numbers = 3
    else if (s.includes("enterprise")) baseLimits.numbers = 10
    else baseLimits.numbers = 1
  }
  if (!baseLimits.staff) {
    if (s.includes("starter") || s.includes("basic")) baseLimits.staff = 2
    else if (s.includes("growth") || s.includes("pro")) baseLimits.staff = 5
    else if (s.includes("enterprise")) baseLimits.staff = 20
    else baseLimits.staff = 3
  }
  if (!baseLimits.contacts) {
    if (s.includes("starter") || s.includes("basic")) baseLimits.contacts = 2500
    else if (s.includes("growth") || s.includes("pro")) baseLimits.contacts = 15000
    else if (s.includes("enterprise")) baseLimits.contacts = 50000
    else baseLimits.contacts = 5000
  }

  return baseLimits
}

/** Public, read-only catalogue used by the marketing site and sign-up flow. */
export const GET = withErrors(async () => {
  const plans = await raw.plan.findMany({
    where: { isPublic: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, name: true, description: true, priceMonthly: true, priceYearly: true, currency: true, trialDays: true, modules: true, limits: true, sortOrder: true },
  })
  return NextResponse.json({
    plans: plans.map(plan => ({
      ...plan,
      modules: effectiveModules(plan.modules),
      limits: resolvePlanLimits(plan.slug, plan.limits),
    })),
    modules: MODULE_REGISTRY,
  })
})
