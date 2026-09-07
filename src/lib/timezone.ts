/**
 * One timezone for the whole system.
 *
 * Dates were being formatted against whatever the runtime happened to be set
 * to. On a server running UTC an 8am departure printed as 4am the day before
 * in some places and 8am in others, depending on which helper did the work.
 * Everything user-facing now goes through here.
 *
 * Oman is UTC+4 all year. There is no daylight saving to account for, which is
 * why the offset can be a constant — do not copy this assumption to a
 * timezone that observes DST.
 */

export const APP_TIMEZONE = "Asia/Muscat"
export const APP_UTC_OFFSET_HOURS = 4

/** Wall-clock time in Muscat for an instant. */
export function toLocalParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? "00"
  return {
    year: Number(get("year")), month: Number(get("month")), day: Number(get("day")),
    hour: Number(get("hour")), minute: Number(get("minute")),
  }
}

/** `2026-08-12` in Muscat, not in UTC. */
export function localDateKey(date: Date): string {
  const { year, month, day } = toLocalParts(date)
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/**
 * The instant at which a given wall-clock time occurs in Muscat.
 *
 * `new Date("2026-08-12T08:00")` is parsed in the *server's* zone, which is how
 * departures drifted by four hours. This is explicit instead.
 */
export function fromLocal(dateKey: string, time = "00:00"): Date {
  const [hours, minutes] = time.split(":").map(Number)
  const offset = String(APP_UTC_OFFSET_HOURS).padStart(2, "0")
  return new Date(
    `${dateKey}T${String(hours || 0).padStart(2, "0")}:${String(minutes || 0).padStart(2, "0")}:00+${offset}:00`,
  )
}

/** RFC3339 with the Muscat offset, which is what Google Calendar wants. */
export function toRfc3339(date: Date): string {
  const { year, month, day, hour, minute } = toLocalParts(date)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+0${APP_UTC_OFFSET_HOURS}:00`
}

export function formatLocal(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  }).format(date)
}
