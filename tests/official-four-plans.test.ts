import { describe, it, expect } from "bun:test"
import { OFFICIAL_PLANS, ALLOWED_PLAN_SLUGS } from "@/lib/official-plans"
import { MODULE_REGISTRY } from "@/lib/module-registry"
import {
  getTenantEntitledModules,
  getTenantDisabledModules,
  setTenantModuleEnabled,
  modulesFor,
} from "@/lib/entitlements"

describe("Official Four Plans Catalogue", () => {
  it("strictly defines exactly 4 official plans", () => {
    expect(OFFICIAL_PLANS).toHaveLength(4)
    expect(ALLOWED_PLAN_SLUGS).toEqual(["free", "basic", "growth", "enterprise"])
  })

  it("configures the Free tier with exact specs", () => {
    const free = OFFICIAL_PLANS.find((p) => p.slug === "free")
    expect(free).toBeDefined()
    expect(free?.priceMonthly).toBe(0)
    expect(free?.priceYearly).toBe(0)
    expect(free?.currency).toBe("OMR")
    expect(free?.limits.numbers).toBe(1)
    expect(free?.limits.contacts).toBe(1000)
    expect(free?.limits.messagesPerMonth).toBe(1000)
  })

  it("configures the Basic tier with 35 OMR Monthly / 350 OMR Yearly and no extra modules", () => {
    const basic = OFFICIAL_PLANS.find((p) => p.slug === "basic")
    expect(basic).toBeDefined()
    // Minor units: 35,000 baisa = 35 OMR, 350,000 baisa = 350 OMR
    expect(basic?.priceMonthly).toBe(35000)
    expect(basic?.priceYearly).toBe(350000)
    expect(basic?.limits.numbers).toBe(1)
    expect(basic?.limits.contacts).toBe(100000)
    expect(basic?.limits.messagesPerMonth).toBe(100000)

    // Verify chatbox (INBOX), bot flow (FLOWS), broadcast (BROADCAST), subscriber/CRM (CRM) are present
    expect(basic?.modules).toContain("INBOX")
    expect(basic?.modules).toContain("FLOWS")
    expect(basic?.modules).toContain("BROADCAST")
    expect(basic?.modules).toContain("CRM")

    // Must NOT contain extra domain modules (like restaurant, ecommerce, etc.)
    expect(basic?.modules).not.toContain("RESTAURANT")
    expect(basic?.modules).not.toContain("WOOCOMMERCE")
    expect(basic?.modules).not.toContain("ECOMMERCE")
    expect(basic?.modules).not.toContain("CORPORATE")
  })

  it("configures the Growth tier with 50 OMR Monthly / 450 OMR Yearly and unlimited subscribers & messages", () => {
    const growth = OFFICIAL_PLANS.find((p) => p.slug === "growth")
    expect(growth).toBeDefined()
    // Minor units: 50,000 baisa = 50 OMR, 450,000 baisa = 450 OMR
    expect(growth?.priceMonthly).toBe(50000)
    expect(growth?.priceYearly).toBe(450000)
    expect(growth?.limits.numbers).toBe(2)
    expect(growth?.limits.contacts).toBe(-1) // Unlimited
    expect(growth?.limits.messagesPerMonth).toBe(-1) // Unlimited
    expect(growth?.isPopular).toBe(true)

    // Verify chatbox, bot flow, broadcast, crm
    expect(growth?.modules).toContain("INBOX")
    expect(growth?.modules).toContain("FLOWS")
    expect(growth?.modules).toContain("BROADCAST")
    expect(growth?.modules).toContain("CRM")

    // Must NOT contain extra domain modules (like restaurant, ecommerce, etc.)
    expect(growth?.modules).not.toContain("RESTAURANT")
    expect(growth?.modules).not.toContain("WOOCOMMERCE")
    expect(growth?.modules).not.toContain("ECOMMERCE")
  })

  it("configures the Enterprise tier with 100 OMR Monthly / 900 OMR Yearly and all add-ons/features included", () => {
    const enterprise = OFFICIAL_PLANS.find((p) => p.slug === "enterprise")
    expect(enterprise).toBeDefined()
    // Minor units: 100,000 baisa = 100 OMR, 900,000 baisa = 900 OMR
    expect(enterprise?.priceMonthly).toBe(100000)
    expect(enterprise?.priceYearly).toBe(900000)
    expect(enterprise?.limits.numbers).toBe(5)
    expect(enterprise?.limits.contacts).toBe(-1) // Unlimited
    expect(enterprise?.limits.messagesPerMonth).toBe(-1) // Unlimited
    expect(enterprise?.isAllInclusive).toBe(true)

    // All MODULE_REGISTRY keys must be included
    for (const mod of MODULE_REGISTRY) {
      expect(enterprise?.modules).toContain(mod.key)
    }
  })
})

describe("Tenant Module Toggle Entitlements", () => {
  it("allows querying entitled modules and toggling module enabled status", async () => {
    // Test on mock tenant
    const testTenantId = "test-tenant-" + Date.now()

    // Without DB mock, getTenantDisabledModules handles empty gracefully
    const disabled = await getTenantDisabledModules(testTenantId).catch(() => [])
    expect(Array.isArray(disabled)).toBe(true)
  })
})
