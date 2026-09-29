import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { currentTenant, PLATFORM } from "@/lib/tenant"
import {
  getCourseByIdOrSlug,
  getTenantRegistrations,
  resolveTrainingVariables,
  interpolateTrainingText,
  type Course,
  type Registration,
} from "@/lib/training-service"
import { sendWhatsApp } from "@/lib/flow-delivery"

export const dynamic = "force-dynamic"

export type TrainingMessageType =
  | "CONFIRMATION"
  | "REMINDER_7D"
  | "REMINDER_1D"
  | "REMINDER_2H"
  | "CERTIFICATE"
  | "FEEDBACK"
  | "CUSTOM"

export const POST = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId || PLATFORM
  const body = await request.json()

  const {
    recipientPhone,
    courseId,
    registrationId,
    messageType = "CUSTOM",
    customBody,
  } = body as {
    recipientPhone: string
    courseId: string
    registrationId?: string
    messageType: TrainingMessageType
    customBody?: string
  }

  if (!recipientPhone) {
    return NextResponse.json({ error: "recipientPhone is required" }, { status: 400 })
  }
  if (!courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 })
  }

  const course = await getCourseByIdOrSlug(tenantId, courseId)
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 })
  }

  let registration: Registration | undefined
  if (registrationId) {
    const all = await getTenantRegistrations(tenantId)
    registration = all.find(r => r.id === registrationId || r.registrationNumber === registrationId)
  }

  const vars = resolveTrainingVariables(course, registration)
  let textToSend = ""

  switch (messageType) {
    case "CONFIRMATION":
      textToSend =
        `✅ *Registration Confirmed — {{course_name}}*\n\n` +
        `Hello *{{customer_name}}*,\n\n` +
        `Your seat(s) for *{{course_name}}* are officially confirmed.\n\n` +
        `• *Registration ID:* {{registration_id}}\n` +
        `• *Participants:* {{number_of_seats}} ({{paid_seats}} Paid + {{free_seats}} Free)\n` +
        `• *Dates:* {{course_date}}\n` +
        `• *Time:* {{course_time}}\n` +
        `• *Venue:* {{course_location}}\n` +
        `• *Map Location:* {{course_map_url}}\n\n` +
        `We look forward to welcoming you!`
      break

    case "REMINDER_7D":
      textToSend =
        `📅 *Upcoming Training Reminder (7 Days to go)*\n\n` +
        `Hello *{{customer_name}}*,\n\n` +
        `Just a reminder that your training program:\n*{{course_name}}*\nwill commence in 7 days.\n\n` +
        `• *Dates:* {{course_date}}\n` +
        `• *Time:* {{course_time}}\n` +
        `• *Venue:* {{course_location}}\n\n` +
        `Please ensure you and your registered attendees have laptops ready for the workshop.`
      break

    case "REMINDER_1D":
      textToSend =
        `🚀 *Your Training Starts Tomorrow!*\n\n` +
        `Hello *{{customer_name}}*,\n\n` +
        `We are excited to welcome you tomorrow for:\n*{{course_name}}*\n\n` +
        `• *Time:* {{course_time}}\n` +
        `• *Venue:* {{course_location}}\n` +
        `• *Map:* {{course_map_url}}\n\n` +
        `Registration desk & morning welcome coffee opens 30 minutes prior to session start.`
      break

    case "REMINDER_2H":
      textToSend =
        `⏰ *Training Starts in 2 Hours!*\n\n` +
        `Hello *{{customer_name}}*,\n\n` +
        `Your session for *{{course_name}}* will begin shortly at *{{course_location}}*.\n\n` +
        `Show your Registration ID *{{registration_id}}* at reception for your attendee badge and course materials.`
      break

    case "CERTIFICATE":
      textToSend =
        `🎓 *Your Certificate is Ready!*\n\n` +
        `Hello *{{customer_name}}*,\n\n` +
        `Congratulations on successfully completing *{{course_name}}*.\n\n` +
        `You can access and verify your official digital certificate here:\n` +
        `{{certificate_url}}\n\n` +
        `Thank you for participating with us!`
      break

    case "FEEDBACK":
      textToSend =
        `⭐ *Your Feedback Matters — {{course_name}}*\n\n` +
        `Hello *{{customer_name}}*,\n\n` +
        `Thank you for attending *{{course_name}}* with Trainer *{{trainer_name}}*.\n\n` +
        `We'd love to know your thoughts. Please take 60 seconds to share your review:\n` +
        `https://app.fizmoh.cloud/training/{{course_id}}/feedback?reg={{registration_id}}\n\n` +
        `Your rating helps us continually elevate our executive learning experience.`
      break

    case "CUSTOM":
    default:
      textToSend = customBody || `Hello {{customer_name}}, update regarding {{course_name}}.`
      break
  }

  const finalMessage = interpolateTrainingText(textToSend, vars)
  const cleanPhone = recipientPhone.replace(/[^0-9+]/g, "")

  const result = await sendWhatsApp({
    to: cleanPhone,
    body: finalMessage,
    allowOutsideSession: true,
  })

  return NextResponse.json({
    success: !!result?.success,
    error: result?.error,
    messageSent: finalMessage,
    recipient: cleanPhone,
  })
})
