import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { validateFlow } from "@/lib/flow-validate"
import { normalizeFlowGraph } from "@/lib/flow-normalizer"
import { validateSchedule } from "@/lib/flow-schedule-config"
import { currentTenant } from "@/lib/tenant"

const TRIGGERS = ["KEYWORD", "INTENT", "NEW_CONVERSATION", "SCHEDULE"]

function parseJson(value: unknown): unknown {
  if (typeof value !== "string") return value
  try { return JSON.parse(value) } catch { return [] }
}

export const GET = withErrors(withModule("FLOWS", async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  const { id } = await params
  const flow = await db.botFlow.findUnique({ where: { id } })
  if (!flow) return NextResponse.json({ error: "Flow not found" }, { status: 404 })
  return NextResponse.json({ flow })
}))

export const PUT = withErrors(withModule("FLOWS", async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !["OWNER", "SUPER_ADMIN", "PLATFORM", "MANAGER", "MARKETING"].includes(tenant.role)) {
    return NextResponse.json({ error: "You do not have permission to manage flows" }, { status: 403 })
  }
  const { id } = await params
  const body = await request.json()
  const existing = await db.botFlow.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Flow not found" }, { status: 404 })

  const data: Record<string, unknown> = {}
  const selectedConfig = parseJson(body.triggerConfig ?? existing.triggerConfig) as { channels?: string[] }
  const scheduleError = validateSchedule(body.trigger ?? existing.trigger, selectedConfig)
  if (scheduleError) return NextResponse.json({ error: scheduleError }, { status: 400 })
  const selectedChannels = selectedConfig?.channels || ["WHATSAPP"]
  if (!Array.isArray(selectedChannels) || !selectedChannels.length || selectedChannels.some(c => !["WHATSAPP", "FACEBOOK", "INSTAGRAM"].includes(c))) return NextResponse.json({ error: "Choose at least one supported channel" }, { status: 400 })
  if (selectedChannels.some(c => c !== "WHATSAPP")) {
    const { SOCIAL_FLOW_NODES } = await import("@/lib/flow-delivery")
    if (normalizeFlowGraph(body.nodes ?? existing.nodes, body.edges ?? existing.edges).nodes.some(n => !SOCIAL_FLOW_NODES.has(n.type))) return NextResponse.json({ error: "This flow uses a node unavailable on Facebook or Instagram." }, { status: 422 })
  }
  if (existing.isActive && !existing.publishedAt && (body.nodes !== undefined || body.edges !== undefined)) {
    data.publishedNodes = existing.nodes
    data.publishedEdges = existing.edges
    data.publishedAt = new Date()
  }
  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })
    data.name = name.slice(0, 200)
  }
  if (body.description !== undefined) data.description = body.description ? String(body.description).slice(0, 1000) : null
  if (body.trigger !== undefined) {
    if (!TRIGGERS.includes(body.trigger)) return NextResponse.json({ error: "Unknown trigger" }, { status: 400 })
    data.trigger = body.trigger
  }
  if (body.priority !== undefined) data.priority = Number(body.priority) || 0
  // isActive is sent on its own by the list toggle, which previously updated
  // only local state and told the operator the flow was live when nothing had
  // been saved.
  if (body.isActive !== undefined) data.isActive = body.isActive === true

  // The engine accepts these as either JSON strings or arrays; keep writing
  // strings so existing rows and new ones stay the same shape.
  if (body.triggerConfig !== undefined) data.triggerConfig = JSON.stringify(parseJson(body.triggerConfig) ?? {})
  if (body.nodes !== undefined || body.edges !== undefined) {
    const currentNodes = body.nodes !== undefined ? body.nodes : existing.nodes
    const currentEdges = body.edges !== undefined ? body.edges : existing.edges
    const graph = normalizeFlowGraph(parseJson(currentNodes), parseJson(currentEdges))
    if (body.nodes !== undefined) data.nodes = JSON.stringify(graph.nodes)
    if (body.edges !== undefined) data.edges = JSON.stringify(graph.edges)
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  /*
   * Checked against what the flow will actually be, not what was sent.
   *
   * The list toggle sends isActive on its own, with no graph — so validating
   * only the payload would wave through switching on a flow whose steps are
   * broken. The stored graph is used whenever the request does not carry one.
   */
  const willBeActive = data.isActive !== undefined ? data.isActive === true : existing.isActive
  if (willBeActive && !existing.publishedAt && !data.publishedAt) {
    const nodes = data.nodes !== undefined ? data.nodes : existing.nodes
    const edges = data.edges !== undefined ? data.edges : existing.edges
    const issues = validateFlow(parseJson(nodes), parseJson(edges))
    const errors = issues.filter(issue => issue.level === "error")
    if (errors.length > 0) {
      return NextResponse.json(
        { error: "This flow cannot be activated yet", issues, canSaveAsDraft: true },
        { status: 422 },
      )
    }
  }

  const updated = await db.botFlow.update({ where: { id }, data })
  return NextResponse.json({ flow: updated, issues: validateFlow(parseJson(data.nodes ?? existing.nodes), parseJson(data.edges ?? existing.edges)) })
}))

/**
 * Publishes the draft: makes what the editor holds the version customers meet.
 *
 * Saving used to be publishing — an edit to an active flow changed what people
 * were being asked mid-conversation, with no way to work on it first. The
 * engine now runs the published copy when there is one, so this is the moment
 * a change goes live, and it is deliberate.
 *
 * The graph is validated as strictly as activation is: a draft may be saved
 * broken, which is the point of a draft, but it may not be published broken.
 */
export const POST = withErrors(withModule("FLOWS", async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !["OWNER", "SUPER_ADMIN", "PLATFORM", "MANAGER"].includes(tenant.role)) {
    return NextResponse.json({ error: "Only workspace administrators can publish a flow" }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  if (body?.action !== "publish") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }

  const existing = await db.botFlow.findFirst({ where: { id, tenantId: tenant.tenantId } })
  if (!existing) return NextResponse.json({ error: "No such flow" }, { status: 404 })

  const issues = validateFlow(parseJson(existing.nodes), parseJson(existing.edges))
  const errors = issues.filter(issue => issue.level === "error")
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "This flow cannot be published yet", issues },
      { status: 422 },
    )
  }

  // Prisma will not accept a nullable Json straight back as an input value.
  // A flow with no graph cannot reach here — validation above rejects it — so
  // this is a type narrowing, not a fallback.
  const published = await db.botFlow.update({
    where: { id },
    data: {
      publishedNodes: (existing.nodes ?? Prisma.DbNull) as Prisma.InputJsonValue,
      publishedEdges: (existing.edges ?? Prisma.DbNull) as Prisma.InputJsonValue,
      publishedAt: new Date(),
      version: { increment: 1 },
    },
  })
  return NextResponse.json({ flow: published, issues })
}))

export const DELETE = withErrors(withModule("FLOWS", async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !["OWNER", "SUPER_ADMIN", "PLATFORM", "MANAGER"].includes(tenant.role)) {
    return NextResponse.json({ error: "Only workspace administrators can delete flows" }, { status: 403 })
  }
  const { id } = await params
  await db.botFlow.delete({ where: { id } })
  return NextResponse.json({ success: true })
}))
