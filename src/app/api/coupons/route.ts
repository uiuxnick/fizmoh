import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"

/**
 * Coupons API
 * Per BRD §6.1: "Coupon/discount code and promotional pricing support"
 * Per BRD §6.8: "Coupons & Promotions: discount codes, seasonal offers, referral codes"
 */

export const GET = withErrors(async () => {
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json({ coupons })
})

export const POST = withErrors(async (request: NextRequest) => {
  const body = await request.json()
  const coupon = await db.coupon.create({
    data: {
      code: body.code.toUpperCase(),
      type: body.type, // PERCENTAGE or FIXED
      value: parseFloat(body.value),
      maxUses: parseInt(body.maxUses) || 100,
      validFrom: new Date(body.validFrom),
      validTo: body.validTo ? new Date(body.validTo) : null,
      minOrderAmount: body.minOrderAmount ? parseFloat(body.minOrderAmount) : null,
      isActive: body.isActive ?? true,
    },
  })
  return NextResponse.json({ coupon }, { status: 201 })
})
