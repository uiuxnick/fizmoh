import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
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

function generateMeetCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz"
  const randStr = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  return `https://meet.google.com/${randStr(3)}-${randStr(4)}-${randStr(3)}`
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
  const googleMeetUrl = generateMeetCode()

  const lead = await raw.lead.create({
    data: {
      tenantId: null, // Platform-level lead
      status: "SCHEDULED",
      notes: `Google Meet Demo booked for ${demoDate} at ${demoTime} (${industry})`,
      answers: {
        name,
        email,
        phone,
        company,
        industry,
        demoDate,
        demoTime,
        notes,
        googleMeetUrl,
        source: "WEBSITE_DEMO",
        submittedAt: new Date().toISOString(),
      },
    },
  })

  return NextResponse.json({
    ok: true,
    message: "Google Meet Demo successfully scheduled!",
    leadId: lead.id,
    googleMeetUrl,
    demoDate,
    demoTime,
  })
})
