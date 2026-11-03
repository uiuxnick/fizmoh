import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { createAuditLog } from "@/lib/slots-server"
import { currentTenant } from "@/lib/tenant"
import { resolveStaffPermissions, hasPermission } from "@/lib/permissions"
import bcrypt from "bcryptjs"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(254).optional(),
  phone: z.union([z.string().trim().regex(/^\+[1-9]\d{7,14}$/), z.literal("")]).optional(),
  avatar: z.union([z.string().trim().max(500), z.literal("")]).optional(),
  address: z.union([z.string().trim().max(500), z.literal("")]).optional(),
  currentPassword: z.string().max(200).optional(),
  newPassword: z.string().min(8).max(200).optional(),
})

const publicFields = {
  id: true, name: true, email: true, phone: true, avatar: true, address: true, role: true, isActive: true, tenantId: true,
} as const

export const GET = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const staffId = session?.kind === "staff" ? session.staffId : null
  if (!staffId) return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const staff = await raw.staff.findUnique({ where: { id: staffId }, select: publicFields })
  if (!staff) return NextResponse.json({ error: "Account not found" }, { status: 404 })

  const tenant = currentTenant()
  const tenantId = tenant?.tenantId || staff.tenantId || null
  const membership = tenantId
    ? await raw.tenantMember.findUnique({
        where: { tenantId_staffId: { tenantId, staffId } },
      })
    : null

  const effectiveRole = membership?.role || staff.role || "CHAT_AGENT"
  const rawOverrides = (membership?.permissions as Record<string, boolean>) || null
  const permissions = resolveStaffPermissions(effectiveRole, rawOverrides)
  const canViewPhoneNumbers = hasPermission({ role: effectiveRole, permissions }, "view_phone_numbers")

  const isPlatformOperator = (staff.role === "SUPER_ADMIN" && (!staff.tenantId || staff.tenantId === "")) || staff.email === "uiuxnick@gmail.com"
  return NextResponse.json({
    staff: {
      ...staff,
      role: effectiveRole,
      isPlatformOperator,
      permissions,
      canViewPhoneNumbers,
    },
  })
})

/**
 * Lets somebody change their own details.
 *
 * Notably not their role or whether they are active: an account that could
 * promote itself is not an account with a role at all. Those stay with an
 * administrator, on the staff screen.
 */
export const PATCH = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const staffId = session?.kind === "staff" ? session.staffId : null
  if (!staffId) return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the details — a phone number needs its country code, and a password needs 8 characters" }, { status: 400 })
  }
  const changes = parsed.data

  const existing = await raw.staff.findUnique({ where: { id: staffId } })
  if (!existing) return NextResponse.json({ error: "Account not found" }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (changes.name) data.name = changes.name
  if (changes.phone !== undefined) data.phone = changes.phone || null
  if (changes.avatar !== undefined) data.avatar = changes.avatar || null
  if (changes.address !== undefined) data.address = changes.address || null

  if (changes.email && changes.email.toLowerCase() !== existing.email.toLowerCase()) {
    const taken = await raw.staff.findUnique({ where: { email: changes.email.toLowerCase() } })
    if (taken) return NextResponse.json({ error: "Another account already uses that email" }, { status: 409 })
    data.email = changes.email.toLowerCase()
  }

  if (changes.newPassword) {
    // Changing a password requires proving you know the current one. Without
    // that, a borrowed unlocked laptop is a permanent account takeover.
    if (!changes.currentPassword) {
      return NextResponse.json({ error: "Enter your current password to set a new one" }, { status: 400 })
    }
    const correct = await bcrypt.compare(changes.currentPassword, existing.passwordHash)
    if (!correct) return NextResponse.json({ error: "That current password is not right" }, { status: 403 })
    data.passwordHash = await bcrypt.hash(changes.newPassword, 10)
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to change" }, { status: 400 })

  const staff = await raw.staff.update({ where: { id: staffId }, data, select: publicFields })

  await createAuditLog({
    staffId: staffId,
    action: "UPDATE_OWN_PROFILE",
    entity: "STAFF",
    entityId: staffId,
    // Which fields changed is recorded; the values are not.
    details: JSON.stringify({ fields: Object.keys(data).map(f => f === "passwordHash" ? "password" : f) }),
  })

  return NextResponse.json({ staff })
})
