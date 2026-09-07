import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { db, raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant } from "@/lib/tenant"
import { businessName, publicBaseUrl } from "@/lib/app-config"
import { withinLimit, limitReached } from "@/lib/entitlements"

/**
 * Inviting a colleague.
 *
 * The alternative was typing a password on somebody's behalf and then sending
 * it to them — over WhatsApp, usually, where it stays in the thread for ever
 * and is the same password they will still be using in a year. An invitation
 * lets them set their own, and lets the workspace see who has been asked and
 * has not yet arrived.
 */

/** Only somebody who can already manage the workspace may add to it. */
async function requireManager(request: NextRequest) {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff" || !session.staffId) return null
  const staff = await db.staff.findFirst({ where: { id: session.staffId } })
  if (!staff || !["SUPER_ADMIN", "OPS_ADMIN", "MANAGER"].includes(staff.role)) return null
  return staff
}

export const GET = withErrors(async (request: NextRequest) => {
  if (!(await requireManager(request))) {
    return NextResponse.json({ error: "Only an administrator can see invitations" }, { status: 403 })
  }
  const invitations = await db.invitation.findMany({
    where: { acceptedAt: null, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, role: true, expiresAt: true, createdAt: true },
  })
  return NextResponse.json({ invitations })
})

export const POST = withErrors(async (request: NextRequest) => {
  const inviter = await requireManager(request)
  if (!inviter) {
    return NextResponse.json({ error: "Only an administrator can invite people" }, { status: 403 })
  }

  const tenant = currentTenant()
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: "No workspace in scope" }, { status: 400 })
  }

  // A seat is a seat whether it is filled or promised. Counting only accepted
  // members would let a workspace invite thirty people on a plan for two.
  const room = await withinLimit("staff")
  if (!room.ok) return limitReached("staff", room.used, room.cap)

  const body = await request.json().catch(() => null)
  const email = String(body?.email ?? "").trim().toLowerCase()
  const name = String(body?.name ?? "").trim()
  const role = ["SUPER_ADMIN", "OPS_ADMIN", "MANAGER", "FINANCE", "CHAT_AGENT", "MARKETING", "GUIDE"]
    .includes(String(body?.role)) ? String(body.role) : "CHAT_AGENT"

  if (!/.+@.+\..+/.test(email)) {
    return NextResponse.json({ error: "That does not look like an email address" }, { status: 400 })
  }

  // Somebody already here does not need an invitation, and an existing
  // account elsewhere on the platform must not be silently re-pointed.
  const existing = await raw.staff.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    const already = await raw.tenantMember.findFirst({
      where: { tenantId: tenant.tenantId, staffId: existing.id },
    })
    if (already) return NextResponse.json({ error: "They are already in this workspace" }, { status: 409 })
    // An account that exists elsewhere is added directly: they already have a
    // password, and sending them a second one would be the exact mistake this
    // endpoint exists to avoid.
    await raw.tenantMember.create({
      data: { tenantId: tenant.tenantId, staffId: existing.id, role },
    })
    return NextResponse.json({ added: true })
  }

  const token = randomBytes(24).toString("base64url")
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const invitation = await db.invitation.create({
    data: { tenantId: tenant.tenantId, email, name: name || null, role, token, invitedBy: inviter.id, expiresAt },
  })

  const [brand, base] = await Promise.all([businessName(), publicBaseUrl()])
  const link = `${base}/join/${token}`

  try {
    const { sendEmail } = await import("@/lib/notifications")
    const { getStaffInvitationEmailHtml } = await import("@/lib/email-templates")
    await sendEmail({
      to: email,
      subject: `${inviter.name} invited you to join ${brand}`,
      html: getStaffInvitationEmailHtml({
        inviterName: inviter.name,
        brandName: brand,
        role: role.replace(/_/g, " "),
        inviteUrl: link,
        expiresInDays: 7,
      }),
      text: `${inviter.name} invited you to join ${brand} on Fizmoh. Accept invitation here: ${link}`,
    })
  } catch {
    // The invitation still exists and the link still works; the operator can
    // copy it. Failing the whole request over a mail server would leave them
    // with no way to add anybody at all.
  }

  return NextResponse.json({ invitation: { id: invitation.id, email, role }, link }, { status: 201 })
})
