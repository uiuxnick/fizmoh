import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { db, raw } from "@/lib/db"
import { generateOrderNumber, calculateOrderPrice } from "@/lib/helpers"
import { confirmSlotSeats, createAuditLog } from "@/lib/slots-server"
import { VAT_RATE } from "@/lib/constants"
import { withErrors } from "@/lib/api-handler"
import { syncOrderToCalendar } from "@/lib/google-calendar"

/**
 * External Order Management API
 * Per BRD §6.3: "Order Management API — REST/GraphQL endpoints so other systems (accounting software, tour-guide app, reporting tools, future mobile app) can read/write order data securely (API key / OAuth2)"
 *
 * Authentication: Bearer token via X-API-Key header
 * The API key is stored in system settings (set by super admin)
 *
 * Endpoints:
 *   GET  /api/external/orders          — list orders (with filters)
 *   GET  /api/external/orders/[id]     — get order detail
 *   POST /api/external/orders          — create order
 *   PATCH /api/external/orders/[id]    — update order
 */

import { validateApiKey } from "@/lib/api-keys"

async function verifyApiKey(request: NextRequest): Promise<{ tenantId: string } | null> {
  const apiKey = request.headers.get("x-api-key") || request.headers.get("authorization")
  if (!apiKey) return null

  const liveInfo = await validateApiKey(apiKey)
  if (liveInfo) return liveInfo

  // Legacy keys must still be tenant-bound. An installation-wide key with no
  // tenant cannot safely access a multi-tenant orders table.
  const setting = await raw.systemSetting.findFirst({ where: { key: "external_api_key", tenantId: { not: "" } } })
  if (!setting) return null

  const clean = apiKey.replace(/^Bearer\s+/i, "").trim()
  const provided = Buffer.from(clean)
  const expected = Buffer.from(setting.value)
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) return null
  return { tenantId: setting.tenantId }
}

export const GET = withErrors(async (request: NextRequest) => {
  // Verify API key
  const keyInfo = await verifyApiKey(request)
  if (!keyInfo) {
    return NextResponse.json({ error: "Unauthorized — valid X-API-Key required" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500)
  const fromDate = searchParams.get("fromDate")
  const toDate = searchParams.get("toDate")

  const where: any = { tenantId: keyInfo.tenantId }
  if (status) where.orderStatus = status
  if (fromDate || toDate) {
    where.createdAt = {}
    if (fromDate) where.createdAt.gte = new Date(fromDate)
    if (toDate) where.createdAt.lte = new Date(toDate)
  }

  const orders = await db.order.findMany({
    where,
    include: { tour: true, slot: true, customer: true, payments: true, vouchers: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  // Return clean JSON for external systems
  return NextResponse.json({
    count: orders.length,
    orders: orders.map(o => ({
      orderNumber: o.orderNumber,
      status: o.orderStatus,
      paymentStatus: o.paymentStatus,
      channel: o.channel,
      customer: { name: o.customerName, phone: o.customerPhone, email: o.customerEmail },
      tour: { name: o.tour.name, date: o.slot.date, time: o.slot.startTime },
      pax: { adults: o.paxAdult, children: o.paxChild },
      pricing: { subtotal: o.subtotal, tax: o.taxAmount, total: o.totalAmount, currency: "OMR" },
      paymentMethod: o.paymentMethod,
      voucher: o.vouchers[0]?.voucherCode || null,
      createdAt: o.createdAt,
      confirmedAt: o.confirmedAt,
    })),
  })
})

export const POST = withErrors(async (request: NextRequest) => {
  const keyInfo = await verifyApiKey(request)
  if (!keyInfo) {
    return NextResponse.json({ error: "Unauthorized — valid X-API-Key required" }, { status: 401 })
  }

  const body = await request.json()
  const { tourId, slotId, paxAdult, paxChild, customerName, customerPhone, customerEmail, paymentMethod, channel } = body

  const tour = await db.tour.findFirst({ where: { id: tourId, tenantId: keyInfo.tenantId } })
  const slot = await db.slot.findFirst({ where: { id: slotId, tenantId: keyInfo.tenantId, tourId } })
  if (!tour || !slot) return NextResponse.json({ error: "Tour or slot not found" }, { status: 400 })

  const available = slot.capacity - slot.seatsBooked - slot.seatsHeld
  if (available < (paxAdult + paxChild)) {
    return NextResponse.json({ error: "Not enough seats" }, { status: 400 })
  }

  let customer = await db.customer.findFirst({ where: { tenantId: keyInfo.tenantId, phone: customerPhone } })
  if (!customer) {
    customer = await db.customer.create({
      data: { tenantId: keyInfo.tenantId, name: customerName, phone: customerPhone, email: customerEmail || null, whatsappOptIn: true },
    })
  }

  const pricePerAdult = slot.priceOverride ?? tour.basePrice
  const { subtotal, taxAmount, total } = calculateOrderPrice(pricePerAdult, tour.childPrice || 0, paxAdult, paxChild, 0, 0, VAT_RATE)
  const orderNumber = await generateOrderNumber()

  const order = await db.order.create({
    data: {
      orderNumber,
      tenantId: keyInfo.tenantId,
      customerId: customer.id,
      tourId, slotId,
      paxAdult, paxChild,
      customerName, customerPhone, customerEmail,
      subtotal, taxAmount, totalAmount: total,
      paymentMethod: paymentMethod || "BANK_TRANSFER",
      channel: channel || "API",
    },
  })

  await db.payment.create({
    data: { tenantId: keyInfo.tenantId, orderId: order.id, customerId: customer.id, method: paymentMethod || "BANK_TRANSFER", amount: total, status: "PENDING" },
  })

  // Every booking belongs in the calendar, not only paid ones: an unpaid
  // booking still holds a seat and a guide still needs to know about it.
  void syncOrderToCalendar(order.id)

  return NextResponse.json({ orderNumber, orderId: order.id, total, currency: "OMR" }, { status: 201 })
})
