import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { currentTenant, PLATFORM } from "@/lib/tenant"
import {
  getTenantRegistrations,
  updateRegistrationStatus,
  getCourseByIdOrSlug,
  resolveTrainingVariables,
  type Registration,
} from "@/lib/training-service"
import { sendWhatsApp } from "@/lib/flow-delivery"

export const dynamic = "force-dynamic"

export const GET = withErrors(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const tenant = currentTenant()
    const tenantId = tenant?.tenantId || request.nextUrl.searchParams.get("tenantId") || PLATFORM

    const all = await getTenantRegistrations(tenantId)
    const registration = all.find(r => r.id === id || r.registrationNumber === id)
    if (!registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 })
    }

    const course = await getCourseByIdOrSlug(tenantId, registration.courseId)
    return NextResponse.json({ registration, course })
  },
)

export const PUT = withErrors(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const tenant = currentTenant()
    const tenantId = tenant?.tenantId || PLATFORM
    const body = (await request.json()) as Partial<Registration> & { notifyWhatsApp?: boolean }

    const updated = await updateRegistrationStatus(tenantId, id, body)
    if (!updated) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 })
    }

    // If payment confirmed or status confirmed, optionally send WhatsApp confirmation alert
    if ((body.paymentStatus === "PAID" || body.status === "CONFIRMED" || body.notifyWhatsApp) && updated.customerPhone) {
      try {
        const course = await getCourseByIdOrSlug(tenantId, updated.courseId)
        if (course) {
          const confirmationMsg =
            `🧾 *OFFICIAL PAYMENT RECEIPT & ENROLMENT CONFIRMATION*\n` +
            `*Tanfidh Management Consultants*\n\n` +
            `Dear *${updated.customerName}*,\n\n` +
            `Your bank transfer payment has been successfully verified! Your seat registration is fully confirmed.\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📋 *Registration Reference:* ${updated.registrationNumber}\n` +
            `🎓 *Course:* ${course.name}\n` +
            `👨‍💼 *Lead Trainer:* Said Al Harthi (Managing Consultant)\n` +
            `📅 *Dates:* ${course.startDate} to ${course.endDate}\n` +
            `⏱ *Timing:* ${course.startTime} - ${course.endTime}\n` +
            `📍 *Venue:* ${course.venueName}, ${course.address || "Ruwi Financial District"}, ${course.city}\n` +
            `👥 *Confirmed Seats:* ${updated.numberOfSeats} Attendee(s)\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `💰 *Total Investment:* OMR ${updated.totalAmount}\n` +
            `💳 *Paid Balance:* OMR ${updated.totalAmount} (Bank Transfer Verified)\n` +
            `⚖️ *Remaining Balance:* OMR 0.00 (Fully Paid)\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🎫 *Your Digital Check-In Pass:*\n` +
            `https://app.fizmoh.cloud/training/checkin?ref=${updated.registrationNumber}\n\n` +
            `📍 *Google Maps Venue Location:*\n` +
            `${course.mapUrl || "https://maps.google.com/?q=Sheraton+Oman+Hotel+Muscat"}\n\n` +
            `We look forward to hosting you at this executive masterclass!`

          const cleanPhone = updated.customerPhone.replace(/[^0-9+]/g, "")
          await sendWhatsApp({
            to: cleanPhone,
            body: confirmationMsg,
            allowOutsideSession: true,
          })
        }
      } catch (waErr) {
        console.warn("[training] Failed to send payment confirmation WhatsApp message:", waErr)
      }
    }

    return NextResponse.json({ success: true, registration: updated })
  },
)

export const DELETE = withErrors(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const tenant = currentTenant()
    const tenantId = tenant?.tenantId || PLATFORM

    const updated = await updateRegistrationStatus(tenantId, id, {
      status: "CANCELLED",
    })

    return NextResponse.json({ success: true, message: "Registration cancelled", registration: updated })
  },
)
