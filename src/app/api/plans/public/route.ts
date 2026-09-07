import { NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { MODULE_REGISTRY, effectiveModules } from "@/lib/module-registry"

/** Public, read-only catalogue used by the marketing site and sign-up flow. */
export const GET = withErrors(async () => {
  const plans = await raw.plan.findMany({
    where: { isPublic: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, name: true, description: true, priceMonthly: true, priceYearly: true, currency: true, trialDays: true, modules: true, limits: true, sortOrder: true },
  })
  return NextResponse.json({
    plans: plans.map(plan => ({ ...plan, modules: effectiveModules(plan.modules) })),
    modules: MODULE_REGISTRY,
  })
})
