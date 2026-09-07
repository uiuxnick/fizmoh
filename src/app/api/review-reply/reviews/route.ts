import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

const STATUSES = ["NEW", "DRAFT", "PENDING_APPROVAL", "APPROVED", "PUBLISHED", "FAILED", "SKIPPED", "ESCALATED"]
const PAGE_SIZE = 25

/** The tenant-scoped review inbox — filterable, paginated. */
export const GET = withErrors(withModule("DIGITAL_QR", async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const rating = searchParams.get("rating")
  const search = searchParams.get("search")?.trim()
  const page = Math.max(1, Number(searchParams.get("page")) || 1)

  const where: Record<string, unknown> = {}
  if (status && STATUSES.includes(status)) where.status = status
  const reviewWhere: Record<string, unknown> = {}
  if (rating && [1, 2, 3, 4, 5].includes(Number(rating))) reviewWhere.rating = Number(rating)
  if (search) reviewWhere.comment = { contains: search, mode: "insensitive" }
  if (Object.keys(reviewWhere).length) where.review = reviewWhere

  const [total, rows] = await Promise.all([
    db.replyLog.count({ where }),
    db.replyLog.findMany({
      where,
      include: { review: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])

  return NextResponse.json({
    reviews: rows.map(r => ({
      id: r.id,
      status: r.status,
      rating: r.review.rating,
      reviewerName: r.review.reviewerName,
      comment: r.review.comment,
      createTime: r.review.createTime,
      generatedText: r.generatedText,
      editedText: r.editedText,
      finalText: r.finalText,
      escalationReason: r.escalationReason,
      skipReason: r.skipReason,
      failReason: r.failReason,
      retryCount: r.retryCount,
      approvedAt: r.approvedAt,
      publishedAt: r.publishedAt,
      scheduledFor: r.scheduledFor,
      alreadyRepliedOnGoogle: r.review.alreadyRepliedOnGoogle,
    })),
    page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  })
}))
