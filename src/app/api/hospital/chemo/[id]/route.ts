import { withErrors } from "@/lib/api-handler"
import { resolveHospTenantId } from "@/lib/hospital"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"

export const GET = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const tenantId = await resolveHospTenantId(req)
  const b = await db.hospChemoBooking.findFirst({
    where: { id, tenantId },
    include: { patient: true, doctor: { include: { department: true } }, bed: { include: { ward: true } }, session: true },
  })
  if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(b)
})

export const PUT = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
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
})

export const DELETE = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const tenantId = await resolveHospTenantId(req)
  await db.hospChemoBooking.updateMany({
    where: { id, tenantId },
    data: { status: "CANCELLED" },
  })
  return NextResponse.json({ ok: true })
})
