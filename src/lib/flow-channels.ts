export const FLOW_CHANNELS = ["WHATSAPP", "FACEBOOK", "INSTAGRAM"] as const
export type FlowChannel = typeof FLOW_CHANNELS[number]
export const FLOW_CHANNEL_LABELS: Record<FlowChannel, string> = { WHATSAPP: "WhatsApp", FACEBOOK: "Facebook", INSTAGRAM: "Instagram" }
export const SOCIAL_FLOW_NODES = new Set(["TRIGGER", "MESSAGE", "QUESTION", "BUTTONS", "LIST", "CONDITION", "SET", "TAG", "HANDOFF", "END", "MEDIA", "HOURS", "SPLIT", "AI"])

export function flowChannels(value: unknown): FlowChannel[] {
  let config = value
  if (typeof config === "string") { try { config = JSON.parse(config) } catch { return ["WHATSAPP"] } }
  const selected = (config as { channels?: unknown } | null)?.channels
  if (!Array.isArray(selected)) return ["WHATSAPP"]
  return FLOW_CHANNELS.filter(channel => selected.includes(channel))
}

export function supportsFlowNode(type: string, channels: readonly FlowChannel[]): boolean {
  return channels.every(channel => channel === "WHATSAPP" || SOCIAL_FLOW_NODES.has(type))
}
