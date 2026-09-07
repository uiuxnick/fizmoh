import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { validateApiKey } from "@/lib/api-keys"
import { withTenant } from "@/lib/tenant-context"
import { db } from "@/lib/db"
import { generateOrderNumber, calculateOrderPrice } from "@/lib/helpers"
import { VAT_RATE } from "@/lib/constants"

export const GET = withErrors(async (request: NextRequest) => {
  const apiKeyHeader = request.headers.get("x-api-key") || request.headers.get("authorization")
  const keyInfo = await validateApiKey(apiKeyHeader)
  if (!keyInfo) {
    return NextResponse.json({ error: "Unauthorized: Invalid or missing API key" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")?.trim()
  const paymentStatus = searchParams.get("paymentStatus")?.trim()
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
  const skip = (page - 1) * limit

  const where: any = {}
  if (status) where.orderStatus = status
  if (paymentStatus) where.paymentStatus = paymentStatus

  const result = await withTenant({ tenantId: keyInfo.tenantId, slug: "" }, async () => {
    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          tour: { select: { id: true, name: true } },
          slot: { select: { id: true, date: true, startTime: true, endTime: true } },
          customer: { select: { id: true, name: true, phone: true, email: true } },
        },
      }),
      db.order.count({ where }),
    ])
    return { orders, total }
  })

  return NextResponse.json({
    success: true,
    data: result.orders.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.orderStatus,
      paymentStatus: o.paymentStatus,
      channel: o.channel,
      customer: {
        id: o.customer?.id,
        name: o.customerName || o.customer?.name,
        phone: o.customerPhone || o.customer?.phone,
        email: o.customerEmail || o.customer?.email,
      },
      tour: o.tour ? { id: o.tour.id, name: o.tour.name } : null,
      slot: o.slot ? { id: o.slot.id, date: o.slot.date, startTime: o.slot.startTime, endTime: o.slot.endTime } : null,
      pax: { adults: o.paxAdult, children: o.paxChild },
      pricing: {
        subtotal: o.subtotal,
        tax: o.taxAmount,
        total: o.totalAmount,
        currency: "OMR",
      },
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt,
      confirmedAt: o.confirmedAt,
    })),
    pagination: {
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    },
  })
})

export const POST = withErrors(async (request: NextRequest) => {
  const apiKeyHeader = request.headers.get("x-api-key") || request.headers.get("authorization")
  const keyInfo = await validateApiKey(apiKeyHeader)
  if (!keyInfo) {
    return NextResponse.json({ error: "Unauthorized: Invalid or missing API key" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "Request body is required" }, { status: 400 })
  }

  const {
    tourId,
    slotId,
    paxAdult = 1,
    paxChild = 0,
    customerName,
    customerPhone,
    customerEmail,
    paymentMethod = "CARD",
    channel = "EXTERNAL_API",
  } = body

  if (!customerPhone) {
    return NextResponse.json({ error: "'customerPhone' is required" }, { status: 400 })
  }

  const order = await withTenant({ tenantId: keyInfo.tenantId, slug: "" }, async () => {
    let resolvedTourId = tourId
    let resolvedSlotId = slotId

    if (!resolvedTourId) {
      const defaultTour = await db.tour.findFirst({ where: { status: "ACTIVE" } })
      if (!defaultTour) throw new Error("No active tour found in workspace. Provide a valid 'tourId'.")
      resolvedTourId = defaultTour.id
    }

    if (!resolvedSlotId) {
      const defaultSlot = await db.slot.findFirst({ where: { tourId: resolvedTourId, status: "OPEN" } })
      if (!defaultSlot) throw new Error("No open slot found for this tour. Provide a valid 'slotId'.")
      resolvedSlotId = defaultSlot.id
    }

    let subtotal = body.subtotal ?? 0
    let total = body.totalAmount ?? subtotal

    const tour = await db.tour.findUnique({ where: { id: resolvedTourId } })
    if (tour) {
      const pricing = calculateOrderPrice(
        tour.basePrice,
        tour.childPrice || 0,
        paxAdult,
        paxChild,
        0,
        0,
        VAT_RATE
      )
      subtotal = pricing.subtotal
      total = pricing.total
    }

    let customer = await db.customer.findFirst({ where: { phone: customerPhone } })
    if (!customer) {
      customer = await db.customer.create({
        data: {
          phone: customerPhone,
          name: customerName || "API Customer",
          email: customerEmail,
          stage: "CUSTOMER",
          source: "EXTERNAL_API",
          whatsappOptIn: true,
        },
      })
    }

    const orderNumber = await generateOrderNumber()

    return db.order.create({
      data: {
        orderNumber,
        tourId: resolvedTourId,
        slotId: resolvedSlotId,
        customerId: customer.id,
        customerName: customerName || customer.name || "Customer",
        customerPhone,
        customerEmail: customerEmail || customer.email || null,
        paxAdult,
        paxChild,
        subtotal,
        taxAmount: Math.round((total - subtotal) * 100) / 100,
        totalAmount: total,
        paymentStatus: "PENDING",
        orderStatus: "CONFIRMED",
        paymentMethod,
        channel,
      },
    })
  })

  return NextResponse.json({
    success: true,
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      currency: "OMR",
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      checkoutUrl: `https://app.fizmoh.cloud/booking/${order.orderNumber}`,
      createdAt: order.createdAt,
    },
  })
})
