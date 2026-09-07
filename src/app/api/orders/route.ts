import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { notifyStaff } from "@/lib/realtime"
import { generateOrderNumber, calculateOrderPrice } from "@/lib/helpers"
import { confirmSlotSeats, createAuditLog } from "@/lib/slots-server"
import { VAT_RATE } from "@/lib/constants"
import { z } from "zod"
import { checkRateLimit, requestIp } from "@/lib/rate-limit"
import { sessionFromRequest } from "@/lib/auth"
import { withErrors } from "@/lib/api-handler"
import { currentTenant, tenantOf, withTenant } from "@/lib/tenant"
import { syncOrderToCalendar } from "@/lib/google-calendar"

const createOrderSchema = z.object({
  tourId: z.string().min(1).max(100),
  slotId: z.string().min(1).max(100),
  paxAdult: z.coerce.number().int().min(1).max(50).default(1),
  paxChild: z.coerce.number().int().min(0).max(50).default(0),
  addOns: z.array(z.object({ id: z.string().optional(), name: z.string().min(1).max(120) })).max(20).optional(),
  customerName: z.string().trim().min(1).max(120),
  customerPhone: z.string().trim().transform(value => value.replace(/[\s()-]/g, "")).pipe(z.string().regex(/^\+[1-9]\d{7,14}$/)),
  customerEmail: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
  pickupLocation: z.string().trim().max(500).optional(),
  specialRequests: z.string().trim().max(2000).optional(),
  preferredLang: z.enum(["en", "ar"]).optional(),
  paymentMethod: z.enum(["AMWALPAY", "BANK_TRANSFER"]).default("BANK_TRANSFER"),
  couponCode: z.string().trim().toUpperCase().max(50).optional(),
})

export const GET = withErrors(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const channel = searchParams.get("channel")
  const search = searchParams.get("search")
  const limit = parseInt(searchParams.get("limit") || "50")

  const where: any = {}
  if (status) where.orderStatus = status
  if (channel) where.channel = channel
  if (search) {
    where.OR = [
      { orderNumber: { contains: search } },
      { customerName: { contains: search } },
      { customerPhone: { contains: search } },
    ]
  }

  // The same delta the inbox uses. A booking carries its tour, its slot, its
  // customer, its payments and its vouchers, so a full list is a large
  // response to rebuild on every pull-to-refresh when almost nothing has
  // moved. Stamped before the query so a write landing mid-flight is picked up
  // next time rather than missed.
  //
  // A delta is refused alongside a filter: `status` and `search` return a
  // slice, and merging a slice into a cache that believes it holds everything
  // is how bookings quietly disappear from the app.
  const syncedAt = new Date()
  const since = searchParams.get("since")
  const sinceDate = since ? new Date(since) : null
  const incremental = !!(sinceDate && !isNaN(sinceDate.getTime()) && !status && !channel && !search)
  if (incremental) where.updatedAt = { gt: sinceDate }

  const orders = await db.order.findMany({
    where,
    include: {
      tour: true,
      slot: true,
      customer: true,
      payments: true,
      vouchers: true,
    },
    orderBy: incremental ? { updatedAt: "desc" } : { createdAt: "desc" },
    take: limit,
  })

  return NextResponse.json({ orders, incremental, syncedAt: syncedAt.toISOString() })
})

export const POST = withErrors(async (request: NextRequest) => {
  const rate = checkRateLimit(`orders:${requestIp(request.headers)}`, 20, 60 * 60 * 1000)
  if (!rate.allowed) return NextResponse.json({ error: "Too many booking attempts" }, { status: 429 })

  const parsed = createOrderSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid booking details" }, { status: 400 })
  const body = parsed.data
  const session = await sessionFromRequest(request)

  const tour = await db.tour.findFirst({ where: { id: body.tourId, status: "ACTIVE" }, include: { addOns: true } })
  const slot = await db.slot.findUnique({ where: { id: body.slotId } })
  if (!tour || !slot || slot.tourId !== tour.id || slot.status !== "OPEN" || slot.date < new Date()) {
    return NextResponse.json({ error: "Tour or slot not found" }, { status: 400 })
  }

  /*
   * Whose booking this is.
   *
   * A customer has no session and every business is reached at the same
   * address, so nothing about the request identifies the workspace — but the
   * tour does. It belongs to exactly one, and so do the customer record, the
   * order, the payment and the message that follow from booking it. Without
   * this the order would be created with no workspace at all and appear in
   * nobody's dashboard.
   */
  const owner = await tenantOf(tour.tenantId)
  if (owner && !currentTenant()) {
    return withTenant(owner, () => createBooking(request, body, tour, slot, session))
  }
  return createBooking(request, body, tour, slot, session)
})

async function createBooking(
  request: NextRequest,
  body: z.infer<typeof createOrderSchema>,
  tour: any,
  slot: any,
  session: Awaited<ReturnType<typeof sessionFromRequest>>,
) {

  const available = slot.capacity - slot.seatsBooked - slot.seatsHeld
  const totalPax = body.paxAdult + body.paxChild
  if (available < totalPax) {
    return NextResponse.json({ error: "Not enough seats available" }, { status: 400 })
  }

  const pricePerAdult = slot.priceOverride ?? tour.basePrice
  const pricePerChild = tour.childPrice ?? 0
  const selectedAddOns = (body.addOns || []).map(requested => tour.addOns.find(a =>
    a.isActive && (requested.id ? a.id === requested.id : a.name === requested.name)
  )).filter((item): item is NonNullable<typeof item> => Boolean(item))
  const addOnsTotal = selectedAddOns.reduce((sum, addOn) => sum + (addOn.type === "PER_PAX" ? addOn.price * totalPax : addOn.price), 0)

  const rawSubtotal = pricePerAdult * body.paxAdult + pricePerChild * body.paxChild + addOnsTotal
  let discountAmount = 0
  let appliedCoupon: string | null = null
  if (body.couponCode) {
    const now = new Date()
    const coupon = await db.coupon.findFirst({ where: { code: body.couponCode } })
    const applicableTours = typeof coupon?.applicableTours === "string" ? JSON.parse(coupon.applicableTours) as string[] : null
    const valid = coupon?.isActive && coupon.validFrom <= now && (!coupon.validTo || coupon.validTo >= now)
      && coupon.usedCount < coupon.maxUses && (!coupon.minOrderAmount || rawSubtotal >= coupon.minOrderAmount)
      && (!applicableTours || applicableTours.length === 0 || applicableTours.includes(tour.id))
    if (!valid || !coupon) return NextResponse.json({ error: "Coupon is invalid or expired" }, { status: 400 })
    discountAmount = coupon.type === "PERCENTAGE" ? rawSubtotal * (coupon.value / 100) : coupon.value
    discountAmount = Math.min(rawSubtotal, Math.max(0, discountAmount))
    appliedCoupon = coupon.code

    // Claimed here, atomically, rather than after the order is created: the
    // check above and a plain increment afterward are two separate reads of
    // usedCount, so concurrent bookings near the cap could all pass the check
    // and all increment, running the coupon past maxUses. The `lt` in the
    // where clause makes this one conditional write instead — only a request
    // that still finds room gets to claim it, so nothing after this point
    // needs to re-check the limit.
    const claimed = await db.coupon.updateMany({
      where: { code: appliedCoupon, usedCount: { lt: coupon.maxUses } },
      data: { usedCount: { increment: 1 } },
    })
    if (claimed.count === 0) {
      return NextResponse.json({ error: "Coupon usage limit reached" }, { status: 400 })
    }
  }

  const { subtotal, discount, taxAmount, total } = calculateOrderPrice(
    pricePerAdult,
    pricePerChild,
    body.paxAdult,
    body.paxChild,
    addOnsTotal,
    discountAmount,
    VAT_RATE
  )

  const orderNumber = await generateOrderNumber()

  // Find or create customer
  let customer = await db.customer.findFirst({ where: { phone: body.customerPhone } })
  if (!customer) {
    customer = await db.customer.create({
      data: {
        name: body.customerName,
        phone: body.customerPhone,
        email: body.customerEmail || null,
        preferredLang: body.preferredLang || "en",
        whatsappOptIn: true,
      },
    })
  }

  const order = await db.order.create({
    data: {
      orderNumber,
      customerId: customer.id,
      tourId: body.tourId,
      slotId: body.slotId,
      paxAdult: body.paxAdult,
      paxChild: body.paxChild,
      addOns: selectedAddOns.length ? JSON.stringify(selectedAddOns.map(a => ({ addOnId: a.id, name: a.name, price: a.price, type: a.type }))) : undefined,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail || customer.email,
      pickupLocation: body.pickupLocation || null,
      specialRequests: body.specialRequests || null,
      subtotal,
      discount,
      taxAmount,
      totalAmount: total,
      paymentMethod: body.paymentMethod || "BANK_TRANSFER",
      paymentStatus: "PENDING",
      orderStatus: "PENDING_PAYMENT",
      channel: session?.kind === "staff" ? "ADMIN" : "WEB",
      couponCode: appliedCoupon,
      createdById: session?.kind === "staff" ? session.staffId : null,
    },
    include: { tour: true, slot: true, customer: true },
  })

  // Create payment record
  const payment = await db.payment.create({
    data: {
      orderId: order.id,
      customerId: customer.id,
      method: body.paymentMethod || "BANK_TRANSFER",
      amount: total,
      status: "PENDING",
    },
  })

  // A new booking produced no notification at all, so nothing in the panel
  // reacted until someone opened the bookings list.
  await notifyStaff({
    type: "NEW_BOOKING",
    title: "New booking",
    message: `${order.orderNumber} · ${order.customerName} · ${tour.name} · OMR ${total.toFixed(3)}`,
    data: { orderId: order.id, channel: order.channel },
  })

  // Every booking belongs in the calendar, not only paid ones: an unpaid
  // booking still holds a seat and a guide still needs to know about it.
  void syncOrderToCalendar(order.id)

  return NextResponse.json({ order, payment }, { status: 201 })
}
