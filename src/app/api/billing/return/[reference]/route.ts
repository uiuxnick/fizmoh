import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"

/**
 * Where the platform's gateway sends a workspace after it pays us.
 *
 * The reference is in the path because AmwalPay strips query strings from the
 * return URL — the same lesson the customer-facing return learned the hard
 * way. Nothing is confirmed here: a browser coming back proves only that a
 * browser came back. The cloud notification settles the invoice, and this page
 * reports whatever it has already recorded.
 */
export const GET = withErrors(async (
  _request: NextRequest,
  context: { params: Promise<{ reference: string }> },
) => {
  const { reference } = await context.params
  const invoice = await db.subscriptionInvoice.findUnique({
    where: { reference },
    include: { subscription: { include: { plan: true } } },
  })

  const paid = invoice?.status === "PAID"
  const title = !invoice
    ? "We could not find that payment"
    : paid
      ? "Payment received"
      : "Payment is being confirmed"
  const detail = !invoice
    ? "Nothing here matches that reference."
    : paid
      ? `${invoice.subscription.plan.name} is active until ${invoice.subscription.currentPeriodEnd?.toDateString() ?? "the end of the period"}.`
      : "Your bank has been asked. This page will update on its own."

  return new NextResponse(page(title, detail, paid), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
})

function page(title: string, detail: string, done: boolean) {
  // Refreshes itself while the answer is still outstanding, so somebody who
  // paid is not left looking at "being confirmed" after it has been.
  const refresh = done ? "" : '<meta http-equiv="refresh" content="5">'
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">${refresh}
<title>${title}</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#fafaf9;margin:0;display:grid;place-items:center;min-height:100vh">
<div style="max-width:26rem;padding:2rem;text-align:center">
<div style="font-size:2.5rem">${done ? "✅" : "⏳"}</div>
<h1 style="font-size:1.25rem;color:#1c1917;margin:.75rem 0">${title}</h1>
<p style="color:#57534e;font-size:.9rem;line-height:1.5">${detail}</p>
<a href="/" style="display:inline-block;margin-top:1.25rem;background:#059669;color:#fff;text-decoration:none;padding:.6rem 1.2rem;border-radius:.5rem;font-size:.9rem;font-weight:600">Back to the dashboard</a>
</div></body></html>`
}
