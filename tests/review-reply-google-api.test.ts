import { expect, test, describe } from "bun:test"
import { isPendingApproval, mapRawReview } from "../src/lib/google-business-reviews"

describe("Google API error classification", () => {
  test("403 and 404 mean 'not approved yet', not broken", () => {
    expect(isPendingApproval(403)).toBe(true)
    expect(isPendingApproval(404)).toBe(true)
  })

  test("other statuses are real failures, not the approval gate", () => {
    expect(isPendingApproval(500)).toBe(false)
    expect(isPendingApproval(429)).toBe(false)
    expect(isPendingApproval(401)).toBe(false)
    expect(isPendingApproval(200)).toBe(false)
  })
})

describe("raw review mapping — duplicate prevention depends on this", () => {
  test("a review that already carries a business reply is flagged, so it is never answered twice", () => {
    const mapped = mapRawReview({
      name: "accounts/1/locations/2/reviews/3",
      starRating: "FIVE",
      comment: "Great!",
      createTime: "2026-01-01T00:00:00Z",
      reviewReply: { comment: "Thanks for visiting!" },
    })
    expect(mapped.alreadyReplied).toBe(true)
  })

  test("a review with no reply yet is not flagged", () => {
    const mapped = mapRawReview({
      name: "accounts/1/locations/2/reviews/4",
      starRating: "FOUR",
      comment: "Good",
      createTime: "2026-01-01T00:00:00Z",
    })
    expect(mapped.alreadyReplied).toBe(false)
  })

  test("the resource name is preserved exactly — it is the dedup key everything else relies on", () => {
    const mapped = mapRawReview({ name: "accounts/9/locations/9/reviews/9", starRating: "FIVE", createTime: "2026-01-01T00:00:00Z" })
    expect(mapped.name).toBe("accounts/9/locations/9/reviews/9")
  })

  test("an unspecified star rating maps to 0, never guessed into a real one", () => {
    const mapped = mapRawReview({ name: "x", starRating: "STAR_RATING_UNSPECIFIED", createTime: "2026-01-01T00:00:00Z" })
    expect(mapped.rating).toBe(0)
  })

  test("a review with no comment (rating-only or emoji-only) keeps comment null, never an empty-string fabrication", () => {
    const mapped = mapRawReview({ name: "x", starRating: "FIVE", createTime: "2026-01-01T00:00:00Z" })
    expect(mapped.comment).toBeNull()
  })
})
