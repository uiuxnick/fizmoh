import { NextRequest, NextResponse } from "next/server"
import { aiChat } from "@/lib/ai"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

export const POST = withErrors(withModule("AI", async (request: NextRequest) => {
  const body = await request.json()
  const { messages, language } = body

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: "messages array required" }, { status: 400 })
  }

  const response = await aiChat(messages, language || "en")
  return NextResponse.json({ response })
}))
