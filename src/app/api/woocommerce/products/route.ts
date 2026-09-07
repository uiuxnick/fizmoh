import { withErrors } from "@/lib/api-handler"
import { wcRequest } from "@/lib/woocommerce-client"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { sessionFromRequest } from "@/lib/auth"

/**
 * List & Create WooCommerce Products with Local PostgreSQL Cache Fallback & Audit Logging
 */
export const GET = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Staff authentication required" }, { status: 401 })
  }

  const tenantId = currentTenant()?.tenantId
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get("search") || ""
  const category = searchParams.get("category") || "all"
  const page = searchParams.get("page") || "1"
  const perPage = searchParams.get("per_page") || "50"

  const query = new URLSearchParams()
  query.set("page", page)
  query.set("per_page", perPage)
  if (search) query.set("search", search)
  if (category && category !== "all") query.set("category", category)

  try {
    const products = await wcRequest(`products?${query.toString()}`)
    const list = Array.isArray(products) ? products : []

    // Update local cache asynchronously if listing default page
    if (tenantId && (!search || search === "") && (!category || category === "all") && page === "1") {
      db.systemSetting.findFirst({ where: { tenantId, key: "WOOCOMMERCE_PRODUCTS_CACHE" } })
        .then(existing => {
          const payload = {
            lastSyncedAt: new Date().toISOString(),
            count: list.length,
            products: list,
          }
          if (existing) {
            return db.systemSetting.update({ where: { id: existing.id }, data: { value: JSON.stringify(payload) } })
          } else {
            return db.systemSetting.create({
              data: { tenantId, key: "WOOCOMMERCE_PRODUCTS_CACHE", value: JSON.stringify(payload), type: "JSON", category: "INTEGRATION" },
            })
          }
        })
        .catch(() => {})
    }

    return NextResponse.json({ success: true, products: list, source: "live" })
  } catch (e: any) {
    // If live fetch fails, fall back to cached products in DB
    if (tenantId) {
      const cache = await db.systemSetting.findFirst({
        where: { tenantId, key: "WOOCOMMERCE_PRODUCTS_CACHE" },
      })
      if (cache?.value) {
        try {
          const cachedData = JSON.parse(cache.value)
          let filtered = cachedData.products || []
          if (search) {
            filtered = filtered.filter((p: any) =>
              p.name?.toLowerCase().includes(search.toLowerCase()) ||
              p.sku?.toLowerCase().includes(search.toLowerCase())
            )
          }
          if (category && category !== "all") {
            filtered = filtered.filter((p: any) =>
              p.categories?.some((c: any) => String(c.id) === String(category))
            )
          }
          return NextResponse.json({
            success: true,
            products: filtered,
            source: "cache",
            lastSyncedAt: cachedData.lastSyncedAt,
            warning: "Serving cached catalog. Live WooCommerce API unreachable.",
          })
        } catch {}
      }
    }
    return NextResponse.json({ error: e.message || "Failed to fetch WooCommerce products" }, { status: 400 })
  }
})

export const POST = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Staff authentication required" }, { status: 401 })
  }

  const tenantId = currentTenant()?.tenantId
  const body = await request.json().catch(() => ({}))
  const {
    name,
    regular_price,
    sale_price,
    stock_quantity,
    stock_status,
    manage_stock,
    sku,
    categories,
    description,
    short_description,
    images,
  } = body

  if (!name || !regular_price) {
    return NextResponse.json({ error: "Product name and regular price are required" }, { status: 400 })
  }

  try {
    const payload: Record<string, any> = {
      name,
      type: "simple",
      regular_price: String(regular_price),
      stock_status: stock_status || "instock",
      description: description || "",
      short_description: short_description || "",
      images: Array.isArray(images) ? images : images ? [{ src: images }] : [],
    }

    if (categories && Array.isArray(categories)) {
      payload.categories = categories.map((catId: any) => ({ id: Number(catId) }))
    }
    if (sale_price !== undefined && sale_price !== "") {
      payload.sale_price = String(sale_price)
    }
    if (sku) {
      payload.sku = String(sku)
    }
    if (manage_stock !== undefined) {
      payload.manage_stock = Boolean(manage_stock)
      if (manage_stock && stock_quantity !== undefined && stock_quantity !== "") {
        payload.stock_quantity = Number(stock_quantity)
      }
    }

    const product = await wcRequest("products", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    if (tenantId && product && typeof product === "object") {
      await db.platformAuditEvent.create({
        data: {
          tenantId,
          actorStaffId: session.staffId || null,
          action: "CREATE_WOOCOMMERCE_PRODUCT",
          entity: "WOOCOMMERCE_PRODUCT",
          entityId: String((product as any).id || "new"),
          after: { name: (product as any).name, price: (product as any).price, sku: (product as any).sku } as any,
          reason: `Created WooCommerce product "${(product as any).name}"`,
        },
      }).catch(() => {})

      // Prepend to local cache
      db.systemSetting.findFirst({ where: { tenantId, key: "WOOCOMMERCE_PRODUCTS_CACHE" } })
        .then(cache => {
          if (!cache?.value) return
          try {
            const data = JSON.parse(cache.value)
            const list = Array.isArray(data.products) ? data.products : []
            return db.systemSetting.update({
              where: { id: cache.id },
              data: { value: JSON.stringify({ ...data, count: list.length + 1, products: [product, ...list] }) },
            })
          } catch {}
        })
        .catch(() => {})
    }

    return NextResponse.json({ success: true, product })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to create WooCommerce product" }, { status: 400 })
  }
})
