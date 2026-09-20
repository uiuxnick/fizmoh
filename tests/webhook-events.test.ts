import { describe, expect, test } from "bun:test"
import { parseWebhookEvent } from "../src/lib/amwalpay"

/**
 * How a gateway notification is classified decides whether an order is
 * confirmed and a voucher issued. A code that is not understood must never
 * fall through to "paid".
 */
describe("parseWebhookEvent", () => {
  test('responseCode "00" is a successful payment', () => {
    const event = parseWebhookEvent({ responseCode: "00", merchantReference: "ORD-1", transactionId: "T1", amount: "68.250" })
    expect(event.eventType).toBe("payment.success")
    expect(event.orderReference).toBe("ORD-1")
    expect(event.transactionId).toBe("T1")
    expect(event.amount).toBe(68.25)
  })

  test("a decline code is a failure, not a success", () => {
    expect(parseWebhookEvent({ responseCode: "05", merchantReference: "ORD-1" }).eventType).toBe("payment.failed")
  })

  test("an unrecognised response code is treated as a failure, never as paid", () => {
    // The regression this guards: an unknown code used to become "unknown" and
    // be silently ignored, leaving the order unconfirmed with no record of why.
    expect(parseWebhookEvent({ responseCode: "99", merchantReference: "ORD-1" }).eventType).toBe("payment.failed")
  })

  test("an empty payload is not a payment", () => {
    expect(parseWebhookEvent({}).eventType).toBe("unknown")
  })

  test("merchantReference is preferred over other reference fields", () => {
    const event = parseWebhookEvent({
      responseCode: "00",
      merchantReference: "ORD-CORRECT",
      billerRefNumber: "ORD-STALE",
    })
    expect(event.orderReference).toBe("ORD-CORRECT")
  })

  test("currencyId 512 resolves to OMR", () => {
    expect(parseWebhookEvent({ responseCode: "00", currencyId: "512" }).currency).toBe("OMR")
    expect(parseWebhookEvent({ responseCode: "00", currencyId: 512 }).currency).toBe("OMR")
  })

  test("a refund notification is classified as a refund", () => {
    expect(parseWebhookEvent({ responseCode: "refunded", merchantReference: "ORD-1" }).eventType).toBe("payment.refunded")
  })
})
