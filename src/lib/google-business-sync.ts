import { businessAccessToken } from "@/lib/google-business-oauth"
import { currentTenant } from "@/lib/tenant"

/**
 * Reads real Business Profile data for a connected account — never anything
 * derived from this app's own ReviewSession funnel, which is not Google's
 * public rating and must never be presented as if it were.
 *
 * Every call here can legitimately fail with 403 until Google approves the
 * platform's separate Business Profile API Access Request (see
 * google-business-oauth.ts) — that is reported as a named error, never
 * silently retried into a fabricated number.
 */

const BUSINESS_INFO_API = "https://mybusinessbusinessinformation.googleapis.com/v1"
const LEGACY_API = "https://mybusiness.googleapis.com/v4"

export interface GoogleLocationOption {
  id: string // "locations/12345"
  name: string
  address: string | null
}

export interface LocationsResult {
  ok: boolean
  locations?: GoogleLocationOption[]
  error?: string
  pendingApproval?: boolean
}

function isPendingApproval(status: number): boolean {
  return status === 403 || status === 404
}

/** Locations under the connected account, for the campaign's location picker. */
export async function listGoogleLocations(accountId: string): Promise<LocationsResult> {
  const token = await businessAccessToken()
  if (!token) return { ok: false, error: "No connected Google account" }

  try {
    const url = `${BUSINESS_INFO_API}/${accountId}/locations?readMask=name,title,storefrontAddress&pageSize=100`
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      return {
        ok: false,
        pendingApproval: isPendingApproval(response.status),
        error: isPendingApproval(response.status)
          ? "Google has not yet approved this platform's Business Profile API access request. The account is connected — locations will appear once Google approves it."
          : `Google returned ${response.status}: ${detail.slice(0, 200)}`,
      }
    }
    const body = await response.json()
    const locations: GoogleLocationOption[] = (body.locations || []).map((l: Record<string, unknown>) => {
      const addr = l.storefrontAddress as { addressLines?: string[]; locality?: string } | undefined
      return {
        id: String(l.name),
        name: String(l.title || l.name),
        address: addr ? [...(addr.addressLines || []), addr.locality].filter(Boolean).join(", ") : null,
      }
    })
    return { ok: true, locations }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

export interface RatingSyncResult {
  ok: boolean
  averageRating?: number
  reviewCount?: number
  error?: string
  pendingApproval?: boolean
}

/**
 * Pulls the real average rating and review count Google reports for one
 * location. A single page is enough — v4's ListReviewsResponse carries
 * `averageRating` and `totalReviewCount` at the top level, computed by Google
 * over every review, not just the page returned.
 */
export async function syncLocationRating(locationResourceName: string): Promise<RatingSyncResult> {
  const token = await businessAccessToken()
  if (!token) return { ok: false, error: "No connected Google account" }

  try {
    const url = `${LEGACY_API}/${locationResourceName}/reviews?pageSize=1`
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      return {
        ok: false,
        pendingApproval: isPendingApproval(response.status),
        error: isPendingApproval(response.status)
          ? "Google has not yet approved this platform's Business Profile API access request."
          : `Google returned ${response.status}: ${detail.slice(0, 200)}`,
      }
    }
    const body = await response.json()
    return {
      ok: true,
      averageRating: typeof body.averageRating === "number" ? body.averageRating : 0,
      reviewCount: typeof body.totalReviewCount === "number" ? body.totalReviewCount : 0,
    }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

/** Syncs one campaign's linked Google location and writes the result onto it — success or a named failure, never left stale and unexplained. */
export async function syncCampaignRating(campaignId: string): Promise<RatingSyncResult> {
  const { db } = await import("@/lib/db")
  const campaign = await db.qrCampaign.findUnique({ where: { id: campaignId } })
  if (!campaign?.googleLocationId) return { ok: false, error: "This campaign has no Google location linked" }

  const result = await syncLocationRating(campaign.googleLocationId)
  if (result.ok) {
    await db.qrCampaign.update({
      where: { id: campaignId },
      data: {
        googleAverageRating: result.averageRating,
        googleReviewCount: result.reviewCount,
        googleRatingSyncedAt: new Date(),
        googleSyncError: null,
      },
    })
  } else {
    await db.qrCampaign.update({
      where: { id: campaignId },
      data: { googleSyncError: result.error || "Sync failed" },
    })
  }
  return result
}

/** Syncs every campaign with a linked Google location, for the current tenant. Best-effort — one failure never stops the rest. */
export async function syncAllCampaignRatings(): Promise<{ synced: number; failed: number }> {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return { synced: 0, failed: 0 }

  const { db } = await import("@/lib/db")
  const campaigns = await db.qrCampaign.findMany({
    where: { googleLocationId: { not: null } },
    select: { id: true },
  })

  let synced = 0, failed = 0
  for (const c of campaigns) {
    const result = await syncCampaignRating(c.id)
    if (result.ok) synced++
    else failed++
  }
  return { synced, failed }
}
