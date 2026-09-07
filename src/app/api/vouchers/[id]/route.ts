import { NextRequest } from "next/server"
import { generateVoucherHTML } from "@/lib/voucher"
import { withErrors } from "@/lib/api-handler"

/**
 * GET /api/vouchers/[id]
 * Returns a printable HTML voucher page (can be saved as PDF via browser print)
 * Per BRD §6.7: "downloadable PDF voucher/invoice"
 */
export const GET = withErrors(async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const html = await generateVoucherHTML(id)
  if (!html) return new Response("Voucher not found", { status: 404 })
  return new Response(html, { headers: { "Content-Type": "text/html" } })
})
