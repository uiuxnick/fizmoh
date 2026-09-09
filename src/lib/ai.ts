/**
 * AI Service with Function Calling
 *
 * The AI assistant "Najwa" can:
 * - Check real-time availability from the database
 * - Create bookings
 * - Look up order status
 * - Answer FAQs about tours
 * - Handle natural language queries
 *
 * Runs on Anthropic (Claude) or OpenAI (ChatGPT) — selected in Settings → AI.
 * Tools are executed through each vendor's native tool-calling loop, so the
 * model decides which tool to call and with what arguments.
 */

import Anthropic from "@anthropic-ai/sdk"
import { db } from "@/lib/db"
import { formatCurrency, formatDate, generateOrderNumber } from "@/lib/helpers"
import {
  getAIConfig,
  anthropicClient,
  openaiClient,
  isAIConfigured,
  type ToolSpec,
} from "@/lib/ai-provider"
import { syncOrderToCalendar } from "@/lib/google-calendar"

export { isAIConfigured }

/*
 * The assistant's standing instructions, with no business baked in.
 *
 * This prompt used to enumerate the verticals of whoever had been built first
 * — a marketing agency, a named hospital's oncology day care, Oman desert
 * safaris — so every workspace on the platform got an assistant that believed
 * it sold all of them. A horse stable's customer asking a simple question was
 * answered with desert safaris and SEO packages, and the identity block below
 * saying otherwise did not undo it: the two contradicted each other and the
 * longer, more specific list won.
 *
 * What this business actually is arrives from businessIdentity() and from the
 * tenant-scoped tools. Nothing about any other business belongs here.
 */
const ASSISTANT_SYSTEM_PROMPT = `You are a friendly, capable assistant answering WhatsApp messages for one business.

Your personality:
- You speak naturally, warmly and concisely, like an experienced member of the team.
- You are fluent in English, Arabic (الفصحى and Gulf/Omani dialect), French, and Hindi/Urdu. Automatically match the customer's language.
- You avoid robotic clichés and canned responses. Use clean formatting, short bullets, and tasteful emojis.
- You keep WhatsApp replies crisp and easy to skim on a phone.

What you may talk about:
- Only the business described below, and only what its own data and documents say. You represent that one business and nothing else.
- If you are asked about a service this business does not offer, say plainly that it is not something they do. Never fill the gap with another company's services, prices or policies.
- Everything factual — what is offered, what it costs, what is available, what a booking says — comes from the tools. Never state a price, a date or an availability you have not looked up.
- If a tool returns nothing, say so and offer to check, rather than inventing an answer. An invented policy is remembered as a promise.

Payment & actions:
- Card payment is taken online; bank transfers are confirmed from an uploaded screenshot.
- When a customer needs a person — a complex request, a complaint, or anything urgent — hand off with handoff_to_human.`

// ─── Tool implementations ───

type ToolHandler = (input: any, ctx: { customerPhone?: string }) => Promise<string>

function parseTargetDate(date?: string): Date {
  const target = new Date()
  if (date === "tomorrow") target.setDate(target.getDate() + 1)
  else if (date && date !== "today") {
    const parsed = new Date(date)
    if (!Number.isNaN(parsed.getTime())) return (parsed.setHours(0, 0, 0, 0), parsed)
  }
  target.setHours(0, 0, 0, 0)
  return target
}

async function findTour(name: string) {
  return db.tour.findFirst({
    where: {
      OR: [
        { name: { contains: name, mode: "insensitive" } },
        { nameAr: { contains: name } },
        { slug: { contains: name.toLowerCase().replace(/\s+/g, "-") } },
      ],
    },
  })
}

const TOOLS: { definition: ToolSpec; handler: ToolHandler }[] = [
  {
    definition: {
      name: "list_tours",
      description:
        "List all active tours with their city, duration, rating and starting price. Call this when the customer asks what tours are available, what you offer, or names no specific tour.",
      parameters: { type: "object", properties: {} },
    },
    handler: async () => {
      const tours = await db.tour.findMany({ where: { status: "ACTIVE" }, orderBy: { featured: "desc" } })
      if (tours.length === 0) return "No tours are currently active."
      const list = tours
        .map(
          (t, i) =>
            `${i + 1}. ${t.name}\n   📍 ${t.city} · ⏰ ${t.durationHours}h · ⭐ ${t.rating}\n   💰 From ${formatCurrency(t.basePrice)}`,
        )
        .join("\n\n")
      return `🐪 Our Tours:\n\n${list}`
    },
  },
  {
    definition: {
      name: "send_tour_photos",
      description:
        "Actually sends photographs to the customer's WhatsApp. This is the ONLY way an image reaches them — describing a photo in your reply sends nothing. " +
        "Call it whenever they ask for pictures, photos, images, or to be shown a tour, and before any reply that mentions photos. Up to three at once, each with a caption carrying the name, city, duration and price.",
      parameters: {
        type: "object",
        properties: {
          tour_names: { type: "array", items: { type: "string" }, description: "Up to three tour names" },
        },
        required: ["tour_names"],
      },
    },
    handler: async ({ tour_names }, ctx) => {
      if (!ctx.customerPhone) return "No verified phone number for this conversation."

      const { sendMediaMessage } = await import("@/lib/whatsapp")
      const wanted = (Array.isArray(tour_names) ? tour_names : [tour_names]).slice(0, 3)
      console.log(`[photos] called with ${JSON.stringify(wanted)} for ${ctx.customerPhone}`)

      const sent: string[] = []
      const failed: string[] = []

      for (const name of wanted) {
        const tour = await findTour(String(name))
        if (!tour) { failed.push(String(name)); continue }

        const media = (() => {
          const raw = tour.media
          const parsed = typeof raw === "string" ? (() => { try { return JSON.parse(raw) } catch { return [] } })() : raw
          return Array.isArray(parsed) ? parsed as { url?: string }[] : []
        })()
        const url = media.find(m => m.url)?.url
        if (!url) { failed.push(tour.name); continue }

        const caption =
          `*${tour.name}*\n${tour.description.slice(0, 220)}\n\n` +
          `📍 ${tour.city} · ⏰ ${tour.durationHours}h · 💰 from ${formatCurrency(tour.basePrice)} per adult`

        const result = await sendMediaMessage({ to: ctx.customerPhone, type: "image", mediaUrl: url, caption })
        console.log(`[photos] tour=${tour.name} url=${url.slice(0, 60)} success=${result.success} error=${result.error ?? "none"}`)
        if (result.success) sent.push(tour.name)
        else failed.push(tour.name)
      }

      if (sent.length === 0) {
        return `Could not send photos${failed.length ? ` for: ${failed.join(", ")}` : ""}. Describe the tours in words instead.`
      }
      // The photographs and their captions have already been delivered, so the
      // assistant should not repeat the same detail in its own reply.
      return `Photos already sent to the customer for: ${sent.join(", ")}. Do not repeat the descriptions — just add a short line offering to check dates or answer questions.`
    },
  },
  {
    definition: {
      name: "check_availability",
      description:
        "Seats remaining on a tour for a FUTURE date the customer is considering. Only for a date they name or 'today'/'tomorrow' when they are looking to book. " +
        "Never use this to answer a question about bookings the customer already has — those are listed in your context, and my_bookings returns them.",
      parameters: {
        type: "object",
        properties: {
          tour_name: { type: "string", description: "Tour name or partial name" },
          date: { type: "string", description: "YYYY-MM-DD, or 'today' / 'tomorrow'" },
        },
        required: ["tour_name"],
      },
    },
    handler: async ({ tour_name, date }) => {
      const tour = await findTour(tour_name)
      if (!tour) return `Tour "${tour_name}" not found. Call list_tours to see what is available.`

      const targetDate = parseTargetDate(date)
      const nextDay = new Date(targetDate)
      nextDay.setDate(nextDay.getDate() + 1)

      const slots = await db.slot.findMany({
        where: { tourId: tour.id, date: { gte: targetDate, lt: nextDay }, status: { in: ["OPEN", "FULL"] } },
        orderBy: { startTime: "asc" },
      })

      if (slots.length === 0) return `No slots for ${tour.name} on ${formatDate(targetDate)}.`

      const slotList = slots
        .map(s => {
          const available = s.capacity - s.seatsBooked - s.seatsHeld
          const price = s.priceOverride ?? tour.basePrice
          return `⏰ ${s.startTime} — ${available} seats left — ${formatCurrency(price)}${s.status === "FULL" ? " ❌ FULL" : " ✅"}`
        })
        .join("\n")

      return `📅 ${tour.name} — ${formatDate(targetDate)}\n\n${slotList}`
    },
  },
  {
    definition: {
      name: "get_tour_details",
      description:
        "Everything about one tour: what happens hour by hour, what is included and excluded, what to bring, where it departs from, how long it takes, how hard it is, and the cancellation terms. Call this whenever a customer asks anything specific about a tour rather than guessing.",
      parameters: {
        type: "object",
        properties: { tour_name: { type: "string" } },
        required: ["tour_name"],
      },
    },
    handler: async ({ tour_name }) => {
      const tour = await findTour(tour_name)
      if (!tour) return `Tour "${tour_name}" not found.`

      const list = (value: unknown): string[] => {
        if (Array.isArray(value)) return value as string[]
        if (typeof value === "string") { try { const p = JSON.parse(value); return Array.isArray(p) ? p : [] } catch { return [] } }
        return []
      }
      const steps = list(tour.itinerary) as unknown as { time?: string; title?: string; description?: string }[]

      const parts = [
        `${tour.name} — ${formatCurrency(tour.basePrice)} per adult${tour.childPrice ? `, ${formatCurrency(tour.childPrice)} per child` : ""}`,
        `Duration ${tour.durationHours}h · ${tour.difficulty} · from ${tour.city}`,
        tour.meetingPoint ? `Meeting point: ${tour.meetingPoint}` : "",
        tour.description,
        steps.length ? `Itinerary:\n${steps.map(x => `${x.time ?? ""} ${x.title ?? ""}${x.description ? ` — ${x.description}` : ""}`).join("\n")}` : "",
        list(tour.inclusions).length ? `Included: ${list(tour.inclusions).join(", ")}` : "",
        list(tour.exclusions).length ? `Not included: ${list(tour.exclusions).join(", ")}` : "",
        list(tour.whatToBring).length ? `Bring: ${list(tour.whatToBring).join(", ")}` : "",
        tour.cancellationPolicy ? `Cancellation: ${tour.cancellationPolicy}` : "",
      ].filter(Boolean)

      return parts.join("\n\n")
    },
  },
  {
    definition: {
      name: "my_bookings",
      description:
        "All bookings belonging to the customer you are talking to. Call this when they ask about 'my booking' or 'my order' without giving an order number.",
      parameters: { type: "object", properties: {}, required: [] },
    },
    handler: async (_input, ctx) => {
      if (!ctx.customerPhone) return "No verified phone number for this conversation."
      const customer = await db.customer.findFirst({
        where: { phone: ctx.customerPhone },
        include: { orders: { orderBy: { createdAt: "desc" }, take: 10, include: { tour: true, slot: true, vouchers: true } } },
      })
      if (!customer || customer.orders.length === 0) return "This customer has no bookings yet."

      return customer.orders.map(order => {
        const voucher = order.vouchers[0]
        return `${order.orderNumber} — ${order.tour.name}, ${formatDate(order.slot.date)} at ${order.slot.startTime}, ` +
          `${order.paxAdult} adults${order.paxChild ? ` + ${order.paxChild} children` : ""}, ` +
          `${formatCurrency(order.totalAmount)}, status ${order.orderStatus}` +
          (voucher ? `, voucher ${voucher.voucherCode}` : "")
      }).join("\n")
    },
  },
  {
    definition: {
      name: "request_cancellation",
      description:
        "Raise a cancellation request for the customer's own bookings — one, several, or all of a kind ('cancel all my unpaid orders'). This does not cancel anything: staff review and confirm, because a refund may be due. Use this rather than handing over.",
      parameters: {
        type: "object",
        properties: {
          order_number: { type: "string", description: "A single order number" },
          order_numbers: { type: "array", items: { type: "string" }, description: "Several order numbers" },
          scope: {
            type: "string",
            enum: ["all_unpaid", "all_active"],
            description: "all_unpaid covers everything awaiting payment; all_active covers every booking that has not run or been cancelled",
          },
          reason: { type: "string" },
        },
        required: [],
      },
    },
    handler: async ({ order_number, order_numbers, scope, reason }, ctx) => {
      if (!ctx.customerPhone) return "No verified phone number for this conversation."

      // Always scoped to the caller's own number, so one customer cannot touch
      // another's booking by quoting its order number.
      const OPEN = ["PENDING_PAYMENT", "PAYMENT_SUBMITTED", "CONFIRMED"]
      const wanted = [
        ...(order_number ? [String(order_number)] : []),
        ...(Array.isArray(order_numbers) ? order_numbers.map(String) : []),
      ]

      const orders = await db.order.findMany({
        where: {
          customerPhone: ctx.customerPhone,
          ...(wanted.length
            ? { orderNumber: { in: wanted } }
            : scope === "all_unpaid"
              ? { orderStatus: { in: ["PENDING_PAYMENT", "PAYMENT_SUBMITTED"] } }
              : scope === "all_active"
                ? { orderStatus: { in: OPEN } }
                : { orderStatus: { in: OPEN } }),
        },
      })

      if (orders.length === 0) {
        return wanted.length
          ? `No booking ${wanted.join(", ")} found on this number.`
          : "This customer has nothing that can be cancelled — tell them so."
      }

      const requested: string[] = []
      const skipped: string[] = []

      for (const order of orders) {
        if (order.orderStatus === "CANCELLED" || order.orderStatus === "COMPLETED" || order.orderStatus === "CANCELLATION_REQUESTED") {
          skipped.push(`${order.orderNumber} (${order.orderStatus.toLowerCase().replace(/_/g, " ")})`)
          continue
        }
        // Parked, not cancelled: seats stay held and no refund is issued until
        // a person decides, because a paid booking involves money going back.
        await db.order.update({
          where: { id: order.id },
          data: {
            orderStatus: "CANCELLATION_REQUESTED",
            cancelReason: reason ? `Requested by customer: ${reason}` : "Requested by customer over WhatsApp",
          },
        })
        requested.push(order.orderNumber)
      }

      if (requested.length > 0) {
        const { notifyStaff } = await import("@/lib/realtime")
        await notifyStaff({
          type: "SLA_BREACH",
          title: requested.length === 1 ? "Cancellation requested" : `${requested.length} cancellations requested`,
          message: `${orders[0].customerName}: ${requested.join(", ")}${reason ? ` — ${reason}` : ""} — awaiting approval`,
          data: { orderNumbers: requested, reason },
        })
      }

      const parts: string[] = []
      if (requested.length) parts.push(`Cancellation requested for ${requested.join(", ")}.`)
      if (skipped.length) parts.push(`Not requested: ${skipped.join(", ")}.`)
      parts.push("Tell the customer nothing is cancelled yet — the team will review and confirm, along with any refund.")
      return parts.join(" ")
    },
  },
  {
    definition: {
      name: "search_knowledge",
      description:
        "Search the company's own documents, policies, FAQs and website for an answer. " +
        "Call this for anything not held in the booking data: cancellation and refund policy, what to bring, " +
        "age limits, dress code, accessibility, payment terms, insurance, permits, opening hours, company background, " +
        "or any question where you would otherwise be guessing. " +
        "Prefer calling it and finding nothing over answering from your own general knowledge — a confident invented " +
        "policy is worse for the customer than admitting you need to check.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The customer's question, in their own words" },
        },
        required: ["query"],
      },
    },
    handler: async ({ query }) => {
      const { searchKnowledge } = await import("@/lib/knowledge")
      const passages = await searchKnowledge(String(query || ""), 5)
      if (passages.length === 0) {
        return "NOTHING FOUND in the company documents. Do not invent an answer. Say you will check with a colleague, " +
          "or use handoff_to_human if the customer needs a definite answer now."
      }
      return (
        "From the company's own documents. Answer using ONLY what is below. " +
        "If it does not cover the question, say so rather than filling the gap.\n\n" +
        passages
          .map((p, i) => `[${i + 1}] ${p.sourceTitle}${p.url ? ` (${p.url})` : ""}\n${p.content}`)
          .join("\n\n---\n\n")
      )
    },
  },
  {
    definition: {
      name: "list_appointment_services",
      description: "List available appointment services (e.g. consultations, medical, training, salon). Call this when a customer asks about booking an appointment, consultation, or session.",
      parameters: { type: "object", properties: {} },
    },
    handler: async (_, ctx) => {
      const tenantId = (await db.conversation.findFirst({ where: { customerPhone: ctx.customerPhone } }))?.tenantId || ""
      const services = await db.aptService.findMany({ where: { tenantId, status: "ACTIVE", isBookingEnabled: true } })
      if (services.length === 0) return "No appointment services currently available."
      return "Available Services:\n" + services.map(s => `• ${s.name} (${s.durationMins}m · ${s.price > 0 ? `${s.price} ${s.currency}` : "Free"})`).join("\n")
    },
  },
  {
    definition: {
      name: "check_appointment_availability",
      description: "Check available time slots for an appointment service on a given date (YYYY-MM-DD).",
      parameters: {
        type: "object",
        properties: {
          service_name: { type: "string", description: "Name of the service" },
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
        },
        required: ["service_name", "date"],
      },
    },
    handler: async ({ service_name, date }, ctx) => {
      const tenantId = (await db.conversation.findFirst({ where: { customerPhone: ctx.customerPhone } }))?.tenantId || ""
      const service = await db.aptService.findFirst({
        where: { tenantId, name: { contains: service_name, mode: "insensitive" } },
      })
      if (!service) return `Service "${service_name}" not found.`

      const { generateAvailableSlots } = await import("@/lib/apt-slots")
      const slots = await generateAvailableSlots({ tenantId, serviceId: service.id, date })
      const free = slots.filter(s => s.available).map(s => s.time)
      if (free.length === 0) return `No available time slots on ${date} for ${service.name}.`
      return `Available time slots on ${date} for ${service.name}:\n` + free.join(", ")
    },
  },
  {
    definition: {
      name: "handoff_to_human",
      description:
        "Pass the conversation to a member of staff. This silences the assistant for that conversation until an agent replies, so it is a last resort, not a first move. " +
        "Call it only when the customer explicitly asks for a person, is angry or complaining, wants a refund or a special arrangement, or asks something none of your other tools can answer. " +
        "Do NOT call it for anything you can look up: their bookings (my_bookings), a specific order (check_order), what tours exist (list_tours), what a tour includes (get_tour_details), dates and seats (check_availability), photographs (send_tour_photos), or cancelling (request_cancellation). Use the tool and answer.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "One line on what they need, for the agent picking it up" },
          urgency: { type: "string", enum: ["normal", "high"], description: "high for anger, a complaint, or anything time-critical" },
        },
        required: ["reason"],
      },
    },
    handler: async ({ reason, urgency = "normal" }, ctx) => {
      if (!ctx.customerPhone) return "No verified phone number for this conversation."

      // Handing over silences the assistant, so a customer asking a question it
      // can answer must not be met with silence. "How many bookings are on my
      // number?" was handed to staff, and every later message went unanswered.
      const answerable = /\b(booking|bookings|order|orders|reservation|tour|tours|price|prices|cost|availab|date|dates|seat|seats|photo|picture|image|includ|itinerar|cancel)\b/i
      const asksForPerson = /\b(human|person|agent|staff|someone|manager|speak to|talk to|complain|refund|angry|useless|إنسان|موظف|شكوى|استرجاع)\b/i
      if (answerable.test(String(reason)) && !asksForPerson.test(String(reason)) && urgency !== "high") {
        return "NOT HANDED OVER — you can answer this yourself. Use my_bookings, check_order, list_tours, get_tour_details, check_availability or send_tour_photos and reply to the customer."
      }

      const conversation = await db.conversation.findFirst({
        where: { customerPhone: ctx.customerPhone },
        orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
      })
      if (!conversation) return "No conversation found to hand over."

      // The bot is switched off for this conversation, otherwise it would keep
      // answering over the agent who has just been asked to take it.
      await db.conversation.update({
        where: { id: conversation.id },
        data: { botActive: false, status: "PENDING" },
      })

      const { notifyStaff } = await import("@/lib/realtime")
      await notifyStaff({
        type: urgency === "high" ? "SLA_BREACH" : "NEW_MESSAGE",
        title: urgency === "high" ? "Customer needs help — urgent" : "Customer asked for a person",
        message: `${conversation.customerName || ctx.customerPhone}: ${reason}`,
        data: { conversationId: conversation.id, reason, urgency },
      })

      return "Handed over. Tell the customer a colleague will pick this up shortly, and do not attempt to answer the question yourself."
    },
  },
  {
    definition: {
      name: "check_order",
      description:
        "Look up a booking by its order number. Call this when the customer asks about their booking, order, voucher, or payment status.",
      parameters: {
        type: "object",
        properties: { order_number: { type: "string", description: "e.g. ORD-20260806-A1B2C3D4" } },
        required: ["order_number"],
      },
    },
    handler: async ({ order_number }, ctx) => {
      const order = await db.order.findFirst({
        where: { orderNumber: order_number },
        include: { tour: true, slot: true, vouchers: true },
      })
      if (!order) return `Order ${order_number} not found.`

      // Only disclose booking details to the phone that owns the booking.
      if (ctx.customerPhone && order.customerPhone !== ctx.customerPhone) {
        return "That order number belongs to a different account. Ask the customer to confirm their order number."
      }

      const emoji = order.orderStatus === "CONFIRMED" ? "✅" : order.orderStatus === "CANCELLED" ? "❌" : "⏳"
      const voucher = order.vouchers[0]
      return `${emoji} Order ${order.orderNumber}\n📍 ${order.tour.name}\n📅 ${formatDate(order.slot.date)} at ${order.slot.startTime}\n👥 ${order.paxAdult} adults${order.paxChild ? `, ${order.paxChild} children` : ""}\n💰 ${formatCurrency(order.totalAmount)}\n📊 Status: ${order.orderStatus.replace(/_/g, " ")}\n💳 Payment: ${order.paymentStatus.replace(/_/g, " ")}${voucher ? `\n🎟️ Voucher: ${voucher.voucherCode} (${voucher.status})` : ""}`
    },
  },
  {
    definition: {
      name: "create_booking",
      description:
        "Create a booking. Only call this after check_availability confirmed the slot exists and the customer has confirmed tour, date, time and party size.",
      parameters: {
        type: "object",
        properties: {
          tour_name: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD, or 'today' / 'tomorrow'" },
          time: { type: "string", description: "Slot start time, e.g. '14:00'" },
          adults: { type: "integer", minimum: 1 },
          children: { type: "integer", minimum: 0 },
          customer_name: { type: "string", description: "Only if the customer gives a different name — otherwise omit and their stored name is used" },
          customer_confirmed_quote: {
            type: "string",
            description:
              "The customer's own words agreeing to book this exact tour, date, time and party size — for example 'yes book it' or 'confirm'. A question such as 'what tours do you have tomorrow' is NOT confirmation. Leave this out if they have not explicitly agreed.",
          },
        },
        required: ["tour_name", "date", "time", "adults", "customer_confirmed_quote"],
      },
    },
    handler: async ({ tour_name, date, time, adults, children = 0, customer_name, customer_confirmed_quote }, ctx) => {
      // The phone comes from the authenticated WhatsApp sender, never from the
      // model — otherwise a customer could book against someone else's number.
      const customerPhone = ctx.customerPhone
      if (!customerPhone) return "Cannot create a booking without a verified customer phone number."

      // A customer asking "how many tours do you have tomorrow?" had a real
      // 34 OMR booking created for them. The instruction to confirm first was
      // in the tool description and the model ignored it, so the requirement is
      // now enforced here rather than requested.
      const confirmation = String(customer_confirmed_quote || "").trim()
      const CONFIRMING = /\b(yes|yeah|yep|confirm|book it|go ahead|please book|ok|okay|sure|do it|نعم|أكيد|احجز|تمام|موافق)\b/i
      if (!confirmation || !CONFIRMING.test(confirmation)) {
        return "NOT BOOKED — the customer has not agreed to this booking yet. Show them the tour, date, time, party size and total price, and ask them to confirm before calling this again."
      }

      // Their stored name is used unless they explicitly give a different one,
      // so a returning customer is never asked for it again.
      const known = await db.customer.findFirst({ where: { phone: customerPhone }, select: { name: true } })
      const bookingName = (customer_name || known?.name || "").trim()
      if (!bookingName) return "I need the name for the booking before I can create it — please ask the customer what name it should be under."

      const tour = await findTour(tour_name)
      if (!tour) return `Tour "${tour_name}" not found.`

      const targetDate = parseTargetDate(date)
      const nextDay = new Date(targetDate)
      nextDay.setDate(nextDay.getDate() + 1)

      const slot = await db.slot.findFirst({
        where: { tourId: tour.id, date: { gte: targetDate, lt: nextDay }, startTime: time, status: "OPEN" },
      })
      if (!slot) return `No open slot for ${tour.name} on ${formatDate(targetDate)} at ${time}. Check availability again.`

      const available = slot.capacity - slot.seatsBooked - slot.seatsHeld
      if (available < adults + children) return `Only ${available} seats left on that slot.`

      // The same tour on the same departure, booked twice, is nearly always a
      // mistake — a repeated message, or a customer who did not realise the
      // first one went through. Say so rather than taking the money twice.
      const duplicate = await db.order.findFirst({
        where: {
          customerPhone,
          tourId: tour.id,
          slotId: slot.id,
          orderStatus: { notIn: ["CANCELLED", "REFUNDED"] },
        },
        orderBy: { createdAt: "desc" },
      })
      if (duplicate) {
        return `NOT BOOKED — this customer already has ${duplicate.orderNumber} for ${tour.name} on ${formatDate(targetDate)} at ${time} ` +
          `(${duplicate.paxAdult} adults, ${formatCurrency(duplicate.totalAmount)}, status ${duplicate.orderStatus}). ` +
          `Tell them they already have this booking and ask whether they want to keep it, book a different date, or cancel it. ` +
          `Only call create_booking again if they confirm they genuinely want a second, separate booking for the same departure.`
      }

      let customer = await db.customer.findFirst({ where: { phone: customerPhone } })
      if (!customer) {
        customer = await db.customer.create({
          data: {
            name: bookingName,
            phone: customerPhone,
            whatsappOptIn: true,
            optInSource: "WHATSAPP_INBOUND",
            optInAt: new Date(),
          },
        })
      }

      const pricePerAdult = slot.priceOverride ?? tour.basePrice
      const subtotal = pricePerAdult * adults + (tour.childPrice || 0) * children
      const tax = subtotal * 0.05
      const total = subtotal + tax
      const orderNumber = await generateOrderNumber()

      const order = await db.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          tourId: tour.id,
          slotId: slot.id,
          paxAdult: adults,
          paxChild: children,
          customerName: bookingName,
          customerPhone,
          subtotal,
          taxAmount: tax,
          totalAmount: total,
          paymentMethod: "BANK_TRANSFER",
          paymentStatus: "PENDING",
          orderStatus: "PENDING_PAYMENT",
          channel: "WHATSAPP",
        },
      })

      await db.payment.create({
        data: { orderId: order.id, customerId: customer.id, method: "BANK_TRANSFER", amount: total, status: "PENDING" },
      })

      await db.slot.update({
        where: { id: slot.id },
        data: { seatsHeld: { increment: adults + children } },
      })

      const banks = await db.bankAccount.findMany({ where: { isActive: true }, take: 1 })
      const bank = banks[0]
      const bankLine = bank ? `\n\n🏦 ${bank.bankName}\nIBAN: ${bank.iban}` : ""

      void syncOrderToCalendar(order.id)

      return `✅ Booking created!\n\n🎫 Order: ${orderNumber}\n📍 ${tour.name}\n📅 ${formatDate(targetDate)} at ${time}\n👥 ${adults} adults${children ? `, ${children} children` : ""}\n💰 Total: ${formatCurrency(total)} (incl. 5% VAT)${bankLine}\n\nSend a screenshot here after transferring, or reply "AmwalPay" to pay by card.`
    },
  },
  {
    definition: {
      name: "list_woocommerce_products",
      description:
        "Fetch and list real-time WooCommerce store products, prices, stock status and store links directly from the store database. " +
        "Call this whenever a customer asks about products, items, store inventory, merchandise, or what is available in the store.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Optional product search term (e.g. 'hoodie', 'shoes', 'mug')" },
          category: { type: "string", description: "Optional category ID or name" },
        },
      },
    },
    handler: async ({ search, category }) => {
      try {
        const { fetchWcProducts } = await import("@/lib/woocommerce-client")
        const prods = await fetchWcProducts({ search, category, per_page: 8 })
        if (!prods || prods.length === 0) {
          return "No matching WooCommerce products found in the store."
        }
        const list = prods.map((p: any, i: number) => {
          const regPrice = p.regular_price || p.price || "0"
          const priceStr = p.sale_price && Number(p.sale_price) > 0 ? `~${regPrice} OMR~ *${p.sale_price} OMR* (SALE!)` : `*${regPrice} OMR*`
          const stock = p.stock_status === "instock" ? "✅ In Stock" : "❌ Out of Stock"
          return `${i + 1}. *${p.name}* (ID: ${p.id})\n   💰 Price: ${priceStr} · ${stock}\n   🛒 ${p.permalink}`
        }).join("\n\n")

        return `🛍️ *WooCommerce Store Products*:\n\n${list}`
      } catch (err: any) {
        return `Could not fetch WooCommerce products: ${err.message}`
      }
    },
  },
  {
    definition: {
      name: "get_woocommerce_product_details",
      description:
        "Get comprehensive details of a specific WooCommerce product (ID, exact price, description, stock status, category, and direct store URL). " +
        "Call this when the customer asks for details or pricing of a specific product.",
      parameters: {
        type: "object",
        properties: {
          product_id_or_name: { type: "string", description: "Product ID (e.g. '123') or product name" },
        },
        required: ["product_id_or_name"],
      },
    },
    handler: async ({ product_id_or_name }) => {
      try {
        const { fetchWcProductById, fetchWcProducts } = await import("@/lib/woocommerce-client")
        let prod: any = null
        if (/^\d+$/.test(String(product_id_or_name))) {
          prod = await fetchWcProductById(product_id_or_name).catch(() => null)
        }
        if (!prod) {
          const search = await fetchWcProducts({ search: String(product_id_or_name), per_page: 1 }).catch(() => [])
          prod = search[0]
        }
        if (!prod) return `Product "${product_id_or_name}" not found in WooCommerce store.`

        const regPrice = prod.regular_price || prod.price || "0"
        const priceStr = prod.sale_price && Number(prod.sale_price) > 0 ? `~${regPrice} OMR~ *${prod.sale_price} OMR* (SALE!)` : `*${regPrice} OMR*`
        const stock = prod.stock_status === "instock" ? "✅ In Stock" : "❌ Out of Stock"
        const cleanDesc = prod.description ? prod.description.replace(/<[^>]*>?/gm, "").slice(0, 300) : "No description."

        return `🛍️ *${prod.name}* (ID: ${prod.id})\n💰 Price: ${priceStr}\n📦 Stock: ${stock}\n📝 Details: ${cleanDesc}\n🛒 Store Link: ${prod.permalink}`
      } catch (err: any) {
        return `Error fetching product details: ${err.message}`
      }
    },
  },
  {
    definition: {
      name: "send_woocommerce_product_card",
      description:
        "Send an interactive WhatsApp image/media card of a WooCommerce product directly to the customer's chat with product picture, price, stock status, and store link. " +
        "Call this when the customer asks to see a product photo or buy a specific product.",
      parameters: {
        type: "object",
        properties: {
          product_id_or_name: { type: "string", description: "Product ID or name" },
        },
        required: ["product_id_or_name"],
      },
    },
    handler: async ({ product_id_or_name }, ctx) => {
      if (!ctx.customerPhone) return "No customer phone number available."
      try {
        const { fetchWcProductById, fetchWcProducts } = await import("@/lib/woocommerce-client")
        let prod: any = null
        if (/^\d+$/.test(String(product_id_or_name))) {
          prod = await fetchWcProductById(product_id_or_name).catch(() => null)
        }
        if (!prod) {
          const search = await fetchWcProducts({ search: String(product_id_or_name), per_page: 1 }).catch(() => [])
          prod = search[0]
        }
        if (!prod) return `Product "${product_id_or_name}" not found.`

        const { sendMediaMessage, sendTextMessage } = await import("@/lib/whatsapp")
        const regPrice = prod.regular_price || prod.price || "0"
        const priceStr = prod.sale_price && Number(prod.sale_price) > 0 ? `~${regPrice} OMR~ *${prod.sale_price} OMR* (SALE!)` : `*${regPrice} OMR*`
        const stock = prod.stock_status === "instock" ? "In Stock" : "Out of Stock"
        const cleanDesc = prod.description ? prod.description.replace(/<[^>]*>?/gm, "").slice(0, 150) : ""

        const caption = `🛍️ *${prod.name}*\n💰 Price: ${priceStr}\n📦 Stock: ${stock}${cleanDesc ? `\n\n${cleanDesc}` : ""}\n\n🛒 Store Link: ${prod.permalink}`

        const imageUrl = prod.images?.[0]?.src
        if (imageUrl) {
          await sendMediaMessage({ to: ctx.customerPhone, type: "image", mediaUrl: imageUrl, caption })
        } else {
          await sendTextMessage(ctx.customerPhone, caption)
        }
        return `Product card for "${prod.name}" sent directly to the customer's WhatsApp chat.`
      } catch (err: any) {
        return `Failed to send product card: ${err.message}`
      }
    },
  },
  {
    definition: {
      name: "list_restaurant_menu",
      description:
        "List dining & restaurant menu categories and items with live prices. Call this when a customer asks to see the food/drinks menu, prices, or dining offerings.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Optional category name filter (e.g. Main Course, Desserts, Beverages)" },
        },
      },
    },
    handler: async ({ category }, ctx) => {
      const tenantId = (await db.conversation.findFirst({ where: { customerPhone: ctx.customerPhone } }))?.tenantId || ""
      const categories = await db.menuCategory.findMany({
        where: {
          tenantId: tenantId || undefined,
          isActive: true,
          ...(category ? { name: { contains: category, mode: "insensitive" } } : {}),
        },
        include: { items: { where: { isAvailable: true }, orderBy: { createdAt: "asc" } } },
        orderBy: { displayOrder: "asc" },
      })
      if (categories.length === 0) return "No menu items are currently listed."
      const list = categories.map(cat => {
        const items = cat.items.map(item => `   • *${item.name}* — ${item.price.toFixed(3)} ${item.currency}${item.description ? ` (${item.description})` : ""}`).join("\n")
        return `🍽️ *${cat.name}*:\n${items || "   (No items in this section)"}`
      }).join("\n\n")
      return `📋 *Restaurant Menu*:\n\n${list}`
    },
  },
  {
    definition: {
      name: "check_table_availability",
      description:
        "Check real-time dining table availability in the restaurant. Call this when the customer asks to reserve a table or check seating.",
      parameters: {
        type: "object",
        properties: {
          party_size: { type: "integer", description: "Number of guests / seats required" },
          section: { type: "string", description: "Optional section preference: MAIN, TERRACE, VIP, PATIO, BAR" },
        },
      },
    },
    handler: async ({ party_size, section }, ctx) => {
      const tenantId = (await db.conversation.findFirst({ where: { customerPhone: ctx.customerPhone } }))?.tenantId || ""
      const tables = await db.restaurantTable.findMany({
        where: {
          tenantId: tenantId || undefined,
          status: "AVAILABLE",
          ...(section ? { section: { contains: section, mode: "insensitive" } } : {}),
          ...(party_size ? { capacity: { gte: party_size } } : {}),
        },
        orderBy: { capacity: "asc" },
      })
      if (tables.length === 0) return "Currently, all matching tables are fully occupied or reserved. We can place you on the waiting list."
      const sections = [...new Set(tables.map(t => t.section))]
      return `🪑 We have *${tables.length} table${tables.length === 1 ? "" : "s"}* available (${sections.join(", ")}). Would you like to book for ${party_size || "your"} party?`
    },
  },
  {
    definition: {
      name: "check_hospital_services",
      description:
        // Named a real hospital group, which every workspace's assistant could
        // then repeat as its own. The tool is tenant-scoped and returns nothing
        // for a business that runs no wards, so the description must not assert
        // that this business is a hospital either.
        "Check this business's day-care bed availability and doctor consultations, if it runs any. Call this only when a patient or family member asks about bed booking or doctor appointments.",
      parameters: {
        type: "object",
        properties: {
          service_type: { type: "string", enum: ["chemo", "doctor", "all"], description: "Whether to check chemotherapy day care or doctor consultations" },
        },
      },
    },
    handler: async ({ service_type }) => {
      const doctors = await db.hospDoctor.findMany({ where: { isActive: true }, take: 5 })
      const docList = doctors.map(d => `• *${d.name}* (${d.specialization || "Oncologist"})`).join("\n")
      const chemoInfo = "🩺 *Chemotherapy Day Care:* 30 specialized infusion beds (Normal & Special Ward) with continuous oncology nursing care."
      if (service_type === "doctor") return `👨‍⚕️ *Available Oncologists:*\n${docList || "Oncology consultants on duty."}`
      if (service_type === "chemo") return `${chemoInfo}\n\nTo reserve a day-care bed, please provide your MRN (Medical Record Number) or preferred date.`
      return `${chemoInfo}\n\n👨‍⚕️ *Consultants on Duty:*\n${docList || "Consultants available."}`
    },
  },
  {
    definition: {
      name: "get_payment_link",
      description:
        "Generate a secure AmwalPay card payment link for an existing order or appointment reference. Call this when a customer asks to pay online or wants a payment link.",
      parameters: {
        type: "object",
        properties: {
          order_or_reference: { type: "string", description: "Order number (e.g. ORD-...) or appointment reference (e.g. APT-...)" },
        },
        required: ["order_or_reference"],
      },
    },
    handler: async ({ order_or_reference }, ctx) => {
      const ref = String(order_or_reference || "").trim()
      const origin = process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud"
      if (!ref) return "Please provide an order number or appointment reference."

      const order = await db.order.findFirst({
        where: { OR: [{ orderNumber: ref }, { id: ref }] },
      })
      if (order) {
        const link = `${origin}/api/amwalpay/create-session?orderId=${encodeURIComponent(order.id)}`
        return `💳 *Secure Payment Link for Order ${order.orderNumber}:*\n💰 Total: ${formatCurrency(order.totalAmount)}\n🔗 ${link}\n\n_Tap the link to pay securely with Debit/Credit card via AmwalPay._`
      }

      const apt = await db.appointment.findFirst({
        where: { OR: [{ reference: ref }, { id: ref }] },
      })
      if (apt) {
        const link = `${origin}/api/amwalpay/create-session?orderId=${encodeURIComponent(apt.reference)}`
        return `💳 *Secure Payment Link for Appointment ${apt.reference}:*\n🔗 ${link}\n\n_Tap the link to pay securely with Debit/Credit card via AmwalPay._`
      }

      return `Could not find an open booking for reference "${ref}". Please double-check the booking number.`
    },
  },
]

const TOOL_HANDLERS = new Map(TOOLS.map(t => [t.definition.name, t.handler]))

function anthropicTools(): Anthropic.Tool[] {
  return TOOLS.map(t => ({
    name: t.definition.name,
    description: t.definition.description,
    input_schema: t.definition.parameters as Anthropic.Tool.InputSchema,
  }))
}

function openaiTools() {
  return TOOLS.map(t => ({
    type: "function" as const,
    function: {
      name: t.definition.name,
      description: t.definition.description,
      parameters: t.definition.parameters,
    },
  }))
}

/**
 * What the model actually did this turn, as opposed to what it says it did.
 *
 * The assistant has repeatedly narrated an action instead of taking it — most
 * visibly by replying "here are some photos" without calling the tool that
 * sends them, so the customer received a sentence and no image. Recording the
 * calls lets the claim be checked against reality before the reply goes out.
 */
type TurnRecord = { photosSent: string[] }

async function runTool(name: string, input: any, customerPhone?: string, turn?: TurnRecord): Promise<string> {
  const handler = TOOL_HANDLERS.get(name)
  if (!handler) return `Unknown tool ${name}`
  try {
    if (name === "send_tour_photos" && turn) {
      const names = Array.isArray(input?.tour_names) ? input.tour_names : [input?.tour_names]
      turn.photosSent.push(...names.filter(Boolean).map(String))
    }
    return await handler(input, { customerPhone })
  } catch (error) {
    console.error(`Tool ${name} failed:`, error)
    return "That lookup failed. Tell the customer you'll check and come back to them."
  }
}

const HANDOFF_REPLY = "I'm having trouble responding right now. Let me connect you with a team member. 🙏"

// ─── Anthropic tool loop ───

async function chatAnthropic(
  messages: { role: "user" | "assistant"; content: string }[],
  system: string,
  model: string,
  customerPhone?: string,
  turn?: TurnRecord,
): Promise<string> {
  const client = await anthropicClient()
  const convo: Anthropic.MessageParam[] = messages.map(m => ({ role: m.role, content: m.content }))

  // Bounded so a misbehaving exchange can't loop forever on the webhook path.
  for (let round = 0; round < 6; round++) {
    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      system,
      tools: anthropicTools(),
      messages: convo,
    })

    if (response.stop_reason === "refusal") {
      return "I can't help with that one, but our team can. Let me connect you. 🙏"
    }

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    )

    if (toolUses.length === 0) {
      return response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map(b => b.text)
        .join("\n")
        .trim()
    }

    convo.push({ role: "assistant", content: response.content })

    const results: Anthropic.ToolResultBlockParam[] = []
    for (const use of toolUses) {
      results.push({
        type: "tool_result",
        tool_use_id: use.id,
        content: await runTool(use.name, use.input, customerPhone, turn),
      })
    }
    convo.push({ role: "user", content: results })
  }

  return "I'm still working on that — let me get a team member to help you. 🙏"
}

// ─── OpenAI tool loop ───

async function chatOpenAI(
  messages: { role: "user" | "assistant"; content: string }[],
  system: string,
  model: string,
  customerPhone?: string,
  turn?: TurnRecord,
): Promise<string> {
  const client = await openaiClient()
  const convo: any[] = [{ role: "system", content: system }, ...messages]

  for (let round = 0; round < 6; round++) {
    const response = await client.chat.completions.create({
      model,
      max_completion_tokens: 2048,
      tools: openaiTools(),
      messages: convo,
    })

    const choice = response.choices[0]
    const toolCalls = choice?.message?.tool_calls ?? []

    if (toolCalls.length === 0) {
      return (choice?.message?.content || "").trim()
    }

    convo.push(choice.message)

    for (const call of toolCalls) {
      // Arguments arrive as a JSON string and are model-generated, so a parse
      // failure is an expected outcome rather than an exception.
      let args: any = {}
      try {
        args = JSON.parse((call as any).function?.arguments || "{}")
      } catch {
        args = {}
      }
      convo.push({
        role: "tool",
        tool_call_id: call.id,
        content: await runTool((call as any).function?.name, args, customerPhone, turn),
      })
    }
  }

  return "I'm still working on that — let me get a team member to help you. 🙏"
}

// ─── AI Chat with function calling ───

/**
 * What the assistant knows about the person it is replying to.
 *
 * Without this the model has only the transcript to go on, and will happily
 * repeat an instruction from earlier in the conversation — which is how a
 * customer whose payment had already been received and whose booking was
 * already confirmed was asked to send a screenshot again, in the same sentence
 * that congratulated him on the confirmed booking.
 */
async function customerContext(customerPhone?: string): Promise<string> {
  if (!customerPhone) return ""

  const customer = await db.customer.findFirst({
    where: { phone: customerPhone },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { tour: true, slot: true, payments: true },
      },
    },
  })

  if (!customer) {
    return `\nAbout this customer:\n- WhatsApp number: ${customerPhone} (use this for bookings; never ask for it)\n- No previous bookings.`
  }

  const lines = [
    "\nAbout this customer:",
    `- Name: ${customer.name || "not given yet"}`,
    `- WhatsApp number: ${customer.phone} (use this for bookings; never ask for it)`,
    `- Email: ${customer.email || "not given yet"}`,
    `- Preferred language: ${customer.preferredLang || "en"}`,
    `- Lifetime: ${customer.totalBookings} bookings, ${customer.totalSpent.toFixed(3)} OMR`,
  ]

  if (customer.orders.length === 0) {
    lines.push("- No bookings yet.")
  } else {
    lines.push("\nTheir recent orders — trust this over anything earlier in the conversation:")
    for (const order of customer.orders) {
      const payment = order.payments[0]
      const proof = payment?.screenshotUrl ? "proof received" : "no proof yet"
      const outstanding =
        order.orderStatus === "CONFIRMED" || order.orderStatus === "COMPLETED"
          ? "PAID — do not ask for payment or a screenshot"
          : order.paymentStatus === "SUBMITTED" || payment?.status === "SUBMITTED"
            ? "payment under review — do not ask for another screenshot"
            : `awaiting payment (${proof})`
      lines.push(
        `- ${order.orderNumber}: ${order.tour.name} on ${order.slot.date.toISOString().slice(0, 10)} at ${order.slot.startTime}, ` +
        `${order.paxAdult} adults${order.paxChild ? ` + ${order.paxChild} children` : ""}, ` +
        `${order.totalAmount.toFixed(3)} OMR — status ${order.orderStatus}, ${outstanding}`,
      )
    }
  }

  return lines.join("\n")
}

export async function aiChat(
  messages: { role: "user" | "assistant"; content: string }[],
  customerLang: string = "en",
  customerPhone?: string,
): Promise<string> {
  const config = await getAIConfig()
  const key = config.provider === "openai" ? config.openaiKey : config.anthropicKey
  if (!key) {
    console.error(`No API key configured for provider "${config.provider}" — AI assistant unavailable`)
    return HANDOFF_REPLY
  }

  // Mirror whatever language the customer actually wrote in.
  const lastUserMsg = [...messages].reverse().find(m => m.role === "user")?.content || ""
  const isArabicMsg = /[\u0600-\u06FF]/.test(lastUserMsg)
  const langInstruction = isArabicMsg
    ? "CRITICAL LANGUAGE DIRECTIVE: The customer wrote in Arabic. You MUST reply ONLY in natural, warm Arabic (Omani / Gulf dialect). Do not reply in English under any circumstances."
    : (customerLang === "ar"
        ? "CRITICAL LANGUAGE DIRECTIVE: The customer's preferred language is Arabic. Reply warmly and naturally in Arabic unless they explicitly wrote in another language."
        : `CRITICAL LANGUAGE DIRECTIVE: Reply in the same language the customer just used (${customerLang || "English"}). Write the way a helpful colleague speaks: warm, direct, contractions are fine.`)

  const context = await customerContext(customerPhone)

  /*
   * Retrieve official verified business knowledge chunks directly into the prompt.
   * This guarantees that policies (e.g. cancellation notice, rules, training) are
   * accurately answered without depending on tool-calling latency or misses.
   */
  let retrievedKnowledge = ""
  try {
    const { searchKnowledge, knowledgeReady } = await import("@/lib/knowledge")
    if (await knowledgeReady() && lastUserMsg.trim()) {
      const chunks = await searchKnowledge(lastUserMsg, 5)
      if (chunks && chunks.length > 0) {
        retrievedKnowledge =
          "\n\n[OFFICIAL BUSINESS KNOWLEDGE BASE - VERIFIED FACTS]:\n" +
          chunks.map((c, i) => `--- Fact ${i + 1} (${c.title}):\n${c.content}`).join("\n\n") +
          "\n\nCRITICAL INSTRUCTION: Use the above verified official business facts to answer the customer accurately in their language. For questions regarding cancellations, refund notice period, training packages, working hours, or contact numbers, strictly adhere to these official facts."
      }
    }
  } catch (err) {
    console.error("Knowledge retrieval error in aiChat:", err)
  }

  /*
   * A tool the model does not know to reach for is a tool that never runs.
   *
   * Left to itself it answers a policy question from what it learned in
   * training, which sounds authoritative and is about a different company.
   * The instruction is only added when there is actually something indexed —
   * telling it to search an empty knowledge base would produce a round trip
   * and a shrug on every question.
   */
  let knowledgeNote = ""
  try {
    const { knowledgeReady } = await import("@/lib/knowledge")
    if (await knowledgeReady()) {
      knowledgeNote =
        "\n\nThe company's own policies, FAQs and documents are searchable with the search_knowledge tool. " +
        "For anything that is not booking data — cancellations, refunds, what to bring, age limits, accessibility, " +
        "payment terms, permits — search first and answer from what comes back. " +
        "If the search finds nothing, say you will check rather than inventing a policy. " +
        "An invented policy is remembered as a promise."
    }
  } catch { /* the assistant works without it, just less well */ }

  /*
   * Who the assistant is working for.
   */
  const identity = await businessIdentity()

  const system = `${ASSISTANT_SYSTEM_PROMPT}\n\n${identity}\n${langInstruction}\n${context}${knowledgeNote}${retrievedKnowledge}`


  const turn: TurnRecord = { photosSent: [] }

  try {
    const reply = config.provider === "openai"
      ? await chatOpenAI(messages, system, config.model, customerPhone, turn)
      : await chatAnthropic(messages, system, config.model, customerPhone, turn)

    // The model has repeatedly claimed to send photographs without calling the
    // tool that sends them. Prompting did not stop it, so the claim is checked:
    // if the reply says photos are coming and none were sent, they are sent.
    const claimsPhotos = /\b(photo|photos|picture|pictures|image|images)\b/i.test(reply)
    if (claimsPhotos && turn.photosSent.length === 0 && customerPhone) {
      const tours = await db.tour.findMany({ where: { status: "ACTIVE" }, select: { name: true } })
      // Whichever tours the reply actually names — usually one.
      const named = tours.filter(t => reply.toLowerCase().includes(t.name.toLowerCase().slice(0, 16))).map(t => t.name)
      if (named.length > 0) {
        console.log(`[photos] reply promised photos without sending; sending ${named.slice(0, 3).join(", ")}`)
        await runTool("send_tour_photos", { tour_names: named.slice(0, 3) }, customerPhone, turn)
      }
    }

    return reply
  } catch (error) {
    console.error("AI chat error:", error)
    return HANDOFF_REPLY
  }
}

// ─── Structured JSON helper (schema-constrained on both providers) ───

async function structuredJSON<T>(
  system: string,
  user: string,
  schema: Record<string, unknown>,
  schemaName: string,
): Promise<T | null> {
  const config = await getAIConfig()

  if (config.provider === "openai") {
    const client = await openaiClient()
    const response = await client.chat.completions.create({
      model: config.model,
      max_completion_tokens: 800,
      response_format: {
        type: "json_schema",
        json_schema: { name: schemaName, schema, strict: true },
      },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    })
    const text = response.choices[0]?.message?.content
    return text ? (JSON.parse(text) as T) : null
  }

  const client = await anthropicClient()
  const response = await client.messages.create({
    model: config.model,
    max_tokens: 800,
    output_config: { format: { type: "json_schema", schema } },
    system,
    messages: [{ role: "user", content: user }],
  })
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map(b => b.text)
    .join("")
  return text ? (JSON.parse(text) as T) : null
}

// ─── VLM: Analyze payment screenshot ───

export async function analyzePaymentScreenshot(
  imageUrl: string,
  expectedAmount: number,
  expectedCurrency: string = "OMR",
): Promise<{
  detectedAmount: number | null
  matchesExpected: boolean
  bankName: string | null
  referenceNumber: string | null
  transferDate: string | null
  fraudFlags: string[]
  confidence: number
  summary: string
}> {
  const failed = {
    detectedAmount: null,
    matchesExpected: false,
    bankName: null,
    referenceNumber: null,
    transferDate: null,
    fraudFlags: ["Analysis failed - manual review required"],
    confidence: 0,
    summary: "Automated analysis failed. Please review manually.",
  }

  if (!(await isAIConfigured())) return failed

  const instruction = `Analyse this bank transfer screenshot. Expected payment: ${expectedAmount} ${expectedCurrency}.\n\nReturn JSON:\n{"detectedAmount": number|null, "matchesExpected": boolean, "bankName": string|null, "referenceNumber": string|null, "transferDate": string|null, "fraudFlags": string[], "confidence": number, "summary": string}`
  const system = "You verify bank transfer screenshots. Return only valid JSON, no prose."

  try {
    const config = await getAIConfig()

    if (config.provider === "openai") {
      const client = await openaiClient()
      const response = await client.chat.completions.create({
        model: config.model,
        max_completion_tokens: 800,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: instruction },
              { type: "image_url", image_url: { url: imageUrl } },
            ] as any,
          },
        ],
      })
      const text = response.choices[0]?.message?.content || "{}"
      return JSON.parse(text.replace(/```json|```/g, "").trim())
    }

    const client = await anthropicClient()
    // Anthropic takes base64 as a structured source rather than a data URI.
    const dataUri = imageUrl.match(/^data:([^;]+);base64,(.+)$/)
    const imageBlock: Anthropic.ImageBlockParam = dataUri
      ? { type: "image", source: { type: "base64", media_type: dataUri[1] as any, data: dataUri[2] } }
      : { type: "image", source: { type: "url", url: imageUrl } }

    const response = await client.messages.create({
      model: config.model,
      max_tokens: 800,
      system,
      messages: [{ role: "user", content: [imageBlock, { type: "text", text: instruction }] }],
    })
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("")
    return JSON.parse(text.replace(/```json|```/g, "").trim())
  } catch (error) {
    console.error("VLM analysis error:", error)
    return failed
  }
}

// ─── Intent Detection ───

export type Intent = {
  intent: string
  confidence: number
  entities: Record<string, any>
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE"
  needsHumanHandoff: boolean
}

const INTENT_SCHEMA = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      enum: [
        "GREETING", "AVAILABILITY", "BOOKING", "PAYMENT", "ORDER_STATUS",
        "CANCEL", "RESCHEDULE", "INQUIRY", "COMPLAINT", "SUPPORT",
        "FAQ", "LIST_TOURS", "OPT_OUT", "OTHER",
      ],
    },
    confidence: { type: "number" },
    entities: {
      type: "object",
      properties: {
        tour: { type: "string" },
        date: { type: "string" },
        pax: { type: "integer" },
        order_id: { type: "string" },
      },
      required: ["tour", "date", "pax", "order_id"],
      additionalProperties: false,
    },
    sentiment: { type: "string", enum: ["POSITIVE", "NEUTRAL", "NEGATIVE"] },
    needsHumanHandoff: { type: "boolean" },
  },
  required: ["intent", "confidence", "entities", "sentiment", "needsHumanHandoff"],
  additionalProperties: false,
}

export async function detectIntent(message: string): Promise<Intent> {
  const fallback: Intent = {
    intent: "OTHER",
    confidence: 0,
    entities: {},
    sentiment: "NEUTRAL",
    needsHumanHandoff: false,
  }

  if (!(await isAIConfigured())) return fallback

  try {
    const result = await structuredJSON<Intent>(
      "You classify inbound WhatsApp messages for a tour booking bot. Set needsHumanHandoff when the customer explicitly asks for a person, is making a complaint, or raises something a booking bot cannot resolve. Leave unknown entity fields as empty strings or 0.",
      message,
      INTENT_SCHEMA,
      "intent",
    )
    return result ?? fallback
  } catch (error) {
    console.error("Intent detection error:", error)
    return fallback
  }
}

// ─── Smart Replies for agents ───

const SMART_REPLIES_SCHEMA = {
  type: "object",
  properties: { replies: { type: "array", items: { type: "string" } } },
  required: ["replies"],
  additionalProperties: false,
}

export async function generateSmartReplies(
  conversationMessages: { role: string; content: string }[],
): Promise<string[]> {
  if (!(await isAIConfigured())) return []

  try {
    const result = await structuredJSON<{ replies: string[] }>(
      "You suggest replies for a tour booking support agent. Give exactly 3 short, helpful, sendable replies, each under 150 characters.",
      JSON.stringify(conversationMessages.slice(-6)),
      SMART_REPLIES_SCHEMA,
      "smart_replies",
    )
    return Array.isArray(result?.replies) ? result.replies.slice(0, 3) : []
  } catch (error) {
    console.error("Smart replies error:", error)
    return []
  }
}

// ─── Connectivity test (Settings → AI) ───

export async function testAIConnection(prompt = "Reply with exactly: OK"): Promise<{
  ok: boolean
  provider: string
  model: string
  latencyMs: number
  reply?: string
  error?: string
}> {
  const config = await getAIConfig()
  const key = config.provider === "openai" ? config.openaiKey : config.anthropicKey
  const started = Date.now()

  if (!key) {
    return {
      ok: false,
      provider: config.provider,
      model: config.model,
      latencyMs: 0,
      error: `No API key set for ${config.provider}`,
    }
  }

  try {
    let reply = ""
    if (config.provider === "openai") {
      const client = await openaiClient()
      const response = await client.chat.completions.create({
        model: config.model,
        max_completion_tokens: 64,
        messages: [{ role: "user", content: prompt }],
      })
      reply = response.choices[0]?.message?.content || ""
    } else {
      const client = await anthropicClient()
      const response = await client.messages.create({
        model: config.model,
        max_tokens: 64,
        messages: [{ role: "user", content: prompt }],
      })
      reply = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map(b => b.text)
        .join("")
    }
    return {
      ok: true,
      provider: config.provider,
      model: config.model,
      latencyMs: Date.now() - started,
      reply: reply.trim().slice(0, 300),
    }
  } catch (error) {
    // Surface the vendor's own message — "model not found" and "invalid key"
    // need different fixes and the operator can only tell them apart if we
    // pass the real reason through.
    const message = error instanceof Error ? error.message : String(error)
    return {
      ok: false,
      provider: config.provider,
      model: config.model,
      latencyMs: Date.now() - started,
      error: message.slice(0, 400),
    }
  }
}

/**
 * Transcribes a voice note.
 *
 * Customers who cannot type comfortably — or are driving, or simply prefer it —
 * send voice notes, and until now the reply was "I can't listen to audio",
 * which is a dead end at the top of the funnel.
 *
 * Only OpenAI is used, whatever the configured provider: Anthropic has no
 * transcription endpoint, so an operator on Claude keeps their assistant and
 * gains transcription only if an OpenAI key is also present.
 */
export async function transcribeAudio(
  audio: Buffer,
  mimeType: string,
): Promise<{ text?: string; error?: string }> {
  const config = await getAIConfig()
  const key = config.openaiKey || process.env.OPENAI_API_KEY
  if (!key) return { error: "No OpenAI key is configured, and only OpenAI can transcribe audio" }

  try {
    const extension = mimeType.includes("mp4") || mimeType.includes("m4a") ? "m4a"
      : mimeType.includes("mpeg") || mimeType.includes("mp3") ? "mp3"
      : mimeType.includes("wav") ? "wav"
      : "ogg" // WhatsApp voice notes are opus in an ogg container
    const file = new File([new Uint8Array(audio)], `voice.${extension}`, { type: mimeType })

    const form = new FormData()
    form.append("file", file)
    form.append("model", "whisper-1")
    // No language is forced: customers here write and speak in Arabic, English,
    // Hindi and Urdu, and guessing wrong produces confident nonsense.
    form.append("response_format", "json")

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      console.error("Transcription failed:", response.status, detail.slice(0, 200))
      return { error: `Transcription service returned ${response.status}` }
    }

    const data = await response.json()
    const text = String(data.text || "").trim()
    return text ? { text } : { error: "Nothing could be made out in the recording" }
  } catch (error) {
    console.error("Transcription error:", error)
    return { error: "Could not reach the transcription service" }
  }
}


/**
 * The paragraph that tells the assistant whose business it is answering for.
 *
 * Built from the settings a business fills in about itself. Anything it has
 * not told us is simply absent — the assistant is never handed a plausible
 * guess, because a guess about a refund policy is repeated to a customer as a
 * commitment.
 */
async function businessIdentity(): Promise<string> {
  const { getConfigValue } = await import("@/lib/app-config")
  const [name, about, tone, phone, address, website] = await Promise.all([
    getConfigValue("business_name"),
    getConfigValue("business_about"),
    getConfigValue("business_tone"),
    getConfigValue("business_phone"),
    getConfigValue("business_address"),
    getConfigValue("business_website"),
  ])

  const lines: string[] = []
  if (name) lines.push(`You are answering on behalf of ${name}. Speak as them, never as a third party.`)
  if (about) lines.push(`About the business:\n${about}`)
  if (address) lines.push(`Address: ${address}`)
  if (phone) lines.push(`Contact number: ${phone}`)
  if (website) lines.push(`Website: ${website}`)
  if (tone) lines.push(`Tone to use: ${tone}`)

  try {
    const { TRAINING_COURSES } = await import("@/lib/training-flow")
    if (TRAINING_COURSES) {
      lines.push(
        `Horse Riding Training Packages (باقات تدريب ركوب الخيل):\n` +
        `- Women's Training (تدريب النساء): 90 OMR, 10 sessions, Sun & Tue, Coach Nouf (الكابتن نوف), Contact: +968 92009161\n` +
        `- Men's Training (تدريب الرجال): 90 OMR, 10 sessions, Sun & Tue, Coach Yahya (الكابتن يحيى), Contact: +968 92009161\n` +
        `- Kids' Training (تدريب الأطفال): 90 OMR, 10 sessions, Sun & Tue, Coach Yahya (الكابتن يحيى), Contact: +968 92009161`
      )
    }
  } catch {}

  lines.push(
    "Anything not stated above you do not know. Say you will check rather than " +
    "inventing a policy, a price or an opening time — an invented answer is remembered " +
    "as a promise.",
  )
  return lines.join("\n")
}
