import { expect, test, describe } from "bun:test"
import {
  isVisaTrigger, isVisaReply, destinationLabel, statusLabel,
  VISA_MENU, DESTINATIONS, PURPOSES, VISA_STATUSES,
} from "../src/lib/visa-flow"
import { isAppointmentReply } from "../src/lib/appointment-flow"

describe("visa triggers", () => {
  test("recognises a visa question", () => {
    for (const text of [
      "visa",
      "do I need a visa for Oman?",
      "how much is an evisa",
      "e-visa help please",
      "tourist permit",
      "تأشيرة",
    ]) {
      expect(isVisaTrigger(text)).toBe(true)
    }
  })

  test("leaves tour and appointment talk alone", () => {
    for (const text of [
      "do we visit the fort?",
      "I want to travel to Wahiba",
      "book a tour",
      "can we set up a meeting",
      "hi",
      // "visitor" contains "visit" but is not a visa question.
      "how many visitors can join",
    ]) {
      expect(isVisaTrigger(text)).toBe(false)
    }
  })
})

describe("reply routing across three flows", () => {
  test("each flow claims only its own taps", () => {
    expect(isVisaReply("vs_type_TOURIST_30")).toBe(true)
    expect(isVisaReply("vs_submit")).toBe(true)

    // The three flows share a conversation. If any claimed another's replies
    // the customer would be silently moved between forms mid-sentence.
    expect(isVisaReply("ap_confirm")).toBe(false)
    expect(isVisaReply("bk_tour_1")).toBe(false)
    expect(isAppointmentReply("vs_submit")).toBe(false)
    expect(isVisaReply(null)).toBe(false)
  })
})

describe("what the customer is offered", () => {
  test("every list fits a WhatsApp message", () => {
    // Meta rejects a list of more than ten rows outright, showing the customer
    // nothing at all — the message simply never arrives.
    for (const list of [VISA_MENU, DESTINATIONS, PURPOSES]) {
      expect(list.length).toBeLessThanOrEqual(10)
    }
    for (const row of [...VISA_MENU, ...DESTINATIONS, ...PURPOSES]) {
      expect(row.label.length).toBeLessThanOrEqual(24)
    }
  })

  test("purposes fit the three reply buttons a message allows", () => {
    // The first three are sent as buttons; the rest have to be typed.
    expect(PURPOSES.length).toBeGreaterThanOrEqual(3)
  })

  test("labels resolve, and an unknown id falls back to itself", () => {
    for (const d of DESTINATIONS) expect(destinationLabel(d.id)).toBe(d.label)
    expect(destinationLabel("ATLANTIS")).toBe("ATLANTIS")
    for (const s of VISA_STATUSES) expect(statusLabel(s.id)).toBe(s.label)
  })
})

describe("what the bot promises", () => {
  test("no status claims the agency approves or refuses a visa", () => {
    // A visa is granted by an embassy. A bot implying otherwise creates an
    // expectation somebody else has to break, and these strings are read back
    // to the customer verbatim.
    const wording = VISA_STATUSES.map(s => `${s.label} ${s.customer}`).join(" ").toLowerCase()
    expect(wording).not.toContain("we approve")
    expect(wording).not.toContain("guarantee")
    expect(wording).not.toContain("rejected by us")
    // There is no "rejected" status at all.
    expect(VISA_STATUSES.some(s => s.id === "REJECTED")).toBe(false)
  })

  test("submission wording puts the decision with the authority", () => {
    const submitted = VISA_STATUSES.find(s => s.id === "SUBMITTED")!
    expect(submitted.customer.toLowerCase()).toContain("immigration authority")
  })
})
