import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { runReviewAutoReplyForTenant } from "@/lib/review-reply-engine"

export const POST = withErrors(withModule("DIGITAL_QR", async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}))
  const locationId = typeof body?.locationId === "string" ? body.locationId.trim() : undefined
  const regenerateDrafts = Boolean(body?.regenerateDrafts)
  const stats = await runReviewAutoReplyForTenant(locationId || undefined, regenerateDrafts)
  return NextResponse.json({ success: true, stats })
}))
