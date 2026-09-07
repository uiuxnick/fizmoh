import { withErrors } from "@/lib/api-handler"
import { db } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { currentTenant } from "@/lib/tenant"

/**
 * WooCommerce Credentials & Configuration API
 */
export const GET = withErrors(async () => {
  const tenantId = currentTenant()?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  const config = await db.systemSetting.findFirst({
    where: { tenantId, key: "WOOCOMMERCE_SETTINGS" },
  })

  if (!config?.value) {
    return NextResponse.json({
      storeUrl: process.env.WOOCOMMERCE_STORE_URL || "",
      consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY || "",
      consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET ? "••••••••" : "",
      autoSync: true,
      syncOrders: true,
    })
  }

  try {
    const data = JSON.parse(config.value)
    return NextResponse.json({
      ...data,
      consumerSecret: data.consumerSecret ? "••••••••" : "",
    })
  } catch {
    return NextResponse.json({ storeUrl: "", consumerKey: "", consumerSecret: "", autoSync: true, syncOrders: true })
  }
})

export const POST = withErrors(async (request: NextRequest) => {
  const tenantId = currentTenant()?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const { storeUrl, consumerKey, consumerSecret, autoSync, syncOrders } = body

  const existing = await db.systemSetting.findFirst({ where: { tenantId, key: "WOOCOMMERCE_SETTINGS" } })

  let secretToSave = consumerSecret
  if (consumerSecret === "••••••••" && existing?.value) {
    try {
      const prev = JSON.parse(existing.value)
      secretToSave = prev.consumerSecret
    } catch {
      // ignore
    }
  }

  const payload = {
    storeUrl: storeUrl?.replace(/\/$/, ""),
    consumerKey,
    consumerSecret: secretToSave,
    autoSync: Boolean(autoSync),
    syncOrders: Boolean(syncOrders),
    updatedAt: new Date().toISOString(),
  }

  if (existing) {
    await db.systemSetting.update({
      where: { id: existing.id },
      data: { value: JSON.stringify(payload) },
    })
  } else {
    await db.systemSetting.create({
      data: {
        tenantId,
        key: "WOOCOMMERCE_SETTINGS",
        value: JSON.stringify(payload),
      },
    })
  }

  return NextResponse.json({ success: true, message: "WooCommerce settings saved successfully!" })
})
