import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"
import { createAuditLog } from "@/lib/slots-server"
import { sendNewSocialMessage } from "@/lib/social/social-engine"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "MANAGER", "MARKETING", "AGENT", "CHAT_AGENT"]

/** The full thread for one conversation, plus its notes. */
export const GET = withErrors(withModule("SOCIAL_INBOX", async (
  _request: NextRequest, { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params
  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, socialId: true, tags: true, email: true } },
      assignedStaff: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true } } } },
      notes: { orderBy: { createdAt: "desc" }, include: { staff: { select: { name: true } } } },
    },
  })
  if (!conversation) return NextResponse.json({ error: "No such conversation" }, { status: 404 })

  await db.conversation.update({ where: { id }, data: { unreadCount: 0 } })
  return NextResponse.json({ conversation })
}))

/** assign · resolve · escalate · pause · resume · note · tag */
export const POST = withErrors(withModule("SOCIAL_INBOX", async (
  request: NextRequest, { params }: { params: Promise<{ id: string }> },
) => {
  const tenant = currentTenant()
  if (tenant?.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "You do not have permission to act on this conversation" }, { status: 403 })
  }
  const { id } = await params
  const conversation = await db.conversation.findUnique({ where: { id } })
  if (!conversation) return NextResponse.json({ error: "No such conversation" }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const action = String(body?.action || "")

  switch (action) {
    case "reply": {
      const text = String(body?.text || "").trim().slice(0, 2000)
      if (!text) return NextResponse.json({ error: "Reply text is required" }, { status: 400 })
      if (!tenant?.staffId) return NextResponse.json({ error: "Sign in first" }, { status: 401 })
      const result = await sendNewSocialMessage(id, tenant.staffId, text)
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 })
      return NextResponse.json({ ok: true })
    }
    case "assign": {
      const staffId = String(body?.staffId || "")
      await db.conversation.update({ where: { id }, data: { assignedStaffId: staffId || null } })
      await createAuditLog({ staffId: tenant?.staffId, action: "SOCIAL_CONVERSATION_ASSIGNED", entity: "Conversation", entityId: id, details: { assignedStaffId: staffId } })
      return NextResponse.json({ ok: true })
    }
    case "resolve": {
      await db.conversation.update({ where: { id }, data: { status: "RESOLVED" } })
      await createAuditLog({ staffId: tenant?.staffId, action: "SOCIAL_CONVERSATION_RESOLVED", entity: "Conversation", entityId: id })
      return NextResponse.json({ ok: true })
    }
    case "escalate": {
      await db.conversation.update({ where: { id }, data: { automationPaused: true, status: "PENDING" } })
      await createAuditLog({ staffId: tenant?.staffId, action: "SOCIAL_CONVERSATION_ESCALATED", entity: "Conversation", entityId: id, details: { reason: body?.reason || "Manually escalated" } })
      return NextResponse.json({ ok: true })
    }
    case "pause": {
      await db.conversation.update({ where: { id }, data: { automationPaused: true } })
      await createAuditLog({ staffId: tenant?.staffId, action: "SOCIAL_AUTOMATION_PAUSED", entity: "Conversation", entityId: id })
      return NextResponse.json({ ok: true })
    }
    case "resume": {
      await db.conversation.update({ where: { id }, data: { automationPaused: false } })
      await createAuditLog({ staffId: tenant?.staffId, action: "SOCIAL_AUTOMATION_RESUMED", entity: "Conversation", entityId: id })
      return NextResponse.json({ ok: true })
    }
    case "note": {
      const content = String(body?.content || "").trim().slice(0, 2000)
      if (!content || !tenant?.staffId) return NextResponse.json({ error: "A note and a signed-in staff member are required" }, { status: 400 })
      const note = await db.staffNote.create({ data: { tenantId: tenant.tenantId, conversationId: id, staffId: tenant.staffId, content } })
      return NextResponse.json({ note })
    }
    case "tag": {
      const tags = Array.isArray(body?.tags) ? body.tags.map(String).slice(0, 20) : []
      if (!conversation.customerId) return NextResponse.json({ error: "This conversation has no customer to tag" }, { status: 400 })
      await db.customer.update({ where: { id: conversation.customerId }, data: { tags } })
      return NextResponse.json({ ok: true })
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }
}))
