import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { checkRateLimit, requestIp } from "@/lib/rate-limit"
import { createPaymobIntention } from "@/lib/paymob"
import { withErrors } from "@/lib/api-handler"
import { tenantOf, withTenant } from "@/lib/tenant"

type SessionResult =
  | { ok: true; checkoutUrl: string; reference?: string; orderNumber: string }
  | { ok: false; error: string; status: number }

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

async function buildPaymobSession(request: NextRequest, orderId: string): Promise<SessionResult> {
  const origin = resolveOrigin(request)

  // 1. Appointment (APT-...)
  if (/^APT-/i.test(orderId)) {
    const apt = await db.aptAppointment.findFirst({
      where: { reference: orderId },
      include: { service: true, provider: true, branch: true },
    })
    if (!apt) return { ok: false, error: "We could not find that appointment.", status: 404 }
    if (apt.paymentStatus === "PAID") {
      return { ok: false, error: "This appointment has already been paid.", status: 400 }
    }

    const aptTenant = await tenantOf(apt.tenantId)
    if (!aptTenant) return { ok: false, error: "Appointment workspace could not be resolved.", status: 500 }

    return withTenant(aptTenant, async () => {
      const when = `${apt.appointmentDate.toISOString().split("T")[0]} ${apt.startTime}`
      const result = await createPaymobIntention({
        orderId: apt.id,
        orderNumber: apt.reference,
        amount: apt.totalAmount,
        currency: "OMR",
        customerName: apt.customerName,
        customerEmail: apt.customerEmail || undefined,
        customerPhone: apt.customerPhone,
        description: `${apt.service?.name || "Appointment"} - ${when}`,
        successUrl: `${origin}/api/paymob/callback?reference=${encodeURIComponent(apt.reference)}`,
        failureUrl: `${origin}/api/paymob/callback?reference=${encodeURIComponent(apt.reference)}&error=payment_failed`,
        webhookUrl: `${origin}/api/paymob/webhook`,
      })

      if (!result.success || !result.checkoutUrl) {
        return { ok: false, error: result.error || "The payment provider is not responding.", status: 502 }
      }

      await db.aptAppointment.update({
        where: { id: apt.id },
        data: { paymentStatus: "PENDING", paymentMethod: "PAYMOB_ONLINE" },
      })

      return { ok: true, checkoutUrl: result.checkoutUrl, reference: result.reference, orderNumber: apt.reference }
    })
  }

  // 2. Kitchen Order (KIT-...)
  if (/^KIT-/i.test(orderId)) {
    const kitchenId = orderId.replace(/^KIT-/i, "")
    const kitchen = await db.kitchenOrder.findUnique({ where: { id: kitchenId } })
    if (!kitchen) return { ok: false, error: "We could not find that order.", status: 404 }
    if (kitchen.paymentStatus === "PAID") {
      return { ok: false, error: "This order has already been paid.", status: 400 }
    }

    const kitchenTenant = await tenantOf(kitchen.tenantId)
    if (!kitchenTenant) return { ok: false, error: "Order workspace could not be resolved.", status: 500 }

    return withTenant(kitchenTenant, async () => {
      const where = kitchen.tableNumber ? `Table ${kitchen.tableNumber}` : kitchen.orderType.toLowerCase()
      const ref = `KIT-${kitchen.id}`

      const result = await createPaymobIntention({
        orderId: kitchen.id,
        orderNumber: ref,
        amount: kitchen.totalAmount,
        currency: kitchen.currency || "OMR",
        customerName: kitchen.customerName || "Guest",
        customerPhone: kitchen.customerPhone || "+96890000000",
        description: `Order ${where}`,
        successUrl: `${origin}/api/paymob/callback?reference=${encodeURIComponent(ref)}`,
        failureUrl: `${origin}/api/paymob/callback?reference=${encodeURIComponent(ref)}&error=payment_failed`,
        webhookUrl: `${origin}/api/paymob/webhook`,
      })

      if (!result.success || !result.checkoutUrl) {
        return { ok: false, error: result.error || "The payment provider is not responding.", status: 502 }
      }

      await db.kitchenOrder.update({
        where: { id: kitchen.id },
        data: { paymentStatus: "PENDING", paymentMethod: "PAYMOB_ONLINE", paymentRef: result.reference },
      })

      return { ok: true, checkoutUrl: result.checkoutUrl, reference: result.reference, orderNumber: ref }
    })
  }

  // 3. Tour Booking Order
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { tour: true, slot: true, customer: true },
  })
  if (!order) return { ok: false, error: "We could not find that booking.", status: 404 }
  if (order.paymentStatus === "APPROVED" || order.paymentStatus === "PAID") {
    return { ok: false, error: "This booking has already been paid.", status: 400 }
  }

  const tenant = await tenantOf(order.tenantId)
  if (!tenant) return { ok: false, error: "Booking workspace could not be resolved.", status: 500 }

  return withTenant(tenant, async () => {
    const result = await createPaymobIntention({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.totalAmount,
      currency: "OMR",
      customerName: order.customerName,
      customerEmail: order.customerEmail || undefined,
      customerPhone: order.customerPhone,
      description: `${order.tour.name} - ${order.slot.date.toISOString().split("T")[0]} ${order.slot.startTime}`,
      successUrl: `${origin}/api/paymob/callback?reference=${encodeURIComponent(order.orderNumber)}`,
      failureUrl: `${origin}/api/paymob/callback?reference=${encodeURIComponent(order.orderNumber)}&error=payment_failed`,
      webhookUrl: `${origin}/api/paymob/webhook`,
    })

    if (!result.success || !result.checkoutUrl) {
      return { ok: false, error: result.error || "The payment provider is not responding.", status: 502 }
    }

    const existingPayment = await db.payment.findFirst({ where: { orderId: order.id } })
    const paymentData = {
      status: "PENDING",
      method: "PAYMOB",
      webhookPayload: { checkoutUrl: result.checkoutUrl, clientSecret: result.clientSecret } as any,
    }

    if (existingPayment) {
      await db.payment.update({ where: { id: existingPayment.id }, data: paymentData })
    } else {
      await db.payment.create({
        data: {
          orderId: order.id,
          customerId: order.customerId,
          amount: order.totalAmount,
          currency: "OMR",
          ...paymentData,
        },
      })
    }

    await db.order.update({
      where: { id: order.id },
      data: { paymentStatus: "PENDING", orderStatus: "PENDING_PAYMENT", paymentMethod: "PAYMOB" },
    })

    return { ok: true, checkoutUrl: result.checkoutUrl, reference: result.reference, orderNumber: order.orderNumber }
  })
}

function errorPage(message: string, status = 400) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Payment unavailable</title>
<style>
 body{font-family:system-ui,-apple-system,sans-serif;background:#09090b;color:#f4f4f5;display:flex;align-items:center;
      justify-content:center;min-height:100vh;margin:0;padding:1rem}
 .card{background:#18181b;border:1px solid rgba(255,255,255,0.1);border-radius:24px;box-shadow:0 24px 64px rgba(0,0,0,.6);padding:2.5rem;
       max-width:420px;text-align:center}
 h1{color:#ffffff;font-size:1.35rem;margin:0 0 .75rem;font-weight:700}
 p{color:#a1a1aa;font-size:.925rem;margin:0;line-height:1.5}
 .icon{width:56px;height:56px;border-radius:50%;background:rgba(239,68,68,0.15);color:#ef4444;display:flex;
       align-items:center;justify-content:center;font-size:26px;font-weight:bold;margin:0 auto 1.25rem}
</style></head>
<body><div class="card"><div class="icon">!</div>
<h1>Payment unavailable</h1><p>${message}</p>
<p style="margin-top:1.25rem;font-size:.85rem;color:#71717a">Please reply on WhatsApp and our team will help you complete your booking.</p>
</div></body></html>`
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } })
}

/**
 * GET - WhatsApp chat click redirect to Paymob checkout
 */
export const GET = withErrors(async (request: NextRequest) => {
  const rate = checkRateLimit(`paymobsession:${requestIp(request.headers)}`, 20, 10 * 60 * 1000)
  if (!rate.allowed) return NextResponse.json({ error: "Too many payment attempts, please wait" }, { status: 429 })

  const orderId = new URL(request.url).searchParams.get("orderId")
  if (!orderId) return errorPage("This payment link is missing its order reference.")

  const result = await buildPaymobSession(request, orderId)
  if (!result.ok) return errorPage(result.error, result.status)

  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin
  const target = new URL(result.checkoutUrl, base).toString()
  return NextResponse.redirect(target, { status: 302 })
})

/**
 * POST - Programmatic session creation
 */
export const POST = withErrors(async (request: NextRequest) => {
  const rate = checkRateLimit(`paymobsession:${requestIp(request.headers)}`, 20, 10 * 60 * 1000)
  if (!rate.allowed) return NextResponse.json({ error: "Too many payment attempts, please wait" }, { status: 429 })

  try {
    const { orderId } = await request.json()
    if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 })

    const result = await buildPaymobSession(request, orderId)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    return NextResponse.json({
      success: true,
      checkoutUrl: result.checkoutUrl,
      reference: result.reference,
      orderNumber: result.orderNumber,
    })
  } catch (error) {
    console.error("Paymob session error:", error)
    return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 })
  }
})
