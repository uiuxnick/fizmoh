import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { syncAllCampaignRatings, syncCampaignRating } from "@/lib/google-business-sync"

/**
 * Pulls the real average rating / review count from Google for campaigns
 * with a linked location. Manual trigger from the dashboard — a scheduled
 * version can call the same functions from cron/route.ts once this is
 * verified against a real, API-approved account.
 */
export const POST = withErrors(withModule("DIGITAL_QR", async (request: NextRequest) => {
  const body = await request.json().catch(() => null)
  const campaignId = typeof body?.campaignId === "string" ? body.campaignId : null

  if (campaignId) {
    const result = await syncCampaignRating(campaignId)
    if (!result.ok) return NextResponse.json({ error: result.error, pendingApproval: result.pendingApproval || false }, { status: 409 })
    return NextResponse.json(result)
  }

  const result = await syncAllCampaignRatings()
  return NextResponse.json(result)
}))
