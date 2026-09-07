import { getConfigValue } from "@/lib/app-config"
import { socialAttachmentPayload } from "@/lib/social/attachment-upload"
import type { SendResult, SocialChannelAdapter } from "@/lib/social/types"

async function graphVersion(): Promise<string> {
  return (await getConfigValue("meta_graph_version")) || "v26.0"
}

export function classifyMetaError(data: { error?: { code?: number; error_subcode?: number; message?: string } }): string | undefined {
  const code = data.error?.code
  // 10 / 200-series: outside the 24h messaging window or missing permission —
  // Meta's own rule, not this platform inventing a restriction.
  if (code === 10 || code === 200) return "Outside Meta's 24-hour messaging window. Customer must message your Facebook Page first."
  if (code === 4 || code === 32 || code === 613) return "Rate limited by Meta"
  if (code === 190) return "Access token expired or revoked"
  return undefined
}

/** Facebook Messenger — send via the Send API, reply to a comment via the comment's own /comments edge. */
export const messengerAdapter: SocialChannelAdapter = {
  channel: "FACEBOOK",

  async sendText(pageAccessToken, recipientExternalId, text): Promise<SendResult> {
    const version = await graphVersion()
    try {
      const res = await fetch(`https://graph.facebook.com/${version}/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: { id: recipientExternalId }, message: { text }, messaging_type: "RESPONSE" }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error?.message || `Graph API returned ${res.status}`, metaRestriction: classifyMetaError(data) }
      return { ok: true, externalMessageId: data.message_id }
    } catch (error) {
      return { ok: false, error: String(error) }
    }
  },

  async sendAttachment(pageAccessToken, recipientExternalId, mediaUrl, mediaType): Promise<SendResult> {
    const version = await graphVersion()
    try {
      const payload = await socialAttachmentPayload("graph.facebook.com", version, pageAccessToken, mediaUrl, mediaType)
      const res = await fetch(`https://graph.facebook.com/${version}/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipientExternalId },
          message: { attachment: { type: mediaType.toLowerCase(), payload } },
          messaging_type: "RESPONSE",
        }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error?.message || `Graph API returned ${res.status}`, metaRestriction: classifyMetaError(data) }
      return { ok: true, externalMessageId: data.message_id }
    } catch (error) {
      return { ok: false, error: String(error) }
    }
  },

  async fetchSenderName(pageAccessToken, psid): Promise<string | null> {
    const version = await graphVersion()
    try {
      const res = await fetch(`https://graph.facebook.com/${version}/${psid}?fields=first_name,last_name&access_token=${encodeURIComponent(pageAccessToken)}`)
      const data = await res.json()
      if (!res.ok) return null
      const name = [data.first_name, data.last_name].filter(Boolean).join(" ").trim()
      return name || null
    } catch {
      return null
    }
  },

  async replyToComment(pageAccessToken, commentId, text): Promise<SendResult> {
    const version = await graphVersion()
    try {
      const res = await fetch(`https://graph.facebook.com/${version}/${commentId}/comments?access_token=${encodeURIComponent(pageAccessToken)}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ message: text }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error?.message || `Graph API returned ${res.status}`, metaRestriction: classifyMetaError(data) }
      return { ok: true, externalMessageId: data.id }
    } catch (error) {
      return { ok: false, error: String(error) }
    }
  },

  async sendPrivateReplyToComment(pageAccessToken, commentId, text): Promise<SendResult> {
    const version = await graphVersion()
    try {
      const res = await fetch(`https://graph.facebook.com/${version}/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { comment_id: commentId },
          message: { text },
        }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error?.message || `Graph API returned ${res.status}`, metaRestriction: classifyMetaError(data) }
      return { ok: true, externalMessageId: data.message_id }
    } catch (error) {
      return { ok: false, error: String(error) }
    }
  },
}
