import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

/**
 * Branch/location comparison — section 34 of the spec.
 *
 * A campaign with no location assigned is grouped under "Unassigned" rather
 * than silently dropped, so a single-location workspace (the common case)
 * still sees its one real row instead of an empty table.
 */
export const GET = withErrors(withModule("DIGITAL_QR", async () => {
  const [locations, campaigns] = await Promise.all([
    db.qrLocation.findMany({ orderBy: { name: "asc" } }),
    db.qrCampaign.findMany({ select: { id: true, locationId: true } }),
  ])

  const groups = new Map<string, { name: string; campaignIds: string[] }>()
  groups.set("unassigned", { name: "Unassigned", campaignIds: [] })
  for (const loc of locations) groups.set(loc.id, { name: loc.name, campaignIds: [] })
  for (const c of campaigns) {
    const key = c.locationId && groups.has(c.locationId) ? c.locationId : "unassigned"
    groups.get(key)!.campaignIds.push(c.id)
  }

  const rows = await Promise.all(
    Array.from(groups.entries()).map(async ([id, group]) => {
      if (group.campaignIds.length === 0) {
        return { id, name: group.name, scans: 0, uniqueScans: 0, sessions: 0, googleClicks: 0, privateFeedback: 0, averageRating: null as number | null }
      }
      const where = { campaignId: { in: group.campaignIds } }
      const [scans, uniqueScans, sessions, googleClicks, privateFeedback, ratingAgg] = await Promise.all([
        db.qrScan.count({ where: { qrCode: { campaignId: { in: group.campaignIds } } } }),
        db.qrScan.count({ where: { qrCode: { campaignId: { in: group.campaignIds } }, isUnique: true } }),
        db.reviewSession.count({ where }),
        db.reviewSession.count({ where: { ...where, googleStatus: "CTA_CLICKED" } }),
        db.privateFeedback.count({ where: { session: { campaignId: { in: group.campaignIds } } } }),
        db.reviewSession.aggregate({ where: { ...where, rating: { not: null } }, _avg: { rating: true } }),
      ])
      return {
        id, name: group.name, scans, uniqueScans, sessions, googleClicks, privateFeedback,
        averageRating: ratingAgg._avg.rating ? Math.round(ratingAgg._avg.rating * 10) / 10 : null,
      }
    }),
  )

  // Hide the empty "Unassigned" bucket for a workspace with no campaigns at all.
  const filtered = rows.filter(r => r.id !== "unassigned" || r.sessions > 0 || r.scans > 0)
  return NextResponse.json({ locations: filtered })
}))
