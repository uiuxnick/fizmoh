import { expect, test, describe } from "bun:test"
import { isAppointmentTrigger, isAppointmentReply } from "../src/lib/appointment-flow"

/**
 * The trigger decides whether a customer is dropped into a consultation form
 * or answered as a tour enquiry. Getting it wrong is not a small annoyance:
 * somebody asking about a desert safari would be asked for their company
 * website.
 */
describe("appointment triggers", () => {
  test("recognises a request for a meeting", () => {
    for (const text of [
      "appointment",
      "I'd like to book an appointment",
      "can we set up a meeting?",
      "book a call please",
      "schedule a demo",
      "I want a consultation",
      "arrange a meeting next week",
      "موعد",
    ]) {
      expect(isAppointmentTrigger(text)).toBe(true)
    }
  })

  test("leaves tour enquiries alone", () => {
    for (const text of [
      "I want to schedule my desert tour",
      "book a tour",
      "can I book the dhow cruise",
      "hi",
      "what tours do you have",
      "how much is the safari",
      "booking for 4 people",
      // "demonstrate" contains "demo" but is not a demo request.
      "can you demonstrate the route on a map",
    ]) {
      expect(isAppointmentTrigger(text)).toBe(false)
    }
  })
})

describe("reply routing", () => {
  test("claims only its own replies", () => {
    expect(isAppointmentReply("ap_confirm")).toBe(true)
    expect(isAppointmentReply("ap_day_2026-08-20")).toBe(true)
    expect(isAppointmentReply("ap_time_2026-08-20_16:00")).toBe(true)
  })

  test("never claims a tour booking reply", () => {
    // Both flows run on the same conversation. If either claimed the other's
    // taps the customer would be silently moved between two forms.
    expect(isAppointmentReply("bk_tour_123")).toBe(false)
    expect(isAppointmentReply("bk_confirm")).toBe(false)
    expect(isAppointmentReply(null)).toBe(false)
    expect(isAppointmentReply(undefined)).toBe(false)
  })
})
