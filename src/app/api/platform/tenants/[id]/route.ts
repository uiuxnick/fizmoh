import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { requirePlatformAdmin } from "../route"

/**
 * Acting on one workspace: suspending it, banning it, letting it back in, moving its plan, or deleting.
 * All mutations record durable audit events in PlatformAuditEvent.
 */
export const GET = withErrors(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) => {
  const admin = await requirePlatformAdmin(request)
  if (!admin) return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 })

  const { id } = await context.params
  const members = await raw.tenantMember.findMany({
    where: { tenantId: id },
    include: { staff: { select: { id: true, name: true, email: true, phone: true, role: true, isActive: true } } },
    orderBy: { invitedAt: "asc" },
  })

  return NextResponse.json({
    staff: members.map(m => ({
      ...m.staff,
      membershipId: m.id,
      tenantRole: m.role,
      invitedAt: m.invitedAt,
    })),
  })
})

export const PATCH = withErrors(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) => {
  const admin = await requirePlatformAdmin(request)
  if (!admin) return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 })

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const tenant = await raw.tenant.findUnique({ where: { id } })
  if (!tenant) return NextResponse.json({ error: "No such workspace" }, { status: 404 })

  if (body.action === "custom_limits") {
    const existing = await raw.subscription.findFirst({
      where: { tenantId: id },
      orderBy: { createdAt: "desc" },
    })
    const limits = {
      maxMonthlyMessages: typeof body.maxMonthlyMessages === "number" ? body.maxMonthlyMessages : null,
      maxSubscribers: typeof body.maxSubscribers === "number" ? body.maxSubscribers : null,
      maxStaffAccounts: typeof body.maxStaffAccounts === "number" ? body.maxStaffAccounts : null,
      maxPhoneNumbers: typeof body.maxPhoneNumbers === "number" ? body.maxPhoneNumbers : null,
    }
    if (existing) {
      await raw.subscription.update({
        where: { id: existing.id },
        data: { customLimits: limits as any },
      })
    }
    await raw.platformAuditEvent.create({
      data: {
        tenantId: id,
        actorStaffId: admin.id,
        action: "UPDATE_CUSTOM_LIMITS",
        entity: "TENANT",
        entityId: id,
        after: limits as any,
        reason: "Platform custom limits updated",
      },
    })
  } else if (body.action === "update_user" && typeof body.staffId === "string") {
    const data: Record<string, unknown> = {}
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim()
    if (typeof body.email === "string" && body.email.trim()) data.email = body.email.trim().toLowerCase()
    if (typeof body.phone === "string") data.phone = body.phone.trim() || null
    if (typeof body.role === "string") data.role = body.role

    if (typeof body.newPassword === "string" && body.newPassword.length >= 8) {
      const { hash } = await import("bcryptjs")
      data.passwordHash = await hash(body.newPassword, 10)
    }

    if (Object.keys(data).length > 0) {
      await raw.staff.update({ where: { id: body.staffId }, data })
    }
    if (typeof body.role === "string") {
      await raw.tenantMember.updateMany({
        where: { tenantId: id, staffId: body.staffId },
        data: { role: body.role },
      })
    }
    await raw.platformAuditEvent.create({
      data: {
        tenantId: id,
        actorStaffId: admin.id,
        action: "UPDATE_STAFF_MEMBER",
        entity: "STAFF",
        entityId: body.staffId,
        reason: `Staff member updated by operator: ${body.name || body.email || body.staffId}`,
      },
    })
  } else if (body.action === "suspend") {
    const reason = String(body.reason || "Suspended by platform administrator").slice(0, 200)
    await raw.tenant.update({
      where: { id },
      data: {
        status: "SUSPENDED",
        suspendedAt: new Date(),
        suspendedReason: reason,
      },
    })
    await raw.platformAuditEvent.create({
      data: {
        tenantId: id,
        actorStaffId: admin.id,
        action: "SUSPEND_WORKSPACE",
        entity: "TENANT",
        entityId: id,
        before: { status: tenant.status } as any,
        after: { status: "SUSPENDED", reason } as any,
        reason,
      },
    })
  } else if (body.action === "ban") {
    const reason = String(body.reason || "Banned by platform administrator").slice(0, 200)
    await raw.tenant.update({
      where: { id },
      data: {
        status: "BANNED",
        suspendedAt: new Date(),
        suspendedReason: reason,
      },
    })
    await raw.platformAuditEvent.create({
      data: {
        tenantId: id,
        actorStaffId: admin.id,
        action: "BAN_WORKSPACE",
        entity: "TENANT",
        entityId: id,
        before: { status: tenant.status } as any,
        after: { status: "BANNED", reason } as any,
        reason,
      },
    })
  } else if (body.action === "resume") {
    await raw.tenant.update({
      where: { id },
      data: { status: "ACTIVE", suspendedAt: null, suspendedReason: null },
    })
    await raw.platformAuditEvent.create({
      data: {
        tenantId: id,
        actorStaffId: admin.id,
        action: "RESUME_WORKSPACE",
        entity: "TENANT",
        entityId: id,
        before: { status: tenant.status } as any,
        after: { status: "ACTIVE" } as any,
        reason: "Workspace reactivated by platform operator",
      },
    })
  } else if (body.action === "plan" && typeof body.planId === "string") {
    const plan = await raw.plan.findUnique({ where: { id: body.planId } })
    if (!plan) return NextResponse.json({ error: "No such plan" }, { status: 400 })

    // The billing console changes the plan and the billing status in one save,
    // so an optional status rides along with the plan. Validated against the
    // values Subscription.status is documented to hold — it is a plain String
    // column, so an unchecked value here would be written verbatim and would
    // then never match any status filter.
    const SUBSCRIPTION_STATUSES = new Set([
      "TRIALING", "ACTIVE", "PAST_DUE", "CANCELLED", "PENDING_PAYMENT",
    ])
    let nextStatus: string | null = null
    if (typeof body.subscriptionStatus === "string" && body.subscriptionStatus.trim()) {
      const candidate = String(body.subscriptionStatus).trim().toUpperCase()
      if (!SUBSCRIPTION_STATUSES.has(candidate)) {
        return NextResponse.json({ error: `Unknown billing status: ${candidate}` }, { status: 400 })
      }
      nextStatus = candidate
    }

    const existing = await raw.subscription.findFirst({
      where: { tenantId: id },
      orderBy: { createdAt: "desc" },
    })
    if (existing) {
      await raw.subscription.update({
        where: { id: existing.id },
        data: { planId: plan.id, ...(nextStatus ? { status: nextStatus } : {}) },
      })
    } else {
      await raw.subscription.create({
        data: { tenantId: id, planId: plan.id, status: nextStatus || "TRIALING", period: "MONTHLY" },
      })
    }
    await raw.platformAuditEvent.create({
      data: {
        tenantId: id,
        actorStaffId: admin.id,
        action: "ASSIGN_PLAN",
        entity: "PLAN",
        entityId: plan.id,
        before: { status: existing?.status ?? null } as any,
        after: { planId: plan.id, planName: plan.name, status: nextStatus ?? existing?.status ?? "TRIALING" } as any,
        reason: `Assigned plan ${plan.name} to workspace ${tenant.name}`,
      },
    })
  } else if (body.action === "update") {
    const data: Record<string, unknown> = {}
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 120)
    if (typeof body.timezone === "string" && body.timezone) data.timezone = body.timezone
    if (typeof body.currency === "string" && body.currency) data.currency = body.currency.toUpperCase().slice(0, 3)
    if (typeof body.locale === "string" && body.locale) data.locale = body.locale
    if (typeof body.logoUrl === "string") data.logoUrl = body.logoUrl.trim() || null

    if (typeof body.slug === "string" && body.slug.trim()) {
      const slug = body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "")
      if (slug.length < 2) {
        return NextResponse.json({ error: "That address is too short" }, { status: 400 })
      }
      if (slug !== tenant.slug) {
        const taken = await raw.tenant.findUnique({ where: { slug } })
        if (taken) return NextResponse.json({ error: "That address is taken" }, { status: 409 })
        data.slug = slug
      }
    }

    if (Object.keys(data).length > 0) {
      await raw.tenant.update({ where: { id }, data })
    }

    const settings: Record<string, string | null> = {}
    for (const [field, key] of [
      ["businessName", "business_name"],
      ["businessPhone", "business_phone"],
      ["businessEmail", "business_email"],
      ["businessAddress", "business_address"],
      ["businessWebsite", "business_website"],
      ["businessAbout", "business_about"],
    ] as const) {
      if (typeof body[field] === "string") settings[key] = String(body[field]).slice(0, 4000)
    }
    for (const [key, value] of Object.entries(settings)) {
      if (value === null || value === "") {
        await raw.systemSetting.deleteMany({ where: { tenantId: id, key } })
        continue
      }
      const existing = await raw.systemSetting.findFirst({ where: { tenantId: id, key } })
      if (existing) {
        await raw.systemSetting.update({ where: { id: existing.id }, data: { value } })
      } else {
        await raw.systemSetting.create({
          data: { tenantId: id, key, value, type: "STRING", category: "GENERAL" },
        })
      }
    }

    await raw.platformAuditEvent.create({
      data: {
        tenantId: id,
        actorStaffId: admin.id,
        action: "UPDATE_WORKSPACE_CONFIG",
        entity: "TENANT",
        entityId: id,
        after: data as any,
        reason: `Workspace profile updated: ${tenant.name}`,
      },
    })
  } else if (body.action === "owner_password") {
    const password = String(body.password ?? "")
    if (password.length < 8) {
      return NextResponse.json({ error: "At least 8 characters" }, { status: 400 })
    }
    const owner = await raw.tenantMember.findFirst({
      where: { tenantId: id, role: "OWNER" },
      orderBy: { invitedAt: "asc" },
    })
    if (!owner) return NextResponse.json({ error: "That workspace has no owner" }, { status: 400 })

    const { hash } = await import("bcryptjs")
    await raw.staff.update({
      where: { id: owner.staffId },
      data: { passwordHash: await hash(password, 12) },
    })

    await raw.platformAuditEvent.create({
      data: {
        tenantId: id,
        actorStaffId: admin.id,
        action: "RESET_OWNER_PASSWORD",
        entity: "STAFF",
        entityId: owner.staffId,
        reason: `Password reset by platform administrator for workspace owner of ${tenant.name}`,
      },
    })
  } else if (body.action === "extend_trial") {
    const days = Math.min(Math.max(Number(body.days) || 14, 1), 365)
    const until = new Date()
    until.setDate(until.getDate() + days)
    await raw.tenant.update({ where: { id }, data: { trialEndsAt: until, status: "ACTIVE", suspendedAt: null, suspendedReason: null } })
    const existing = await raw.subscription.findFirst({ where: { tenantId: id }, orderBy: { createdAt: "desc" } })
    if (existing) {
      await raw.subscription.update({
        where: { id: existing.id },
        data: { status: "TRIALING", currentPeriodEnd: until },
      })
    }

    await raw.platformAuditEvent.create({
      data: {
        tenantId: id,
        actorStaffId: admin.id,
        action: "EXTEND_TRIAL",
        entity: "TENANT",
        entityId: id,
        after: { trialEndsAt: until.toISOString(), daysExtended: days } as any,
        reason: `Trial period extended by ${days} days`,
      },
    })
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }

  const updated = await raw.tenant.findUnique({ where: { id } })
  return NextResponse.json({ tenant: updated })
})

export const DELETE = withErrors(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) => {
  const admin = await requirePlatformAdmin(request)
  if (!admin) return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 })

  const { id } = await context.params
  const tenant = await raw.tenant.findUnique({ where: { id } })
  if (!tenant) return NextResponse.json({ error: "No such workspace" }, { status: 404 })

  // Cascade delete relations where necessary or mark deleted
  await raw.systemSetting.deleteMany({ where: { tenantId: id } }).catch(() => {})
  await raw.tenantMember.deleteMany({ where: { tenantId: id } }).catch(() => {})
  await raw.subscription.deleteMany({ where: { tenantId: id } }).catch(() => {})
  await raw.subscriptionInvoice.deleteMany({ where: { tenantId: id } }).catch(() => {})
  await raw.tenant.delete({ where: { id } })

  await raw.platformAuditEvent.create({
    data: {
      tenantId: null,
      actorStaffId: admin.id,
      action: "DELETE_WORKSPACE",
      entity: "TENANT",
      entityId: id,
      before: { name: tenant.name, slug: tenant.slug } as any,
      reason: `Permanently deleted workspace ${tenant.name} (${tenant.slug})`,
    },
  })

  return NextResponse.json({ success: true, message: `Workspace ${tenant.name} deleted` })
})
