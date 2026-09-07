import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

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

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin")
  try {
    const body = await request.json()
    const { widgetId, visitorId, name, email, phone, currentUrl } = body

    if (!visitorId) {
      return NextResponse.json({ error: "Missing visitorId" }, { status: 400, headers: corsHeaders(origin) })
    }

    // Resolve widget and tenant
    let widget: any = null
    if (widgetId && widgetId !== "default") {
      widget = await (db as any).liveChatWidget.findUnique({
        where: { id: widgetId },
      })
    }

    let tenantId = widget?.tenantId
    if (!tenantId) {
      const tenant = await db.tenant.findFirst({ orderBy: { createdAt: "asc" } })
      tenantId = tenant?.id
    }

    if (!tenantId) {
      return NextResponse.json({ error: "No active tenant workspace found" }, { status: 404, headers: corsHeaders(origin) })
    }

    // Find or create customer
    let customer: any = null
    const cleanPhone = phone ? String(phone).trim() : null
    const cleanEmail = email ? String(email).trim().toLowerCase() : null
    const cleanName = name ? String(name).trim() : null

    if (cleanPhone || cleanEmail) {
      customer = await db.customer.findFirst({
        where: {
          tenantId,
          OR: [
            ...(cleanPhone ? [{ phone: cleanPhone }] : []),
            ...(cleanEmail ? [{ email: cleanEmail }] : []),
          ],
        },
      })

      if (!customer && (cleanPhone || cleanEmail)) {
        customer = await db.customer.create({
          data: {
            tenantId,
            name: cleanName || "Website Lead",
            phone: cleanPhone || `web_${visitorId.slice(0, 10)}`,
            email: cleanEmail,
            tags: ["website-live-chat"],
            notes: currentUrl ? `Initiated live chat from: ${currentUrl}` : "Initiated from website live chat widget",
          },
        })
      } else if (customer && cleanName && customer.name !== cleanName) {
        await db.customer.update({
          where: { id: customer.id },
          data: { name: cleanName },
        })
      }
    }

    // Find existing open conversation for this visitor
    let conversation = await db.conversation.findFirst({
      where: {
        tenantId,
        channel: "LIVE_CHAT",
        externalUserId: visitorId,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 50,
        },
      },
    })

    if (!conversation) {
      const placeholderPhone = cleanPhone || `web:${visitorId.slice(0, 8)}`
      const displayName = cleanName || customer?.name || "Website Visitor"

      conversation = await db.conversation.create({
        data: {
          tenantId,
          channel: "LIVE_CHAT",
          externalUserId: visitorId,
          customerPhone: placeholderPhone,
          customerName: displayName,
          customerId: customer?.id || null,
          status: "OPEN",
          botActive: widget?.enableAiAgent ?? true,
          unreadCount: 0,
        },
        include: {
          messages: true,
        },
      })

      // Send initial welcome greeting if configured
      const welcome = widget?.welcomeMessage || "Hi there! 👋 How can we help you today?"
      const welcomeMsg = await db.message.create({
        data: {
          tenantId,
          conversationId: conversation.id,
          direction: "BOT",
          type: "TEXT",
          content: welcome,
          status: "SENT",
          isAiGenerated: false,
        },
      })

      conversation.messages = [welcomeMsg]
    } else {
      // Update customer details if now supplied
      if (cleanName || customer) {
        await db.conversation.update({
          where: { id: conversation.id },
          data: {
            customerName: cleanName || conversation.customerName,
            customerId: customer?.id || conversation.customerId,
            customerPhone: cleanPhone || conversation.customerPhone,
          },
        })
      }
    }

    return NextResponse.json(
      {
        sessionId: conversation.id,
        visitorId,
        status: conversation.status,
        botActive: conversation.botActive,
        customerName: conversation.customerName,
        messages: conversation.messages.map(m => ({
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
    console.error("Failed to start live chat session:", error)
    return NextResponse.json(
      { error: "Failed to initialize live chat session" },
      { status: 500, headers: corsHeaders(origin) },
    )
  }
}
