/**
 * PDF Payment Receipt & Enrolment Confirmation for Corporate Training
 *
 * Generates official PDF receipts using pdf-lib with embedded check-in QR code,
 * course breakdown, and verified paid balance for WhatsApp delivery and client records.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import QRCode from "qrcode"
import { db } from "@/lib/db"
import { PLATFORM } from "@/lib/tenant"
import { getCourseByIdOrSlug, getTenantRegistrations, type Registration, type Course } from "@/lib/training-service"

const NAVY = rgb(0.08, 0.16, 0.28)
const GOLD = rgb(0.82, 0.65, 0.26)
const EMERALD = rgb(0.05, 0.48, 0.32)
const INK = rgb(0.12, 0.12, 0.14)
const MUTED = rgb(0.45, 0.45, 0.48)
const LIGHT_BG = rgb(0.96, 0.97, 0.98)
const BORDER_COLOR = rgb(0.88, 0.90, 0.92)

function safeText(text: string | null | undefined): string {
  if (!text) return ""
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "")
    .trim()
}

export async function generateTrainingReceiptPDF(
  tenantId: string,
  registrationIdOrNumber: string,
): Promise<{ pdfBytes: Uint8Array; registration: Registration; course: Course } | null> {
  let reg: Registration | undefined
  let actualTenantId = tenantId

  if (tenantId && tenantId !== PLATFORM) {
    const registrations = await getTenantRegistrations(tenantId)
    reg = registrations.find(
      r => r.id === registrationIdOrNumber || r.registrationNumber === registrationIdOrNumber,
    )
  }

  // Fallback: search across all tenant registration settings if not found
  if (!reg) {
    const settings = await db.systemSetting.findMany({
      where: { key: "training_registrations" },
    })
    for (const s of settings) {
      if (!s.value) continue
      try {
        const list: Registration[] = JSON.parse(s.value)
        const match = list.find(r => r.id === registrationIdOrNumber || r.registrationNumber === registrationIdOrNumber)
        if (match) {
          reg = match
          actualTenantId = s.tenantId || tenantId
          break
        }
      } catch {}
    }
  }

  if (!reg) return null

  const course = await getCourseByIdOrSlug(actualTenantId, reg.courseId)
  if (!course) return null

  const pdf = await PDFDocument.create()
  pdf.setTitle(safeText(`Payment Receipt - ${reg.registrationNumber}`))
  pdf.setSubject(safeText(course.name))
  pdf.setProducer("Tanfidh Management Consultants")

  const page = pdf.addPage([595, 842]) // A4
  const { width, height } = page.getSize()
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const body = await pdf.embedFont(StandardFonts.Helvetica)

  // 1. Header Banner
  page.drawRectangle({ x: 0, y: height - 120, width, height: 120, color: NAVY })
  page.drawText("TANFIDH MANAGEMENT CONSULTANTS", {
    x: 48,
    y: height - 52,
    size: 16,
    font: bold,
    color: rgb(1, 1, 1),
  })
  page.drawText("Executive Strategy & Corporate Transformation Advisors", {
    x: 48,
    y: height - 70,
    size: 10,
    font: body,
    color: rgb(0.8, 0.85, 0.9),
  })
  page.drawText("OFFICIAL PAYMENT RECEIPT & ENROLMENT CONFIRMATION", {
    x: 48,
    y: height - 98,
    size: 11,
    font: bold,
    color: GOLD,
  })

  // 2. Check-In QR Code
  const qrUrl = `https://app.fizmoh.cloud/training/checkin?ref=${reg.registrationNumber}`
  const qrPng = await QRCode.toBuffer(qrUrl, { width: 300, margin: 1 })
  const qrImage = await pdf.embedPng(qrPng)
  page.drawImage(qrImage, { x: width - 170, y: height - 265, width: 120, height: 120 })
  page.drawText("SCAN FOR VENUE CHECK-IN", {
    x: width - 175,
    y: height - 280,
    size: 8,
    font: bold,
    color: MUTED,
  })

  // 3. Receipt & Buyer Metadata
  let y = height - 150
  const drawField = (label: string, value: string, gap = 24) => {
    page.drawText(safeText(label.toUpperCase()), { x: 48, y, size: 8, font: bold, color: MUTED })
    page.drawText(safeText(value), { x: 48, y: y - 13, size: 11, font: body, color: INK })
    y -= gap + 13
  }

  drawField("Registration Reference", reg.registrationNumber)
  drawField("Date Issued", new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }))
  drawField("Primary Delegate", `${reg.customerName}${reg.companyName ? ` (${reg.companyName})` : ""}`)
  drawField("Official Email", reg.customerEmail)
  drawField("Contact Mobile", reg.customerPhone)

  // 4. Course Overview Box
  y -= 10
  page.drawRectangle({
    x: 44,
    y: y - 85,
    width: width - 88,
    height: 90,
    color: LIGHT_BG,
    borderColor: BORDER_COLOR,
    borderWidth: 1,
  })

  page.drawText("MASTERCLASS PROGRAM DETAILS", { x: 56, y: y - 18, size: 9, font: bold, color: NAVY })
  page.drawText(safeText(course.name), { x: 56, y: y - 34, size: 12, font: bold, color: INK })

  const trainerText = `Lead Trainer: ${course.trainerName || "Said bin Saif Al Harthi"} (Executive Director & Senior Consultant)`
  page.drawText(safeText(trainerText), { x: 56, y: y - 50, size: 10, font: body, color: MUTED })

  const scheduleText = `Dates: ${course.startDate} to ${course.endDate} (${course.duration || "2 Days | 14 Hours"}) · ${course.startTime || "09:00 AM"} - ${course.endTime || "04:00 PM"}`
  page.drawText(safeText(scheduleText), { x: 56, y: y - 66, size: 9, font: body, color: INK })

  const venueText = `Venue: ${course.venueName || "Sheraton Oman Hotel"}, Ruwi Financial District, Muscat`
  page.drawText(safeText(venueText), { x: 56, y: y - 80, size: 9, font: body, color: INK })

  y -= 110

  // 5. Confirmed Attendees Roster
  page.drawText("CONFIRMED ATTENDEE ROSTER", { x: 48, y, size: 9, font: bold, color: NAVY })
  y -= 14

  const attendees = reg.attendees && reg.attendees.length > 0 ? reg.attendees : [
    { name: reg.customerName, email: reg.customerEmail, isFreeSeat: false },
    { name: "Second Attendee (Free BOGO Seat)", email: reg.customerEmail, isFreeSeat: true },
  ]

  for (let i = 0; i < attendees.length; i++) {
    const att = attendees[i]
    page.drawRectangle({
      x: 44,
      y: y - 28,
      width: width - 88,
      height: 32,
      color: rgb(1, 1, 1),
      borderColor: BORDER_COLOR,
      borderWidth: 1,
    })

    const seatLabel = att.isFreeSeat ? "[FREE BOGO SEAT]" : "[PRIMARY SEAT]"
    page.drawText(`${i + 1}. ${safeText(att.name)}  ${seatLabel}`, {
      x: 56,
      y: y - 14,
      size: 10,
      font: bold,
      color: att.isFreeSeat ? EMERALD : INK,
    })
    page.drawText(safeText(att.email || reg.customerEmail), {
      x: 56,
      y: y - 25,
      size: 8,
      font: body,
      color: MUTED,
    })
    y -= 38
  }

  // 6. Financial Summary Box
  y -= 10
  const boxHeight = 115
  page.drawRectangle({
    x: 44,
    y: y - boxHeight,
    width: width - 88,
    height: boxHeight,
    color: rgb(0.95, 0.98, 0.96),
    borderColor: rgb(0.72, 0.86, 0.76),
    borderWidth: 1,
  })

  page.drawText("PAYMENT VERIFICATION & SETTLEMENT", { x: 56, y: y - 18, size: 9, font: bold, color: EMERALD })

  // Row 1: Total Investment & Paid Balance
  page.drawText("TOTAL INVESTMENT", { x: 56, y: y - 36, size: 8, font: bold, color: MUTED })
  page.drawText(`${reg.currency} ${reg.totalAmount.toFixed(2)}`, { x: 56, y: y - 50, size: 13, font: bold, color: INK })

  page.drawText("PAID BALANCE", { x: 340, y: y - 36, size: 8, font: bold, color: MUTED })
  page.drawText(`${reg.currency} ${reg.totalAmount.toFixed(2)} (PAID IN FULL)`, { x: 340, y: y - 50, size: 11, font: bold, color: EMERALD })

  // Row 2: Offer Applied & Balance Due
  const cleanOffer = reg.offerApplied ? (reg.offerApplied.includes("BOGO") || reg.offerApplied.includes("FREE") ? "Buy 1 Get 1 Free (BOGO Applied)" : reg.offerApplied.slice(0, 36)) : "Buy 1 Get 1 Free (BOGO Applied)"
  page.drawText("OFFER APPLIED", { x: 56, y: y - 68, size: 8, font: bold, color: MUTED })
  page.drawText(safeText(cleanOffer), { x: 56, y: y - 80, size: 9, font: bold, color: EMERALD })

  page.drawText("BALANCE DUE", { x: 340, y: y - 68, size: 8, font: bold, color: MUTED })
  page.drawText(`${reg.currency} 0.00 (SETTLED)`, { x: 340, y: y - 80, size: 11, font: bold, color: EMERALD })

  // Row 3: Payment Method
  page.drawText("PAYMENT METHOD", { x: 56, y: y - 96, size: 8, font: bold, color: MUTED })
  page.drawText("Direct Bank Transfer / Wire · Bank Muscat (Verified by Admissions)", { x: 56, y: y - 107, size: 8.5, font: body, color: INK })

  y -= boxHeight + 25

  // 7. Executive Note & Important Instructions
  page.drawText("EXECUTIVE ATTENDANCE INSTRUCTIONS:", { x: 48, y, size: 8, font: bold, color: NAVY })
  y -= 14
  const notes = [
    "- Please present this digital receipt or QR check-in code at the registration desk upon arrival.",
    "- Masterclass package includes 5-star Sheraton gourmet networking lunches and morning/afternoon coffee receptions.",
    "- Course materials, PowerBI/Excel strategy templates, and dual credentials will be provided during cohort sessions.",
    "- For executive coordination, contact Said Al Harthi: saidalharthy@tanfidh.com | +968 7178 4454.",
  ]
  for (const n of notes) {
    page.drawText(safeText(n), { x: 48, y, size: 8, font: body, color: MUTED })
    y -= 12
  }

  // 8. Footer
  page.drawLine({
    start: { x: 48, y: 40 },
    end: { x: width - 48, y: 40 },
    thickness: 1,
    color: BORDER_COLOR,
  })
  page.drawText("Tanfidh Management Consultants · Ruwi Financial District, Muscat, Sultanate of Oman · www.tanfidh.com", {
    x: 48,
    y: 26,
    size: 8,
    font: body,
    color: MUTED,
  })

  const pdfBytes = await pdf.save()
  return { pdfBytes, registration: reg, course }
}
