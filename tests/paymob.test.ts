import { describe, expect, test } from "bun:test"
import crypto from "crypto"
import {
  toMinorUnits,
  fromMinorUnits,
  getPaymobBaseUrl,
  calculatePaymobTransactionHmac,
  verifyPaymobWebhookHmac,
  verifyPaymobQueryHmac,
  parsePaymobWebhook,
  PAYMOB_TRANSACTION_HMAC_KEYS,
} from "../src/lib/paymob"

const TEST_HMAC_SECRET = "TEST_SECRET_KEY_9A8B7C6D5E4F3A2B1C0D"

describe("Paymob Currency Unit Converters", () => {
  test("calculates 3 decimals for OMR, KWD, BHD", () => {
    expect(toMinorUnits(1.5, "OMR")).toBe(1500)
    expect(toMinorUnits(0.25, "OMR")).toBe(250)
    expect(toMinorUnits(12.345, "KWD")).toBe(12345)
    expect(fromMinorUnits(1500, "OMR")).toBe(1.5)
    expect(fromMinorUnits(250, "OMR")).toBe(0.25)
  })

  test("calculates 2 decimals for EGP, SAR, AED, USD", () => {
    expect(toMinorUnits(100, "EGP")).toBe(10000)
    expect(toMinorUnits(99.95, "SAR")).toBe(9995)
    expect(toMinorUnits(50.5, "AED")).toBe(5050)
    expect(toMinorUnits(10.25, "USD")).toBe(1025)
    expect(fromMinorUnits(10000, "EGP")).toBe(100)
    expect(fromMinorUnits(9995, "SAR")).toBe(99.95)
  })
})

describe("Paymob Base URL Resolution", () => {
  test("resolves regional URLs accurately", () => {
    expect(getPaymobBaseUrl("oman")).toBe("https://oman.paymob.com")
    expect(getPaymobBaseUrl("egypt")).toBe("https://accept.paymob.com")
    expect(getPaymobBaseUrl("ksa")).toBe("https://ksa.paymob.com")
    expect(getPaymobBaseUrl("uae")).toBe("https://uae.paymob.com")
    expect(getPaymobBaseUrl("unknown")).toBe("https://oman.paymob.com")
  })
})

describe("Paymob Webhook HMAC SHA-512 Verification", () => {
  const sampleTransaction = {
    amount_cents: 15000,
    created_at: "2026-09-07T00:00:00.000Z",
    currency: "OMR",
    error_occured: false,
    has_parent_transaction: false,
    id: 987654321,
    integration_id: 488091,
    is_3d_secure: true,
    is_auth: false,
    is_capture: false,
    is_refunded: false,
    is_standalone_payment: true,
    is_voided: false,
    order: {
      id: 11223344,
      merchant_order_id: "ORD-20260907-TEST",
      special_reference: "ORD-20260907-TEST",
    },
    owner: 12345,
    pending: false,
    source_data: {
      pan: "2346",
      sub_type: "MasterCard",
      type: "card",
    },
    success: true,
    special_reference: "ORD-20260907-TEST",
  }

  test("calculates deterministic SHA-512 HMAC", () => {
    const hmac = calculatePaymobTransactionHmac(sampleTransaction, TEST_HMAC_SECRET)
    expect(typeof hmac).toBe("string")
    expect(hmac.length).toBe(128) // SHA-512 hex is 128 characters
  })

  test("accepts valid webhook HMAC signature", () => {
    const validHmac = calculatePaymobTransactionHmac(sampleTransaction, TEST_HMAC_SECRET)
    const payload = { obj: sampleTransaction }

    const isVerified = verifyPaymobWebhookHmac(payload, validHmac, TEST_HMAC_SECRET)
    expect(isVerified).toBe(true)
  })

  test("rejects tampered amount or transaction fields", () => {
    const validHmac = calculatePaymobTransactionHmac(sampleTransaction, TEST_HMAC_SECRET)
    const tamperedPayload = {
      obj: {
        ...sampleTransaction,
        amount_cents: 100, // Attacker attempted to alter the paid amount
      },
    }

    const isVerified = verifyPaymobWebhookHmac(tamperedPayload, validHmac, TEST_HMAC_SECRET)
    expect(isVerified).toBe(false)
  })

  test("rejects incorrect secret", () => {
    const validHmac = calculatePaymobTransactionHmac(sampleTransaction, TEST_HMAC_SECRET)
    const payload = { obj: sampleTransaction }

    const isVerified = verifyPaymobWebhookHmac(payload, validHmac, "WRONG_SECRET_KEY")
    expect(isVerified).toBe(false)
  })
})

describe("Paymob Query HMAC Verification", () => {
  test("verifies redirect query parameters", () => {
    const params: Record<string, string> = {
      id: "987654321",
      amount_cents: "15000",
      currency: "OMR",
      success: "true",
      special_reference: "ORD-20260907-TEST",
    }

    // Sort alphabetically and calculate expected HMAC
    const sorted = Object.keys(params).sort().map(k => params[k]).join("")
    const hmac = crypto.createHmac("sha512", TEST_HMAC_SECRET).update(sorted, "utf8").digest("hex").toLowerCase()

    const fullParams = { ...params, hmac }
    expect(verifyPaymobQueryHmac(fullParams, TEST_HMAC_SECRET)).toBe(true)

    // Tampered param
    const tampered = { ...fullParams, success: "false" }
    expect(verifyPaymobQueryHmac(tampered, TEST_HMAC_SECRET)).toBe(false)
  })
})

describe("Paymob Webhook Parser", () => {
  test("correctly parses successful transaction", () => {
    const payload = {
      obj: {
        id: 987654321,
        success: true,
        is_refunded: false,
        error_occured: false,
        amount_cents: 15000,
        currency: "OMR",
        special_reference: "ORD-9999",
      },
    }

    const parsed = parsePaymobWebhook(payload)
    expect(parsed.eventType).toBe("payment.success")
    expect(parsed.success).toBe(true)
    expect(parsed.orderReference).toBe("ORD-9999")
    expect(parsed.amount).toBe(15) // 15000 baisa = 15 OMR
    expect(parsed.currency).toBe("OMR")
  })

  test("correctly flags refunded transaction", () => {
    const payload = {
      obj: {
        id: 987654321,
        success: true,
        is_refunded: true,
        amount_cents: 5000,
        currency: "OMR",
        special_reference: "ORD-9999",
      },
    }

    const parsed = parsePaymobWebhook(payload)
    expect(parsed.eventType).toBe("payment.refunded")
    expect(parsed.success).toBe(false)
  })
})
