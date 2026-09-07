import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant } from "@/lib/tenant"

export const GET = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const tenant = currentTenant()
  if (session?.kind !== "staff" || !tenant?.tenantId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const tenantId = tenant.tenantId
  const [totalOrders, totalRevenue, pendingVerifications, openConversations, upcomingTours, activeTours, totalCustomers, confirmedOrders, completedOrders] = await Promise.all([
    db.order.count({ where: { tenantId } }),
    db.order.aggregate({ _sum: { totalAmount: true }, where: { orderStatus: { in: ["CONFIRMED", "COMPLETED"] } } }),
    db.payment.count({ where: { status: "SUBMITTED" } }),
    db.conversation.count({ where: { status: { in: ["OPEN", "PENDING"] } } }),
    db.order.count({
      where: {
        orderStatus: "CONFIRMED",
        slot: { date: { gte: new Date(), lte: new Date(Date.now() + 24 * 60 * 60 * 1000) } },
      },
    }),
    db.tour.count({ where: { status: "ACTIVE" } }),
    db.customer.count(),
    db.order.count({ where: { orderStatus: "CONFIRMED" } }),
    db.order.count({ where: { orderStatus: "COMPLETED" } }),
  ])

  // Orders by channel
  const channelStats = await db.order.groupBy({
    by: ["channel"],
    _count: true,
    _sum: { totalAmount: true },
  })

  // Orders by status
  const statusStats = await db.order.groupBy({
    by: ["orderStatus"],
    _count: true,
  })

  // Payment methods
  const paymentMethodStats = await db.payment.groupBy({
    by: ["method"],
    _count: true,
    _sum: { amount: true },
  })

  // Top tours by bookings
  const topToursRaw = await db.order.groupBy({
    by: ["tourId"],
    _count: true,
    _sum: { totalAmount: true },
    orderBy: { _count: { tourId: "desc" } },
    take: 5,
  })
  const tourIds = topToursRaw.map(t => t.tourId)
  const tours = await db.tour.findMany({ where: { id: { in: tourIds } } })
  const topTours = topToursRaw.map(t => ({
    ...t,
    tour: tours.find(tu => tu.id === t.tourId),
  }))

  // Revenue last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentOrders = await db.order.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { createdAt: true, totalAmount: true, orderStatus: true, channel: true },
    orderBy: { createdAt: "asc" },
  })

  const revenueByDay: { date: string; label: string; revenue: number; orders: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    const next = new Date(date)
    next.setDate(next.getDate() + 1)
    const dayOrders = recentOrders.filter(o => o.createdAt >= date && o.createdAt < next)
    revenueByDay.push({
      date: date.toISOString().split("T")[0],
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      revenue: dayOrders.filter(o => o.orderStatus === "CONFIRMED" || o.orderStatus === "COMPLETED").reduce((s, o) => s + o.totalAmount, 0),
      orders: dayOrders.length,
    })
  }

  return NextResponse.json({
    kpis: {
      totalOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      pendingVerifications,
      openConversations,
      upcomingTours,
      activeTours,
      totalCustomers,
      confirmedOrders,
      completedOrders,
    },
    channelStats,
    statusStats,
    paymentMethodStats,
    topTours,
    revenueByDay,
  })
})
