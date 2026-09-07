import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant } from "@/lib/tenant"

/**
 * Data Export API
 * Per BRD §7: "Data export & accounting integration: Export financial data to formats compatible with common accounting tools"
 *
 * Exports orders/payments as CSV for accounting software
 */

export const GET = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const tenant = currentTenant()
  if (session?.kind !== "staff" || !tenant?.tenantId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") || "orders" // orders, payments, customers
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const where: any = { tenantId: tenant.tenantId }
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) where.createdAt.lte = new Date(to)
  }

  let csv = ""
  let filename = ""

  if (type === "orders") {
    const orders = await db.order.findMany({
      where,
      include: { tour: true, customer: true, payments: true, slot: true, vouchers: true },
      orderBy: { createdAt: "asc" },
    })

    csv = "Order Number,Date,Customer,Phone,Email,Tour,Date,Time,Adults,Children,Subtotal,VAT,Total,Payment Method,Payment Status,Order Status,Channel,Voucher Code\n"
    for (const o of orders) {
      csv += `"${o.orderNumber}","${o.createdAt.toISOString()}","${o.customerName}","${o.customerPhone}","${o.customerEmail || ""}","${o.tour.name}","${o.slot ? new Date(o.slot.date).toISOString().split("T")[0] : ""}","${o.slot?.startTime || ""}",${o.paxAdult},${o.paxChild},${o.subtotal},${o.taxAmount},${o.totalAmount},"${o.paymentMethod}","${o.paymentStatus}","${o.orderStatus}","${o.channel}","${o.vouchers[0]?.voucherCode || ""}"\n`
    }
    filename = `orders_${Date.now()}.csv`
  } else if (type === "payments") {
    const payments = await db.payment.findMany({
      where,
      include: { order: { include: { customer: true } }, verifier: true },
      orderBy: { createdAt: "asc" },
    })

    csv = "Payment ID,Order Number,Date,Customer,Amount,Method,Status,Bank Reference,Gateway Reference,Verified By,Verified At,Fraud Score\n"
    for (const p of payments) {
      csv += `"${p.id}","${p.order?.orderNumber || ""}","${p.createdAt.toISOString()}","${p.order?.customerName || ""}",${p.amount},"${p.method}","${p.status}","${p.bankReference || ""}","${p.gatewayReference || ""}","${p.verifier?.name || ""}","${p.verifiedAt?.toISOString() || ""}",${p.fraudScore || 0}\n`
    }
    filename = `payments_${Date.now()}.csv`
  } else if (type === "customers") {
    const customers = await db.customer.findMany({
      where,
      orderBy: { createdAt: "asc" },
    })

    csv = "ID,Name,Phone,Email,Language,Loyalty Tier,Points,Total Bookings,Total Spent,WhatsApp Opt-in,Email Opt-in,Created At\n"
    for (const c of customers) {
      csv += `"${c.id}","${c.name || ""}","${c.phone}","${c.email || ""}","${c.preferredLang}","${c.loyaltyTier}",${c.loyaltyPoints},${c.totalBookings},${c.totalSpent},"${c.whatsappOptIn}","${c.emailOptIn}","${c.createdAt.toISOString()}"\n`
    }
    filename = `customers_${Date.now()}.csv`
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
})
