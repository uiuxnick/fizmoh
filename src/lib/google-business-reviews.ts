import { businessAccessToken } from "@/lib/google-business-oauth"

/**
 * Reading and replying to Google reviews for one connected location — the v4
 * `mybusiness.googleapis.com` reviews endpoints (the same namespace the
 * rating-sync feature already reads from). Requires the same Business
 * Profile API access approval as everything else in google-business-*.ts —
 * every function here reports that as a named, expected failure rather than
 * crashing or fabricating data.
 */

const LEGACY_API = "https://mybusiness.googleapis.com/v4"

const STAR_TO_NUMBER: Record<string, number> = {
  ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, STAR_RATING_UNSPECIFIED: 0,
}

export interface RawGoogleReview {
  name: string // "accounts/*/locations/*/reviews/*" — the true dedup key
  reviewId: string
  reviewerName: string | null
  rating: number // 0 for STAR_RATING_UNSPECIFIED (an emoji-only or otherwise unparsed review)
  comment: string | null
  createTime: string
  updateTime: string | null
  alreadyReplied: boolean
}

export interface ApiFailure {
  ok: false
  error: string
  pendingApproval: boolean
  status: number
}

/** A 403/404 from these APIs means "not approved yet", not "broken" — every caller reports the two differently. */
export function isPendingApproval(status: number): boolean {
  return status === 403 || status === 404
}

/** Pure mapping from Google's raw Review JSON to our shape — the seam duplicate-prevention actually depends on (`alreadyReplied`). */
export function mapRawReview(r: Record<string, unknown>): RawGoogleReview {
  return {
    name: String(r.name),
    reviewId: String(r.reviewId || ""),
    reviewerName: (r.reviewer as { displayName?: string } | undefined)?.displayName || null,
    rating: STAR_TO_NUMBER[String(r.starRating)] ?? 0,
    comment: (r.comment as string) || null,
    createTime: String(r.createTime),
    updateTime: (r.updateTime as string) || null,
    alreadyReplied: Boolean((r.reviewReply as { comment?: string } | undefined)?.comment),
  }
}

async function failure(response: Response, context: string): Promise<ApiFailure> {
  const detail = await response.text().catch(() => "")
  const pending = isPendingApproval(response.status)
  return {
    ok: false,
    status: response.status,
    pendingApproval: pending,
    error: pending
      ? "Google has not yet approved this platform's Business Profile API access request."
      : `${context}: Google returned ${response.status}: ${detail.slice(0, 200)}`,
  }
}

export interface ListReviewsResult {
  ok: true
  reviews: RawGoogleReview[]
  nextPageToken: string | null
}

/** One page of reviews for a location. Paginate with the returned nextPageToken. */
export async function listLocationReviews(locationResourceName: string, pageToken?: string): Promise<ListReviewsResult | ApiFailure> {
  const token = await businessAccessToken()
  if (!token) return { ok: false, status: 0, pendingApproval: false, error: "No connected Google account" }

  const params = new URLSearchParams({ pageSize: "50" })
  if (pageToken) params.set("pageToken", pageToken)

  try {
    const response = await fetch(`${LEGACY_API}/${locationResourceName}/reviews?${params}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) return await failure(response, "Listing reviews")
    const body = await response.json()
    const reviews: RawGoogleReview[] = (body.reviews || []).map(mapRawReview)
    return { ok: true, reviews, nextPageToken: body.nextPageToken || null }
  } catch (error) {
    return { ok: false, status: 0, pendingApproval: false, error: String(error) }
  }
}

export interface PublishReplyResult {
  ok: true
}

/** Publishes (or replaces) the business's reply to one review. PUT is idempotent by design — safe to retry. */
export async function publishReviewReply(reviewResourceName: string, comment: string): Promise<PublishReplyResult | ApiFailure> {
  const token = await businessAccessToken()
  if (!token) return { ok: false, status: 0, pendingApproval: false, error: "No connected Google account" }

  try {
    const response = await fetch(`${LEGACY_API}/${reviewResourceName}/reply`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ comment }),
    })
    if (!response.ok) return await failure(response, "Publishing reply")
    return { ok: true }
  } catch (error) {
    return { ok: false, status: 0, pendingApproval: false, error: String(error) }
  }
}

export function isApiFailure(v: { ok: boolean }): v is ApiFailure {
  return v.ok === false
}
