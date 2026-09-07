import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "MANAGER", "MARKETING"]

/** A workspace's locations/branches, for campaigns that want to be grouped by one. */
export const GET = withErrors(withModule("DIGITAL_QR", async () => {
  const locations = await db.qrLocation.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { campaigns: true } } },
  })
  return NextResponse.json({
    locations: locations.map(l => ({ id: l.id, name: l.name, address: l.address, campaignCount: l._count.campaigns })),
  })
}))

export const POST = withErrors(withModule("DIGITAL_QR", async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only marketing or workspace administrators can add locations" }, { status: 403 })
  }
  const body = await request.json().catch(() => null)
  const name = String(body?.name || "").trim()
  if (!name) return NextResponse.json({ error: "Location name is required" }, { status: 400 })

  const location = await db.qrLocation.create({
    data: {
      tenantId: tenant.tenantId,
      name: name.slice(0, 200),
      address: body?.address ? String(body.address).slice(0, 300) : null,
    },
  })
  return NextResponse.json({ location }, { status: 201 })
}))
