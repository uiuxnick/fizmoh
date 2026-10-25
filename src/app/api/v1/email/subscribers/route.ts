import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireEmailMarketingAuth, maskEmail } from "@/lib/email-marketing/guard"

export async function GET(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.subscribers.read")
  if (response) return response

  const tenantId = auth!.tenant.tenantId
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const search = searchParams.get("search")
  const listId = searchParams.get("listId")
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100)
  const page = Math.max(Number(searchParams.get("page") || 1), 1)

  const where: any = { tenantId }
  if (status) where.status = status
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
    ]
  }
  if (listId) {
    where.listMemberships = { some: { listId } }
  }

  const [subscribers, total] = await Promise.all([
    db.emailSubscriber.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        tagAssignments: { include: { tag: true } },
        listMemberships: { include: { list: true } },
      },
    }),
    db.emailSubscriber.count({ where }),
  ])

  // Apply privacy email masking if user cannot read full unmasked email addresses
  const sanitized = subscribers.map((sub: any) => ({
    ...sub,
    email: auth!.canReadFullEmail ? sub.email : maskEmail(sub.email),
    tags: sub.tagAssignments.map((ta: any) => ta.tag),
    lists: sub.listMemberships.map((lm: any) => lm.list),
  }))

  return NextResponse.json({
    subscribers: sanitized,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
}

export async function POST(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.subscribers.create")
  if (response) return response

  const tenantId = auth!.tenant.tenantId
  const body = await request.json().catch(() => ({}))

  const { email, firstName, lastName, phone, country, language, listIds, tagIds, customFields } = body
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email address is required" }, { status: 400 })
  }

  const cleanEmail = email.trim().toLowerCase()

  // Check suppression
  const isSuppressed = await db.emailSuppression.findUnique({
    where: { tenantId_email: { tenantId, email: cleanEmail } },
  })

  const subscriber = await db.emailSubscriber.upsert({
    where: { tenantId_email: { tenantId, email: cleanEmail } },
    update: {
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      phone: phone || undefined,
      country: country || undefined,
      language: language || undefined,
      customFields: customFields || undefined,
      status: isSuppressed ? "SUPPRESSED" : "SUBSCRIBED",
    },
    create: {
      tenantId,
      email: cleanEmail,
      firstName: firstName || null,
      lastName: lastName || null,
      phone: phone || null,
      country: country || "OM",
      language: language || "en",
      customFields: customFields || null,
      status: isSuppressed ? "SUPPRESSED" : "SUBSCRIBED",
      source: "MANUAL",
      consentGiven: true,
      consentTimestamp: new Date(),
    },
  })

  // Add list memberships if provided
  if (Array.isArray(listIds) && listIds.length > 0) {
    for (const listId of listIds) {
      await db.emailListSubscriber.upsert({
        where: { tenantId_listId_subscriberId: { tenantId, listId, subscriberId: subscriber.id } },
        create: { tenantId, listId, subscriberId: subscriber.id },
        update: {},
      }).catch(() => {})
    }
  }

  // Add tags if provided
  if (Array.isArray(tagIds) && tagIds.length > 0) {
    for (const tagId of tagIds) {
      await db.emailSubscriberTag.upsert({
        where: { tenantId_tagId_subscriberId: { tenantId, tagId, subscriberId: subscriber.id } },
        create: { tenantId, tagId, subscriberId: subscriber.id },
        update: {},
      }).catch(() => {})
    }
  }

  return NextResponse.json({
    subscriber: {
      ...subscriber,
      email: auth!.canReadFullEmail ? subscriber.email : maskEmail(subscriber.email),
    },
  })
}
