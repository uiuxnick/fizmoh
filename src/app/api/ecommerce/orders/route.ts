import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { db } from "@/lib/db"
import { resolveEcommerceAuth } from "@/lib/ecommerce-auth"
import { EcommerceEventType, sendEcommerceNotification } from "@/lib/ecommerce-templates"

export const POST = withErrors(async (request: NextRequest) => {
  const auth = await resolveEcommerceAuth(request)
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing API key / credentials" },
      { status: 401 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const { eventType = "ORDER_CREATED", order, storeId = auth.storeId } = body

  if (!order || typeof order !== "object") {
    return NextResponse.json({ error: "Missing required 'order' object in payload" }, { status: 400 })
  }

  const customerPhone = String(order.customerPhone || order.billing?.phone || order.shipping?.phone || "").trim()
  if (!customerPhone) {
    return NextResponse.json({ error: "Order must include customerPhone" }, { status: 400 })
  }

  const customerName = String(
    order.customerName ||
    `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim() ||
    order.name ||
    "Valued Customer",
  ).trim()

  const orderNumber = String(order.orderNumber || order.orderId || order.number || order.id || "1001").trim()
  const total = String(order.total || order.total_price || "0.00").trim()
  const currency = String(order.currency || "OMR").trim()
  const itemCount = Number(order.itemCount || (Array.isArray(order.line_items) ? order.line_items.length : 1))
  const carrier = String(order.carrier || order.shipping_lines?.[0]?.title || "Courier").trim()
  const trackingNumber = String(order.trackingNumber || order.tracking_number || "").trim()
  const trackingUrl = String(order.trackingUrl || order.tracking_url || "").trim()
  const orderUrl = String(order.orderUrl || order.order_status_url || "").trim()

  // 1. Upsert / update customer in CRM
  await db.customer.upsert({
    where: { tenantId_phone: { tenantId: auth.tenantId, phone: customerPhone } },
    update: {
      name: customerName !== "Valued Customer" ? customerName : undefined,
      email: order.customerEmail || undefined,
      lastContactAt: new Date(),
    },
    create: {
      tenantId: auth.tenantId,
      phone: customerPhone,
      name: customerName,
      email: order.customerEmail || null,
      source: "ECOMMERCE",
    },
  }).catch(() => null)

  // 2. Auto-recover any matching pending abandoned carts for this customer
  await db.abandonedCheckout.updateMany({
    where: {
      tenantId: auth.tenantId,
      customerPhone: { contains: customerPhone.replace(/\D/g, "").slice(-8) },
      status: "PENDING",
    },
    data: {
      status: "RECOVERED",
      recoveredAt: new Date(),
    },
  }).catch(() => null)

  // 3. Resolve store name for message branding
  let storeName = auth.storeName
  if (!storeName && storeId) {
    const store = await db.ecommerceStore.findUnique({ where: { id: storeId }, select: { name: true } }).catch(() => null)
    if (store) storeName = store.name
  }
  if (!storeName) {
    const tenant = await db.tenant.findUnique({ where: { id: auth.tenantId }, select: { name: true } }).catch(() => null)
    storeName = tenant?.name || "Our Store"
  }

  // 4. Dispatch WhatsApp notification using template engine (default button template or custom mapped)
  const templateData: Record<string, any> = {
    name: customerName,
    order_number: orderNumber,
    store_name: storeName,
    total,
    currency,
    item_count: itemCount,
    carrier,
    tracking_number: trackingNumber,
    tracking_url: trackingUrl || orderUrl,
    order_url: orderUrl,
  }

  const sendResult = await sendEcommerceNotification({
    tenantId: auth.tenantId,
    storeId: storeId || null,
    eventType: eventType as EcommerceEventType,
    to: customerPhone,
    data: templateData,
  })

  // 5. Create audit trail
  await db.auditLog.create({
    data: {
      tenantId: auth.tenantId,
      action: `ECOMMERCE_${eventType}`,
      entity: "ORDER",
      entityId: orderNumber,
      details: {
        customerPhone,
        customerName,
        total,
        currency,
        sendSuccess: sendResult.success,
        usedCustomTemplate: sendResult.usedCustomTemplate,
        messageId: sendResult.messageId,
      },
    },
  }).catch(() => null)

  return NextResponse.json({
    success: true,
    eventType,
    orderNumber,
    customerPhone,
    notificationSent: sendResult.success,
    messageId: sendResult.messageId,
    usedCustomTemplate: sendResult.usedCustomTemplate,
    error: sendResult.error,
  })
})

export const GET = withErrors(async () => {
  return NextResponse.json({
    status: "active",
    endpoint: "Fizmoh E-Commerce Orders Ingestion API",
    supportedEvents: [
      "ORDER_CREATED",
      "ORDER_PROCESSING",
      "ORDER_SHIPPED",
      "ORDER_DELIVERED",
      "ORDER_CANCELLED",
    ],
  })
})
