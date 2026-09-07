import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

export const GET = withErrors(withModule("FLOWS", async (request: NextRequest) => {
  const tenant = currentTenant(); if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  const status = new URL(request.url).searchParams.get("status")
  const runs = await db.flowRun.findMany({ where: { tenantId: tenant.tenantId, ...(status ? { status } : {}) }, include: { flow: { select: { id: true, name: true } } }, orderBy: { startedAt: "desc" }, take: 100 })
  const conversations = await db.conversation.findMany({ where: { tenantId: tenant.tenantId, id: { in: [...new Set(runs.map(run => run.conversationId))] } }, select: { id: true, channel: true } })
  const channels = new Map(conversations.map(conversation => [conversation.id, conversation.channel]))
  return NextResponse.json({ runs: runs.map(run => ({ ...run, channel: channels.get(run.conversationId) || null })) })
}))
