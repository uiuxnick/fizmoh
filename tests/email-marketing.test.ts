import { describe, expect, test } from "bun:test"
import { maskEmail } from "@/lib/email-marketing/guard"
import { renderEmailHtml } from "@/lib/email-marketing/html-compiler"
import { encodeTrackingToken, decodeTrackingToken } from "@/lib/email-marketing/tracking"
import type { EmailDesignJson } from "@/lib/email-marketing/types"

describe("Advanced Email Marketing Addon Architecture", () => {
  test("Subscriber email masking protects confidential addresses for restricted roles", () => {
    expect(maskEmail("john.doe@example.com")).toBe("j***e@example.com")
    expect(maskEmail("al@company.om")).toBe("a***@company.om")
    expect(maskEmail("invalid-email")).toBe("***")
  })

  test("Tracking token encoding and cryptographic signature validation", () => {
    const payload = {
      tId: "tenant_123",
      cId: "camp_456",
      sId: "sub_789",
      rId: "recip_999",
      url: "https://example.com/checkout",
    }

    const token = encodeTrackingToken(payload)
    expect(typeof token).toBe("string")
    expect(token.includes(".")).toBe(true)

    const decoded = decodeTrackingToken(token)
    expect(decoded).not.toBeNull()
    expect(decoded?.tId).toBe("tenant_123")
    expect(decoded?.cId).toBe("camp_456")
    expect(decoded?.url).toBe("https://example.com/checkout")

    // Tampered token fails verification
    const tampered = token.replace(/a/g, "z")
    expect(decodeTrackingToken(tampered)).toBeNull()
  })

  test("HTML compiler produces email-safe responsive markup with RTL support", () => {
    const design: EmailDesignJson = {
      version: 1,
      theme: {
        primaryColor: "#059669",
        accentColor: "#10b981",
        backgroundColor: "#f8fafc",
        contentWidth: 600,
        fontFamily: "Arial, sans-serif",
        isRtl: true,
      },
      sections: [
        {
          id: "sec_1",
          columnsCount: 1,
          blocks: [
            {
              id: "b1",
              type: "heading",
              content: "Exclusive Ramadan Offer",
              contentAr: "عرض رمضان الحصري",
            },
            {
              id: "b2",
              type: "button",
              content: "Book Now",
              contentAr: "احجز الآن",
              url: "https://app.fizmoh.cloud",
            },
            {
              id: "b3",
              type: "footer",
              content: "Company details and unsubscribe.",
            },
          ],
        },
      ],
    }

    const enResult = renderEmailHtml(design, false)
    expect(enResult.html).toContain("dir=\"rtl\"") // theme.isRtl takes effect or lang
    expect(enResult.html).toContain("Exclusive Ramadan Offer")
    expect(enResult.html).toContain("{{unsubscribe_url}}")

    const arResult = renderEmailHtml(design, true)
    expect(arResult.html).toContain("عرض رمضان الحصري")
    expect(arResult.html).toContain("احجز الآن")
  })
})
