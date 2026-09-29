import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { buildSegmentWhere, consentFilter, parseFilterRules, type Rule } from "@/lib/segments"

/**
 * Live rule evaluator for UI segment builder
 * POST /api/segments/evaluate
 * Body: { channel: "ALL" | "WHATSAPP" | "FACEBOOK" | "INSTAGRAM", filterRules: Rule[] }
 */
export const POST = withErrors(withModule("BROADCAST", async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}))
  const channel = (body.channel || "ALL").toUpperCase()
  const rules = parseFilterRules(body.filterRules || [])

  const where = {
    ...buildSegmentWhere(rules),
    ...consentFilter(channel),
  }

  const [count, sample, totalReachable] = await Promise.all([
    db.customer.count({ where }).catch(() => 0),
    db.customer.findMany({
      where,
      select: { id: true, name: true, phone: true, channel: true, tags: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }).catch(() => []),
    db.customer.count({ where: consentFilter(channel) }).catch(() => 0),
  ])

  return NextResponse.json({
    count,
    sample,
    totalReachable,
  })
}))
