/**
 * Bot flow execution engine
 *
 * Per BRD §6.5.6: "Visual bot/flow builder: Drag-and-drop conversation flow
 * builder (trigger → condition → action)" and "Keyword & intent triggers".
 *
 * The bot-builder UI stores flows as nodes + edges. This runs them.
 *
 * Flows are evaluated before the LLM assistant: a matching flow is a
 * deterministic, zero-cost answer, and the operator explicitly authored it, so
 * it should win over a generated reply.
 */

import { db } from "@/lib/db"
import { publish } from "@/lib/realtime"
import { Prisma } from "@prisma/client"
import { sendWhatsApp, sendInteractiveMessage } from "@/lib/flow-delivery"
import { runNode, type NodeKind } from "@/lib/flow-nodes"
import { loadFlowRuntimeData } from "@/lib/flow-runtime-data"
import { normalizeFlowGraph } from "@/lib/flow-normalizer"

/**
 * The node types the walk loop handles itself. Everything else is vocabulary
 * added later and lives in flow-nodes.ts, so this loop stays readable as the
 * language grows.
 */
const DELEGATED = new Set<string>([
  "BUTTONS", "LIST", "MEDIA", "DELAY", "AI", "HTTP", "SET", "TAG",
  "ASSIGN", "TEMPLATE", "SPLIT", "HOURS", "END", "PRODUCT", "CATALOG",
  "APPOINTMENT", "APT_RESCHEDULE", "HOSPITAL", "HOSP_CHEMO", "HOSP_DOCTOR",
  "HOSP_BED_MAP", "TOUR", "TOUR_DETAILS", "TOUR_AVAIL", "PAYMENT",
  "BANK_TRANSFER", "CTA_URL", "LOCATION", "VISA", "RESTAURANT", "BOOKING",
  "RESTAURANT_MENU", "RESTAURANT_ORDER_STATUS", "HOSPITAL_AVAILABILITY",
])

export type FlowNode = {
  id: string
  type: string
  data?: {
    text?: string
    buttons?: { id: string; title: string }[]
    field?: string
    op?: "equals" | "contains" | "gt" | "lt"
    value?: string
    action?: string
    /** QUESTION: the key the answer is stored under. */
    name?: string
    /** QUESTION: how the answer is validated and asked for. */
    inputType?: "text" | "email" | "phone" | "select" | "date" | "number"
    /** QUESTION: choices, when inputType is select. */
      options?: string[]
      rows?: { id: string; title: string; description?: string }[]
    /** QUESTION: whether an answer is required before moving on. */
    required?: boolean
  }
}

/**
 * The version of a flow that customers actually meet.
 *
 * Editing an active flow used to change what customers were being asked
 * mid-conversation, the moment Save was pressed — there was no draft. The
 * columns for a published copy existed and nothing read or wrote them.
 *
 * A flow that has been published runs its published copy, so editing is safe
 * again and takes effect when its author says so. A flow that has never been
 * published runs its draft exactly as before, which is what keeps this change
 * from taking every existing flow offline the moment it ships.
 */
function activeGraph(flow: { nodes: unknown; edges: unknown; publishedNodes?: unknown; publishedEdges?: unknown }) {
  const published = normalizeFlowGraph(flow.publishedNodes, flow.publishedEdges)
  if (published.nodes.length > 0) return published
  return normalizeFlowGraph(flow.nodes, flow.edges)
}

/** Where a customer is inside a flow that asks questions, and what they said. */
export type FlowSession = {
  runId?: string
  flowId: string
  nodeId: string
  answers: Record<string, string>
  startedAt: string
}

export type FlowEdge = { id?: string; source: string; target: string; label?: string }

export type FlowContext = {
  runId?: string
  channel?: "WHATSAPP" | "FACEBOOK" | "INSTAGRAM"
  tenantId: string
  conversationId: string
  customerId: string
  customerPhone: string
  message: string
  buttonId?: string
  intent?: string
}

export type FlowResult = { matched: boolean; handledBy?: string; handoff?: boolean }

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as T[]) : []
    } catch {
      return []
    }
  }
  return []
}

function asObject(value: unknown): Record<string, any> {
  if (typeof value !== "string") return (value && typeof value === "object" ? value : {}) as Record<string, any>
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export function triggerMatches(flow: { trigger: string; triggerConfig: unknown }, ctx: FlowContext): boolean {
  const selected = asObject(flow.triggerConfig).channels
  const channels = Array.isArray(selected) ? selected : ["WHATSAPP"]
  if (!channels.includes(ctx.channel || "WHATSAPP")) return false
  if (flow.trigger === "ALWAYS") return true;
  const config = asObject(flow.triggerConfig) as { keywords?: string[]; intents?: string[]; matchType?: string }

  if (flow.trigger === "KEYWORD") {
    const text = ctx.message.trim().toLowerCase()
    const keywords = (config.keywords || []).map(k => k.toLowerCase())

    /*
     * "any" is a catch-all: the flow answers whatever the customer opens with.
     *
     * A business with one flow should not have to guess every word a customer
     * might type, in two languages, to be answered at all — and a keyword list
     * that misses means silence, which reads as a broken number. Deliberately
     * explicit rather than implied by an empty list, because an empty list is
     * far more often a half-finished flow than an intended catch-all, and that
     * one would answer everything by accident.
     */
    if (config.matchType === "any") return text.length > 0
    if (keywords.length === 0) return false
    if (config.matchType === "exact") return keywords.includes(text)

    /*
     * A short keyword must not match inside a longer word.
     *
     * Plain `includes` meant a flow triggered on "hi" fired on "this is broken"
     * and one triggered on "no" fired on "not now" — the customer gets an
     * unrelated flow and the message they actually sent is never answered.
     * Short keywords are the dangerous ones, so those are matched on a word
     * boundary; longer ones keep substring matching, where "book" still catches
     * "bookings" and that is what the author meant.
     */
    return keywords.some(k => {
      if (k.length > 3) return text.includes(k)
      const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      return new RegExp(`\\b${escaped}\\b`).test(text)
    })
  }

  if (flow.trigger === "INTENT") {
    if (!ctx.intent) return false
    return (config.intents || []).includes(ctx.intent)
  }

  if (flow.trigger === "NEW_CONVERSATION") {
    return false // handled explicitly at conversation creation, not per message
  }

  return false
}

async function evaluateCondition(
  node: FlowNode,
  ctx: FlowContext,
  answers: Record<string, string> = {},
  runtime: Record<string, string> = {},
): Promise<boolean> {
  const { field, op = "equals", value = "" } = node.data || {}
  if (!field) return true

  let actual: string | number | null = null

  if (field === "message") actual = ctx.message
  else if (field === "intent") actual = ctx.intent ?? null
  else if (answers[field] !== undefined) {
    // CONDITION on a saved answer — the most common case in a multi-step flow.
    actual = answers[field]
  } else if (runtime[field] !== undefined) {
    actual = runtime[field]
  } else if (field === "has_open_order") {
    const count = await db.order.count({
      where: { tenantId: ctx.tenantId, customerId: ctx.customerId, orderStatus: { in: ["PENDING_PAYMENT", "PAYMENT_SUBMITTED", "CONFIRMED"] } },
    })
    actual = count
  } else if (field === "order_count") {
    actual = await db.order.count({ where: { tenantId: ctx.tenantId, customerId: ctx.customerId } })
  }

  if (actual === null) return false

  switch (op) {
    case "equals":
      return String(actual).toLowerCase() === value.toLowerCase()
    case "contains":
      return String(actual).toLowerCase().includes(value.toLowerCase())
    case "gt":
      return Number(actual) > Number(value)
    case "lt":
      return Number(actual) < Number(value)
    default:
      return false
  }
}

function interpolate(text: string, ctx: FlowContext, extra: Record<string, string> = {}): string {
  /*
   * `{{answers.name}}` and `{{name}}` have to mean the same thing.
   *
   * The delegated nodes resolve tokens through `fill()` in flow-nodes.ts, which
   * strips an `answers.` or `vars.` prefix before looking the value up. This did
   * not, so the identical token rendered correctly inside a BUTTONS node and
   * came out as literal `{{answers.name}}` in a MESSAGE node — in front of the
   * customer. Same stripping, same behaviour, wherever a token is written.
   */
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (whole, key: string) => {
    return extra[key] ?? extra[key.replace(/^(answers|vars)\./, "")] ?? whole
  })
}

/**
 * Checks an answer against the kind of thing the question asked for.
 *
 * Returning the cleaned value rather than a boolean, so a phone number typed
 * with spaces or an option chosen by its number both become the thing the
 * operator expected to receive.
 */
export function validateAnswer(node: FlowNode, raw: string): { ok: true; value: string } | { ok: false; retry: string } {
  const text = raw.trim()
  const type = node.data?.inputType ?? "text"

  if (!text) return { ok: false, retry: "Please type an answer." }

  if (type === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      return { ok: false, retry: "That doesn't look like an email address — could you check it?" }
    }
  } else if (type === "phone") {
    const digits = text.replace(/[^0-9+]/g, "")
    if (digits.replace(/\D/g, "").length < 8) {
      return { ok: false, retry: "Please send a phone number including the country code." }
    }
    return { ok: true, value: digits }
  } else if (type === "number") {
    if (!/^\s*-?\d+(?:\.\d+)?\s*$/.test(text)) {
      return { ok: false, retry: "Please reply with a number." }
    }
    const n = Number(text.trim())
    if (!Number.isFinite(n)) return { ok: false, retry: "Please reply with a number." }
    return { ok: true, value: String(n) }
  } else if (type === "select" || node.type === "BUTTONS" || node.type === "LIST") {
    const choices: { id?: string; title: string }[] = [
      ...(Array.isArray(node.data?.buttons) ? node.data.buttons.map((b: any, i: number) => ({ id: String(b.id || `btn_${i}`), title: String(b.title || b.text || b.label || b.id || "") })) : []),
      ...(Array.isArray(node.data?.options) ? node.data.options.map((o: any, i: number) => ({ id: String(o?.id || `opt_${i}`), title: typeof o === "string" ? o : String(o?.title || o?.label || o?.text || o?.name || o?.value || "") })) : []),
      ...(Array.isArray(node.data?.rows) ? node.data.rows.map((r: any, i: number) => ({ id: String(r.id || `row_${i}`), title: String(r.title || r.label || r.id || "") })) : []),
    ]
    const options = choices.map(c => c.title).filter(Boolean)
    // Accept by ID (e.g. opt_0, b1), by index (e.g. 1), or by title
    const byId = choices.find(c => c.id && c.id.toLowerCase() === text.toLowerCase())
    if (byId) return { ok: true, value: byId.title }

    const byIndex = Number(text)
    if (Number.isInteger(byIndex) && byIndex >= 1 && byIndex <= choices.length) {
      return { ok: true, value: choices[byIndex - 1].title }
    }
    const match = choices.find(c => c.title.toLowerCase() === text.toLowerCase())
      ?? choices.find(c => c.title.toLowerCase().includes(text.toLowerCase()) && text.length >= 3)
    if (!match && options.length > 0) {
      return { ok: false, retry: `Please choose one of: ${options.join(", ")}` }
    }
    return { ok: true, value: match ? match.title : text }
  } else if (type === "date") {
    const parsed = parseDate(text)
    if (!parsed) {
      return { ok: false, retry: "I couldn't read that date. Try *15 Aug*, *15/8* or *2026-08-15*." }
    }
    return { ok: true, value: parsed }
  }

  return { ok: true, value: text.slice(0, 500) }
}

/** Reads the dates people actually type, and never returns one in the past. */
export function parseDate(input: string): string | null {
  const text = input.trim().toLowerCase()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (text === "today") return today.toISOString().slice(0, 10)
  if (text === "tomorrow") {
    const d = new Date(today)
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  }

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  const slash = text.match(/^(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?$/)
  const named = text.match(/^(\d{1,2})\s*([a-z]{3,})\s*(\d{4})?$/)

  let year = today.getFullYear()
  let month: number | null = null
  let day: number | null = null

  if (iso) {
    year = Number(iso[1]); month = Number(iso[2]); day = Number(iso[3])
  } else if (slash) {
    day = Number(slash[1]); month = Number(slash[2])
    if (slash[3]) year = Number(slash[3].length === 2 ? `20${slash[3]}` : slash[3])
  } else if (named) {
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
    const index = months.findIndex(m => named[2].startsWith(m))
    if (index === -1) return null
    day = Number(named[1]); month = index + 1
    if (named[3]) year = Number(named[3])
  } else {
    return null
  }

  if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) return null

  const date = new Date(Date.UTC(year, month - 1, day))
  // Reject a date that does not exist, such as 31 February.
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null

  // A bare "3 Jan" in December means next January, not ten months ago.
  if (date < today && !iso?.[1] && !slash?.[3] && !named?.[3]) {
    date.setUTCFullYear(date.getUTCFullYear() + 1)
  }

  return date.toISOString().slice(0, 10)
}

/**
 * Sends one node's question in the richest format WhatsApp allows.
 *
 * Select questions with 2–3 options use reply buttons (one tap, no typing).
 * Select questions with 4–10 options use a list message (scrollable picker).
 * All other questions, and any select that overflows those limits, fall back
 * to plain text so the customer can always type an answer.
 */
async function ask(ctx: FlowContext, node: FlowNode, name: string, variables: Record<string, string>): Promise<void> {
  const prompt = interpolate(node.data?.text ?? "", ctx, { ...variables, name })
  const rawOptions = (node.data?.options ?? []) as any[]
  const isSelect = (node.data?.inputType === "select" || node.type === "BUTTONS" || node.type === "LIST") && rawOptions.length > 0

  const parsedOptions = rawOptions.map((o, i) => {
    if (typeof o === "string") return { id: `opt_${i}`, title: o }
    const title = String(o?.title || o?.label || o?.text || o?.name || o?.value || `Option ${i + 1}`)
    const id = String(o?.id || `opt_${i}`)
    return { id, title }
  })

  // ── WhatsApp interactive: reply buttons (2–3 options) ──────────────────────
  if (isSelect && parsedOptions.length >= 2 && parsedOptions.length <= 3) {
    const buttons = parsedOptions.map(o => ({ id: o.id.slice(0, 256), title: o.title.slice(0, 20) }))
    const result = await sendInteractiveMessage({
      to: ctx.customerPhone,
      body: prompt,
      buttons,
    })
    await db.message.create({
      data: {
        conversationId: ctx.conversationId,
        customerId: ctx.customerId,
        direction: "BOT",
        type: "TEXT",
        content: prompt,
        isAiGenerated: false,
        status: result.success ? "SENT" : "FAILED",
      },
    })
    if (!result.success) throw new Error("Flow question delivery failed")
    publish({ type: "message", conversationId: ctx.conversationId, direction: "BOT", preview: prompt.slice(0, 120), tenantId: ctx.tenantId })
    return
  }

  // ── WhatsApp interactive: list picker (4–10 options) ───────────────────────
  if (isSelect && parsedOptions.length >= 4 && parsedOptions.length <= 10) {
    const rows = parsedOptions.map(o => ({ id: o.id.slice(0, 200), title: o.title.slice(0, 24) }))
    const result = await sendInteractiveMessage({
      to: ctx.customerPhone,
      body: prompt,
      list: {
        title: "Choose",
        sections: [{ title: "Options", rows }],
      },
    })
    await db.message.create({
      data: {
        conversationId: ctx.conversationId,
        customerId: ctx.customerId,
        direction: "BOT",
        type: "TEXT",
        content: prompt,
        isAiGenerated: false,
        status: result.success ? "SENT" : "FAILED",
      },
    })
    if (!result.success) throw new Error("Flow question delivery failed")
    publish({ type: "message", conversationId: ctx.conversationId, direction: "BOT", preview: prompt.slice(0, 120), tenantId: ctx.tenantId })
    return
  }

  // ── Plain text fallback (1 option, >10 options, or non-select) ─────────────
  const body = isSelect && parsedOptions.length > 0
    ? `${prompt}\n\n${parsedOptions.map((o, i) => `${i + 1}. ${o.title}`).join("\n")}\n\nReply with a number or the name.`
    : prompt

  const result = await sendWhatsApp({ to: ctx.customerPhone, body, allowOutsideSession: true })
  await db.message.create({
    data: {
      conversationId: ctx.conversationId,
      customerId: ctx.customerId,
      direction: "BOT",
      type: "TEXT",
      content: body,
      isAiGenerated: false,
      status: result.success ? "SENT" : "FAILED",
    },
  })
  if (!result.success) throw new Error("Flow message delivery failed")
  publish({ type: "message", conversationId: ctx.conversationId, direction: "BOT", preview: body.slice(0, 120), tenantId: ctx.tenantId })
}

/**
 * Walks a flow from a node until it needs the customer to say something.
 *
 * Flows that ask questions cannot run to completion in one pass — the engine
 * has to stop at each question, remember where it was, and pick up when the
 * answer arrives. The position and the answers so far live on the conversation.
 */
async function walk(ctx: FlowContext, flow: { id: string; name: string; nodes: unknown; edges: unknown }, startId: string, answers: Record<string, string>): Promise<FlowResult> {
  const existingRun = ctx.runId ? await db.flowRun.findFirst({ where: { id: ctx.runId, tenantId: ctx.tenantId, flowId: flow.id, conversationId: ctx.conversationId } }) : null
  const run = existingRun || await db.flowRun.create({ data: { tenantId: ctx.tenantId, flowId: flow.id, conversationId: ctx.conversationId, customerId: ctx.customerId, currentNodeId: startId, status: "RUNNING", path: [] } })
  if (existingRun) await db.flowRun.update({ where: { id: run.id }, data: { status: "RUNNING", resumeAt: null, endedAt: null } })
  try {
    const result = await walkSteps({ ...ctx, runId: run.id }, flow, startId, answers)
    const conversation = await db.conversation.findUnique({ where: { id: ctx.conversationId }, select: { flowState: true } })
    await db.flowRun.update({ where: { id: run.id }, data: { status: result.handoff ? "HANDOFF" : conversation?.flowState ? "WAITING" : "DONE", variables: answers, endedAt: conversation?.flowState && !result.handoff ? null : new Date() } })
    return result
  } catch (error) {
    await db.flowRun.update({ where: { id: run.id }, data: { status: "FAILED", error: "Flow execution failed. Review this step's configuration and delivery logs.", endedAt: new Date() } })
    await db.conversation.update({ where: { id: ctx.conversationId }, data: { flowState: Prisma.DbNull, botActive: false, automationPaused: true, status: "PENDING" } })
    return { matched: true, handoff: true, handledBy: flow.name }
  }
}

async function walkSteps(
  ctx: FlowContext,
  flow: { id: string; name: string; nodes: unknown; edges: unknown },
  startId: string,
  answers: Record<string, string>,
): Promise<FlowResult> {
  const normalized = activeGraph(flow)
  const nodes = normalized.nodes as FlowNode[]
  const edges = normalized.edges as FlowEdge[]
  if (ctx.channel && ctx.channel !== "WHATSAPP") {
    const { SOCIAL_FLOW_NODES } = await import("./flow-delivery")
    if (nodes.some(node => !SOCIAL_FLOW_NODES.has(node.type))) {
      await db.conversation.update({ where: { id: ctx.conversationId }, data: { automationPaused: true, status: "PENDING" } })
      return { matched: true, handoff: true, handledBy: flow.name }
    }
  }
  const byId = new Map(nodes.map(n => [n.id, n]))
  const outgoing = (id: string) => edges.filter(e => e.source === id)

  const customer = await db.customer.findFirst({ where: { id: ctx.customerId, tenantId: ctx.tenantId }, select: { name: true } })
  const name = customer?.name || "there"

  let current: FlowNode | undefined = byId.get(startId)
  let handoff = false
  const runHistory = ctx.runId ? await db.flowRun.findUnique({ where: { id: ctx.runId }, select: { path: true } }) : null
  const path: string[] = Array.isArray(runHistory?.path) ? runHistory.path.map(String) : []

  // Bounded so a flow authored with a cycle cannot hang the webhook.
  let step = 0
  for (; step < 25 && current; step++) {
    path.push(current.id)
    if (ctx.runId) await db.flowRun.update({ where: { id: ctx.runId }, data: { currentNodeId: current.id, path: path.slice(-500) } })
    // Refresh before every node so an order, appointment or hospital record
    // created by an earlier node is visible immediately to later nodes.
    const live = await loadFlowRuntimeData({ tenantId: ctx.tenantId, customerId: ctx.customerId, customerPhone: ctx.customerPhone })
    const variables = { ...live, ...answers, name }
    if (DELEGATED.has(current.type)) {
      const outcome = await runNode(current.type as NodeKind, (current.data ?? {}) as never, {
        conversationId: ctx.conversationId,
        customerId: ctx.customerId,
        customerPhone: ctx.customerPhone,
        tenantId: ctx.tenantId,
        variables,
        lastMessage: ctx.message,
      })
      if (outcome.set) Object.assign(answers, outcome.set)

      if (outcome.handoff) { handoff = true; break }
      if (outcome.end) break

      // A node that is waiting — for a tap, or for a timer — stores where it
      // got to and stops. The reply, or the cron, picks it up from there.
      if (outcome.wait) {
        const seconds = typeof outcome.wait === "object" ? outcome.wait.seconds : 0
        await db.conversation.update({
          where: { id: ctx.conversationId },
          data: {
            flowState: JSON.stringify({
              flowId: flow.id, nodeId: current.id, answers, startedAt: new Date().toISOString(), runId: ctx.runId,
            } satisfies FlowSession),
          },
        })
        if (seconds > 0) {
          const next = outgoing(current.id)[0]
          await db.flowRun.update({
            where: { id: ctx.runId! },
            data: {
              tenantId: ctx.tenantId,
              flowId: flow.id,
              conversationId: ctx.conversationId,
              customerId: ctx.customerId,
              status: "WAITING",
              currentNodeId: next?.target ?? current.id,
              variables: answers,
              resumeAt: new Date(Date.now() + seconds * 1000),
            },
          })
        }
        return { matched: true, handledBy: flow.name, handoff: false }
      }

      const outgoingEdges = outgoing(current.id)
      if (outgoingEdges.length === 0) break
      // A labelled branch when the node chose one — "ok"/"failed" from a call,
      // "open"/"closed" from business hours — and the first edge otherwise.
      const chosen = outcome.branch
        ? outgoingEdges.find(e => (e.label || "").toLowerCase() === outcome.branch) ?? outgoingEdges[0]
        : outgoingEdges[0]
      current = byId.get(chosen.target)
      continue
    }

    if (current.type === "QUESTION") {
      await ask(ctx, current, name, variables)
      await db.conversation.update({
        where: { id: ctx.conversationId },
        data: {
          flowState: JSON.stringify({
            flowId: flow.id, nodeId: current.id, answers, startedAt: new Date().toISOString(), runId: ctx.runId,
          } satisfies FlowSession),
        },
      })
      return { matched: true, handledBy: flow.name, handoff: false }
    }

    if (current.type === "MESSAGE" && current.data?.text) {
      const body = interpolate(current.data.text, ctx, variables)
      const result = await sendWhatsApp({ to: ctx.customerPhone, body, allowOutsideSession: true })
      await db.message.create({
        data: {
          conversationId: ctx.conversationId,
          customerId: ctx.customerId,
          direction: "BOT",
          type: "TEXT",
          content: body,
          isAiGenerated: false,
          status: result.success ? "SENT" : "FAILED",
        },
      })
      if (!result.success) throw new Error("Flow message delivery failed")
  publish({ type: "message", conversationId: ctx.conversationId, direction: "BOT", preview: body.slice(0, 120) })
    }

    const savesLead = current.type === "SAVE" || (current.type === "ACTION" && current.data?.action === "SAVE_LEAD")
    const savesAppointment = current.type === "ACTION" && current.data?.action === "SAVE_APPOINTMENT"

    if (savesLead || savesAppointment) {
      // The enquiry is recorded and staff are told, which is the whole point of
      // asking the questions.
      const lead = await db.lead.create({
        data: {
          conversationId: ctx.conversationId,
          customerId: ctx.customerId,
          flowId: flow.id,
          flowName: flow.name,
          answers: JSON.stringify(answers),
        },
      })

      // A consultation is not a tour. Recording it as one meant inventing a
      // fake tour and a fake slot for every enquiry, which is how a flow asking
      // for a company website ended up producing a desert safari booking.
      let appointmentRef: string | null = null
      if (savesAppointment) {
        appointmentRef = await saveAppointmentFromAnswers(flow, ctx, answers, lead.id)
      }

      // Dynamic payment gateway: when customer selects Card Payment, create an order and
      // send an AmwalPay hosted payment link directly in WhatsApp.
      const payVal = String(answers.payment_method || answers.course_payment || answers.payment || "").toLowerCase()
      if (payVal.includes("card") || payVal.includes("amwalpay") || payVal.includes("online")) {
        try {
          const origin = process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud"
          const conv = await db.conversation.findUnique({ where: { id: ctx.conversationId }, select: { tenantId: true } })

          // Determine the price: use explicit answers, or infer from activity selected
          let amount = Number(answers.total_price || answers.price || 0)
          if (!amount) {
            const activity = String(answers.activity_option || "").toLowerCase()
            amount = activity.includes("training") || activity.includes("course") ? 70 : 25
          }

          // Find or create a stub tour/slot for this flow so the order schema is satisfied
          let tour = await db.tour.findFirst({
            where: { tenantId: conv?.tenantId || undefined, status: "ACTIVE" },
          })
          let slot = tour ? await db.slot.findFirst({ where: { tourId: tour.id } }) : null

          if (tour && slot) {
            const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`
            const customerName = answers.full_name || answers.rider_name || answers.trainee_name || name
            const order = await db.order.create({
              data: {
                orderNumber,
                tenantId: conv?.tenantId || "",
                customerId: ctx.customerId,
                tourId: tour.id,
                slotId: slot.id,
                customerName,
                customerPhone: answers.contact_phone || answers.course_phone || ctx.customerPhone,
                customerEmail: answers.email_address || undefined,
                paxAdult: 1,
                paxChild: 0,
                subtotal: amount,
                totalAmount: amount,
                paymentMethod: "AMWALPAY",
                paymentStatus: "PENDING",
                orderStatus: "PENDING_PAYMENT",
              },
            })

            // Send the payment link directly via WhatsApp
            const payLink = `${origin}/api/amwalpay/create-session?orderId=${order.id}`
            const payMsg = [
              `💳 *Secure Card Payment — AL BAHR STABLE*`,
              ``,
              `🎫 Order: *${orderNumber}*`,
              `💰 Amount: *${amount} OMR*`,
              `👤 Name: ${customerName}`,
              ``,
              `Tap the link below to pay securely online:`,
              `🔗 ${payLink}`,
              ``,
              `_Payment is processed securely through AmwalPay._`,
            ].join("\n")
            const res = await sendWhatsApp({ to: ctx.customerPhone, body: payMsg, allowOutsideSession: true })
            await db.message.create({
              data: {
                conversationId: ctx.conversationId,
                customerId: ctx.customerId,
                direction: "BOT",
                type: "TEXT",
                content: payMsg,
                status: res.success ? "SENT" : "FAILED",
              },
            })
            publish({ type: "message", conversationId: ctx.conversationId, direction: "BOT", preview: `💳 Payment link sent — ${amount} OMR` })
          }
        } catch (payErr) {
          console.error("Error creating dynamic payment gateway link in BotFlow:", payErr)
        }
      }

      const { notifyStaff } = await import("@/lib/realtime")
      await notifyStaff({
        type: "NEW_BOOKING",
        title: appointmentRef ? `New appointment — ${flow.name}` : `New enquiry — ${flow.name}`,
        message: Object.entries(answers).map(([k, v]) => `${k}: ${v}`).join(" · ").slice(0, 300),
        data: { conversationId: ctx.conversationId },
      })
    }

    if (current.type === "HANDOFF") {
      handoff = true
      break
    }

    const next = outgoing(current.id)
    if (next.length === 0) break

    if (current.type === "CONDITION") {
      const passed = await evaluateCondition(current, ctx, answers, variables)

      /*
       * A branch is chosen by what its label means, not by one spelling of it.
       *
       * This matched only "true" and "false" and fell back to the first edge in
       * the array otherwise — so a flow labelled yes/no, which is what both the
       * builder and the shipped templates produce, took whichever branch
       * happened to be drawn first. Silently: a customer accepting terms was
       * shown the refusal, and nothing anywhere recorded that a condition had
       * not been understood.
       *
       * The fallback stays, because a condition with one outgoing edge is a
       * legitimate "carry on", but it is now only reached when no label
       * expresses an answer at all.
       */
      const YES = new Set(["true", "yes", "y", "1"])
      const NO = new Set(["false", "no", "n", "0"])
      const wanted = passed ? YES : NO
      const other = passed ? NO : YES
      const labelled = next.filter(e => {
        const label = (e.label || "").trim().toLowerCase()
        return YES.has(label) || NO.has(label)
      })
      const branch =
        next.find(e => wanted.has((e.label || "").trim().toLowerCase())) ??
        // Only one side is drawn and it is the other side: the flow has nowhere
        // to go, so it stops rather than taking that branch by accident.
        (labelled.some(e => other.has((e.label || "").trim().toLowerCase())) ? undefined : next[0])
      if (!branch) break
      current = byId.get(branch.target)
    } else {
      current = byId.get(next[0].target)
    }
  }

  if (step === 25 && current) {
    // Reaching the execution budget is an error, never a successful completion.
    throw new Error("Flow exceeded its synchronous execution budget")
  }
  // The flow is finished, so the customer returns to open conversation.
  await db.conversation.update({
    where: { id: ctx.conversationId },
    data: {
      flowState: Prisma.DbNull,
      lastMessageAt: new Date(),
      ...(handoff ? { botActive: false, status: "PENDING" } : {}),
    },
  })

  return { matched: true, handledBy: flow.name, handoff }
}

/**
 * Continues a flow that is waiting on an answer.
 *
 * Returns matched:false when there is nothing in progress, so the caller
 * carries on to the booking flow or the assistant as before.
 */
/** How long a half-finished flow keeps its place. Meta's own reply window. */
const FLOW_SESSION_TTL_MS = 24 * 60 * 60 * 1000

export async function resumeFlow(ctx: FlowContext): Promise<FlowResult> {
  const conversation = await db.conversation.findUnique({
    where: { id: ctx.conversationId },
    select: { flowState: true, tenantId: true },
  })
  if (!conversation || conversation.tenantId !== ctx.tenantId) return { matched: false }
  const raw = conversation?.flowState
  if (!raw) return { matched: false }

  const session = (typeof raw === "string" ? asObject(raw) : raw) as FlowSession
  ctx.runId = session.runId
  if (session.runId) {
    const waiting = await db.flowRun.findFirst({ where: { id: session.runId, tenantId: ctx.tenantId, status: "WAITING", resumeAt: { gt: new Date() } } })
    if (waiting && !/^(cancel|stop|exit|quit|إلغاء|توقف)$/i.test(ctx.message.trim())) return { matched: true, handledBy: "Waiting for scheduled continuation" }
  }

  /*
   * A conversation does not stay half-way through a flow for ever.
   *
   * There is already a rule further down: after four hours, a *greeting*
   * starts the flow again. It covers the common case and leaves the other one
   * open — anything that is not "hi" resumed the old session however old it
   * was, so a customer's next message, whenever it came, was read as the
   * answer to a question asked days earlier. Live at the time of writing: two
   * customers stopped at the language question on 31 August, and one inside
   * the hospital flow since 29 August. A word other than "hi" would have been
   * taken as their language.
   *
   * A day is the useful outer limit because it is Meta's: past the 24-hour
   * window a freeform reply cannot be delivered anyway, so a flow still
   * waiting on one is already over. Expiring returns `matched: false`, which
   * hands the message to ordinary handling rather than to a question the
   * customer has long forgotten asking.
   */
  const sessionBegan = Date.parse(session.startedAt ?? "")
  if (Number.isFinite(sessionBegan) && Date.now() - sessionBegan > FLOW_SESSION_TTL_MS) {
    await db.conversation.update({
      where: { id: ctx.conversationId },
      data: { flowState: Prisma.DbNull },
    })
    return { matched: false }
  }

  const flow = await db.botFlow.findFirst({ where: { id: session.flowId, tenantId: ctx.tenantId } })
  if (!flow || !flow.isActive) {
    await db.conversation.update({ where: { id: ctx.conversationId }, data: { flowState: Prisma.DbNull } })
    return { matched: false }
  }

  const normalized = activeGraph(flow)
  const nodes = normalized.nodes as FlowNode[]
  const node = nodes.find(n => n.id === session.nodeId)
  if (!node) {
    await db.conversation.update({ where: { id: ctx.conversationId }, data: { flowState: Prisma.DbNull } })
    return { matched: false }
  }

  // If the flow has been abandoned for more than 4 hours and the customer says "hi" or greeting, start fresh
  const startedAt = session.startedAt ? new Date(session.startedAt).getTime() : 0
  const isStale = startedAt > 0 && (Date.now() - startedAt) > 4 * 60 * 60 * 1000
  // What people actually type to start over. "book" was missing while the
  // Arabic حجز was already here, so an English speaker had no way out.
  const isGreeting = /^(hi|hii|hello|helo|hey|start|restart|menu|book|booking|مرحبا|مرحباً|أهلا|حجز|احجز|هلا|السلام عليكم|ابدأ)$/i.test(ctx.message.trim())
  if (isStale && isGreeting) {
    await db.conversation.update({ where: { id: ctx.conversationId }, data: { flowState: Prisma.DbNull } })
    return { matched: false }
  }

  // A customer who has changed their mind must not be trapped in a form.
  if (/^(cancel|stop|exit|quit|إلغاء|توقف)$/i.test(ctx.message.trim())) {
    await db.flowRun.updateMany({ where: { conversationId: ctx.conversationId, status: "WAITING" }, data: { status: "CANCELLED", endedAt: new Date() } })
    await db.conversation.update({ where: { id: ctx.conversationId }, data: { flowState: Prisma.DbNull } })
    await sendWhatsApp({
      to: ctx.customerPhone,
      body: "No problem — I've stopped that. Ask me anything whenever you're ready.",
      allowOutsideSession: true,
    })
    return { matched: true, handledBy: flow.name, handoff: false }
  }

  const checked = validateAnswer(node, ctx.message)
  if (!checked.ok) {
    let smartRecoveryMessage = checked.retry
    try {
      const isQuestionOrChat = /[?؟]|how|what|where|when|why|who|cost|price|location|time|policy|cancel|refund|address|discount|كم|متى|وين|أين|كيف|سعر|موقع/i.test(ctx.message)
      if (isQuestionOrChat && ctx.message.trim().length >= 3) {
        const { aiChat } = await import("@/lib/ai")
        const aiExplanation = await aiChat(
          [{ role: "user", content: `A customer in a WhatsApp flow step asked: "${ctx.message}". Answer concisely in 1-2 short sentences in their language. Do not ask unrelated questions.` }],
          "en",
          ctx.customerPhone
        )
        if (aiExplanation && !aiExplanation.includes("trouble responding")) {
          smartRecoveryMessage = `${aiExplanation.trim()}\n\n👉 *To continue:* ${checked.retry}`
        }
      }
    } catch {}

    /*
     * Ask again with the choices, not a sentence listing them.
     *
     * The retry went out as plain text — "Please choose one of: English,
     * العربية" — with nothing to tap. Somebody who typed instead of tapping
     * was left looking at a dead end and had to guess the exact wording.
     *
     * `ask` builds its buttons from `options`, so a BUTTONS step, which keeps
     * its choices under `buttons`, produced a plain message here too. The
     * titles are collected from whichever field this node uses and handed over
     * as options, so the customer gets the same tappable message again with
     * the reason on top.
     */
    const retryChoices: string[] = [
      ...(Array.isArray(node.data?.buttons)
        ? node.data.buttons.map((b: any) => String(b?.title || b?.text || "")) : []),
      ...(Array.isArray(node.data?.options)
        ? node.data.options.map((o: any) => (typeof o === "string" ? o : String(o?.title || o?.label || o?.value || ""))) : []),
      ...(Array.isArray(node.data?.rows)
        ? node.data.rows.map((r: any) => String(r?.title || "")) : []),
    ].filter(Boolean)

    if (retryChoices.length >= 2) {
      await ask(
        ctx,
        { ...node, data: { ...node.data, text: smartRecoveryMessage, inputType: "select", options: retryChoices } },
        node.data?.name || node.id,
        session.answers ?? {},
      )
    } else {
      await sendWhatsApp({ to: ctx.customerPhone, body: smartRecoveryMessage, allowOutsideSession: true })
    }
    await db.message.create({
      data: {
        conversationId: ctx.conversationId,
        customerId: ctx.customerId,
        direction: "BOT",
        type: "TEXT",
        content: smartRecoveryMessage,
        isAiGenerated: true,
        status: "SENT",
      },
    })
    return { matched: true, handledBy: flow.name, handoff: false }
  }

  const answers = { ...session.answers, [node.data?.name || node.id]: checked.value }

  const edges = normalized.edges as FlowEdge[]
  const outgoing = edges.filter(e => e.source === node.id)
  const rawInput = (ctx.buttonId || ctx.message).trim()
  const cleanInput = rawInput.toLowerCase()

  const choices: { id?: string; title: string; index: number }[] = [
    ...(Array.isArray(node.data?.buttons) ? node.data.buttons.map((b: any, i: number) => ({ id: String(b.id || `btn_${i}`), title: String(b.title || b.text || b.label || b.id || ""), index: i + 1 })) : []),
    ...(Array.isArray(node.data?.options) ? node.data.options.map((o: any, i: number) => ({ id: String(o?.id || `opt_${i}`), title: typeof o === "string" ? o : String(o?.title || o?.label || o?.text || o?.name || o?.value || ""), index: i + 1 })) : []),
    ...(Array.isArray(node.data?.rows) ? node.data.rows.map((r: any, i: number) => ({ id: String(r.id || `row_${i}`), title: String(r.title || r.label || r.id || ""), index: i + 1 })) : []),
  ]

  const matchedChoice = choices.find(c =>
    (c.id && c.id.toLowerCase() === cleanInput) ||
    (c.title && c.title.toLowerCase() === cleanInput) ||
    String(c.index) === cleanInput
  )

  /*
   * A tap on a button from an older message is not an answer to this question.
   *
   * WhatsApp lets somebody scroll up and press a button in a message from days
   * ago. The reply arrives with that old button's id, which matches nothing
   * here — and the routing below ends at `outgoing[0]`, so the flow advanced
   * down its first branch and recorded the stale title as the answer. That is
   * where `"n1_lang": "Cc"` and `"n1_lang": "LEVEL 1 - BUS"` in the live
   * sessions came from: neither is a language, and both chose one.
   *
   * Only button replies are treated this way. Typed text that matches nothing
   * still falls through to the first branch, which is deliberate — a person
   * answering in their own words should not be stopped — but a tap carries an
   * id, and an id that belongs to another message is evidence, not ambiguity.
   *
   * The question is asked again rather than the flow restarted: the answers
   * already given are still good, and throwing them away would punish the
   * customer for the interface letting them scroll.
   */
  const choseNothingHere = !!ctx.buttonId && !matchedChoice && choices.length > 0
  if (choseNothingHere) {
    await ask(ctx, node, node.data?.name || node.id, session.answers ?? {})
    return { matched: true, handledBy: flow.name, handoff: false }
  }

  const next = outgoing.find(edge => {
    const label = String(edge.label || "").trim().toLowerCase()
    if (!label) return false
    if (label === cleanInput || cleanInput.includes(label) || label.includes(cleanInput)) return true
    if (matchedChoice && (label === matchedChoice.title.toLowerCase() || (matchedChoice.id && label === matchedChoice.id.toLowerCase()))) return true
    return false
  }) ?? (matchedChoice && outgoing[matchedChoice.index - 1] ? outgoing[matchedChoice.index - 1] : undefined) ?? outgoing[0]
  if (!next) {
    // The question was the last step, so save what was gathered.
    return walk(ctx, flow, node.id, answers).catch(async () => {
      await db.conversation.update({ where: { id: ctx.conversationId }, data: { flowState: Prisma.DbNull } })
      return { matched: true, handledBy: flow.name, handoff: false }
    })
  }

  return walk(ctx, flow, next.target, answers)
}

/**
 * Picks a flow up where a timer left it.
 *
 * Used by the cron for delay nodes. It carries the answers collected so far,
 * because a flow that forgets what it was told half way through is worse than
 * one that never asked.
 */
export async function resumeFlowAt(params: {
  runId?: string
  tenantId: string
  flowId: string
  nodeId: string
  conversationId: string
  customerId: string
  customerPhone: string
  answers: Record<string, string>
}): Promise<FlowResult> {
  const flow = await db.botFlow.findFirst({ where: { id: params.flowId, tenantId: params.tenantId } })
  if (!flow || !flow.isActive) return { matched: false }
  if (!params.nodeId) return { matched: false }

  return walk(
    {
      conversationId: params.conversationId,
      tenantId: params.tenantId,
      customerId: params.customerId,
      customerPhone: params.customerPhone,
      message: "",
      runId: params.runId,
    },
    flow,
    params.nodeId,
    params.answers,
  )
}

/**
 * Would any flow this workspace has built answer this message?
 *
 * Asked before the built-in tour greeting takes over. That shortcut starts the
 * hardcoded booking flow on "hi" and returns, so a workspace that had built its
 * own flow got the tour concierge instead of the thing they wrote — and no
 * amount of editing their flow changed it, because their flow was never
 * reached. Triggers only: nothing is sent and no state is touched.
 */
export async function flowWouldMatch(ctx: FlowContext): Promise<boolean> {
  const flows = await db.botFlow.findMany({
    where: { tenantId: ctx.tenantId, isActive: true, trigger: { in: ["KEYWORD", "INTENT", "ALWAYS"] } },
    orderBy: { priority: "desc" },
  })
  if (!ctx.intent && flows.some(f => f.trigger === "INTENT")) {
    try {
      const { detectIntent } = await import("@/lib/ai")
      const detected = await detectIntent(ctx.message)
      if (detected && detected.confidence >= 0.5) {
        ctx.intent = detected.intent
      }
    } catch {}
  }
  return flows.some(f => triggerMatches(f, ctx))
}

export async function runBotFlows(ctx: FlowContext): Promise<FlowResult> {
  const flows = await db.botFlow.findMany({
    where: { tenantId: ctx.tenantId, isActive: true, trigger: { in: ["KEYWORD", "INTENT", "ALWAYS"] } },
    orderBy: { priority: "desc" },
  })

  if (!ctx.intent && flows.some(f => f.trigger === "INTENT")) {
    try {
      const { detectIntent } = await import("@/lib/ai")
      const detected = await detectIntent(ctx.message)
      if (detected && detected.confidence >= 0.5) {
        ctx.intent = detected.intent
      }
    } catch {}
  }

  const flow = flows.find(f => triggerMatches(f, ctx))
  if (!flow) return { matched: false }

  const normalized = activeGraph(flow)
  const nodes = normalized.nodes as FlowNode[]
  if (nodes.length === 0) return { matched: false }

  const start = nodes.find(n => n.type === "TRIGGER") ?? nodes[0]
  return walk(ctx, flow, start.id, {})
}

/**
 * The flow a workspace wants run when somebody writes in for the first time.
 *
 * `NEW_CONVERSATION` has been selectable in the builder and stored on the flow
 * all along, but nothing ever ran it: `runBotFlows` asks only for KEYWORD,
 * INTENT and ALWAYS, and `triggerMatches` answers false for NEW_CONVERSATION
 * with a note saying it is handled at conversation creation — which it was
 * not. A workspace could build a welcome flow, activate it, and watch every
 * new customer be greeted by nothing.
 *
 * Deliberately a separate call rather than another entry in that `in` list.
 * Adding it there would put a welcome flow into the same priority race as the
 * keyword flows on a first message, so "horse" from a new customer might get
 * the welcome instead of the horse-riding flow it gets today. This runs only
 * once the ordinary flows have declined the message, so nothing that already
 * answers stops answering.
 */
export async function runNewConversationFlow(ctx: FlowContext): Promise<FlowResult> {
  const flows = await db.botFlow.findMany({
    where: { tenantId: ctx.tenantId, isActive: true, trigger: "NEW_CONVERSATION" },
    orderBy: { priority: "desc" },
  })

  for (const flow of flows) {
    const channels = asObject(flow.triggerConfig).channels || ["WHATSAPP"]
    if (!channels.includes(ctx.channel || "WHATSAPP")) continue
    const normalized = activeGraph(flow)
    const nodes = normalized.nodes as FlowNode[]
    if (nodes.length === 0) continue
    const start = nodes.find(n => n.type === "TRIGGER") ?? nodes[0]
    return walk(ctx, flow, start.id, {})
  }

  return { matched: false }
}

/** Answer keys a flow might have used for each appointment field. */
const APPOINTMENT_FIELDS: Record<string, string[]> = {
  name: ["name", "full_name", "fullname", "your_name", "contact_name"],
  email: ["email", "email_address", "e_mail"],
  service: ["service", "services", "service_type", "interested_in"],
  companyName: ["company", "company_name", "business", "organisation", "organization"],
  companyWebsite: ["website", "company_website", "url", "site"],
  date: ["date", "preferred_date", "appointment_date", "when", "datetime", "date_time"],
  time: ["time", "preferred_time", "appointment_time", "slot"],
  phone: ["phone", "mobile", "whatsapp", "contact_number"],
}

function pick(answers: Record<string, string>, field: string): string | null {
  const keys = APPOINTMENT_FIELDS[field] || [field]
  const normalise = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "")
  for (const key of keys) {
    const match = Object.keys(answers).find(a => normalise(a) === normalise(key))
    if (match && String(answers[match]).trim()) return String(answers[match]).trim()
  }
  return null
}

/**
 * Turns the answers a flow collected into a real appointment.
 *
 * Flows are written by hand and by the AI, so the field names vary: `name`,
 * `full_name` and `your_name` all mean the same thing. Rather than demand one
 * spelling, the common ones are accepted.
 */
async function saveAppointmentFromAnswers(
  flow: { id: string; name: string },
  ctx: FlowContext,
  answers: Record<string, string>,
  leadId: string,
): Promise<string | null> {
  const { appointmentReference, appointmentsEnabled, defaultDurationMins } = await import("@/lib/appointments")
  if (!(await appointmentsEnabled())) return null

  const name = pick(answers, "name") || "Unnamed"
  const dateText = pick(answers, "date")
  const timeText = pick(answers, "time")
  if (!dateText) return null

  // parseDate yields a `2026-08-12` day key, with no time and no zone.
  const dayKey = parseDate(dateText)
  if (!dayKey) return null

  // The date and the time were asked as two separate questions, so they are
  // joined here against Muscat rather than whatever zone the server runs in.
  const { fromLocal } = await import("@/lib/timezone")
  const time = (timeText || "10:00").match(/(\d{1,2})[:.]?(\d{2})?/)
  const scheduledAt = fromLocal(
    dayKey,
    time ? `${time[1].padStart(2, "0")}:${time[2] || "00"}` : "10:00",
  )

  try {
    const appointment = await db.appointment.create({
      data: {
        reference: appointmentReference(),
        name,
        email: pick(answers, "email"),
        phone: pick(answers, "phone") || ctx.customerPhone,
        service: pick(answers, "service") || flow.name,
        companyName: pick(answers, "companyName"),
        companyWebsite: pick(answers, "companyWebsite"),
        scheduledAt,
        durationMins: await defaultDurationMins(),
        source: "WHATSAPP",
        customerId: ctx.customerId,
        conversationId: ctx.conversationId,
        leadId,
      },
    })
    const { syncAppointmentToCalendar } = await import("@/lib/google-calendar")
    await syncAppointmentToCalendar(appointment.id)
    return appointment.reference
  } catch (error) {
    // A failed appointment must not lose the lead, which is already saved.
    console.error("Could not create the appointment from the flow:", error)
    return null
  }
}
