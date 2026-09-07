import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { requirePlatformAdmin } from "@/app/api/platform/tenants/route"
import { raw } from "@/lib/db"

/**
 * Sends an invoice to the workspace's owner on WhatsApp, as a PDF document.
 *
 * The document is fetched by Meta from the public PDF address rather than
 * uploaded here, which is how sendMediaMessage works throughout the app.
 */
export const POST = withErrors(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) => {
  const admin = await requirePlatformAdmin(request)
  if (!admin) return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 })

  const { id } = await context.params
  const body = await request.json().catch(() => ({} as Record<string, unknown>))

  const invoice = await raw.subscriptionInvoice.findUnique({
    where: { id },
    include: { subscription: { include: { plan: true } } },
  })
  if (!invoice) return NextResponse.json({ error: "No such invoice" }, { status: 404 })

  const tenant = await raw.tenant.findUnique({ where: { id: invoice.tenantId }, select: { name: true } })
  const owner = await raw.tenantMember.findFirst({
    where: { tenantId: invoice.tenantId, role: "OWNER" },
    include: { staff: { select: { phone: true, name: true } } },
  })

  // An explicit recipient wins, so an operator can send a copy to an accounts
  // department that is not the owner's own number.
  const to = String((body.phone as string) || owner?.staff?.phone || "").replace(/[^\d+]/g, "")
  if (!to) {
    return NextResponse.json(
      { error: "No WhatsApp number for this workspace's owner. Add one, or pass a number to send to." },
      { status: 400 },
    )
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin
  const pdfUrl = `${base}/api/invoices/${invoice.id}/pdf`
  const amount = (invoice.amount / 1000).toFixed(3)
  const plan = invoice.subscription?.plan?.name || "Subscription"

  const caption =
    invoice.status === "PAID"
      ? `Invoice ${invoice.reference} — ${plan}\nPaid: ${amount} OMR\n\nThank you.`
      : `Invoice ${invoice.reference} — ${plan}\nAmount due: ${amount} OMR\n\nThe invoice is attached.`

  const { sendMediaMessage } = await import("@/lib/whatsapp")
  const sent = await sendMediaMessage({
    to,
    type: "document",
    mediaUrl: pdfUrl,
    filename: `${invoice.reference}.pdf`,
    caption,
  })

  if (!sent?.success) {
    return NextResponse.json(
      { error: sent?.error || "WhatsApp would not accept the document" },
      { status: 502 },
    )
  }

  await raw.platformAuditEvent.create({
    data: {
      tenantId: invoice.tenantId,
      actorStaffId: admin.id,
      action: "SEND_INVOICE",
      entity: "INVOICE",
      entityId: invoice.id,
      after: { to, reference: invoice.reference } as never,
      reason: `Invoice ${invoice.reference} sent to ${tenant?.name || "workspace"} on WhatsApp`,
    },
  })

  return NextResponse.json({ success: true, to })
})
