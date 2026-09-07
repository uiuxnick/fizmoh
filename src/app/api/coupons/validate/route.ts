import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { checkRateLimit, requestIp } from "@/lib/rate-limit"
import { withErrors } from "@/lib/api-handler"
import { currentTenant } from "@/lib/tenant-context"

/**
 * Validate a coupon code at checkout
 * Per BRD §6.1: "Coupon/discount code and promotional pricing support"
 */
export const POST = withErrors(async (request: NextRequest) => {
  // Without a cap this endpoint is a discount-code oracle: unlimited guesses,
  // each answer telling the caller whether a code is real and what it is worth.
  const rate = checkRateLimit(`coupon:${requestIp(request.headers)}`, 20, 10 * 60 * 1000)
  if (!rate.allowed) return NextResponse.json({ error: "Too many attempts, please wait" }, { status: 429 })

  // Coupon.code is unique per tenant, not across the installation — two
  // businesses can each have their own "SUMMER10". A lookup with no
  // workspace in scope matches whichever tenant's row comes back first,
  // leaking that tenant's discount terms and possibly applying the wrong
  // discount at checkout.
  if (!currentTenant()) {
    return NextResponse.json({ valid: false, error: "A workspace is required" }, { status: 400 })
  }

  const body = await request.json()
  const { code, orderAmount } = body

  const coupon = await db.coupon.findFirst({ where: { code: code.toUpperCase() } })
  if (!coupon) return NextResponse.json({ valid: false, error: "Invalid coupon code" }, { status: 400 })

  if (!coupon.isActive) return NextResponse.json({ valid: false, error: "Coupon is no longer active" }, { status: 400 })

  const now = new Date()
  if (now < coupon.validFrom) return NextResponse.json({ valid: false, error: "Coupon not yet valid" }, { status: 400 })
  if (coupon.validTo && now > coupon.validTo) return NextResponse.json({ valid: false, error: "Coupon has expired" }, { status: 400 })

  if (coupon.usedCount >= coupon.maxUses) return NextResponse.json({ valid: false, error: "Coupon usage limit reached" }, { status: 400 })

  if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
    return NextResponse.json({ valid: false, error: `Minimum order amount is ${coupon.minOrderAmount} OMR` }, { status: 400 })
  }

  const discount = coupon.type === "PERCENTAGE"
    ? (orderAmount * coupon.value) / 100
    : coupon.value

  return NextResponse.json({
    valid: true,
    coupon,
    discount,
    discountedTotal: Math.max(0, orderAmount - discount),
  })
})
