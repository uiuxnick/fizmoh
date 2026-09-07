import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { resolveSubscriberChannel, formatDisplayIdentifier, isSubscriberOptedIn } from "@/lib/subscribers"

/** CSV export of the subscriber list with multi-channel support (BRD §6.5.4). */
export const GET = withErrors(async () => {
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
    const { displayIdentifier } = formatDisplayIdentifier(c)
    const isSubscribed = isSubscriberOptedIn(c)

    return [
      channel,
      displayIdentifier,
      c.name,
      c.phone,
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
