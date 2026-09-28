import { NextRequest, NextResponse } from "next/server"
import { raw, db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { createPaymentSession } from "@/lib/amwalpay"
import { tenantOf, withTenant } from "@/lib/tenant"

export const dynamic = "force-dynamic"

function resolveOrigin(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.startsWith("http")) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/+$/, "")
  }
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
  if (host && !host.includes("127.0.0.1") && !host.includes("localhost")) {
    const proto = request.headers.get("x-forwarded-proto") || "https"
    return `${proto}://${host}`
  }
  return "https://app.fizmoh.cloud"
}

export const POST = withErrors(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}))
  const {
    tenantSlug,
    customerName,
    customerPhone,
    customerEmail,
    deliveryAddress,
    items,
    paymentMethod = "CARD_ONLINE",
    notes,
  } = body

  if (!customerName || !customerPhone) {
    return NextResponse.json({ error: "Customer name and phone number are required" }, { status: 400 })
  }

  const rawHost = (request.headers.get("host") || "").split(":")[0].toLowerCase()

  // 1. Resolve tenant
  let tenant: { id: string; slug: string; name: string; currency?: string | null } | null = null

  if (tenantSlug) {
    tenant = await raw.tenant.findFirst({
      where: { OR: [{ slug: String(tenantSlug).toLowerCase() }, { customDomain: String(tenantSlug).toLowerCase() }] },
      select: { id: true, slug: true, name: true, currency: true },
    })
  }

  if (!tenant && rawHost && rawHost !== "localhost" && rawHost !== "app.fizmoh.cloud") {
    tenant = await raw.tenant.findFirst({
      where: { customDomain: rawHost },
      select: { id: true, slug: true, name: true, currency: true },
    })
  }

  if (!tenant) {
    tenant = await raw.tenant.findFirst({
      select: { id: true, slug: true, name: true, currency: true },
    })
  }

  if (!tenant) {
    return NextResponse.json({ error: "Storefront business workspace not found" }, { status: 404 })
  }

  const itemList = Array.isArray(items) ? items : []
  const currency = tenant.currency || body.currency || "OMR"
  const totalAmount = typeof body.totalAmount === "number" && body.totalAmount > 0
    ? body.totalAmount
    : itemList.reduce((acc: number, item: any) => acc + (Number(item.price || 0) * Number(item.quantity || 1)), 0)

  const orderNum = `WB-${Math.floor(10000 + Math.random() * 90000)}`
  const cleanPhone = String(customerPhone).trim().replace(/[^0-9+]/g, "")

  // 2. Persist order record in database
  const order = await raw.kitchenOrder.create({
    data: {
      tenantId: tenant.id,
      orderNumber: orderNum,
      publicToken: `wb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      orderType: "ONLINE",
      customerName: String(customerName).trim(),
      customerPhone: cleanPhone,
      customerEmail: customerEmail ? String(customerEmail).trim() : null,
      deliveryAddress: deliveryAddress ? String(deliveryAddress).trim() : null,
      itemsJson: JSON.stringify(itemList),
      totalAmount: Number(totalAmount.toFixed(3)),
      currency,
      status: "PENDING",
      specialNotes: notes ? String(notes).trim() : null,
      subtotalAmount: Number(totalAmount.toFixed(3)),
    },
  })

  // 3. If online card payment, initiate AmwalPay session
  if (paymentMethod === "CARD_ONLINE" || paymentMethod === "AMWALPAY") {
    const tenantCtx = await tenantOf(tenant.id)
    if (tenantCtx) {
      const origin = resolveOrigin(request)
      const sessionResult = await withTenant(tenantCtx, async () => {
        return createPaymentSession({
          orderId: `KIT-${order.id}`,
          orderNumber: order.orderNumber || orderNum,
          amount: Number(totalAmount.toFixed(3)),
          currency: currency === "OMR" ? "OMR" : "OMR",
          customerName: String(customerName).trim(),
          customerEmail: customerEmail ? String(customerEmail).trim() : undefined,
          customerPhone: cleanPhone,
          description: `Online Order #${orderNum} - ${tenant?.name || "Store"}`,
          successUrl: `${origin}/api/amwalpay/return/KIT-${order.id}`,
          failureUrl: `${origin}/api/amwalpay/return/KIT-${order.id}`,
          webhookUrl: `${origin}/api/amwalpay/webhook`,
        })
      })

      if (sessionResult.success && sessionResult.paymentLinkUrl) {
        return NextResponse.json({
          ok: true,
          orderId: order.id,
          orderNumber: orderNum,
          checkoutUrl: sessionResult.paymentLinkUrl,
          paymentMethod: "CARD_ONLINE",
        })
      }
    }

    // Fallback hosted return link if payment gateway keys are in test sandbox
    const origin = resolveOrigin(request)
    return NextResponse.json({
      ok: true,
      orderId: order.id,
      orderNumber: orderNum,
      checkoutUrl: `${origin}/api/amwalpay/hosted-checkout?status=pending&ref=KIT-${order.id}&amount=${totalAmount.toFixed(3)}&currency=${currency}`,
      paymentMethod: "CARD_ONLINE",
    })
  }

  // 4. Default WhatsApp checkout
  return NextResponse.json({
    ok: true,
    orderId: order.id,
    orderNumber: orderNum,
    paymentMethod: "WHATSAPP",
  })
})
