import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { setSessionCookie, signSession } from "@/lib/auth"
import { verifyAndConsumeMagicToken } from "@/lib/otp"
import { checkRateLimit, requestIp } from "@/lib/rate-limit"

function getBaseUrl(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host")
  const host = forwardedHost || request.headers.get("host")
  if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
    const proto = request.headers.get("x-forwarded-proto") || "https"
    return `${proto}://${host}`
  }
  return process.env.NEXT_PUBLIC_APP_URL || "https://app.fizmoh.cloud"
}

/**
 * One-Click Magic Login for Staff / Administrators.
 *
 * When an operator clicks "⚡ Sign In with 1-Click" in their verification email,
 * this endpoint consumes the single-use token, issues a session JWT, sets the
 * HTTP-only cookie, and redirects them straight into their dashboard.
 */
export const GET = withErrors(async (request: NextRequest) => {
  const baseUrl = getBaseUrl(request)
  const rate = checkRateLimit(`magic-login:${requestIp(request.headers)}`, 15, 15 * 60 * 1000)
  if (!rate.allowed) {
    return NextResponse.redirect(new URL("/login?error=too_many_attempts", baseUrl))
  }

  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", baseUrl))
  }

  const staffId = await verifyAndConsumeMagicToken(token)
  if (!staffId) {
    return NextResponse.redirect(new URL("/login?error=invalid_or_expired_magic_link", baseUrl))
  }

  const staff = await raw.staff.findUnique({
    where: { id: staffId },
  })

  if (!staff || !staff.isActive) {
    return NextResponse.redirect(new URL("/login?error=account_not_found", baseUrl))
  }

  const sessionToken = await signSession(
    { kind: "staff", staffId: staff.id, role: staff.role },
    "30d"
  )

  const isPlatformOperator =
    (staff.role === "SUPER_ADMIN" && (!staff.tenantId || staff.tenantId === "")) ||
    staff.email === "uiuxnick@gmail.com"

  const destination = isPlatformOperator ? "/platform" : "/admin"
  const redirectUrl = new URL(destination, baseUrl)
  redirectUrl.searchParams.set("signed_in", "1")

  const response = NextResponse.redirect(redirectUrl)
  setSessionCookie(response, "staff", sessionToken)
  return response
})

export const POST = withErrors(async (request: NextRequest) => {
  const rate = checkRateLimit(`magic-login-post:${requestIp(request.headers)}`, 15, 15 * 60 * 1000)
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const token = typeof body?.token === "string" ? body.token.trim() : null
  if (!token) {
    return NextResponse.json({ error: "Missing authentication token" }, { status: 400 })
  }

  const staffId = await verifyAndConsumeMagicToken(token)
  if (!staffId) {
    return NextResponse.json({ error: "That 1-click login link has expired or has already been used." }, { status: 400 })
  }

  const staff = await raw.staff.findUnique({
    where: { id: staffId },
  })

  if (!staff || !staff.isActive) {
    return NextResponse.json({ error: "Account not found or deactivated." }, { status: 400 })
  }

  const sessionToken = await signSession(
    { kind: "staff", staffId: staff.id, role: staff.role },
    "30d"
  )

  const response = NextResponse.json({
    token: sessionToken,
    staff: {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      phone: staff.phone,
      avatar: staff.avatar,
    },
  })
  setSessionCookie(response, "staff", sessionToken)
  return response
})
