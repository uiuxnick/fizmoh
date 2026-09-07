import crypto from "crypto"
import { withErrors } from "@/lib/api-handler"
import { db } from "@/lib/db"
import { sendTextMessage } from "@/lib/whatsapp"
import { NextRequest, NextResponse } from "next/server"
import { beginWebhookDelivery, finishWebhookDelivery, failWebhookDelivery } from "@/lib/webhook-delivery"
import { currentTenant } from "@/lib/tenant"
import { getConfigValue } from "@/lib/app-config"

/**
 * Inbound WooCommerce webhooks.
 *
 * This endpoint is public, and it used to trust whatever arrived. It named no
 * workspace, so everything it wrote — an audit row per delivery — belonged to
 * nobody: 981 such rows had accumulated, 482 of them "product updated" from a
 * store that is not configured here at all. And it checked no signature while
 * sending a WhatsApp message to whatever phone number appeared in the payload,
 * so anyone who could POST here could have this platform message anybody.
 *
 * Two things are required now. The URL has to say which workspace it is for,
 * because one hostname serves all of them and nothing else in a WooCommerce
 * delivery identifies the business. And the delivery has to be signed with
 * that workspace's secret, which is what makes it a WooCommerce delivery
 * rather than an anonymous POST.
 *
 * The webhook URL to give WooCommerce is therefore:
 *   https://app.fizmoh.cloud/api/woocommerce/webhook?workspace=<slug>
 */
export const POST = withErrors(async (request: NextRequest) => {
  const rawBody = await request.text()
  let payload: any = {}
  try {
    payload = JSON.parse(rawBody)
  } catch {}

  const topic = request.headers.get("x-wc-webhook-topic") || payload.event || "order.created"

  // A ping carries no signature and belongs to no order. Answered before
  // anything else so "Test delivery" in WooCommerce still succeeds.
  if (topic.includes("ping") || payload.webhook_id) {
    return NextResponse.json({ success: true, message: "WooCommerce Webhook Active" })
  }

  const tenant = currentTenant()
  if (!tenant?.tenantId) {
    console.error("[woocommerce] refused a delivery that named no workspace")
    return NextResponse.json(
      { error: "Add ?workspace=<your-workspace> to the webhook URL." },
      { status: 400 },
    )
  }

  /*
   * Signed by the store, or refused.
   *
   * WooCommerce sends base64(HMAC-SHA256(body, secret)). Compared in constant
   * time: a comparison that returns early leaks, one character at a time, how
   * much of a guess was right.
   */
  const secret = (await getConfigValue("woocommerce_webhook_secret")).trim()
  if (!secret) {
    console.error("[woocommerce] refused a delivery: no webhook secret is set for", tenant.slug)
    return NextResponse.json(
      { error: "This workspace has no WooCommerce webhook secret configured." },
      { status: 503 },
    )
  }

  const signature = request.headers.get("x-wc-webhook-signature") ?? ""
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64")
  const provided = Buffer.from(signature, "utf8")
  const computed = Buffer.from(expected, "utf8")
  const signed =
    provided.length === computed.length && crypto.timingSafeEqual(provided, computed)

  if (!signed) {
    console.error("[woocommerce] refused a delivery with a bad signature for", tenant.slug)
    return NextResponse.json({ error: "Signature did not match" }, { status: 401 })
  }

  const replay = request.headers.get("x-fizmoh-replay") === process.env.CRON_SECRET
  const delivery = replay ? null : await beginWebhookDelivery({ provider: "WOOCOMMERCE", eventType: String(topic), externalId: payload.id ? String(payload.id) : null, payload }).catch(() => null)

  // Log incoming WooCommerce webhook event
  await db.auditLog.create({
    data: {
      action: `WOOCOMMERCE_WEBHOOK_${String(topic).toUpperCase().replace(/\./g, "_")}`,
      entity: "WOOCOMMERCE",
      entityId: String(payload.id || "webhook"),
      details: {
        topic,
        id: payload.id,
        status: payload.status,
        total: payload.total,
        billing: payload.billing,
      },
    },
  }).catch(() => {})

  const phone = payload.billing?.phone || payload.shipping?.phone
  if (phone) {
    const customerName = `${payload.billing?.first_name || ""} ${payload.billing?.last_name || ""}`.trim() || "Customer"
    const orderNum = payload.number || payload.id || "WC-1001"
    const total = payload.total ? `${payload.total} ${payload.currency || "OMR"}` : "Paid"

    // Automated WhatsApp message send for WooCommerce purchase
    await sendTextMessage(
      phone,
      `🛒 *WooCommerce Order Confirmation*\n\nHi ${customerName}, thank you for your order #${orderNum}! Total: ${total}.\n\nWe will update you here on WhatsApp as your order is processed.`,
    ).catch(() => {})
  }

  if (delivery) await finishWebhookDelivery(delivery.id, { success: true, topic }).catch(error => failWebhookDelivery(delivery.id, error, false).catch(() => {}))
  return NextResponse.json({ success: true, receivedTopic: topic })
})

export const GET = withErrors(async () => {
  return NextResponse.json({ status: "WooCommerce Webhook Endpoint Active" })
})
