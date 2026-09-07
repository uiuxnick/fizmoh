import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { db, raw } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { createAuditLog } from "@/lib/slots-server"
import { sessionFromRequest } from "@/lib/auth"
import { withErrors } from "@/lib/api-handler"

const ROLES = ["SUPER_ADMIN", "MANAGER", "FINANCE", "CHAT_AGENT", "GUIDE", "MARKETING"]
const BCRYPT_ROUNDS = 12

/**
 * Edit a staff member, including setting their password.
 *
 * A password reset path has to exist somewhere: accounts created before this
 * were written with a placeholder that is not a valid bcrypt hash, so those
 * people cannot sign in and had no way to recover.
 */

/**
 * True when this person may add, change or remove staff in the current
 * workspace: a platform role, or ownership/administration of this workspace.
 */
async function canAdministerStaff(actor: { id: string; role: string }): Promise<boolean> {
  if (["SUPER_ADMIN", "MANAGER"].includes(actor.role)) return true
  const tenantId = currentTenant()?.tenantId
  if (!tenantId) return false
  const membership = await raw.tenantMember.findFirst({
    where: { tenantId, staffId: actor.id },
    select: { role: true },
  })
  return membership ? ["OWNER", "ADMIN"].includes(membership.role) : false
}

export const PATCH = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const session = await sessionFromRequest(request)

  // Only an administrator may change another account's password or role.
  // Without this, any signed-in staff member could grant themselves
  // SUPER_ADMIN or take over a colleague's account.
  if (session?.kind !== "staff") {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  const actor = await db.staff.findUnique({ where: { id: session.staffId } })
  if (!actor) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  /*
   * Who may administer staff.
   *
   * The account-level role was the only thing consulted, so the person who
   * created the workspace could not manage their own team unless they also
   * happened to hold a platform role. Ownership of the workspace is now
   * sufficient — and it is checked against this workspace's membership, so an
   * owner of one business gains nothing in another.
   */
  if (!(await canAdministerStaff(actor))) {
    return NextResponse.json({ error: "Only an administrator can change staff accounts" }, { status: 403 })
  }

  const existing = await db.staff.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Staff member not found" }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name).trim().slice(0, 200)
  if (body.phone !== undefined) data.phone = body.phone ? String(body.phone).trim().slice(0, 40) : null
  if (body.isActive !== undefined) data.isActive = body.isActive === true
  if (body.role !== undefined) {
    if (!ROLES.includes(body.role)) return NextResponse.json({ error: "Unknown role" }, { status: 400 })
    data.role = body.role
  }

  let passwordChanged = false
  if (body.password !== undefined) {
    const password = String(body.password)
    if (password.length < 10) {
      return NextResponse.json({ error: "Password must be at least 10 characters" }, { status: 400 })
    }
    data.passwordHash = await hash(password, BCRYPT_ROUNDS)
    passwordChanged = true
  }

  // An administrator locking or demoting themselves would leave the panel
  // unreachable if they are the only one.
  if (existing.id === actor.id && (data.isActive === false || (data.role && data.role !== actor.role))) {
    return NextResponse.json({ error: "You cannot change your own role or deactivate yourself" }, { status: 400 })
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  const staff = await db.staff.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, phone: true, role: true, isActive: true },
  })

  await createAuditLog({
    staffId: actor.id,
    action: passwordChanged ? "RESET_STAFF_PASSWORD" : "EDIT_STAFF",
    entity: "STAFF",
    entityId: id,
    // The new password is never recorded, only the fact that it changed.
    details: JSON.stringify({ target: existing.email, passwordChanged, role: data.role ?? existing.role }),
  })

  return NextResponse.json({ staff })
})


/**
 * Remove a staff member from the workspace.
 *
 * Deliberately not a row deletion. A staff record is referenced by the
 * messages they sent, the payments they verified, the orders they created and
 * the audit log of everything they did — deleting it would either fail on
 * those references or, worse, erase the trail of who did what. So access is
 * revoked instead: the membership is dropped, the account is deactivated, and
 * the history stays intact and attributable.
 *
 * The last owner cannot be removed, or a workspace would be left with nobody
 * able to administer it.
 */
export const DELETE = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const actor = await db.staff.findUnique({ where: { id: session.staffId } })
  if (!actor) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  if (!(await canAdministerStaff(actor))) {
    return NextResponse.json({ error: "Only an administrator can remove staff" }, { status: 403 })
  }

  if (id === actor.id) {
    return NextResponse.json({ error: "You cannot remove your own access" }, { status: 400 })
  }

  const existing = await db.staff.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Staff member not found" }, { status: 404 })

  const tenantId = currentTenant()?.tenantId
  if (tenantId) {
    const target = await raw.tenantMember.findFirst({
      where: { tenantId, staffId: id },
      select: { id: true, role: true },
    })
    if (target?.role === "OWNER") {
      const owners = await raw.tenantMember.count({ where: { tenantId, role: "OWNER" } })
      if (owners <= 1) {
        return NextResponse.json(
          { error: "This is the only owner. Make someone else an owner first." },
          { status: 400 },
        )
      }
    }
    if (target) await raw.tenantMember.delete({ where: { id: target.id } })
  }

  await db.staff.update({ where: { id }, data: { isActive: false } })

  await createAuditLog({
    staffId: actor.id,
    action: "REMOVE_STAFF",
    entity: "STAFF",
    entityId: id,
    details: JSON.stringify({ target: existing.email, method: "membership removed, account deactivated" }),
  }).catch(() => {})

  return NextResponse.json({ success: true })
})
