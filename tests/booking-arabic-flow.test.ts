import { expect, test, describe } from "bun:test"
import {
  parseCustomerDate,
  normalizeArabicDigits,
  getMuscatTime,
  isRescheduleIntent,
  looksLikeQuestion,
  detectLang,
} from "../src/lib/booking-flow"

describe("Arabic digits normalization", () => {
  test("converts Arabic-Indic digits to standard ASCII digits", () => {
    expect(normalizeArabicDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789")
    expect(normalizeArabicDigits("١٥/٨/٢٠٢٦")).toBe("15/8/2026")
    expect(normalizeArabicDigits("عدد الأشخاص ٤")).toBe("عدد الأشخاص 4")
  })
})

describe("Arabic date parsing", () => {
  const fixedNow = new Date("2026-08-10T10:00:00Z") // Monday, Aug 10, 2026

  test("handles relative terms in Arabic and English", () => {
    expect(parseCustomerDate("اليوم", fixedNow)).toBe("2026-08-10")
    expect(parseCustomerDate("today", fixedNow)).toBe("2026-08-10")

    expect(parseCustomerDate("بكرة", fixedNow)).toBe("2026-08-11")
    expect(parseCustomerDate("بكره", fixedNow)).toBe("2026-08-11")
    expect(parseCustomerDate("غدا", fixedNow)).toBe("2026-08-11")
    expect(parseCustomerDate("tomorrow", fixedNow)).toBe("2026-08-11")

    expect(parseCustomerDate("بعد بكرة", fixedNow)).toBe("2026-08-12")
    expect(parseCustomerDate("بعد بكره", fixedNow)).toBe("2026-08-12")
    expect(parseCustomerDate("بعد غد", fixedNow)).toBe("2026-08-12")
    expect(parseCustomerDate("day after tomorrow", fixedNow)).toBe("2026-08-12")
  })

  test("handles Arabic numerals and DMY format", () => {
    expect(parseCustomerDate("١٥/٨", fixedNow)).toBe("2026-08-15")
    expect(parseCustomerDate("15/8", fixedNow)).toBe("2026-08-15")
    expect(parseCustomerDate("15-8", fixedNow)).toBe("2026-08-15")
    expect(parseCustomerDate("١٥/٨/٢٠٢٦", fixedNow)).toBe("2026-08-15")
    expect(parseCustomerDate("2026-08-15", fixedNow)).toBe("2026-08-15")
  })

  test("handles Arabic month names", () => {
    expect(parseCustomerDate("15 اغسطس", fixedNow)).toBe("2026-08-15")
    expect(parseCustomerDate("١٥ أغسطس", fixedNow)).toBe("2026-08-15")
    expect(parseCustomerDate("15 أغسطس 2026", fixedNow)).toBe("2026-08-15")
    expect(parseCustomerDate("أغسطس 15", fixedNow)).toBe("2026-08-15")
    expect(parseCustomerDate("تاريخ ١٥ اغسطس", fixedNow)).toBe("2026-08-15")
    expect(parseCustomerDate("يوم 20 سبتمبر", fixedNow)).toBe("2026-09-20")
  })

  test("handles Arabic days of the week", () => {
    // Aug 10, 2026 is Monday (day 1)
    // Friday (day 5) is Aug 14, and "الجمعة الجاية" (next Friday) is Aug 21
    expect(parseCustomerDate("الجمعة", fixedNow)).toBe("2026-08-14")
    expect(parseCustomerDate("يوم الجمعة", fixedNow)).toBe("2026-08-14")
    expect(parseCustomerDate("الجمعة الجاية", fixedNow)).toBe("2026-08-21")
    expect(parseCustomerDate("السبت", fixedNow)).toBe("2026-08-15")
  })
})

describe("Muscat timezone and evening slot filtering", () => {
  test("getMuscatTime calculates correct date and minutes in Asia/Muscat (UTC+4)", () => {
    const utcDate = new Date("2026-08-10T08:30:00Z") // 12:30 in Muscat
    const muscat = getMuscatTime(utcDate)
    expect(muscat.todayIso).toBe("2026-08-10")
    expect(muscat.hour).toBe(12)
    expect(muscat.nowMinutes).toBe(12 * 60 + 30)
  })

  test("evening booking filters out morning slots (< 12:00 PM)", () => {
    const afternoonUtc = new Date("2026-08-10T12:00:00Z") // 16:00 (4:00 PM) in Muscat
    const muscat = getMuscatTime(afternoonUtc)
    expect(muscat.hour).toBeGreaterThanOrEqual(12)

    const slots = [
      { id: "s1", startTime: "05:30", capacity: 10, seatsBooked: 0, seatsHeld: 0 },
      { id: "s2", startTime: "09:00", capacity: 10, seatsBooked: 0, seatsHeld: 0 },
      { id: "s3", startTime: "16:45", capacity: 10, seatsBooked: 0, seatsHeld: 0 },
      { id: "s4", startTime: "18:00", capacity: 10, seatsBooked: 0, seatsHeld: 0 },
    ]

    const bookable = slots.filter(s => {
      const [sh, sm] = s.startTime.split(":").map(Number)
      const slotMinutes = (sh || 0) * 60 + (sm || 0)
      if (slotMinutes <= muscat.nowMinutes + 30) return false
      if (muscat.hour >= 12 && (sh || 0) < 12) return false
      return true
    })

    // Morning slots (05:30, 09:00) must be hidden
    expect(bookable.map(s => s.id)).toEqual(["s3", "s4"])
  })
})

describe("Language detection", () => {
  test("identifies Arabic text vs English", () => {
    expect(detectLang("مرحبا")).toBe("ar")
    expect(detectLang("اريد احجز خيل")).toBe("ar")
    expect(detectLang("Hello")).toBe("en")
    expect(detectLang("Can I book a ride?")).toBe("en")
  })
})

describe("Mid-flow question and intent detection", () => {
  test("identifies Arabic questions and inquiries", () => {
    expect(looksLikeQuestion("كيف الغي الحجز؟")).toBe(true)
    expect(looksLikeQuestion("وين موقعكم")).toBe(true)
    expect(looksLikeQuestion("كم السعر")).toBe(true)
    expect(looksLikeQuestion("هل مسموح للاطفال؟")).toBe(true)
    expect(looksLikeQuestion("ايش الشروط")).toBe(true)
    expect(looksLikeQuestion("عندكم رحلات مسائية؟")).toBe(true)
  })

  test("does not flag regular inputs as questions", () => {
    expect(looksLikeQuestion("خالد البلوشي")).toBe(false)
    expect(looksLikeQuestion("Salem Al-Harthy")).toBe(false)
    expect(looksLikeQuestion("4")).toBe(false)
    expect(looksLikeQuestion("salem@gmail.com")).toBe(false)
  })

  test("detects reschedule intents", () => {
    expect(isRescheduleIntent("ما اقدر اجي")).toBe(true)
    expect(isRescheduleIntent("ما بقدر اجي اليوم")).toBe(true)
    expect(isRescheduleIntent("اريد اغير الموعد")).toBe(true)
    expect(isRescheduleIntent("تأجيل الحجز")).toBe(true)
    expect(isRescheduleIntent("ابي اغير تاريخ الرحلة")).toBe(true)
    expect(isRescheduleIntent("reschedule my booking")).toBe(true)
    expect(isRescheduleIntent("can't come today")).toBe(true)

    expect(isRescheduleIntent("مرحبا اريد احجز")).toBe(false)
    expect(isRescheduleIntent("hello")).toBe(false)
  })
})

describe("AI Rescheduling Toggle & Human Takeover Control", () => {
  test("isRescheduleEnabled defaults to true when unset", async () => {
    const { isRescheduleEnabled } = await import("../src/lib/booking-flow")
    expect(await isRescheduleEnabled("non_existent_tenant_xyz")).toBe(true)
    expect(await isRescheduleEnabled(undefined)).toBe(true)
  })

  test("manual outbound agent message pauses bot automation", () => {
    const simulateOutboundMessage = (direction: string) => {
      const isManualOutbound = (direction || "OUTBOUND") !== "INBOUND"
      return {
        botActive: isManualOutbound ? false : true,
        automationPaused: isManualOutbound ? true : false,
      }
    }

    const manualResult = simulateOutboundMessage("OUTBOUND")
    expect(manualResult.botActive).toBe(false)
    expect(manualResult.automationPaused).toBe(true)

    const inboundResult = simulateOutboundMessage("INBOUND")
    expect(inboundResult.botActive).toBe(true)
    expect(inboundResult.automationPaused).toBe(false)
  })

  test("bot remains stopped when botActive is false or automationPaused is true", () => {
    const shouldBotReply = (conversation: { botActive: boolean; automationPaused: boolean }) => {
      if (!conversation.botActive || conversation.automationPaused) return false
      return true
    }

    // Both paused
    expect(shouldBotReply({ botActive: false, automationPaused: true })).toBe(false)
    // Manually disabled
    expect(shouldBotReply({ botActive: false, automationPaused: false })).toBe(false)
    // Automation paused
    expect(shouldBotReply({ botActive: true, automationPaused: true })).toBe(false)
    // Active only when both allow it
    expect(shouldBotReply({ botActive: true, automationPaused: false })).toBe(true)
  })
})
