import { db } from "@/lib/db"
import { generateVoucherCode, formatCurrency, formatDate } from "@/lib/helpers"
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

/**
 * Sends a WhatsApp booking confirmation message after an order is placed or
 * payment is received, with a Track Order button and a Contact Us button.
 *
 * Two messages are sent because WhatsApp does not allow a CTA URL button
 * (opens a link) and reply buttons (tap-to-reply) in the same interactive
 * message. The first carries the tracking link; the second offers quick actions.
 *
 * Safe to call from any path that completes a booking — booking-flow.ts,
 * payments/verify, and the BotFlow BOOKING node. confirmOrderOnce is idempotent
 * so calling this after it is also idempotent.
 */
export async function sendOrderConfirmationWA(params: {
  phone: string
  orderRef: string
  tourName: string
  slotDate?: string | null
  slotTime?: string | null
  paxAdult: number
  paxChild?: number
  totalAmount: number
  currency?: string
  voucherCode?: string | null
  lang?: "en" | "ar"
  conversationId: string
  customerId: string
  tenantId?: string
}): Promise<void> {
  const {
    phone, orderRef, tourName, slotDate, slotTime,
    paxAdult, paxChild = 0, totalAmount, currency = "OMR",
    voucherCode, lang = "en", conversationId, customerId, tenantId,
  } = params

  const ar = lang === "ar"
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud"
  const trackUrl = `${baseUrl}/track/${encodeURIComponent(orderRef)}`

  // Build bilingual confirmation body
  const dateStr = slotDate ? formatDate(slotDate) : null
  const timeStr = slotTime || null
  const whenLine = dateStr
    ? (ar ? `📅 ${dateStr}${timeStr ? ` الساعة ${timeStr}` : ""}` : `📅 ${dateStr}${timeStr ? ` at ${timeStr}` : ""}`)
    : null
  const totalPax = paxAdult + paxChild
  const paxLine = ar
    ? `👥 ${totalPax} شخص${paxChild > 0 ? ` (${paxAdult} بالغ، ${paxChild} طفل)` : ""}`
    : `👥 ${totalPax} guest${totalPax === 1 ? "" : "s"}${paxChild > 0 ? ` (${paxAdult} adult, ${paxChild} child)` : ""}`

  const body = ar
    ? `🎉 *تم تأكيد حجزك!*\n\n` +
      `🎫 *${tourName}*\n` +
      (whenLine ? `${whenLine}\n` : "") +
      `${paxLine}\n` +
      `💰 *${formatCurrency(totalAmount)}*\n` +
      (voucherCode ? `🎟️ رمز القسيمة: *${voucherCode}*\n` : "") +
      `\n🔢 رقم الطلب: *${orderRef}*\n\nشكراً لحجزك معنا! نتطلع لاستقبالك 🐎✨`
    : `🎉 *Booking Confirmed!*\n\n` +
      `🎫 *${tourName}*\n` +
      (whenLine ? `${whenLine}\n` : "") +
      `${paxLine}\n` +
      `💰 *${formatCurrency(totalAmount)}*\n` +
      (voucherCode ? `🎟️ Voucher: *${voucherCode}*\n` : "") +
      `\n🔢 Order: *${orderRef}*\n\nThank you for booking with us! We look forward to welcoming you 🐎✨`

  try {
    const { sendCtaUrlMessage, sendInteractiveMessage } = await import("@/lib/whatsapp")
    const { getConfigValue } = await import("@/lib/app-config")

    // Message 1: Booking details + Track Order CTA button
    const sent = await sendCtaUrlMessage({
      to: phone,
      body,
      buttonText: ar ? "تتبع طلبي" : "Track My Order",
      url: trackUrl,
    })

    // Fallback to plain text if CTA failed (e.g. outside session)
    if (!sent.success) {
      const { sendWhatsApp } = await import("@/lib/notifications")
      await sendWhatsApp({ to: phone, body: `${body}\n\n👉 ${trackUrl}`, allowOutsideSession: true })
    }

    // Message 2: Quick action buttons
    const businessPhone = tenantId
      ? (await getConfigValue("business_phone").catch(() => "")).trim()
      : ""
    const waNumber = businessPhone.replace(/\D/g, "")
    const waContactUrl = waNumber ? `https://wa.me/${waNumber}` : null

    if (waContactUrl) {
      await sendCtaUrlMessage({
        to: phone,
        body: ar
          ? "هل لديك استفسار؟ تواصل معنا عبر الزر أدناه 👇"
          : "Have a question? Contact us anytime 👇",
        buttonText: ar ? "تواصل معنا" : "Contact Us",
        url: waContactUrl,
      })
    } else {
      // No business phone — offer quick-reply options instead
      await sendInteractiveMessage({
        to: phone,
        body: ar
          ? "هل تحتاج أي مساعدة إضافية؟ 💬"
          : "Need any help with your booking? 💬",
        buttons: [
          { id: "bk_chat_ai", title: ar ? "🤖 المساعد الذكي" : "🤖 AI Assistant" },
          { id: "bk_chat_human", title: ar ? "👤 تحدث مع موظف" : "👤 Talk to a Human" },
        ],
      })
    }

    // Store bot messages for the inbox
    const { db: database } = await import("@/lib/db")
    await database.message.create({
      data: {
        conversationId,
        customerId,
        direction: "BOT",
        type: "TEXT",
        content: `${body}\n${trackUrl}`,
        isAiGenerated: false,
        status: "SENT",
      },
    })
  } catch (err) {
    // Confirmation failure is non-fatal — the booking is already placed.
    console.error("[sendOrderConfirmationWA] Failed to send WA confirmation:", err)
  }
}
