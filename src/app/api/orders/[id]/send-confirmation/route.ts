import { NextRequest, NextResponse } from "next/server"
import { sendOrderConfirmation } from "@/lib/notifications"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant } from "@/lib/tenant"
import { db } from "@/lib/db"

/**
 * Send order confirmation (Email + WhatsApp + staff notification)
 * Per BRD §6.7: "Unified Order Confirmation Flow"
 * Can be triggered manually by admin or automatically after payment approval
 */
export const POST = withErrors(withModule("TOURS", async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const tenant = currentTenant()
  const { id } = await params

  const order = await db.order.findFirst({
    where: {
      id,
      ...(tenant?.tenantId && tenant.tenantId !== "PLATFORM" ? { tenantId: tenant.tenantId } : {}),
    },
    select: { id: true },
  })
  if (!order) return NextResponse.json({ error: "Booking not found" }, { status: 404 })

  const result = await sendOrderConfirmation(id)
  return NextResponse.json(result)
}))
