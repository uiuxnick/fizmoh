import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { generateSocialReply, detectSocialEscalation, type Tone } from "@/lib/social/social-ai"

export const POST = withErrors(withModule("SOCIAL_INBOX", async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId || !tenant.staffId) return NextResponse.json({ error: "Workspace sign-in required" }, { status: 401 })
  if (!checkRateLimit(`social-preview:${tenant.tenantId}`, 20, 60_000).allowed) return NextResponse.json({ error: "Please wait a minute before testing more replies" }, { status: 429 })
  const body = await request.json()
  if (!["FACEBOOK", "INSTAGRAM"].includes(body.channel) || typeof body.message !== "string" || !body.message.trim() || body.message.length > 1000) return NextResponse.json({ error: "Choose a channel and enter up to 1000 characters" }, { status: 400 })
  const settings = await db.socialAutomationSettings.findUnique({ where: { tenantId_channel: { tenantId: tenant.tenantId, channel: body.channel } } })
  const business = await db.tenant.findUnique({ where: { id: tenant.tenantId }, select: { name: true } })
  const escalation = detectSocialEscalation(body.message, Array.isArray(settings?.handoffKeywords) ? settings.handoffKeywords as string[] : [])
  if (escalation.escalate) return NextResponse.json({ reply: settings?.fallbackReply || "The team will review this question.", handoff: true, reason: escalation.reason })
  try {
    const reply = await generateSocialReply({ message: body.message, businessName: business?.name || "", businessInfo: settings?.businessInfo as Record<string, unknown> || null, customInstructions: settings?.customInstructions || null, tone: settings?.tone as Tone || "friendly", customTone: settings?.customTone || null, language: "Match the customer's message", history: [] })
    return NextResponse.json({ reply, handoff: false })
  } catch {
    return NextResponse.json({ reply: settings?.fallbackReply || "The team needs to answer this question. Check the saved business information and AI provider connection.", handoff: true })
  }
}))
