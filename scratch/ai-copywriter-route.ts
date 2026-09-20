import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { brief, tone = "friendly", cta = "Book now" } = await req.json()
    if (!brief) return NextResponse.json({ error: "Brief is required" }, { status: 400 })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        subject: `Exclusive Deal: ${brief.slice(0, 30)}`,
        body: `Hello! ${brief}. ${cta} today to secure your spot!`,
      })
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional marketing copywriter for WhatsApp and Email campaigns. Generate concise, high-converting broadcast copy. Return JSON with 'subject' and 'body'. Do not include markdown codeblocks.",
          },
          {
            role: "user",
            content: `Brief: ${brief}\nTone: ${tone}\nCall to Action: ${cta}`,
          },
        ],
        temperature: 0.7,
      }),
    })

    if (!res.ok) {
      return NextResponse.json({
        subject: `Special Offer: ${brief.slice(0, 30)}`,
        body: `Hi there! ${brief}. ${cta} now!`,
      })
    }

    const data = await res.json()
    const contentText = data.choices?.[0]?.message?.content || ""
    try {
      const parsed = JSON.parse(contentText.replace(/```json|```/g, "").trim())
      return NextResponse.json(parsed)
    } catch {
      return NextResponse.json({
        subject: `Special Offer: ${brief.slice(0, 30)}`,
        body: contentText || `Hi there! ${brief}. ${cta} now!`,
      })
    }
  } catch {
    return NextResponse.json({ error: "Copywriter generation failed" }, { status: 500 })
  }
}
