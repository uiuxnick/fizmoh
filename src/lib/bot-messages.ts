import { db } from "@/lib/db"

/**
 * Every line the built-in bot says, as data a workspace can edit.
 *
 * These were written straight into booking-flow.ts — a hundred-odd bilingual
 * strings in code, identical for every business on the platform. A stable and a
 * dive centre got the same words, and changing one of them meant a deploy. That
 * is the same mistake the assistant prompt made: something that belongs to the
 * business living in shared code.
 *
 * The defaults below are what the bot said before, so a workspace that edits
 * nothing sees no change. An override is stored per workspace and per language;
 * a blank one falls back to the default rather than sending an empty message.
 */
export type BotMessage = {
  key: string
  group: string
  label: string
  /** Placeholders this message may use, for the editor to show. */
  vars?: string[]
  en: string
  ar: string
}

export const BOT_MESSAGES: BotMessage[] = [
  // ── Opening ──
  {
    key: "welcome",
    group: "Opening",
    label: "Welcome line (shown in both languages)",
    vars: ["business"],
    en: "👋 Welcome to {business}",
    ar: "👋 أهلاً بك في {business}",
  },
  {
    key: "language_prompt",
    group: "Opening",
    label: "Language question (shown in both languages)",
    en: "Please choose your language",
    ar: "يرجى اختيار اللغة",
  },
  {
    key: "language_button_en",
    group: "Opening",
    label: "English button",
    en: "English",
    ar: "English",
  },
  {
    key: "language_button_ar",
    group: "Opening",
    label: "Arabic button",
    en: "العربية",
    ar: "العربية",
  },

  // ── Menu ──
  {
    key: "greeting",
    group: "Menu",
    label: "Greeting after the language is chosen",
    vars: ["business"],
    en: "Hello! 👋 Welcome to {business}. How can I help you today?",
    ar: "مرحباً! 👋 أهلاً بك في {business}. كيف يمكنني مساعدتك اليوم؟",
  },
  {
    key: "menu_prompt",
    group: "Menu",
    label: "Menu question",
    en: "Choose an option:",
    ar: "اختر من التالي:",
  },
  {
    key: "menu_browse_button",
    group: "Menu",
    label: "Browse tours button",
    en: "🐪 Browse Tours",
    ar: "🐪 تصفح الجولات",
  },

  // ── Booking ──
  {
    key: "ask_persons",
    group: "Booking",
    label: "How many people",
    en: "How many persons?",
    ar: "كم عدد الأشخاص؟",
  },
  {
    key: "ask_persons_title",
    group: "Booking",
    label: "People list title",
    en: "Number of persons",
    ar: "عدد الأشخاص",
  },
  {
    key: "ask_name",
    group: "Booking",
    label: "Asking for the name",
    vars: ["persons", "tour"],
    en: "Great! {persons} for {tour}.\n\nWhat's your full name?",
    ar: "ممتاز! {persons} لـ {tour}.\n\nما هو اسمك الكامل؟",
  },

  // ── Terms ──
  {
    key: "terms_question",
    group: "Terms",
    label: "Question under the terms",
    en: "Do you accept these Terms & Conditions?",
    ar: "هل توافق على الشروط والأحكام؟",
  },
  {
    key: "terms_accept_button",
    group: "Terms",
    label: "Accept button",
    en: "✅ I Accept",
    ar: "✅ أوافق",
  },
  {
    key: "terms_decline_button",
    group: "Terms",
    label: "Decline button",
    en: "❌ I Don't Accept",
    ar: "❌ لا أوافق",
  },
  {
    key: "terms_declined",
    group: "Terms",
    label: "Reply when the terms are declined",
    vars: ["phone"],
    en: "No problem. To book without accepting the terms, please speak to our team.\n\n📞 {phone}",
    ar: "لا مشكلة. للحجز دون الموافقة على الشروط، يرجى التواصل مع فريقنا.\n\n📞 {phone}",
  },

  // ── Payment ──
  {
    key: "payment_question",
    group: "Payment",
    label: "How would you like to pay",
    en: "How would you like to pay?",
    ar: "كيف تود الدفع؟",
  },
  {
    key: "payment_summary_header",
    group: "Payment",
    label: "Booking summary heading",
    en: "Booking summary",
    ar: "ملخص الحجز",
  },
  {
    key: "payment_card_button",
    group: "Payment",
    label: "Card button",
    en: "💳 Credit/Debit Card",
    ar: "💳 بطاقة بنكية",
  },
  {
    key: "payment_bank_button",
    group: "Payment",
    label: "Transfer button",
    en: "🏦 Bank Transfer",
    ar: "🏦 تحويل بنكي",
  },
  {
    key: "transfer_intro",
    group: "Payment",
    label: "Transfer instructions",
    vars: ["amount", "details", "order"],
    en: "Perfect! Please transfer *{amount}* to:\n\n{details}\n\n🎫 Order: {order}\n\n📸 Then send a screenshot of the transfer here.",
    ar: "ممتاز! يرجى تحويل *{amount}* إلى:\n\n{details}\n\n🎫 رقم الطلب: {order}\n\n📸 ثم أرسل صورة إيصال التحويل هنا.",
  },
  {
    key: "transfer_unconfigured",
    group: "Payment",
    label: "Shown when no payment destination is set up",
    en: "Our team will send you the transfer details shortly.",
    ar: "سيرسل لك فريقنا تفاصيل التحويل قريباً.",
  },
  // ── Tours ──
  { key: "tours_none", group: "Tours", label: "No tours available", en: "No tours are available right now. Please try again later.", ar: "لا توجد جولات متاحة حالياً. يرجى المحاولة لاحقاً." },
  { key: "tours_header", group: "Tours", label: "Tour list heading", en: "Our Experiences", ar: "تجاربنا" },
  { key: "tours_tap", group: "Tours", label: "Tap to select", en: "Tap to select:", ar: "اختر من القائمة:" },
  { key: "tours_intro", group: "Tours", label: "Tour list intro", en: "Here are our top-rated experiences ✨ Tap a tour to select:", ar: "إليك أفضل تجاربنا ✨ اختر جولة من القائمة:" },
  { key: "tours_view_button", group: "Tours", label: "View tours button", en: "View tours", ar: "عرض الجولات" },
  { key: "tours_find", group: "Tours", label: "Find a tour row", en: "Find a tour", ar: "ابحث عن جولة" },
  { key: "tours_search", group: "Tours", label: "Search tours row", en: "🔍 Search tours", ar: "🔍 ابحث عن جولة" },
  { key: "tours_search_hint", group: "Tours", label: "Search hint", en: "Type what you're looking for — desert, diving, a city", ar: "اكتب ما تبحث عنه — صحراء، غوص، مدينة" },
  { key: "tours_section", group: "Tours", label: "Available tours section", en: "Available tours", ar: "الجولات المتاحة" },
  { key: "tours_error", group: "Tours", label: "Tour list failed to load", en: "Sorry, I couldn't load the tour list. Please try again.", ar: "عذراً، تعذر تحميل قائمة الجولات. يرجى المحاولة مرة أخرى." },
  { key: "tours_other", group: "Tours", label: "Other tours row", en: "🐪 Other tours", ar: "🐪 جولات أخرى" },
  { key: "tours_browse_alt", group: "Tours", label: "Browse tours button (after sold out)", en: "🐪 Browse tours", ar: "🐪 تصفح الجولات" },

  // ── Dates & times ──
  { key: "date_choose", group: "Dates", label: "Choose a date", en: "Choose a date", ar: "اختر التاريخ" },
  { key: "date_section", group: "Dates", label: "Available dates section", en: "Available dates", ar: "التواريخ المتاحة" },
  { key: "date_other", group: "Dates", label: "Another date row", en: "📅 Another date", ar: "📅 تاريخ آخر" },
  { key: "date_other_hint", group: "Dates", label: "Another date hint", en: "Type any date you like", ar: "اكتب أي تاريخ تريده" },
  { key: "date_unreadable", group: "Dates", label: "Date not understood", en: "I couldn't read that date. Try *15 Aug*, *15/8* or *2026-08-15*.", ar: "لم أتمكن من قراءة التاريخ. جرّب *15 أغسطس* أو *15/8* أو *2026-08-15*." },
  { key: "date_past", group: "Dates", label: "Date already passed", en: "That date has already passed. Which upcoming date would you like?", ar: "هذا التاريخ قد مضى. ما التاريخ القادم الذي تفضله؟" },
  { key: "slot_sold_out", group: "Dates", label: "Time sold out", en: "Sorry, that time just sold out. Pick another?", ar: "عذراً، لقد نفدت مقاعد هذا الوقت للتو. هل تختار وقتاً آخر؟" },

  // ── Booking extras ──
  { key: "guests_select", group: "Booking", label: "Select guests title", en: "Select guests", ar: "اختر العدد" },
  { key: "guests_all_remaining", group: "Booking", label: "All remaining seats", en: "All remaining seats", ar: "كل المقاعد المتبقية" },
  { key: "guests_other", group: "Booking", label: "Other quantity row", en: "👥 Other quantity", ar: "👥 عدد آخر" },
  { key: "guests_number_only", group: "Booking", label: "Reply with a number", en: "Please reply with a number, for example *4*.", ar: "يرجى الرد برقم، مثل *4*." },

  // ── Problems ──
  { key: "order_failed", group: "Problems", label: "Booking could not be created", en: "Something went wrong creating your booking. Let me get a team member to help.", ar: "حدث خطأ أثناء إنشاء حجزك. سأحوّلك إلى أحد أفراد الفريق للمساعدة." },
  { key: "seats_taken", group: "Problems", label: "Seats taken while booking", en: "Sorry — those seats were just taken. Let's find you another time.", ar: "عذراً — تم حجز هذه المقاعد للتو. دعنا نجد لك وقتاً آخر." },

  // ── Card payment ──
  { key: "pay_now_button", group: "Payment", label: "Pay now button", en: "Pay now", ar: "ادفع الآن" },
  { key: "pay_applepay_hint", group: "Payment", label: "Apple Pay hint", en: "For Apple Pay, tap ⋮ then Open in browser", ar: "لاستخدام Apple Pay، اضغط ⋮ ثم افتح في المتصفح" },
  { key: "pay_browser_hint", group: "Payment", label: "Trouble loading hint", en: "Trouble loading? Tap ⋮ then Open in browser", ar: "لا تفتح الصفحة؟ اضغط ⋮ ثم افتح في المتصفح" },
]

const BY_KEY = new Map(BOT_MESSAGES.map(m => [m.key, m]))
const BY_EN = new Map(BOT_MESSAGES.map(m => [m.en, m.key]))

/*
 * A synchronous view of the overrides, for the flow's `t(en, ar)` helper.
 *
 * That helper is called from three dozen places and is not async; rewriting
 * every one of them to await a lookup would be a large change for no behavioural
 * gain. Instead the overrides are primed once when a message starts being
 * handled and read synchronously from here. Keyed by workspace, because two
 * businesses must never see each other's wording.
 */
const primed = new Map<string, { data: BotMessageOverrides; at: number }>()
const PRIME_TTL_MS = 10_000

export async function primeBotMessages(tenantId: string): Promise<void> {
  const hit = primed.get(tenantId)
  if (hit && Date.now() - hit.at < PRIME_TTL_MS) return
  primed.set(tenantId, { data: await loadBotMessages(), at: Date.now() })
}

/** An override for this exact built-in wording, if the workspace set one. */
export function overrideForEnglish(tenantId: string, en: string, lang: "en" | "ar"): string | null {
  const key = BY_EN.get(en)
  if (!key) return null
  const value = primed.get(tenantId)?.data?.[key]
  const text = (lang === "ar" ? value?.ar : value?.en)?.trim()
  return text || null
}

/** A workspace's overrides: { key: { en, ar } }. */
export type BotMessageOverrides = Record<string, { en?: string; ar?: string }>

const SETTING_KEY = "bot_messages"

export async function loadBotMessages(): Promise<BotMessageOverrides> {
  try {
    const row = await db.systemSetting.findFirst({ where: { key: SETTING_KEY }, select: { value: true } })
    if (!row?.value) return {}
    const parsed = JSON.parse(row.value)
    return parsed && typeof parsed === "object" ? (parsed as BotMessageOverrides) : {}
  } catch {
    // A broken override must not take the bot down; it falls back to defaults.
    return {}
  }
}

export async function saveBotMessages(overrides: BotMessageOverrides): Promise<void> {
  const clean: BotMessageOverrides = {}
  for (const [key, value] of Object.entries(overrides)) {
    if (!BY_KEY.has(key) || !value) continue
    const en = typeof value.en === "string" ? value.en.slice(0, 4000).trim() : ""
    const ar = typeof value.ar === "string" ? value.ar.slice(0, 4000).trim() : ""
    if (en || ar) clean[key] = { ...(en ? { en } : {}), ...(ar ? { ar } : {}) }
  }
  const body = JSON.stringify(clean)
  const existing = await db.systemSetting.findFirst({ where: { key: SETTING_KEY }, select: { id: true } })
  if (existing) {
    await db.systemSetting.update({ where: { id: existing.id }, data: { value: body, type: "JSON" } })
  } else {
    await db.systemSetting.create({ data: { key: SETTING_KEY, value: body, type: "JSON", category: "BOT" } })
  }
}

/**
 * One message, in one language, with its placeholders filled.
 *
 * Falls back to the default for that language, then to English, so a workspace
 * that has translated only half of its messages still says something sensible
 * rather than nothing at all.
 */
export function renderBotMessage(
  overrides: BotMessageOverrides,
  key: string,
  lang: "en" | "ar",
  vars: Record<string, string | number> = {},
): string {
  const def = BY_KEY.get(key)
  if (!def) return ""
  const override = overrides[key]
  const chosen =
    (lang === "ar" ? override?.ar : override?.en)?.trim() ||
    (lang === "ar" ? def.ar : def.en) ||
    def.en

  return chosen.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = vars[name]
    return value === undefined || value === null ? whole : String(value)
  })
}
