import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { checkRateLimit, requestIp } from "@/lib/rate-limit"
import { createPaymentSession } from "@/lib/amwalpay"
import { withErrors } from "@/lib/api-handler"
import { tenantOf, withTenant } from "@/lib/tenant"
import { chemoPrice } from "@/lib/hospital"

/**
 * Create an AmwalPay payment link for an order
 * Per BRD §9.2: Checkout → create payment session → redirect → customer pays → webhook
 *
 * AmwalPay API: POST /MerchantOrder/CreatePaymentLink
 * Returns a hosted payment link URL the customer is redirected to
 */

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

/** Shared by GET (chat link) and POST (in-app checkout). */
async function buildSession(request: NextRequest, orderId: string): Promise<SessionResult> {
  // The customer tapping a WhatsApp payment link carries no session and no
  // workspace header — there is nothing in the request that says which
  // business this booking belongs to. Reading the order with no tenant in
  // scope works (an unscoped lookup by id is not itself the leak), but
  // everything downstream — createPaymentSession in particular — resolves
  // its AmwalPay credentials from currentTenant(), and with nothing in scope
  // that falls back to the platform's own merchant account. Every card
  // payment for every tenant would then charge into the same account this
  // installation uses for its own subscription fees. The order names its own
  // tenant, so that is entered explicitly before anything gateway-related
  // happens.
  /*
   * Appointments pay through the same link as tours.
   *
   * This function only ever looked in `Order`, so the PAYMENT node — which
   * builds every chat payment link — could pay for a tour and nothing else.
   * An appointment reference reached the `Order` lookup, missed, and the
   * customer was told "We could not find that booking" for a booking that
   * plainly existed. The reference says which kind it is, so it is dispatched
   * on rather than assumed.
   *
   * Chemotherapy (CHEMO-) still falls through to the same message. Its amount
   * field was not verified when this was written and guessing at what to
   * charge is the one mistake worth avoiding here.
   */
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
    if (!aptTenant) return { ok: false, error: "This appointment's workspace could not be resolved.", status: 500 }

    // Same reasoning as the tour path below: the gateway credentials are read
    // from whatever tenant is in scope, so the booking's own workspace is
    // entered before anything gateway-related happens.
    return withTenant(aptTenant, async () => {
      const origin = resolveOrigin(request)
      const when = `${apt.appointmentDate.toISOString().split("T")[0]} ${apt.startTime}`

      const result = await createPaymentSession({
        orderId: apt.id,
        orderNumber: apt.reference,
        amount: apt.totalAmount,
        currency: "OMR",
        customerName: apt.customerName,
        customerEmail: apt.customerEmail || undefined,
        customerPhone: apt.customerPhone,
        description: `${apt.service?.name || "Appointment"} - ${when}`,
        successUrl: `${origin}/api/amwalpay/return/${apt.reference}`,
        failureUrl: `${origin}/api/amwalpay/return/${apt.reference}`,
        webhookUrl: `${origin}/api/amwalpay/webhook`,
      })

      if (!result.success || !result.paymentLinkUrl) {
        return { ok: false, error: result.error || "The payment provider is not responding.", status: 502 }
      }

      // No Payment row: an appointment carries its own paymentStatus, and the
      // signed webhook is what moves it to PAID. Marking it PENDING here only
      // records that a link was issued.
      await db.aptAppointment.update({
        where: { id: apt.id },
        data: { paymentStatus: "PENDING", paymentMethod: "AMWALPAY_ONLINE" },
      })

      return { ok: true, checkoutUrl: result.paymentLinkUrl, reference: result.reference, orderNumber: apt.reference }
    })
  }

  if (/^CHEMO-/i.test(orderId)) {
    const chemo = await db.hospChemoBooking.findFirst({
      where: { bookingRef: orderId },
      include: { patient: true, doctor: true, bed: true, session: true },
    })
    if (!chemo) return { ok: false, error: "We could not find that booking.", status: 404 }
    // HospChemoBooking has no paymentStatus of its own; the webhook confirms
    // the booking rather than marking a payment, so CONFIRMED is what "already
    // paid" looks like here.
    if (chemo.status === "CONFIRMED") {
      return { ok: false, error: "This booking is already confirmed.", status: 400 }
    }
    if (!chemo.patient?.mobile) {
      return { ok: false, error: "This booking has no contact number to send a receipt to.", status: 400 }
    }

    const chemoTenant = await tenantOf(chemo.tenantId)
    if (!chemoTenant) return { ok: false, error: "This booking's workspace could not be resolved.", status: 500 }

    return withTenant(chemoTenant, async () => {
      const origin = resolveOrigin(request)
      // The same helper the hosted checkout uses. Two copies of a price is two
      // answers to what a patient owes.
      const amount = await chemoPrice()

      const result = await createPaymentSession({
        orderId: chemo.id,
        orderNumber: chemo.bookingRef,
        amount,
        currency: "OMR",
        customerName: chemo.patient.fullName,
        customerPhone: chemo.patient.mobile ?? "",
        description: `Chemotherapy day care - ${chemo.bookingDate.toISOString().split("T")[0]}`,
        successUrl: `${origin}/api/amwalpay/return/${chemo.bookingRef}`,
        failureUrl: `${origin}/api/amwalpay/return/${chemo.bookingRef}`,
        webhookUrl: `${origin}/api/amwalpay/webhook`,
      })

      if (!result.success || !result.paymentLinkUrl) {
        return { ok: false, error: result.error || "The payment provider is not responding.", status: 502 }
      }

      // Nothing is written to the booking here. It has no payment column, and
      // moving it to CONFIRMED would say the bed is paid for the moment a link
      // is issued — the signed webhook does that, and only on approval.

      return { ok: true, checkoutUrl: result.paymentLinkUrl, reference: result.reference, orderNumber: chemo.bookingRef }
    })
  }

  if (/^KIT-/i.test(orderId)) {
    // The reference is prefixed so this function can tell a kitchen order from
    // a tour order id, both of which are bare cuids.
    const kitchenId = orderId.replace(/^KIT-/i, "")
    const kitchen = await db.kitchenOrder.findUnique({ where: { id: kitchenId } })
    if (!kitchen) return { ok: false, error: "We could not find that order.", status: 404 }
    if (kitchen.paymentStatus === "PAID") {
      return { ok: false, error: "This order has already been paid.", status: 400 }
    }
    if (!kitchen.customerPhone) {
      return { ok: false, error: "This order has no contact number to send a receipt to.", status: 400 }
    }

    const kitchenTenant = await tenantOf(kitchen.tenantId)
    if (!kitchenTenant) return { ok: false, error: "This order's workspace could not be resolved.", status: 500 }

    return withTenant(kitchenTenant, async () => {
      const origin = resolveOrigin(request)
      const where = kitchen.tableNumber ? `Table ${kitchen.tableNumber}` : kitchen.orderType.toLowerCase()

      const result = await createPaymentSession({
        orderId: kitchen.id,
        orderNumber: `KIT-${kitchen.id}`,
        amount: kitchen.totalAmount,
        currency: kitchen.currency || "OMR",
        customerName: kitchen.customerName || "Guest",
        // Narrowed above, but the compiler cannot see through the closure.
        customerPhone: kitchen.customerPhone ?? "",
        description: `Order ${where}`,
        successUrl: `${origin}/api/amwalpay/return/KIT-${kitchen.id}`,
        failureUrl: `${origin}/api/amwalpay/return/KIT-${kitchen.id}`,
        webhookUrl: `${origin}/api/amwalpay/webhook`,
      })

      if (!result.success || !result.paymentLinkUrl) {
        return { ok: false, error: result.error || "The payment provider is not responding.", status: 502 }
      }

      // PENDING records only that a link was issued. The signed webhook is what
      // moves it to PAID — a customer who opens the link and walks away has not
      // paid, and the kitchen must not be told otherwise.
      await db.kitchenOrder.update({
        where: { id: kitchen.id },
        data: { paymentStatus: "PENDING", paymentMethod: "AMWALPAY_ONLINE", paymentRef: result.reference },
      })

      return { ok: true, checkoutUrl: result.paymentLinkUrl, reference: result.reference, orderNumber: `KIT-${kitchen.id}` }
    })
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { tour: true, slot: true, customer: true },
  })
  if (!order) return { ok: false, error: "We could not find that booking.", status: 404 }
  if (order.paymentMethod !== "AMWALPAY") {
    return { ok: false, error: "This booking is not set up for card payment.", status: 400 }
  }
  if (order.paymentStatus === "APPROVED" || order.paymentStatus === "PAID") {
    return { ok: false, error: "This booking has already been paid.", status: 400 }
  }

  const tenant = await tenantOf(order.tenantId)
  if (!tenant) return { ok: false, error: "This booking's workspace could not be resolved.", status: 500 }

  return withTenant(tenant, async () => {
    const origin = resolveOrigin(request)

    const result = await createPaymentSession({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.totalAmount,
      currency: "OMR",
      customerName: order.customerName,
      customerEmail: order.customerEmail || undefined,
      customerPhone: order.customerPhone,
      description: `${order.tour.name} - ${order.slot.date.toISOString().split("T")[0]} ${order.slot.startTime}`,
      // The order number goes in the path. AmwalPay refuses a redirectUrl that
      // carries a query string, and returns with none of its own — so this is
      // the only way a paying customer comes back to their own booking rather
      // than to the homepage.
      successUrl: `${origin}/api/amwalpay/return/${order.orderNumber}`,
      failureUrl: `${origin}/api/amwalpay/return/${order.orderNumber}`,
      webhookUrl: `${origin}/api/amwalpay/webhook`,
    })

    if (!result.success || !result.paymentLinkUrl) {
      return { ok: false, error: result.error || "The payment provider is not responding.", status: 502 }
    }

    const existingPayment = await db.payment.findFirst({ where: { orderId: order.id } })
    /*
     * No gateway reference yet — because there isn't one yet.
     *
     * This stored `result.reference`, which for a live link is AmwalPay's
     * response code ("00") and otherwise our own order number. Neither is a
     * transaction id, so the order screen showed a "Gateway ref" that was
     * really the order number, and staff had no way to tell a paid card
     * payment from an unpaid one. The field is filled when the gateway names
     * a transaction — by its notification, or by a member of staff copying it
     * off the AmwalPay receipt.
     */
    const paymentData = {
      status: "PENDING",
      webhookPayload: { paymentLinkUrl: result.paymentLinkUrl } as any,
    }
    if (existingPayment) {
      await db.payment.update({ where: { id: existingPayment.id }, data: paymentData })
    } else {
      await db.payment.create({
        data: {
          orderId: order.id,
          customerId: order.customerId,
          method: "AMWALPAY",
          amount: order.totalAmount,
          ...paymentData,
        },
      })
    }

    await db.order.update({
      where: { id: order.id },
      data: { paymentStatus: "PENDING", orderStatus: "PENDING_PAYMENT" },
    })

    return { ok: true, checkoutUrl: result.paymentLinkUrl, reference: result.reference, orderNumber: order.orderNumber }
  })
}

/**
 * GET — the link we send over WhatsApp.
 *
 * A chat link is opened by tapping it, which issues a GET. This route was
 * POST-only, so every customer who tapped "pay by card" got a raw 405 error
 * page. This creates the session and redirects straight to the hosted
 * checkout, and renders a readable page when something goes wrong rather than
 * a browser error.
 */
export const GET = withErrors(async (request: NextRequest) => {
  // Public by necessity — the customer is not signed in at checkout — but each
  // call creates a payment link against the live merchant account, so it is
  // capped per address.
  const rate = checkRateLimit(`amwalsession:${requestIp(request.headers)}`, 15, 10 * 60 * 1000)
  if (!rate.allowed) return NextResponse.json({ error: "Too many payment attempts, please wait" }, { status: 429 })


  const orderId = new URL(request.url).searchParams.get("orderId")
  if (!orderId) return errorPage("This payment link is missing its order reference.")

  const result = await buildSession(request, orderId)
  if (!result.ok) return errorPage(result.error, result.status)

  // In simulation mode the provider returns a relative path; NextResponse
  // .redirect requires an absolute URL and throws ERR_INVALID_URL otherwise.
  // Resolve against the public base URL, not request.url — behind the reverse
  // proxy that is the internal 127.0.0.1:3013 address, which would send the
  // customer's browser to a host that does not exist for them.
  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin
  const target = new URL(result.checkoutUrl, base).toString()
  return NextResponse.redirect(target, { status: 302 })
})

function errorPage(message: string, status = 400) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Payment unavailable</title>
<style>
 body{font-family:system-ui,-apple-system,sans-serif;background:#f5f5f4;display:flex;align-items:center;
      justify-content:center;min-height:100vh;margin:0;padding:1rem}
 .card{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);padding:2.5rem;
       max-width:420px;text-align:center}
 h1{color:#1c1917;font-size:1.25rem;margin:0 0 .5rem}
 p{color:#78716c;font-size:.9rem;margin:0}
 .icon{width:56px;height:56px;border-radius:50%;background:#fef3c7;color:#d97706;display:flex;
       align-items:center;justify-content:center;font-size:28px;margin:0 auto 1rem}
</style></head>
<body><div class="card"><div class="icon">!</div>
<h1>Payment unavailable</h1><p>${message}</p>
<p style="margin-top:1rem;font-size:.8rem">Please reply on WhatsApp and our team will help.</p>
</div></body></html>`
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } })
}

export const POST = withErrors(async (request: NextRequest) => {
  // Public by necessity — the customer is not signed in at checkout — but each
  // call creates a payment link against the live merchant account, so it is
  // capped per address.
  const rate = checkRateLimit(`amwalsession:${requestIp(request.headers)}`, 15, 10 * 60 * 1000)
  if (!rate.allowed) return NextResponse.json({ error: "Too many payment attempts, please wait" }, { status: 429 })


  try {
    const { orderId } = await request.json()
    if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 })

    const result = await buildSession(request, orderId)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    return NextResponse.json({
      success: true,
      checkoutUrl: result.checkoutUrl,
      reference: result.reference,
      orderNumber: result.orderNumber,
    })
  } catch (error) {
    console.error("AmwalPay session error:", error)
    return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 })
  }
})
