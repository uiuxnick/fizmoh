import crypto from "crypto"
import { withErrors } from "@/lib/api-handler"
import { db } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { currentTenant } from "@/lib/tenant"
import { sessionFromRequest } from "@/lib/auth"
import { withModule } from "@/lib/entitlements"
import { getConfigValue, saveConfigValues } from "@/lib/app-config"

/**
 * WooCommerce Credentials & Configuration API
 */
export const GET = withErrors(withModule("WOOCOMMERCE", async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Staff authentication required" }, { status: 401 })
  }

  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud").replace(/\/+$/, "")
  const webhookUrl = `${baseUrl}/api/woocommerce/webhook?workspace=${encodeURIComponent(tenant.slug || "")}`

  const config = await db.systemSetting.findFirst({
    where: { tenantId, key: "WOOCOMMERCE_SETTINGS" },
  })

  let webhookSecret = (await getConfigValue("woocommerce_webhook_secret")).trim()
  if (!webhookSecret) {
    webhookSecret = crypto.randomBytes(16).toString("hex")
    await saveConfigValues({ woocommerce_webhook_secret: webhookSecret }).catch(() => {})
  }

  if (!config?.value) {
    return NextResponse.json({
      storeUrl: "",
      consumerKey: "",
      consumerSecret: "",
      webhookSecret,
      webhookUrl,
      workspaceSlug: tenant.slug || "",
      autoSync: true,
      syncOrders: true,
    })
  }

  try {
    const data = JSON.parse(config.value)
    return NextResponse.json({
      ...data,
      webhookSecret,
      webhookUrl,
      workspaceSlug: tenant.slug || "",
      consumerSecret: data.consumerSecret ? "••••••••" : "",
    })
  } catch {
    return NextResponse.json({ storeUrl: "", consumerKey: "", consumerSecret: "", webhookSecret, webhookUrl, workspaceSlug: tenant.slug || "", autoSync: true, syncOrders: true })
  }
}))

export const POST = withErrors(withModule("WOOCOMMERCE", async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Staff authentication required" }, { status: 401 })
  }

  const role = session.role?.toUpperCase() || ""
  if (!["OWNER", "SUPER_ADMIN", "ADMIN", "MANAGER", "PLATFORM"].includes(role)) {
    return NextResponse.json({ error: "Insufficient permissions to manage WooCommerce settings" }, { status: 403 })
  }

  const tenantId = currentTenant()?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const { storeUrl, consumerKey, consumerSecret, autoSync, syncOrders, webhookSecret } = body

  if (storeUrl) {
    try {
      const parsedUrl = new URL(storeUrl)
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return NextResponse.json({ error: "Store URL must use http or https" }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: "Invalid store URL format" }, { status: 400 })
    }
  }

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

  if (webhookSecret && typeof webhookSecret === "string" && webhookSecret.trim()) {
    await saveConfigValues({ woocommerce_webhook_secret: webhookSecret.trim() }).catch(() => {})
  }

  return NextResponse.json({ success: true, message: "WooCommerce settings saved successfully!" })
}))
