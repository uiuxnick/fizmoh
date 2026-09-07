import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"
import { disconnectSocialAccount } from "@/lib/social/social-oauth"
import { createAuditLog } from "@/lib/slots-server"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "MANAGER", "MARKETING"]

export const GET = withErrors(withModule("SOCIAL_INBOX", async () => {
  const accounts = await db.socialAccount.findMany({ orderBy: [{ channel: "asc" }, { connectedAt: "desc" }] })
  return NextResponse.json({
    accounts: accounts.map(a => ({
      id: a.id, channel: a.channel, externalAccountId: a.externalAccountId, name: a.name, username: a.username,
      profilePicUrl: a.profilePicUrl, status: a.status, lastError: a.lastError, isActive: a.isActive,
      webhookSubscribed: a.webhookSubscribed, tokenExpiresAt: a.tokenExpiresAt, connectedAt: a.connectedAt,
    })),
  })
}))

/** Select which connected account is active for its channel. */
export const PATCH = withErrors(withModule("SOCIAL_INBOX", async (request: NextRequest) => {
  const tenant = currentTenant()
  if (tenant?.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only marketing or workspace administrators can change the active account" }, { status: 403 })
  }
  const body = await request.json().catch(() => ({}))
  const id = String(body?.id || "")
  const account = await db.socialAccount.findUnique({ where: { id } })
  if (!account) return NextResponse.json({ error: "No such account" }, { status: 404 })

  await db.socialAccount.updateMany({ where: { channel: account.channel }, data: { isActive: false } })
  await db.socialAccount.update({ where: { id }, data: { isActive: true } })
  await createAuditLog({ staffId: tenant?.staffId, action: "SOCIAL_ACCOUNT_ACTIVATED", entity: "SocialAccount", entityId: id })
  return NextResponse.json({ ok: true })
}))

export const DELETE = withErrors(withModule("SOCIAL_INBOX", async (request: NextRequest) => {
  const tenant = currentTenant()
  if (tenant?.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only marketing or workspace administrators can disconnect an account" }, { status: 403 })
  }
  const id = new URL(request.url).searchParams.get("id") || ""
  await disconnectSocialAccount(id)
  await createAuditLog({ staffId: tenant?.staffId, action: "SOCIAL_ACCOUNT_DISCONNECTED", entity: "SocialAccount", entityId: id })
  return NextResponse.json({ ok: true })
}))
