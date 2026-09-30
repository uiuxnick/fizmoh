import { NextRequest, NextResponse } from "next/server"
import { getTenantCourses } from "@/lib/training-service"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await context.params
  const url = new URL(req.url)
  const slot = url.searchParams.get("slot") || url.searchParams.get("date") || ""
  const tenantId = url.searchParams.get("tenantId") || "cmujurq9w005ci36afzax588l"

  const courses = await getTenantCourses(tenantId).catch(() => [])
  const course = courses.find(
    c => c.id === courseId ||
         c.slug === courseId ||
         c.courseId === courseId ||
         c.name.toLowerCase().includes(courseId.toLowerCase())
  ) || courses[0]

  const courseTitle = course?.name || "AI Powered Executive Masterclass"
  const venue = course?.venueName ? `${course.venueName}, Ruwi, Muscat, Sultanate of Oman` : "Sheraton Oman Hotel, Ruwi, Muscat, Sultanate of Oman"
  const trainer = course?.trainerName || "Said bin Saif Al Harthi"

  // Compute UTC start & end timestamps (Muscat is GST, UTC+4: 08:30 GST = 04:30 UTC, 16:30 GST = 12:30 UTC)
  let dtStart = "20261013T043000Z"
  let dtEnd = "20261014T123000Z"
  const sLower = slot.toLowerCase()

  if (sLower.includes("dec 14") || sLower.includes("14–15 dec") || sLower.includes("14-15 dec")) {
    dtStart = "20261214T043000Z"
    dtEnd = "20261215T123000Z"
  } else if (sLower.includes("oct 26") || sLower.includes("26–27 oct") || sLower.includes("26-27 oct")) {
    dtStart = "20261026T043000Z"
    dtEnd = "20261027T123000Z"
  } else if (sLower.includes("dec 21") || sLower.includes("21–22 dec") || sLower.includes("21-22 dec")) {
    dtStart = "20261221T043000Z"
    dtEnd = "20261222T123000Z"
  } else if (sLower.includes("oct 19") || sLower.includes("19–20 oct") || sLower.includes("19-20 oct")) {
    dtStart = "20261019T043000Z"
    dtEnd = "20261020T123000Z"
  } else if (sLower.includes("nov 25") || sLower.includes("25–26 nov") || sLower.includes("25-26 nov")) {
    dtStart = "20261125T043000Z"
    dtEnd = "20261126T123000Z"
  } else if (sLower.includes("nov 9") || sLower.includes("9–10 nov") || sLower.includes("9-10 nov")) {
    dtStart = "20261109T043000Z"
    dtEnd = "20261110T123000Z"
  } else if (sLower.includes("nov 15") || sLower.includes("15–17 nov") || sLower.includes("15-17 nov")) {
    dtStart = "20261115T043000Z"
    dtEnd = "20261117T123000Z"
  } else if (sLower.includes("dec 1") || sLower.includes("1–3 dec") || sLower.includes("1-3 dec")) {
    dtStart = "20261201T043000Z"
    dtEnd = "20261203T123000Z"
  } else if (sLower.includes("nov 2") || sLower.includes("2–4 nov") || sLower.includes("2-4 nov")) {
    dtStart = "20261102T043000Z"
    dtEnd = "20261104T123000Z"
  }

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tanfidh Management Consultants//Executive Masterclasses//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:tanfidh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@tanfidh.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${courseTitle} — Tanfidh Executive Masterclass`,
    `DESCRIPTION:Executive Masterclass by Tanfidh Management Consultants.\\n\\nProgram: ${courseTitle}\\nLead Trainer: ${trainer} (+968 99 355 438\\, saidalharthy@tanfidh.com)\\nVenue: ${venue}\\nTiming: 08:30–16:30 GST daily (Registration opens 08:00)\\nInclusions: 5-Star Sheraton lunches\\, toolkits\\, and verified credentials.\\nDress Code: Business Formal / National Omani Dress (Dishdasha & Mussar).\\nComplimentary valet and covered parking available.`,
    `LOCATION:${venue}`,
    "ORGANIZER;CN=Tanfidh Management Consultants:mailto:saidalharthy@tanfidh.com",
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "BEGIN:VALARM",
    "TRIGGER:-PT24H",
    "ACTION:DISPLAY",
    `DESCRIPTION:Reminder: Tomorrow is the ${courseTitle} at ${venue}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="Tanfidh-${courseId}.ics"`,
      "Cache-Control": "public, max-age=3600",
    },
  })
}
