import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { buildSegmentWhere, consentFilter, parseFilterRules } from "@/lib/segments"

/**
 * Single Segment CRUD: GET, PATCH, DELETE
 */
export const GET = withErrors(withModule("BROADCAST", async (
  request: NextRequest,
  context?: { params?: Promise<{ id: string }> | { id: string } }
) => {
  const params = await context?.params
  const id = params?.id
  if (!id) return NextResponse.json({ error: "Missing segment id" }, { status: 400 })

  const segment = await db.segment.findUnique({ where: { id } })
  if (!segment) return NextResponse.json({ error: "Segment not found" }, { status: 404 })

  const rules = parseFilterRules(segment.filterRules)
  const where = {
    ...buildSegmentWhere(rules),
    ...consentFilter(segment.channel || "ALL"),
  }

  const [count, sample] = await Promise.all([
    db.customer.count({ where }).catch(() => 0),
    db.customer.findMany({
      where,
      select: { id: true, name: true, phone: true, channel: true },
      take: 10,
      orderBy: { createdAt: "desc" },
    }).catch(() => []),
  ])

  return NextResponse.json({
    segment: {
      ...segment,
      contactCount: count,
      parsedRules: rules,
    },
    sample,
  })
}))

export const PATCH = withErrors(withModule("BROADCAST", async (
  request: NextRequest,
  context?: { params?: Promise<{ id: string }> | { id: string } }
) => {
  const params = await context?.params
  const id = params?.id
  if (!id) return NextResponse.json({ error: "Missing segment id" }, { status: 400 })

  const existing = await db.segment.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Segment not found" }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const name = body.name !== undefined ? String(body.name).trim() : existing.name
  const channel = body.channel !== undefined ? String(body.channel).toUpperCase() : existing.channel
  const rawRules = body.filterRules !== undefined ? body.filterRules : existing.filterRules
  const rules = parseFilterRules(rawRules)

  let contactCount = 0
  try {
    const where = {
      ...buildSegmentWhere(rules),
      ...consentFilter(channel),
    }
    contactCount = await db.customer.count({ where })
  } catch {
    contactCount = existing.contactCount
  }

  const updated = await db.segment.update({
    where: { id },
    data: {
      name,
      channel,
      filterRules: JSON.stringify(rules),
      contactCount,
    },
  })

  return NextResponse.json({
    segment: {
      ...updated,
      contactCount,
      parsedRules: rules,
    },
  })
}))

export const DELETE = withErrors(withModule("BROADCAST", async (
  request: NextRequest,
  context?: { params?: Promise<{ id: string }> | { id: string } }
) => {
  const params = await context?.params
  const id = params?.id
  if (!id) return NextResponse.json({ error: "Missing segment id" }, { status: 400 })

  // Check if campaigns are linked to this segment
  const campaignCount = await db.campaign.count({ where: { segmentId: id } })
  if (campaignCount > 0) {
    // Unlink campaigns so we don't violate foreign keys
    await db.campaign.updateMany({
      where: { segmentId: id },
      data: { segmentId: null },
    })
  }

  await db.segment.delete({ where: { id } })
  return NextResponse.json({ success: true, deletedId: id })
}))
