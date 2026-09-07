import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"
import { generateReply, detectEscalation, type Tone, type ReplyLength } from "@/lib/review-reply-ai"

/**
 * Test mode — generates a reply for a sample review without touching the
 * database or Google in any way. Used by the settings screen's "preview a
 * reply before saving" control, and safe to call as often as the tone/length
 * inputs change.
 */
export const POST = withErrors(withModule("DIGITAL_QR", async (request: NextRequest) => {
  const tenant = currentTenant()
  const tenantRow = tenant?.tenantId ? await db.tenant.findUnique({ where: { id: tenant.tenantId }, select: { name: true } }) : null

  const body = await request.json().catch(() => ({}))
  const reviewText = typeof body?.reviewText === "string" ? body.reviewText.slice(0, 1000) : null
  const rating = [1, 2, 3, 4, 5].includes(Number(body?.rating)) ? Number(body.rating) : 5
  const tone = (body?.tone || "professional") as Tone
  const customTone = typeof body?.customTone === "string" ? body.customTone : null
  const replyLength = (body?.replyLength || "medium") as ReplyLength
  const language = typeof body?.language === "string" ? body.language : "en"
  const signature = typeof body?.signature === "string" ? body.signature : null
  const excludedWords = Array.isArray(body?.excludedWords) ? body.excludedWords.map(String) : []
  const escalationKeywords = Array.isArray(body?.escalationKeywords) ? body.escalationKeywords.map(String) : []

  const escalation = detectEscalation(reviewText, escalationKeywords)

  try {
    const reply = await generateReply({
      reviewText, rating, reviewerName: "A customer", businessName: tenantRow?.name || "",
      tone, customTone, replyLength, language, signature, excludedWords,
    })
    return NextResponse.json({ reply, escalation })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Preview generation failed" }, { status: 502 })
  }
}))
