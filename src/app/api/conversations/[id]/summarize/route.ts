import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { summarizeConversationThread, isAIConfigured } from "@/lib/ai"
import { withErrors } from "@/lib/api-handler"

/**
 * Generates an executive 3-bullet AI summary of the conversation thread:
 * 1) Customer Intent & Core Request
 * 2) Current Status & Discussion
 * 3) Recommended Next Action
 */
export const POST = withErrors(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  const conversation = await db.conversation.findUnique({
    where: { id },
    select: {
      id: true,
      customerName: true,
      customerPhone: true,
      status: true,
    },
  })

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  const messages = await db.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
    take: 25,
    select: {
      direction: true,
      content: true,
      createdAt: true,
      sender: { select: { name: true } },
    },
  })

  if (messages.length === 0) {
    return NextResponse.json({
      summary: "No messages in this conversation yet.",
      points: {
        intent: "No messages yet",
        status: "Empty conversation",
        nextAction: "Wait for customer message or reach out proactively",
      },
    })
  }

  const formattedMessages = messages.map(m => ({
    role: m.direction === "INBOUND" ? "customer" : "agent",
    sender: m.direction === "INBOUND" 
      ? (conversation.customerName || "Customer") 
      : m.direction === "BOT" 
        ? "AI Bot" 
        : (m.sender?.name || "Support Staff"),
    content: m.content || "",
  }))

  const result = await summarizeConversationThread(formattedMessages)

  return NextResponse.json({
    success: true,
    summary: result.summary,
    points: {
      intent: result.intent,
      status: result.status,
      nextAction: result.nextAction,
    },
    messageCount: messages.length,
    aiAvailable: await isAIConfigured(),
  })
})
