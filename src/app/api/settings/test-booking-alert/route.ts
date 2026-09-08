import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { currentTenant } from "@/lib/tenant"
import { notifyAdminWhatsAppBooking, normalizePhone } from "@/lib/admin-booking-notifications"

export const POST = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const phone = body.phone ? normalizePhone(body.phone) : null
  const bookingType = body.bookingType === "training" ? "training" : "tour"

  if (!phone) {
    return NextResponse.json({ error: "Phone number required" }, { status: 400 })
  }

  const testServiceName = bookingType === "training" ? "Horse Riding Training (Coach Nouf)" : "Sunset Beach Tour"
  const orderNumber = `TEST-${Math.floor(1000 + Math.random() * 9000)}`

  // Send directly to the target phone
  const { sendWhatsApp } = await import("@/lib/notifications")
  const formattedBody = `🔔 *Test Admin WhatsApp Alert*

This is a test notification from your Fizmoh Admin Dashboard.
🎫 Service: ${testServiceName}
🔢 Test Order: #${orderNumber}
💰 Amount: 70.00 OMR

✅ If you see this, your WhatsApp booking notifications are working!`

  const result = await sendWhatsApp({
    to: phone,
    body: formattedBody,
  })

  return NextResponse.json({
    success: result.success,
    error: result.error,
    phone,
    messageId: result.messageId,
  })
})
