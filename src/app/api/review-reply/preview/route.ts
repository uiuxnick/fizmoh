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
  const settingsRow = tenant?.tenantId ? await db.reviewReplySettings.findUnique({ where: { tenantId: tenant.tenantId } }) : null
  const settingsTemplates = (settingsRow?.templates && typeof settingsRow.templates === "object" && !Array.isArray(settingsRow.templates))
    ? settingsRow.templates as Record<string, unknown>
    : {}

  const body = await request.json().catch(() => ({}))
  const reviewText = typeof body?.reviewText === "string" ? body.reviewText.slice(0, 1000) : null
  const rating = [1, 2, 3, 4, 5].includes(Number(body?.rating)) ? Number(body.rating) : 5
  const tone = (body?.tone || settingsRow?.tone || "professional") as Tone
  const customTone = typeof body?.customTone === "string" ? body.customTone : (settingsRow?.customTone ?? null)
  const replyLength = (body?.replyLength || settingsRow?.replyLength || "medium") as ReplyLength
  const defaultLanguage = (Array.isArray(settingsRow?.languages) && typeof settingsRow.languages[0] === "string")
    ? settingsRow.languages[0]
    : "en"
  const language = typeof body?.language === "string" ? body.language : defaultLanguage
  const signature = typeof body?.signature === "string" ? body.signature : (settingsRow?.signature ?? null)
  const excludedWords = Array.isArray(body?.excludedWords)
    ? body.excludedWords.map(String)
    : (settingsRow?.excludedWords ?? [])
  const escalationKeywords = Array.isArray(body?.escalationKeywords)
    ? body.escalationKeywords.map(String)
    : (settingsRow?.escalationKeywords ?? [])

  const businessName = (typeof body?.businessName === "string" && body.businessName.trim())
    ? body.businessName.trim()
    : (typeof body?.locationName === "string" && body.locationName.trim()
      ? body.locationName.trim()
      : (tenantRow?.name || ""))
  const locationName = typeof body?.locationName === "string" && body.locationName.trim() ? body.locationName.trim() : businessName
  const reviewerName = typeof body?.reviewerName === "string" ? body.reviewerName : "A customer"

  const customPrompt = typeof body?.customPrompt === "string"
    ? body.customPrompt
    : (typeof settingsTemplates.customPrompt === "string" ? settingsTemplates.customPrompt : null)

  const premiumKeywords = Array.isArray(body?.premiumKeywords)
    ? body.premiumKeywords.map(String)
    : (Array.isArray(settingsTemplates.premiumKeywords) ? settingsTemplates.premiumKeywords.map(String) : [])

  const keywordReplacements = Array.isArray(body?.keywordReplacements)
    ? body.keywordReplacements
    : (Array.isArray(settingsTemplates.keywordReplacements) ? (settingsTemplates.keywordReplacements as any) : [])

  const escalation = detectEscalation(reviewText, escalationKeywords)

  try {
    const reply = await generateReply({
      reviewText, rating, reviewerName, businessName, locationName,
      tone, customTone, replyLength, language, signature, excludedWords,
      customPrompt, premiumKeywords, keywordReplacements,
    })
    return NextResponse.json({ reply, escalation })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Preview generation failed" }, { status: 502 })
  }
}))
