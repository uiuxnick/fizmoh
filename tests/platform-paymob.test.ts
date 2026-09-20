import { describe, expect, test } from "bun:test"
import crypto from "crypto"
import {
  PLATFORM_PAYMOB_DB_KEYS,
  toMinorUnits,
  fromMinorUnits,
  getPaymobBaseUrl,
  calculatePaymobTransactionHmac,
  verifyPaymobWebhookHmac,
  verifyPaymobQueryHmac,
  parsePaymobWebhook,
  normalizePaymobRedirectUrl,
} from "../src/lib/paymob"
import { isSubscriptionReference, isAddonReference } from "../src/lib/billing"

const PLATFORM_TEST_SECRET = "PLATFORM_HMAC_SECRET_11223344556677889900AABBCC"

describe("Platform Paymob Database Keys & Settings", () => {
  test("defines all required platform paymob keys", () => {
    expect(PLATFORM_PAYMOB_DB_KEYS.apiKey).toBe("platform_paymob_api_key")
    expect(PLATFORM_PAYMOB_DB_KEYS.publicKey).toBe("platform_paymob_public_key")
    expect(PLATFORM_PAYMOB_DB_KEYS.hmacSecret).toBe("platform_paymob_hmac_secret")
    expect(PLATFORM_PAYMOB_DB_KEYS.region).toBe("platform_paymob_region")
    expect(PLATFORM_PAYMOB_DB_KEYS.integrationIdCard).toBe("platform_paymob_integration_id_card")
    expect(PLATFORM_PAYMOB_DB_KEYS.integrationIdWallet).toBe("platform_paymob_integration_id_wallet")
    expect(PLATFORM_PAYMOB_DB_KEYS.mode).toBe("platform_paymob_mode")
    expect(PLATFORM_PAYMOB_DB_KEYS.activeGateway).toBe("platform_active_gateway")
  })
})

describe("Subscription and Add-on Reference Identifiers", () => {
  test("correctly recognizes platform subscription references", () => {
    expect(isSubscriptionReference("SUB-A1B2C3D4-M1K2J3")).toBe(true)
    expect(isSubscriptionReference("SUB-TEST")).toBe(true)
    expect(isSubscriptionReference(" ORD-1234 ")).toBe(false)
    expect(isSubscriptionReference("APT-9988")).toBe(false)
    expect(isSubscriptionReference("ADDON-55-XY")).toBe(false)
  })

  test("correctly recognizes platform add-on references", () => {
    expect(isAddonReference("ADDON-cm123456-M1K2J3")).toBe(true)
    expect(isAddonReference("ADDON-7788-ABC")).toBe(true)
    expect(isAddonReference("SUB-1234")).toBe(false)
    expect(isAddonReference("ORD-1234")).toBe(false)
  })
})

describe("Platform Subscription Amounts & Currency Handling", () => {
  test("handles plan pricing conversion between major and minor units", () => {
    // 25 OMR Pro plan
    expect(toMinorUnits(25, "OMR")).toBe(25000)
    expect(fromMinorUnits(25000, "OMR")).toBe(25)

    // 250 OMR Yearly plan
    expect(toMinorUnits(250, "OMR")).toBe(250000)
    expect(fromMinorUnits(250000, "OMR")).toBe(250)

    // 99 USD / AED Plan
    expect(toMinorUnits(99, "USD")).toBe(9900)
    expect(fromMinorUnits(9900, "USD")).toBe(99)
  })
})

describe("Platform Paymob Webhook Verification", () => {
  const subscriptionTransaction = {
    amount_cents: 25000, // 25.000 OMR
    created_at: "2026-09-07T10:00:00.000Z",
    currency: "OMR",
    error_occured: false,
    has_parent_transaction: false,
    id: 1122334455,
    integration_id: 556677,
    is_3d_secure: true,
    is_auth: false,
    is_capture: false,
    is_refunded: false,
    is_standalone_payment: true,
    is_voided: false,
    order: {
      id: 998877,
      merchant_order_id: "SUB-PRO-20260907-XYZ",
      special_reference: "SUB-PRO-20260907-XYZ",
    },
    owner: 9999,
    pending: false,
    source_data: {
      pan: "4111",
      sub_type: "Visa",
      type: "card",
    },
    success: true,
    special_reference: "SUB-PRO-20260907-XYZ",
  }

  test("authenticates webhook HMAC for platform subscription payments", () => {
    const validHmac = calculatePaymobTransactionHmac(subscriptionTransaction, PLATFORM_TEST_SECRET)
    const payload = { obj: subscriptionTransaction }

    expect(verifyPaymobWebhookHmac(payload, validHmac, PLATFORM_TEST_SECRET)).toBe(true)
  })

  test("correctly parses platform subscription webhook payload", () => {
    const payload = { obj: subscriptionTransaction }
    const parsed = parsePaymobWebhook(payload)

    expect(parsed.eventType).toBe("payment.success")
    expect(parsed.success).toBe(true)
    expect(parsed.orderReference).toBe("SUB-PRO-20260907-XYZ")
    expect(parsed.amount).toBe(25) // 25000 baisa = 25 OMR
    expect(parsed.currency).toBe("OMR")
    expect(isSubscriptionReference(parsed.orderReference)).toBe(true)
  })

  test("verifies customer return query params signed with platform secret", () => {
    const params: Record<string, string> = {
      id: "1122334455",
      amount_cents: "25000",
      currency: "OMR",
      success: "true",
      special_reference: "SUB-PRO-20260907-XYZ",
    }

    const sorted = Object.keys(params).sort().map(k => params[k]).join("")
    const hmac = crypto.createHmac("sha512", PLATFORM_TEST_SECRET).update(sorted, "utf8").digest("hex").toLowerCase()

    const fullParams = { ...params, hmac }
    expect(verifyPaymobQueryHmac(fullParams, PLATFORM_TEST_SECRET)).toBe(true)
  })
})

describe("Platform Paymob Redirect URL Normalization", () => {
  test("ensures clean platform return endpoint", () => {
    expect(normalizePaymobRedirectUrl("https://app.fizmoh.cloud/api/billing/return/SUB-123"))
      .toBe("https://app.fizmoh.cloud/api/billing/return/SUB-123")
    
    // Rewrites localhost to secure origin
    expect(normalizePaymobRedirectUrl("http://localhost:3000/api/billing/return/SUB-123"))
      .toBe("https://app.fizmoh.cloud/api/billing/return/SUB-123")
  })
})
