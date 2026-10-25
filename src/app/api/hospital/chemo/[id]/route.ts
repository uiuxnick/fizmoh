import { withErrors } from "@/lib/api-handler"
import { resolveHospTenantId } from "@/lib/hospital"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withModule } from "@/lib/entitlements"

const EDIT_ROLES = new Set(["OWNER", "SUPER_ADMIN", "MANAGER", "ADMIN", "PLATFORM"])

export const GET = withErrors(withModule("HOSPITAL", async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const actor = currentTenant()
  if (!actor?.tenantId) return NextResponse.json({ error: "Staff sign-in required" }, { status: 401 })
  const { id } = await params
  const tenantId = await resolveHospTenantId(req)
  const b = await db.hospChemoBooking.findFirst({
    where: { id, tenantId },
    include: { patient: true, doctor: { include: { department: true } }, bed: { include: { ward: true } }, session: true },
  })
  if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(b)
}))

export const PUT = withErrors(withModule("HOSPITAL", async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const actor = currentTenant()
  if (!actor?.tenantId) return NextResponse.json({ error: "Staff sign-in required" }, { status: 401 })
  if (actor.role && !EDIT_ROLES.has(actor.role)) return NextResponse.json({ error: "Hospital management access required" }, { status: 403 })
  const { id } = await params
  const tenantId = await resolveHospTenantId(req)
  const body = await req.json()
  const data = {
    ...(body.status != null ? { status: String(body.status) } : {}),
    ...(body.notes != null ? { notes: String(body.notes) } : {}),
  }
  const b = await db.hospChemoBooking.updateMany({
    where: { id, tenantId },
    data,
  })
  return NextResponse.json({ updated: b.count })
}))

export const DELETE = withErrors(withModule("HOSPITAL", async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const actor = currentTenant()
  if (!actor?.tenantId) return NextResponse.json({ error: "Staff sign-in required" }, { status: 401 })
  if (actor.role && !EDIT_ROLES.has(actor.role)) return NextResponse.json({ error: "Hospital management access required" }, { status: 403 })
  const { id } = await params
  const tenantId = await resolveHospTenantId(req)
  await db.hospChemoBooking.updateMany({
    where: { id, tenantId },
    data: { status: "CANCELLED" },
  })
  return NextResponse.json({ ok: true })
}))

