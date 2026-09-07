import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { requirePlatformAdmin } from "../../tenants/route"

/**
 * Add-on creation and listing endpoint for Platform Super Admins.
 */
export const GET = withErrors(async (request: NextRequest) => {
  if (!(await requirePlatformAdmin(request))) {
    return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 })
  }
  const addons = await raw.planAddon.findMany({ orderBy: { sortOrder: "asc" } })
  return NextResponse.json({ addons })
})

export const POST = withErrors(async (request: NextRequest) => {
  const admin = await requirePlatformAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const name = String(body?.name ?? "").trim()
  if (!name) return NextResponse.json({ error: "Add-on requires a name" }, { status: 400 })

  const slug = String(body?.slug ?? name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  const existing = await raw.planAddon.findUnique({ where: { slug } })
  if (existing) return NextResponse.json({ error: "An add-on with this slug already exists" }, { status: 409 })

  const addon = await raw.planAddon.create({
    data: {
      slug,
      name,
      description: body?.description ? String(body.description).slice(0, 500) : null,
      priceMonthly: Math.max(0, Math.round(Number(body?.priceMonthly) || 0)),
      priceYearly: Math.max(0, Math.round(Number(body?.priceYearly) || 0)),
      currency: String(body?.currency ?? "OMR").toUpperCase().slice(0, 3),
      isPublic: body?.isPublic !== false,
      sortOrder: Number(body?.sortOrder) || 0,
    },
  })

  await raw.platformAuditEvent.create({
    data: {
      tenantId: null,
      actorStaffId: admin.id,
      action: "CREATE_ADDON",
      entity: "ADDON",
      entityId: addon.id,
      after: { name: addon.name, slug: addon.slug, priceMonthly: addon.priceMonthly } as any,
      reason: `Created add-on ${addon.name}`,
    },
  }).catch(() => {})

  return NextResponse.json({ addon }, { status: 201 })
})
