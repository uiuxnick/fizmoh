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

    // Handle direct attendee update if requested
    if ((body as any).attendeeId && (body as any).attendeeUpdates) {
      const { attendeeId, attendeeUpdates } = body as any
      const { updateAttendeeDetails } = await import("@/lib/training-service")
      const attResult = await updateAttendeeDetails(tenantId, id, attendeeId, attendeeUpdates)
      if (!attResult) {
        return NextResponse.json({ error: "Attendee not found" }, { status: 404 })
      }
      return NextResponse.json({ success: true, registration: attResult.registration, attendee: attResult.attendee })
    }

    const updated = await updateRegistrationStatus(tenantId, id, body)
    if (!updated) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 })
    }

    // If payment confirmed or status confirmed, optionally send WhatsApp confirmation alert & PDF receipt
    if (body.paymentStatus === "PAID" || body.status === "CONFIRMED" || body.notifyWhatsApp) {
      try {
        let rawPhone = updated.customerPhone || updated.customerWhatsApp || ""
        if (rawPhone.toLowerCase().includes("same") || rawPhone.replace(/\D/g, "").length < 6) {
          const { db } = await import("@/lib/db")
          const cust = await db.customer.findFirst({
            where: { tenantId, OR: [{ email: updated.customerEmail }, { name: updated.customerName }] },
            select: { phone: true },
          })
          if (cust?.phone) rawPhone = cust.phone
        }
        const cleanPhone = rawPhone.replace(/[^0-9+]/g, "")

        if (cleanPhone && cleanPhone.length >= 7) {
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

            await sendWhatsApp({
              to: cleanPhone,
              body: confirmationMsg,
              allowOutsideSession: true,
            })

            // Also dispatch the official PDF receipt document directly to WhatsApp
            try {
              const { sendMediaMessage } = await import("@/lib/flow-delivery")
              const pdfUrl = `https://app.fizmoh.cloud/api/training/registrations/${updated.id}/pdf`
              await sendMediaMessage({
                to: cleanPhone,
                type: "document",
                mediaUrl: pdfUrl,
                filename: `Tanfidh-Receipt-${updated.registrationNumber}.pdf`,
                caption: `Official Payment Receipt & Confirmation Voucher — ${updated.registrationNumber}`,
              })
            } catch (pdfErr) {
              console.warn("[training] Failed to send PDF receipt document via WhatsApp:", pdfErr)
            }
          }
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
