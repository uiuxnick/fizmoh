"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { X, Plus, Trash2, Loader2, GripVertical } from "lucide-react"
import { formatCurrency } from "@/lib/helpers"

export const TOUR_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]
export const TOUR_DIFFICULTIES = ["EASY", "MODERATE", "HARD"]
const CATEGORIES = ["Desert", "Water Sports", "Mountain", "City Tour", "Adventure", "Family", "Cultural"]

export interface TourRecord {
  id?: string
  slug?: string
  name: string
  nameAr?: string | null
  description: string
  category: string
  city: string
  location?: string | null
  basePrice: number
  childPrice?: number | null
  durationHours: number
  difficulty: string
  capacityPerSlot: number
  meetingPoint?: string | null
  cancellationPolicy?: string | null
  status: string
  featured: boolean
  seoTitle?: string | null
  seoDescription?: string | null
  media?: unknown
  itinerary?: unknown
  inclusions?: unknown
  exclusions?: unknown
  whatToBring?: unknown
  addOns?: { id?: string; name: string; price: number; type: string; isActive: boolean }[]
}

interface ItineraryStop { time: string; title: string; description: string }
interface MediaItem { type: string; url: string; alt: string }

/**
 * The JSON columns are stored as JSON *strings*, but older rows and the seed
 * data hold real arrays. Accept both rather than crashing the editor on a
 * shape it did not write.
 */
function parseList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-stone-900 border-b pb-1.5">{title}</h3>
      {children}
    </div>
  )
}

function Labeled({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`text-xs text-stone-500 block ${className}`}>
      {label}
      <div className="mt-1">{children}</div>
      {hint && <span className="text-[11px] text-stone-400">{hint}</span>}
    </label>
  )
}

/** Repeating list of plain strings — inclusions, exclusions, what to bring. */
function StringList({ items, onChange, placeholder }: { items: string[]; onChange: (next: string[]) => void; placeholder: string }) {
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex gap-1.5">
          <Input
            value={item}
            placeholder={placeholder}
            onChange={e => onChange(items.map((v, n) => (n === i ? e.target.value : v)))}
          />
          <Button variant="ghost" size="icon" onClick={() => onChange(items.filter((_, n) => n !== i))}>
            <Trash2 className="h-3.5 w-3.5 text-stone-400" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...items, ""])}>
        <Plus className="h-3.5 w-3.5 mr-1" />Add
      </Button>
    </div>
  )
}

export function TourEditor({ tour, onClose, onSaved }: { tour: TourRecord | null; onClose: () => void; onSaved: () => void }) {
  const editing = Boolean(tour?.id)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<TourRecord>(() => ({
    name: "", description: "", category: "Desert", city: "Muscat",
    basePrice: 0, childPrice: null, durationHours: 4, difficulty: "EASY",
    capacityPerSlot: 10, status: "DRAFT", featured: false,
    meetingPoint: "", cancellationPolicy: "", location: "", nameAr: "",
    seoTitle: "", seoDescription: "",
    ...(tour ?? {}),
  }))
  const [itinerary, setItinerary] = useState<ItineraryStop[]>(() => parseList<ItineraryStop>(tour?.itinerary))
  const [inclusions, setInclusions] = useState<string[]>(() => parseList<string>(tour?.inclusions))
  const [exclusions, setExclusions] = useState<string[]>(() => parseList<string>(tour?.exclusions))
  const [whatToBring, setWhatToBring] = useState<string[]>(() => parseList<string>(tour?.whatToBring))
  const [media, setMedia] = useState<MediaItem[]>(() => parseList<MediaItem>(tour?.media))
  const [addOns, setAddOns] = useState(() => tour?.addOns ?? [])

  const set = <K extends keyof TourRecord>(key: K, value: TourRecord[K]) => setForm(f => ({ ...f, [key]: value }))

  const save = async () => {
    if (!form.name.trim()) { toast.error("Give the tour a name"); return }
    if (!form.description.trim()) { toast.error("Give the tour a description"); return }
    if (!(Number(form.basePrice) > 0)) { toast.error("Set an adult price"); return }

    setBusy(true)
    try {
      const payload = {
        ...form,
        basePrice: Number(form.basePrice),
        childPrice: form.childPrice === null || form.childPrice === undefined || String(form.childPrice) === "" ? null : Number(form.childPrice),
        durationHours: Number(form.durationHours),
        capacityPerSlot: Number(form.capacityPerSlot),
        itinerary: itinerary.filter(s => s.title.trim()),
        inclusions: inclusions.filter(Boolean),
        exclusions: exclusions.filter(Boolean),
        whatToBring: whatToBring.filter(Boolean),
        media: media.filter(m => m.url.trim()),
        addOns: addOns.filter(a => a.name.trim()),
      }
      const res = await fetch(editing ? `/api/tours/${tour!.id}` : "/api/tours", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Could not save the tour"); return }
      toast.success(editing ? "Tour updated" : `Created “${data.tour?.name ?? form.name}”`)
      onSaved()
      onClose()
    } catch {
      toast.error("Network error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-3xl max-h-[92vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div>
            <div className="text-sm font-semibold text-stone-900">{editing ? `Edit ${tour!.name}` : "New tour"}</div>
            {editing && tour!.slug && <div className="text-[11px] text-stone-400">/tours/{tour!.slug}</div>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <ScrollArea className="h-[calc(92vh-7.5rem)]">
          <div className="p-5 space-y-6">
            <Section title="Basics">
              <div className="grid sm:grid-cols-2 gap-3">
                <Labeled label="Tour name" className="sm:col-span-2">
                  <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Wahiba Sands Desert Safari" />
                </Labeled>
                <Labeled label="Arabic name (optional)" className="sm:col-span-2">
                  <Input dir="rtl" value={form.nameAr ?? ""} onChange={e => set("nameAr", e.target.value)} />
                </Labeled>
                <Labeled label="Description" className="sm:col-span-2">
                  <Textarea rows={4} value={form.description} onChange={e => set("description", e.target.value)} placeholder="What the guest will experience…" />
                </Labeled>
                <Labeled label="Category">
                  <select value={form.category} onChange={e => set("category", e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-white text-sm">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Labeled>
                <Labeled label="City">
                  <Input value={form.city} onChange={e => set("city", e.target.value)} />
                </Labeled>
                <Labeled label="Meeting point" className="sm:col-span-2">
                  <Input value={form.meetingPoint ?? ""} onChange={e => set("meetingPoint", e.target.value)} placeholder="Mutrah Corniche, opposite the fish market" />
                </Labeled>
              </div>
            </Section>

            <Section title="Pricing & capacity">
              <div className="grid sm:grid-cols-2 gap-3">
                <Labeled label="Adult price (OMR)">
                  <Input type="number" step="0.001" min={0} value={form.basePrice} onChange={e => set("basePrice", Number(e.target.value))} />
                </Labeled>
                <Labeled label="Child price (OMR)" hint="Leave blank if children pay full price">
                  <Input type="number" step="0.001" min={0} value={form.childPrice ?? ""} onChange={e => set("childPrice", e.target.value === "" ? null : Number(e.target.value))} />
                </Labeled>
                <Labeled label="Duration (hours)">
                  <Input type="number" step="0.5" min={0} value={form.durationHours} onChange={e => set("durationHours", Number(e.target.value))} />
                </Labeled>
                <Labeled label="Seats per departure" hint="Default capacity for new slots">
                  <Input type="number" min={1} value={form.capacityPerSlot} onChange={e => set("capacityPerSlot", Number(e.target.value))} />
                </Labeled>
                <Labeled label="Difficulty">
                  <select value={form.difficulty} onChange={e => set("difficulty", e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-white text-sm">
                    {TOUR_DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
                  </select>
                </Labeled>
                <Labeled label="Status" hint="Only ACTIVE tours are bookable">
                  <select value={form.status} onChange={e => set("status", e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-white text-sm">
                    {TOUR_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Labeled>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Switch checked={form.featured} onCheckedChange={v => set("featured", v)} />
                <span className="text-xs text-stone-600">Feature on the homepage</span>
              </div>
            </Section>

            <Section title="Itinerary">
              <div className="space-y-2">
                {itinerary.map((stop, i) => (
                  <div key={i} className="flex gap-2 items-start p-2 rounded-lg border">
                    <GripVertical className="h-4 w-4 text-stone-300 mt-2 shrink-0" />
                    <div className="grid sm:grid-cols-[6rem_1fr] gap-2 flex-1">
                      <Input
                        placeholder="09:00"
                        value={stop.time}
                        onChange={e => setItinerary(itinerary.map((s, n) => (n === i ? { ...s, time: e.target.value } : s)))}
                      />
                      <Input
                        placeholder="Pickup from hotel"
                        value={stop.title}
                        onChange={e => setItinerary(itinerary.map((s, n) => (n === i ? { ...s, title: e.target.value } : s)))}
                      />
                      <Textarea
                        className="sm:col-span-2"
                        rows={2}
                        placeholder="Detail shown under the step"
                        value={stop.description}
                        onChange={e => setItinerary(itinerary.map((s, n) => (n === i ? { ...s, description: e.target.value } : s)))}
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setItinerary(itinerary.filter((_, n) => n !== i))}>
                      <Trash2 className="h-3.5 w-3.5 text-stone-400" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setItinerary([...itinerary, { time: "", title: "", description: "" }])}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Add stop
                </Button>
              </div>
            </Section>

            <Section title="What's included">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-stone-600 mb-1.5">Inclusions</div>
                  <StringList items={inclusions} onChange={setInclusions} placeholder="Hotel pickup and drop-off" />
                </div>
                <div>
                  <div className="text-xs font-medium text-stone-600 mb-1.5">Exclusions</div>
                  <StringList items={exclusions} onChange={setExclusions} placeholder="Personal expenses" />
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs font-medium text-stone-600 mb-1.5">What to bring</div>
                  <StringList items={whatToBring} onChange={setWhatToBring} placeholder="Sunscreen and a hat" />
                </div>
              </div>
            </Section>

            <Section title="Photos">
              <div className="space-y-1.5">
                {media.map((item, i) => (
                  <div key={i} className="flex gap-1.5 items-center">
                    {item.url ? <img src={item.url} alt="" className="h-10 w-14 object-cover rounded border shrink-0" /> : <div className="h-10 w-14 rounded border bg-stone-100 shrink-0" />}
                    <Input
                      placeholder="https://…/photo.jpg"
                      value={item.url}
                      onChange={e => setMedia(media.map((m, n) => (n === i ? { ...m, url: e.target.value } : m)))}
                    />
                    <Input
                      placeholder="Alt text"
                      className="max-w-[10rem]"
                      value={item.alt}
                      onChange={e => setMedia(media.map((m, n) => (n === i ? { ...m, alt: e.target.value } : m)))}
                    />
                    <Button variant="ghost" size="icon" onClick={() => setMedia(media.filter((_, n) => n !== i))}>
                      <Trash2 className="h-3.5 w-3.5 text-stone-400" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setMedia([...media, { type: "image", url: "", alt: "" }])}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Add photo
                </Button>
                <p className="text-[11px] text-stone-400">Paste an image URL. The first photo is used as the card image.</p>
              </div>
            </Section>

            <Section title="Add-ons">
              <div className="space-y-1.5">
                {addOns.map((addOn, i) => (
                  <div key={i} className="flex gap-1.5 items-center">
                    <Input
                      placeholder="Sandboarding"
                      value={addOn.name}
                      onChange={e => setAddOns(addOns.map((a, n) => (n === i ? { ...a, name: e.target.value } : a)))}
                    />
                    <Input
                      type="number" step="0.001" min={0}
                      className="max-w-[7rem]"
                      value={addOn.price}
                      onChange={e => setAddOns(addOns.map((a, n) => (n === i ? { ...a, price: Number(e.target.value) } : a)))}
                    />
                    <select
                      value={addOn.type}
                      onChange={e => setAddOns(addOns.map((a, n) => (n === i ? { ...a, type: e.target.value } : a)))}
                      className="px-2 py-2 rounded-lg border bg-white text-xs"
                    >
                      <option value="FLAT">per booking</option>
                      <option value="PER_PAX">per guest</option>
                    </select>
                    <Button variant="ghost" size="icon" onClick={() => setAddOns(addOns.filter((_, n) => n !== i))}>
                      <Trash2 className="h-3.5 w-3.5 text-stone-400" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setAddOns([...addOns, { name: "", price: 0, type: "FLAT", isActive: true }])}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Add extra
                </Button>
              </div>
            </Section>

            <Section title="Policy & search">
              <Labeled label="Cancellation policy">
                <Textarea rows={2} value={form.cancellationPolicy ?? ""} onChange={e => set("cancellationPolicy", e.target.value)} placeholder="Free cancellation up to 24 hours before departure." />
              </Labeled>
              <div className="grid sm:grid-cols-2 gap-3">
                <Labeled label="SEO title">
                  <Input value={form.seoTitle ?? ""} onChange={e => set("seoTitle", e.target.value)} />
                </Labeled>
                <Labeled label="SEO description">
                  <Input value={form.seoDescription ?? ""} onChange={e => set("seoDescription", e.target.value)} />
                </Labeled>
              </div>
            </Section>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t bg-stone-50">
          <div className="text-xs text-stone-500">
            {form.status === "ACTIVE"
              ? <>Live · {formatCurrency(Number(form.basePrice) || 0)} per adult</>
              : <>Saved as <Badge variant="outline">{form.status}</Badge> — not bookable</>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {editing ? "Save changes" : "Create tour"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

interface Slot {
  id: string; date: string; startTime: string; endTime: string | null
  capacity: number; seatsBooked: number; seatsHeld: number; status: string; priceOverride: number | null
}

/** Departure management for one tour: generate, adjust, close, remove. */
export function SlotManager({ tourId, tourName, defaultCapacity, onClose }: { tourId: string; tourName: string; defaultCapacity: number; onClose: () => void }) {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [gen, setGen] = useState({ from: "", to: "", times: "09:00", capacity: defaultCapacity, price: "" })

  const load = () => {
    setLoading(true)
    fetch(`/api/slots?tourId=${tourId}`)
      .then(r => r.json())
      .then(d => { setSlots(d.slots || []); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(load, [tourId])

  const generate = async () => {
    if (!gen.from || !gen.to) { toast.error("Pick a date range"); return }
    const from = new Date(gen.from)
    const to = new Date(gen.to)
    if (to < from) { toast.error("The end date is before the start date"); return }

    const times = gen.times.split(",").map(t => t.trim()).filter(Boolean)
    if (times.length === 0) { toast.error("Add at least one departure time"); return }

    const wanted: { date: string; startTime: string; capacity: number; priceOverride: number | null }[] = []
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      for (const startTime of times) {
        wanted.push({
          date: d.toISOString().slice(0, 10),
          startTime,
          capacity: Number(gen.capacity) || defaultCapacity,
          priceOverride: gen.price === "" ? null : Number(gen.price),
        })
      }
    }
    // The endpoint skips dates that already exist, so re-running over an
    // overlapping range extends the calendar instead of duplicating it.
    if (wanted.length > 400) { toast.error(`That would create ${wanted.length} departures. Narrow the range.`); return }

    setBusy(true)
    const res = await fetch("/api/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulk: true, tourId, slots: wanted }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { toast.error("Could not create departures"); return }
    toast.success(`${data.created} departure${data.created === 1 ? "" : "s"} added${data.created < wanted.length ? ` · ${wanted.length - data.created} already existed` : ""}`)
    load()
  }

  const patchSlot = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/slots/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    })
    if (!res.ok) { toast.error("Could not update that departure"); return }
    load()
  }

  const removeSlot = async (slot: Slot) => {
    if (slot.seatsBooked > 0) {
      toast.error(`${slot.seatsBooked} seat${slot.seatsBooked === 1 ? " is" : "s are"} booked on this departure. Close it instead.`)
      return
    }
    if (!confirm("Remove this departure?")) return
    const res = await fetch(`/api/slots/${slot.id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("Could not remove it"); return }
    load()
  }

  const upcoming = slots.filter(s => new Date(s.date).getTime() >= Date.now() - 86_400_000)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-2xl max-h-[92vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div>
            <div className="text-sm font-semibold text-stone-900">Departures</div>
            <div className="text-[11px] text-stone-400">{tourName}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-4 border-b bg-stone-50 space-y-2">
          <div className="text-xs font-medium text-stone-600">Add departures</div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <Labeled label="From"><Input type="date" value={gen.from} onChange={e => setGen({ ...gen, from: e.target.value })} /></Labeled>
            <Labeled label="To"><Input type="date" value={gen.to} onChange={e => setGen({ ...gen, to: e.target.value })} /></Labeled>
            <Labeled label="Times"><Input value={gen.times} onChange={e => setGen({ ...gen, times: e.target.value })} placeholder="09:00, 14:00" /></Labeled>
            <Labeled label="Seats"><Input type="number" min={1} value={gen.capacity} onChange={e => setGen({ ...gen, capacity: Number(e.target.value) })} /></Labeled>
            <Labeled label="Price override"><Input type="number" step="0.001" value={gen.price} onChange={e => setGen({ ...gen, price: e.target.value })} placeholder="—" /></Labeled>
          </div>
          <Button size="sm" onClick={generate} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}Generate
          </Button>
        </div>

        <ScrollArea className="h-[calc(92vh-19rem)]">
          <div className="p-4 space-y-1.5">
            {loading ? (
              <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin text-stone-400 mx-auto" /></div>
            ) : upcoming.length === 0 ? (
              <p className="py-8 text-center text-sm text-stone-400">No upcoming departures. Add a date range above.</p>
            ) : upcoming.map(slot => {
              const left = slot.capacity - slot.seatsBooked - slot.seatsHeld
              return (
                <div key={slot.id} className="flex items-center gap-2 p-2 rounded-lg border text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-stone-800">
                      {new Date(slot.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · {slot.startTime}
                    </div>
                    <div className="text-stone-500">
                      {slot.seatsBooked} booked{slot.seatsHeld > 0 ? ` · ${slot.seatsHeld} held` : ""} · {left} left
                      {slot.priceOverride != null && ` · ${formatCurrency(slot.priceOverride)}`}
                    </div>
                  </div>
                  <Input
                    type="number"
                    min={slot.seatsBooked}
                    defaultValue={slot.capacity}
                    className="h-8 w-16 text-xs"
                    title="Seats"
                    onBlur={e => {
                      const capacity = Number(e.target.value)
                      if (capacity === slot.capacity) return
                      if (capacity < slot.seatsBooked) {
                        toast.error(`${slot.seatsBooked} seats are already booked`)
                        e.target.value = String(slot.capacity)
                        return
                      }
                      patchSlot(slot.id, { capacity })
                    }}
                  />
                  <select
                    value={slot.status}
                    onChange={e => patchSlot(slot.id, { status: e.target.value })}
                    className="h-8 px-1.5 rounded border bg-white text-xs"
                  >
                    <option value="OPEN">Open</option>
                    <option value="FULL">Full</option>
                    <option value="CLOSED">Closed</option>
                    <option value="BLACKOUT">Blackout</option>
                  </select>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeSlot(slot)}>
                    <Trash2 className="h-3.5 w-3.5 text-stone-400" />
                  </Button>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </Card>
    </div>
  )
}
