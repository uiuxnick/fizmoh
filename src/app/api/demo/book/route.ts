import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { createDemoMeeting } from "@/lib/google-calendar"
import { z } from "zod"

const demoSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  email: z.string().trim().email("Valid email required").max(200),
  phone: z.string().trim().min(6, "Phone/WhatsApp is required").max(30),
  company: z.string().trim().min(1, "Company name is required").max(100),
  industry: z.string().trim().max(100).optional().default("General"),
  demoDate: z.string().trim().min(4, "Demo date is required"),
  demoTime: z.string().trim().min(2, "Demo time is required"),
  notes: z.string().trim().max(1000).optional().default(""),
})

function parseTimePart(timeStr: string): { hours: number; minutes: number } {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (!match) return { hours: 10, minutes: 0 }
  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const meridiem = (match[3] || "").toUpperCase()
  if (meridiem === "PM" && hours < 12) hours += 12
  if (meridiem === "AM" && hours === 12) hours = 0
  return { hours, minutes }
}

/**
 * Parses date string (YYYY-MM-DD) and time slot (e.g. "10:00 AM - 10:30 AM")
 * in Oman time (UTC+4) and returns UTC Date objects.
 */
function parseDemoInterval(dateStr: string, timeSlotStr: string): { startUtc: Date; endUtc: Date } {
  const [year, month, day] = dateStr.split("-").map(n => parseInt(n, 10))
  const parts = timeSlotStr.split("-")
  const startPart = parseTimePart(parts[0] || "10:00 AM")
  const endPart = parts[1] ? parseTimePart(parts[1]) : { hours: startPart.hours, minutes: startPart.minutes + 30 }

  // Oman is UTC+4, so UTC hour = local hour - 4
  const startUtc = new Date(Date.UTC(year || 2026, (month || 1) - 1, day || 1, startPart.hours - 4, startPart.minutes, 0))
  let endUtc = new Date(Date.UTC(year || 2026, (month || 1) - 1, day || 1, endPart.hours - 4, endPart.minutes, 0))
  if (endUtc.getTime() <= startUtc.getTime()) {
    endUtc = new Date(startUtc.getTime() + 30 * 60_000)
  }
  return { startUtc, endUtc }
}

function formatGCalDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

export const POST = withErrors(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}))
  const parsed = demoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid demo booking details" },
      { status: 400 },
    )
  }

  const { name, email, phone, company, industry, demoDate, demoTime, notes } = parsed.data

  const { startUtc, endUtc } = parseDemoInterval(demoDate, demoTime)
  const reference = `DEMO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

  // Call Google Calendar API to create an event with real Google Meet link and invite the attendee
  const meeting = await createDemoMeeting({
    reference,
    name,
    email,
    phone,
    company,
    industry,
    notes,
    start: startUtc,
    end: endUtc,
  }).catch((err): { ok: boolean; meetLink?: string; calendarEventId?: string; error?: string } => {
    console.error("Failed to create Google Calendar meeting:", err)
    return { ok: false, error: String(err) }
  })

  // Real Google Meet URL or standing room fallback
  const googleMeetUrl = meeting.meetLink || "https://meet.google.com/fiz-demo-call"

  // Google Calendar direct add URL
  const gCalTitle = `Fizmoh WhatsApp Demo — ${company}`
  const gCalDetails = `Google Meet Call: ${googleMeetUrl}\n\n1-on-1 WhatsApp Business Platform & Cloud API Demo for ${company}.\n\nLead Contact:\n- Name: ${name}\n- WhatsApp/Phone: ${phone}\n- Industry: ${industry}\n- Reference: ${reference}\n${notes ? `- Notes: ${notes}\n` : ""}`
  const addToCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(gCalTitle)}&dates=${formatGCalDate(startUtc)}/${formatGCalDate(endUtc)}&details=${encodeURIComponent(gCalDetails)}&location=${encodeURIComponent(googleMeetUrl)}`

  // Store in Appointment table
  const appointment = await raw.appointment.create({
    data: {
      reference,
      tenantId: null, // Platform level demo appointment
      name,
      email,
      phone,
      service: "Fizmoh WhatsApp Platform Demo (1-on-1)",
      companyName: company,
      notes: notes ? `${notes} (Industry: ${industry})` : `Industry: ${industry}`,
      scheduledAt: startUtc,
      durationMins: Math.round((endUtc.getTime() - startUtc.getTime()) / 60000) || 30,
      status: "SCHEDULED",
      meetLink: googleMeetUrl,
      calendarEventId: meeting.calendarEventId || null,
      source: "WEB",
    },
  })

  // Store in Lead table
  const lead = await raw.lead.create({
    data: {
      tenantId: null,
      status: "SCHEDULED",
      notes: `Google Meet Demo booked for ${demoDate} at ${demoTime} (${industry}). Ref: ${reference}`,
      answers: {
        reference,
        appointmentId: appointment.id,
        name,
        email,
        phone,
        company,
        industry,
        demoDate,
        demoTime,
        notes,
        googleMeetUrl,
        calendarEventId: meeting.calendarEventId || null,
        source: "WEBSITE_DEMO",
        submittedAt: new Date().toISOString(),
      },
    },
  })

  // Link lead to appointment
  await raw.appointment.update({
    where: { id: appointment.id },
    data: { leadId: lead.id },
  }).catch(() => null)

  return NextResponse.json({
    ok: true,
    message: "Google Meet Demo successfully scheduled!",
    reference,
    leadId: lead.id,
    appointmentId: appointment.id,
    googleMeetUrl,
    demoDate,
    demoTime,
    calendarEventId: meeting.calendarEventId || null,
    addToCalendarUrl,
  })
})
