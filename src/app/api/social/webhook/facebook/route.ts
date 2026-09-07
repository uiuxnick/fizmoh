import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { getConfigValue } from "@/lib/app-config"
import { verifySocialWebhookSignature } from "@/lib/social/social-webhook-verify"
import { withSocialAccountTenant, isRouteError, processInboundSocialMessage } from "@/lib/social/social-engine"
import { processInboundSocialComment } from "@/lib/social/social-comments"
import { messengerAdapter } from "@/lib/social/messenger-adapter"
import type { InboundSocialMessage, InboundSocialComment } from "@/lib/social/types"

/** Meta's attachment `type` values, mapped to this platform's own media-type vocabulary. */
function mapAttachmentType(metaType: string | undefined): "IMAGE" | "VIDEO" | "AUDIO" | "FILE" {
  if (metaType === "image") return "IMAGE"
  if (metaType === "video") return "VIDEO"
  if (metaType === "audio") return "AUDIO"
  return "FILE"
}

/** The webhook verification handshake — same challenge/response contract every Meta product uses. */
export const GET = withErrors(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")
  const verifyToken = await getConfigValue("social_webhook_verify_token")

  if (mode === "subscribe" && verifyToken && token === verifyToken) return new NextResponse(challenge, { status: 200 })
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
})

/**
 * Facebook Page events — Messenger DMs (`messaging`) and Page feed comments
 * (`changes`, field "feed"). One entry per Page the delivery covers; each
 * entry's own Page id resolves which tenant it belongs to, since a public
 * webhook carries no session of its own.
 */
export const POST = withErrors(async (request: NextRequest) => {
  const rawBody = await request.text()
  const signature = request.headers.get("x-hub-signature-256")
  if (!(await verifySocialWebhookSignature(rawBody, signature, "meta_app_secret"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const body = JSON.parse(rawBody || "{}")
  if (body.object !== "page") return NextResponse.json({ ok: true }) // not ours to handle

  for (const entry of body.entry || []) {
    const pageId = String(entry.id)

    for (const event of entry.messaging || []) {
      const attachment = event.message?.attachments?.[0]
      if (!event.message?.text && !attachment) continue // read receipts, delivery confirmations, echoes — nothing to show
      const result = await withSocialAccountTenant("FACEBOOK", pageId, async ({ account }) => {
        const { decryptSecret } = await import("@/lib/secret-box")
        const pageToken = decryptSecret(account.accessToken)
        const senderName = await messengerAdapter.fetchSenderName(pageToken, String(event.sender.id))
        const inbound: InboundSocialMessage = {
          channel: "FACEBOOK", recipientAccountId: pageId, senderExternalId: String(event.sender.id),
          senderName, externalMessageId: String(event.message.mid), text: event.message.text || null,
          mediaUrl: attachment?.payload?.url || null,
          mediaType: attachment ? mapAttachmentType(attachment.type) : null,
          timestamp: new Date(event.timestamp || Date.now()),
        }
        return processInboundSocialMessage(inbound)
      })
      if (isRouteError(result)) console.error("Facebook webhook:", result.error)
    }

    for (const change of entry.changes || []) {
      if (change.field !== "feed" || change.value?.item !== "comment" || !change.value?.message) continue
      const inbound: InboundSocialComment = {
        channel: "FACEBOOK", recipientAccountId: pageId, commentId: String(change.value.comment_id),
        parentPostId: change.value.post_id ? String(change.value.post_id) : null,
        fromExternalId: String(change.value.from?.id || ""), fromName: change.value.from?.name || null,
        text: String(change.value.message), timestamp: new Date(),
      }
      const result = await withSocialAccountTenant("FACEBOOK", pageId, () => processInboundSocialComment(inbound))
      if (isRouteError(result)) console.error("Facebook comment webhook:", result.error)
    }
  }

  // Meta requires a fast 200 regardless of per-item outcome, or it treats the
  // whole delivery as failed and retries every event again.
  return NextResponse.json({ ok: true })
})
