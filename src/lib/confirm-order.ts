import { db } from "@/lib/db"
import { generateVoucherCode } from "@/lib/helpers"
import { confirmSlotSeats } from "@/lib/slots-server"

/**
 * Confirms a booking exactly once, whoever asks.
 *
 * Two paths now confirm the same order: the customer sending their transfer
 * screenshot, and a member of staff approving that payment afterwards. Both
 * used to run the same block of work, and `confirmSlotSeats` compiles to an
 * unconditional `seatsBooked = seatsBooked + n` — so running it twice for one
 * booking silently books the seats twice, overselling a departure that looks
 * fine in the panel until people arrive for it.
 *
 * The claim is a conditional UPDATE on `confirmedAt IS NULL`. The database
 * decides the winner, so a screenshot and an approval landing in the same
 * moment cannot both take the seats. A caller that loses the race still gets
 * the order and the existing voucher back, because it has not failed at
 * anything — the booking is confirmed, just not by it.
 */
export async function confirmOrderOnce(orderId: string): Promise<{
  order: Awaited<ReturnType<typeof loadOrder>>
  voucherCode: string
  alreadyConfirmed: boolean
} | null> {
  const claimed = await db.order.updateMany({
    where: { id: orderId, confirmedAt: null },
    data: { orderStatus: "CONFIRMED", confirmedAt: new Date() },
  })
  const alreadyConfirmed = claimed.count === 0

  const order = await loadOrder(orderId)
  if (!order) return null

  // Only the caller that won the claim moves the seats.
  if (!alreadyConfirmed) {
    await confirmSlotSeats(order.slotId, order.paxAdult + order.paxChild)
  }

  // A second voucher code for one booking leaves the customer holding two and
  // knowing which to present at check-in, so an existing valid one is reused.
  const existing = await db.voucher.findFirst({ where: { orderId: order.id, status: "VALID" } })
  const voucherCode = existing?.voucherCode ?? (await generateVoucherCode())
  if (!existing) {
    await db.voucher.create({
      data: {
        voucherCode,
        orderId: order.id,
        customerId: order.customerId,
        qrData: JSON.stringify({
          voucherCode,
          orderNumber: order.orderNumber,
          tour: order.tour.name,
          date: order.slot.date,
          time: order.slot.startTime,
          pax: order.paxAdult + order.paxChild,
          customer: order.customerName,
        }),
        status: "VALID",
      },
    })
  }

  return { order, voucherCode, alreadyConfirmed }
}

function loadOrder(orderId: string) {
  return db.order.findUnique({
    where: { id: orderId },
    include: { tour: true, slot: true, customer: true },
  })
}
