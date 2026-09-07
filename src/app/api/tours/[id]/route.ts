import { NextRequest, NextResponse } from "next/server"
/*
 * From the shared module, not the editor component.
 *
 * tour-editor.tsx is a client component, so on the server this import resolved
 * to a client-reference proxy rather than the array — and TOUR_STATUSES.includes
 * threw "is not a function", which withErrors turned into a 500. Archiving a
 * tour was impossible: delete refused it for having bookings, and the archive
 * that refusal offered failed every time.
 */
import { TOUR_STATUSES } from "@/lib/tour-fields"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { buildTourData } from "@/lib/tour-fields"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

export const GET = withErrors(withModule("TOURS", async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const tour = await db.tour.findFirst({
    where: { id },
    include: {
      addOns: true,
      reviews: { include: { customer: true }, take: 50, orderBy: { createdAt: "desc" } },
      _count: { select: { orders: true, slots: true } },
    },
  })
  if (!tour) return NextResponse.json({ error: "Tour not found" }, { status: 404 })
  return NextResponse.json({ tour })
}))

export const PUT = withErrors(withModule("TOURS", async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const built = buildTourData(body)
  if (built.error) return NextResponse.json({ error: built.error }, { status: 400 })
  const updateData = built.data!

  const { addOns } = body
  if (Array.isArray(addOns)) {
    await db.addOn.deleteMany({ where: { tourId: id } })
    if (addOns.length > 0) {
      updateData.addOns = {
        create: addOns.slice(0, 30).map((a: Record<string, unknown>) => ({
          name: String(a.name || "").slice(0, 200),
          price: Number(a.price) || 0,
          type: a.type === "PER_PAX" ? "PER_PAX" : "FLAT",
          isActive: a.isActive !== false,
        })),
      }
    }
  }

  try {
    const tour = await db.tour.update({ where: { id }, data: updateData, include: { addOns: true } })
    return NextResponse.json({ tour })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Another tour already uses that URL slug" }, { status: 409 })
    }
    throw error
  }
}))

/**
 * Change only a tour's status.
 *
 * Deleting a tour that has ever been booked is refused, and the refusal tells
 * the operator to archive it instead — but archiving meant reopening the
 * editor and resubmitting every field, because PUT validates a whole tour.
 * This exists so "archive" can be one action from the same place delete was.
 */
export const PATCH = withErrors(withModule("TOURS", async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const body = await request.json().catch(() => null)
  const status = String(body?.status || "")
  if (!TOUR_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Unknown tour status" }, { status: 400 })
  }
  const tour = await db.tour.update({ where: { id }, data: { status } })
  return NextResponse.json({ tour })
}))

export const DELETE = withErrors(withModule("TOURS", async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  // Orders reference the tour without a cascade, so deleting one that has ever
  // been booked would either fail on the foreign key or orphan real bookings.
  // Archiving keeps the history and takes it off the site, which is what
  // "delete" means for a product that has sold.
  const orders = await db.order.count({ where: { tourId: id } })
  if (orders > 0) {
    return NextResponse.json(
      { error: `This tour has ${orders} booking${orders === 1 ? "" : "s"}. Archive it instead — deleting would break those orders.`, orders },
      { status: 409 },
    )
  }

  await db.slot.deleteMany({ where: { tourId: id } })
  await db.addOn.deleteMany({ where: { tourId: id } })
  await db.tour.delete({ where: { id } })
  return NextResponse.json({ success: true })
}))
