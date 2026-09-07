import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule, withinLimit, limitReached } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "MANAGER", "MARKETING"]

export const GET = withErrors(withModule("DIGITAL_QR", async () => {
  const campaigns = await db.qrCampaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { qrCodes: { select: { id: true } }, location: { select: { name: true } }, _count: { select: { sessions: true } } },
  })
  return NextResponse.json({
    campaigns: campaigns.map(c => ({
      id: c.id, name: c.name, description: c.description, status: c.status,
      language: c.language, googleReviewUrl: c.googleReviewUrl, ratingThreshold: c.ratingThreshold,
      aiTone: c.aiTone, aiSuggestionCount: c.aiSuggestionCount,
      locationId: c.locationId, locationName: c.location?.name || null,
      googleLocationId: c.googleLocationId, googleLocationName: c.googleLocationName,
      googleAverageRating: c.googleAverageRating, googleReviewCount: c.googleReviewCount,
      googleRatingSyncedAt: c.googleRatingSyncedAt, googleSyncError: c.googleSyncError,
      startDate: c.startDate, endDate: c.endDate,
      qrCodeCount: c.qrCodes.length, sessionCount: c._count.sessions,
      createdAt: c.createdAt,
    })),
  })
}))

export const POST = withErrors(withModule("DIGITAL_QR", async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only marketing or workspace administrators can create QR campaigns" }, { status: 403 })
  }
  const room = await withinLimit("qrCampaigns")
  if (!room.ok) return limitReached("qrCampaigns", room.used, room.cap)

  const body = await request.json().catch(() => null)
  const name = String(body?.name || "").trim()
  if (!name) return NextResponse.json({ error: "Campaign name is required" }, { status: 400 })

  const campaign = await db.qrCampaign.create({
    data: {
      tenantId: tenant.tenantId,
      name: name.slice(0, 200),
      locationId: body?.locationId ? String(body.locationId) : null,
      description: body?.description ? String(body.description).slice(0, 500) : null,
      language: ["en", "ar", "hi"].includes(body?.language) ? body.language : "en",
      googleReviewUrl: body?.googleReviewUrl ? String(body.googleReviewUrl).slice(0, 500) : null,
      ratingThreshold: [3, 4, 5].includes(Number(body?.ratingThreshold)) ? Number(body.ratingThreshold) : 4,
      aiTone: ["friendly", "professional", "casual"].includes(body?.aiTone) ? body.aiTone : "friendly",
      aiSuggestionCount: Math.min(4, Math.max(2, Number(body?.aiSuggestionCount) || 3)),
    },
  })

  /*
   * A campaign with no QR code has nothing to scan and nothing to view —
   * "created but there is no option to view QR" was this exact gap. Most
   * workspaces are one location with one code, so that one is created here
   * rather than making every campaign start with an empty, confusing list.
   * Anyone who does need per-table codes still adds more from the campaign
   * detail view; this is just the sane default, not the only option.
   */
  const qrCode = await db.qrCode.create({
    data: { tenantId: tenant.tenantId, campaignId: campaign.id, label: "Main QR", token: randomBytes(18).toString("base64url") },
  })

  return NextResponse.json({ campaign: { ...campaign, qrCodes: [qrCode] } }, { status: 201 })
}))
