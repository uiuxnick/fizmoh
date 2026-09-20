import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { sendEcommerceNotification } from "@/lib/ecommerce-templates"

export const POST = withErrors(async (request: NextRequest) => {
  const rawBody = await request.text()
  let payload: any = {}
  try {
    payload = JSON.parse(rawBody)
  } catch {}

  const topic = request.headers.get("x-shopify-topic") || "orders/create"
  const shopDomain = request.headers.get("x-shopify-shop-domain") || ""
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256") || ""

  // Resolve tenant via query param ?workspace=<slug> or match storeUrl / settings
  const { searchParams } = new URL(request.url)
  const workspaceSlug = searchParams.get("workspace")?.trim()

  let tenantId: string | null = null
  let storeRecord: any = null

  if (workspaceSlug) {
    const t = await db.tenant.findUnique({ where: { slug: workspaceSlug }, select: { id: true } })
    if (t) tenantId = t.id
  }

  if (!tenantId && shopDomain) {
    storeRecord = await db.ecommerceStore.findFirst({
      where: {
        platform: "SHOPIFY",
        isActive: true,
        OR: [{ storeUrl: { contains: shopDomain } }, { name: { contains: shopDomain } }],
      },
    })
    if (storeRecord) tenantId = storeRecord.tenantId
  }

  if (!tenantId) {
    const current = currentTenant()
    if (current?.tenantId) tenantId = current.tenantId
  }

  if (!tenantId) {
    return NextResponse.json(
      { error: "Unrecognized workspace. Append ?workspace=<slug> to webhook URL." },
      { status: 400 },
    )
  }

  // Verify HMAC signature if webhook secret is configured
  const webhookSecret = storeRecord?.webhookSecret || process.env.SHOPIFY_WEBHOOK_SECRET
  if (webhookSecret && hmacHeader) {
    const hash = crypto.createHmac("sha256", webhookSecret).update(rawBody, "utf8").digest("base64")
    const provided = Buffer.from(hmacHeader, "utf8")
    const calculated = Buffer.from(hash, "utf8")
    const verified = provided.length === calculated.length && crypto.timingSafeEqual(provided, calculated)
    if (!verified) {
      return NextResponse.json({ error: "Invalid Shopify HMAC signature" }, { status: 401 })
    }
  }

  // 1. Log incoming event
  await db.auditLog.create({
    data: {
      tenantId,
      action: `SHOPIFY_WEBHOOK_${topic.toUpperCase().replace(/\//g, "_")}`,
      entity: "SHOPIFY",
      entityId: String(payload.id || "webhook"),
      details: { topic, shopDomain, id: payload.id },
    },
  }).catch(() => null)

  const customerPhone = payload.phone || payload.customer?.phone || payload.billing_address?.phone || payload.shipping_address?.phone
  const customerName = payload.customer?.first_name
    ? `${payload.customer.first_name} ${payload.customer.last_name || ""}`.trim()
    : payload.billing_address?.name || "Customer"

  // 2. Handle Orders (orders/create, orders/updated, orders/fulfilled, orders/cancelled)
  if (topic.startsWith("orders/")) {
    if (customerPhone) {
      const orderNumber = payload.order_number || payload.name || String(payload.id || "1001")
      const total = payload.total_price || "0.00"
      const currency = payload.currency || "OMR"
      const itemCount = Array.isArray(payload.line_items) ? payload.line_items.length : 1
      const orderUrl = payload.order_status_url || ""

      // Cancel any pending abandoned carts for this customer
      await db.abandonedCheckout.updateMany({
        where: {
          tenantId,
          customerPhone: { contains: String(customerPhone).replace(/\D/g, "").slice(-8) },
          status: "PENDING",
        },
        data: { status: "RECOVERED", recoveredAt: new Date() },
      }).catch(() => null)

      if (topic === "orders/create") {
        await sendEcommerceNotification({
          tenantId,
          storeId: storeRecord?.id,
          eventType: "ORDER_CREATED",
          to: customerPhone,
          data: {
            name: customerName,
            order_number: orderNumber,
            store_name: storeRecord?.name || "Shopify Store",
            total,
            currency,
            item_count: itemCount,
            tracking_url: orderUrl,
            order_url: orderUrl,
          },
        })
      } else if (topic === "orders/fulfilled") {
        const fulfillment = payload.fulfillments?.[0]
        const carrier = fulfillment?.tracking_company || "Courier"
        const trackingNumber = fulfillment?.tracking_number || ""
        const trackingUrl = fulfillment?.tracking_url || orderUrl

        await sendEcommerceNotification({
          tenantId,
          storeId: storeRecord?.id,
          eventType: "ORDER_SHIPPED",
          to: customerPhone,
          data: {
            name: customerName,
            order_number: orderNumber,
            store_name: storeRecord?.name || "Shopify Store",
            carrier,
            tracking_number: trackingNumber,
            tracking_url: trackingUrl,
            order_url: orderUrl,
          },
        })
      } else if (topic === "orders/cancelled") {
        await sendEcommerceNotification({
          tenantId,
          storeId: storeRecord?.id,
          eventType: "ORDER_CANCELLED",
          to: customerPhone,
          data: {
            name: customerName,
            order_number: orderNumber,
            store_name: storeRecord?.name || "Shopify Store",
          },
        })
      }
    }
  }

  // 3. Handle Abandoned Checkouts (checkouts/create, checkouts/update)
  if (topic.startsWith("checkouts/")) {
    const cartToken = payload.token || payload.cart_token || String(payload.id)
    const checkoutUrl = payload.abandoned_checkout_url || ""

    if (cartToken && customerPhone && checkoutUrl) {
      await db.abandonedCheckout.upsert({
        where: { tenantId_cartToken: { tenantId, cartToken } },
        update: {
          customerPhone,
          customerName,
          customerEmail: payload.email || undefined,
          cartTotal: Number(payload.total_price) || 0,
          currency: payload.currency || "OMR",
          items: payload.line_items || [],
          checkoutUrl,
          updatedAt: new Date(),
        },
        create: {
          tenantId,
          storeId: storeRecord?.id || null,
          cartToken,
          customerPhone,
          customerName,
          customerEmail: payload.email || null,
          cartTotal: Number(payload.total_price) || 0,
          currency: payload.currency || "OMR",
          items: payload.line_items || [],
          checkoutUrl,
          recoveryStage: 0,
          status: "PENDING",
        },
      }).catch(() => null)
    }
  }

  // 4. Handle Customer Marketing Consent / Newsletter
  if (topic.startsWith("customers/")) {
    const acceptsMarketing = payload.accepts_marketing || payload.email_marketing_consent?.state === "subscribed"
    if (acceptsMarketing && customerPhone) {
      await db.newsletterSubscriber.upsert({
        where: { tenantId_phone: { tenantId, phone: customerPhone } },
        update: {
          name: customerName,
          email: payload.email || undefined,
          consentGiven: true,
          consentTimestamp: new Date(),
          updatedAt: new Date(),
        },
        create: {
          tenantId,
          storeId: storeRecord?.id || null,
          phone: customerPhone,
          name: customerName,
          email: payload.email || null,
          source: "SHOPIFY_SYNC",
          consentGiven: true,
          welcomeSent: false,
        },
      }).catch(() => null)
    }
  }

  return NextResponse.json({ success: true, topic })
})

export const GET = withErrors(async () => {
  return NextResponse.json({ status: "Shopify Webhook Receiver Active" })
})
