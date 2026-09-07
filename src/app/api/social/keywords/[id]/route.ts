import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "MANAGER", "MARKETING"]

export const PATCH = withErrors(withModule("SOCIAL_INBOX", async (
  request: NextRequest, { params }: { params: Promise<{ id: string }> },
) => {
  const tenant = currentTenant()
  if (tenant?.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only marketing or workspace administrators can edit keyword replies" }, { status: 403 })
  }
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (typeof body.keywords === "string") data.keywords = body.keywords.trim().slice(0, 500)
  if (typeof body.reply === "string") data.reply = body.reply.trim().slice(0, 1000)
  if (typeof body.isActive === "boolean") data.isActive = body.isActive

  const rule = await db.socialKeywordReply.update({ where: { id }, data })
  return NextResponse.json({ rule })
}))

export const DELETE = withErrors(withModule("SOCIAL_INBOX", async (
  _request: NextRequest, { params }: { params: Promise<{ id: string }> },
) => {
  const tenant = currentTenant()
  if (tenant?.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only marketing or workspace administrators can delete keyword replies" }, { status: 403 })
  }
  const { id } = await params
  await db.socialKeywordReply.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}))
