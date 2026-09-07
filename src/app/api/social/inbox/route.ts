import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

const CHANNELS = ["WHATSAPP", "FACEBOOK", "INSTAGRAM"]
const PAGE_SIZE = 25

/** The unified inbox — WhatsApp, Messenger and Instagram DMs and comments, one list. */
export const GET = withErrors(withModule("SOCIAL_INBOX", async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const channel = searchParams.get("channel")
  const status = searchParams.get("status")
  const search = searchParams.get("search")?.trim()
  const page = Math.max(1, Number(searchParams.get("page")) || 1)

  const where: Record<string, unknown> = {}
  if (channel && CHANNELS.includes(channel)) where.channel = channel
  else where.channel = { in: ["FACEBOOK", "INSTAGRAM"] } // WhatsApp keeps its own dedicated inbox screen; this view defaults to the new channels
  if (status) where.status = status
  if (searchParams.get("escalated") === "true") where.automationPaused = true
  if (search) {
    where.OR = [
      { customerName: { contains: search, mode: "insensitive" } },
      { lastMessageText: { contains: search, mode: "insensitive" } },
    ]
  }

  const [total, conversations] = await Promise.all([
    db.conversation.count({ where }),
    db.conversation.findMany({
      where, orderBy: { lastMessageAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      include: {
        customer: { select: { name: true, socialId: true, tags: true } },
        assignedStaff: { select: { name: true } },
      },
    }),
  ])

  // Lead has no Prisma relation back to Conversation (conversationId is a
  // plain column) — fetched separately and merged rather than an `include`.
  const leadByConversation = new Map<string, string>()
  if (conversations.length) {
    const leads = await db.lead.findMany({
      where: { conversationId: { in: conversations.map(c => c.id) } },
      orderBy: { createdAt: "desc" }, select: { conversationId: true, status: true },
    })
    for (const lead of leads) if (lead.conversationId && !leadByConversation.has(lead.conversationId)) leadByConversation.set(lead.conversationId, lead.status)
  }

  return NextResponse.json({
    conversations: conversations.map(c => ({
      id: c.id, channel: c.channel, status: c.status, customerName: c.customerName || c.customer?.name || "Unknown",
      lastMessageText: c.lastMessageText, lastMessageAt: c.lastMessageAt, unreadCount: c.unreadCount,
      automationPaused: c.automationPaused, assignedStaffName: c.assignedStaff?.name || null,
      tags: c.customer?.tags || [], labels: c.labels, leadStatus: leadByConversation.get(c.id) || null,
    })),
    page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  })
}))
