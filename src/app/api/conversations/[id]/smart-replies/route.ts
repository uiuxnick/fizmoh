import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { generateSmartReplies, isAIConfigured } from "@/lib/ai"
import { withErrors } from "@/lib/api-handler"

/**
 * Suggested replies for the agent handling this conversation.
 * Per BRD §6.5.5: speeds up agent response time alongside canned responses.
 */
export const GET = withErrors(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  if (!isAIConfigured()) {
    return NextResponse.json({ replies: [], reason: "AI is not configured" })
  }

  const conversation = await db.conversation.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })

  const messages = await db.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { direction: true, content: true },
  })

  if (messages.length === 0) return NextResponse.json({ replies: [] })

  const replies = await generateSmartReplies(
    messages
      .reverse()
      .map(m => ({ role: m.direction === "INBOUND" ? "customer" : "agent", content: m.content })),
  )

  return NextResponse.json({ replies })
})
