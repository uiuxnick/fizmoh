import { withErrors } from "@/lib/api-handler"
import { wcRequest } from "@/lib/woocommerce-client"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { sessionFromRequest } from "@/lib/auth"

/**
 * Edit & Delete WooCommerce Product by ID with automatic cache synchronization and audit logging
 */
export const PUT = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(request)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Staff authentication required" }, { status: 401 })
  }

  const { id } = await params
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
    description,
    short_description,
    images,
  } = body

  try {
    const payload: Record<string, any> = {}
    if (name) payload.name = name
    if (regular_price !== undefined && regular_price !== "") payload.regular_price = String(regular_price)
    if (sale_price !== undefined) payload.sale_price = sale_price ? String(sale_price) : ""
    if (stock_status) payload.stock_status = stock_status
    if (sku !== undefined) payload.sku = String(sku)
    if (description !== undefined) payload.description = description
    if (short_description !== undefined) payload.short_description = short_description
    if (images !== undefined) payload.images = Array.isArray(images) ? images : images ? [{ src: images }] : []

    if (manage_stock !== undefined) {
      payload.manage_stock = Boolean(manage_stock)
      if (manage_stock && stock_quantity !== undefined && stock_quantity !== "") {
        payload.stock_quantity = Number(stock_quantity)
      }
    }

    const product = await wcRequest(`products/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })

    // Update local cache and audit trail
    if (tenantId && product && typeof product === "object") {
      await db.platformAuditEvent.create({
        data: {
          tenantId,
          actorStaffId: session.staffId || null,
          action: "UPDATE_WOOCOMMERCE_PRODUCT",
          entity: "WOOCOMMERCE_PRODUCT",
          entityId: String(id),
          after: { name: (product as any).name, price: (product as any).price, sku: (product as any).sku } as any,
          reason: `Updated WooCommerce product "${(product as any).name || id}"`,
        },
      }).catch(() => {})

      db.systemSetting.findFirst({ where: { tenantId, key: "WOOCOMMERCE_PRODUCTS_CACHE" } })
        .then(cache => {
          if (!cache?.value) return
          try {
            const data = JSON.parse(cache.value)
            const list = Array.isArray(data.products) ? data.products : []
            const updatedList = list.map((p: any) => String(p.id) === String(id) ? { ...p, ...product } : p)
            return db.systemSetting.update({
              where: { id: cache.id },
              data: { value: JSON.stringify({ ...data, products: updatedList }) },
            })
          } catch {}
        })
        .catch(() => {})
    }

    return NextResponse.json({ success: true, product })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to update WooCommerce product" }, { status: 400 })
  }
})

export const DELETE = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(request)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Staff authentication required" }, { status: 401 })
  }

  const { id } = await params
  const tenantId = currentTenant()?.tenantId

  try {
    const result = await wcRequest(`products/${id}?force=true`, {
      method: "DELETE",
    })

    // Record audit event and remove from local cache
    if (tenantId) {
      await db.platformAuditEvent.create({
        data: {
          tenantId,
          actorStaffId: session.staffId || null,
          action: "DELETE_WOOCOMMERCE_PRODUCT",
          entity: "WOOCOMMERCE_PRODUCT",
          entityId: String(id),
          reason: `Deleted WooCommerce product ID: ${id}`,
        },
      }).catch(() => {})

      db.systemSetting.findFirst({ where: { tenantId, key: "WOOCOMMERCE_PRODUCTS_CACHE" } })
        .then(cache => {
          if (!cache?.value) return
          try {
            const data = JSON.parse(cache.value)
            const list = Array.isArray(data.products) ? data.products : []
            const filteredList = list.filter((p: any) => String(p.id) !== String(id))
            return db.systemSetting.update({
              where: { id: cache.id },
              data: { value: JSON.stringify({ ...data, count: filteredList.length, products: filteredList }) },
            })
          } catch {}
        })
        .catch(() => {})
    }

    return NextResponse.json({ success: true, deleted: result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to delete WooCommerce product" }, { status: 400 })
  }
})
