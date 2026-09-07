import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "MANAGER", "MARKETING"]

export const GET = withErrors(withModule("SOCIAL_INBOX", async (request: NextRequest) => {
  const channel = new URL(request.url).searchParams.get("channel")
  const rules = await db.socialKeywordReply.findMany({
    where: channel ? { channel } : undefined, orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ rules })
}))

export const POST = withErrors(withModule("SOCIAL_INBOX", async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only marketing or workspace administrators can create keyword replies" }, { status: 403 })
  }
  const body = await request.json().catch(() => ({}))
  const channel = String(body?.channel || "")
  const keywords = String(body?.keywords || "").trim()
  const reply = String(body?.reply || "").trim()
  if (!["FACEBOOK", "INSTAGRAM"].includes(channel)) return NextResponse.json({ error: "Unknown channel" }, { status: 400 })
  if (!keywords || !reply) return NextResponse.json({ error: "Keywords and a reply are both required" }, { status: 400 })

  const rule = await db.socialKeywordReply.create({
    data: { tenantId: tenant.tenantId, channel, keywords: keywords.slice(0, 500), reply: reply.slice(0, 1000) },
  })
  return NextResponse.json({ rule }, { status: 201 })
}))
