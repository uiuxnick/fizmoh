import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

/**
 * The Digital QR Addons overview — every number a real count from the
 * database. Nothing here is estimated or hardcoded; a workspace with no
 * campaigns yet sees zeros, not sample data.
 */
export const GET = withErrors(withModule("DIGITAL_QR", async () => {
  const [
    totalScans, uniqueScans, activeCampaigns,
    started, rated, inputGiven, aiGenerated, suggestionSelected, edited, confirmed,
    googleClicks, routedPrivate,
    pendingFeedback, resolvedFeedback,
    ratingAgg,
  ] = await Promise.all([
    db.qrScan.count(),
    db.qrScan.count({ where: { isUnique: true } }),
    db.qrCampaign.count({ where: { status: "ACTIVE" } }),
    db.reviewSession.count(),
    db.reviewSession.count({ where: { rating: { not: null } } }),
    db.reviewSession.count({ where: { inputText: { not: null } } }),
    db.reviewSession.count({ where: { aiGeneratedAt: { not: null } } }),
    db.reviewSession.count({ where: { selectedSuggestionId: { not: null } } }),
    db.reviewSession.count({ where: { editedText: { not: null } } }),
    db.reviewSession.count({ where: { confirmedAt: { not: null } } }),
    db.reviewSession.count({ where: { googleStatus: "CTA_CLICKED" } }),
    db.reviewSession.count({ where: { status: "ROUTED_PRIVATE" } }),
    db.privateFeedback.count({ where: { status: { in: ["NEW", "PENDING", "ASSIGNED", "IN_PROGRESS"] } } }),
    db.privateFeedback.count({ where: { status: { in: ["RESOLVED", "CLOSED"] } } }),
    db.reviewSession.aggregate({ where: { rating: { not: null } }, _avg: { rating: true } }),
  ])

  const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0)

  return NextResponse.json({
    kpis: {
      totalScans, uniqueScans, activeCampaigns,
      reviewSessionsStarted: started,
      ratingsSelected: rated,
      aiGenerations: aiGenerated,
      suggestionsSelected: suggestionSelected,
      reviewsConfirmed: confirmed,
      googleClicks,
      pendingFeedback,
      resolvedFeedback,
      averageRating: ratingAgg._avg.rating ? Math.round(ratingAgg._avg.rating * 10) / 10 : null,
      reviewConversion: pct(googleClicks, uniqueScans),
    },
    funnel: [
      { stage: "QR Scans", count: totalScans, pct: 100 },
      { stage: "Unique Visitors", count: uniqueScans, pct: pct(uniqueScans, totalScans) },
      { stage: "Review Started", count: started, pct: pct(started, uniqueScans) },
      { stage: "Rating Selected", count: rated, pct: pct(rated, uniqueScans) },
      { stage: "Customer Input", count: inputGiven, pct: pct(inputGiven, uniqueScans) },
      { stage: "AI Suggestions Generated", count: aiGenerated, pct: pct(aiGenerated, uniqueScans) },
      { stage: "Suggestion Selected", count: suggestionSelected, pct: pct(suggestionSelected, uniqueScans) },
      { stage: "Review Edited", count: edited, pct: pct(edited, uniqueScans) },
      { stage: "Final Review Confirmed", count: confirmed, pct: pct(confirmed, uniqueScans) },
      { stage: "Google CTA Clicked", count: googleClicks, pct: pct(googleClicks, uniqueScans) },
      { stage: "Routed to Private Feedback", count: routedPrivate, pct: pct(routedPrivate, uniqueScans) },
    ],
    rates: {
      aiSelectionRate: pct(suggestionSelected, aiGenerated),
      editRate: pct(edited, suggestionSelected),
      confirmationRate: pct(confirmed, suggestionSelected),
    },
  })
}))
