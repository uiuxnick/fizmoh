/**
 * PDF e-ticket generation.
 *
 * Uses pdf-lib rather than a HTML-to-PDF renderer: no headless browser to run
 * on the server, and the standard fonts are embedded without shipping font
 * files. The output is a real PDF, so WhatsApp and email clients render it as
 * a document rather than an attachment they cannot preview.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import QRCode from "qrcode"
import { db } from "@/lib/db"
import { formatCurrency, formatDate } from "@/lib/helpers"

const BRAND = rgb(0.059, 0.463, 0.431) // emerald-700
const INK = rgb(0.11, 0.098, 0.09)
const MUTED = rgb(0.47, 0.44, 0.42)

/**
 * Strips or converts characters that WinAnsi (standard PDF fonts) cannot encode.
 * Emojis, smart quotes, Arabic/non-Latin scripts and special symbols cause
 * pdf-lib StandardFonts to throw an unhandled exception.
 */
function toSafePdfText(text: string | null | undefined): string {
  if (!text) return ""
  return text
    // Replace smart quotes and dashes with ASCII equivalents
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    // Strip emojis and non-WinAnsi characters (keep printable ASCII + Latin-1)
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "")
    .trim()
}

export async function generateVoucherPDF(orderId: string): Promise<Uint8Array | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { tour: true, slot: true, customer: true, vouchers: true, payments: true },
  })
  if (!order) return null

  /*
   * Whose voucher this is.
   *
   * The header defaulted to one workspace's name, and the support address was
   * *invented* from it — "Al Bahr Stable" became support@albahrstable.com, a
   * domain the business may not own and somebody else might. A voucher is a
   * document a customer keeps and acts on, so it carries the workspace's own
   * configured contact or none at all.
   */
  const { getConfigValue } = await import("@/lib/app-config")
  const [configuredName, configuredEmail, configuredPhone] = await Promise.all([
    getConfigValue("business_name").catch(() => ""),
    getConfigValue("business_email").catch(() => ""),
    getConfigValue("business_phone").catch(() => ""),
  ])
  let businessName = (configuredName || "").trim()
  if (!businessName && order.tenantId) {
    const tenant = await db.tenant.findUnique({
      where: { id: order.tenantId },
      select: { name: true },
    })
    businessName = tenant?.name || ""
  }
  const supportContact = [(configuredEmail || "").trim(), (configuredPhone || "").trim()]
    .filter(Boolean)
    .join(" · ")

  const voucher = order.vouchers[0]
  const code = voucher?.voucherCode ?? order.orderNumber

  const pdf = await PDFDocument.create()
  pdf.setTitle(toSafePdfText(`E-Ticket ${order.orderNumber}`))
  pdf.setSubject(toSafePdfText(order.tour.name))
  pdf.setProducer(toSafePdfText(businessName))

  const page = pdf.addPage([595, 842]) // A4
  const { width, height } = page.getSize()
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const body = await pdf.embedFont(StandardFonts.Helvetica)

  // Header band
  page.drawRectangle({ x: 0, y: height - 110, width, height: 110, color: BRAND })
  page.drawText(toSafePdfText(businessName), { x: 48, y: height - 58, size: 22, font: bold, color: rgb(1, 1, 1) })
  page.drawText("E-Ticket / Voucher", { x: 48, y: height - 82, size: 11, font: body, color: rgb(0.85, 0.95, 0.92) })

  // QR — encodes the voucher payload so check-in can scan it offline
  const qrPayload = JSON.stringify({
    voucherCode: code,
    orderNumber: order.orderNumber,
    tour: toSafePdfText(order.tour.name),
    date: order.slot.date.toISOString().slice(0, 10),
    time: order.slot.startTime,
    pax: order.paxAdult + order.paxChild,
    customer: toSafePdfText(order.customerName),
  })
  const qrPng = await QRCode.toBuffer(qrPayload, { width: 320, margin: 1 })
  const qrImage = await pdf.embedPng(qrPng)
  page.drawImage(qrImage, { x: width - 186, y: height - 300, width: 138, height: 138 })
  page.drawText(toSafePdfText(code), { x: width - 186, y: height - 318, size: 10, font: bold, color: INK })

  let y = height - 160
  const line = (label: string, value: string, gap = 26) => {
    page.drawText(toSafePdfText(label.toUpperCase()), { x: 48, y, size: 8, font: bold, color: MUTED })
    page.drawText(toSafePdfText(value), { x: 48, y: y - 14, size: 12, font: body, color: INK })
    y -= gap + 14
  }

  line("Tour", order.tour.name)
  line("Date", formatDate(order.slot.date))
  line("Departure", order.slot.startTime)
  line("Guests", `${order.paxAdult} adult${order.paxAdult === 1 ? "" : "s"}${order.paxChild ? `, ${order.paxChild} child${order.paxChild === 1 ? "" : "ren"}` : ""}`)
  line("Lead traveller", order.customerName)
  line("Meeting point", order.tour.meetingPoint || "See confirmation message")

  // Payment summary box
  y -= 6
  page.drawRectangle({ x: 44, y: y - 74, width: width - 88, height: 78, color: rgb(0.97, 0.97, 0.96) })
  const paid = order.paymentStatus === "APPROVED" || order.paymentStatus === "PAID"
  page.drawText("ORDER", { x: 60, y: y - 16, size: 8, font: bold, color: MUTED })
  page.drawText(toSafePdfText(order.orderNumber), { x: 60, y: y - 32, size: 11, font: body, color: INK })
  page.drawText("TOTAL", { x: 60, y: y - 50, size: 8, font: bold, color: MUTED })
  page.drawText(toSafePdfText(formatCurrency(order.totalAmount)), { x: 60, y: y - 66, size: 14, font: bold, color: BRAND })
  page.drawText("STATUS", { x: width - 200, y: y - 16, size: 8, font: bold, color: MUTED })
  page.drawText(toSafePdfText(paid ? "PAID" : order.paymentStatus), {
    x: width - 200, y: y - 32, size: 11, font: bold,
    color: paid ? BRAND : rgb(0.85, 0.47, 0.05),
  })
  page.drawText("METHOD", { x: width - 200, y: y - 50, size: 8, font: bold, color: MUTED })
  page.drawText(toSafePdfText(order.paymentMethod === "BANK_TRANSFER" ? "Bank Transfer" : "Card / AmwalPay"), {
    x: width - 200, y: y - 66, size: 11, font: body, color: INK,
  })
  y -= 100

  // Terms
  const notes = [
    "Please arrive 15 minutes before departure and bring valid photo ID.",
    "Show this voucher — printed or on your phone — at check-in.",
    order.tour.cancellationPolicy || "Free cancellation up to 24 hours before departure.",
  ]
  page.drawText("IMPORTANT", { x: 48, y, size: 8, font: bold, color: MUTED })
  y -= 16
  for (const note of notes) {
    // Wrap manually — pdf-lib has no text flow.
    for (const chunk of wrap(toSafePdfText(note), 92)) {
      page.drawText(toSafePdfText(chunk), { x: 48, y, size: 9.5, font: body, color: MUTED })
      y -= 14
    }
  }

  page.drawText(toSafePdfText(`${supportContact}  ·  Muscat, Sultanate of Oman`), {
    x: 48, y: 48, size: 9, font: body, color: MUTED,
  })

  return pdf.save()
}

function wrap(text: string, max: number): string[] {
  const words = text.split(" ")
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    if ((current + word).length > max) {
      lines.push(current.trim())
      current = ""
    }
    current += `${word} `
  }
  if (current.trim()) lines.push(current.trim())
  return lines
}
