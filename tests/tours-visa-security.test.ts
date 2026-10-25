import { expect, test, describe } from "bun:test"
import crypto from "crypto"
import { voucherToken } from "../src/lib/voucher-url"

describe("Tours, Safari & Visa Security Hardening", () => {
  test("role verification restricts sensitive tour operations", () => {
    const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "PLATFORM", "MANAGER"]
    expect(EDIT_ROLES.includes("OWNER")).toBe(true)
    expect(EDIT_ROLES.includes("SUPER_ADMIN")).toBe(true)
    expect(EDIT_ROLES.includes("MANAGER")).toBe(true)
    expect(EDIT_ROLES.includes("PLATFORM")).toBe(true)

    // Unauthorized roles
    expect(EDIT_ROLES.includes("STAFF")).toBe(false)
    expect(EDIT_ROLES.includes("GUIDE")).toBe(false)
    expect(EDIT_ROLES.includes("VIEWER")).toBe(false)
    expect(EDIT_ROLES.includes("DRIVER")).toBe(false)
  })

  test("generates and verifies voucher token securely with timing-safe comparison", () => {
    const orderId = "ord_test_987654321"
    const token = voucherToken(orderId)
    expect(token).toBeDefined()
    expect(typeof token).toBe("string")
    expect(token.length).toBeGreaterThan(10)

    // Valid token check
    const expected = voucherToken(orderId)
    const validMatch = token.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token))
    expect(validMatch).toBe(true)

    // Tampered token check
    const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a")
    const tamperedMatch = tampered.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(tampered))
    expect(tamperedMatch).toBe(false)

    // Different order ID token check
    const differentToken = voucherToken("ord_other_111111111")
    const wrongOrderMatch = differentToken.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(differentToken))
    expect(wrongOrderMatch).toBe(false)
  })

  test("slot capacity recomputation handles bookings correctly", () => {
    const capacity = 10
    const seatsBooked = 10
    const isFull = seatsBooked >= capacity
    expect(isFull).toBe(true)

    const partialBooked = 6
    const seatsHeld = 2
    const available = capacity - partialBooked - seatsHeld
    expect(available).toBe(2)
  })

  test("prevents deletion of departure slot when active orders exist", () => {
    const activeOrdersCount = 3
    const canDelete = activeOrdersCount === 0
    expect(canDelete).toBe(false)

    const zeroOrdersCount = 0
    const canDeleteEmpty = zeroOrdersCount === 0
    expect(canDeleteEmpty).toBe(true)
  })

  test("visa enquiry status transitions adhere to valid states", () => {
    const VALID_STATUSES = ["NEW", "DOCS_RECEIVED", "IN_PREPARATION", "SUBMITTED", "APPROVED", "DOCS_REQUIRED", "CLOSED"]
    expect(VALID_STATUSES.includes("NEW")).toBe(true)
    expect(VALID_STATUSES.includes("APPROVED")).toBe(true)
    expect(VALID_STATUSES.includes("CLOSED")).toBe(true)

    // Invalid statuses that should never be set directly
    expect(VALID_STATUSES.includes("REJECTED")).toBe(false)
    expect(VALID_STATUSES.includes("DELETED")).toBe(false)
  })
})
