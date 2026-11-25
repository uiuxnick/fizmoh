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
    const messages = await groupsService.listMessages(id)
    return NextResponse.json({ messages })
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
    const body = await request.json()
    const message = await groupsService.sendMessage(id, {
      type: body.type || "text",
      body: body.body,
      mediaUrl: body.mediaUrl,
      mediaId: body.mediaId,
      caption: body.caption,
      filename: body.filename,
      templateName: body.templateName,
      templateLang: body.templateLang,
      templateVariables: body.templateVariables,
      senderWaId: auth.session.phone || auth.session.email || null,
    })
    return NextResponse.json({ message }, { status: 201 })
  } catch (err) {
    return handleGroupError(err)
  }
}
