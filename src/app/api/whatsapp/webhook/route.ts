import { withErrors } from "@/lib/api-handler"
import { storeMedia } from "@/lib/media-store"
import { NextRequest, NextResponse } from "next/server"
import { after } from "next/server"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { verifyWebhookSignature, downloadMedia, downloadMediaBytes, sendInteractiveMessage, getWhatsAppConfig, showTyping } from "@/lib/whatsapp"
import { aiChat, detectIntent, analyzePaymentScreenshot, transcribeAudio } from "@/lib/ai"
import { sendWhatsApp } from "@/lib/notifications"
import { formatCurrency, formatDate } from "@/lib/helpers"
import { confirmOrderOnce } from "@/lib/confirm-order"
import { sessionExpiryFrom } from "@/lib/whatsapp-session"
import { runBotFlows, resumeFlow, flowWouldMatch, runNewConversationFlow } from "@/lib/botflow-engine"
import { shouldSendAwayMessage } from "@/lib/business-hours"
import { publish, notifyStaff } from "@/lib/realtime"
import { rememberCall, forgetCall } from "@/lib/live-calls"
import { tenantForPhoneNumberId } from "@/lib/whatsapp-accounts"
import { withTenant, currentTenant } from "@/lib/tenant"
import { getConfigValue } from "@/lib/app-config"
import {
  startBookingFlow,
  handleBookingReply,
  handleBookingText,
  isFlowReply,
  isFlowTrigger,
  getState,
  bookingAwaitingScreenshot,
  completeBooking,
} from "@/lib/booking-flow"
import {
  startMarketingFlow,
  handleMarketingReply,
  handleMarketingText,
  isMarketingReply,
  isMarketingTrigger,
} from "@/lib/fizmoh-marketing-flow"
import {
  startAppointmentFlow,
  handleAppointmentReply,
  handleAppointmentText,
  isAppointmentReply,
  isAppointmentTrigger,
  getAppointmentState,
} from "@/lib/appointment-flow"
import {
  startVisaFlow,
  handleVisaReply,
  handleVisaText,
  isVisaReply,
  isVisaTrigger,
  getVisaState,
} from "@/lib/visa-flow"
import {
  isOptInMessage,
  isOptOutMessage,
  recordOptIn,
  recordOptOut,
  OPT_IN_CONFIRMATION,
  OPT_OUT_CONFIRMATION,
} from "@/lib/optout"

/**
 * WhatsApp Webhook Handler (Meta Cloud API)
 *
 * Per BRD §6.5: Conversational Commerce
 * - Receives messages from WhatsApp
 * - Stores in conversation
 * - AI assistant auto-responds (if bot active)
 * - Handles: availability, booking, order status, payment screenshots, FAQs
 * - Human handoff when needed
 */

export const GET = withErrors(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  // Read through the same resolver the rest of the integration uses, so a
  // token set in the admin panel works as well as one set in the environment.
  const { webhookVerifyToken } = await getWhatsAppConfig()
  const verifyToken = webhookVerifyToken

  if (mode === "subscribe" && verifyToken && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
})

export const POST = withErrors(async (request: NextRequest) => {
  const bodyText = await request.text()

  const signature = request.headers.get("x-hub-signature-256") || ""
  const replay = request.headers.get("x-fizmoh-replay") === process.env.CRON_SECRET
  if (!replay && !(await verifyWebhookSignature(bodyText, signature))) {
    console.error("WhatsApp webhook signature verification FAILED")
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let body: any
  try {
    body = JSON.parse(bodyText)
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  if (!body.object) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  // Acknowledge before processing. Meta retries any delivery it considers slow
  // or failed, and processing here does two sequential LLM round-trips — a
  // synchronous handler turns every slow model call into a duplicate delivery.
  after(async () => {
    try {
      await processWebhook(body)
    } catch (error) {
      console.error("WhatsApp webhook processing error:", error)
    }
  })

  return NextResponse.json({ success: true })
})

// ─── Message parsing ───

function parseMessage(msg: any): { content: string; mediaId: string | null; messageType: string } {
  const type = msg.type

  if (type === "text") {
    return { content: msg.text?.body || "", mediaId: null, messageType: "TEXT" }
  }
  if (type === "sticker") {
    return { content: "[sticker]", mediaId: msg.sticker?.id || null, messageType: "STICKER" }
  }
  if (type === "image") {
    return { content: "[Image]", mediaId: msg.image?.id || null, messageType: "IMAGE" }
  }
  if (type === "audio") {
    return { content: "[Voice note]", mediaId: msg.audio?.id || null, messageType: "AUDIO" }
  }
  if (type === "interactive") {
    const content = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "[Interactive]"
    return { content, mediaId: null, messageType: "INTERACTIVE" }
  }
  if (type === "document") {
    return { content: `[Document: ${msg.document?.filename || "file"}]`, mediaId: msg.document?.id || null, messageType: "DOCUMENT" }
  }
  if (type === "location") {
    return { content: `[Location: ${msg.location?.latitude}, ${msg.location?.longitude}]`, mediaId: null, messageType: "LOCATION" }
  }
  if (type === "button") {
    return { content: msg.button?.text || "[Button]", mediaId: null, messageType: "BUTTON" }
  }
  if (type === "order") {
    const items = msg.order?.product_items || []
    const summary = items.map((i: any) => `${i.quantity}x ${i.product_retailer_id}`).join(", ")
    const notes = msg.order?.text ? ` (Notes: ${msg.order.text})` : ""
    return { content: `[WhatsApp Cart Order: ${summary}]${notes}`, mediaId: null, messageType: "ORDER" }
  }
  return { content: `[${type}]`, mediaId: null, messageType: "TEXT" }
}
function isTestPhoneNumber(phone?: string | null): boolean {
  if (!phone) return false
  const digits = phone.replace(/\D/g, "")
  return digits.endsWith("98314456")
}

// ─── Conversation resolution ───

async function resolveConversation(from: string, customerName: string, customerId: string) {
  const isTestUser = isTestPhoneNumber(from)
  const botOn = (await getConfigValue("bot_enabled").catch(() => "")).trim().toLowerCase()
  const isBotActive = isTestUser || !(botOn === "false" || botOn === "off" || botOn === "0")

  // Prefer a live conversation. A CLOSED one is reopened rather than duplicated
  // so the agent keeps the full history on the thread.
  const existing = await db.conversation.findFirst({
    where: { customerPhone: from },
    orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
  })

  if (existing) {
    if (existing.status === "CLOSED" || existing.status === "RESOLVED") {
      return db.conversation.update({
        where: { id: existing.id },
        data: { status: "OPEN", botActive: isBotActive },
      })
    }
    return existing
  }

  // Auto-assign to available agent (load-based)
  const activeAgents = await db.staff.findMany({
    where: { role: "CHAT_AGENT", isActive: true },
    include: { _count: { select: { conversationsOwned: true } } },
  })
  let assignedStaffId: string | null = null
  if (activeAgents.length > 0) {
    const sorted = activeAgents.sort((a, b) => a._count.conversationsOwned - b._count.conversationsOwned)
    assignedStaffId = sorted[0].id
  }

  return db.conversation.create({
    data: {
      customerPhone: from,
      customerName,
      customerId,
      status: "OPEN",
      botActive: isBotActive,
      assignedStaffId,
      tenantId: currentTenant()?.tenantId || null,
    },
  })
}

// ─── Main processing ───

async function processWebhook(body: any) {
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      /*
       * Which business this payload is for.
       *
       * The number it was sent to is the only thing in the payload that says
       * so, and it is looked up rather than assumed. While exactly one number
       * is connected the answer is always the same — but the day a second one
       * is, this is the line that decides whose inbox a stranger's message
       * lands in.
       */
      const tenant = await tenantForPhoneNumberId(change.value?.metadata?.phone_number_id)

      /*
       * A payload nobody owns is dropped, not processed.
       *
       * It used to be handled inside `withTenant({ tenantId: "" })`, and an
       * empty string is not a workspace: the scoped Prisma client treats it as
       * "no scope" and runs every query unscoped. So an unrecognised number
       * searched every workspace's customers by phone, and could attach a
       * stranger's message to a real business's conversation — the exact thing
       * `tenantForPhoneNumberId` returns null to prevent.
       *
       * It already records the number it could not place, so this is silent
       * only in the sense that nothing is written to somebody else's inbox.
       */
      if (!tenant?.tenantId) {
        console.error(
          "[webhook] dropped a payload for an unrecognised number:",
          change.value?.metadata?.phone_number_id ?? "(none)",
        )
        continue
      }

      await withTenant(tenant, () => processChange(change))
    }
  }
}

async function processChange(change: any) {
  /*
   * The two payloads a coexistence onboarding produces.
   *
   * Both are asked for at the moment a business connects a number that is
   * still running on their phone, and both used to arrive here and be
   * dropped — so the inbox opened empty for a business that had been talking
   * to these same customers for years, which reads as "this tool lost my
   * history". They are handled before anything else because neither is a
   * message arriving now, and nothing downstream should treat them as one.
   */
  if (change.field === "history") {
    for (const chunk of change.value?.history || []) {
      await importHistoryChunk(chunk).catch(error => {
        console.error("Could not import a history chunk:", error)
      })
    }
    return
  }

  if (change.field === "smb_app_state_sync") {
    for (const entry of change.value?.state_sync || []) {
      await importContact(entry).catch(error => {
        console.error("Could not import a contact:", error)
      })
    }
    return
  }

  {
    {
      /*
       * Messages the business sent from their own phone.
       *
       * A number connected through coexistence is answered in two places: the
       * owner's WhatsApp Business app and this inbox. Meta echoes anything
       * typed on the phone under `message_echoes`, and without storing them
       * the panel shows a customer's question with no reply beside it — so
       * somebody answers again, and the customer is told the same thing twice
       * by two different people.
       *
       * They are stored as ordinary outbound messages because that is what
       * they are; only the sender differs, and the transcript should read the
       * way the conversation actually happened.
       */
      for (const echo of change.value?.message_echoes || []) {
        try {
          await processEcho(echo)
        } catch (error) {
          console.error(`Failed to process echoed message ${echo?.id}:`, error)
        }
      }

      const messages = change.value?.messages || []
      const contacts = change.value?.contacts || []

      // Meta sends one contact per unique sender, not one per message, so the
      // two arrays are not index-aligned. Key by wa_id instead.
      const contactByWaId = new Map<string, any>()
      for (const c of contacts) {
        if (c?.wa_id) contactByWaId.set(c.wa_id, c)
      }

      for (const msg of messages) {
        try {
          await processMessage(msg, contactByWaId.get(msg.from))
        } catch (error) {
          console.error(`Failed to process WhatsApp message ${msg?.id}:`, error)
        }
      }

      // Voice calls arrive under `calls` (WhatsApp Business Calling API).
      for (const call of change.value?.calls || []) {
        try {
          await processCall(call)
        } catch (error) {
          console.error(`Failed to process call ${call?.id}:`, error)
        }
      }

      // Delivery and read receipts arrive on the same webhook under `statuses`.
      // Without handling these, every outbound message stays SENT forever and
      // campaign delivered/read analytics are permanently zero.
      for (const status of change.value?.statuses || []) {
        try {
          await processStatus(status)
        } catch (error) {
          console.error(`Failed to process status for ${status?.id}:`, error)
        }
      }
    }
  }
}

/**
 * WhatsApp voice call events.
 *
 * Records the call against the customer's conversation, and — when the event
 * carries an SDP offer — holds that offer in memory and rings the apps, which
 * are the WebRTC endpoint that answers it. Meta allows roughly 30 to 60
 * seconds between this webhook and an accept, so nothing here may wait on
 * anything slow.
 */
async function processCall(call: any) {
  const from = call?.from
  const callId = call?.id
  const status = String(call?.event || call?.status || "unknown").toUpperCase()
  if (!from || !callId) return

  const offer = call?.session?.sdp_type === "offer" ? String(call.session.sdp || "") : ""
  const direction = String(call?.direction || "").toUpperCase()

  let customer = await db.customer.findFirst({ where: { phone: from } })
  if (!customer) {
    customer = await db.customer.create({
      data: {
        phone: from,
        whatsappOptIn: true,
        optInSource: "WHATSAPP_INBOUND",
        optInAt: new Date(),
        tenantId: currentTenant()?.tenantId || null,
      },
    })
  }

  const conversation = await resolveConversation(from, customer.name || "Unknown", customer.id)

  const label =
    status === "CONNECT" ? "📞 Incoming WhatsApp call"
    : status === "TERMINATE" ? "📞 Call ended"
    : `📞 Call ${status.toLowerCase()}`

  await db.message.create({
    data: {
      externalId: `call_${callId}`,
      conversationId: conversation.id,
      customerId: customer.id,
      direction: "INBOUND",
      type: "CALL",
      content: label,
      status: "SENT",
    },
  }).catch(() => {
    // Duplicate call event — Meta redelivers these like any other webhook.
  })

  await db.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(), lastMessageText: label, unreadCount: { increment: 1 } },
  })

  if (status === "CONNECT") {
    await notifyStaff({
      type: "INCOMING_CALL",
      title: "Incoming WhatsApp call",
      message: `${customer.name || from} is calling`,
      forRole: "CHAT_AGENT",
      data: { conversationId: conversation.id, callId, from },
    })
  }

  // A call that has ended cannot be answered, and its offer is dead weight.
  if (status === "TERMINATE" || status === "REJECT") forgetCall(callId)

  // An inbound connect carrying an offer is a phone ringing. Everything the
  // app needs to answer travels with the event, because fetching it afterwards
  // spends seconds out of a window measured in tens of them.
  if (status === "CONNECT" && offer && direction !== "BUSINESS_INITIATED") {
    rememberCall({
      callId,
      from,
      conversationId: conversation.id,
      customerName: customer.name || from,
      offer,
    })
    publish({
      type: "call",
      conversationId: conversation.id,
      status,
      callId,
      from,
      customerName: customer.name || from,
      offer,
      ringing: true,
    })

    // A phone with the app closed hears nothing from the event stream, and a
    // call cannot wait for somebody to open it: this wakes the device itself.
    try {
      const { pushIncomingCall } = await import("@/lib/device-push")
      await pushIncomingCall({
        callId,
        conversationId: conversation.id,
        customerName: customer.name || from,
        from,
        offer,
        tenantId: conversation.tenantId || currentTenant()?.tenantId || undefined,
      })
    } catch (error) {
      console.error("VoIP push for incoming call failed:", error)
    }
    return
  }

  publish({ type: "call", conversationId: conversation.id, status, callId, ringing: false, tenantId: conversation.tenantId || currentTenant()?.tenantId || undefined })
}

const STATUS_RANK: Record<string, number> = { SENT: 1, DELIVERED: 2, READ: 3 }

async function processStatus(status: any) {
  const externalId = status?.id
  if (!externalId) return

  const next = String(status.status || "").toUpperCase() // sent | delivered | read | failed
  if (!next) return

  const message = await db.message.findUnique({
    where: { externalId },
    select: { id: true, status: true },
  })

  if (message) {
    // Meta does not guarantee ordering, so a late "delivered" must not
    // overwrite a "read" that already arrived.
    const isRegression =
      next !== "FAILED" &&
      (STATUS_RANK[next] ?? 0) <= (STATUS_RANK[message.status] ?? 0)

    if (!isRegression) {
      await db.message.update({
        where: { id: message.id },
        data: {
          status: next,
          ...(next === "FAILED" && status.errors?.[0]
            ? { caption: String(status.errors[0].title || status.errors[0].message).slice(0, 200) }
            : {}),
        },
      })
    }
  }

  // Roll the same receipt up into campaign analytics.
  const recipient = await db.campaignRecipient.findFirst({
    where: { externalId },
    select: { id: true, campaignId: true, status: true },
  })
  if (!recipient) return

  if (next === "DELIVERED") {
    await db.campaignRecipient.update({
      where: { id: recipient.id },
      data: { deliveredAt: new Date() },
    })
    await db.campaign.update({
      where: { id: recipient.campaignId },
      data: { totalDelivered: { increment: 1 } },
    })
  } else if (next === "READ") {
    await db.campaignRecipient.update({
      where: { id: recipient.id },
      data: { readAt: new Date() },
    })
    await db.campaign.update({
      where: { id: recipient.campaignId },
      data: { totalRead: { increment: 1 } },
    })
  } else if (next === "FAILED" && recipient.status !== "FAILED") {
    await db.campaignRecipient.update({
      where: { id: recipient.id },
      data: { status: "FAILED", error: String(status.errors?.[0]?.title || "Delivery failed").slice(0, 500) },
    })
    await db.campaign.update({
      where: { id: recipient.campaignId },
      data: { totalBounced: { increment: 1 } },
    })
  }
}

async function processMessage(msg: any, contact: any) {
  const from = msg.from // customer phone
  const customerName = contact?.profile?.name || "Unknown"
  const type = msg.type
  const { content, mediaId, messageType } = parseMessage(msg)

  // ─── Find or create customer + conversation ───
  let customer = await db.customer.findFirst({ where: { phone: from } })
  if (!customer) {
    customer = await db.customer.create({
      data: {
        phone: from,
        name: customerName,
        whatsappOptIn: true,
        optInSource: "WHATSAPP_INBOUND",
        optInAt: new Date(),
      },
    })
  }

  const hasArabicScript = /[\u0600-\u06FF]/.test(content)
  if (hasArabicScript && customer.preferredLang !== "ar") {
    customer = await db.customer.update({
      where: { id: customer.id },
      data: { preferredLang: "ar" },
    })
  }

  const conversation = await resolveConversation(from, customerName, customer.id)

  // Blue ticks and "typing…" as soon as the message lands, so the customer can
  // see they have been heard while the assistant works.
  if (msg.id) void showTyping(msg.id)

  // Meta's media id is not a URL and its download link expires within minutes,
  // so storing the id meant nothing could ever render what a customer sent —
  // an image arrived as an empty bubble. Pull the bytes now and keep a path the
  // inbox can display.
  let storedMediaUrl: string | null = mediaId
  if (mediaId) {
    try {
      const media = await downloadMediaBytes(mediaId)
      if (media.success && media.base64) {
        const stored = await storeMedia(
          Buffer.from(media.base64, "base64"),
          media.mimeType || "application/octet-stream",
        )
        storedMediaUrl = stored.url
      }
    } catch (error) {
      // Keep the id rather than dropping the message: the text still matters,
      // and the inbox says plainly when an attachment could not be fetched.
      console.error("Could not store inbound media:", error)
    }
  }

  // ─── Store inbound message (deduped on the WhatsApp message id) ───
  try {
    await db.message.create({
      data: {
        externalId: msg.id || null,
        conversationId: conversation.id,
        customerId: customer.id,
        direction: "INBOUND",
        type: messageType,
        content,
        mediaUrl: storedMediaUrl,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // Meta redelivered a message we already handled — nothing more to do.
      return
    }
    throw error
  }

  publish({ type: "message", conversationId: conversation.id, direction: "INBOUND", preview: content.slice(0, 120), tenantId: conversation.tenantId || currentTenant()?.tenantId || undefined })

  // Reaches staff when nobody has the panel open: the browser through
  // OneSignal, the phones through Apple directly.
  try {
    const { getNotificationPrefs } = await import("@/app/api/notification-prefs/route")
    const prefs = await getNotificationPrefs()
    // Somebody who switched off "New WhatsApp message" meant it. The message
    // is still stored and still appears in the inbox; it just does not buzz.
    if (prefs.NEW_MESSAGE !== false) {
      const [{ sendPush }, { pushMessage }] = await Promise.all([
        import("@/lib/push"),
        import("@/lib/device-push"),
      ])
      const activeTenantId = conversation.tenantId || currentTenant()?.tenantId || undefined
      await Promise.all([
        sendPush({
          title: customer.name || conversation.customerPhone,
          message: content.slice(0, 160),
          url: "/whatsapp",
          tenantId: activeTenantId,
        }),
        pushMessage({
          title: customer.name || conversation.customerPhone,
          body: content.slice(0, 160),
          conversationId: conversation.id,
          tenantId: activeTenantId,
        }),
      ])
    }
  } catch (error) {
    console.error("Push for inbound message failed:", error)
  }

  const inboundAt = new Date()
  await db.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: inboundAt,
      lastMessageText: content,
      unreadCount: { increment: 1 },
      // Inbound message restarts Meta's 24h freeform window.
      sessionExpiresAt: sessionExpiryFrom(inboundAt),
    },
  })

  // Consent keywords are honoured before anything else — including while a
  // human agent owns the conversation. Meta policy is not conditional on
  // whether our bot happens to be active.
  if (type === "text" || type === "button" || type === "interactive") {
    if (isOptOutMessage(content)) {
      await recordOptOut(customer.id)
      await sendWhatsApp({ to: from, body: OPT_OUT_CONFIRMATION, allowOutsideSession: true })
      return
    }
    if (isOptInMessage(content)) {
      await recordOptIn(customer.id)
      await sendWhatsApp({ to: from, body: OPT_IN_CONFIRMATION, allowOutsideSession: true })
      return
    }
  }

  /*
   * The whole bot can be switched off for a workspace, not just this thread.
   *
   * botActive is per conversation and defaults true on every new thread, so
   * there was no way to stop the bot — or even its away message — answering a
   * workspace's customers without touching every conversation one at a time.
   * This has to run before the away-message send below: that message is itself
   * an automated reply, and "the bot is off" has to mean off, not "off except
   * for the one message explaining that it's off."
   */
  const isTestUser = isTestPhoneNumber(from)
  if (isTestUser && !conversation.botActive) {
    await db.conversation.update({
      where: { id: conversation.id },
      data: { botActive: true, automationPaused: false },
    }).catch(() => {})
    conversation.botActive = true
  }

  const botOn = (await getConfigValue("bot_enabled").catch(() => "")).trim().toLowerCase()
  const waBotOn = (await getConfigValue("wa_bot_enabled").catch(() => "")).trim().toLowerCase()
  if (
    !isTestUser &&
    (botOn === "false" || botOn === "off" || botOn === "0" ||
     waBotOn === "false" || waBotOn === "off" || waBotOn === "0")
  ) {
    return
  }

  // Away message outside business hours (BRD §6.5.6). The AI keeps working
  // unless the operator explicitly turned that off — a booking assistant that
  // clocks off with the staff is not much of an assistant.
  if (!isTestUser) {
    const away = await shouldSendAwayMessage(conversation.id)
    if (away.send) {
      await sendWhatsApp({ to: from, body: away.message, allowOutsideSession: true })
      await db.message.create({
        data: {
          conversationId: conversation.id,
          customerId: customer.id,
          direction: "BOT",
          type: "TEXT",
          content: away.message,
          isAiGenerated: false,
          status: "SENT",
        },
      })
      publish({ type: "message", conversationId: conversation.id, direction: "BOT", preview: away.message.slice(0, 120), tenantId: conversation.tenantId || currentTenant()?.tenantId || undefined })
    }
    if (away.blockBot) return
  }

  if (!conversation.botActive && !isTestUser) return

  /*
   * Whether this is the very first thing this customer has ever sent.
   *
   * Counted from the messages on the thread, not from whether the conversation
   * row was just created: a thread reopened after being closed is not a new
   * customer. The inbound message has already been stored by this point, so a
   * genuinely first message leaves exactly one.
   */
  const messagesOnThread = await db.message.count({ where: { conversationId: conversation.id } })
  const isFirstContact = messagesOnThread <= 1

  try {
    /*
     * First contact is answered with the menu whatever form it arrived in.
     *
     * Only text, button and interactive messages reached the greeting below, so
     * someone opening with a 👋 sticker, a GIF, a photo or a voice note got
     * silence — and a first photo was handed to the payment-screenshot reader,
     * which is the wrong reading of an image from a customer who has no order
     * yet. Restricted to the genuine first message: a sticker or photo sent
     * later in a live conversation still goes wherever it went before, so this
     * cannot talk over a human agent mid-thread.
     */
    if (isFirstContact && type !== "text" && type !== "interactive" && type !== "button") {
      const opening = {
        tenantId: currentTenant()?.tenantId || "",
        conversationId: conversation.id,
        customerId: customer.id,
        customerPhone: from,
        message: content,
        buttonId: undefined as string | undefined,
      }
      // The workspace's own welcome flow still gets first refusal, exactly as
      // it does for a first text message.
      const welcome = await runNewConversationFlow(opening)
      if (welcome.matched) {
        if (welcome.handoff) {
          await handoffToAgent({ from, conversationId: conversation.id, customerId: customer.id, intent: "BOT_FLOW_HANDOFF" })
        }
        return
      }
      await startBookingFlow(
        { tenantId: opening.tenantId, conversationId: conversation.id, customerId: customer.id, phone: from },
        "",
      )
      return
    }

    if (type === "audio" && mediaId) {
      await handleVoiceNote(from, mediaId, conversation.id, customer.id)
      return
    }

    if (type === "image" && mediaId) {
      await handlePaymentScreenshot({
        from,
        customerName,
        mediaId,
        customerId: customer.id,
        conversationId: conversation.id,
      })
      return
    }

    if (type === "order" && msg.order) {
      await handleWhatsAppCatalogOrder({
        from,
        customerName,
        msgOrder: msg.order,
        conversationId: conversation.id,
        customerId: customer.id,
      })
      return
    }

    if (type === "text" || type === "interactive" || type === "button" || type === "sticker") {
      const flowCtx = { tenantId: currentTenant()?.tenantId || "", conversationId: conversation.id, customerId: customer.id, phone: from }

      // Guided booking flow takes precedence: the customer tapped a button we
      // sent, or is answering a question we asked. Handing either to the LLM
      // would drop them out of a flow they are mid-way through.
      const replyId =
        msg.interactive?.button_reply?.id ||
        msg.interactive?.list_reply?.id ||
        null

      // Appointments are checked first. Their replies carry a distinct prefix,
      // so this can never intercept a tour booking — but a customer part-way
      // through arranging a meeting must not have a stray word handed to the
      // tour flow, which would answer about desert safaris.
      // Kauvery Hospital Chemotherapy & Doctor Appointment Flow check
      {
        const { handleHospitalBookingFlow, getHospitalState } = await import("@/lib/hospital-booking-flow")
        const tenantId = currentTenant()?.tenantId || ""
        /*
         * The tenant has to be passed, or the state is never found.
         *
         * setHospitalState writes under `${tenantId}:${phone}` while this read
         * omitted it and defaulted to the literal "default", so the two keys
         * never matched. The effect was not a lost edge case: every reply that
         * was not a hospital keyword or a hosp_ button escaped the flow. A
         * patient answering "please enter your full name" with their name fell
         * through to the appointments module and then to the marketing
         * assistant, which offered them SEO and Google Ads.
         */
        const activeHospState = await getHospitalState(from, tenantId)
        const isHospButtonReply = replyId?.startsWith("hosp_")
        const isHospKeyword = type === "text" && [
          "hospital", "kauvery", "chemo", "chemotherapy", "day care", "daycare", "bed booking", "حجز سرير", "كيماوي", "مستشفى"
        ].some(w => content.toLowerCase().includes(w))

        if (isHospButtonReply || activeHospState || isHospKeyword) {
          const handled = await handleHospitalBookingFlow({
            tenantId,
            customerPhone: from,
            conversationId: conversation.id,
            customerName,
          }, { text: content, buttonId: replyId || undefined })
          if (handled) return
        }
      }

      // Standalone Appointment module (Apt*) check
      {
        const { handleAptBookingFlow, getBookingSession } = await import("@/lib/apt-booking-flow")
        const tenantId = currentTenant()?.tenantId || ""
        // Check for any active apt booking session for this customer
        const activeAptSession = tenantId ? await getBookingSession(tenantId, from) : null
        const hasActiveSession = activeAptSession && activeAptSession.expiresAt > new Date()
        const isAptButtonReply = replyId?.startsWith("apt_")
        const isAptKeyword = type === "text" && ["start_apt", "appointment", "doctor", "clinic", "salon", "consultation", "session", "حجز موعد", "موعد"].some(w => content.toLowerCase().includes(w))

        if (isAptButtonReply || hasActiveSession || isAptKeyword) {
          const handled = await handleAptBookingFlow({
            tenantId,
            customerPhone: from,
            conversationId: conversation.id,
            customerName,
          }, { text: content, buttonId: replyId || undefined })
          if (handled) return
        }
      }

      // ─── 1. Active flow session resumption (handles text, buttons, list choices) ───
      if (type === "text" || type === "interactive" || type === "button") {
        const midFlow = await resumeFlow({
          tenantId: currentTenant()?.tenantId || "",
          conversationId: conversation.id,
          customerId: customer.id,
          customerPhone: from,
          message: content,
          buttonId: replyId || undefined,
        })
        if (midFlow.matched) {
          if (midFlow.handoff) {
            await handoffToAgent({ from, conversationId: conversation.id, customerId: customer.id, intent: "FLOW" })
          }
          return
        }
      }

      // ─── 2. Vertical Module Interactive Replies ───
      if (isMarketingReply(replyId)) {
        if (await handleMarketingReply(flowCtx, replyId!)) return
      }

      if (isAppointmentReply(replyId)) {
        if (await handleAppointmentReply(flowCtx, replyId!)) return
      }

      if (isVisaReply(replyId)) {
        if (await handleVisaReply(flowCtx, replyId!)) return
      }

      const { isTrainingReply, handleTrainingReply } = await import("@/lib/training-flow")
      if (isTrainingReply(replyId)) {
        if (await handleTrainingReply(flowCtx, replyId!)) return
      }

      if (isFlowReply(replyId)) {
        if (await handleBookingReply(flowCtx, replyId!)) return
      }

      // WooCommerce Product interactive selection from catalog node
      if (replyId?.startsWith("prod_")) {
        const prodId = replyId.slice(5)
        try {
          const { fetchWcProductById } = await import("@/lib/woocommerce-client")
          const prod = await fetchWcProductById(prodId)
          if (prod) {
            const regPrice = prod.regular_price || prod.price || "0"
            const salePrice = prod.sale_price
            const isOnSale = Boolean(salePrice && Number(salePrice) > 0)
            const priceText = isOnSale ? `~${regPrice} OMR~ *${salePrice} OMR* (SALE!)` : `*${regPrice} OMR*`
            const stockStatus = prod.stock_status === "instock" ? "In Stock" : "Out of Stock"
            const cleanDesc = prod.description ? prod.description.replace(/<[^>]*>?/gm, "").slice(0, 150) : ""
            const caption = `🛍️ *${prod.name}*\nPrice: ${priceText}\nStatus: ${stockStatus}${cleanDesc ? `\n\n${cleanDesc}` : ""}${prod.permalink ? `\n\n🛒 *Order Online:* ${prod.permalink}` : ""}`

            const imageUrl = prod.images?.[0]?.src
            if (imageUrl) {
              const { sendMediaMessage } = await import("@/lib/whatsapp")
              await sendMediaMessage({ to: from, type: "image", mediaUrl: imageUrl, caption })
            } else {
              await sendWhatsApp({ to: from, body: caption, allowOutsideSession: true })
            }
            return
          }
        } catch (error) {
          console.error("Failed to load WooCommerce product details:", error)
        }
      }

      // Restaurant menu item selection
      if (replyId?.startsWith("menu_")) {
        const itemId = replyId.slice(5)
        const item = await db.menuItem.findUnique({ where: { id: itemId } })
        if (item) {
          const body = `🍽️ *${item.name}*\nPrice: *${item.price.toFixed(3)} ${item.currency}*\n\n${item.description || "Freshly prepared to order."}\n\nReply with your order quantity or choose another item from the menu.`
          await sendWhatsApp({ to: from, body, allowOutsideSession: true })
          return
        }
      }

      // Restaurant Interactive quick replies
      if (replyId === "rest_table") {
        const msg = "🪑 *Table Reservation*\n\nPlease reply with your party size and preferred time (e.g. *4 people at 8:00 PM*)."
        await sendWhatsApp({ to: from, body: msg, allowOutsideSession: true })
        return
      }

      if (replyId === "rest_menu") {
        const tenantId = currentTenant()?.tenantId || ""
        const categories = await db.menuCategory.findMany({
          where: { tenantId: tenantId || undefined, isActive: true },
          include: { items: { where: { isAvailable: true }, take: 10, orderBy: { createdAt: "asc" } } },
          take: 10,
        })
        const rows = categories.flatMap(cat => cat.items.slice(0, 10).map(item => ({ id: `menu_${item.id}`, title: item.name.slice(0, 24), description: `${item.price.toFixed(3)} ${item.currency}`.slice(0, 72) }))).slice(0, 10)
        if (rows.length > 0) {
          const { sendInteractiveMessage } = await import("@/lib/whatsapp")
          await sendInteractiveMessage({ to: from, body: "🍽️ *Our Menu Items*:\nTap an item below to view details and order:", list: { title: "View Menu", sections: [{ title: "Available Today", rows }] } })
        } else {
          await sendWhatsApp({ to: from, body: "🍽️ Our menu is being updated. Ask our team for today's special!", allowOutsideSession: true })
        }
        return
      }

      if (replyId === "rest_waitlist") {
        const msg = "🔔 *Table Waiting List*\n\nYou have been added to our waiting list! We will notify you via WhatsApp the moment a table becomes available. 🙏"
        await sendWhatsApp({ to: from, body: msg, allowOutsideSession: true })
        return
      }

      if (replyId === "tour_waitlist") {
        const msg = "🔔 *Tour Availability Alert*\n\nYou're on our priority list! We will message you here as soon as new tour dates open. 🐪"
        await sendWhatsApp({ to: from, body: msg, allowOutsideSession: true })
        return
      }

      // ─── 3. Visual BotFlows created in the dashboard take priority over built-in fallbacks ───
      const visualFlow = await runBotFlows({
        tenantId: currentTenant()?.tenantId || "",
        conversationId: conversation.id,
        customerId: customer.id,
        customerPhone: from,
        message: content,
        buttonId: replyId || undefined,
      })
      if (visualFlow.matched) {
        if (visualFlow.handoff) {
          await handoffToAgent({ from, conversationId: conversation.id, customerId: customer.id, intent: "BOT_FLOW_HANDOFF" })
        }
        return
      }

      // Nothing claimed the message and it is this customer's first. The
      // workspace's own welcome flow gets its turn before the built-in menu.
      if (isFirstContact) {
        const welcome = await runNewConversationFlow({
          tenantId: currentTenant()?.tenantId || "",
          conversationId: conversation.id,
          customerId: customer.id,
          customerPhone: from,
          message: content,
          buttonId: replyId || undefined,
        })
        if (welcome.matched) {
          if (welcome.handoff) {
            await handoffToAgent({ from, conversationId: conversation.id, customerId: customer.id, intent: "BOT_FLOW_HANDOFF" })
          }
          return
        }
      }

      if (type === "text" || type === "sticker") {
        if (await handleMarketingText(flowCtx, content)) return
        if (await handleAppointmentText(flowCtx, content)) return
        if (await handleVisaText(flowCtx, content)) return
        if (await handleBookingText(flowCtx, content)) return

        const { isTrainingTrigger, startTrainingFlow } = await import("@/lib/training-flow")
        if (isTrainingTrigger(content)) {
          if (await startTrainingFlow(flowCtx)) return
        }

        if (isMarketingTrigger(content)) {
          if (await startMarketingFlow(flowCtx)) return
        }

        if (isAppointmentTrigger(content) && !(await getAppointmentState(conversation.id))) {
          if (await startAppointmentFlow(flowCtx)) return
        }

        if (isVisaTrigger(content) && !(await getVisaState(conversation.id))) {
          if (await startVisaFlow(flowCtx)) return
        }

        // A greeting always restarts the menu if no visual BotFlow matched.
        const existing = await getState(conversation.id)
        const midInput = existing?.step === "ASK_NAME" || existing?.step === "ASK_EMAIL"
        const { getTrainingState } = await import("@/lib/training-flow")
        const trainState = await getTrainingState(conversation.id)
        const midTrain = trainState && (trainState.step === "TRAINING_NAME" || trainState.step === "TRAINING_AGE")

        /*
         * The workspace's own flow comes first.
         *
         * "hi" used to start the built-in tour concierge and return, so a
         * business that had built its own bot was answered by Najwa offering
         * desert safaris — and editing their flow changed nothing, because it
         * was never consulted. The built-in greeting is a default, and a
         * default should only apply when nothing else claims the message.
         */
        /*
         * A greeting word, or simply the first thing they ever said.
         *
         * An opening "😀", "?" or a name is someone starting a conversation,
         * and answering it with the LLM instead of the menu loses them before
         * they see what the business offers.
         */
        if ((isFlowTrigger(content) || isFirstContact || type === "sticker") && !midInput && !midTrain) {
          const ownFlow = await flowWouldMatch({
            tenantId: currentTenant()?.tenantId || "",
            conversationId: conversation.id,
            customerId: customer.id,
            customerPhone: from,
            message: content,
          })
          if (!ownFlow) {
            await startBookingFlow(flowCtx, content)
            return
          }
        }
      }

      await handleTextMessage({
        from,
        content,
        conversationId: conversation.id,
        customerId: customer.id,
        preferredLang: /[\u0600-\u06FF]/.test(content) ? "ar" : (customer.preferredLang || "en"),
      })
    }
  } catch (aiError) {
    console.error("AI processing error:", aiError)
    /*
     * The number a customer is told to ring is the business's own.
     *
     * This apology carried one workspace's support line, hardcoded, so a
     * customer of any other business who hit an error was sent to a company
     * they had never contacted. Where no number is configured the sentence is
     * dropped rather than filled in — an apology with no phone number is
     * honest; one with a stranger's is not.
     */
    const support = (await getConfigValue("business_phone")).trim()
    await sendWhatsApp({
      to: from,
      body: support
        ? `I'm having trouble processing your message right now. Please try again or contact us at ${support}. 🙏`
        : "I'm having trouble processing your message right now. Please try again shortly. 🙏",
      allowOutsideSession: true,
    })
  }
}

// ─── Handlers ───

async function handleVoiceNote(
  from: string,
  mediaId: string,
  conversationId: string,
  customerId: string,
) {
  const media = await downloadMediaBytes(mediaId)
  if (!media.success || !media.base64) {
    await sendWhatsApp({
      to: from,
      body: "I couldn't download that voice note — could you send it again, or type your message?",
      allowOutsideSession: true,
    })
    return
  }

  const audio = Buffer.from(media.base64, "base64")
  const { text, error } = await transcribeAudio(audio, media.mimeType || "audio/ogg")

  // The recording is kept either way, so an agent can listen even when the
  // transcription is poor or the customer was talking over traffic.
  await db.message.updateMany({
    where: { conversationId, type: "AUDIO" },
    data: { caption: text ? `Transcript: ${text.slice(0, 500)}` : `audio/${media.mimeType}` },
  })

  if (!text) {
    console.error("Voice note not transcribed:", error)
    await sendWhatsApp({
      to: from,
      body: "I couldn't make that out — could you type it, or say it again a little more slowly? 🎤",
      allowOutsideSession: true,
    })
    await notifyStaff({
      type: "NEW_MESSAGE",
      title: "Voice note could not be transcribed",
      message: `${from} sent a voice note that could not be read: ${error ?? "unknown reason"}`,
      data: { conversationId },
    })
    return
  }

  // Recorded as what the customer said, so the transcript is in the thread the
  // assistant reads and an agent can see what was actually asked.
  await db.message.create({
    data: {
      conversationId,
      customerId,
      direction: "INBOUND",
      type: "TEXT",
      content: text,
      isAiGenerated: false,
      status: "SENT",
    },
  })

  // From here it is an ordinary message: the same flows, the same assistant,
  // the same booking path a typed message would take.
  await handleTextMessage({
    from,
    content: text,
    conversationId,
    customerId,
    preferredLang: (await db.customer.findFirst({ where: { id: customerId }, select: { preferredLang: true } }))?.preferredLang || "en",
  })
}

async function handlePaymentScreenshot(params: {
  from: string
  customerName: string
  mediaId: string
  customerId: string
  conversationId: string
}) {
  const { from, customerName, mediaId, customerId, conversationId } = params

  // If the guided flow is waiting on a screenshot, attach it to that exact
  // order rather than guessing at the customer's most recent one.
  const flowOrderId = await bookingAwaitingScreenshot(conversationId)

  const pendingOrder = flowOrderId
    ? await db.order.findUnique({ where: { id: flowOrderId }, include: { tour: true, slot: true } })
    : await db.order.findFirst({
        where: { customerId, orderStatus: "PENDING_PAYMENT" },
        include: { tour: true, slot: true },
        orderBy: { createdAt: "desc" },
      })

  // No pending order, or an order with no payment row to attach to: either way
  // the customer gets an answer instead of silence.
  const payment = pendingOrder
    ? await db.payment.findFirst({
        where: { orderId: pendingOrder.id, status: { in: ["PENDING", "SUBMITTED"] } },
        orderBy: { createdAt: "desc" },
      })
    : null

  if (!pendingOrder || !payment) {
    await sendWhatsApp({
      to: from,
      body: "Thanks for the image! If this is a payment screenshot, please share your order number so I can attach it to your booking. 📎",
      allowOutsideSession: true,
    })
    return
  }

  // Meta's media URL needs a bearer token and expires in ~5 minutes, so it is
  // useless as a stored image src. Pull the bytes and keep a data URI the
  // finance screen can actually render.
  const media = await downloadMediaBytes(mediaId)
  const screenshotUrl = media.success && media.base64
    ? `data:${media.mimeType};base64,${media.base64}`
    : `whatsapp_media://${mediaId}`

  // Run the same fraud analysis the web payment path uses, so a WhatsApp
  // screenshot is not trusted more than one uploaded through the site.
  let analysis: Awaited<ReturnType<typeof analyzePaymentScreenshot>> | null = null
  if (media.success && screenshotUrl.startsWith("data:")) {
    analysis = await analyzePaymentScreenshot(screenshotUrl, pendingOrder.totalAmount, "OMR")
  }

  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: "SUBMITTED",
      screenshotUrl,
      // Left null on purpose: the real reference comes off the bank statement
      // during verification. A synthetic one here is unreconcilable.
      bankReference: analysis?.referenceNumber ?? null,
      bankName: analysis?.bankName ?? null,
      transferDate: new Date(),
      screenshotOcr: analysis ? JSON.stringify(analysis) : undefined,
      fraudFlags: analysis?.fraudFlags?.length ? JSON.stringify(analysis.fraudFlags) : undefined,
      fraudScore: analysis ? 1 - (analysis.confidence ?? 0) : undefined,
    },
  })

  await db.order.update({
    where: { id: pendingOrder.id },
    data: { paymentStatus: "SUBMITTED" },
  })

  /*
   * The booking is confirmed as soon as the screenshot arrives; the money is
   * still checked by a person afterwards.
   *
   * These are two different questions. The seat is held for someone who has
   * said they paid, so they get their confirmation and voucher immediately,
   * while paymentStatus stays SUBMITTED and the payment sits in the approval
   * queue exactly as before. Staff approval is unchanged — it marks the
   * payment APPROVED and, because confirmOrderOnce claims the confirmation
   * atomically, it will not re-book the seats this call already took.
   *
   * The trade is deliberate and worth naming: a seat is committed and a
   * voucher issued before anyone has seen the transfer land. A rejected
   * payment has to release that seat.
   */
  const confirmed = await confirmOrderOnce(pendingOrder.id)

  /*
   * The confirmation repeats the whole booking back.
   *
   * This is the last message before a human checks the transfer, so it is the
   * customer's receipt: if a date or a headcount is wrong, this is where they
   * notice, while it is still trivial to change. Sent in the language they
   * picked at the start of the conversation.
   */
  const flowState = await getState(conversationId)
  const ar = flowState?.lang === "ar"
  const when = pendingOrder.slot
    ? `${formatDate(pendingOrder.slot.date)} ${ar ? "الساعة" : "at"} ${pendingOrder.slot.startTime}`
    : ""
  const seats = pendingOrder.paxAdult ?? 0

  await sendWhatsApp({
    to: from,
    allowOutsideSession: true,
    body: ar
      ? `✅ تم استلام صورة التحويل للطلب ${pendingOrder.orderNumber}\n\n` +
        `🎫 ${pendingOrder.tour.name}\n` +
        (when ? `📅 ${when}\n` : "") +
        (seats ? `👥 ${seats} شخص\n` : "") +
        `💰 ${formatCurrency(pendingOrder.totalAmount)}\n` +
        (confirmed ? `🎟️ رمز القسيمة: *${confirmed.voucherCode}*\n` : "") +
        `\n${confirmed ? "تم تأكيد حجزك ✅ وسيقوم فريقنا بمراجعة التحويل." : "سيقوم فريقنا بالتحقق من التحويل وتأكيد الحجز."} 🙏`
      : `✅ Payment screenshot received for ${pendingOrder.orderNumber}\n\n` +
        `🎫 ${pendingOrder.tour.name}\n` +
        (when ? `📅 ${when}\n` : "") +
        (seats ? `👥 ${seats} person${seats === 1 ? "" : "s"}\n` : "") +
        `💰 ${formatCurrency(pendingOrder.totalAmount)}\n` +
        (confirmed ? `🎟️ Voucher: *${confirmed.voucherCode}*\n` : "") +
        `\n${confirmed ? "Your booking is confirmed ✅ — our team is checking the transfer." : "Our team is verifying the transfer and will confirm your booking."} 🙏`,
  })

  const { sendPostBookingChatChoice } = await import("@/lib/booking-flow")
  await sendPostBookingChatChoice({
    tenantId: currentTenant()?.tenantId || "",
    conversationId,
    customerId,
    phone: from,
    lang: ar ? "ar" : "en",
  }).catch(() => null)

  await notifyStaff({
    type: "PAYMENT_SUBMITTED",
    title: "Payment screenshot from WhatsApp",
    message: `${pendingOrder.orderNumber} - ${customerName} - ${formatCurrency(pendingOrder.totalAmount)}${
      analysis && !analysis.matchesExpected
        ? ` ⚠️ amount mismatch (detected ${analysis.detectedAmount ?? "none"})`
        : ""
    }`,
    forRole: "FINANCE",
    data: {
      orderId: pendingOrder.id,
      paymentId: payment.id,
      matchesExpected: analysis?.matchesExpected ?? null,
      fraudFlags: analysis?.fraudFlags ?? [],
    },
  })

  if (flowOrderId) {
    await completeBooking({ tenantId: currentTenant()?.tenantId || "", conversationId, customerId, phone: from })
  }
}

async function handleTextMessage(params: {
  from: string
  content: string
  conversationId: string
  customerId: string
  preferredLang: string
}) {
  const { from, content, conversationId, customerId, preferredLang } = params

  /*
   * The workspace can switch the AI off.
   *
   * Everything above this point — the guided booking flow, buttons, the menu —
   * keeps working; this only governs whether an unmatched message is answered
   * by the LLM or handed to a person. A business that wants a scripted bot and
   * human replies, or that is watching its AI spend, needs to be able to say so
   * without losing the booking flow with it.
   */
  const isTestUser = isTestPhoneNumber(from)
  const aiOn = (await getConfigValue("ai_assistant_enabled").catch(() => "")).trim().toLowerCase()
  if (!isTestUser && (aiOn === "false" || aiOn === "off" || aiOn === "0")) {
    await db.conversation.update({
      where: { id: conversationId },
      data: { botActive: false, automationPaused: true, status: "PENDING" },
    }).catch(() => {})
    return
  }

  // A flow waiting on an answer takes precedence over everything: the customer
  // is part-way through a form and their reply belongs to it.
  const resumed = await resumeFlow({
    tenantId: currentTenant()?.tenantId || "", conversationId, customerId, customerPhone: from, message: content,
  })
  if (resumed.matched) {
    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    })
    return
  }

  const intent = await detectIntent(content)

  // Operator-authored flows win over a generated reply: they're deterministic,
  // free, and somebody deliberately built them for this exact case.
  const flow = await runBotFlows({
    tenantId: currentTenant()?.tenantId || "",
    conversationId,
    customerId,
    customerPhone: from,
    message: content,
    intent: intent.intent,
  })
  if (flow.matched) {
    await db.conversation.update({
      where: { id: conversationId },
      data: { intent: intent.intent, sentiment: intent.sentiment },
    })
    if (flow.handoff) {
      await handoffToAgent({ from, conversationId, customerId, intent: intent.intent })
    }
    return
  }

  // Record what we detected, but only ever turn the bot OFF here. Flipping it
  // back on would override an agent who deliberately took the conversation.
  await db.conversation.update({
    where: { id: conversationId },
    data: {
      intent: intent.intent,
      sentiment: intent.sentiment,
      ...(intent.needsHumanHandoff ? { botActive: false, status: "PENDING" } : {}),
    },
  })

  if (intent.needsHumanHandoff) {
    await handoffToAgent({ from, conversationId, customerId, intent: intent.intent })
    return
  }

  // The twenty most recent messages, oldest first.
  //
  // This previously ordered ascending and took twenty, which is the twenty
  // OLDEST messages in the conversation. On any thread longer than that the
  // assistant was reading a conversation from hours earlier and never saw the
  // message it was replying to — which is why "show me all my bookings" was
  // answered with bank transfer instructions left over from an old exchange.
  const history = await db.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  const aiMessages = history
    .reverse()
    .map(m => ({
      role: (m.direction === "INBOUND" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    }))

  // The agent watching the inbox sees the same "typing" the customer does,
  // so a slow reply reads as work in progress rather than a dead conversation.
  publish({ type: "typing", conversationId, who: "bot", tenantId: currentTenant()?.tenantId || undefined })

  const aiResponse = await aiChat(aiMessages, preferredLang, from)
  const sendResult = await sendWhatsApp({ to: from, body: aiResponse, allowOutsideSession: true })

  await db.message.create({
    data: {
      conversationId,
      customerId,
      direction: "BOT",
      type: "TEXT",
      content: aiResponse,
      isAiGenerated: true,
      status: sendResult.success ? "SENT" : "FAILED",
    },
  })

  await db.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date(), lastMessageText: aiResponse },
  })

  publish({ type: "message", conversationId, direction: "BOT", preview: String(aiResponse).slice(0, 120), tenantId: currentTenant()?.tenantId || undefined })
}

async function handoffToAgent(params: {
  from: string
  conversationId: string
  customerId: string
  intent: string
}) {
  const { from, conversationId, customerId, intent } = params

  // 1. Immediately pause bot on this conversation so it never responds again
  await db.conversation.update({
    where: { id: conversationId },
    data: { botActive: false, automationPaused: true, status: "PENDING" },
  }).catch(() => {})

  // Per BRD §6.5.6 the handoff has to actually reach a human, with context.
  try {
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { assignedStaffId: true, customerName: true },
    })

    await notifyStaff({
      type: "CHAT_HANDOFF",
      title: "Chat needs a human agent",
      message: `${conversation?.customerName || from} — detected intent: ${intent}`,
      forRole: "CHAT_AGENT",
      forStaffId: conversation?.assignedStaffId || null,
      data: { conversationId, customerPhone: from, intent },
    })
  } catch (err) {
    console.error("Staff notification error:", err)
  }

  // 2. Do NOT send automated message if bot is disabled or AI is disabled
  const isTestUser = isTestPhoneNumber(from)
  const botOn = (await getConfigValue("bot_enabled").catch(() => "")).trim().toLowerCase()
  const waBotOn = (await getConfigValue("wa_bot_enabled").catch(() => "")).trim().toLowerCase()
  if (
    (!isTestUser && (
      botOn === "false" || botOn === "off" || botOn === "0" ||
      waBotOn === "false" || waBotOn === "off" || waBotOn === "0"
    )) ||
    intent === "AI_DISABLED"
  ) {
    return
  }

  const handoffText = "I'm connecting you with one of our team members who will assist you shortly. 🙏"

  await sendWhatsApp({ to: from, body: handoffText, allowOutsideSession: true })

  await db.message.create({
    data: {
      conversationId,
      customerId,
      direction: "BOT",
      type: "TEXT",
      content: handoffText,
      isAiGenerated: true,
      status: "SENT",
    },
  })

  publish({ type: "message", conversationId, direction: "BOT", preview: handoffText.slice(0, 120), tenantId: currentTenant()?.tenantId || undefined })
}


/**
 * A message the business sent from the WhatsApp Business app on their phone.
 *
 * Recorded against the same conversation as everything else, marked as coming
 * from the phone rather than from this panel, so an agent reading the thread
 * can see who said what and where.
 */
/**
 * The conversations a business already had, before they connected.
 *
 * Meta delivers up to eighteen months of history in three phases of chunks
 * after a coexistence onboarding, keyed by the customer's phone number. Each
 * message is stored as though it had arrived normally — because it did, just
 * on the owner's phone rather than here.
 *
 * What this deliberately does NOT do is run any of the machinery that a live
 * message runs. No bot, no AI reply, no notification, no unread count, no
 * "typing…". A history import is hundreds of messages arriving at once, and
 * answering questions a customer asked five months ago — or waking somebody's
 * phone three hundred times — would be worse than having no history at all.
 */
async function importHistoryChunk(chunk: any) {
  const progress = chunk?.metadata?.progress
  const phase = chunk?.metadata?.phase
  console.log(`[history] phase ${phase}, chunk ${chunk?.metadata?.chunk_order}, ${progress}% complete`)

  for (const thread of chunk?.threads || []) {
    // The thread is named by the customer's phone number. Without one there is
    // nobody to attribute the conversation to.
    const phone = String(thread?.id ?? "").replace(/\D/g, "")
    if (!phone) continue

    const messages = (thread?.messages || []).filter((m: any) => m?.id)
    if (messages.length === 0) continue

    // Everything already held for this customer, in one query rather than one
    // per message: a chunk can carry hundreds and this runs inside a webhook
    // that Meta will time out.
    const ids = messages.map((m: any) => String(m.id))
    const known = new Set(
      (await db.message.findMany({ where: { externalId: { in: ids } }, select: { externalId: true } }))
        .map(m => m.externalId),
    )
    const fresh = messages.filter((m: any) => !known.has(String(m.id)))
    if (fresh.length === 0) continue

    let customer = await db.customer.findFirst({ where: { phone } })
    if (!customer) {
      customer = await db.customer.create({
        data: {
          phone,
          // The name comes from the contact sync, which arrives separately and
          // may be behind or ahead of this. The number is what is known now.
          name: phone,
          whatsappOptIn: true,
          optInSource: "WHATSAPP_INBOUND",
          optInAt: new Date(),
        },
      })
    }

    const conversation = await resolveConversation(phone, customer.name || phone, customer.id)

    await db.message.createMany({
      data: fresh.map((message: any) => {
        // `from` is the sender's number: the customer's on an inbound message,
        // the business's on their own reply.
        const inbound = String(message.from ?? "").replace(/\D/g, "") === phone
        const type = String(message.type ?? "text")
        const content =
          message?.text?.body ??
          message?.[type]?.caption ??
          `[${type}]`
        return {
          externalId: String(message.id),
          conversationId: conversation.id,
          customerId: customer!.id,
          direction: inbound ? "INBOUND" : "OUTBOUND",
          type: type.toUpperCase(),
          content,
          // What the phone recorded, not when this webhook arrived — a history
          // import stamped with today's date is not a history.
          createdAt: message?.timestamp
            ? new Date(Number(message.timestamp) * 1000)
            : new Date(),
          status: String(message?.history_context?.status ?? "DELIVERED").toUpperCase(),
          // Nobody in this panel typed these, and putting a name against words
          // somebody never wrote is worse than leaving it blank.
          senderId: null,
        }
      }),
      // Two chunks can overlap, and a unique violation must not abandon the
      // rest of the thread.
      skipDuplicates: true,
    })

    // The conversation's own clock follows its newest message, so an imported
    // thread sorts where it belongs in the inbox rather than at the top.
    const newest = fresh.reduce((latest: number, m: any) => {
      const at = Number(m?.timestamp ?? 0)
      return at > latest ? at : latest
    }, 0)
    if (newest > 0) {
      const at = new Date(newest * 1000)
      const current = await db.conversation.findUnique({
        where: { id: conversation.id },
        select: { lastMessageAt: true },
      })
      if (!current?.lastMessageAt || current.lastMessageAt < at) {
        await db.conversation
          .update({ where: { id: conversation.id }, data: { lastMessageAt: at } })
          .catch(() => {})
      }
    }
  }
}

/**
 * A contact from the owner's phone.
 *
 * Only additions are acted on. A removal means they deleted somebody from
 * their phone's address book, which says nothing about whether that person is
 * a customer here — and deleting the record would take their bookings and
 * their conversation with it.
 */
async function importContact(entry: any) {
  if (entry?.type !== "contact" || entry?.action !== "add") return

  const phone = String(entry?.contact?.phone_number ?? "").replace(/\D/g, "")
  if (!phone) return

  const name = String(entry?.contact?.full_name ?? entry?.contact?.first_name ?? "").trim()
  const existing = await db.customer.findFirst({ where: { phone }, select: { id: true, name: true } })

  if (!existing) {
    await db.customer.create({
      data: {
        phone,
        name: name || phone,
        whatsappOptIn: true,
        optInSource: "WHATSAPP_INBOUND",
        optInAt: new Date(),
      },
    })
    return
  }

  // An imported name fills a gap; it does not overwrite one somebody here has
  // already corrected. The placeholder is the phone number itself.
  if (name && (!existing.name || existing.name === phone)) {
    await db.customer.update({ where: { id: existing.id }, data: { name } })
  }
}

async function processEcho(echo: any) {
  const to = String(echo?.to ?? "").replace(/\D/g, "")
  if (!to) return

  // Deduped on Meta's own id: an echo can arrive more than once, and a
  // conversation that repeats the business's own words is worse than one
  // missing them.
  const seen = await db.message.findFirst({ where: { externalId: echo.id }, select: { id: true } })
  if (seen) return

  const customer = await db.customer.findFirst({ where: { phone: to } })
  if (!customer) return

  const conversation = await db.conversation.findFirst({
    where: { customerId: customer.id },
    orderBy: { lastMessageAt: "desc" },
  })
  if (!conversation) return

  const text =
    echo?.text?.body ??
    echo?.[echo?.type]?.caption ??
    (echo?.type ? `[${echo.type}]` : "")

  await db.message.create({
    data: {
      conversationId: conversation.id,
      customerId: customer.id,
      externalId: echo.id ?? null,
      direction: "OUTBOUND",
      type: (echo?.type ?? "text").toUpperCase(),
      content: text,
      status: "SENT",
      // Nobody in this panel typed it, and pretending a staff member did would
      // put a name against words they never wrote.
      senderId: null,
      createdAt: echo?.timestamp ? new Date(Number(echo.timestamp) * 1000) : new Date(),
    },
  }).catch(error => {
    console.error("Could not store an echoed message:", error)
  })

  await db.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(), botActive: false, automationPaused: true },
  }).catch(() => {})
}

async function handleWhatsAppCatalogOrder(params: {
  from: string
  customerName: string
  msgOrder: any
  conversationId: string
  customerId: string
}) {
  const { from, customerName, msgOrder, conversationId, customerId } = params
  const items = msgOrder?.product_items || []
  const notes = msgOrder?.text || ""

  let totalAmount = 0
  const parsedItems = items.map((i: any) => {
    const qty = Number(i.quantity) || 1
    const price = Number(i.item_price) || 0
    totalAmount += qty * price
    return {
      productId: i.product_retailer_id,
      quantity: qty,
      price: price,
      currency: i.currency || "OMR",
    }
  })

  const tenantId = currentTenant()?.tenantId || null
  const orderNumber = `WA-${Date.now().toString().slice(-6)}`

  if (tenantId) {
    await db.kitchenOrder.create({
      data: {
        tenantId,
        orderType: "TAKEAWAY",
        customerName: customerName || from,
        customerPhone: from,
        itemsJson: JSON.stringify(parsedItems),
        totalAmount,
        currency: "OMR",
        status: "PENDING",
        specialNotes: `WhatsApp Catalog Order (${orderNumber})${notes ? `: ${notes}` : ""}`,
      },
    }).catch((e) => console.error("Catalog order database insert error:", e))
  }

  const itemsList = parsedItems.map((i) => `• ${i.quantity}x ${i.productId} (${i.price.toFixed(3)} OMR)`).join("\n")
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.fizmoh.cloud"
  const checkoutUrl = `${baseUrl}/shop`

  const replyText = `🛍️ *WhatsApp Order Received!*

Order ID: *${orderNumber}*
Name: ${customerName}

*Items Ordered:*
${itemsList}

💰 *Total Amount:* ${totalAmount.toFixed(3)} OMR
${notes ? `📝 *Notes:* ${notes}\n` : ""}
Your order has been sent to our team! Tap below to confirm details & complete payment:
👉 ${checkoutUrl}`

  await sendWhatsApp({ to: from, body: replyText, allowOutsideSession: true })

  await db.message.create({
    data: {
      conversationId,
      customerId,
      direction: "BOT",
      type: "TEXT",
      content: replyText,
      isAiGenerated: false,
      status: "SENT",
    },
  })
}
