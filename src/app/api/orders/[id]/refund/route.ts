import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createAuditLog } from "@/lib/slots-server"
import { refundPayment } from "@/lib/amwalpay"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { notifyStaff } from "@/lib/realtime"

/**
 * Refund an order (full or partial)
 * Per BRD §6.3: "issue full/partial refund"
 * Per BRD §6.4.1: AmwalPay "refund"
 */
export const POST = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Sign in first" }, { status: 401 })
  const staffId = session.staffId!

  const { id } = await params
  const body = await request.json()
  const { amount, reason, isFull } = body

  const order = await db.order.findUnique({
    where: { id },
    include: { payments: true, customer: true },
  })
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

  const refundAmount = isFull ? order.totalAmount : parseFloat(amount)
  if (refundAmount > order.totalAmount) {
    return NextResponse.json({ error: "Refund amount exceeds order total" }, { status: 400 })
  }

  const payment = order.payments[0]
  if (!payment) return NextResponse.json({ error: "No payment found" }, { status: 400 })

  // If AmwalPay, process refund via gateway
  if (payment.method === "AMWALPAY" && payment.gatewayReference) {
    const refundResult = await refundPayment({
      transactionId: payment.gatewayReference,
      amount: refundAmount,
      reason,
    })
    if (!refundResult.success) {
      return NextResponse.json({ error: refundResult.error || "Refund failed" }, { status: 500 })
    }
  }

  // Update payment status
  const newStatus = refundAmount >= order.totalAmount ? "REFUNDED" : "PARTIALLY_REFUNDED"
  await db.payment.update({
    where: { id: payment.id },
    data: { status: newStatus },
  })

  // Update order
  await db.order.update({
    where: { id },
    data: {
      paymentStatus: newStatus,
      orderStatus: refundAmount >= order.totalAmount ? "REFUNDED" : order.orderStatus,
    },
  })

  // Cancel voucher if full refund
  if (refundAmount >= order.totalAmount) {
    await db.voucher.updateMany({
      where: { orderId: id },
      data: { status: "CANCELLED" },
    })
    // Release slot seats
    await db.slot.update({
      where: { id: order.slotId },
      data: { seatsBooked: { decrement: order.paxAdult + order.paxChild }, status: "OPEN" },
    })
  }

  await createAuditLog({
    staffId,
    orderId: id,
    action: "REFUND",
    entity: "PAYMENT",
    entityId: payment.id,
    reason,
    details: { amount: refundAmount, isFull, method: payment.method },
  })

  // Notify customer
  await notifyStaff({
    type: "REFUND_PROCESSED",
    title: "Refund processed",
    message: `${order.orderNumber} - ${order.customerName} - ${refundAmount.toFixed(3)} OMR refunded`,
    data: { orderId: id, amount: refundAmount, customerPhone: order.customerPhone },
  })

  return NextResponse.json({ success: true, refundAmount, newStatus })
})
