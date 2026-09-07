import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { requirePlatformAdmin } from "@/app/api/platform/tenants/route"

export const GET = withErrors(async (request: NextRequest) => {
  const admin = await requirePlatformAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const [
    tenantCount,
    staffCount,
    conversationCount,
    messageCount,
    orderCount,
    customerCount,
    botFlowCount,
  ] = await Promise.all([
    raw.tenant.count(),
    raw.staff.count(),
    raw.conversation.count(),
    raw.message.count(),
    raw.order.count(),
    raw.customer.count(),
    raw.botFlow.count(),
  ])

  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    database: "PostgreSQL",
    metrics: {
      tenants: tenantCount,
      staff: staffCount,
      conversations: conversationCount,
      messages: messageCount,
      orders: orderCount,
      customers: customerCount,
      botFlows: botFlowCount,
    },
  })
})

export const POST = withErrors(async (request: NextRequest) => {
  const admin = await requirePlatformAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const [tenants, plans, staff] = await Promise.all([
    raw.tenant.findMany({
      include: {
        _count: {
          select: {
            members: true,
            subscriptions: true,
            addons: true,
          },
        },
      },
    }),
    raw.plan.findMany(),
    raw.staff.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    }),
  ])

  const dump = {
    exportedAt: new Date().toISOString(),
    exportedBy: admin.name,
    version: "2.8.0",
    platform: "app.fizmoh.cloud",
    tenants,
    plans,
    staff,
  }

  const jsonString = JSON.stringify(dump, null, 2)
  const filename = `fizmoh_platform_snapshot_${new Date().toISOString().replace(/[:.]/g, "-")}.json`

  return new NextResponse(jsonString, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
})
