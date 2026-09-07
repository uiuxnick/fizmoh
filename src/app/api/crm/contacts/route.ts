import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { Prisma } from "@prisma/client"

/**
 * The contact list, as a salesperson needs it.
 *
 * The old customers endpoint returned every row with no search, no filter and
 * no ordering — fine for forty contacts and useless at four thousand, which is
 * the point at which anybody actually needs a CRM. This one answers the
 * questions that get asked: who is new, who is mine, who has not been spoken
 * to, who owes us a follow-up today.
 */

const PAGE = 50

export const GET = withErrors(async (request: NextRequest) => {
  const params = new URL(request.url).searchParams
  const search = (params.get("q") || "").trim()
  const stage = params.get("stage") || ""
  const owner = params.get("owner") || ""
  const tag = params.get("tag") || ""
  const due = params.get("due") === "1"
  const sort = params.get("sort") || "recent"
  const page = Math.max(1, Number(params.get("page")) || 1)

  const where: Prisma.CustomerWhereInput = {}
  if (search) {
    // Phone, name and email together: people search for whichever of the
    // three they happen to have in front of them.
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { email: { contains: search, mode: "insensitive" } },
    ]
  }
  if (stage) where.stage = stage
  if (owner) where.ownerStaffId = owner === "unassigned" ? null : owner
  if (due) where.nextFollowUpAt = { lte: new Date() }

  const orderBy: Prisma.CustomerOrderByWithRelationInput =
    sort === "value" ? { totalSpent: "desc" }
    : sort === "name" ? { name: "asc" }
    : sort === "quiet" ? { lastContactAt: "asc" }
    : { createdAt: "desc" }

  const [rows, total, stages] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE,
      take: PAGE,
      select: {
        id: true, name: true, phone: true, email: true, stage: true,
        ownerStaffId: true, source: true, tags: true, totalBookings: true,
        totalSpent: true, lastContactAt: true, nextFollowUpAt: true,
        whatsappOptIn: true, createdAt: true, loyaltyTier: true,
      },
    }),
    db.customer.count({ where }),
    // The pipeline counts, which is the first thing anybody looks at.
    db.customer.groupBy({ by: ["stage"], _count: { _all: true } }),
  ])

  const filtered = tag
    ? rows.filter(row => Array.isArray(row.tags) && (row.tags as string[]).includes(tag))
    : rows

  const staff = await db.staff.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  return NextResponse.json({
    contacts: filtered,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE)),
    stages: Object.fromEntries(stages.map(s => [s.stage, s._count._all])),
    staff,
  })
})

/** Bulk edits from the list — assigning an owner, moving a stage, tagging. */
export const PATCH = withErrors(async (request: NextRequest) => {
  const body = await request.json().catch(() => null)
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.map(String) : []
  if (ids.length === 0) return NextResponse.json({ error: "Nothing selected" }, { status: 400 })

  const data: Prisma.CustomerUpdateManyMutationInput = {}
  if (typeof body.stage === "string") data.stage = body.stage
  if (typeof body.ownerStaffId === "string") data.ownerStaffId = body.ownerStaffId || null
  if (body.nextFollowUpAt === null) data.nextFollowUpAt = null
  else if (typeof body.nextFollowUpAt === "string") data.nextFollowUpAt = new Date(body.nextFollowUpAt)

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to change" }, { status: 400 })
  }

  // updateMany is already narrowed to this business by the scoped client, so
  // an id from another workspace simply matches nothing.
  const result = await db.customer.updateMany({ where: { id: { in: ids } }, data })
  return NextResponse.json({ updated: result.count })
})
