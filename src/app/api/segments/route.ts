import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

/**
 * Segments API
 * Per BRD §6.5.3: "Send broadcast campaigns to segmented subscriber lists"
 * Per BRD §6.5.4: "Central WhatsApp subscriber database with tags, custom fields, consent/opt-in status"
 */
export const GET = withErrors(withModule("BROADCAST", async () => {
  const segments = await db.segment.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json({ segments })
}))

export const POST = withErrors(withModule("BROADCAST", async (request: NextRequest) => {
  const body = await request.json()
  const segment = await db.segment.create({
    data: {
      name: body.name,
      channel: body.channel,
      filterRules: body.filterRules ? JSON.stringify(body.filterRules) : undefined,
    },
  })
  return NextResponse.json({ segment }, { status: 201 })
}))
