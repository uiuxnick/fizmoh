import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"

/** Internal notes on a conversation. Never sent to the customer. */
export const GET = withErrors(async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const notes = await db.staffNote.findMany({
    where: { conversationId: id },
    include: { staff: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
  return NextResponse.json({ notes })
})

export const POST = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const session = await sessionFromRequest(request)
  // A note is attributed to whoever wrote it, so the author must be known.
  if (session?.kind !== "staff" || !session.staffId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  const staffId = session.staffId

  const body = await request.json().catch(() => null)
  const content = String(body?.content || "").trim()
  if (!content) return NextResponse.json({ error: "Write something first" }, { status: 400 })

  const note = await db.staffNote.create({
    data: {
      conversationId: id,
      staffId,
      content: content.slice(0, 4000),
      isPrivate: true,
    },
    include: { staff: { select: { name: true } } },
  })
  return NextResponse.json({ note }, { status: 201 })
})
