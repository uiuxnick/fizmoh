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
  phone: string
  patientName?: string | null
  reference: string
  type: "chemo" | "doctor"
  date: string
  time?: string | null
  doctor?: string | null
  bed?: string | null
}) {
  const title = input.type === "chemo" ? "Chemotherapy day-care booking" : "Doctor appointment"
  return sendWhatsApp({
    to: input.phone,
    body: `🏥 *${title} confirmed*\n\nDear ${input.patientName || "Patient"},\nReference: *${input.reference}*\nDate: ${input.date}\nTime: ${input.time || "As scheduled"}${input.doctor ? `\nDoctor: ${input.doctor}` : ""}${input.bed ? `\nBed: ${input.bed}` : ""}\n\nPlease reply here if you need to reschedule.`,
    allowOutsideSession: true,
  })
}
