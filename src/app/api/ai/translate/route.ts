import { NextRequest, NextResponse } from "next/server"
import { sessionFromRequest } from "@/lib/auth"
import { withErrors } from "@/lib/api-handler"
import { rephraseMessage, isAIConfigured } from "@/lib/ai"

/**
 * POST /api/ai/translate
 *
 * Real-time translation for support agents and inbox messages.
 * Translates between Arabic, English, Urdu, French, Hindi, Spanish, etc.
 * Uses fast translation with AI fallback.
 */
export const POST = withErrors(async (req: NextRequest) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const text = typeof body?.text === "string" ? body.text.trim() : ""
  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 })
  }

  const hasArabic = /[\u0600-\u06FF]/.test(text)
  const targetLang = (body?.targetLang || (hasArabic ? "en" : "ar")).toLowerCase()

  // 1. Fast Google GTX translation
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
      targetLang,
    )}&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 3600 },
    })

    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translatedText = data[0]
          .map((chunk: any) => chunk?.[0] || "")
          .join("")
          .trim()
        const detectedSource = data[2] || (hasArabic ? "ar" : "en")
        if (translatedText) {
          return NextResponse.json({
            success: true,
            translatedText,
            detectedSource,
            targetLang,
          })
        }
      }
    }
  } catch (err: any) {
    console.warn("[ai/translate] Fast translation failed, falling back to AI:", err?.message)
  }

  // 2. AI Fallback (OpenAI / Claude) if configured
  if (await isAIConfigured()) {
    try {
      const tone = targetLang === "ar" ? "translate_ar" : "translate_en"
      const translatedText = await rephraseMessage(text, tone)
      if (translatedText && translatedText !== text) {
        return NextResponse.json({
          success: true,
          translatedText,
          detectedSource: hasArabic ? "ar" : "en",
          targetLang,
        })
      }
    } catch (aiErr: any) {
      console.error("[ai/translate] AI fallback translation error:", aiErr?.message)
    }
  }

  return NextResponse.json({ error: "Translation failed" }, { status: 502 })
})
