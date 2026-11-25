import { NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { chatRoute } from "@/lib/chat-api/access"
import { conversationSelect, decodeCursor, encodeCursor, pageSchema } from "@/lib/chat-api/contracts"
import { maskPhoneNumber } from "@/lib/permissions"

export const GET = chatRoute(false, async (request, _context, access) => {
  const query = pageSchema.parse(Object.fromEntries(request.nextUrl.searchParams))
  const scope = `${access.tenantId}:conversations:${query.since ?? "all"}`
  const cursor = decodeCursor(query.cursor, scope)
  const startedAt = new Date()
  const rows = await raw.conversation.findMany({
    where: {
      tenantId: access.tenantId,
      ...(!access.canViewAllConversations ? { assignedStaffId: access.staffId } : {}),
      ...(query.since ? { updatedAt: { gte: new Date(query.since) } } : {}),
      ...(cursor ? { OR: [{ updatedAt: { gt: cursor.at } }, { updatedAt: cursor.at, id: { gt: cursor.id } }] } : {}),
    },
    select: conversationSelect,
    orderBy: [{ updatedAt: "asc" }, { id: "asc" }], take: query.limit + 1,
  })
  const sliced = rows.slice(0, query.limit)
  const data = access.canViewPhoneNumbers
    ? sliced
    : sliced.map(row => ({
        ...row,
        customerPhone: maskPhoneNumber(row.customerPhone, false),
      }))
  const last = sliced.at(-1)
  return NextResponse.json({ data, page: { hasMore: rows.length > query.limit,
    nextCursor: rows.length > query.limit && last ? encodeCursor(scope, last.updatedAt, last.id) : null },
    sync: { startedAt, consistency: "eventual", mode: query.since ? "merge" : "inventory", reconcileRequired: true } })
})
