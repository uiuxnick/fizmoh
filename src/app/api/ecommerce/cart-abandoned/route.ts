import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { db } from "@/lib/db"
import { resolveEcommerceAuth } from "@/lib/ecommerce-auth"
import { sendEcommerceNotification } from "@/lib/ecommerce-templates"

export const POST = withErrors(async (request: NextRequest) => {
  const auth = await resolveEcommerceAuth(request)
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing API key / credentials" },
      { status: 401 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const {
    cartToken,
    customerPhone,
    customerEmail,
    customerName = "Customer",
    cartTotal = 0,
    currency = "OMR",
    items = [],
    checkoutUrl,
    storeId = auth.storeId,
    metadata,
    sendImmediate = false,
  } = body

  if (!cartToken) {
    return NextResponse.json({ error: "Missing required 'cartToken'" }, { status: 400 })
  }
  if (!customerPhone) {
    return NextResponse.json({ error: "Missing required 'customerPhone'" }, { status: 400 })
  }
  if (!checkoutUrl) {
    return NextResponse.json({ error: "Missing required 'checkoutUrl'" }, { status: 400 })
  }

  const cleanPhone = customerPhone.trim()

  // 1. Check existing cart status
  const existing = await db.abandonedCheckout.findUnique({
    where: {
      tenantId_cartToken: {
        tenantId: auth.tenantId,
        cartToken: String(cartToken),
      },
    },
  }).catch(() => null)

  // If already recovered, do not revert to pending
  if (existing?.status === "RECOVERED") {
    return NextResponse.json({
      success: true,
      message: "Cart was already converted into an order",
      cartId: existing.id,
      status: "RECOVERED",
    })
  }

  // 2. Upsert the abandoned cart
  const cartRecord = await db.abandonedCheckout.upsert({
    where: {
      tenantId_cartToken: {
        tenantId: auth.tenantId,
        cartToken: String(cartToken),
      },
    },
    update: {
      customerPhone: cleanPhone,
      customerEmail: customerEmail || undefined,
      customerName: customerName || undefined,
      cartTotal: Number(cartTotal) || 0,
      currency: String(currency),
      items: Array.isArray(items) ? items : [],
      checkoutUrl: String(checkoutUrl),
      storeId: storeId || undefined,
      metadata: metadata || undefined,
      updatedAt: new Date(),
    },
    create: {
      tenantId: auth.tenantId,
      storeId: storeId || null,
      cartToken: String(cartToken),
      customerPhone: cleanPhone,
      customerEmail: customerEmail || null,
      customerName: customerName || "Customer",
      cartTotal: Number(cartTotal) || 0,
      currency: String(currency),
      items: Array.isArray(items) ? items : [],
      checkoutUrl: String(checkoutUrl),
      recoveryStage: 0,
      status: "PENDING",
      metadata: metadata || null,
    },
  })

  // 3. If immediate send requested (e.g. manual nudge or immediate test)
  let immediateResult: any = null
  if (sendImmediate) {
    let storeName = auth.storeName
    if (!storeName && storeId) {
      const store = await db.ecommerceStore.findUnique({ where: { id: storeId }, select: { name: true } }).catch(() => null)
      if (store) storeName = store.name
    }
    if (!storeName) {
      const tenant = await db.tenant.findUnique({ where: { id: auth.tenantId }, select: { name: true } }).catch(() => null)
      storeName = tenant?.name || "Our Store"
    }

    immediateResult = await sendEcommerceNotification({
      tenantId: auth.tenantId,
      storeId: storeId || null,
      eventType: "CART_ABANDONED_STEP1",
      to: cleanPhone,
      data: {
        name: customerName,
        store_name: storeName,
        item_count: Array.isArray(items) ? items.length : 1,
        total: Number(cartTotal) || 0,
        currency,
        checkout_url: checkoutUrl,
      },
    })

    if (immediateResult.success) {
      await db.abandonedCheckout.update({
        where: { id: cartRecord.id },
        data: {
          recoveryStage: 1,
          lastNotifiedAt: new Date(),
        },
      }).catch(() => null)
    }
  }

  return NextResponse.json({
    success: true,
    cartId: cartRecord.id,
    recoveryStage: cartRecord.recoveryStage,
    status: cartRecord.status,
    immediateSent: sendImmediate ? immediateResult?.success : false,
    message: sendImmediate ? "Cart recorded and Stage 1 reminder sent" : "Cart recorded for automated recovery",
  })
})

export const GET = withErrors(async (request: NextRequest) => {
  const auth = await resolveEcommerceAuth(request)
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")?.trim()
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
  const skip = (page - 1) * limit

  const where: any = { tenantId: auth.tenantId }
  if (status) where.status = status
  if (auth.storeId) where.storeId = auth.storeId

  const [carts, total, recoveredCount, pendingCount] = await Promise.all([
    db.abandonedCheckout.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
    }),
    db.abandonedCheckout.count({ where }),
    db.abandonedCheckout.count({ where: { tenantId: auth.tenantId, status: "RECOVERED" } }),
    db.abandonedCheckout.count({ where: { tenantId: auth.tenantId, status: "PENDING" } }),
  ])

  return NextResponse.json({
    carts,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    stats: {
      totalTracked: total,
      recovered: recoveredCount,
      pending: pendingCount,
      recoveryRate: total > 0 ? `${Math.round((recoveredCount / total) * 100)}%` : "0%",
    },
  })
})
