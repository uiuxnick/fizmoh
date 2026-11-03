import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { publicLeadSchema } from "@/lib/digital-vcard/validation"
import { verifySession, STAFF_COOKIE } from "@/lib/auth"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 })
  }

  // Permit authenticated staff to test lead submissions even in draft mode
  let isStaff = false
  try {
    const cookieStore = await cookies()
    const staffToken = cookieStore.get(STAFF_COOKIE)?.value
    if (staffToken) {
      const payload = await verifySession(staffToken)
      if (payload && payload.kind === "staff") isStaff = true
    }
  } catch {}

  const card = await (db as any).businessVCard.findFirst({
    where: {
      slug: slug.toLowerCase(),
      ...(isStaff ? {} : { status: "PUBLISHED" }),
    },
    select: { id: true, tenantId: true, title: true, companyName: true },
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
  let crmCustomer: any = null
  const cardDisplayName = card.title || card.companyName || "Digital Business Card"
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
          notes: `Enquiry from Digital Card (${cardDisplayName})${serviceInterested ? ` regarding ${serviceInterested}` : ""}: ${message || "No initial message"}`,
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

    crmCustomer = customer

    if (customer?.id) {
      await (db as any).businessVCardLead.update({
        where: { id: lead.id },
        data: { customerId: customer.id },
      })
    }
  } catch (crmErr) {
    console.error("[vCard Lead] CRM sync non-fatal error:", crmErr)
  }

  // 3. Instantly notify staff via in-app notification & SSE realtime bus
  try {
    const { notifyStaff } = await import("@/lib/realtime")
    await notifyStaff({
      tenantId: card.tenantId,
      type: "lead",
      title: `📇 New Digital Card Enquiry`,
      message: `${name} (${cleanPhone}) sent an enquiry via "${cardDisplayName}"${serviceInterested ? ` for ${serviceInterested}` : ""}.`,
      data: {
        link: "/digital-vcard",
        leadId: lead.id,
        customerId: crmCustomer?.id,
        phone: cleanPhone,
        name,
        serviceInterested: serviceInterested || undefined,
      },
    })
  } catch (notifErr) {
    console.error("[vCard Lead] Staff notification non-fatal error:", notifErr)
  }

  // 4. Trigger Drip Sequence automated nurturing for "vcard-lead" if configured
  if (crmCustomer?.id) {
    try {
      const { handleSequenceTriggerEvent } = await import("@/lib/sequences")
      handleSequenceTriggerEvent({
        tenantId: card.tenantId,
        customerId: crmCustomer.id,
        trigger: "TAG_ADDED",
        tag: "vcard-lead",
      }).catch((seqErr: unknown) => console.error("[vCard Lead] Sequence trigger background error:", seqErr))
    } catch (seqImportErr) {
      console.error("[vCard Lead] Sequence engine load error:", seqImportErr)
    }
  }

  // 5. Track LEAD_SUBMIT analytics event
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
