/**
 * Notification Service
 * Handles Email + WhatsApp message sending
 *
 * Per BRD §6.7: Unified Order Confirmation Flow
 * - Email confirmation with PDF voucher
 * - WhatsApp confirmation with QR/voucher image
 * - Internal staff notification
 *
 * In simulation mode, messages are logged to the database (Notification model)
 * and displayed in the admin panel. When real credentials are provided,
 * messages are sent via the actual providers.
 */

import { db, raw } from "@/lib/db"
import { formatCurrency, formatDate } from "@/lib/helpers"
import { sendTextMessage, sendTemplateMessage, sendMediaMessage, type CarouselCardValues } from "@/lib/whatsapp"
import { canSendFreeform } from "@/lib/whatsapp-session"
import { notifyStaff } from "@/lib/realtime"

// ─── EMAIL ───

interface EmailMessage {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: { filename: string; content: Buffer; contentType: string }[]
}

/**
 * Sends an email over SMTP.
 *
 * This used to return `{ success: true }` with a fabricated message id whether
 * or not SMTP was configured, and never called a mail server in either branch.
 * Every caller — order confirmations, invoices, review requests — believed the
 * mail had gone out. Now the only success returned is one the SMTP server
 * acknowledged, and an unconfigured system reports that plainly so the caller
 * can fall back to WhatsApp rather than assume the customer was told.
 */
/**
 * The business a message is going out on behalf of.
 *
 * Every template here named one workspace: emails came "from Oman
 * Adventures", the confirmation footer gave that workspace's support address,
 * and a failed payment told the customer to ring +968 9000 0000 — a number
 * that belongs to nobody. Their customers read all of it.
 *
 * Contact details are returned empty when unset rather than filled with a
 * plausible-looking substitute, and every caller drops the line instead of
 * printing an address or number that will not reach anyone.
 */
async function issuer(tenantId?: string | null): Promise<{ name: string; email: string; phone: string }> {
  const { getConfigValue } = await import("@/lib/app-config")
  const [name, email, phone] = await Promise.all([
    getConfigValue("business_name").catch(() => ""),
    getConfigValue("business_email").catch(() => ""),
    getConfigValue("business_phone").catch(() => ""),
  ])
  let business = (name || "").trim()
  if (!business && tenantId) {
    business = (await raw.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }))?.name || ""
  }
  return { name: business, email: (email || "").trim(), phone: (phone || "").trim() }
}

/** "…or call X" / "…at Y" only when there is something real to call or write to. */
function contactSentence(brand: { email: string; phone: string }): string {
  const parts = [brand.email, brand.phone].filter(Boolean)
  return parts.length ? `Contact us at ${parts.join(" or ")}` : ""
}

export async function sendEmail(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Settings saved in the admin panel take precedence over the environment.
  const { getConfigValue } = await import("@/lib/app-config")
  const host = await getConfigValue("smtp_host")
  if (!host) {
    return { success: false, error: "Email is not configured — add an SMTP host in Settings" }
  }

  try {
    const nodemailer = (await import("nodemailer")).default
    const port = Number((await getConfigValue("smtp_port")) || 587)
    const user = await getConfigValue("smtp_user")
    const pass = await getConfigValue("smtp_password")
    const from = await getConfigValue("smtp_from")
    // A mail server on this same machine usually presents a self-signed
    // certificate — the panel that installed it generated one. Verification is
    // still on by default: turning it off for a remote server would mean any
    // machine that can answer for that name can read the mail we send it.
    const allowSelfSigned = (await getConfigValue("smtp_allow_self_signed"))
      .toLowerCase()
      .trim()
    const lenient = allowSelfSigned === "on" || allowSelfSigned === "true"

    const transport = nodemailer.createTransport({
      host,
      port,
      // Port 465 is implicit TLS; 587 upgrades with STARTTLS after connecting.
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
      ...(lenient ? { tls: { rejectUnauthorized: false } } : {}),
    })

    // The workspace's own name on the envelope, over an address that exists:
    // the SMTP user it authenticated as, or this installation's own host.
    // Never a domain assembled from the business name.
    let fromHeader = from
    if (!fromHeader) {
      const brand = await issuer()
      const { publicBaseUrl } = await import("@/lib/app-config")
      let address = user
      if (!address) {
        let host = "fizmoh.cloud"
        try { host = new URL(await publicBaseUrl()).hostname } catch {}
        address = `no-reply@${host}`
      }
      fromHeader = brand.name ? `${brand.name} <${address}>` : address
    }

    const info = await transport.sendMail({
      from: fromHeader,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      attachments: message.attachments,
    })

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Email send error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to send email" }
  }
}

// ─── WHATSAPP ───

interface WhatsAppMessage {
  to: string // phone number with country code
  templateName?: string
  templateVariables?: string[]
  body?: string
  imageUrl?: string
  documentUrl?: string
  documentName?: string
  videoUrl?: string
  /** Carousel cards, when the template is one. */
  cards?: CarouselCardValues[]
  buttonText?: string
  buttonUrl?: string
  language?: string
  /** Bypass the 24h session check — only for replies inside a live webhook turn. */
  allowOutsideSession?: boolean
}

/** The template half of a message, in the shape the Cloud API wants. */
function templateParamsFor(message: WhatsAppMessage) {
  return {
    to: message.to,
    templateName: message.templateName!,
    language: message.language || "en_US",
    variables: message.templateVariables,
    headerImageUrl: message.imageUrl,
    headerDocumentUrl: message.documentUrl,
    headerDocumentName: message.documentName,
    headerVideoUrl: message.videoUrl,
    buttonUrl: message.buttonUrl,
    cards: message.cards,
  }
}

export async function sendWhatsApp(message: WhatsAppMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Templates are deliverable at any time; freeform is only deliverable inside
  // the 24h session window. When both are supplied we prefer the template
  // outside the window and freeform inside it, so a reply to a live
  // conversation reads naturally but a cold send still gets through.
  const hasTemplate = !!message.templateName
  const hasBody = !!message.body

  if (hasTemplate && hasBody) {
    const freeformAllowed = await canSendFreeform(message.to)
    if (freeformAllowed) return sendTextMessage(message.to, message.body!)
    return sendTemplateMessage(templateParamsFor(message))
  }

  if (hasTemplate) {
    return sendTemplateMessage(templateParamsFor(message))
  }

  if (hasBody) {
    // Freeform outside the window is silently dropped by Meta. Fail loudly
    // here instead so callers and logs show why nothing arrived.
    if (!message.allowOutsideSession && !(await canSendFreeform(message.to))) {
      return {
        success: false,
        error: "Outside the 24-hour session window — an approved template is required",
      }
    }
    return sendTextMessage(message.to, message.body!)
  }

  return { success: false, error: "No message content provided" }
}

// ─── UNIFIED CONFIRMATION FLOW (BRD §6.7) ───

export async function sendOrderConfirmation(orderId: string): Promise<{ email: boolean; whatsapp: boolean; staff: boolean }> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { tour: true, slot: true, customer: true, vouchers: true, payments: true },
  })

  if (!order) {
    return { email: false, whatsapp: false, staff: false }
  }

  const brand = await issuer(order.tenantId)
  const brandContact = contactSentence(brand)
  const voucher = order.vouchers[0]
  const payment = order.payments[0]
  const dateStr = formatDate(order.slot.date)
  const amountStr = formatCurrency(order.totalAmount)

  // ─── 1. EMAIL CONFIRMATION (BRD §6.7) ───
  let emailSent = false
  if (order.customerEmail) {
    const { getBookingConfirmationEmailHtml } = await import("@/lib/email-templates")
    const emailHtml = getBookingConfirmationEmailHtml({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      tourName: order.tour.name,
      dateStr,
      timeStr: order.slot.startTime,
      paxText: `${order.paxAdult} Adults${order.paxChild ? `, ${order.paxChild} Children` : ""}`,
      meetingPoint: order.tour.meetingPoint || "TBA",
      paymentMethod: order.paymentMethod === "BANK_TRANSFER" ? "Bank Transfer" : "AmwalPay",
      paymentRef: payment?.gatewayReference || payment?.bankReference || "Verified",
      amountStr,
      voucherCode: voucher?.voucherCode,
      cancellationPolicy: order.tour.cancellationPolicy || undefined,
      brandName: brand.name || "Fizmoh",
      supportContact: { email: brand.email || undefined, phone: brand.phone || undefined },
    })

    const emailResult = await sendEmail({
      to: order.customerEmail,
      subject: `Booking Confirmed - ${order.orderNumber}${brand.name ? ` | ${brand.name}` : ""}`,
      html: emailHtml,
      text: `Booking Confirmed. Order: ${order.orderNumber}, Tour: ${order.tour.name}, Date: ${dateStr} ${order.slot.startTime}, Total: ${amountStr}`,
    })
    emailSent = emailResult.success
  }

  // ─── 2. WHATSAPP CONFIRMATION (BRD §6.7) ───
  let whatsappSent = false
  if (order.customer?.whatsappOptIn) {
    const waBody = `Dear ${order.customerName}, your booking is confirmed!

🎫 Order: ${order.orderNumber}
📍 Tour: ${order.tour.name}
📅 Date: ${dateStr}
⏰ Time: ${order.slot.startTime}
👥 Pax: ${order.paxAdult} Adults${order.paxChild ? `, ${order.paxChild} Children` : ""}
💰 Amount: ${amountStr}
${voucher ? `🎟️ Voucher: ${voucher.voucherCode}` : ""}

Show this message at check-in. Have a great trip! 🐪`

    // Send the e-ticket as a document. Meta fetches the URL from its own
    // servers, which is why the PDF route is token-guarded rather than
    // session-protected.
    const sendTicket = async () => {
      try {
        const { voucherPdfUrl } = await import("@/app/api/vouchers/[id]/pdf/route")
        await sendMediaMessage({
          to: order.customerPhone,
          type: "document",
          mediaUrl: voucherPdfUrl(order.id),
          filename: `eticket-${order.orderNumber}.pdf`,
          caption: `Your e-ticket for ${order.tour.name}`,
        })
      } catch (error) {
        // A failed ticket must not fail the confirmation itself — the customer
        // still gets the details in the message and can download from the link.
        console.error("E-ticket send failed:", error)
      }
    }

    const waResult = await sendWhatsApp({
      to: order.customerPhone,
      templateName: "order_confirmation",
      templateVariables: [
        order.customerName,
        order.orderNumber,
        order.tour.name,
        dateStr,
        order.slot.startTime,
        `${order.paxAdult + (order.paxChild || 0)}`,
        amountStr,
        "OMR",
      ],
      body: waBody,
    })
    whatsappSent = waResult.success
    if (waResult.success) await sendTicket()
  }

  // ─── 3. STAFF NOTIFICATION (BRD §6.7) ───
  await notifyStaff({
    type: "BOOKING_CONFIRMED",
    title: "New confirmed booking",
    message: `${order.orderNumber} - ${order.customerName} - ${order.tour.name} - ${dateStr} ${order.slot.startTime} - ${amountStr}`,
    data: { orderId: order.id, voucherCode: voucher?.voucherCode, staffAction: "arrange_field_logistics" },
    forRole: "OPS_ADMIN",
  })

  return { email: emailSent, whatsapp: whatsappSent, staff: true }
}

// ─── PAYMENT NOTIFICATIONS ───

export async function sendPaymentSubmittedNotification(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { tour: true, customer: true },
  })
  if (!order) return

  // Notify finance/admin
  await notifyStaff({
    type: "PAYMENT_SUBMITTED",
    title: "Payment submitted for verification",
    message: `${order.orderNumber} - ${order.customerName} - ${formatCurrency(order.totalAmount)} - ${order.paymentMethod === "BANK_TRANSFER" ? "Bank Transfer" : "AmwalPay"}`,
    data: { orderId: order.id, customerPhone: order.customerPhone },
    forRole: "FINANCE",
  })

  // Send WhatsApp to customer acknowledging receipt
  if (order.customer?.whatsappOptIn) {
    await sendWhatsApp({
      to: order.customerPhone,
      templateName: "payment_received",
      templateVariables: [order.customerName || "Customer", order.totalAmount.toFixed(3), "OMR", order.orderNumber],
      body: `Hi ${order.customerName}, we've received your payment of ${formatCurrency(order.totalAmount)} for order ${order.orderNumber}. Your booking is now being verified. You'll receive a confirmation shortly.`,
    })
  }
}

export async function sendPaymentRejectedNotification(orderId: string, reason: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  })
  if (!order) return

  const rejectBrand = await issuer(order.tenantId)
  const rejectContact = contactSentence(rejectBrand)

  if (order.customer?.whatsappOptIn) {
    await sendWhatsApp({
      to: order.customerPhone,
      templateName: "payment_rejected",
      templateVariables: [order.customerName || "Customer", order.orderNumber, reason, rejectBrand.phone || rejectBrand.email || ""],
      body: `Hi ${order.customerName}, unfortunately we couldn't verify your payment for order ${order.orderNumber}. Reason: ${reason}. Please resubmit${rejectContact ? ` or ${rejectContact.replace(/^Contact us at /, "contact us at ")}` : ""}.`,
    })
  }

  if (order.customerEmail) {
    const { getPaymentVerificationEmailHtml } = await import("@/lib/email-templates")
    await sendEmail({
      to: order.customerEmail,
      subject: `Payment Verification Update - ${order.orderNumber}`,
      html: getPaymentVerificationEmailHtml({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        verified: false,
        reason,
        contactText: rejectContact,
        brandName: rejectBrand.name || "Fizmoh",
      }),
      text: `Payment Verification Update for Order ${order.orderNumber}. Unfortunately we could not verify your payment: ${reason}. Please resubmit or contact us.`,
    })
  }
}

// ─── REMINDERS (BRD §6.3) ───

export async function sendPreTourReminder(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { tour: true, slot: true, customer: true },
  })
  if (!order || order.orderStatus !== "CONFIRMED") return

  if (order.customer?.whatsappOptIn) {
    await sendWhatsApp({
      to: order.customerPhone,
      templateName: "tour_reminder",
      templateVariables: [order.tour.name, order.slot.startTime, order.tour.meetingPoint || "See voucher"],
      body: `Reminder: Your tour "${order.tour.name}" is tomorrow at ${order.slot.startTime}. Meeting point: ${order.tour.meetingPoint || "See voucher"}. Please arrive 15 min early. Reply with your voucher QR or show this message.`,
    })
  }
}

export async function sendPostTourReviewRequest(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { tour: true, customer: true },
  })
  if (!order) return

  const { publicBaseUrl } = await import("@/lib/app-config")
  const reviewBase = (await publicBaseUrl()).replace(/\/$/, "")

  if (order.customer?.whatsappOptIn) {
    await sendWhatsApp({
      to: order.customerPhone,
      templateName: "post_tour_review",
      templateVariables: [order.customerName || "Customer", order.tour.name, `${reviewBase}/review/${order.id}`],
      body: `Hi ${order.customerName}, how was your "${order.tour.name}" experience? We'd love your feedback! Rate your trip and get 10% off your next adventure.`,
    })
  }
}
