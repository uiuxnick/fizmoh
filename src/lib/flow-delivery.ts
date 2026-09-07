import { AsyncLocalStorage } from "node:async_hooks"
import { sendWhatsApp as whatsappText } from "./notifications"
import { sendInteractiveMessage as whatsappChoices, sendMediaMessage as whatsappMedia } from "./whatsapp"
import type { SocialChannelAdapter } from "./social/types"

const transport = new AsyncLocalStorage<{ adapter: SocialChannelAdapter; token: string; recipient: string; beforeSend?: () => Promise<void> }>()
export const withSocialFlowDelivery = transport.run.bind(transport)
export function socialFlowChannel() { return transport.getStore()?.adapter.channel }

export async function sendWhatsApp(params: Parameters<typeof whatsappText>[0]): Promise<Awaited<ReturnType<typeof whatsappText>>> {
  const social = transport.getStore()
  if (!social) return whatsappText(params)
  await social.beforeSend?.()
  const result = await social.adapter.sendText(social.token, social.recipient, params.body || "")
  return { success: result.ok, error: result.error }
}
export async function sendInteractiveMessage(params: Parameters<typeof whatsappChoices>[0]): Promise<Awaited<ReturnType<typeof whatsappChoices>>> {
  const social = transport.getStore()
  if (!social) return whatsappChoices(params)
  const options = params.buttons?.map(b => b.title) || params.list?.sections.flatMap(s => s.rows.map(r => r.title)) || []
  const body = [params.body, ...options.map((label, i) => `${i + 1}. ${label}`), "Reply with the number or choice."].join("\n")
  await social.beforeSend?.()
  const result = await social.adapter.sendText(social.token, social.recipient, body)
  return { success: result.ok, error: result.error }
}
export async function sendMediaMessage(params: Parameters<typeof whatsappMedia>[0]): Promise<Awaited<ReturnType<typeof whatsappMedia>>> {
  const social = transport.getStore()
  if (!social) return whatsappMedia(params)
  const kind = params.type === "document" ? "FILE" : params.type.toUpperCase() as "IMAGE" | "VIDEO" | "AUDIO"
  await social.beforeSend?.()
  const result = await social.adapter.sendAttachment(social.token, social.recipient, params.mediaUrl, kind)
  return { success: result.ok, error: result.error }
}

export { SOCIAL_FLOW_NODES } from "./flow-channels"
