import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { publicEventSchema } from "@/lib/digital-vcard/validation"
import crypto from "crypto"

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
    select: { id: true, tenantId: true },
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

  const parseResult = publicEventSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid event data", details: parseResult.error.flatten() }, { status: 422 })
  }

  const eventData = parseResult.data

  // Anonymized session hash using IP + userAgent salt
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1"
  const userAgent = request.headers.get("user-agent") || ""
  const sessionHash = crypto.createHash("sha256").update(`${ip}:${userAgent}:${new Date().toDateString()}`).digest("hex").slice(0, 16)

  const isMobile = /mobile|iphone|ipod|android/i.test(userAgent)
  const isTablet = /ipad|tablet/i.test(userAgent)
  const deviceType = eventData.deviceType || (isMobile ? "mobile" : isTablet ? "tablet" : "desktop")

  await (db as any).businessVCardAnalyticsEvent.create({
    data: {
      tenantId: card.tenantId,
      cardId: card.id,
      eventType: eventData.eventType,
      itemId: eventData.itemId || null,
      platform: eventData.platform || null,
      referrer: (eventData.referrer || request.headers.get("referer") || "").slice(0, 250),
      sessionHash,
      deviceType,
      browser: eventData.browser || userAgent.slice(0, 100),
      os: eventData.os || null,
    },
  })

  return NextResponse.json({ success: true })
}
