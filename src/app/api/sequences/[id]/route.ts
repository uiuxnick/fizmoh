import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant, PLATFORM } from "@/lib/tenant"
import { getTenantSequences, saveTenantSequence, deleteTenantSequence } from "@/lib/sequences"

export const GET = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
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
})

export const PATCH = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const tenantId = currentTenant()?.tenantId || PLATFORM

  const updated = await saveTenantSequence(tenantId, {
    ...body,
    id,
  })

  return NextResponse.json({ sequence: updated })
})

export const DELETE = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const tenantId = currentTenant()?.tenantId || PLATFORM
  await deleteTenantSequence(tenantId, id)

  return NextResponse.json({ success: true })
})
