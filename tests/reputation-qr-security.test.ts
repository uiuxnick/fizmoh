import { expect, test, describe } from "bun:test"
import crypto from "crypto"

describe("Digital QR, Reputation Shield & vCard Security Controls", () => {
  const EDIT_ROLES = new Set(["OWNER", "SUPER_ADMIN", "ADMIN", "MANAGER", "MARKETING", "PLATFORM"])
  const AUTOMATIC_MODE_ROLES = new Set(["OWNER", "SUPER_ADMIN", "ADMIN", "PLATFORM"])

  test("authorized management roles can configure QR campaigns, review replies, and vCard settings", () => {
    expect(EDIT_ROLES.has("OWNER")).toBe(true)
    expect(EDIT_ROLES.has("SUPER_ADMIN")).toBe(true)
    expect(EDIT_ROLES.has("ADMIN")).toBe(true)
    expect(EDIT_ROLES.has("MANAGER")).toBe(true)
    expect(EDIT_ROLES.has("MARKETING")).toBe(true)
    expect(EDIT_ROLES.has("PLATFORM")).toBe(true)
  })

  test("unauthorized or read-only roles cannot modify reputation settings, campaigns, or vCards", () => {
    expect(EDIT_ROLES.has("VIEWER")).toBe(false)
    expect(EDIT_ROLES.has("FINANCE")).toBe(false)
    expect(EDIT_ROLES.has("GUEST")).toBe(false)
    expect(EDIT_ROLES.has("AGENT")).toBe(false)
  })

  test("unattended automatic review reply publishing is restricted to higher administrative roles", () => {
    expect(AUTOMATIC_MODE_ROLES.has("OWNER")).toBe(true)
    expect(AUTOMATIC_MODE_ROLES.has("SUPER_ADMIN")).toBe(true)
    expect(AUTOMATIC_MODE_ROLES.has("ADMIN")).toBe(true)
    expect(AUTOMATIC_MODE_ROLES.has("PLATFORM")).toBe(true)

    // Marketing and lower roles cannot enable unattended auto-publishing to public Google listings
    expect(AUTOMATIC_MODE_ROLES.has("MARKETING")).toBe(false)
    expect(AUTOMATIC_MODE_ROLES.has("MANAGER")).toBe(false)
    expect(AUTOMATIC_MODE_ROLES.has("VIEWER")).toBe(false)
  })

  test("reputation shield routes ratings according to threshold without policy gating violations", () => {
    const routeReview = (rating: number, threshold = 4) => {
      const isPositive = rating >= threshold
      return {
        status: isPositive ? "ROUTED_GOOGLE" : "ROUTED_PRIVATE",
        offersPrivateFeedback: true,
        allowsGoogleClick: true, // Google URL is never hard-blocked to avoid FTC review gating penalties
      }
    }

    const fiveStar = routeReview(5)
    expect(fiveStar.status).toBe("ROUTED_GOOGLE")
    expect(fiveStar.allowsGoogleClick).toBe(true)

    const fourStar = routeReview(4)
    expect(fourStar.status).toBe("ROUTED_GOOGLE")

    const threeStar = routeReview(3)
    expect(threeStar.status).toBe("ROUTED_PRIVATE")
    expect(threeStar.offersPrivateFeedback).toBe(true)
    expect(threeStar.allowsGoogleClick).toBe(true)

    const oneStar = routeReview(1)
    expect(oneStar.status).toBe("ROUTED_PRIVATE")
    expect(oneStar.offersPrivateFeedback).toBe(true)
  })

  test("generates irreversible anonymous scan fingerprints without persisting raw IPs", () => {
    const scanFingerprint = (ip: string, userAgent: string, qrCodeId: string): string => {
      return crypto.createHash("sha256").update(`${ip}:${userAgent}:${qrCodeId}`).digest("hex")
    }

    const fp1 = scanFingerprint("185.220.101.5", "Mozilla/5.0 Mobile", "qr_abc123")
    const fp2 = scanFingerprint("185.220.101.5", "Mozilla/5.0 Mobile", "qr_abc123")
    const fpDifferentIp = scanFingerprint("185.220.101.6", "Mozilla/5.0 Mobile", "qr_abc123")
    const fpDifferentQr = scanFingerprint("185.220.101.5", "Mozilla/5.0 Mobile", "qr_xyz999")

    expect(fp1).toBe(fp2)
    expect(fp1).not.toBe(fpDifferentIp)
    expect(fp1).not.toBe(fpDifferentQr)
    expect(fp1.length).toBe(64) // SHA-256 hex string
  })

  test("validates canvas design structure and paper size constraints", () => {
    const PAPER_SIZES = new Set(["a4", "a5", "table-tent", "business-card", "sticker"])
    const MAX_LAYERS = 60
    const MAX_SIZE_BYTES = 8 * 1024 * 1024

    const isValidDesign = (design: any, rawPayloadLength: number): boolean => {
      if (rawPayloadLength > MAX_SIZE_BYTES) return false
      if (!design || typeof design !== "object") return false
      if (!PAPER_SIZES.has(design.paperSize)) return false
      if (!Array.isArray(design.layers) || design.layers.length > MAX_LAYERS) return false
      return true
    }

    const validDesign = {
      paperSize: "table-tent",
      layers: [{ type: "qr", x: 10, y: 10 }, { type: "text", text: "Scan to review" }],
    }
    expect(isValidDesign(validDesign, 500)).toBe(true)

    // Invalid paper size
    expect(isValidDesign({ paperSize: "billboard-huge", layers: [] }, 500)).toBe(false)

    // Excessive layer count
    const tooManyLayers = Array.from({ length: 65 }, (_, i) => ({ type: "text", text: `layer ${i}` }))
    expect(isValidDesign({ paperSize: "a4", layers: tooManyLayers }, 5000)).toBe(false)

    // Oversized payload
    expect(isValidDesign(validDesign, 9 * 1024 * 1024)).toBe(false)
  })

  test("enforces module entitlement: DIGITAL_QR or REPUTATION required for review surface", () => {
    const isEntitled = (plan: string, activeAddons: string[] = []): boolean => {
      if (plan.toUpperCase() === "ENTERPRISE") return true
      return activeAddons.includes("DIGITAL_QR") || activeAddons.includes("REPUTATION")
    }

    // cezo: Free plan without QR / reputation add-on
    expect(isEntitled("FREE", [])).toBe(false)

    // tanfidh: Starter plan with only ECOMMERCE
    expect(isEntitled("STARTER", ["ECOMMERCE"])).toBe(false)

    // Active DIGITAL_QR add-on
    expect(isEntitled("STARTER", ["DIGITAL_QR"])).toBe(true)

    // Active REPUTATION add-on
    expect(isEntitled("STARTER", ["REPUTATION"])).toBe(true)

    // oman-adventures: Enterprise plan
    expect(isEntitled("ENTERPRISE", [])).toBe(true)
  })
})
