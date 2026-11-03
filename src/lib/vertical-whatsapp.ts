import { sendWhatsApp } from "@/lib/notifications"

export async function sendRestaurantOrderUpdate(input: {
  phone?: string | null
  orderId: string
  status: string
  tableNumber?: string | null
  totalAmount?: number
}) {
  if (!input.phone) return { success: false, error: "No customer phone" }
  const status = input.status.replace(/_/g, " ").toLowerCase()
  return sendWhatsApp({
    to: input.phone,
    body: `🍽️ *Order update*\n\nOrder #${input.orderId.slice(-8).toUpperCase()} is now *${status}*.${input.tableNumber ? `\nTable: ${input.tableNumber}` : ""}${input.totalAmount !== undefined ? `\nTotal: ${input.totalAmount.toFixed(3)} OMR` : ""}\n\nReply here if you need help.`,
    allowOutsideSession: true,
  })
}

export async function sendHospitalBookingUpdate(input: {
  tenantId?: string
  phone: string
  patientName?: string | null
  reference: string
  type: "chemo" | "doctor"
  date: string
  time?: string | null
  doctor?: string | null
  bed?: string | null
  hospitalName?: string | null
}) {
  const hosp = input.hospitalName || "Hospital"
  const isArabic = Boolean(
    (input.patientName && /[\u0600-\u06FF]/.test(input.patientName)) ||
    (input.doctor && /[\u0600-\u06FF]/.test(input.doctor)) ||
    /[\u0600-\u06FF]/.test(hosp)
  )

  const body = isArabic
    ? `🏥 *${input.type === "chemo" ? "تأكيد حجز جلسة العلاج الكيماوي" : "تأكيد موعد الطبيب"} — ${hosp}*\n\n` +
      `عزيزي/عزيزتي: *${input.patientName || "المريض"}*،\n` +
      `تم تأكيد حجزك بنجاح.\n\n` +
      `🔖 رقم المرجع: *${input.reference}*\n` +
      `📅 التاريخ: *${input.date}*\n` +
      `⏰ الوقت: *${input.time || "حسب الموعد المحدد"}*\n` +
      (input.doctor ? `👨‍⚕️ الطبيب المعالج: *${input.doctor}*\n` : "") +
      (input.bed ? `🛏️ السرير المخصص: *${input.bed}*\n` : "") +
      `\nإذا كنت بحاجة إلى تعديل أو إعادة جدولة الموعد، يرجى الرد مباشرة على هذه الرسالة.`
    : `🏥 *${input.type === "chemo" ? "Chemotherapy Day-Care Booking" : "Doctor Appointment"} Confirmed — ${hosp}*\n\n` +
      `Dear *${input.patientName || "Patient"}*,\n` +
      `Your booking has been successfully confirmed.\n\n` +
      `🔖 Reference: *${input.reference}*\n` +
      `📅 Date: *${input.date}*\n` +
      `⏰ Time: *${input.time || "As scheduled"}*\n` +
      (input.doctor ? `👨‍⚕️ Doctor: *${input.doctor}*\n` : "") +
      (input.bed ? `🛏️ Bed: *${input.bed}*\n` : "") +
      `\nPlease reply here if you need to reschedule or have any questions.`

  const deliver = async () => {
    return sendWhatsApp({
      to: input.phone,
      body,
      allowOutsideSession: true,
    })
  }

  if (input.tenantId) {
    const { withTenant } = await import("@/lib/tenant")
    const { raw } = await import("@/lib/db")
    const tenant = await raw.tenant.findUnique({ where: { id: input.tenantId }, select: { slug: true } })
    return withTenant({ tenantId: input.tenantId, slug: tenant?.slug || "hospital" }, deliver)
  }

  return deliver()
}
