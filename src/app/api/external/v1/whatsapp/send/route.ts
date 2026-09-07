import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { validateApiKey } from "@/lib/api-keys"
import { withTenant } from "@/lib/tenant-context"
import {
  sendTextMessage,
  sendMediaMessage,
  sendTemplateMessage,
  sendInteractiveMessage,
  sendCtaUrlMessage,
} from "@/lib/whatsapp"

export const POST = withErrors(async (request: NextRequest) => {
  const apiKeyHeader = request.headers.get("x-api-key") || request.headers.get("authorization")
  const keyInfo = await validateApiKey(apiKeyHeader)
  if (!keyInfo) {
    return NextResponse.json({ error: "Unauthorized: Invalid or missing API key" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "Request body is required" }, { status: 400 })
  }

  const phone = (body.phone || body.to)?.trim()
  if (!phone) {
    return NextResponse.json({ error: "Destination phone number ('phone' or 'to') is required" }, { status: 400 })
  }

  const type = body.type || (body.templateName ? "template" : body.mediaUrl ? "media" : "text")

  const result = await withTenant({ tenantId: keyInfo.tenantId, slug: "" }, async () => {
    switch (type) {
      case "text": {
        if (!body.text?.trim()) {
          return { success: false, error: "'text' field is required for text messages" }
        }
        return sendTextMessage(phone, body.text.trim())
      }

      case "image":
      case "document":
      case "video":
      case "audio":
      case "media": {
        const mediaType = type === "media" ? (body.mediaType || "image") : type
        if (!body.mediaUrl?.trim()) {
          return { success: false, error: "'mediaUrl' is required for media messages" }
        }
        return sendMediaMessage({
          to: phone,
          type: mediaType as "image" | "document" | "video" | "audio",
          mediaUrl: body.mediaUrl.trim(),
          caption: body.caption,
          filename: body.filename,
        })
      }

      case "template": {
        if (!body.templateName?.trim()) {
          return { success: false, error: "'templateName' is required for template messages" }
        }
        return sendTemplateMessage({
          to: phone,
          templateName: body.templateName.trim(),
          language: body.language || "en_US",
          variables: body.variables || [],
          headerImageUrl: body.headerImageUrl,
          buttonUrl: body.buttonUrl,
        })
      }

      case "interactive": {
        if (!body.body?.trim()) {
          return { success: false, error: "'body' text is required for interactive messages" }
        }
        return sendInteractiveMessage({
          to: phone,
          body: body.body.trim(),
          buttons: body.buttons,
          list: body.list,
          headerText: body.headerText,
          footerText: body.footerText,
        })
      }

      case "cta_url": {
        if (!body.body?.trim() || !body.buttonText?.trim() || !body.url?.trim()) {
          return { success: false, error: "'body', 'buttonText', and 'url' are required for CTA link messages" }
        }
        return sendCtaUrlMessage({
          to: phone,
          body: body.body.trim(),
          buttonText: body.buttonText.trim(),
          url: body.url.trim(),
          headerText: body.headerText,
          footerText: body.footerText,
        })
      }

      default:
        return { success: false, error: `Unsupported message type: ${type}` }
    }
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error || "Failed to send WhatsApp message" }, { status: 400 })
  }

  // Record outbound message in conversation thread so it appears in the chatbox
  try {
    const { db } = await import("@/lib/db")
    const normalizedPhone = phone.replace(/[^0-9]/g, "")

    let customer = await db.customer.findFirst({
      where: { phone: normalizedPhone },
    })
    if (!customer) {
      customer = await db.customer.create({
        data: {
          phone: normalizedPhone,
          name: body.recipientName || `+${normalizedPhone}`,
        },
      })
    }

    let conversation = await db.conversation.findFirst({
      where: { customerId: customer.id },
    })
    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          customerId: customer.id,
          customerPhone: normalizedPhone,
          channel: "WHATSAPP",
          status: "OPEN",
        },
      })
    }

    const msgMediaUrl = body.mediaUrl || body.imageUrl || body.headerImageUrl || null
    const msgType = type === "text"
      ? "TEXT"
      : type === "image" || type === "media" || msgMediaUrl
        ? "IMAGE"
        : type === "template"
          ? "TEMPLATE"
          : "INTERACTIVE"

    const content = body.text || body.caption || body.body || (type === "template" ? `Template: ${body.templateName}` : msgMediaUrl ? "" : JSON.stringify(body))

    await db.message.create({
      data: {
        conversationId: conversation.id,
        customerId: customer.id,
        direction: "OUTBOUND",
        type: msgType,
        content,
        mediaUrl: msgMediaUrl,
        status: "SENT",
        externalId: result.messageId || null,
      },
    })

    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        lastMessageText: content || "[Media Attachment]",
      },
    })
  } catch (dbErr) {
    console.warn("Could not record external WhatsApp message in conversation history:", dbErr)
  }

  return NextResponse.json({
    success: true,
    messageId: result.messageId,
    type,
    recipient: phone,
    status: "ACCEPTED",
    timestamp: new Date().toISOString(),
  })
})
