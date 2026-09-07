import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { withSessionTenant, isRouteError, qrRateLimited } from "@/lib/qr-review"
import { generateReviewSuggestions } from "@/lib/review-ai"

/**
 * AI drafts 2-4 review suggestions from what the customer already said.
 *
 * If the model fails or is unavailable, this reports it plainly rather than
 * fabricating a suggestion — the customer's own free text remains usable as
 * their review even without AI.
 */
export const POST = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const limited = qrRateLimited(request.headers, "generate")
  if (limited) return limited

  const { id } = await params

  const result = await withSessionTenant(id, async ({ tenant }) => {
    const { db } = await import("@/lib/db")
    const session = await db.reviewSession.findUnique({ where: { id }, include: { campaign: true } })
    if (!session) return { error: "No such session", status: 404 }
    if (!session.rating) return { error: "A rating must be selected first", status: 400 }

    let suggestions
    try {
      suggestions = await generateReviewSuggestions({
        rating: session.rating,
        tags: Array.isArray(session.inputTags) ? (session.inputTags as string[]) : [],
        freeText: session.inputText || "",
        language: session.campaign.language,
        tone: session.campaign.aiTone,
        count: session.campaign.aiSuggestionCount,
      })
    } catch (e) {
      return { error: e instanceof Error ? e.message : "AI is unavailable right now", status: 502, aiUnavailable: true }
    }

    const created = await db.$transaction(
      suggestions.map(s => db.reviewSuggestion.create({ data: { tenantId: tenant.tenantId, sessionId: id, style: s.style, text: s.text } })),
    )
    await db.reviewSession.update({ where: { id }, data: { status: "AI_GENERATED", aiGeneratedAt: new Date() } })

    return { suggestions: created.map(c => ({ id: c.id, style: c.style, text: c.text })) }
  })

  if (isRouteError(result)) {
    const aiDown = "aiUnavailable" in result
    return NextResponse.json({ error: result.error, aiUnavailable: aiDown }, { status: result.status })
  }
  return NextResponse.json(result)
})
