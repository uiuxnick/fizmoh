import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { tenantOf, withTenant, PLATFORM } from "@/lib/tenant"
import {
  verifyPaymobWebhookHmac,
  parsePaymobWebhook,
  paymobConfig,
  platformPaymobConfig,
} from "@/lib/paymob"
import { settlePaymobTransaction } from "@/lib/paymob-settle"
import { withErrors } from "@/lib/api-handler"

/**
 * Paymob Asynchronous Webhook Handler
 *
 * Route: POST /api/paymob/webhook
 *
 * Receives server-to-server transaction notifications from Paymob.
 * Validates HMAC SHA-512 signature, parses transaction status, and triggers
 * atomic order settlement.
 */

export const POST = withErrors(async (request: NextRequest) => {
  const url = new URL(request.url)
  const queryHmac = url.searchParams.get("hmac") || ""

  let body: Record<string, any>
  try {
    body = await request.json()
  } catch (err) {
    console.error("Paymob webhook invalid JSON payload:", err)
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const headerHmac = request.headers.get("x-paymob-signature") || request.headers.get("x-hmac") || ""
  const payloadHmac = queryHmac || headerHmac || body.hmac || (body.obj && body.obj.hmac) || ""

  const parsed = parsePaymobWebhook(body)
  const reference = parsed.orderReference

  if (!reference) {
    console.warn("Paymob webhook missing order reference:", body)
    return NextResponse.json({ error: "Missing order reference" }, { status: 400 })
  }

  // Find tenant associated with this order/appointment
  let tenantId = PLATFORM
  if (/^APT-/i.test(reference)) {
    const apt = await raw.aptAppointment.findFirst({
      where: { reference },
      select: { tenantId: true },
    })
    if (apt?.tenantId) tenantId = apt.tenantId
  } else if (/^KIT-/i.test(reference)) {
    const kit = await raw.kitchenOrder.findUnique({
      where: { id: reference.replace(/^KIT-/i, "") },
      select: { tenantId: true },
    })
    if (kit?.tenantId) tenantId = kit.tenantId
  } else if (/^(SUB|ADDON)-/i.test(reference)) {
    tenantId = PLATFORM
  } else {
    const order = await raw.order.findFirst({
      where: { orderNumber: reference },
      select: { tenantId: true },
    })
    if (order?.tenantId) tenantId = order.tenantId
  }

  const tenant = tenantId !== PLATFORM ? await tenantOf(tenantId) : null

  // Resolve HMAC Secret inside tenant scope
  let verified = false
  if (tenant) {
    verified = await withTenant(tenant, async () => {
      const cfg = await paymobConfig()
      return verifyPaymobWebhookHmac(body, payloadHmac, cfg.hmacSecret)
    })
  } else {
    const cfg = await platformPaymobConfig()
    verified = verifyPaymobWebhookHmac(body, payloadHmac, cfg.hmacSecret)
  }

  // If strict HMAC failed, check if environment allows development simulation or log warning
  if (!verified) {
    if (process.env.NODE_ENV === "production") {
      console.error("Paymob webhook HMAC verification FAILED for ref:", reference)
      return NextResponse.json({ error: "Invalid HMAC signature" }, { status: 401 })
    } else {
      console.warn("Paymob webhook HMAC check failed in non-production environment; proceeding for testing:", reference)
    }
  }

  // Process transaction if successful
  if (parsed.success) {
    const result = await settlePaymobTransaction(reference, {
      reference: parsed.transactionId,
      amount: parsed.amount,
      currency: parsed.currency,
      how: "Paymob webhook",
      raw: body,
    })

    return NextResponse.json({
      success: true,
      processed: result.success,
      entityType: result.entityType,
      reference,
      transactionId: parsed.transactionId,
    })
  } else {
    console.log("Paymob transaction was not successful or was refunded:", {
      reference,
      eventType: parsed.eventType,
      transactionId: parsed.transactionId,
    })

    return NextResponse.json({
      success: true,
      processed: false,
      status: parsed.eventType,
      reference,
    })
  }
})
