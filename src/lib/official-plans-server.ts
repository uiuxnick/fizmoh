import { raw } from "@/lib/db"
import { OFFICIAL_PLANS, ALLOWED_PLAN_SLUGS } from "@/lib/official-plans"

/**
 * Ensures the database contains exactly the 4 official plans, retires legacy plans,
 * and maintains accurate pricing and limits. Server-only.
 */
export async function ensureOfficialFourPlans(prismaClient?: any) {
  const db = prismaClient || raw
  if (!db?.plan) return

  try {
    // 1. Mark all older/deprecated plans as non-public so they disappear from public/tenant views
    await db.plan.updateMany({
      where: {
        slug: { notIn: [...ALLOWED_PLAN_SLUGS] },
        isPublic: true,
      },
      data: { isPublic: false },
    }).catch(() => {})

    // 2. Upsert each of the 4 official plans with exact specifications
    for (const planDef of OFFICIAL_PLANS) {
      await db.plan.upsert({
        where: { slug: planDef.slug },
        create: {
          slug: planDef.slug,
          name: planDef.name,
          description: planDef.description,
          priceMonthly: planDef.priceMonthly,
          priceYearly: planDef.priceYearly,
          currency: planDef.currency,
          trialDays: planDef.trialDays,
          limits: planDef.limits,
          modules: planDef.modules,
          sortOrder: planDef.sortOrder,
          isPublic: planDef.isPublic,
        },
        update: {
          name: planDef.name,
          description: planDef.description,
          priceMonthly: planDef.priceMonthly,
          priceYearly: planDef.priceYearly,
          currency: planDef.currency,
          trialDays: planDef.trialDays,
          limits: planDef.limits,
          modules: planDef.modules,
          sortOrder: planDef.sortOrder,
          isPublic: planDef.isPublic,
        },
      })
    }
  } catch (error) {
    console.error("[plans] Failed to sync official 4 plans:", error)
  }
}
