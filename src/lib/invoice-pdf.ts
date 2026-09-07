/**
 * Subscription invoice PDFs — the platform billing a workspace.
 *
 * Built with pdf-lib rather than a headless browser, for the same reason as
 * the voucher PDF: nothing to run on the server, and standard fonts embed
 * without shipping font files. This exists for what a browser can't do —
 * being fetched by WhatsApp without a person present. The pixel-accurate
 * surface is the HTML view at /view, the real reference page rendered with
 * real data; "Save as PDF" from there is an exact match to the design. This
 * file is a distinct, independent rendering built for automated delivery, so
 * it does not need to track that one line for line.
 *
 * Both this file and the HTML view read through loadInvoiceViewModel(), so a
 * field fixed there is fixed in both places. Nothing here invents data: a
 * field with nothing behind it prints "-" rather than a plausible-looking
 * value somebody might act on.
 *
 * ARTWORK
 * -------
 * Read from `public/invoice/` at render time: logo.png, mascot.png and
 * footer.png are the workspace's real supplied artwork. badge.png and
 * signature.png have not been supplied yet, so those two fall back to a drawn
 * shape and to the company name in a text style — never a placeholder that
 * looks like real content.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage } from "pdf-lib"
import fontkit from "@pdf-lib/fontkit"
import { readFile } from "node:fs/promises"
import path from "node:path"
import QRCode from "qrcode"
import { loadInvoiceViewModel } from "@/lib/invoice-data"

const GREEN = rgb(0.043, 0.404, 0.216)
const GREEN_DEEP = rgb(0.031, 0.302, 0.161)
const MINT = rgb(0.925, 0.969, 0.937)
const GOLD = rgb(0.976, 0.804, 0.263)
const GOLD_SOFT = rgb(0.996, 0.925, 0.706)
const INK = rgb(0.11, 0.098, 0.09)
const MUTED = rgb(0.35, 0.33, 0.31)
const LINE = rgb(0.87, 0.86, 0.85)
const WHITE = rgb(1, 1, 1)

/** WinAnsi cannot encode emoji, smart punctuation or Arabic; pdf-lib throws. */
function safe(text: string | null | undefined): string {
  if (!text) return ""
  return text
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-").replace(/…/g, "...")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "")
    .trim()
}

const money = (v: number) => v.toFixed(3)

/** An optional illustration. Missing files are normal, not an error. */
async function art(pdf: PDFDocument, file: string): Promise<PDFImage | null> {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "invoice", file))
    return await pdf.embedPng(bytes)
  } catch {
    return null
  }
}

async function loadSignature(pdf: PDFDocument, signatureUrl?: string): Promise<PDFImage | null> {
  if (signatureUrl?.startsWith("data:image/")) {
    try {
      const match = signatureUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/)
      if (match) {
        const format = match[1].toLowerCase()
        const buffer = Buffer.from(match[2], "base64")
        if (format.includes("jpeg") || format.includes("jpg")) {
          return await pdf.embedJpg(buffer)
        } else {
          return await pdf.embedPng(buffer)
        }
      }
    } catch {
      // ignore
    }
  }

  if (signatureUrl?.startsWith("/api/media/")) {
    try {
      const { readMedia } = await import("@/lib/media-store")
      const filename = signatureUrl.replace("/api/media/", "").split("?")[0]
      const media = await readMedia(filename)
      if (media?.body) {
        if (media.mimeType.includes("jpeg") || media.mimeType.includes("jpg")) {
          return await pdf.embedJpg(media.body)
        } else {
          return await pdf.embedPng(media.body)
        }
      }
    } catch {
      // ignore
    }
  }

  if (signatureUrl?.startsWith("/invoice/")) {
    try {
      const rel = signatureUrl.replace(/^\//, "").split("?")[0]
      const bytes = await readFile(path.join(process.cwd(), "public", rel))
      return await pdf.embedPng(bytes)
    } catch {
      // ignore
    }
  }

  return await art(pdf, "signature.png")
}

export async function generateInvoicePDF(invoiceId: string): Promise<Uint8Array | null> {
  const data = await loadInvoiceViewModel(invoiceId)
  if (!data) return null

  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const page: PDFPage = pdf.addPage([595, 842]) // A4
  const { width, height } = page.getSize()

  /*
   * Nunito, the same rounded, friendly family the brand's mascot art calls
   * for — Helvetica read as generic and mismatched next to it. Bundled under
   * src/lib/fonts/ (SIL Open Font License) rather than fetched at render time,
   * so a document never fails to generate over a network hiccup. Falls back to
   * the always-available standard font if the files are ever moved or missing.
   */
  let bold: PDFFont
  let body: PDFFont
  try {
    // Read from public/, not src/: the server runs .next/standalone/server.js,
    // and only the public/ directory is guaranteed to be copied wholesale into
    // that build — a file under src/ is only present if something's static
    // import graph traces to it, which a runtime-built fs path never does.
    const [boldBytes, bodyBytes] = await Promise.all([
      readFile(path.join(process.cwd(), "public", "fonts", "Nunito-Bold.ttf")),
      readFile(path.join(process.cwd(), "public", "fonts", "Nunito-Regular.ttf")),
    ])
    bold = await pdf.embedFont(boldBytes)
    body = await pdf.embedFont(bodyBytes)
  } catch {
    bold = await pdf.embedFont(StandardFonts.HelveticaBold)
    body = await pdf.embedFont(StandardFonts.Helvetica)
  }

  const T = (v: string, x: number, y: number, size: number, font: PDFFont, color = INK) =>
    page.drawText(safe(v), { x, y, size, font, color })
  const R = (v: string, xr: number, y: number, size: number, font: PDFFont, color = INK) => {
    const c = safe(v)
    page.drawText(c, { x: xr - font.widthOfTextAtSize(c, size), y, size, font, color })
  }
  const box = (x: number, y: number, w: number, h: number, color: ReturnType<typeof rgb>) =>
    page.drawRectangle({ x, y, width: w, height: h, color })

  const M = 34
  const CW = width - M * 2
  let y = height - 30

  // ── Header ───────────────────────────────────────────────────────────────
  const logo = await art(pdf, "logo.png")
  if (logo) {
    const s = logo.scaleToFit(230, 72)
    page.drawImage(logo, { x: M, y: y - s.height, width: s.width, height: s.height })
  } else {
    T(data.company.name, M, y - 34, 24, bold, GREEN)
  }

  R("INVOICE", width - M, y - 40, 34, bold, GREEN)
  R(data.invoice.number, width - M, y - 58, 11, bold, GREEN)

  y -= 92
  const meta: Array<[string, string]> = [
    ["Invoice Date", data.invoice.date || "-"],
    ["Due Date", data.invoice.dueDate || "-"],
  ]
  let my = y
  for (const [k, v] of meta) {
    T(k, width - M - 250, my, 8.5, body, MUTED)
    T(":", width - M - 150, my, 8.5, body, MUTED)
    T(v, width - M - 140, my, 9, bold)
    my -= 14
  }
  T("Payment Status", width - M - 250, my, 8.5, body, MUTED)
  T(":", width - M - 150, my, 8.5, body, MUTED)
  const paid = data.invoice.status === "PAID"
  const chip = safe(data.invoice.status)
  const chipW = bold.widthOfTextAtSize(chip, 8) + 16
  box(width - M - 140, my - 4, chipW, 16, paid ? GREEN : GOLD_SOFT)
  T(chip, width - M - 132, my, 8, bold, paid ? WHITE : INK)

  // ── Company strip with QR ────────────────────────────────────────────────
  y = my - 26
  box(M, y - 58, CW, 58, MINT)
  T(data.company.name, M + 14, y - 20, 11, bold, GREEN)
  T(data.company.tagline, M + 14, y - 33, 8, body, MUTED)
  const contact = [data.company.website, data.company.email, data.company.phone, data.company.address]
    .filter(Boolean).join("   |   ")
  T(contact, M + 14, y - 48, 8, body, MUTED)

  try {
    const target = data.company.website.startsWith("http") ? data.company.website : `https://${data.company.website}`
    const qrPng = await QRCode.toBuffer(target, { margin: 0, width: 200 })
    const qr = await pdf.embedPng(qrPng)
    page.drawImage(qr, { x: width - M - 60, y: y - 52, width: 46, height: 46 })
  } catch { /* the invoice does not depend on the QR */ }

  // ── Bill to / subscription ───────────────────────────────────────────────
  y -= 72
  const leftW = CW * 0.38
  const rightW = CW - leftW - 12
  const panelH = 116

  box(M, y - panelH, leftW, panelH, MINT)
  box(M, y - 22, leftW, 22, rgb(0.855, 0.937, 0.878))
  T("BILL TO", M + 12, y - 15, 9, bold, GREEN)
  const billRows: Array<[string, string]> = [
    ["Customer", data.customer.name || "-"],
    ["Email", data.customer.email || "-"],
    ["Phone", data.customer.phone || "-"],
    ["Address", data.customer.address || "-"],
  ]
  let by = y - 42
  for (const [k, v] of billRows) {
    T(k, M + 12, by, 8, body, MUTED)
    T(v.slice(0, 34), M + 74, by, 8.5, bold)
    by -= 16
  }

  const rx = M + leftW + 12
  box(rx, y - panelH, rightW, panelH, GREEN_DEEP)
  T("SUBSCRIPTION DETAILS", rx + 12, y - 15, 9, bold, GOLD)
  const subRows: Array<[string, string]> = [
    ["Plan Name", data.subscription.planName || "-"],
    ["Billing Cycle", data.subscription.billingCycle],
    ["Period Start", data.subscription.startDate || "-"],
    ["Next Renewal", data.subscription.renewalDate || "-"],
    ["Status", data.subscription.status || "-"],
  ]
  let sy = y - 38
  for (const [k, v] of subRows) {
    page.drawText(safe(k), { x: rx + 12, y: sy, size: 8, font: body, color: rgb(0.86, 0.93, 0.89) })
    page.drawText(":", { x: rx + 100, y: sy, size: 8, font: body, color: rgb(0.86, 0.93, 0.89) })
    page.drawText(safe(v).slice(0, 30), { x: rx + 110, y: sy, size: 8.5, font: bold, color: WHITE })
    sy -= 15
  }

  const badge = await art(pdf, "badge.png")
  if (badge) {
    const s = badge.scaleToFit(74, 74)
    page.drawImage(badge, { x: rx + rightW - s.width - 14, y: y - panelH + 20, width: s.width, height: s.height })
  } else {
    // A drawn medal, so the panel is never simply short one element.
    const cx = rx + rightW - 44, cy = y - panelH / 2
    page.drawEllipse({ x: cx, y: cy, xScale: 22, yScale: 22, borderColor: GOLD, borderWidth: 1.5 })
    T("PLAN", cx - 12, cy - 3, 7, bold, GOLD)
  }

  // ── Billing summary ──────────────────────────────────────────────────────
  y -= panelH + 26
  box(M, y - 4, 150, 20, GREEN)
  T("BILLING SUMMARY", M + 10, y + 2, 8.5, bold, WHITE)
  y -= 24

  const cQty = M + 330, cRate = M + 425, cAmt = width - M - 10
  box(M, y - 5, CW, 20, GOLD_SOFT)
  T("#", M + 10, y + 1, 8, bold, INK)
  T("DESCRIPTION", M + 34, y + 1, 8, bold, INK)
  R("QTY", cQty, y + 1, 8, bold, INK)
  R("RATE (OMR)", cRate, y + 1, 8, bold, INK)
  R("AMOUNT (OMR)", cAmt, y + 1, 8, bold, INK)
  y -= 22

  let n = 0
  for (const row of data.items) {
    n += 1
    T(String(n).padStart(2, "0"), M + 10, y, 8.5, body, MUTED)
    T(row.description.slice(0, 58), M + 34, y, 8.5, body)
    R(String(row.qty), cQty, y, 8.5, body)
    R(money(row.rate), cRate, y, 8.5, body)
    R(money(row.rate * row.qty), cAmt, y, 8.5, bold)
    y -= 15
    page.drawLine({ start: { x: M, y: y + 5 }, end: { x: width - M, y: y + 5 }, thickness: 0.4, color: LINE })
    y -= 3
  }

  // ── Payment details + totals ─────────────────────────────────────────────
  y -= 14
  const payW = CW * 0.44
  const totW = CW - payW - 12
  const blockH = 96

  box(M, y - blockH, payW, blockH, MINT)
  T("PAYMENT DETAILS", M + 12, y - 16, 8.5, bold, GREEN)
  const payRows: Array<[string, string]> = [
    ["Method", data.payment.method],
    ["Reference", data.payment.transactionReference],
    ["Payment Date", data.payment.paymentDate || "-"],
  ]
  let py = y - 38
  for (const [k, v] of payRows) {
    T(k, M + 12, py, 8, body, MUTED)
    T(v.slice(0, 26), M + 92, py, 8, bold)
    py -= 16
  }

  const tx = M + payW + 12
  const subtotal = data.items.reduce((sum, r) => sum + r.rate * r.qty, 0)
  const vatAmount = subtotal * (data.vatPercent / 100)
  const total = Math.max(0, subtotal + vatAmount - data.discount)
  const balanceDue = Math.max(0, total - data.amountPaid)

  let ty = y - 16
  const totalRows: Array<[string, string]> = [
    ["Subtotal (OMR)", money(subtotal)],
    [`VAT (${data.vatPercent}%)`, money(vatAmount)],
    ["Discount", money(data.discount)],
  ]
  for (const [k, v] of totalRows) {
    T(k, tx + 10, ty, 8.5, body, MUTED)
    R(v, width - M - 10, ty, 8.5, body)
    ty -= 16
  }
  // A gap before the TOTAL bar — without it the last row's text sat flush
  // against the bar's top edge, visibly overlapping it.
  ty -= 8
  box(tx, ty - 8, totW, 24, GREEN)
  T("TOTAL (OMR)", tx + 10, ty - 1, 9.5, bold, WHITE)
  R(money(total), width - M - 10, ty - 2, 12, bold, WHITE)
  ty -= 30
  T("Amount Paid (OMR)", tx + 10, ty, 8.5, body, MUTED)
  R(money(data.amountPaid), width - M - 10, ty, 8.5, bold, GREEN_DEEP)
  ty -= 15
  T("Balance Due (OMR)", tx + 10, ty, 8.5, body, MUTED)
  R(money(balanceDue), width - M - 10, ty, 8.5, bold, GREEN_DEEP)

  // ── Includes / manage ────────────────────────────────────────────────────
  y = Math.min(y - blockH, ty) - 24
  const incW = CW * 0.54
  const incH = 92
  box(M, y - incH, incW, incH, MINT)
  T("YOUR SUBSCRIPTION INCLUDES", M + 12, y - 16, 8.5, bold, GREEN)
  const includes = [
    "Platform access", "Software updates", "Technical support",
    "System maintenance", "Security updates", "Cloud-based access",
  ]
  let ix = M + 12, iy = y - 36
  includes.forEach((item, i) => {
    T("*", ix, iy, 8, bold, GREEN)
    T(item, ix + 10, iy, 8, body, MUTED)
    if ((i + 1) % 3 === 0) { ix = M + 12; iy -= 16 } else { ix += incW / 3 }
  })

  const mx = M + incW + 12
  const manW = CW - incW - 12
  box(mx, y - incH, manW, incH, GREEN_DEEP)
  T("MANAGE YOUR SUBSCRIPTION", mx + 12, y - 16, 8.5, bold, GOLD)
  const manage = ["View subscription info", "Renew your subscription", "Contact support"]
  let vy = y - 36
  for (const item of manage) {
    page.drawText(safe(`- ${item}`), { x: mx + 12, y: vy, size: 8, font: body, color: rgb(0.82, 0.91, 0.85) })
    vy -= 14
  }
  page.drawText(safe(data.company.website), { x: mx + 12, y: vy - 4, size: 8, font: bold, color: GOLD })

  const mascot = await art(pdf, "mascot.png")
  if (mascot) {
    const s = mascot.scaleToFit(58, 76)
    page.drawImage(mascot, { x: mx + manW - s.width - 12, y: y - incH + 6, width: s.width, height: s.height })
  }

  // ── Terms & signature ────────────────────────────────────────────────────
  y -= incH + 22
  T("TERMS & CONDITIONS", M, y, 8.5, bold, GREEN)
  y -= 13
  const terms =
    "Subscription services are provided for the billing period shown above. Renewal charges may apply at the " +
    "start of the next billing cycle. Additional development, customisation, third-party services, API charges, " +
    "hosting, domains or integrations outside the subscribed package may be billed separately unless specifically " +
    "included in the selected plan."
  for (const line of wrap(terms, body, 8, CW * 0.6)) {
    T(line, M, y, 8, body, MUTED)
    y -= 11.5
  }

  const signature = await loadSignature(pdf, data.company.signatureUrl)
  const sigX = width - M - 170
  if (signature) {
    const s = signature.scaleToFit(140, 36)
    page.drawImage(signature, { x: sigX, y: y + 20, width: s.width, height: s.height })
  } else {
    T(data.company.name, sigX, y + 28, 11, bold, GREEN)
  }
  page.drawLine({ start: { x: sigX, y: y + 16 }, end: { x: width - M, y: y + 16 }, thickness: 0.6, color: LINE })
  T(safe(data.company.signatoryName || "Authorised Signature"), sigX, y + 4, 7.5, body, MUTED)

  // ── Footer band ──────────────────────────────────────────────────────────
  box(0, 0, width, 58, GREEN)
  const footerArt = await art(pdf, "footer.png")
  let fx = M
  if (footerArt) {
    const s = footerArt.scaleToFit(42, 42)
    page.drawImage(footerArt, { x: M, y: 8, width: s.width, height: s.height })
    fx = M + s.width + 12
  }
  page.drawText(safe(data.company.name), { x: fx, y: 34, size: 10, font: bold, color: WHITE })
  page.drawText(safe(data.company.tagline), { x: fx, y: 22, size: 8, font: body, color: rgb(0.85, 0.93, 0.88) })
  page.drawText(safe(contact.slice(0, 90)), { x: fx, y: 11, size: 7.5, font: body, color: rgb(0.82, 0.91, 0.86) })

  const thanks = "Thank you for choosing " + data.company.name
  const tw = body.widthOfTextAtSize(safe(thanks), 8)
  page.drawText(safe(thanks), { x: width - M - tw, y: 22, size: 8, font: body, color: GOLD })

  return pdf.save()
}

/** Greedy wrap, because pdf-lib draws one line at a time. */
function wrap(value: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = safe(value).split(/\s+/)
  const lines: string[] = []
  let line = ""
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) { lines.push(line); line = word }
    else line = next
  }
  if (line) lines.push(line)
  return lines
}
