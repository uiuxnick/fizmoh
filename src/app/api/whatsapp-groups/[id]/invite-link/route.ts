import { NextRequest, NextResponse } from "next/server"
import { groupsService } from "@/modules/whatsapp-groups"
import { handleGroupError, requireGroupAdmin } from "@/modules/whatsapp-groups/auth-guard"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireGroupAdmin(request)
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const res = await groupsService.getInviteLink(id)
    return NextResponse.json(res)
  } catch (err) {
    return handleGroupError(err)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireGroupAdmin(request)
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const res = await groupsService.resetInviteLink(id)
    return NextResponse.json(res)
  } catch (err) {
    return handleGroupError(err)
  }
}
