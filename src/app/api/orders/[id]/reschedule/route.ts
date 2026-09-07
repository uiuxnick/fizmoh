import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { confirmSlotSeats, createAuditLog } from "@/lib/slots-server"
import { withErrors } from "@/lib/api-handler"

/**
 * Reschedule an order to a new slot
 * Per BRD §6.3: "modify booking (reschedule/date change)"
 * Per BRD §7: "Customer self-service reschedule/cancel"
 */
export const POST = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const body = await request.json()
  const { newSlotId, staffId, reason } = body

  const order = await db.order.findUnique({ where: { id }, include: { slot: true, tour: true } })
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

  const newSlot = await db.slot.findUnique({ where: { id: newSlotId }, include: { tour: true } })
  if (!newSlot) return NextResponse.json({ error: "New slot not found" }, { status: 400 })

  const available = newSlot.capacity - newSlot.seatsBooked - newSlot.seatsHeld
  if (available < (order.paxAdult + order.paxChild)) {
    return NextResponse.json({ error: "Not enough seats in new slot" }, { status: 400 })
  }

  // Release old slot
  await db.slot.update({
    where: { id: order.slotId },
    data: {
      seatsBooked: { decrement: order.paxAdult + order.paxChild },
      status: "OPEN",
    },
  })

  // Book new slot
  await confirmSlotSeats(newSlotId, order.paxAdult + order.paxChild)

  // Update order
  const updated = await db.order.update({
    where: { id },
    data: { slotId: newSlotId },
    include: { tour: true, slot: true },
  })

  // Update voucher if exists
  const voucher = await db.voucher.findFirst({ where: { orderId: id } })
  if (voucher) {
    await db.voucher.update({
      where: { id: voucher.id },
      data: {
        qrData: JSON.stringify({
          voucherCode: voucher.voucherCode,
          orderNumber: order.orderNumber,
          tour: order.tour.name,
          date: newSlot.date,
          time: newSlot.startTime,
          pax: order.paxAdult + order.paxChild,
        }),
      },
    })
  }

  await createAuditLog({
    staffId,
    orderId: id,
    action: "RESCHEDULE_ORDER",
    entity: "ORDER",
    entityId: id,
    reason: reason || "Rescheduled by staff",
    details: { fromSlot: order.slotId, toSlot: newSlotId, fromDate: order.slot.date, toDate: newSlot.date },
  })

  return NextResponse.json({ order: updated })
})
