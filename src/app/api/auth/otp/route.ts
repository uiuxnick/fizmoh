import { createHmac, randomInt } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { checkRateLimit, requestIp } from "@/lib/rate-limit"
import { withErrors } from "@/lib/api-handler"
import { PLATFORM } from "@/lib/tenant"
import { currentTenant } from "@/lib/tenant-context"
import { businessName } from "@/lib/app-config"

function normalizePhone(value: string) {
  const phone = value.replace(/[\s()-]/g, "")
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null
}

function hashOtp(phone: string, otp: string) {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET
  if (!secret) throw new Error("OTP_SECRET or JWT_SECRET must be configured")
  return createHmac("sha256", secret).update(`${phone}:${otp}`).digest("hex")
}

export const POST = withErrors(async (request: NextRequest) => {
  const ip = requestIp(request.headers)
  const rate = checkRateLimit(`otp:${ip}`, 5, 15 * 60 * 1000)
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many OTP requests" }, {
      status: 429,
      headers: { "Retry-After": String(rate.retryAfter) },
    })
  }

  let body: { phone?: unknown }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
  const phone = typeof body.phone === "string" ? normalizePhone(body.phone) : null
  if (!phone) return NextResponse.json({ error: "Valid international phone number required" }, { status: 400 })

  // Customer.phone is only unique per tenant (the same person can deal with
  // two businesses on this installation) — a lookup with no workspace in
  // scope would match whichever tenant's row Postgres returns first and text
  // a login code to the wrong business's customer. The caller must say which
  // workspace it's signing into (?workspace=/x-fizmoh-workspace, same as any
  // other public storefront request), which is what puts a tenant in scope
  // here via withErrors.
  if (!currentTenant()) {
    return NextResponse.json({ error: "A workspace is required to sign in" }, { status: 400 })
  }

  let customer = await db.customer.findFirst({ where: { phone } })
  if (!customer) customer = await db.customer.create({ data: { phone, whatsappOptIn: true } })

  const otp = randomInt(100000, 1000000).toString()
  const record = JSON.stringify({ hash: hashOtp(phone, otp), expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 })
  await db.systemSetting.upsert({
    where: { tenantId_key: { tenantId: PLATFORM, key: `otp_${phone}` } },
    update: { value: record, type: "JSON", category: "AUTH" },
    create: { key: `otp_${phone}`, value: record, type: "JSON", category: "AUTH" },
  })

  const { sendWhatsApp } = await import("@/lib/notifications")
  const sent = await sendWhatsApp({
    to: phone,
    body: `Your ${await businessName()} verification code is: ${otp}\n\nThis code expires in 5 minutes. Do not share it with anyone.`,
  })
  if (!sent.success) {
    await db.systemSetting.deleteMany({ where: { key: `otp_${phone}` } }).catch(() => {})
    return NextResponse.json({ error: "OTP delivery is temporarily unavailable" }, { status: 503 })
  }

  return NextResponse.json({ success: true, message: "OTP sent via WhatsApp" })
})
