import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateVoucherCode } from "@/lib/helpers"
import { confirmSlotSeats, createAuditLog } from "@/lib/slots-server"
import { refreshCustomerTotals } from "@/lib/customer-totals"
import { syncOrderToCalendar } from "@/lib/google-calendar"
import { withErrors } from "@/lib/api-handler"
import { sendOrderConfirmation } from "@/lib/notifications"

export const GET = withErrors(async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const order = await db.order.findUnique({
    where: { id },
    include: {
      tour: true,
      slot: true,
      customer: true,
      payments: true,
      vouchers: true,
      reviews: true,
      auditLogs: { include: { staff: true } },
    },
  })
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  return NextResponse.json({ order })
})

export const PATCH = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const body = await request.json()
  const { action, staffId, reason, ...updateData } = body

  const order = await db.order.findUnique({ where: { id }, include: { slot: true } })
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

  // Direct status change from the admin UI. Kept separate from the semantic
  // actions below, which also move seats and issue vouchers — this is the
  // "staff knows better" override for correcting a wrong state.
  if (action === "SET_STATUS") {
    const ALLOWED = [
      "PENDING_PAYMENT", "PAYMENT_SUBMITTED", "CONFIRMED",
      // A customer's cancellation request parks here until staff decide. The
      // seats stay held and no refund is issued until someone approves, because
      // cancelling a paid booking is a decision about money.
      "CANCELLATION_REQUESTED",
      "COMPLETED", "CANCELLED", "REFUNDED", "NO_SHOW",
    ]
    const next = String(body.orderStatus || "")
    if (!ALLOWED.includes(next)) {
      return NextResponse.json({ error: `Unknown status "${next}"` }, { status: 400 })
    }
    if (next === order.orderStatus) {
      return NextResponse.json({ order, unchanged: true })
    }

    const updated = await db.order.update({
      where: { id },
      data: {
        orderStatus: next,
        ...(next === "CONFIRMED" && !order.confirmedAt ? { confirmedAt: new Date() } : {}),
        ...(next === "COMPLETED" ? { completedAt: new Date() } : {}),
        ...(next === "CANCELLED" ? { cancelledAt: new Date(), cancelReason: reason || "Changed by staff" } : {}),
      },
      include: { tour: true, slot: true, customer: true, payments: true, vouchers: true },
    })

    /*
     * Confirming by hand has to finish the booking, not just relabel it.
     *
     * Moving an order to CONFIRMED changed one column and nothing else: the
     * payment stayed PENDING, so the customer's booking page showed
     * "confirming your payment with the bank" for ever; the seats stayed held
     * rather than booked; and no voucher was ever issued. Staff confirm
     * exactly when the gateway has gone quiet and the money is known to have
     * arrived, which is the moment the customer most needs their voucher.
     *
     * This is an operator's decision, and the audit log records it as one —
     * it is not, and must not be presented as, gateway verification.
     */
    if (next === "CONFIRMED" && !["APPROVED", "PAID"].includes(order.paymentStatus)) {
      // The gateway's own transaction number, when staff have it from the
      // AmwalPay receipt. It is what reconciles this order against the
      // merchant statement, so it is worth capturing even though we could not
      // obtain it automatically.
      const gatewayReference = String(body.gatewayReference || "").trim().slice(0, 120)
      await db.payment.updateMany({
        where: { orderId: id, status: { in: ["PENDING", "SUBMITTED"] } },
        data: {
          status: "APPROVED",
          verifiedById: staffId,
          verifiedAt: new Date(),
          ...(gatewayReference ? { gatewayReference } : {}),
        },
      })
      await db.order.update({ where: { id }, data: { paymentStatus: "APPROVED" } })
      await confirmSlotSeats(order.slotId, order.paxAdult + order.paxChild).catch(() => {})

      if (!(await db.voucher.findFirst({ where: { orderId: id } }))) {
        await db.voucher.create({
          data: {
            orderId: id,
            customerId: order.customerId,
            voucherCode: await generateVoucherCode(),
            qrData: order.orderNumber,
          },
        })
      }

      await createAuditLog({
        staffId,
        orderId: id,
        action: "PAYMENT_CONFIRMED",
        entity: "ORDER",
        entityId: id,
        reason,
        details: `Marked paid by staff — no gateway notification${gatewayReference ? ` · ${gatewayReference}` : ""}`,
      }).catch(() => {})

      void sendOrderConfirmation(id).catch(() => {})
    }

    await refreshCustomerTotals(order.customerId)
    void syncOrderToCalendar(order.id)

    await createAuditLog({
      staffId,
      orderId: id,
      action: "SET_ORDER_STATUS",
      entity: "ORDER",
      entityId: id,
      reason,
      details: JSON.stringify({ from: order.orderStatus, to: next }),
    })

    return NextResponse.json({ order: updated })
  }

  if (action === "CANCEL") {
    const updated = await db.order.update({
      where: { id },
      data: {
        orderStatus: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason,
        paymentStatus: order.paymentStatus === "APPROVED" || order.paymentStatus === "PAID" ? "REFUNDED" : order.paymentStatus,
      },
    })
    // Release seats
    if (order.slot) {
      await db.slot.update({
        where: { id: order.slotId },
        data: { seatsBooked: { decrement: order.paxAdult + order.paxChild }, status: "OPEN" },
      })
    }
    await refreshCustomerTotals(order.customerId)
    void syncOrderToCalendar(order.id)
    await createAuditLog({ staffId, orderId: id, action: "CANCEL_ORDER", entity: "ORDER", entityId: id, reason })
    return NextResponse.json({ order: updated })
  }

  if (action === "COMPLETE") {
    const updated = await db.order.update({
      where: { id },
      data: { orderStatus: "COMPLETED", completedAt: new Date() },
    })
    await refreshCustomerTotals(order.customerId)
    void syncOrderToCalendar(order.id)
    await createAuditLog({ staffId, orderId: id, action: "COMPLETE_ORDER", entity: "ORDER", entityId: id })
    return NextResponse.json({ order: updated })
  }

  if (action === "NO_SHOW") {
    const updated = await db.order.update({
      where: { id },
      data: { orderStatus: "NO_SHOW" },
    })
    await createAuditLog({ staffId, orderId: id, action: "MARK_NO_SHOW", entity: "ORDER", entityId: id })
    return NextResponse.json({ order: updated })
  }

  if (action === "RESCHEDULE") {
    const newSlotId = body.newSlotId
    const newSlot = await db.slot.findUnique({ where: { id: newSlotId } })
    if (!newSlot) return NextResponse.json({ error: "New slot not found" }, { status: 400 })
    
    // Release old slot, book new slot
    if (order.slot) {
      await db.slot.update({
        where: { id: order.slotId },
        data: { seatsBooked: { decrement: order.paxAdult + order.paxChild }, status: "OPEN" },
      })
    }
    await confirmSlotSeats(newSlotId, order.paxAdult + order.paxChild)
    
    const updated = await db.order.update({
      where: { id },
      data: { slotId: newSlotId },
    })
    void syncOrderToCalendar(order.id)
    await createAuditLog({ staffId, orderId: id, action: "RESCHEDULE_ORDER", entity: "ORDER", entityId: id, details: { from: order.slotId, to: newSlotId } })
    return NextResponse.json({ order: updated })
  }

  // Plain field edit from the admin form. Whitelisted rather than spreading the
  // body: an un-filtered update would let a caller rewrite orderStatus,
  // paymentStatus or confirmedAt and skip the seat and voucher handling that
  // the actions above perform.
  const EDITABLE = [
    "customerName", "customerPhone", "customerEmail",
    "pickupLocation", "specialRequests",
    "paxAdult", "paxChild", "totalAmount",
  ] as const

  const data: Record<string, unknown> = {}
  for (const field of EDITABLE) {
    if (!(field in updateData)) continue
    const value = updateData[field]
    if (field === "paxAdult" || field === "paxChild") {
      const n = Number(value)
      if (!Number.isInteger(n) || n < 0 || n > 50) {
        return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 })
      }
      data[field] = n
    } else if (field === "totalAmount") {
      const n = Number(value)
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: "Invalid total" }, { status: 400 })
      }
      data[field] = n
    } else if (field === "customerName" || field === "customerPhone") {
      // Both columns are non-nullable, so an emptied input is a bad edit
      // rather than a clear.
      const text = String(value ?? "").trim()
      if (!text) return NextResponse.json({ error: `${field} cannot be empty` }, { status: 400 })
      data[field] = text.slice(0, 200)
    } else {
      // The remaining text columns are optional: store null rather than "".
      data[field] = value === "" || value == null ? null : String(value).slice(0, 2000)
    }
  }

  if (data.paxAdult !== undefined && Number(data.paxAdult) < 1) {
    return NextResponse.json({ error: "A booking needs at least one adult" }, { status: 400 })
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  const updated = await db.order.update({
    where: { id },
    data,
    include: { tour: true, slot: true, customer: true, payments: true, vouchers: true },
  })
  await createAuditLog({
    staffId,
    orderId: id,
    action: "EDIT_ORDER",
    entity: "ORDER",
    entityId: id,
    reason,
    details: JSON.stringify(data),
  })
  return NextResponse.json({ order: updated })
})
