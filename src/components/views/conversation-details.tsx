"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import {
  Clock, Globe, Languages, MapPin, UserRound, Tag, StickyNote, Plus,
  ShoppingBag, Mail, CheckCircle2, AlertTriangle, Bot, ShieldCheck, Sparkles,
  Phone, UserCheck, Copy, PhoneCall, ExternalLink, Smile, Frown, Meh, X, Download,
} from "lucide-react"
import { formatCurrency, formatDateTime, timeAgo } from "@/lib/helpers"
import { AVAILABLE_LABELS, labelClass, parseLabels } from "@/components/views/conversation-tools"

interface Conversation {
  id: string
  customerPhone: string
  customerName: string | null
  status?: string
  botActive: boolean
  labels?: any
  assignedStaffId?: string | null
  intent: string | null
  sentiment: string | null
  createdAt?: string
  lastMessageAt: string | null
  customer: {
    name: string | null
    email?: string | null
    preferredLang?: string
    loyaltyTier: string
    totalBookings: number
    totalSpent: number
    createdAt?: string
    whatsappOptIn?: boolean
    optInSource?: string | null
    optInAt?: string | null
  } | null
}

interface SessionState { open: boolean; expiresAt: string | null; hoursLeft: number }
interface Note { id: string; content: string; createdAt: string; staff: { name: string } | null }
interface StaffOption { id: string; name: string; role: string }

const DIAL_CODES: [string, string, string][] = [
  ["968", "Oman 🇴🇲", "+04:00"],
  ["971", "UAE 🇦🇪", "+04:00"],
  ["973", "Bahrain 🇧🇭", "+03:00"],
  ["974", "Qatar 🇶🇦", "+03:00"],
  ["965", "Kuwait 🇰🇼", "+03:00"],
  ["966", "Saudi Arabia 🇸🇦", "+03:00"],
  ["91", "India 🇮🇳", "+05:30"],
  ["44", "United Kingdom 🇬🇧", "+00:00"],
  ["49", "Germany 🇩🇪", "+01:00"],
  ["33", "France 🇫🇷", "+01:00"],
  ["1", "USA / Canada 🇺🇸", "-05:00"],
]

function originOf(phone: string): { country: string; timezone: string } {
  const digits = phone.replace(/[^0-9]/g, "")
  for (const [code, country, timezone] of DIAL_CODES) {
    if (digits.startsWith(code)) return { country, timezone }
  }
  return { country: "International", timezone: "—" }
}


function Row({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <Icon className="h-3.5 w-3.5 text-stone-400 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase font-bold tracking-wider text-stone-400">{label}</div>
        <div className="text-xs font-semibold text-stone-800 break-words">{children}</div>
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon?: any; children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-2xl bg-stone-50/70 border border-stone-200/70 space-y-2">
      <div className="text-[11px] font-black uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-emerald-600" />}
        <span>{title}</span>
      </div>
      {children}
    </div>
  )
}

export function ConversationDetails({
  conversation,
  session,
  onChanged,
}: {
  conversation: Conversation
  session: SessionState | null
  onChanged: () => void
}) {
  const [notes, setNotes] = useState<Note[]>([])
  const [draft, setDraft] = useState("")
  const [adding, setAdding] = useState(false)
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [customTag, setCustomTag] = useState("")

  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryData, setSummaryData] = useState<{
    intent: string
    status: string
    nextAction: string
    summary: string
  } | null>(null)
  const [savingSummaryNote, setSavingSummaryNote] = useState(false)

  useEffect(() => {
    setSummaryData(null)
  }, [conversation.id])

  const loadNotes = useCallback(() => {
    fetch(`/api/conversations/${conversation.id}/notes`)
      .then(r => r.json())
      .then(d => setNotes(d.notes || []))
      .catch(() => setNotes([]))
  }, [conversation.id])

  const generateSummary = async () => {
    setSummaryLoading(true)
    try {
      const res = await fetch(`/api/conversations/${conversation.id}/summarize`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to summarize")
      setSummaryData({
        intent: data.points?.intent || "Customer inquiry",
        status: data.points?.status || "Conversation active",
        nextAction: data.points?.nextAction || "Reply to customer",
        summary: data.summary || "",
      })
      toast.success("AI Thread Summary generated!")
    } catch (err: any) {
      toast.error(err.message || "Could not generate summary")
    } finally {
      setSummaryLoading(false)
    }
  }

  const saveSummaryAsNote = async () => {
    if (!summaryData) return
    setSavingSummaryNote(true)
    try {
      const noteContent = `📋 [AI Thread Summary]\n• 📌 Request: ${summaryData.intent}\n• ⚙️ Status: ${summaryData.status}\n• 💡 Next Step: ${summaryData.nextAction}`
      const res = await fetch(`/api/conversations/${conversation.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent }),
      })
      if (!res.ok) throw new Error("Failed to save note")
      loadNotes()
      toast.success("Summary saved to Team Notes!")
    } catch {
      toast.error("Could not save to notes")
    } finally {
      setSavingSummaryNote(false)
    }
  }

  useEffect(() => { loadNotes() }, [loadNotes])
  useEffect(() => {
    fetch("/api/staff").then(r => r.json()).then(d => setStaff(d.staff || [])).catch(() => setStaff([]))
  }, [])

  const patch = async (body: Record<string, unknown>, message: string) => {
    const res = await fetch(`/api/conversations/${conversation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) { toast.error("Could not save"); return }
    toast.success(message)
    onChanged()
  }

  const addNote = async () => {
    if (!draft.trim()) return
    setAdding(true)
    try {
      const res = await fetch(`/api/conversations/${conversation.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      })
      if (!res.ok) { toast.error("Could not add the note"); return }
      setDraft("")
      loadNotes()
      toast.success("Note saved")
    } finally {
      setAdding(false)
    }
  }

  const addCustomTag = () => {
    const cleaned = customTag.trim()
    if (!cleaned) return
    const currentLabels = parseLabels(conversation.labels)
    if (currentLabels.some(l => l.toLowerCase() === cleaned.toLowerCase())) {
      toast.info("Label already exists")
      return
    }
    const next = [...currentLabels, cleaned]
    patch({ labels: next }, `Label "${cleaned}" added`)
    setCustomTag("")
  }

  const exportTranscript = async () => {
    try {
      const res = await fetch(`/api/conversations/${conversation.id}/messages`)
      const data = await res.json()
      const msgs = data.conversation?.messages || []
      const lines = [
        `============================================================`,
        `CONVERSATION TRANSCRIPT - ${conversation.customerName || conversation.customerPhone}`,
        `Phone: ${conversation.customerPhone}`,
        `Status: ${conversation.status || "OPEN"}`,
        `Exported: ${new Date().toLocaleString()}`,
        `============================================================\n`,
      ]
      msgs.forEach((m: any) => {
        const time = new Date(m.createdAt).toLocaleString()
        const sender =
          m.direction === "INBOUND"
            ? conversation.customerName || "Customer"
            : m.isAiGenerated
            ? "AI Assistant"
            : "Support Staff"
        lines.push(`[${time}] ${sender}:`)
        if (m.content) lines.push(`  ${m.content}`)
        if (m.mediaUrl) lines.push(`  [Attachment: ${m.mediaUrl}]`)
        lines.push("")
      })
      const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `transcript-${conversation.customerPhone.replace(/[^0-9]/g, "")}-${new Date().toISOString().slice(0, 10)}.txt`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Transcript downloaded")
    } catch {
      toast.error("Could not export transcript")
    }
  }

  const labels = parseLabels(conversation.labels)
  const origin = originOf(conversation.customerPhone)
  const customer = conversation.customer

  return (
    <div className="h-full flex-1 min-h-0 overflow-y-auto bg-white p-4 space-y-3.5">
      {/* Customer Profile Card */}
      <div className="text-center p-3 rounded-2xl bg-gradient-to-br from-stone-50 to-emerald-50/30 border border-stone-200/80">
        {(() => {
          const hasRealName = Boolean(conversation.customerName && conversation.customerName !== "Unknown")
          const displayName = hasRealName ? conversation.customerName : conversation.customerPhone
          const initial = hasRealName ? conversation.customerName!.slice(0, 2).toUpperCase() : (conversation.customerPhone.replace(/^[+]/, "")[0] || "#")
          return (
            <>
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white text-xl font-black mx-auto mb-2 shadow-sm shadow-emerald-600/20">
                {initial}
              </div>
              <div className="font-bold text-sm text-stone-900">{displayName}</div>
              {hasRealName && (
                <div className="text-xs text-stone-500 font-mono mt-0.5">{conversation.customerPhone}</div>
              )}
            </>
          )
        })()}

        {/* 1-Click Quick Actions */}
        <div className="flex items-center justify-center gap-1.5 mt-2.5">
          <button
            onClick={() => {
              navigator.clipboard.writeText(conversation.customerPhone)
              toast.success("Phone copied to clipboard")
            }}
            className="flex items-center gap-1 text-[11px] font-medium bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg px-2 py-1 transition-all shadow-2xs"
            title="Copy phone number"
          >
            <Copy className="h-3 w-3 text-stone-500" />
            <span>Copy</span>
          </button>
          <a
            href={`https://wa.me/${conversation.customerPhone.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg px-2 py-1 transition-all shadow-2xs"
            title="Direct WhatsApp"
          >
            <ExternalLink className="h-3 w-3 text-emerald-600" />
            <span>WhatsApp</span>
          </a>
          <a
            href={`tel:${conversation.customerPhone}`}
            className="flex items-center gap-1 text-[11px] font-medium bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg px-2 py-1 transition-all shadow-2xs"
            title="Voice Call"
          >
            <PhoneCall className="h-3 w-3 text-stone-500" />
            <span>Call</span>
          </a>
          <button
            onClick={exportTranscript}
            className="flex items-center gap-1 text-[11px] font-medium bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg px-2 py-1 transition-all shadow-2xs"
            title="Download conversation transcript (.txt)"
          >
            <Download className="h-3 w-3 text-stone-500" />
            <span>Export</span>
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-2">
          <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300/80 text-[10px] font-bold">
            {customer?.loyaltyTier || "STANDARD"}
          </Badge>
          <Badge variant="outline" className="text-[10px] text-stone-600">
            {origin.country}
          </Badge>
        </div>

        {/* Sentiment & Intent Badges */}
        {(conversation.sentiment || conversation.intent) && (
          <div className="flex items-center justify-center gap-1.5 mt-2 pt-2 border-t border-stone-200/60 text-xs">
            {conversation.sentiment && (
              <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                conversation.sentiment.toLowerCase() === "positive"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : conversation.sentiment.toLowerCase() === "negative"
                  ? "bg-rose-50 text-rose-800 border-rose-200"
                  : "bg-stone-100 text-stone-700 border-stone-200"
              }`}>
                {conversation.sentiment.toLowerCase() === "positive" ? (
                  <Smile className="h-3 w-3 text-emerald-600" />
                ) : conversation.sentiment.toLowerCase() === "negative" ? (
                  <Frown className="h-3 w-3 text-rose-600" />
                ) : (
                  <Meh className="h-3 w-3 text-stone-500" />
                )}
                <span className="capitalize">{conversation.sentiment}</span>
              </div>
            )}
            {conversation.intent && (
              <div className="text-[10px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200 truncate max-w-[140px]">
                {conversation.intent}
              </div>
            )}
          </div>
        )}
      </div>

        {/* AI Thread Summary Card */}
        <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-stone-50 border border-indigo-200/80 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>AI Thread Summary (TL;DR)</span>
            </div>
            <button
              type="button"
              onClick={generateSummary}
              disabled={summaryLoading}
              className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 border border-indigo-200/90 rounded-lg px-2 py-0.5 transition-all shadow-2xs disabled:opacity-50"
            >
              <Sparkles className={`h-3 w-3 text-indigo-600 ${summaryLoading ? "animate-spin" : ""}`} />
              <span>{summaryLoading ? "Analyzing..." : summaryData ? "Refresh" : "Summarize"}</span>
            </button>
          </div>

          {summaryData ? (
            <div className="space-y-1.5 text-xs text-indigo-950 pt-0.5">
              <div className="p-2.5 rounded-xl bg-white/95 border border-indigo-100/90 space-y-1.5 shadow-2xs">
                <div className="flex items-start gap-1.5">
                  <span className="shrink-0 text-xs">📌</span>
                  <div className="min-w-0">
                    <span className="font-bold text-indigo-900 text-[10.5px] uppercase tracking-wide">Request: </span>
                    <span className="text-stone-700">{summaryData.intent}</span>
                  </div>
                </div>
                <div className="flex items-start gap-1.5 pt-1 border-t border-stone-100">
                  <span className="shrink-0 text-xs">⚙️</span>
                  <div className="min-w-0">
                    <span className="font-bold text-indigo-900 text-[10.5px] uppercase tracking-wide">Status: </span>
                    <span className="text-stone-700">{summaryData.status}</span>
                  </div>
                </div>
                <div className="flex items-start gap-1.5 pt-1 border-t border-stone-100">
                  <span className="shrink-0 text-xs">💡</span>
                  <div className="min-w-0">
                    <span className="font-bold text-emerald-800 text-[10.5px] uppercase tracking-wide">Next Step: </span>
                    <span className="text-emerald-900 font-semibold">{summaryData.nextAction}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(summaryData.summary)
                    toast.success("Summary copied to clipboard")
                  }}
                  className="flex items-center gap-1 text-[10.5px] font-semibold text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-lg px-2 py-1 transition-all shadow-2xs"
                  title="Copy markdown summary"
                >
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </button>
                <button
                  type="button"
                  onClick={saveSummaryAsNote}
                  disabled={savingSummaryNote}
                  className="flex items-center gap-1 text-[10.5px] font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg px-2 py-1 transition-all shadow-2xs disabled:opacity-50"
                  title="Save as team note"
                >
                  <StickyNote className="h-3 w-3 text-amber-600" />
                  <span>{savingSummaryNote ? "Saving..." : "Save to Notes"}</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Get an instant 3-bullet breakdown of customer intent, thread status, and recommended next steps.
            </p>
          )}
        </div>

        {/* 24-Hour WhatsApp Session Window */}
        <div
          className={`p-3 rounded-2xl border ${
            session?.open
              ? "bg-emerald-50/80 border-emerald-200/80 text-emerald-950"
              : "bg-amber-50/80 border-amber-200/80 text-amber-950"
          }`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            {session?.open ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            )}
            <span className="text-xs font-bold">
              {session?.open ? `24h Session Open · ${session.hoursLeft}h left` : "24h Session Closed"}
            </span>
          </div>
          <p className="text-[11px] opacity-80 leading-relaxed">
            {session?.open
              ? "Freeform text and media replies will be delivered instantly."
              : "Meta requires an approved template message to re-open the conversation."}
          </p>
        </div>

        {/* Automation & Agent Assignment */}
        <Section title="Assignment & Bot" icon={UserCheck}>
          <div className="flex items-center justify-between py-0.5">
            <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5 text-stone-400" />
              Bot Auto-Reply
            </span>
            <Switch
              checked={conversation.botActive}
              onCheckedChange={v => patch({ botActive: v }, v ? "Bot resumed" : "Bot paused")}
            />
          </div>

          {/* Conversation Status */}
          <div className="pt-1">
            <div className="text-[10px] uppercase font-bold tracking-wider text-stone-400 mb-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Status
            </div>
            <div className="grid grid-cols-3 gap-1">
              {[
                { key: "OPEN", label: "Open", color: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold shadow-2xs" },
                { key: "PENDING", label: "Pending", color: "bg-amber-50 text-amber-800 border-amber-300 font-bold shadow-2xs" },
                { key: "RESOLVED", label: "Resolved", color: "bg-blue-50 text-blue-800 border-blue-300 font-bold shadow-2xs" },
              ].map(s => {
                const active = (conversation.status || "OPEN") === s.key
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => patch({ status: s.key }, `Status marked as ${s.label}`)}
                    className={`py-1 text-xs rounded-lg border text-center transition-all ${
                      active
                        ? s.color
                        : "bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200/70"
                    }`}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="pt-1">
            <div className="text-[10px] uppercase font-bold tracking-wider text-stone-400 mb-1 flex items-center gap-1">
              <UserRound className="h-3 w-3" /> Assigned Staff
            </div>
            <select
              value={conversation.assignedStaffId ?? ""}
              onChange={e => patch({ assignedStaffId: e.target.value || null }, e.target.value ? "Assigned" : "Unassigned")}
              className="w-full px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-medium focus:ring-emerald-500"
            >
              <option value="">Unassigned (Team Pool)</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role.replace("_", " ")})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-1">
            <div className="text-[10px] uppercase font-bold tracking-wider text-stone-400 mb-1 flex items-center gap-1">
              <Tag className="h-3 w-3" /> Labels
            </div>
            <div className="flex flex-wrap gap-1">
              {AVAILABLE_LABELS.map(label => {
                const on = labels.includes(label)
                return (
                  <button
                    key={label}
                    onClick={() =>
                      patch(
                        { labels: on ? labels.filter(l => l !== label) : [...labels, label] },
                        on ? "Label removed" : "Label added",
                      )
                    }
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-lg transition-all ${
                      on ? labelClass(label) : "bg-stone-200/70 text-stone-500 hover:bg-stone-200"
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            {/* Custom non-standard tags */}
            {labels.filter(l => !AVAILABLE_LABELS.includes(l)).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-stone-200/60">
                {labels.filter(l => !AVAILABLE_LABELS.includes(l)).map(custom => (
                  <span
                    key={custom}
                    className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                  >
                    #{custom}
                    <button
                      type="button"
                      onClick={() =>
                        patch(
                          { labels: labels.filter(l => l !== custom) },
                          `Tag #${custom} removed`,
                        )
                      }
                      className="hover:text-red-600 transition-colors ml-0.5"
                      title="Remove tag"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Inline Add Custom Tag */}
            <div className="flex items-center gap-1.5 mt-2">
              <input
                type="text"
                value={customTag}
                onChange={e => setCustomTag(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addCustomTag()
                  }
                }}
                placeholder="Custom tag (e.g. vip-client)..."
                className="flex-1 px-2.5 py-1 text-[10px] rounded-lg border border-stone-200 bg-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={addCustomTag}
                disabled={!customTag.trim()}
                className="px-2 py-1 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white rounded-lg text-[10px] font-bold flex items-center gap-0.5 transition-colors"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
          </div>
        </Section>

        {/* Customer Commercial Metrics */}
        {customer && (
          <Section title="Commerce Stats" icon={ShoppingBag}>
            <div className="grid grid-cols-2 gap-2 text-center my-1">
              <div className="p-2.5 rounded-xl bg-white border border-stone-200/70 shadow-2xs">
                <div className="text-base font-black text-stone-900">{customer.totalBookings}</div>
                <div className="text-[10px] font-semibold text-stone-500 flex items-center justify-center gap-1 mt-0.5">
                  <ShoppingBag className="h-3 w-3" /> Bookings
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-stone-200/70 shadow-2xs">
                <div className="text-base font-black text-emerald-700">
                  {formatCurrency(customer.totalSpent).replace(" OMR", "")}
                </div>
                <div className="text-[10px] font-semibold text-stone-500 mt-0.5">OMR Spent</div>
              </div>
            </div>

            <Row icon={CheckCircle2} label="WhatsApp Opt-in">
              {customer.whatsappOptIn === false ? (
                <span className="text-rose-600 font-bold">Opted out</span>
              ) : (
                <span className="text-emerald-700 font-semibold">Subscribed</span>
              )}
            </Row>
            {conversation.intent && <Row icon={Tag} label="Intent">{conversation.intent}</Row>}
          </Section>
        )}

        {/* Contact Metadata */}
        <Section title="Contact Info" icon={Globe}>
          <div className="space-y-1">
            <Row icon={Clock} label="First Contact">
              {customer?.createdAt ? formatDateTime(customer.createdAt) : "—"}
            </Row>
            <Row icon={Languages} label="Language">
              {customer?.preferredLang === "ar" ? "Arabic 🇴🇲" : "English 🇬🇧"}
            </Row>
            <Row icon={MapPin} label="Location">{origin.country}</Row>
            <Row icon={Mail} label="Email">{customer?.email || "Not provided"}</Row>
          </div>
        </Section>

        {/* Team Internal Notes */}
        <Section title="Internal Staff Notes" icon={StickyNote}>
          <div className="space-y-2">
            <Textarea
              rows={2}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Add private note visible only to your team…"
              className="text-xs bg-white rounded-xl resize-none focus-visible:ring-emerald-500"
            />
            <Button
              size="sm"
              className="h-8 text-xs w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
              onClick={addNote}
              disabled={adding || !draft.trim()}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Note
            </Button>
          </div>

          <div className="mt-2 space-y-2">
            {notes.length === 0 ? (
              <p className="text-[11px] text-stone-400 text-center py-2">No internal notes yet</p>
            ) : (
              notes.map(note => (
                <div key={note.id} className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/70 shadow-2xs">
                  <div className="text-xs text-stone-800 whitespace-pre-wrap leading-relaxed">{note.content}</div>
                  <div className="text-[10px] font-semibold text-stone-400 mt-1 flex items-center gap-1 font-mono">
                    <StickyNote className="h-2.5 w-2.5 text-amber-600" />
                    {note.staff?.name || "Staff"} · {timeAgo(note.createdAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </Section>
    </div>
  )
}
