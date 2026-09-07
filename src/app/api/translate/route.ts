import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { getAIConfig, activeKey } from "@/lib/ai-provider"
import { z } from "zod"

/**
 * Translates a message, either way.
 *
 * An agent reads an Arabic message in English, and writes a reply in English
 * that the customer receives in Arabic. The alternative — copying text into a
 * translation site and back — is what people do now, and it is where the
 * mistakes come from.
 *
 * Uses the OpenAI key that is already configured. A dedicated translation API
 * would be faster, but it would be another account, another key and another
 * bill for a job this does well enough at conversational length.
 */

const schema = z.object({
  text: z.string().trim().min(1).max(4000),
  /// Two-letter target, or "auto" to render into the operator's language.
  to: z.string().trim().min(2).max(5).default("en"),
})

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", ar: "Arabic", hi: "Hindi", ur: "Urdu", fa: "Persian",
  fr: "French", de: "German", es: "Spanish", ru: "Russian", zh: "Chinese",
  tr: "Turkish", id: "Indonesian", ml: "Malayalam", ta: "Tamil", bn: "Bengali",
}

export const POST = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Nothing to translate" }, { status: 400 })

  const { text, to } = parsed.data
  const target = LANGUAGE_NAMES[to.slice(0, 2).toLowerCase()] || "English"

  const config = await getAIConfig()
  const key = config.provider === "openai" ? activeKey(config) : process.env.OPENAI_API_KEY || ""
  if (!key) return NextResponse.json({ error: "Translation is not configured" }, { status: 503 })

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        // The small model is enough for this and roughly ten times cheaper
        // than the one the assistant uses.
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 1000,
        messages: [
          {
            role: "system",
            content:
              `Translate the user's message into ${target}. ` +
              "Reply with the translation and nothing else — no quotes, no explanation, no notes. " +
              "Keep names, order numbers, prices and links exactly as they are. " +
              "Match the register of the original: a casual message stays casual. " +
              `If the text is already ${target}, return it unchanged.`,
          },
          { role: "user", content: text },
        ],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error("Translation failed:", JSON.stringify(data).slice(0, 200))
      return NextResponse.json({ error: "The translation service refused" }, { status: 502 })
    }

    const translation = data.choices?.[0]?.message?.content?.trim()
    if (!translation) return NextResponse.json({ error: "No translation came back" }, { status: 502 })

    return NextResponse.json({ translation, to })
  } catch (error) {
    console.error("Translation error:", error)
    return NextResponse.json({ error: "Could not reach the translation service" }, { status: 502 })
  }
})
