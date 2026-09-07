import { getConfigValue } from "@/lib/app-config"
import { socialAttachmentPayload } from "@/lib/social/attachment-upload"
import type { SendResult, SocialChannelAdapter } from "@/lib/social/types"

async function graphVersion(): Promise<string> {
  return (await getConfigValue("meta_graph_version")) || "v26.0"
}

export function classifyMetaError(data: { error?: { code?: number; message?: string } }): string | undefined {
  const code = data.error?.code
  if (code === 10 || code === 200) return "Outside Meta's 24-hour messaging window. Customer must message your Instagram account first."
  if (code === 4 || code === 32 || code === 613) return "Rate limited by Meta"
  if (code === 190) return "Access token expired or revoked"
  return undefined
}

/** Instagram — messages and comment replies via graph.instagram.com, the Instagram Login host, not graph.facebook.com. */
export const instagramAdapter: SocialChannelAdapter = {
  channel: "INSTAGRAM",

  async sendText(accessToken, recipientExternalId, text): Promise<SendResult> {
    const version = await graphVersion()
    try {
      const res = await fetch(`https://graph.instagram.com/${version}/me/messages?access_token=${encodeURIComponent(accessToken)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: { id: recipientExternalId }, message: { text } }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error?.message || `Instagram API returned ${res.status}`, metaRestriction: classifyMetaError(data) }
      return { ok: true, externalMessageId: data.message_id }
    } catch (error) {
      return { ok: false, error: String(error) }
    }
  },

  async sendAttachment(accessToken, recipientExternalId, mediaUrl, mediaType): Promise<SendResult> {
    const version = await graphVersion()
    try {
      const payload = await socialAttachmentPayload("graph.instagram.com", version, accessToken, mediaUrl, mediaType)
      const res = await fetch(`https://graph.instagram.com/${version}/me/messages?access_token=${encodeURIComponent(accessToken)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipientExternalId },
          message: { attachment: { type: mediaType.toLowerCase(), payload } },
        }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error?.message || `Instagram API returned ${res.status}`, metaRestriction: classifyMetaError(data) }
      return { ok: true, externalMessageId: data.message_id }
    } catch (error) {
      return { ok: false, error: String(error) }
    }
  },

  async fetchSenderName(accessToken, igsid): Promise<string | null> {
    const version = await graphVersion()
    try {
      const res = await fetch(`https://graph.instagram.com/${version}/${igsid}?fields=name,username&access_token=${encodeURIComponent(accessToken)}`)
      const data = await res.json()
      if (!res.ok) return null
      return (data.name || data.username || null) || null
    } catch {
      return null
    }
  },

  async replyToComment(accessToken, commentId, text): Promise<SendResult> {
    const version = await graphVersion()
    try {
      const res = await fetch(`https://graph.instagram.com/${version}/${commentId}/replies?access_token=${encodeURIComponent(accessToken)}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ message: text }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error?.message || `Instagram API returned ${res.status}`, metaRestriction: classifyMetaError(data) }
      return { ok: true, externalMessageId: data.id }
    } catch (error) {
      return { ok: false, error: String(error) }
    }
  },

  async sendPrivateReplyToComment(accessToken, commentId, text): Promise<SendResult> {
    const version = await graphVersion()
    try {
      const res = await fetch(`https://graph.instagram.com/${version}/me/messages?access_token=${encodeURIComponent(accessToken)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { comment_id: commentId },
          message: { text },
        }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error?.message || `Instagram API returned ${res.status}`, metaRestriction: classifyMetaError(data) }
      return { ok: true, externalMessageId: data.message_id }
    } catch (error) {
      return { ok: false, error: String(error) }
    }
  },
}
