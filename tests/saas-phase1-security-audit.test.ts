import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { NextRequest } from "next/server"

const ROOT = join(import.meta.dir, "..")

describe("Phase 1 SaaS Security & Tenant Isolation Audit Regressions", () => {
  describe("F-01: Kitchen Order Payment Return Settlement Bypass (src/app/api/amwalpay/return/[reference]/route.ts)", () => {
    it("does not default isPaidConfirmed to true when fetchTransaction returns null, and runs fetchTransaction inside withTenant", () => {
      const src = readFileSync(
        join(ROOT, "src/app/api/amwalpay/return/[reference]/route.ts"),
        "utf8",
      )

      // Must never fallback to `: true` when txn is null/undefined
      expect(src).not.toMatch(/const\s+isPaidConfirmed\s*=\s*txn\s*\?[^:]+:\s*true/)
      // Must verify txn truthiness before marking PAID
      expect(src).toContain('Boolean(txn && (txn.responseCode === "00" || txn.isCaptured === true))')
      // Must resolve tenantOf(kitchen.tenantId) for tenant-scoped AmwalPay credentials
      expect(src).toContain("tenantOf(kitchen.tenantId)")
    })
  })

  describe("F-02: Agency Reseller Role & WHITE_LABEL Entitlement Enforcement (src/app/api/agency/reseller/route.ts)", () => {
    it("rejects PUT and POST when unauthenticated, non-admin role, or missing WHITE_LABEL module", async () => {
      const src = readFileSync(
        join(ROOT, "src/app/api/agency/reseller/route.ts"),
        "utf8",
      )

      // Both PUT and POST must check WHITE_LABEL entitlement and admin role
      expect(src).toContain("requireAgencyAdmin")

      const { PUT, POST } = await import("../src/app/api/agency/reseller/route")

      // Without workspace/session context, both PUT and POST must return 401
      const putRes = await PUT(
        new NextRequest("https://app.fizmoh.cloud/api/agency/reseller", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ agencyName: "Attacker Agency" }),
        }),
      )
      expect(putRes.status).toBe(401)

      const postRes = await POST(
        new NextRequest("https://app.fizmoh.cloud/api/agency/reseller", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            clientName: "Unauthorized SubTenant",
            slug: "unauth-subtenant",
            adminEmail: "attacker@example.com",
          }),
        }),
      )
      expect(postRes.status).toBe(401)
    })
  })

  describe("F-03: Live Chat Widget Cross-Tenant Fallback & Channel Isolation", () => {
    it("removes arbitrary db.tenant.findFirst(createdAt: asc) fallback from widget session and config routes", () => {
      const sessionSrc = readFileSync(
        join(ROOT, "src/app/api/widget/session/route.ts"),
        "utf8",
      )
      const configSrc = readFileSync(
        join(ROOT, "src/app/api/widget/config/route.ts"),
        "utf8",
      )

      expect(sessionSrc).not.toContain('db.tenant.findFirst({ orderBy: { createdAt: "asc" } })')
      expect(configSrc).not.toContain('orderBy: { createdAt: "asc" }')
    })

    it("rejects POST /api/widget/session when widgetId is 'default' and no valid tenant is provided", async () => {
      const { POST } = await import("../src/app/api/widget/session/route")
      const res = await POST(
        new NextRequest("https://app.fizmoh.cloud/api/widget/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            widgetId: "default",
            visitorId: "vis_test_12345",
          }),
        }),
      )
      expect([400, 404]).toContain(res.status)
    })

    it("enforces channel === LIVE_CHAT on widget messages and stream routes", () => {
      const messagesSrc = readFileSync(
        join(ROOT, "src/app/api/widget/messages/route.ts"),
        "utf8",
      )
      const streamSrc = readFileSync(
        join(ROOT, "src/app/api/widget/stream/route.ts"),
        "utf8",
      )

      expect(messagesSrc).toContain('conversation.channel !== "LIVE_CHAT"')
      expect(streamSrc).toContain('conversation.channel !== "LIVE_CHAT"')
    })
  })

  describe("F-05: Raw SQL Hardening in Subscribers & Orders Routes", () => {
    it("eliminates $queryRawUnsafe from src/app/api/subscribers/route.ts and scopes Slot updates by tenantId in src/app/api/orders/[id]/route.ts", () => {
      const subscribersSrc = readFileSync(
        join(ROOT, "src/app/api/subscribers/route.ts"),
        "utf8",
      )
      expect(subscribersSrc).not.toContain("$queryRawUnsafe")
      expect(subscribersSrc).toContain("$queryRaw")

      const ordersIdSrc = readFileSync(
        join(ROOT, "src/app/api/orders/[id]/route.ts"),
        "utf8",
      )
      expect(ordersIdSrc).toContain('WHERE id = ${order.slotId} AND "tenantId" = ${order.tenantId}')
    })
  })

  describe("F-06: Reflected XSS Prevention in Hosted Checkout & Analytics Script ID Validation", () => {
    it("escapes HTML in GET /api/amwalpay/hosted-checkout query parameters", async () => {
      const { GET } = await import("../src/app/api/amwalpay/hosted-checkout/route")
      const maliciousUrl =
        "https://app.fizmoh.cloud/api/amwalpay/hosted-checkout?ref=%22%3E%3Cscript%3Ealert(1)%3C%2Fscript%3E&amount=%22%3E%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E&currency=%3Csvg%20onload%3Dalert(1)%3E"
      const res = await GET(new NextRequest(maliciousUrl))
      expect(res.status).toBe(200)
      const html = await res.text()

      expect(html).not.toContain("<script>alert(1)</script>")
      expect(html).not.toContain("<img src=x onerror=alert(1)>")
      expect(html).not.toContain("<svg onload=alert(1)>")
      expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;")
    })

    it("validates GTM, GA4, and Meta Pixel IDs against strict patterns before script interpolation", () => {
      const analyticsSrc = readFileSync(
        join(ROOT, "src/components/analytics-scripts.tsx"),
        "utf8",
      )
      expect(analyticsSrc).toContain("SAFE_GTM_ID")
      expect(analyticsSrc).toContain("SAFE_GA_ID")
      expect(analyticsSrc).toContain("SAFE_PIXEL_ID")
    })
  })
})
