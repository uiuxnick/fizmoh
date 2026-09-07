import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant } from "@/lib/tenant"

/**
 * Departures and their bookings for a month.
 *
 * Grouped by departure rather than by order: what an operations team needs each
 * morning is "who is on the 09:00 dhow", not a list of orders sorted by when
 * they were placed.
 */
export const GET = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const tenant = currentTenant()
  if (session?.kind !== "staff" || !tenant?.tenantId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get("month") // yyyy-mm
  const tourId = searchParams.get("tourId")

  const base = monthParam ? new Date(`${monthParam}-01T00:00:00.000Z`) : new Date()
  if (Number.isNaN(base.getTime())) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 })
  }

  const from = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1))
  const to = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 1))

  const slots = await db.slot.findMany({
    where: {
      tenantId: tenant.tenantId,
      date: { gte: from, lt: to },
      ...(tourId ? { tourId } : {}),
    },
    include: {
      tour: { select: { id: true, name: true, city: true, meetingPoint: true, durationHours: true } },
      orders: {
        // Cancelled bookings are excluded: a guide reading the day sheet needs
        // who is coming, not who changed their mind.
        where: { orderStatus: { notIn: ["CANCELLED", "REFUNDED"] } },
        select: {
          id: true, orderNumber: true, customerName: true, customerPhone: true,
          paxAdult: true, paxChild: true, paxInfant: true,
          orderStatus: true, paymentStatus: true, totalAmount: true,
          specialRequests: true, pickupLocation: true,
        },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  })

  const departures = slots.map(slot => {
    const guests = slot.orders.reduce((sum, o) => sum + o.paxAdult + o.paxChild, 0)
    const infants = slot.orders.reduce((sum, o) => sum + o.paxInfant, 0)
    return {
      id: slot.id,
      date: slot.date.toISOString().slice(0, 10),
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: slot.status,
      capacity: slot.capacity,
      seatsBooked: slot.seatsBooked,
      seatsLeft: slot.capacity - slot.seatsBooked - slot.seatsHeld,
      tour: slot.tour,
      guests,
      infants,
      orders: slot.orders,
    }
  })

  // Days with no booking at all are dropped: an empty departure is not a thing
  // anyone needs to look at, and 900 slots a month would bury the ones that are.
  const withBookings = departures.filter(d => d.orders.length > 0)

  return NextResponse.json({
    month: `${from.getUTCFullYear()}-${String(from.getUTCMonth() + 1).padStart(2, "0")}`,
    departures: withBookings,
    totals: {
      departures: withBookings.length,
      guests: withBookings.reduce((sum, d) => sum + d.guests, 0),
      revenue: withBookings.reduce((sum, d) => sum + d.orders.reduce((s, o) => s + o.totalAmount, 0), 0),
    },
  })
})
