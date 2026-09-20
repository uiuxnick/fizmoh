import { expect, test, describe } from "bun:test"
import {
  detectEscalation, ratingBand, isAutoPublishEligible, decideRoute, nextRetryDelayMinutes,
} from "../src/lib/review-reply-ai"

describe("escalation detection", () => {
  test("catches a refund request", () => {
    const r = detectEscalation("I want a refund immediately")
    expect(r.escalate).toBe(true)
    expect(r.matchedCategory === "refund" || r.matchedCategory === "urgent").toBe(true)
  })

  test("catches a legal threat", () => {
    expect(detectEscalation("I will sue you and get a lawyer").escalate).toBe(true)
  })

  test("catches a safety complaint", () => {
    expect(detectEscalation("My son was injured and we went to the hospital").escalate).toBe(true)
  })

  test("catches a discrimination complaint", () => {
    expect(detectEscalation("The staff member was racist towards us").escalate).toBe(true)
  })

  test("catches an urgent phrase", () => {
    expect(detectEscalation("This is an emergency, call us back").escalate).toBe(true)
  })

  test("a genuinely positive review never escalates", () => {
    const r = detectEscalation("Amazing service, the staff were so friendly and the food was great!")
    expect(r.escalate).toBe(false)
    expect(r.reason).toBeNull()
  })

  test("empty or missing text never escalates on its own", () => {
    expect(detectEscalation(null).escalate).toBe(false)
    expect(detectEscalation("").escalate).toBe(false)
    expect(detectEscalation("   ").escalate).toBe(false)
  })

  test("a tenant's own extra keyword escalates too", () => {
    const r = detectEscalation("The manager was very rude to us", ["rude"])
    expect(r.escalate).toBe(true)
    expect(r.matchedCategory).toBe("custom")
  })

  test("matching is case-insensitive", () => {
    expect(detectEscalation("I WILL SUE").escalate).toBe(true)
  })
})

describe("rating bands", () => {
  test("maps every real Google star value", () => {
    expect(ratingBand(5)).toBe("5")
    expect(ratingBand(4)).toBe("4")
    expect(ratingBand(3)).toBe("3")
    expect(ratingBand(2)).toBe("1-2")
    expect(ratingBand(1)).toBe("1-2")
  })

  test("an unparsed rating is its own band, never guessed into a real one", () => {
    expect(ratingBand(0)).toBe("unrated")
  })
})

describe("auto-publish eligibility", () => {
  test("a 5-star review is eligible at the default threshold", () => {
    expect(isAutoPublishEligible(5, 4, 4)).toBe(true)
  })

  test("a 3-star review is never eligible when approval is required below 4", () => {
    expect(isAutoPublishEligible(3, 4, 4)).toBe(false)
  })

  test("an unrated (0) review is never auto-eligible, regardless of thresholds", () => {
    expect(isAutoPublishEligible(0, 1, 1)).toBe(false)
  })

  test("the approval floor always wins even if auto-publish threshold is set lower", () => {
    // A misconfigured tenant setting auto-publish at 3 stars but still
    // requiring approval below 4 must not let a 3-star review through.
    expect(isAutoPublishEligible(3, 3, 4)).toBe(false)
  })
})

describe("routing decisions", () => {
  const noEscalation = { escalate: false, reason: null, matchedCategory: null }
  const escalation = { escalate: true, reason: "Mentions refund", matchedCategory: "refund" }

  test("escalation wins over every mode, including DRAFT_ONLY", () => {
    const r = decideRoute({ rating: 5, escalation, mode: "DRAFT_ONLY", autoPublishMinRating: 4, requireApprovalBelow: 4, dailyPublishedCount: 0, maxRepliesPerDay: 50 })
    expect(r.action).toBe("ESCALATED")
  })

  test("DRAFT_ONLY never auto-publishes even a perfect 5-star review", () => {
    const r = decideRoute({ rating: 5, escalation: noEscalation, mode: "DRAFT_ONLY", autoPublishMinRating: 4, requireApprovalBelow: 4, dailyPublishedCount: 0, maxRepliesPerDay: 50 })
    expect(r.action).toBe("DRAFT")
  })

  test("MANUAL_APPROVAL always requires a click, whatever the rating", () => {
    const r = decideRoute({ rating: 5, escalation: noEscalation, mode: "MANUAL_APPROVAL", autoPublishMinRating: 4, requireApprovalBelow: 4, dailyPublishedCount: 0, maxRepliesPerDay: 50 })
    expect(r.action).toBe("PENDING_APPROVAL")
  })

  test("AUTOMATIC publishes an eligible high rating", () => {
    const r = decideRoute({ rating: 5, escalation: noEscalation, mode: "AUTOMATIC", autoPublishMinRating: 4, requireApprovalBelow: 4, dailyPublishedCount: 0, maxRepliesPerDay: 50 })
    expect(r.action).toBe("AUTO_PUBLISH")
  })

  test("AUTOMATIC still requires approval for a low rating — spec section 3", () => {
    const r = decideRoute({ rating: 2, escalation: noEscalation, mode: "AUTOMATIC", autoPublishMinRating: 4, requireApprovalBelow: 4, dailyPublishedCount: 0, maxRepliesPerDay: 50 })
    expect(r.action).toBe("PENDING_APPROVAL")
  })

  test("AUTOMATIC falls back to approval once the daily cap is reached", () => {
    const r = decideRoute({ rating: 5, escalation: noEscalation, mode: "AUTOMATIC", autoPublishMinRating: 4, requireApprovalBelow: 4, dailyPublishedCount: 50, maxRepliesPerDay: 50 })
    expect(r.action).toBe("PENDING_APPROVAL")
    expect(r.reason).toMatch(/cap/i)
  })
})

describe("retry backoff", () => {
  test("doubles each time", () => {
    expect(nextRetryDelayMinutes(0)).toBe(2)
    expect(nextRetryDelayMinutes(1)).toBe(4)
    expect(nextRetryDelayMinutes(2)).toBe(8)
  })

  test("gives up scheduling further automatic retries past the cap", () => {
    expect(nextRetryDelayMinutes(6)).toBeNull()
    expect(nextRetryDelayMinutes(20)).toBeNull()
  })
})
