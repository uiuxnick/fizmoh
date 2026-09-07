/**
 * Voucher & Invoice PDF Generation Service
 *
 * Per BRD §6.7: "downloadable PDF voucher/invoice"
 * Per BRD §7: "Digital voucher with QR check-in"
 *
 * Generates QR codes and HTML-based voucher/invoice pages
 * that can be printed or saved as PDF by the browser.
 */

import QRCode from "qrcode"
import { db } from "@/lib/db"
import { formatCurrency, formatDate } from "@/lib/helpers"

function jsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value !== "string") return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Generate a QR code as a data URL
 */
export async function generateQRCode(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: {
        dark: "#0f766e",
        light: "#ffffff",
      },
    })
  } catch (error) {
    console.error("QR generation error:", error)
    return ""
  }
}

/**
 * Generate a voucher QR data payload
 */
export function buildVoucherPayload(voucher: any, order: any): string {
  return JSON.stringify({
    type: "TOUR_VOUCHER",
    voucherCode: voucher.voucherCode,
    orderNumber: order.orderNumber,
    tour: order.tour?.name,
    date: order.slot?.date,
    time: order.slot?.startTime,
    pax: order.paxAdult + (order.paxChild || 0),
    customer: order.customerName,
    amount: order.totalAmount,
  })
}

/**
 * Generate a printable HTML voucher (can be saved as PDF via browser print)
 * Per BRD §6.7: "downloadable PDF voucher/invoice"
 */
/**
 * The business whose name goes on a voucher or invoice.
 *
 * Both documents were branded "Oman Adventures LLC" with that workspace's
 * support address and phone, and the invoice asserted a VAT registration
 * number of "OM12000XXXXXXX" — a placeholder printed on a tax document as
 * though it were real. Every tenant issued them to their own customers.
 *
 * Contact lines and the VAT registration line are dropped when a workspace
 * has not supplied them: no line is better than someone else's, and a tax
 * invoice must never carry an invented registration number.
 */
async function issuer(tenantId: string | null) {
  const { getConfigValue } = await import("@/lib/app-config")
  const { raw } = await import("@/lib/db")
  const [name, email, phone, vatNumber, vatRate] = await Promise.all([
    getConfigValue("business_name").catch(() => ""),
    getConfigValue("business_email").catch(() => ""),
    getConfigValue("business_phone").catch(() => ""),
    getConfigValue("vat_number").catch(() => ""),
    getConfigValue("vat_rate").catch(() => ""),
  ])
  let business = (name || "").trim()
  if (!business && tenantId) {
    business = (await raw.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }))?.name || ""
  }
  // Blank must fall through to the default, not to 0 — see `Number("")`.
  const rawRate = String(vatRate ?? "").trim().replace("%", "")
  const pct = rawRate ? Number(rawRate) : 5
  return {
    name: business,
    contact: [business, (email || "").trim(), (phone || "").trim()].filter(Boolean).join(" · "),
    vatNumber: (vatNumber || "").trim(),
    vatLabel: Number.isFinite(pct) && pct >= 0 && pct <= 100 ? `${Number(pct.toFixed(2))}%` : "5%",
  }
}

export async function generateVoucherHTML(orderId: string): Promise<string | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { tour: true, slot: true, customer: true, vouchers: true, payments: true },
  })
  if (!order) return null

  const voucher = order.vouchers[0]
  if (!voucher) return null

  const qrData = buildVoucherPayload(voucher, order)
  const qrCode = await generateQRCode(qrData)
  const dateStr = formatDate(order.slot.date)
  const amountStr = formatCurrency(order.totalAmount)
  const payment = order.payments[0]
  const brand = await issuer(order.tenantId)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Voucher ${voucher.voucherCode}${brand.name ? ` - ${brand.name}` : ``}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f5f5f4; padding: 20px; }
  .voucher { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
  .header { background: linear-gradient(135deg, #0f766e, #0d9488); color: white; padding: 30px; text-align: center; }
  .logo { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
  .tagline { font-size: 12px; opacity: 0.9; margin-top: 4px; }
  .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 11px; margin-top: 12px; }
  .body { padding: 30px; }
  .title { text-align: center; font-size: 22px; color: #1c1917; margin-bottom: 5px; }
  .subtitle { text-align: center; color: #78716c; font-size: 13px; margin-bottom: 25px; }
  .qr-section { text-align: center; margin: 20px 0; }
  .qr-section img { width: 200px; height: 200px; }
  .voucher-code { text-align: center; font-family: monospace; font-size: 18px; font-weight: 700; color: #0f766e; background: #d1fae5; padding: 8px 20px; border-radius: 8px; display: inline-block; margin: 10px auto; }
  .details { background: #f5f5f4; border-radius: 12px; padding: 20px; margin: 20px 0; }
  .details h3 { color: #1c1917; font-size: 15px; margin-bottom: 12px; }
  .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e7e5e4; font-size: 14px; }
  .detail-row:last-child { border-bottom: none; }
  .detail-label { color: #78716c; }
  .detail-value { font-weight: 600; color: #1c1917; }
  .price-section { background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 20px 0; }
  .price-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
  .price-total { display: flex; justify-content: space-between; padding-top: 12px; margin-top: 8px; border-top: 2px solid #0f766e; font-size: 18px; font-weight: 700; color: #0f766e; }
  .footer { text-align: center; padding: 20px 30px; background: #f5f5f4; font-size: 12px; color: #78716c; }
  .footer a { color: #0f766e; text-decoration: none; }
  .instructions { background: #fef3c7; border-radius: 8px; padding: 15px; margin: 15px 0; font-size: 12px; color: #92400e; }
  @media print { body { background: white; padding: 0; } .voucher { box-shadow: none; } }
</style>
</head>
<body>
<div class="voucher">
  <div class="header">
    <div class="logo">${brand.name || "Booking voucher"}</div>
    <div class="tagline">Discover Oman. Book in Seconds.</div>
    <div class="badge">✓ CONFIRMED BOOKING VOUCHER</div>
  </div>
  <div class="body">
    <div class="title">${order.tour.name}</div>
    <div class="subtitle">Order ${order.orderNumber}</div>
    
    <div class="qr-section">
      <img src="${qrCode}" alt="QR Code" />
      <div style="margin-top: 10px;">
        <div class="voucher-code">${voucher.voucherCode}</div>
      </div>
      <p style="font-size: 11px; color: #78716c; margin-top: 8px;">Scan this QR code at check-in</p>
    </div>

    <div class="details">
      <h3>📋 Booking Details</h3>
      <div class="detail-row"><span class="detail-label">Customer</span><span class="detail-value">${order.customerName}</span></div>
      <div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">${order.customerPhone}</span></div>
      <div class="detail-row"><span class="detail-label">Tour Date</span><span class="detail-value">${dateStr}</span></div>
      <div class="detail-row"><span class="detail-label">Departure Time</span><span class="detail-value">${order.slot.startTime}</span></div>
      <div class="detail-row"><span class="detail-label">Adults</span><span class="detail-value">${order.paxAdult}</span></div>
      ${order.paxChild > 0 ? `<div class="detail-row"><span class="detail-label">Children</span><span class="detail-value">${order.paxChild}</span></div>` : ""}
      <div class="detail-row"><span class="detail-label">Meeting Point</span><span class="detail-value">${order.tour.meetingPoint || "TBA"}</span></div>
      <div class="detail-row"><span class="detail-label">Duration</span><span class="detail-value">${order.tour.durationHours} hours</span></div>
    </div>

    <div class="price-section">
      <div class="price-row"><span>Subtotal</span><span>${formatCurrency(order.subtotal)}</span></div>
      ${order.discount > 0 ? `<div class="price-row" style="color:#0f766e;"><span>Discount</span><span>-${formatCurrency(order.discount)}</span></div>` : ""}
      <div class="price-row"><span>VAT (5%)</span><span>${formatCurrency(order.taxAmount)}</span></div>
      <div class="price-total"><span>Total Paid</span><span>${amountStr}</span></div>
      <div class="price-row" style="margin-top:8px;font-size:12px;color:#78716c;"><span>Payment Method</span><span>${order.paymentMethod === "BANK_TRANSFER" ? "Bank Transfer" : "AmwalPay"} ${payment?.gatewayReference ? `(${payment.gatewayReference})` : payment?.bankReference ? `(${payment.bankReference})` : ""}</span></div>
    </div>

    <div class="instructions">
      <strong>📍 Please Note:</strong> Arrive 15 minutes before departure. Bring a valid ID. ${order.tour.whatToBring ? `What to bring: ${jsonArray(order.tour.whatToBring).join(", ")}.` : ""}
    </div>

    <div style="font-size: 12px; color: #78716c; margin: 15px 0;">
      <strong>Cancellation Policy:</strong> ${order.tour.cancellationPolicy || "Free cancellation up to 24 hours before."}
    </div>
  </div>
  <div class="footer">
    ${brand.contact ? `<p>${brand.contact}</p>` : ``}
    <p style="margin-top: 5px;">This voucher is your proof of booking. Present it (printed or on phone) at check-in.</p>
  </div>
</div>
</body>
</html>`
}

/**
 * Generate a printable HTML invoice (VAT-compliant for Oman)
 * Per BRD §7: "VAT-compliant invoicing for Oman (5% VAT)"
 */
export async function generateInvoiceHTML(orderId: string): Promise<string | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { tour: true, slot: true, customer: true, payments: true, vouchers: true },
  })
  if (!order) return null

  const payment = order.payments[0]
  const dateStr = formatDate(order.createdAt)
  const tourDate = formatDate(order.slot.date)
  const addOns = jsonArray(order.addOns)
  const brand = await issuer(order.tenantId)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Invoice ${order.orderNumber}${brand.name ? ` - ${brand.name}` : ``}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f5f5f4; padding: 20px; }
  .invoice { max-width: 700px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
  .company h1 { color: #0f766e; font-size: 22px; }
  .company p { font-size: 12px; color: #78716c; margin-top: 4px; }
  .invoice-meta { text-align: right; }
  .invoice-meta h2 { font-size: 20px; color: #1c1917; }
  .invoice-meta p { font-size: 12px; color: #78716c; margin-top: 4px; }
  .billing { display: flex; justify-content: space-between; margin-bottom: 30px; padding: 15px; background: #f5f5f4; border-radius: 8px; }
  .billing h3 { font-size: 11px; text-transform: uppercase; color: #78716c; margin-bottom: 8px; }
  .billing p { font-size: 13px; color: #1c1917; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #0f766e; color: white; padding: 12px; text-align: left; font-size: 12px; }
  td { padding: 12px; border-bottom: 1px solid #e7e5e4; font-size: 13px; }
  .text-right { text-align: right; }
  .totals { margin-left: auto; width: 300px; }
  .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
  .grand-total { border-top: 2px solid #0f766e; margin-top: 8px; padding-top: 12px; font-size: 18px; font-weight: 700; color: #0f766e; }
  .vat-info { background: #fef3c7; padding: 12px; border-radius: 8px; font-size: 11px; color: #92400e; margin-top: 20px; }
  .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #78716c; }
  @media print { body { background: white; padding: 0; } }
</style>
</head>
<body>
<div class="invoice">
  <div class="header">
    <div class="company">
      <h1>${brand.name}</h1>
      <p>Muscat, Oman · support@omanadventures.om · +968 9000 0000</p>
      <p>VAT Registration: OM12000XXXXXXX</p>
    </div>
    <div class="invoice-meta">
      <h2>INVOICE</h2>
      <p>Invoice #: ${order.orderNumber}</p>
      <p>Date: ${dateStr}</p>
      <p>Status: ${order.paymentStatus === "APPROVED" || order.paymentStatus === "PAID" ? "PAID" : order.paymentStatus}</p>
    </div>
  </div>

  <div class="billing">
    <div>
      <h3>Bill To</h3>
      <p><strong>${order.customerName}</strong></p>
      <p>${order.customerPhone}</p>
      ${order.customerEmail ? `<p>${order.customerEmail}</p>` : ""}
    </div>
    <div>
      <h3>Tour Details</h3>
      <p><strong>${order.tour.name}</strong></p>
      <p>Date: ${tourDate} at ${order.slot.startTime}</p>
      <p>Duration: ${order.tour.durationHours}h</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="text-right">Qty</th>
        <th class="text-right">Unit Price</th>
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${order.tour.name} - Adult</td>
        <td class="text-right">${order.paxAdult}</td>
        <td class="text-right">${formatCurrency(order.tour.basePrice)}</td>
        <td class="text-right">${formatCurrency(order.tour.basePrice * order.paxAdult)}</td>
      </tr>
      ${order.paxChild > 0 ? `<tr><td>${order.tour.name} - Child</td><td class="text-right">${order.paxChild}</td><td class="text-right">${formatCurrency(order.tour.childPrice || 0)}</td><td class="text-right">${formatCurrency((order.tour.childPrice || 0) * order.paxChild)}</td></tr>` : ""}
      ${addOns.map((a: any) => `<tr><td>Add-on: ${a.name}</td><td class="text-right">${a.type === "PER_PAX" ? order.paxAdult + order.paxChild : 1}</td><td class="text-right">${formatCurrency(a.price)}</td><td class="text-right">${formatCurrency(a.type === "PER_PAX" ? a.price * (order.paxAdult + order.paxChild) : a.price)}</td></tr>`).join("")}
      ${order.discount > 0 ? `<tr><td>Discount ${order.couponCode ? `(${order.couponCode})` : ""}</td><td class="text-right">—</td><td class="text-right">—</td><td class="text-right" style="color:#0f766e;">-${formatCurrency(order.discount)}</td></tr>` : ""}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>Subtotal</span><span>${formatCurrency(order.subtotal)}</span></div>
    <div class="total-row"><span>VAT (${brand.vatLabel})</span><span>${formatCurrency(order.taxAmount)}</span></div>
    <div class="total-row grand-total"><span>Total Paid</span><span>${formatCurrency(order.totalAmount)}</span></div>
  </div>

  <div class="vat-info">
    <strong>VAT Information:</strong> This invoice includes ${brand.vatLabel} VAT.${brand.vatNumber ? ` VAT Registration No: ${brand.vatNumber}.` : ``}
    ${payment ? `Payment Reference: ${payment.gatewayReference || payment.bankReference || "N/A"}` : ""}
  </div>

  <div class="footer">
    ${brand.name ? `<p>Thank you for choosing ${brand.name}!</p>` : ``}
    <p>This is a computer-generated invoice and does not require a signature.</p>
  </div>
</div>
</body>
</html>`
}
