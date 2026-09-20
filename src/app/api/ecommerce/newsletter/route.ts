import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { db } from "@/lib/db"
import { resolveEcommerceAuth } from "@/lib/ecommerce-auth"
import { sendEcommerceNotification } from "@/lib/ecommerce-templates"

export const POST = withErrors(async (request: NextRequest) => {
  const auth = await resolveEcommerceAuth(request)
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing API key / credentials" },
      { status: 401 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const {
    phone,
    email,
    name = "Subscriber",
    source = "CHECKOUT_OPTIN",
    tags = ["newsletter_subscriber"],
    sendWelcome = true,
    couponCode = "WELCOME10",
    storeId = auth.storeId,
  } = body

  if (!phone) {
    return NextResponse.json({ error: "Missing required 'phone' number" }, { status: 400 })
  }

  const cleanPhone = String(phone).trim()

  // 1. Upsert newsletter subscriber
  const subscriber = await db.newsletterSubscriber.upsert({
    where: {
      tenantId_phone: {
        tenantId: auth.tenantId,
        phone: cleanPhone,
      },
    },
    update: {
      email: email || undefined,
      name: name !== "Subscriber" ? name : undefined,
      source,
      tags: Array.isArray(tags) ? tags : ["newsletter_subscriber"],
      consentGiven: true,
      consentTimestamp: new Date(),
      storeId: storeId || undefined,
      updatedAt: new Date(),
    },
    create: {
      tenantId: auth.tenantId,
      storeId: storeId || null,
      phone: cleanPhone,
      email: email || null,
      name: name || "Subscriber",
      source,
      tags: Array.isArray(tags) ? tags : ["newsletter_subscriber"],
      consentGiven: true,
      consentTimestamp: new Date(),
      welcomeSent: false,
    },
  })

  // 2. Also register / update customer in main CRM
  await db.customer.upsert({
    where: { tenantId_phone: { tenantId: auth.tenantId, phone: cleanPhone } },
    update: {
      name: name !== "Subscriber" ? name : undefined,
      email: email || undefined,
      lastContactAt: new Date(),
    },
    create: {
      tenantId: auth.tenantId,
      phone: cleanPhone,
      name: name || "Subscriber",
      email: email || null,
      source: "NEWSLETTER",
    },
  }).catch(() => null)

  // 3. Send interactive welcome message with coupon button if not already sent
  let welcomeResult: any = null
  if (sendWelcome && !subscriber.welcomeSent) {
    let storeName = auth.storeName
    let storeUrl = "https://app.fizmoh.cloud"

    if (storeId) {
      const store = await db.ecommerceStore.findUnique({ where: { id: storeId } }).catch(() => null)
      if (store) {
        storeName = store.name
        if (store.storeUrl) storeUrl = store.storeUrl
      }
    }
    if (!storeName) {
      const tenant = await db.tenant.findUnique({ where: { id: auth.tenantId }, select: { name: true } }).catch(() => null)
      storeName = tenant?.name || "Our Store"
    }

    welcomeResult = await sendEcommerceNotification({
      tenantId: auth.tenantId,
      storeId: storeId || null,
      eventType: "NEWSLETTER_WELCOME",
      to: cleanPhone,
      data: {
        name,
        store_name: storeName,
        welcome_coupon: couponCode,
        store_url: storeUrl,
      },
    })

    if (welcomeResult.success) {
      await db.newsletterSubscriber.update({
        where: { id: subscriber.id },
        data: { welcomeSent: true },
      }).catch(() => null)
    }
  }

  return NextResponse.json({
    success: true,
    subscriberId: subscriber.id,
    welcomeSent: welcomeResult ? welcomeResult.success : subscriber.welcomeSent,
    message: "Newsletter subscription confirmed",
  })
})

export const GET = withErrors(async (request: NextRequest) => {
  const auth = await resolveEcommerceAuth(request)
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
  const skip = (page - 1) * limit

  const where: any = { tenantId: auth.tenantId }
  if (auth.storeId) where.storeId = auth.storeId

  const [subscribers, total] = await Promise.all([
    db.newsletterSubscriber.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    db.newsletterSubscriber.count({ where }),
  ])

  return NextResponse.json({
    subscribers,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})
