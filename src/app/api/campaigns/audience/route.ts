import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { sessionFromRequest } from "@/lib/auth"
import { buildSegmentWhere, consentFilter, type Rule } from "@/lib/segments"
import { z } from "zod"

const schema = z.object({
  channel: z.enum(["WHATSAPP", "EMAIL", "FACEBOOK", "INSTAGRAM"]).default("WHATSAPP"),
  rules: z.array(z.object({
    field: z.string().max(40),
    op: z.string().max(20),
    value: z.union([z.string(), z.number(), z.boolean()]),
  })).max(10).default([]),
})

/**
 * Who a campaign would reach, before it is sent.
 *
 * Returns the count and a handful of names. A number alone is easy to
 * misread — "1,034" looks the same whether it is the right thousand people or
 * the wrong ones — so a sample of who is in it comes back too.
 */
export const POST = withErrors(withModule("BROADCAST", async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid audience" }, { status: 400 })
  const { channel, rules } = parsed.data

  const where = {
    ...buildSegmentWhere(rules as Rule[]),
    ...consentFilter(channel),
  }

  const [count, sample, total] = await Promise.all([
    db.customer.count({ where }),
    db.customer.findMany({
      where,
      select: { id: true, name: true, phone: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.customer.count({ where: consentFilter(channel) }),
  ])

  return NextResponse.json({ count, sample, totalReachable: total })
}))
