import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { fromLocal } from "@/lib/timezone"

export const GET = withErrors(withModule("BROADCAST", async () => {
  const campaigns = await db.campaign.findMany({
    include: { template: true, segment: true },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ campaigns })
}))

export const POST = withErrors(withModule("BROADCAST", async (request: NextRequest) => {
  const body = await request.json()
  const campaign = await db.campaign.create({
    data: {
      name: body.name,
      channel: body.channel,
      templateId: body.templateId || null,
      segmentId: body.segmentId || null,
      subject: body.subject || null,
      customContent: body.customContent || null,
      // A picker sends "2026-08-13T09:00" with no zone, and new Date() reads
      // that in the *server's* zone — UTC here — so everything scheduled ran
      // four hours late for a business that works in Muscat.
      scheduledAt: body.scheduledAt ? scheduleFrom(body.scheduledAt) : null,
      status: body.scheduledAt ? "SCHEDULED" : "DRAFT",
      variableMap: Array.isArray(body.variableMap) ? body.variableMap : undefined,
      headerMediaUrl: body.headerMediaUrl || null,
      headerMediaType: body.headerMediaType || null,
      linkUrl: body.linkUrl || null,
      ratePerSecond: Number.isFinite(Number(body.ratePerSecond))
        ? Math.min(50, Math.max(1, Number(body.ratePerSecond)))
        : undefined,
      respectQuietHours: body.respectQuietHours !== false,
    },
  })
  return NextResponse.json({ campaign }, { status: 201 })
}))

/** A local wall-clock string, as the instant it happens in Muscat. */
function scheduleFrom(value: string): Date {
  const [date, time] = String(value).split("T")
  if (!date) return new Date(value)
  return fromLocal(date, (time || "00:00").slice(0, 5))
}
