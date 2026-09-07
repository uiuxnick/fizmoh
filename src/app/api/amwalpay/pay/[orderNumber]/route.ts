import { NextRequest, NextResponse } from "next/server"
import { db, raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { tenantOf, withTenant } from "@/lib/tenant"
import { amwalPayConfig, getSmartBoxScriptUrl, amwalTimestamp, smartBoxInitHash } from "@/lib/amwalpay"

/**
 * The card checkout itself.
 *
 * AmwalPay's own integrations open SmartBox — their hosted card form — inside
 * the merchant's page, and SmartBox hands the signed result back to the
 * browser, which passes it to a merchant callback. That path needs nothing
 * enabled on the merchant account, which is why it is the one we take: the
 * notification and inquiry APIs both sit behind an entitlement this merchant
 * does not have, and a customer cannot be asked to wait for it.
 *
 * The page is deliberately plain. It exists for the seconds between tapping
 * "Pay now" in WhatsApp and SmartBox drawing over it.
 */
export const GET = withErrors(
  async (request: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) => {
    const { orderNumber } = await params
    const reference = decodeURIComponent(orderNumber)
    const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin

    /*
     * A subscription invoice is paid the same way a booking is.
     *
     * It is the platform's own merchant account rather than a workspace's, and
     * the reference is a SUB-/ADDON- one rather than an order number, but the
     * card form and the signed result coming back are identical — so the same
     * page serves both instead of a second copy drifting out of step.
     */
    const { isSubscriptionReference, isAddonReference, asPlatform } = await import("@/lib/billing")
    if (isSubscriptionReference(reference) || isAddonReference(reference)) {
      return subscriptionCheckout(reference, base, asPlatform)
    }

    const stub = await raw.order.findFirst({
      where: { orderNumber: reference },
      select: { id: true, tenantId: true },
    })
    if (!stub) return NextResponse.redirect(`${base}/`, { status: 302 })

    const tenant = await tenantOf(stub.tenantId)
    if (!tenant) return NextResponse.redirect(`${base}/`, { status: 302 })

    const page = await withTenant(tenant, async () => {
      const order = await db.order.findFirst({ where: { id: stub.id }, include: { tour: true } })
      if (!order) return null

      // Nothing to pay: send them to the booking they already have.
      if (["APPROVED", "PAID"].includes(order.paymentStatus)) return "settled"

      const config = await amwalPayConfig()
      if (!(config.merchantId && config.terminalId && config.secureKey)) return "unconfigured"

      const amount = Number(order.totalAmount.toFixed(3))
      const requestDateTime = amwalTimestamp()
      const secureHash = smartBoxInitHash({
        amount,
        currencyId: 512, // OMR
        merchantId: config.merchantId,
        merchantReference: order.orderNumber,
        terminalId: config.terminalId,
        requestDateTime,
        secureKey: config.secureKey,
      })

      const checkout = {
        AmountTrxn: amount,
        MerchantReference: order.orderNumber,
        MID: config.merchantId,
        TID: config.terminalId,
        CurrencyId: 512,
        LanguageId: "en",
        SecureHash: secureHash,
        TrxDateTime: requestDateTime,
        PaymentViewType: 1,
        RequestSource: "Checkout_Direct_Integration",
        SessionToken: "",
      }

      return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Secure payment · ${escapeHtml(order.orderNumber)}</title>
<style>
  body { margin:0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background:#faf9f7; color:#1c1917;
         display:flex; align-items:center; justify-content:center; min-height:100vh; padding:24px; }
  .card { text-align:center; max-width:360px; }
  .amount { font-size:28px; font-weight:700; margin:8px 0 2px; }
  .muted { color:#78716c; font-size:13px; }
  .spinner { width:28px; height:28px; margin:20px auto 0; border:3px solid #e7e5e4; border-top-color:#0f766e;
             border-radius:50%; animation:spin 0.9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
  <div class="card">
    <div class="muted">${escapeHtml(order.tour.name)}</div>
    <div class="amount">${amount.toFixed(3)} OMR</div>
    <div class="muted">Order ${escapeHtml(order.orderNumber)}</div>
    <div class="spinner"></div>
    <p class="muted" id="status">Opening secure card payment…</p>
  </div>
  <script src="${getSmartBoxScriptUrl()}"></script>
  <script>
    var CHECKOUT = ${JSON.stringify(checkout)};
    var CALLBACK = ${JSON.stringify(`${base}/api/amwalpay/callback`)};
    var CANCEL = ${JSON.stringify(`${base}/booking/${encodeURIComponent(order.orderNumber)}`)};

    function go(params) {
      var q = Object.keys(params).map(function (k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(params[k] == null ? "" : params[k])
      }).join("&")
      window.location = CALLBACK + "?" + q
    }

    function start() {
      if (typeof SmartBox === "undefined") {
        document.getElementById("status").textContent =
          "Could not load the payment form. Please check your connection and try again."
        return
      }
      SmartBox.Checkout.configure = Object.assign({}, CHECKOUT, {
        completeCallback: function (data) {
          // The signed result. Our server verifies the hash before it counts.
          var d = (data && data.data && data.data.data) || {}
          go({
            amount: d.amount,
            currencyId: d.currencyId,
            customerId: d.customerId,
            customerTokenId: d.customerTokenId,
            merchantReference: d.merchantReference || CHECKOUT.MerchantReference,
            responseCode: (data && data.data && data.data.responseCode),
            transactionId: d.transactionId,
            transactionTime: d.transactionTime,
            secureHashValue: d.secureHashValue
          })
        },
        errorCallback: function () {
          document.getElementById("status").textContent = "The payment could not be completed. Please try again."
        },
        cancelCallback: function () { window.location = CANCEL }
      })
      SmartBox.Checkout.showSmartBox()
    }

    window.addEventListener("load", start)
  </script>
</body>
</html>`
    })

    if (page === null) return NextResponse.redirect(`${base}/`, { status: 302 })
    if (page === "settled") {
      return NextResponse.redirect(`${base}/booking/${encodeURIComponent(reference)}`, { status: 302 })
    }
    if (page === "unconfigured") {
      return new NextResponse("Card payment is unavailable — this business has not finished setting up its payment gateway.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    }

    return new NextResponse(page, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    })
  },
)

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string
  ))
}


/** The SmartBox page for one of our own subscription invoices. */
async function subscriptionCheckout(
  reference: string,
  base: string,
  asPlatform: <T>(work: () => Promise<T>) => Promise<T>,
) {
  const { raw: rawDb } = await import("@/lib/db")
  const invoice = await rawDb.subscriptionInvoice.findUnique({ where: { reference } })
  if (!invoice) return NextResponse.redirect(`${base}/`, { status: 302 })

  const done = `${base}/api/billing/return/${encodeURIComponent(reference)}`
  if (invoice.status === "PAID") return NextResponse.redirect(done, { status: 302 })

  const { platformAmwalPayConfig } = await import("@/lib/amwalpay")
  const config = await asPlatform(() => platformAmwalPayConfig())
  if (!(config.merchantId && config.terminalId && config.secureKey)) {
    return NextResponse.redirect(done, { status: 302 })
  }

  // Minor units in the database, major units at the gateway.
  const amount = Number((invoice.amount / 1000).toFixed(3))
  const requestDateTime = amwalTimestamp()
  const secureHash = smartBoxInitHash({
    amount,
    currencyId: 512, // OMR
    merchantId: config.merchantId,
    merchantReference: reference,
    terminalId: config.terminalId,
    requestDateTime,
    secureKey: config.secureKey,
  })

  return new NextResponse(
    smartBoxPage({
      amount,
      reference,
      merchantId: config.merchantId,
      terminalId: config.terminalId,
      requestDateTime,
      secureHash,
      scriptUrl: config.mode === "production"
        ? "https://checkout.amwalpg.com/js/SmartBox.js?v=1.1"
        : "https://test.amwalpg.com:7443/js/SmartBox.js?v=1.1",
      callbackUrl: `${base}/api/amwalpay/callback`,
      title: "Fizmoh subscription",
    }),
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  )
}

/*
 * The SmartBox page for a subscription invoice.
 *
 * The booking path above builds its own copy inline. That is duplication, and
 * it is deliberate: that template is live payment code taking customers' money,
 * and refactoring it to share this one would put a working path at risk to
 * save a few lines. If a third caller appears, extract then.
 */
function smartBoxPage(o: {
  amount: number
  reference: string
  merchantId: string
  terminalId: string
  requestDateTime: string
  secureHash: string
  scriptUrl: string
  callbackUrl: string
  title: string
}) {
  const checkout = {
    AmountTrxn: o.amount,
    MerchantReference: o.reference,
    MID: o.merchantId,
    TID: o.terminalId,
    CurrencyId: 512,
    LanguageId: "en",
    SecureHash: o.secureHash,
    TrxDateTime: o.requestDateTime,
    PaymentViewType: 1,
    RequestSource: "Checkout_Direct_Integration",
    SessionToken: "",
  }
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Secure payment</title>
<style>
  body { margin:0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background:#faf9f7; color:#1c1917;
         display:flex; align-items:center; justify-content:center; min-height:100vh; padding:24px; }
  .card { text-align:center; max-width:360px; }
  .amount { font-size:28px; font-weight:700; margin:8px 0 2px; }
  .muted { color:#78716c; font-size:13px; }
  .spinner { width:28px; height:28px; margin:20px auto 0; border:3px solid #e7e5e4; border-top-color:#0f766e;
             border-radius:50%; animation:spin 0.9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
  <div class="card">
    <div class="muted">${escapeHtml(o.title)}</div>
    <div class="amount">${o.amount.toFixed(3)} OMR</div>
    <div class="muted">${escapeHtml(o.reference)}</div>
    <div class="spinner"></div>
    <p class="muted" id="status">Opening secure card payment…</p>
  </div>
  <script src="${o.scriptUrl}"></script>
  <script>
    var CHECKOUT = ${JSON.stringify(checkout)};
    var CALLBACK = ${JSON.stringify(o.callbackUrl)};

    function go(params) {
      var q = Object.keys(params).map(function (k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(params[k] == null ? "" : params[k])
      }).join("&")
      window.location = CALLBACK + "?" + q
    }

    function start() {
      if (typeof SmartBox === "undefined") {
        document.getElementById("status").textContent =
          "Could not load the payment form. Please check your connection and try again."
        return
      }
      SmartBox.Checkout.configure = Object.assign({}, CHECKOUT, {
        completeCallback: function (data) {
          var d = (data && data.data && data.data.data) || {}
          go({
            amount: d.amount,
            currencyId: d.currencyId,
            customerId: d.customerId,
            customerTokenId: d.customerTokenId,
            merchantReference: d.merchantReference || CHECKOUT.MerchantReference,
            responseCode: (data && data.data && data.data.responseCode),
            transactionId: d.transactionId,
            transactionTime: d.transactionTime,
            secureHashValue: d.secureHashValue
          })
        },
        errorCallback: function () {
          document.getElementById("status").textContent = "The payment could not be completed. Please try again."
        },
        cancelCallback: function () { window.history.back() }
      })
      SmartBox.Checkout.showSmartBox()
    }

    window.addEventListener("load", start)
  </script>
</body>
</html>`
}
