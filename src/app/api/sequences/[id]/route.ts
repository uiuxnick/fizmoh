import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant, PLATFORM } from "@/lib/tenant"
import { withModule } from "@/lib/entitlements"
import { getTenantSequences, saveTenantSequence, deleteTenantSequence } from "@/lib/sequences"

const CAMPAIGN_EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "ADMIN", "MANAGER", "MARKETING", "PLATFORM"]

export const GET = withErrors(withModule("BROADCAST", async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const tenantId = currentTenant()?.tenantId || PLATFORM
  const sequences = await getTenantSequences(tenantId)
  const sequence = sequences.find(s => s.id === id)

  if (!sequence) {
    return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
  }

  return NextResponse.json({ sequence })
}))

export const PATCH = withErrors(withModule("BROADCAST", async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenant = currentTenant()
  const role = (tenant?.role || session.role || "").toUpperCase()
  if (role && !CAMPAIGN_EDIT_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions to manage sequences" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const tenantId = tenant?.tenantId || PLATFORM

  const updated = await saveTenantSequence(tenantId, {
    ...body,
    id,
  })

  return NextResponse.json({ sequence: updated })
}))

export const DELETE = withErrors(withModule("BROADCAST", async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenant = currentTenant()
  const role = (tenant?.role || session.role || "").toUpperCase()
  if (role && !CAMPAIGN_EDIT_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions to manage sequences" }, { status: 403 })
  }

  const { id } = await params
  const tenantId = tenant?.tenantId || PLATFORM
  await deleteTenantSequence(tenantId, id)

  return NextResponse.json({ success: true })
}))
