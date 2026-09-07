export function validateSchedule(trigger: string, value: unknown): string | null {
  if (trigger !== "SCHEDULE") return null
  const config = value as { scheduledAt?: string; conversationIds?: unknown[]; channels?: string[] } | null
  if (!config || typeof config.scheduledAt !== "string" || !Number.isFinite(Date.parse(config.scheduledAt))) return "Choose a valid schedule time"
  if (!Array.isArray(config.conversationIds) || !config.conversationIds.length || config.conversationIds.length > 100 || config.conversationIds.some(id => typeof id !== "string" || !id.trim())) return "Choose between 1 and 100 conversations"
  if (config.channels?.some(channel => channel !== "WHATSAPP")) return "Scheduled flows currently support WhatsApp only"
  return null
}
