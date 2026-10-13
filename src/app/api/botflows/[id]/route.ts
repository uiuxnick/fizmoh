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
  if (flow.tenantId && flow.tenantId !== tenant.tenantId && tenant.role !== "PLATFORM") {
    return NextResponse.json({ error: "Flow not found" }, { status: 404 })
  }
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
  if (existing.tenantId && existing.tenantId !== tenant.tenantId && tenant.role !== "PLATFORM") {
    return NextResponse.json({ error: "Flow not found" }, { status: 404 })
  }

  const data: Record<string, unknown> = {}
  if (!existing.tenantId) {
    data.tenantId = tenant.tenantId
  }
  const selectedConfig = parseJson(body.triggerConfig ?? existing.triggerConfig) as { channels?: string[] }
  const scheduleError = validateSchedule(body.trigger ?? existing.trigger, selectedConfig)
  if (scheduleError) return NextResponse.json({ error: scheduleError }, { status: 400 })
  const selectedChannels = selectedConfig?.channels || ["WHATSAPP"]
  if (!Array.isArray(selectedChannels) || !selectedChannels.length || selectedChannels.some(c => !["WHATSAPP", "FACEBOOK", "INSTAGRAM"].includes(c))) return NextResponse.json({ error: "Choose at least one supported channel" }, { status: 400 })
  if (selectedChannels.some(c => c !== "WHATSAPP")) {
    const { SOCIAL_FLOW_NODES } = await import("@/lib/flow-delivery")
    if (normalizeFlowGraph(body.nodes ?? existing.nodes, body.edges ?? existing.edges).nodes.some(n => !SOCIAL_FLOW_NODES.has(n.type))) return NextResponse.json({ error: "This flow uses a node unavailable on Facebook or Instagram." }, { status: 422 })
  }

  const currentNodes = body.nodes !== undefined ? body.nodes : existing.nodes
  const currentEdges = body.edges !== undefined ? body.edges : existing.edges
  const graph = normalizeFlowGraph(parseJson(currentNodes), parseJson(currentEdges))

  const wantsPublish = body.publish === true || body.action === "publish"
  if (wantsPublish) {
    data.publishedNodes = JSON.stringify(graph.nodes)
    data.publishedEdges = JSON.stringify(graph.edges)
    data.publishedAt = new Date()
    data.version = { increment: 1 }
  } else if (existing.isActive && !existing.publishedAt && (body.nodes !== undefined || body.edges !== undefined)) {
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
  if (body.isActive !== undefined) data.isActive = body.isActive === true

  if (body.triggerConfig !== undefined) data.triggerConfig = JSON.stringify(parseJson(body.triggerConfig) ?? {})
  if (body.nodes !== undefined) data.nodes = JSON.stringify(graph.nodes)
  if (body.edges !== undefined) data.edges = JSON.stringify(graph.edges)

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  const willBeActive = data.isActive !== undefined ? data.isActive === true : existing.isActive
  if (willBeActive && !existing.publishedAt && !data.publishedAt) {
    const issues = validateFlow(graph.nodes, graph.edges)
    const errors = issues.filter(issue => issue.level === "error")
    if (errors.length > 0) {
      return NextResponse.json(
        { error: "This flow cannot be activated yet", issues, canSaveAsDraft: true },
        { status: 422 },
      )
    }
  }

  const updated = await db.botFlow.update({ where: { id }, data })
  return NextResponse.json({ flow: updated, issues: validateFlow(graph.nodes, graph.edges) })
}))

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

  const existing = await db.botFlow.findUnique({ where: { id } })
  if (!existing || (existing.tenantId && existing.tenantId !== tenant.tenantId && tenant.role !== "PLATFORM")) {
    return NextResponse.json({ error: "No such flow" }, { status: 404 })
  }

  const issues = validateFlow(parseJson(existing.nodes), parseJson(existing.edges))
  const errors = issues.filter(issue => issue.level === "error")
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "This flow cannot be published yet", issues },
      { status: 422 },
    )
  }

  const published = await db.botFlow.update({
    where: { id },
    data: {
      tenantId: existing.tenantId || tenant.tenantId,
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
  const existing = await db.botFlow.findUnique({ where: { id } })
  if (!existing || (existing.tenantId && existing.tenantId !== tenant.tenantId && tenant.role !== "PLATFORM")) {
    return NextResponse.json({ error: "Flow not found" }, { status: 404 })
  }
  await db.botFlow.delete({ where: { id } })
  return NextResponse.json({ success: true })
}))
