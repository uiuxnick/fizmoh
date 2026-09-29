import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { requirePlatformAdmin } from "@/app/api/platform/tenants/route"

/**
 * GET /api/platform/marketing/export
 *
 * Returns a CSV download of all tenant marketing data.
 * Protected — platform operator only.
 */
export const GET = async (request: NextRequest) => {
  if (!(await requirePlatformAdmin(request))) {
    return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 })
  }

  const tenants = await raw.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  })

  const rows = await Promise.all(
    tenants.map(async tenant => {
      const [settings, ownerStaff, waAccount, latestMsg, customers, messages] = await Promise.all([
        raw.systemSetting.findMany({
          where: {
            tenantId: tenant.id,
            key: { in: ["business_name", "business_phone", "business_email", "business_address", "business_website", "business_about"] },
          },
          select: { key: true, value: true },
        }),
        raw.staff.findFirst({
          where: { tenantId: tenant.id, role: "SUPER_ADMIN" },
          select: { email: true, phone: true, name: true },
          orderBy: { createdAt: "asc" },
        }),
        raw.whatsAppAccount.findFirst({
          where: { tenantId: tenant.id, status: "CONNECTED" },
          select: { displayPhone: true },
        }),
        raw.message.findFirst({
          where: { tenantId: tenant.id },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
        raw.customer.count({ where: { tenantId: tenant.id } }),
        raw.message.count({ where: { tenantId: tenant.id } }),
      ])

      const byKey = Object.fromEntries(settings.map(r => [r.key, r.value]))
      const sub = tenant.subscriptions[0]

      return {
        "Workspace": tenant.slug,
        "Business Name": byKey.business_name || tenant.name,
        "Owner Name": ownerStaff?.name ?? "",
        "Owner Email": ownerStaff?.email ?? "",
        "Owner Phone": ownerStaff?.phone ?? "",
        "Business Phone": byKey.business_phone ?? "",
        "Business Email": byKey.business_email ?? "",
        "WhatsApp Number": waAccount?.displayPhone ?? "",
        "Website": byKey.business_website ?? "",
        "Address": byKey.business_address ?? "",
        "About": (byKey.business_about ?? "").replace(/[\r\n,]/g, " ").slice(0, 200),
        "Plan": sub?.plan?.name ?? "None",
        "Subscription Status": sub?.status ?? "NONE",
        "Status": tenant.status,
        "Trial Ends": tenant.trialEndsAt ? tenant.trialEndsAt.toISOString().split("T")[0] : "",
        "Signed Up": tenant.createdAt.toISOString().split("T")[0],
        "Last Active": latestMsg?.createdAt ? latestMsg.createdAt.toISOString().split("T")[0] : "",
        "Customers": customers,
        "Messages": messages,
        "Currency": tenant.currency ?? "OMR",
        "Timezone": tenant.timezone ?? "",
      }
    })
  )

  // Build CSV
  const headers = Object.keys(rows[0] ?? {})
  const escape = (v: unknown) => {
    const s = String(v ?? "")
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }

  const csv = [
    headers.join(","),
    ...rows.map(row => headers.map(h => escape((row as any)[h])).join(",")),
  ].join("\r\n")

  const date = new Date().toISOString().split("T")[0]

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fizmoh-tenants-${date}.csv"`,
    },
  })
}
