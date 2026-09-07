import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"
import { createAuditLog } from "@/lib/slots-server"
import { approveAndPublish, retryReply } from "@/lib/review-reply-engine"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "MANAGER", "MARKETING"]

function requireEditRole(): NextResponse | null {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only marketing or workspace administrators can act on review replies" }, { status: 403 })
  }
  return null
}

/** Edits a reply's text before it goes out — never after PUBLISHED. */
export const PATCH = withErrors(withModule("DIGITAL_QR", async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const denied = requireEditRole()
  if (denied) return denied
  const { id } = await params

  const row = await db.replyLog.findUnique({ where: { id } })
  if (!row) return NextResponse.json({ error: "No such reply" }, { status: 404 })
  if (row.status === "PUBLISHED") return NextResponse.json({ error: "This reply was already published and cannot be edited" }, { status: 409 })

  const body = await request.json().catch(() => ({}))
  const text = String(body?.text || "").trim().slice(0, 4000)
  if (!text) return NextResponse.json({ error: "Reply text is required" }, { status: 400 })

  const updated = await db.replyLog.update({ where: { id }, data: { editedText: text, finalText: text } })
  const tenant = currentTenant()
  await createAuditLog({ staffId: tenant?.staffId, action: "REVIEW_REPLY_EDITED", entity: "ReplyLog", entityId: id })

  return NextResponse.json({ reply: updated })
}))

/** approve (approve + publish now), retry (a failed publish), or skip. */
export const POST = withErrors(withModule("DIGITAL_QR", async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const denied = requireEditRole()
  if (denied) return denied
  const { id } = await params
  const tenant = currentTenant()

  const body = await request.json().catch(() => ({}))
  const action = String(body?.action || "")

  if (action === "approve") {
    const result = await approveAndPublish(id, tenant?.staffId || "", body?.text)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 })
    return NextResponse.json({ ok: true })
  }
  if (action === "retry") {
    const result = await retryReply(id)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 })
    return NextResponse.json({ ok: true })
  }
  if (action === "skip") {
    const row = await db.replyLog.findUnique({ where: { id } })
    if (!row) return NextResponse.json({ error: "No such reply" }, { status: 404 })
    if (row.status === "PUBLISHED") return NextResponse.json({ error: "Already published" }, { status: 409 })
    await db.replyLog.update({ where: { id }, data: { status: "SKIPPED", skipReason: "Manually skipped by staff" } })
    await createAuditLog({ staffId: tenant?.staffId, action: "REVIEW_REPLY_SKIPPED", entity: "ReplyLog", entityId: id })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}))
