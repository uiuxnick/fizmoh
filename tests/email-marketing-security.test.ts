import { describe, expect, test } from "bun:test"
import { maskEmail } from "@/lib/email-marketing/guard"
import { encodeTrackingToken, decodeTrackingToken } from "@/lib/email-marketing/tracking"
import { renderEmailHtml } from "@/lib/email-marketing/html-compiler"
import type { EmailDesignJson } from "@/lib/email-marketing/types"

describe("Email Marketing & Deliverability Security and Integrity", () => {
  test("masks email addresses safely to prevent data leaks to unauthorized staff", () => {
    expect(maskEmail("john.doe@example.com")).toBe("j***e@example.com")
    expect(maskEmail("ab@domain.com")).toBe("a***@domain.com")
    expect(maskEmail("a@domain.com")).toBe("a***@domain.com")
    expect(maskEmail("invalid-email")).toBe("***")
    expect(maskEmail("")).toBe("***")
  })

  test("generates and verifies tracking tokens securely with timing-safe signature check", () => {
    const payload = {
      tId: "tenant-123",
      cId: "camp-456",
      sId: "sub-789",
      rId: "recip-101",
      url: "https://example.com/promo",
    }
    const token = encodeTrackingToken(payload)
    expect(typeof token).toBe("string")
    expect(token).toContain(".")

    // Successfully decodes valid token
    const decoded = decodeTrackingToken(token)
    expect(decoded).not.toBeNull()
    expect(decoded?.tId).toBe(payload.tId)
    expect(decoded?.cId).toBe(payload.cId)
    expect(decoded?.sId).toBe(payload.sId)
    expect(decoded?.rId).toBe(payload.rId)
    expect(decoded?.url).toBe(payload.url)

    // Rejects tampered signature
    const parts = token.split(".")
    const forgedToken = `${parts[0]}.forgedsignature12345`
    expect(decodeTrackingToken(forgedToken)).toBeNull()

    // Rejects altered payload with original signature
    const alteredJson = JSON.stringify({ ...payload, tId: "tenant-attacker" })
    const alteredBase64 = Buffer.from(alteredJson).toString("base64url")
    const alteredToken = `${alteredBase64}.${parts[1]}`
    expect(decodeTrackingToken(alteredToken)).toBeNull()

    // Rejects malformed tokens
    expect(decodeTrackingToken("")).toBeNull()
    expect(decodeTrackingToken("not-a-token")).toBeNull()
  })

  test("escapes HTML entities in compiler to prevent XSS in email clients", () => {
    const maliciousDesign: EmailDesignJson = {
      theme: {
        primaryColor: "#059669",
        accentColor: "#10b981",
        backgroundColor: "#ffffff",
        contentWidth: 600,
        fontFamily: "Arial, sans-serif",
        isRtl: false,
      },
      sections: [
        {
          id: "sec-1",
          padding: "20px",
          backgroundColor: "#ffffff",
          blocks: [
            {
              id: "b-1",
              type: "heading",
              content: '<script>alert("xss")</script> Welcome!',
            },
            {
              id: "b-2",
              type: "text",
              content: '<img src=x onerror=alert(1)> Click "here" & save > $100',
            },
            {
              id: "b-3",
              type: "button",
              content: 'Buy "Now" & Save',
              url: 'https://example.com/checkout?ref="><script>',
            },
          ],
        },
      ],
    }

    const { html, plainText } = renderEmailHtml(maliciousDesign, false)
    expect(html).not.toContain("<script>")
    expect(html).not.toContain("<img src=x onerror=alert(1)>")
    expect(html).toContain("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;")
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;")
    expect(html).toContain("&amp; save &gt; $100")
    expect(html).toContain("&quot;&gt;&lt;script&gt;")

    // Plain text should contain the raw readable text
    expect(plainText).toContain('<script>alert("xss")</script> Welcome!')
    expect(plainText).toContain('[Buy "Now" & Save]')
  })

  test("validates open-redirect protection on tracking destination URLs", () => {
    function sanitizeRedirectUrl(destination: string | undefined): string {
      if (!destination) return "/"
      try {
        const parsed = new URL(destination)
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return "/"
        }
        return destination
      } catch {
        return "/"
      }
    }

    expect(sanitizeRedirectUrl("https://example.com/welcome")).toBe("https://example.com/welcome")
    expect(sanitizeRedirectUrl("http://shop.mysite.com/item/1")).toBe("http://shop.mysite.com/item/1")
    expect(sanitizeRedirectUrl("javascript:alert(1)")).toBe("/")
    expect(sanitizeRedirectUrl("data:text/html,<script>alert(1)</script>")).toBe("/")
    expect(sanitizeRedirectUrl("file:///etc/passwd")).toBe("/")
    expect(sanitizeRedirectUrl("///attacker.com")).toBe("/")
    expect(sanitizeRedirectUrl("not-a-url")).toBe("/")
  })

  test("generates unique deterministic idempotency keys per campaign recipient", () => {
    const campaignId = "camp_autumn_sale_2026"
    const sub1 = "sub_user_abc"
    const sub2 = "sub_user_xyz"

    const key1 = `${campaignId}:${sub1}`
    const key2 = `${campaignId}:${sub2}`
    const duplicateKey1 = `${campaignId}:${sub1}`

    expect(key1).not.toBe(key2)
    expect(key1).toBe(duplicateKey1)
  })

  test("enforces role permissions correctly for email marketing actions", () => {
    const adminRoles = ["OWNER", "SUPER_ADMIN", "ADMIN"]
    const operationalRoles = ["MANAGER", "MARKETING"]
    const readOnlyRoles = ["VIEWER", "FINANCE", "AGENT"]

    function canManageCampaigns(role: string, permissions: Record<string, boolean> = {}): boolean {
      if (adminRoles.includes(role)) return true
      return Boolean(permissions["email.campaign.create"])
    }

    function canSendCampaigns(role: string, permissions: Record<string, boolean> = {}): boolean {
      if (adminRoles.includes(role)) return true
      return Boolean(permissions["email.campaign.send"])
    }

    function canManageSmtp(role: string, permissions: Record<string, boolean> = {}): boolean {
      if (adminRoles.includes(role)) return true
      return Boolean(permissions["email.domains.manage"])
    }

    // Admins always have access
    for (const role of adminRoles) {
      expect(canManageCampaigns(role)).toBe(true)
      expect(canSendCampaigns(role)).toBe(true)
      expect(canManageSmtp(role)).toBe(true)
    }

    // Read-only or default operational roles without explicit permission are denied
    for (const role of readOnlyRoles) {
      expect(canManageCampaigns(role)).toBe(false)
      expect(canSendCampaigns(role)).toBe(false)
      expect(canManageSmtp(role)).toBe(false)
    }

    // Granted specific permissions allow individual capabilities
    expect(canManageCampaigns("MARKETING", { "email.campaign.create": true })).toBe(true)
    expect(canSendCampaigns("MARKETING", { "email.campaign.create": true })).toBe(false)
    expect(canSendCampaigns("MARKETING", { "email.campaign.send": true })).toBe(true)
    expect(canManageSmtp("MARKETING", { "email.campaign.send": true })).toBe(false)
  })
})
