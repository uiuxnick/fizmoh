import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { currentTenant, PLATFORM } from "@/lib/tenant"
import { modulesFor } from "@/lib/entitlements"
import {
  createCourseRegistration,
  getCourseByIdOrSlug,
  resolveTrainingVariables,
  interpolateTrainingText,
  type RegisterCourseInput,
} from "@/lib/training-service"
import { sendWhatsApp } from "@/lib/flow-delivery"

export const dynamic = "force-dynamic"

export const POST = withErrors(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const tenant = currentTenant()
    const tenantId = tenant?.tenantId || request.nextUrl.searchParams.get("tenantId") || PLATFORM

    const body = (await request.json()) as RegisterCourseInput

    if (!body.customerName || !body.customerName.trim()) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 })
    }
    if (!body.customerPhone || !body.customerPhone.trim()) {
      return NextResponse.json({ error: "Phone / WhatsApp number is required" }, { status: 400 })
    }
    if (!body.customerEmail || !body.customerEmail.trim()) {
      return NextResponse.json({ error: "Email address is required" }, { status: 400 })
    }

    // Lookup course
    const course = await getCourseByIdOrSlug(tenantId, id)
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    const targetTenantId = course.tenantId || tenantId
    const allowed = await modulesFor(targetTenantId)
    if (!allowed.includes("TRAINING")) {
      return NextResponse.json({ error: "Training & Course module is not enabled for this workspace", code: "MODULE_NOT_ENTITLED" }, { status: 403 })
    }

    try {
      const { registration, course: updatedCourse } = await createCourseRegistration(tenantId, {
        ...body,
        courseId: course.id,
      })

      // Send automated WhatsApp confirmation / payment notice if configured
      let whatsappSent = false
      if (course.autoConfirmation && body.customerPhone) {
        try {
          const targetTenantId = course.tenantId || tenantId || PLATFORM
          const { withTenant } = await import("@/lib/tenant")
          const { sendWhatsApp: notifyWhatsApp } = await import("@/lib/notifications")
          const { db } = await import("@/lib/db")

          await withTenant({ tenantId: targetTenantId, slug: "" }, async () => {
            const vars = resolveTrainingVariables(course, registration)
            const msgBody =
              `🎉 *Registration Received — ${course.name}*\n\n` +
              `Hello *${registration.customerName}*,\n\n` +
              `We have successfully registered your booking:\n` +
              `• *Registration ID:* ${registration.registrationNumber}\n` +
              `• *Total Participants:* ${registration.numberOfSeats} (${registration.paidSeats} Paid + ${registration.freeSeats} FREE)\n` +
              `• *Dates:* ${course.startDate} to ${course.endDate}\n` +
              `• *Location:* ${course.venueName}, ${course.city}\n` +
              `• *Amount:* ${course.currency} ${registration.totalAmount.toFixed(2)}\n\n` +
              `💳 To complete your payment and secure your badges, tap below:\n` +
              `https://app.fizmoh.cloud/training/${course.slug}?reg=${registration.id}\n\n` +
              `Thank you for choosing ${course.trainerCompany || "us"}!`

            const cleanPhone = body.customerPhone.replace(/[^0-9+]/g, "")

            // Look for approved template that can be used if outside 24h session
            const approvedTemplate = await db.template.findFirst({
              where: {
                tenantId: targetTenantId,
                status: "APPROVED",
                name: { in: ["admin_booking_notification", "tanfidh_course_promo", "strategypronew"] }
              }
            })

            const waResult = await notifyWhatsApp({
              to: cleanPhone,
              body: msgBody,
              templateName: approvedTemplate?.name,
              templateVariables: approvedTemplate ? [registration.customerName, course.name, registration.registrationNumber] : undefined,
              allowOutsideSession: true,
            })
            whatsappSent = !!waResult?.success
          })
        } catch (waErr) {
          console.warn("[training] Failed to send automated WhatsApp registration message:", waErr)
        }
      }

      return NextResponse.json({
        success: true,
        registration,
        course: updatedCourse,
        whatsappSent,
        message: "Registration created successfully",
      })
    } catch (err: any) {
      return NextResponse.json(
        { error: err.message || "Failed to process course registration" },
        { status: 400 },
      )
    }
  },
)
