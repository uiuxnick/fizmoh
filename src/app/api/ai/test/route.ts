import { NextRequest, NextResponse } from "next/server"
import { testAIConnection } from "@/lib/ai"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

/**
 * Connectivity test for the configured AI provider.
 * Used by Settings → AI so an operator can confirm the key and model work
 * before customers hit the assistant.
 */
export const POST = withErrors(withModule("AI", async (request: NextRequest) => {
  let prompt = "Reply with exactly: OK"
  try {
    const body = await request.json()
    if (typeof body?.prompt === "string" && body.prompt.trim()) {
      prompt = body.prompt.trim().slice(0, 500)
    }
  } catch {
    // No body is fine — fall back to the default probe.
  }

  const result = await testAIConnection(prompt)
  return NextResponse.json(result, { status: result.ok ? 200 : 502 })
}))
