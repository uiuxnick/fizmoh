import { NextRequest, NextResponse } from "next/server"
import { db, raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { tenantOf, withTenant } from "@/lib/tenant"
import { createPaymobIntention, platformPaymobConfig } from "@/lib/paymob"

/**
 * Direct Paymob Payment Link Redirect Handler
 *
 * Route: GET /api/paymob/pay/[orderNumber]
 *
 * When clicked from WhatsApp or an invoice email, this resolves the booking/order,
 * creates a Paymob Intention in the appropriate tenant context, and 302-redirects
 * the customer straight to Paymob's secure Unified Checkout page.
 */

export const GET = withErrors(
  async (request: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) => {
    const { orderNumber } = await params
    const reference = decodeURIComponent(orderNumber)
    const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin

    // 1. Check Platform Subscription Invoices (SUB-... or ADDON-...)
    const { isSubscriptionReference, isAddonReference } = await import("@/lib/billing").catch(() => ({
      isSubscriptionReference: (r: string) => /^SUB-/i.test(r),
      isAddonReference: (r: string) => /^ADDON-/i.test(r),
    }))

    if (isSubscriptionReference(reference) || isAddonReference(reference)) {
      const invoice = await raw.subscriptionInvoice.findUnique({ where: { reference } })
      if (!invoice) return NextResponse.redirect(`${base}/`, { status: 302 })
      if (invoice.status === "PAID") {
        return NextResponse.redirect(`${base}/api/billing/return/${encodeURIComponent(reference)}`, { status: 302 })
      }

      const [tenant, { billingContact }] = await Promise.all([
        raw.tenant.findUnique({
          where: { id: invoice.tenantId },
          select: { name: true },
        }),
        import("@/lib/billing"),
      ])
      const contact = await billingContact(invoice.tenantId)
      const config = await platformPaymobConfig()

      // Subscription invoice amount is stored in minor units
      const amountMajor = invoice.amount / 1000
      const intention = await createPaymobIntention({
        orderId: invoice.id,
        orderNumber: reference,
        amount: amountMajor,
        currency: invoice.currency || "OMR",
        customerName: tenant?.name || "Fizmoh Subscriber",
        customerPhone: contact.phone || "+96890000000",
        customerEmail: contact.email,
        description: `Subscription ${reference}`,
        successUrl: `${base}/api/billing/return/${encodeURIComponent(reference)}`,
        failureUrl: `${base}/api/billing/return/${encodeURIComponent(reference)}?error=payment_failed`,
        webhookUrl: `${base}/api/paymob/webhook`,
        config,
      })

      if (intention.success && intention.checkoutUrl) {
        return NextResponse.redirect(intention.checkoutUrl, { status: 302 })
      }

      return new NextResponse("Platform payment gateway unavailable. Please contact support.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    }

    // 2. Appointment Booking (APT-...)
    if (/^APT-/i.test(reference)) {
      const apt = await raw.aptAppointment.findFirst({
        where: { reference },
        select: { id: true, tenantId: true, paymentStatus: true, totalAmount: true, customerName: true, customerPhone: true, customerEmail: true },
      })
      if (!apt) return NextResponse.redirect(`${base}/`, { status: 302 })
      if (apt.paymentStatus === "PAID") {
        return NextResponse.redirect(`${base}/api/paymob/callback?reference=${encodeURIComponent(reference)}&already_paid=true`, { status: 302 })
      }

      const tenant = await tenantOf(apt.tenantId)
      if (!tenant) return NextResponse.redirect(`${base}/`, { status: 302 })

      return withTenant(tenant, async () => {
        const intention = await createPaymobIntention({
          orderId: apt.id,
          orderNumber: reference,
          amount: apt.totalAmount,
          currency: "OMR",
          customerName: apt.customerName,
          customerEmail: apt.customerEmail || undefined,
          customerPhone: apt.customerPhone,
          description: `Appointment ${reference}`,
          successUrl: `${base}/api/paymob/callback?reference=${encodeURIComponent(reference)}`,
          failureUrl: `${base}/api/paymob/callback?reference=${encodeURIComponent(reference)}&error=payment_failed`,
          webhookUrl: `${base}/api/paymob/webhook`,
        })

        if (intention.success && intention.checkoutUrl) {
          return NextResponse.redirect(intention.checkoutUrl, { status: 302 })
        }

        return new NextResponse(`Payment gateway error: ${intention.error || "Unable to initiate payment"}`, {
          status: 502,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
      })
    }

    // 3. Tour Booking Order
    const stub = await raw.order.findFirst({
      where: { orderNumber: reference },
      select: { id: true, tenantId: true, paymentStatus: true },
    })
    if (!stub) return NextResponse.redirect(`${base}/`, { status: 302 })

    if (["APPROVED", "PAID"].includes(stub.paymentStatus)) {
      return NextResponse.redirect(`${base}/booking/${encodeURIComponent(reference)}`, { status: 302 })
    }

    const tenant = await tenantOf(stub.tenantId)
    if (!tenant) return NextResponse.redirect(`${base}/`, { status: 302 })

    return withTenant(tenant, async () => {
      const order = await db.order.findFirst({
        where: { id: stub.id },
        include: { tour: true },
      })
      if (!order) return NextResponse.redirect(`${base}/`, { status: 302 })

      const intention = await createPaymobIntention({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        currency: "OMR",
        customerName: order.customerName,
        customerEmail: order.customerEmail || undefined,
        customerPhone: order.customerPhone,
        description: `${order.tour.name} - Order ${order.orderNumber}`,
        successUrl: `${base}/api/paymob/callback?reference=${encodeURIComponent(order.orderNumber)}`,
        failureUrl: `${base}/api/paymob/callback?reference=${encodeURIComponent(order.orderNumber)}&error=payment_failed`,
        webhookUrl: `${base}/api/paymob/webhook`,
      })

      if (intention.success && intention.checkoutUrl) {
        return NextResponse.redirect(intention.checkoutUrl, { status: 302 })
      }

      return new NextResponse(`Payment unavailable: ${intention.error || "Please try again later"}`, {
        status: 502,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    })
  },
)
