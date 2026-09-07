import { db } from "@/lib/db"
import { localDateKey, APP_TIMEZONE } from "@/lib/timezone"

export interface GeneratedSlot {
  time: string       // "09:00"
  startTime: string  // "09:00"
  endTime: string    // "09:30"
  startsAtIso: string // ISO timestamp
  available: boolean
  reason?: "booked" | "held" | "leave" | "past" | "outside_hours"
  providerId?: string
  providerName?: string
}

export interface SlotGenOptions {
  tenantId: string
  serviceId: string
  date: string       // "YYYY-MM-DD"
  providerId?: string
  branchId?: string
  timezone?: string
}

/**
 * Slot generation algorithm:
 * 1. Fetch service details (durationMins, bufferMins).
 * 2. Identify provider(s) assigned to this service (or all active providers if none specified).
 * 3. For each provider, get their weekly schedule for date's dayOfWeek (0=Sun, 6=Sat).
 * 4. Get provider leave/blocked dates.
 * 5. Get existing appointments and active holds for date.
 * 6. Generate time slots based on provider shifts, service duration, and buffer.
 * 7. Filter/mark availability based on existing appointments, holds, leaves, past time.
 */
export async function generateAvailableSlots(opts: SlotGenOptions): Promise<GeneratedSlot[]> {
  const { tenantId, serviceId, date, providerId, branchId, timezone = APP_TIMEZONE } = opts

  // 1. Fetch service
  const service = await db.aptService.findFirst({
    where: { id: serviceId, tenantId, status: "ACTIVE" },
  })

  if (!service) return []

  const durationMins = service.durationMins || 30
  const bufferMins = service.bufferMins || 0
  const stepMins = durationMins + bufferMins

  // Parse target date (date is YYYY-MM-DD)
  const targetDate = new Date(`${date}T00:00:00+04:00`) // Muscat timezone default
  const dayOfWeek = targetDate.getDay() // 0=Sun..6=Sat

  // 2. Fetch Providers
  let providers: any[] = []
  if (providerId) {
    const p = await db.aptProvider.findFirst({
      where: { id: providerId, tenantId, status: "ACTIVE" },
      include: {
        schedules: { where: { dayOfWeek } },
        leaves: {
          where: {
            startDate: { lte: new Date(`${date}T23:59:59+04:00`) },
            endDate: { gte: targetDate },
          },
        },
      },
    })
    if (p) providers = [p]
  } else {
    // Find all providers offering this service
    providers = await db.aptProvider.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        providerServices: { some: { serviceId } },
      },
      include: {
        schedules: { where: { dayOfWeek } },
        leaves: {
          where: {
            startDate: { lte: new Date(`${date}T23:59:59+04:00`) },
            endDate: { gte: targetDate },
          },
        },
      },
    })
  }

  // If no providers specifically assigned, check unassigned schedule or default business hours (9am-5pm)
  if (providers.length === 0) {
    // Default fallback shift: 09:00 - 17:00
    providers = [{
      id: "default",
      name: "General Provider",
      schedules: [{
        dayOfWeek,
        isWorkingDay: true,
        shiftsJson: JSON.stringify([{ start: "09:00", end: "17:00" }]),
        breaksJson: "[]",
      }],
      leaves: [],
    }]
  }

  // 3. Fetch existing appointments for this date
  const startOfDay = new Date(`${date}T00:00:00+04:00`)
  const endOfDay = new Date(`${date}T23:59:59+04:00`)

  const existingAppointments = await db.aptAppointment.findMany({
    where: {
      tenantId,
      appointmentDate: { gte: startOfDay, lte: endOfDay },
      status: { notIn: ["CANCELLED", "EXPIRED", "NO_SHOW"] },
    },
    select: {
      id: true,
      providerId: true,
      startTime: true,
      endTime: true,
    },
  })

  // 4. Fetch active slot holds
  const activeHolds = await db.aptHold.findMany({
    where: {
      tenantId,
      slotDate: { gte: startOfDay, lte: endOfDay },
      expiresAt: { gt: new Date() },
    },
    select: {
      providerId: true,
      startTime: true,
      endTime: true,
    },
  })

  // Determine current wall-clock time in Muscat
  const nowMuscat = new Date()
  const todayKeyStr = localDateKey(nowMuscat)
  const isToday = date === todayKeyStr

  const slotsMap = new Map<string, GeneratedSlot>()

  for (const provider of providers) {
    // Check provider leave
    if (provider.leaves && provider.leaves.length > 0) continue

    const sched = provider.schedules?.[0]
    if (!sched || !sched.isWorkingDay) continue

    let shifts: { start: string; end: string }[] = []
    try {
      shifts = JSON.parse(sched.shiftsJson || "[]")
    } catch {
      shifts = [{ start: "09:00", end: "17:00" }]
    }

    let breaks: { start: string; end: string }[] = []
    try {
      breaks = JSON.parse(sched.breaksJson || "[]")
    } catch {
      breaks = []
    }

    for (const shift of shifts) {
      const [startH, startM] = shift.start.split(":").map(Number)
      const [endH, endM] = shift.end.split(":").map(Number)

      let currentMins = startH * 60 + startM
      const endMins = endH * 60 + endM

      while (currentMins + durationMins <= endMins) {
        const slotStartH = Math.floor(currentMins / 60)
        const slotStartM = currentMins % 60
        const slotEndMins = currentMins + durationMins
        const slotEndH = Math.floor(slotEndMins / 60)
        const slotEndM = slotEndMins % 60

        const timeStr = `${String(slotStartH).padStart(2, "0")}:${String(slotStartM).padStart(2, "0")}`
        const endTimeStr = `${String(slotEndH).padStart(2, "0")}:${String(slotEndM).padStart(2, "0")}`
        const slotIso = `${date}T${timeStr}:00+04:00`

        // Check if falls into a break
        const isBreak = breaks.some(b => {
          const [bStartH, bStartM] = b.start.split(":").map(Number)
          const [bEndH, bEndM] = b.end.split(":").map(Number)
          const bStartMins = bStartH * 60 + bStartM
          const bEndMins = bEndH * 60 + bEndM
          return currentMins < bEndMins && (currentMins + durationMins) > bStartMins
        })

        if (isBreak) {
          currentMins += stepMins
          continue
        }

        // Check if past time
        let available = true
        let reason: GeneratedSlot["reason"] | undefined = undefined

        if (isToday) {
          const nowParts = new Intl.DateTimeFormat("en-CA", {
            timeZone: timezone,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).formatToParts(nowMuscat)
          const nowH = Number(nowParts.find(p => p.type === "hour")?.value ?? 0)
          const nowM = Number(nowParts.find(p => p.type === "minute")?.value ?? 0)
          const nowMins = nowH * 60 + nowM

          if (currentMins <= nowMins + 15) { // 15 min buffer for immediate booking
            available = false
            reason = "past"
          }
        }

        // Check booked appointments for this provider (or global if provider is default)
        if (available) {
          const isBooked = existingAppointments.some(apt => {
            if (provider.id !== "default" && apt.providerId && apt.providerId !== provider.id) return false
            const [aStartH, aStartM] = apt.startTime.split(":").map(Number)
            const [aEndH, aEndM] = apt.endTime.split(":").map(Number)
            const aStartMins = aStartH * 60 + aStartM
            const aEndMins = aEndH * 60 + aEndM
            return currentMins < aEndMins && (currentMins + durationMins) > aStartMins
          })

          if (isBooked) {
            available = false
            reason = "booked"
          }
        }

        // Check holds
        if (available) {
          const isHeld = activeHolds.some(h => {
            if (provider.id !== "default" && h.providerId && h.providerId !== provider.id) return false
            const [hStartH, hStartM] = h.startTime.split(":").map(Number)
            const [hEndH, hEndM] = h.endTime.split(":").map(Number)
            const hStartMins = hStartH * 60 + hStartM
            const hEndMins = hEndH * 60 + hEndM
            return currentMins < hEndMins && (currentMins + durationMins) > hStartMins
          })

          if (isHeld) {
            available = false
            reason = "held"
          }
        }

        // Merge into map
        const key = `${timeStr}-${provider.id}`
        if (!slotsMap.has(key)) {
          slotsMap.set(key, {
            time: timeStr,
            startTime: timeStr,
            endTime: endTimeStr,
            startsAtIso: slotIso,
            available,
            reason,
            providerId: provider.id !== "default" ? provider.id : undefined,
            providerName: provider.name,
          })
        }

        currentMins += stepMins
      }
    }
  }

  // Deduplicate and return sorted by time
  const slotsList = Array.from(slotsMap.values()).sort((a, b) => a.time.localeCompare(b.time))
  return slotsList
}

/**
 * Hold a slot for 10 minutes.
 */
export async function holdSlot(
  tenantId: string,
  serviceId: string,
  date: string,
  startTime: string,
  endTime: string,
  customerPhone: string,
  providerId?: string,
  branchId?: string
) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  const slotDate = new Date(`${date}T00:00:00+04:00`)

  return db.aptHold.create({
    data: {
      tenantId,
      serviceId,
      providerId,
      branchId,
      slotDate,
      startTime,
      endTime,
      customerPhone,
      expiresAt,
    },
  })
}

/**
 * Release slot holds for customer or expired holds.
 */
export async function releaseHolds(tenantId: string, customerPhone: string) {
  return db.aptHold.deleteMany({
    where: {
      tenantId,
      customerPhone,
    },
  })
}
