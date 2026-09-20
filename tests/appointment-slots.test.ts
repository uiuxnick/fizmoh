import { expect, test, describe } from "bun:test"
import { fromLocal, localDateKey, toRfc3339 } from "../src/lib/timezone"

/**
 * The slot times are Muscat wall clock. The bug these guard against is a slot
 * drifting by four hours because a date was built in the server's zone instead
 * of Oman's — which is exactly what happened to tour departures.
 */
describe("appointment slot times", () => {
  const SLOTS = ["10:00", "11:00", "12:00", "16:00", "17:00", "18:00", "19:00", "20:00"]

  test("there are eight of them, in the two working windows", () => {
    expect(SLOTS).toHaveLength(8)
    const morning = SLOTS.filter(s => s < "13:00")
    const evening = SLOTS.filter(s => s >= "16:00")
    expect(morning).toHaveLength(3)
    expect(evening).toHaveLength(5)
    // Nothing may start after the window closes.
    expect(morning.every(s => s >= "10:00" && s < "13:00")).toBe(true)
    expect(evening.every(s => s >= "16:00" && s < "21:00")).toBe(true)
  })

  test("an hour each, so neither window overruns", () => {
    const lastMorning = fromLocal("2026-08-14", "12:00")
    expect(toRfc3339(new Date(lastMorning.getTime() + 3_600_000))).toContain("T13:00")

    const lastEvening = fromLocal("2026-08-14", "20:00")
    expect(toRfc3339(new Date(lastEvening.getTime() + 3_600_000))).toContain("T21:00")
  })

  test("a slot is the same instant regardless of the server's timezone", () => {
    // 10:00 in Muscat is 06:00 UTC, whatever TZ the process happens to run in.
    expect(fromLocal("2026-08-14", "10:00").toISOString()).toBe("2026-08-14T06:00:00.000Z")
    expect(fromLocal("2026-08-14", "20:00").toISOString()).toBe("2026-08-14T16:00:00.000Z")
  })

  test("late evening still belongs to the day it was booked on", () => {
    // 20:00 Muscat is 16:00 UTC — the same day. An 02:00 slot would not be,
    // which is why the day key is derived in Muscat and not from the instant.
    expect(localDateKey(fromLocal("2026-08-14", "20:00"))).toBe("2026-08-14")
    expect(localDateKey(fromLocal("2026-08-14", "10:00"))).toBe("2026-08-14")
  })

  test("slots round-trip through the wire format unchanged", () => {
    for (const time of SLOTS) {
      const instant = fromLocal("2026-08-14", time)
      expect(toRfc3339(instant)).toBe(`2026-08-14T${time}:00+04:00`)
    }
  })
})
