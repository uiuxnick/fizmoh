import { db } from "@/lib/db"
import { sendWhatsApp, sendInteractiveMessage, sendMediaMessage } from "@/lib/flow-delivery"
import { assertSafeHttpUrl } from "@/lib/safe-url"
import { holdSlotSeats } from "@/lib/slots-server"
import { calculateOrderPrice } from "@/lib/helpers"

/**
 * What a flow can do, beyond asking questions and sending text.
 *
 * The old engine understood six node types, and the four it was missing are
 * the ones every real conversation needs: buttons the customer can tap, a
 * pause, an answer written by the assistant, and a call to something outside
 * this system. They live here rather than inside the walk loop so each can be
 * read, changed and tested on its own.
 *
 * Every one of them is written to fail softly. A flow is running against a
 * customer who is waiting: an API that times out or a model that is
 * unreachable must leave the conversation somewhere sensible, not throw
 * halfway through and abandon them mid-sentence.
 */

export type NodeKind =
  | "TRIGGER" | "MESSAGE" | "CONDITION" | "ACTION" | "HANDOFF" | "QUESTION" | "SAVE"
  | "BUTTONS" | "LIST" | "MEDIA" | "DELAY" | "AI" | "HTTP" | "SET" | "TAG"
  | "ASSIGN" | "TEMPLATE" | "JUMP" | "SPLIT" | "HOURS" | "END" | "PRODUCT" | "CATALOG"
  | "APPOINTMENT" | "APT_RESCHEDULE" | "HOSPITAL" | "HOSP_CHEMO" | "HOSP_DOCTOR" | "HOSP_BED_MAP"
  | "TOUR" | "TOUR_DETAILS" | "TOUR_AVAIL" | "PAYMENT" | "BANK_TRANSFER"
  | "CTA_URL" | "LOCATION" | "VISA" | "RESTAURANT" | "RESTAURANT_MENU" | "RESTAURANT_ORDER_STATUS" | "HOSPITAL_AVAILABILITY"
  | "BOOKING"

export interface NodeData {
  text?: string
  buttons?: { id: string; title: string }[]
  rows?: { id: string; title: string; description?: string }[]
  listButton?: string
  header?: string
  footer?: string
  mediaUrl?: string
  mediaType?: "image" | "document" | "video" | "audio"
  caption?: string
  seconds?: number
  /** BOOKING: what to book, and for how many. Each may be a {{variable}}. */
  slotId?: string
  paxAdult?: string
  paxChild?: string
  customerName?: string
  paymentMethod?: "AMWALPAY" | "BANK_TRANSFER"
  /** BOOKING: what to say when the booking cannot be made, in the flow's language. */
  failText?: string
  /** TOUR_AVAIL: "date" asks which day, "time" asks which departure that day. */
  mode?: "date" | "time"
  /** TOUR_AVAIL time mode: the day already chosen, usually {{booking_date}}. */
  date?: string
  /** AI: what the assistant is being asked to do here. */
  instruction?: string
  useKnowledge?: boolean
  /** HTTP: the call, and what to keep from the answer. */
  url?: string
  method?: "GET" | "POST"
  headers?: Record<string, string>
  body?: string
  save?: Record<string, string>
  /** SET / TAG / ASSIGN / JUMP */
  name?: string
  value?: string
  staffId?: string
  flowId?: string
  templateName?: string
  language?: string
  /** SPLIT: percentage down the first branch. */
  percent?: number
  /** HOURS: the window the "open" branch means. */
  from?: string
  to?: string
  /** PRODUCT & CATALOG: WooCommerce Integration */
  productId?: string | number
  categoryId?: string | number
  productCount?: number
  customText?: string
  /** APPOINTMENT: pre-configured service to book (optional) */
  serviceId?: string
  appointmentText?: string
  /** HOSPITAL: Kauvery Hospital Chemotherapy & Doctor Appointment Connector */
  hospMode?: "chemo" | "doctor" | "availability" | "menu"
  hospitalText?: string
  /** TOUR: Dynamic Tours & Safari Selector */
  tourId?: string
  tourCount?: number
  tourText?: string
  /** PAYMENT: Dynamic AmwalPay payment link */
  amount?: number | string
  currency?: string
  paymentDescription?: string
  paymentButtonText?: string
  /** CTA_URL & LOCATION & BANK & VISA & RESTAURANT */
  buttonText?: string
  phone?: string
  address?: string
  latitude?: number
  longitude?: number
  bankName?: string
  accountNumber?: string
  accountTitle?: string
  orderId?: string
}

export interface NodeContext {
  tenantId: string
  conversationId: string
  customerId: string
  customerPhone: string
  variables: Record<string, string>
  lastMessage: string
}

/** The result of running one node: where to go next, and whether to stop. */
export interface NodeOutcome {
  /** Which labelled branch to take, when the node has more than one. */
  branch?: string
  /** Stop the walk here and wait — for a reply, or for a timer. */
  wait?: "reply" | { seconds: number }
  handoff?: boolean
  end?: boolean
  /** Variables to merge into the run. */
  set?: Record<string, string>
}

/**
 * Fills {{...}} from the variables, the customer and the last message.
 *
 * Unknown names are left as they are rather than blanked: a customer seeing
 * "{{discount}}" tells whoever wrote the flow exactly what is missing, where a
 * silent empty string just reads as a mistake in the sentence.
 */
export function fill(text: string, ctx: NodeContext): string {
  return String(text || "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (whole, key: string) => {
    const value = ctx.variables[key] ?? ctx.variables[key.replace(/^(answers|vars)\./, "")]
    return value ?? whole
  })
}

/**
 * Sends an interactive message, or the plain text underneath it.
 *
 * A reply-buttons or list message with nothing to choose from is rejected by
 * Meta, and the node still returned `{ wait: "reply" }` — so the customer
 * received nothing at all and the flow parked on that node waiting for a tap
 * that could never happen. The conversation was dead until somebody noticed
 * and rescued it by hand.
 *
 * Two things can go wrong and both end the same way now: no options to offer,
 * or Meta refusing the message. The body text is the question either way, so
 * it goes out as ordinary text and the flow still waits — a typed answer is
 * matched against the choices by the engine, so the customer can always get
 * through even when the buttons cannot be drawn.
 */
async function sendChoices(
  ctx: NodeContext,
  body: string,
  hasOptions: boolean,
  send: () => Promise<{ success: boolean }>,
): Promise<void> {
  if (hasOptions) {
    const result = await send()
    if (result.success) {
      await record(ctx, body, true)
      return
    }
    console.error("[flow] interactive message refused; falling back to text")
  } else {
    console.error("[flow] a choice node had no options; sending its text instead")
  }

  const fallback = await sendWhatsApp({ to: ctx.customerPhone, body, allowOutsideSession: true })
  await record(ctx, body, fallback.success)
}

async function record(
  ctx: NodeContext,
  content: string,
  sent: boolean,
  opts?: { type?: string; mediaUrl?: string },
) {
  await db.message.create({
    data: {
      conversationId: ctx.conversationId,
      customerId: ctx.customerId,
      direction: "BOT",
      type: opts?.type || "TEXT",
      content,
      mediaUrl: opts?.mediaUrl,
      status: sent ? "SENT" : "FAILED",
    },
  })
  if (!sent) throw new Error("Flow message delivery failed")
}

/**
 * Runs one node.
 *
 * Returns what the walk should do next. Nodes the old engine already handles
 * are not repeated here — this is only the new vocabulary.
 */
export async function runNode(
  kind: NodeKind,
  data: NodeData,
  ctx: NodeContext,
): Promise<NodeOutcome> {
  switch (kind) {
    // ── things the customer can tap ──────────────────────────────────────────
    case "BUTTONS": {
      // Three is Meta's limit and it is not negotiable: a fourth silently
      // makes the whole message fail to send.
      const buttons = (data.buttons ?? []).slice(0, 3).map(b => ({
        id: b.id,
        title: b.title.slice(0, 20),
      }))
      const body = fill(data.text ?? "", ctx)
      await sendChoices(ctx, body, buttons.length > 0, () =>
        sendInteractiveMessage({
          to: ctx.customerPhone,
          body,
          buttons,
          headerText: data.header ? fill(data.header, ctx) : undefined,
          footerText: data.footer,
        }),
      )
      return { wait: "reply" }
    }

    case "LIST": {
      const rows = (data.rows ?? []).slice(0, 10).map(r => ({
        id: r.id,
        title: r.title.slice(0, 24),
        description: r.description?.slice(0, 72),
      }))
      const body = fill(data.text ?? "", ctx)
      await sendChoices(ctx, body, rows.length > 0, () =>
        sendInteractiveMessage({
          to: ctx.customerPhone,
          body,
          list: {
            title: (data.listButton || "Choose").slice(0, 20),
            sections: [{ title: (data.header || "Options").slice(0, 24), rows }],
          },
          footerText: data.footer,
        }),
      )
      return { wait: "reply" }
    }

    case "MEDIA": {
      const url = fill(data.mediaUrl ?? "", ctx)
      if (!url) return {}
      const caption = data.caption ? fill(data.caption, ctx) : undefined
      const result = await sendMediaMessage({
        to: ctx.customerPhone,
        type: data.mediaType ?? "image",
        mediaUrl: url,
        caption,
      })
      const mType = data.mediaType === "document" ? "DOCUMENT" : data.mediaType === "video" ? "VIDEO" : data.mediaType === "audio" ? "AUDIO" : "IMAGE"
      await record(ctx, caption || url, result.success, { type: mType, mediaUrl: url })
      return {}
    }

    case "TEMPLATE": {
      if (!data.templateName) return {}
      const result = await sendWhatsApp({
        to: ctx.customerPhone,
        templateName: data.templateName,
        language: data.language || "en_US",
        templateVariables: Object.values(data.save ?? {}).map(v => fill(v, ctx)),
      })
      await record(ctx, `Template: ${data.templateName}`, result.success)
      return {}
    }

    // ── time ────────────────────────────────────────────────────────────────
    case "DELAY": {
      // Handed back to the caller rather than slept through: a webhook that
      // sits for five minutes is a webhook Meta has already given up on and
      // redelivered.
      return { wait: { seconds: Math.max(1, Math.min(86_400, data.seconds ?? 60)) } }
    }

    case "HOURS": {
      const { toLocalParts } = await import("@/lib/timezone")
      const { hour, minute } = toLocalParts(new Date())
      const now = hour * 60 + minute
      const parse = (value: string | undefined, fallback: number) => {
        const [h, m] = String(value ?? "").split(":").map(Number)
        return Number.isFinite(h) ? h * 60 + (m || 0) : fallback
      }
      const from = parse(data.from, 8 * 60)
      const to = parse(data.to, 20 * 60)
      return { branch: now >= from && now < to ? "open" : "closed" }
    }

    // ── the assistant, inside a flow ─────────────────────────────────────────
    case "AI": {
      const { socialFlowChannel } = await import("./flow-delivery")
      const channel = socialFlowChannel()
      if (channel) {
        const settings = await db.socialAutomationSettings.findUnique({ where: { tenantId_channel: { tenantId: ctx.tenantId, channel } } })
        const business = await db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { name: true } })
        const { generateSocialReply } = await import("./social/social-ai")
        try {
          const body = await generateSocialReply({ message: ctx.lastMessage, businessName: business?.name || "", businessInfo: settings?.businessInfo as Record<string, unknown> || null, customInstructions: [settings?.customInstructions, data.instruction].filter(Boolean).join("\n"), tone: "friendly", customTone: null, language: "Match the customer's message", history: [] })
          const result = await sendWhatsApp({ to: ctx.customerPhone, body })
          await record(ctx, body, result.success)
          return result.success ? { branch: "ok" } : { handoff: true }
        } catch { return { handoff: true } }
      }
      /*
       * An answer written for this one question, with the business's own
       * material behind it. The flow keeps control: this replies and moves on
       * rather than handing the conversation to the model indefinitely, which
       * is the difference between a scripted flow with a smart step in it and
       * a chatbot with a script bolted on.
       */
      let grounding = ""
      if (data.useKnowledge !== false) {
        try {
          const { searchKnowledge } = await import("@/lib/knowledge")
          const passages = await searchKnowledge(ctx.lastMessage || data.instruction || "", 4)
          grounding = passages.map(p => p.content).join("\n\n").slice(0, 4000)
        } catch {
          // No knowledge base, or no embeddings key. The model still answers.
        }
      }

      let reply = ""
      try {
        const { aiChat } = await import("@/lib/ai")
      const instruction = fill(data.instruction ?? "Answer the customer's question.", ctx)
      const liveData = Object.entries(ctx.variables)
        .filter(([key, value]) => key.includes(".") && value !== "")
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")
        .slice(0, 5000)
      reply = await aiChat(
          [
            {
              role: "user",
              content: grounding
                ? `${instruction}\n\nUse only this information:\n${grounding}\n\nLive database context for this customer:\n${liveData || "No matching records"}\n\nThe customer said: ${ctx.lastMessage}`
                : `${instruction}\n\nLive database context for this customer:\n${liveData || "No matching records"}\n\nThe customer said: ${ctx.lastMessage}`,
            },
          ],
          "en",
        )
      } catch {
        // A model that is down must not strand somebody mid-flow.
        return { branch: "failed" }
      }

      const body = reply.trim()
      if (!body) return { branch: "failed" }
      const result = await sendWhatsApp({ to: ctx.customerPhone, body, allowOutsideSession: true })
      await db.message.create({
        data: {
          conversationId: ctx.conversationId,
          customerId: ctx.customerId,
          direction: "BOT",
          type: "TEXT",
          content: body,
          isAiGenerated: true,
          status: result.success ? "SENT" : "FAILED",
        },
      })
      return { branch: "ok", set: { ai_reply: body } }
    }

    // ── the world outside ───────────────────────────────────────────────────
    case "HTTP": {
      const url = fill(data.url ?? "", ctx)
      if (!/^https?:\/\//i.test(url)) return { branch: "failed" }
      try {
        const safeUrl = await assertSafeHttpUrl(url)
        const response = await fetch(safeUrl, {
          method: data.method ?? "GET",
          headers: { "Content-Type": "application/json", ...(data.headers ?? {}) },
          body: data.method === "POST" ? fill(data.body ?? "{}", ctx) : undefined,
          // A customer is waiting on the other end of this. Ten seconds is
          // already longer than anybody expects a reply to take.
          signal: AbortSignal.timeout(10_000),
          redirect: "error",
        })
        const text = await response.text()
        let parsed: unknown
        try { parsed = JSON.parse(text) } catch { parsed = text }

        const set: Record<string, string> = {}
        for (const [name, path] of Object.entries(data.save ?? {})) {
          set[name] = String(pluck(parsed, path) ?? "")
        }
        return { branch: response.ok ? "ok" : "failed", set }
      } catch {
        return { branch: "failed" }
      }
    }

    // ── bookkeeping ─────────────────────────────────────────────────────────
    case "SET":
      return { set: { [data.name || "value"]: fill(data.value ?? "", ctx) } }

    case "TAG": {
      const label = fill(data.value ?? data.name ?? "", ctx).trim()
      if (!label) return {}
      const customer = await db.customer.findFirst({
        where: { id: ctx.customerId },
        select: { tags: true },
      })
      const current: string[] = (() => {
        const raw = customer?.tags
        if (Array.isArray(raw)) return raw.map(String)
        if (typeof raw === "string") { try { return JSON.parse(raw) } catch { return [] } }
        return []
      })()
      if (!current.includes(label)) {
        await db.customer.update({
          where: { id: ctx.customerId },
          data: { tags: JSON.stringify([...current, label]) },
        })
      }
      return {}
    }

    case "ASSIGN": {
      // Assigning without taking the bot off would leave two of them replying.
      await db.conversation.update({
        where: { id: ctx.conversationId },
        data: {
          assignedStaffId: data.staffId || null,
          botActive: false,
          status: "PENDING",
        },
      })
      return { handoff: true }
    }

    case "SPLIT": {
      const percent = Math.min(100, Math.max(0, data.percent ?? 50))
      return { branch: Math.random() * 100 < percent ? "a" : "b" }
    }

    case "PRODUCT": {
      try {
        const { fetchWcProductById, fetchWcProducts } = await import("@/lib/woocommerce-client")
        let prod: any = null

        // 1. Check if specific productId is given
        if (data.productId && data.productId !== "latest" && data.productId !== "auto") {
          prod = await fetchWcProductById(data.productId).catch(() => null)
        }

        // 2. Check if customer's last message or variables contains a product ID (e.g. prod_123 or 123)
        if (!prod) {
          const matchId = (ctx.lastMessage || ctx.variables.product_id || ctx.variables.selected_product || "").match(/prod_(\d+)|\b(\d{2,6})\b/)
          const targetId = matchId ? (matchId[1] || matchId[2]) : null
          if (targetId) {
            prod = await fetchWcProductById(targetId).catch(() => null)
          }
        }

        // 3. Search WooCommerce products by keyword if customer typed a search term
        if (!prod && ctx.lastMessage && ctx.lastMessage.length >= 2) {
          const searchRes = await fetchWcProducts({ search: ctx.lastMessage.trim(), per_page: 1 }).catch(() => [])
          if (searchRes && searchRes.length > 0) prod = searchRes[0]
        }

        // 4. Fall back to latest published product
        if (!prod) {
          const list = await fetchWcProducts({ per_page: 1 }).catch(() => [])
          prod = list[0]
        }

        if (!prod) {
          const fallbackMsg = fill(data.text || "Sorry, product details are currently unavailable.", ctx)
          const res = await sendWhatsApp({ to: ctx.customerPhone, body: fallbackMsg, allowOutsideSession: true })
          await record(ctx, fallbackMsg, res.success)
          return {}
        }

        const regPrice = prod.regular_price || prod.price || "0"
        const salePrice = prod.sale_price
        const isOnSale = Boolean(salePrice && Number(salePrice) > 0)
        const priceText = isOnSale ? `~${regPrice} OMR~ *${salePrice} OMR* (SALE!)` : `*${regPrice} OMR*`
        const stockStatus = prod.stock_status === "instock" ? "In Stock" : "Out of Stock"
        const cleanDesc = prod.description ? prod.description.replace(/<[^>]*>?/gm, "").slice(0, 150) : ""

        const caption = fill(
          data.caption || data.text || `🛍️ *${prod.name}*\nPrice: ${priceText}\nStatus: ${stockStatus}${cleanDesc ? `\n\n${cleanDesc}` : ""}${prod.permalink ? `\n\n🛒 Store Link: ${prod.permalink}` : ""}`,
          ctx
        )

        const imageUrl = prod.images?.[0]?.src
        if (imageUrl) {
          const result = await sendMediaMessage({
            to: ctx.customerPhone,
            type: "image",
            mediaUrl: imageUrl,
            caption,
          })
          await record(ctx, caption, result.success, { type: "IMAGE", mediaUrl: imageUrl })
        } else {
          const result = await sendWhatsApp({ to: ctx.customerPhone, body: caption, allowOutsideSession: true })
          await record(ctx, caption, result.success)
        }
        return {}
      } catch (err: any) {
        console.error("Error executing WooCommerce PRODUCT node in bot flow:", err)
        return { branch: "failed" }
      }
    }

    case "CATALOG": {
      try {
        const { fetchWcProducts } = await import("@/lib/woocommerce-client")
        const limit = Math.min(10, Math.max(1, data.productCount || 5))

        // Auto-search if user typed a keyword in message
        let searchParam: string | undefined = undefined
        if (ctx.lastMessage && ctx.lastMessage.length >= 2 && !/^(catalog|products|shop|buy|store)$/i.test(ctx.lastMessage.trim())) {
          searchParam = ctx.lastMessage.trim()
        }

        const prods = await fetchWcProducts({
          category: String(data.categoryId || "all"),
          search: searchParam,
          per_page: limit,
        }).catch(() => [])

        if (!prods || prods.length === 0) {
          const fallback = fill(data.text || "Our catalog is currently being updated. Please check back shortly!", ctx)
          const res = await sendWhatsApp({ to: ctx.customerPhone, body: fallback, allowOutsideSession: true })
          await record(ctx, fallback, res.success)
          return {}
        }

        const rows = prods.slice(0, 10).map((p: any) => {
          const price = p.sale_price && Number(p.sale_price) > 0 ? `${p.sale_price} OMR (SALE)` : `${p.regular_price || p.price} OMR`
          return {
            id: `prod_${p.id}`,
            title: p.name.slice(0, 24),
            description: `${price} · ${p.stock_status === "instock" ? "In Stock" : "Out of Stock"}`.slice(0, 72),
          }
        })

        const body = fill(data.text || "🛍️ *WooCommerce Store Products*\nSelect a product from the catalog below to view details and order:", ctx)

        const result = await sendInteractiveMessage({
          to: ctx.customerPhone,
          body,
          list: {
            title: "Browse Products",
            sections: [{ title: "Store Catalog", rows }],
          },
          footerText: "Fizmoh Commerce Store",
        })
        await record(ctx, body, result.success)
        return { wait: "reply" }
      } catch (err: any) {
        console.error("Error executing WooCommerce CATALOG node in bot flow:", err)
        return { branch: "failed" }
      }
    }

    case "END":
      return { end: true }

    case "HOSPITAL": {
      const { handleHospitalBookingFlow } = await import("@/lib/hospital-booking-flow")
      const conv = await db.conversation.findUnique({
        where: { id: ctx.conversationId },
        select: { tenantId: true },
      })
      const tenantId = conv?.tenantId || ""
      const intro = data.hospitalText || data.text || "🏥 Let me connect you with Kauvery Hospital Day Care & Appointments."
      await sendWhatsApp({
        to: ctx.customerPhone,
        body: fill(intro, ctx),
      })

      const mode = data.hospMode || "menu"
      const triggerBtn = mode === "chemo" ? "hosp_btn_chemo" : mode === "doctor" ? "hosp_btn_apt" : "hosp_start"

      await handleHospitalBookingFlow(
        { tenantId, customerPhone: ctx.customerPhone, conversationId: ctx.conversationId ?? undefined },
        { buttonId: triggerBtn, text: "hospital" }
      )
      return { wait: "reply" }
    }

    case "TOUR": {
      const conv = await db.conversation.findUnique({
        where: { id: ctx.conversationId },
        select: { tenantId: true },
      })
      const tenantId = conv?.tenantId || ""
      const limit = data.tourCount || 5

      const tours = await db.tour.findMany({
        where: { tenantId: ctx.tenantId, status: "ACTIVE", ...(data.tourId ? { id: data.tourId } : {}) },
        take: limit,
        select: { id: true, name: true, city: true, basePrice: true, slug: true },
      })

      if (tours.length === 0) {
        await sendWhatsApp({
          to: ctx.customerPhone,
          body: fill(data.text || "No tours currently available. Please check back shortly!", ctx),
        })
        return {}
      }

      if (tours.length === 1) {
        const t = tours[0]
        const body = fill(data.text || `🚙 *${t.name}*
📍 ${t.city} · From ${t.basePrice} OMR

Would you like to check dates and book this tour?`, ctx)
        await sendInteractiveMessage({
          to: ctx.customerPhone,
          body,
          buttons: [
            { id: `tour_book_${t.id}`, title: "📅 Check Dates" },
            { id: "tour_more_info", title: "ℹ️ Details" },
          ],
        })
        return { wait: "reply" }
      }

      const rows = tours.map(t => ({
        id: `tour_sel_${t.id}`,
        title: t.name.slice(0, 24),
        description: `${t.city} · from ${t.basePrice} OMR`,
      }))

      const headerText = fill(data.text || "🚙 *Explore Our Tours & Adventures*", ctx)
      await sendInteractiveMessage({
        to: ctx.customerPhone,
        body: headerText,
        list: {
          title: "Select Tour",
          sections: [{ title: "Featured Tours", rows }],
        },
      })
      return { wait: "reply" }
    }

/**
 * Which departure the customer meant.
 *
 * A tap on a WhatsApp list returns the row's *title*, not its id — the reply
 * that reaches the flow is "09-01 05:30", so a step that stored the answer and
 * looked it up as an id found nothing and told the customer their date was no
 * longer on the calendar. It was; nobody had asked for it correctly.
 *
 * Four things are accepted, so the same step works however the customer
 * answers: the row id, a bare id, the row title as WhatsApp echoes it, and a
 * date typed in their own words. A typed date takes the earliest departure
 * still open that day, which is what somebody writing "15/9" means.
 */
async function resolveSlot(tourId: string, tenantId: string, answer: string, dateHint?: string) {
  const cleaned = answer.trim().replace(/^slot_/, "")
  if (!cleaned) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const slots = await db.slot.findMany({
    where: { tenantId, tourId, status: "OPEN", date: { gte: today } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take: 60,
  })
  const open = slots.filter(s => s.capacity - s.seatsBooked - s.seatsHeld > 0)
  if (open.length === 0) return null

  const byId = open.find(s => s.id === cleaned)
  if (byId) return byId

  /*
   * When the day was chosen in its own step, only that day's departures count.
   * Two rides a day for three months means "05:30" matches sixty times, and
   * the first one is almost never the one they asked for.
   */
  let sameDay = open
  if (dateHint) {
    const hint = dateHint.trim().replace(/^date_/, "")
    const { parseDate } = await import("@/lib/botflow-engine")
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(hint) ? hint : parseDate(hint)
    if (iso) {
      const onDay = open.filter(s => s.date.toISOString().slice(0, 10) === iso)
      sameDay = onDay
      const exact = onDay.find(s => s.startTime.toLowerCase() === cleaned.toLowerCase())
      if (exact) return exact
    }
  }

  // The title the availability list printed: "MM-DD HH:MM".
  const byTitle = open.find(
    s => `${s.date.toISOString().slice(5, 10)} ${s.startTime}`.toLowerCase() === cleaned.toLowerCase(),
  )
  if (byTitle) return byTitle

  const { parseDate } = await import("@/lib/botflow-engine")
  const iso = parseDate(cleaned)
  if (iso) {
    const onDay = open.filter(s => s.date.toISOString().slice(0, 10) === iso)
    if (onDay.length > 0) return onDay[0]
  }

  // "05:30", or the time alone — within the chosen day when there is one.
  const byTime = sameDay.find(s => s.startTime.toLowerCase() === cleaned.toLowerCase())
  return byTime ?? null
}

    case "BOOKING": {
      /*
       * Turns what the flow has collected into a real booking.
       *
       * Until now a visual flow could show tours and take a payment, but had
       * no way to create the order in between — `PAYMENT` needs an order that
       * already exists, so every flow ended at "our team will contact you"
       * and somebody re-keyed it by hand. This closes that gap: the seats are
       * held, the order is written, and `order_id` is set so a PAYMENT step
       * immediately after this one just works.
       *
       * It writes through Prisma rather than calling /api/orders, which is
       * rate limited to 20 an hour per IP. Called from the server that would
       * be one bucket for every workspace, so the twenty-first booking of the
       * hour — anywhere on the platform — would be refused.
       */
      const tourId = fill(data.tourId || ctx.variables.tour_id || "", ctx).trim()
      // Slot ids arrive from the availability list as `slot_<id>`.
      const slotId = fill(data.slotId || ctx.variables.slot_id || "", ctx).trim().replace(/^slot_/, "")

      const paxAdult = Math.max(1, Number(fill(data.paxAdult || ctx.variables.pax_adult || "1", ctx)) || 1)
      const paxChild = Math.max(0, Number(fill(data.paxChild || ctx.variables.pax_child || "0", ctx)) || 0)
      const customerName = fill(data.customerName || ctx.variables.customer_name || ctx.variables.rider_name || "", ctx).trim()

      const fail = async (why: string) => {
        const result = await sendWhatsApp({ to: ctx.customerPhone, body: why, allowOutsideSession: true })
        await record(ctx, why, result.success)
        return { branch: "failed" as const }
      }

      if (!Number.isSafeInteger(paxAdult) || !Number.isSafeInteger(paxChild) || paxAdult + paxChild > 100) return fail("Please enter a whole number of guests, up to 100.")
      if (!tourId || !slotId) {
        console.error("[flow] BOOKING reached without a tour or a slot", { tourId, slotId })
        return fail(data.failText || "I could not tell which date you wanted. Send *hi* and pick a date from the list.")
      }

      const tour = await db.tour.findFirst({ where: { id: tourId, tenantId: ctx.tenantId, status: "ACTIVE" } })
      if (!tour) {
        return fail(data.failText || "That experience is not on sale at the moment. Send *hi* to see what is available.")
      }
      const slot = await resolveSlot(tour.id, ctx.tenantId, slotId, fill(ctx.variables.booking_date || "", ctx))
      if (!slot) {
        return fail(data.failText || "I could not match that to an open date. Send *hi* and pick one from the list, or type a date like *15/9*.")
      }

      // Seats are held before the order exists, so two people choosing the
      // last place at the same moment cannot both be given it.
      const held = await holdSlotSeats(slot.id, paxAdult + paxChild)
      if (!held) {
        return fail(data.failText || `😔 *${tour.name}* no longer has ${paxAdult + paxChild} place(s) on that date. Send *hi* to choose another.`)
      }

      const unitAdult = slot.priceOverride ?? tour.basePrice
      const unitChild = tour.childPrice ?? unitAdult
      const { subtotal, discount, taxAmount, total } =
        calculateOrderPrice(unitAdult, unitChild, paxAdult, paxChild, 0, 0)

      const phone = ctx.customerPhone.startsWith("+") ? ctx.customerPhone : `+${ctx.customerPhone}`
      let customer = await db.customer.findFirst({ where: { phone } })
      if (!customer) {
        customer = await db.customer.create({
          data: { name: customerName || phone, phone, whatsappOptIn: true, optInSource: "WHATSAPP_INBOUND", optInAt: new Date() },
        })
      }

      const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
      const order = await db.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          tourId: tour.id,
          slotId: slot.id,
          paxAdult,
          paxChild,
          customerName: customerName || customer.name || phone,
          customerPhone: phone,
          subtotal,
          discount,
          taxAmount,
          totalAmount: total,
          paymentMethod: data.paymentMethod === "AMWALPAY" ? "AMWALPAY" : "BANK_TRANSFER",
          paymentStatus: "PENDING",
          orderStatus: "PENDING_PAYMENT",
          channel: "WHATSAPP",
        },
      })

      const when = `${slot.date.toISOString().slice(0, 10)} at ${slot.startTime}`
      const summary = fill(
        data.text ||
          `✅ *Booking created*\n\n` +
          `🏇 ${tour.name}\n📅 ${when}\n👥 ${paxAdult + paxChild} place(s)\n` +
          `💰 *${total.toFixed(3)} ${tour.currency || "OMR"}* (includes VAT)\n\n` +
          `📝 Reference: *${orderNumber}*`,
        ctx,
      )
      const sent = await sendWhatsApp({ to: ctx.customerPhone, body: summary, allowOutsideSession: true })
      await record(ctx, summary, sent.success)

      // What a PAYMENT step immediately after this one reads.
      return { set: { order_id: orderNumber, order_total: total.toFixed(3), tour_name: tour.name, slot_when: when } }
    }

    case "PAYMENT": {
      // A payment link must point at a persisted order. The old implementation
      // generated a PAY-* receipt URL without creating an order, so hosted
      // checkout could never verify or settle it. Flow payments now reuse the
      // same signed order checkout as the rest of the platform.
      /*
       * Whatever the flow has, in the order it becomes true.
       *
       * This read only `order_id`, so an appointment flow had no way to say
       * what it wanted paid for even though create-session now settles APT-
       * references. `appointment.reference` is set by APT_RESCHEDULE and by
       * the appointment connector, so a payment step after either of those
       * now works without the author wiring anything up.
       */
      const orderId = fill(
        data.orderId ||
          ctx.variables.order_id ||
          ctx.variables["appointment.reference"] ||
          ctx.variables["appointment.latest.reference"] ||
          "",
        ctx,
      ).trim()
      if (!orderId) {
        const missing = "I couldn't find a booking to pay for yet. Please complete the booking details first."
        const result = await sendWhatsApp({ to: ctx.customerPhone, body: missing, allowOutsideSession: true })
        await record(ctx, missing, result.success)
        return { branch: "failed" }
      }
      const paymentUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud"}/api/amwalpay/create-session?orderId=${encodeURIComponent(orderId)}`

      const bodyText = fill(
        data.text ||
        `💳 *Payment Required*

` +
        `📝 *Booking:* ${orderId}

` +
        `Please tap the button below to complete your payment securely via AmwalPay:`,
        ctx
      )

      await sendWhatsApp({
        to: ctx.customerPhone,
        body: `${bodyText}

🔗 *Pay Online:* ${paymentUrl}`,
      })

      return {
        set: {
          lastPaymentOrderId: orderId,
          lastPaymentUrl: paymentUrl,
        }
      }
    }

    case "CTA_URL": {
      const txt = fill(data.text || "Please visit our website or get in touch:", ctx)
      const bText = fill(data.buttonText || "Open Website", ctx)
      const linkUrl = fill(data.url || "https://app.fizmoh.cloud", ctx)
      const phoneNum = fill(data.phone || "", ctx)

      let fullMsg = `${txt}\n\n🔗 *${bText}:* ${linkUrl}`
      if (phoneNum) fullMsg += `\n📞 *Call Us:* ${phoneNum}`

      await sendWhatsApp({
        to: ctx.customerPhone,
        body: fullMsg,
      })
      return {}
    }

    case "LOCATION": {
      const locName = fill(data.name || "Our Location", ctx)
      const locAddress = fill(data.address || "Muscat, Oman", ctx)
      const lat = data.latitude || 23.5880
      const lng = data.longitude || 58.3829
      const gmaps = `https://maps.google.com/?q=${lat},${lng}`

      const body = `📍 *${locName}*\n${locAddress}\n\n🗺️ *Google Maps Link:* ${gmaps}`
      await sendWhatsApp({
        to: ctx.customerPhone,
        body,
      })
      return {}
    }

    case "TOUR_DETAILS": {
      const tour = await db.tour.findFirst({
        where: { tenantId: ctx.tenantId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      })
      if (!tour) {
        await sendWhatsApp({ to: ctx.customerPhone, body: "No active tours found at the moment." })
        return {}
      }
      const intro = fill(data.tourText || data.text || `🌄 *${tour.name}*`, ctx)
      const details = `${intro}\n\n📍 *City / Region:* ${tour.city}\n⏱️ *Duration:* ${tour.durationHours || 4} Hours\n💰 *Price:* From ${tour.basePrice} OMR / person\n\n${tour.description?.slice(0, 180) || ""}`
      await sendInteractiveMessage({
        to: ctx.customerPhone,
        body: details,
        buttons: [
          { id: `tour_book_${tour.id}`, title: "📅 Check Dates" },
          { id: "tour_catalog", title: "🚙 View All Tours" },
        ],
      })
      return { wait: "reply" }
    }

    case "TOUR_AVAIL": {
      /*
       * Answer with real dates rather than asking for one.
       *
       * This used to send "reply with your preferred date" and return, with
       * nothing listening for the answer — the customer typed a date into
       * silence. The workspace already knows which departures have seats, so
       * the open slots are read and offered as a list. Choosing one is a tap,
       * which also removes every way of typing a date the parser would reject.
       */
      /*
       * The tour the flow means, not whichever was created last.
       *
       * `data.tourId` was ignored, so a stable selling two things showed the
       * newest one's dates whichever the customer had chosen. A flow that does
       * not name a tour keeps the old behaviour.
       */
      const wantedTourId = fill(data.tourId || ctx.variables.tour_id || "", ctx).trim()
      const tour = await db.tour.findFirst({
        where: { tenantId: ctx.tenantId, status: "ACTIVE", ...(wantedTourId ? { id: wantedTourId } : {}) },
        orderBy: { createdAt: "desc" },
      })
      if (!tour) {
        await sendWhatsApp({ to: ctx.customerPhone, body: "No active tours at the moment." })
        return {}
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const slots = await db.slot.findMany({
        where: { tenantId: ctx.tenantId, tourId: tour.id, status: "OPEN", date: { gte: today } },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        take: 200,
      })

      // Held seats are somebody else's checkout in progress, so they count as
      // taken until that expires. Offering them produces a booking that fails.
      const openAll = slots
        .map(slot => ({ slot, left: slot.capacity - slot.seatsBooked - slot.seatsHeld }))
        .filter(row => row.left > 0)

      /*
       * One question at a time when there are many departures.
       *
       * A stable running two rides a day for three months has a hundred and
       * seventy departures, and WhatsApp shows ten rows. Offering "09-01 05:30"
       * as a single choice meant the customer saw five days and no way to
       * reach the sixth.
       *
       * `mode: "date"` asks which day, `mode: "time"` asks which departure on
       * the day already chosen. Left unset the step behaves exactly as before,
       * so flows that were built against the combined list keep working.
       */
      const mode = String(data.mode || "").toLowerCase()
      const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
      const dayLabel = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`

      if (mode === "date") {
        const byDay = new Map<string, { date: Date; count: number; left: number }>()
        for (const { slot, left } of openAll) {
          const key = slot.date.toISOString().slice(0, 10)
          const seen = byDay.get(key)
          if (seen) { seen.count += 1; seen.left += left }
          else byDay.set(key, { date: slot.date, count: 1, left })
        }
        const days = [...byDay.values()].slice(0, 10)
        const dayRows = days.map(d => ({
          id: `date_${d.date.toISOString().slice(0, 10)}`,
          // The title is what a tap sends back, so it has to be a date this
          // platform can read again.
          title: dayLabel(d.date).slice(0, 24),
          description: `${d.count} time${d.count === 1 ? "" : "s"} · ${d.left} place${d.left === 1 ? "" : "s"} free`.slice(0, 72),
        }))
        const dayBody = fill(data.text || `📅 Which day would you like for *${tour.name}*?`, ctx)
        await sendChoices(ctx, dayBody, dayRows.length > 0, () =>
          sendInteractiveMessage({
            to: ctx.customerPhone,
            body: dayBody,
            list: { title: "See dates", sections: [{ title: tour.name.slice(0, 24), rows: dayRows }] },
          }),
        )
        return { wait: "reply" }
      }

      if (mode === "time") {
        const chosen = fill(data.date || ctx.variables.booking_date || "", ctx).trim().replace(/^date_/, "")
        const { parseDate } = await import("@/lib/botflow-engine")
        const iso = /^\d{4}-\d{2}-\d{2}$/.test(chosen) ? chosen : parseDate(chosen)
        const sameDay = openAll.filter(r => r.slot.date.toISOString().slice(0, 10) === iso)
        const timeRows = sameDay.slice(0, 10).map(({ slot, left }) => ({
          id: `slot_${slot.id}`,
          title: slot.startTime.slice(0, 24),
          description: `${left} place${left === 1 ? "" : "s"} left · ${slot.priceOverride ?? tour.basePrice} ${tour.currency || "OMR"}`.slice(0, 72),
        }))
        const timeBody = fill(
          data.text || (iso ? `🕐 Which time on *${dayLabel(new Date(iso))}*?` : "🕐 Which time would you like?"),
          ctx,
        )
        await sendChoices(ctx, timeBody, timeRows.length > 0, () =>
          sendInteractiveMessage({
            to: ctx.customerPhone,
            body: timeBody,
            list: { title: "See times", sections: [{ title: tour.name.slice(0, 24), rows: timeRows }] },
          }),
        )
        return { wait: "reply" }
      }

      const open = openAll.slice(0, 10)

      if (open.length === 0) {
        await sendInteractiveMessage({
          to: ctx.customerPhone,
          body: fill(`😔 *${tour.name}* has no open dates in the next few weeks.\n\nWould you like us to tell you when new dates open?`, ctx),
          buttons: [
            { id: "tour_waitlist", title: "🔔 Notify me" },
            { id: "tour_catalog", title: "🚙 Other tours" },
          ],
        })
        return { wait: "reply" }
      }

      // WhatsApp truncates hard: 24 characters for a row title, 72 for its
      // description. Trimmed here so the seat count is never the part cut off.
      const rows = open.map(({ slot, left }) => ({
        id: `slot_${slot.id}`,
        title: `${slot.date.toISOString().slice(5, 10)} ${slot.startTime}`.slice(0, 24),
        description: `${left} seat${left === 1 ? "" : "s"} left · ${slot.priceOverride ?? tour.basePrice} OMR`.slice(0, 72),
      }))

      const availBody = fill(data.text || `📅 Live availability for *${tour.name}*. Choose a departure:`, ctx)
      const availResult = await sendInteractiveMessage({
        to: ctx.customerPhone,
        body: availBody,
        list: {
          title: "See dates",
          sections: [{ title: tour.name.slice(0, 24), rows }],
        },
      })
      await record(ctx, availBody, availResult.success)
      return { wait: "reply" }
    }

    case "HOSP_CHEMO": {
      const { handleHospitalBookingFlow } = await import("@/lib/hospital-booking-flow")
      const conv = await db.conversation.findUnique({ where: { id: ctx.conversationId }, select: { tenantId: true } })
      const tenantId = conv?.tenantId || ""
      await handleHospitalBookingFlow(
        { tenantId, customerPhone: ctx.customerPhone, conversationId: ctx.conversationId ?? undefined },
        { buttonId: "hosp_btn_chemo", text: "chemo" }
      )
      return { wait: "reply" }
    }

    case "HOSP_DOCTOR": {
      const { handleHospitalBookingFlow } = await import("@/lib/hospital-booking-flow")
      const conv = await db.conversation.findUnique({ where: { id: ctx.conversationId }, select: { tenantId: true } })
      const tenantId = conv?.tenantId || ""
      await handleHospitalBookingFlow(
        { tenantId, customerPhone: ctx.customerPhone, conversationId: ctx.conversationId ?? undefined },
        { buttonId: "hosp_btn_apt", text: "doctor" }
      )
      return { wait: "reply" }
    }

    case "HOSP_BED_MAP": {
      const { handleHospitalBookingFlow } = await import("@/lib/hospital-booking-flow")
      const conv = await db.conversation.findUnique({ where: { id: ctx.conversationId }, select: { tenantId: true } })
      const tenantId = conv?.tenantId || ""
      await handleHospitalBookingFlow(
        { tenantId, customerPhone: ctx.customerPhone, conversationId: ctx.conversationId ?? undefined },
        { text: "availability" }
      )
      return { wait: "reply" }
    }

    case "BANK_TRANSFER": {
      const bName = fill(data.bankName || "Bank Muscat", ctx)
      const accNum = fill(data.accountNumber || "0123-456789-001", ctx)
      const accTitle = fill(data.accountTitle || "AL BAHR STABLE", ctx)
      const intro = fill(data.text || "🏦 *Bank Transfer Payment Details*", ctx)

      const msg = `${intro}\n\n` +
        `🏛️ *Bank Name:* ${bName}\n` +
        `🏷️ *Account Title:* ${accTitle}\n` +
        `🔢 *Account / IBAN:* \`${accNum}\`\n\n` +
        `📸 *Please take a screenshot of your transfer receipt and send it here to verify your booking.*`

      await sendWhatsApp({ to: ctx.customerPhone, body: msg })
      return { wait: "reply" }
    }

    case "APT_RESCHEDULE": {
      /*
       * Find the appointment instead of asking for its reference.
       *
       * This used to ask the customer to type "#APT-12345" and then ignore the
       * answer. They are messaging from the number the booking was made with,
       * so the upcoming appointment is already findable — and looking it up by
       * phone rather than by a typed reference also means one customer cannot
       * pull up another's booking by guessing a reference.
       */
      const now = new Date()
      const appointment = await db.aptAppointment.findFirst({
        where: {
          tenantId: ctx.tenantId,
          customerPhone: ctx.customerPhone,
          appointmentDate: { gte: now },
          status: { notIn: ["CANCELLED", "COMPLETED", "NO_SHOW", "EXPIRED"] },
        },
        orderBy: { appointmentDate: "asc" },
        include: { service: true, provider: true, branch: true },
      })

      if (!appointment) {
        await sendInteractiveMessage({
          to: ctx.customerPhone,
          body: fill("I could not find an upcoming appointment for this number. Would you like to book one?", ctx),
          buttons: [
            { id: "apt_book", title: "📅 Book appointment" },
            { id: "apt_agent", title: "👤 Talk to someone" },
          ],
        })
        return { wait: "reply" }
      }

      const when = `${appointment.appointmentDate.toISOString().slice(0, 10)} at ${appointment.startTime}`
      const body = fill(
        data.text ||
          `🔄 *Your appointment*\n\nReference: ${appointment.reference}\nService: ${appointment.service?.name || "Consultation"}${appointment.provider?.name ? `\nWith: ${appointment.provider.name}` : ""}${appointment.branch?.name ? `\nBranch: ${appointment.branch.name}` : ""}\nWhen: ${when}\nStatus: ${appointment.status}\n\nWhat would you like to do?`,
        ctx,
      )
      const result = await sendInteractiveMessage({
        to: ctx.customerPhone,
        body,
        buttons: [
          { id: `apt_resched_${appointment.reference}`, title: "🔄 Reschedule" },
          { id: `apt_cancel_${appointment.reference}`, title: "❌ Cancel" },
          { id: "apt_agent", title: "👤 Talk to someone" },
        ],
      })
      await record(ctx, body, result.success)
      return { wait: "reply", set: { "appointment.reference": appointment.reference } }
    }

    case "VISA": {
      /*
       * Hand to the visa flow rather than imitating it.
       *
       * This node used to send its own three buttons — visa_tourist,
       * visa_express, visa_agent — while visa-flow.ts routes replies by a
       * "vs_" prefix. Nothing matched, so every tap fell through and the
       * customer was left with a menu that did nothing. startVisaFlow sends
       * the real menu, with the ids its own handler is listening for, and it
       * respects the tenant's visa_enabled setting.
       */
      const { startVisaFlow } = await import("@/lib/visa-flow")
      const started = await startVisaFlow({
        conversationId: ctx.conversationId,
        customerId: ctx.customerId,
        phone: ctx.customerPhone,
      })
      if (!started) {
        const off = fill(data.text || "Visa assistance is not available on this account right now. Would you like to speak to someone?", ctx)
        await sendWhatsApp({ to: ctx.customerPhone, body: off })
        await record(ctx, off, true)
        return { handoff: true }
      }
      return { wait: "reply" }
    }

    case "RESTAURANT": {
      /*
       * Only offer a table when there is one.
       *
       * "Book a Table" was a button with nothing behind it. The free tables are
       * counted first, so the offer reflects the room: with none free the
       * customer is told plainly and sent to the menu rather than into a dead
       * end. Sections are listed because "terrace or indoors" is the question
       * people actually ask.
       */
      const freeTables = await db.restaurantTable.findMany({
        where: { tenantId: ctx.tenantId, status: "AVAILABLE" },
        select: { section: true, capacity: true },
      })
      const seats = freeTables.reduce((total, table) => total + table.capacity, 0)
      const sections = [...new Set(freeTables.map(table => table.section))]

      const msg = fill(
        data.text ||
          (freeTables.length > 0
            ? `🍽️ *Table Reservation & Menu*\n\nWe have *${freeTables.length} table${freeTables.length === 1 ? "" : "s"}* free right now (${seats} seats)${sections.length ? ` across ${sections.join(", ").toLowerCase()}` : ""}.\n\nWould you like to reserve one, or see the menu?`
            : "🍽️ *Table Reservation & Menu*\n\nEvery table is taken at the moment — we can add you to the waiting list, or you can order from the menu."),
        ctx,
      )
      const restResult = await sendInteractiveMessage({
        to: ctx.customerPhone,
        body: msg,
        buttons: freeTables.length > 0
          ? [
              { id: "rest_table", title: "🪑 Book a Table" },
              { id: "rest_menu", title: "📖 View Menu" },
            ]
          : [
              { id: "rest_waitlist", title: "🔔 Waiting list" },
              { id: "rest_menu", title: "📖 View Menu" },
            ],
      })
      await record(ctx, msg, restResult.success)
      return { wait: "reply", set: { "restaurant.tables_free": String(freeTables.length) } }
    }

    case "RESTAURANT_MENU": {
      const categories = await db.menuCategory.findMany({
        where: { tenantId: (await db.conversation.findUnique({ where: { id: ctx.conversationId }, select: { tenantId: true } }))?.tenantId || "", isActive: true },
        include: { items: { where: { isAvailable: true }, take: 10, orderBy: { createdAt: "asc" } } },
        take: 10,
      })
      const rows = categories.flatMap(category => category.items.slice(0, 10).map(item => ({ id: `menu_${item.id}`, title: item.name.slice(0, 24), description: `${item.price.toFixed(3)} ${item.currency}`.slice(0, 72) }))).slice(0, 10)
      if (!rows.length) {
        await sendWhatsApp({ to: ctx.customerPhone, body: fill(data.text || "Our menu is being updated. Please ask an agent for today's options.", ctx), allowOutsideSession: true })
        return { wait: "reply" }
      }
      const body = fill(data.text || "🍽️ Choose from our available menu:", ctx)
      const result = await sendInteractiveMessage({ to: ctx.customerPhone, body, list: { title: "View Menu", sections: [{ title: "Available today", rows }] } })
      await record(ctx, body, result.success)
      return { wait: "reply" }
    }

    case "RESTAURANT_ORDER_STATUS": {
      const tenantId = (await db.conversation.findUnique({ where: { id: ctx.conversationId }, select: { tenantId: true } }))?.tenantId || ""
      const order = await db.kitchenOrder.findFirst({ where: { tenantId, ...(data.orderId ? { id: fill(data.orderId, ctx) } : { customerPhone: ctx.customerPhone }), status: { not: "CANCELLED" } }, orderBy: { createdAt: "desc" } })
      const body = order ? `🍽️ Order *#${order.id.slice(-8).toUpperCase()}* is currently *${order.status.replace(/_/g, " ")}*.\nTotal: ${order.totalAmount.toFixed(3)} ${order.currency}` : "I could not find an active restaurant order for this number."
      await sendWhatsApp({ to: ctx.customerPhone, body, allowOutsideSession: true })
      return { wait: "reply" }
    }

    case "HOSPITAL_AVAILABILITY": {
      const { handleHospitalBookingFlow } = await import("@/lib/hospital-booking-flow")
      const tenantId = (await db.conversation.findUnique({ where: { id: ctx.conversationId }, select: { tenantId: true } }))?.tenantId || ""
      await handleHospitalBookingFlow({ tenantId, customerPhone: ctx.customerPhone, conversationId: ctx.conversationId }, { text: "availability" })
      return { wait: "reply" }
    }

    case "APPOINTMENT": {
      // Dynamically import to avoid circular deps
      const { handleAptBookingFlow } = await import("@/lib/apt-booking-flow")
      // Get tenantId from conversation
      const conv = await db.conversation.findUnique({
        where: { id: ctx.conversationId },
        select: { tenantId: true },
      })
      if (!conv || !conv.tenantId) return {}
      const introText = data.appointmentText || "📅 I can help you book an appointment!"
      await sendWhatsApp({
        to: ctx.customerPhone,
        body: fill(introText, ctx),
      })
      await handleAptBookingFlow(
        { tenantId: conv.tenantId, customerPhone: ctx.customerPhone, conversationId: ctx.conversationId ?? undefined },
        { text: "START_APT" },
      )
      return { wait: "reply" }
    }

    default:
      return {}
  }
}

/** `data.items.0.name` out of a parsed response, without a dependency. */
function pluck(value: unknown, path: string): unknown {
  return String(path || "")
    .split(".")
    .filter(Boolean)
    .reduce<unknown>((acc, key) => {
      if (acc === null || acc === undefined) return undefined
      if (Array.isArray(acc)) return acc[Number(key)]
      if (typeof acc === "object") return (acc as Record<string, unknown>)[key]
      return undefined
    }, value)
}
