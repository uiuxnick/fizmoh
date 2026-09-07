import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { withSessionTenant, isRouteError, qrRateLimited } from "@/lib/qr-review"

/**
 * The customer confirms the exact final review text before Google opens.
 *
 * Available at every rating, deliberately. An earlier version of this route
 * only allowed confirmation for ratings a campaign routed to Google — that
 * was built to satisfy the spec's "never gate reviews" rule and did the exact
 * opposite of it: refusing to let a low rating proceed to a public review is
 * Google's own definition of review gating ("selectively soliciting positive
 * reviews from customers," per Google's contribution policy). A genuine
 * customer's honest review, whatever it says, gets the same path.
 */
export const POST = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  const limited = qrRateLimited(request.headers, "write")
  if (limited) return limited

  const result = await withSessionTenant(id, async () => {
    const { db } = await import("@/lib/db")
    const session = await db.reviewSession.findUnique({ where: { id }, include: { campaign: true } })
    if (!session) return { error: "No such session", status: 404 }
    if (!session.rating || !session.finalText) {
      return { error: "A review must be selected before it can be confirmed", status: 400 }
    }

    await db.reviewSession.update({ where: { id }, data: { status: "CONFIRMED", confirmedAt: new Date() } })
    return { finalText: session.finalText, googleReviewUrl: session.campaign.googleReviewUrl || null }
  })

  if (isRouteError(result)) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result)
})
