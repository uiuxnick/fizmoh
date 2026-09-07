import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { sessionFromRequest } from "@/lib/auth"
import { fromLocal } from "@/lib/timezone"
import { placeholderCount } from "@/lib/campaign-send"

/** One campaign, with what it needs to be sent correctly. */
export const GET = withErrors(withModule("BROADCAST", 
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const session = await sessionFromRequest(request)
    if (session?.kind !== "staff") {
      return NextResponse.json({ error: "Sign in first" }, { status: 401 })
    }

    const campaign = await db.campaign.findUnique({
      where: { id },
      include: { template: true, segment: true },
    })
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

    const counts = await db.campaignRecipient.groupBy({
      by: ["status"],
      where: { campaignId: id },
      _count: true,
    })

    return NextResponse.json({
      campaign,
      // What the template asks for, so the screen can show that many boxes
      // rather than assuming one.
      placeholders: placeholderCount(campaign.template?.bodyContent || ""),
      counts: Object.fromEntries(counts.map(c => [c.status.toLowerCase(), c._count])),
    })
  },
))

/**
 * Editing a campaign.
 *
 * Only while it is a draft or scheduled. Changing the template or the audience
 * of something half-sent would mean two different messages went out under one
 * name, and no way to tell afterwards who got which.
 */
export const PATCH = withErrors(withModule("BROADCAST", 
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const session = await sessionFromRequest(request)
    if (session?.kind !== "staff") {
      return NextResponse.json({ error: "Sign in first" }, { status: 401 })
    }

    const campaign = await db.campaign.findUnique({ where: { id } })
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    if (!["DRAFT", "SCHEDULED", "FAILED", "CANCELLED"].includes(campaign.status)) {
      return NextResponse.json(
        { error: "A campaign that has started sending cannot be edited" },
        { status: 409 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const data: Record<string, unknown> = {}

    if (body.name !== undefined) data.name = String(body.name).slice(0, 200)
    if (body.subject !== undefined) data.subject = body.subject || null
    if (body.customContent !== undefined) data.customContent = body.customContent || null
    if (body.templateId !== undefined) data.templateId = body.templateId || null
    if (body.segmentId !== undefined) data.segmentId = body.segmentId || null
    if (body.variableMap !== undefined) {
      data.variableMap = Array.isArray(body.variableMap) ? body.variableMap : null
    }
    if (body.headerMediaUrl !== undefined) data.headerMediaUrl = body.headerMediaUrl || null
    if (body.headerMediaType !== undefined) data.headerMediaType = body.headerMediaType || null
    if (body.linkUrl !== undefined) data.linkUrl = body.linkUrl || null
    if (body.respectQuietHours !== undefined) data.respectQuietHours = body.respectQuietHours !== false
    if (body.ratePerSecond !== undefined) {
      const rate = Number(body.ratePerSecond)
      // Capped rather than trusted: a number typed into a box is how a sender
      // ends up rate-limited by Meta and quality-rated down for a week.
      if (Number.isFinite(rate)) data.ratePerSecond = Math.min(50, Math.max(1, Math.round(rate)))
    }
    if (body.scheduledAt !== undefined) {
      if (!body.scheduledAt) {
        data.scheduledAt = null
        data.status = "DRAFT"
      } else {
        const [date, time] = String(body.scheduledAt).split("T")
        data.scheduledAt = fromLocal(date, (time || "00:00").slice(0, 5))
        data.status = "SCHEDULED"
      }
    }

    const updated = await db.campaign.update({ where: { id }, data })
    return NextResponse.json({ campaign: updated })
  },
))

/** Deleting a draft. Anything that has reached somebody is kept as a record. */
export const DELETE = withErrors(withModule("BROADCAST", 
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const session = await sessionFromRequest(request)
    if (session?.kind !== "staff") {
      return NextResponse.json({ error: "Sign in first" }, { status: 401 })
    }

    const campaign = await db.campaign.findUnique({ where: { id } })
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    if (campaign.totalSent > 0) {
      return NextResponse.json(
        { error: "This campaign has been sent to people. It stays as a record." },
        { status: 409 },
      )
    }

    await db.campaign.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  },
))
