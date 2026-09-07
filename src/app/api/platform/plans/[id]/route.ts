import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { requirePlatformAdmin } from "../../tenants/route"
import { cleanModules, cleanLimits } from "../route"

/** Editing a plan, and retiring one. All mutations recorded in PlatformAuditEvent. */

export const PATCH = withErrors(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) => {
  const admin = await requirePlatformAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 })
  }

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const plan = await raw.plan.findUnique({ where: { id } })
  if (!plan) return NextResponse.json({ error: "No such plan" }, { status: 404 })

  const updated = await raw.plan.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
      ...(body.description !== undefined ? { description: body.description ? String(body.description).slice(0, 300) : null } : {}),
      ...(body.priceMonthly !== undefined ? { priceMonthly: Math.max(0, Math.round(Number(body.priceMonthly) || 0)) } : {}),
      ...(body.priceYearly !== undefined ? { priceYearly: Math.max(0, Math.round(Number(body.priceYearly) || 0)) } : {}),
      ...(body.trialDays !== undefined ? { trialDays: Math.min(Math.max(Number(body.trialDays) || 0, 0), 365) } : {}),
      ...(body.modules !== undefined ? { modules: cleanModules(body.modules) } : {}),
      ...(body.limits !== undefined ? { limits: cleanLimits(body.limits) } : {}),
      ...(body.isPublic !== undefined ? { isPublic: !!body.isPublic } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: Number(body.sortOrder) || 0 } : {}),
    },
  })

  await raw.platformAuditEvent.create({
    data: {
      tenantId: null,
      actorStaffId: admin.id,
      action: "UPDATE_PLAN",
      entity: "PLAN",
      entityId: id,
      before: { name: plan.name, priceMonthly: plan.priceMonthly, isPublic: plan.isPublic } as any,
      after: { name: updated.name, priceMonthly: updated.priceMonthly, isPublic: updated.isPublic } as any,
      reason: `Updated plan configuration: ${updated.name}`,
    },
  }).catch(() => {})

  return NextResponse.json({ plan: updated })
})

export const DELETE = withErrors(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) => {
  const admin = await requirePlatformAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 })
  }

  const { id } = await context.params
  const plan = await raw.plan.findUnique({ where: { id } })
  if (!plan) return NextResponse.json({ error: "No such plan" }, { status: 404 })

  const subscribers = await raw.subscription.count({ where: { planId: id } })
  if (subscribers > 0) {
    await raw.plan.update({ where: { id }, data: { isPublic: false } })
    await raw.platformAuditEvent.create({
      data: {
        tenantId: null,
        actorStaffId: admin.id,
        action: "ARCHIVE_PLAN",
        entity: "PLAN",
        entityId: id,
        before: { isPublic: plan.isPublic } as any,
        after: { isPublic: false } as any,
        reason: `Archived/hidden plan ${plan.name} with ${subscribers} active subscribers`,
      },
    }).catch(() => {})

    return NextResponse.json({
      hidden: true,
      message: `${subscribers} workspace${subscribers === 1 ? " is" : "s are"} on this plan, so it was hidden from the catalogue rather than deleted.`,
    })
  }

  await raw.plan.delete({ where: { id } })
  await raw.platformAuditEvent.create({
    data: {
      tenantId: null,
      actorStaffId: admin.id,
      action: "DELETE_PLAN",
      entity: "PLAN",
      entityId: id,
      before: { name: plan.name } as any,
      reason: `Permanently deleted plan ${plan.name}`,
    },
  }).catch(() => {})

  return NextResponse.json({ deleted: true })
})
