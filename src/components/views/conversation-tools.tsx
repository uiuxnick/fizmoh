"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"
import { Tag, UserRound, Zap, Plus, Clock } from "lucide-react"

export const AVAILABLE_LABELS = [
  "VIP", "New Lead", "Payment Pending", "Arabic Speaker", "Repeat Customer", "Complaint", "Follow Up",
]

const LABEL_COLORS: Record<string, string> = {
  VIP: "bg-rose-100 text-rose-700",
  "New Lead": "bg-emerald-100 text-emerald-700",
  "Payment Pending": "bg-amber-100 text-amber-700",
  "Arabic Speaker": "bg-blue-100 text-blue-700",
  "Repeat Customer": "bg-purple-100 text-purple-700",
  Complaint: "bg-orange-100 text-orange-700",
  "Follow Up": "bg-teal-100 text-teal-700",
}

export function labelClass(label: string) {
  return LABEL_COLORS[label] || "bg-stone-100 text-stone-600"
}

export function parseLabels(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.map(x => (typeof x === "string" ? x : String(x))).filter(Boolean)
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim()
    if (!trimmed || trimmed === "[]") return []
    try {
      const list = JSON.parse(trimmed)
      if (Array.isArray(list)) return list.map(x => (typeof x === "string" ? x : String(x))).filter(Boolean)
      if (typeof list === "string" && list.trim()) return [list.trim()]
    } catch {
      if (trimmed.includes(",")) {
        return trimmed.split(",").map(s => s.trim()).filter(Boolean)
      }
      return [trimmed]
    }
  }
  return []
}

export function LabelPicker({ conversationId, labels, onChanged }: { conversationId: string; labels: unknown; onChanged: () => void }) {
  const current = parseLabels(labels)
  const [search, setSearch] = useState("")
  const [extraLabels, setExtraLabels] = useState<string[]>([])

  const allLabels = Array.from(new Set([...AVAILABLE_LABELS, ...current, ...extraLabels])).filter(Boolean).sort()
  const filtered = search.trim()
    ? allLabels.filter(l => l.toLowerCase().includes(search.trim().toLowerCase()))
    : allLabels

  const toggle = async (label: string) => {
    const trimmed = label.trim()
    if (!trimmed) return
    const next = current.includes(trimmed) ? current.filter(l => l !== trimmed) : [...current, trimmed]
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labels: next }),
      })
      if (!res.ok) {
        toast.error("Could not update label")
        return
      }
      toast.success(current.includes(trimmed) ? `Label "${trimmed}" removed` : `Label "${trimmed}" added`)
      if (!allLabels.includes(trimmed)) {
        setExtraLabels(prev => [...prev, trimmed])
      }
      setSearch("")
      onChanged()
    } catch {
      toast.error("Network error updating label")
    }
  }

  const isNew = search.trim() && !allLabels.some(l => l.toLowerCase() === search.trim().toLowerCase())

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-stone-600 gap-1"><Tag className="h-3.5 w-3.5" />Labels</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-2 space-y-2">
        <div className="text-[11px] font-semibold text-stone-500 px-1 pb-1 border-b">Conversation labels</div>
        <Input
          placeholder="Search or new label..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && search.trim()) {
              e.preventDefault()
              toggle(search.trim())
            }
          }}
          className="h-7 text-xs bg-stone-50"
        />
        {isNew && (
          <Button
            size="sm"
            onClick={() => toggle(search.trim())}
            className="w-full h-7 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1"
          >
            <Plus className="h-3 w-3" />
            <span>Create &amp; Add &quot;{search.trim()}&quot;</span>
          </Button>
        )}
        <div className="space-y-0.5 max-h-56 overflow-y-auto">
          {filtered.map(l => {
            const active = current.includes(l)
            return (
              <button
                key={l}
                onClick={() => toggle(l)}
                className={`w-full px-2 py-1 rounded text-xs text-left flex items-center justify-between hover:bg-stone-50 ${active ? "font-semibold bg-stone-50" : ""}`}
              >
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${labelClass(l)}`}>{l}</span>
                {active && <span className="text-emerald-600 text-xs">✓</span>}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface StaffOption { id: string; name: string; role: string }
export function AssignPicker({ conversationId, assignedStaffId, onChanged }: { conversationId: string; assignedStaffId: string | null; onChanged: () => void }) {
  const [staffList, setStaffList] = useState<StaffOption[]>([])
  useEffect(() => { fetch("/api/staff").then(r => r.json()).then(d => setStaffList(d.staff || [])).catch(() => setStaffList([])) }, [])
  const assign = async (staffId: string | null) => {
    await fetch(`/api/conversations/${conversationId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignedStaffId: staffId }) })
    onChanged()
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-stone-600 gap-1"><UserRound className="h-3.5 w-3.5" />Assign</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <div className="text-[11px] font-semibold text-stone-500 px-1 pb-1.5 border-b mb-1">Assign staff member</div>
        <button onClick={() => assign(null)} className={`w-full px-2 py-1 rounded text-xs text-left hover:bg-stone-50 ${!assignedStaffId ? "font-semibold text-emerald-700 bg-emerald-50" : "text-stone-600"}`}>Unassigned</button>
        <div className="space-y-0.5 max-h-56 overflow-y-auto mt-1">
          {staffList.map(s => (
            <button key={s.id} onClick={() => assign(s.id)} className={`w-full px-2 py-1 rounded text-xs text-left flex items-center justify-between hover:bg-stone-50 ${assignedStaffId === s.id ? "font-semibold text-emerald-700 bg-emerald-50" : ""}`}>
              <span>{s.name}</span><span className="text-[10px] text-stone-400">{s.role}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface CannedResponse { id: string; title: string; content: string; category?: string | null }

/** Inserts a saved reply into the composer and lets agents create new ones. */
export function CannedPicker({ onPick }: { onPick: (text: string) => void }) {
  const [items, setItems] = useState<CannedResponse[]>([])
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [busy, setBusy] = useState(false)

  const loadCanned = () => {
    fetch("/api/canned-responses").then(r => r.json()).then(d => setItems(d.responses || d.cannedResponses || [])).catch(() => setItems([]))
  }

  useEffect(() => { loadCanned() }, [])

  const saveCanned = async () => {
    if (!newTitle.trim() || !newContent.trim()) return
    setBusy(true)
    try {
      const res = await fetch("/api/canned-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), content: newContent.trim(), category: "GENERAL" }),
      })
      if (res.ok) {
        toast.success("Canned reply saved")
        setNewTitle("")
        setNewContent("")
        setAdding(false)
        loadCanned()
      } else {
        toast.error("Failed to save reply")
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" title="Canned Replies / Quick Responses">
          <Zap className="h-4 w-4 text-stone-500 hover:text-amber-600" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <div className="flex items-center justify-between px-1 pb-1.5 border-b mb-1">
          <span className="text-[11px] font-semibold text-stone-600 flex items-center gap-1">
            <Zap className="h-3 w-3 text-amber-500" /> Canned Replies
          </span>
          <Button variant="ghost" size="sm" onClick={() => setAdding(!adding)} className="h-6 text-[10px] px-1.5 text-emerald-600 gap-0.5">
            <Plus className="h-3 w-3" /> {adding ? "Cancel" : "Add New"}
          </Button>
        </div>

        {adding ? (
          <div className="p-1 space-y-2 bg-stone-50 rounded border mb-1">
            <Input
              placeholder="Title (e.g. Refund Policy)"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="h-7 text-xs bg-white"
            />
            <textarea
              placeholder="Reply text..."
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              rows={2}
              className="w-full text-xs p-1.5 border rounded bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <Button
              size="sm"
              onClick={saveCanned}
              disabled={busy || !newTitle.trim() || !newContent.trim()}
              className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {busy ? "Saving..." : "Save Quick Reply"}
            </Button>
          </div>
        ) : null}

        <div className="space-y-0.5 max-h-64 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-3 text-center text-xs text-stone-400">No saved replies yet. Click &quot;Add New&quot; to create one!</div>
          ) : (
            items.map(item => (
              <button
                key={item.id}
                onClick={() => onPick(item.content)}
                className="w-full px-2 py-1.5 rounded text-left hover:bg-stone-50 group"
              >
                <div className="text-xs font-medium text-stone-800 flex items-center justify-between">
                  <span>{item.title}</span>
                  {item.category && <span className="text-[9px] text-stone-400 uppercase">{item.category}</span>}
                </div>
                <div className="text-[11px] text-stone-500 line-clamp-2 mt-0.5">{item.content}</div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function SnoozePicker({
  conversationId,
  status,
  onChanged,
}: {
  conversationId: string
  status: string
  onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const isSnoozed = status === "SNOOZED"

  const handleSnooze = async (duration: "1h" | "3h" | "tomorrow_9am" | "2d") => {
    setBusy(true)
    try {
      const res = await fetch(`/api/conversations/${conversationId}/snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Conversation snoozed")
        setOpen(false)
        onChanged()
      } else {
        toast.error(data.error || "Could not snooze")
      }
    } catch {
      toast.error("Failed to snooze")
    } finally {
      setBusy(false)
    }
  }

  const handleWakeUp = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/conversations/${conversationId}/snooze`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Conversation reopened")
        setOpen(false)
        onChanged()
      }
    } catch {
      toast.error("Failed to reopen")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          className={`h-7 text-xs font-semibold gap-1.5 shadow-2xs ${
            isSnoozed
              ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
              : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
          }`}
          title={isSnoozed ? "Snoozed conversation" : "Snooze conversation"}
        >
          <Clock className="h-3.5 w-3.5 text-amber-600" />
          <span>{isSnoozed ? "Snoozed ⏰" : "Snooze"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <div className="text-xs font-bold text-stone-700 mb-2 px-1 flex items-center justify-between">
          <span>{isSnoozed ? "Snoozed Status" : "Snooze Conversation"}</span>
          <Clock className="h-3.5 w-3.5 text-amber-600" />
        </div>
        {isSnoozed ? (
          <div className="space-y-2">
            <p className="text-[11px] text-stone-500 px-1">
              This conversation is snoozed. Incoming messages or timer expiration will wake it up.
            </p>
            <Button
              size="sm"
              onClick={handleWakeUp}
              disabled={busy}
              className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              Wake Up Now
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            <button
              onClick={() => handleSnooze("1h")}
              disabled={busy}
              className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-stone-100 flex items-center justify-between transition-colors"
            >
              <span>For 1 hour</span>
              <span className="text-[10px] text-stone-400 font-mono">+1h</span>
            </button>
            <button
              onClick={() => handleSnooze("3h")}
              disabled={busy}
              className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-stone-100 flex items-center justify-between transition-colors"
            >
              <span>For 3 hours</span>
              <span className="text-[10px] text-stone-400 font-mono">+3h</span>
            </button>
            <button
              onClick={() => handleSnooze("tomorrow_9am")}
              disabled={busy}
              className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-stone-100 flex items-center justify-between transition-colors"
            >
              <span>Tomorrow morning</span>
              <span className="text-[10px] text-stone-400 font-mono">9:00 AM</span>
            </button>
            <button
              onClick={() => handleSnooze("2d")}
              disabled={busy}
              className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-stone-100 flex items-center justify-between transition-colors"
            >
              <span>For 2 days</span>
              <span className="text-[10px] text-stone-400 font-mono">+2d</span>
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

