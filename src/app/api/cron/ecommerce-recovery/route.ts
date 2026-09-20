import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { db } from "@/lib/db"
import { sendEcommerceNotification } from "@/lib/ecommerce-templates"

export const GET = withErrors(async (request: NextRequest) => {
  const authHeader = request.headers.get("authorization") || request.headers.get("x-cron-secret")
  const isAuthorized =
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    authHeader === process.env.CRON_SECRET ||
    process.env.NODE_ENV !== "production"

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized cron execution" }, { status: 401 })
  }

  const now = new Date()
  const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000)
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000)

  let stage1Count = 0
  let stage2Count = 0
  let stage3Count = 0

  // 1. Stage 1: Carts abandoned >= 15 minutes ago, never notified
  const stage1Carts = await db.abandonedCheckout.findMany({
    where: {
      status: "PENDING",
      recoveryStage: 0,
      createdAt: { lte: fifteenMinsAgo, gte: seventyTwoHoursAgo },
    },
    take: 50,
  })

  for (const cart of stage1Carts) {
    const res = await sendEcommerceNotification({
      tenantId: cart.tenantId,
      storeId: cart.storeId,
      eventType: "CART_ABANDONED_STEP1",
      to: cart.customerPhone,
      data: {
        name: cart.customerName || "there",
        item_count: Array.isArray(cart.items) ? cart.items.length : 1,
        total: String(cart.cartTotal),
        currency: cart.currency,
        checkout_url: cart.checkoutUrl,
      },
    }).catch(() => null)

    if (res?.success) {
      await db.abandonedCheckout.update({
        where: { id: cart.id },
        data: { recoveryStage: 1, lastNotifiedAt: new Date() },
      }).catch(() => null)
      stage1Count++
    }
  }

  // 2. Stage 2: Carts in Stage 1 notified >= 4 hours ago
  const stage2Carts = await db.abandonedCheckout.findMany({
    where: {
      status: "PENDING",
      recoveryStage: 1,
      lastNotifiedAt: { lte: fourHoursAgo },
    },
    take: 50,
  })

  for (const cart of stage2Carts) {
    const coupon = "SAVE10"
    const checkoutWithCoupon = cart.checkoutUrl.includes("?")
      ? `${cart.checkoutUrl}&coupon=${coupon}`
      : `${cart.checkoutUrl}?coupon=${coupon}`

    const res = await sendEcommerceNotification({
      tenantId: cart.tenantId,
      storeId: cart.storeId,
      eventType: "CART_ABANDONED_STEP2",
      to: cart.customerPhone,
      data: {
        name: cart.customerName || "there",
        coupon_code: coupon,
        checkout_url: cart.checkoutUrl,
        checkout_url_with_coupon: checkoutWithCoupon,
      },
    }).catch(() => null)

    if (res?.success) {
      await db.abandonedCheckout.update({
        where: { id: cart.id },
        data: { recoveryStage: 2, lastNotifiedAt: new Date() },
      }).catch(() => null)
      stage2Count++
    }
  }

  // 3. Stage 3: Carts in Stage 2 notified >= 20 hours ago (total ~24h)
  const stage3Carts = await db.abandonedCheckout.findMany({
    where: {
      status: "PENDING",
      recoveryStage: 2,
      lastNotifiedAt: { lte: twentyFourHoursAgo },
    },
    take: 50,
  })

  for (const cart of stage3Carts) {
    const res = await sendEcommerceNotification({
      tenantId: cart.tenantId,
      storeId: cart.storeId,
      eventType: "CART_ABANDONED_STEP3",
      to: cart.customerPhone,
      data: {
        name: cart.customerName || "there",
        checkout_url: cart.checkoutUrl,
      },
    }).catch(() => null)

    if (res?.success) {
      await db.abandonedCheckout.update({
        where: { id: cart.id },
        data: { recoveryStage: 3, lastNotifiedAt: new Date() },
      }).catch(() => null)
      stage3Count++
    }
  }

  // 4. Mark carts older than 72 hours as EXPIRED
  const expired = await db.abandonedCheckout.updateMany({
    where: {
      status: "PENDING",
      recoveryStage: 3,
      lastNotifiedAt: { lte: seventyTwoHoursAgo },
    },
    data: { status: "EXPIRED" },
  }).catch(() => ({ count: 0 }))

  return NextResponse.json({
    success: true,
    processed: {
      stage1Count,
      stage2Count,
      stage3Count,
      expiredCount: expired.count,
    },
    timestamp: now.toISOString(),
  })
})
