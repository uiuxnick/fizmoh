import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createAuditLog } from "@/lib/slots-server"
import { confirmOrderOnce } from "@/lib/confirm-order"
import { refreshCustomerTotals } from "@/lib/customer-totals"
import { syncOrderToCalendar } from "@/lib/google-calendar"
import { sendOrderConfirmation } from "@/lib/notifications"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { notifyStaff } from "@/lib/realtime"

// Approve payment
export const POST = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Sign in first" }, { status: 401 })
  const staffId = session.staffId!

  const { id } = await params
  const body = await request.json()
  const { comment, action } = body // action: APPROVE or REJECT

  const payment = await db.payment.findUnique({
    where: { id },
    include: { order: { include: { tour: true, slot: true, customer: true } } },
  })
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 })

  if (action === "REJECT") {
    const updated = await db.payment.update({
      where: { id },
      data: {
        status: "REJECTED",
        verifiedById: staffId,
        verifiedAt: new Date(),
        rejectionReason: body.reason,
        verifierComment: comment,
      },
    })

    await db.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: "REJECTED",
        // Order stays in PAYMENT_SUBMITTED so customer can resubmit
      },
    })

    await createAuditLog({
      staffId,
      orderId: payment.orderId,
      action: "REJECT_PAYMENT",
      entity: "PAYMENT",
      entityId: id,
      reason: body.reason,
      details: JSON.stringify({ comment }),
    })

    // Notify customer (would trigger WhatsApp + Email in production)
    await notifyStaff({
      type: "PAYMENT_REJECTED",
      title: "Payment rejected",
      message: `${payment.order.orderNumber} - ${body.reason}`,
      data: { orderId: payment.orderId, customerPhone: payment.order.customerPhone },
    })

    return NextResponse.json({ payment: updated })
  }

  // APPROVE
  //
  // Guard against repeat approval. A double-click on the verify button
  // previously ran the whole block again — four clicks produced four vouchers
  // and four "booking confirmed" messages to the customer. The conditional
  // updateMany only matches while the payment is still unapproved, so
  // concurrent requests race on the database rather than in application code.
  const claimed = await db.payment.updateMany({
    where: { id, status: { notIn: ["APPROVED", "VERIFIED"] } },
    data: {
      status: "APPROVED",
      verifiedById: staffId,
      verifiedAt: new Date(),
      verifierComment: comment,
    },
  })

  if (claimed.count === 0) {
    const existing = await db.payment.findUnique({ where: { id } })
    return NextResponse.json({
      payment: existing,
      alreadyApproved: true,
      message: "This payment was already approved — no duplicate confirmation sent.",
    })
  }

  const updated = await db.payment.findUnique({ where: { id } })

  // The booking may already have been confirmed when the customer sent their
  // screenshot. confirmOrderOnce settles that: it claims the confirmation
  // atomically and only moves the seats if this call is the one that won, so
  // approving afterwards can never book the seats a second time.
  const confirmed = await confirmOrderOnce(payment.orderId)
  if (!confirmed) return NextResponse.json({ error: "No such order" }, { status: 404 })

  // The approval is what marks the money as actually received.
  await db.order.update({ where: { id: payment.orderId }, data: { paymentStatus: "APPROVED" } })

  const order = confirmed.order!
  const voucherCode = confirmed.voucherCode
  const voucher = await db.voucher.findFirst({ where: { orderId: order.id, status: "VALID" } })

  await createAuditLog({
    staffId,
    orderId: order.id,
    action: "APPROVE_PAYMENT",
    entity: "PAYMENT",
    entityId: id,
    details: JSON.stringify({ amount: payment.amount, voucherCode }),
  })

  // Notify customer
  await notifyStaff({
    type: "PAYMENT_APPROVED",
    title: "Payment approved & booking confirmed",
    message: `${order.orderNumber} - ${order.customerName} - Voucher ${voucherCode}`,
    data: { orderId: order.id, voucherId: voucher?.id ?? null, customerPhone: order.customerPhone },
  })

  // Send unified confirmation (Email + WhatsApp + staff) — per BRD §6.7
  await refreshCustomerTotals(order.customerId)
    void syncOrderToCalendar(order.id)
    await sendOrderConfirmation(order.id)

  return NextResponse.json({ payment: updated, order, voucher })
})
