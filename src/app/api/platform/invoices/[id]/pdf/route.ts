import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { requirePlatformAdmin } from "@/app/api/platform/tenants/route"
import { generateInvoicePDF } from "@/lib/invoice-pdf"
import { sessionFromRequest } from "@/lib/auth"
import { raw } from "@/lib/db"

/**
 * The invoice as a PDF.
 *
 * Available to platform administrators and workspace members for their own invoices.
 */
export const GET = withErrors(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) => {
  const { id } = await context.params
  const invoice = await raw.subscriptionInvoice.findUnique({ where: { id }, select: { reference: true, tenantId: true } })
  if (!invoice) return NextResponse.json({ error: "No such invoice" }, { status: 404 })

  const admin = await requirePlatformAdmin(request).catch(() => null)
  let isAuthorized = !!admin

  if (!isAuthorized) {
    const session = await sessionFromRequest(request)
    if (session?.kind === "staff" && session.staffId) {
      const membership = await raw.tenantMember.findFirst({
        where: { staffId: session.staffId, tenantId: invoice.tenantId },
      })
      if (membership) {
        isAuthorized = true
      }
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized to download this invoice" }, { status: 403 })
  }

  const bytes = await generateInvoicePDF(id)
  if (!bytes) return NextResponse.json({ error: "Could not build the invoice" }, { status: 500 })

  // `inline` so the browser previews it — Print and Save both work from there,
  // which is what the panel's View, Print and Download buttons all open.
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.reference}.pdf"`,
      "Cache-Control": "no-store",
    },
  })
})
