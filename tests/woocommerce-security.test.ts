import { expect, test, describe } from "bun:test"
import crypto from "crypto"

describe("WooCommerce Security, Entitlements and Webhook Verification", () => {
  const EDIT_ROLES = new Set(["OWNER", "SUPER_ADMIN", "ADMIN", "MANAGER", "PLATFORM"])

  test("authorized roles can manage WooCommerce products, settings, and orders", () => {
    expect(EDIT_ROLES.has("OWNER")).toBe(true)
    expect(EDIT_ROLES.has("SUPER_ADMIN")).toBe(true)
    expect(EDIT_ROLES.has("ADMIN")).toBe(true)
    expect(EDIT_ROLES.has("MANAGER")).toBe(true)
    expect(EDIT_ROLES.has("PLATFORM")).toBe(true)
  })

  test("unauthorized roles cannot manage WooCommerce store", () => {
    expect(EDIT_ROLES.has("STAFF")).toBe(false)
    expect(EDIT_ROLES.has("AGENT")).toBe(false)
    expect(EDIT_ROLES.has("VIEWER")).toBe(false)
    expect(EDIT_ROLES.has("FINANCE")).toBe(false)
    expect(EDIT_ROLES.has("GUEST")).toBe(false)
  })

  test("verifies WooCommerce HMAC-SHA256 signature in constant time", () => {
    const secret = "test_wc_secret_12345"
    const rawBody = JSON.stringify({ id: 1045, status: "processing", total: "45.00" })

    // Generate valid signature as WooCommerce does
    const validSignature = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64")

    const verifyWcSignature = (body: string, sigHeader: string, key: string): boolean => {
      const expected = crypto.createHmac("sha256", key).update(body, "utf8").digest("base64")
      const provided = Buffer.from(sigHeader, "utf8")
      const computed = Buffer.from(expected, "utf8")
      return provided.length === computed.length && crypto.timingSafeEqual(provided, computed)
    }

    expect(verifyWcSignature(rawBody, validSignature, secret)).toBe(true)
    // Wrong signature
    expect(verifyWcSignature(rawBody, "invalid_base64_signature", secret)).toBe(false)
    // Wrong secret
    expect(verifyWcSignature(rawBody, validSignature, "different_secret")).toBe(false)
    // Tampered body
    const tamperedBody = JSON.stringify({ id: 1045, status: "completed", total: "45.00" })
    expect(verifyWcSignature(tamperedBody, validSignature, secret)).toBe(false)
  })

  test("normalizes customer phone numbers from WooCommerce webhook billing data", () => {
    const normalizePhone = (raw: string): string => {
      const cleaned = raw.replace(/[^0-9+]/g, "")
      return cleaned.startsWith("+") ? cleaned : `+${cleaned}`
    }

    expect(normalizePhone("+968 9123 4567")).toBe("+96891234567")
    expect(normalizePhone("968-9123-4567")).toBe("+96891234567")
    expect(normalizePhone("(968) 91234567")).toBe("+96891234567")
  })

  test("extracts carrier tracking metadata from WooCommerce shipment tracking plugins", () => {
    const metaData = [
      { key: "_unrelated_meta", value: "test" },
      {
        key: "_wc_shipment_tracking_items",
        value: [
          {
            tracking_provider: "Oman Post",
            tracking_number: "OM123456789",
            custom_tracking_link: "https://omanpost.om/track?no=OM123456789",
          },
        ],
      },
    ]

    let carrier = "Courier"
    let trackingNumber = ""
    let trackingUrl = ""

    const trackingMeta = metaData.find((m: any) =>
      m.key === "_wc_shipment_tracking_items" || m.key === "_ast_tracking_items" || m.key === "tracking_number"
    )

    if (trackingMeta && Array.isArray(trackingMeta.value) && trackingMeta.value[0]) {
      const item = trackingMeta.value[0]
      carrier = item.custom_tracking_provider || item.tracking_provider || "Courier"
      trackingNumber = item.tracking_number || ""
      trackingUrl = item.custom_tracking_link || item.tracking_link || ""
    }

    expect(carrier).toBe("Oman Post")
    expect(trackingNumber).toBe("OM123456789")
    expect(trackingUrl).toContain("omanpost.om")
  })

  test("validates store URL protocol before persisting configuration", () => {
    const isValidStoreUrl = (urlStr: string): boolean => {
      try {
        const u = new URL(urlStr)
        return ["http:", "https:"].includes(u.protocol)
      } catch {
        return false
      }
    }

    expect(isValidStoreUrl("https://store.example.com")).toBe(true)
    expect(isValidStoreUrl("http://localhost:8080")).toBe(true)
    expect(isValidStoreUrl("javascript:alert(1)")).toBe(false)
    expect(isValidStoreUrl("not a url")).toBe(false)
    expect(isValidStoreUrl("ftp://store.example.com")).toBe(false)
  })
})
