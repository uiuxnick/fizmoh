import { NextRequest, NextResponse } from "next/server"
import { groupsService } from "@/modules/whatsapp-groups"
import { handleGroupError, requireGroupAdmin } from "@/modules/whatsapp-groups/auth-guard"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireGroupAdmin(request)
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const body = await request.json()
    const res = await groupsService.sendInviteTemplate(id, {
      to: body.to,
      templateName: body.templateName,
      templateLang: body.templateLang,
    })
    return NextResponse.json(res)
  } catch (err) {
    return handleGroupError(err)
  }
}
