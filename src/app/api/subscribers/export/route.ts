import { NextRequest, NextResponse } from "next/server"
import { db, raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { resolveSubscriberChannel, formatDisplayIdentifier, isSubscriberOptedIn } from "@/lib/subscribers"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant } from "@/lib/tenant"
import { resolveStaffPermissions, hasPermission, maskPhoneNumber } from "@/lib/permissions"

/** CSV export of the subscriber list with multi-channel support (BRD §6.5.4) and RBAC privacy gates. */
export const GET = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const staffId = session?.kind === "staff" ? session.staffId : null
  if (!staffId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const staff = await raw.staff.findUnique({ where: { id: staffId } })
  const tenant = currentTenant()
  const membership = tenant?.tenantId && staffId
    ? await raw.tenantMember.findUnique({
        where: { tenantId_staffId: { tenantId: tenant.tenantId, staffId } },
      })
    : null

  const effectiveRole = membership?.role || staff?.role || "CHAT_AGENT"
  const rawOverrides = (membership?.permissions as Record<string, boolean>) || null
  const permissions = resolveStaffPermissions(effectiveRole, rawOverrides)

  if (!hasPermission({ role: effectiveRole, permissions }, "export_contacts")) {
    return NextResponse.json(
      { error: "Exporting customer contacts is disallowed for your account. Please contact an administrator." },
      { status: 403 }
    )
  }

  const canViewPhone = hasPermission({ role: effectiveRole, permissions }, "view_phone_numbers")

  const customers = await db.customer.findMany({ orderBy: { createdAt: "desc" } })

  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const header = [
    "channel", "displayIdentifier", "name", "phone", "email",
    "socialUsername", "socialId", "isSubscribed", "whatsappOptIn", "facebookOptIn",
    "instagramOptIn", "emailOptIn", "preferredLang", "tags", "optInSource", "optInAt", "optOutAt", "createdAt"
  ]

  const rows = customers.map(c => {
    const channel = resolveSubscriberChannel(c)
    const { displayIdentifier } = formatDisplayIdentifier(c, canViewPhone)
    const isSubscribed = isSubscriberOptedIn(c)
    const phone = canViewPhone ? c.phone : maskPhoneNumber(c.phone, false)

    return [
      channel,
      displayIdentifier,
      c.name,
      phone,
      c.email,
      c.socialUsername,
      c.socialId,
      isSubscribed,
      c.whatsappOptIn,
      c.facebookOptIn ?? (channel === "FACEBOOK"),
      c.instagramOptIn ?? (channel === "INSTAGRAM"),
      c.emailOptIn,
      c.preferredLang,
      typeof c.tags === "string" ? c.tags : JSON.stringify(c.tags ?? []),
      c.optInSource,
      c.optInAt?.toISOString(),
      c.optOutAt?.toISOString(),
      c.createdAt.toISOString(),
    ].map(escape).join(",")
  })

  const csv = [header.join(","), ...rows].join("\n")
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
})
