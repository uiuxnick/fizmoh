import { getConfigValue } from "@/lib/app-config"

/**
 * Appointments are a distinct product from tours.
 *
 * The flow builder was producing tour bookings for every enquiry, because a
 * tour booking was the only thing the system could store. A consultation has
 * no seats, no slot and no boat: it is one party at one time, usually online.
 */

/** Fallback list, used until an operator sets their own in Settings. */
const DEFAULT_SERVICES = [
  "ERP",
  "Custom website",
  "WordPress",
  "Shopify",
  "Digital marketing",
  "Podcast",
  "Videography",
  "Photography",
  "SEO",
  "WhatsApp marketing",
]

export async function appointmentsEnabled(): Promise<boolean> {
  const value = (await getConfigValue("appointments_enabled")) || ""
  return ["1", "true", "on", "yes", "enabled"].includes(value.trim().toLowerCase())
}

export async function appointmentServices(): Promise<string[]> {
  const raw = (await getConfigValue("appointment_services")) || ""
  const configured = raw.split("\n").map(s => s.trim()).filter(Boolean)
  return configured.length ? configured : DEFAULT_SERVICES
}

export async function defaultDurationMins(): Promise<number> {
  const raw = Number((await getConfigValue("appointment_duration")) || "")
  return Number.isFinite(raw) && raw > 0 ? Math.min(480, Math.round(raw)) : 60
}

/**
 * The times of day a meeting can start, as Muscat wall clock.
 *
 * Eight hourly slots across a morning and an evening window, which is how the
 * working day actually splits here — the middle of the afternoon is nobody's
 * idea of a good time for a call.
 */
const DEFAULT_SLOTS = [
  "10:00", "11:00", "12:00",
  "16:00", "17:00", "18:00", "19:00", "20:00",
]

export async function appointmentSlots(): Promise<string[]> {
  const raw = (await getConfigValue("appointment_slots")) || ""
  const configured = raw
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(s => /^\d{1,2}:\d{2}$/.test(s))
    .map(s => s.padStart(5, "0"))
  const slots = configured.length ? configured : DEFAULT_SLOTS
  // Sorted and de-duplicated, so a careless edit cannot produce two 4pms or
  // list the evening before the morning.
  return [...new Set(slots)].sort()
}

export interface SlotOffer {
  /** `16:00`, for display. */
  time: string
  /** The exact instant, for storing. */
  startsAt: Date
  available: boolean
  reason?: "booked" | "past"
}

/**
 * Which of the day's slots can still be booked.
 *
 * A slot is gone if something is already booked at that instant, or if it has
 * already passed. Cancelled appointments release their slot — the point of
 * cancelling is that the time is free again.
 */
export async function slotsForDate(dateKey: string): Promise<SlotOffer[]> {
  const { db } = await import("@/lib/db")
  const { fromLocal } = await import("@/lib/timezone")

  const times = await appointmentSlots()
  const dayStart = fromLocal(dateKey, "00:00")
  const dayEnd = new Date(dayStart.getTime() + 24 * 3_600_000)

  const taken = await db.appointment.findMany({
    where: {
      scheduledAt: { gte: dayStart, lt: dayEnd },
      status: { notIn: ["CANCELLED"] },
    },
    select: { scheduledAt: true },
  })
  const takenAt = new Set(taken.map(a => a.scheduledAt.getTime()))
  const now = Date.now()

  return times.map(time => {
    const startsAt = fromLocal(dateKey, time)
    if (takenAt.has(startsAt.getTime())) return { time, startsAt, available: false, reason: "booked" as const }
    if (startsAt.getTime() < now) return { time, startsAt, available: false, reason: "past" as const }
    return { time, startsAt, available: true }
  })
}

/** Whether one exact instant is still free, checked at the moment of booking. */
export async function slotIsFree(startsAt: Date): Promise<boolean> {
  const { db } = await import("@/lib/db")
  const clash = await db.appointment.findFirst({
    where: { scheduledAt: startsAt, status: { notIn: ["CANCELLED"] } },
    select: { id: true },
  })
  return !clash
}

/**
 * A short human reference, distinct in shape from an order number so the two
 * are never mistaken for each other in a message or a calendar entry.
 */
export function appointmentReference(): string {
  const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, "")
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `APT-${stamp}-${suffix}`
}

export const APPOINTMENT_STATUSES = ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const
