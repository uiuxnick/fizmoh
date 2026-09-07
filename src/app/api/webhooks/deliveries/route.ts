import { NextRequest, NextResponse } from "next/server"
import { db, raw } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { requirePlatformAdmin } from "@/app/api/platform/tenants/route"

export const GET = withErrors(async (request: NextRequest) => {
  const isPlatformAdmin = await requirePlatformAdmin(request)
  const tenant = currentTenant()
  const status = new URL(request.url).searchParams.get("status")

  if (isPlatformAdmin) {
    const deliveries = await raw.webhookDelivery.findMany({
      where: { ...(status && status !== "ALL" ? { status } : {}) },
      orderBy: { receivedAt: "desc" },
      take: 100,
    })
    return NextResponse.json({ deliveries })
  }

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  }

  const deliveries = await db.webhookDelivery.findMany({
    where: {
      tenantId: tenant.tenantId,
      ...(status && status !== "ALL" ? { status } : {}),
    },
    orderBy: { receivedAt: "desc" },
    take: 100,
  })
  return NextResponse.json({ deliveries })
})
