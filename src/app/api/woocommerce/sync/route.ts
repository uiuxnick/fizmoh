import { withErrors } from "@/lib/api-handler"
import { db } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { currentTenant } from "@/lib/tenant"

/**
 * Sync Products & Orders from WooCommerce Store with PostgreSQL Cache Persistence
 */
export const POST = withErrors(async (request: NextRequest) => {
  const tenantId = currentTenant()?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  const config = await db.systemSetting.findFirst({ where: { tenantId, key: "WOOCOMMERCE_SETTINGS" } })

  if (!config?.value) {
    return NextResponse.json({ error: "WooCommerce API credentials not configured yet" }, { status: 400 })
  }

  let storeUrl = "", consumerKey = "", consumerSecret = ""
  try {
    const parsed = JSON.parse(config.value)
    storeUrl = parsed.storeUrl
    consumerKey = parsed.consumerKey
    consumerSecret = parsed.consumerSecret
  } catch {
    return NextResponse.json({ error: "Invalid WooCommerce config format" }, { status: 400 })
  }

  if (!storeUrl || !consumerKey || !consumerSecret) {
    return NextResponse.json({ error: "Store URL, Consumer Key, and Consumer Secret are required for WooCommerce sync" }, { status: 400 })
  }

  // Fetch products from WooCommerce REST API v3
  const authHeader = "Basic " + Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")
  const targetUrl = `${storeUrl}/wp-json/wc/v3/products?per_page=100`

  try {
    const res = await fetch(targetUrl, {
      headers: { Authorization: authHeader },
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      return NextResponse.json({ error: `WooCommerce API Error (${res.status}): ${errText.slice(0, 100)}` }, { status: 400 })
    }

    const wcProducts = await res.json()
    const count = Array.isArray(wcProducts) ? wcProducts.length : 0
    const now = new Date().toISOString()

    // Persist products cache to PostgreSQL
    const cachePayload = {
      lastSyncedAt: now,
      count,
      products: Array.isArray(wcProducts) ? wcProducts : [],
    }

    const existingCache = await db.systemSetting.findFirst({
      where: { tenantId, key: "WOOCOMMERCE_PRODUCTS_CACHE" },
    })

    if (existingCache) {
      await db.systemSetting.update({
        where: { id: existingCache.id },
        data: { value: JSON.stringify(cachePayload) },
      })
    } else {
      await db.systemSetting.create({
        data: {
          tenantId,
          key: "WOOCOMMERCE_PRODUCTS_CACHE",
          value: JSON.stringify(cachePayload),
          type: "JSON",
          category: "INTEGRATION",
        },
      })
    }

    // Update settings with last sync metadata
    try {
      const settingsParsed = JSON.parse(config.value)
      settingsParsed.lastSyncedAt = now
      settingsParsed.syncedProductsCount = count
      await db.systemSetting.update({
        where: { id: config.id },
        data: { value: JSON.stringify(settingsParsed) },
      })
    } catch {}

    return NextResponse.json({
      success: true,
      syncedProductsCount: count,
      lastSyncedAt: now,
      message: `Successfully connected to WooCommerce store! ${count} products retrieved and persisted to database.`,
    })
  } catch (e: any) {
    return NextResponse.json({ error: `Failed to connect to WooCommerce store: ${e.message || e}` }, { status: 500 })
  }
})

export const GET = withErrors(async () => {
  const tenantId = currentTenant()?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })

  const cache = await db.systemSetting.findFirst({
    where: { tenantId, key: "WOOCOMMERCE_PRODUCTS_CACHE" },
  })

  if (!cache?.value) {
    return NextResponse.json({ lastSyncedAt: null, count: 0, products: [] })
  }

  try {
    const data = JSON.parse(cache.value)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ lastSyncedAt: null, count: 0, products: [] })
  }
})
