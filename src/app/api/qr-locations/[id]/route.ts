import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "MANAGER", "MARKETING"]

export const PATCH = withErrors(withModule("DIGITAL_QR", async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const tenant = currentTenant()
  if (tenant?.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only marketing or workspace administrators can edit locations" }, { status: 403 })
  }
  const { id } = await params
  const existing = await db.qrLocation.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "No such location" }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 200)
  if (typeof body.address === "string") data.address = body.address.slice(0, 300) || null

  const location = await db.qrLocation.update({ where: { id }, data })
  return NextResponse.json({ location })
}))

export const DELETE = withErrors(withModule("DIGITAL_QR", async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const tenant = currentTenant()
  if (tenant?.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only marketing or workspace administrators can delete locations" }, { status: 403 })
  }
  const { id } = await params
  // Campaigns pointing here have onDelete: SetNull — deleting a location
  // un-groups its campaigns rather than touching them.
  await db.qrLocation.delete({ where: { id } })
  return NextResponse.json({ deleted: true })
}))
