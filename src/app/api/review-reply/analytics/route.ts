import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

/** Real, query-computed numbers only — no hardcoded or sample values. */
export const GET = withErrors(withModule("DIGITAL_QR", async () => {
  const [totalReviews, published, failed, escalated, pendingApproval, byStar, recentPublished] = await Promise.all([
    db.googleReview.count(),
    db.replyLog.count({ where: { status: "PUBLISHED" } }),
    db.replyLog.count({ where: { status: "FAILED" } }),
    db.replyLog.count({ where: { status: "ESCALATED" } }),
    db.replyLog.count({ where: { status: "PENDING_APPROVAL" } }),
    db.googleReview.groupBy({ by: ["rating"], _count: { _all: true } }),
    db.replyLog.findMany({
      where: { status: "PUBLISHED", publishedAt: { not: null } },
      include: { review: { select: { createTime: true } } },
      orderBy: { publishedAt: "desc" },
      take: 500,
    }),
  ])

  const generated = await db.replyLog.count({ where: { generatedText: { not: null } } })

  // Average time from the review appearing to the reply actually going out.
  const responseTimesMs = recentPublished
    .filter(r => r.publishedAt)
    .map(r => r.publishedAt!.getTime() - r.review.createTime.getTime())
    .filter(ms => ms >= 0)
  const avgResponseMinutes = responseTimesMs.length
    ? Math.round(responseTimesMs.reduce((a, b) => a + b, 0) / responseTimesMs.length / 60000)
    : null

  // Of everything that has actually been decided one way or another (not
  // still sitting in the approval queue), the share that ended up published.
  const decided = published + failed
  const approvalRate = decided ? Math.round((published / decided) * 100) : null

  // Published replies per day, last 30 days — real counts, not interpolated.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60_000)
  const recent = await db.replyLog.findMany({
    where: { status: "PUBLISHED", publishedAt: { gte: since } },
    select: { publishedAt: true },
  })
  const byDay = new Map<string, number>()
  for (const r of recent) {
    if (!r.publishedAt) continue
    const key = r.publishedAt.toISOString().slice(0, 10)
    byDay.set(key, (byDay.get(key) || 0) + 1)
  }

  return NextResponse.json({
    totalReviews, repliesGenerated: generated, repliesPublished: published, repliesFailed: failed,
    escalated, pendingApproval, avgResponseMinutes, approvalRate,
    byStarRating: byStar.map(b => ({ rating: b.rating, count: b._count._all })),
    publishedByDay: Array.from(byDay.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
  })
}))
