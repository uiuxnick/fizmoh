import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { resolveWaiterRequest } from "@/lib/restaurant"

const RESOLVE_ROLES = ["OWNER", "SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF", "AGENT", "CHAT_AGENT", "PLATFORM"]

export const GET = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ requests: [] })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") || "PENDING"
  const branchId = searchParams.get("branchId")

  const requests = await raw.restaurantWaiterRequest.findMany({
    where: {
      tenantId,
      ...(status !== "ALL" ? { status } : {}),
      ...(branchId ? { branchId } : {}),
    },
    include: {
      table: { select: { id: true, number: true, area: true, type: true, roomNumber: true } },
      branch: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return NextResponse.json({ requests })
}))

export const PUT = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })

  if (tenant.role && !RESOLVE_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions to resolve waiter requests" }, { status: 403 })
  }

  const body = await req.json()
  const { id, status, staffId } = body

  if (!id) return NextResponse.json({ error: "Request ID is required" }, { status: 400 })

  const updated = await resolveWaiterRequest(tenantId, id, staffId, status || "RESOLVED")

  return NextResponse.json({ request: updated, updated: true })
}))
