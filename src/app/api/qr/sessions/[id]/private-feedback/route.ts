import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { withSessionTenant, isRouteError, qrRateLimited } from "@/lib/qr-review"

/**
 * Private feedback for the business — an addition to the Google review path,
 * never a replacement for it.
 *
 * This used to be the only path a below-threshold rating could take, with
 * Google refused outright. That was the review-gating problem: a genuine
 * customer's low rating never got a public path at all. Every rating can post
 * to Google now (see confirm/route.ts), and this exists alongside that for
 * whoever also wants to tell the business directly — offered, not forced,
 * available at any rating.
 */
export const POST = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  const limited = qrRateLimited(request.headers, "write")
  if (limited) return limited
  const body = await request.json().catch(() => null)
  const feedbackText = typeof body?.feedbackText === "string" ? body.feedbackText.trim().slice(0, 2000) : ""
  const category = typeof body?.category === "string" ? body.category.slice(0, 60) : null
  const contactName = typeof body?.contactName === "string" ? body.contactName.slice(0, 120) : null
  const contactPhone = typeof body?.contactPhone === "string" ? body.contactPhone.slice(0, 40) : null
  const contactEmail = typeof body?.contactEmail === "string" ? body.contactEmail.slice(0, 200) : null
  const wantsCallback = body?.wantsCallback === true

  const result = await withSessionTenant(id, async ({ tenant }) => {
    const { db } = await import("@/lib/db")
    const session = await db.reviewSession.findUnique({ where: { id } })
    if (!session) return { error: "No such session", status: 404 }
    if (!session.rating) return { error: "A rating must be selected first", status: 400 }

    const feedback = await db.privateFeedback.create({
      data: {
        tenantId: tenant.tenantId,
        sessionId: id, rating: session.rating, category, feedbackText,
        contactName, contactPhone, contactEmail, wantsCallback,
      },
    })

    // Additive: if the customer already confirmed a review or clicked
    // through to Google, that progress stands. This only marks the journey's
    // end state when private feedback is genuinely the only thing they did.
    const stillEarly = !["CONFIRMED", "ROUTED_GOOGLE"].includes(session.status)
    if (stillEarly) {
      await db.reviewSession.update({
        where: { id },
        data: { status: "ROUTED_PRIVATE", completedAt: new Date() },
      })
    }

    return { ok: true, feedbackId: feedback.id }
  })

  if (isRouteError(result)) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result)
})
