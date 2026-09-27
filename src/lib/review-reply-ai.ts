/**
 * Google review auto-reply — generation and the deterministic safety rules
 * around it.
 *
 * Two layers, deliberately kept apart:
 *
 *   1. Deterministic rules (this file's exported pure functions) — which
 *      rating band a review falls into, whether it trips an escalation
 *      keyword, what a "concerning" review looks like. These never call the
 *      AI and are what the test suite actually exercises, because a keyword
 *      match must be exact and reproducible, not something a model call can
 *      make flaky.
 *   2. The AI call itself (`generateReply`) — only ever asked to write the
 *      words, never asked to decide whether a review is safe to answer
 *      automatically. That decision is made before the model is called, by
 *      the plain functions above it, and again after in review-reply-engine.ts
 *      by an operator's own settings.
 *
 * The system prompt below is server-only and not configurable from the
 * frontend beyond tone/length/signature — a tenant can shape how a reply
 * sounds, never whether it argues, invents, or asks for private information.
 */

import { getAIConfig, anthropicClient, openaiClient } from "@/lib/ai-provider"

export type Tone = "professional" | "warm" | "formal" | "casual" | "luxury" | "custom"
export type ReplyLength = "short" | "medium" | "detailed"
export type RatingBand = "5" | "4" | "3" | "1-2" | "unrated"

// ── Escalation — deterministic, never left to the model ────────────────────

/**
 * Default keyword categories that force PENDING_APPROVAL / ESCALATED
 * regardless of mode, star rating, or tenant settings — spec section 3 and 5.
 * Matched as whole-word, case-insensitive substrings against the review text.
 */
export const DEFAULT_ESCALATION_KEYWORDS: Record<string, string[]> = {
  refund: ["refund", "money back", "reimburse", "chargeback"],
  legal: ["lawsuit", "sue", "suing", "lawyer", "attorney", "legal action", "court"],
  safety: ["injury", "injured", "hurt", "unsafe", "hospital", "allergic reaction", "food poisoning", "accident"],
  discrimination: ["racist", "racism", "discriminat", "sexist", "harassment", "harassed"],
  urgent: ["urgent", "emergency", "immediately", "right now"],
}

export interface EscalationResult {
  escalate: boolean
  reason: string | null
  matchedCategory: string | null
}

/** Scans review text for escalation-worthy content. Empty/missing text never escalates on its own. */
export function detectEscalation(text: string | null | undefined, extraKeywords: string[] = []): EscalationResult {
  const haystack = (text || "").toLowerCase()
  if (!haystack.trim()) return { escalate: false, reason: null, matchedCategory: null }

  for (const [category, words] of Object.entries(DEFAULT_ESCALATION_KEYWORDS)) {
    for (const word of words) {
      if (haystack.includes(word)) {
        return { escalate: true, matchedCategory: category, reason: `Mentions ${category} ("${word}")` }
      }
    }
  }
  for (const word of extraKeywords) {
    const w = word.trim().toLowerCase()
    if (w && haystack.includes(w)) {
      return { escalate: true, matchedCategory: "custom", reason: `Mentions a flagged phrase ("${w}")` }
    }
  }
  return { escalate: false, reason: null, matchedCategory: null }
}

/** 5/4/3/1-2, or "unrated" for a review Google reports with no star value (rare, but real). */
export function ratingBand(rating: number): RatingBand {
  if (rating >= 5) return "5"
  if (rating === 4) return "4"
  if (rating === 3) return "3"
  if (rating >= 1) return "1-2"
  return "unrated"
}

/** Whether AUTOMATIC mode is allowed to publish this rating without a click — the settings' own floor, never overridden lower. */
export function isAutoPublishEligible(rating: number, autoPublishMinRating: number, requireApprovalBelow: number): boolean {
  if (rating <= 0) return false // an unrated/emoji-only review always goes to approval — nothing to safely auto-judge
  if (rating < requireApprovalBelow) return false
  return rating >= autoPublishMinRating
}

// ── Routing — which status a review lands in, before any AI call ───────────

export type ReplyMode = "MANUAL_APPROVAL" | "AUTOMATIC" | "DRAFT_ONLY"
export type RouteAction = "AUTO_PUBLISH" | "PENDING_APPROVAL" | "DRAFT" | "ESCALATED"

export interface RouteDecision { action: RouteAction; reason: string | null }

export interface RouteInput {
  rating: number
  escalation: EscalationResult
  mode: ReplyMode
  autoPublishMinRating: number
  requireApprovalBelow: number
  dailyPublishedCount: number
  maxRepliesPerDay: number
}

/**
 * Where one review's reply goes, before a single word is generated.
 *
 * Deliberately checked in this order: escalation always wins regardless of
 * mode (a keyword hit in DRAFT_ONLY still gets flagged as ESCALATED rather
 * than a plain draft, so it surfaces in the inbox distinctly); the daily cap
 * only matters for the one path that could otherwise skip a human, AUTOMATIC.
 */
export function decideRoute(input: RouteInput): RouteDecision {
  if (input.escalation.escalate) return { action: "ESCALATED", reason: input.escalation.reason }
  if (input.mode === "DRAFT_ONLY") return { action: "DRAFT", reason: null }
  if (input.mode === "MANUAL_APPROVAL") return { action: "PENDING_APPROVAL", reason: null }

  // AUTOMATIC
  if (!isAutoPublishEligible(input.rating, input.autoPublishMinRating, input.requireApprovalBelow)) {
    return { action: "PENDING_APPROVAL", reason: `Rating ${input.rating || "unrated"} is below the auto-publish threshold` }
  }
  if (input.dailyPublishedCount >= input.maxRepliesPerDay) {
    return { action: "PENDING_APPROVAL", reason: "Daily reply cap reached" }
  }
  return { action: "AUTO_PUBLISH", reason: null }
}

// ── Backoff — for the retry queue, deterministic and unit-testable ─────────

const MAX_RETRIES = 6

/** Exponential backoff in minutes: 2, 4, 8, 16, 32, 64 — capped at MAX_RETRIES. */
export function nextRetryDelayMinutes(retryCount: number): number | null {
  if (retryCount >= MAX_RETRIES) return null // give up automatically retrying; still retriable by hand
  return 2 ** (retryCount + 1)
}

// ── Generation ──────────────────────────────────────────────────────────────

export interface KeywordReplacementRule {
  search: string
  replace: string
}

export interface GenerateReplyInput {
  reviewText: string | null
  rating: number
  reviewerName: string | null
  businessName: string
  locationName?: string | null
  tone: Tone
  customTone: string | null
  replyLength: ReplyLength
  language: string // e.g. "en" — reply in this language
  signature: string | null
  excludedWords: string[]
  customPrompt?: string | null
  premiumKeywords?: string[]
  keywordReplacements?: KeywordReplacementRule[]
}

const LENGTH_GUIDE: Record<ReplyLength, string> = {
  short: "One or two sentences.",
  medium: "Two to four sentences.",
  detailed: "Four to six sentences, still concise — never padded.",
}

const TONE_GUIDE: Record<Exclude<Tone, "custom">, string> = {
  professional: "Professional and courteous.",
  warm: "Warm, friendly, genuinely personable.",
  formal: "Formal and reserved.",
  casual: "Casual and conversational, still respectful.",
  luxury: "Refined, understated, the register of a high-end hospitality brand.",
}

const SYSTEM_PROMPT = `You write a business's public reply to one Google customer review. Follow every rule exactly:

- Never invent facts, offers, prices, discounts, refunds, services, or promises the business did not state.
- Never mention that you are an AI, a bot, or that this reply is automated.
- Never argue with the customer, dispute their account of events, or admit legal liability.
- Never reveal private information about the customer or any other person.
- Never ask the customer to share sensitive information (payment details, ID numbers, medical information) in this public reply.
- Never offer money, discounts, or any incentive in exchange for changing or removing a review.
- Reference something specific from the review when there is something specific to reference — a genuine detail, not a generic compliment. If the review has no usable text (rating-only or emoji-only), reply briefly and warmly without inventing specifics.
- For 5-star reviews: thank the customer warmly, mention the specific positive detail they raised.
- For 4-star reviews: thank the customer, acknowledge the feedback without over-apologizing.
- For 3-star reviews: thank them for the honest feedback and invite them to share more detail privately (do not name a specific contact channel unless told one).
- For 1-2 star reviews: stay calm, apologize for the poor experience without admitting fault or liability, invite them to contact the business directly to make it right.
- Keep it concise and natural — never robotic, exaggerated, or promotional.
- Respond with strict JSON only: {"reply":"..."}. No markdown, no explanation.`

/** Interpolates template variables {{variable}} into prompt */
export function interpolatePrompt(template: string, vars: {
  business_name?: string | null
  location_name?: string | null
  reviewer_name?: string | null
  rating?: number | null
  review_text?: string | null
  premium_keywords?: string | null
}): string {
  return template
    .replace(/\{\{\s*business_name\s*\}\}/gi, vars.business_name || "the business")
    .replace(/\{\{\s*location_name\s*\}\}/gi, vars.location_name || vars.business_name || "our location")
    .replace(/\{\{\s*reviewer_name\s*\}\}/gi, vars.reviewer_name || "valued customer")
    .replace(/\{\{\s*rating\s*\}\}/gi, String(vars.rating ?? 5))
    .replace(/\{\{\s*review_text\s*\}\}/gi, vars.review_text || "")
    .replace(/\{\{\s*premium_keywords\s*\}\}/gi, vars.premium_keywords || "")
}

/** Case-preserving whole-word replacement using single-pass alternation (prevents cascading re-replacements) */
export function applyKeywordReplacements(text: string, rules: KeywordReplacementRule[]): string {
  if (!text || !Array.isArray(rules) || rules.length === 0) return text

  const validRules = rules.filter(r => r.search?.trim() && r.replace?.trim())
  if (validRules.length === 0) return text

  // Sort longest search term first so "perfumes" matches before "perfume"
  const sortedRules = [...validRules].sort((a, b) => b.search.trim().length - a.search.trim().length)
  const ruleMap = new Map<string, string>()
  const escapedPatterns: string[] = []

  for (const rule of sortedRules) {
    const s = rule.search.trim()
    const lower = s.toLowerCase()
    if (!ruleMap.has(lower)) {
      ruleMap.set(lower, rule.replace.trim())
      escapedPatterns.push(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    }
  }

  if (escapedPatterns.length === 0) return text

  const combinedRegex = new RegExp(`\\b(?:${escapedPatterns.join("|")})\\b`, "gi")

  return text.replace(combinedRegex, (match) => {
    const replaceWith = ruleMap.get(match.toLowerCase())
    if (!replaceWith) return match

    // Preserve TitleCase (e.g. "Product" -> "Luxury fragrance")
    if (match[0] === match[0].toUpperCase() && match.slice(1) === match.slice(1).toLowerCase()) {
      return replaceWith.charAt(0).toUpperCase() + replaceWith.slice(1)
    }
    // Preserve UPPERCASE (e.g. "PRODUCT" -> "LUXURY FRAGRANCE")
    if (match === match.toUpperCase()) {
      return replaceWith.toUpperCase()
    }
    // Default lowercase / match case
    return replaceWith
  })
}

export async function generateReply(input: GenerateReplyInput): Promise<string> {
  const config = await getAIConfig()
  const toneLine = input.tone === "custom" && input.customTone ? input.customTone.slice(0, 300) : TONE_GUIDE[input.tone as Exclude<Tone, "custom">] || TONE_GUIDE.professional

  const premiumKeywordsList = Array.isArray(input.premiumKeywords) ? input.premiumKeywords.filter(Boolean) : []
  const premiumKeywordsStr = premiumKeywordsList.join(", ")

  const customPromptInterpolated = input.customPrompt?.trim()
    ? interpolatePrompt(input.customPrompt, {
        business_name: input.businessName,
        location_name: input.locationName || input.businessName,
        reviewer_name: input.reviewerName || "valued customer",
        rating: input.rating,
        review_text: input.reviewText || "(rating only, no comment)",
        premium_keywords: premiumKeywordsStr,
      })
    : ""

  const userPrompt = [
    `Business / Location: ${input.locationName || input.businessName || "the business"}`,
    `Reviewer: ${input.reviewerName || "a customer"}`,
    `Star rating: ${input.rating || "not given"} / 5`,
    `Review text: ${input.reviewText ? `"${input.reviewText.slice(0, 1000)}"` : "(no text — rating only, or emoji only)"}`,
    customPromptInterpolated ? `Special instructions / brand prompt:\n${customPromptInterpolated}` : "",
    premiumKeywordsStr ? `Premium SEO & Brand Keywords to naturally weave in (use 1 or 2 naturally if fitting, do not force or sound spammy): ${premiumKeywordsStr}` : "",
    `Tone: ${toneLine}`,
    `Length: ${LENGTH_GUIDE[input.replyLength]}`,
    `Reply language: ${input.language}`,
    input.excludedWords.length ? `Never use these words/phrases: ${input.excludedWords.join(", ")}` : "",
    input.signature ? `End with this exact signature on its own line: ${input.signature.slice(0, 100)}` : "",
  ].filter(Boolean).join("\n")

  let raw = ""
  if (config.provider === "anthropic") {
    const client = await anthropicClient()
    const response = await client.messages.create({
      model: config.model, max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    })
    const block = response.content.find(b => b.type === "text")
    raw = block && block.type === "text" ? block.text : ""
  } else {
    const client = await openaiClient()
    const response = await client.chat.completions.create({
      model: config.model, max_tokens: 500,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }],
    })
    raw = response.choices[0]?.message?.content || ""
  }

  const cleaned = raw.trim().replace(/^```(?:json)?\n?/i, "").replace(/```$/, "").trim()
  const parsed = JSON.parse(cleaned) as { reply?: string }
  let reply = String(parsed.reply || "").trim()
  if (!reply) throw new Error("AI returned an empty reply")

  if (Array.isArray(input.keywordReplacements) && input.keywordReplacements.length > 0) {
    reply = applyKeywordReplacements(reply, input.keywordReplacements)
  }

  return reply.slice(0, 4000)
}
