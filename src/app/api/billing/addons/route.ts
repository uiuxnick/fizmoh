import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { activeAddonsFor } from "@/lib/entitlements"
import { startAddonCheckout } from "@/lib/billing"

function canManage(role?: string) { return !role || ["OWNER", "SUPER_ADMIN", "MANAGER", "OPS_ADMIN"].includes(role) }

function resolveOrigin(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.startsWith("http")) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/+$/, "")
  }
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
  if (host && !host.includes("127.0.0.1") && !host.includes("localhost")) {
    const proto = request.headers.get("x-forwarded-proto") || "https"
    return `${proto}://${host}`
  }
  return "https://app.fizmoh.cloud"
}

export const GET = withErrors(async () => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "No workspace in scope" }, { status: 400 })
  const [addons, available, gateways] = await Promise.all([
    activeAddonsFor(tenant.tenantId),
    db.planAddon.findMany({ where: { isPublic: true }, orderBy: { sortOrder: "asc" } }),
    import("@/lib/billing").then(m => m.availablePlatformGateways()),
  ])
  return NextResponse.json({ addons, available, gateways })
})

export const POST = withErrors(async (request: NextRequest) => {
  // Add-ons are paid products. Keep POST as a compatibility guard, but never
  // activate an add-on without a verified payment gateway callback. Use PUT to start
  // the checkout session.
  return NextResponse.json({ error: "Add-ons require checkout. Use PUT /api/billing/addons." }, { status: 402 })
})

export const PUT = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "No workspace in scope" }, { status: 400 })
  if (!canManage(tenant.role)) return NextResponse.json({ error: "Only an owner can purchase add-ons" }, { status: 403 })
  const body = await request.json().catch(() => null)
  const addon = await db.planAddon.findUnique({ where: { slug: String(body?.slug ?? "").trim().toLowerCase() } })
  if (!addon || !addon.isPublic) return NextResponse.json({ error: "Add-on not found" }, { status: 404 })
  const origin = resolveOrigin(request)
  const gateway = typeof body?.gateway === "string" ? body.gateway : undefined
  const result = await startAddonCheckout({
    tenantId: tenant.tenantId,
    addonId: addon.id,
    quantity: Number(body?.quantity) || 1,
    period: body?.period === "YEARLY" ? "YEARLY" : "MONTHLY",
    gateway,
    origin,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json(result)
})

export const DELETE = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "No workspace in scope" }, { status: 400 })
  if (!canManage(tenant.role)) return NextResponse.json({ error: "Only an owner can manage add-ons" }, { status: 403 })
  const slug = new URL(request.url).searchParams.get("slug")?.trim().toLowerCase()
  if (!slug) return NextResponse.json({ error: "Add-on slug is required" }, { status: 400 })
  const addon = await db.planAddon.findUnique({ where: { slug } })
  if (!addon) return NextResponse.json({ error: "Add-on not found" }, { status: 404 })
  const assignment = await db.tenantAddon.updateMany({ where: { tenantId: tenant.tenantId, addonId: addon.id }, data: { status: "CANCELLED" } })
  await db.platformAuditEvent.create({ data: { tenantId: tenant.tenantId, actorStaffId: tenant.staffId ?? null, action: "ADDON_CANCELLED", entity: "PlanAddon", entityId: addon.id, after: { slug } } })
  return NextResponse.json({ cancelled: assignment.count })
})
