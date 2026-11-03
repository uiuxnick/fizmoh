import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant, PLATFORM } from "@/lib/tenant"
import {
  getAutoLearnConfig,
  saveAutoLearnConfig,
  getLearningsQueue,
  approveLearning,
  dismissLearning,
  batchApproveLearnings,
  batchDismissLearnings,
  handleConversationAutoLearn,
} from "@/lib/chat-training"

export const GET = withErrors(async (req: NextRequest) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = currentTenant()?.tenantId || PLATFORM
  const config = await getAutoLearnConfig(tenantId)
  const queue = await getLearningsQueue(tenantId, "ALL")

  const pendingCount = queue.filter(q => q.status === "PENDING").length
  const approvedCount = queue.filter(q => q.status === "APPROVED").length
  const dismissedCount = queue.filter(q => q.status === "DISMISSED").length

  return NextResponse.json({
    autoLearnEnabled: config.enabled,
    config,
    queue,
    stats: {
      pendingCount,
      approvedCount,
      dismissedCount,
      totalCount: queue.length,
    },
  })
})

export const POST = withErrors(async (req: NextRequest) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const tenantId = currentTenant()?.tenantId || PLATFORM

  // Support triggering knowledge mining from a specific conversation
  if (body.action === "mine" || (body.conversationId && body.action !== "save_config")) {
    const convId = body.conversationId
    if (!convId) return NextResponse.json({ error: "conversationId is required" }, { status: 400 })
    const result = await handleConversationAutoLearn(convId, tenantId)
    const queue = await getLearningsQueue(tenantId, "ALL")
    return NextResponse.json({
      success: true,
      result,
      queue,
    })
  }

  const updatedConfig = await saveAutoLearnConfig(tenantId, {
    enabled: body.enabled !== undefined ? body.enabled === true : undefined,
    requireApproval: body.requireApproval !== undefined ? body.requireApproval === true : undefined,
    minConfidence: typeof body.minConfidence === "number" ? body.minConfidence : undefined,
  })

  return NextResponse.json({
    success: true,
    autoLearnEnabled: updatedConfig.enabled,
    config: updatedConfig,
  })
})

export const PATCH = withErrors(async (req: NextRequest) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = currentTenant()?.tenantId || PLATFORM
  const body = await req.json().catch(() => ({}))
  const { action, candidateId, candidateIds, question, answer, topic } = body
  const staffId = session.staffId || (typeof session.sub === "string" ? session.sub : undefined)

  if (action === "approve") {
    if (!candidateId) return NextResponse.json({ error: "candidateId is required" }, { status: 400 })
    const result = await approveLearning(tenantId, candidateId, staffId, {
      question,
      answer,
      topic,
    })
    return NextResponse.json(result)
  }

  if (action === "dismiss") {
    if (!candidateId) return NextResponse.json({ error: "candidateId is required" }, { status: 400 })
    const result = await dismissLearning(tenantId, candidateId, staffId)
    return NextResponse.json(result)
  }

  if (action === "batch_approve") {
    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json({ error: "candidateIds array is required" }, { status: 400 })
    }
    const result = await batchApproveLearnings(tenantId, candidateIds, staffId)
    return NextResponse.json({ success: true, approvedCount: result.approvedCount })
  }

  if (action === "batch_dismiss") {
    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json({ error: "candidateIds array is required" }, { status: 400 })
    }
    const result = await batchDismissLearnings(tenantId, candidateIds, staffId)
    return NextResponse.json({ success: true, dismissedCount: result.dismissedCount })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
})
