import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

export const GET = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get("branchId")
  const period = searchParams.get("period") || "today" // today, 7d, 30d

  const now = new Date()
  let startDate = new Date(now.setHours(0, 0, 0, 0))
  if (period === "7d") {
    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  } else if (period === "30d") {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  }

  // 1. Orders and Sales
  const orders = await raw.kitchenOrder.findMany({
    where: {
      tenantId,
      createdAt: { gte: startDate },
      ...(branchId ? { branchId } : {}),
      status: { not: "CANCELLED" },
    },
    select: {
      id: true,
      totalAmount: true,
      status: true,
      orderType: true,
      createdAt: true,
      acceptedAt: true,
      readyAt: true,
      itemsJson: true,
    },
  })

  const totalOrders = orders.length
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  // 2. Average prep time (minutes between acceptedAt and readyAt)
  const completedWithTimes = orders.filter((o) => o.acceptedAt && o.readyAt)
  const totalPrepMinutes = completedWithTimes.reduce((sum, o) => {
    const diff = (new Date(o.readyAt!).getTime() - new Date(o.acceptedAt!).getTime()) / 60000
    return sum + Math.max(0, diff)
  }, 0)
  const avgPrepTime = completedWithTimes.length > 0 ? Math.round(totalPrepMinutes / completedWithTimes.length) : 15

  // 3. Popular dishes count
  const dishCounts: Record<string, { name: string; count: number; revenue: number }> = {}
  for (const o of orders) {
    try {
      const items = JSON.parse(o.itemsJson || "[]")
      for (const it of items) {
        const key = it.name || "Unknown"
        if (!dishCounts[key]) dishCounts[key] = { name: key, count: 0, revenue: 0 }
        dishCounts[key].count += it.qty || 1
        dishCounts[key].revenue += (it.price || 0) * (it.qty || 1)
      }
    } catch {}
  }

  const topDishes = Object.values(dishCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // 4. Live Table Occupancy
  const totalTables = await raw.restaurantTable.count({
    where: { tenantId, ...(branchId ? { branchId } : {}) },
  })
  const occupiedTables = await raw.restaurantTable.count({
    where: {
      tenantId,
      status: { in: ["OCCUPIED", "BILL_REQUESTED"] },
      ...(branchId ? { branchId } : {}),
    },
  })

  // 5. Active Pending Orders
  const pendingOrders = await raw.kitchenOrder.count({
    where: {
      tenantId,
      status: { in: ["PENDING", "ACCEPTED", "PREPARING"] },
      ...(branchId ? { branchId } : {}),
    },
  })

  // 6. Active Waiter Requests
  const pendingWaiterCalls = await raw.restaurantWaiterRequest.count({
    where: {
      tenantId,
      status: "PENDING",
      ...(branchId ? { branchId } : {}),
    },
  })

  return NextResponse.json({
    metrics: {
      totalOrders,
      totalRevenue: Math.round(totalRevenue * 1000) / 1000,
      avgOrderValue: Math.round(avgOrderValue * 1000) / 1000,
      avgPrepTime,
      totalTables,
      occupiedTables,
      occupancyRate: totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0,
      pendingOrders,
      pendingWaiterCalls,
    },
    topDishes,
  })
}))
