/**
 * AI review-suggestion generation for Digital QR Addons.
 *
 * The AI's only job is to phrase what the customer already said — the star
 * rating they picked and the tags/words they typed. It must never invent a
 * fact, a staff name, a dish, an event or an outcome the customer did not
 * mention. This is enforced here, server-side, and the instruction below is
 * never taken from the client: a request body cannot override tone, cannot
 * inject "always mention X", nothing. The customer's own words are the only
 * input that reaches the model as content; everything else is a fixed
 * instruction baked into this file.
 *
 * Reuses the platform's existing AI provider config (src/lib/ai-provider.ts)
 * rather than a second key/provider setup — same Anthropic/OpenAI account,
 * same admin-configured model.
 */

import { getAIConfig, anthropicClient, openaiClient } from "@/lib/ai-provider"

export type SuggestionStyle = "NATURAL" | "SHORT" | "DETAILED"

export type ReviewSuggestionResult = {
  style: SuggestionStyle
  text: string
}

const SYSTEM_PROMPT = `You are helping a customer express their own genuine experience at a business, for a review they may choose to post.

Rules, without exception:
- Do not invent facts, services, products, events, interactions, outcomes, staff names, purchases, claims, or experiences that the customer did not state.
- Only transform, organize, polish, or rewrite the information the customer actually provided (their star rating and the words/tags they gave).
- Preserve the customer's intended meaning. Do not exaggerate or downplay what they said.
- Do not produce deceptive, fabricated, or misleading content.
- Write in first person, as the customer.
- Keep it natural and human — not corporate, not generic marketing copy.
- Never mention that the text was AI-generated.

You will be told how many suggestions to produce and in which styles. Respond with strict JSON only: an array of objects, each with "style" and "text". No prose, no markdown, no explanation — JSON only.`

function buildUserPrompt(params: {
  rating: number
  tags: string[]
  freeText: string
  language: string
  tone: string
  styles: SuggestionStyle[]
}): string {
  const { rating, tags, freeText, language, tone, styles } = params
  const facts = [
    `Star rating given: ${rating} out of 5.`,
    tags.length ? `What they liked (selected tags): ${tags.join(", ")}.` : "",
    freeText.trim() ? `In their own words: "${freeText.trim()}"` : "",
  ].filter(Boolean).join("\n")

  return [
    `Customer-provided information (this is the ONLY source of fact — do not add anything beyond it):`,
    facts,
    ``,
    `Write ${styles.length} review suggestion(s), one for each of these styles: ${styles.join(", ")}.`,
    `- NATURAL: a warm, conversational review, medium length.`,
    `- SHORT: 1-2 sentences, to the point.`,
    `- DETAILED: a fuller, more descriptive review, still grounded only in what was said.`,
    `Tone: ${tone}. Language: ${language === "ar" ? "Arabic" : language === "hi" ? "Hindi" : "English"}.`,
    `Respond with JSON only: [{"style":"NATURAL","text":"..."}, ...]`,
  ].join("\n")
}

function parseSuggestions(raw: string, expectedStyles: SuggestionStyle[]): ReviewSuggestionResult[] {
  // Models occasionally wrap JSON in a code fence despite instructions.
  const cleaned = raw.trim().replace(/^```(?:json)?\n?/i, "").replace(/```$/, "").trim()
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error("AI response was not valid JSON")
  }
  if (!Array.isArray(parsed)) throw new Error("AI response was not a JSON array")

  const out: ReviewSuggestionResult[] = []
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue
    const style = String((item as Record<string, unknown>).style || "").toUpperCase()
    const text = String((item as Record<string, unknown>).text || "").trim()
    if (!text) continue
    const matched = expectedStyles.includes(style as SuggestionStyle) ? (style as SuggestionStyle) : "NATURAL"
    out.push({ style: matched, text: text.slice(0, 1500) })
  }
  if (out.length === 0) throw new Error("AI returned no usable suggestions")
  return out
}

/**
 * Generates review suggestions from what a customer actually said.
 *
 * Throws on any failure (bad config, network, unparsable output) — callers
 * must treat this as "AI unavailable" and let the customer continue without
 * it (free-text entry), never fabricate a fallback suggestion pretending to
 * be AI-written.
 */
export async function generateReviewSuggestions(params: {
  rating: number
  tags: string[]
  freeText: string
  language?: string
  tone?: string
  count?: number
}): Promise<ReviewSuggestionResult[]> {
  const rating = Math.min(5, Math.max(1, Math.round(params.rating)))
  const tags = (params.tags || []).map(t => String(t).slice(0, 40)).slice(0, 12)
  const freeText = String(params.freeText || "").slice(0, 600)
  const language = params.language || "en"
  const tone = params.tone || "friendly"
  const count = Math.min(4, Math.max(2, params.count ?? 3))

  const allStyles: SuggestionStyle[] = ["NATURAL", "SHORT", "DETAILED"]
  const styles = allStyles.slice(0, count)
  while (styles.length < count) styles.push("NATURAL")

  const config = await getAIConfig()
  const userPrompt = buildUserPrompt({ rating, tags, freeText, language, tone, styles })

  let raw: string
  if (config.provider === "anthropic") {
    const client = await anthropicClient()
    const response = await client.messages.create({
      model: config.model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    })
    const block = response.content.find(b => b.type === "text")
    raw = block && block.type === "text" ? block.text : ""
  } else {
    const client = await openaiClient()
    const response = await client.chat.completions.create({
      model: config.model,
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    })
    raw = response.choices[0]?.message?.content || ""
  }

  if (!raw.trim()) throw new Error("AI returned an empty response")
  return parseSuggestions(raw, styles)
}
