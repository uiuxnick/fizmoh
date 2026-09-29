import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant, PLATFORM } from "@/lib/tenant"
import {
  getSubscriberEnrollments,
  enrollSubscriberInSequence,
  updateSubscriberEnrollment,
  getTenantSequences,
} from "@/lib/sequences"

export const GET = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const tenantId = currentTenant()?.tenantId || PLATFORM
  const enrollments = await getSubscriberEnrollments(id)
  const availableSequences = await getTenantSequences(tenantId)

  return NextResponse.json({
    enrollments,
    availableSequences,
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

  // Action can be: "enroll", "pause", "resume", "cancel", "trigger_next"
  const { action = "enroll", sequenceId } = body

  if (!sequenceId) {
    return NextResponse.json({ error: "sequenceId is required" }, { status: 400 })
  }

  if (action === "enroll") {
    const triggerNow = body.triggerFirstStepImmediately !== false
    const result = await enrollSubscriberInSequence(id, sequenceId, tenantId, triggerNow)
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Enrollment failed" }, { status: 400 })
    }
    return NextResponse.json({ enrollment: result.enrollment })
  }

  if (["pause", "resume", "cancel", "trigger_next"].includes(action)) {
    const result = await updateSubscriberEnrollment(id, sequenceId, action as any, tenantId)
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Action failed" }, { status: 400 })
    }
    return NextResponse.json({ enrollment: result.enrollment })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
})
