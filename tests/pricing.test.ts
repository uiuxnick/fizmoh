import { describe, expect, test } from "bun:test"
import { calculateOrderPrice } from "../src/lib/helpers"

/**
 * The booking total is what the customer is charged and what the gateway hash
 * is built from. A silent change here is a silent overcharge.
 */
describe("calculateOrderPrice", () => {
  test("adults, children and add-ons all reach the subtotal", () => {
    const { subtotal } = calculateOrderPrice(25, 10, 2, 3, 15, 0)
    // 25*2 + 10*3 + 15
    expect(subtotal).toBe(95)
  })

  test("VAT applies after the discount, not before", () => {
    const { taxAmount, total } = calculateOrderPrice(100, 0, 1, 0, 0, 20, 0.05)
    // Charging VAT on the pre-discount amount would give 5.00 and 85.00.
    expect(taxAmount).toBeCloseTo(4, 10)
    expect(total).toBeCloseTo(84, 10)
  })

  test("a discount larger than the subtotal cannot produce a negative total", () => {
    const { total, taxAmount } = calculateOrderPrice(30, 0, 1, 0, 0, 500)
    expect(total).toBe(0)
    expect(taxAmount).toBe(0)
  })

  test("children priced at zero cost nothing", () => {
    const { subtotal } = calculateOrderPrice(40, 0, 1, 4, 0, 0)
    expect(subtotal).toBe(40)
  })

  test("the default VAT rate is 5 percent", () => {
    const { total } = calculateOrderPrice(100, 0, 1, 0, 0, 0)
    expect(total).toBeCloseTo(105, 10)
  })

  test("a real Musandam booking matches the amount charged in production", () => {
    // ORD-20260808-8914DA27: 2 adults at 32.500, no children, no add-ons.
    const { total } = calculateOrderPrice(32.5, 0, 2, 0, 0, 0)
    expect(Number(total.toFixed(3))).toBe(68.25)
  })
})
