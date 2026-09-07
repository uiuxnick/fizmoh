/**
 * Delay / business-hours scheduling for review replies — arbitrary IANA
 * timezones, since a tenant's own timezone setting is not fixed to Oman the
 * way the rest of this app is (timezone.ts).
 */

function wallClockInTz(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? "00"
  return {
    year: Number(get("year")), month: Number(get("month")), day: Number(get("day")),
    hour: Number(get("hour")), minute: Number(get("minute")),
  }
}

function parseHM(hm: string): { hour: number; minute: number } {
  const [hour, minute] = hm.split(":").map(Number)
  return { hour: hour || 0, minute: minute || 0 }
}

/** Minutes since midnight, in the given timezone, for an instant. */
function minutesOfDay(date: Date, timeZone: string): number {
  const { hour, minute } = wallClockInTz(date, timeZone)
  return hour * 60 + minute
}

/** Whether `date` falls inside [start, end) wall-clock time in `timeZone`. An overnight window (end < start) wraps past midnight. */
export function isWithinWindow(date: Date, timeZone: string, start: string, end: string): boolean {
  const now = minutesOfDay(date, timeZone)
  const s = parseHM(start).hour * 60 + parseHM(start).minute
  const e = parseHM(end).hour * 60 + parseHM(end).minute
  if (s === e) return true // a zero-width window is treated as "always open" rather than "never"
  if (s < e) return now >= s && now < e
  return now >= s || now < e // wraps midnight
}

/**
 * The next instant at or after `date` when wall-clock time in `timeZone`
 * equals `start`. Approximated via the standard offset-diffing trick: correct
 * for virtually every real business-hours use, potentially off by up to an
 * hour in the rare case `date` sits inside a DST transition itself — an
 * acceptable bound for "delay the reply until working hours", not a
 * financial-grade scheduling guarantee.
 */
export function nextOccurrenceOf(date: Date, timeZone: string, start: string): Date {
  const { hour, minute } = parseHM(start)
  const wall = wallClockInTz(date, timeZone)
  const todayAtStartUtcGuess = new Date(Date.UTC(wall.year, wall.month - 1, wall.day, hour, minute, 0))
  const wallAtGuess = wallClockInTz(todayAtStartUtcGuess, timeZone)
  const offsetMinutes = (hour * 60 + minute) - (wallAtGuess.hour * 60 + wallAtGuess.minute)
  let candidate = new Date(todayAtStartUtcGuess.getTime() + offsetMinutes * 60_000)
  if (candidate.getTime() <= date.getTime()) candidate = new Date(candidate.getTime() + 24 * 60 * 60_000)
  return candidate
}

export interface ScheduleInput {
  delayMode: "immediate" | "delay" | "business_hours" | "custom_schedule"
  delayMinutes: number | null
  businessHoursStart: string | null
  businessHoursEnd: string | null
  timezone: string
}

/** When a reply that is otherwise ready to publish should actually go out. */
export function computeScheduledFor(now: Date, settings: ScheduleInput): Date {
  if (settings.delayMode === "immediate") return now
  if (settings.delayMode === "delay") return new Date(now.getTime() + Math.max(0, settings.delayMinutes || 0) * 60_000)

  // business_hours and custom_schedule both use the same start/end window —
  // the spec names a "custom schedule" but defines no shape for one beyond a
  // window and a timezone, so it reuses these fields rather than inventing an
  // undocumented one.
  const start = settings.businessHoursStart || "09:00"
  const end = settings.businessHoursEnd || "18:00"
  if (isWithinWindow(now, settings.timezone, start, end)) return now
  return nextOccurrenceOf(now, settings.timezone, start)
}
