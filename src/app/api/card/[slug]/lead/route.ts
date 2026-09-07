import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { publicLeadSchema } from "@/lib/digital-vcard/validation"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 })
  }

  const card = await (db as any).businessVCard.findFirst({
    where: {
      slug: slug.toLowerCase(),
      status: "PUBLISHED",
    },
    select: { id: true, tenantId: true, title: true },
  })

  if (!card) {
    return NextResponse.json({ error: "Card not found or inactive" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parseResult = publicLeadSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Please provide valid contact details", details: parseResult.error.flatten() },
      { status: 422 },
    )
  }

  const { name, phone, email, message, serviceInterested } = parseResult.data
  const cleanPhone = phone.replace(/[^0-9+]/g, "").trim()

  // 1. Create the BusinessVCardLead record
  const lead = await (db as any).businessVCardLead.create({
    data: {
      tenantId: card.tenantId,
      cardId: card.id,
      name,
      phone: cleanPhone,
      email: email || null,
      message: message || null,
      serviceInterested: serviceInterested || null,
      status: "NEW",
    },
  })

  // 2. CRM Auto-Sync: find or upsert Customer in Fizmoh CRM
  try {
    let customer = await db.customer.findFirst({
      where: {
        tenantId: card.tenantId,
        phone: cleanPhone,
      },
    })

    if (!customer) {
      customer = await db.customer.create({
        data: {
          tenantId: card.tenantId,
          name,
          phone: cleanPhone,
          email: email || null,
          whatsappOptIn: true,
          optInSource: "VCARD_ENQUIRY",
          optInAt: new Date(),
          tags: ["vcard-lead"],
          stage: "NEW",
          notes: `Enquiry from Digital Card (${card.title})${serviceInterested ? ` regarding ${serviceInterested}` : ""}: ${message || "No initial message"}`,
        },
      })
    } else {
      // Existing customer: append tag if needed
      const currentTags = Array.isArray(customer.tags) ? (customer.tags as string[]) : []
      if (!currentTags.includes("vcard-lead")) {
        await db.customer.update({
          where: { id: customer.id },
          data: {
            tags: [...currentTags, "vcard-lead"],
          },
        })
      }
    }

    if (customer?.id) {
      await (db as any).businessVCardLead.update({
        where: { id: lead.id },
        data: { customerId: customer.id },
      })
    }
  } catch (crmErr) {
    console.error("[vCard Lead] CRM sync non-fatal error:", crmErr)
  }

  // 3. Track LEAD_SUBMIT analytics event
  ;(db as any).businessVCardAnalyticsEvent.create({
    data: {
      tenantId: card.tenantId,
      cardId: card.id,
      eventType: "LEAD_SUBMIT",
      platform: "card_form",
    },
  }).catch(() => {})

  return NextResponse.json({
    success: true,
    message: "Thank you! Your enquiry has been sent successfully. We will get in touch shortly.",
  })
}
