import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { sendWhatsApp } from "@/lib/notifications"
import { sendMediaMessage, sendLocationMessage } from "@/lib/whatsapp"
import { publish } from "@/lib/realtime"
import { isSessionOpen } from "@/lib/whatsapp-session"
import { chatRoute } from "@/lib/chat-api/access"
import { withinLimit, limitReached } from "@/lib/entitlements"
import { z } from "zod"

const sendPayloadSchema = z.object({
  content: z.string().optional(),
  type: z.enum(["TEXT", "IMAGE", "VIDEO", "DOCUMENT", "AUDIO", "LOCATION", "TEMPLATE", "CATALOG"]).default("TEXT"),
  mediaUrl: z.string().optional(),
  filename: z.string().optional(),
  templateName: z.string().optional(),
  templateVariables: z.array(z.string()).optional(),
  language: z.string().optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    name: z.string().optional(),
    address: z.string().optional(),
  }).optional(),
  headerMediaUrl: z.string().optional(),
  headerMediaType: z.string().optional(),
})

export const OPTIONS = async () => new NextResponse(null, { status: 204 })

export const POST = chatRoute(true, async (request: NextRequest, { params }: { params: Promise<{ id: string }> }, access) => {
  if (!access.canSendMessages) {
    return NextResponse.json(
      { error: { code: "PERMISSION_DENIED", message: "You do not have permission to send messages." } },
      { status: 403 }
    )
  }
  const room = await withinLimit("messagesPerMonth")
  if (!room.ok) return limitReached("messagesPerMonth", room.used, room.cap)

  const { id } = await params
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: { code: "INVALID_JSON", message: "Malformed JSON" } }, { status: 400 })
  }

  const parsed = sendPayloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Invalid payload parameters.", details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  const conversation = await raw.conversation.findFirst({
    where: { id, tenantId: access.tenantId },
    include: { customer: true },
  })

  if (!conversation) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Conversation not found." } }, { status: 404 })
  }

  const { content, type, mediaUrl, filename, templateName, templateVariables, language, location, headerMediaUrl, headerMediaType } = parsed.data

  let sendResult: { success: boolean; messageId?: string; error?: string } = { success: false }

  // 1. Social channels (Facebook / Instagram)
  if (conversation.channel === "FACEBOOK" || conversation.channel === "INSTAGRAM") {
    const { sendNewSocialMessage } = await import("@/lib/social/social-engine")
    const SOCIAL_MEDIA_TYPE: Record<string, "IMAGE" | "VIDEO" | "AUDIO" | "FILE"> = {
      image: "IMAGE", video: "VIDEO", audio: "AUDIO", document: "FILE",
    }
    const socialBase = process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud"
    const media = mediaUrl && SOCIAL_MEDIA_TYPE[String(type).toLowerCase()]
      ? { url: mediaUrl.startsWith("http") ? mediaUrl : `${socialBase}${mediaUrl}`, type: SOCIAL_MEDIA_TYPE[String(type).toLowerCase()] }
      : null

    const result = await sendNewSocialMessage(id, access.staffId, content || "", media)
    sendResult = { success: result.ok, error: result.error }
  } else if (conversation.channel === "LIVE_CHAT") {
    // 2. Website Live Chat
    sendResult = { success: true }
  } else {
    // 3. WhatsApp Cloud API
    if (location) {
      sendResult = await sendLocationMessage({
        to: conversation.customerPhone,
        latitude: location.latitude,
        longitude: location.longitude,
        name: location.name,
        address: location.address,
      })
    } else if (mediaUrl && ["IMAGE", "DOCUMENT", "VIDEO", "AUDIO"].includes(type)) {
      const base = process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud"
      const absoluteUrl = mediaUrl.startsWith("http") ? mediaUrl : `${base}${mediaUrl}`
      sendResult = await sendMediaMessage({
        to: conversation.customerPhone,
        type: type.toLowerCase() as any,
        mediaUrl: absoluteUrl,
        caption: content || undefined,
        filename,
      })
    } else {
      const base = process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud"
      const absolute = (url?: string) => (!url ? undefined : url.startsWith("http") ? url : `${base}${url}`)
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
            }
          : { body: content }),
      })
    }
  }

  // Create message record
  const message = await raw.message.create({
    data: {
      tenantId: access.tenantId,
      conversationId: id,
      customerId: conversation.customerId,
      senderId: access.staffId,
      direction: "OUTBOUND",
      type: type || (templateName ? "TEMPLATE" : "TEXT"),
      content: content || "",
      mediaUrl: mediaUrl || (templateName ? headerMediaUrl || null : null),
      templateName: templateName || null,
      externalId: sendResult.messageId || null,
      status: sendResult.success ? "SENT" : "FAILED",
    },
  })

  // Update conversation
  await raw.conversation.update({
    where: { id },
    data: {
      lastMessageAt: new Date(),
      lastMessageText: content || "Sent attachment",
      botActive: false,
      automationPaused: true,
    },
  })

  publish({
    type: "message",
    conversationId: id,
    direction: "OUTBOUND",
    preview: String(content || "Attachment").slice(0, 120),
    tenantId: access.tenantId,
  })
  publish({
    type: "conversation",
    conversationId: id,
    tenantId: access.tenantId,
  })

  return NextResponse.json(
    {
      data: {
        message,
        delivered: sendResult.success,
        error: sendResult.error || null,
      },
    },
    { status: sendResult.success ? 201 : 200 }
  )
})
