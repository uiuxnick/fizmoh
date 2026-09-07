import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { signSession, setSessionCookie } from "@/lib/auth"

/**
 * Accepting an invitation.
 *
 * Public by necessity: the person holding the link has no account yet, which
 * is the entire point. The token is the only thing that authorises this, so it
 * is single-use, expires, and is checked against nothing else the caller can
 * influence.
 *
 * Uses the unscoped client because there is no session to resolve a workspace
 * from — the invitation itself names it.
 */

/** What the join page shows before anybody types anything. */
export const GET = withErrors(async (
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) => {
  const { token } = await context.params
  const invitation = await raw.invitation.findUnique({ where: { token } })

  if (!invitation) return NextResponse.json({ error: "That invitation does not exist" }, { status: 404 })
  if (invitation.revokedAt) return NextResponse.json({ error: "That invitation was withdrawn" }, { status: 410 })
  if (invitation.acceptedAt) return NextResponse.json({ error: "That invitation has already been used" }, { status: 410 })
  if (invitation.expiresAt < new Date()) return NextResponse.json({ error: "That invitation has expired" }, { status: 410 })

  const tenant = await raw.tenant.findUnique({
    where: { id: invitation.tenantId },
    select: { name: true },
  })

  return NextResponse.json({
    invitation: {
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
      workspace: tenant?.name ?? "a workspace",
    },
  })
})

/** Setting a password and walking in. */
export const POST = withErrors(async (
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) => {
  const { token } = await context.params
  const body = await request.json().catch(() => null)
  const name = String(body?.name ?? "").trim()
  const password = String(body?.password ?? "")

  if (name.length < 2 || password.length < 8) {
    return NextResponse.json(
      { error: "A name, and a password of at least 8 characters." },
      { status: 400 },
    )
  }

  const invitation = await raw.invitation.findUnique({ where: { token } })
  if (
    !invitation ||
    invitation.revokedAt ||
    invitation.acceptedAt ||
    invitation.expiresAt < new Date()
  ) {
    return NextResponse.json({ error: "That invitation cannot be used" }, { status: 410 })
  }

  // Somebody may have signed up in the meantime with the same address. Their
  // existing account joins the workspace rather than being replaced.
  const existing = await raw.staff.findUnique({ where: { email: invitation.email } })
  const passwordHash = await bcrypt.hash(password, 12)

  const staff = existing ?? await raw.staff.create({
    data: {
      tenantId: invitation.tenantId,
      email: invitation.email,
      name,
      passwordHash,
      role: invitation.role,
    },
  })

  await raw.tenantMember.upsert({
    where: { tenantId_staffId: { tenantId: invitation.tenantId, staffId: staff.id } },
    update: { role: invitation.role },
    create: { tenantId: invitation.tenantId, staffId: staff.id, role: invitation.role },
  })

  // Marked used before the session is handed out, so a double submission
  // cannot create two members from one invitation.
  await raw.invitation.update({
    where: { id: invitation.id },
    data: { acceptedAt: new Date() },
  })

  const session = await signSession(
    { kind: "staff", staffId: staff.id, role: staff.role },
    "8h",
  )
  const response = NextResponse.json({
    token: session,
    staff: { id: staff.id, name: staff.name, email: staff.email, role: staff.role, avatar: staff.avatar },
  })
  setSessionCookie(response, "staff", session)
  return response
})
