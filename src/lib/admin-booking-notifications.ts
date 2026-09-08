import { db, raw } from "@/lib/db"
import { sendWhatsApp } from "@/lib/notifications"

export interface BookingRecipient {
  id: string
  name: string
  phone: string
  bookingType: "all" | "tour" | "training"
  active: boolean
}

/**
 * Normalizes phone numbers to E.164 format (+968...)
 */
export function normalizePhone(rawPhone: string): string {
  let cleaned = rawPhone.replace(/[^\d+]/g, "").trim()
  if (!cleaned.startsWith("+")) {
    if (cleaned.startsWith("968") && cleaned.length >= 11) {
      cleaned = `+${cleaned}`
    } else if (cleaned.length === 8 && /^[79]/.test(cleaned)) {
      // Standard 8-digit Oman mobile
      cleaned = `+968${cleaned}`
    } else {
      cleaned = `+${cleaned}`
    }
  }
  return cleaned
}

/**
 * Retrieves all configured booking notification recipient numbers for a tenant.
 */
export async function getBookingRecipients(tenantId: string): Promise<BookingRecipient[]> {
  if (!tenantId) return []

  // 1. Primary: Rich recipient list
  const setting = await db.systemSetting.findUnique({
    where: { tenantId_key: { tenantId, key: "booking_notification_recipients" } },
  })

  if (setting?.value) {
    try {
      const parsed = JSON.parse(setting.value)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any, idx: number) => ({
          id: item.id || `recipient-${idx}`,
          name: item.name || `Admin ${idx + 1}`,
          phone: normalizePhone(item.phone || ""),
          bookingType: (item.bookingType as any) || "all",
          active: item.active !== false,
        })).filter(r => r.phone.length > 6)
      }
    } catch {}
  }

  // 2. Fallback: Simple string or array of phones in booking_admin_phones
  const legacySetting = await db.systemSetting.findUnique({
    where: { tenantId_key: { tenantId, key: "booking_admin_phones" } },
  })

  if (legacySetting?.value) {
    try {
      const parsed = typeof legacySetting.value === "string" && legacySetting.value.trim().startsWith("[")
        ? JSON.parse(legacySetting.value)
        : legacySetting.value.split(/[\n,;]+/).map((s: string) => s.trim()).filter(Boolean)

      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((phone: string, i: number) => ({
          id: `legacy-${i}`,
          name: `Admin ${i + 1}`,
          phone: normalizePhone(phone),
          bookingType: "all" as const,
          active: true,
        })).filter(r => r.phone.length > 6)
      }
    } catch {}
  }

  // 3. Fallback: Check business_phone in settings or tenant
  const bizPhoneSetting = await db.systemSetting.findUnique({
    where: { tenantId_key: { tenantId, key: "business_phone" } },
  })
  if (bizPhoneSetting?.value?.trim()) {
    const p = normalizePhone(bizPhoneSetting.value.trim())
    if (p.length > 6) {
      return [{
        id: "default-business",
        name: "Main Business Admin",
        phone: p,
        bookingType: "all",
        active: true,
      }]
    }
  }

  return []
}

/**
 * Dispatches WhatsApp booking alerts to all configured admin recipients for a tenant.
 */
export async function notifyAdminWhatsAppBooking(params: {
  tenantId: string
  orderNumber: string
  customerName: string
  customerPhone: string
  serviceName: string
  dateTime?: string
  totalAmount: number | string
  bookingType: "tour" | "training"
  specialDetails?: string
}): Promise<{ sent: number; attempted: number }> {
  const {
    tenantId,
    orderNumber,
    customerName,
    customerPhone,
    serviceName,
    dateTime = new Date().toLocaleString("en-GB", { timeZone: "Asia/Muscat" }),
    totalAmount,
    bookingType,
    specialDetails,
  } = params

  const allRecipients = await getBookingRecipients(tenantId)
  const eligibleRecipients = allRecipients.filter(
    (r) => r.active && (r.bookingType === "all" || r.bookingType === bookingType)
  )

  if (eligibleRecipients.length === 0) {
    return { sent: 0, attempted: 0 }
  }

  // Check if tenant has an approved Meta utility template for admin notifications
  const approvedTemplate = await raw.template.findFirst({
    where: {
      tenantId,
      channel: "WHATSAPP",
      name: { in: ["admin_booking_notification", "admin_booking_notification_ar"] },
      status: "APPROVED",
    },
    orderBy: { updatedAt: "desc" },
  })

  const templateVariables = [
    customerName,
    customerPhone,
    serviceName,
    dateTime,
    typeof totalAmount === "number" ? totalAmount.toFixed(2) : String(totalAmount),
    orderNumber,
  ]

  const isTraining = bookingType === "training"
  const formattedBody = `🔔 *New ${isTraining ? "Training" : "Tour"} Booking Received!*

👤 *Customer:* ${customerName}
📞 *Phone:* ${customerPhone}
🎫 *Service:* ${serviceName}
📅 *Date & Time:* ${dateTime}
💰 *Total:* ${totalAmount} OMR
🔢 *Order ID:* #${orderNumber}
${specialDetails ? `\n📝 *Notes / Coach:* ${specialDetails}\n` : ""}
👉 Log in to dashboard: https://app.fizmoh.cloud/orders`

  let sentCount = 0

  for (const recipient of eligibleRecipients) {
    try {
      const res = await sendWhatsApp({
        to: recipient.phone,
        templateName: approvedTemplate?.name,
        language: approvedTemplate?.language || "en_US",
        templateVariables: approvedTemplate ? templateVariables : undefined,
        body: formattedBody,
      })

      if (res.success) {
        sentCount++
      } else {
        console.warn(`[Admin WhatsApp Alert] Failed to notify ${recipient.name} (${recipient.phone}): ${res.error}`)
      }
    } catch (err) {
      console.error(`[Admin WhatsApp Alert] Exception sending to ${recipient.phone}:`, err)
    }
  }

  return { sent: sentCount, attempted: eligibleRecipients.length }
}
