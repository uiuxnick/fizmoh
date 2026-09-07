import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

export const GET = withErrors(withModule("RESTAURANT", async () => {
  const tenant = currentTenant(); if (!tenant?.tenantId) return NextResponse.json({ error: "No workspace" }, { status: 400 })
  const tokens = await db.restaurantQrToken.findMany({ where: { tenantId: tenant.tenantId, isActive: true }, include: { table: true }, orderBy: { createdAt: "desc" } })
  return NextResponse.json({ tokens })
}))

export const POST = withErrors(withModule("RESTAURANT", async (request: NextRequest) => {
  const tenant = currentTenant(); if (!tenant?.tenantId) return NextResponse.json({ error: "No workspace" }, { status: 400 })
  const body = await request.json().catch(() => null); const tableId = String(body?.tableId ?? "")
  const table = await db.restaurantTable.findFirst({ where: { id: tableId, tenantId: tenant.tenantId } })
  if (!table) return NextResponse.json({ error: "Table not found" }, { status: 404 })
  const token = await db.restaurantQrToken.create({ data: { tenantId: tenant.tenantId, tableId, token: randomBytes(18).toString("hex") }, include: { table: true } })
  return NextResponse.json({ token, url: `/restaurant/order?table=${encodeURIComponent(token.token)}` }, { status: 201 })
}))
