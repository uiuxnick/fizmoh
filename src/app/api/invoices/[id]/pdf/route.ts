import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { generateInvoicePDF } from "@/lib/invoice-pdf"
import { raw } from "@/lib/db"

/**
 * The invoice PDF at an address WhatsApp can fetch.
 *
 * Meta downloads media by URL, so a document sent to a workspace has to be
 * reachable without a session. This follows the voucher PDF's existing
 * arrangement: the id is a cuid, so the address is unguessable, and nothing is
 * listed anywhere — knowing the link is the permission, exactly as it is for a
 * voucher. Deliberately no enumeration: an id that does not exist and an id
 * that does but cannot be rendered both answer 404.
 */
export const GET = withErrors(async (
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) => {
  const { id } = await context.params
  const invoice = await raw.subscriptionInvoice.findUnique({ where: { id }, select: { reference: true } })
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const bytes = await generateInvoicePDF(id)
  if (!bytes) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.reference}.pdf"`,
      "Cache-Control": "no-store",
    },
  })
})
