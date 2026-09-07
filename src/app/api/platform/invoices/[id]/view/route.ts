import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { requirePlatformAdmin } from "@/app/api/platform/tenants/route"
import { loadInvoiceViewModel } from "@/lib/invoice-data"
import { sessionFromRequest } from "@/lib/auth"
import { raw } from "@/lib/db"

/**
 * The invoice as the real reference page — not an approximation of it.
 *
 * This is the actual HTML/CSS the design was built from, server-rendered with
 * the real invoice's data instead of the sample data it shipped with. It is
 * the pixel-accurate surface: View opens it, Print opens it and triggers the
 * browser's print dialog, and "Save as PDF" from there is an exact match to
 * the reference. The pdf-lib document at /pdf exists for what a browser
 * can't do — being fetched by WhatsApp without a person present — and is
 * built independently, so it does not need to match this file line for line.
 */
export const GET = withErrors(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) => {
  const { id } = await context.params
  const data = await loadInvoiceViewModel(id)
  if (!data) return NextResponse.json({ error: "No such invoice" }, { status: 404 })

  const admin = await requirePlatformAdmin(request).catch(() => null)
  let isAuthorized = !!admin

  if (!isAuthorized) {
    const session = await sessionFromRequest(request)
    if (session?.kind === "staff" && session.staffId) {
      const inv = await raw.subscriptionInvoice.findUnique({
        where: { id },
        select: { tenantId: true },
      })
      if (inv) {
        const membership = await raw.tenantMember.findFirst({
          where: { staffId: session.staffId, tenantId: inv.tenantId },
        })
        if (membership) {
          isAuthorized = true
        }
      }
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized to view this invoice" }, { status: 403 })
  }

  const autoPrint = new URL(request.url).searchParams.get("print") === "1"

  const esc = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

  const money = (v: number, places = 3) => v.toLocaleString("en-US", { minimumFractionDigits: places, maximumFractionDigits: places })

  const subtotal = data.items.reduce((sum, i) => sum + i.qty * i.rate, 0)
  const vatAmount = subtotal * (data.vatPercent / 100)
  const total = Math.max(0, subtotal + vatAmount - data.discount)
  const balanceDue = Math.max(0, total - data.amountPaid)

  const rows = data.items.map((item, i) => `
    <tr>
      <td>${String(i + 1).padStart(2, "0")}</td>
      <td>${esc(item.description)}</td>
      <td>${money(item.qty, 0)}</td>
      <td>${money(item.rate)}</td>
      <td>${money(item.qty * item.rate)}</td>
    </tr>`).join("")

  const benefits = [
    "Premium Platform Access", "Software Updates", "Technical Support",
    "System Maintenance", "Security Updates", "Cloud-Based Access",
  ]
  const benefitIcons = ["▣", "◌", "◎", "⚙", "◇", "☁"]
  const benefitsHtml = benefits.map((b, i) =>
    `<div class="benefit-item"><span class="benefit-icon">${benefitIcons[i]}</span><span>${esc(b)}</span></div>`,
  ).join("")

  const manageActions = ["View subscription info", "Renew your subscription", "Contact support"]
  const manageHtml = manageActions.map(a => `<li><span>●</span>${esc(a)}</li>`).join("")

  const terms =
    "Subscription services are provided for the billing period mentioned above. Renewal charges may apply at " +
    "the beginning of the next billing cycle. Additional development, customization, third-party services, API " +
    "charges, hosting, domains or integrations outside the subscribed package may be billed separately unless " +
    "specifically included in the selected plan."

  const contactRow = [
    data.company.website && `<span>🌐 <b>${esc(data.company.website)}</b></span>`,
    data.company.email && `<span>✉ <b>${esc(data.company.email)}</b></span>`,
    data.company.phone && `<span>☎ <b>${esc(data.company.phone)}</b></span>`,
    data.company.address && `<span>📍 <b>${esc(data.company.address)}</b></span>`,
  ].filter(Boolean).join("")

  const statusColor = data.invoice.status === "PAID" ? "" : "background:#c9860f;"

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Invoice ${esc(data.invoice.number)}</title>
<link rel="stylesheet" href="/invoice/style.css" />
</head>
<body>
  <div class="toolbar no-print">
    <button id="printButton" type="button">Print / Save PDF</button>
    ${data.invoice.status !== "PAID" ? `
      <a href="/api/paymob/pay/${encodeURIComponent(data.invoice.number)}" target="_blank" rel="noopener" style="background:#2563eb;color:#fff;text-decoration:none;padding:.45rem .9rem;border-radius:.375rem;font-size:.8rem;font-weight:700;display:inline-flex;align-items:center;gap:.35rem;border:none;cursor:pointer">💳 Pay via Paymob</a>
      <a href="/api/amwalpay/pay/${encodeURIComponent(data.invoice.number)}" target="_blank" rel="noopener" style="background:#059669;color:#fff;text-decoration:none;padding:.45rem .9rem;border-radius:.375rem;font-size:.8rem;font-weight:700;display:inline-flex;align-items:center;gap:.35rem;border:none;cursor:pointer">💳 Pay via AmwalPay</a>
    ` : ""}
  </div>

  <main class="invoice-sheet" id="invoiceSheet">
    <header class="hero">
      <div class="brand-lockup"><img class="brand-logo" src="/invoice/logo.png" alt="${esc(data.company.name)}" /></div>
      <div class="invoice-head">
        <h1>INVOICE</h1>
        <div class="invoice-number">${esc(data.invoice.number)}</div>
        <div class="invoice-meta">
          <div><span class="meta-icon">▣</span><span>Invoice Date</span><strong>${esc(data.invoice.date)}</strong></div>
          <div><span class="meta-icon">◷</span><span>Due Date</span><strong>${esc(data.invoice.dueDate)}</strong></div>
          <div><span class="meta-icon">▤</span><span>Payment Status</span><strong class="status-pill" style="${statusColor}">${esc(data.invoice.status)}</strong></div>
        </div>
      </div>
    </header>

    <section class="company-strip card">
      <div class="company-copy">
        <h2>${esc(data.company.name)}</h2>
        <p>${esc(data.company.tagline)}</p>
        <div class="company-contact-row">${contactRow}</div>
      </div>
    </section>

    <section class="info-grid">
      <article class="card bill-card">
        <div class="section-title pale"><span class="title-icon">●</span> BILL TO</div>
        <dl class="detail-list">
          <div><dt>Customer Name</dt><dd>${esc(data.customer.name || "-")}</dd></div>
          <div><dt>Email</dt><dd>${esc(data.customer.email || "-")}</dd></div>
          <div><dt>Phone</dt><dd>${esc(data.customer.phone || "-")}</dd></div>
          <div><dt>Address</dt><dd>${esc(data.customer.address || "-")}</dd></div>
        </dl>
      </article>

      <article class="subscription-card">
        <div class="section-title dark"><span class="title-icon gold">◆</span> SUBSCRIPTION DETAILS</div>
        <div class="subscription-inner">
          <div class="subscription-details-box">
            <dl class="subscription-list">
              <div><dt>Plan Name</dt><dd>${esc(data.subscription.planName || "-")}</dd></div>
              <div><dt>Subscription Type</dt><dd>${esc(data.subscription.type)}</dd></div>
              <div><dt>Billing Cycle</dt><dd>${esc(data.subscription.billingCycle)}</dd></div>
              <div class="divider-row"></div>
              <div><dt>Subscription Start Date</dt><dd>${esc(data.subscription.startDate || "-")}</dd></div>
              <div><dt>Subscription Expiry Date</dt><dd>${esc(data.subscription.expiryDate || "-")}</dd></div>
              <div><dt>Next Renewal Date</dt><dd>${esc(data.subscription.renewalDate || "-")}</dd></div>
              <div><dt>Account / Website</dt><dd>${esc(data.subscription.accountWebsite || "-")}</dd></div>
              <div><dt>Subscription Status</dt><dd><span class="status-pill small" style="${statusColor}">${esc(data.subscription.status || "-")}</span></dd></div>
            </dl>
          </div>
          <div class="premium-badge-area">
            <div class="premium-medal">♛</div>
            <div class="premium-text">${esc((data.subscription.planName || "PLAN").toUpperCase())}</div>
          </div>
        </div>
      </article>
    </section>

    <section class="billing-card card">
      <div class="billing-label">▤ &nbsp; BILLING SUMMARY</div>
      <div class="table-wrap">
        <table class="billing-table">
          <thead><tr><th>#</th><th>DESCRIPTION</th><th>QTY</th><th>RATE (OMR)</th><th>AMOUNT (OMR)</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <div class="billing-bottom">
        <article class="payment-box">
          <h3>▰ &nbsp; PAYMENT DETAILS</h3>
          <dl>
            <div><dt>Payment Method</dt><dd>${esc(data.payment.method)}</dd></div>
            <div><dt>Transaction Reference</dt><dd>${esc(data.payment.transactionReference)}</dd></div>
            <div><dt>Payment Date</dt><dd>${esc(data.payment.paymentDate || "-")}</dd></div>
            ${data.invoice.status !== "PAID" ? `
              <div style="margin-top:.5rem;padding-top:.5rem;border-top:1px dashed #e7e5e4;display:flex;gap:.75rem;flex-wrap:wrap">
                <a href="/api/paymob/pay/${encodeURIComponent(data.invoice.number)}" target="_blank" rel="noopener" style="color:#2563eb;font-weight:700;text-decoration:none;font-size:.75rem">→ Pay via Paymob</a>
                <a href="/api/amwalpay/pay/${encodeURIComponent(data.invoice.number)}" target="_blank" rel="noopener" style="color:#059669;font-weight:700;text-decoration:none;font-size:.75rem">→ Pay via AmwalPay</a>
              </div>
            ` : ""}
          </dl>
        </article>
        <article class="totals-box">
          <div><span>Subtotal (OMR)</span><strong>${money(subtotal)}</strong></div>
          <div><span>VAT (${data.vatPercent}%)</span><strong>${money(vatAmount)}</strong></div>
          <div><span>Discount</span><strong>${money(data.discount)}</strong></div>
          <div class="grand-total"><span>TOTAL (OMR)</span><strong>${money(total)}</strong></div>
          <div><span>Amount Paid (OMR)</span><strong class="positive">${money(data.amountPaid)}</strong></div>
          <div><span>Balance Due (OMR)</span><strong class="positive">${money(balanceDue)}</strong></div>
        </article>
      </div>
    </section>

    <section class="benefit-grid">
      <article class="card benefits-card">
        <div class="subheading">◆ &nbsp; YOUR SUBSCRIPTION INCLUDES</div>
        <div class="benefits">${benefitsHtml}</div>
      </article>
      <article class="card manage-card">
        <img src="/invoice/mascot.png" alt="" class="manage-image" />
        <div class="manage-copy">
          <h3>MANAGE YOUR<br />SUBSCRIPTION</h3>
          <ul>${manageHtml}</ul>
          <div class="website-pill">🌐 ${esc(data.company.website)}</div>
        </div>
      </article>
    </section>

    <section class="terms-signature card">
      <div class="terms"><h3>▮ &nbsp; TERMS &amp; CONDITIONS</h3><p>${esc(terms)}</p></div>
      <div class="signature">
        ${data.company.signatureUrl ? `
          <div class="signature-img-wrap">
            <img src="${esc(data.company.signatureUrl)}" alt="Authorised Signature" class="signature-img" />
          </div>
        ` : `
          <div class="signature-script">${esc(data.company.name)}</div>
        `}
        <div class="signature-line"></div>
        <div class="signatory-label">${esc(data.company.signatoryName || "Authorised Signature")}</div>
      </div>
    </section>

    <footer class="footer">
      <div class="footer-brand">
        <img src="/invoice/footer.png" alt="" class="footer-cat" />
        <div>
          <h3>${esc(data.company.name)}</h3>
          <p>${esc(data.company.tagline)}</p>
          <div class="footer-contact">${contactRow}</div>
        </div>
      </div>
      <div class="footer-thanks">
        <div class="heart">♥</div>
        <div><h3>Thank You!</h3><p>for choosing ${esc(data.company.name)}.</p><small>We appreciate your business and<br />look forward to serving you.</small></div>
      </div>
    </footer>
  </main>

  <script>
    document.getElementById("printButton").addEventListener("click", () => window.print())
    ${autoPrint ? "window.addEventListener('load', () => setTimeout(() => window.print(), 200))" : ""}
  </script>
</body>
</html>`

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } })
})
