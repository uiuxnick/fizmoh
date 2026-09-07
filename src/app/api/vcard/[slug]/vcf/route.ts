import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateVcfString, type VCardContactInput } from "@/lib/digital-vcard/vcf"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 })
  }

  // Public cards must be PUBLISHED
  const card = await (db as any).businessVCard.findFirst({
    where: {
      slug: slug.toLowerCase(),
      status: "PUBLISHED",
    },
  })

  if (!card) {
    return NextResponse.json({ error: "Business card not found or is currently unpublished." }, { status: 404 })
  }

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "app.fizmoh.cloud"
  const protocol = request.headers.get("x-forwarded-proto") || "https"
  const cardUrl = `${protocol}://${host}/card/${card.slug}`

  const addressParts = [card.building, card.street, card.area].filter(Boolean).join(", ")
  const streetAddress = addressParts || card.addressLine1 || undefined

  const contactInput: VCardContactInput = {
    fullName: card.contactName || card.title,
    organization: card.legalName || card.title,
    title: card.contactTitle || undefined,
    department: card.contactDept || undefined,
    mobile: card.showPhone ? card.mobileNumber : undefined,
    whatsapp: card.showWhatsapp ? card.whatsappNumber : undefined,
    landline: card.showPhone ? card.landlineNumber : undefined,
    email: card.showEmail ? card.email : undefined,
    altEmail: card.showEmail ? card.altEmail : undefined,
    website: card.websiteUrl || undefined,
    cardUrl,
    streetAddress: card.showAddress ? streetAddress : undefined,
    city: card.showAddress ? card.city || undefined : undefined,
    state: card.showAddress ? card.state || undefined : undefined,
    postalCode: card.showAddress ? card.postalCode || undefined : undefined,
    country: card.showAddress ? card.country || undefined : undefined,
    note: card.bio || card.subtitle || undefined,
    latitude: card.latitude || undefined,
    longitude: card.longitude || undefined,
  }

  const vcf = generateVcfString(contactInput)

  // Asynchronously record contact save event
  const userAgent = request.headers.get("user-agent") || ""
  const isMobile = /mobile|iphone|ipod|android/i.test(userAgent)
  const isTablet = /ipad|tablet/i.test(userAgent)
  const deviceType = isMobile ? "mobile" : isTablet ? "tablet" : "desktop"

  ;(db as any).businessVCardAnalyticsEvent.create({
    data: {
      tenantId: card.tenantId,
      cardId: card.id,
      eventType: "SAVE_CONTACT",
      deviceType,
      browser: userAgent.slice(0, 100),
    },
  }).catch(() => {})

  const safeFileName = (card.contactName || card.title || "contact")
    .replace(/[^a-zA-Z0-9_\-]/g, "_")
    .slice(0, 40)

  return new Response(vcf, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeFileName}.vcf"`,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    },
  })
}
