import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { groupsService } from "@/modules/whatsapp-groups"
import { handleGroupError, requireGroupAdmin } from "@/modules/whatsapp-groups/auth-guard"

export const GET = withErrors(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireGroupAdmin(request)
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const requests = await groupsService.listJoinRequests(id)
    return NextResponse.json({ requests })
  } catch (err) {
    return handleGroupError(err)
  }
})

export const POST = withErrors(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireGroupAdmin(request)
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const body = await request.json()
    const action = body.action === "reject" ? "reject" : "approve"
    const joinRequestIds: string[] = Array.isArray(body.joinRequestIds)
      ? body.joinRequestIds.map(String)
      : body.joinRequestId
        ? [String(body.joinRequestId)]
        : []
    const res = await groupsService.handleJoinRequests(id, action, joinRequestIds)
    return NextResponse.json(res)
  } catch (err) {
    return handleGroupError(err)
  }
})
