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
    const group = await groupsService.getAndSyncGroup(id)
    return NextResponse.json({ group })
  } catch (err) {
    return handleGroupError(err)
  }
})

export const DELETE = withErrors(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireGroupAdmin(request)
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const group = await groupsService.deleteGroup(id)
    return NextResponse.json({ deleted: true, group })
  } catch (err) {
    return handleGroupError(err)
  }
})
