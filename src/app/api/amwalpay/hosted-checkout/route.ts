import { NextRequest, NextResponse } from "next/server"
import { db, raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { chemoPrice } from "@/lib/hospital"
import { businessName } from "@/lib/app-config"
import { createPaymentSession, amwalPayReady } from "@/lib/amwalpay"
import { formatCurrency, formatDate } from "@/lib/helpers"
import { localDateKey } from "@/lib/timezone"
import { PLATFORM } from "@/lib/tenant"

/** A browser redirect is only a receipt lookup; the signed server callback is payment proof. */
async function gatewayConfirmed(reference: string): Promise<boolean> {
  if (reference.startsWith("ORD-")) {
    const order = await db.order.findFirst({ where: { orderNumber: reference }, select: { paymentStatus: true, orderStatus: true } })
    return order?.paymentStatus === "APPROVED" || order?.orderStatus === "CONFIRMED"
  }
  if (reference.startsWith("APT-")) {
    const appointment = await db.aptAppointment.findFirst({ where: { reference }, select: { paymentStatus: true } })
    return appointment?.paymentStatus === "PAID"
  }
  if (reference.startsWith("CHEMO-")) {
    // Chemo bookings default to CONFIRMED in the legacy schema, so status alone
    // cannot prove that AmwalPay completed. Require a signed callback marker.
    const callback = await raw.systemSetting.findFirst({
      where: { tenantId: PLATFORM, key: { startsWith: `amwal_processed_${reference}_` } },
      select: { id: true },
    })
    return !!callback
  }
  return false
}

/**
 * AmwalPay Hosted Checkout & Payment Thank You Receipt Page
 *
 * Supports:
 *  - Tour Orders (ORD-*)
 *  - Appointments & Doctor Consultations (APT-*)
 *  - Chemotherapy Day Care Bed Bookings (CHEMO-*)
 *  - Generic Flow Payments (PAY-*)
 *
 * On payment success:
 *  1. Updates database status to PAID / CONFIRMED
 *  2. Creates verified Payment record in DB (for tour orders) and updates appointment payment status
 *  3. Sends instant WhatsApp confirmation to customer
 *  4. Renders comprehensive Thank You page with all booking details
 */

export const GET = withErrors(async (request: NextRequest) => {
  const brand = await businessName()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const refParam = searchParams.get("ref") || searchParams.get("order") || searchParams.get("merchantReference") || searchParams.get("billerRefNumber") || ""
  const amount = searchParams.get("amount")
  const currency = searchParams.get("currency") || "OMR"

  const host = request.headers.get("host") || "app.fizmoh.cloud"
  const protocol = request.headers.get("x-forwarded-proto") || "https"
  const origin = `${protocol}://${host}`

  // ─── 1. PAYMENT RETURN & SUCCESS RECEIPT PAGE ───
  if (status && refParam) {
    // Never trust `?status=success` to transition an order. The signed
    // Merchant Cloud Notification must have already done that work.
    const isSuccess = status === "success" && await gatewayConfirmed(refParam)

    let tourDetails: any = null
    let aptDetails: any = null
    let chemoDetails: any = null
    let customerPhone = ""

    if (isSuccess) {
      // ── A. TOUR ORDER (ORD-*) ──
      if (refParam.startsWith("ORD-")) {
        try {
          const order = await db.order.findFirst({
            where: { orderNumber: refParam },
            include: { tour: true, slot: true, customer: true, vouchers: true, payments: true },
          })
          if (order) {
            customerPhone = order.customerPhone

            // The signed callback/webhook owns all state changes and
            // notifications. This browser return only reads the receipt.
            tourDetails = { order, voucher: order.vouchers?.[0] ?? null }
          }
        } catch (e) {
          console.error("Error processing tour order payment:", e)
        }
      }

      // ── B. APPOINTMENT / DOCTOR (APT-*) ──
      else if (refParam.startsWith("APT-")) {
        try {
          const apt = await db.aptAppointment.findFirst({
            where: { reference: refParam },
            include: { service: true, provider: true, branch: true },
          })
          if (apt) {
            customerPhone = apt.customerPhone
            aptDetails = apt

            // The signed callback/webhook owns all state changes and
            // notifications. This browser return only reads the receipt.
          }
        } catch (e) {
          console.error("Error processing appointment payment:", e)
        }
      }

      // ── C. CHEMOTHERAPY DAY CARE (CHEMO-*) ──
      else if (refParam.startsWith("CHEMO-")) {
        try {
          const chemo = await db.hospChemoBooking.findFirst({
            where: { bookingRef: refParam },
            include: { patient: true, doctor: true, bed: { include: { ward: true } }, session: true },
          })
          if (chemo) {
            customerPhone = chemo.patient?.mobile || ""
            chemoDetails = chemo

            // The signed callback/webhook owns all state changes and
            // notifications. This browser return only reads the receipt.
          }
        } catch (e) {
          console.error("Error processing chemotherapy payment:", e)
        }
      }
    }

    /*
     * The button has to open a chat with the business, not with the customer.
     *
     * This used to build `wa.me/<customerPhone>` — the number of the person
     * looking at the screen — so tapping "Message us on WhatsApp" opened a chat
     * with themselves. The fallback was worse: a hardcoded number, shown to
     * every tenant's customers regardless of whose booking it was.
     *
     * The tenant's own connected number is used instead, and when there is none
     * the button is dropped rather than pointed at somebody arbitrary.
     */
    const businessNumber = await db.whatsAppAccount
      .findFirst({ where: { displayPhone: { not: null } }, select: { displayPhone: true } })
      .then(row => (row?.displayPhone || "").replace(/[^0-9]/g, ""))
      .catch(() => "")
    const waUrl = businessNumber ? `https://wa.me/${businessNumber}` : ""

    const html = isSuccess
      ? `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
         <title>Booking & Payment Confirmed — ${brand}</title>
         <style>
           *{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif}
           body{background:#f0fdf4;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.25rem}
           .card{background:white;border-radius:24px;box-shadow:0 25px 80px rgba(15,118,110,.15);max-width:480px;width:100%;overflow:hidden;border:1px solid #dcfce7}
           .header{background:linear-gradient(135deg,#059669,#0d9488);color:white;padding:2.25rem 1.5rem 1.75rem;text-align:center;position:relative}
           .check-badge{width:68px;height:68px;border-radius:50%;background:rgba(255,255,255,.2);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;box-shadow:0 8px 24px rgba(0,0,0,.15)}
           .check-badge svg{width:36px;height:36px;stroke:white;stroke-width:3.5;fill:none}
           .header h1{font-size:1.45rem;font-weight:800;letter-spacing:-.02em}
           .header p{font-size:.875rem;opacity:.92;margin-top:.35rem}
           .body{padding:1.75rem 1.5rem}
           .ref-card{background:#f8fafc;border:1px dashed #cbd5e1;border-radius:14px;padding:1rem;margin-bottom:1.25rem;display:flex;justify-content:space-between;align-items:center}
           .ref-card .label{font-size:.75rem;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px}
           .ref-card .val{font-size:1.1rem;font-weight:800;font-family:ui-monospace,monospace;color:#0d9488}
           .details-box{background:#f8fafc;border-radius:16px;padding:1.25rem;margin-bottom:1.25rem;border:1px solid #f1f5f9}
           .row{display:flex;justify-content:space-between;align-items:flex-start;padding:.5rem 0;border-bottom:1px solid #e2e8f0;font-size:.875rem}
           .row:last-child{border-bottom:none}
           .row .label{color:#64748b;font-weight:500;shrink-0}
           .row .val{font-weight:700;color:#1e293b;text-align:right;max-width:65%}
           .paid-badge{display:inline-flex;align-items:center;gap:.3rem;background:#dcfce7;color:#15803d;padding:.2rem .55rem;border-radius:999px;font-size:.75rem;font-weight:700}
           .meet-box{background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:1rem;margin-bottom:1.25rem;text-align:center}
           .meet-box .title{font-size:.75rem;font-weight:700;color:#065f46;text-transform:uppercase;margin-bottom:.25rem}
           .meet-box a{color:#0d9488;font-weight:700;font-size:.85rem;word-break:break-all;text-decoration:none}
           .actions{display:flex;flex-direction:column;gap:.75rem}
           .wa-btn{display:flex;align-items:center;justify-content:center;gap:.5rem;background:#25d366;color:white;text-decoration:none;padding:1rem;border-radius:14px;font-weight:700;font-size:1rem;box-shadow:0 4px 18px rgba(37,211,102,.35);transition:transform .15s}
           .wa-btn:hover{transform:scale(1.02)}
           .print-btn{display:block;width:100%;background:#f1f5f9;color:#334155;border:none;padding:.75rem;border-radius:12px;font-size:.85rem;font-weight:600;cursor:pointer;text-align:center;text-decoration:none}
           .print-btn:hover{background:#e2e8f0}
           .footer-note{text-align:center;font-size:.75rem;color:#94a3b8;margin-top:1rem}
         </style></head>
         <body><div class="card">
           <div class="header">
             <div class="check-badge"><svg viewBox="0 0 24 24"><polyline points="5,13 10,18 19,7"/></svg></div>
             <h1>Payment & Booking Confirmed!</h1>
             <p>Thank you, your reservation is now active</p>
           </div>
           <div class="body">
             <div class="ref-card">
               <span class="label">Reference ID</span>
               <span class="val">#${refParam}</span>
             </div>

             <div class="details-box">
               ${tourDetails ? `
                 <div class="row"><span class="label">Tour:</span><span class="val">${tourDetails.order.tour.name}</span></div>
                 <div class="row"><span class="label">Date & Time:</span><span class="val">${formatDate(tourDetails.order.slot.date)} (${tourDetails.order.slot.startTime})</span></div>
                 <div class="row"><span class="label">Travelers:</span><span class="val">${tourDetails.order.paxAdult} Adult${tourDetails.order.paxAdult > 1 ? "s" : ""}${tourDetails.order.paxChild ? `, ${tourDetails.order.paxChild} Child` : ""}</span></div>
                 <div class="row"><span class="label">Lead Guest:</span><span class="val">${tourDetails.order.customerName}</span></div>
                 <div class="row"><span class="label">Meeting Point:</span><span class="val">${tourDetails.order.tour.meetingPoint || "Sent via WhatsApp"}</span></div>
                 ${tourDetails.voucher ? `<div class="row"><span class="label">Voucher Code:</span><span class="val" style="font-family:monospace;color:#0d9488">${tourDetails.voucher.voucherCode}</span></div>` : ""}
                 <div class="row"><span class="label">Total Paid:</span><span class="val"><span class="paid-badge">✓ PAID</span> ${formatCurrency(tourDetails.order.totalAmount)}</span></div>
               ` : aptDetails ? `
                 <div class="row"><span class="label">Patient Name:</span><span class="val">${aptDetails.customerName}</span></div>
                 <div class="row"><span class="label">Service / Consultation:</span><span class="val">${aptDetails.service?.name || "Consultation"}</span></div>
                 ${aptDetails.provider ? `<div class="row"><span class="label">Doctor / Specialist:</span><span class="val">${aptDetails.provider.name}</span></div>` : ""}
                 <div class="row"><span class="label">Date & Time:</span><span class="val">${localDateKey(new Date(aptDetails.appointmentDate))} (${aptDetails.startTime})</span></div>
                 <div class="row"><span class="label">Duration:</span><span class="val">${aptDetails.durationMins} minutes</span></div>
                 <div class="row"><span class="label">Total Paid:</span><span class="val"><span class="paid-badge">✓ PAID</span> ${aptDetails.totalAmount} OMR</span></div>
               ` : chemoDetails ? `
                 <div class="row"><span class="label">Patient:</span><span class="val">${chemoDetails.patient?.fullName} (${chemoDetails.patient?.mrn})</span></div>
                 <div class="row"><span class="label">Hospital:</span><span class="val">Kauvery Hospital Day Care</span></div>
                 <div class="row"><span class="label">Ward & Bed:</span><span class="val">${chemoDetails.bed?.ward?.name || "Day Care Ward"} — <strong>Bed ${chemoDetails.bed?.bedNumber}</strong></span></div>
                 <div class="row"><span class="label">Session:</span><span class="val">${chemoDetails.session?.name || "Day Care Session"} (${chemoDetails.session?.startTime || "08:00"} - ${chemoDetails.session?.endTime || "12:00"})</span></div>
                 <div class="row"><span class="label">Consultant:</span><span class="val">${chemoDetails.doctor?.name}</span></div>
                 <div class="row"><span class="label">Treatment Date:</span><span class="val">${formatDate(chemoDetails.bookingDate)}</span></div>
                 <div class="row"><span class="label">Total Paid:</span><span class="val"><span class="paid-badge">✓ PAID</span> 50.000 OMR</span></div>
               ` : `
                 <div class="row"><span class="label">Transaction:</span><span class="val">AmwalPay Gateway</span></div>
                 <div class="row"><span class="label">Amount Paid:</span><span class="val"><span class="paid-badge">✓ PAID</span> ${amount || "10.000"} ${currency || "OMR"}</span></div>
               `}
             </div>

             ${aptDetails?.meetLink ? `
               <div class="meet-box">
                 <div class="title">🎥 Google Meet Consultation Link</div>
                 <a href="${aptDetails.meetLink}" target="_blank">${aptDetails.meetLink}</a>
               </div>
             ` : ""}

             <div class="actions">
               ${waUrl ? `<a href="${waUrl}" class="wa-btn">
                 💬 Message us on WhatsApp
               </a>` : ""}
               <button onclick="window.print()" class="print-btn">
                 🖨️ Print / Save Receipt
               </button>
             </div>
             <p class="footer-note">A confirmation copy has been sent to your WhatsApp & registered contact.</p>
           </div>
         </div></body></html>`
      : `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payment Failed</title>
         <style>
           *{margin:0;padding:0;box-sizing:border-box}
           body{font-family:system-ui;background:#fef2f2;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.25rem}
           .card{background:white;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.1);max-width:420px;width:100%;overflow:hidden;border:1px solid #fee2e2}
           .header{background:linear-gradient(135deg,#b91c1c,#dc2626);color:white;padding:2rem;text-align:center}
           .x-badge{width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-size:32px}
           .header h1{font-size:1.4rem;font-weight:700}
           .body{padding:2rem;text-align:center}
           .retry-btn{display:inline-block;background:#0d9488;color:white;padding:.875rem 2rem;border-radius:12px;text-decoration:none;font-weight:700;margin-top:1.25rem}
         </style></head>
         <body><div class="card">
           <div class="header"><div class="x-badge">✕</div><h1>Payment Unsuccessful</h1></div>
           <div class="body">
             <p style="color:#64748b">Your payment could not be processed at this time.</p>
             <p style="color:#94a3b8;font-size:.8rem;margin-top:.5rem">Reference: #${refParam}</p>
             ${waUrl ? `<a href="${waUrl}" class="retry-btn">← Message us on WhatsApp</a>` : ""}
           </div>
         </div></body></html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html" } })
  }

  // ─── 2. CHECKOUT PAYMENT FORM / REDIRECT ───
  let orderAmount = amount || "10.000"
  let orderCurrency = currency || "OMR"
  let customerName = "Customer"
  let customerPhone = ""
  let customerEmail = ""
  let description = "Booking Payment"

  if (refParam.startsWith("APT-")) {
    try {
      const apt = await db.aptAppointment.findFirst({
        where: { reference: refParam },
        include: { service: true },
      })
      if (apt) {
        orderAmount = apt.totalAmount.toFixed(3)
        customerName = apt.customerName
        customerPhone = apt.customerPhone
        customerEmail = apt.customerEmail || ""
        description = `Appointment - ${apt.service?.name || "Consultation"}`

        if (await amwalPayReady()) {
          const session = await createPaymentSession({
            orderId: apt.id,
            orderNumber: apt.reference,
            amount: apt.totalAmount,
            currency: "OMR",
            customerName,
            customerEmail: customerEmail || undefined,
            customerPhone,
            description,
            successUrl: `${origin}/api/amwalpay/hosted-checkout?status=success&ref=${apt.reference}&amount=${orderAmount}&currency=OMR`,
            failureUrl: `${origin}/api/amwalpay/hosted-checkout?status=failure&ref=${apt.reference}`,
            webhookUrl: `${origin}/api/amwalpay/webhook`,
          })
          if (session.success && session.paymentLinkUrl && session.paymentLinkUrl.startsWith("http")) {
            return NextResponse.redirect(session.paymentLinkUrl)
          }
        }
      }
    } catch (e) {
      console.error("AmwalPay appointment session error:", e)
    }
  } else if (refParam.startsWith("ORD-")) {
    try {
      const orderRecord = await db.order.findFirst({
        where: { orderNumber: refParam },
        include: { tour: true, customer: true },
      })
      if (orderRecord) {
        orderAmount = orderRecord.totalAmount.toFixed(3)
        customerName = orderRecord.customerName
        customerPhone = orderRecord.customerPhone
        customerEmail = orderRecord.customerEmail || ""
        description = `Tour - ${orderRecord.tour.name}`

        if (await amwalPayReady()) {
          const session = await createPaymentSession({
            orderId: orderRecord.id,
            orderNumber: orderRecord.orderNumber,
            amount: orderRecord.totalAmount,
            currency: "OMR",
            customerName,
            customerEmail: customerEmail || undefined,
            customerPhone,
            description,
            successUrl: `${origin}/api/amwalpay/hosted-checkout?status=success&ref=${orderRecord.orderNumber}&amount=${orderAmount}&currency=OMR`,
            failureUrl: `${origin}/api/amwalpay/hosted-checkout?status=failure&ref=${orderRecord.orderNumber}`,
            webhookUrl: `${origin}/api/amwalpay/webhook`,
          })
          if (session.success && session.paymentLinkUrl && session.paymentLinkUrl.startsWith("http")) {
            return NextResponse.redirect(session.paymentLinkUrl)
          }
        }
      }
    } catch (e) {
      console.error("AmwalPay order session error:", e)
    }
  } else if (refParam.startsWith("CHEMO-")) {
    try {
      const chemo = await db.hospChemoBooking.findFirst({
        where: { bookingRef: refParam },
        include: { patient: true, doctor: true },
      })
      if (chemo) {
        const chemoAmt = await chemoPrice()
        orderAmount = chemoAmt.toFixed(3)
        customerName = chemo.patient.fullName
        customerPhone = chemo.patient.mobile
        description = `Chemotherapy Day Care Bed - ${formatDate(chemo.bookingDate)}`

        if (await amwalPayReady()) {
          const session = await createPaymentSession({
            orderId: chemo.id,
            orderNumber: chemo.bookingRef,
            amount: chemoAmt,
            currency: "OMR",
            customerName,
            customerPhone,
            description,
            successUrl: `${origin}/api/amwalpay/hosted-checkout?status=success&ref=${chemo.bookingRef}&amount=${orderAmount}&currency=OMR`,
            failureUrl: `${origin}/api/amwalpay/hosted-checkout?status=failure&ref=${chemo.bookingRef}`,
            webhookUrl: `${origin}/api/amwalpay/webhook`,
          })
          if (session.success && session.paymentLinkUrl && session.paymentLinkUrl.startsWith("http")) {
            return NextResponse.redirect(session.paymentLinkUrl)
          }
        }
      }
    } catch (e) {
      console.error("AmwalPay chemo session error:", e)
    }
  }

  // ─── Direct Checkout Card Form ───
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>AmwalPay — Secure Payment</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
      body{background:linear-gradient(135deg,#0a6e63,#0d9488);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.25rem}
      .checkout{background:white;border-radius:22px;box-shadow:0 25px 80px rgba(0,0,0,.25);max-width:440px;width:100%;overflow:hidden}
      .header{background:linear-gradient(135deg,#0a6e63,#0d9488);color:white;padding:1.5rem;text-align:center;position:relative}
      .logo{display:flex;align-items:center;justify-content:center;gap:.5rem;font-size:1.4rem;font-weight:800}
      .logo-icon{width:32px;height:32px;background:white;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.2rem}
      .secure{font-size:.7rem;opacity:.85;margin-top:.5rem;display:flex;align-items:center;justify-content:center;gap:.3rem}
      .body{padding:1.75rem}
      .merchant{background:#f8fafc;border-radius:12px;padding:1rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:.75rem;border:1px solid #f1f5f9}
      .merchant-icon{width:42px;height:42px;background:linear-gradient(135deg,#10b981,#059669);border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:.9rem}
      .merchant-info{flex:1}
      .merchant-name{font-weight:700;color:#1e293b;font-size:.9rem}
      .merchant-desc{font-size:.75rem;color:#64748b;margin-top:.15rem}
      .amount-display{text-align:center;margin-bottom:1.5rem}
      .amount-display .amt{font-size:2.4rem;font-weight:800;color:#0a6e63}
      .amount-display .cur{font-size:1rem;color:#64748b;margin-left:.25rem}
      .field{margin-bottom:1rem}
      .field label{font-size:.7rem;font-weight:700;color:#64748b;display:block;margin-bottom:.35rem;text-transform:uppercase;letter-spacing:.4px}
      .field input{width:100%;padding:.75rem;border:1.5px solid #e2e8f0;border-radius:10px;font-size:.875rem;color:#1e293b;outline:none;transition:border-color .2s}
      .field input:focus{border-color:#0d9488}
      .card-row{display:flex;gap:.75rem}
      .card-row .field{flex:1}
      .pay-btn{width:100%;background:linear-gradient(135deg,#059669,#0d9488);color:white;border:none;padding:1rem;border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer;transition:all .2s;box-shadow:0 4px 15px rgba(13,148,136,.35)}
      .pay-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(13,148,136,.45)}
    </style></head>
    <body>
      <div class="checkout">
        <div class="header">
          <div class="logo"><div class="logo-icon">💳</div> AmwalPay</div>
          <div class="secure">🔒 Official AmwalPay Gateway · OMAN (PCI-DSS)</div>
        </div>
        <div class="body">
          <div class="merchant">
            <div class="merchant-icon">${brand.slice(0, 2).toUpperCase()}</div>
            <div class="merchant-info">
              <div class="merchant-name">${brand}</div>
              <div class="merchant-desc">${description} (${refParam})</div>
            </div>
          </div>

          <div class="amount-display">
            <span class="amt">${orderAmount}</span>
            <span class="cur">${orderCurrency}</span>
          </div>

          <form action="/api/amwalpay/hosted-checkout" method="GET" id="payForm">
            <input type="hidden" name="status" value="success" />
            <input type="hidden" name="ref" value="${refParam}" />
            <input type="hidden" name="amount" value="${orderAmount}" />
            <input type="hidden" name="currency" value="${orderCurrency}" />

            <div class="field">
              <label>Card Number</label>
              <input type="text" placeholder="4000 1234 5678 9010" required maxlength="19" />
            </div>
            <div class="card-row">
              <div class="field">
                <label>Expiry Date</label>
                <input type="text" placeholder="MM/YY" required maxlength="5" />
              </div>
              <div class="field">
                <label>CVV / CVC</label>
                <input type="password" placeholder="123" required maxlength="4" />
              </div>
            </div>
            <div class="field">
              <label>Cardholder Name</label>
              <input type="text" value="${customerName}" required />
            </div>

            <button type="submit" class="pay-btn" id="submitBtn">
              Pay ${orderAmount} ${orderCurrency} Now
            </button>
          </form>
        </div>
      </div>
    </body></html>`

  return new NextResponse(html, { headers: { "Content-Type": "text/html" } })
})
