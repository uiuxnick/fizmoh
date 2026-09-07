import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"

export const GET = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant(); if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  const q = new URL(request.url).searchParams.get("q")?.trim() || ""
  if (q.length < 2) return NextResponse.json({ results: [] })
  const term = q.slice(0, 80)
  const [customers, conversations, orders, messages] = await Promise.all([
    db.customer.findMany({ where: { tenantId: tenant.tenantId, OR: [{ name: { contains: term, mode: "insensitive" } }, { phone: { contains: term } }, { email: { contains: term, mode: "insensitive" } }] }, take: 8, select: { id: true, name: true, phone: true, email: true } }),
    db.conversation.findMany({ where: { tenantId: tenant.tenantId, OR: [{ customerName: { contains: term, mode: "insensitive" } }, { customerPhone: { contains: term } }, { lastMessageText: { contains: term, mode: "insensitive" } }] }, take: 8, select: { id: true, customerName: true, customerPhone: true, lastMessageText: true, lastMessageAt: true, customer: { select: { name: true } } } }),
    db.order.findMany({ where: { tenantId: tenant.tenantId, OR: [{ id: { contains: term, mode: "insensitive" } }, { customerName: { contains: term, mode: "insensitive" } }, { customerPhone: { contains: term } }] }, take: 8, select: { id: true, customerName: true, customerPhone: true, orderStatus: true, totalAmount: true } }),
    // Searching what people actually said, not only the latest line of each
    // thread. A conversation row holds `lastMessageText` and nothing else, so
    // "who asked about the chemotherapy price" matched nothing unless it
    // happened to be the most recent thing that customer sent.
    db.message.findMany({
      where: { tenantId: tenant.tenantId, content: { contains: term, mode: "insensitive" } },
      take: 24,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, content: true, createdAt: true, conversationId: true,
        conversation: {
          select: { customerName: true, customerPhone: true, customer: { select: { name: true } } },
        },
      },
    }),
  ])

  // One hit per conversation, and none for a conversation already listed
  // above — three rows saying the same customer's name is a worse answer than
  // one, however many of their messages matched.
  const seen = new Set(conversations.map(item => item.id))
  const messageHits: typeof messages = []
  for (const message of messages) {
    if (seen.has(message.conversationId)) continue
    seen.add(message.conversationId)
    messageHits.push(message)
    if (messageHits.length >= 8) break
  }

  return NextResponse.json({ results: [
    ...customers.map(item => ({ type: "customer", id: item.id, title: item.name || item.phone, subtitle: item.email || item.phone })),
    ...conversations.map(item => ({ type: "conversation", id: item.id, title: item.customer?.name || item.customerName || item.customerPhone, subtitle: item.lastMessageText })),
    ...orders.map(item => ({ type: "order", id: item.id, title: `Order ${item.id.slice(-8)}`, subtitle: `${item.customerName || item.customerPhone || "Customer"} · ${item.orderStatus}` })),
    // Addressed by conversation, not by message: opening the thread is what
    // somebody wants after finding the line they half-remembered.
    ...messageHits.map(item => ({
      type: "conversation",
      id: item.conversationId,
      title: item.conversation?.customer?.name ||
          item.conversation?.customerName ||
          item.conversation?.customerPhone ||
          "Conversation",
      subtitle: item.content.length > 120 ? `${item.content.slice(0, 120)}…` : item.content,
      matchedIn: "message",
      at: item.createdAt,
    })),
  ] })
})
