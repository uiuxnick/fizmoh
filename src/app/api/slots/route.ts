import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

export const GET = withErrors(withModule("TOURS", async (request: NextRequest) => {
  /*
   * A public catalogue has to name its shop.
   *
   * This route is reachable without a session so a storefront can list what a
   * business sells. With no workspace in scope the scoped client does not
   * narrow the query, so an anonymous request returned every tenant's
   * catalogue in one response — 14 tours and 1,176 slots across two unrelated
   * businesses, including their pricing. The workspace comes from the host,
   * the ?workspace= parameter, or the caller's session; without one there is
   * no catalogue to show.
   */
  if (!currentTenant()?.tenantId) {
    return NextResponse.json({ slots: [] })
  }

  const { searchParams } = new URL(request.url)
  const tourId = searchParams.get("tourId")
  const date = searchParams.get("date")

  const where: any = {}
  if (tourId) where.tourId = tourId
  if (date) {
    const d = new Date(date)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    where.date = { gte: d, lt: next }
  }

  const slots = await db.slot.findMany({
    where,
    include: { tour: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  })

  return NextResponse.json({ slots })
}))

export const POST = withErrors(withModule("TOURS", async (request: NextRequest) => {
  const body = await request.json()

  // Bulk creation
  if (body.bulk && body.tourId) {
    const slots: Awaited<ReturnType<typeof db.slot.create>>[] = []
    for (const s of body.slots || []) {
      const existing = await db.slot.findUnique({
        where: { tourId_date_startTime: { tourId: body.tourId, date: new Date(s.date), startTime: s.startTime } },
      })
      if (!existing) {
        const slot = await db.slot.create({
          data: {
            tourId: body.tourId,
            date: new Date(s.date),
            startTime: s.startTime,
            capacity: s.capacity || 10,
            seatsBooked: 0,
            priceOverride: s.priceOverride || null,
            status: "OPEN",
          },
        })
        slots.push(slot)
      }
    }
    return NextResponse.json({ slots, created: slots.length }, { status: 201 })
  }

  const slot = await db.slot.create({
    data: {
      tourId: body.tourId,
      date: new Date(body.date),
      startTime: body.startTime,
      capacity: body.capacity || 10,
      seatsBooked: body.seatsBooked || 0,
      priceOverride: body.priceOverride || null,
      status: body.status || "OPEN",
    },
  })
  return NextResponse.json({ slot }, { status: 201 })
}))
