import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { requirePlatformAdmin } from "../../../tenants/route"

export const PATCH = withErrors(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requirePlatformAdmin(request)
  if (!admin) return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 })

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const addon = await raw.planAddon.findUnique({ where: { id } })
  if (!addon) return NextResponse.json({ error: "Add-on not found" }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (body?.name !== undefined) data.name = String(body.name).trim().slice(0, 120)
  if (body?.description !== undefined) data.description = body.description ? String(body.description).slice(0, 500) : null
  if (body?.priceMonthly !== undefined) data.priceMonthly = Math.max(0, Math.round(Number(body.priceMonthly) || 0))
  if (body?.priceYearly !== undefined) data.priceYearly = Math.max(0, Math.round(Number(body.priceYearly) || 0))
  if (body?.currency !== undefined) data.currency = String(body.currency).toUpperCase().slice(0, 3)
  if (body?.isPublic !== undefined) data.isPublic = body.isPublic !== false
  if (body?.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0

  const updated = await raw.planAddon.update({ where: { id }, data })

  await raw.platformAuditEvent.create({
    data: {
      tenantId: null,
      actorStaffId: admin.id,
      action: "UPDATE_ADDON",
      entity: "ADDON",
      entityId: id,
      before: { name: addon.name, priceMonthly: addon.priceMonthly, isPublic: addon.isPublic } as any,
      after: { name: updated.name, priceMonthly: updated.priceMonthly, isPublic: updated.isPublic } as any,
      reason: `Updated add-on configuration: ${updated.name}`,
    },
  }).catch(() => {})

  return NextResponse.json({ addon: updated })
})

export const DELETE = withErrors(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requirePlatformAdmin(request)
  if (!admin) return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 })

  const { id } = await context.params
  const addon = await raw.planAddon.findUnique({ where: { id } })
  if (!addon) return NextResponse.json({ error: "Add-on not found" }, { status: 404 })

  await raw.planAddon.delete({ where: { id } })

  await raw.platformAuditEvent.create({
    data: {
      tenantId: null,
      actorStaffId: admin.id,
      action: "DELETE_ADDON",
      entity: "ADDON",
      entityId: id,
      before: { name: addon.name, slug: addon.slug } as any,
      reason: `Deleted add-on: ${addon.name}`,
    },
  }).catch(() => {})

  return NextResponse.json({ success: true, deleted: true })
})
