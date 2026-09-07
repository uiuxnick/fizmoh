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
  Phone, UserCheck
} from "lucide-react"
import { formatCurrency, formatDateTime, timeAgo } from "@/lib/helpers"
import { AVAILABLE_LABELS, labelClass } from "@/components/views/conversation-tools"

interface Conversation {
  id: string
  customerPhone: string
  customerName: string | null
  botActive: boolean
  labels: string | null
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

function parseLabels(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
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

  const loadNotes = useCallback(() => {
    fetch(`/api/conversations/${conversation.id}/notes`)
      .then(r => r.json())
      .then(d => setNotes(d.notes || []))
      .catch(() => setNotes([]))
  }, [conversation.id])

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

  const labels = parseLabels(conversation.labels)
  const origin = originOf(conversation.customerPhone)
  const customer = conversation.customer

  return (
    <div className="h-full flex-1 min-h-0 overflow-y-auto bg-white p-4 space-y-3.5">
      {/* Customer Profile Card */}
        <div className="text-center p-3 rounded-2xl bg-gradient-to-br from-stone-50 to-emerald-50/30 border border-stone-200/80">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white text-xl font-black mx-auto mb-2 shadow-sm shadow-emerald-600/20">
            {(conversation.customerName || conversation.customerPhone)[0]?.toUpperCase()}
          </div>
          <div className="font-bold text-sm text-stone-900 truncate">
            {conversation.customerName || "WhatsApp Customer"}
          </div>
          <div className="text-xs text-stone-500 font-mono mt-0.5">{conversation.customerPhone}</div>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300/80 text-[10px] font-bold">
              {customer?.loyaltyTier || "STANDARD"}
            </Badge>
            <Badge variant="outline" className="text-[10px] text-stone-600">
              {origin.country}
            </Badge>
          </div>
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
                        { labels: JSON.stringify(on ? labels.filter(l => l !== label) : [...labels, label]) },
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
