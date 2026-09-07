import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"

export const GET = withErrors(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const assignedTo = searchParams.get("assignedTo")

  const where: any = {}
  if (status) where.status = status
  if (assignedTo) where.assignedStaffId = assignedTo

  // Ask only for what changed.
  //
  // The mobile app keeps its own copy of the inbox and sends back the
  // timestamp it last synced at. Answering with the conversations touched
  // since then turns a launch from "every conversation this business has ever
  // had, each with its customer, its agent and its latest message" into a
  // handful of rows — usually none at all.
  //
  // `updatedAt` rather than `lastMessageAt`, because being assigned to someone
  // else or having its unread count cleared changes a conversation without a
  // message arriving, and the app has to see that too.
  //
  // The cursor is stamped before the query rather than after, so anything
  // written while it runs is picked up next time instead of being skipped.
  const syncedAt = new Date()
  const since = searchParams.get("since")
  const sinceDate = since ? new Date(since) : null
  const incremental = !!(sinceDate && !isNaN(sinceDate.getTime()))
  if (incremental) where.updatedAt = { gt: sinceDate }

  const conversations = await db.conversation.findMany({
    where,
    include: {
      customer: true,
      assignedStaff: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
  })

  // A full list is authoritative — anything missing from it has been deleted.
  // A delta is not, and the caller has to be told which one it received before
  // it decides whether to replace its cache or merge into it.
  return NextResponse.json({
    conversations,
    incremental,
    syncedAt: syncedAt.toISOString(),
  })
})

export const POST = withErrors(async (request: NextRequest) => {
  const body = await request.json()
  const { customerPhone, customerName, customerId, autoAssign } = body

  let convo = await db.conversation.findFirst({ where: { customerPhone } })
  if (!convo) {
    let customer = customerId ? await db.customer.findFirst({ where: { id: customerId } }) : null
    if (!customer && customerPhone) {
      customer = await db.customer.findFirst({ where: { phone: customerPhone } })
    }

    // Auto-assign to available agent (round-robin) — Per BRD §6.5.5
    let assignedStaffId: string | null = null
    if (autoAssign !== false) {
      const activeAgents = await db.staff.findMany({
        where: { role: "CHAT_AGENT", isActive: true },
        include: { _count: { select: { conversationsOwned: true } } },
      })
      // Assign to agent with fewest conversations (load-based)
      if (activeAgents.length > 0) {
        const sorted = activeAgents.sort((a, b) => a._count.conversationsOwned - b._count.conversationsOwned)
        assignedStaffId = sorted[0].id
      }
    }

    convo = await db.conversation.create({
      data: {
        customerPhone,
        customerName: customerName || customer?.name,
        customerId: customer?.id,
        status: "OPEN",
        botActive: true,
        assignedStaffId,
      },
    })
  }

  return NextResponse.json({ conversation: convo }, { status: 201 })
})
