import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"

/** Orders that represent money actually taken. */
const EARNING = ["CONFIRMED", "COMPLETED"]

/**
 * Business reporting.
 *
 * Every figure honours the requested date range. The previous version read a
 * `status` parameter into a `where` object that was then never passed to a
 * query, so the filter silently did nothing and all figures were all-time
 * whatever the caller asked for.
 */
export const GET = withErrors(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)

  const to = searchParams.get("to") ? new Date(`${searchParams.get("to")}T23:59:59.999Z`) : new Date()
  const from = searchParams.get("from")
    ? new Date(`${searchParams.get("from")}T00:00:00.000Z`)
    : (() => { const d = new Date(to); d.setMonth(d.getMonth() - 6); return d })()

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
  }
  if (from > to) {
    return NextResponse.json({ error: "The start date is after the end date" }, { status: 400 })
  }

  const period = { createdAt: { gte: from, lte: to } }

  const [totalRevenue, totalBookings, avgOrderValue, webBookings, whatsappBookings, completedTours, cancelledOrders, pendingPayments] =
    await Promise.all([
      db.order.aggregate({ _sum: { totalAmount: true }, where: { ...period, orderStatus: { in: EARNING } } }),
      db.order.count({ where: period }),
      db.order.aggregate({ _avg: { totalAmount: true }, where: { ...period, orderStatus: { in: EARNING } } }),
      db.order.count({ where: { ...period, channel: "WEB" } }),
      db.order.count({ where: { ...period, channel: "WHATSAPP" } }),
      db.order.count({ where: { ...period, orderStatus: "COMPLETED" } }),
      db.order.count({ where: { ...period, orderStatus: "CANCELLED" } }),
      db.payment.count({ where: { ...period, status: "SUBMITTED" } }),
    ])

  const orders = await db.order.findMany({
    where: { ...period, orderStatus: { in: EARNING } },
    select: { createdAt: true, totalAmount: true, channel: true },
  })

  // Buckets span the requested range rather than a fixed six months, so a
  // one-week report is not padded out with five empty months.
  const buckets: { month: string; start: Date; end: Date }[] = []
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1)
  while (cursor <= to && buckets.length < 36) {
    const start = new Date(cursor)
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    buckets.push({ month: start.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), start, end })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  const revenueByMonth = buckets.map(b => {
    const monthOrders = orders.filter(o => o.createdAt >= b.start && o.createdAt < b.end)
    return {
      month: b.month,
      revenue: monthOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      orders: monthOrders.length,
      web: monthOrders.filter(o => o.channel === "WEB").length,
      whatsapp: monthOrders.filter(o => o.channel === "WHATSAPP").length,
    }
  })

  const topToursRaw = await db.order.groupBy({
    by: ["tourId"],
    _count: true,
    _sum: { totalAmount: true },
    where: { ...period, orderStatus: { in: EARNING } },
    orderBy: { _count: { tourId: "desc" } },
    take: 10,
  })
  const tours = await db.tour.findMany({ where: { id: { in: topToursRaw.map(t => t.tourId) } } })
  const topTours = topToursRaw.map(t => ({ ...t, tour: tours.find(tu => tu.id === t.tourId) }))

  const customers = await db.customer.findMany({ where: period, select: { createdAt: true } })
  const customerGrowth = buckets.map(b => ({
    month: b.month,
    newCustomers: customers.filter(c => c.createdAt >= b.start && c.createdAt < b.end).length,
  }))

  const payload = {
    range: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
    summary: {
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      totalBookings,
      avgOrderValue: avgOrderValue._avg.totalAmount || 0,
      webBookings,
      whatsappBookings,
      completedTours,
      cancelledOrders,
      pendingPayments,
    },
    revenueByMonth,
    topTours,
    customerGrowth,
  }

  // `format=csv` returns the same numbers as a spreadsheet, so a report can be
  // sent on without retyping it.
  if (searchParams.get("format") === "csv") {
    const rows: string[] = []
    rows.push(`Report,${payload.range.from} to ${payload.range.to}`)
    rows.push("")
    rows.push("Summary,Value")
    rows.push(`Total revenue (OMR),${payload.summary.totalRevenue.toFixed(3)}`)
    rows.push(`Bookings,${payload.summary.totalBookings}`)
    rows.push(`Average order value (OMR),${payload.summary.avgOrderValue.toFixed(3)}`)
    rows.push(`Web bookings,${payload.summary.webBookings}`)
    rows.push(`WhatsApp bookings,${payload.summary.whatsappBookings}`)
    rows.push(`Completed tours,${payload.summary.completedTours}`)
    rows.push(`Cancelled orders,${payload.summary.cancelledOrders}`)
    rows.push(`Payments awaiting verification,${payload.summary.pendingPayments}`)
    rows.push("")
    rows.push("Month,Revenue (OMR),Orders,Web,WhatsApp,New customers")
    payload.revenueByMonth.forEach((m, i) => {
      rows.push(`${m.month},${m.revenue.toFixed(3)},${m.orders},${m.web},${m.whatsapp},${payload.customerGrowth[i]?.newCustomers ?? 0}`)
    })
    rows.push("")
    rows.push("Tour,Bookings,Revenue (OMR)")
    payload.topTours.forEach(t => {
      const name = (t.tour?.name || "Unknown").replace(/"/g, '""')
      rows.push(`"${name}",${t._count},${(t._sum.totalAmount || 0).toFixed(3)}`)
    })

    return new NextResponse(rows.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="report-${payload.range.from}-to-${payload.range.to}.csv"`,
      },
    })
  }

  return NextResponse.json(payload)
})
