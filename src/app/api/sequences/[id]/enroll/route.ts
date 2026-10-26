import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant, PLATFORM } from "@/lib/tenant"
import { withModule } from "@/lib/entitlements"
import { batchEnrollSubscribers } from "@/lib/sequences"

const ENROLL_ROLES = ["OWNER", "SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF", "AGENT", "MARKETING", "PLATFORM"]

export const POST = withErrors(withModule("BROADCAST", async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenant = currentTenant()
  const role = (tenant?.role || session.role || "").toUpperCase()
  if (role && !ENROLL_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions to enroll customers in sequences" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { customerIds, triggerFirstStepImmediately = true } = body

  if (!Array.isArray(customerIds) || customerIds.length === 0) {
    return NextResponse.json({ error: "customerIds array is required" }, { status: 400 })
  }

  const tenantId = tenant?.tenantId || PLATFORM
  const result = await batchEnrollSubscribers(tenantId, id, customerIds, triggerFirstStepImmediately)

  return NextResponse.json(result)
}))
