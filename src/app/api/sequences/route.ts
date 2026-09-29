import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant, PLATFORM } from "@/lib/tenant"
import { getTenantSequences, saveTenantSequence } from "@/lib/sequences"

export const GET = withErrors(async (req: NextRequest) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = currentTenant()?.tenantId || PLATFORM
  const sequences = await getTenantSequences(tenantId)

  return NextResponse.json({ sequences })
})

export const POST = withErrors(async (req: NextRequest) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { sequence } = body
  if (!sequence || !sequence.name) {
    return NextResponse.json({ error: "Sequence name is required" }, { status: 400 })
  }

  const tenantId = currentTenant()?.tenantId || PLATFORM
  const saved = await saveTenantSequence(tenantId, sequence)

  return NextResponse.json({ sequence: saved })
})
