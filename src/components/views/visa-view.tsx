"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { StampIcon, Search, Plus, Mail, Phone, Users, CalendarDays, Loader2, Trash2, ShieldAlert, Plane, Home } from "lucide-react"
import { toast } from "sonner"
import { APP_TIMEZONE } from "@/lib/timezone"

interface Enquiry {
  id: string; reference: string; name: string; nationality: string
  destination: string; purpose: string; omanResident: boolean | null; enquiryType: string
  travellers: number; arrivalDate: string | null; stayNights: number | null
  email: string | null; phone: string | null; notes: string | null
  status: string; quotedAmount: number | null; source: string; createdAt: string
}

/*
 * No "rejected". A refusal is the embassy's decision, and it belongs in the
 * notes rather than in a status that reads as though the agency turned
 * somebody down — these labels are shown to the customer verbatim.
 */
const STATUSES = ["NEW", "DOCS_RECEIVED", "IN_PREPARATION", "SUBMITTED", "APPROVED", "DOCS_REQUIRED", "CLOSED"]
const STATUS_LABEL: Record<string, string> = {
  NEW: "New enquiry",
  DOCS_RECEIVED: "Documents received",
  IN_PREPARATION: "Under preparation",
  SUBMITTED: "Submitted to embassy",
  APPROVED: "Approved",
  DOCS_REQUIRED: "More documents needed",
  CLOSED: "Closed",
}
const STATUS_STYLE: Record<string, string> = {
  NEW: "bg-amber-100 text-amber-700 border-amber-200",
  DOCS_RECEIVED: "bg-sky-100 text-sky-700 border-sky-200",
  IN_PREPARATION: "bg-blue-100 text-blue-700 border-blue-200",
  SUBMITTED: "bg-indigo-100 text-indigo-700 border-indigo-200",
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  DOCS_REQUIRED: "bg-rose-100 text-rose-700 border-rose-200",
  CLOSED: "bg-stone-100 text-stone-600 border-stone-200",
}

const DEST_LABEL: Record<string, string> = {
  UK: "🇬🇧 United Kingdom", USA: "🇺🇸 United States", CANADA: "🇨🇦 Canada",
  AUSTRALIA: "🇦🇺 Australia", SCHENGEN: "🇪🇺 Schengen / Europe", SAUDI: "🇸🇦 Saudi Arabia",
  JAPAN: "🇯🇵 Japan", SINGAPORE: "🇸🇬 Singapore", MALAYSIA: "🇲🇾 Malaysia", OTHER: "🌎 Other",
}
const PURPOSE_LABEL: Record<string, string> = {
  TOURISM: "Tourism", BUSINESS: "Business", FAMILY_VISIT: "Family / friend visit", OTHER: "Other",
}
const ENQUIRY_LABEL: Record<string, string> = {
  APPLY: "Application", REQUIREMENTS: "Requirements", PRICING: "Pricing",
  STATUS: "Status check", CONSULTANT: "Consultant", OTHER: "Other",
}
const dest = (id: string) => DEST_LABEL[id] || id || "—"

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIMEZONE, dateStyle: "medium" }).format(new Date(iso))

const emptyDraft = {
  name: "", nationality: "", destination: "UK", purpose: "TOURISM", travellers: 1,
  arrivalDate: "", stayNights: "", email: "", phone: "", notes: "",
}

export default function VisaView() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [selected, setSelected] = useState<Enquiry | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ ...emptyDraft })
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState("")

  const load = () =>
    fetch("/api/visa-enquiries")
      .then(r => r.json())
      .then(d => { setEnquiries(d.enquiries || []); setEnabled(d.enabled !== false); setLoading(false) })
      .catch(() => setLoading(false))

  useEffect(() => { load() }, [])
  useEffect(() => { setNotes(selected?.notes || "") }, [selected])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return enquiries.filter(e => {
      if (status !== "all" && e.status !== status) return false
      if (!term) return true
      return [e.reference, e.name, e.nationality, e.email].some(f => (f || "").toLowerCase().includes(term))
    })
  }, [enquiries, search, status])

  const patch = async (id: string, changes: Record<string, unknown>) => {
    const res = await fetch(`/api/visa-enquiries/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || "Could not save"); return }
    setSelected(data.enquiry)
    toast.success("Saved")
    load()
  }

  const create = async () => {
    if (!draft.name.trim() || !draft.nationality.trim()) {
      toast.error("Name and nationality are both needed")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/visa-enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          arrivalDate: draft.arrivalDate || undefined,
          stayNights: draft.stayNights || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not create the enquiry")
      toast.success("Enquiry created")
      setCreating(false)
      setDraft({ ...emptyDraft })
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the enquiry")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (enquiry: Enquiry) => {
    if (!confirm(`Delete ${enquiry.reference}?`)) return
    const res = await fetch(`/api/visa-enquiries/${enquiry.id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("Could not delete"); return }
    toast.success("Deleted")
    setSelected(null)
    load()
  }

  if (!loading && !enabled) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Card className="max-w-md">
          <CardContent className="space-y-3 p-8 text-center">
            <StampIcon className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Visa assistance is turned off</h2>
            <p className="text-sm text-muted-foreground">
              Turn it on in Settings → Visa assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <StampIcon className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Visa enquiries</h1>
          <Badge variant="secondary">{visible.length}</Badge>
        </div>
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Reference, name, nationality…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s] || s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => setCreating(true)}><Plus className="mr-1.5 h-4 w-4" />New</Button>
      </div>

      <div className="grid flex-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden">
          <ScrollArea className="h-full">
            {loading ? (
              <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : visible.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">No visa enquiries yet.</div>
            ) : (
              <div className="divide-y">
                {visible.map(e => (
                  <button
                    key={e.id}
                    onClick={() => setSelected(e)}
                    className={`flex w-full items-center gap-3 p-3 text-left transition hover:bg-muted/50 ${selected?.id === e.id ? "bg-muted" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{e.name}</span>
                        <Badge variant="outline" className={STATUS_STYLE[e.status]}>{STATUS_LABEL[e.status] || e.status}</Badge>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {e.nationality} → {dest(e.destination)} · {e.travellers} pax · {e.reference}
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted-foreground">{when(e.createdAt)}</div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        <Card className="hidden overflow-hidden lg:block">
          <ScrollArea className="h-full">
            {!selected ? (
              <div className="p-10 text-center text-sm text-muted-foreground">Pick an enquiry to see the details.</div>
            ) : (
              <CardContent className="space-y-4 p-4">
                <div>
                  <div className="text-lg font-semibold">{selected.name}</div>
                  <div className="text-xs text-muted-foreground">{selected.reference}</div>
                </div>

                <div className="space-y-2 text-sm">
                  <Row icon={StampIcon} value={`${selected.nationality} passport → ${dest(selected.destination)}`} />
                  <Row icon={Plane} value={`${PURPOSE_LABEL[selected.purpose] || selected.purpose} · ${ENQUIRY_LABEL[selected.enquiryType] || selected.enquiryType}`} />
                  {selected.omanResident !== null && (
                    <Row icon={Home} value={selected.omanResident ? "Resident in Oman" : "Not resident in Oman"} />
                  )}
                  <Row icon={Users} value={`${selected.travellers} traveller${selected.travellers === 1 ? "" : "s"}`} />
                  {selected.arrivalDate && (
                    <Row icon={CalendarDays} value={`Arriving ${when(selected.arrivalDate)}${selected.stayNights ? ` · ${selected.stayNights} nights` : ""}`} />
                  )}
                  {selected.email && <Row icon={Mail} value={selected.email} />}
                  {selected.phone && <Row icon={Phone} value={selected.phone} />}
                </div>

                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>No passport numbers or documents are collected in chat. Ask for those over a secure channel.</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={selected.status} onValueChange={v => patch(selected.id, { status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s] || s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Quoted (OMR)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    defaultValue={selected.quotedAmount ?? ""}
                    onBlur={e => {
                      const value = e.target.value === "" ? null : Number(e.target.value)
                      if (value !== selected.quotedAmount) patch(selected.id, { quotedAmount: value })
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Internal notes</Label>
                  <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
                  <Button size="sm" variant="outline" className="w-full" onClick={() => patch(selected.id, { notes })}>
                    Save notes
                  </Button>
                </div>

                <Button variant="outline" className="w-full text-destructive" onClick={() => remove(selected)}>
                  <Trash2 className="mr-1.5 h-4 w-4" />Delete
                </Button>
              </CardContent>
            )}
          </ScrollArea>
        </Card>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>New visa enquiry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name"><Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></Field>
              <Field label="Nationality"><Input value={draft.nationality} onChange={e => setDraft({ ...draft, nationality: e.target.value })} /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Destination">
                <Select value={draft.destination} onValueChange={v => setDraft({ ...draft, destination: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEST_LABEL).map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Purpose">
                <Select value={draft.purpose} onValueChange={v => setDraft({ ...draft, purpose: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PURPOSE_LABEL).map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Travellers">
                <Input type="number" min={1} max={50} value={draft.travellers} onChange={e => setDraft({ ...draft, travellers: Number(e.target.value) })} />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Arrival"><Input type="date" value={draft.arrivalDate} onChange={e => setDraft({ ...draft, arrivalDate: e.target.value })} /></Field>
              <Field label="Nights"><Input type="number" min={1} max={365} value={draft.stayNights} onChange={e => setDraft({ ...draft, stayNights: e.target.value })} /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Email"><Input type="email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} /></Field>
              <Field label="Phone"><Input value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} /></Field>
            </div>
            <Field label="Notes"><Textarea rows={2} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={create} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Row({ icon: Icon, value }: { icon: React.ElementType; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{value}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>
}
