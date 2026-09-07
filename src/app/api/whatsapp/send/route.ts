import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendWhatsApp } from "@/lib/notifications"
import { sendInteractiveMessage, sendMediaMessage } from "@/lib/whatsapp"
import { withErrors } from "@/lib/api-handler"
import { withinLimit, limitReached } from "@/lib/entitlements"
import { sendCtaUrlMessage } from "@/lib/whatsapp"
import { businessName } from "@/lib/app-config"
import { currentTenant } from "@/lib/tenant"
import { sessionFromRequest } from "@/lib/auth"

/**
 * Send WhatsApp Message API
 * Per BRD §6.5.1: "Pay in chat: Send AmwalPay payment link, or accept bank-transfer screenshot"
 * Per BRD §6.5.1: "Rich media & carousel messages: Product carousels"
 *
 * Sends various message types via WhatsApp Cloud API:
 * - Text messages
 * - Template messages
 * - Interactive messages (buttons, lists)
 * - Media messages (image, document)
 * - Payment links
 */

export const POST = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Sign in first" }, { status: 401 })
  // A plan buys a number of messages a month. Counted from what was actually sent, not from a running total that can drift.
  const room = await withinLimit("messagesPerMonth")
  if (!room.ok) return limitReached("messagesPerMonth", room.used, room.cap)

  const body = await request.json()
  const { to: rawTo, conversationId, type, ...messageData } = body
  const to = String(rawTo || "").trim()
  if (!/^\+?[1-9]\d{7,14}$/.test(to.replace(/[\s()-]/g, ""))) {
    return NextResponse.json({ error: "A valid recipient phone number is required" }, { status: 400 })
  }

  let waResult: { success: boolean; messageId?: string; error?: string }

  switch (type) {
    case "text":
      waResult = await sendWhatsApp({ to, body: messageData.body })
      break

    case "template":
      waResult = await sendWhatsApp({
        to,
        templateName: messageData.templateName,
        templateVariables: messageData.variables || [],
        imageUrl: messageData.imageUrl,
        videoUrl: messageData.videoUrl,
        documentUrl: messageData.documentUrl,
        documentName: messageData.documentName,
        // A carousel template is rejected outright unless the send repeats
        // every card with its media, so the caller's cards are passed through.
        cards: Array.isArray(messageData.cards) ? messageData.cards : undefined,
        buttonText: messageData.buttonText,
        buttonUrl: messageData.buttonUrl,
      })
      break

    case "payment_link":
      // Per BRD §6.5.1: "Pay in chat: Send AmwalPay payment link"
      const order = await db.order.findUnique({
        where: { id: messageData.orderId },
        include: { tour: true, slot: true },
      })
      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })
      if (order.customerPhone.replace(/[\s()-]/g, "") !== to.replace(/[\s()-]/g, "")) {
        return NextResponse.json({ error: "Recipient must match the order customer" }, { status: 403 })
      }

      const paymentLink = `${process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud"}/api/amwalpay/create-session?orderId=${order.id}`
      const paymentBody = `Complete your booking for "${order.tour.name}"\n\n🎫 Order: ${order.orderNumber}\n📅 ${order.slot.date.toISOString().split("T")[0]} at ${order.slot.startTime}\n💰 Amount: ${order.totalAmount.toFixed(3)} OMR`

      // The same button an agent sends by hand as the bot sends automatically,
      // so a customer is not shown two different-looking ways to pay.
      waResult = await sendCtaUrlMessage({
        to,
        body: paymentBody,
        buttonText: "Pay now",
        url: paymentLink,
        footerText: "Trouble loading? Tap ⋮ then Open in browser",
      })
      if (!waResult.success) {
        waResult = await sendWhatsApp({ to, body: `${paymentBody}\n\nPay securely:\n${paymentLink}` })
      }
      break

    case "bank_instructions":
      // Send bank transfer instructions in chat
      const banks = await db.bankAccount.findMany({ where: { isActive: true } })
      const bankText = banks.map(b => `🏦 ${b.bankName}\nAccount: ${b.accountName}\nIBAN: ${b.iban}`).join("\n\n")
      waResult = await sendWhatsApp({
        to,
        body: `To complete your booking via bank transfer:\n\n${bankText}\n\nAfter transferring, send a screenshot of the receipt here 📎`,
      })
      break

    case "carousel": {
      // Per BRD §6.5.1: "Product carousels (multiple tours with images, price,
      // and 'Book Now' quick-reply button)". WhatsApp has no true carousel
      // outside of catalog/template messages, so the closest native equivalent
      // is an interactive list the customer taps — far better than a numbered
      // text block they have to reply to by typing.
      const tours = (messageData.tours || []).slice(0, 10)
      if (tours.length === 0) {
        waResult = { success: false, error: "No tours supplied for carousel" }
        break
      }
      waResult = await sendInteractiveMessage({
        to,
        headerText: messageData.headerText || "Our Tours",
        body: messageData.body || "Tap below to browse and book:",
        footerText: await businessName(),
        list: {
          title: messageData.buttonText || "View tours",
          sections: [
            {
              title: "Available tours",
              rows: tours.map((t: any) => ({
                id: `tour_${t.id ?? t.slug ?? t.name}`,
                // Meta caps these — an over-long title silently rejects the send.
                title: String(t.name).slice(0, 24),
                description: `${t.price} OMR · ${t.duration}h · ${t.city}`.slice(0, 72),
              })),
            },
          ],
        },
      })
      break
    }

    case "interactive_buttons": {
      // Up to 3 quick-reply buttons — the guided booking flow in BRD §6.5.1.
      const buttons = (messageData.buttons || []).slice(0, 3)
      if (buttons.length === 0) {
        waResult = { success: false, error: "No buttons supplied" }
        break
      }
      waResult = await sendInteractiveMessage({
        to,
        headerText: messageData.headerText,
        body: messageData.body || "Please choose:",
        footerText: messageData.footerText,
        buttons: buttons.map((b: any, i: number) => ({
          id: b.id || `btn_${i}`,
          title: String(b.title).slice(0, 20),
        })),
      })
      break
    }

    case "interactive_list": {
      const sections = messageData.sections || []
      if (sections.length === 0) {
        waResult = { success: false, error: "No sections supplied" }
        break
      }
      waResult = await sendInteractiveMessage({
        to,
        headerText: messageData.headerText,
        body: messageData.body || "Please select an option:",
        footerText: messageData.footerText,
        list: { title: messageData.buttonText || "Select", sections },
      })
      break
    }

    case "media": {
      // Image / document / video — itineraries, vouchers, tour photos.
      waResult = await sendMediaMessage({
        to,
        type: messageData.mediaType || "image",
        mediaUrl: messageData.mediaUrl,
        caption: messageData.caption,
        filename: messageData.filename,
      })
      break
    }

    default:
      waResult = await sendWhatsApp({ to, body: messageData.body || "" })
  }

  // Store outbound message in conversation
  if (conversationId && waResult.success) {
    const conversation = await db.conversation.findUnique({ where: { id: conversationId } })
    if (conversation) {
      const msgMediaUrl = messageData.mediaUrl || messageData.imageUrl || null
      const msgType = type === "text" || type === "payment_link" || type === "bank_instructions"
        ? "TEXT"
        : type === "media" || msgMediaUrl
          ? (messageData.mediaType === "document" ? "DOCUMENT" : messageData.mediaType === "video" ? "VIDEO" : messageData.mediaType === "audio" ? "AUDIO" : "IMAGE")
          : "INTERACTIVE"

      const msgContent = messageData.caption || messageData.body || (msgMediaUrl ? "" : JSON.stringify(messageData))

      await db.message.create({
        data: {
          conversationId,
          customerId: conversation.customerId,
          direction: "OUTBOUND",
          type: msgType,
          content: msgContent,
          mediaUrl: msgMediaUrl,
          status: "SENT",
          interactiveData: messageData,
        },
      })
      await db.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date(), lastMessageText: msgContent || "[Media attachment]" },
      })
    }
  }

  return NextResponse.json(waResult)
})
