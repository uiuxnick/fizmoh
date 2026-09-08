/**
 * Guided WhatsApp booking flow.
 *
 * Mirrors the booking simulator on the marketing site, but every step reads
 * and writes real data: live tours, real slot availability, a real order, and
 * a real AmwalPay checkout link.
 *
 * The flow is driven by interactive replies (buttons and list selections)
 * whose ids are namespaced `bk_`, so the webhook can route them here without
 * ambiguity. Free text is only consumed at the steps that ask for it (name,
 * email); anything else falls through to the AI assistant.
 *
 * State lives on Conversation.bookingState — WhatsApp gives us no session, so
 * position in the flow has to be durable across separate webhook deliveries.
 */

import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { overrideForEnglish, primeBotMessages } from "@/lib/bot-messages"
import { sendInteractiveMessage } from "@/lib/whatsapp"
import { sendWhatsApp } from "@/lib/notifications"
import { sendCtaUrlMessage } from "@/lib/whatsapp"
import { publish } from "@/lib/realtime"
import { formatCurrency, formatDate, generateOrderNumber } from "@/lib/helpers"
import { syncOrderToCalendar } from "@/lib/google-calendar"

export type BookingStep =
  | "AWAITING_CHOICE"
  | "SHOW_TOURS"
  | "AWAITING_DATE"
  | "AWAITING_CUSTOM_DATE"
  | "SHOW_SLOTS"
  | "ASK_LANG"
  | "ASK_TERMS"
  | "AWAITING_PAX"
  | "AWAITING_CUSTOM_PAX"
  | "AWAITING_CHILDREN"
  | "AWAITING_INFANTS"
  | "ASK_NAME"
  | "ASK_EMAIL"
  | "ASK_PAYMENT"
  | "AWAITING_SCREENSHOT"
  | "DONE"

export type BookingState = {
  step: BookingStep
  lang?: Lang
  /*
   * Whether the customer picked the language themselves.
   *
   * `lang` cannot answer that: save() always writes one, defaulting to "en",
   * so a stored language proves only that the flow has run before. Gating the
   * chooser on it meant the question was asked once and then silently skipped
   * for the rest of that conversation's state.
   */
  langChosen?: boolean
  tourId?: string
  slotId?: string
  date?: string // ISO yyyy-mm-dd
  pax?: number
  children?: number
  infants?: number
  name?: string
  email?: string
  orderId?: string
  updatedAt: string
}

export type FlowContext = {
  tenantId: string
  conversationId: string
  customerId: string
  phone: string
  /** Which language to answer in. Resolved once at each entry point. */
  lang?: Lang
}

/**
 * The two languages this flow speaks.
 *
 * Al Bahr Stable's customers write in Arabic and their old bot opened with a
 * language choice; ours answered every one of them in English, which made a
 * bilingual business look like an English-only one. The language is decided
 * from what the customer actually wrote, remembered for the conversation, and
 * used for every message after it.
 */
export type Lang = "en" | "ar"

const ARABIC_SCRIPT = /[\u0600-\u06FF]/

export function detectLang(text?: string | null): Lang | undefined {
  if (!text) return undefined
  return ARABIC_SCRIPT.test(text) ? "ar" : "en"
}

/**
 * `const t = L(ctx)` then `t("English", "العربية")`.
 *
 * Consults the workspace's own wording first. The overrides are matched on the
 * built-in English text, which is what makes every one of these call sites
 * editable without rewriting them: the catalogue in bot-messages.ts holds the
 * same defaults, so a match there is a line the business has customised.
 */
function L(ctx: FlowContext): (en: string, ar: string) => string {
  const arabic = ctx.lang === "ar"
  const lang: Lang = arabic ? "ar" : "en"
  const tenantId = ctx.tenantId
  return (en, ar) => {
    const custom = overrideForEnglish(tenantId, en, lang)
    return custom ?? (arabic ? ar : en)
  }
}

/** A tour's name in the customer's language, falling back to the original. */
function tourLabel(ctx: FlowContext, tour: { name: string; nameAr?: string | null }): string {
  return ctx.lang === "ar" && tour.nameAr ? tour.nameAr : tour.name
}

const PREFIX = "bk_"

/** Trigger words that start the guided flow from free text. */
const START_WORDS = ["book", "booking", "hi", "hello", "hey", "start", "menu", "مرحبا", "حجز"]

export function isFlowTrigger(text: string): boolean {
  const t = text.trim().toLowerCase().replace(/[!.،,]/g, "")
  return START_WORDS.includes(t)
}

export function isFlowReply(id?: string | null): boolean {
  if (!id) return false
  return (
    id.startsWith(PREFIX) ||
    id.startsWith("tour_") ||
    id.startsWith("slot_") ||
    id.startsWith("train_") ||
    id.includes("train_")
  )
}

export async function setState(conversationId: string, state: BookingState | null) {
  await db.conversation.update({
    where: { id: conversationId },
    // Prisma treats `undefined` as "leave unchanged" — clearing a Json column
    // needs DbNull, otherwise the flow could never actually be reset.
    data: { bookingState: state ? JSON.stringify(state) : Prisma.DbNull },
  })
}

export async function getState(conversationId: string): Promise<BookingState | null> {
  const convo = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { bookingState: true },
  })
  const raw = convo?.bookingState
  if (!raw) return null
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
    // Abandon a half-finished flow after 24h rather than resuming mid-way
    // into a conversation the customer has long since moved on from.
    if (Date.now() - new Date(parsed.updatedAt).getTime() > 24 * 60 * 60 * 1000) return null
    return parsed as BookingState
  } catch {
    return null
  }
}

async function save(ctx: FlowContext, patch: Partial<BookingState> & { step: BookingStep }) {
  const current = (await getState(ctx.conversationId)) || ({} as BookingState)
  await setState(ctx.conversationId, {
    ...current,
    lang: ctx.lang ?? current.lang,
    ...patch,
    updatedAt: new Date().toISOString(),
  })
}

/**
 * Answer in the language the conversation is already being held in.
 *
 * The opening message decides it; every later turn reuses it, so a customer
 * who greets in Arabic and then taps a button — which carries no language of
 * its own — is not switched to English half way through a booking.
 */
async function withLang(ctx: FlowContext, message?: string | null): Promise<FlowContext> {
  // Every handled message passes through here, which makes it the one place
  // the workspace's wording needs loading before the sync `t()` helper reads it.
  await primeBotMessages(ctx.tenantId)
  if (ctx.lang) return ctx
  const saved = (await getState(ctx.conversationId))?.lang
  return { ...ctx, lang: saved ?? detectLang(message) ?? "en" }
}

/** Record what we sent so the agent inbox shows the same thread the customer sees. */
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

function targetDate(which: "today" | "tomorrow"): { start: Date; end: Date } {
  const start = new Date()
  if (which === "tomorrow") start.setDate(start.getDate() + 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

/**
 * Extra buttons on the opening menu, defined by the workspace.
 *
 * A stable wanted "Training" alongside "Browse Tours", but wiring that name in
 * would put one workspace's vocabulary in front of everyone else's customers —
 * the same mistake as the hard-coded concierge name. Workspaces set
 * `menu_shortcuts` to a JSON array instead:
 *
 *   [{ "title": "🎓 Training", "category": "education" }]
 *
 * WhatsApp allows three reply buttons and the menu already uses two, so only
 * the first shortcut is shown. Anything malformed is ignored rather than
 * breaking the greeting.
 */
type MenuShortcut = { title: string; category: string }

async function menuShortcuts(): Promise<MenuShortcut[]> {
  const { getConfigValue } = await import("@/lib/app-config")
  const raw = await getConfigValue("menu_shortcuts").catch(() => "")
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((v: any) => ({
        // Meta rejects the whole message if a button title exceeds 20 chars.
        title: String(v?.title ?? "").trim().slice(0, 20),
        category: String(v?.category ?? "").trim(),
      }))
      .filter(v => v.title && v.category)
  } catch {
    return []
  }
}

/**
 * What one adult seat costs, for this party size.
 *
 * A tour may publish a group rate — Al Bahr Stable advertises 12 OMR for one
 * rider and 10 OMR each for more than one — and it was stored but never read,
 * so every party was quoted the single-rider price and the advertised offer
 * did not exist in practice. A slot's own price override still wins, because
 * that is set for one date deliberately.
 */
function adultUnitPrice(
  tour: { basePrice: number; groupPrice?: number | null },
  slot: { priceOverride?: number | null },
  pax: number,
): number {
  if (slot.priceOverride != null) return slot.priceOverride
  if (pax > 1 && tour.groupPrice != null && tour.groupPrice > 0) return tour.groupPrice
  return tour.basePrice
}

/**
 * The tax rate to add to a booking, as a percentage.
 *
 * 5% was hard-coded — correct for Oman, wrong for every workspace outside it,
 * and it reached the customer twice: in the quoted total and in the order.
 * Workspaces set `vat_rate` (a percentage, e.g. 5 or 0); Oman's rate stays the
 * default so nothing changes for the tenants running today.
 */
const DEFAULT_VAT_PERCENT = 5

async function vatRate(): Promise<number> {
  const { getConfigValue } = await import("@/lib/app-config")
  const raw = String((await getConfigValue("vat_rate").catch(() => "")) ?? "").trim().replace("%", "")
  // `Number("")` is 0, not NaN — so an unset rate has to be caught before the
  // range check, or "no VAT configured" silently becomes "charge no VAT".
  if (!raw) return DEFAULT_VAT_PERCENT / 100
  const pct = Number(raw)
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return DEFAULT_VAT_PERCENT / 100
  return pct / 100
}

/**
 * Whose business this conversation belongs to.
 *
 * The concierge introduced herself as "Najwa, your Oman Adventures concierge"
 * and every list carried "Oman Adventures" in its footer — to the customers of
 * whichever workspace happened to be running the flow. The name comes from the
 * workspace now, and falls back to its own record rather than to a stand-in,
 * so a business that has not filled in a display name still sees itself.
 *
 * The assistant's name is configurable for the same reason: Najwa works for
 * one stable.
 */
async function identity(tenantId: string): Promise<{ business: string; assistant: string }> {
  const { getConfigValue } = await import("@/lib/app-config")
  const [configured, assistant] = await Promise.all([
    getConfigValue("business_name").catch(() => ""),
    getConfigValue("assistant_name").catch(() => ""),
  ])
  let business = (configured || "").trim()
  if (!business) {
    const { raw } = await import("@/lib/db")
    business = (await raw.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }))?.name || ""
  }
  return { business: business.trim(), assistant: (assistant || "").trim() }
}

// ─── Step 1: greeting ───

/**
 * A workspace's own wording for one of the bot's messages.
 *
 * Loaded per call rather than cached: these are edited from the panel and an
 * operator who changes a line expects the next customer to see it, not the one
 * after a cache expires.
 */
async function botText(ctx: FlowContext, key: string, vars: Record<string, string | number> = {}): Promise<string> {
  const { loadBotMessages, renderBotMessage } = await import("@/lib/bot-messages")
  const overrides = await loadBotMessages()
  return renderBotMessage(overrides, key, (ctx.lang ?? "en") as "en" | "ar", vars)
}

export async function startBookingFlow(rawCtx: FlowContext, message?: string) {
  await primeBotMessages(rawCtx.tenantId)
  const existing = await getState(rawCtx.conversationId)
  const chosen = existing?.langChosen ? existing.lang : undefined
  const ctx = { ...rawCtx, lang: chosen ?? detectLang(message) ?? rawCtx.lang ?? "en" }

  /*
   * The language is asked once, before anything else.
   *
   * Guessing it from the opening message is unreliable — an emoji, a sticker or
   * a bare "hi" carries no language at all — and every later step then commits
   * to that guess. Asking costs one tap and makes the rest of the conversation
   * certain.
   */
  if (!chosen) {
    const { business } = await identity(ctx.tenantId)
    const { loadBotMessages, renderBotMessage } = await import("@/lib/bot-messages")
    const msgs = await loadBotMessages()
    // The opening is shown in both languages, because which one they read is
    // exactly what is not known yet.
    const line = (key: string) => [
      renderBotMessage(msgs, key, "en", { business }),
      renderBotMessage(msgs, key, "ar", { business }),
    ]
    const [welcomeEn, welcomeAr] = line("welcome")
    const [promptEn, promptAr] = line("language_prompt")

    await sendInteractiveMessage({
      to: ctx.phone,
      body: `${welcomeEn}\n${welcomeAr}\n\n${promptEn}\n${promptAr}`,
      buttons: [
        { id: `${PREFIX}lang_en`, title: renderBotMessage(msgs, "language_button_en", "en").slice(0, 20) },
        { id: `${PREFIX}lang_ar`, title: renderBotMessage(msgs, "language_button_ar", "ar").slice(0, 20) },
      ],
    })
    await logBot(ctx, "Asked for language")
    await save(ctx, { step: "ASK_LANG" })
    return
  }

  await showMainMenu(ctx)
}

/** The menu, once the language is known. */
async function showMainMenu(ctx: FlowContext) {
  const { business } = await identity(ctx.tenantId)
  const t = L(ctx)
  const greeting = await botText(ctx, "greeting", { business })
  await sendWhatsApp({ to: ctx.phone, body: greeting, allowOutsideSession: true })

  const shortcuts = await menuShortcuts()

  await sendInteractiveMessage({
    to: ctx.phone,
    body: await botText(ctx, "menu_prompt"),
    buttons: [
      { id: `${PREFIX}browse`, title: (await botText(ctx, "menu_browse_button")).slice(0, 20) },
      ...shortcuts.slice(0, 1).map((sc, i) => ({ id: `${PREFIX}cat_${i}`, title: sc.title })),
    ],
  })

  await logBot(ctx, `${greeting} Choose an option`)
  await save(ctx, { step: "AWAITING_CHOICE" })
}

// ─── Step 2: tour list ───

/**
 * WhatsApp allows ten rows in a list message, counted across every section —
 * not ten per section. The search row is one of them, so nine tours fit beside
 * it. Exceeding this rejects the whole message with "Total row count exceed max
 * allowed count: 10" and the customer sees nothing at all.
 */
const LIST_ROW_LIMIT = 10

async function showTours(ctx: FlowContext, shortcut?: MenuShortcut) {
  const tl = L(ctx)
  const footer = (await identity(ctx.tenantId)).business || undefined
  // A shortcut narrows the catalogue to one category. Categories are entered
  // by hand ("education", "Adventure"), so the match ignores case.
  const tours = await db.tour.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: "ACTIVE",
      ...(shortcut ? { category: { equals: shortcut.category, mode: "insensitive" as const } } : {}),
    },
    orderBy: [{ featured: "desc" }, { rating: "desc" }],
    take: LIST_ROW_LIMIT - 1,
  })

  // A shortcut that matches nothing must not dead-end the customer: fall back
  // to the full catalogue rather than telling them there is nothing to book.
  if (shortcut && tours.length === 0) {
    await sendWhatsApp({
      to: ctx.phone,
      body: L(ctx)(`Nothing under ${shortcut.title} right now — here is everything we run.`, `لا يوجد شيء ضمن ${shortcut.title} حالياً — إليك كل ما نقدمه.`),
      allowOutsideSession: true,
    })
    return showTours(ctx)
  }

  if (tours.length === 0) {
    await sendWhatsApp({ to: ctx.phone, body: tl("No tours are available right now. Please try again later.", "لا توجد جولات متاحة حالياً. يرجى المحاولة لاحقاً."), allowOutsideSession: true })
    await setState(ctx.conversationId, null)
    return
  }

  const result = await sendInteractiveMessage({
    to: ctx.phone,
    headerText: shortcut ? shortcut.title : tl("Our Experiences", "تجاربنا"),
    body: shortcut
      ? tl("Tap to select:", "اختر من القائمة:")
      : tl("Here are our top-rated experiences ✨ Tap a tour to select:", "إليك أفضل تجاربنا ✨ اختر جولة من القائمة:"),
    footerText: footer,
    list: {
      title: tl("View tours", "عرض الجولات"),
      sections: [
        {
          // WhatsApp list messages have no search box — Meta does not provide
          // one and it cannot be added. This row is the substitute: it invites
          // the customer to type what they are after, which the assistant then
          // searches on. Placed first so it is visible without scrolling.
          title: tl("Find a tour", "ابحث عن جولة"),
          rows: [{
            id: `${PREFIX}search`,
            title: tl("🔍 Search tours", "🔍 ابحث عن جولة"),
            description: tl("Type what you're looking for — desert, diving, a city", "اكتب ما تبحث عنه — صحراء، غوص، مدينة"),
          }],
        },
        {
          title: tl("Available tours", "الجولات المتاحة"),
          rows: tours.map(t => ({
            id: `${PREFIX}tour_${t.id}`,
            // Meta caps row titles at 24 chars and descriptions at 72 —
            // exceeding either rejects the entire message.
            title: tourLabel(ctx, t).slice(0, 24),
            description: `${formatCurrency(t.basePrice)} · ${t.durationHours}h · ${t.city}`.slice(0, 72),
          })),
        },
      ],
    },
  })

  if (!result.success) {
    await sendWhatsApp({ to: ctx.phone, body: tl("Sorry, I couldn't load the tour list. Please try again.", "عذراً، تعذر تحميل قائمة الجولات. يرجى المحاولة مرة أخرى."), allowOutsideSession: true })
    return
  }

  await logBot(ctx, "Here are our top-rated experiences — tap a tour to select")
  await save(ctx, { step: "SHOW_TOURS" })
}

// ─── Step 3: date ───

/** Dates in the next 60 days that actually have a bookable seat. */
async function availableDates(tenantId: string, tourId: string, limit = 9) {
  const from = new Date()
  from.setHours(0, 0, 0, 0)
  const until = new Date(from)
  until.setDate(until.getDate() + 60)

  const slots = await db.slot.findMany({
    where: { tenantId, tourId, status: "OPEN", date: { gte: from, lt: until } },
    orderBy: { date: "asc" },
    select: { date: true, capacity: true, seatsBooked: true, seatsHeld: true },
  })

  const byDay = new Map<string, number>()
  for (const s of slots) {
    const seats = s.capacity - s.seatsBooked - s.seatsHeld
    if (seats <= 0) continue
    const key = s.date.toISOString().slice(0, 10)
    byDay.set(key, (byDay.get(key) ?? 0) + seats)
  }

  return [...byDay.entries()].slice(0, limit).map(([iso, seats]) => ({ iso, seats }))
}

function dayLabel(iso: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = tomorrowDate.toISOString().slice(0, 10)
  if (iso === today) return "Today"
  if (iso === tomorrow) return "Tomorrow"
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

async function askDate(ctx: FlowContext, tourId: string) {
  const td = L(ctx)
  const footer = (await identity(ctx.tenantId)).business || undefined
  const tour = await db.tour.findFirst({ where: { id: tourId, tenantId: ctx.tenantId } })
  if (!tour) return startBookingFlow(ctx)

  const dates = await availableDates(ctx.tenantId, tourId)

  if (dates.length === 0) {
    await sendInteractiveMessage({
      to: ctx.phone,
      body: td(`Sorry, ${tourLabel(ctx, tour)} has no availability in the next 60 days.`, `عذراً، لا تتوفر مواعيد لـ ${tourLabel(ctx, tour)} خلال الستين يوماً القادمة.`),
      buttons: [{ id: `${PREFIX}browse`, title: td("🐪 Other tours", "🐪 جولات أخرى") }],
    })
    await logBot(ctx, `${tour.name} — no availability`)
    return
  }

  // Only dates with real seats are offered, so a customer can never pick a
  // day and then be told it is full. "Another date" covers anything further
  // out than the list.
  await sendInteractiveMessage({
    to: ctx.phone,
    headerText: tourLabel(ctx, tour).slice(0, 60),
    body: td(
      `Great choice! 🐪 ${tourLabel(ctx, tour)} — ${formatCurrency(tour.basePrice)}/person.\n\nWhich date?`,
      `اختيار موفق! 🐪 ${tourLabel(ctx, tour)} — ${formatCurrency(tour.basePrice)} للبالغ.\n\nما التاريخ المناسب؟`,
    ),
    footerText: footer,
    list: {
      title: td("Choose a date", "اختر التاريخ"),
      sections: [
        {
          title: td("Available dates", "التواريخ المتاحة"),
          rows: [
            ...dates.map(d => ({
              id: `${PREFIX}day_${d.iso}`,
              title: dayLabel(d.iso).slice(0, 24),
              description: td(`${d.seats} seat${d.seats === 1 ? "" : "s"} available`, `${d.seats} مقعد متاح`).slice(0, 72),
            })),
            { id: `${PREFIX}day_other`, title: td("📅 Another date", "📅 تاريخ آخر"), description: td("Type any date you like", "اكتب أي تاريخ تريده") },
          ],
        },
      ],
    },
  })

  await logBot(ctx, `${tour.name} selected — showing ${dates.length} available dates`)
  await save(ctx, { step: "AWAITING_DATE", tourId })
}

/**
 * Parse a customer-typed date. Deliberately forgiving about format but strict
 * about range: WhatsApp users write "15/8", "15 aug", "2026-08-15" and
 * "tomorrow" interchangeably.
 */
export function parseCustomerDate(text: string, now = new Date()): string | null {
  const raw = text.trim().toLowerCase()

  if (raw === "today") return now.toISOString().slice(0, 10)
  if (raw === "tomorrow") {
    const d = new Date(now)
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  }

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (iso) return build(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  // 15/8, 15-8-2026, 15.8
  const dmy = raw.match(/^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?$/)
  if (dmy) {
    const year = dmy[3] ? Number(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]) : now.getFullYear()
    return rollForward(build(year, Number(dmy[2]), Number(dmy[1])), now, !dmy[3])
  }

  // 15 aug / aug 15 / 15 august 2026
  const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
  const words = raw.replace(/(\d)(st|nd|rd|th)\b/g, "$1").split(/[\s,]+/).filter(Boolean)
  const day = words.find(w => /^\d{1,2}$/.test(w))
  const monthWord = words.find(w => MONTHS.some(m => w.startsWith(m)))
  const yearWord = words.find(w => /^\d{4}$/.test(w))
  if (day && monthWord) {
    const month = MONTHS.findIndex(m => monthWord.startsWith(m)) + 1
    const year = yearWord ? Number(yearWord) : now.getFullYear()
    return rollForward(build(year, month, Number(day)), now, !yearWord)
  }

  return null

  function build(y: number, m: number, d: number): string | null {
    if (m < 1 || m > 12 || d < 1 || d > 31) return null
    const date = new Date(Date.UTC(y, m - 1, d))
    // Rejects impossible dates like 31 February, which Date would roll over.
    if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
    return date.toISOString().slice(0, 10)
  }

  function rollForward(value: string | null, from: Date, mayRoll: boolean): string | null {
    if (!value || !mayRoll) return value
    // "15 aug" in December means next year, not a date in the past.
    if (new Date(`${value}T23:59:59Z`) >= from) return value
    const d = new Date(`${value}T00:00:00Z`)
    d.setUTCFullYear(d.getUTCFullYear() + 1)
    return d.toISOString().slice(0, 10)
  }
}

async function askCustomDate(ctx: FlowContext) {
  await sendWhatsApp({
    to: ctx.phone,
    body: L(ctx)(
      "Sure — which date would you like?\n\nYou can write it any way you like, for example *15 Aug*, *15/8* or *2026-08-15*.",
      "بالتأكيد — ما التاريخ الذي تفضله؟\n\nيمكنك كتابته بأي صيغة، مثل *15 أغسطس* أو *15/8* أو *2026-08-15*.",
    ),
    allowOutsideSession: true,
  })
  await logBot(ctx, "Asked for a custom date")
  await save(ctx, { step: "AWAITING_CUSTOM_DATE" })
}

// ─── Step 4: slots ───

async function showSlots(ctx: FlowContext, iso: string) {
  const ts = L(ctx)
  const state = await getState(ctx.conversationId)
  if (!state?.tourId) return startBookingFlow(ctx)

  const tour = await db.tour.findFirst({ where: { id: state.tourId, tenantId: ctx.tenantId } })
  const start = new Date(`${iso}T00:00:00.000Z`)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)

  const slots = await db.slot.findMany({
    where: { tenantId: ctx.tenantId, tourId: state.tourId, date: { gte: start, lt: end }, status: "OPEN" },
    orderBy: { startTime: "asc" },
  })

  const bookable = slots.filter(s => s.capacity - s.seatsBooked - s.seatsHeld > 0)

  if (bookable.length === 0) {
    await sendInteractiveMessage({
      to: ctx.phone,
      body: ts(`Sorry, no seats left for ${tour ? tourLabel(ctx, tour) : ""} on ${dayLabel(iso)}. Pick another date?`, `عذراً، لا توجد مقاعد متاحة لـ ${tour ? tourLabel(ctx, tour) : ""} في ${dayLabel(iso)}. هل تختار تاريخاً آخر؟`),
      buttons: [
        { id: `${PREFIX}tour_${state.tourId}`, title: ts("📅 Other dates", "📅 تواريخ أخرى") },
        { id: `${PREFIX}browse`, title: ts("🐪 Other tours", "🐪 جولات أخرى") },
      ],
    })
    await logBot(ctx, `No availability on ${iso}`)
    return
  }

  await sendInteractiveMessage({
    to: ctx.phone,
    headerText: dayLabel(iso),
    body: ts(`Available times on ${dayLabel(iso)}:`, `الأوقات المتاحة في ${dayLabel(iso)}:`),
    list: {
      title: ts("Choose a time", "اختر الوقت"),
      sections: [
        {
          title: ts("Departure times", "أوقات الانطلاق"),
          rows: bookable.map(s => {
            const seats = s.capacity - s.seatsBooked - s.seatsHeld
            const price = s.priceOverride ?? tour?.basePrice ?? 0
            return {
              id: `${PREFIX}slot_${s.id}`,
              title: s.startTime.slice(0, 24),
              description: ts(`${formatCurrency(price)} · ${seats} seat${seats === 1 ? "" : "s"} left${seats <= 3 ? " 🔥" : ""}`, `${formatCurrency(price)} · بقي ${seats} مقعد${seats <= 3 ? " 🔥" : ""}`).slice(0, 72),
            }
          }),
        },
      ],
    },
  })

  await logBot(ctx, `Showing ${bookable.length} times for ${iso}`)
  await save(ctx, { step: "SHOW_SLOTS", date: iso })
}

// ─── Step 5: pax ───

async function seatsLeft(tenantId: string, slotId: string): Promise<number> {
  const slot = await db.slot.findFirst({ where: { id: slotId, tenantId } })
  if (!slot) return 0
  return Math.max(0, slot.capacity - slot.seatsBooked - slot.seatsHeld)
}

async function askPax(ctx: FlowContext, slotId: string) {
  const tp = L(ctx)
  const available = await seatsLeft(ctx.tenantId, slotId)

  if (available <= 0) {
    await sendInteractiveMessage({
      to: ctx.phone,
      body: tp("Sorry, that time just sold out. Pick another?", "عذراً، لقد نفدت مقاعد هذا الوقت للتو. هل تختار وقتاً آخر؟"),
      buttons: [{ id: `${PREFIX}browse`, title: tp("🐪 Browse tours", "🐪 تصفح الجولات") }],
    })
    return
  }

  // Offer only quantities that can actually be booked, so a customer is never
  // told "not enough seats" after choosing — the cap comes from live capacity.
  const options = Array.from({ length: Math.min(available, 8) }, (_, i) => i + 1)

  await sendInteractiveMessage({
    to: ctx.phone,
    headerText: tp(`${available} seat${available === 1 ? "" : "s"} available`, `${available} مقعد متاح`),
    body: await botText(ctx, "ask_persons"),
    list: {
      title: tp("Select guests", "اختر العدد"),
      sections: [
        {
          title: (await botText(ctx, "ask_persons_title")).slice(0, 24),
          rows: [
            ...options.map(n => ({
              id: `${PREFIX}pax_${n}`,
              title: tp(`${n} Person${n === 1 ? "" : "s"}`, `${n} شخص`),
              description: n === available ? tp("All remaining seats", "كل المقاعد المتبقية") : "",
            })),
            ...(available > 8
              ? [{ id: `${PREFIX}pax_other`, title: tp("👥 Other quantity", "👥 عدد آخر"), description: tp(`Up to ${available}`, `حتى ${available}`) }]
              : []),
          ],
        },
      ],
    },
  })

  await logBot(ctx, `How many persons? (${available} seats available)`)
  await save(ctx, { step: "AWAITING_PAX", slotId })
}

async function askCustomPax(ctx: FlowContext) {
  const state = await getState(ctx.conversationId)
  const available = state?.slotId ? await seatsLeft(ctx.tenantId, state.slotId) : 0
  await sendWhatsApp({
    to: ctx.phone,
    body: L(ctx)(`How many persons? Reply with a number between 1 and ${available}.`, `كم عدد الأشخاص؟ أرسل رقماً بين 1 و ${available}.`),
    allowOutsideSession: true,
  })
  await logBot(ctx, "Asked for a custom guest count")
  await save(ctx, { step: "AWAITING_CUSTOM_PAX" })
}


/**
 * Whether the customer has asked something rather than answered the question.
 *
 * The guided flow consumes every message while it is running, so "how long is
 * the tour?" typed at the "what's your name?" step was stored as the customer's
 * name. People do not stop having questions because a form has started.
 */
function looksLikeQuestion(text: string): boolean {
  const t = text.trim().toLowerCase()
  if (t.includes("?") || t.includes("؟")) return true
  const openers = [
    "how", "what", "when", "where", "why", "which", "who", "can ", "could ", "do ",
    "does ", "is ", "are ", "will ", "would ", "should ", "tell me", "i want to know",
    // Arabic: how / what / when / where / why / is there
    "كيف", "ما ", "ماذا", "متى", "اين", "أين", "لماذا", "هل ",
  ]
  if (openers.some(o => t.startsWith(o))) return true
  // A sentence at a step expecting a name or an email is a question in practice.
  return t.split(/\s+/).length > 6
}

/**
 * Answers an aside with the assistant, then repeats the step's question so the
 * booking does not quietly stall.
 */
async function answerAside(ctx: FlowContext, text: string, reprompt: string): Promise<void> {
  const { aiChat } = await import("@/lib/ai")
  const customer = await db.customer.findFirst({ where: { tenantId: ctx.tenantId, phone: ctx.phone }, select: { preferredLang: true } })

  let answer: string
  try {
    answer = await aiChat(
      [{
        role: "user",
        content: `${text}\n\n(The customer is part-way through booking. Answer just this, briefly.)`,
      }],
      customer?.preferredLang || "en",
      ctx.phone,
    )
  } catch (error) {
    console.error("Aside answer failed:", error)
    answer = "Let me check that for you."
  }

  await sendWhatsApp({ to: ctx.phone, body: answer, allowOutsideSession: true })
  await sendWhatsApp({ to: ctx.phone, body: reprompt, allowOutsideSession: true })
  await logBot(ctx, `Answered an aside mid-flow, re-asked: ${reprompt.slice(0, 40)}`)
}

/*
 * The terms have to be accepted before any details are taken.
 *
 * The business requires prepayment and enforces age, weight and safety rules;
 * a customer who has not seen them before paying has a fair complaint. Asking
 * here — after the seat is chosen, before name and payment — is the last point
 * where declining costs nobody anything.
 */
async function askTerms(ctx: FlowContext, persons: number) {
  const tt = L(ctx)
  const { getConfigValue } = await import("@/lib/app-config")
  const [en, ar] = await Promise.all([
    getConfigValue("booking_terms").catch(() => ""),
    getConfigValue("booking_terms_ar").catch(() => ""),
  ])

  /*
   * The terms belong to the business, not to this file.
   *
   * They were written here once, for a horse-riding stable — helmets, a 95 kg
   * limit, a minimum age of eight — which every other workspace would then have
   * shown to customers booking something else entirely. A workspace that has
   * not written any is asked nothing rather than asked to accept somebody
   * else's, and the booking continues.
   */
  const body = (tt(en, ar || en) || "").trim()
  if (!body) {
    await save(ctx, { step: "ASK_TERMS", pax: persons })
    await logBot(ctx, "No terms configured — skipped the acceptance step")
    await askName(ctx, persons)
    return
  }

  await save(ctx, { step: "ASK_TERMS", pax: persons })
  await sendInteractiveMessage({
    to: ctx.phone,
    body: `${body}\n\n${await botText(ctx, "terms_question")}`,
    buttons: [
      { id: `${PREFIX}terms_yes`, title: (await botText(ctx, "terms_accept_button")).slice(0, 20) },
      { id: `${PREFIX}terms_no`, title: (await botText(ctx, "terms_decline_button")).slice(0, 20) },
    ],
  })
  await logBot(ctx, `Terms shown for ${persons} person(s)`)
}

/** Declining is not a dead end — it hands the customer to a person. */
async function declineTerms(ctx: FlowContext) {
  const td = L(ctx)
  const { getConfigValue } = await import("@/lib/app-config")
  const support = (await getConfigValue("business_phone").catch(() => "")).trim()
  await sendWhatsApp({
    to: ctx.phone,
    body: await botText(ctx, "terms_declined", { phone: support }),
    allowOutsideSession: true,
  })
  await logBot(ctx, "Terms declined — handed to the team")
  await setState(ctx.conversationId, null)
}

// ─── Step 6: details ───

async function askName(ctx: FlowContext, pax: number) {
  const tn = L(ctx)
  const state = await getState(ctx.conversationId)
  const tour = state?.tourId ? await db.tour.findFirst({ where: { id: state.tourId, tenantId: ctx.tenantId } }) : null

  // A returning customer has already given their name, and their number is the
  // one messaging us. Asking again for either is the clearest possible signal
  // that nobody is paying attention.
  const known = await db.customer.findFirst({ where: { tenantId: ctx.tenantId, phone: ctx.phone }, select: { name: true } })
  const knownName = known?.name?.trim()

  // No email is asked for. Everything the booking needs is the name and the
  // number already messaging us, and an extra question before payment is one
  // more place to lose the customer.
  if (knownName) {
    await save(ctx, { step: "ASK_PAYMENT", pax, name: knownName })
    await logBot(ctx, `Reused known name: ${knownName} — straight to payment`)
    await askPayment(ctx)
    return
  }

  await sendWhatsApp({
    to: ctx.phone,
    body: tn(
      `Great! ${pax} person${pax === 1 ? "" : "s"} for ${tour ? tourLabel(ctx, tour) : "your tour"}.\n\nWhat's your full name?`,
      `ممتاز! ${pax} شخص لـ ${tour ? tourLabel(ctx, tour) : "الجولة"}.\n\nما هو اسمك الكامل؟`,
    ),
    allowOutsideSession: true,
  })
  await logBot(ctx, "Asked for full name")
  await save(ctx, { step: "ASK_NAME", pax })
}

// ─── Step 7: payment ───

async function askPayment(ctx: FlowContext) {
  const tsum = L(ctx)
  const state = await getState(ctx.conversationId)
  if (!state?.tourId || !state.slotId || !state.pax) return startBookingFlow(ctx)

  const [tour, slot] = await Promise.all([
    db.tour.findFirst({ where: { id: state.tourId, tenantId: ctx.tenantId } }),
    db.slot.findFirst({ where: { id: state.slotId, tenantId: ctx.tenantId } }),
  ])
  if (!tour || !slot) return startBookingFlow(ctx)

  const children = state.children ?? 0
  const infants = state.infants ?? 0
  const unit = adultUnitPrice(tour, slot, state.pax)
  const childUnit = tour.childPrice ?? unit
  const subtotal = unit * state.pax + childUnit * children
  const vat = await vatRate()
  const tax = subtotal * vat
  const total = subtotal + tax
  const vatLabel = `${Number((vat * 100).toFixed(2))}%`

  // Every guest is listed, including the infants who are not being charged, so
  // the total is never a surprise and the operator's headcount is right.
  const party = [
    tsum(`${state.pax} person${state.pax === 1 ? "" : "s"}`, `${state.pax} شخص`),
    children ? tsum(`${children} child${children === 1 ? "" : "ren"}`, `${children} طفل`) : "",
    infants ? tsum(`${infants} infant${infants === 1 ? "" : "s"} (free)`, `${infants} رضيع (مجاناً)`) : "",
  ].filter(Boolean).join(tsum(", ", "، "))

  const payPrompt = await botText(ctx, "payment_question")

  await sendInteractiveMessage({
    to: ctx.phone,
    headerText: await botText(ctx, "payment_summary_header"),
    body:
      `📍 ${tourLabel(ctx, tour)}\n📅 ${formatDate(slot.date)} ${tsum("at", "الساعة")} ${slot.startTime}\n👥 ${party}\n` +
      (tax > 0
        ? tsum(
            `💰 ${formatCurrency(subtotal)} + ${vatLabel} VAT = *${formatCurrency(total)}*`,
            `💰 ${formatCurrency(subtotal)} + ضريبة ${vatLabel} = *${formatCurrency(total)}*`,
          )
        : `💰 *${formatCurrency(total)}*`) +
      `\n\n${payPrompt}`,
    /*
     * WhatsApp allows 3 reply buttons, 20 characters each — longer titles
     * reject the whole message.
     *
     * Apple Pay is deliberately not offered here. The link opens in
     * WhatsApp's in-app browser, and iOS only exposes Apple Pay in Safari or
     * a native app, so the button could not do what it said. It is still
     * available on the checkout page itself for anyone who opens it in
     * Safari — a payment method that always works beats one that works
     * sometimes and fails silently.
     */
    buttons: [
      { id: `${PREFIX}pay_card`, title: (await botText(ctx, "payment_card_button")).slice(0, 20) },
      { id: `${PREFIX}pay_bank`, title: (await botText(ctx, "payment_bank_button")).slice(0, 20) },
    ],
  })

  await logBot(ctx, `Booking summary — ${formatCurrency(total)} — awaiting payment choice`)
  await save(ctx, { step: "ASK_PAYMENT" })
}

/** Creates the real order. Shared by payment paths. */
async function createOrder(ctx: FlowContext, method: "BANK_TRANSFER" | "AMWALPAY" | "PAYMOB") {
  const state = await getState(ctx.conversationId)
  if (!state?.tourId || !state.slotId || !state.pax) return null

  const [tour, slot, customer] = await Promise.all([
    db.tour.findFirst({ where: { id: state.tourId, tenantId: ctx.tenantId } }),
    db.slot.findFirst({ where: { id: state.slotId, tenantId: ctx.tenantId } }),
    db.customer.findFirst({ where: { id: ctx.customerId, tenantId: ctx.tenantId } }),
  ])
  if (!tour || !slot) return null

  const children = state.children ?? 0
  const infants = state.infants ?? 0

  // Infants do not occupy a seat, so they are excluded from the capacity check
  // and from the price. Children take a seat and are charged the child rate
  // when the tour sets one, otherwise the adult rate.
  const seats = state.pax + children
  const available = slot.capacity - slot.seatsBooked - slot.seatsHeld
  if (available < seats) return { soldOut: true as const }

  const unit = adultUnitPrice(tour, slot, state.pax)
  const childUnit = tour.childPrice ?? unit
  const subtotal = unit * state.pax + childUnit * children
  const vat = await vatRate()
  const tax = subtotal * vat
  const total = subtotal + tax

  if (state.name || state.email) {
    await db.customer.update({
      where: { id: ctx.customerId, tenantId: ctx.tenantId },
      data: {
        ...(state.name ? { name: state.name } : {}),
        ...(state.email ? { email: state.email } : {}),
      },
    })
  }

  const order = await db.order.create({
    data: {
      tenantId: ctx.tenantId,
      orderNumber: await generateOrderNumber(),
      customerId: ctx.customerId,
      tourId: tour.id,
      slotId: slot.id,
      paxAdult: state.pax,
      paxChild: children,
      paxInfant: infants,
      customerName: state.name || customer?.name || "WhatsApp customer",
      customerPhone: ctx.phone,
      customerEmail: state.email || customer?.email || null,
      subtotal,
      taxAmount: tax,
      totalAmount: total,
      paymentMethod: method,
      paymentStatus: "PENDING",
      orderStatus: "PENDING_PAYMENT",
      channel: "WHATSAPP",
    },
  })

  await db.payment.create({
    data: { tenantId: ctx.tenantId, orderId: order.id, customerId: ctx.customerId, method, amount: total, status: "PENDING" },
  })

  // Hold the seats so a second customer can't book the same capacity while
  // this one is still paying.
  await db.slot.update({
    where: { id: slot.id, tenantId: ctx.tenantId },
    data: { seatsHeld: { increment: seats } },
  })

  // Every booking belongs in the calendar, not only paid ones: an unpaid
  // booking still holds a seat and a guide still needs to know about it.
  void syncOrderToCalendar(order.id)

  return { order, tour, slot, total }
}

// ─── Router ───

export async function handleBookingReply(
  rawCtx: FlowContext,
  replyId: string,
): Promise<boolean> {
  const ctx = await withLang(rawCtx)
  const tpay = L(ctx)
  const id = replyId.startsWith(PREFIX) ? replyId.slice(PREFIX.length) : replyId

  if (id === "browse" || id === "avail" || id === "tour_catalog" || id === "tour_browse") {
    await showTours(ctx)
    return true
  }
  if (id.startsWith("train_")) {
    const { handleTrainingReply } = await import("@/lib/training-flow")
    return handleTrainingReply(ctx, id)
  }
  if (id.startsWith("cat_")) {
    const shortcuts = await menuShortcuts()
    const shortcut = shortcuts[Number(id.slice(4))]
    if (
      shortcut &&
      (shortcut.category?.toLowerCase() === "education" ||
        shortcut.title?.toLowerCase().includes("train") ||
        shortcut.category?.toLowerCase().includes("train") ||
        shortcut.title?.includes("تدريب"))
    ) {
      const { startTrainingFlow } = await import("@/lib/training-flow")
      await startTrainingFlow(ctx)
      return true
    }
    await showTours(ctx, shortcut)
    return true
  }
  if (id === "search") {
    // Hands the customer back to open conversation. The assistant searches the
    // catalogue properly, which a fixed list cannot.
    await sendWhatsApp({
      to: ctx.phone,
      body: L(ctx)(
        "What are you looking for? Tell me the kind of trip — *desert*, *snorkelling*, *mountains*, *something for kids* — or a place, and I'll find it. 🔍",
        "عن ماذا تبحث؟ أخبرني بنوع الرحلة — *صحراء*، *غوص*، *جبال*، *مناسبة للأطفال* — أو اذكر مكاناً وسأجدها لك. 🔍",
      ),
      allowOutsideSession: true,
    })
    await logBot(ctx, "Offered free-text tour search")
    await setState(ctx.conversationId, null)
    return true
  }
  if (id.startsWith("tour_book_")) {
    await askDate(ctx, id.slice(10))
    return true
  }
  if (id.startsWith("tour_sel_")) {
    await askDate(ctx, id.slice(9))
    return true
  }
  if (id.startsWith("tour_")) {
    await askDate(ctx, id.slice(5))
    return true
  }
  if (id === "day_other") {
    await askCustomDate(ctx)
    return true
  }
  if (id.startsWith("day_")) {
    await showSlots(ctx, id.slice(4))
    return true
  }
  if (id.startsWith("slot_")) {
    await askPax(ctx, id.slice(5))
    return true
  }
  if (id === "pax_other") {
    await askCustomPax(ctx)
    return true
  }
  if (id === "lang_en" || id === "lang_ar") {
    const lang: Lang = id === "lang_ar" ? "ar" : "en"
    await save({ ...ctx, lang }, { step: "AWAITING_CHOICE", lang, langChosen: true })
    await showMainMenu({ ...ctx, lang })
    return true
  }
  if (id.startsWith("pax_")) {
    await askTerms(ctx, Number(id.slice(4)) || 1)
    return true
  }
  if (id === "terms_yes") {
    const state = await getState(ctx.conversationId)
    await askName(ctx, state?.pax ?? 1)
    return true
  }
  if (id === "terms_no") {
    await declineTerms(ctx)
    return true
  }

  if (id === "pay_bank" || id === "pay_card" || id === "pay_apple") {
    const { isPaymobConfigured } = await import("@/lib/paymob").catch(() => ({ isPaymobConfigured: () => false }))
    const cardMethod = isPaymobConfigured() ? "PAYMOB" : "AMWALPAY"
    const created = await createOrder(ctx, id === "pay_bank" ? "BANK_TRANSFER" : cardMethod)

    if (!created) {
      await sendWhatsApp({ to: ctx.phone, body: tpay("Something went wrong creating your booking. Let me get a team member to help.", "حدث خطأ أثناء إنشاء حجزك. سأحوّلك إلى أحد أفراد الفريق للمساعدة."), allowOutsideSession: true })
      await setState(ctx.conversationId, null)
      return true
    }
    if ("soldOut" in created) {
      await sendWhatsApp({ to: ctx.phone, body: tpay("Sorry — those seats were just taken. Let's find you another time.", "عذراً — تم حجز هذه المقاعد للتو. دعنا نجد لك وقتاً آخر."), allowOutsideSession: true })
      await showTours(ctx)
      return true
    }

    const { order, tour, slot, total } = created

    if (id === "pay_bank") {
      /*
       * A manual transfer is made to a mobile number here, not an IBAN.
       * The company name is shown alongside it so the customer can check the
       * name their banking app displays before they send anything — a transfer
       * to the wrong number is not recoverable.
       */
      /*
       * Every destination the workspace has set up, in the shape it was set up.
       *
       * A BANK row is an account transfer; a PHONE row is a transfer to a
       * mobile number and has only a name and the number. Both are held in the
       * same table so the operator manages them in one place, and only the
       * fields that belong to a row are ever printed — a phone row has no IBAN
       * to show and inventing one would be worse than showing nothing.
       *
       * There is deliberately no fallback to the support line or the WhatsApp
       * number: neither is necessarily the account that receives money, and the
       * wrong one sends a payment somewhere unrecoverable.
       */
      const all = await db.bankAccount.findMany({
        where: { tenantId: ctx.tenantId, isActive: true },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      })

      /*
       * A configured phone number replaces the bank details rather than joining
       * them.
       *
       * Offering both asks the customer to choose a payment route, and the one
       * they pick is the one the business then has to reconcile. Where a phone
       * transfer is set up it is the intended route, so the bank rows are held
       * back and the message carries a single unambiguous destination. Remove
       * the phone destination and the bank details come back on their own.
       */
      const phones = all.filter(acc => acc.type === "PHONE")
      const accounts = phones.length > 0 ? phones : all

      const blocks = accounts.map(acc =>
        acc.type === "PHONE"
          ? tpay(
              `📱 Phone transfer: *${acc.accountNumber}*\n🏢 Name: *${acc.accountName}*`,
              `📱 التحويل عبر الهاتف: *${acc.accountNumber}*\n🏢 الاسم: *${acc.accountName}*`,
            )
          : tpay(
              `🏦 Bank: *${acc.bankName}*\n👤 Account name: *${acc.accountName}*\n🔢 Account number: *${acc.accountNumber}*` +
                (acc.iban ? `\n🌐 IBAN: *${acc.iban}*` : ""),
              `🏦 البنك: *${acc.bankName}*\n👤 اسم الحساب: *${acc.accountName}*\n🔢 رقم الحساب: *${acc.accountNumber}*` +
                (acc.iban ? `\n🌐 الآيبان: *${acc.iban}*` : ""),
            ),
      )

      const details = blocks.join("\n\n")
        || await botText(ctx, "transfer_unconfigured")

      await sendWhatsApp({
        to: ctx.phone,
        body: await botText(ctx, "transfer_intro", {
          amount: formatCurrency(total),
          details,
          order: order.orderNumber,
        }),
        allowOutsideSession: true,
      })
      await logBot(ctx, `Bank transfer instructions sent for ${order.orderNumber}`)
      await save(ctx, { step: "AWAITING_SCREENSHOT", orderId: order.id })
      return true
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud"
    // Kept so a customer who tapped Apple Pay on a message sent before it was
    // withdrawn still reaches a working checkout rather than nothing at all.
    const applePay = id === "pay_apple"
    const payUrl = order.paymentMethod === "PAYMOB"
      ? `${baseUrl}/api/paymob/pay/${encodeURIComponent(order.orderNumber)}`
      : `${baseUrl}/api/amwalpay/pay/${encodeURIComponent(order.orderNumber)}`

    const summary = tpay(
      `💳 Pay securely by card\n\n🎫 Order: ${order.orderNumber}\n💰 ${formatCurrency(total)}\n📍 ${tourLabel(ctx, tour)} · ${formatDate(slot.date)} ${slot.startTime}\n\n🔒 PCI-DSS compliant · your card details never reach us`,
      `💳 ادفع بأمان بالبطاقة\n\n🎫 رقم الطلب: ${order.orderNumber}\n💰 ${formatCurrency(total)}\n📍 ${tourLabel(ctx, tour)} · ${formatDate(slot.date)} ${slot.startTime}\n\n🔒 متوافق مع PCI-DSS · بيانات بطاقتك لا تصل إلينا`,
    )

    /*
     * A button rather than a bare link. Both open WhatsApp's in-app browser,
     * but a button is tapped far more often than a line of blue text.
     *
     * The footer is not decoration. WhatsApp's in-app browser is a WebView,
     * and a card that asks for 3-D Secure hands off to the bank's own page —
     * some banks refuse to render inside a WebView at all, and Apple Pay is
     * simply unavailable there, because iOS only offers it in Safari or a
     * native app. Neither failure explains itself: the customer sees a blank
     * page or a missing button and assumes the payment is broken. Telling
     * them where the "open in browser" control is costs one line and saves
     * the sale.
     */
    const sent = await sendCtaUrlMessage({
      to: ctx.phone,
      body: summary,
      buttonText: tpay("Pay now", "ادفع الآن"),
      url: payUrl,
      footerText: applePay
        ? tpay("For Apple Pay, tap ⋮ then Open in browser", "لاستخدام Apple Pay، اضغط ⋮ ثم افتح في المتصفح")
        : tpay("Trouble loading? Tap ⋮ then Open in browser", "لا تفتح الصفحة؟ اضغط ⋮ ثم افتح في المتصفح"),
    })
    if (!sent.success) {
      await sendWhatsApp({
        to: ctx.phone,
        body: `${summary}\n\n${payUrl}`,
        allowOutsideSession: true,
      })
    }
    await logBot(ctx, `${applePay ? "Apple Pay" : "Card"} link sent for ${order.orderNumber}`)
    await save(ctx, { step: "DONE", orderId: order.id })
    return true
  }

  return false
}

/** Free text, consumed only at the steps that ask for it. */
export async function handleBookingText(rawCtx: FlowContext, text: string): Promise<boolean> {
  const ctx = await withLang(rawCtx, text)
  const ttxt = L(ctx)
  const state = await getState(ctx.conversationId)
  if ((state as any)?.flowType === "TRAINING") {
    const { handleTrainingText } = await import("@/lib/training-flow")
    return handleTrainingText(ctx, text)
  }
  if (!state) return false

  if (state.step === "AWAITING_CUSTOM_DATE") {
    const iso = parseCustomerDate(text)
    if (!iso) {
      // Something that is not a date is usually a question, not a typo.
      if (looksLikeQuestion(text)) {
        await answerAside(ctx, text, "Which date would you like? Try *15 Aug*, *15/8* or *2026-08-15*.")
        return true
      }
      await sendWhatsApp({
        to: ctx.phone,
        body: ttxt("I couldn't read that date. Try *15 Aug*, *15/8* or *2026-08-15*.", "لم أتمكن من قراءة التاريخ. جرّب *15 أغسطس* أو *15/8* أو *2026-08-15*."),
        allowOutsideSession: true,
      })
      return true
    }
    const today = new Date().toISOString().slice(0, 10)
    if (iso < today) {
      await sendWhatsApp({
        to: ctx.phone,
        body: ttxt("That date has already passed. Which upcoming date would you like?", "هذا التاريخ قد مضى. ما التاريخ القادم الذي تفضله؟"),
        allowOutsideSession: true,
      })
      return true
    }
    await showSlots(ctx, iso)
    return true
  }

  if (state.step === "AWAITING_CUSTOM_PAX") {
    const wanted = Number(text.trim().match(/\d+/)?.[0])
    const available = state.slotId ? await seatsLeft(ctx.tenantId, state.slotId) : 0
    if (!wanted || wanted < 1) {
      await sendWhatsApp({ to: ctx.phone, body: ttxt("Please reply with a number, for example *4*.", "يرجى الرد برقم، مثل *4*."), allowOutsideSession: true })
      return true
    }
    if (wanted > available) {
      await sendWhatsApp({
        to: ctx.phone,
        body: ttxt(`Only ${available} seat${available === 1 ? "" : "s"} left on that departure. Please choose ${available} or fewer.`, `بقي ${available} مقعد فقط في هذه الرحلة. يرجى اختيار ${available} أو أقل.`),
        allowOutsideSession: true,
      })
      return true
    }
    await askTerms(ctx, wanted)
    return true
  }

  if (state.step === "ASK_NAME") {
    if (looksLikeQuestion(text)) {
      await answerAside(ctx, text, "And what name should the booking be under?")
      return true
    }
    const name = text.trim().slice(0, 80)
    await sendWhatsApp({
      to: ctx.phone,
      body: ttxt(`Thanks ${name}! What's your email address? (or reply *skip*)`, `شكراً ${name}! ما هو بريدك الإلكتروني؟ (أو أرسل *تخطي*)`),
      allowOutsideSession: true,
    })
    await logBot(ctx, `Name captured: ${name} — asked for email`)
    await save(ctx, { step: "ASK_EMAIL", name })
    return true
  }

  if (state.step === "ASK_EMAIL") {
    const raw = text.trim()
    // The prompt offers "تخطي" in Arabic, so it has to be accepted too.
    const skip = ["skip", "تخطي", "تخطى"].includes(raw.trim().toLowerCase())
    if (!skip && looksLikeQuestion(raw) && !raw.includes("@")) {
      await answerAside(ctx, raw, "What's your email address? (or reply *skip*)")
      return true
    }
    // Don't reject a malformed address outright — a booking is worth more
    // than a clean email field, and staff can correct it later.
    const email = !skip && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) ? raw : undefined
    if (!skip && !email) {
      await sendWhatsApp({
        to: ctx.phone,
        body: ttxt("That doesn't look like a valid email. Please try again, or reply *skip*.", "لا يبدو هذا بريداً إلكترونياً صحيحاً. حاول مرة أخرى، أو أرسل *تخطي*."),
        allowOutsideSession: true,
      })
      return true
    }
    await save(ctx, { step: "ASK_PAYMENT", email })
    await askPayment(ctx)
    return true
  }

  return false
}

/** Payment screenshot received while awaiting one. */
export async function bookingAwaitingScreenshot(conversationId: string): Promise<string | null> {
  const state = await getState(conversationId)
  return state?.step === "AWAITING_SCREENSHOT" ? state.orderId ?? null : null
}

export async function completeBooking(ctx: FlowContext) {
  // Clear rather than park at DONE: the booking is finished, so the next
  // message should be treated as a fresh conversation, not a continuation.
  await setState(ctx.conversationId, null)
}
