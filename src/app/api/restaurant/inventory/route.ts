import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

export const GET = withErrors(withModule("RESTAURANT", async () => {
  const tenant = currentTenant(); if (!tenant?.tenantId) return NextResponse.json({ error: "No workspace" }, { status: 400 })
  const items = await db.restaurantInventoryItem.findMany({ where: { tenantId: tenant.tenantId, isActive: true }, orderBy: { name: "asc" } })
  return NextResponse.json({ items, lowStock: items.filter(item => item.quantity <= item.lowStockAt) })
}))

export const POST = withErrors(withModule("RESTAURANT", async (request: NextRequest) => {
  const tenant = currentTenant(); if (!tenant?.tenantId) return NextResponse.json({ error: "No workspace" }, { status: 400 })
  const body = await request.json().catch(() => null)
  const name = String(body?.name ?? "").trim(); if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })
  const item = await db.restaurantInventoryItem.create({ data: { tenantId: tenant.tenantId, name, sku: body?.sku ? String(body.sku).trim() : null, unit: String(body?.unit ?? "unit"), quantity: Number(body?.quantity) || 0, lowStockAt: Math.max(0, Number(body?.lowStockAt) || 0), menuItemId: body?.menuItemId ? String(body.menuItemId) : null } })
  return NextResponse.json({ item }, { status: 201 })
}))

export const PATCH = withErrors(withModule("RESTAURANT", async (request: NextRequest) => {
  const tenant = currentTenant(); if (!tenant?.tenantId) return NextResponse.json({ error: "No workspace" }, { status: 400 })
  const id = new URL(request.url).searchParams.get("id") || ""; const body = await request.json().catch(() => null)
  const item = await db.restaurantInventoryItem.updateMany({ where: { id, tenantId: tenant.tenantId }, data: { ...(body?.name !== undefined ? { name: String(body.name).trim() } : {}), ...(body?.quantity !== undefined ? { quantity: Number(body.quantity) || 0 } : {}), ...(body?.lowStockAt !== undefined ? { lowStockAt: Math.max(0, Number(body.lowStockAt) || 0) } : {}) } })
  return NextResponse.json({ updated: item.count })
}))
