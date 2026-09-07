import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { publish } from "@/lib/realtime"
import { aiChat, detectIntent } from "@/lib/ai"

function corsHeaders(origin: string | null = "*") {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  })
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin")
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("sessionId")
  const after = searchParams.get("after")

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400, headers: corsHeaders(origin) })
  }

  try {
    const afterDate = after ? new Date(after) : null
    const where: any = { conversationId: sessionId }
    if (afterDate && !isNaN(afterDate.getTime())) {
      where.createdAt = { gt: afterDate }
    }

    const messages = await db.message.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: 100,
    })

    const conversation = await db.conversation.findUnique({
      where: { id: sessionId },
      select: { status: true, botActive: true },
    })

    return NextResponse.json(
      {
        status: conversation?.status || "OPEN",
        botActive: conversation?.botActive ?? true,
        messages: messages.map(m => ({
          id: m.id,
          direction: m.direction,
          content: m.content,
          mediaUrl: m.mediaUrl,
          type: m.type,
          createdAt: m.createdAt,
          isAiGenerated: m.isAiGenerated,
        })),
      },
      { headers: corsHeaders(origin) },
    )
  } catch (error: any) {
    console.error("Failed to fetch widget messages:", error)
    return NextResponse.json(
      { error: "Failed to load messages" },
      { status: 500, headers: corsHeaders(origin) },
    )
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin")
  try {
    const body = await request.json()
    const { sessionId, visitorId, content, mediaUrl, requestHumanHandoff } = body

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400, headers: corsHeaders(origin) })
    }

    const conversation = await db.conversation.findUnique({
      where: { id: sessionId },
      include: { customer: true },
    })

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404, headers: corsHeaders(origin) })
    }

    // Visitor explicitly requested a human agent
    if (requestHumanHandoff) {
      await db.conversation.update({
        where: { id: sessionId },
        data: {
          botActive: false,
          status: "OPEN",
          unreadCount: { increment: 1 },
        },
      })

      const handoffMessage = await db.message.create({
        data: {
          tenantId: conversation.tenantId,
          conversationId: sessionId,
          direction: "BOT",
          type: "TEXT",
          content: "I have connected you with our human support team. A representative will be with you shortly! 👋",
          isAiGenerated: true,
          status: "SENT",
        },
      })

      publish({
        type: "message",
        conversationId: sessionId,
        direction: "INBOUND",
        preview: "Visitor requested human agent handover",
        channel: "LIVE_CHAT",
      })

      return NextResponse.json(
        {
          success: true,
          botActive: false,
          handoff: true,
          aiResponse: {
            id: handoffMessage.id,
            direction: handoffMessage.direction,
            content: handoffMessage.content,
            createdAt: handoffMessage.createdAt,
          },
        },
        { headers: corsHeaders(origin) },
      )
    }

    if (!content && !mediaUrl) {
      return NextResponse.json({ error: "Message content or media required" }, { status: 400, headers: corsHeaders(origin) })
    }

    // 1. Create inbound message from visitor
    const inboundMessage = await db.message.create({
      data: {
        tenantId: conversation.tenantId,
        conversationId: sessionId,
        customerId: conversation.customerId,
        direction: "INBOUND",
        type: mediaUrl ? "IMAGE" : "TEXT",
        content: content || "Sent an attachment",
        mediaUrl: mediaUrl || null,
        status: "DELIVERED",
      },
    })

    await db.conversation.update({
      where: { id: sessionId },
      data: {
        lastMessageAt: new Date(),
        lastMessageText: content || "Sent an attachment",
        unreadCount: { increment: 1 },
      },
    })

    // Notify Unified Inbox in real-time
    publish({
      type: "message",
      conversationId: sessionId,
      direction: "INBOUND",
      preview: String(content || "Attachment").slice(0, 120),
      channel: "LIVE_CHAT",
    })

    // 2. Check if AI Agent auto-reply should run
    let aiResponseMessage: any = null
    if (conversation.botActive && !conversation.automationPaused && content) {
      try {
        const intent = await detectIntent(content)

        if (intent.needsHumanHandoff) {
          await db.conversation.update({
            where: { id: sessionId },
            data: {
              botActive: false,
              intent: intent.intent,
              sentiment: intent.sentiment,
            },
          })

          aiResponseMessage = await db.message.create({
            data: {
              tenantId: conversation.tenantId,
              conversationId: sessionId,
              direction: "BOT",
              type: "TEXT",
              content: "I'm looping in a member of our support team to assist you further. 🙏",
              isAiGenerated: true,
              status: "SENT",
            },
          })
        } else {
          // Fetch conversation history for smart grounded reply
          const recentMessages = await db.message.findMany({
            where: { conversationId: sessionId },
            orderBy: { createdAt: "asc" },
            take: 12,
          })

          const aiHistory = recentMessages.map(m => ({
            role: (m.direction === "INBOUND" ? "user" : "assistant") as "user" | "assistant",
            content: m.content,
          }))

          const aiReplyText = await aiChat(aiHistory, conversation.customer?.preferredLang || "en")

          aiResponseMessage = await db.message.create({
            data: {
              tenantId: conversation.tenantId,
              conversationId: sessionId,
              direction: "BOT",
              type: "TEXT",
              content: aiReplyText,
              isAiGenerated: true,
              status: "SENT",
            },
          })

          await db.conversation.update({
            where: { id: sessionId },
            data: {
              lastMessageAt: new Date(),
              lastMessageText: aiReplyText,
            },
          })

          // Publish bot reply to dashboard stream so agent views live update
          publish({
            type: "message",
            conversationId: sessionId,
            direction: "BOT",
            preview: aiReplyText.slice(0, 120),
            channel: "LIVE_CHAT",
          })
        }
      } catch (err) {
        console.error("Failed to generate AI bot reply for live chat:", err)
      }
    }

    // 3. AI Smart Replies for human agents
    // Even when a human agent is handling the chat, generate quick suggested responses
    // so the agent can 1-click reply in the unified dashboard inbox!
    try {
      if (!conversation.botActive && content) {
        const suggestions = [
          "Thank you for reaching out! How can I assist you further?",
          "Sure, let me check that information for you right away.",
          "Could you please share your order or booking reference number?",
        ]
        await db.message.update({
          where: { id: inboundMessage.id },
          data: {
            aiSuggestions: suggestions,
          },
        })
      }
    } catch {
      // ignore
    }

    return NextResponse.json(
      {
        message: {
          id: inboundMessage.id,
          direction: inboundMessage.direction,
          content: inboundMessage.content,
          mediaUrl: inboundMessage.mediaUrl,
          createdAt: inboundMessage.createdAt,
        },
        aiResponse: aiResponseMessage
          ? {
              id: aiResponseMessage.id,
              direction: aiResponseMessage.direction,
              content: aiResponseMessage.content,
              createdAt: aiResponseMessage.createdAt,
              isAiGenerated: true,
            }
          : null,
      },
      { headers: corsHeaders(origin) },
    )
  } catch (error: any) {
    console.error("Failed to process live chat message:", error)
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500, headers: corsHeaders(origin) },
    )
  }
}
