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
            `✅ *Registration Confirmed — ${course.name}*\n\n` +
            `Hello *${updated.customerName}*,\n\n` +
            `Your registration and payment have been confirmed!\n\n` +
            `• *Course:* ${course.name}\n` +
            `• *Participant(s):* ${updated.numberOfSeats} Attendee(s)\n` +
            `• *Dates:* ${course.startDate} to ${course.endDate}\n` +
            `• *Time:* ${course.startTime} - ${course.endTime}\n` +
            `• *Venue:* ${course.venueName}, ${course.city}\n` +
            `• *Registration ID:* ${updated.registrationNumber}\n\n` +
            `📍 Google Maps: ${course.mapUrl || "Provided in venue details"}\n\n` +
            `We look forward to welcoming you and your colleagues!`

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
