import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant, PLATFORM } from "@/lib/tenant"
import {
  analyzeConversationForLearning,
  saveLearnedKnowledge,
  LearnedFact,
} from "@/lib/chat-training"

export const GET = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const tenantId = currentTenant()?.tenantId || PLATFORM

  const learnings = await analyzeConversationForLearning(id, tenantId)

  return NextResponse.json({
    conversationId: id,
    candidates: learnings,
    count: learnings.length,
  })
})

export const POST = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const tenantId = currentTenant()?.tenantId || PLATFORM

  const learnings: LearnedFact[] = Array.isArray(body.learnings) ? body.learnings : []
  if (learnings.length === 0) {
    return NextResponse.json({ error: "No learnings provided to save" }, { status: 400 })
  }

  const staffId = typeof session.staffId === "string" ? session.staffId : undefined
  const saved = await saveLearnedKnowledge(tenantId, id, learnings, staffId)

  return NextResponse.json({
    success: true,
    sourceId: saved.sourceId,
    chunkCount: saved.chunkCount,
  })
})
