import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

export interface NodeAnalytics {
  nodeId: string
  impressions: number
  completions: number
  dropOffs: number
  dropOffRate: number
  passThroughRate: number
  avgDurationSeconds?: number
}

export interface FlowAnalyticsResponse {
  flowId: string
  totalRuns: number
  completedRuns: number
  waitingRuns: number
  failedRuns: number
  handoffRuns: number
  abandonedRuns: number
  overallCompletionRate: number
  overallDropOffRate: number
  nodeStats: Record<string, NodeAnalytics>
  topDropOffNodes: Array<{ nodeId: string; dropOffs: number; dropOffRate: number }>
  isSampleData?: boolean
}

export function computeFlowAnalytics(
  flowId: string,
  runs: Array<{
    id: string
    status: string
    currentNodeId?: string | null
    path?: any
    startedAt: Date
    endedAt?: Date | null
  }>,
  allNodeIds: string[] = []
): FlowAnalyticsResponse {
  const totalRuns = runs.length

  let completedRuns = 0
  let waitingRuns = 0
  let failedRuns = 0
  let handoffRuns = 0
  let abandonedRuns = 0

  const nodeStats: Record<string, NodeAnalytics> = {}

  // Initialize for all known nodes in flow graph
  for (const nodeId of allNodeIds) {
    nodeStats[nodeId] = {
      nodeId,
      impressions: 0,
      completions: 0,
      dropOffs: 0,
      dropOffRate: 0,
      passThroughRate: 100,
    }
  }

  for (const run of runs) {
    if (run.status === "DONE") completedRuns++
    else if (run.status === "WAITING") waitingRuns++
    else if (run.status === "FAILED") failedRuns++
    else if (run.status === "HANDOFF") handoffRuns++
    else abandonedRuns++

    // Process visited path
    const rawPath = Array.isArray(run.path) ? run.path : []
    const visitedNodes: string[] = rawPath.map(String).filter(Boolean)

    // Deduplicate path within a single run to count unique impressions
    const uniqueVisited = Array.from(new Set(visitedNodes))

    for (const nodeId of uniqueVisited) {
      if (!nodeStats[nodeId]) {
        nodeStats[nodeId] = {
          nodeId,
          impressions: 0,
          completions: 0,
          dropOffs: 0,
          dropOffRate: 0,
          passThroughRate: 100,
        }
      }
      nodeStats[nodeId].impressions++
    }

    // Determine drop-off location
    // If the run didn't finish (FAILED, abandoned, or timed out waiting),
    // mark drop-off at the terminal visited node or currentNodeId
    const isUnfinished = run.status !== "DONE" && run.status !== "HANDOFF"
    const terminalNode = run.currentNodeId || visitedNodes[visitedNodes.length - 1]

    if (isUnfinished && terminalNode) {
      if (!nodeStats[terminalNode]) {
        nodeStats[terminalNode] = {
          nodeId: terminalNode,
          impressions: 1,
          completions: 0,
          dropOffs: 0,
          dropOffRate: 0,
          passThroughRate: 100,
        }
      }
      nodeStats[terminalNode].dropOffs++
    }
  }

  // Calculate rates
  for (const nodeId of Object.keys(nodeStats)) {
    const stat = nodeStats[nodeId]
    stat.completions = Math.max(0, stat.impressions - stat.dropOffs)
    if (stat.impressions > 0) {
      stat.dropOffRate = Math.round((stat.dropOffs / stat.impressions) * 1000) / 10
      stat.passThroughRate = Math.round((stat.completions / stat.impressions) * 1000) / 10
    } else {
      stat.dropOffRate = 0
      stat.passThroughRate = 100
    }
  }

  const overallCompletionRate = totalRuns > 0
    ? Math.round((completedRuns / totalRuns) * 1000) / 10
    : 0

  const overallDropOffRate = totalRuns > 0
    ? Math.round(((totalRuns - completedRuns) / totalRuns) * 1000) / 10
    : 0

  const topDropOffNodes = Object.values(nodeStats)
    .filter(s => s.dropOffs > 0)
    .sort((a, b) => b.dropOffs - a.dropOffs)
    .slice(0, 5)
    .map(s => ({ nodeId: s.nodeId, dropOffs: s.dropOffs, dropOffRate: s.dropOffRate }))

  return {
    flowId,
    totalRuns,
    completedRuns,
    waitingRuns,
    failedRuns,
    handoffRuns,
    abandonedRuns,
    overallCompletionRate,
    overallDropOffRate,
    nodeStats,
    topDropOffNodes,
    isSampleData: false,
  }
}

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
