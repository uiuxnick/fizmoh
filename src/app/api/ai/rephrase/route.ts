import { NextRequest, NextResponse } from "next/server"
import { rephraseMessage, isAIConfigured } from "@/lib/ai"
import { withErrors } from "@/lib/api-handler"

/**
 * Rephrases or translates draft replies for support agents into specific tones:
 * - professional (formal, polite business tone)
 * - friendly (warm, welcoming, empathetic with emojis)
 * - concise (short, punchy, WhatsApp-optimized)
 * - translate_ar (native Arabic translation)
 * - translate_en (clean English translation)
 */
export const POST = withErrors(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}))
  const { text, tone } = body

  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 })
  }

  const validTones = ["professional", "friendly", "concise", "translate_ar", "translate_en"]
  const selectedTone = validTones.includes(tone) ? tone : "professional"

  if (!(await isAIConfigured())) {
    return NextResponse.json({
      rephrased: text,
      warning: "AI provider is not configured. Kept original text.",
    })
  }

  const rephrased = await rephraseMessage(text.trim(), selectedTone)

  return NextResponse.json({
    rephrased,
    original: text,
    tone: selectedTone,
  })
})
