import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { buildSegmentWhere, consentFilter, parseFilterRules, type Rule } from "@/lib/segments"

/**
 * Segments API
 * Per BRD §6.5.3: "Send broadcast campaigns to segmented subscriber lists"
 * Per BRD §6.5.4: "Central WhatsApp subscriber database with tags, custom fields, consent/opt-in status"
 */
export const GET = withErrors(withModule("BROADCAST", async () => {
  const segments = await db.segment.findMany({ orderBy: { createdAt: "desc" } })

  // Refresh counts on the fly
  const enriched = await Promise.all(
    segments.map(async s => {
      try {
        const rules = parseFilterRules(s.filterRules)
        const where = {
          ...buildSegmentWhere(rules),
          ...consentFilter(s.channel || "ALL"),
        }
        const count = await db.customer.count({ where })
        return {
          ...s,
          contactCount: count,
          parsedRules: rules,
        }
      } catch {
        return {
          ...s,
          parsedRules: parseFilterRules(s.filterRules),
        }
      }
    })
  )

  return NextResponse.json({ segments: enriched })
}))

export const POST = withErrors(withModule("BROADCAST", async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}))
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Segment name is required" }, { status: 400 })
  }

  const channel = (body.channel || "ALL").toUpperCase()
  const rawRules = body.filterRules || []
  const rules = parseFilterRules(rawRules)

  let contactCount = 0
  try {
    const where = {
      ...buildSegmentWhere(rules),
      ...consentFilter(channel),
    }
    contactCount = await db.customer.count({ where })
  } catch {
    contactCount = 0
  }

  const segment = await db.segment.create({
    data: {
      name: body.name.trim(),
      channel,
      filterRules: JSON.stringify(rules),
      contactCount,
    },
  })

  return NextResponse.json(
    {
      segment: {
        ...segment,
        parsedRules: rules,
      },
    },
    { status: 201 }
  )
}))
