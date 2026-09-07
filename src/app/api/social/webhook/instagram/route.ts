import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { getConfigValue } from "@/lib/app-config"
import { verifySocialWebhookSignature } from "@/lib/social/social-webhook-verify"
import { withSocialAccountTenant, isRouteError, processInboundSocialMessage } from "@/lib/social/social-engine"
import { processInboundSocialComment } from "@/lib/social/social-comments"
import { instagramAdapter } from "@/lib/social/instagram-adapter"
import type { InboundSocialMessage, InboundSocialComment } from "@/lib/social/types"

function mapAttachmentType(metaType: string | undefined): "IMAGE" | "VIDEO" | "AUDIO" | "FILE" {
  if (metaType === "image") return "IMAGE"
  if (metaType === "video") return "VIDEO"
  if (metaType === "audio") return "AUDIO"
  return "FILE"
}

export const GET = withErrors(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")
  const verifyToken = await getConfigValue("social_webhook_verify_token")

  if (mode === "subscribe" && verifyToken && token === verifyToken) return new NextResponse(challenge, { status: 200 })
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
})

/** Instagram DMs and comments — signed with the Instagram app's own secret, a separate app identity from the Facebook one. */
export const POST = withErrors(async (request: NextRequest) => {
  const rawBody = await request.text()
  const signature = request.headers.get("x-hub-signature-256")
  if (!(await verifySocialWebhookSignature(rawBody, signature, "meta_instagram_app_secret"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const body = JSON.parse(rawBody || "{}")
  if (body.object !== "instagram") return NextResponse.json({ ok: true })

  for (const entry of body.entry || []) {
    const igId = String(entry.id)

    for (const event of entry.messaging || []) {
      if (event.message?.is_echo || String(event.sender?.id) === igId) continue
      const attachment = event.message?.attachments?.[0]
      if (!event.message?.text && !attachment) continue
      const result = await withSocialAccountTenant("INSTAGRAM", igId, async ({ account }) => {
        const { decryptSecret } = await import("@/lib/secret-box")
        const igToken = decryptSecret(account.accessToken)
        const senderName = await instagramAdapter.fetchSenderName(igToken, String(event.sender.id))
        const inbound: InboundSocialMessage = {
          channel: "INSTAGRAM", recipientAccountId: igId, senderExternalId: String(event.sender.id),
          senderName, externalMessageId: String(event.message.mid), text: event.message.text || null,
          mediaUrl: attachment?.payload?.url || null,
          mediaType: attachment ? mapAttachmentType(attachment.type) : null,
          timestamp: new Date(event.timestamp || Date.now()),
        }
        return processInboundSocialMessage(inbound)
      })
      if (isRouteError(result)) console.error("Instagram webhook:", result.error)
    }

    for (const change of entry.changes || []) {
      if (change.field !== "comments" || !change.value?.text) continue
      const inbound: InboundSocialComment = {
        channel: "INSTAGRAM", recipientAccountId: igId, commentId: String(change.value.id),
        parentPostId: change.value.media?.id ? String(change.value.media.id) : null,
        fromExternalId: String(change.value.from?.id || ""), fromName: change.value.from?.username || null,
        text: String(change.value.text), timestamp: new Date(),
      }
      const result = await withSocialAccountTenant("INSTAGRAM", igId, () => processInboundSocialComment(inbound))
      if (isRouteError(result)) console.error("Instagram comment webhook:", result.error)
    }
  }

  return NextResponse.json({ ok: true })
})
