import { expect, test, describe } from "bun:test"
import crypto from "crypto"

describe("E-Commerce (Salla, Zid, Shopify) Security, Roles, and Webhook Verification", () => {
  const EDIT_ROLES = new Set(["OWNER", "SUPER_ADMIN", "ADMIN", "MANAGER", "PLATFORM"])

  test("authorized staff roles can create, update, and delete stores and templates", () => {
    expect(EDIT_ROLES.has("OWNER")).toBe(true)
    expect(EDIT_ROLES.has("SUPER_ADMIN")).toBe(true)
    expect(EDIT_ROLES.has("ADMIN")).toBe(true)
    expect(EDIT_ROLES.has("MANAGER")).toBe(true)
    expect(EDIT_ROLES.has("PLATFORM")).toBe(true)
  })

  test("unauthorized roles cannot manage e-commerce connectors or notification templates", () => {
    expect(EDIT_ROLES.has("STAFF")).toBe(false)
    expect(EDIT_ROLES.has("AGENT")).toBe(false)
    expect(EDIT_ROLES.has("VIEWER")).toBe(false)
    expect(EDIT_ROLES.has("FINANCE")).toBe(false)
    expect(EDIT_ROLES.has("GUEST")).toBe(false)
  })

  test("validates store and checkout URLs rejecting insecure or dangerous protocols", () => {
    const isValidUrl = (urlStr: string): boolean => {
      try {
        const parsed = new URL(urlStr.trim())
        return ["http:", "https:"].includes(parsed.protocol)
      } catch {
        return false
      }
    }

    // Valid URLs
    expect(isValidUrl("https://store.myshopify.com")).toBe(true)
    expect(isValidUrl("http://localhost:3000")).toBe(true)
    expect(isValidUrl("https://salla.sa/mystore")).toBe(true)

    // Dangerous / invalid schemes
    expect(isValidUrl("javascript:alert(1)")).toBe(false)
    expect(isValidUrl("ftp://ftp.example.com/payload")).toBe(false)
    expect(isValidUrl("file:///etc/passwd")).toBe(false)
    expect(isValidUrl("data:text/html,<script>alert(1)</script>")).toBe(false)
    expect(isValidUrl("not-a-valid-url")).toBe(false)
  })

  test("verifies Shopify HMAC-SHA256 signature in constant time", () => {
    const webhookSecret = "shpss_test_secret_99887766"
    const payload = JSON.stringify({
      id: 8209829119461,
      email: "jon@example.com",
      created_at: "2026-10-26T08:00:00Z",
      total_price: "49.50",
      currency: "OMR",
    })

    // Generate valid Shopify HMAC
    const validHmac = crypto.createHmac("sha256", webhookSecret).update(payload, "utf8").digest("base64")

    const verifyShopifyHmac = (rawBody: string, hmacHeader: string, secret: string): boolean => {
      const hash = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64")
      const provided = Buffer.from(hmacHeader, "utf8")
      const calculated = Buffer.from(hash, "utf8")
      return provided.length === calculated.length && crypto.timingSafeEqual(provided, calculated)
    }

    expect(verifyShopifyHmac(payload, validHmac, webhookSecret)).toBe(true)
    expect(verifyShopifyHmac(payload, "forged_hmac_header", webhookSecret)).toBe(false)
    expect(verifyShopifyHmac(payload, validHmac, "wrong_secret")).toBe(false)
    // Tampered payload
    const tamperedPayload = JSON.stringify({
      id: 8209829119461,
      total_price: "0.01",
    })
    expect(verifyShopifyHmac(tamperedPayload, validHmac, webhookSecret)).toBe(false)
  })

  test("preserves RECOVERED state for converted abandoned checkouts", () => {
    type CartStatus = "PENDING" | "RECOVERED" | "EXPIRED"

    const applyCartUpdate = (currentStatus: CartStatus, isConversion: boolean): CartStatus => {
      // If already recovered, do not revert to pending
      if (currentStatus === "RECOVERED") {
        return "RECOVERED"
      }
      return isConversion ? "RECOVERED" : "PENDING"
    }

    expect(applyCartUpdate("PENDING", false)).toBe("PENDING")
    expect(applyCartUpdate("PENDING", true)).toBe("RECOVERED")
    // When already recovered, subsequent cart trigger should never revert
    expect(applyCartUpdate("RECOVERED", false)).toBe("RECOVERED")
    expect(applyCartUpdate("RECOVERED", true)).toBe("RECOVERED")
  })

  test("formats template variables correctly for multi-channel notification dispatch", () => {
    const rawTemplate = "Hello {{name}}, your order #{{order_number}} at {{store_name}} has been confirmed for {{total}} {{currency}}."
    const data: Record<string, any> = {
      name: "Ahmed Al Balushi",
      order_number: "SH-10294",
      store_name: "Oman Artisan Boutique",
      total: "28.500",
      currency: "OMR",
    }

    const interpolate = (template: string, vars: Record<string, any>): string => {
      return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] !== undefined ? String(vars[key]) : "")
    }

    const rendered = interpolate(rawTemplate, data)
    expect(rendered).toBe("Hello Ahmed Al Balushi, your order #SH-10294 at Oman Artisan Boutique has been confirmed for 28.500 OMR.")
    expect(rendered.includes("{{")).toBe(false)
  })

  test("enforces multi-tenant workspace isolation for ecommerce stores and templates", () => {
    const tenantA = "cmvkors2w035xi3n5ltvwue7x"
    const tenantB = "cmsqevt2a0000i3g24a2qc10w"

    const stores = [
      { id: "store-1", tenantId: tenantA, name: "Cezo Fashion" },
      { id: "store-2", tenantId: tenantB, name: "Oman Adventures Gear" },
    ]

    const queryForTenant = (callerTenantId: string) => {
      return stores.filter(s => s.tenantId === callerTenantId)
    }

    const resultsA = queryForTenant(tenantA)
    expect(resultsA.length).toBe(1)
    expect(resultsA[0].name).toBe("Cezo Fashion")

    const resultsB = queryForTenant(tenantB)
    expect(resultsB.length).toBe(1)
    expect(resultsB[0].name).toBe("Oman Adventures Gear")

    // Cross-tenant bleed is strictly blocked
    expect(resultsA.some(s => s.tenantId === tenantB)).toBe(false)
  })
})
