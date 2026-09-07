import { createHmac, timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { setSessionCookie, signSession } from "@/lib/auth"
import { checkRateLimit, requestIp } from "@/lib/rate-limit"
import { withErrors } from "@/lib/api-handler"
import { PLATFORM } from "@/lib/tenant"
import { currentTenant } from "@/lib/tenant-context"

function hashOtp(phone: string, otp: string) {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET
  if (!secret) throw new Error("OTP_SECRET or JWT_SECRET must be configured")
  return createHmac("sha256", secret).update(`${phone}:${otp}`).digest("hex")
}

export const POST = withErrors(async (request: NextRequest) => {
  const ip = requestIp(request.headers)
  const rate = checkRateLimit(`otp-verify:${ip}`, 10, 15 * 60 * 1000)
  if (!rate.allowed) return NextResponse.json({ error: "Too many verification attempts" }, { status: 429 })

  let body: { phone?: unknown; otp?: unknown }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
  if (typeof body.phone !== "string" || typeof body.otp !== "string" || !/^\d{6}$/.test(body.otp)) {
    return NextResponse.json({ error: "Phone and six-digit OTP required" }, { status: 400 })
  }
  // Same reasoning as /api/auth/otp: Customer.phone is unique per tenant, not
  // across the installation, so resolving the customer below with no
  // workspace in scope would pick whichever tenant's row happens to match —
  // handing that tenant's order history, loyalty points and consent log to
  // whoever holds the phone number, regardless of which business they meant
  // to sign into.
  if (!currentTenant()) {
    return NextResponse.json({ error: "A workspace is required to sign in" }, { status: 400 })
  }

  const phone = body.phone.replace(/[\s()-]/g, "")
  const stored = await db.systemSetting.findUnique({ where: { tenantId_key: { tenantId: PLATFORM, key: `otp_${phone}` } } })
  if (!stored) return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 })

  let record: { hash: string; expiresAt: number; attempts: number }
  try { record = JSON.parse(stored.value) } catch {
    await db.systemSetting.delete({ where: { id: stored.id } }).catch(() => {})
    return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 })
  }
  if (record.expiresAt < Date.now() || record.attempts >= 5) {
    await db.systemSetting.delete({ where: { id: stored.id } }).catch(() => {})
    return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 })
  }

  const actual = Buffer.from(hashOtp(phone, body.otp), "hex")
  const expected = Buffer.from(record.hash, "hex")
  const valid = actual.length === expected.length && timingSafeEqual(actual, expected)
  if (!valid) {
    record.attempts += 1
    await db.systemSetting.update({ where: { id: stored.id }, data: { value: JSON.stringify(record) } })
    return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 })
  }

  await db.systemSetting.delete({ where: { id: stored.id } }).catch(() => {})
  const customer = await db.customer.findFirst({ where: { phone } })
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 })

  const token = await signSession({ kind: "customer", customerId: customer.id, phone: customer.phone }, "7d")
  const response = NextResponse.json({
    token,
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      loyaltyTier: customer.loyaltyTier,
      loyaltyPoints: customer.loyaltyPoints,
    },
  })
  setSessionCookie(response, "customer", token)
  return response
})
