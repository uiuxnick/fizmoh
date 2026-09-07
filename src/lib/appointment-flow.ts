import { db } from "@/lib/db"
import { publish } from "@/lib/realtime"
import { Prisma } from "@prisma/client"
import { sendWhatsApp } from "@/lib/notifications"
import { sendInteractiveMessage, sendCtaUrlMessage } from "@/lib/whatsapp"
import { syncAppointmentToCalendar } from "@/lib/google-calendar"
import { notifyStaff } from "@/lib/realtime"
import {
  appointmentReference,
  appointmentsEnabled,
  appointmentServices,
  defaultDurationMins,
  slotsForDate,
  slotIsFree,
} from "@/lib/appointments"
import { APP_TIMEZONE, fromLocal, localDateKey } from "@/lib/timezone"

/**
 * Booking a consultation over WhatsApp.
 *
 * Separate from the tour flow, because the two have almost nothing in common:
 * a tour has seats, prices, children and a payment; a consultation has a
 * person, a subject and half an hour. Sharing one flow meant every enquiry
 * came out the other end as a tour booking.
 *
 * The times offered are read from the database at the moment they are shown
 * and checked again when the customer picks one. A list built from a snapshot
 * taken minutes earlier will cheerfully offer a slot somebody else has just
 * taken.
 */

export type AppointmentStep =
  | "ASK_NAME"
  | "ASK_EMAIL"
  | "ASK_SERVICE"
  | "ASK_COMPANY"
  | "ASK_WEBSITE"
  | "ASK_DATE"
  | "ASK_TIME"
  | "CONFIRM"
  | "DONE"

export type AppointmentState = {
  step: AppointmentStep
  name?: string
  email?: string
  service?: string
  companyName?: string
  companyWebsite?: string
  date?: string
  startsAt?: string
  updatedAt: string
}

export type FlowContext = {
  conversationId: string
  customerId: string
  phone: string
}

const PREFIX = "ap_"

/** How many days ahead the picker offers. Nine days plus a "later" row fills
 *  the ten rows WhatsApp allows in a list, exactly. */
const DAYS_AHEAD = 9

/*
 * Whole words only, and no bare "schedule" or "book".
 *
 * A substring match is too eager here: "I want to schedule my desert tour" is
 * a tour enquiry, and matching it would drop the customer into a consultation
 * form instead. Every word below is one that only means a meeting.
 */
const TRIGGER = new RegExp(
  String.raw`\b(appointments?|meetings?|consultations?|demos?)\b`
  + String.raw`|\b(book|schedule|arrange|set ?up)\b[\w\s]{0,12}\b(call|meeting|appointment|demo|consultation)\b`
  + String.raw`|موعد|اجتماع|استشارة`,
  "i",
)

export function isAppointmentTrigger(text: string): boolean {
  return TRIGGER.test(text.trim())
}

export function isAppointmentReply(id?: string | null): boolean {
  return !!id && id.startsWith(PREFIX)
}

// ── State ────────────────────────────────────────────────────────────────────

async function setState(conversationId: string, state: AppointmentState | null) {
  await db.conversation.update({
    where: { id: conversationId },
    // Prisma reads `undefined` as "leave unchanged", so clearing a Json column
    // needs DbNull — otherwise a finished flow could never actually be reset.
    data: { appointmentState: state ? JSON.stringify(state) : Prisma.DbNull },
  })
}

export async function getAppointmentState(conversationId: string): Promise<AppointmentState | null> {
  const convo = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { appointmentState: true },
  })
  const raw = convo?.appointmentState
  if (!raw) return null
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
    // A flow abandoned yesterday should not resume mid-question today.
    if (Date.now() - new Date(parsed.updatedAt).getTime() > 24 * 60 * 60 * 1000) return null
    return parsed as AppointmentState
  } catch {
    return null
  }
}

async function save(ctx: FlowContext, patch: Partial<AppointmentState> & { step: AppointmentStep }) {
  const current = (await getAppointmentState(ctx.conversationId)) || ({} as AppointmentState)
  await setState(ctx.conversationId, { ...current, ...patch, updatedAt: new Date().toISOString() })
}

/** Mirror what the customer sees into the agent inbox. */
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

// ── Presentation ─────────────────────────────────────────────────────────────

const dayLabel = (key: string) => {
  const date = fromLocal(key, "12:00")
  const today = localDateKey(new Date())
  const tomorrow = localDateKey(new Date(Date.now() + 86_400_000))
  if (key === today) return "Today"
  if (key === tomorrow) return "Tomorrow"
  return new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIMEZONE, weekday: "short", day: "numeric", month: "short" })
    .format(date)
}

/** `16:00` shown as `4:00 PM`, which is how people actually say it. */
function pretty(time: string): string {
  const [hours, minutes] = time.split(":").map(Number)
  const suffix = hours >= 12 ? "PM" : "AM"
  const twelve = hours % 12 === 0 ? 12 : hours % 12
  return `${twelve}:${String(minutes).padStart(2, "0")} ${suffix}`
}

// ── Steps ────────────────────────────────────────────────────────────────────

export async function startAppointmentFlow(ctx: FlowContext): Promise<boolean> {
  if (!(await appointmentsEnabled())) return false
  await save(ctx, { step: "ASK_NAME" })
  await ask(
    ctx,
    "Happy to get a meeting in the diary. 📅\n\nIt takes about a minute — I'll ask a few details, then show you what times are free.\n\nFirst, what's your name?",
  )
  return true
}

async function askService(ctx: FlowContext) {
  const services = await appointmentServices()
  await save(ctx, { step: "ASK_SERVICE" })

  // A WhatsApp list holds ten rows in total. More services than that and the
  // message is rejected outright, so the rest are offered as free text.
  const rows = services.slice(0, 10).map((service, index) => ({
    id: `${PREFIX}svc_${index}`,
    title: service.slice(0, 24),
  }))

  const result = await sendInteractiveMessage({
    to: ctx.phone,
    body: "What would you like to talk about?",
    list: { title: "Choose", sections: [{ title: "Services", rows }] },
    footerText: services.length > 10 ? "Something else? Just type it." : undefined,
  })
  if (!result.success) {
    await ask(ctx, `What would you like to talk about?\n\n${services.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nReply with a number or type it.`)
    return
  }
  await logBot(ctx, "Which service?")
}

/**
 * Offers the next days that still have a free slot.
 *
 * Availability is read now rather than assumed: a day with nothing left is
 * shown as full rather than offered and then refused, which is the difference
 * between a picker and a guessing game.
 */
async function askDate(ctx: FlowContext) {
  await save(ctx, { step: "ASK_DATE" })

  const rows: { id: string; title: string; description?: string }[] = []
  for (let offset = 0; offset < 21 && rows.length < DAYS_AHEAD; offset++) {
    const key = localDateKey(new Date(Date.now() + offset * 86_400_000))
    const free = (await slotsForDate(key)).filter(s => s.available)
    if (free.length === 0) continue
    rows.push({
      id: `${PREFIX}day_${key}`,
      title: dayLabel(key).slice(0, 24),
      description: `${free.length} time${free.length === 1 ? "" : "s"} free`,
    })
  }

  if (rows.length === 0) {
    await ask(ctx, "I'm fully booked for the next three weeks. Let me put you through to a colleague who can sort something out. 🙏")
    await setState(ctx.conversationId, null)
    return
  }

  const result = await sendInteractiveMessage({
    to: ctx.phone,
    body: "Which day suits you?",
    list: { title: "Pick a day", sections: [{ title: "Available days", rows }] },
    footerText: `All times are ${APP_TIMEZONE.split("/")[1]} time`,
  })
  if (!result.success) {
    await ask(ctx, `Which day suits you?\n\n${rows.map(r => `• ${r.title} — ${r.description}`).join("\n")}\n\nReply with the day.`)
    return
  }
  await logBot(ctx, "Which day?")
}

/** The free times on the chosen day, read at the moment of asking. */
async function askTime(ctx: FlowContext, date: string) {
  await save(ctx, { step: "ASK_TIME", date })

  const free = (await slotsForDate(date)).filter(s => s.available)
  if (free.length === 0) {
    await ask(ctx, "Someone just took the last slot that day. Let's pick another. 🙈")
    await askDate(ctx)
    return
  }

  // Nine times plus the way back fills the ten rows WhatsApp allows.
  const rows = free.slice(0, 9).map(slot => ({
    id: `${PREFIX}time_${date}_${slot.time}`,
    title: pretty(slot.time),
  }))
  rows.push({ id: `${PREFIX}otherday`, title: "← A different day" })

  const result = await sendInteractiveMessage({
    to: ctx.phone,
    body: `${dayLabel(date)} — here's what's free:`,
    list: { title: "Pick a time", sections: [{ title: dayLabel(date), rows }] },
    footerText: `${APP_TIMEZONE.split("/")[1]} time · ${await defaultDurationMins()} minutes`,
  })
  if (!result.success) {
    await ask(ctx, `${dayLabel(date)} — free times:\n\n${free.map(s => `• ${pretty(s.time)}`).join("\n")}\n\nReply with a time.`)
    return
  }
  await logBot(ctx, `Times for ${dayLabel(date)}`)
}

async function askConfirm(ctx: FlowContext) {
  const state = await getAppointmentState(ctx.conversationId)
  if (!state?.startsAt) return
  await save(ctx, { step: "CONFIRM" })

  const at = new Date(state.startsAt)
  const summary = [
    "Just to check I have this right:",
    "",
    `👤 ${state.name}`,
    state.email ? `✉️ ${state.email}` : "",
    `💼 ${state.service}`,
    state.companyName ? `🏢 ${state.companyName}` : "",
    state.companyWebsite ? `🌐 ${state.companyWebsite}` : "",
    "",
    `📅 ${new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIMEZONE, weekday: "long", day: "numeric", month: "long" }).format(at)}`,
    `🕐 ${new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIMEZONE, hour: "numeric", minute: "2-digit", hour12: true }).format(at)} (${await defaultDurationMins()} min)`,
  ].filter(Boolean).join("\n")

  const result = await sendInteractiveMessage({
    to: ctx.phone,
    body: summary,
    buttons: [
      { id: `${PREFIX}confirm`, title: "Confirm" },
      { id: `${PREFIX}retime`, title: "Change time" },
      { id: `${PREFIX}cancel`, title: "Cancel" },
    ],
  })
  if (!result.success) await ask(ctx, `${summary}\n\nReply YES to confirm.`)
  else await logBot(ctx, summary)
}

/**
 * Creates the appointment.
 *
 * The slot is checked again here. Between being offered a time and tapping it,
 * somebody else can take it — the gap is small but a double booking is worse
 * than an extra query.
 */
async function confirm(ctx: FlowContext) {
  const state = await getAppointmentState(ctx.conversationId)
  if (!state?.startsAt || !state.name || !state.service) return

  const startsAt = new Date(state.startsAt)
  if (!(await slotIsFree(startsAt))) {
    await ask(ctx, "Ah — someone booked that exact time a moment ago. Sorry! Let's find another. 🙏")
    await askDate(ctx)
    return
  }

  const appointment = await db.appointment.create({
    data: {
      reference: appointmentReference(),
      name: state.name,
      email: state.email || null,
      phone: ctx.phone,
      service: state.service,
      companyName: state.companyName || null,
      companyWebsite: state.companyWebsite || null,
      scheduledAt: startsAt,
      durationMins: await defaultDurationMins(),
      source: "WHATSAPP",
      customerId: ctx.customerId,
      conversationId: ctx.conversationId,
    },
  })

  // Awaited, not fired and forgotten: the Meet link is created by this call and
  // the customer is about to be told what it is.
  await syncAppointmentToCalendar(appointment.id)
  const saved = await db.appointment.findUnique({ where: { id: appointment.id } })

  await setState(ctx.conversationId, null)

  const at = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE, weekday: "long", day: "numeric", month: "long",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).format(startsAt)

  const body = [
    "Booked. ✅",
    "",
    `📅 ${at}`,
    `🔖 ${appointment.reference}`,
    saved?.meetLink ? `\n🎥 Join here:\n${saved.meetLink}` : "",
    saved?.meetLink ? "" : "\nWe'll send the joining details before we meet.",
    "\nIt's in our calendar. If you need to move it, just message me here.",
  ].filter(Boolean).join("\n")

  // A Meet link is worth a button: it is the one thing in the message the
  // customer will come back to tap when the meeting starts.
  const sent = saved?.meetLink
    ? await sendCtaUrlMessage({
        to: ctx.phone,
        body,
        buttonText: "Join the meeting",
        url: saved.meetLink,
        footerText: "The link stays the same — save this message",
      })
    : { success: false }
  if (!sent.success) await sendWhatsApp({ to: ctx.phone, body, allowOutsideSession: true })
  await logBot(ctx, body)

  await notifyStaff({
    type: "NEW_BOOKING",
    title: "New appointment",
    message: `${appointment.reference} · ${appointment.name} · ${appointment.service} · ${at}`,
    data: { appointmentId: appointment.id },
  })
}

// ── Entry points ─────────────────────────────────────────────────────────────

/** A tap on a list row or a button. */
export async function handleAppointmentReply(ctx: FlowContext, replyId: string): Promise<boolean> {
  const state = await getAppointmentState(ctx.conversationId)
  if (!state) return false

  const value = replyId.slice(PREFIX.length)

  if (value.startsWith("svc_")) {
    const services = await appointmentServices()
    const service = services[Number(value.slice(4))]
    if (!service) return true
    await save(ctx, { step: "ASK_COMPANY", service })
    await ask(ctx, `${service} — good choice.\n\nWhat's your company called? (Type *skip* if it's just you.)`)
    return true
  }

  if (value.startsWith("day_")) {
    await askTime(ctx, value.slice(4))
    return true
  }

  if (value === "otherday") {
    await askDate(ctx)
    return true
  }

  if (value.startsWith("time_")) {
    const [date, time] = value.slice(5).split("_")
    const startsAt = fromLocal(date, time)
    if (!(await slotIsFree(startsAt))) {
      await ask(ctx, "That one has just gone. Here's what's still free:")
      await askTime(ctx, date)
      return true
    }
    await save(ctx, { step: "CONFIRM", date, startsAt: startsAt.toISOString() })
    await askConfirm(ctx)
    return true
  }

  if (value === "confirm") { await confirm(ctx); return true }
  if (value === "retime") { await askDate(ctx); return true }
  if (value === "cancel") {
    await setState(ctx.conversationId, null)
    await ask(ctx, "No problem, nothing booked. Message me whenever you'd like to arrange something. 👋")
    return true
  }

  return false
}

/** A typed message, while a booking is part way through. */
export async function handleAppointmentText(ctx: FlowContext, text: string): Promise<boolean> {
  const state = await getAppointmentState(ctx.conversationId)
  if (!state) return false

  const value = text.trim()
  const skipped = /^(skip|none|no|n\/a|-)$/i.test(value)

  // An escape hatch at every step, so nobody is trapped in a form.
  if (/^(cancel|stop|quit|forget it)$/i.test(value)) {
    await setState(ctx.conversationId, null)
    await ask(ctx, "Cancelled — nothing booked. 👋")
    return true
  }

  switch (state.step) {
    case "ASK_NAME": {
      if (value.length < 2) { await ask(ctx, "Sorry, what name should I put it under?"); return true }
      await save(ctx, { step: "ASK_EMAIL", name: value.slice(0, 120) })
      await ask(ctx, `Thanks ${value.split(" ")[0]}. What email should the invite go to? (Or *skip*.)`)
      return true
    }

    case "ASK_EMAIL": {
      if (skipped) { await askService(ctx); return true }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        await ask(ctx, "That doesn't look like an email address — could you check it? Or type *skip*.")
        return true
      }
      await save(ctx, { step: "ASK_SERVICE", email: value })
      await askService(ctx)
      return true
    }

    case "ASK_SERVICE": {
      const services = await appointmentServices()
      // Typed answers are accepted as well as taps: a number, or the name.
      const byNumber = services[Number(value) - 1]
      const byName = services.find(s => s.toLowerCase() === value.toLowerCase())
        || services.find(s => s.toLowerCase().includes(value.toLowerCase()) && value.length > 2)
      const service = byNumber || byName || value.slice(0, 120)
      await save(ctx, { step: "ASK_COMPANY", service })
      await ask(ctx, `${service} — good choice.\n\nWhat's your company called? (Type *skip* if it's just you.)`)
      return true
    }

    case "ASK_COMPANY": {
      await save(ctx, { step: "ASK_WEBSITE", companyName: skipped ? undefined : value.slice(0, 200) })
      await ask(ctx, "And your website? (Or *skip*.)")
      return true
    }

    case "ASK_WEBSITE": {
      await save(ctx, { step: "ASK_DATE", companyWebsite: skipped ? undefined : value.slice(0, 300) })
      await askDate(ctx)
      return true
    }

    case "ASK_DATE": {
      const { parseCustomerDate } = await import("@/lib/booking-flow")
      const parsed = parseCustomerDate(value)
      if (!parsed) { await ask(ctx, "I didn't catch that date. Tap one of the days above, or say something like *next Tuesday*."); return true }
      await askTime(ctx, parsed)
      return true
    }

    case "ASK_TIME": {
      const free = (await slotsForDate(state.date!)).filter(s => s.available)
      // "4", "4pm", "16:00" and "4:00 PM" should all find the same slot.
      const wanted = value.toLowerCase().replace(/[.\s]/g, "")
      const match = free.find(s => {
        const hour24 = Number(s.time.split(":")[0])
        const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
        const meridiem = hour24 >= 12 ? "pm" : "am"
        return [s.time, s.time.replace(":00", ""), `${hour12}${meridiem}`, `${hour12}:00${meridiem}`, String(hour12)]
          .includes(wanted)
      })
      if (!match) {
        await ask(ctx, `I don't have that one free. Still available: ${free.map(s => pretty(s.time)).join(", ")}`)
        return true
      }
      await save(ctx, { step: "CONFIRM", startsAt: match.startsAt.toISOString() })
      await askConfirm(ctx)
      return true
    }

    case "CONFIRM": {
      if (/^(yes|y|yep|confirm|ok|okay|sure|book it|نعم)$/i.test(value)) { await confirm(ctx); return true }
      if (/^(no|change|another|different)/i.test(value)) { await askDate(ctx); return true }
      await ask(ctx, "Reply *yes* to confirm, or *change* to pick another time.")
      return true
    }

    default:
      return false
  }
}
