import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"

/**
 * Where AmwalPay sends the customer's browser after payment.
 *
 * Redirects directly to the Hosted Checkout Thank You Receipt page
 * with status=success and the reference number, which updates the database,
 * sends WhatsApp confirmations, and displays full booking details.
 */
export const GET = withErrors(async (request: NextRequest) => {
  const params = new URL(request.url).searchParams

  const reference =
    params.get("billerRefNumber") ||
    params.get("merchantReference") ||
    params.get("orderNumber") ||
    params.get("order") ||
    params.get("OrderId") ||
    params.get("ref") ||
    ""

  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin

  if (!reference) {
    return NextResponse.redirect(`${base}/`, { status: 302 })
  }

  // Redirect to Hosted Checkout Thank You page
  return NextResponse.redirect(
    `${base}/api/amwalpay/hosted-checkout?status=success&ref=${encodeURIComponent(reference)}`,
    { status: 302 },
  )
})
