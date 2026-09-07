import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { z } from "zod"

const contactSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  email: z.string().trim().email("Valid email required").max(200),
  phone: z.string().trim().min(6, "Phone number is required").max(30),
  company: z.string().trim().max(100).optional().default(""),
  inquiryType: z.string().trim().max(100).optional().default("General Inquiry"),
  message: z.string().trim().min(5, "Message must be at least 5 characters").max(2000),
})

export const POST = withErrors(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}))
  const parsed = contactSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid contact form submission" },
      { status: 400 },
    )
  }

  const { name, email, phone, company, inquiryType, message } = parsed.data

  const lead = await raw.lead.create({
    data: {
      tenantId: null, // Platform-level lead
      status: "NEW",
      notes: `Inquiry: ${inquiryType}`,
      answers: {
        name,
        email,
        phone,
        company,
        inquiryType,
        message,
        source: "CONTACT_FORM",
        submittedAt: new Date().toISOString(),
      },
    },
  })

  return NextResponse.json({
    ok: true,
    message: "Thank you for reaching out. Our team will contact you shortly.",
    leadId: lead.id,
  })
})
