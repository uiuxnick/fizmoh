import { NextRequest, NextResponse } from "next/server"
import { db, raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { tenantOf, withTenant } from "@/lib/tenant"
import { createAuditLog } from "@/lib/slots-server"
import { formatCurrency, formatDate } from "@/lib/helpers"
import { sendWhatsApp } from "@/lib/notifications"
import { getConfigValue } from "@/lib/app-config"
import { settleFromGateway } from "@/lib/amwalpay-settle"

/**
 * Tells the customer we have them, the moment they come back from the gateway.
 *
 * A card payment that clears leaves the customer on a page reading "payment
 * pending" and nothing in their chat, because the confirmation is sent by the
 * signed gateway notification — which can be slow, and which does not arrive
 * at all while the merchant's Webhook API is disabled. From where the customer
 * sits that is indistinguishable from having paid into a void.
 *
 * This is deliberately not a confirmation of payment: coming back from the
 * gateway proves the customer finished the checkout, not that the money
 * settled, and only the signed notification (or a member of staff) can say
 * that. It acknowledges the booking, quotes the reference, and promises the
 * real confirmation — which still arrives separately.
 *
 * Sent once per order, so a customer who reloads or returns twice is not
 * messaged twice.
 */
async function acknowledgeReturn(orderNumber: string): Promise<void> {
  const stub = await raw.order.findFirst({
    where: { orderNumber },
    select: { id: true, tenantId: true },
  })
  if (!stub) return

  const tenant = await tenantOf(stub.tenantId)
  if (!tenant) return

  await withTenant(tenant, async () => {
    const order = await db.order.findFirst({
      where: { id: stub.id },
      include: { tour: true, slot: true },
    })
    if (!order) return

    // Already settled: the real confirmation and voucher have gone out, and a
    // "we are checking" message after them would only cause doubt.
    if (["APPROVED", "PAID"].includes(order.paymentStatus)) return

    const already = await db.auditLog.findFirst({
      where: { orderId: order.id, action: "PAYMENT_RETURN_ACK" },
      select: { id: true },
    })
    if (already) return

    const business = (await getConfigValue("business_name").catch(() => "")) || tenant.slug
    const firstName = String(order.customerName || "").trim().split(/\s+/)[0]

    await sendWhatsApp({
      to: order.customerPhone,
      body:
        `${firstName ? `Thanks, ${firstName}` : "Thank you"} 🙏\n\n` +
        `We have your booking and we're confirming the payment with the bank now.\n\n` +
        `🎫 Order: ${order.orderNumber}\n` +
        `📍 ${order.tour.name}\n` +
        `📅 ${formatDate(order.slot.date)} at ${order.slot.startTime}\n` +
        `👥 ${order.paxAdult} adult${order.paxAdult === 1 ? "" : "s"}` +
        `${order.paxChild ? `, ${order.paxChild} child${order.paxChild === 1 ? "" : "ren"}` : ""}\n` +
        `💰 ${formatCurrency(order.totalAmount)}\n\n` +
        `You'll get your voucher here as soon as it clears — usually within a few minutes. ` +
        `Keep this message as your reference until then.\n\n${business}`,
      allowOutsideSession: true,
    })

    await createAuditLog({
      orderId: order.id,
      customerId: order.customerId,
      action: "PAYMENT_RETURN_ACK",
      entity: "ORDER",
      entityId: order.id,
      details: "Customer returned from AmwalPay; booking acknowledged, payment not yet settled",
    }).catch(() => {})
  })
}

/**
 * Where AmwalPay sends the customer back to, with the order in the path.
 *
 * The old return URL was a bare path, on the assumption that the gateway
 * appends its own reference. It does not: every return arrives with no query
 * string at all, so there was nothing to resolve and every paying customer
 * landed on the homepage.
 *
 * A path segment survives where a query string does not — AmwalPay rejects any
 * redirectUrl containing one — so the order number travels in the path
 * instead.
 */
export const GET = withErrors(
  async (request: NextRequest, { params }: { params: Promise<{ reference: string }> }) => {
    const { reference } = await params
    const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin
    const orderNumber = decodeURIComponent(reference)

    const order = await raw.order.findFirst({
      where: { orderNumber },
      select: { orderNumber: true },
    })

    /*
     * Ask AmwalPay outright whether this was paid, before telling the customer
     * anything. When the answer is yes the order confirms here and their
     * voucher goes out immediately, and the "we're checking" message below is
     * skipped because it would then be wrong.
     *
     * The customer is redirected either way — neither a gateway timeout nor a
     * failed message may strand somebody who has just paid.
     */
    if (order) {
      const settled = await settleFromGateway(orderNumber).catch(e => {
        console.error("Gateway settlement check failed:", e)
        return false
      })
      if (!settled) {
        await acknowledgeReturn(orderNumber).catch(e => console.error("Return acknowledgement failed:", e))
      }
    }

    return NextResponse.redirect(
      order ? `${base}/booking/${order.orderNumber}` : `${base}/`,
      { status: 302 },
    )
  },
)
