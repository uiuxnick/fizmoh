import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "MANAGER", "MARKETING"]
const STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "EXPIRED", "ARCHIVED"]

/** Edit a campaign's settings, or change its status (activate/pause/archive). */
export const PATCH = withErrors(withModule("DIGITAL_QR", async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const tenant = currentTenant()
  if (tenant?.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only marketing or workspace administrators can edit QR campaigns" }, { status: 403 })
  }
  const { id } = await params
  const existing = await db.qrCampaign.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "No such campaign" }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 200)
  if ("locationId" in body) data.locationId = body.locationId ? String(body.locationId) : null
  if (typeof body.description === "string") data.description = body.description.slice(0, 500) || null
  if (typeof body.googleReviewUrl === "string") data.googleReviewUrl = body.googleReviewUrl.slice(0, 500) || null
  if ("googleLocationId" in body) {
    data.googleLocationId = body.googleLocationId ? String(body.googleLocationId).slice(0, 200) : null
    data.googleLocationName = body.googleLocationName ? String(body.googleLocationName).slice(0, 300) : null
    // A newly picked (or cleared) location invalidates whatever number was last synced.
    data.googleAverageRating = null
    data.googleReviewCount = null
    data.googleRatingSyncedAt = null
    data.googleSyncError = null
  }
  if ([3, 4, 5].includes(Number(body.ratingThreshold))) data.ratingThreshold = Number(body.ratingThreshold)
  if (["friendly", "professional", "casual"].includes(body.aiTone)) data.aiTone = body.aiTone
  if (Number.isInteger(Number(body.aiSuggestionCount))) data.aiSuggestionCount = Math.min(4, Math.max(2, Number(body.aiSuggestionCount)))
  if (typeof body.status === "string" && STATUSES.includes(body.status)) data.status = body.status

  const campaign = await db.qrCampaign.update({ where: { id }, data })
  return NextResponse.json({ campaign })
}))

export const DELETE = withErrors(withModule("DIGITAL_QR", async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const tenant = currentTenant()
  if (tenant?.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only marketing or workspace administrators can delete QR campaigns" }, { status: 403 })
  }
  const { id } = await params
  const sessions = await db.reviewSession.count({ where: { campaignId: id } })
  if (sessions > 0) {
    // Real customer sessions exist under this campaign — archiving preserves
    // that history and the analytics built on it; deleting would not.
    await db.qrCampaign.update({ where: { id }, data: { status: "ARCHIVED" } })
    return NextResponse.json({ archived: true, sessions })
  }
  await db.qrCampaign.delete({ where: { id } })
  return NextResponse.json({ deleted: true })
}))
