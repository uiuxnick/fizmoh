import { NextRequest, NextResponse } from "next/server"
import { sessionFromRequest } from "@/lib/auth"

/**
 * POST /api/platform/translate
 *
 * Fast translation endpoint for platform operators and staff.
 * Auto-detects source language (Arabic <-> English bidirectional).
 */
export async function POST(req: NextRequest) {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const text = typeof body?.text === "string" ? body.text.trim() : ""
  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 })
  }

  // Detect whether source text is primarily Arabic
  const hasArabic = /[\u0600-\u06FF]/.test(text)
  const targetLang = body?.targetLang || (hasArabic ? "en" : "ar")

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 3600 },
    })

    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translatedText = data[0].map((chunk: any) => chunk?.[0] || "").join("").trim()
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
    console.error("[translate] Error calling translate API:", err?.message)
  }

  return NextResponse.json({ error: "Translation failed" }, { status: 502 })
}
