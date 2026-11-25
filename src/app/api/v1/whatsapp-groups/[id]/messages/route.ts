import { NextResponse } from "next/server"
import { mobileRoute, MobileApiError } from "@/lib/mobile-api/guard"
import { GroupFeatureError, groupsService, isWhatsAppGroupsEnabled } from "@/modules/whatsapp-groups"

export const OPTIONS = mobileRoute({}, async () => new NextResponse(null, { status: 204 }))

export const GET = mobileRoute({ requiredModule: "INBOX" }, async (_request, context) => {
  if (!isWhatsAppGroupsEnabled()) {
    throw new MobileApiError(404, "FEATURE_DISABLED", "WhatsApp Groups is disabled.")
  }
  const { id } = await context.params
  try {
    const messages = await groupsService.listMessages(id)
    return NextResponse.json({ data: messages })
  } catch (err) {
    if (err instanceof GroupFeatureError) throw new MobileApiError(err.status, String(err.code || "GROUP_ERROR"), err.message)
    throw err
  }
})

export const POST = mobileRoute({ requiredModule: "INBOX", write: true }, async (request, context, auth) => {
  if (!isWhatsAppGroupsEnabled()) {
    throw new MobileApiError(404, "FEATURE_DISABLED", "WhatsApp Groups is disabled.")
  }
  const { id } = await context.params
  try {
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
      senderWaId: auth.email,
    })
    return NextResponse.json({ data: message }, { status: 201 })
  } catch (err) {
    if (err instanceof GroupFeatureError) throw new MobileApiError(err.status, String(err.code || "GROUP_ERROR"), err.message)
    throw err
  }
})
