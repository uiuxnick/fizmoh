import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { currentTenant } from "@/lib/tenant"
import { normalizePhone } from "@/lib/admin-booking-notifications"
import { raw } from "@/lib/db"
import { getWhatsAppConfig } from "@/lib/whatsapp"
import { sendWhatsApp } from "@/lib/notifications"

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

  // 1. WhatsApp Cloud API does not allow sending a message from a business number to itself
  const config = await getWhatsAppConfig()
  const cleanPhone = phone.replace(/[^\d]/g, "")
  const cleanSender = (config.phoneNumber || "").replace(/[^\d]/g, "")
  if (cleanSender && cleanPhone === cleanSender) {
    return NextResponse.json({
      success: false,
      error: `WhatsApp Cloud API cannot send a message to the business's own sender number (+${cleanSender}). Please enter a personal admin or coach mobile number (e.g. Coach Nouf or your personal phone number).`,
    })
  }

  // 2. Fetch approved Meta template for admin booking notifications
  let approvedTemplate = await raw.template.findFirst({
    where: {
      tenantId: tenant.tenantId,
      channel: "WHATSAPP",
      name: { in: ["admin_booking_notification", "admin_booking_notification_ar"] },
      status: "APPROVED",
    },
    orderBy: { updatedAt: "desc" },
  })

  if (!approvedTemplate) {
    approvedTemplate = await raw.template.findFirst({
      where: {
        channel: "WHATSAPP",
        name: { in: ["admin_booking_notification", "admin_booking_notification_ar"] },
        status: "APPROVED",
      },
      orderBy: { updatedAt: "desc" },
    })
  }

  const templateName = approvedTemplate?.name || "admin_booking_notification"
  const language = approvedTemplate?.language || "en_US"

  const testServiceName = bookingType === "training" ? "Horse Riding Training (Coach Nouf)" : "Sunset Beach Tour"
  const orderNumber = `TEST-${Math.floor(1000 + Math.random() * 9000)}`
  const dateTime = new Date().toLocaleString("en-GB", { timeZone: "Asia/Muscat" })

  const templateVariables = [
    "Admin (Test Alert)",
    phone,
    testServiceName,
    dateTime,
    "70.00",
    orderNumber,
  ]

  const formattedBody = `🔔 *Test Admin WhatsApp Alert*

This is a test notification from your Fizmoh Admin Dashboard.
🎫 Service: ${testServiceName}
🔢 Test Order: #${orderNumber}
💰 Amount: 70.00 OMR
📅 Date: ${dateTime}

✅ If you see this, your WhatsApp booking notifications are working!`

  // 3. Send using approved template so it bypasses the 24-hour window requirement
  const result = await sendWhatsApp({
    to: phone,
    templateName,
    language,
    templateVariables,
    body: formattedBody,
    forceTemplate: true,
  })

  let error = result.error
  if (!result.success && error?.includes("(#100) Invalid parameter")) {
    error = `WhatsApp Cloud API cannot send a message to the business sender number itself (${phone}). Please enter a personal admin or coach mobile number.`
  }

  return NextResponse.json({
    success: result.success,
    error,
    phone,
    messageId: result.messageId,
  })
})
