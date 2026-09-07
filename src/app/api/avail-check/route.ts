import { NextRequest, NextResponse } from "next/server"
import { db, raw } from "@/lib/db"
import { checkRateLimit, requestIp } from "@/lib/rate-limit"
import { holdSlotSeats } from "@/lib/slots-server"
import { withErrors } from "@/lib/api-handler"
import { currentTenant, tenantOf, withTenant } from "@/lib/tenant"

// Check availability for a tour on a date
export const GET = withErrors(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const tourId = searchParams.get("tourId")
  const date = searchParams.get("date")

  if (!tourId) return NextResponse.json({ error: "tourId required" }, { status: 400 })
  const tenantId = currentTenant()?.tenantId || (await raw.tour.findUnique({ where: { id: tourId }, select: { tenantId: true } }))?.tenantId
  const tenant = await tenantOf(tenantId)
  if (!tenant) return NextResponse.json({ error: "Tour workspace not found" }, { status: 404 })

  const where: any = { tenantId: tenant.tenantId, tourId, status: { in: ["OPEN", "FULL"] } }
  if (date) {
    const d = new Date(date)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    where.date = { gte: d, lt: next }
  }

  const slots = await withTenant(tenant, () => db.slot.findMany({
    where,
    include: { tour: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  }))

  const result = slots.map(s => ({
    id: s.id,
    date: s.date,
    startTime: s.startTime,
    capacity: s.capacity,
    seatsBooked: s.seatsBooked,
    seatsHeld: s.seatsHeld,
    available: s.capacity - s.seatsBooked - s.seatsHeld,
    price: s.priceOverride ?? s.tour.basePrice,
    status: s.status,
  }))

  return NextResponse.json({ slots: result })
})

// Hold seats during checkout
export const POST = withErrors(async (request: NextRequest) => {
  // POST holds seats, so an unlimited caller could hold out a whole departure.
  const rate = checkRateLimit(`avail:${requestIp(request.headers)}`, 30, 10 * 60 * 1000)
  if (!rate.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 })

  const body = await request.json()
  const { slotId, count } = body
  const slot = await raw.slot.findUnique({ where: { id: String(slotId || "") }, select: { tenantId: true } })
  const tenant = await tenantOf(slot?.tenantId)
  if (!tenant) return NextResponse.json({ error: "Slot workspace not found" }, { status: 404 })
  const numericCount = Number(count)
  if (!Number.isInteger(numericCount) || numericCount < 1 || numericCount > 50) return NextResponse.json({ error: "Invalid seat count" }, { status: 400 })
  const success = await withTenant(tenant, () => holdSlotSeats(String(slotId), numericCount))
  if (!success) return NextResponse.json({ error: "Not enough seats available" }, { status: 400 })
  return NextResponse.json({ success: true })
})
