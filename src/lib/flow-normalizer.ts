export type RawFlowNode = { id?: unknown; type?: unknown; data?: unknown; x?: unknown; y?: unknown }
export type NormalizedFlowNode = { id: string; type: string; data: Record<string, any>; x?: number; y?: number }
export type RawFlowEdge = { id?: unknown; source?: unknown; target?: unknown; label?: unknown; from?: unknown; to?: unknown }
export type NormalizedFlowEdge = { id: string; source: string; target: string; label?: string }

export const VALID_FLOW_NODES = new Set([
  "TRIGGER", "MESSAGE", "BUTTONS", "LIST", "CTA_URL", "LOCATION", "MEDIA", "TEMPLATE",
  "QUESTION", "AI", "CONDITION", "HOURS", "SPLIT", "DELAY",
  "SET", "TAG", "HTTP", "SAVE", "HANDOFF", "END",
  "APPOINTMENT", "APT_RESCHEDULE", "PAYMENT", "BANK_TRANSFER",
  "PRODUCT", "CATALOG", "TOUR", "TOUR_DETAILS", "TOUR_AVAIL", "BOOKING",
  "VISA", "RESTAURANT", "RESTAURANT_MENU", "RESTAURANT_ORDER_STATUS",
  "HOSPITAL", "HOSP_CHEMO", "HOSP_DOCTOR", "HOSP_BED_MAP", "HOSPITAL_AVAILABILITY", "ACTION",
])

const TYPE_ALIASES: Record<string, string> = {
  // Messages
  SEND_TEXT: "MESSAGE",
  TEXT: "MESSAGE",
  REPLY: "MESSAGE",
  SEND_MESSAGE: "MESSAGE",
  CHAT: "MESSAGE",
  MSG: "MESSAGE",

  // Interactive Buttons
  QUICK_REPLY: "BUTTONS",
  QUICK_REPLIES: "BUTTONS",
  BUTTON: "BUTTONS",
  CHOICES: "BUTTONS",
  CHOICE: "BUTTONS",
  INTERACTIVE: "BUTTONS",

  // Interactive List Menu
  LIST_MENU: "LIST",
  MENU: "LIST",
  SELECTION: "LIST",
  OPTIONS: "LIST",

  // Question & Input
  INPUT: "QUESTION",
  ASK: "QUESTION",
  PROMPT: "QUESTION",
  USER_INPUT: "QUESTION",

  // Handoff & Agent
  HUMAN_HANDOFF: "HANDOFF",
  AGENT: "HANDOFF",
  LIVE_AGENT: "HANDOFF",
  TRANSFER: "HANDOFF",
  SUPPORT: "HANDOFF",

  // End & Termination
  STOP: "END",
  FINISH: "END",
  CLOSE: "END",
  EXIT: "END",

  // Conditions & Logic
  BRANCH: "CONDITION",
  IF: "CONDITION",
  CHECK: "CONDITION",

  // Delay & Timers
  WAIT: "DELAY",
  PAUSE: "DELAY",
  SLEEP: "DELAY",
  TIMER: "DELAY",

  // CTA & Links
  LINK: "CTA_URL",
  URL: "CTA_URL",
  WEBSITE: "CTA_URL",
  CALL: "CTA_URL",

  // Location & Maps
  MAP: "LOCATION",
  PIN: "LOCATION",
  GPS: "LOCATION",
  GEO: "LOCATION",

  // Media
  IMAGE: "MEDIA",
  PHOTO: "MEDIA",
  VIDEO: "MEDIA",
  FILE: "MEDIA",
  DOCUMENT: "MEDIA",
  DOC: "MEDIA",
  AUDIO: "MEDIA",

  // Webhooks
  WEBHOOK: "HTTP",
  API: "HTTP",
  FETCH: "HTTP",

  // Leads & Save
  SAVE_LEAD: "SAVE",
  LEAD: "SAVE",
  CONTACT: "SAVE",

  // Payments
  PAY: "PAYMENT",
  CHECKOUT: "PAYMENT",
  INVOICE: "PAYMENT",
  AMWALPAY: "PAYMENT",

  // Booking & Appointment
  BOOK: "BOOKING",
  CREATE_BOOKING: "BOOKING",
  BOOK_APPOINTMENT: "APPOINTMENT",
  APPT: "APPOINTMENT",
  SCHEDULE: "APPOINTMENT",
  CALENDAR: "APPOINTMENT",

  // Hours & Splits
  BUSINESS_HOURS: "HOURS",
  OPEN_HOURS: "HOURS",
  WORKING_HOURS: "HOURS",
  AB_TEST: "SPLIT",
  AB_SPLIT: "SPLIT",

  // Variables
  VARIABLE: "SET",
  SET_VARIABLE: "SET",
}

const idPart = (value: unknown, fallback: string) => String(value || fallback).trim().slice(0, 120)

/**
 * The graph as stored, whatever shape that is.
 * Decodes JSON strings or arrays safely.
 */
function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export function normalizeFlowNodes(value: unknown): NormalizedFlowNode[] {
  const list = asList(value)
  return list.flatMap((raw, index) => {
    if (!raw || typeof raw !== "object") return []
    const node = raw as RawFlowNode
    const id = idPart(node.id, `node_${index + 1}`)
    const originalType = String(node.type || "MESSAGE").toUpperCase()
    let type = TYPE_ALIASES[originalType] || originalType
    if (!VALID_FLOW_NODES.has(type)) {
      type = "MESSAGE"
    }

    const structural = new Set(["id", "type", "data", "x", "y", "position", "measured", "selected", "dragging"])
    const hasData = node.data && typeof node.data === "object" && !Array.isArray(node.data)
    const data = hasData
      ? { ...(node.data as Record<string, any>) }
      : Object.fromEntries(
          Object.entries(raw as Record<string, unknown>).filter(([key]) => !structural.has(key)),
        )

    for (const key of ["text", "header", "footer", "caption", "instruction", "mediaUrl", "url", "name", "value"]) {
      if (data[key] !== undefined && typeof data[key] !== "string") data[key] = typeof data[key] === "number" ? String(data[key]) : ""
    }

    // ── BUTTONS normalization ────────────────────────────────────────────────
    if (type === "BUTTONS") {
      let rawBtns = Array.isArray(data.buttons) ? data.buttons
        : Array.isArray(data.options) ? data.options
        : Array.isArray(data.choices) ? data.choices
        : Array.isArray(data.items) ? data.items : []

      if (rawBtns.length === 0) {
        rawBtns = [{ id: "b1", title: "Option 1" }, { id: "b2", title: "Option 2" }]
      }

      data.buttons = rawBtns.slice(0, 3).map((button: any, buttonIndex: number) => {
        if (typeof button === "string") {
          return { id: `btn_${buttonIndex + 1}`, title: button.trim().slice(0, 20) || `Option ${buttonIndex + 1}` }
        }
        return {
          id: idPart(button?.id, `btn_${buttonIndex + 1}`),
          title: String(button?.title || button?.text || button?.label || `Option ${buttonIndex + 1}`).trim().slice(0, 20),
        }
      })
      if (!data.text || !String(data.text).trim()) {
        data.text = String(data.message || data.prompt || data.title || "Please choose an option:")
      }
    }

    // ── LIST normalization ───────────────────────────────────────────────────
    if (type === "LIST") {
      let rawRows = Array.isArray(data.rows) ? data.rows
        : Array.isArray(data.items) ? data.items
        : Array.isArray(data.options) ? data.options
        : Array.isArray(data.choices) ? data.choices
        : Array.isArray(data.sections) ? data.sections.flatMap((s: any) => s.rows || s.items || []) : []

      if (rawRows.length === 0) {
        rawRows = [
          { id: "r1", title: "Option 1", description: "Details" },
          { id: "r2", title: "Option 2", description: "Details" },
        ]
      }

      data.rows = rawRows.slice(0, 10).map((row: any, i: number) => {
        if (typeof row === "string") {
          return { id: `row_${i + 1}`, title: row.trim().slice(0, 24) || `Option ${i + 1}`, description: "" }
        }
        return {
          id: idPart(row.id, `row_${i + 1}`),
          title: String(row.title ?? row.label ?? row.text ?? `Option ${i + 1}`).trim().slice(0, 24),
          description: String(row.description ?? row.subtitle ?? "").trim().slice(0, 72),
        }
      })
      if (!data.listButton || !String(data.listButton).trim()) {
        data.listButton = String(data.buttonText || data.button || "View Menu").slice(0, 20)
      }
      if (!data.text || !String(data.text).trim()) {
        data.text = String(data.message || data.intro || data.title || "Select an option from our menu:")
      }
    }

    // ── MESSAGE normalization ────────────────────────────────────────────────
    if (type === "MESSAGE") {
      if (!data.text || !String(data.text).trim()) {
        data.text = String(data.message || data.content || data.body || data.text || "Hello! How can we assist you today?")
      }
    }

    // ── QUESTION normalization ───────────────────────────────────────────────
    if (type === "QUESTION") {
      if (!data.text || !String(data.text).trim()) {
        data.text = String(data.question || data.message || "Please enter your response:")
      }
      if (!data.name || !String(data.name).trim()) {
        data.name = idPart(data.field || `answer_${index + 1}`, `answer_${index + 1}`).toLowerCase().replace(/[^a-z0-9_]/g, "_")
      }
      const validTypes = ["text", "email", "phone", "number", "date", "select", "image", "document"]
      if (!validTypes.includes(String(data.inputType))) {
        data.inputType = "text"
      }
      if (data.inputType === "select") {
        let opts = Array.isArray(data.options) ? data.options
          : Array.isArray(data.choices) ? data.choices
          : Array.isArray(data.buttons) ? data.buttons.map((b: any) => typeof b === "string" ? b : b.title || b.text) : []
        if (opts.length < 2) opts = ["Yes", "No"]
        data.options = opts.map(String).slice(0, 10)
      }
    }

    // ── CONDITION normalization ──────────────────────────────────────────────
    if (type === "CONDITION") {
      if (!data.field) data.field = "message"
      if (!data.op || !["equals", "contains", "gt", "lt"].includes(data.op)) data.op = "contains"
      if (data.value === undefined) data.value = ""
    }

    // ── CTA_URL normalization ────────────────────────────────────────────────
    if (type === "CTA_URL") {
      if (!data.text) data.text = String(data.message || "Visit our portal or call us directly:")
      if (!data.buttonText) data.buttonText = String(data.label || "Open Website")
      if (!data.url) data.url = String(data.link || "https://app.fizmoh.cloud")
    }

    // ── LOCATION normalization ───────────────────────────────────────────────
    if (type === "LOCATION") {
      if (!data.name) data.name = "Our Office"
      if (!data.address) data.address = "Muscat, Oman"
      data.latitude = Number(data.latitude || 23.5880)
      data.longitude = Number(data.longitude || 58.3829)
    }

    // ── DELAY normalization ──────────────────────────────────────────────────
    if (type === "DELAY") {
      data.seconds = Number(data.seconds || data.delay || 60)
    }

    // ── AI normalization ─────────────────────────────────────────────────────
    if (type === "AI") {
      if (!data.instruction) data.instruction = String(data.prompt || data.text || "Answer the customer's question naturally and helpfully using our business knowledge base.")
      data.useKnowledge = data.useKnowledge !== false
    }

    // ── APPOINTMENT normalization ────────────────────────────────────────────
    if (type === "APPOINTMENT") {
      if (!data.appointmentText) data.appointmentText = String(data.text || "Let me help you book an appointment!")
    }

    // ── PAYMENT normalization ────────────────────────────────────────────────
    if (type === "PAYMENT") {
      data.amount = Number(data.amount || 10)
      data.currency = String(data.currency || "OMR")
      data.paymentDescription = String(data.paymentDescription || data.description || "Online Booking Payment")
      if (!data.text) data.text = "Complete your payment securely:"
    }

    return [{ id, type, data, ...(typeof node.x === "number" ? { x: node.x } : {}), ...(typeof node.y === "number" ? { y: node.y } : {}) }]
  })
}

export function normalizeFlowEdges(value: unknown, nodes: NormalizedFlowNode[]): NormalizedFlowEdge[] {
  const ids = new Set(nodes.map(node => node.id))
  const seen = new Set<string>()
  return asList(value).flatMap((raw, index) => {
    if (!raw || typeof raw !== "object") return []
    const edge = raw as RawFlowEdge & { from?: unknown; to?: unknown }
    const source = String(edge.source || edge.from || "")
    const target = String(edge.target || edge.to || "")
    if (!source || !target) return []
    const label = edge.label === undefined || edge.label === null ? undefined : String(edge.label).slice(0, 120)
    const key = `${source}|${target}|${label || ""}`
    if (seen.has(key)) return []
    seen.add(key)
    return [{ id: idPart(edge.id, `edge_${index + 1}`), source, target, ...(label ? { label } : {}) }]
  })
}

export function normalizeFlowGraph(nodes: unknown, edges: unknown) {
  let normalizedNodes = normalizeFlowNodes(nodes)
  let normalizedEdges = normalizeFlowEdges(edges, normalizedNodes)

  // Ensure root TRIGGER exists
  if (normalizedNodes.length > 0 && !normalizedNodes.some(node => node.type === "TRIGGER")) {
    const triggerId = normalizedNodes.some(node => node.id === "trigger") ? "flow_trigger" : "trigger"
    const first = normalizedNodes[0]
    normalizedNodes = [{ id: triggerId, type: "TRIGGER", data: {}, x: 300, y: 40 }, ...normalizedNodes]
    normalizedEdges = [{ id: `${triggerId}_edge`, source: triggerId, target: first.id }, ...normalizedEdges]
  }

  // Label branch connections for condition nodes (yes/no)
  for (const node of normalizedNodes) {
    if (node.type === "CONDITION") {
      const out = normalizedEdges.filter(e => e.source === node.id)
      if (out.length >= 2 && out.every(e => !e.label)) {
        out[0].label = "yes"
        out[1].label = "no"
      }
    } else if (node.type === "HOURS") {
      const out = normalizedEdges.filter(e => e.source === node.id)
      if (out.length >= 2 && out.every(e => !e.label)) {
        out[0].label = "open"
        out[1].label = "closed"
      }
    } else if (node.type === "SPLIT") {
      const out = normalizedEdges.filter(e => e.source === node.id)
      if (out.length >= 2 && out.every(e => !e.label)) {
        out[0].label = "a"
        out[1].label = "b"
      }
    } else if (node.type === "BUTTONS" && Array.isArray(node.data?.buttons)) {
      const out = normalizedEdges.filter(e => e.source === node.id)
      if (out.length > 0 && out.every(e => !e.label)) {
        out.forEach((edge, i) => {
          if (node.data.buttons[i]?.title) edge.label = node.data.buttons[i].title
        })
      }
    }
  }

  // Auto-terminate dangling leaf steps so flows are immediately valid and don't strand users
  const TERMINAL_TYPES = new Set(["END", "HANDOFF"])
  const nonTerminalLeaves = normalizedNodes.filter(n => n.type !== "TRIGGER" && !TERMINAL_TYPES.has(n.type) && !normalizedEdges.some(e => e.source === n.id))

  if (nonTerminalLeaves.length > 0) {
    let endNode = normalizedNodes.find(n => n.type === "END")
    if (!endNode) {
      const maxY = Math.max(...normalizedNodes.map(n => n.y ?? 0), 200)
      endNode = { id: "end_flow", type: "END", data: {}, x: 400, y: maxY + 160 }
      normalizedNodes.push(endNode)
    }
    nonTerminalLeaves.forEach((leaf, idx) => {
      if (leaf.id !== endNode!.id) {
        normalizedEdges.push({ id: `e_end_${leaf.id}_${idx}`, source: leaf.id, target: endNode!.id })
      }
    })
  }

  return { nodes: normalizedNodes, edges: normalizedEdges }
}

