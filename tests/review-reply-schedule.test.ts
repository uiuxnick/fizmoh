import { expect, test, describe } from "bun:test"
import { isWithinWindow, nextOccurrenceOf, computeScheduledFor } from "../src/lib/review-reply-schedule"

describe("business-hours window", () => {
  test("inside a normal daytime window", () => {
    // 2026-01-05 is a Monday. 12:00 UTC in Asia/Muscat (UTC+4) is 16:00 local.
    const noon = new Date("2026-01-05T12:00:00Z")
    expect(isWithinWindow(noon, "Asia/Muscat", "09:00", "18:00")).toBe(true)
  })

  test("outside the window, late at night", () => {
    const midnight = new Date("2026-01-05T22:00:00Z") // 02:00 local Muscat
    expect(isWithinWindow(midnight, "Asia/Muscat", "09:00", "18:00")).toBe(false)
  })

  test("a window that wraps past midnight", () => {
    // 22:00-06:00 local: 23:00 local (19:00Z) is inside, 12:00 local (08:00Z) is not.
    const lateNight = new Date("2026-01-05T19:00:00Z")
    const noon = new Date("2026-01-05T08:00:00Z")
    expect(isWithinWindow(lateNight, "Asia/Muscat", "22:00", "06:00")).toBe(true)
    expect(isWithinWindow(noon, "Asia/Muscat", "22:00", "06:00")).toBe(false)
  })

  test("a zero-width window is treated as always open, not always closed", () => {
    expect(isWithinWindow(new Date(), "UTC", "09:00", "09:00")).toBe(true)
  })
})

describe("next occurrence", () => {
  test("moves to the next day when the start time has already passed today", () => {
    const now = new Date("2026-01-05T12:00:00Z") // 16:00 local Muscat, past a 09:00 start
    const next = nextOccurrenceOf(now, "Asia/Muscat", "09:00")
    expect(next.getTime()).toBeGreaterThan(now.getTime())
    // Roughly 17 hours away (until 09:00 the next day local) — bounded, not exact to the second.
    const hoursAway = (next.getTime() - now.getTime()) / 3_600_000
    expect(hoursAway).toBeGreaterThan(10)
    expect(hoursAway).toBeLessThan(24)
  })
})

describe("computeScheduledFor", () => {
  const base = { timezone: "Asia/Muscat", delayMinutes: null, businessHoursStart: "09:00", businessHoursEnd: "18:00" }

  test("immediate mode publishes right away", () => {
    const now = new Date()
    const at = computeScheduledFor(now, { ...base, delayMode: "immediate" })
    expect(at.getTime()).toBe(now.getTime())
  })

  test("delay mode adds the configured minutes", () => {
    const now = new Date("2026-01-05T12:00:00Z")
    const at = computeScheduledFor(now, { ...base, delayMode: "delay", delayMinutes: 30 })
    expect(at.getTime() - now.getTime()).toBe(30 * 60_000)
  })

  test("business_hours mode publishes immediately when already inside the window", () => {
    const now = new Date("2026-01-05T12:00:00Z") // 16:00 local
    const at = computeScheduledFor(now, { ...base, delayMode: "business_hours" })
    expect(at.getTime()).toBe(now.getTime())
  })

  test("business_hours mode pushes to the next window when outside it", () => {
    const now = new Date("2026-01-05T22:00:00Z") // 02:00 local, outside 09:00-18:00
    const at = computeScheduledFor(now, { ...base, delayMode: "business_hours" })
    expect(at.getTime()).toBeGreaterThan(now.getTime())
  })
})
