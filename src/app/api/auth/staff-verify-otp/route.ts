import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { setSessionCookie, signSession } from "@/lib/auth"
import { checkRateLimit, requestIp } from "@/lib/rate-limit"
import { verifyOtp } from "@/lib/otp"
import { z } from "zod"

const schema = z.object({
  identifier: z.string().trim().min(3).max(254),
  otp: z.string().trim().regex(/^\d{6}$/),
})

/** Exchanges a valid code for a session, exactly as a password would. */
export const POST = withErrors(async (request: NextRequest) => {
  const rate = checkRateLimit(`staff-verify:${requestIp(request.headers)}`, 10, 15 * 60 * 1000)
  if (!rate.allowed) return NextResponse.json({ error: "Too many attempts" }, { status: 429 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Enter the six-digit code" }, { status: 400 })

  const inputStr = parsed.data.identifier.trim()
  const identifier = inputStr.toLowerCase()
  const cleanDigits = inputStr.replace(/\D/g, "")

  const staff = await raw.staff.findFirst({
    where: {
      isActive: true,
      OR: [
        { email: identifier },
        ...(cleanDigits ? [
          { phone: { contains: cleanDigits } },
          { phone: `+${cleanDigits}` },
          { phone: cleanDigits },
        ] : []),
      ],
    },
  })
  // The same answer as a wrong code, so this cannot be used to find out which
  // accounts are real.
  if (!staff) return NextResponse.json({ error: "That code is not valid" }, { status: 400 })

  const ok = await verifyOtp(`staff_otp_${staff.id}`, staff.id, parsed.data.otp)
  if (!ok) return NextResponse.json({ error: "That code is not valid" }, { status: 400 })

  const token = await signSession({ kind: "staff", staffId: staff.id, role: staff.role }, "30d")
  const response = NextResponse.json({
    token,
    staff: { id: staff.id, name: staff.name, email: staff.email, role: staff.role, phone: staff.phone, avatar: staff.avatar },
  })
  setSessionCookie(response, "staff", token)
  return response
})
