import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { checkRateLimit, requestIp } from "@/lib/rate-limit"
import { sendWhatsApp } from "@/lib/notifications"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant } from "@/lib/tenant"

/**
 * Waitlist API
 * Per BRD §6.2: "Auto-block/close-out when a slot reaches full capacity, with optional waitlist"
 * Per BRD §7: "Waitlist & auto-notify: When a slot is full, let customers join a waitlist and get an automatic WhatsApp/email alert if a seat opens up"
 */

export const GET = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const tenant = currentTenant()
  if (session?.kind !== "staff" || !tenant?.tenantId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const slotId = searchParams.get("slotId")

  const where: any = { tenantId: tenant.tenantId }
  if (slotId) where.slotId = slotId

  const waitlist = await db.waitlist.findMany({
    where,
    include: { tour: true, slot: true, customer: true },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ waitlist })
})

export const POST = withErrors(async (request: NextRequest) => {
  // Public and unauthenticated: cap it so the waitlist cannot be flooded.
  const rate = checkRateLimit(`waitlist:${requestIp(request.headers)}`, 10, 60 * 60 * 1000)
  if (!rate.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 })

  const body = await request.json()
  const { tourId, slotId, customerId, phone, email } = body

  // Check if slot is actually full
  const slot = await db.slot.findUnique({ where: { id: slotId } })
  if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 })
  if (slot.tourId !== tourId) return NextResponse.json({ error: "Slot does not belong to this tour" }, { status: 400 })

  const available = slot.capacity - slot.seatsBooked - slot.seatsHeld
  if (available > 0) {
    return NextResponse.json({ error: "Slot still has availability — no need to waitlist" }, { status: 400 })
  }

  // Add to waitlist
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 400 })
  const entry = await db.waitlist.create({
    data: { tenantId: tenant.tenantId, tourId, slotId, customerId, phone, email },
  })

  // Notify customer they're on the waitlist
  const customer = await db.customer.findFirst({ where: { id: customerId } })
  if (customer?.whatsappOptIn) {
    await sendWhatsApp({
      to: phone,
      body: `You've been added to the waitlist for this tour. If a seat opens up, we'll notify you immediately! 🎉`,
    })
  }

  return NextResponse.json({ waitlist: entry }, { status: 201 })
})

/**
 * When a seat becomes available (cancellation), notify waitlist
 * This is called from the order cancel flow
 */
export async function notifyWaitlist(slotId: string): Promise<void> {
  const waitlist = await db.waitlist.findMany({
    where: { slotId, notifiedAt: null },
    orderBy: { createdAt: "asc" },
    take: 5, // Notify first 5 in line
    include: { customer: true, slot: { include: { tour: true } } },
  })

  for (const entry of waitlist) {
    if (entry.customer?.whatsappOptIn) {
      await sendWhatsApp({
        to: entry.phone,
        body: `Great news! A seat just opened up for "${entry.slot.tour.name}" on ${entry.slot.date.toISOString().split("T")[0]} at ${entry.slot.startTime}. Book now before it's gone! Reply "BOOK" to reserve.`,
      })
    }
    await db.waitlist.update({ where: { id: entry.id }, data: { notifiedAt: new Date() } })
  }
}
