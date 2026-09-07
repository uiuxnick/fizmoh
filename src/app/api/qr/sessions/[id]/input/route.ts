import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { withSessionTenant, isRouteError, qrRateLimited } from "@/lib/qr-review"

/** What the customer liked — quick-select tags and/or a few words, their own. */
export const PATCH = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  const limited = qrRateLimited(request.headers, "write")
  if (limited) return limited
  const body = await request.json().catch(() => null)
  const tags = Array.isArray(body?.tags) ? body.tags.map((t: unknown) => String(t).slice(0, 40)).slice(0, 12) : []
  const freeText = typeof body?.freeText === "string" ? body.freeText.slice(0, 600) : ""

  const result = await withSessionTenant(id, async () => {
    const { db } = await import("@/lib/db")
    const session = await db.reviewSession.findUnique({ where: { id } })
    if (!session) return { error: "No such session", status: 404 }
    if (!session.rating) return { error: "A rating must be selected first", status: 400 }
    await db.reviewSession.update({
      where: { id },
      data: { inputTags: tags, inputText: freeText, status: "INPUT_GIVEN" },
    })
    return { ok: true }
  })

  if (isRouteError(result)) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result)
})
