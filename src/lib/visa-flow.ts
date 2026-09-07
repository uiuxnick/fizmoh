import { db } from "@/lib/db"
import { publish } from "@/lib/realtime"
import { Prisma } from "@prisma/client"
import { sendWhatsApp } from "@/lib/notifications"
import { sendInteractiveMessage } from "@/lib/whatsapp"
import { notifyStaff } from "@/lib/realtime"
import { getConfigValue } from "@/lib/app-config"
import { getBusinessHoursSettings, isWithinHours } from "@/lib/business-hours"

/**
 * Visa assistance over WhatsApp.
 *
 * Menu first, questions second. The previous version opened with seven
 * questions before a customer could reach a person, which is a good way to
 * lose somebody who only wanted to ask what it costs. Every screen here has a
 * way out to a consultant.
 *
 * Two things this deliberately never says.
 *
 * It does not promise approval. A visa is granted by an embassy, not by an
 * agency, and a bot that implies otherwise creates an expectation somebody
 * else has to break. The wording throughout is assistance, support and
 * processing.
 *
 * It does not ask for a passport number, a date of birth or a document scan.
 * Those are what an application needs, which is exactly why they do not belong
 * in a chat log and a database column. They are collected later, over a
 * channel meant to carry them.
 */

export type VisaStep =
  | "MENU"
  | "ASK_DESTINATION"
  | "ASK_PURPOSE"
  | "ASK_NATIONALITY"
  | "ASK_RESIDENCY"
  | "ASK_TRAVEL_DATE"
  | "ASK_TRAVELLERS"
  | "ASK_NAME"
  | "CONFIRM"
  | "ASK_REFERENCE"
  | "ASK_FREETEXT"

export type VisaState = {
  step: VisaStep
  enquiryType?: string
  destination?: string
  purpose?: string
  nationality?: string
  omanResident?: boolean
  travelDate?: string
  travellers?: number
  name?: string
  updatedAt: string
}

export type FlowContext = {
  conversationId: string
  customerId: string
  phone: string
}

const PREFIX = "vs_"

// ── What the customer is offered ─────────────────────────────────────────────

export const VISA_MENU = [
  { id: "APPLY", label: "Apply for a visa", blurb: "Start an application" },
  { id: "REQUIREMENTS", label: "Visa requirements", blurb: "What documents you need" },
  { id: "PRICING", label: "Price / package", blurb: "Service charges" },
  { id: "STATUS", label: "Application status", blurb: "Track an existing case" },
  { id: "CONSULTANT", label: "Speak to a consultant", blurb: "Talk to a person" },
  { id: "OTHER", label: "Other enquiry", blurb: "Something else" },
] as const

/** Exactly ten, which is every row a WhatsApp list allows. */
export const DESTINATIONS = [
  { id: "UK", label: "🇬🇧 United Kingdom" },
  { id: "USA", label: "🇺🇸 United States" },
  { id: "CANADA", label: "🇨🇦 Canada" },
  { id: "AUSTRALIA", label: "🇦🇺 Australia" },
  { id: "SCHENGEN", label: "🇪🇺 Schengen / Europe" },
  { id: "SAUDI", label: "🇸🇦 Saudi Arabia" },
  { id: "JAPAN", label: "🇯🇵 Japan" },
  { id: "SINGAPORE", label: "🇸🇬 Singapore" },
  { id: "MALAYSIA", label: "🇲🇾 Malaysia" },
  { id: "OTHER", label: "🌎 Another country" },
] as const

export const PURPOSES = [
  { id: "TOURISM", label: "Tourism" },
  { id: "BUSINESS", label: "Business" },
  { id: "FAMILY_VISIT", label: "Family / friend visit" },
  { id: "OTHER", label: "Other" },
] as const

/**
 * What each status means to the customer.
 *
 * Anything after submission is the embassy's to decide, and the wording says
 * so rather than implying the agency is deciding.
 */
export const VISA_STATUSES = [
  { id: "NEW", label: "New enquiry", customer: "🟡 We have your enquiry and are reviewing it." },
  { id: "DOCS_RECEIVED", label: "Documents received", customer: "🟡 Your documents have been received." },
  { id: "IN_PREPARATION", label: "Under preparation", customer: "🔵 Your application is being prepared." },
  { id: "SUBMITTED", label: "Submitted to embassy", customer: "🟣 Submitted. Processing time and the decision rest with the immigration authority." },
  { id: "APPROVED", label: "Approved", customer: "🟢 Approved. Our team will be in touch about collection." },
  { id: "DOCS_REQUIRED", label: "More documents needed", customer: "🔴 Additional documents are needed — our team will message you about what is missing." },
  { id: "CLOSED", label: "Closed", customer: "This case is closed. Message us any time to start a new one." },
] as const

export const destinationLabel = (id: string) => DESTINATIONS.find(d => d.id === id)?.label ?? id
export const purposeLabel = (id: string) => PURPOSES.find(p => p.id === id)?.label ?? id
export const statusLabel = (id: string) => VISA_STATUSES.find(s => s.id === id)?.label ?? id

/*
 * Whole words, and never a bare "visit" or "travel".
 *
 * "Do we visit the fort?" is a tour question. Matching it would drop somebody
 * into a visa form in the middle of asking about a day out.
 */
const TRIGGER = new RegExp(
  String.raw`\b(visas?|e-?visa)\b`
  + String.raw`|\b(entry|travel|tourist)\s+permits?\b`
  + String.raw`|تأشير|فيزا`,
  "i",
)

export function isVisaTrigger(text: string): boolean {
  return TRIGGER.test(text.trim())
}

export function isVisaReply(id?: string | null): boolean {
  return !!id && id.startsWith(PREFIX)
}

export async function visaEnabled(): Promise<boolean> {
  const value = (await getConfigValue("visa_enabled")) || ""
  return ["1", "true", "on", "yes", "enabled"].includes(value.trim().toLowerCase())
}

async function brand() {
  return {
    name: (await getConfigValue("visa_brand_name")) || "Travel Space",
    phone: (await getConfigValue("visa_contact_phone")) || "+968 99214140",
  }
}

// ── State ────────────────────────────────────────────────────────────────────

async function setState(conversationId: string, state: VisaState | null) {
  await db.conversation.update({
    where: { id: conversationId },
    // Prisma reads `undefined` as "leave unchanged", so clearing a Json column
    // needs DbNull or a finished enquiry could never be reset.
    data: { visaState: state ? JSON.stringify(state) : Prisma.DbNull },
  })
}

export async function getVisaState(conversationId: string): Promise<VisaState | null> {
  const convo = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { visaState: true },
  })
  const raw = convo?.visaState
  if (!raw) return null
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
    if (Date.now() - new Date(parsed.updatedAt).getTime() > 24 * 60 * 60 * 1000) return null
    return parsed as VisaState
  } catch {
    return null
  }
}

async function save(ctx: FlowContext, patch: Partial<VisaState> & { step: VisaStep }) {
  const current = (await getVisaState(ctx.conversationId)) || ({} as VisaState)
  await setState(ctx.conversationId, { ...current, ...patch, updatedAt: new Date().toISOString() })
}

async function logBot(ctx: FlowContext, content: string) {
  await db.message.create({
    data: {
      conversationId: ctx.conversationId,
      customerId: ctx.customerId,
      direction: "BOT",
      type: "INTERACTIVE",
      content,
      status: "SENT",
    },
  })
  await db.conversation.update({
    where: { id: ctx.conversationId },
    data: { lastMessageAt: new Date(), lastMessageText: content },
  })
  publish({ type: "message", conversationId: ctx.conversationId, direction: "BOT", preview: content.slice(0, 120) })
}

async function ask(ctx: FlowContext, body: string) {
  await sendWhatsApp({ to: ctx.phone, body, allowOutsideSession: true })
  await logBot(ctx, body)
}

function visaReference(): string {
  const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, "")
  return `TS-${stamp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

// ── Screens ──────────────────────────────────────────────────────────────────

export async function startVisaFlow(ctx: FlowContext): Promise<boolean> {
  if (!(await visaEnabled())) return false
  const { name } = await brand()
  await save(ctx, { step: "MENU" })

  const result = await sendInteractiveMessage({
    to: ctx.phone,
    headerText: `Welcome to ${name}`,
    body: `Your visa assistance partner in Oman. 🌍✈️\n\nHow can we help today?`,
    list: {
      title: "Choose",
      sections: [{
        title: "How can we help?",
        rows: VISA_MENU.map(m => ({ id: `${PREFIX}menu_${m.id}`, title: m.label.slice(0, 24), description: m.blurb })),
      }],
    },
    footerText: "Reply with a number if you prefer",
  })
  if (!result.success) {
    await ask(ctx, [
      `👋 Welcome to ${name}`,
      "Your visa assistance partner in Oman. 🌍✈️",
      "",
      ...VISA_MENU.map((m, i) => `${i + 1}️⃣ ${m.label}`),
      "",
      "Reply with the option number.",
    ].join("\n"))
    return true
  }
  await logBot(ctx, "Visa menu sent")
  return true
}

async function askDestination(ctx: FlowContext, enquiryType: string) {
  await save(ctx, { step: "ASK_DESTINATION", enquiryType })
  const result = await sendInteractiveMessage({
    to: ctx.phone,
    body: "Which country are you travelling to? 🌍",
    list: {
      title: "Destination",
      sections: [{ title: "Countries", rows: DESTINATIONS.map(d => ({ id: `${PREFIX}dest_${d.id}`, title: d.label.slice(0, 24) })) }],
    },
    footerText: "Not listed? Choose 'Another country' and type it.",
  })
  if (!result.success) {
    await ask(ctx, `Which country are you travelling to?\n\n${DESTINATIONS.map((d, i) => `${i + 1}. ${d.label}`).join("\n")}`)
    return
  }
  await logBot(ctx, "Destination list sent")
}

async function askPurpose(ctx: FlowContext) {
  await save(ctx, { step: "ASK_PURPOSE" })
  const result = await sendInteractiveMessage({
    to: ctx.phone,
    body: "What is the purpose of your travel?",
    buttons: PURPOSES.slice(0, 3).map(p => ({ id: `${PREFIX}purp_${p.id}`, title: p.label.slice(0, 20) })),
    footerText: "Something else? Just type it.",
  })
  if (!result.success) {
    await ask(ctx, `Purpose of travel?\n\n${PURPOSES.map((p, i) => `${i + 1}. ${p.label}`).join("\n")}`)
    return
  }
  await logBot(ctx, "Purpose asked")
}

/**
 * The three questions that decide everything else.
 *
 * Nationality, residency and travel date determine which consulate applies,
 * what evidence it wants and whether the date is even feasible. Sending a
 * document checklist before knowing them produces a list that is wrong for
 * most people who read it.
 */
async function askNationality(ctx: FlowContext) {
  await save(ctx, { step: "ASK_NATIONALITY" })
  await ask(ctx, "Which passport are you travelling on? (The country that issued it.) 🛂")
}

async function askResidency(ctx: FlowContext) {
  await save(ctx, { step: "ASK_RESIDENCY" })
  const result = await sendInteractiveMessage({
    to: ctx.phone,
    body: "Are you currently residing in Oman? 🇴🇲",
    buttons: [
      { id: `${PREFIX}res_yes`, title: "Yes" },
      { id: `${PREFIX}res_no`, title: "No" },
    ],
  })
  if (!result.success) await ask(ctx, "Are you currently residing in Oman? Reply Yes or No.")
  else await logBot(ctx, "Residency asked")
}

async function askTravelDate(ctx: FlowContext) {
  await save(ctx, { step: "ASK_TRAVEL_DATE" })
  await ask(ctx, "When do you plan to travel? 📅\n\nA date like 14/09/2026, or say *not sure*.")
}

async function askTravellers(ctx: FlowContext) {
  await save(ctx, { step: "ASK_TRAVELLERS" })
  await ask(ctx, "How many people are travelling? 👥")
}

async function askName(ctx: FlowContext) {
  await save(ctx, { step: "ASK_NAME" })
  await ask(ctx, "And your full name, as it appears on your passport? 👤")
}

async function askConfirm(ctx: FlowContext) {
  const state = await getVisaState(ctx.conversationId)
  if (!state) return
  await save(ctx, { step: "CONFIRM" })

  const summary = [
    "Please check these details:",
    "",
    `👤 ${state.name}`,
    `🛂 ${state.nationality} passport`,
    `🇴🇲 Residing in Oman: ${state.omanResident ? "Yes" : "No"}`,
    `🌍 ${destinationLabel(state.destination || "")}`,
    `🎯 ${purposeLabel(state.purpose || "TOURISM")}`,
    state.travelDate ? `📅 Travelling ${state.travelDate}` : "📅 Travel date: not yet decided",
    `👥 ${state.travellers} traveller${state.travellers === 1 ? "" : "s"}`,
    "",
    "Shall I send this to our visa team?",
  ].join("\n")

  const result = await sendInteractiveMessage({
    to: ctx.phone,
    body: summary,
    buttons: [
      { id: `${PREFIX}submit`, title: "Yes, send it" },
      { id: `${PREFIX}restart`, title: "Start again" },
      { id: `${PREFIX}consultant`, title: "Talk to someone" },
    ],
  })
  if (!result.success) await ask(ctx, `${summary}\n\nReply YES to send it.`)
  else await logBot(ctx, summary)
}

// ── Outcomes ─────────────────────────────────────────────────────────────────

async function submit(ctx: FlowContext) {
  const state = await getVisaState(ctx.conversationId)
  if (!state?.name || !state.nationality) return
  const { name: brandName, phone } = await brand()

  const enquiry = await db.visaEnquiry.create({
    data: {
      reference: visaReference(),
      name: state.name,
      nationality: state.nationality,
      destination: state.destination || "",
      purpose: state.purpose || "TOURISM",
      omanResident: state.omanResident ?? null,
      enquiryType: state.enquiryType || "APPLY",
      travellers: state.travellers ?? 1,
      arrivalDate: state.travelDate ? new Date(`${state.travelDate}T00:00:00+04:00`) : null,
      phone: ctx.phone,
      source: "WHATSAPP",
      customerId: ctx.customerId,
      conversationId: ctx.conversationId,
    },
  })

  await setState(ctx.conversationId, null)

  const kind = state.enquiryType === "PRICING"
    ? "Our consultant will send you the applicable visa assistance package and current charges."
    : state.enquiryType === "REQUIREMENTS"
      ? "Our consultant will send you the document checklist for your nationality and destination."
      : "Our consultant will review your details and come back with the requirements, processing time and charges."

  await ask(ctx, [
    "✅ Thank you — your enquiry has been received.",
    "",
    `🔖 Reference: ${enquiry.reference}`,
    "",
    kind,
    "",
    `📞 ${phone}`,
    "",
    `ℹ️ ${brandName} provides visa application assistance. The decision and processing time rest with the embassy or immigration authority.`,
    "",
    "⚠️ Please don't send passport photos or numbers here — we'll ask for documents securely when your application is ready.",
  ].join("\n"))

  await notifyStaff({
    type: "NEW_BOOKING",
    title: "New visa enquiry",
    message: `${enquiry.reference} · ${enquiry.name} · ${enquiry.nationality} → ${destinationLabel(enquiry.destination)} · ${enquiry.travellers} pax`,
    data: { visaEnquiryId: enquiry.id, conversationId: ctx.conversationId },
  })
}

/** Hands the conversation to a person, and says so honestly out of hours. */
async function toConsultant(ctx: FlowContext, note: string) {
  const { name: brandName } = await brand()
  await setState(ctx.conversationId, null)

  const settings = await getBusinessHoursSettings()
  const open = isWithinHours(settings)

  await ask(ctx, open
    ? `Of course. 👨‍💼\n\nA ${brandName} visa consultant will pick this up shortly. Which country do you need a visa for?`
    : `Thanks for contacting ${brandName}. Our team is offline at the moment. 🌙\n\nLeave your destination, nationality and travel date here and our visa team will reply during working hours.`)

  // The same two fields the AI's own handoff sets: the bot stops answering and
  // the conversation moves into the queue a person actually works from.
  await db.conversation.update({
    where: { id: ctx.conversationId },
    data: { botActive: false, status: "PENDING" },
  }).catch(() => {})

  await notifyStaff({
    type: "HANDOFF",
    title: open ? "Visa consultant requested" : "Visa enquiry — out of hours",
    message: `${ctx.phone}: ${note}`,
    data: { conversationId: ctx.conversationId },
  })
}

/** Looks up a case by reference, or by the number that is messaging us. */
async function lookupStatus(ctx: FlowContext, query: string) {
  const cleaned = query.trim()
  const enquiry = await db.visaEnquiry.findFirst({
    where: {
      OR: [
        { reference: { equals: cleaned, mode: "insensitive" } },
        { phone: { contains: cleaned.replace(/[\s()-]/g, "") } },
        { phone: ctx.phone },
      ],
    },
    orderBy: { createdAt: "desc" },
  })

  if (!enquiry) {
    await ask(ctx, "I couldn't find a case with that reference or number. Check the reference, or reply *consultant* and someone will look it up for you.")
    return
  }

  // Only ever to the number that owns the case.
  if (enquiry.phone && enquiry.phone !== ctx.phone) {
    await ask(ctx, "That reference belongs to a different number. For your security, please message from the number the application was made on, or reply *consultant*.")
    return
  }

  const status = VISA_STATUSES.find(s => s.id === enquiry.status) ?? VISA_STATUSES[0]
  await setState(ctx.conversationId, null)
  await ask(ctx, [
    `🔖 ${enquiry.reference}`,
    `🌍 ${destinationLabel(enquiry.destination)} · ${enquiry.travellers} traveller${enquiry.travellers === 1 ? "" : "s"}`,
    "",
    status.customer,
    "",
    "Reply *consultant* if you'd like to speak to someone.",
  ].join("\n"))
}

// ── Entry points ─────────────────────────────────────────────────────────────

async function chooseMenu(ctx: FlowContext, choice: string) {
  switch (choice) {
    case "APPLY":
    case "REQUIREMENTS":
    case "PRICING":
      await askDestination(ctx, choice)
      return
    case "STATUS":
      await save(ctx, { step: "ASK_REFERENCE", enquiryType: "STATUS" })
      await ask(ctx, "Sure — what's your reference number? 🔢\n\n(Or reply *my number* and I'll look up the case for this phone.)")
      return
    case "CONSULTANT":
      await toConsultant(ctx, "asked to speak to a consultant")
      return
    default:
      await save(ctx, { step: "ASK_FREETEXT", enquiryType: "OTHER" })
      await ask(ctx, "Of course — type your question below and our team will help. ✍️")
  }
}

export async function handleVisaReply(ctx: FlowContext, replyId: string): Promise<boolean> {
  const state = await getVisaState(ctx.conversationId)
  if (!state) return false
  const value = replyId.slice(PREFIX.length)

  if (value.startsWith("menu_")) { await chooseMenu(ctx, value.slice(5)); return true }

  if (value.startsWith("dest_")) {
    await save(ctx, { step: "ASK_PURPOSE", destination: value.slice(5) })
    await askPurpose(ctx)
    return true
  }

  if (value.startsWith("purp_")) {
    await save(ctx, { step: "ASK_NATIONALITY", purpose: value.slice(5) })
    await askNationality(ctx)
    return true
  }

  if (value === "res_yes" || value === "res_no") {
    await save(ctx, { step: "ASK_TRAVEL_DATE", omanResident: value === "res_yes" })
    await askTravelDate(ctx)
    return true
  }

  if (value === "submit") { await submit(ctx); return true }
  if (value === "restart") { await startVisaFlow(ctx); return true }
  if (value === "consultant") { await toConsultant(ctx, "asked for a consultant while confirming details"); return true }

  return false
}

export async function handleVisaText(ctx: FlowContext, text: string): Promise<boolean> {
  const state = await getVisaState(ctx.conversationId)
  if (!state) return false

  const value = text.trim()
  const skipped = /^(skip|none|not sure|unsure|don'?t know|no idea)$/i.test(value)

  // An escape hatch at every step. Nobody should be trapped in a form.
  if (/^(cancel|stop|quit|exit)$/i.test(value)) {
    await setState(ctx.conversationId, null)
    await ask(ctx, "No problem — nothing sent. Message us any time. 👋")
    return true
  }
  if (/^(consultant|agent|human|person|staff|talk|call)/i.test(value)) {
    await toConsultant(ctx, `typed "${value.slice(0, 60)}"`)
    return true
  }
  if (/^(menu|back|start over|restart)$/i.test(value)) {
    await startVisaFlow(ctx)
    return true
  }

  switch (state.step) {
    case "MENU": {
      const byNumber = VISA_MENU[Number(value) - 1]
      const byName = VISA_MENU.find(m => m.label.toLowerCase().includes(value.toLowerCase()) && value.length > 2)
      if (!byNumber && !byName) {
        await ask(ctx, "Reply with a number from 1 to 6, or *consultant* to talk to someone.")
        return true
      }
      await chooseMenu(ctx, (byNumber || byName)!.id)
      return true
    }

    case "ASK_DESTINATION": {
      const byNumber = DESTINATIONS[Number(value) - 1]
      const byName = DESTINATIONS.find(d => d.label.toLowerCase().includes(value.toLowerCase()) && value.length > 2)
      // A country nobody listed is still a country; it is kept as typed.
      const destination = byNumber?.id || byName?.id || value.slice(0, 80)
      await save(ctx, { step: "ASK_PURPOSE", destination })
      await askPurpose(ctx)
      return true
    }

    case "ASK_PURPOSE": {
      const byNumber = PURPOSES[Number(value) - 1]
      const byName = PURPOSES.find(p => p.label.toLowerCase().includes(value.toLowerCase()) && value.length > 2)
      await save(ctx, { step: "ASK_NATIONALITY", purpose: (byNumber || byName)?.id ?? "OTHER" })
      await askNationality(ctx)
      return true
    }

    case "ASK_NATIONALITY": {
      if (value.length < 2) { await ask(ctx, "Which country issued your passport?"); return true }
      await save(ctx, { step: "ASK_RESIDENCY", nationality: value.slice(0, 80) })
      await askResidency(ctx)
      return true
    }

    case "ASK_RESIDENCY": {
      const yes = /^(y|yes|yeah|resident|i am|نعم)/i.test(value)
      const no = /^(n|no|not|لا)/i.test(value)
      if (!yes && !no) { await ask(ctx, "Are you currently residing in Oman? Reply Yes or No."); return true }
      await save(ctx, { step: "ASK_TRAVEL_DATE", omanResident: yes })
      await askTravelDate(ctx)
      return true
    }

    case "ASK_TRAVEL_DATE": {
      if (skipped) { await askTravellers(ctx); return true }
      const { parseCustomerDate } = await import("@/lib/booking-flow")
      const parsed = parseCustomerDate(value)
      if (!parsed) { await ask(ctx, "I couldn't read that date — try 14/09/2026, or say *not sure*."); return true }
      await save(ctx, { step: "ASK_TRAVELLERS", travelDate: parsed })
      await askTravellers(ctx)
      return true
    }

    case "ASK_TRAVELLERS": {
      const count = parseInt(value.replace(/\D/g, ""), 10)
      if (!count || count < 1 || count > 50) {
        await ask(ctx, "How many people, as a number? For a group of more than 50, reply *consultant* and we'll handle it directly.")
        return true
      }
      await save(ctx, { step: "ASK_NAME", travellers: count })
      await askName(ctx)
      return true
    }

    case "ASK_NAME": {
      if (value.length < 2) { await ask(ctx, "Sorry — what name should I put on the enquiry?"); return true }
      // A passport number looks like a name to a form, and must not be stored.
      if (/\b[A-Z]{1,2}\d{6,9}\b/i.test(value)) {
        await ask(ctx, "That looks like a passport number — please don't send it here. Just your name is fine. 🙏")
        return true
      }
      await save(ctx, { step: "CONFIRM", name: value.slice(0, 120) })
      await askConfirm(ctx)
      return true
    }

    case "CONFIRM": {
      if (/^(yes|y|yep|send|ok|okay|confirm|نعم)$/i.test(value)) { await submit(ctx); return true }
      if (/^(no|restart|again|change)/i.test(value)) { await startVisaFlow(ctx); return true }
      await ask(ctx, "Reply *yes* to send it, *menu* to start again, or *consultant* to talk to someone.")
      return true
    }

    case "ASK_REFERENCE": {
      await lookupStatus(ctx, /my number/i.test(value) ? ctx.phone : value)
      return true
    }

    case "ASK_FREETEXT": {
      await toConsultant(ctx, value.slice(0, 200))
      return true
    }

    default:
      return false
  }
}
