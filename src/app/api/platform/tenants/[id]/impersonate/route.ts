import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { requirePlatformAdmin } from "../../route"
import { WORKSPACE_COOKIE } from "@/app/api/workspaces/route"

/**
 * Opening a customer's workspace as the platform operator.
 *
 * Support is impossible without it. Every real question is "what does their
 * screen actually show", and answering that by reading the database is how
 * people give confident, wrong answers.
 *
 * Two things make it acceptable rather than alarming. It is written down —
 * every entry is an audit record in that workspace's own log, where their
 * administrator can read it. And it grants no more than their own staff have:
 * the same scoped client, the same plan, the same limits.
 */
export const POST = withErrors(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) => {
  const admin = await requirePlatformAdmin(request)
  if (!admin) return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 })

  const { id } = await context.params
  const tenant = await raw.tenant.findUnique({
    where: { id },
    select: { id: true, slug: true, name: true },
  })
  if (!tenant) return NextResponse.json({ error: "No such workspace" }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const reason = String(body?.reason || "Support").slice(0, 200)

  // Recorded in the workspace being entered, not in a platform-only log they
  // cannot see. A record the subject cannot read is not accountability.
  try {
    await raw.auditLog.create({
      data: {
        tenantId: tenant.id,
        staffId: admin.id,
        action: "PLATFORM_ACCESS",
        entity: "Tenant",
        entityId: tenant.id,
        details: `${admin.name} (platform) opened this workspace · ${reason}`,
      },
    })
  } catch {
    // An audit write that fails must not quietly allow the access anyway.
    return NextResponse.json(
      { error: "The access could not be recorded, so it was not granted." },
      { status: 500 },
    )
  }

  const response = NextResponse.json({ workspace: { slug: tenant.slug, name: tenant.name } })
  response.cookies.set(WORKSPACE_COOKIE, tenant.slug, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Deliberately short. Support work is a visit, not a residency, and an
    // operator left inside a customer's workspace for a month is one who will
    // eventually act there by accident.
    maxAge: 60 * 60 * 4,
  })
  return response
})

/**
 * Leaving again.
 *
 * Takes whatever identifier the banner has to hand — it knows the slug, this
 * route is addressed by id — because the only thing being done is dropping a
 * cookie, and refusing on a mismatched identifier would strand somebody inside
 * a workspace with no way out.
 */
export const DELETE = withErrors(async (request: NextRequest) => {
  if (!(await requirePlatformAdmin(request))) {
    return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 })
  }
  const response = NextResponse.json({ left: true })
  response.cookies.delete(WORKSPACE_COOKIE)
  return response
})
