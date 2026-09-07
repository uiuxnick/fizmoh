import { NextRequest, NextResponse } from "next/server"
import { compare } from "bcryptjs"
import { db } from "@/lib/db"
import { setSessionCookie, signSession } from "@/lib/auth"
import { checkRateLimit, requestIp } from "@/lib/rate-limit"
import { withErrors } from "@/lib/api-handler"

export const POST = withErrors(async (request: NextRequest) => {
  const ip = requestIp(request.headers)
  const rate = checkRateLimit(`admin-login:${ip}`, 8, 15 * 60 * 1000)
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    )
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
  const { email, password } = body as { email?: unknown; password?: unknown }
  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const staff = await db.staff.findUnique({ where: { email: normalizedEmail } })
  const passwordValid = staff?.passwordHash?.startsWith("$2")
    ? await compare(password, staff.passwordHash).catch(() => false)
    : false

  if (!staff || !passwordValid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  }
  if (!staff.isActive) {
    return NextResponse.json({ error: "Account is deactivated. Contact super admin." }, { status: 403 })
  }

  const token = await signSession({
    kind: "staff",
    staffId: staff.id,
    email: staff.email,
    role: staff.role,
  }, "30d")
  const response = NextResponse.json({
    token,
    staff: { id: staff.id, name: staff.name, email: staff.email, role: staff.role, phone: staff.phone },
  })
  setSessionCookie(response, "staff", token)
  return response
})
