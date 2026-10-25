import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"
import { sessionFromRequest } from "@/lib/auth"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "PLATFORM", "MANAGER"]

export const PATCH = withErrors(withModule("TOURS", async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  if (session.role && !EDIT_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Only workspace administrators can update slots" }, { status: 403 })
  }

  const { id } = await params
  const tenant = currentTenant()
  const existing = await db.slot.findFirst({
    where: {
      id,
      ...(tenant?.tenantId && tenant.tenantId !== "PLATFORM" ? { tour: { tenantId: tenant.tenantId } } : {}),
    },
  })
  if (!existing) return NextResponse.json({ error: "Slot not found" }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const data: any = {}
  if (body.status !== undefined) data.status = body.status
  if (body.capacity !== undefined) data.capacity = body.capacity
  if (body.priceOverride !== undefined) data.priceOverride = body.priceOverride
  if (body.seatsBooked !== undefined) data.seatsBooked = body.seatsBooked

  // Recompute FULL/OPEN if capacity or seats changed
  if (data.capacity !== undefined || data.seatsBooked !== undefined) {
    const cap = data.capacity ?? existing.capacity
    const booked = data.seatsBooked ?? existing.seatsBooked
    if (data.status === undefined) {
      data.status = booked >= cap ? "FULL" : "OPEN"
    }
  }

  const slot = await db.slot.update({ where: { id }, data, include: { tour: true } })
  return NextResponse.json({ slot })
}))

export const DELETE = withErrors(withModule("TOURS", async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  if (session.role && !EDIT_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Only workspace administrators can delete slots" }, { status: 403 })
  }

  const { id } = await params
  const tenant = currentTenant()
  const existing = await db.slot.findFirst({
    where: {
      id,
      ...(tenant?.tenantId && tenant.tenantId !== "PLATFORM" ? { tour: { tenantId: tenant.tenantId } } : {}),
    },
    include: { _count: { select: { orders: { where: { orderStatus: { notIn: ["CANCELLED", "REFUNDED"] } } } } } },
  })
  if (!existing) return NextResponse.json({ error: "Slot not found" }, { status: 404 })
  if (existing._count.orders > 0) {
    return NextResponse.json({ error: "Cannot delete a slot with active bookings. Cancel or reschedule the bookings first." }, { status: 409 })
  }

  await db.slot.delete({ where: { id } })
  return NextResponse.json({ success: true })
}))
