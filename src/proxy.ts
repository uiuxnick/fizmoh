import { NextRequest, NextResponse } from "next/server"
import { CUSTOMER_COOKIE, STAFF_COOKIE, verifySession } from "@/lib/auth"

const PUBLIC_EXACT = new Set([
  "/api",
  "/api/health",
  "/api/docs/postman",
  "/api/config/public",
  "/api/plans/public",
  "/api/plans/addons",
  "/api/app-version",
  "/api/templates/count",
  "/api/auth/admin-login",
  "/api/auth/otp",
  "/api/auth/verify-otp",
  "/api/auth/staff-otp",
  "/api/auth/staff-verify-otp",
  "/api/auth/magic-login",
  "/api/auth/provider-login",
  "/api/auth/logout",
  "/api/signup",
  "/api/signup/availability",
  "/api/coupons/validate",
  "/api/avail-check",
  "/api/amwalpay/create-session",
  "/api/amwalpay/hosted-checkout",
  "/api/amwalpay/webhook",
  "/api/amwalpay/cloud-notification",
  "/api/amwalpay/callback",
  "/api/paymob/create-session",
  "/api/paymob/webhook",
  "/api/paymob/callback",
  "/api/whatsapp/webhook",
  "/api/social/webhook/facebook",
  "/api/social/webhook/instagram",
  "/api/woocommerce/webhook",
  "/api/cron",
  "/api/demo/book",
  "/api/contact",
])

function isPublic(request: NextRequest) {
  const path = request.nextUrl.pathname
  if (PUBLIC_EXACT.has(path) || path.startsWith("/api/external/")) return true
  if (path.startsWith("/api/campaigns/click/")) return true
  if (path === "/api/campaigns/unsubscribe") return true
  if (request.method === "GET" && /^\/api\/vouchers\/[^/]+\/pdf$/.test(path)) return true
  // Same arrangement as the voucher above: WhatsApp fetches the document by
  // URL, and the cuid is what makes the address unguessable.
  if (request.method === "GET" && /^\/api\/invoices\/[^/]+\/pdf$/.test(path)) return true
  // GET only used to be enough for WhatsApp's own fetch, but Messenger/
  // Instagram's Send API sends a HEAD probe first to check content-type and
  // size before downloading — a HEAD here fell through to auth and got a 401,
  // which Meta reports back as a bare "(#100) Upload failed" with no other clue.
  if ((request.method === "GET" || request.method === "HEAD") && /^\/api\/media\/[a-f0-9-]{36}\.[a-z0-9]{1,5}$/i.test(path)) return true
  if (path.startsWith("/api/invite/")) return true
  // Digital QR Addons: an anonymous customer scanning a physical QR has no
  // session and none should be required. Scoped by the unguessable token or
  // session id itself, never by trusting a request header.
  if (path.startsWith("/api/qr/")) return true
  if (path.startsWith("/api/shop/")) return true
  // Digital Business Card (vCard): public vcf download, dynamic QR generation,
  // public card view/click analytics events, and lead capture.
  if (path.startsWith("/api/vcard/")) return true
  if (path.startsWith("/api/card/")) return true
  // Website Live Chat & WhatsApp Widget: public configuration, session, messaging, and SSE stream
  if (path.startsWith("/api/widget/")) return true
  if (path.startsWith("/api/billing/return/")) return true
  if (path === "/api/amwalpay/return" || path.startsWith("/api/amwalpay/return/")) return true
  // The checkout page itself: opened straight from a WhatsApp message.
  if (path.startsWith("/api/amwalpay/pay/")) return true
  if (path.startsWith("/api/paymob/pay/")) return true
  if (path.startsWith("/api/restaurant/")) {
    if (path.startsWith("/api/restaurant/public/")) return true
    if (path === "/api/restaurant/stream") return true
    if (request.method === "GET" && path === "/api/restaurant/menu") return true
    if (request.method === "POST" && (path === "/api/restaurant/orders" || path === "/api/restaurant/reservations")) return true
    return false
  }

  if (path.startsWith("/api/hospital/")) {
    if (path.startsWith("/api/hospital/admin/") ||
        path.startsWith("/api/hospital/calendar") ||
        path.startsWith("/api/hospital/reminders") ||
        path.startsWith("/api/hospital/settings") ||
        path.startsWith("/api/hospital/waitlist") ||
        path === "/api/hospital/appointments" && request.method === "GET" ||
        path === "/api/hospital/chemo" && request.method === "GET" ||
        /^\/api\/hospital\/chemo\/[^/]+$/.test(path) ||
        path === "/api/hospital/patients" && request.method !== "POST" ||
        path === "/api/hospital/doctors" && request.method !== "GET" ||
        path === "/api/hospital/departments" && request.method !== "GET" ||
        path === "/api/hospital/services" && request.method !== "GET" ||
        path === "/api/hospital/beds" && request.method !== "GET") {
      return false
    }

    if (request.method === "GET" && (
      path === "/api/hospital/departments" ||
      path === "/api/hospital/doctors" ||
      path === "/api/hospital/availability" ||
      path === "/api/hospital/beds" ||
      path === "/api/hospital/services" ||
      path === "/api/hospital/sessions" ||
      /^\/api\/hospital\/doctors\/[^/]+\/slots$/.test(path)
    )) return true

    if ((request.method === "POST" && (
      path === "/api/hospital/patients" ||
      path === "/api/hospital/patients/identify" ||
      path === "/api/hospital/patients/bookings" ||
      path === "/api/hospital/appointments" ||
      path === "/api/hospital/chemo" ||
      path === "/api/hospital/beds/hold"
    )) || (path === "/api/hospital/beds/hold" && request.method === "DELETE")) return true

    return false
  }
  if (request.method === "GET" && (
    path === "/api/tours" || path.startsWith("/api/tours/") ||
    path === "/api/slots" || path.startsWith("/api/slots/") ||
    path === "/api/bank-accounts" || path === "/api/reviews"
  )) return true
  if (request.method === "POST" && (
    path === "/api/orders" || path === "/api/payments" || path === "/api/waitlist"
  )) return true
  return false
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Protect platform dashboard routes
  if (pathname === "/platform" || pathname.startsWith("/platform/")) {
    const staffToken = request.cookies.get(STAFF_COOKIE)?.value
    if (!staffToken) {
      const loginUrl = new URL("/admin", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }
    try {
      const session = await verifySession(staffToken)
      if (session.kind !== "staff" || !session.staffId) {
        const loginUrl = new URL("/admin", request.url)
        loginUrl.searchParams.set("redirect", pathname)
        return NextResponse.redirect(loginUrl)
      }
    } catch {
      const loginUrl = new URL("/admin", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // API Route Proxy handling
  const staffToken = request.cookies.get(STAFF_COOKIE)?.value
  const customerToken = request.cookies.get(CUSTOMER_COOKIE)?.value
  const authorization = request.headers.get("authorization")
  const bearer = authorization?.replace(/^Bearer\s+/i, "")

  const open = isPublic(request)

  for (const token of [staffToken, customerToken, bearer]) {
    if (!token) continue
    try {
      const session = await verifySession(token)
      const customerRoute = request.nextUrl.pathname.startsWith("/api/customer/")
      if (session.kind === "staff" || (customerRoute && session.kind === "customer")) {
        const headers = new Headers(request.headers)
        headers.set("x-wptour-auth-kind", session.kind)
        if (session.staffId) headers.set("x-wptour-staff-id", session.staffId)
        if (session.customerId) headers.set("x-wptour-customer-id", session.customerId)
        return NextResponse.next({ request: { headers } })
      }
    } catch {
      // An expired or forged token is not a reason to refuse a public route.
    }
  }

  if (open) return NextResponse.next()

  return NextResponse.json({ error: "Authentication required" }, { status: 401 })
}

export const config = {
  matcher: [
    "/api/:path*",
    "/platform",
    "/platform/:path*",
  ],
}
