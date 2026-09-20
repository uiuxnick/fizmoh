import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { raw } from "@/lib/db"
import { checkSharedRateLimit, requestIp } from "@/lib/rate-limit"
import { SUPPORT_AI_ID } from "@/lib/platform-support"

export const dynamic = "force-dynamic"

const submitSchema = z.object({
  type: z.enum(["FEATURE_REQUEST", "BUG_REPORT", "GENERAL_FEEDBACK"]),
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(160, "Title cannot exceed 160 characters"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Please provide a valid email address"),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  category: z.string().trim().min(1, "Please select an area or category").max(100),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  description: z.string().trim().min(10, "Please provide more details (at least 10 characters)").max(8000),
  // Bug report fields
  stepsToReproduce: z.string().trim().max(4000).optional().or(z.literal("")),
  expectedBehavior: z.string().trim().max(4000).optional().or(z.literal("")),
  actualBehavior: z.string().trim().max(4000).optional().or(z.literal("")),
  pageUrl: z.string().trim().max(500).optional().or(z.literal("")),
  browserInfo: z.string().trim().max(500).optional().or(z.literal("")),
  // Feature request fields
  proposedSolution: z.string().trim().max(4000).optional().or(z.literal("")),
})

function generateReference(type: "FEATURE_REQUEST" | "BUG_REPORT" | "GENERAL_FEEDBACK"): string {
  const prefix = type === "FEATURE_REQUEST" ? "FR" : type === "BUG_REPORT" ? "BUG" : "FB"
  const timestampPart = Date.now().toString(36).toUpperCase().slice(-4)
  const randomPart = randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase()
  return `${prefix}-${timestampPart}-${randomPart}`
}

export async function POST(request: NextRequest) {
  try {
    const ip = requestIp(request.headers)
    const limit = await checkSharedRateLimit(`feedback-submit:${ip}`, 10, 60 * 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many submissions from this connection. Please wait before trying again." },
        { status: 429 }
      )
    }

    const payload = await request.json().catch(() => null)
    const parsed = submitSchema.safeParse(payload)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid submission data"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const data = parsed.data
    const reference = generateReference(data.type)
    const visitorId = `visitor:${data.email}`

    // Map priority
    const priorityMap: Record<string, string> = {
      CRITICAL: "URGENT",
      HIGH: "HIGH",
      MEDIUM: "MEDIUM",
      LOW: "LOW",
    }
    const priority = priorityMap[data.urgency] || "MEDIUM"

    // Construct subject with clear tag
    const typeLabel =
      data.type === "FEATURE_REQUEST"
        ? "[Feature Request]"
        : data.type === "BUG_REPORT"
        ? "[Bug Report]"
        : "[Feedback]"
    const subject = `${typeLabel} ${data.title}`

    // Construct rich markdown description
    const formattedSections: string[] = [
      `### Submitter Information`,
      `- **Name:** ${data.name}`,
      `- **Email:** [${data.email}](mailto:${data.email})`,
      data.phone ? `- **WhatsApp / Phone:** [${data.phone}](https://wa.me/${data.phone.replace(/[^0-9]/g, "")})` : `- **WhatsApp / Phone:** N/A`,
      `- **Submitted At:** ${new Date().toISOString()}`,
      ``,
      `### Classification`,
      `- **Type:** ${data.type.replace(/_/g, " ")}`,
      `- **Category / Module:** ${data.category}`,
      `- **Reported Urgency / Severity:** ${data.urgency}`,
      data.pageUrl ? `- **Page URL:** ${data.pageUrl}` : null,
      data.browserInfo ? `- **Environment / Browser:** ${data.browserInfo}` : null,
      ``,
      `### Overview & Description`,
      data.description,
    ].filter(Boolean) as string[]

    if (data.proposedSolution) {
      formattedSections.push(
        ``,
        `### Proposed Solution / Ideal Workflow`,
        data.proposedSolution
      )
    }

    if (data.stepsToReproduce) {
      formattedSections.push(
        ``,
        `### Steps to Reproduce`,
        data.stepsToReproduce
      )
    }

    if (data.expectedBehavior || data.actualBehavior) {
      formattedSections.push(
        ``,
        `### Expected vs Actual Behavior`,
        data.expectedBehavior ? `**Expected:**\n${data.expectedBehavior}` : "",
        data.actualBehavior ? `**Actual:**\n${data.actualBehavior}` : ""
      )
    }

    const fullBody = formattedSections.join("\n")

    // Create the ticket record in PostgreSQL
    const ticket = await raw.supportTicket.create({
      data: {
        tenantId: null,
        reference,
        subject,
        body: fullBody,
        priority,
        status: "OPEN",
        channel: data.type,
        createdById: visitorId,
        replies: {
          create: {
            staffId: SUPPORT_AI_ID,
            body:
              data.type === "FEATURE_REQUEST"
                ? `Thank you for your feature suggestion, ${data.name}! Our product engineering team has received your proposal (Ref: ${reference}) and will review it during our sprint roadmap reviews.`
                : data.type === "BUG_REPORT"
                ? `Thank you for reporting this issue, ${data.name}! Our technical team has received your bug report (Ref: ${reference}) and our developers are investigating it.`
                : `Thank you for your feedback, ${data.name}! Our platform team has received your ticket (Ref: ${reference}).`,
          },
        },
      },
    })

    return NextResponse.json({
      ok: true,
      reference: ticket.reference,
      type: data.type,
      message:
        data.type === "FEATURE_REQUEST"
          ? "Feature request submitted successfully! Your feedback directly shapes our product roadmap."
          : data.type === "BUG_REPORT"
          ? "Bug report submitted successfully! Our engineering team will investigate immediately."
          : "Feedback submitted successfully!",
    })
  } catch (error) {
    console.error("[feedback/submit] Error processing submission:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred while processing your request. Please try again or reach out on WhatsApp." },
      { status: 500 }
    )
  }
}
