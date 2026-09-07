/**
 * Shared vocabulary for the Facebook & Instagram Automation add-on.
 *
 * Deliberately small — the channel adapters translate Meta's very different
 * webhook and send-message shapes into this one, and everything upstream
 * (social-engine.ts, the inbox routes) works only in these terms, never in a
 * platform's own JSON shape directly.
 */

export type SocialChannel = "FACEBOOK" | "INSTAGRAM"

/** One inbound event, normalised from either platform's webhook payload. */
export interface InboundSocialMessage {
  channel: SocialChannel
  /** The Page id (Facebook) or IG user id the message arrived on — identifies which SocialAccount owns it. */
  recipientAccountId: string
  /** PSID or IGSID of the person who sent it. */
  senderExternalId: string
  senderName: string | null
  /** Meta's own message id — the dedup key, stored as Message.externalId. */
  externalMessageId: string
  text: string | null
  /** Set when the message is (or includes) an attachment rather than plain text. */
  mediaUrl?: string | null
  mediaType?: "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | null
  timestamp: Date
}

/** One inbound comment/mention event. */
export interface InboundSocialComment {
  channel: SocialChannel
  recipientAccountId: string
  commentId: string
  parentPostId: string | null
  fromExternalId: string
  fromName: string | null
  text: string
  timestamp: Date
}

export interface SendResult {
  ok: boolean
  externalMessageId?: string
  error?: string
  /** A 24h-messaging-window / permission / rate-limit failure Meta itself enforces — not this platform inventing a restriction. */
  metaRestriction?: string
}

/** What every channel adapter must do — send a DM, reply to a comment, verify its own webhook signature. */
export interface SocialChannelAdapter {
  channel: SocialChannel
  sendText(accessToken: string, recipientExternalId: string, text: string): Promise<SendResult>
  sendAttachment(accessToken: string, recipientExternalId: string, mediaUrl: string, mediaType: "IMAGE" | "VIDEO" | "AUDIO" | "FILE"): Promise<SendResult>
  replyToComment(accessToken: string, commentId: string, text: string): Promise<SendResult>
  /** Private reply sent as a direct message in response to a post/reel comment. */
  sendPrivateReplyToComment(accessToken: string, commentId: string, text: string): Promise<SendResult>
  /** Best-effort profile lookup for the inbox's display name — never invented, only what Meta itself reports; null on any failure or missing permission. */
  fetchSenderName(accessToken: string, senderExternalId: string): Promise<string | null>
}
