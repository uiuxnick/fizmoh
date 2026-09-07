import { NextRequest } from "next/server"
import { generateInvoiceHTML } from "@/lib/voucher"
import { withErrors } from "@/lib/api-handler"

/**
 * GET /api/invoices/[id]
 * Returns a printable VAT-compliant HTML invoice (order ID)
 * Per BRD §7: "VAT-compliant invoicing for Oman (5% VAT)"
 */
export const GET = withErrors(async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const html = await generateInvoiceHTML(id)
  if (!html) return new Response("Invoice not found", { status: 404 })
  return new Response(html, { headers: { "Content-Type": "text/html" } })
})
