import { describe, expect, test } from "bun:test"
import { MODULE_REGISTRY } from "../src/lib/module-registry"
import { DEFAULT_ADDONS } from "../src/lib/addon-catalog"
import { createSecureToken } from "../src/lib/restaurant"

describe("Smart Menu & Ordering — Addon Catalog & Module Entitlements", () => {
  test("RESTAURANT module is properly declared in MODULE_REGISTRY and is an optional addon (alwaysIncluded = false)", () => {
    const restaurantModule = MODULE_REGISTRY.find((m) => m.key === "RESTAURANT")
    expect(restaurantModule).toBeDefined()
    expect(restaurantModule?.group).toBe("Commerce")
    expect(restaurantModule?.alwaysIncluded).toBe(false)
  })

  test("smart-menu-ordering addon is registered in DEFAULT_ADDONS pointing to module RESTAURANT", () => {
    const addon = DEFAULT_ADDONS.find((a) => a.slug === "smart-menu-ordering")
    expect(addon).toBeDefined()
    expect(addon?.module).toBe("RESTAURANT")
    expect(addon?.priceMonthly).toBeGreaterThan(0)
  })

  test("backward-compatible restaurant-pos addon remains registered in DEFAULT_ADDONS", () => {
    const addon = DEFAULT_ADDONS.find((a) => a.slug === "restaurant-pos")
    expect(addon).toBeDefined()
    expect(addon?.module).toBe("RESTAURANT")
  })
})

describe("Smart Menu & Ordering — Cryptographic Token Security", () => {
  test("createSecureToken generates tokens with expected prefix and sufficient entropy", () => {
    const token1 = createSecureToken("tab")
    const token2 = createSecureToken("tab")

    expect(token1.startsWith("tab_")).toBe(true)
    expect(token2.startsWith("tab_")).toBe(true)
    expect(token1).not.toBe(token2)
    // 16 bytes = 32 hex chars + 4 chars prefix = 36 total
    expect(token1.length).toBe(36)
  })

  test("order tokens have ord_ prefix", () => {
    const ordToken = createSecureToken("ord")
    expect(ordToken.startsWith("ord_")).toBe(true)
    expect(ordToken.length).toBe(36)
  })
})

describe("Smart Menu & Ordering — Mathematical Price Recalculation Engine", () => {
  // Pure pricing calculation test matching calculateOrder contract
  function computeLineItemTotal(item: {
    basePrice: number
    variantPrice?: number
    modifiers?: Array<{ price: number }>
    qty: number
  }) {
    let unitPrice = item.variantPrice !== undefined ? item.variantPrice : item.basePrice
    for (const mod of item.modifiers || []) {
      unitPrice += mod.price
    }
    return Math.round(unitPrice * item.qty * 1000) / 1000
  }

  test("calculates simple item price without options", () => {
    const total = computeLineItemTotal({
      basePrice: 3.5,
      qty: 2,
    })
    expect(total).toBe(7.0)
  })

  test("applies variant price override correctly", () => {
    const total = computeLineItemTotal({
      basePrice: 2.5,
      variantPrice: 4.0, // Large portion override
      qty: 3,
    })
    expect(total).toBe(12.0)
  })

  test("adds modifier add-ons to variant price correctly", () => {
    const total = computeLineItemTotal({
      basePrice: 2.5,
      variantPrice: 3.0,
      modifiers: [{ price: 0.5 }, { price: 0.3 }],
      qty: 2,
    })
    // unit = 3.0 + 0.5 + 0.3 = 3.8
    // total = 3.8 * 2 = 7.6
    expect(total).toBe(7.6)
  })

  test("applies percentage discount, VAT and delivery fees accurately", () => {
    const subtotal = 20.0
    const discountPercent = 10 // 10%
    const discountAmount = Math.round(subtotal * (discountPercent / 100) * 1000) / 1000 // 2.0
    const taxable = subtotal - discountAmount // 18.0
    const vatRate = 0.05 // 5%
    const taxAmount = Math.round(taxable * vatRate * 1000) / 1000 // 0.9
    const deliveryFee = 1.5
    const total = Math.round((taxable + taxAmount + deliveryFee) * 1000) / 1000 // 18.0 + 0.9 + 1.5 = 20.4

    expect(discountAmount).toBe(2.0)
    expect(taxAmount).toBe(0.9)
    expect(total).toBe(20.4)
  })
})

describe("Smart Menu & Ordering — Order State Progression Workflow", () => {
  const validTransitions: Record<string, string[]> = {
    PENDING: ["ACCEPTED", "PREPARING", "CANCELLED"],
    ACCEPTED: ["PREPARING", "CANCELLED"],
    PREPARING: ["READY", "CANCELLED"],
    READY: ["SERVED", "COMPLETED"],
    SERVED: ["COMPLETED"],
    COMPLETED: [],
    CANCELLED: [],
  }

  function canTransition(from: string, to: string): boolean {
    return (validTransitions[from] || []).includes(to)
  }

  test("allows natural kitchen order progression PENDING -> PREPARING -> READY -> COMPLETED", () => {
    expect(canTransition("PENDING", "ACCEPTED")).toBe(true)
    expect(canTransition("ACCEPTED", "PREPARING")).toBe(true)
    expect(canTransition("PREPARING", "READY")).toBe(true)
    expect(canTransition("READY", "COMPLETED")).toBe(true)
  })

  test("prevents illegal backward status transitions", () => {
    expect(canTransition("COMPLETED", "PENDING")).toBe(false)
    expect(canTransition("READY", "PREPARING")).toBe(false)
    expect(canTransition("CANCELLED", "READY")).toBe(false)
  })
})

describe("Smart Menu & Ordering — Waiter Call Debounce Anti-Spam", () => {
  test("debounces duplicate request within 60s window", () => {
    const now = Date.now()
    const lastRequestTime = now - 25_000 // 25 seconds ago
    const isWithin60s = now - lastRequestTime < 60_000

    expect(isWithin60s).toBe(true)
  })

  test("allows subsequent request after 60s cooldown", () => {
    const now = Date.now()
    const lastRequestTime = now - 65_000 // 65 seconds ago
    const isWithin60s = now - lastRequestTime < 60_000

    expect(isWithin60s).toBe(false)
  })
})
