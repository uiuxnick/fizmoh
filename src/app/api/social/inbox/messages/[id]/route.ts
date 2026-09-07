import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"
import { sendSocialMessageNow, regenerateSocialReply } from "@/lib/social/social-engine"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "MANAGER", "MARKETING", "AGENT", "CHAT_AGENT"]

/** Edit a draft reply's text before sending. */
export const PATCH = withErrors(withModule("SOCIAL_INBOX", async (
  request: NextRequest, { params }: { params: Promise<{ id: string }> },
) => {
  const tenant = currentTenant()
  if (tenant?.role && !EDIT_ROLES.includes(tenant.role)) return NextResponse.json({ error: "No permission" }, { status: 403 })
  const { id } = await params
  const message = await db.message.findUnique({ where: { id } })
  if (!message) return NextResponse.json({ error: "No such message" }, { status: 404 })
  if (message.status === "SENT") return NextResponse.json({ error: "Already sent — cannot edit" }, { status: 409 })

  const body = await request.json().catch(() => ({}))
  const content = String(body?.content || "").trim().slice(0, 2000)
  if (!content) return NextResponse.json({ error: "Reply text is required" }, { status: 400 })

  const updated = await db.message.update({ where: { id }, data: { content } })
  return NextResponse.json({ message: updated })
}))

/** send-manual reply text, or a drafted one · regenerate a draft */
export const POST = withErrors(withModule("SOCIAL_INBOX", async (
  request: NextRequest, { params }: { params: Promise<{ id: string }> },
) => {
  const tenant = currentTenant()
  if (tenant?.role && !EDIT_ROLES.includes(tenant.role)) return NextResponse.json({ error: "No permission" }, { status: 403 })
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const action = String(body?.action || "")

  if (action === "send") {
    const result = await sendSocialMessageNow(id, tenant?.staffId || "", body?.text)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 })
    return NextResponse.json({ ok: true })
  }
  if (action === "regenerate") {
    const result = await regenerateSocialReply(id)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 })
    return NextResponse.json({ ok: true, text: result.text })
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}))
