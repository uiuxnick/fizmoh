import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { db } from "@/lib/db"
import { resolveEcommerceAuth } from "@/lib/ecommerce-auth"
import {
  DEFAULT_ECOMMERCE_TEMPLATES,
  EcommerceEventType,
  sendEcommerceNotification,
} from "@/lib/ecommerce-templates"

export const GET = withErrors(async (request: NextRequest) => {
  const auth = await resolveEcommerceAuth(request)
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const storeId = searchParams.get("storeId") || auth.storeId || null

  // Fetch all existing mappings for this tenant
  const mappings = await db.ecommerceTemplateMapping.findMany({
    where: {
      tenantId: auth.tenantId,
      ...(storeId ? { OR: [{ storeId }, { storeId: null }] } : {}),
    },
  })

  const mappingMap = new Map(mappings.map(m => [m.eventType, m]))

  // Build full response containing default template info merged with merchant overrides
  const templates = Object.values(DEFAULT_ECOMMERCE_TEMPLATES).map(def => {
    const custom = mappingMap.get(def.key)
    return {
      eventType: def.key,
      title: def.title,
      description: def.description,
      defaultHeader: def.defaultHeader,
      defaultBody: def.defaultBody,
      buttonType: def.buttonType,
      defaultButtonText: def.defaultButtonText,
      defaultButtonUrlParam: def.defaultButtonUrlParam,
      allowedVariables: def.allowedVariables,
      // Custom mapping state
      useDefaultTemplate: custom ? custom.useDefaultTemplate : true,
      customTemplateName: custom?.customTemplateName || null,
      customTemplateLang: custom?.customTemplateLang || "en",
      variableMapping: custom?.variableMapping || {},
      isEnabled: custom ? custom.isEnabled : true,
      updatedAt: custom?.updatedAt || null,
    }
  })

  return NextResponse.json({ templates })
})

export const POST = withErrors(async (request: NextRequest) => {
  const auth = await resolveEcommerceAuth(request)
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const {
    eventType,
    storeId = auth.storeId || null,
    useDefaultTemplate = true,
    customTemplateName,
    customTemplateLang = "en",
    variableMapping = {},
    isEnabled = true,
  } = body

  if (!eventType || !DEFAULT_ECOMMERCE_TEMPLATES[eventType as EcommerceEventType]) {
    return NextResponse.json({ error: "Invalid eventType" }, { status: 400 })
  }

  const mapping = await db.ecommerceTemplateMapping.upsert({
    where: {
      tenantId_storeId_eventType: {
        tenantId: auth.tenantId,
        storeId: storeId || "",
        eventType,
      },
    },
    update: {
      useDefaultTemplate: Boolean(useDefaultTemplate),
      customTemplateName: customTemplateName ? String(customTemplateName).trim() : null,
      customTemplateLang: String(customTemplateLang).trim() || "en",
      variableMapping: typeof variableMapping === "object" ? variableMapping : {},
      isEnabled: Boolean(isEnabled),
      updatedAt: new Date(),
    },
    create: {
      tenantId: auth.tenantId,
      storeId: storeId || null,
      eventType,
      useDefaultTemplate: Boolean(useDefaultTemplate),
      customTemplateName: customTemplateName ? String(customTemplateName).trim() : null,
      customTemplateLang: String(customTemplateLang).trim() || "en",
      variableMapping: typeof variableMapping === "object" ? variableMapping : {},
      isEnabled: Boolean(isEnabled),
    },
  })

  return NextResponse.json({ success: true, mapping })
})

/**
 * Send a test preview message to merchant's phone
 */
export const PUT = withErrors(async (request: NextRequest) => {
  const auth = await resolveEcommerceAuth(request)
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { eventType, testPhone, storeId = auth.storeId } = body

  if (!eventType || !testPhone) {
    return NextResponse.json({ error: "eventType and testPhone are required" }, { status: 400 })
  }

  const mockData: Record<string, any> = {
    name: "Customer",
    order_number: "TEST-9999",
    store_name: auth.storeName || "My Store",
    total: "35.500",
    currency: "OMR",
    item_count: 2,
    carrier: "Oman Post Express",
    tracking_number: "OM882910394",
    tracking_url: "https://track.fizmoh.cloud/demo",
    order_url: "https://app.fizmoh.cloud/order/demo",
    checkout_url: "https://app.fizmoh.cloud/cart/demo",
    checkout_url_with_coupon: "https://app.fizmoh.cloud/cart/demo?coupon=SAVE10",
    coupon_code: "SAVE10",
    welcome_coupon: "WELCOME15",
    store_url: "https://app.fizmoh.cloud",
  }

  const result = await sendEcommerceNotification({
    tenantId: auth.tenantId,
    storeId: storeId || null,
    eventType: eventType as EcommerceEventType,
    to: testPhone,
    data: mockData,
  })

  return NextResponse.json({
    success: result.success,
    messageId: result.messageId,
    usedCustomTemplate: result.usedCustomTemplate,
    error: result.error,
  })
})
