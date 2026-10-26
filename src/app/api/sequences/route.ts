import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant, PLATFORM } from "@/lib/tenant"
import { withModule } from "@/lib/entitlements"
import { getTenantSequences, saveTenantSequence, getSequenceStats } from "@/lib/sequences"

const CAMPAIGN_EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "ADMIN", "MANAGER", "MARKETING", "PLATFORM"]

export const GET = withErrors(withModule("BROADCAST", async (req: NextRequest) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = currentTenant()?.tenantId || PLATFORM
  const sequences = await getTenantSequences(tenantId)
  const stats = await getSequenceStats(tenantId)

  return NextResponse.json({ sequences, stats })
}))

export const POST = withErrors(withModule("BROADCAST", async (req: NextRequest) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenant = currentTenant()
  const role = (tenant?.role || session.role || "").toUpperCase()
  if (role && !CAMPAIGN_EDIT_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions to manage sequences" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { sequence } = body
  if (!sequence || !sequence.name) {
    return NextResponse.json({ error: "Sequence name is required" }, { status: 400 })
  }

  const tenantId = currentTenant()?.tenantId || PLATFORM
  const saved = await saveTenantSequence(tenantId, sequence)

  return NextResponse.json({ sequence: saved })
}))
