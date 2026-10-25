import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireEmailMarketingAuth } from "@/lib/email-marketing/guard"

export async function POST(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.subscribers.create")
  if (response) return response

  const tenantId = auth!.tenant.tenantId
  const body = await request.json().catch(() => ({}))
  const { subscribers = [], listIds = [], tagIds = [] } = body

  if (!Array.isArray(subscribers) || subscribers.length === 0) {
    return NextResponse.json({ error: "No subscribers provided in import batch" }, { status: 400 })
  }

  let imported = 0
  let skipped = 0

  for (const item of subscribers) {
    const rawEmail = typeof item === "string" ? item : item.email
    if (!rawEmail || !rawEmail.includes("@")) {
      skipped++
      continue
    }

    const email = rawEmail.trim().toLowerCase()
    const firstName = typeof item === "object" ? item.firstName || null : null
    const lastName = typeof item === "object" ? item.lastName || null : null
    const phone = typeof item === "object" ? item.phone || null : null
    const country = typeof item === "object" ? item.country || "OM" : "OM"

    // Check suppression
    const isSuppressed = await db.emailSuppression.findUnique({
      where: { tenantId_email: { tenantId, email } },
    })

    const sub = await db.emailSubscriber.upsert({
      where: { tenantId_email: { tenantId, email } },
      update: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined,
        country: country || undefined,
      },
      create: {
        tenantId,
        email,
        firstName,
        lastName,
        phone,
        country,
        status: isSuppressed ? "SUPPRESSED" : "SUBSCRIBED",
        source: "CSV_IMPORT",
        consentGiven: true,
        consentTimestamp: new Date(),
      },
    })

    // Attach lists
    for (const lid of listIds) {
      await db.emailListSubscriber.upsert({
        where: { tenantId_listId_subscriberId: { tenantId, listId: lid, subscriberId: sub.id } },
        create: { tenantId, listId: lid, subscriberId: sub.id },
        update: {},
      }).catch(() => {})
    }

    // Attach tags
    for (const tid of tagIds) {
      await db.emailSubscriberTag.upsert({
        where: { tenantId_tagId_subscriberId: { tenantId, tagId: tid, subscriberId: sub.id } },
        create: { tenantId, tagId: tid, subscriberId: sub.id },
        update: {},
      }).catch(() => {})
    }

    imported++
  }

  return NextResponse.json({
    success: true,
    imported,
    skipped,
    total: subscribers.length,
  })
}
