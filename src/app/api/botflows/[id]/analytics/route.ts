import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

import { computeFlowAnalytics } from "@/lib/flow-analytics"

export const GET = withErrors(withModule("FLOWS", async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })

  const { id } = await params
  const flow = await db.botFlow.findUnique({
    where: { id },
    select: { id: true, name: true, nodes: true, publishedNodes: true },
  })
  if (!flow) return NextResponse.json({ error: "Flow not found" }, { status: 404 })

  // Extract all node IDs from current or published graph
  let allNodeIds: string[] = []
  try {
    const rawNodes = flow.nodes || flow.publishedNodes
    const parsed = typeof rawNodes === "string" ? JSON.parse(rawNodes) : rawNodes
    if (Array.isArray(parsed)) {
      allNodeIds = parsed.map((n: any) => n.id).filter(Boolean)
    }
  } catch {}

  const runs = await db.flowRun.findMany({
    where: { flowId: id, tenantId: tenant.tenantId },
    select: {
      id: true,
      status: true,
      currentNodeId: true,
      path: true,
      startedAt: true,
      endedAt: true,
    },
    orderBy: { startedAt: "desc" },
    take: 500,
  })

  const analytics = computeFlowAnalytics(id, runs, allNodeIds)

  return NextResponse.json({
    analytics,
  })
}))
