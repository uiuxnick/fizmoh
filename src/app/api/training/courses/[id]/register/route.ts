import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { currentTenant, PLATFORM } from "@/lib/tenant"
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

    try {
      const { registration, course: updatedCourse } = await createCourseRegistration(tenantId, {
        ...body,
        courseId: course.id,
      })

      // Send automated WhatsApp confirmation / payment notice if configured
      let whatsappSent = false
      if (course.autoConfirmation && body.customerPhone) {
        try {
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
          const waResult = await sendWhatsApp({
            to: cleanPhone,
            body: msgBody,
            allowOutsideSession: true,
          })
          whatsappSent = !!waResult?.success
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
