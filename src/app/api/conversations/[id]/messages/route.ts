import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendWhatsApp } from "@/lib/notifications"
import { sendMediaMessage, sendLocationMessage } from "@/lib/whatsapp"
import { publish } from "@/lib/realtime"
import { aiChat, detectIntent } from "@/lib/ai"
import { isSessionOpen } from "@/lib/whatsapp-session"
import { withErrors } from "@/lib/api-handler"
import { withinLimit, limitReached } from "@/lib/entitlements"

// Get messages for a conversation + send new message
// How many of the newest messages come back even when the caller already has
// them. A message's delivery state changes after it is written — sent becomes
// delivered becomes read — and there is no `updatedAt` on the row to notice
// that by. Re-sending the recent ones keeps the ticks honest for the part of
// the thread anybody is looking at, which is the part that just scrolled past.
const TAIL_OVERLAP = 30

export const GET = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  // Everything before this the caller already holds on disk.
  //
  // Without it, opening a conversation downloads every message it has ever
  // contained — a cost that grows for as long as somebody stays a customer,
  // paid again on every single open.
  const after = new URL(request.url).searchParams.get("after")
  const afterDate = after ? new Date(after) : null
  const tail = !!(afterDate && !isNaN(afterDate.getTime()))

  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      customer: true,
      assignedStaff: true,
      // The conversation itself, its notes and the session window always come
      // back in full: they are small, and they change in ways no cursor over
      // messages would ever reveal.
      messages: tail ? false : { orderBy: { createdAt: "asc" } },
      notes: { include: { staff: true }, orderBy: { createdAt: "desc" } },
    },
  })
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })

  if (tail) {
    const [fresh, overlap] = await Promise.all([
      db.message.findMany({
        where: { conversationId: id, createdAt: { gt: afterDate! } },
        orderBy: { createdAt: "asc" },
      }),
      db.message.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: "desc" },
        take: TAIL_OVERLAP,
      }),
    ])
    // Deduplicated by id, because the overlap and the new messages meet in the
    // middle and the caller would otherwise render the same bubble twice.
    const byId = new Map<string, (typeof fresh)[number]>()
    for (const message of [...overlap, ...fresh]) byId.set(message.id, message)
    ;(conversation as any).messages = [...byId.values()].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    )
  }

  // Mark as read
  await db.conversation.update({ where: { id }, data: { unreadCount: 0 } })

  // Whether a freeform reply is deliverable right now. Outside the 24-hour
  // window Meta drops freeform silently, so the agent needs to see this before
  // typing rather than after the customer never replies.
  const expiresAt = conversation.sessionExpiresAt
  const session = {
    open: isSessionOpen(expiresAt),
    expiresAt: expiresAt ?? null,
    hoursLeft: expiresAt ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 3_600_000)) : 0,
  }

  // `tail` tells the caller these messages are a fragment to be merged into
  // what it already has, not the whole thread. Getting this wrong in the other
  // direction would silently delete somebody's history.
  return NextResponse.json({ conversation, session, tail })
})

export const POST = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  // The monthly message allowance covers replies too — a plan is priced on what goes out, whoever typed it.
  const room = await withinLimit("messagesPerMonth")
  if (!room.ok) return limitReached("messagesPerMonth", room.used, room.cap)

  const { id } = await params
  const body = await request.json()
  const { content, direction, senderId, type, mediaUrl, interactiveData, useAI, templateName, templateVariables, language } = body
  // Template media: the header image/video/document, and the per-card media a
  // carousel needs. Meta fetches these itself, so they have to be reachable
  // from the internet rather than from this process.
  const { headerMediaUrl, headerMediaType, headerDocumentName, cards } = body

  const conversation = await db.conversation.findUnique({ where: { id }, include: { customer: true } })
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })

  // Facebook Messenger / Instagram — a completely different send path (their
  // own Graph API host, their own token), and inbound processing for these
  // channels already happened in the social webhook (social-engine.ts),
  // never here. This branch only ever needs to handle an agent's own
  // outbound reply from the unified inbox.
  if (conversation.channel === "FACEBOOK" || conversation.channel === "INSTAGRAM") {
    if (direction === "INBOUND") {
      return NextResponse.json({ error: "Inbound social messages arrive through the webhook, not this route" }, { status: 400 })
    }
    const { sendNewSocialMessage } = await import("@/lib/social/social-engine")
    const SOCIAL_MEDIA_TYPE: Record<string, "IMAGE" | "VIDEO" | "AUDIO" | "FILE"> = {
      image: "IMAGE", video: "VIDEO", audio: "AUDIO", document: "FILE",
    }
    // Meta's Send API fetches the attachment itself, so it needs a real,
    // internet-reachable URL — the upload endpoint returns a relative path,
    // same as the WhatsApp media branch below resolves before sending.
    const socialBase = process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud"
    const media = mediaUrl && SOCIAL_MEDIA_TYPE[String(type || "").toLowerCase()]
      ? { url: mediaUrl.startsWith("http") ? mediaUrl : `${socialBase}${mediaUrl}`, type: SOCIAL_MEDIA_TYPE[String(type).toLowerCase()] }
      : null
    const result = await sendNewSocialMessage(id, senderId || "", content || "", media)
    const message = await db.message.findFirst({
      where: { conversationId: id, direction: "BOT" }, orderBy: { createdAt: "desc" },
    })
    publish({ type: "message", conversationId: id, direction: "OUTBOUND", preview: String(content).slice(0, 120) })
    if (!result.ok) return NextResponse.json({ message, delivered: false, error: result.error }, { status: 200 })
    return NextResponse.json({ message, delivered: true }, { status: 201 })
  }

  // Website Live Chat — instant direct delivery to visitor widget via realtime bus and SSE stream
  if (conversation.channel === "LIVE_CHAT") {
    const message = await db.message.create({
      data: {
        tenantId: conversation.tenantId,
        conversationId: id,
        customerId: conversation.customerId,
        senderId,
        direction: direction || "OUTBOUND",
        type: type || "TEXT",
        content: content || "",
        mediaUrl: mediaUrl || null,
        status: "DELIVERED",
      },
    })

    await db.conversation.update({
      where: { id },
      data: {
        lastMessageAt: new Date(),
        lastMessageText: content || "Sent an attachment",
      },
    })

    publish({
      type: "message",
      conversationId: id,
      direction: direction || "OUTBOUND",
      preview: String(content || "Attachment").slice(0, 120),
      tenantId: conversation.tenantId || undefined,
    })

    return NextResponse.json({ message, delivered: true }, { status: 201 })
  }

  // If inbound message, store it and potentially trigger AI
  if (direction === "INBOUND") {
    const message = await db.message.create({
      data: {
        conversationId: id,
        customerId: conversation.customerId,
        direction: "INBOUND",
        type: type || "TEXT",
        content,
        mediaUrl,
      },
    })

    await db.conversation.update({
      where: { id },
      data: {
        lastMessageAt: new Date(),
        lastMessageText: content,
        unreadCount: { increment: 1 },
      },
    })

    // If bot is active, generate AI response
    if (conversation.botActive && useAI !== false) {
      try {
        const intent = await detectIntent(content)
        await db.conversation.update({
          where: { id },
          data: {
            intent: intent.intent,
            sentiment: intent.sentiment,
            botActive: !intent.needsHumanHandoff,
          },
        })

        if (intent.needsHumanHandoff) {
          // Hand off to human
          await db.message.create({
            data: {
              conversationId: id,
              direction: "BOT",
              type: "TEXT",
              content: "I'm connecting you with one of our team members who will assist you shortly. 🙏",
              isAiGenerated: true,
              status: "SENT",
            },
          })
        } else {
          // Get conversation history for context
          const history = await db.message.findMany({
            where: { conversationId: id },
            orderBy: { createdAt: "asc" },
            take: 20,
          })
          const aiMessages = history.map(m => ({
            role: (m.direction === "INBOUND" ? "user" : "assistant") as "user" | "assistant",
            content: m.content,
          }))
          aiMessages.push({ role: "user", content })

          const aiResponse = await aiChat(aiMessages, conversation.customer?.preferredLang || "en")

          const aiMessage = await db.message.create({
            data: {
              conversationId: id,
              customerId: conversation.customerId,
              direction: "BOT",
              type: "TEXT",
              content: aiResponse,
              isAiGenerated: true,
              status: "SENT",
            },
          })

          await db.conversation.update({
            where: { id },
            data: {
              lastMessageAt: new Date(),
              lastMessageText: aiResponse,
            },
          })

          return NextResponse.json({ message, aiResponse: aiMessage })
        }
      } catch (e) {
        console.error("AI processing error:", e)
      }
    }

    return NextResponse.json({ message })
  }

  // ─── Outbound message (agent or manual) ───
  // This used to write the row and stop, so an agent's reply was stored in the
  // database and never actually delivered — the conversation looked answered
  // in the inbox while the customer heard nothing.
  // Media and location are their own message types in the Cloud API. Before
  // this, mediaUrl was accepted, stored on the row and never sent — an agent
  // could attach an image, see it in the thread, and the customer would
  // receive nothing.
  const MEDIA_TYPES = ["image", "document", "video", "audio"] as const
  type MediaType = (typeof MEDIA_TYPES)[number]
  const mediaType = String(type || "").toLowerCase() as MediaType

  let sendResult: { success: boolean; messageId?: string; error?: string }

  let finalInteractiveData = interactiveData

  if (type === "CATALOG") {
    const { sendMultiProductMessage } = await import("@/lib/whatsapp")
    const catalogId = body.catalogId || process.env.META_CATALOG_ID || "default"
    const headerText = body.headerText || "🛍️ Browse Our Catalog"
    const bodyText = content || "Explore our packages and menu items, order directly on WhatsApp!"
    const sections = body.sections || [
      {
        title: "Featured Items",
        productItems: (body.items || [{ productRetailerId: body.productRetailerId || "item_1" }]).map((it: any) => ({
          productRetailerId: String(it.productRetailerId || it.id || "item_1"),
        })),
      },
    ]
    sendResult = await sendMultiProductMessage({
      to: conversation.customerPhone,
      catalogId,
      headerText,
      bodyText,
      sections,
    })
    finalInteractiveData = { catalog: true, catalogId, headerText, bodyText, items: body.items || [] }
  } else if (body.location && typeof body.location.latitude === "number" && typeof body.location.longitude === "number") {
    sendResult = await sendLocationMessage({
      to: conversation.customerPhone,
      latitude: body.location.latitude,
      longitude: body.location.longitude,
      name: body.location.name,
      address: body.location.address,
    })
  } else if (mediaUrl && MEDIA_TYPES.includes(mediaType)) {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud"
    const absoluteUrl = mediaUrl.startsWith("http") ? mediaUrl : `${base}${mediaUrl}`
    sendResult = await sendMediaMessage({
      to: conversation.customerPhone,
      type: mediaType,
      mediaUrl: absoluteUrl,
      caption: content || undefined,
      filename: body.filename,
    })
  } else {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud"
    const absolute = (url?: string) =>
      !url ? undefined : url.startsWith("http") ? url : `${base}${url}`
    const headerType = String(headerMediaType || "image").toLowerCase()

    sendResult = await sendWhatsApp({
      to: conversation.customerPhone,
      ...(templateName
        ? {
            templateName,
            templateVariables,
            language,
            imageUrl: headerType === "image" ? absolute(headerMediaUrl) : undefined,
            videoUrl: headerType === "video" ? absolute(headerMediaUrl) : undefined,
            documentUrl: headerType === "document" ? absolute(headerMediaUrl) : undefined,
            documentName: headerDocumentName,
            cards: Array.isArray(cards)
              ? cards.map((card: any) => ({
                  imageUrl: absolute(card?.imageUrl),
                  videoUrl: absolute(card?.videoUrl),
                  variables: Array.isArray(card?.variables) ? card.variables.map(String) : undefined,
                  buttonUrl: card?.buttonUrl,
                }))
              : undefined,
          }
        : { body: content }),
    })
  }

  // Ensure interactiveData retains carousel cards for UI rendering
  if (!finalInteractiveData && Array.isArray(cards) && cards.length > 0) {
    finalInteractiveData = { cards }
  } else if (!finalInteractiveData && templateName) {
    const tmpl = await db.template.findFirst({ where: { name: templateName } })
    if (tmpl?.cards) {
      try {
        const parsedCards = typeof tmpl.cards === "string" ? JSON.parse(tmpl.cards) : tmpl.cards
        if (Array.isArray(parsedCards) && parsedCards.length > 0) {
          finalInteractiveData = { cards: parsedCards }
        }
      } catch {
        // ignore
      }
    }
  }

  const message = await db.message.create({
    data: {
      conversationId: id,
      customerId: conversation.customerId,
      senderId,
      direction: direction || "OUTBOUND",
      type: type || (templateName ? "TEMPLATE" : "TEXT"),
      content,
      mediaUrl: mediaUrl || (templateName ? headerMediaUrl || null : null),
      templateName: templateName || null,
      externalId: sendResult.messageId || null,
      interactiveData: finalInteractiveData ? JSON.stringify(finalInteractiveData) : undefined,
      status: sendResult.success ? "SENT" : "FAILED",
    },
  })

  await db.conversation.update({
    where: { id },
    data: { lastMessageAt: new Date(), lastMessageText: content },
  })

  publish({ type: "message", conversationId: id, direction: "OUTBOUND", preview: String(content).slice(0, 120) })

  if (!sendResult.success) {
    // 200 with the stored message so the agent sees their text in the thread,
    // plus the reason, so a silent failure can't masquerade as a sent reply.
    return NextResponse.json(
      { message, delivered: false, error: sendResult.error },
      { status: 200 },
    )
  }

  return NextResponse.json({ message, delivered: true }, { status: 201 })
})
