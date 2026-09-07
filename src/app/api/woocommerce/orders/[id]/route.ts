import { withErrors } from "@/lib/api-handler"
import { wcRequest } from "@/lib/woocommerce-client"
import { sendTextMessage } from "@/lib/whatsapp"
import { NextRequest, NextResponse } from "next/server"

/**
 * Edit WooCommerce Order Status & Add Notes
 */
export const PUT = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const { status, note, notifyCustomer } = body

  try {
    const payload: Record<string, any> = {}
    if (status) payload.status = status

    const order = await wcRequest(`orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })

    if (note) {
      await wcRequest(`orders/${id}/notes`, {
        method: "POST",
        body: JSON.stringify({ note, customer_note: true }),
      }).catch(() => {})
    }

    const phone = order.billing?.phone || order.shipping?.phone
    if (notifyCustomer && phone && status) {
      const customerName = `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim() || "Customer"
      const statusLabel = status.toUpperCase().replace(/-/g, " ")

      await sendTextMessage(
        phone,
        `📦 *WooCommerce Order Status Update*\n\nHi ${customerName}, your order #${order.number || id} status has been updated to *${statusLabel}*.${note ? `\n\nNote: ${note}` : ""}\n\nThank you for shopping with us!`,
      ).catch(() => {})
    }

    return NextResponse.json({ success: true, order })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to update WooCommerce order" }, { status: 400 })
  }
})
