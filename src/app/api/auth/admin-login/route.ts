import { NextRequest, NextResponse } from "next/server"
import { compare } from "bcryptjs"
import { db } from "@/lib/db"
import { setSessionCookie, signSession } from "@/lib/auth"
import { checkSharedRateLimit as checkRateLimit, requestIp } from "@/lib/rate-limit"
import { withErrors } from "@/lib/api-handler"

export const OPTIONS = withErrors(async () => new NextResponse(null, { status: 204 }))

export const POST = withErrors(async (request: NextRequest) => {
  const ip = requestIp(request.headers)
  const rate = await checkRateLimit(`admin-login:${ip}`, 8, 15 * 60 * 1000)
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
  const { email, identifier, password } = body as { email?: unknown; identifier?: unknown; password?: unknown }
  const rawId = (typeof email === "string" && email.trim()) ? email.trim() : (typeof identifier === "string" && identifier.trim()) ? identifier.trim() : ""
  if (!rawId || typeof password !== "string" || !password) {
    return NextResponse.json({ error: "Email or phone number and password required" }, { status: 400 })
  }

  const normalizedInput = rawId.toLowerCase()
  const cleanDigits = rawId.replace(/\D/g, "")
  const staff = await db.staff.findFirst({
    where: {
      isActive: true,
      OR: [
        { email: normalizedInput },
        ...(cleanDigits ? [
          { phone: { contains: cleanDigits } },
          { phone: `+${cleanDigits}` },
          { phone: cleanDigits },
        ] : []),
      ],
    },
  })
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
