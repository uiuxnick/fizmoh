/**
 * Business hours and away messages
 *
 * Per BRD §6.5.6: "Business hours & auto-reply: Away messages outside working
 * hours, with option to still allow AI-handled bookings 24/7."
 *
 * The AI toggle matters: an away message that blocks the bot turns a 24/7
 * booking channel into office-hours-only, which is usually the opposite of
 * what a tour operator wants.
 */

import { db } from "@/lib/db"

export type DayHours = { open: string; close: string; closed?: boolean }
export type BusinessHours = Record<string, DayHours>

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  sun: { open: "08:00", close: "18:00" },
  mon: { open: "08:00", close: "18:00" },
  tue: { open: "08:00", close: "18:00" },
  wed: { open: "08:00", close: "18:00" },
  thu: { open: "08:00", close: "18:00" },
  fri: { open: "14:00", close: "18:00" },
  sat: { open: "08:00", close: "18:00" },
}

export const DEFAULT_AWAY_MESSAGE =
  "Thanks for your message! Our team is offline right now and will reply when we open. You can still browse and book with me any time."

type Settings = {
  enabled: boolean
  timezone: string
  hours: BusinessHours
  awayMessage: string
  aiAlwaysOn: boolean
}

function readSetting(rows: { key: string; value: string; type: string }[], key: string) {
  const row = rows.find(r => r.key === key)
  if (!row) return undefined
  if (row.type === "BOOLEAN") return row.value === "true"
  if (row.type === "NUMBER") return Number(row.value)
  if (row.type === "JSON") {
    try {
      return JSON.parse(row.value)
    } catch {
      return undefined
    }
  }
  return row.value
}

export async function getBusinessHoursSettings(): Promise<Settings> {
  const rows = await db.systemSetting.findMany({
    where: { key: { in: ["wa_hours_enabled", "wa_timezone", "wa_business_hours", "wa_away_message", "wa_ai_always_on"] } },
  })

  return {
    enabled: (readSetting(rows, "wa_hours_enabled") as boolean) ?? false,
    timezone: (readSetting(rows, "wa_timezone") as string) || "Asia/Muscat",
    hours: (readSetting(rows, "wa_business_hours") as BusinessHours) || DEFAULT_BUSINESS_HOURS,
    awayMessage: (readSetting(rows, "wa_away_message") as string) || DEFAULT_AWAY_MESSAGE,
    // Default on: the whole point of an AI booking assistant is that it works
    // when staff don't.
    aiAlwaysOn: (readSetting(rows, "wa_ai_always_on") as boolean) ?? true,
  }
}

/** Minutes since midnight in the configured timezone. */
function localNow(timezone: string): { day: string; minutes: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const parts = fmt.formatToParts(new Date())
  const weekday = (parts.find(p => p.type === "weekday")?.value || "Sun").toLowerCase().slice(0, 3)
  const hour = Number(parts.find(p => p.type === "hour")?.value ?? 0)
  const minute = Number(parts.find(p => p.type === "minute")?.value ?? 0)
  return { day: DAYS.includes(weekday) ? weekday : "sun", minutes: hour * 60 + minute }
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function isWithinHours(settings: Settings): boolean {
  if (!settings.enabled) return true
  const { day, minutes } = localNow(settings.timezone)
  const today = settings.hours[day]
  if (!today || today.closed) return false

  const open = toMinutes(today.open)
  const close = toMinutes(today.close)
  // Overnight span (e.g. 20:00–02:00) wraps past midnight.
  if (close <= open) return minutes >= open || minutes < close
  return minutes >= open && minutes < close
}

/**
 * Whether an away message should be sent for this conversation right now.
 * Rate-limited to once per session so a customer sending five messages after
 * hours gets one away notice, not five.
 */
export async function shouldSendAwayMessage(conversationId: string): Promise<{ send: boolean; message: string; blockBot: boolean }> {
  const settings = await getBusinessHoursSettings()
  if (!settings.enabled || isWithinHours(settings)) {
    return { send: false, message: "", blockBot: false }
  }

  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000)
  const recentAway = await db.message.findFirst({
    where: {
      conversationId,
      direction: "BOT",
      type: "TEXT",
      content: settings.awayMessage,
      createdAt: { gt: sixHoursAgo },
    },
    select: { id: true },
  })

  return {
    send: !recentAway,
    message: settings.awayMessage,
    blockBot: !settings.aiAlwaysOn,
  }
}
