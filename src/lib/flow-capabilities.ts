import type { NodeKind } from "@/lib/flow-nodes"

/**
 * What each flow node needs from the workspace.
 *
 * Single source of truth for the builder palette and for server-side checks.
 * The `module` is the entitlement key from module-registry.ts, or null when the
 * node works for every business — a message, a delay or a handoff belongs to no
 * vertical.
 *
 * The distinction that matters: APPOINTMENTS is the generic services module
 * (AptService / AptProvider / AptBranch), so a marketing agency, a salon and a
 * law firm all book through it. HOSPITAL is not a richer version of it — it is
 * beds, wards and oncology sessions, and a business without that module should
 * never be offered those nodes.
 *
 * This list was previously seven entries long and referenced nowhere, so the
 * builder offered every node to every tenant and hid the tour nodes that
 * already worked. Keep it exhaustive: a node missing from here is a node the
 * palette cannot reason about.
 */
export const FLOW_CAPABILITIES: Array<{
  kind: NodeKind
  label: string
  module: string | null
  description: string
}> = [
  // ── Conversation basics — every business, no entitlement ──────────────────
  { kind: "MESSAGE", label: "Send a message", module: null, description: "Plain text, with {{tokens}} filled from live workspace data." },
  { kind: "BUTTONS", label: "Buttons", module: null, description: "Up to three tappable replies." },
  { kind: "LIST", label: "List", module: null, description: "Up to ten options in a menu — use when buttons will not fit." },
  { kind: "QUESTION", label: "Ask a question", module: null, description: "Ask and validate an answer, then save it." },
  { kind: "MEDIA", label: "Media", module: null, description: "Send an image, document, video or audio file." },
  { kind: "TEMPLATE", label: "WhatsApp template", module: null, description: "Send an approved template outside the 24-hour window." },
  { kind: "DELAY", label: "Wait", module: null, description: "Pause before the next step." },
  { kind: "CONDITION", label: "Condition", module: null, description: "Branch on an answer, a token or the customer's history." },
  { kind: "SPLIT", label: "Split test", module: null, description: "Send a percentage down each branch." },
  { kind: "HOURS", label: "Business hours", module: null, description: "Branch on whether you are open." },
  { kind: "SET", label: "Set a value", module: null, description: "Store a value for later steps." },
  { kind: "TAG", label: "Tag the customer", module: "CRM", description: "Add a CRM tag." },
  { kind: "ASSIGN", label: "Assign to staff", module: "STAFF", description: "Give the conversation to a named person." },
  { kind: "HANDOFF", label: "Hand to a human", module: "INBOX", description: "Stop the bot and alert the team." },
  { kind: "SAVE", label: "Save a lead", module: "CRM", description: "Record the enquiry and notify staff." },
  { kind: "ACTION", label: "Action", module: null, description: "Save a lead or an appointment from collected answers." },
  { kind: "JUMP", label: "Jump to flow", module: null, description: "Continue in another flow. Declared but not yet implemented by the engine." },
  { kind: "END", label: "End", module: null, description: "Stop the flow." },
  { kind: "TRIGGER", label: "Trigger", module: null, description: "Where the flow starts." },
  { kind: "AI", label: "AI reply", module: null, description: "Answer freely using the knowledge base and the customer's live record." },
  { kind: "HTTP", label: "Call an API", module: null, description: "Send a request to another system and keep part of the answer." },
  { kind: "CTA_URL", label: "Link button", module: null, description: "Send a button that opens a web page." },
  { kind: "LOCATION", label: "Location", module: null, description: "Send a map pin." },

  // ── Tours ─────────────────────────────────────────────────────────────────
  { kind: "TOUR", label: "List tours", module: "TOURS", description: "Send the workspace's active tours." },
  { kind: "TOUR_DETAILS", label: "Tour details", module: "TOURS", description: "Price, duration and description for one tour." },
  { kind: "TOUR_AVAIL", label: "Tour availability", module: "TOURS", description: "Live departures with seats remaining, as a tappable list." },

  // ── Appointments — the generic services module, for any vertical ──────────
  { kind: "APPOINTMENT", label: "Book an appointment", module: "APPOINTMENTS", description: "Service, provider, branch and a live time slot. Works for consultations, salons, agencies and clinics alike." },
  { kind: "APT_RESCHEDULE", label: "Reschedule or cancel", module: "APPOINTMENTS", description: "Finds the customer's upcoming appointment by phone number and offers to move or cancel it." },

  // ── Restaurant ────────────────────────────────────────────────────────────
  { kind: "RESTAURANT", label: "Restaurant welcome", module: "RESTAURANT", description: "Offers a table when one is free, the waiting list when not." },
  { kind: "RESTAURANT_MENU", label: "Restaurant menu", module: "RESTAURANT", description: "Send the tenant's menu." },
  { kind: "RESTAURANT_ORDER_STATUS", label: "Order status", module: "RESTAURANT", description: "The customer's latest kitchen order and where it has got to." },

  // ── Hospital — beds and oncology only, never a general appointment ────────
  { kind: "HOSPITAL", label: "Hospital welcome", module: "HOSPITAL", description: "Identify the patient and open the hospital menu." },
  { kind: "HOSPITAL_AVAILABILITY", label: "Hospital availability", module: "HOSPITAL", description: "What the hospital has free." },
  { kind: "HOSP_CHEMO", label: "Chemotherapy day care", module: "HOSPITAL", description: "Doctor, date, ward and a held bed." },
  { kind: "HOSP_DOCTOR", label: "Doctor appointment", module: "HOSPITAL", description: "Department, doctor and a live clinic slot." },
  { kind: "HOSP_BED_MAP", label: "Bed availability", module: "HOSPITAL", description: "Current bed status by ward." },

  // ── Commerce and payments ─────────────────────────────────────────────────
  { kind: "PRODUCT", label: "Product", module: "CATALOG", description: "Send a single product." },
  { kind: "CATALOG", label: "Catalogue", module: "CATALOG", description: "Send a product collection." },
  { kind: "PAYMENT", label: "Take payment", module: null, description: "Send an AmwalPay link for an existing order. Requires the workspace's own gateway credentials." },
  { kind: "BANK_TRANSFER", label: "Bank transfer", module: null, description: "Send bank details and collect proof of payment." },

  // ── Visa ──────────────────────────────────────────────────────────────────
  { kind: "VISA", label: "Visa assistance", module: "VISA", description: "Hand to the visa flow. Respects the workspace's visa_enabled setting." },
]

export const FLOW_CAPABILITY_BY_KIND = Object.fromEntries(
  FLOW_CAPABILITIES.map(item => [item.kind, item]),
) as Record<string, typeof FLOW_CAPABILITIES[number]>

/** The nodes a workspace may use, given the modules on its plan. */
export function capabilitiesFor(modules: readonly string[]): typeof FLOW_CAPABILITIES {
  const enabled = new Set(modules)
  return FLOW_CAPABILITIES.filter(item => item.module === null || enabled.has(item.module))
}
