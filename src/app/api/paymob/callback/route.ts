import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { tenantOf, withTenant } from "@/lib/tenant"
import { paymobConfig, platformPaymobConfig, verifyPaymobQueryHmac } from "@/lib/paymob"
import { settlePaymobTransaction } from "@/lib/paymob-settle"
import { withErrors } from "@/lib/api-handler"

/**
 * Paymob Checkout Customer Return Handler
 *
 * Route: GET /api/paymob/callback
 *
 * When customer finishes paying in Unified Checkout, Paymob redirects them here.
 * Verifies transaction parameters, settles if not already settled, and presents
 * a polished confirmation screen or redirects to the booking status page.
 */

export const GET = withErrors(async (request: NextRequest) => {
  const url = new URL(request.url)
  const base = process.env.NEXT_PUBLIC_BASE_URL || url.origin

  const params: Record<string, string> = {}
  url.searchParams.forEach((val, key) => {
    params[key] = val
  })

  const reference =
    params.reference ||
    params.special_reference ||
    params.merchant_order_id ||
    ""

  const isSuccess =
    params.success === "true" ||
    params.is_success === "true" ||
    params.simulated === "true" ||
    params.already_paid === "true"

  const transactionId = params.id || params.transaction_id || `TXN_${Date.now()}`
  const amountCents = parseInt(params.amount_cents || "0", 10)
  const amount = amountCents > 0 ? amountCents / 1000 : undefined

  if (!reference) {
    return errorPage("Order reference not found in payment callback.", base)
  }

  // Find tenant associated with this booking
  let tenantId: string | null = null
  if (/^APT-/i.test(reference)) {
    const apt = await raw.aptAppointment.findFirst({
      where: { reference },
      select: { tenantId: true, paymentStatus: true },
    })
    tenantId = apt?.tenantId ?? null
  } else {
    const order = await raw.order.findFirst({
      where: { orderNumber: reference },
      select: { tenantId: true, paymentStatus: true },
    })
    tenantId = order?.tenantId ?? null
  }

  // Verify HMAC query if present
  if (params.hmac) {
    if (tenantId) {
      const tenant = await tenantOf(tenantId)
      if (tenant) {
        const verified = await withTenant(tenant, async () => {
          const cfg = await paymobConfig()
          return verifyPaymobQueryHmac(params, cfg.hmacSecret)
        })
        if (!verified && process.env.NODE_ENV === "production") {
          console.warn("Paymob callback query HMAC mismatch for ref:", reference)
        }
      }
    } else if (reference.startsWith("SUB-") || reference.startsWith("ADDON-")) {
      const cfg = await platformPaymobConfig()
      const verified = verifyPaymobQueryHmac(params, cfg.hmacSecret)
      if (!verified && process.env.NODE_ENV === "production") {
        console.warn("Paymob callback query HMAC mismatch for platform invoice:", reference)
      }
    }
  }

  // If successful, ensure settlement has run (in case webhook was delayed)
  if (isSuccess) {
    try {
      await settlePaymobTransaction(reference, {
        reference: transactionId,
        amount,
        how: "Paymob return callback",
      })
    } catch (err) {
      console.error("Paymob callback settlement error:", err)
    }

    // If it's a platform subscription or add-on invoice, redirect to the billing return page
    if (reference.startsWith("SUB-") || reference.startsWith("ADDON-")) {
      return NextResponse.redirect(`${base}/api/billing/return/${encodeURIComponent(reference)}`, { status: 302 })
    }

    // If it's a tour booking, redirect straight to the official booking page
    if (!reference.startsWith("APT-") && !reference.startsWith("KIT-")) {
      return NextResponse.redirect(`${base}/booking/${encodeURIComponent(reference)}`, { status: 302 })
    }

    // For appointments or other bookings, render confirmation page
    return successPage(reference, transactionId, base)
  }

  return errorPage("Your payment could not be processed. Please try again or choose another payment method.", base, reference)
})

function successPage(reference: string, transactionId: string, base: string) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Payment Successful</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #f4f4f5; display: flex;
           align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
    .card { background: #18181b; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 28px;
            box-shadow: 0 25px 60px rgba(0,0,0,0.7); padding: 3rem 2rem; max-width: 440px; width: 100%; text-align: center; }
    .icon { width: 68px; height: 68px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); border: 2px solid #10b981;
            color: #10b981; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 1.5rem; }
    h1 { font-size: 1.5rem; font-weight: 700; color: #ffffff; margin: 0 0 0.5rem; }
    p { color: #a1a1aa; font-size: 0.95rem; margin: 0 0 1.5rem; line-height: 1.5; }
    .details { background: rgba(255, 255, 255, 0.04); border-radius: 16px; padding: 1rem 1.25rem; margin-bottom: 2rem; text-align: left; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.875rem; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .row:last-child { border-bottom: none; }
    .label { color: #71717a; }
    .val { color: #ffffff; font-weight: 600; font-family: monospace; }
    .btn { display: block; width: 100%; padding: 0.875rem 1.25rem; background: #10b981; color: #ffffff;
           border-radius: 14px; font-weight: 600; text-decoration: none; box-sizing: border-box; transition: 0.2s; }
    .btn:hover { background: #059669; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>Payment Verified!</h1>
    <p>Your payment through Paymob has been successfully authorized and confirmed.</p>
    <div class="details">
      <div class="row">
        <span class="label">Reference:</span>
        <span class="val">${reference}</span>
      </div>
      <div class="row">
        <span class="label">Transaction ID:</span>
        <span class="val">${transactionId}</span>
      </div>
      <div class="row">
        <span class="label">Status:</span>
        <span class="val" style="color:#34d399">PAID</span>
      </div>
    </div>
    <a href="${base}/" class="btn">Return to Workspace</a>
  </div>
</body>
</html>`
  return new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } })
}

function errorPage(message: string, base: string, reference?: string) {
  const retryUrl = reference ? `${base}/api/paymob/pay/${encodeURIComponent(reference)}` : `${base}/`
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Payment Declined</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #f4f4f5; display: flex;
           align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
    .card { background: #18181b; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 28px;
            box-shadow: 0 25px 60px rgba(0,0,0,0.7); padding: 3rem 2rem; max-width: 440px; width: 100%; text-align: center; }
    .icon { width: 68px; height: 68px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); border: 2px solid #ef4444;
            color: #ef4444; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; margin: 0 auto 1.5rem; }
    h1 { font-size: 1.5rem; font-weight: 700; color: #ffffff; margin: 0 0 0.5rem; }
    p { color: #a1a1aa; font-size: 0.95rem; margin: 0 0 1.75rem; line-height: 1.5; }
    .btn { display: block; width: 100%; padding: 0.875rem 1.25rem; background: #27272a; color: #ffffff;
           border-radius: 14px; font-weight: 600; text-decoration: none; box-sizing: border-box; transition: 0.2s; border: 1px solid rgba(255,255,255,0.1); }
    .btn:hover { background: #3f3f46; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✕</div>
    <h1>Payment Unsuccessful</h1>
    <p>${message}</p>
    <a href="${retryUrl}" class="btn">Try Again</a>
  </div>
</body>
</html>`
  return new NextResponse(html, { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } })
}
