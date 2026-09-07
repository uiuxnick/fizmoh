import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"

/**
 * QR Check-in API
 * Per BRD §7: "Digital voucher with QR check-in: Generate a scannable QR code per booking that field staff can scan on the day of the tour to confirm attendance/no-show"
 */

export const POST = withErrors(async (request: NextRequest) => {
  const body = await request.json()
  const { voucherCode, staffId } = body

  const voucher = await db.voucher.findUnique({
    where: { voucherCode },
    include: { order: { include: { tour: true, slot: true, customer: true } } },
  })

  if (!voucher) return NextResponse.json({ error: "Invalid voucher code" }, { status: 404 })
  if (voucher.status === "USED") return NextResponse.json({ error: "Voucher already used", checkedInAt: voucher.checkedInAt }, { status: 400 })
  if (voucher.status === "CANCELLED" || voucher.status === "EXPIRED") return NextResponse.json({ error: `Voucher is ${voucher.status}` }, { status: 400 })

  // Check in
  const updated = await db.voucher.update({
    where: { id: voucher.id },
    data: {
      status: "USED",
      checkedInAt: new Date(),
      checkedInBy: staffId,
    },
  })

  // Update order to COMPLETED
  await db.order.update({
    where: { id: voucher.orderId },
    data: { orderStatus: "COMPLETED", completedAt: new Date() },
  })

  // Create audit log
  await db.auditLog.create({
    data: {
      staffId,
      orderId: voucher.orderId,
      action: "CHECK_IN",
      entity: "VOUCHER",
      entityId: voucher.id,
      details: { voucherCode, customer: voucher.order.customerName, tour: voucher.order.tour.name },
    },
  })

  return NextResponse.json({
    success: true,
    voucher: updated,
    order: {
      orderNumber: voucher.order.orderNumber,
      customer: voucher.order.customerName,
      tour: voucher.order.tour.name,
      date: voucher.order.slot.date,
      time: voucher.order.slot.startTime,
      pax: voucher.order.paxAdult + voucher.order.paxChild,
    },
  })
})
