import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/chat-api/legacy-guard"
import { currentTenant } from "@/lib/tenant"
import { sendContactMessage, sendDigitalCardMessage } from "@/lib/whatsapp"
import { publish } from "@/lib/realtime"

export const POST = withErrors(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const tenant = currentTenant()
  const params = await context?.params
  const conversationId = params?.id

  if (!conversationId) {
    return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 })
  }

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { customer: true },
  })

  if (!conversation || !conversation.customer?.phone) {
    return NextResponse.json({ error: "Active conversation or customer phone not found" }, { status: 404 })
  }

  const card = await (db as any).businessVCard.findFirst({
    where: {
      tenantId: tenant?.tenantId || conversation.tenantId,
      status: { in: ["PUBLISHED", "DRAFT"] },
    },
  })

  if (!card) {
    return NextResponse.json({ error: "No Digital Business Card found for this workspace. Please set up your card first." }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const format = body.format || "card" // "card" | "native_contact" | "both"

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "app.fizmoh.cloud"
  const protocol = request.headers.get("x-forwarded-proto") || "https"
  const cardUrl = `${protocol}://${host}/card/${card.slug}`
  const targetPhone = conversation.customer.phone

  let textResult: any = null
  let contactResult: any = null

  const cardDisplayName = card.contactName || card.title || card.companyName || "Our Business"
  const businessName = card.title || card.companyName || "Our Business"
  const companyOrg = card.legalName || card.companyName || card.title || "Our Business"

  if (format === "card" || format === "both") {
    textResult = await sendDigitalCardMessage({
      to: targetPhone,
      businessName,
      cardUrl,
      tagline: card.subtitle || undefined,
      contactPhone: card.mobileNumber || undefined,
    })
  }

  if (format === "native_contact" || format === "both") {
    contactResult = await sendContactMessage({
      to: targetPhone,
      contact: {
        name: {
          formatted_name: cardDisplayName,
          first_name: cardDisplayName.split(" ")[0],
          last_name: cardDisplayName.includes(" ") ? cardDisplayName.split(" ").slice(1).join(" ") : undefined,
        },
        org: {
          company: companyOrg,
          title: card.contactTitle || undefined,
          department: card.contactDept || undefined,
        },
        phones: [
          ...(card.mobileNumber ? [{ phone: card.mobileNumber, type: "CELL" }] : []),
          ...(card.whatsappNumber && card.whatsappNumber !== card.mobileNumber ? [{ phone: card.whatsappNumber, type: "WORK" }] : []),
        ],
        emails: card.email ? [{ email: card.email, type: "WORK" }] : [],
        urls: [
          { url: cardUrl, type: "WORK" },
          ...(card.websiteUrl ? [{ url: card.websiteUrl, type: "OTHER" }] : []),
        ],
        addresses: card.city || card.addressLine1 ? [
          {
            street: card.addressLine1 || undefined,
            city: card.city || undefined,
            state: card.state || undefined,
            zip: card.postalCode || undefined,
            country: card.country || "Oman",
            type: "WORK",
          },
        ] : [],
      },
    })
  }

  // Create record in thread
  const summaryContent = `📇 Sent Digital Business Card: ${businessName} (${cardUrl})`
  const msg = await db.message.create({
    data: {
      conversationId: conversation.id,
      customerId: conversation.customerId,
      direction: "OUTBOUND",
      type: "TEXT",
      content: summaryContent,
      status: "SENT",
    },
  })

  publish({
    type: "message",
    conversationId: conversation.id,
    direction: "OUTBOUND",
    preview: summaryContent,
  })

  return NextResponse.json({
    success: true,
    message: "Digital Business Card sent successfully",
    dbMessageId: msg.id,
    textResult,
    contactResult,
  })
})
