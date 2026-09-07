"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { toast } from "sonner"
import {
  Loader2, Search, Users, Phone, Mail, CalendarClock,
  StickyNote, ShoppingBag, CreditCard, Filter, X, ChevronRight, UserCheck,
  CheckCircle2, Circle, Trash2, Plus,
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"

/**
 * The CRM.
 *
 * A list of names with an order count is a customer table. What makes it a CRM
 * is answering the three questions asked in every pipeline meeting — where is
 * this person in our pipeline, whose job are they, and when did we last speak
 * — and then showing the whole story on one screen instead of making somebody
 * assemble it from four others.
 */

const STAGES = [
  { id: "NEW", label: "New", tone: "bg-stone-100 text-stone-700" },
  { id: "ENGAGED", label: "Engaged", tone: "bg-sky-100 text-sky-700" },
  { id: "QUALIFIED", label: "Qualified", tone: "bg-violet-100 text-violet-700" },
  { id: "CUSTOMER", label: "Customer", tone: "bg-emerald-100 text-emerald-700" },
  { id: "REPEAT", label: "Repeat", tone: "bg-amber-100 text-amber-700" },
  { id: "LOST", label: "Lost", tone: "bg-rose-100 text-rose-700" },
]

interface Contact {
  id: string
  name: string | null
  phone: string
  email: string | null
  stage: string
  ownerStaffId: string | null
  source: string | null
  tags: unknown
  totalBookings: number
  totalSpent: number
  lastContactAt: string | null
  nextFollowUpAt: string | null
  whatsappOptIn: boolean
  createdAt: string
  loyaltyTier: string
}

export default function CrmView() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([])
  const [stages, setStages] = useState<Record<string, number>>({})
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [stage, setStage] = useState("")
  const [owner, setOwner] = useState("")
  const [due, setDue] = useState(false)
  const [sort, setSort] = useState("recent")

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState<string | null>(null)

  const load = useCallback(async () => {
    const query = new URLSearchParams({ page: String(page), sort })
    if (search) query.set("q", search)
    if (stage) query.set("stage", stage)
    if (owner) query.set("owner", owner)
    if (due) query.set("due", "1")

    const response = await fetch(`/api/crm/contacts?${query}`)
    if (!response.ok) { toast.error("Could not load contacts"); return }
    const data = await response.json()
    setContacts(data.contacts ?? [])
    setStaff(data.staff ?? [])
    setStages(data.stages ?? {})
    setTotal(data.total ?? 0)
    setPages(data.pages ?? 1)
  }, [page, sort, search, stage, owner, due])

  // Debounced, so typing a phone number does not fire eight queries.
  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => { load().finally(() => setLoading(false)) }, 250)
    return () => clearTimeout(timer)
  }, [load])

  async function bulk(patch: Record<string, unknown>) {
    if (selected.size === 0) return
    const response = await fetch("/api/crm/contacts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], ...patch }),
    })
    const data = await response.json()
    if (!response.ok) { toast.error(data.error || "That did not work"); return }
    toast.success(`${data.updated} updated`)
    setSelected(new Set())
    load()
  }

  const filtering = Boolean(search || stage || owner || due)

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-none space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Contacts</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {total} {total === 1 ? "person" : "people"}{filtering ? " matching" : ""}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
            <Input
              value={search}
              onChange={e => { setPage(1); setSearch(e.target.value) }}
              placeholder="Name, phone or email"
              className="pl-8 w-64"
            />
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="h-9 rounded-md border border-stone-200 bg-white px-2 text-xs"
          >
            <option value="recent">Newest first</option>
            <option value="value">Highest spend</option>
            <option value="quiet">Quietest first</option>
            <option value="name">By name</option>
          </select>
        </div>
      </div>

      {/* The pipeline, which is also the filter. Clicking a stage is what
          anybody tries first, so it is what it does. */}
      <div className="flex gap-2 flex-wrap">
        <StageChip
          label="Everyone" count={total} active={!stage && !due}
          onClick={() => { setStage(""); setDue(false); setPage(1) }}
          tone="bg-stone-900 text-white"
        />
        {STAGES.map(s => (
          <StageChip
            key={s.id}
            label={s.label}
            count={stages[s.id] ?? 0}
            active={stage === s.id}
            tone={s.tone}
            onClick={() => { setStage(stage === s.id ? "" : s.id); setDue(false); setPage(1) }}
          />
        ))}
        <StageChip
          label="Follow-up due" count={undefined} active={due} tone="bg-amber-100 text-amber-800"
          onClick={() => { setDue(!due); setStage(""); setPage(1) }}
        />
        {(stage || owner || due || search) && (
          <button
            onClick={() => { setStage(""); setOwner(""); setDue(false); setSearch(""); setPage(1) }}
            className="text-xs text-stone-500 hover:text-stone-800 inline-flex items-center gap-1 px-2"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
        <select
          value={owner}
          onChange={e => { setOwner(e.target.value); setPage(1) }}
          className="h-7 rounded-full border border-stone-200 bg-white px-2.5 text-xs text-stone-600"
        >
          <option value="">Anyone&rsquo;s</option>
          <option value="unassigned">Unassigned</option>
          {staff.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
        </select>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 flex-wrap rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
          <span className="text-sm font-medium text-emerald-900">{selected.size} selected</span>
          <select
            onChange={e => { if (e.target.value) bulk({ stage: e.target.value }) }}
            defaultValue=""
            className="h-8 rounded-md border border-emerald-200 bg-white px-2 text-xs"
          >
            <option value="">Move to stage…</option>
            {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <select
            onChange={e => { if (e.target.value) bulk({ ownerStaffId: e.target.value === "none" ? "" : e.target.value }) }}
            defaultValue=""
            className="h-8 rounded-md border border-emerald-200 bg-white px-2 text-xs"
          >
            <option value="">Assign to…</option>
            <option value="none">Nobody</option>
            {staff.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Cancel</Button>
        </div>
      )}

      <div className="rounded-xl border border-stone-200 bg-white overflow-x-auto">
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
        ) : contacts.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-8 w-8 text-stone-300 mx-auto" />
            <p className="mt-3 font-medium text-stone-900">
              {filtering ? "Nobody matches that" : "No contacts yet"}
            </p>
            <p className="mt-1 text-sm text-stone-500">
              {filtering
                ? "Try a different filter, or clear them."
                : "Anyone who messages your WhatsApp number appears here automatically."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-stone-50 text-stone-600">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === contacts.length && contacts.length > 0}
                    onChange={e => setSelected(e.target.checked ? new Set(contacts.map(c => c.id)) : new Set())}
                  />
                </th>
                {["Contact", "Stage", "Owner", "Bookings", "Spent", "Last contact", "Follow-up", ""].map(h => (
                  <th key={h} className="text-left font-semibold px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map(contact => {
                const stageMeta = STAGES.find(s => s.id === contact.stage) ?? STAGES[0]
                const overdue = contact.nextFollowUpAt && new Date(contact.nextFollowUpAt) <= new Date()
                return (
                  <tr key={contact.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(contact.id)}
                        onChange={e => {
                          const next = new Set(selected)
                          if (e.target.checked) next.add(contact.id)
                          else next.delete(contact.id)
                          setSelected(next)
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => setOpen(contact.id)}>
                      <p className="font-medium text-stone-900">{contact.name || "Unnamed"}</p>
                      <p className="text-xs text-stone-500">{contact.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${stageMeta.tone} hover:${stageMeta.tone} text-[11px]`}>
                        {stageMeta.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-stone-600 text-xs">
                      {staff.find(s => s.id === contact.ownerStaffId)?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-stone-700">{contact.totalBookings}</td>
                    <td className="px-4 py-3 text-stone-700">{contact.totalSpent.toFixed(3)}</td>
                    <td className="px-4 py-3 text-xs text-stone-500">{ago(contact.lastContactAt)}</td>
                    <td className="px-4 py-3 text-xs">
                      {contact.nextFollowUpAt ? (
                        <span className={overdue ? "text-rose-600 font-medium" : "text-stone-600"}>
                          {new Date(contact.nextFollowUpAt).toLocaleDateString()}
                        </span>
                      ) : <span className="text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setOpen(contact.id)} className="text-stone-400 hover:text-stone-700">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-stone-600">
          <span>Page {page} of {pages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Back</Button>
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Sheet open={!!open} onOpenChange={value => !value && setOpen(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-y-auto">
          {open && <ContactPanel id={open} staff={staff} onChanged={load} />}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function StageChip({
  label, count, active, tone, onClick,
}: {
  label: string; count?: number; active: boolean; tone: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
        active ? tone : "bg-white border border-stone-200 text-stone-600 hover:border-stone-300"
      }`}
    >
      {label}{count !== undefined && <span className="ml-1.5 opacity-70">{count}</span>}
    </button>
  )
}

/** Everything known about one person, on one screen. */
function ContactPanel({
  id, staff, onChanged,
}: {
  id: string
  staff: { id: string; name: string }[]
  onChanged: () => void
}) {
  const [data, setData] = useState<any>(null)
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  // Bumped whenever anything about this contact changes, so the task list and
  // the timeline below re-fetch without a full panel reload.
  const [tick, setTick] = useState(0)
  const bump = useCallback(() => setTick(t => t + 1), [])

  const load = useCallback(async () => {
    const response = await fetch(`/api/crm/contacts/${id}`)
    if (!response.ok) return
    setData(await response.json())
  }, [id])

  useEffect(() => { load() }, [load])

  async function patch(body: Record<string, unknown>) {
    setSaving(true)
    try {
      const response = await fetch(`/api/crm/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!response.ok) { toast.error("Could not save"); return }
      await load()
      bump()
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  async function addNote() {
    if (!note.trim()) return
    const response = await fetch(`/api/crm/contacts/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: note }),
    })
    if (!response.ok) { toast.error("Could not save the note"); return }
    setNote("")
    await load()
    bump()
    onChanged()
  }

  if (!data) {
    return <div className="p-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>
  }

  const contact = data.contact

  return (
    <div className="pb-10">
      <div className="border-b p-5">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-full bg-emerald-600 grid place-items-center text-white font-bold">
            {(contact.name || contact.phone).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <Input
              defaultValue={contact.name ?? ""}
              placeholder="Unnamed"
              className="font-semibold border-0 px-0 h-auto text-base focus-visible:ring-0"
              onBlur={e => e.target.value !== (contact.name ?? "") && patch({ name: e.target.value })}
            />
            <div className="flex items-center gap-3 text-xs text-stone-500 mt-0.5">
              <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{contact.phone}</span>
              {contact.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{contact.email}</span>}
            </div>
          </div>
          {saving && <Loader2 className="h-4 w-4 animate-spin text-stone-400" />}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <Stat icon={ShoppingBag} label="Bookings" value={String(data.totals.orders)} />
          <Stat icon={CreditCard} label="Paid" value={data.totals.spent.toFixed(3)} />
          <Stat icon={WhatsAppIcon} label="Threads" value={String(data.conversations.length)} />
        </div>
      </div>

      <div className="p-5 space-y-4 border-b">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-stone-500">Stage
            <select
              value={contact.stage}
              onChange={e => patch({ stage: e.target.value })}
              className="mt-1 w-full h-9 rounded-md border border-stone-200 bg-white px-2 text-sm"
            >
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <label className="text-xs text-stone-500">Owner
            <select
              value={contact.ownerStaffId ?? ""}
              onChange={e => patch({ ownerStaffId: e.target.value })}
              className="mt-1 w-full h-9 rounded-md border border-stone-200 bg-white px-2 text-sm"
            >
              <option value="">Nobody</option>
              {staff.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </label>
          <label className="text-xs text-stone-500">Follow up on
            <Input
              type="date"
              defaultValue={contact.nextFollowUpAt ? String(contact.nextFollowUpAt).slice(0, 10) : ""}
              className="mt-1"
              onChange={e => patch({ nextFollowUpAt: e.target.value || null })}
            />
          </label>
          <label className="text-xs text-stone-500">Source
            <Input
              defaultValue={contact.source ?? ""}
              placeholder="WhatsApp, referral…"
              className="mt-1"
              onBlur={e => patch({ source: e.target.value })}
            />
          </label>
        </div>
        <label className="text-xs text-stone-500 block">What to say next time
          <Input
            defaultValue={contact.followUpNote ?? ""}
            placeholder="Wants to hear about the January dates"
            className="mt-1"
            onBlur={e => patch({ followUpNote: e.target.value })}
          />
        </label>
      </div>

      <div className="p-5 border-b">
        <div className="flex gap-2">
          <Input
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addNote() }}
            placeholder="Add a note about this person…"
          />
          <Button onClick={addNote} className="bg-emerald-600 hover:bg-emerald-700 shrink-0">
            <StickyNote className="h-3.5 w-3.5 mr-1.5" />Add
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-stone-500">
          Notes belong to the person, not to one conversation, so they are still here next year.
        </p>
      </div>

      <TaskList customerId={id} staff={staff} tick={tick} onMutate={() => { bump(); onChanged() }} />

      <Timeline customerId={id} tick={tick} />
    </div>
  )
}

const TASK_TYPES = [
  { id: "FOLLOW_UP", label: "Follow-up" },
  { id: "CALL", label: "Call" },
  { id: "MESSAGE", label: "Message" },
  { id: "QUOTE", label: "Quote" },
  { id: "MEETING", label: "Meeting" },
  { id: "OTHER", label: "Other" },
]

interface Task {
  id: string
  title: string
  notes: string | null
  type: string
  priority: string
  dueAt: string | null
  completedAt: string | null
  assigneeId: string | null
}

/**
 * The follow-ups owed to this one person. A CRM that cannot answer "what do I
 * still have to do for them" is only an address book.
 */
function TaskList({
  customerId, staff, tick, onMutate,
}: {
  customerId: string
  staff: { id: string; name: string }[]
  tick: number
  onMutate: () => void
}) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState("")
  const [due, setDue] = useState("")
  const [type, setType] = useState("FOLLOW_UP")
  const [assignee, setAssignee] = useState("")
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    // No scope filter: return open and completed together, then split them
    // below so the live work sits above its own history.
    const response = await fetch(`/api/crm-tasks?customerId=${customerId}&scope=all`)
    if (response.ok) {
      const payload = await response.json()
      setTasks(payload.tasks ?? [])
    }
    setLoading(false)
  }, [customerId])

  useEffect(() => { load() }, [load, tick])

  async function add() {
    if (!title.trim() || busy) return
    setBusy(true)
    try {
      const response = await fetch("/api/crm-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          title: title.trim(),
          type,
          dueAt: due || null,
          assigneeId: assignee || null,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) { toast.error(payload.error || "Could not add that task"); return }
      setTitle(""); setDue("")
      await load()
      onMutate()
    } finally {
      setBusy(false)
    }
  }

  async function toggle(task: Task) {
    const response = await fetch(`/api/crm-tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completedAt }),
    })
    if (!response.ok) { toast.error("Could not update that task"); return }
    await load()
    onMutate()
  }

  async function remove(task: Task) {
    const response = await fetch(`/api/crm-tasks/${task.id}`, { method: "DELETE" })
    if (!response.ok) { toast.error("Could not delete that task"); return }
    await load()
    onMutate()
  }

  const open = tasks.filter(t => !t.completedAt)
  const done = tasks.filter(t => t.completedAt)

  return (
    <div className="p-5 border-b">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-3">
        Tasks{open.length > 0 && <span className="ml-1.5 text-stone-500">· {open.length} open</span>}
      </p>

      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") add() }}
            placeholder="Send the January quote…"
          />
          <Button onClick={add} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 shrink-0">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <div className="flex gap-2">
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="h-8 flex-1 rounded-md border border-stone-200 bg-white px-2 text-xs text-stone-600"
          >
            {TASK_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <select
            value={assignee}
            onChange={e => setAssignee(e.target.value)}
            className="h-8 flex-1 rounded-md border border-stone-200 bg-white px-2 text-xs text-stone-600"
          >
            <option value="">Unassigned</option>
            {staff.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
          <Input
            type="date"
            value={due}
            onChange={e => setDue(e.target.value)}
            className="h-8 w-36 text-xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="mt-3 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-stone-400" /></div>
      ) : tasks.length === 0 ? (
        <p className="mt-3 text-[11px] text-stone-500">Nothing owed to this person right now.</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {[...open, ...done].map(task => {
            const overdue = !task.completedAt && task.dueAt && new Date(task.dueAt) < new Date()
            const who = staff.find(s => s.id === task.assigneeId)?.name
            return (
              <li key={task.id} className="group flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-stone-50">
                <button
                  onClick={() => toggle(task)}
                  className="shrink-0 text-stone-400 hover:text-emerald-600"
                  aria-label={task.completedAt ? "Reopen task" : "Complete task"}
                >
                  {task.completedAt
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    : <Circle className="h-4 w-4" />}
                </button>
                <span className={`flex-1 min-w-0 truncate text-sm ${
                  task.completedAt ? "text-stone-400 line-through" : "text-stone-700"
                }`}>
                  {task.priority === "HIGH" && !task.completedAt && (
                    <span className="mr-1 text-rose-500" title="High priority">!</span>
                  )}
                  {task.title}
                </span>
                {who && <span className="shrink-0 text-[11px] text-stone-400">{who}</span>}
                {task.dueAt && (
                  <span className={`shrink-0 text-[11px] ${overdue ? "text-rose-600 font-medium" : "text-stone-400"}`}>
                    {new Date(task.dueAt).toLocaleDateString()}
                  </span>
                )}
                <button
                  onClick={() => remove(task)}
                  className="shrink-0 text-stone-300 opacity-0 transition group-hover:opacity-100 hover:text-rose-600"
                  aria-label="Delete task"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

type TimelineEntry = {
  id: string
  at: string
  kind: "message" | "order" | "payment" | "note" | "task" | "appointment"
  title: string
  detail?: string
  meta?: Record<string, string | number | null>
}

const ENTRY_DOT: Record<TimelineEntry["kind"], string> = {
  message: "bg-sky-500",
  order: "bg-emerald-500",
  payment: "bg-teal-500",
  note: "bg-amber-500",
  task: "bg-violet-500",
  appointment: "bg-fuchsia-500",
}

/**
 * The whole story of this contact — messages, orders, payments, notes, tasks
 * and appointments interleaved — from the one endpoint that merges them.
 */
function Timeline({ customerId, tick }: { customerId: string; tick: number }) {
  const [entries, setEntries] = useState<TimelineEntry[] | null>(null)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let live = true
    fetch(`/api/customers/${customerId}/timeline`)
      .then(r => (r.ok ? r.json() : { entries: [], total: 0 }))
      .then(payload => {
        if (!live) return
        setEntries(payload.entries ?? [])
        setTotal(payload.total ?? 0)
      })
      .catch(() => live && setEntries([]))
    return () => { live = false }
  }, [customerId, tick])

  return (
    <div className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-3">
        History{total > 0 && <span className="ml-1.5 text-stone-500">· {total}</span>}
      </p>
      {entries === null ? (
        <div className="flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-stone-400" /></div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-stone-500">Nothing yet.</p>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <div key={entry.id} className="flex gap-3">
              <span className={`mt-1.5 block h-2 w-2 shrink-0 rounded-full ${ENTRY_DOT[entry.kind] ?? "bg-stone-300"}`} />
              <div className="flex-1 min-w-0 border-b border-stone-100 pb-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-stone-800">{entry.title}</p>
                  <span className="shrink-0 text-[11px] text-stone-400">
                    {new Date(entry.at).toLocaleDateString()}
                  </span>
                </div>
                {entry.detail && (
                  <p className="mt-0.5 text-xs text-stone-600 whitespace-pre-wrap">{entry.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 p-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
        <Icon className="h-3 w-3" />{label}
      </div>
      <p className="font-bold text-stone-900 mt-0.5">{value}</p>
    </div>
  )
}

/** "3 days ago" reads faster than a date when the question is "how long". */
function ago(value: string | null): string {
  if (!value) return "never"
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000)
  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? "a month ago" : `${months} months ago`
}
