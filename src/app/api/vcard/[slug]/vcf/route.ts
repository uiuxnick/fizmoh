import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { generateVcfString, type VCardContactInput } from "@/lib/digital-vcard/vcf"
import { verifySession, STAFF_COOKIE } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 })
  }

  // Check if requesting user is authenticated staff to permit previewing DRAFT cards
  let isStaff = false
  try {
    const cookieStore = await cookies()
    const staffToken = cookieStore.get(STAFF_COOKIE)?.value
    if (staffToken) {
      const payload = await verifySession(staffToken)
      if (payload && payload.kind === "staff") {
        isStaff = true
      }
    }
  } catch {}

  // Public cards must be PUBLISHED unless accessed by authenticated staff
  const card = await (db as any).businessVCard.findFirst({
    where: {
      slug: slug.toLowerCase(),
      ...(isStaff ? {} : { status: "PUBLISHED" }),
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

  const fallbackOrg = card.companyName || card.legalName || card.title || "Business"
  const fallbackName = card.contactName || card.title || card.companyName || "Contact"

  const contactInput: VCardContactInput = {
    fullName: fallbackName,
    organization: fallbackOrg,
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

  const rawFileName = card.contactName || card.title || card.companyName || "contact"
  const safeAsciiName = rawFileName
    .replace(/[^a-zA-Z0-9_\-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 40) || "contact"
  const encodedUtf8Name = encodeURIComponent(`${rawFileName}.vcf`)

  return new Response(vcf, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeAsciiName}.vcf"; filename*=UTF-8''${encodedUtf8Name}`,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    },
  })
}
