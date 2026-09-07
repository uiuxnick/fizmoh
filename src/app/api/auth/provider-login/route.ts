import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { setSessionCookie, signSession } from "@/lib/auth"
import { checkRateLimit, requestIp } from "@/lib/rate-limit"
import { withErrors } from "@/lib/api-handler"
import { verifyAppleToken, verifyGoogleToken } from "@/lib/identity-tokens"
import { z } from "zod"

/**
 * Signing in with Google or Apple.
 *
 * A verified token proves who somebody is. It does not make them staff. The
 * account must already exist here and be active, or anybody with a Gmail
 * address could sign into this inbox — which is the failure mode that makes
 * "sign in with Google" a security hole rather than a convenience.
 *
 * Nothing is created here for the same reason. An unknown address is turned
 * away with the same words whether or not it is close to a real one.
 */

const schema = z.object({
  provider: z.enum(["google", "apple"]),
  idToken: z.string().min(20).max(8000),
})

export const POST = withErrors(async (request: NextRequest) => {
  const ip = requestIp(request.headers)
  const rate = checkRateLimit(`provider-login:${ip}`, 12, 15 * 60 * 1000)
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    )
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
  const { provider, idToken } = parsed.data

  let identity
  try {
    identity =
      provider === "google" ? await verifyGoogleToken(idToken) : await verifyAppleToken(idToken)
  } catch (error) {
    // The reason is logged, not returned: telling a caller precisely why their
    // forged token failed is telling them how to forge a better one.
    console.error(`${provider} token rejected:`, (error as Error).message)
    return NextResponse.json({ error: "That sign-in could not be verified" }, { status: 401 })
  }

  if (!identity.emailVerified) {
    // An unverified address can be claimed by somebody who does not own it.
    return NextResponse.json(
      { error: "That account's email address is not verified" },
      { status: 403 },
    )
  }

  const staff = await db.staff.findUnique({ where: { email: identity.email } })
  if (!staff) {
    return NextResponse.json(
      { error: "There is no FizMoh account for that address. Ask an admin to add you." },
      { status: 403 },
    )
  }
  if (!staff.isActive) {
    return NextResponse.json(
      { error: "Account is deactivated. Contact super admin." },
      { status: 403 },
    )
  }

  const token = await signSession(
    { kind: "staff", staffId: staff.id, email: staff.email, role: staff.role },
    "8h",
  )
  const response = NextResponse.json({
    token,
    staff: {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      phone: staff.phone,
    },
  })
  setSessionCookie(response, "staff", token)
  return response
})
