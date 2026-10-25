import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { generateVoucherHTML } from "@/lib/voucher"
import { withErrors } from "@/lib/api-handler"
import { voucherToken } from "@/lib/voucher-url"
import { sessionFromRequest } from "@/lib/auth"

/**
 * GET /api/vouchers/[id]
 * Returns a printable HTML voucher page (can be saved as PDF via browser print)
 * Per BRD §6.7: "downloadable PDF voucher/invoice"
 * Guarded by HMAC token for customer links or staff session for dashboard views.
 */
export const GET = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const token = new URL(request.url).searchParams.get("t") || ""
  const session = await sessionFromRequest(request)

  let isAuthorized = false
  if (session?.kind === "staff") {
    isAuthorized = true
  } else if (token) {
    const expected = voucherToken(id)
    if (token.length === expected.length) {
      isAuthorized = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token))
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: "Invalid or missing token" }, { status: 403 })
  }

  const html = await generateVoucherHTML(id)
  if (!html) return new Response("Voucher not found", { status: 404 })
  return new Response(html, { headers: { "Content-Type": "text/html" } })
})
