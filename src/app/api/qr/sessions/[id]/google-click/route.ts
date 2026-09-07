import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { withSessionTenant, isRouteError, qrRateLimited } from "@/lib/qr-review"

/**
 * The customer clicked "Post on Google."
 *
 * This records the click and hands back the link to open — it never claims
 * the review was actually posted. There is no supported way to verify a
 * Google submission from here, so googleStatus only ever reaches
 * CTA_CLICKED. Anything claiming "verified" or "submitted" without an
 * official mechanism behind it would be exactly the fabricated status the
 * spec forbids.
 */
export const POST = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  const limited = qrRateLimited(request.headers, "write")
  if (limited) return limited

  const result = await withSessionTenant(id, async () => {
    const { db } = await import("@/lib/db")
    const session = await db.reviewSession.findUnique({ where: { id }, include: { campaign: true } })
    if (!session) return { error: "No such session", status: 404 }
    if (session.status !== "CONFIRMED") return { error: "The review must be confirmed first", status: 400 }
    if (!session.campaign.googleReviewUrl) {
      return { error: "This business has not configured a Google review link yet", status: 409 }
    }

    await db.reviewSession.update({
      where: { id },
      data: {
        status: "ROUTED_GOOGLE",
        googleStatus: "CTA_CLICKED",
        googleClickedAt: new Date(),
        completedAt: new Date(),
      },
    })
    return { googleReviewUrl: session.campaign.googleReviewUrl }
  })

  if (isRouteError(result)) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result)
})
