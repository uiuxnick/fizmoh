import { sendInteractiveMessage } from "@/lib/whatsapp"
import { sendWhatsApp } from "@/lib/notifications"

export interface AptConfirmationDetails {
  phone: string
  reference: string
  customerName: string
  customerEmail?: string | null
  serviceName: string
  providerName?: string
  branchName?: string
  dateStr: string
  timeStr: string
  durationMins: number
  price: number
  currency: string
  paymentStatus?: string
  paymentUrl?: string | null
  meetLink?: string | null
  address?: string | null
}

/**
 * Send interactive confirmation message via WhatsApp.
 */
export async function sendAptConfirmation(details: AptConfirmationDetails) {
  const {
    phone, reference, customerName, customerEmail, serviceName, providerName,
    branchName, dateStr, timeStr, durationMins, price, currency,
    paymentStatus, paymentUrl, meetLink, address,
  } = details

  const priceText = price > 0 ? `${price} ${currency}` : "Free"
  const locationText = meetLink ? `🎥 Online (Meet: ${meetLink})` : address ? `📍 ${address}` : branchName ? `🏢 ${branchName}` : ""
  const payStatusText = paymentStatus === "PAID" ? "✅ Paid" : price > 0 ? "⏳ Pending Payment" : "Not Required"

  const bodyText =
    `✅ *Appointment Confirmed!*\n\n` +
    `📌 *ID:* #${reference}\n` +
    `👤 *Patient Name:* ${customerName}\n` +
    (customerEmail ? `📧 *Email:* ${customerEmail}\n` : "") +
    `💆 *Service Name:* ${serviceName}\n` +
    (providerName ? `👨‍⚕️ *Provider:* ${providerName}\n` : "") +
    `📅 *Date:* ${dateStr}\n` +
    `⏰ *Time:* ${timeStr} (${durationMins} mins)\n` +
    `💰 *Fee:* ${priceText} (${payStatusText})\n` +
    (locationText ? `${locationText}\n` : "") +
    (paymentUrl ? `\n💳 *Pay Online:* ${paymentUrl}\n` : "") +
    `\nThank you for booking with us!`

  const buttons = [
    { id: `apt_view_${reference}`, title: "📋 View Details" },
    { id: `apt_resched_${reference}`, title: "📅 Reschedule" },
    { id: `apt_cancel_${reference}`, title: "❌ Cancel" },
  ]

  try {
    await sendInteractiveMessage({
      to: phone,
      body: bodyText,
      buttons,
      headerText: "Booking Details",
    })
  } catch {
    await sendWhatsApp({ to: phone, body: bodyText })
  }
}

/**
 * Send reminder WhatsApp message.
 */
export async function sendAptReminder(details: AptConfirmationDetails, reminderType: string) {
  const { phone, reference, serviceName, dateStr, timeStr, providerName } = details

  const bodyText =
    `⏰ *Appointment Reminder (${reminderType})*\n\n` +
    `Hi! Your appointment for *${serviceName}* ` +
    (providerName ? `with *${providerName}* ` : "") +
    `is scheduled for *${dateStr} at ${timeStr}*.\n\n` +
    `Ref: #${reference}`

  const buttons = [
    { id: `apt_confirm_${reference}`, title: "✅ Confirm Coming" },
    { id: `apt_resched_${reference}`, title: "📅 Reschedule" },
  ]

  try {
    await sendInteractiveMessage({
      to: phone,
      body: bodyText,
      buttons,
    })
  } catch {
    await sendWhatsApp({ to: phone, body: bodyText })
  }
}

/**
 * Send cancellation confirmation.
 */
export async function sendAptCancellationNotice(phone: string, reference: string, serviceName: string) {
  const text = `❌ Your appointment (*${serviceName}*, Ref: #${reference}) has been cancelled.`
  await sendWhatsApp({ to: phone, body: text })
}

/**
 * Send reschedule confirmation.
 */
export async function sendAptRescheduleNotice(phone: string, reference: string, serviceName: string, dateStr: string, timeStr: string) {
  const text = `📅 Your appointment (*${serviceName}*, Ref: #${reference}) has been rescheduled to *${dateStr} at ${timeStr}*.`
  await sendWhatsApp({ to: phone, body: text })
}
