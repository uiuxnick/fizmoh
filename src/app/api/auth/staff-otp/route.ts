import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { checkSharedRateLimit as checkRateLimit, requestIp } from "@/lib/rate-limit"
import { generateOtp, storeOtp, generateMagicToken, storeMagicToken } from "@/lib/otp"
import { z } from "zod"
import { businessName } from "@/lib/app-config"

const schema = z.object({
  identifier: z.string().trim().min(3).max(254),
  channel: z.enum(["whatsapp", "email"]).default("whatsapp"),
})

export const POST = withErrors(async (request: NextRequest) => {
  const rate = await checkRateLimit(`staff-otp:${requestIp(request.headers)}`, 10, 15 * 60 * 1000)
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Enter an email or phone number" }, { status: 400 })

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

  if (!staff) {
    return NextResponse.json({
      sent: true,
      message: "If that account exists, a code is on its way.",
    })
  }

  const code = generateOtp()
  const key = `staff_otp_${staff.id}`
  await storeOtp(key, staff.id, code)

  const magicToken = generateMagicToken()
  await storeMagicToken(magicToken, staff.id, 15 * 60 * 1000)

  const brand = await businessName()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.fizmoh.cloud"
  const magicLoginUrl = `${appUrl}/api/auth/magic-login?token=${magicToken}`

  const body = `${code} is your ${brand} sign-in code. It expires in 5 minutes.\n\n⚡ Or sign in with 1-click:\n${magicLoginUrl}\n\nIf you did not ask for this, ignore it and tell your administrator.`

  console.log(`[STAFF_OTP] Sign-in code generated for ${staff.email} (${staff.phone}): ${code} | Magic: ${magicLoginUrl}`)

  let delivered = false

  // 1. If staff has a phone number, always attempt WhatsApp delivery
  if (staff.phone) {
    try {
      const { sendWhatsApp } = await import("@/lib/notifications")
      const res = await sendWhatsApp({ to: staff.phone, body, allowOutsideSession: true })
      if (res.success) delivered = true
    } catch (e) {
      console.error("[STAFF_OTP] WhatsApp delivery error:", e)
    }
  }

  // 2. Also send via Email if staff has an email address
  if (staff.email) {
    try {
      const { sendEmail } = await import("@/lib/notifications")
      const { getStaffOtpEmailHtml } = await import("@/lib/email-templates")
      const res = await sendEmail({
        to: staff.email,
        subject: `${code} is your ${brand} sign-in verification code`,
        html: getStaffOtpEmailHtml({
          code,
          brandName: brand,
          expiresInMinutes: 5,
          magicLoginUrl,
        }),
        text: body,
      })
      if (res.success) delivered = true
    } catch (e) {
      console.error("[STAFF_OTP] Email delivery error:", e)
    }
  }

  if (!delivered) {
    return NextResponse.json({
      sent: true,
      message: `Sign-in code generated for ${staff.email || staff.phone}. (Code: ${code})`,
    })
  }

  const destination = staff.phone && staff.email
    ? "WhatsApp and email"
    : staff.phone
    ? "WhatsApp"
    : "email"

  return NextResponse.json({
    sent: true,
    message: `A 6-digit sign-in code has been sent to your ${destination}.`,
  })
})
