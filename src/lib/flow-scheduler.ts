import { db } from "./db"
import { currentTenant } from "./tenant"
import { normalizeFlowGraph } from "./flow-normalizer"
import { resumeFlowAt } from "./botflow-engine"

export async function runScheduledBotFlows() {
  const tenantId = currentTenant()?.tenantId
  if (!tenantId) return { started: 0 }
  const flows = await db.botFlow.findMany({ where: { tenantId, isActive: true, trigger: "SCHEDULE" } })
  let started = 0
  for (const flow of flows) {
    let config: any
    try { config = typeof flow.triggerConfig === "string" ? JSON.parse(flow.triggerConfig) : flow.triggerConfig } catch { continue }
    const scheduledAt = new Date(config?.scheduledAt || "")
    if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt > new Date() || scheduledAt.getTime() < Date.now() - 86_400_000) continue
    const ids = Array.isArray(config?.conversationIds) ? config.conversationIds.filter((id: unknown) => typeof id === "string").slice(0, 100) : []
    if (!ids.length) continue
    const conversations = await db.conversation.findMany({ where: { tenantId, id: { in: ids }, channel: "WHATSAPP", botActive: true, automationPaused: false } })
    for (const conversation of conversations) {
      if (!conversation.customerId) continue
      const inbound = await db.message.findFirst({ where: { conversationId: conversation.id, direction: "INBOUND" }, orderBy: { createdAt: "desc" } })
      if (!inbound || Date.now() - inbound.createdAt.getTime() >= 86_400_000 || conversation.flowState) continue
      try {
        await db.botScheduleDispatch.create({ data: { tenantId, flowId: flow.id, conversationId: conversation.id, scheduledAt } })
      } catch (error: any) { if (error?.code === "P2002") continue; throw error }
      const graph = normalizeFlowGraph(flow.publishedNodes || flow.nodes, flow.publishedEdges || flow.edges)
      const start = graph.nodes.find(n => n.type === "TRIGGER")
      if (!start) continue
      try {
        await resumeFlowAt({ tenantId, flowId: flow.id, nodeId: start.id, conversationId: conversation.id, customerId: conversation.customerId, customerPhone: conversation.customerPhone, answers: {} })
        await db.botScheduleDispatch.update({ where: { flowId_conversationId_scheduledAt: { flowId: flow.id, conversationId: conversation.id, scheduledAt } }, data: { status: "DONE" } })
        started++
      } catch {
        await db.botScheduleDispatch.update({ where: { flowId_conversationId_scheduledAt: { flowId: flow.id, conversationId: conversation.id, scheduledAt } }, data: { status: "FAILED" } })
      }
    }
  }
  return { started }
}
