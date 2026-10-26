import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { currentTenant, PLATFORM } from "@/lib/tenant"
import { modulesFor } from "@/lib/entitlements"
import {
  getTenantRegistrations,
  updateRegistrationStatus,
  getCourseByIdOrSlug,
  resolveTrainingVariables,
  type Registration,
} from "@/lib/training-service"
import { sendWhatsApp } from "@/lib/flow-delivery"

export const dynamic = "force-dynamic"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "ADMIN", "MANAGER", "PLATFORM"]

export const GET = withErrors(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const tenant = currentTenant()
    const tenantId = tenant?.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const allowed = await modulesFor(tenantId)
    if (!allowed.includes("TRAINING")) {
      return NextResponse.json({ error: "Training & Course module is not enabled for this workspace", code: "MODULE_NOT_ENTITLED" }, { status: 403 })
    }

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
    const tenantId = tenant?.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })
    }

    if (tenant.role && !EDIT_ROLES.includes(tenant.role)) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions to manage registrations" }, { status: 403 })
    }

    const allowed = await modulesFor(tenantId)
    if (!allowed.includes("TRAINING")) {
      return NextResponse.json({ error: "Training & Course module is not enabled for this workspace", code: "MODULE_NOT_ENTITLED" }, { status: 403 })
    }

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
          const targetTenantId = updated.tenantId || tenantId || PLATFORM
          const course = await getCourseByIdOrSlug(targetTenantId, updated.courseId)
          if (course) {
            const { withTenant } = await import("@/lib/tenant")
            const { sendWhatsApp: notifyWhatsApp } = await import("@/lib/notifications")
            const companyName = course.trainerCompany || "Management Consultants"
            const trainerName = course.trainerName || "Lead Instructor"

            const confirmationMsg =
              `🧾 *OFFICIAL PAYMENT RECEIPT & ENROLMENT CONFIRMATION*\n` +
              `*${companyName}*\n\n` +
              `Dear *${updated.customerName}*,\n\n` +
              `Your payment has been successfully verified! Your seat registration is fully confirmed.\n\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `📋 *Registration Reference:* ${updated.registrationNumber}\n` +
              `🎓 *Course:* ${course.name}\n` +
              `👨‍💼 *Lead Trainer:* ${trainerName}\n` +
              `📅 *Dates:* ${course.startDate} to ${course.endDate}\n` +
              `⏱ *Timing:* ${course.startTime} - ${course.endTime}\n` +
              `📍 *Venue:* ${course.venueName}, ${course.address || "Training Center"}, ${course.city}\n` +
              `👥 *Confirmed Seats:* ${updated.numberOfSeats} Attendee(s)\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `💰 *Total Investment:* ${course.currency} ${updated.totalAmount}\n` +
              `💳 *Paid Balance:* ${course.currency} ${updated.totalAmount} (Verified)\n` +
              `⚖️ *Remaining Balance:* ${course.currency} 0.00 (Fully Paid)\n` +
              `━━━━━━━━━━━━━━━━━━━━\n\n` +
              `🎫 *Your Digital Check-In Pass:*\n` +
              `https://app.fizmoh.cloud/training/checkin?ref=${updated.registrationNumber}\n\n` +
              (course.mapUrl ? `📍 *Google Maps Venue Location:*\n${course.mapUrl}\n\n` : "") +
              `We look forward to hosting you at this executive masterclass!`

            await withTenant({ tenantId: targetTenantId, slug: "" }, async () => {
              await notifyWhatsApp({
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
                  mediaUrl: pdfUrl,
                  type: "document",
                  filename: `${companyName.replace(/[^a-zA-Z0-9_-]/g, "_")}-Receipt-${updated.registrationNumber}.pdf`,
                  caption: `Official Payment Receipt & Badge Check-in Pass — ${course.name}`,
                })
              } catch (pdfWaErr) {
                console.warn("[training] Optional PDF media attachment skipped:", pdfWaErr)
              }
            })
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
