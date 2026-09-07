export interface DayShift {
  open: string // "HH:mm" e.g. "09:00"
  close: string // "HH:mm" e.g. "17:00"
}

export interface DaySchedule {
  day: number // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dayName?: string
  isOpen: boolean
  open1?: string // "09:00"
  close1?: string // "13:00"
  open2?: string // "16:00"
  close2?: string // "21:00"
}

export interface BusinessStatusResult {
  isOpenNow: boolean
  statusLabel: string // "Open Now", "Closed", "Opens today at 09:00 AM", "Holiday"
  statusVariant: "open" | "closed" | "holiday"
  nextOpeningText?: string
  todayScheduleFormatted: string
  weeklySchedule: Array<{
    day: number
    dayName: string
    isToday: boolean
    isOpen: boolean
    hoursFormatted: string
  }>
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export const DEFAULT_WEEKLY_SCHEDULE: DaySchedule[] = [
  { day: 0, isOpen: true, open1: "09:00", close1: "18:00" }, // Sun
  { day: 1, isOpen: true, open1: "09:00", close1: "18:00" }, // Mon
  { day: 2, isOpen: true, open1: "09:00", close1: "18:00" }, // Tue
  { day: 3, isOpen: true, open1: "09:00", close1: "18:00" }, // Wed
  { day: 4, isOpen: true, open1: "09:00", close1: "18:00" }, // Thu
  { day: 5, isOpen: false, open1: "09:00", close1: "13:00" }, // Fri (Weekend)
  { day: 6, isOpen: true, open1: "09:00", close1: "14:00" }, // Sat
]

function formatTime12h(timeStr?: string | null): string {
  if (!timeStr) return ""
  const [hStr, mStr] = timeStr.split(":")
  const hours = parseInt(hStr, 10)
  const minutes = parseInt(mStr || "0", 10)
  if (isNaN(hours)) return timeStr

  const ampm = hours >= 12 ? "PM" : "AM"
  const h12 = hours % 12 === 0 ? 12 : hours % 12
  const mPad = minutes.toString().padStart(2, "0")
  return `${h12}:${mPad} ${ampm}`
}

function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null
  const [hStr, mStr] = timeStr.split(":")
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr || "0", 10)
  if (isNaN(h) || isNaN(m)) return null
  return h * 60 + m
}

export function formatDayHours(day: DaySchedule): string {
  if (!day.isOpen) return "Closed"

  const shift1 = day.open1 && day.close1 ? `${formatTime12h(day.open1)} - ${formatTime12h(day.close1)}` : ""
  const shift2 = day.open2 && day.close2 ? `${formatTime12h(day.open2)} - ${formatTime12h(day.close2)}` : ""

  if (shift1 && shift2) return `${shift1} & ${shift2}`
  if (shift1) return shift1
  if (shift2) return shift2
  return "Open (Hours not specified)"
}

/**
 * Calculates live opening status according to given timezone and schedule.
 */
export function getBusinessStatus(
  rawSchedule: unknown,
  timezone: string = "Asia/Muscat",
  holidayNotice?: string | null,
  isHoliday?: boolean | null,
): BusinessStatusResult {
  let schedule: DaySchedule[] = DEFAULT_WEEKLY_SCHEDULE

  if (Array.isArray(rawSchedule) && rawSchedule.length > 0) {
    schedule = rawSchedule.map((s, idx) => ({
      day: typeof s.day === "number" ? s.day : idx,
      isOpen: Boolean(s.isOpen),
      open1: s.open1 || undefined,
      close1: s.close1 || undefined,
      open2: s.open2 || undefined,
      close2: s.close2 || undefined,
    }))
  }

  // Determine current day and time in target timezone
  let now = new Date()
  let currentDay = now.getDay()
  let currentMinutes = now.getHours() * 60 + now.getMinutes()

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "Asia/Muscat",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    })

    const parts = formatter.formatToParts(now)
    const weekdayPart = parts.find(p => p.type === "weekday")?.value
    const hourPart = parseInt(parts.find(p => p.type === "hour")?.value || "0", 10)
    const minutePart = parseInt(parts.find(p => p.type === "minute")?.value || "0", 10)

    const shortDayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    }

    if (weekdayPart && shortDayMap[weekdayPart] !== undefined) {
      currentDay = shortDayMap[weekdayPart]
    }
    currentMinutes = hourPart * 60 + minutePart
  } catch {
    // Fallback to local system time if timezone string is invalid
  }

  const todayItem = schedule.find(s => s.day === currentDay) || {
    day: currentDay,
    isOpen: false,
  }

  const todayScheduleFormatted = formatDayHours(todayItem)

  if (isHoliday) {
    return {
      isOpenNow: false,
      statusLabel: holidayNotice ? `Closed (${holidayNotice})` : "Closed (Holiday)",
      statusVariant: "holiday",
      todayScheduleFormatted,
      weeklySchedule: schedule.map(s => ({
        day: s.day,
        dayName: DAY_NAMES[s.day] || `Day ${s.day}`,
        isToday: s.day === currentDay,
        isOpen: s.isOpen,
        hoursFormatted: formatDayHours(s),
      })),
    }
  }

  // Check if currently inside shift1 or shift2
  let isOpenNow = false
  let statusLabel = "Closed"
  let statusVariant: "open" | "closed" = "closed"
  let nextOpeningText: string | undefined

  if (todayItem.isOpen) {
    const o1 = parseTimeToMinutes(todayItem.open1)
    const c1 = parseTimeToMinutes(todayItem.close1)
    const o2 = parseTimeToMinutes(todayItem.open2)
    const c2 = parseTimeToMinutes(todayItem.close2)

    const inShift1 = o1 !== null && c1 !== null && currentMinutes >= o1 && currentMinutes < c1
    const inShift2 = o2 !== null && c2 !== null && currentMinutes >= o2 && currentMinutes < c2

    if (inShift1) {
      isOpenNow = true
      statusVariant = "open"
      statusLabel = `Open Now · Closes at ${formatTime12h(todayItem.close1)}`
    } else if (inShift2) {
      isOpenNow = true
      statusVariant = "open"
      statusLabel = `Open Now · Closes at ${formatTime12h(todayItem.close2)}`
    } else {
      // Not currently open, check if opening later today
      if (o1 !== null && currentMinutes < o1) {
        statusLabel = `Closed · Opens at ${formatTime12h(todayItem.open1)}`
        nextOpeningText = `Opens today at ${formatTime12h(todayItem.open1)}`
      } else if (o2 !== null && currentMinutes < o2) {
        statusLabel = `Closed · Reopens at ${formatTime12h(todayItem.open2)}`
        nextOpeningText = `Reopens today at ${formatTime12h(todayItem.open2)}`
      } else {
        statusLabel = "Closed for today"
      }
    }
  } else {
    statusLabel = "Closed today"
  }

  return {
    isOpenNow,
    statusLabel,
    statusVariant,
    nextOpeningText,
    todayScheduleFormatted,
    weeklySchedule: schedule.map(s => ({
      day: s.day,
      dayName: DAY_NAMES[s.day] || `Day ${s.day}`,
      isToday: s.day === currentDay,
      isOpen: s.isOpen,
      hoursFormatted: formatDayHours(s),
    })),
  }
}
