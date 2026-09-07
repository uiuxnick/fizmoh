import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { generateVoucherPDF } from "@/lib/voucher-pdf"
import { withErrors } from "@/lib/api-handler"

/**
 * Public PDF e-ticket.
 *
 * Public because WhatsApp fetches document URLs from Meta's servers, which
 * carry no session — but guarded by an HMAC token derived from the order id,
 * so the endpoint cannot be walked to enumerate other customers' tickets.
 */

export function voucherToken(orderId: string): string {
  const secret = process.env.JWT_SECRET || "dev-secret"
  return crypto.createHmac("sha256", secret).update(`voucher:${orderId}`).digest("hex").slice(0, 32)
}

export function voucherPdfUrl(orderId: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud"
  return `${base}/api/vouchers/${orderId}/pdf?t=${voucherToken(orderId)}`
}

export const GET = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const token = new URL(request.url).searchParams.get("t") || ""

  const expected = voucherToken(id)
  const provided = Buffer.from(token.padEnd(expected.length, " ").slice(0, expected.length))
  if (!crypto.timingSafeEqual(Buffer.from(expected), provided)) {
    return NextResponse.json({ error: "Invalid or missing token" }, { status: 403 })
  }

  const pdf = await generateVoucherPDF(id)
  if (!pdf) return NextResponse.json({ error: "Booking not found" }, { status: 404 })

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="eticket-${id.slice(-8)}.pdf"`,
      "Cache-Control": "private, max-age=300",
    },
  })
})
