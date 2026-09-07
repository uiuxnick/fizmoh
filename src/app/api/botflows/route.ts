import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { validateFlow } from "@/lib/flow-validate"
import { normalizeFlowGraph } from "@/lib/flow-normalizer"
import { validateSchedule } from "@/lib/flow-schedule-config"
import { currentTenant } from "@/lib/tenant"

const TRIGGERS = ["KEYWORD", "INTENT", "NEW_CONVERSATION", "SCHEDULE"] as const

function jsonValue(value: unknown, fallback: unknown) {
  if (value === undefined || value === null) return fallback
  if (typeof value === "string") {
    try { return JSON.parse(value) } catch { return fallback }
  }
  return value
}

export const GET = withErrors(withModule("FLOWS", async () => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  const flows = await db.botFlow.findMany({ orderBy: { priority: "desc" } })
  return NextResponse.json({ flows })
}))

export const POST = withErrors(withModule("FLOWS", async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !["OWNER", "SUPER_ADMIN", "PLATFORM", "MANAGER", "MARKETING"].includes(tenant.role)) {
    return NextResponse.json({ error: "You do not have permission to manage flows" }, { status: 403 })
  }
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid flow payload" }, { status: 400 })
  const name = String(body.name ?? "").trim()
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })
  if (!TRIGGERS.includes(body.trigger)) return NextResponse.json({ error: "Unknown trigger" }, { status: 400 })
  const graph = normalizeFlowGraph(jsonValue(body.nodes, []), jsonValue(body.edges, []))
  const selectedChannels = (jsonValue(body.triggerConfig, {}) as { channels?: string[] }).channels || ["WHATSAPP"]
  if (!Array.isArray(selectedChannels) || !selectedChannels.length || selectedChannels.some(c => !["WHATSAPP", "FACEBOOK", "INSTAGRAM"].includes(c))) return NextResponse.json({ error: "Choose at least one supported channel" }, { status: 400 })
  if (selectedChannels.some(c => c !== "WHATSAPP")) {
    const { SOCIAL_FLOW_NODES } = await import("@/lib/flow-delivery")
    if (graph.nodes.some(n => !SOCIAL_FLOW_NODES.has(n.type))) return NextResponse.json({ error: "This flow uses a node unavailable on Facebook or Instagram. Use messages, choices, questions, conditions, media, tags or handoff." }, { status: 422 })
  }
  const scheduleError = validateSchedule(body.trigger, jsonValue(body.triggerConfig, {}))
  if (scheduleError) return NextResponse.json({ error: scheduleError }, { status: 400 })
  const nodes = graph.nodes
  const edges = graph.edges
  if (!Array.isArray(nodes) || !Array.isArray(edges)) return NextResponse.json({ error: "Nodes and edges must be arrays" }, { status: 400 })

  /*
   * A broken flow may be saved. It may not be switched on.
   *
   * Every bot fault this week was structural and silent — a condition whose
   * branches carried no labels, a step with nothing after it, a graph the
   * engine could not read. The builder shows none of that, so it was found by
   * customers. Drafting something half-finished is normal work; making it live
   * in front of customers is the part worth stopping.
   */
  const issues = validateFlow(nodes, edges)
  const errors = issues.filter(issue => issue.level === "error")
  const wantsActive = body.isActive ?? false
  if (wantsActive && errors.length > 0) {
    return NextResponse.json(
      { error: "This flow cannot be activated yet", issues, canSaveAsDraft: true },
      { status: 422 },
    )
  }

  const flow = await db.botFlow.create({
    data: {
      name: name.slice(0, 200),
      description: body.description || null,
      trigger: body.trigger,
      triggerConfig: JSON.stringify(jsonValue(body.triggerConfig, {})),
      nodes: JSON.stringify(nodes),
      edges: JSON.stringify(edges),
      priority: Number(body.priority) || 0,
      isActive: body.isActive ?? false,
    },
  })
  return NextResponse.json({ flow, issues }, { status: 201 })
}))
