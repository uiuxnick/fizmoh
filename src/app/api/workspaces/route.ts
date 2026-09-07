import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { isPlatformOperator } from "@/lib/tenant"

/**
 * The workspaces a person belongs to, and which one they are looking at.
 *
 * Everybody signs in at the same address, so the one thing the address cannot
 * tell us is which business somebody means when they belong to two — an agency
 * running several, or a founder with a second brand. The choice is stored in a
 * cookie and checked against membership on every request, so it is a
 * preference rather than a credential.
 *
 * Uses the unscoped client on purpose: the question is which workspaces exist
 * for this person, which cannot be answered from inside one of them.
 */

export const WORKSPACE_COOKIE = "fizmoh_workspace"

export const GET = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff" || !session.staffId) {
    return NextResponse.json({ workspaces: [], current: null })
  }

  const memberships = await raw.tenantMember.findMany({
    where: { staffId: session.staffId },
    include: { tenant: { select: { id: true, slug: true, name: true, status: true } } },
    orderBy: { invitedAt: "asc" },
  })

  const chosen = request.cookies.get(WORKSPACE_COOKIE)?.value
  let current =
    memberships.find(m => m.tenant.slug === chosen)?.tenant ?? memberships[0]?.tenant ?? null

  /*
   * The platform operator, visiting.
   *
   * They belong to no workspace, so membership finds nothing and this used to
   * report "no current workspace" while every query was in fact answering as
   * the tenant they had just opened. The screen looked unchanged, which is the
   * worst possible outcome: acting inside somebody's business without any sign
   * of being there.
   */
  let visiting = false
  if (!current && chosen && (await isPlatformOperator(session.staffId))) {
    const tenant = await raw.tenant.findUnique({
      where: { slug: chosen },
      select: { id: true, slug: true, name: true, status: true },
    })
    if (tenant) { current = tenant; visiting = true }
  }

  return NextResponse.json({
    workspaces: memberships.map(m => ({
      id: m.tenant.id,
      slug: m.tenant.slug,
      name: m.tenant.name,
      status: m.tenant.status,
      role: m.role,
    })),
    current: current ? { slug: current.slug, name: current.name } : null,
    /** True when this is somebody looking in from the platform, not a member. */
    visiting,
  })
})

export const POST = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff" || !session.staffId) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : ""
  if (!slug) return NextResponse.json({ error: "Which workspace?" }, { status: 400 })

  // Membership is checked here as well as on every later request. Refusing now
  // gives an honest error instead of a cookie that silently does nothing.
  const membership = await raw.tenantMember.findFirst({
    where: { staffId: session.staffId, tenant: { slug } },
    include: { tenant: { select: { slug: true, name: true } } },
  })
  if (!membership) {
    return NextResponse.json({ error: "You do not belong to that workspace" }, { status: 403 })
  }

  const response = NextResponse.json({ current: membership.tenant })
  response.cookies.set(WORKSPACE_COOKIE, membership.tenant.slug, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
  return response
})
