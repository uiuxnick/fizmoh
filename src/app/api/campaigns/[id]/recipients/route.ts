import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { sessionFromRequest } from "@/lib/auth"

/**
 * Who a campaign actually reached, and who it did not.
 *
 * Every send has been recorded per person since campaigns existed, and none of
 * it was readable anywhere — so "1,830 sent, 170 failed" was the end of the
 * story, with no way to find out which 170 or why. This is that list, and the
 * CSV of it, because the answer to "which ones failed" is usually a
 * spreadsheet somebody has to work through.
 */

export const GET = withErrors(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const session = await sessionFromRequest(request)
    if (session?.kind !== "staff") {
      return NextResponse.json({ error: "Sign in first" }, { status: 401 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get("status")?.toUpperCase()
    const format = url.searchParams.get("format")
    const take = Math.min(1000, Number(url.searchParams.get("limit") || 200))

    const where = {
      campaignId: id,
      ...(status && ["PENDING", "SENT", "FAILED", "SKIPPED"].includes(status) ? { status } : {}),
    }

    const [rows, counts] = await Promise.all([
      db.campaignRecipient.findMany({
        where,
        orderBy: [{ status: "asc" }, { sentAt: "desc" }],
        take: format === "csv" ? 10_000 : take,
      }),
      db.campaignRecipient.groupBy({
        by: ["status"],
        where: { campaignId: id },
        _count: true,
      }),
    ])

    // Names come from the customers, in one query rather than one per row.
    const customers = await db.customer.findMany({
      where: { id: { in: rows.map(r => r.customerId) } },
      select: { id: true, name: true, email: true },
    })
    const nameOf = new Map(customers.map(c => [c.id, c.name || ""]))

    if (format === "csv") {
      const escape = (value: unknown) => {
        const text = String(value ?? "")
        // A customer called O'Brien, Ltd. breaks a naive CSV; a quoted field
        // with doubled quotes does not.
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
      }
      const header = "name,phone,status,reason,error,sent_at,delivered_at,read_at,clicked_at,attempts"
      const body = rows
        .map(r =>
          [
            escape(nameOf.get(r.customerId)),
            escape(r.phone),
            r.status,
            escape(r.skipReason),
            escape(r.error),
            r.sentAt?.toISOString() ?? "",
            r.deliveredAt?.toISOString() ?? "",
            r.readAt?.toISOString() ?? "",
            r.clickedAt?.toISOString() ?? "",
            r.attempts,
          ].join(","),
        )
        .join("\n")
      return new NextResponse(`${header}\n${body}`, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="campaign-${id}.csv"`,
        },
      })
    }

    return NextResponse.json({
      recipients: rows.map(r => ({
        id: r.id,
        name: nameOf.get(r.customerId) || r.phone,
        phone: r.phone,
        status: r.status,
        skipReason: r.skipReason,
        error: r.error,
        attempts: r.attempts,
        sentAt: r.sentAt,
        deliveredAt: r.deliveredAt,
        readAt: r.readAt,
        clickedAt: r.clickedAt,
      })),
      counts: Object.fromEntries(counts.map(c => [c.status.toLowerCase(), c._count])),
    })
  },
)
