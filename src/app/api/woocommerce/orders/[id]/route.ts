import { withErrors } from "@/lib/api-handler"
import { wcRequest } from "@/lib/woocommerce-client"
import { NextRequest, NextResponse } from "next/server"
import { sessionFromRequest } from "@/lib/auth"
import { withModule } from "@/lib/entitlements"
import { currentTenant, withTenant } from "@/lib/tenant"

/**
 * Edit WooCommerce Order Status & Add Notes
 */
export const PUT = withErrors(withModule("WOOCOMMERCE", async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(request)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Staff authentication required" }, { status: 401 })
  }

  const { id } = await params
  const tenant = currentTenant()
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
    if (notifyCustomer && phone && status && tenant) {
      const customerName = `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim() || "Customer"
      const orderNum = order.number || id
      const total = order.total ? `${order.total} ${order.currency || "OMR"}` : "Paid"
      const currency = order.currency || "OMR"
      const itemCount = Array.isArray(order.line_items) ? order.line_items.length : 1
      const orderUrl = order.order_key ? `${order.view_order_url || ""}` : ""

      const statusLower = String(status).toLowerCase()
      let eventType: any = "ORDER_PROCESSING"
      if (statusLower === "completed") eventType = "ORDER_SHIPPED"
      else if (statusLower === "cancelled" || statusLower === "refunded") eventType = "ORDER_CANCELLED"

      const { sendEcommerceNotification } = await import("@/lib/ecommerce-templates")
      await withTenant(tenant, () =>
        sendEcommerceNotification({
          tenantId: tenant.tenantId,
          eventType,
          to: phone,
          data: {
            name: customerName,
            order_number: orderNum,
            store_name: tenant.slug || "WooCommerce Store",
            total,
            currency,
            item_count: itemCount,
            carrier: "Courier",
            tracking_number: "",
            tracking_url: orderUrl,
            order_url: orderUrl,
          },
        })
      ).catch(err => console.error("[woocommerce] order notification failed:", err))
    }

    return NextResponse.json({ success: true, order })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to update WooCommerce order" }, { status: 400 })
  }
}))
