import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { withSessionTenant, isRouteError, qrRateLimited } from "@/lib/qr-review"

/** The customer actively picks a star rating. Never pre-selected. */
export const PATCH = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  const limited = qrRateLimited(request.headers, "write")
  if (limited) return limited
  const body = await request.json().catch(() => null)
  const rating = Number(body?.rating)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be an integer from 1 to 5" }, { status: 400 })
  }

  const result = await withSessionTenant(id, async () => {
    const { db } = await import("@/lib/db")
    const session = await db.reviewSession.findUnique({ where: { id } })
    if (!session) return { error: "No such session", status: 404 }
    await db.reviewSession.update({
      where: { id },
      data: { rating, status: "RATED", ratedAt: new Date() },
    })
    return { ok: true }
  })

  if (isRouteError(result)) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result)
})
