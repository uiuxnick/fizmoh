import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"

/**
 * Canned Responses API
 * Per BRD §6.5.5: "Canned responses / quick replies: Predefined answers for FAQs to speed up agent response time"
 */
export const GET = withErrors(async () => {
  let responses = await db.cannedResponse.findMany({ where: { isActive: true }, orderBy: { category: "asc" } })
  if (responses.length === 0) {
    /*
     * Seeded for a workspace that has none yet, and sent verbatim by staff to
     * customers — so they must not name another workspace or link to its
     * shop. The greeting stays business-neutral and the link is built from
     * this workspace's own address; staff edit them from there.
     */
    const { publicBaseUrl } = await import("@/lib/app-config")
    const { currentTenant } = await import("@/lib/tenant-context")
    const slug = currentTenant()?.slug
    const shopUrl = `${(await publicBaseUrl()).replace(/\/$/, "")}${slug ? `/shop/${slug}` : ""}`

    const defaults = [
      { title: "Greeting & Welcome", content: "Hello! Thanks for getting in touch. How may I assist you today? 😊", category: "GENERAL" },
      { title: "Operating Hours", content: "Our office is open Sunday to Thursday from 8:00 AM to 6:00 PM (GST). 🕒", category: "INFO" },
      { title: "Tour Booking Link", content: `You can view all our packages and availability online here: ${shopUrl} 🌴`, category: "BOOKING" },
      { title: "Payment Details", content: "We accept Credit/Debit Cards, Apple Pay, and Bank Transfers. Let us know if you need our bank account details! 💳", category: "PAYMENT" },
      { title: "Thank You & Closing", content: "Thank you for reaching out! Please let us know if you have any other questions. Have a wonderful day! 🙏", category: "GENERAL" },
    ]
    await db.cannedResponse.createMany({ data: defaults }).catch(() => null)
    responses = await db.cannedResponse.findMany({ where: { isActive: true }, orderBy: { category: "asc" } })
  }
  return NextResponse.json({ responses })
})

export const POST = withErrors(async (request: NextRequest) => {
  const body = await request.json()
  const response = await db.cannedResponse.create({
    data: { title: body.title, content: body.content, category: body.category, shortcut: body.shortcut, lang: body.lang || "en" },
  })
  return NextResponse.json({ response }, { status: 201 })
})
