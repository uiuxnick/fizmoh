import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { db } from "@/lib/db"
import { resolveEcommerceAuth } from "@/lib/ecommerce-auth"
import { hasModule } from "@/lib/entitlements"
import crypto from "crypto"

export const GET = withErrors(async (request: NextRequest) => {
  const auth = await resolveEcommerceAuth(request)
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (auth.authMethod === "SESSION") {
    const entitled = (await hasModule("ECOMMERCE")) || (await hasModule("WOOCOMMERCE"))
    if (!entitled) {
      return NextResponse.json(
        { error: "Access Denied: Your workspace does not have an active E-Commerce connector addon.", code: "MODULE_NOT_ENTITLED", upgrade: true },
        { status: 403 },
      )
    }
  }

  const tenant = await db.tenant.findUnique({ where: { id: auth.tenantId }, select: { slug: true } })
  const tenantSlug = tenant?.slug || ""
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud").replace(/\/+$/, "")

  const stores = await db.ecommerceStore.findMany({
    where: { tenantId: auth.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          abandonedCarts: true,
          templateMappings: true,
        },
      },
    },
  })

  // Format and mask secrets
  const formatted = stores.map(s => ({
    id: s.id,
    name: s.name,
    platform: s.platform,
    storeUrl: s.storeUrl,
    currency: s.currency,
    isActive: s.isActive,
    apiKey: s.apiKey,
    webhookSecret: s.webhookSecret,
    settings: s.settings,
    abandonedCartsCount: s._count.abandonedCarts,
    templateMappingsCount: s._count.templateMappings,
    webhookUrl: `${baseUrl}/api/woocommerce/webhook?workspace=${tenantSlug}&storeId=${s.id}`,
    shopifyWebhookUrl: `${baseUrl}/api/ecommerce/webhooks/shopify?workspace=${tenantSlug}&storeId=${s.id}`,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }))

  return NextResponse.json({ stores: formatted })
})

export const POST = withErrors(async (request: NextRequest) => {
  const auth = await resolveEcommerceAuth(request)
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (auth.authMethod === "SESSION") {
    const entitled = (await hasModule("ECOMMERCE")) || (await hasModule("WOOCOMMERCE"))
    if (!entitled) {
      return NextResponse.json(
        { error: "Access Denied: Your workspace does not have an active E-Commerce connector addon.", code: "MODULE_NOT_ENTITLED", upgrade: true },
        { status: 403 },
      )
    }
  }

  const body = await request.json().catch(() => ({}))
  const {
    name,
    platform = "WOOCOMMERCE",
    storeUrl = "",
    currency = "OMR",
    settings = {},
  } = body

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Store name is required" }, { status: 400 })
  }

  const apiKey = `fiz_live_${crypto.randomBytes(20).toString("hex")}`
  const webhookSecret = `whsec_${crypto.randomBytes(16).toString("hex")}`

  const store = await db.ecommerceStore.create({
    data: {
      tenantId: auth.tenantId,
      name: name.trim(),
      platform: String(platform).toUpperCase(),
      storeUrl: String(storeUrl).trim(),
      apiKey,
      webhookSecret,
      currency: String(currency).trim() || "OMR",
      isActive: true,
      settings,
    },
  })

  const tenant = await db.tenant.findUnique({ where: { id: auth.tenantId }, select: { slug: true } })
  const tenantSlug = tenant?.slug || ""
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud").replace(/\/+$/, "")

  return NextResponse.json({
    success: true,
    store: {
      id: store.id,
      name: store.name,
      platform: store.platform,
      storeUrl: store.storeUrl,
      apiKey: store.apiKey,
      webhookSecret: store.webhookSecret,
      webhookUrl: `${baseUrl}/api/woocommerce/webhook?workspace=${tenantSlug}&storeId=${store.id}`,
      shopifyWebhookUrl: `${baseUrl}/api/ecommerce/webhooks/shopify?workspace=${tenantSlug}&storeId=${store.id}`,
    },
  }, { status: 201 })
})

export const DELETE = withErrors(async (request: NextRequest) => {
  const auth = await resolveEcommerceAuth(request)
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (auth.authMethod === "SESSION") {
    const entitled = (await hasModule("ECOMMERCE")) || (await hasModule("WOOCOMMERCE"))
    if (!entitled) {
      return NextResponse.json(
        { error: "Access Denied: Your workspace does not have an active E-Commerce connector addon.", code: "MODULE_NOT_ENTITLED", upgrade: true },
        { status: 403 },
      )
    }
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing store id" }, { status: 400 })

  const store = await db.ecommerceStore.findFirst({ where: { id, tenantId: auth.tenantId } })
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 })

  await db.ecommerceStore.delete({ where: { id } })
  return NextResponse.json({ success: true, message: `Store ${store.name} disconnected` })
})
