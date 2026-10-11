import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { NextRequest } from "next/server"

const ROOT = join(import.meta.dir, "..")

describe("Phase 2 SaaS Core Workflows & Business Logic Regressions", () => {
  describe("F-04: Website Builder Checkout Tenant Resolution & Honest Payment Error Handling", () => {
    it("does not fall back to arbitrary raw.tenant.findFirst() when tenantSlug and host do not match", async () => {
      const checkoutSrc = readFileSync(
        join(ROOT, "src/app/api/website-builder/checkout/route.ts"),
        "utf8",
      )

      // Must not have an unscoped raw.tenant.findFirst({ select: ... }) without a where clause
      expect(checkoutSrc).not.toMatch(/raw\.tenant\.findFirst\(\{\s*select:/m)

      const { POST } = await import("../src/app/api/website-builder/checkout/route")
      const res = await POST(
        new NextRequest("https://app.fizmoh.cloud/api/website-builder/checkout", {
          method: "POST",
          headers: { "content-type": "application/json", host: "app.fizmoh.cloud" },
          body: JSON.stringify({
            customerName: "Test Buyer",
            customerPhone: "+96891234567",
            items: [{ name: "Burger", price: 3.5, quantity: 1 }],
            paymentMethod: "CARD_ONLINE",
          }),
        }),
      )
      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.error).toContain("workspace")
    })

    it("does not fabricate a fake /api/amwalpay/hosted-checkout?status=pending URL when payment session fails", () => {
      const checkoutSrc = readFileSync(
        join(ROOT, "src/app/api/website-builder/checkout/route.ts"),
        "utf8",
      )
      expect(checkoutSrc).not.toContain("/api/amwalpay/hosted-checkout?status=pending")
    })
  })

  describe("F-07: Email Marketing Tenant Context, Custom From/ReplyTo & Tracking Isolation", () => {
    it("executes SMTP test, campaign test, and campaign send inside withTenant(auth!.tenant, ...)", () => {
      const smtpTestSrc = readFileSync(
        join(ROOT, "src/app/api/v1/email/smtp/test/route.ts"),
        "utf8",
      )
      const campaignSendSrc = readFileSync(
        join(ROOT, "src/app/api/v1/email/campaigns/[id]/send/route.ts"),
        "utf8",
      )
      const campaignTestSrc = readFileSync(
        join(ROOT, "src/app/api/v1/email/campaigns/[id]/test/route.ts"),
        "utf8",
      )

      expect(smtpTestSrc).toContain("withTenant(auth!.tenant")
      expect(campaignSendSrc).toContain("withTenant(auth!.tenant")
      expect(campaignTestSrc).toContain("withTenant(auth!.tenant")
    })

    it("forwards fromName, fromEmail, and replyTo through SmtpEmailProvider to sendEmail", () => {
      const providersSrc = readFileSync(
        join(ROOT, "src/lib/email-marketing/providers/index.ts"),
        "utf8",
      )
      const notificationsSrc = readFileSync(
        join(ROOT, "src/lib/notifications.ts"),
        "utf8",
      )

      expect(providersSrc).toContain("replyTo: payload.replyTo")
      expect(notificationsSrc).toContain("message.from")
      expect(notificationsSrc).toContain("message.replyTo")
    })

    it("scopes email tracking click, open, and unsubscribe mutations by payload.tId", () => {
      const clickSrc = readFileSync(
        join(ROOT, "src/app/api/v1/email/track/click/[token]/route.ts"),
        "utf8",
      )
      const openSrc = readFileSync(
        join(ROOT, "src/app/api/v1/email/track/open/[token]/route.ts"),
        "utf8",
      )
      const unsubSrc = readFileSync(
        join(ROOT, "src/app/api/v1/email/track/unsubscribe/[token]/route.ts"),
        "utf8",
      )

      expect(clickSrc).toContain("tenantId: payload.tId")
      expect(openSrc).toContain("tenantId: payload.tId")
      expect(unsubSrc).toContain("tenantId: payload.tId")
    })
  })
})
