"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  X, Plus, Trash2, Search, Loader2, GitBranch, UserRound,
  Wand2, HelpCircle, Save, Sparkles, Image as ImageIcon, Timer, Upload,
  ShoppingBag, Package, CalendarClock, Bot, Globe, Tag,
  Zap, CreditCard, Clock, Layers, RotateCcw, Play, ChevronDown,
  ChevronRight, Variable, Send, BarChart3, ZoomIn, ZoomOut,
  Maximize2, Link2, Settings, Star,
} from "lucide-react"
import { SOCIAL_FLOW_NODES, supportsFlowNode, FLOW_CHANNEL_LABELS, type FlowChannel } from "@/lib/flow-channels"
import { BOT_TEMPLATES, type FlowTemplate } from "@/lib/bot-templates"
import { normalizeFlowGraph } from "@/lib/flow-normalizer"
import { parseExternalFlow, type DynamicSuggestion, type ImportResult } from "@/lib/flow-importer"

// ─── Public types (consumed by bot-builder-view) ─────────────────────────────

export interface BotFlowRecord {
  id?: string
  name: string
  description: string | null
  trigger: string
  triggerConfig: unknown
  nodes: unknown
  edges: unknown
  isActive: boolean
  priority: number
}

// ─── Canvas data types ────────────────────────────────────────────────────────

interface CanvasNode {
  id: string
  type: string
  data: Record<string, unknown>
  x: number
  y: number
}

interface CanvasEdge {
  id: string
  source: string
  target: string
  label?: string
}

// ─── Node palette definition ──────────────────────────────────────────────────

interface PaletteItem {
  type: string
  label: string
  emoji: string
  color: string
  defaultData?: Record<string, unknown>
}

const PALETTE: { group: string; items: PaletteItem[] }[] = [
  {
    group: "Interactive Messages",
    items: [
      { type: "MESSAGE", label: "Text Message", emoji: "💬", color: "blue", defaultData: { text: "" } },
      { type: "BUTTONS", label: "Quick Reply Buttons", emoji: "📲", color: "blue", defaultData: { text: "Please choose an option:", buttons: [{ id: "b1", title: "Option 1" }, { id: "b2", title: "Option 2" }, { id: "b3", title: "Option 3" }] } },
      { type: "LIST", label: "Interactive List Menu", emoji: "📋", color: "blue", defaultData: { text: "Select an option from our menu:", rows: [{ id: "r1", title: "Option 1", description: "Details" }, { id: "r2", title: "Option 2", description: "Details" }], listButton: "View Menu" } },
      { type: "CTA_URL", label: "CTA Web / Call Button", emoji: "🔗", color: "blue", defaultData: { text: "Visit our portal or call us directly:", buttonText: "Open Website", url: "https://app.fizmoh.cloud", phone: "" } },
      { type: "LOCATION", label: "Location & Map Pin", emoji: "📍", color: "blue", defaultData: { name: "Kauvery Hospital / AL BAHR", address: "Muscat, Oman", latitude: 23.5880, longitude: 58.3829 } },
      { type: "MEDIA", label: "Send Photo / Video", emoji: "📎", color: "blue", defaultData: { mediaUrl: "", mediaType: "image", caption: "" } },
      { type: "TEMPLATE", label: "WhatsApp Template", emoji: "📨", color: "blue", defaultData: { templateName: "", language: "en_US" } },
    ],
  },
  {
    group: "Tours & Safaris Module",
    items: [
      { type: "TOUR", label: "All Tours List", emoji: "🚙", color: "amber", defaultData: { tourText: "🚙 Explore our Tours & Safaris in Oman:", tourCount: 5 } },
      { type: "TOUR_DETAILS", label: "Featured Tour Card", emoji: "🌄", color: "amber", defaultData: { tourId: "latest", tourText: "🌄 Explore our featured adventure tour:" } },
      { type: "TOUR_AVAIL", label: "Check Tour Dates", emoji: "📅", color: "amber", defaultData: { text: "📅 Please select your preferred date to check tour availability:" } },
    ],
  },
  {
    group: "Hospital & Healthcare",
    items: [
      { type: "HOSPITAL", label: "Hospital Main Menu", emoji: "🏥", color: "blue", defaultData: { hospMode: "menu", hospitalText: "🏥 Welcome to Kauvery Hospital. How can we assist you today?" } },
      { type: "HOSP_CHEMO", label: "Chemo Day Care (30 Beds)", emoji: "💊", color: "blue", defaultData: { hospitalText: "💊 Chemotherapy Day Care Bed Booking (Normal & Special Wards)" } },
      { type: "HOSP_DOCTOR", label: "Doctor Consultation", emoji: "🩺", color: "blue", defaultData: { hospitalText: "🩺 Book an Oncologist Consultation & Time Slot" } },
      { type: "HOSP_BED_MAP", label: "Live Bed Availability", emoji: "🛏️", color: "blue", defaultData: { hospitalText: "🛏️ Live Ward & Bed Vacancy Status" } },
    ],
  },
  {
    group: "Payments & Invoicing",
    items: [
      { type: "PAYMENT", label: "AmwalPay Online Gateway", emoji: "💳", color: "emerald", defaultData: { amount: 10, currency: "OMR", paymentDescription: "Online Booking Payment", text: "💳 Complete your payment securely via AmwalPay:" } },
      { type: "BANK_TRANSFER", label: "Bank Transfer & Receipt", emoji: "🏦", color: "emerald", defaultData: { bankName: "Bank Muscat", accountNumber: "0123-456789-001", accountTitle: "AL BAHR STABLE", text: "🏦 Please transfer to our official bank account and upload your receipt screenshot:" } },
    ],
  },
  {
    group: "Appointments & Services",
    items: [
      { type: "APPOINTMENT", label: "Book Appointment", emoji: "📅", color: "emerald", defaultData: { appointmentText: "📅 Let me help you book an appointment!", serviceId: "" } },
      { type: "APT_RESCHEDULE", label: "Reschedule / Cancel", emoji: "🔄", color: "emerald", defaultData: { text: "Please enter your booking reference to reschedule or cancel:" } },
    ],
  },
  {
    group: "Store & Commerce",
    items: [
      { type: "PRODUCT", label: "Product Card", emoji: "🛍️", color: "purple", defaultData: { productId: "latest", text: "" } },
      { type: "CATALOG", label: "Catalog List", emoji: "📦", color: "purple", defaultData: { categoryId: "all", productCount: 5, text: "" } },
    ],
  },
  {
    group: "Travel & Dining",
    items: [
      { type: "VISA", label: "Visa Enquiry / Upload", emoji: "🛂", color: "cyan", defaultData: { text: "🛂 Oman Visa & Travel Assistance. Choose your visa category:" } },
      { type: "RESTAURANT", label: "Table Reservation", emoji: "🍽️", color: "rose", defaultData: { text: "🍽️ Reserve a dining table or view our chef special menu:" } },
      { type: "RESTAURANT_MENU", label: "Restaurant Menu", emoji: "📖", color: "rose", defaultData: { text: "🍽️ Here is our menu:" } },
      { type: "RESTAURANT_ORDER_STATUS", label: "Order Status", emoji: "🧾", color: "rose", defaultData: {} },
      { type: "HOSPITAL_AVAILABILITY", label: "Hospital Availability", emoji: "🏥", color: "blue", defaultData: {} },
    ],
  },
  {
    group: "AI & Smart",
    items: [
      { type: "AI", label: "AI Smart Assistant", emoji: "🤖", color: "violet", defaultData: { instruction: "Answer the customer's question naturally and helpfully using our business knowledge base.", useKnowledge: true } },
      { type: "QUESTION", label: "Ask Question / Input", emoji: "❓", color: "violet", defaultData: { text: "", name: "answer", inputType: "text", options: [], required: true } },
    ],
  },
  {
    group: "Logic & Branching",
    items: [
      { type: "CONDITION", label: "Condition / Branch", emoji: "⚡", color: "orange", defaultData: { field: "message", op: "contains", value: "" } },
      { type: "HOURS", label: "Business Hours Filter", emoji: "🕐", color: "orange", defaultData: { from: "08:00", to: "20:00" } },
      { type: "SPLIT", label: "A/B Split Test", emoji: "🔀", color: "orange", defaultData: { percent: 50 } },
      { type: "DELAY", label: "Wait / Delay", emoji: "⏱️", color: "orange", defaultData: { seconds: 60 } },
    ],
  },
  {
    group: "Actions & CRM",
    items: [
      { type: "SET", label: "Set Variable", emoji: "📝", color: "teal", defaultData: { name: "variable", value: "" } },
      { type: "TAG", label: "Tag Customer", emoji: "🏷️", color: "teal", defaultData: { value: "" } },
      { type: "HTTP", label: "API / Webhook", emoji: "🌐", color: "teal", defaultData: { url: "", method: "GET", save: {} } },
      { type: "SAVE", label: "Save Lead", emoji: "💾", color: "teal", defaultData: {} },
      { type: "BOOKING", label: "Create Booking", emoji: "🧾", color: "teal", defaultData: { tourId: "", slotId: "{{slot_id}}", paxAdult: "1", paymentMethod: "AMWALPAY" } },
      { type: "HANDOFF", label: "Live Agent Handoff", emoji: "👤", color: "teal", defaultData: {} },
      { type: "END", label: "End Flow", emoji: "🔴", color: "teal", defaultData: {} },
    ],
  },
]

const NODE_COLORS: Record<string, string> = {
  TRIGGER: "border-amber-400 bg-amber-50",
  MESSAGE: "border-blue-400 bg-blue-50",
  BUTTONS: "border-blue-400 bg-blue-50",
  LIST: "border-blue-400 bg-blue-50",
  CTA_URL: "border-blue-400 bg-blue-50",
  LOCATION: "border-blue-400 bg-blue-50",
  MEDIA: "border-blue-400 bg-blue-50",
  TEMPLATE: "border-blue-400 bg-blue-50",
  AI: "border-violet-400 bg-violet-50",
  QUESTION: "border-violet-400 bg-violet-50",
  CONDITION: "border-orange-400 bg-orange-50",
  HOURS: "border-orange-400 bg-orange-50",
  SPLIT: "border-orange-400 bg-orange-50",
  DELAY: "border-orange-400 bg-orange-50",
  SET: "border-teal-400 bg-teal-50",
  TAG: "border-teal-400 bg-teal-50",
  HTTP: "border-teal-400 bg-teal-50",
  SAVE: "border-teal-400 bg-teal-50",
  HANDOFF: "border-stone-400 bg-stone-50",
  END: "border-red-400 bg-red-50",
  HOSPITAL: "border-blue-400 bg-blue-50",
  HOSP_CHEMO: "border-blue-400 bg-blue-50",
  HOSP_DOCTOR: "border-blue-400 bg-blue-50",
  HOSP_BED_MAP: "border-blue-400 bg-blue-50",
  TOUR: "border-amber-400 bg-amber-50",
  TOUR_DETAILS: "border-amber-400 bg-amber-50",
  TOUR_AVAIL: "border-amber-400 bg-amber-50",
  PAYMENT: "border-emerald-400 bg-emerald-50",
  BANK_TRANSFER: "border-emerald-400 bg-emerald-50",
  APPOINTMENT: "border-emerald-400 bg-emerald-50",
  APT_RESCHEDULE: "border-emerald-400 bg-emerald-50",
  PRODUCT: "border-purple-400 bg-purple-50",
  CATALOG: "border-purple-400 bg-purple-50",
  VISA: "border-cyan-400 bg-cyan-50",
  RESTAURANT: "border-rose-400 bg-rose-50",
}

const NODE_EMOJI: Record<string, string> = {
  TRIGGER: "⚡", MESSAGE: "💬", BUTTONS: "📲", LIST: "📋", CTA_URL: "🔗", LOCATION: "📍",
  MEDIA: "📎", TEMPLATE: "📨", AI: "🤖", QUESTION: "❓", CONDITION: "⚡", HOURS: "🕐",
  SPLIT: "🔀", DELAY: "⏱️", SET: "📝", TAG: "🏷️", HTTP: "🌐",
  SAVE: "💾", HANDOFF: "👤", END: "🔴", APPOINTMENT: "📅", APT_RESCHEDULE: "🔄",
  HOSPITAL: "🏥", HOSP_CHEMO: "💊", HOSP_DOCTOR: "🩺", HOSP_BED_MAP: "🛏️",
  TOUR: "🚙", TOUR_DETAILS: "🌄", TOUR_AVAIL: "📅", PAYMENT: "💳", BANK_TRANSFER: "🏦",
  PRODUCT: "🛍️", CATALOG: "📦", VISA: "🛂", RESTAURANT: "🍽️",
}

const NODE_LABEL: Record<string, string> = {
  TRIGGER: "Trigger", MESSAGE: "Send Message", BUTTONS: "Quick Buttons",
  LIST: "List Menu", CTA_URL: "CTA Link/Call", LOCATION: "Map Location",
  MEDIA: "Send Media", TEMPLATE: "Template",
  AI: "AI Reply", QUESTION: "Ask & Remember", CONDITION: "Condition",
  HOURS: "Business Hours", SPLIT: "A/B Split", DELAY: "Wait",
  SET: "Set Variable", TAG: "Tag Customer", HTTP: "API Call",
  SAVE: "Save Lead", HANDOFF: "Hand to Agent", END: "End Flow",
  HOSPITAL: "Kauvery Hospital", HOSP_CHEMO: "Chemo Day Care (30 Beds)",
  HOSP_DOCTOR: "Doctor Appointment", HOSP_BED_MAP: "Live Bed Map",
  TOUR: "Tours & Safaris", TOUR_DETAILS: "Featured Tour Card", TOUR_AVAIL: "Check Tour Dates",
  PAYMENT: "AmwalPay Online", BANK_TRANSFER: "Bank Transfer Details",
  APPOINTMENT: "Book Appointment", APT_RESCHEDULE: "Reschedule / Cancel",
  PRODUCT: "Product Card", CATALOG: "Catalog List",
  VISA: "Visa Assistance", RESTAURANT: "Restaurant Reservation",
}
const NODE_W = 200

function nodePreview(type: string, data: Record<string, unknown>): string {
  if (type === "MESSAGE" || type === "BUTTONS") return String(data.text || "").slice(0, 50) || "No message set"
  if (type === "QUESTION") return String(data.text || "").slice(0, 50) || "No question set"
  if (type === "AI") return String(data.instruction || "").slice(0, 50) || "AI will reply naturally"
  if (type === "CONDITION") return `If ${data.field} ${data.op} "${data.value}"`
  if (type === "HOURS") return `Open ${data.from} – ${data.to}`
  if (type === "CTA_URL") return `🔗 ${data.buttonText || "Website"}`
  if (type === "LOCATION") return `📍 ${data.name || "Location"}`
  if (type === "HOSPITAL") return `🏥 Kauvery Hospital (${data.hospMode || "menu"})`
  if (type === "HOSP_CHEMO") return `💊 Chemo Day Care (30 Beds)`
  if (type === "HOSP_DOCTOR") return `🩺 Doctor Consultation`
  if (type === "HOSP_BED_MAP") return `🛏️ Live Bed Vacancy Map`
  if (type === "TOUR") return `🚙 Tours (${data.tourCount || 5} tours)`
  if (type === "TOUR_DETAILS") return `🌄 Tour Card`
  if (type === "TOUR_AVAIL") return `📅 Check Tour Availability`
  if (type === "PAYMENT") return `💳 Pay ${data.amount || 10} ${data.currency || "OMR"}`
  if (type === "BANK_TRANSFER") return `🏦 ${data.bankName || "Bank Transfer"}`
  if (type === "VISA") return `🛂 Visa Assistance`
  if (type === "RESTAURANT") return `🍽️ Table Reservation`
  if (type === "APT_RESCHEDULE") return `🔄 Manage Appointment`
  if (type === "HOSPITAL") return `🏥 Kauvery Hospital (${data.hospMode || "menu"})`
  if (type === "TOUR") return `🚙 Tours (${data.tourCount || 4} items)`
  if (type === "PAYMENT") return `💳 Pay ${data.amount || 10} ${data.currency || "OMR"}`
  if (type === "SPLIT") return `${data.percent}% → A, rest → B`
  if (type === "DELAY") return `Wait ${data.seconds}s`
  if (type === "TAG") return `Tag: ${data.value || "(none)"}`
  if (type === "SET") return `{{${data.name}}} = ${data.value || "(empty)"}`
  if (type === "HTTP") return `${data.method || "GET"} ${String(data.url || "").slice(0, 30) || "(no url)"}`
  if (type === "APPOINTMENT") return String(data.appointmentText || "").slice(0, 50) || "Book appointment"
  if (type === "TEMPLATE") return `Template: ${data.templateName || "(none)"}`
  if (type === "LIST") return String(data.text || "").slice(0, 50) || "List picker"
  return ""
}

function nodeBranches(type: string): string[] {
  if (type === "CONDITION") return ["true", "false"]
  if (type === "HOURS") return ["open", "closed"]
  if (type === "SPLIT") return ["a", "b"]
  if (type === "AI") return ["ok", "failed"]
  if (type === "HTTP") return ["ok", "failed"]
  return []
}

// ─── Parse / Compile (for API compatibility) ──────────────────────────────────

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback
  if (typeof value === "string") { try { return JSON.parse(value) as T } catch { return fallback } }
  return value as T
}

function toCanvasNodes(rawNodes: unknown, rawEdges: unknown): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  // Prisma rows created by older API versions may contain JSON as a string,
  // while newer rows return arrays/objects. Decode both shapes before the
  // normalizer; otherwise the editor silently renders an empty canvas.
  const graph = normalizeFlowGraph(parseJson(rawNodes, []), parseJson(rawEdges, []))
  const list = graph.nodes as Array<{id: string; type: string; data?: Record<string, unknown>; x?: number; y?: number}>
  const links = graph.edges as CanvasEdge[]

  // If nodes already have x/y use them, otherwise auto-layout vertically
  const layouted: CanvasNode[] = list.map((n, i) => ({
    id: n.id,
    type: n.type,
    data: n.data || {},
    x: typeof n.x === "number" ? n.x : 300,
    y: typeof n.y === "number" ? n.y : i * 180 + 40,
  }))

  return { nodes: layouted, edges: links }
}

function toApiNodes(nodes: CanvasNode[], edges: CanvasEdge[]) {
  return {
    nodes: nodes.map(n => ({ id: n.id, type: n.type, data: n.data, x: n.x, y: n.y })),
    edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, ...(e.label ? { label: e.label } : {}) })),
  }
}

// ─── Main FlowEditor ──────────────────────────────────────────────────────────

export function FlowEditor({
  flow, onClose, onSaved, defaultChannel = "WHATSAPP",
}: {
  defaultChannel?: FlowChannel
  flow: BotFlowRecord | null
  onClose: () => void
  onSaved: () => void
}) {
  const editing = Boolean(flow?.id)
  const config = parseJson<{ keywords?: string[]; intents?: string[]; matchType?: string }>(flow?.triggerConfig, {})

  // Flow meta
  const [name, setName] = useState(flow?.name ?? "")
  const [description, setDescription] = useState(flow?.description ?? "")
  const [trigger, setTrigger] = useState(flow?.trigger ?? "KEYWORD")
  const [channels, setChannels] = useState<FlowChannel[]>((config as { channels?: FlowChannel[] }).channels || [defaultChannel])
  const [scheduledAt, setScheduledAt] = useState(() => { const date = new Date((config as any).scheduledAt || ""); return Number.isFinite(date.getTime()) ? new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "" })
  const [conversationIds, setConversationIds] = useState<string>(((config as any).conversationIds || []).join(","))
  const [scheduleContacts, setScheduleContacts] = useState<{ id: string; customerName: string; customerPhone: string }[]>([])
  useEffect(() => {
    if (trigger === "SCHEDULE") fetch("/api/conversations").then(r => r.json()).then(data => setScheduleContacts((data.conversations || []).filter((c: any) => c.channel === "WHATSAPP").slice(0, 100))).catch(() => toast.error("Could not load conversations"))
  }, [trigger])
  const [keywords, setKeywords] = useState((config.keywords ?? []).join(", "))
  const [intents, setIntents] = useState((config.intents ?? []).join(", "))
  const [matchType, setMatchType] = useState(config.matchType ?? "contains")
  const [priority, setPriority] = useState(flow?.priority ?? 0)
  const [isActive, setIsActive] = useState(flow?.isActive ?? false)

  // Canvas state
  const init = useMemo(() => toCanvasNodes(flow?.nodes, flow?.edges), [flow?.id, flow?.nodes, flow?.edges])
  const [nodes, setNodes] = useState<CanvasNode[]>(init.nodes)
  const [edges, setEdges] = useState<CanvasEdge[]>(init.edges)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [connecting, setConnecting] = useState<{
    fromId: string; fromHandle: string; mouseX: number; mouseY: number
  } | null>(null)
  const [dragging, setDragging] = useState<{
    nodeId: string; startMouse: { x: number; y: number }; startNode: { x: number; y: number }
  } | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  // UI state
  const [saving, setSaving] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiImage, setAiImage] = useState<string | null>(null)
  const [drafting, setDrafting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [tplCategory, setTplCategory] = useState("All")
  const [tplSearch, setTplSearch] = useState("")
  const [showSimulator, setShowSimulator] = useState(false)
  const [simInput, setSimInput] = useState("")
  const [simTranscript, setSimTranscript] = useState<{ from: "bot" | "user"; text: string; imageUrl?: string; mediaType?: string }[]>([])
  const [paletteOpen, setPaletteOpen] = useState<Record<string, boolean>>({ Messages: true, "AI & Smart": true, Logic: false, Actions: false, Commerce: false })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [wcProducts, setWcProducts] = useState<any[]>([])

  // Importer state
  const [showImporter, setShowImporter] = useState(false)
  const [importJsonText, setImportJsonText] = useState("")
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [selectedSuggestions, setSelectedSuggestions] = useState<Record<string, boolean>>({})

  const handleAnalyzeImport = (textToParse?: string) => {
    const raw = textToParse ?? importJsonText
    if (!raw.trim()) {
      toast.error("Please paste JSON flow data or upload a file.")
      return
    }
    setImporting(true)
    try {
      const res = parseExternalFlow(raw)
      setImportResult(res)
      const initialSelected: Record<string, boolean> = {}
      for (const s of res.suggestions) {
        initialSelected[s.id] = s.appliedByDefault
      }
      setSelectedSuggestions(initialSelected)
      toast.success(`Successfully analyzed ${res.name}! Found ${res.suggestions.length} dynamic AI recommendations.`)
    } catch (err: any) {
      toast.error(err.message || "Failed to parse flow JSON.")
    } finally {
      setImporting(false)
    }
  }

  const handleApproveImport = () => {
    if (!importResult) return

    setName(importResult.name)
    setTrigger(importResult.trigger)
    if (importResult.triggerConfig && typeof importResult.triggerConfig === "object") {
      const tc = importResult.triggerConfig as any
      if (Array.isArray(tc.keywords)) {
        setKeywords(tc.keywords.join(", "))
      }
    }

    let finalNodes: CanvasNode[] = importResult.nodes.map((n, i) => ({
      ...n,
      x: typeof n.x === "number" ? n.x : 300 + (i % 3) * 320,
      y: typeof n.y === "number" ? n.y : 100 + Math.floor(i / 3) * 200,
    }))
    let finalEdges: CanvasEdge[] = [...importResult.edges]

    // Apply approved dynamic suggestions
    for (const sug of importResult.suggestions) {
      if (selectedSuggestions[sug.id]) {
        const targetNode = finalNodes.find(n => n.id === sug.nodeId)
        if (targetNode) {
          if (sug.category === "PAYMENT") {
            const payNodeId = `pay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`
            finalNodes.push({
              id: payNodeId,
              type: "PAYMENT",
              data: sug.proposedData ?? {},
              x: targetNode.x + 350,
              y: targetNode.y + 50,
            })
            finalEdges.push({
              id: `edge_${targetNode.id}_${payNodeId}`,
              source: targetNode.id,
              target: payNodeId,
              label: "💳 Pay Online",
            })
          } else if (sug.category === "CTA_URL") {
            const ctaNodeId = `cta_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`
            finalNodes.push({
              id: ctaNodeId,
              type: "CTA_URL",
              data: sug.proposedData ?? {},
              x: targetNode.x + 350,
              y: targetNode.y - 120,
            })
            finalEdges.push({
              id: `edge_${targetNode.id}_${ctaNodeId}`,
              source: targetNode.id,
              target: ctaNodeId,
              label: "📞 Call Now",
            })
          } else if (sug.category === "TOUR") {
            const tourNodeId = `tour_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`
            finalNodes.push({
              id: tourNodeId,
              type: "TOUR_AVAIL",
              data: sug.proposedData ?? {},
              x: targetNode.x + 350,
              y: targetNode.y + 120,
            })
            finalEdges.push({
              id: `edge_${targetNode.id}_${tourNodeId}`,
              source: targetNode.id,
              target: tourNodeId,
              label: "📅 Book Live Tour",
            })
          } else if (sug.category === "APPOINTMENT") {
            const aptNodeId = `apt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`
            finalNodes.push({
              id: aptNodeId,
              type: "APPOINTMENT",
              data: sug.proposedData ?? {},
              x: targetNode.x + 350,
              y: targetNode.y + 180,
            })
            finalEdges.push({
              id: `edge_${targetNode.id}_${aptNodeId}`,
              source: targetNode.id,
              target: aptNodeId,
              label: "📅 Book Appointment",
            })
          }
        }
      }
    }

    setNodes(finalNodes)
    setEdges(finalEdges)
    setSelectedId(null)
    setShowImporter(false)
    setImportResult(null)
    setImportJsonText("")
    toast.success(`Imported "${importResult.name}" with dynamic integrations onto canvas!`)
  }

  const canvasRef = useRef<HTMLDivElement>(null)
  const simEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/woocommerce/products").then(r => r.json()).then(d => setWcProducts(d.products || [])).catch(() => {})
  }, [])

  useEffect(() => {
    simEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [simTranscript])

  const selectedNode = nodes.find(n => n.id === selectedId) ?? null

  // ── Canvas helpers ────────────────────────────────────────────────────────

  const uid = () => `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`

  const addNode = useCallback((type: string, defaultData?: Record<string, unknown>, atX?: number, atY?: number) => {
    const id = uid()
    // Default position: center of visible canvas area
    const cx = canvasRef.current ? canvasRef.current.clientWidth / 2 : 400
    const cy = canvasRef.current ? canvasRef.current.clientHeight / 2 : 300
    const x = atX ?? (cx - pan.x) / scale - NODE_W / 2
    const y = atY ?? (cy - pan.y) / scale - 60

    const item = PALETTE.flatMap(g => g.items).find(i => i.type === type)
    const data = defaultData ?? item?.defaultData ?? {}
    setNodes(prev => [...prev, { id, type, data, x, y }])
    setSelectedId(id)
    return id
  }, [pan, scale])

  const updateNodeData = useCallback((id: string, patch: Record<string, unknown>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))
  }, [])

  const deleteNode = useCallback((id: string) => {
    if (id === "trigger") return
    setNodes(prev => prev.filter(n => n.id !== id))
    setEdges(prev => prev.filter(e => e.source !== id && e.target !== id))
    setSelectedId(null)
  }, [])

  const connectNodes = useCallback((fromId: string, toId: string, label?: string) => {
    if (fromId === toId) return
    const exists = edges.some(e => e.source === fromId && e.target === toId && (e.label ?? "") === (label ?? ""))
    if (exists) return
    setEdges(prev => [...prev, { id: uid(), source: fromId, target: toId, ...(label ? { label } : {}) }])
  }, [edges])

  const deleteEdge = useCallback((edgeId: string) => {
    setEdges(prev => prev.filter(e => e.id !== edgeId))
  }, [])

  // ── Canvas pointer events ─────────────────────────────────────────────────

  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-node]")) return
    setSelectedId(null)
    setIsPanning(true)
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const onCanvasPointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
    }
    if (dragging) {
      const dx = (e.clientX - dragging.startMouse.x) / scale
      const dy = (e.clientY - dragging.startMouse.y) / scale
      setNodes(prev => prev.map(n =>
        n.id === dragging.nodeId
          ? { ...n, x: dragging.startNode.x + dx, y: dragging.startNode.y + dy }
          : n
      ))
    }
    if (connecting) {
      setConnecting(prev => prev ? { ...prev, mouseX: e.clientX, mouseY: e.clientY } : null)
    }
  }

  const onCanvasPointerUp = () => {
    setIsPanning(false)
    setDragging(null)
    setConnecting(null)
  }

  const onCanvasWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale(prev => Math.min(2, Math.max(0.3, prev * delta)))
  }

  const onNodePointerDown = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation()
    setSelectedId(nodeId)
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    setDragging({ nodeId, startMouse: { x: e.clientX, y: e.clientY }, startNode: { x: node.x, y: node.y } })
  }

  const onOutputPortPointerDown = (e: React.PointerEvent, nodeId: string, handle: string) => {
    e.stopPropagation()
    const rect = canvasRef.current?.getBoundingClientRect()
    setConnecting({ fromId: nodeId, fromHandle: handle, mouseX: e.clientX - (rect?.left ?? 0), mouseY: e.clientY - (rect?.top ?? 0) })
  }

  const onInputPortPointerUp = (e: React.PointerEvent, targetId: string) => {
    e.stopPropagation()
    if (connecting && connecting.fromId !== targetId) {
      connectNodes(connecting.fromId, targetId, connecting.fromHandle !== "default" ? connecting.fromHandle : undefined)
    }
    setConnecting(null)
    setDragging(null)
  }

  // ── SVG edge rendering ────────────────────────────────────────────────────

  function nodeCenter(node: CanvasNode): { x: number; y: number } {
    return {
      x: node.x * scale + pan.x + NODE_W / 2 * scale,
      y: node.y * scale + pan.y,
    }
  }

  function bezierPath(sx: number, sy: number, tx: number, ty: number): string {
    const dy = Math.abs(ty - sy) * 0.5
    return `M${sx},${sy} C${sx},${sy + dy} ${tx},${ty - dy} ${tx},${ty}`
  }

  // ── Template library ──────────────────────────────────────────────────────

  const applyTemplate = (tpl: FlowTemplate) => {
    if (normalizeFlowGraph(tpl.nodes, tpl.edges).nodes.some(node => !supportsFlowNode(node.type, channels))) { toast.error("This template includes steps unavailable on the selected channels"); return }
    const { nodes: tplNodes, edges: tplEdges } = toCanvasNodes(tpl.nodes, tpl.edges)
    setNodes(tplNodes)
    setEdges(tplEdges)
    setName(tpl.name)
    setDescription(tpl.description)
    setTrigger(tpl.trigger)
    const cfg = tpl.triggerConfig as any
    if (!channels.some(channel => channel !== "WHATSAPP")) setChannels(Array.isArray(cfg.channels) ? cfg.channels : [defaultChannel])
    setIsActive(false)
    if (cfg.keywords) setKeywords(cfg.keywords.join(", "))
    if (cfg.matchType) setMatchType(cfg.matchType)
    if (cfg.intents) setIntents(cfg.intents.join(", "))
    setShowTemplates(false)
    toast.success(`Template "${tpl.name}" loaded — customise and save!`)
  }

  // ── AI draft ──────────────────────────────────────────────────────────────

  const askAI = async () => {
    if (!aiPrompt.trim() && !aiImage) {
      toast.error("Describe what this flow should do or attach a flowchart image")
      return
    }
    setDrafting(true)
    try {
      const { nodes: currentNodes, edges: currentEdges } = toApiNodes(nodes, edges)
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "flow",
          brief: `${aiPrompt || "Generate the visual bot flow graph based on the attached flowchart diagram"}\nTarget channels: ${channels.join(", ")}.${channels.some(c => c !== "WHATSAPP") ? ` Use only ${[...SOCIAL_FLOW_NODES].join(", ")} nodes. Choices are numbered text replies. Do not use WhatsApp booking, payment, template or delay nodes.` : ""}`,
          imageBase64: aiImage || undefined,
          preview: true,
          ...(nodes.length > 1 ? { current: { name, description, trigger, keywords, nodes: currentNodes, edges: currentEdges } } : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error || "Could not draft"); return }
      const drafted = data.draft
      if (!drafted) { toast.error("Model returned nothing usable"); return }
      if (drafted.name) setName(drafted.name)
      if (drafted.description) setDescription(drafted.description)
      if (drafted.trigger) setTrigger(drafted.trigger)
      if (drafted.triggerConfig?.keywords) setKeywords(drafted.triggerConfig.keywords.join(", "))
      if (drafted.nodes && drafted.edges) {
        const { nodes: dn, edges: de } = toCanvasNodes(drafted.nodes, drafted.edges)
        setNodes(dn)
        setEdges(de)
      }
      setAiPrompt("")
      setAiImage(null)
      toast.success("Flow generated from prompt & diagram! Review and customize on canvas.")
    } finally {
      setDrafting(false)
    }
  }

  // ── Simulator ─────────────────────────────────────────────────────────────

  const runSim = () => {
    const msg = simInput.trim()
    if (!msg) return
    const newLines: { from: "bot" | "user"; text: string; imageUrl?: string; mediaType?: string }[] = [{ from: "user", text: msg }]

    const words = keywords.split(",").map(k => k.trim().toLowerCase()).filter(Boolean)
    const matched = trigger === "KEYWORD"
      ? (matchType === "exact" ? words.includes(msg.toLowerCase()) : words.some(k => msg.toLowerCase().includes(k)))
      : true

    if (!matched) {
      newLines.push({ from: "bot", text: "⚠️ No keyword matched. The AI assistant would answer instead." })
    } else {
      const byId = new Map(nodes.map(n => [n.id, n]))
      const outEdges = (id: string) => edges.filter(e => e.source === id)
      const start = nodes.find(n => n.type === "TRIGGER") ?? nodes[0]
      let cur = start ? byId.get(outEdges(start.id)[0]?.target ?? "") : undefined
      let steps = 0
      while (cur && steps < 20) {
        steps++
        const d = cur.data
        if (cur.type === "MESSAGE") {
          const txt = (String(d.text || "") + (Array.isArray(d.buttons) && d.buttons.length
            ? "\n\n" + (d.buttons as any[]).map((b: any) => `[ ${b.title} ]`).join("  ")
            : "")).trim()
          newLines.push({ from: "bot", text: txt || "(empty message)" })
        } else if (cur.type === "BUTTONS") {
          const txt = String(d.text || "") + "\n\n" + (Array.isArray(d.buttons) ? (d.buttons as any[]).map((b: any) => `[ ${b.title} ]`).join("  ") : "")
          newLines.push({ from: "bot", text: txt })
          newLines.push({ from: "bot", text: "— waits for button tap —" })
          break
        } else if (cur.type === "LIST") {
          const rows = Array.isArray(d.rows) ? (d.rows as any[]) : []
          const txt = String(d.text || "") + "\n" + rows.map((r: any, i: number) => `${i + 1}. ${r.title}`).join("\n")
          newLines.push({ from: "bot", text: txt })
          newLines.push({ from: "bot", text: "— waits for list selection —" })
          break
        } else if (cur.type === "QUESTION") {
          const opts = Array.isArray(d.options) ? d.options as string[] : []
          const txt = String(d.text || "") + (opts.length ? "\n" + opts.map((o, i) => `${i + 1}. ${o}`).join("\n") : "")
          newLines.push({ from: "bot", text: txt })
          newLines.push({ from: "bot", text: `— waits for answer (saved as {{${d.name || "answer"}}}) —` })
          break
        } else if (cur.type === "AI") {
          newLines.push({ from: "bot", text: `🤖 AI replies naturally using knowledge base\n  Instruction: "${String(d.instruction || "").slice(0, 80)}"` })
        } else if (cur.type === "CONDITION") {
          newLines.push({ from: "bot", text: `⚡ Branch: if ${d.field} ${d.op} "${d.value}"` })
        } else if (cur.type === "HOURS") {
          newLines.push({ from: "bot", text: `🕐 Business hours check: ${d.from}–${d.to} → open / closed branch` })
        } else if (cur.type === "SPLIT") {
          newLines.push({ from: "bot", text: `🔀 A/B split: ${d.percent}% → A, rest → B` })
        } else if (cur.type === "DELAY") {
          newLines.push({ from: "bot", text: `⏱️ Wait ${d.seconds} seconds…` })
        } else if (cur.type === "SAVE") {
          newLines.push({ from: "bot", text: "💾 Lead/enquiry saved. Staff notified." })
        } else if (cur.type === "TAG") {
          newLines.push({ from: "bot", text: `🏷️ Customer tagged: "${d.value}"` })
        } else if (cur.type === "SET") {
          newLines.push({ from: "bot", text: `📝 {{${d.name}}} = "${d.value}"` })
        } else if (cur.type === "HTTP") {
          newLines.push({ from: "bot", text: `🌐 API call: ${d.method} ${d.url || "(no url)"}` })
        } else if (cur.type === "HANDOFF") {
          newLines.push({ from: "bot", text: "👤 Handing off to a human agent. Bot stops." })
          break
        } else if (cur.type === "END") {
          newLines.push({ from: "bot", text: "🔴 Flow ended." })
          break
        } else if (cur.type === "APPOINTMENT") {
          newLines.push({ from: "bot", text: `📅 ${String(d.appointmentText || "Let me help you book an appointment!")}\n— Launches full appointment booking flow —` })
          break
        } else if (cur.type === "MEDIA") {
          const mUrl = String(d.mediaUrl || "").trim()
          const mCap = String(d.caption || "").trim()
          newLines.push({
            from: "bot",
            text: mCap || (mUrl ? "" : `📎 [${d.mediaType || "image"}] (no file)`),
            imageUrl: mUrl || undefined,
            mediaType: String(d.mediaType || "image"),
          })
        } else if (cur.type === "TEMPLATE") {
          newLines.push({ from: "bot", text: `📨 Template: ${d.templateName || "(none)"}` })
        } else if (cur.type === "PRODUCT") {
          newLines.push({ from: "bot", text: `🛍️ Product card: ${d.productId === "latest" ? "Latest product" : `ID #${d.productId}`}` })
        } else if (cur.type === "CATALOG") {
          newLines.push({ from: "bot", text: `📦 Catalog: ${d.productCount || 5} products${d.categoryId !== "all" ? ` from category #${d.categoryId}` : ""}` })
          break
        }
        const outs = outEdges(cur.id)
        if (outs.length === 0) break
        cur = byId.get(outs[0].target)
      }
    }
    setSimTranscript(prev => [...prev, ...newLines])
    setSimInput("")
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  const save = async (publish = false) => {
    if (!name.trim()) { toast.error("Give the flow a name"); return }
    if (trigger === "KEYWORD" && !keywords.trim()) { toast.error("Add at least one keyword"); return }
    if (nodes.length === 0) { toast.error("Add at least one node"); return }
    if (trigger === "SCHEDULE" && (!Number.isFinite(Date.parse(scheduledAt)) || !conversationIds || channels.some(c => c !== "WHATSAPP"))) { toast.error("Choose a schedule, conversations and WhatsApp as the channel"); return }
    if (!channels.length) { toast.error("Choose at least one channel"); return }
    const { nodes: apiNodes, edges: apiEdges } = toApiNodes(nodes, edges)
    const unsupported = apiNodes.find(node => !supportsFlowNode(node.type, channels))
    if (unsupported) { toast.error(`The "${unsupported.type}" step is unavailable on the selected channels. Remove it or choose WhatsApp.`); return }
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      trigger,
      triggerConfig: { channels, ...(trigger === "KEYWORD"
        ? { keywords: keywords.split(",").map(k => k.trim()).filter(Boolean), matchType }
        : trigger === "INTENT"
          ? { intents: intents.split(",").map(k => k.trim().toUpperCase()).filter(Boolean) }
          : trigger === "SCHEDULE" ? { scheduledAt: new Date(scheduledAt).toISOString(), conversationIds: conversationIds.split(",").map(id => id.trim()).filter(Boolean) } : {}) },
      nodes: apiNodes,
      edges: apiEdges,
      priority: Number(priority) || 0,
      isActive,
    }
    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/botflows/${flow!.id}` : "/api/botflows", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error || "Could not save"); return }

      /*
       * Saving is not publishing.
       *
       * The engine runs a flow's published copy when it has one, so a save on
       * its own is a draft — which is what makes it safe to edit a flow that
       * customers are in the middle of. `publish` is passed by the button that
       * says so.
       */
      const savedId = editing ? flow!.id : data.flow?.id
      if (publish && savedId) {
        const pub = await fetch(`/api/botflows/${savedId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "publish" }),
        })
        const pubData = await pub.json().catch(() => ({}))
        if (!pub.ok) {
          toast.error(pubData.error || "Saved, but could not publish", { duration: 8000 })
          onSaved()
          return
        }
        toast.success("Published — customers see this now")
      } else {
        toast.success(editing ? "Draft saved" : "Flow created as a draft")
      }
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4">
      <div
        className="w-full max-w-[98vw] h-[96vh] bg-white rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-stone-50 shrink-0">
          <div className="flex-1 min-w-0">
            <input
              className="font-bold text-stone-800 text-base bg-transparent border-0 outline-none w-full truncate"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Flow name…"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <span className="text-xs text-stone-500 mr-2">{isActive ? "Live" : "Paused"}</span>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 text-purple-700 hover:bg-purple-100 font-medium" onClick={() => setShowImporter(true)}>
              <Sparkles className="h-3.5 w-3.5 text-purple-600" /> Import Flow (AI)
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setShowTemplates(true)}>
              <Star className="h-3.5 w-3.5" /> Templates
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setSettingsOpen(!settingsOpen)}>
              <Settings className="h-3.5 w-3.5" /> Settings
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setShowSimulator(!showSimulator)}>
              <Play className="h-3.5 w-3.5" /> Simulate
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Settings panel (collapsible) ────────────────────────────────── */}
        {settingsOpen && (
          <div className="border-b bg-stone-50/80 px-4 py-3 grid sm:grid-cols-3 gap-4 shrink-0">
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1">Trigger</label>
              <div className="flex gap-1">
                {[["KEYWORD", "Keyword"], ["INTENT", "Intent"], ["NEW_CONVERSATION", "Welcome"], ["SCHEDULE", "Schedule"]].map(([v, l]) => (
                  <button key={v} disabled={v === "SCHEDULE" && channels.some(c => c !== "WHATSAPP")} title={v === "SCHEDULE" && channels.some(c => c !== "WHATSAPP") ? "Scheduled flows currently support WhatsApp only" : undefined} onClick={() => setTrigger(v)}
                    className={`px-3 py-1 rounded text-xs font-medium ${trigger === v ? "bg-emerald-600 text-white" : "bg-white border text-stone-600"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              {trigger === "SCHEDULE" && <div className="space-y-2"><input aria-label="Schedule time" type="datetime-local" value={scheduledAt.slice(0, 16)} onChange={e => setScheduledAt(e.target.value)} /><select multiple aria-label="Scheduled recipients" value={conversationIds.split(",")} onChange={e => setConversationIds(Array.from(e.target.selectedOptions, option => option.value).join(","))} className="w-full border rounded p-2">{scheduleContacts.map(c => <option key={c.id} value={c.id}>{c.customerName || c.customerPhone}</option>)}</select><p className="text-xs">Runs once, at the time shown in your browser's timezone, for selected WhatsApp conversations within their reply window. Paused or busy conversations are skipped.</p></div>}
              <div className="flex flex-wrap gap-3 text-xs">
                {(["WHATSAPP", "FACEBOOK", "INSTAGRAM"] as FlowChannel[]).map(channel => <label key={channel} className="flex items-center gap-1"><input type="checkbox" checked={channels.includes(channel)} onChange={e => setChannels(previous => e.target.checked ? [...previous, channel] : previous.filter(c => c !== channel))} />{channel}</label>)}
                <p className="w-full text-stone-500">Social flows support AI replies, messages, numbered choices, questions, conditions, media, tags and handoff. Enable Automatic mode in the channel settings to run them. Unmatched messages use the channel's knowledge bot.</p>
              </div>
              {trigger === "KEYWORD" ? (
                <>
                  <label className="text-xs font-medium text-stone-600 block mb-1">Keywords (comma separated)</label>
                  <Input className="h-8 text-xs" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="hi, hello, book" />
                </>
              ) : (
                <>
                  <label className="text-xs font-medium text-stone-600 block mb-1">Intents (comma separated)</label>
                  <Input className="h-8 text-xs" value={intents} onChange={e => setIntents(e.target.value)} placeholder="BOOKING_REQUEST, FAQ" />
                </>
              )}
            </div>
            <div className="flex gap-4 items-end">
              {trigger === "KEYWORD" && (
                <label className="text-xs text-stone-500">
                  Match
                  <select value={matchType} onChange={e => setMatchType(e.target.value)} className="ml-1 border rounded text-xs px-1 py-0.5">
                    <option value="contains">Anywhere</option>
                    <option value="exact">Exact</option>
                  </select>
                </label>
              )}
              <label className="text-xs text-stone-500">
                Priority
                <Input type="number" className="ml-1 w-16 h-7 text-xs inline-block" value={priority} onChange={e => setPriority(Number(e.target.value))} />
              </label>
            </div>
          </div>
        )}

        {/* ── AI draft bar ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-amber-50/80 shrink-0">
          <Wand2 className="h-4 w-4 text-amber-600 shrink-0" />
          <Input
            className="h-8 text-xs bg-white flex-1"
            placeholder='Describe your flow… or attach a flowchart image / architecture sketch to auto-build'
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") askAI() }}
          />
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = ev => {
                setAiImage(ev.target?.result as string)
                toast.success("Flowchart image attached! Click 'AI Draft' to generate.")
              }
              reader.readAsDataURL(file)
            }}
          />
          {aiImage ? (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-100/90 border border-amber-300 rounded-md shrink-0">
              <img src={aiImage} alt="Flowchart Diagram" className="h-6 w-6 object-cover rounded shadow-sm" />
              <span className="text-[11px] font-semibold text-amber-900">Diagram Attached</span>
              <button onClick={() => { setAiImage(null); if (fileInputRef.current) fileInputRef.current.value = "" }} className="text-amber-700 hover:text-red-500 ml-0.5">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 bg-white shrink-0 text-stone-700 hover:bg-amber-100/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-3.5 w-3.5 text-amber-600" />
              Attach Diagram Image
            </Button>
          )}
          <Button size="sm" className="h-8 bg-amber-600 hover:bg-amber-700 text-white shrink-0 gap-1.5 font-semibold" onClick={askAI} disabled={drafting}>
            {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Sparkles className="h-3.5 w-3.5" /> AI Build Flow</>}
          </Button>
        </div>

        {/* ── Main 3-panel layout ─────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 flex overflow-hidden">

          {/* ── Left: Node palette ────────────────────────────────────────── */}
          <div className="w-44 shrink-0 border-r bg-stone-50 overflow-y-auto">
            <div className="p-2 text-[10px] font-bold text-stone-500 uppercase tracking-wide">Nodes</div>
            {PALETTE.map(group => (
              <div key={group.group}>
                <button
                  className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-stone-600 hover:bg-stone-100"
                  onClick={() => setPaletteOpen(prev => ({ ...prev, [group.group]: !prev[group.group] }))}
                >
                  {group.group}
                  {paletteOpen[group.group] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
                {paletteOpen[group.group] && group.items.map(item => (
                  <button
                    key={item.type}
                    disabled={!supportsFlowNode(item.type, channels)}
                    title={supportsFlowNode(item.type, channels) ? item.label : "This step is currently available for WhatsApp flows only"}
                    className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-stone-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left disabled:opacity-35 disabled:cursor-not-allowed"
                    onClick={() => addNode(item.type, item.defaultData)}
                  >
                    <span>{item.emoji}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* ── Center: Canvas ────────────────────────────────────────────── */}
          <div
            ref={canvasRef}
            className="flex-1 relative overflow-hidden bg-[#f8f9fa] cursor-grab active:cursor-grabbing"
            style={{ backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)", backgroundSize: "24px 24px" }}
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            onPointerLeave={onCanvasPointerUp}
            onWheel={onCanvasWheel}
          >
            {/* Zoom controls */}
            <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7 bg-white" onClick={() => setScale(s => Math.min(2, s * 1.2))}><ZoomIn className="h-3.5 w-3.5" /></Button>
              <Button variant="outline" size="icon" className="h-7 w-7 bg-white" onClick={() => setScale(s => Math.max(0.3, s * 0.8))}><ZoomOut className="h-3.5 w-3.5" /></Button>
              <Button variant="outline" size="icon" className="h-7 w-7 bg-white" onClick={() => { setScale(1); setPan({ x: 0, y: 0 }) }}><Maximize2 className="h-3.5 w-3.5" /></Button>
            </div>

            {/* Node count badge */}
            <div className="absolute top-2 left-2 z-10">
              <Badge variant="outline" className="bg-white text-[10px]">
                {nodes.length} nodes · {edges.length} edges
              </Badge>
            </div>

            {/* Canvas SVG (edges) + Nodes (div) */}
            <div className="absolute inset-0" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: "0 0" }}>
              {/* SVG edges */}
              <svg
                className="absolute inset-0 pointer-events-none overflow-visible"
                style={{ width: "100%", height: "100%" }}
              >
                <defs>
                  <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
                  </marker>
                  <marker id="arrowhead-selected" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
                  </marker>
                </defs>
                {edges.map(edge => {
                  const src = nodes.find(n => n.id === edge.source)
                  const tgt = nodes.find(n => n.id === edge.target)
                  if (!src || !tgt) return null
                  const sx = src.x + NODE_W / 2
                  const sy = src.y + 90
                  const tx = tgt.x + NODE_W / 2
                  const ty = tgt.y
                  const dy = Math.max(60, Math.abs(ty - sy) * 0.5)
                  const path = `M${sx},${sy} C${sx},${sy + dy} ${tx},${ty - dy} ${tx},${ty}`
                  const mx = (sx + tx) / 2
                  const my = (sy + ty) / 2
                  return (
                    <g key={edge.id}>
                      <path
                        d={path}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                        className="pointer-events-auto cursor-pointer hover:stroke-red-400"
                        onClick={() => deleteEdge(edge.id)}
                      />
                      {edge.label && (
                        <text x={mx} y={my - 6} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="600">
                          {edge.label}
                        </text>
                      )}
                    </g>
                  )
                })}
                {/* Live connection line */}
                {connecting && (() => {
                  const src = nodes.find(n => n.id === connecting.fromId)
                  if (!src) return null
                  const rect = canvasRef.current?.getBoundingClientRect()
                  const mx = (connecting.mouseX - (rect?.left ?? 0) - pan.x) / scale
                  const my = (connecting.mouseY - (rect?.top ?? 0) - pan.y) / scale
                  return (
                    <path
                      d={`M${src.x + NODE_W / 2},${src.y + 90} L${mx},${my}`}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeDasharray="6,3"
                    />
                  )
                })()}
              </svg>

              {/* Node cards */}
              {nodes.map(node => {
                const isSelected = selectedId === node.id
                const branches = nodeBranches(node.type)
                return (
                  <div
                    key={node.id}
                    data-node
                    className={`absolute select-none rounded-xl border-2 shadow-sm transition-shadow ${NODE_COLORS[node.type] || "border-stone-300 bg-white"} ${isSelected ? "ring-2 ring-emerald-400 shadow-lg" : "hover:shadow-md"}`}
                    style={{ left: node.x, top: node.y, width: NODE_W, cursor: "move", zIndex: isSelected ? 10 : 1 }}
                    onPointerDown={e => onNodePointerDown(e, node.id)}
                    onPointerUp={e => onInputPortPointerUp(e, node.id)}
                  >
                    {/* Input port */}
                    {node.type !== "TRIGGER" && (
                      <div
                        className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-slate-400 hover:border-emerald-500 hover:bg-emerald-50 cursor-crosshair z-20"
                        onPointerUp={e => onInputPortPointerUp(e, node.id)}
                      />
                    )}

                    {/* Node header */}
                    <div className="flex items-center justify-between px-2.5 pt-2 pb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base leading-none">{NODE_EMOJI[node.type] || "📌"}</span>
                        <span className="text-[11px] font-bold text-stone-700">{NODE_LABEL[node.type] || node.type}</span>
                      </div>
                      {node.type !== "TRIGGER" && (
                        <button
                          className="text-stone-300 hover:text-red-500 transition-colors"
                          onPointerDown={e => { e.stopPropagation(); deleteNode(node.id) }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Preview text */}
                    <div className="px-2.5 pb-2 text-[10px] text-stone-500 leading-tight truncate">
                      {nodePreview(node.type, node.data)}
                    </div>

                    {/* Output ports */}
                    <div className="absolute -bottom-3 left-0 right-0 flex justify-center gap-4">
                      {branches.length === 0 ? (
                        <div
                          className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow cursor-crosshair hover:scale-110 transition-transform"
                          onPointerDown={e => { e.stopPropagation(); onOutputPortPointerDown(e, node.id, "default") }}
                        />
                      ) : branches.map(branch => (
                        <div key={branch} className="flex flex-col items-center gap-0.5">
                          <div
                            className="w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow cursor-crosshair hover:scale-110 transition-transform"
                            onPointerDown={e => { e.stopPropagation(); onOutputPortPointerDown(e, node.id, branch) }}
                          />
                          <span className="text-[8px] text-stone-500 font-bold">{branch}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Empty state */}
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-4xl mb-2">🤖</div>
                  <div className="text-stone-400 text-sm font-medium">Add nodes from the palette</div>
                  <div className="text-stone-300 text-xs mt-1">or pick a template to get started quickly</div>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Inspector or Simulator ────────────────────────────── */}
          <div className="w-72 shrink-0 border-l flex flex-col overflow-hidden bg-white">
            {showSimulator ? (
              <div className="flex flex-col h-full">
                <div className="px-3 py-2 border-b flex items-center justify-between bg-[#0b141a]">
                  <span className="text-xs font-semibold text-stone-300 flex items-center gap-1.5"><Play className="h-3.5 w-3.5" /> {channels.map(c => FLOW_CHANNEL_LABELS[c]).join(" / ")} Flow Simulator</span>
                  <button onClick={() => setSimTranscript([])} className="text-[10px] text-stone-400 hover:text-stone-200 flex items-center gap-1"><RotateCcw className="h-3 w-3" />Clear</button>
                </div>
                <div className="flex-1 overflow-y-auto bg-[#111b21] p-3 space-y-2">
                  {simTranscript.length === 0 && (
                    <p className="text-[11px] text-stone-500 text-center pt-8">Type a message to test your flow</p>
                  )}
                  {simTranscript.map((line, i) => (
                    <div key={i} className={`flex ${line.from === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[90%] px-2.5 py-1.5 rounded-lg text-[11px] whitespace-pre-wrap ${
                        line.from === "user" ? "bg-[#005c4b] text-stone-100"
                          : line.text.startsWith("—") || line.text.startsWith("⚠️")
                            ? "bg-transparent text-stone-400 italic"
                            : "bg-[#202c33] text-stone-100"
                      }`}>
                        {line.imageUrl && (
                          <div className="rounded-lg overflow-hidden mb-1.5 max-h-48 max-w-[240px] bg-black/20">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={line.imageUrl}
                              alt="Media"
                              className="w-full h-auto object-cover rounded-lg"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none"
                              }}
                            />
                          </div>
                        )}
                        {line.text && <div>{line.text}</div>}
                      </div>
                    </div>
                  ))}
                  <div ref={simEndRef} />
                </div>
                <div className="flex gap-1.5 p-2 bg-[#202c33] border-t border-stone-700">
                  <input
                    className="flex-1 bg-[#2a3942] text-stone-100 text-xs rounded px-2 py-1.5 outline-none placeholder:text-stone-500"
                    placeholder="Type a message…"
                    value={simInput}
                    onChange={e => setSimInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") runSim() }}
                  />
                  <button className="bg-[#00a884] text-stone-900 text-xs font-bold px-3 rounded" onClick={runSim}>Send</button>
                </div>
              </div>
            ) : selectedNode ? (
              <NodeInspector
                node={selectedNode}
                onUpdate={(patch) => updateNodeData(selectedNode.id, patch)}
                onDelete={() => deleteNode(selectedNode.id)}
                wcProducts={wcProducts}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <div className="text-3xl mb-2">👆</div>
                <div className="text-stone-400 text-sm font-medium">Click a node to edit it</div>
                <div className="text-stone-300 text-xs mt-1 mb-4">or drag from the palette to add nodes</div>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowSimulator(true)}>
                  <Play className="h-3.5 w-3.5 mr-1" /> Open Simulator
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom bar ──────────────────────────────────────────────────── */}
        <div className="px-4 py-3 border-t bg-stone-50 flex items-center justify-between shrink-0">
          <Button variant="outline" size="sm" className="h-9 px-4 text-xs" onClick={onClose}>Cancel</Button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">{nodes.length} nodes · {edges.length} connections</span>
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-4 text-xs font-semibold"
              onClick={() => save(false)}
              disabled={saving}
              title="Keeps this as a draft. Customers carry on seeing the published version."
            >
              Save draft
            </Button>
            <Button size="sm" className="h-9 px-5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={() => save(true)} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save &amp; publish
            </Button>
          </div>
        </div>
      </div>

      {/* ── Template Library Modal ─────────────────────────────────────────── */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-xs" onClick={() => setShowTemplates(false)}>
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[88vh] overflow-hidden flex flex-col shadow-2xl border" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-stone-50/70">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-stone-900 text-lg">Flow Template Library</h2>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs font-semibold">{BOT_TEMPLATES.length} Templates</Badge>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">Production-ready flows for Tours, Healthcare, Shopping, Appointments & CRM — load with 1 click</p>
              </div>
              <button onClick={() => setShowTemplates(false)} className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-200 transition-colors"><X className="h-5 w-5" /></button>
            </div>

            {/* Filter Bar & Search */}
            <div className="px-6 py-3 border-b bg-white flex flex-col sm:flex-row gap-3 items-center justify-between">
              {/* Category Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                {["All", "Healthcare", "Tours & Travel", "Appointments", "E-Commerce", "Dining & Hospitality", "CRM & AI"].map(cat => {
                  const count = cat === "All" ? BOT_TEMPLATES.length : BOT_TEMPLATES.filter(t => t.category === cat).length
                  const active = tplCategory === cat
                  return (
                    <button
                      key={cat}
                      onClick={() => setTplCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all ${
                        active
                          ? "bg-amber-600 text-white shadow-xs"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  )
                })}
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
                <Input
                  className="pl-8 h-8 text-xs bg-stone-50 focus:bg-white"
                  placeholder="Search templates…"
                  value={tplSearch}
                  onChange={e => setTplSearch(e.target.value)}
                />
                {tplSearch && (
                  <button onClick={() => setTplSearch("")} className="absolute right-2 top-2 text-stone-400 hover:text-stone-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Template Cards Grid */}
            <div className="overflow-y-auto p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 bg-stone-50/40">
              {BOT_TEMPLATES
                .filter(tpl => {
                  if (normalizeFlowGraph(tpl.nodes, tpl.edges).nodes.some(node => !supportsFlowNode(node.type, channels))) return false
                  if (tplCategory !== "All" && tpl.category !== tplCategory) return false
                  if (tplSearch.trim()) {
                    const q = tplSearch.toLowerCase()
                    return tpl.name.toLowerCase().includes(q) || tpl.description.toLowerCase().includes(q) || tpl.category.toLowerCase().includes(q)
                  }
                  return true
                })
                .map(tpl => (
                  <button
                    key={tpl.id}
                    className="text-left p-4 bg-white border rounded-xl hover:border-amber-500 hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between"
                    onClick={() => applyTemplate(tpl)}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl p-1.5 bg-stone-100 rounded-lg group-hover:scale-110 transition-transform">{tpl.emoji}</span>
                        <Badge variant="outline" className="text-[10px] font-medium text-stone-500 bg-stone-50">{tpl.category}</Badge>
                      </div>
                      <div className="font-semibold text-stone-800 text-sm group-hover:text-amber-700 transition-colors leading-snug">{tpl.name}</div>
                      <div className="text-xs text-stone-500 mt-1.5 leading-relaxed line-clamp-3">{tpl.description}</div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                      <span>{Array.isArray(tpl.nodes) ? tpl.nodes.length : 4} nodes</span>
                      <span className="font-semibold text-amber-600 group-hover:underline flex items-center gap-1">Load Flow →</span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Smart AI Flow Importer Modal ────────────────────────────────────── */}
      {showImporter && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-xs" onClick={() => setShowImporter(false)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-purple-50/80 via-indigo-50/50 to-stone-50/80">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-stone-900 text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" /> Smart AI Flow Importer
                  </h2>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs font-semibold">Universal JSON & xitFB</Badge>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">Import flows from external builders — AI automatically detects pricing, tours, appointments, and contact buttons to propose dynamic upgrades.</p>
              </div>
              <button onClick={() => setShowImporter(false)} className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-200 transition-colors"><X className="h-5 w-5" /></button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {!importResult ? (
                /* Step 1: Input / Upload */
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-stone-700 block mb-1.5">Paste Flow JSON</label>
                    <Textarea
                      rows={10}
                      className="font-mono text-xs bg-stone-50 focus:bg-white resize-none"
                      placeholder='Paste JSON flow structure here (e.g. {"id":"xitFB@0.0.1", "nodes": {...}} or standard FizMoh flow)...'
                      value={importJsonText}
                      onChange={e => setImportJsonText(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <input
                        type="file"
                        accept=".json,application/json"
                        className="hidden"
                        id="flow-file-import"
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onload = ev => {
                              const text = String(ev.target?.result || "")
                              setImportJsonText(text)
                              handleAnalyzeImport(text)
                            }
                            reader.readAsText(file)
                          }
                        }}
                      />
                      <label
                        htmlFor="flow-file-import"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium cursor-pointer transition-colors"
                      >
                        <Upload className="h-3.5 w-3.5 text-stone-500" /> Upload .json File
                      </label>
                    </div>

                    <Button
                      onClick={() => handleAnalyzeImport()}
                      disabled={importing || !importJsonText.trim()}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-5 h-9 font-semibold gap-1.5 shadow-sm"
                    >
                      {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      Analyze & Review with AI
                    </Button>
                  </div>
                </div>
              ) : (
                /* Step 2: AI Review & Approval */
                <div className="space-y-5">
                  {/* Summary Card */}
                  <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 text-sm">{importResult.name}</span>
                        <Badge variant="outline" className="bg-white text-purple-700 border-purple-200 text-[10px] uppercase font-bold">{importResult.format}</Badge>
                      </div>
                      <p className="text-xs text-stone-600 mt-1">
                        Trigger: <span className="font-mono font-semibold bg-white px-1.5 py-0.5 rounded border border-purple-200 text-purple-800">{importResult.trigger}</span> · {importResult.nodes.length} nodes · {importResult.edges.length} connections
                      </p>
                    </div>
                    <button
                      onClick={() => setImportResult(null)}
                      className="text-xs text-purple-700 font-medium hover:underline self-start sm:self-auto"
                    >
                      Edit JSON ↺
                    </button>
                  </div>

                  {/* AI Dynamic Suggestions */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-purple-600" /> AI Dynamic Upgrades ({importResult.suggestions.length})
                      </h3>
                      <span className="text-[11px] text-stone-500">Select which dynamic modules to attach automatically:</span>
                    </div>

                    {importResult.suggestions.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed text-center text-xs text-stone-500 bg-stone-50/50">
                        No additional dynamic upgrades needed — all nodes mapped directly!
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[38vh] overflow-y-auto pr-1">
                        {importResult.suggestions.map(sug => {
                          const isSelected = !!selectedSuggestions[sug.id]
                          return (
                            <div
                              key={sug.id}
                              onClick={() => setSelectedSuggestions(prev => ({ ...prev, [sug.id]: !prev[sug.id] }))}
                              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                                isSelected
                                  ? "bg-purple-50/40 border-purple-300 shadow-xs"
                                  : "bg-white border-stone-200 hover:border-stone-300 opacity-75"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="mt-1 h-4 w-4 text-purple-600 rounded border-stone-300 focus:ring-purple-500 pointer-events-none"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-stone-900">{sug.title}</span>
                                  <Badge variant="outline" className="text-[9px] font-semibold bg-white text-stone-600">{sug.category}</Badge>
                                </div>
                                <p className="text-xs text-stone-600 mt-1 leading-relaxed">{sug.description}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {importResult && (
              <div className="px-6 py-3.5 border-t bg-stone-50 flex items-center justify-between">
                <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setImportResult(null)}>
                  Back
                </Button>
                <Button
                  onClick={handleApproveImport}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-5 h-9 font-semibold gap-1.5 shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Approve & Load into Canvas
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Node Inspector ───────────────────────────────────────────────────────────

function NodeInspector({
  node, onUpdate, onDelete, wcProducts,
}: {
  node: { id: string; type: string; data: Record<string, unknown> }
  onUpdate: (patch: Record<string, unknown>) => void
  onDelete: () => void
  wcProducts: any[]
}) {
  const d = node.data

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2.5 border-b bg-stone-50 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">{NODE_EMOJI[node.type] || "📌"}</span>
          <span className="text-xs font-bold text-stone-700">{NODE_LABEL[node.type] || node.type}</span>
        </div>
        {node.type !== "TRIGGER" && (
          <button onClick={onDelete} className="text-stone-300 hover:text-red-500 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* MESSAGE */}
        {(node.type === "MESSAGE" || node.type === "BUTTONS") && (
          <>
            <label className="text-[11px] font-medium text-stone-600 block">
              Message text
              <Textarea rows={4} className="mt-1 text-xs" value={String(d.text || "")} placeholder="Your message…" onChange={e => onUpdate({ text: e.target.value })} />
            </label>
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-stone-600">Buttons (max 3)</div>
              {(Array.isArray(d.buttons) ? d.buttons as any[] : []).map((b: any, i: number) => (
                <div key={i} className="flex gap-1.5">
                  <Input className="h-7 text-xs" value={b.title} placeholder="Button text" onChange={e => {
                    const btns = [...(d.buttons as any[])]
                    btns[i] = { ...btns[i], title: e.target.value }
                    onUpdate({ buttons: btns })
                  }} />
                  <button className="text-stone-300 hover:text-red-500" onClick={() => {
                    const btns = (d.buttons as any[]).filter((_: any, j: number) => j !== i)
                    onUpdate({ buttons: btns })
                  }}><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              {(Array.isArray(d.buttons) ? d.buttons : []).length < 3 && (
                <button className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1" onClick={() => {
                  const btns = [...(Array.isArray(d.buttons) ? d.buttons as any[] : []), { id: `b${Date.now()}`, title: "" }]
                  onUpdate({ buttons: btns })
                }}>
                  <Plus className="h-3 w-3" /> Add button
                </button>
              )}
            </div>
          </>
        )}

        {/* LIST */}
        {node.type === "LIST" && (
          <>
            <label className="text-[11px] font-medium text-stone-600 block">
              Intro text
              <Textarea rows={2} className="mt-1 text-xs" value={String(d.text || "")} onChange={e => onUpdate({ text: e.target.value })} />
            </label>
            <label className="text-[11px] font-medium text-stone-600 block">
              Button label
              <Input className="mt-1 h-7 text-xs" value={String(d.listButton || "Choose")} onChange={e => onUpdate({ listButton: e.target.value })} />
            </label>
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-stone-600">List items (max 10)</div>
              {(Array.isArray(d.rows) ? d.rows as any[] : []).map((r: any, i: number) => (
                <div key={i} className="flex gap-1.5 items-center">
                  <div className="flex-1 space-y-0.5">
                    <Input className="h-7 text-xs" value={r.title} placeholder="Title" onChange={e => {
                      const rows = [...(d.rows as any[])]
                      rows[i] = { ...rows[i], title: e.target.value }
                      onUpdate({ rows })
                    }} />
                    <Input className="h-6 text-[10px]" value={r.description || ""} placeholder="Description (optional)" onChange={e => {
                      const rows = [...(d.rows as any[])]
                      rows[i] = { ...rows[i], description: e.target.value }
                      onUpdate({ rows })
                    }} />
                  </div>
                  <button className="text-stone-300 hover:text-red-500" onClick={() => {
                    const rows = (d.rows as any[]).filter((_: any, j: number) => j !== i)
                    onUpdate({ rows })
                  }}><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              {(Array.isArray(d.rows) ? d.rows : []).length < 10 && (
                <button className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1" onClick={() => {
                  const rows = [...(Array.isArray(d.rows) ? d.rows as any[] : []), { id: `r${Date.now()}`, title: "" }]
                  onUpdate({ rows })
                }}>
                  <Plus className="h-3 w-3" /> Add item
                </button>
              )}
            </div>
          </>
        )}

        {/* QUESTION */}
        {node.type === "QUESTION" && (
          <>
            <label className="text-[11px] font-medium text-stone-600 block">
              Question text
              <Textarea rows={3} className="mt-1 text-xs" value={String(d.text || "")} placeholder="What's your name?" onChange={e => onUpdate({ text: e.target.value })} />
            </label>
            <label className="text-[11px] font-medium text-stone-600 block">
              Save answer as <span className="text-stone-400 font-mono">{"{{"}variable{"}}"}</span>
              <Input className="mt-1 h-7 text-xs font-mono" value={String(d.name || "")} placeholder="full_name" onChange={e => onUpdate({ name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} />
            </label>
            <label className="text-[11px] font-medium text-stone-600 block">
              Answer type
              <select className="mt-1 w-full h-7 px-2 rounded border bg-white text-xs" value={String(d.inputType || "text")} onChange={e => onUpdate({ inputType: e.target.value })}>
                <option value="text">Any text</option>
                <option value="email">Email address</option>
                <option value="phone">Phone number</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="select">Multiple choice</option>
                <option value="image">📷 Image / Photo Upload</option>
                <option value="document">📄 Document / PDF Upload</option>
              </select>
            </label>
            {d.inputType === "select" && (
              <div className="space-y-1">
                <div className="text-[11px] font-medium text-stone-600">Options</div>
                {(Array.isArray(d.options) ? d.options as string[] : []).map((opt, i) => (
                  <div key={i} className="flex gap-1">
                    <Input className="h-7 text-xs flex-1" value={opt} onChange={e => {
                      const opts = [...(d.options as string[])]
                      opts[i] = e.target.value
                      onUpdate({ options: opts })
                    }} />
                    <button onClick={() => { const opts = (d.options as string[]).filter((_, j) => j !== i); onUpdate({ options: opts }) }}><X className="h-3.5 w-3.5 text-stone-300 hover:text-red-500" /></button>
                  </div>
                ))}
                <button className="text-xs text-emerald-600 flex items-center gap-1" onClick={() => onUpdate({ options: [...(Array.isArray(d.options) ? d.options : []), ""] })}>
                  <Plus className="h-3 w-3" /> Add option
                </button>
              </div>
            )}
          </>
        )}

        {/* AI */}
        {node.type === "AI" && (
          <>
            <label className="text-[11px] font-medium text-stone-600 block">
              AI instruction
              <Textarea rows={4} className="mt-1 text-xs" value={String(d.instruction || "")} placeholder="Answer the customer's question naturally and helpfully using the knowledge base…" onChange={e => onUpdate({ instruction: e.target.value })} />
            </label>
            <div className="flex items-center gap-2">
              <Switch checked={d.useKnowledge !== false} onCheckedChange={v => onUpdate({ useKnowledge: v })} />
              <span className="text-xs text-stone-600">Use knowledge base</span>
            </div>
            <p className="text-[10px] text-stone-400 leading-relaxed">The AI will read relevant passages from your knowledge base and craft a natural reply. Use {"{{variables}}"} from earlier steps in the instruction.</p>
          </>
        )}

        {/* CONDITION */}
        {node.type === "CONDITION" && (
          <>
            <div className="text-[11px] font-medium text-stone-600 mb-1">Branch condition</div>
            <select className="w-full h-8 px-2 rounded border bg-white text-xs mb-2" value={String(d.field || "message")} onChange={e => onUpdate({ field: e.target.value })}>
              <option value="message">Customer message text</option>
              <option value="intent">Detected intent</option>
              <option value="has_open_order">Number of open orders</option>
              <option value="order_count">Total bookings</option>
            </select>
            <div className="flex gap-1.5 mb-2">
              <select className="flex-1 h-8 px-2 rounded border bg-white text-xs" value={String(d.op || "contains")} onChange={e => onUpdate({ op: e.target.value })}>
                <option value="contains">contains</option>
                <option value="equals">is exactly</option>
                <option value="gt">is greater than</option>
                <option value="lt">is less than</option>
              </select>
              <Input className="flex-1 h-8 text-xs" value={String(d.value || "")} placeholder="value" onChange={e => onUpdate({ value: e.target.value })} />
            </div>
            <p className="text-[10px] text-stone-400">→ <strong>true</strong> port: condition matches<br />→ <strong>false</strong> port: condition does not match</p>
          </>
        )}

        {/* HOURS */}
        {node.type === "HOURS" && (
          <>
            <div className="text-[11px] font-medium text-stone-600 mb-1">Business hours (Muscat time)</div>
            <div className="flex gap-2">
              <label className="text-[11px] text-stone-500 flex-1">Open<Input type="time" className="mt-1 h-8 text-xs" value={String(d.from || "08:00")} onChange={e => onUpdate({ from: e.target.value })} /></label>
              <label className="text-[11px] text-stone-500 flex-1">Close<Input type="time" className="mt-1 h-8 text-xs" value={String(d.to || "20:00")} onChange={e => onUpdate({ to: e.target.value })} /></label>
            </div>
            <p className="text-[10px] text-stone-400 mt-1">→ <strong>open</strong>: within hours · <strong>closed</strong>: outside hours</p>
          </>
        )}

        {/* SPLIT */}
        {node.type === "SPLIT" && (
          <>
            <label className="text-[11px] font-medium text-stone-600 block">
              % sent to branch A
              <Input type="number" min={1} max={99} className="mt-1 h-8 text-xs" value={Number(d.percent || 50)} onChange={e => onUpdate({ percent: Number(e.target.value) })} />
            </label>
            <p className="text-[10px] text-stone-400">Randomly splits traffic. Use for A/B testing messages.</p>
          </>
        )}

        {/* DELAY */}
        {node.type === "DELAY" && (
          <label className="text-[11px] font-medium text-stone-600 block">
            Wait (seconds)
            <Input type="number" min={1} className="mt-1 h-8 text-xs" value={Number(d.seconds || 60)} onChange={e => onUpdate({ seconds: Number(e.target.value) })} />
          </label>
        )}

        {/* SET */}
        {node.type === "SET" && (
          <>
            <label className="text-[11px] font-medium text-stone-600 block">
              Variable name
              <Input className="mt-1 h-8 text-xs font-mono" value={String(d.name || "")} placeholder="my_variable" onChange={e => onUpdate({ name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} />
            </label>
            <label className="text-[11px] font-medium text-stone-600 block">
              Value (use {"{{other_var}}"} to reference)
              <Input className="mt-1 h-8 text-xs" value={String(d.value || "")} placeholder="Hello {{name}}" onChange={e => onUpdate({ value: e.target.value })} />
            </label>
          </>
        )}

        {/* TAG */}
        {node.type === "TAG" && (
          <label className="text-[11px] font-medium text-stone-600 block">
            Tag to add
            <Input className="mt-1 h-8 text-xs" value={String(d.value || "")} placeholder="vip, interested, follow-up…" onChange={e => onUpdate({ value: e.target.value })} />
          </label>
        )}

        {/* HTTP */}
        {node.type === "HTTP" && (
          <>
            <div className="flex gap-1.5">
              <select className="h-8 px-2 rounded border bg-white text-xs" value={String(d.method || "GET")} onChange={e => onUpdate({ method: e.target.value })}>
                <option>GET</option><option>POST</option>
              </select>
              <Input className="flex-1 h-8 text-xs" value={String(d.url || "")} placeholder="https://…" onChange={e => onUpdate({ url: e.target.value })} />
            </div>
            {d.method === "POST" && (
              <label className="text-[11px] font-medium text-stone-600 block">
                Request body (JSON)
                <Textarea rows={3} className="mt-1 text-xs font-mono" value={String(d.body || "")} placeholder='{"key":"{{variable}}"}' onChange={e => onUpdate({ body: e.target.value })} />
              </label>
            )}
          </>
        )}

        {/* MEDIA */}
        {node.type === "MEDIA" && (
          <>
            <select className="w-full h-8 px-2 rounded border bg-white text-xs mb-1.5" value={String(d.mediaType || "image")} onChange={e => onUpdate({ mediaType: e.target.value })}>
              <option value="image">Image (JPEG/PNG/WebP)</option>
              <option value="video">Video (MP4)</option>
              <option value="document">Document (PDF)</option>
              <option value="audio">Audio (MP3/OGG)</option>
            </select>
            <div className="flex gap-1.5 mb-1.5">
              <Input className="flex-1 h-8 text-xs font-mono" value={String(d.mediaUrl || "")} placeholder="https://… or upload below" onChange={e => onUpdate({ mediaUrl: e.target.value })} />
              <label className="px-2.5 h-8 bg-stone-100 hover:bg-stone-200 border rounded flex items-center gap-1 cursor-pointer text-xs shrink-0 font-medium text-stone-700">
                <Upload className="h-3 w-3" /> Upload
                <input type="file" className="hidden" onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const form = new FormData()
                  form.append("file", file)
                  const res = await fetch("/api/media/upload", { method: "POST", body: form })
                  const data = await res.json().catch(() => ({}))
                  if (data.url) {
                    onUpdate({ mediaUrl: data.url, mediaType: file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : file.type === "application/pdf" ? "document" : "image" })
                    toast.success("File uploaded successfully!")
                  } else {
                    toast.error(data.error || "Upload failed")
                  }
                }} />
              </label>
            </div>
            {d.mediaUrl && String(d.mediaUrl).match(/\.(png|jpg|jpeg|webp|gif)/i) && (
              <img src={String(d.mediaUrl)} alt="Preview" className="w-full h-24 object-cover rounded-lg border mb-1.5" />
            )}
            <Input className="h-8 text-xs" value={String(d.caption || "")} placeholder="Caption (optional)" onChange={e => onUpdate({ caption: e.target.value })} />
          </>
        )}

        {/* TEMPLATE */}
        {node.type === "TEMPLATE" && (
          <>
            <label className="text-[11px] font-medium text-stone-600 block">
              Template name (exact)
              <Input className="mt-1 h-8 text-xs font-mono" value={String(d.templateName || "")} placeholder="my_template" onChange={e => onUpdate({ templateName: e.target.value })} />
            </label>
            <label className="text-[11px] font-medium text-stone-600 block">
              Language code
              <Input className="mt-1 h-8 text-xs" value={String(d.language || "en_US")} placeholder="en_US" onChange={e => onUpdate({ language: e.target.value })} />
            </label>
          </>
        )}

        {/* HOSPITAL */}
        {node.type === "HOSPITAL" && (
          <>
            <label className="text-[11px] font-medium text-stone-600 block">
              Hospital flow mode
              <select className="mt-1 w-full h-8 px-2 rounded border bg-white text-xs" value={String(d.hospMode || "menu")} onChange={e => onUpdate({ hospMode: e.target.value })}>
                <option value="menu">Full Hospital Menu (Doctor / Chemo / Bookings)</option>
                <option value="chemo">Direct Chemotherapy Day Care Bed Booking (30 Beds)</option>
                <option value="doctor">Direct Doctor Appointment Consultation</option>
                <option value="availability">Live Ward & Bed Availability</option>
              </select>
            </label>
            <label className="text-[11px] font-medium text-stone-600 block">
              Intro message
              <Textarea rows={2} className="mt-1 text-xs" value={String(d.hospitalText || d.text || "")} placeholder="🏥 Connecting you with Kauvery Hospital…" onChange={e => onUpdate({ hospitalText: e.target.value })} />
            </label>
            <p className="text-[10px] text-stone-400">Dynamically bridges into Kauvery Hospital Chemotherapy 30-bed Day Care or Doctor Appointment booking.</p>
          </>
        )}

        {/* TOUR */}
        {node.type === "TOUR" && (
          <>
            <label className="text-[11px] font-medium text-stone-600 block">
              Intro message
              <Textarea rows={2} className="mt-1 text-xs" value={String(d.tourText || d.text || "")} placeholder="🚙 Explore our Desert Safaris & Tours in Oman…" onChange={e => onUpdate({ tourText: e.target.value })} />
            </label>
            <label className="text-[11px] font-medium text-stone-600 block">
              Number of tours to show
              <Input type="number" min={1} max={10} className="mt-1 h-8 text-xs" value={Number(d.tourCount || 4)} onChange={e => onUpdate({ tourCount: Number(e.target.value) })} />
            </label>
            <p className="text-[10px] text-stone-400">Pulls active tours from your database and sends interactive cards/lists with date & slot availability.</p>
          </>
        )}

        {/* PAYMENT */}
        {node.type === "PAYMENT" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] font-medium text-stone-600 block">
                Amount
                <Input type="number" step="0.5" className="mt-1 h-8 text-xs" value={String(d.amount ?? 10)} onChange={e => onUpdate({ amount: Number(e.target.value) })} />
              </label>
              <label className="text-[11px] font-medium text-stone-600 block">
                Currency
                <select className="mt-1 w-full h-8 px-2 rounded border bg-white text-xs" value={String(d.currency || "OMR")} onChange={e => onUpdate({ currency: e.target.value })}>
                  <option value="OMR">OMR (Oman)</option>
                  <option value="AED">AED (UAE)</option>
                  <option value="SAR">SAR (Saudi)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </label>
            </div>
            <label className="text-[11px] font-medium text-stone-600 block">
              Payment description
              <Input className="mt-1 h-8 text-xs" value={String(d.paymentDescription || "")} placeholder="Tour Booking / Hospital Consultation" onChange={e => onUpdate({ paymentDescription: e.target.value })} />
            </label>
            <label className="text-[11px] font-medium text-stone-600 block">
              Custom message text
              <Textarea rows={2} className="mt-1 text-xs" value={String(d.text || "")} placeholder="💳 Please complete your payment securely:" onChange={e => onUpdate({ text: e.target.value })} />
            </label>
            <p className="text-[10px] text-stone-400">Generates a dynamic AmwalPay payment link and sends it with instant card & debit checkout options.</p>
          </>
        )}

        {/* CTA_URL */}
        {node.type === "CTA_URL" && (
          <>
            <label className="text-[11px] font-medium text-stone-600 block">
              Message text
              <Textarea rows={2} className="mt-1 text-xs" value={String(d.text || "")} placeholder="Visit our website or call us:" onChange={e => onUpdate({ text: e.target.value })} />
            </label>
            <label className="text-[11px] font-medium text-stone-600 block">
              Button text
              <Input className="mt-1 h-8 text-xs" value={String(d.buttonText || "Open Website")} placeholder="Open Website" onChange={e => onUpdate({ buttonText: e.target.value })} />
            </label>
            <label className="text-[11px] font-medium text-stone-600 block">
              Website URL
              <Input className="mt-1 h-8 text-xs" value={String(d.url || "")} placeholder="https://app.fizmoh.cloud" onChange={e => onUpdate({ url: e.target.value })} />
            </label>
            <label className="text-[11px] font-medium text-stone-600 block">
              Phone number (optional)
              <Input className="mt-1 h-8 text-xs" value={String(d.phone || "")} placeholder="+968 9882 1965" onChange={e => onUpdate({ phone: e.target.value })} />
            </label>
          </>
        )}

        {/* LOCATION */}
        {node.type === "LOCATION" && (
          <>
            <label className="text-[11px] font-medium text-stone-600 block">
              Location title / Name
              <Input className="mt-1 h-8 text-xs" value={String(d.name || "")} placeholder="Kauvery Hospital / AL BAHR STABLE" onChange={e => onUpdate({ name: e.target.value })} />
            </label>
            <label className="text-[11px] font-medium text-stone-600 block">
              Address
              <Textarea rows={2} className="mt-1 text-xs" value={String(d.address || "")} placeholder="Muscat, Sultanate of Oman" onChange={e => onUpdate({ address: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] font-medium text-stone-600 block">
                Latitude
                <Input type="number" step="0.0001" className="mt-1 h-8 text-xs" value={String(d.latitude ?? 23.5880)} onChange={e => onUpdate({ latitude: Number(e.target.value) })} />
              </label>
              <label className="text-[11px] font-medium text-stone-600 block">
                Longitude
                <Input type="number" step="0.0001" className="mt-1 h-8 text-xs" value={String(d.longitude ?? 58.3829)} onChange={e => onUpdate({ longitude: Number(e.target.value) })} />
              </label>
            </div>
          </>
        )}

        {/* TOUR_DETAILS */}
        {node.type === "TOUR_DETAILS" && (
          <>
            <label className="text-[11px] font-medium text-stone-600 block">
              Custom intro text
              <Textarea rows={2} className="mt-1 text-xs" value={String(d.tourText || d.text || "")} placeholder="🌄 Explore our featured tour:" onChange={e => onUpdate({ tourText: e.target.value })} />
            </label>
            <p className="text-[10px] text-stone-400">Shows the full itinerary, duration, meeting point, and pricing with instant 'Check Dates' button.</p>
          </>
        )}

        {/* TOUR_AVAIL */}
        {node.type === "TOUR_AVAIL" && (
          <>
            <label className="text-[11px] font-medium text-stone-600 block">
              Prompt text
              <Textarea rows={2} className="mt-1 text-xs" value={String(d.text || "")} placeholder="📅 Please reply with your preferred date:" onChange={e => onUpdate({ text: e.target.value })} />
            </label>
          </>
        )}

        {/* HOSP_CHEMO */}
        {node.type === "HOSP_CHEMO" && (
          <>
            <label className="text-[11px] font-medium text-stone-600 block">
              Intro text
              <Textarea rows={2} className="mt-1 text-xs" value={String(d.hospitalText || d.text || "")} placeholder="💊 Chemotherapy Day Care Bed Booking (30 Beds):" onChange={e => onUpdate({ hospitalText: e.target.value })} />
            </label>
            <p className="text-[10px] text-stone-400">Launches 30-bed inventory selector across Normal Ward (`N01`-`N15`) and Special Ward (`S01`-`S15`) with 5-minute atomic holds.</p>
          </>
        )}

        {/* HOSP_DOCTOR */}
        {node.type === "HOSP_DOCTOR" && (
          <>
            <label className="text-[11px] font-medium text-stone-600 block">
              Intro text
              <Textarea rows={2} className="mt-1 text-xs" value={String(d.hospitalText || d.text || "")} placeholder="🩺 Select your oncologist and consultation slot:" onChange={e => onUpdate({ hospitalText: e.target.value })} />
            </label>
            <p className="text-[10px] text-stone-400">Presents active oncologists, weekly consultation schedule, and 30-min slot booking.</p>
          </>
        )}

        {/* HOSP_BED_MAP */}
        {node.type === "HOSP_BED_MAP" && (
          <>
            <label className="text-[11px] font-medium text-stone-600 block">
              Intro text
              <Textarea rows={2} className="mt-1 text-xs" value={String(d.hospitalText || d.text || "")} placeholder="🛏️ Live Ward & Bed Availability Status:" onChange={e => onUpdate({ hospitalText: e.target.value })} />
            </label>
            <p className="text-[10px] text-stone-400">Sends live vacancy summary calculated in real-time ($Total - Booked - Held - Blocked$).</p>
          </>
        )}

        {/* BANK_TRANSFER */}
        {node.type === "BANK_TRANSFER" && (
          <>
            <label className="text-[11px] font-medium text-stone-600 block">
              Bank name
              <Input className="mt-1 h-8 text-xs" value={String(d.bankName || "Bank Muscat")} placeholder="Bank Muscat" onChange={e => onUpdate({ bankName: e.target.value })} />
            </label>
            <label className="text-[11px] font-medium text-stone-600 block">
              Account / IBAN number
              <Input className="mt-1 h-8 text-xs font-mono" value={String(d.accountNumber || "0123-456789-001")} placeholder="0123-456789-001" onChange={e => onUpdate({ accountNumber: e.target.value })} />
            </label>
            <label className="text-[11px] font-medium text-stone-600 block">
              Account Title / Beneficiary
              <Input className="mt-1 h-8 text-xs" value={String(d.accountTitle || "AL BAHR STABLE")} placeholder="AL BAHR STABLE" onChange={e => onUpdate({ accountTitle: e.target.value })} />
            </label>
            <label className="text-[11px] font-medium text-stone-600 block">
              Custom instructions
              <Textarea rows={2} className="mt-1 text-xs" value={String(d.text || "")} placeholder="Please transfer and upload screenshot:" onChange={e => onUpdate({ text: e.target.value })} />
            </label>
          </>
        )}

        {/* APT_RESCHEDULE */}
        {node.type === "APT_RESCHEDULE" && (
          <>
            <label className="text-[11px] font-medium text-stone-600 block">
              Prompt text
              <Textarea rows={2} className="mt-1 text-xs" value={String(d.text || "")} placeholder="🔄 Enter your booking reference ID to manage your appointment:" onChange={e => onUpdate({ text: e.target.value })} />
            </label>
          </>
        )}

        {/* VISA */}
        {node.type === "VISA" && (
          <>
            <label className="text-[11px] font-medium text-stone-600 block">
              Intro text
              <Textarea rows={2} className="mt-1 text-xs" value={String(d.text || "")} placeholder="🛂 Oman Visa & Travel Assistance:" onChange={e => onUpdate({ text: e.target.value })} />
            </label>
            <p className="text-[10px] text-stone-400">Presents interactive options for Tourist Visas, Express Visas, and Document Uploads.</p>
          </>
        )}

        {/* RESTAURANT */}
        {node.type === "RESTAURANT" && (
          <>
            <label className="text-[11px] font-medium text-stone-600 block">
              Intro text
              <Textarea rows={2} className="mt-1 text-xs" value={String(d.text || "")} placeholder="🍽️ Reserve a dining table or view menu:" onChange={e => onUpdate({ text: e.target.value })} />
            </label>
            <p className="text-[10px] text-stone-400">Interactive dining table reservation and digital menu selector.</p>
          </>
        )}

        {/* APPOINTMENT */}
        {node.type === "APPOINTMENT" && (
          <>
            <label className="text-[11px] font-medium text-stone-600 block">
              Intro message
              <Textarea rows={3} className="mt-1 text-xs" value={String(d.appointmentText || "")} placeholder="📅 Let me help you book an appointment!" onChange={e => onUpdate({ appointmentText: e.target.value })} />
            </label>
            <label className="text-[11px] font-medium text-stone-600 block">
              Pre-selected service ID (optional)
              <Input className="mt-1 h-8 text-xs font-mono" value={String(d.serviceId || "")} placeholder="Leave blank to show all services" onChange={e => onUpdate({ serviceId: e.target.value })} />
            </label>
            <p className="text-[10px] text-stone-400">This launches the full interactive appointment booking flow: service → date → time slot → confirm → payment.</p>
          </>
        )}

        {/* PRODUCT */}
        {node.type === "PRODUCT" && (
          <>
            <label className="text-[11px] font-medium text-stone-600 block">
              Product
              <select className="mt-1 w-full h-8 px-2 rounded border bg-white text-xs" value={String(d.productId || "latest")} onChange={e => onUpdate({ productId: e.target.value })}>
                <option value="latest">Latest / Featured product</option>
                {wcProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="text-[11px] font-medium text-stone-600 block">
              Custom caption
              <Textarea rows={2} className="mt-1 text-xs" value={String(d.text || "")} placeholder="Optional intro message" onChange={e => onUpdate({ text: e.target.value })} />
            </label>
          </>
        )}

        {/* CATALOG */}
        {node.type === "CATALOG" && (
          <>
            <label className="text-[11px] font-medium text-stone-600 block">
              Intro message
              <Textarea rows={2} className="mt-1 text-xs" value={String(d.text || "")} placeholder="🛍️ Browse our products:" onChange={e => onUpdate({ text: e.target.value })} />
            </label>
            <label className="text-[11px] font-medium text-stone-600 block">
              Product count (max 10)
              <Input type="number" min={1} max={10} className="mt-1 h-8 text-xs" value={Number(d.productCount || 5)} onChange={e => onUpdate({ productCount: Number(e.target.value) })} />
            </label>
          </>
        )}

        {/* SAVE */}
        {node.type === "SAVE" && (
          <p className="text-xs text-stone-500 leading-relaxed">Saves all collected answers as a lead/enquiry and notifies staff. Place this after your questions.</p>
        )}

        {/* HANDOFF */}
        {node.type === "HANDOFF" && (
          <p className="text-xs text-stone-500 leading-relaxed">Transfers the conversation to a human agent. The bot stops responding and staff are notified.</p>
        )}

        {/* END */}
        {node.type === "END" && (
          <p className="text-xs text-stone-500 leading-relaxed">Explicitly ends this flow. The customer returns to the normal assistant.</p>
        )}

        {/* TRIGGER */}
        {node.type === "TRIGGER" && (
          <p className="text-xs text-stone-500 leading-relaxed">This is the start of your flow. Configure the trigger keyword/intent in Settings above.</p>
        )}
      </div>
    </div>
  )
}
