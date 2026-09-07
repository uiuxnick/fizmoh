import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { withSessionTenant, isRouteError, qrRateLimited } from "@/lib/qr-review"

/** The customer explicitly picks one AI suggestion. Never auto-chosen. */
export const PATCH = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  const limited = qrRateLimited(request.headers, "write")
  if (limited) return limited
  const body = await request.json().catch(() => null)
  const suggestionId = String(body?.suggestionId || "")
  if (!suggestionId) return NextResponse.json({ error: "suggestionId is required" }, { status: 400 })

  const result = await withSessionTenant(id, async () => {
    const { db } = await import("@/lib/db")
    const suggestion = await db.reviewSuggestion.findUnique({ where: { id: suggestionId } })
    if (!suggestion || suggestion.sessionId !== id) return { error: "No such suggestion for this session", status: 404 }

    await db.$transaction([
      db.reviewSuggestion.updateMany({ where: { sessionId: id }, data: { isSelected: false } }),
      db.reviewSuggestion.update({ where: { id: suggestionId }, data: { isSelected: true } }),
      db.reviewSession.update({
        where: { id },
        data: { selectedSuggestionId: suggestionId, finalText: suggestion.text, status: "SUGGESTION_SELECTED" },
      }),
    ])
    return { ok: true, text: suggestion.text }
  })

  if (isRouteError(result)) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result)
})
