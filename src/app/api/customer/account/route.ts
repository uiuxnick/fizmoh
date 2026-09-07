import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { currentTenant } from "@/lib/tenant-context"

function parseStoredJson(value: unknown, fallback: unknown) {
  if (typeof value !== "string") return value ?? fallback
  try { return JSON.parse(value) } catch { return fallback }
}

/**
 * Customer Account Area
 * Per BRD §6.1: "Customer account area: booking history, invoices/receipts, order status tracking, rebooking"
 */

export const GET = withErrors(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get("phone")
  const customerId = searchParams.get("customerId")
  const authenticatedKind = request.headers.get("x-wptour-auth-kind")
  const authenticatedCustomerId = request.headers.get("x-wptour-customer-id")

  if (!phone && !customerId) {
    return NextResponse.json({ error: "phone or customerId required" }, { status: 400 })
  }
  // Customer.phone is unique per tenant, not across the installation — see
  // the same note in /api/auth/otp. A lookup by phone with no workspace in
  // scope would match whichever tenant's row comes back first.
  if (!currentTenant()) {
    return NextResponse.json({ error: "A workspace is required" }, { status: 400 })
  }

  const customer = customerId
    ? await db.customer.findFirst({ where: { id: customerId } })
    : await db.customer.findFirst({ where: { phone: phone! } })

  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 })
  if (authenticatedKind !== "staff" && authenticatedCustomerId !== customer.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [orders, reviews, consentLogs] = await Promise.all([
    db.order.findMany({
      where: { customerId: customer.id },
      include: { tour: true, slot: true, payments: true, vouchers: true },
      orderBy: { createdAt: "desc" },
    }),
    db.review.findMany({ where: { customerId: customer.id }, include: { tour: true } }),
    db.consentLog.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" }, take: 10 }),
  ])

  return NextResponse.json({
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      loyaltyTier: customer.loyaltyTier,
      loyaltyPoints: customer.loyaltyPoints,
      totalBookings: customer.totalBookings,
      totalSpent: customer.totalSpent,
      preferredLang: customer.preferredLang,
      tags: parseStoredJson(customer.tags, []),
    },
    orders: orders.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.orderStatus,
      paymentStatus: o.paymentStatus,
      tour: { name: o.tour.name, image: (parseStoredJson(o.tour.media, []) as { url?: string }[])[0]?.url || null },
      date: o.slot.date,
      time: o.slot.startTime,
      pax: { adults: o.paxAdult, children: o.paxChild },
      total: o.totalAmount,
      channel: o.channel,
      voucherCode: o.vouchers[0]?.voucherCode,
      voucherStatus: o.vouchers[0]?.status,
      invoiceUrl: `/api/invoices/${o.id}`,
      voucherUrl: o.vouchers[0] ? `/api/vouchers/${o.id}` : null,
      createdAt: o.createdAt,
    })),
    reviews,
    consentLogs,
  })
})
