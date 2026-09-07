import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendWhatsApp } from "@/lib/notifications"
import { sendCtaUrlMessage } from "@/lib/whatsapp"
import { withErrors } from "@/lib/api-handler"
import { publicBaseUrl } from "@/lib/app-config"

/**
 * Abandoned Booking Recovery API
 * Per BRD §7: "Abandoned booking recovery: Auto-detect incomplete bookings (slot selected, payment not completed) and send a reminder via WhatsApp/email with a direct resume link"
 *
 * Finds orders stuck in PENDING_PAYMENT for >1 hour and sends reminders
 */

export const GET = withErrors(async () => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const abandoned = await db.order.findMany({
    where: {
      orderStatus: "PENDING_PAYMENT",
      createdAt: { lt: oneHourAgo },
    },
    include: { tour: true, slot: true, customer: true },
    take: 50,
  })

  return NextResponse.json({ abandoned, count: abandoned.length })
})

export const POST = withErrors(async (request: NextRequest) => {
  // Links used to point at one business's own domain, so every other
  // business's cart reminder sent their customer to a competitor.
  const base = await publicBaseUrl()
  const body = await request.json()
  const { orderId } = body

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { tour: true, slot: true, customer: true },
  })
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

  if (order.customer?.whatsappOptIn) {
    const available = order.slot ? (order.slot as any).capacity - (order.slot as any).seatsBooked : 0
    const payUrl = `${base}/booking/${encodeURIComponent(order.orderNumber)}`
    const body = `Hi ${order.customerName}, you left "${order.tour.name}" in your cart!${available < 5 ? ` 🔥 Only ${available} seats left for ${order.slot.startTime}.` : ""}`

    // A button, not a bare link: both open WhatsApp's in-app browser, but a
    // button is tapped far more often — and this message exists to be tapped.
    const sent = await sendCtaUrlMessage({
      to: order.customerPhone,
      body,
      buttonText: "Complete booking",
      url: payUrl,
    })
    if (!sent.success) {
      await sendWhatsApp({ to: order.customerPhone, body: `${body} Complete your booking now: ${payUrl}` })
    }
  }

  return NextResponse.json({ success: true, message: "Recovery reminder sent" })
})
