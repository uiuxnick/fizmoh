"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { Map, Clock, Star, Users, Plus, Search, Mountain, Waves, Sun, Camera, Pencil, CalendarDays, Copy, Trash2 } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/helpers"
import { TourEditor, SlotManager, type TourRecord } from "@/components/views/tour-editor"

const CATEGORY_GRADIENTS: Record<string, string> = {
  Desert: "from-amber-400 to-orange-500",
  "Water Sports": "from-teal-400 to-cyan-500",
  Mountain: "from-stone-400 to-stone-600",
  "City Tour": "from-emerald-400 to-teal-500",
  Adventure: "from-orange-400 to-red-500",
  Family: "from-rose-400 to-pink-500",
}

const CATEGORY_ICONS: Record<string, any> = {
  Desert: Sun, "Water Sports": Waves, Mountain: Mountain, "City Tour": Camera, Adventure: Sun, Family: Users,
}

interface Tour {
  id: string; slug: string; name: string; category: string; city: string; basePrice: number;
  childPrice: number | null; durationHours: number; difficulty: string; capacityPerSlot: number;
  rating: number; reviewCount: number; featured: boolean; status: string; description: string;
  media: string; itinerary: string; inclusions: string; exclusions: string; whatToBring: string;
  meetingPoint: string | null; cancellationPolicy: string | null;
}

export default function ToursView() {
  const [tours, setTours] = useState<Tour[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [selected, setSelected] = useState<Tour | null>(null)
  const [editing, setEditing] = useState<TourRecord | null>(null)
  const [creating, setCreating] = useState(false)
  const [slotsFor, setSlotsFor] = useState<Tour | null>(null)

  const load = () => {
    setLoading(true)
    fetch("/api/tours?status=all").then(r => r.json()).then(d => { setTours(d.tours || []); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const duplicate = async (tour: Tour) => {
    // Copies everything the editor can write. The slug is left out so the
    // server derives a fresh, unique one from the new name.
    const res = await fetch(`/api/tours/${tour.id}`)
    const { tour: full } = await res.json()
    if (!full) { toast.error("Could not load that tour"); return }
    const { id, slug, createdAt, updatedAt, rating, reviewCount, _count, reviews, ...rest } = full
    setEditing({
      ...rest,
      name: `${full.name} (copy)`,
      status: "DRAFT",
      featured: false,
      addOns: (full.addOns || []).map((a: { name: string; price: number; type: string; isActive: boolean }) => ({ name: a.name, price: a.price, type: a.type, isActive: a.isActive })),
    })
    setCreating(true)
  }

  const removeTour = async (tour: Tour) => {
    if (!confirm(`Delete “${tour.name}”? This cannot be undone.`)) return
    const res = await fetch(`/api/tours/${tour.id}`, { method: "DELETE" })
    const data = await res.json().catch(() => ({}))
    // A tour that has sold cannot be deleted without breaking its orders. Say
    // so, and offer the thing that is actually wanted — off the site, history
    // intact — instead of leaving the operator to find it in the editor.
    if (res.status === 409 && data.orders) {
      if (!confirm(`${data.error}\n\nArchive “${tour.name}” now? It comes off your site and the bot, and its ${data.orders} booking${data.orders === 1 ? "" : "s"} stay intact.`)) return
      const archived = await fetch(`/api/tours/${tour.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      })
      if (!archived.ok) { toast.error("Could not archive the tour"); return }
      toast.success("Tour archived")
      load()
      return
    }
    if (!res.ok) { toast.error(data.error || "Could not delete the tour"); return }
    toast.success("Tour deleted")
    load()
  }

  const filtered = tours.filter(t =>
    (category === "all" || t.category === category) &&
    (!search || t.name.toLowerCase().includes(search.toLowerCase()) || t.city.toLowerCase().includes(search.toLowerCase()))
  )
  const categories = [...new Set(tours.map(t => t.category))]

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-none space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center"><Map className="h-5 w-5 text-emerald-600" /></div>
            Tours &amp; Slots
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">{tours.length} tours · {tours.filter(t => t.status === "ACTIVE").length} active · {tours.filter(t => t.featured).length} featured</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setEditing(null); setCreating(true) }}><Plus className="h-4 w-4 mr-1.5" />Add Tour</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <Input placeholder="Search tours..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)} className="px-3 py-2 rounded-lg border bg-white text-sm">
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-16 text-center"><Map className="h-10 w-10 text-stone-300 mx-auto mb-3" /><p className="text-stone-500">No tours found</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => {
            const Icon = CATEGORY_ICONS[t.category] || Sun
            return (
              <Card key={t.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => setSelected(t)}>
                <div className={`h-40 bg-gradient-to-br ${CATEGORY_GRADIENTS[t.category] || "from-emerald-400 to-teal-500"} relative flex items-center justify-center`}>
                  <Icon className="h-12 w-12 text-white/80" />
                  {t.featured && <Badge className="absolute top-2 right-2 bg-white/90 text-stone-700">★ Featured</Badge>}
                  <Badge className="absolute top-2 left-2 bg-black/40 text-white border-0">{t.category}</Badge>
                  <div className="absolute bottom-2 right-2 bg-white/90 rounded-lg px-2 py-1 text-xs font-bold text-stone-700">{formatCurrency(t.basePrice)}</div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-stone-900 group-hover:text-emerald-600 transition-colors">{t.name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
                    <span className="flex items-center gap-1"><Map className="h-3 w-3" />{t.city}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{t.durationHours}h</span>
                    <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400 fill-amber-400" />{t.rating} ({t.reviewCount})</span>
                  </div>
                  <p className="text-xs text-stone-500 mt-2 line-clamp-2">{t.description}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
                    <Badge variant="outline" className={t.difficulty === "EASY" ? "bg-emerald-50 text-emerald-700" : t.difficulty === "MODERATE" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}>{t.difficulty}</Badge>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={t.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : t.status === "DRAFT" ? "bg-stone-100 text-stone-600" : "bg-amber-50 text-amber-700"}>{t.status}</Badge>
                      <span className="text-xs text-stone-400">{t.capacityPerSlot}/slot</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2" onClick={e => e.stopPropagation()}>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditing(t as unknown as TourRecord); setCreating(false) }}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setSlotsFor(t)}>
                      <CalendarDays className="h-3.5 w-3.5 mr-1" />Dates
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Duplicate" onClick={() => duplicate(t)}>
                      <Copy className="h-3.5 w-3.5 text-stone-400" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Delete" onClick={() => removeTour(t)}>
                      <Trash2 className="h-3.5 w-3.5 text-stone-400" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {selected && <TourDetailDialog tour={selected} onClose={() => setSelected(null)} />}
      {(editing || creating) && (
        <TourEditor
          tour={editing}
          onClose={() => { setEditing(null); setCreating(false) }}
          onSaved={load}
        />
      )}
      {slotsFor && (
        <SlotManager
          tourId={slotsFor.id}
          tourName={slotsFor.name}
          defaultCapacity={slotsFor.capacityPerSlot}
          onClose={() => setSlotsFor(null)}
        />
      )}
    </div>
  )
}

function TourDetailDialog({ tour, onClose }: { tour: Tour; onClose: () => void }) {
  const [slots, setSlots] = useState<any[]>([])
  const media = JSON.parse(tour.media || "[]")
  const itinerary = JSON.parse(tour.itinerary || "[]")
  const inclusions = JSON.parse(tour.inclusions || "[]")
  const exclusions = JSON.parse(tour.exclusions || "[]")
  const whatToBring = JSON.parse(tour.whatToBring || "[]")

  useEffect(() => {
    fetch(`/api/slots?tourId=${tour.id}`).then(r => r.json()).then(d => setSlots(d.slots || []))
  }, [tour.id])

  const upcomingSlots = slots.filter((s: any) => s.status === "OPEN").slice(0, 10)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="max-w-3xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className={`h-48 bg-gradient-to-br ${CATEGORY_GRADIENTS[tour.category] || "from-emerald-400 to-teal-500"} relative flex items-center justify-center`}>
          <Sun className="h-16 w-16 text-white/80" />
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 bg-white/80 hover:bg-white" onClick={onClose}>✕</Button>
        </div>
        <ScrollArea className="h-[calc(90vh-12rem)]">
          <div className="p-6 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge>{tour.category}</Badge>
                <Badge variant="outline">{tour.difficulty}</Badge>
                <Badge variant="outline" className="bg-amber-50 text-amber-700"><Star className="h-3 w-3 mr-1 fill-amber-400 text-amber-400" />{tour.rating}</Badge>
              </div>
              <h2 className="text-xl font-bold text-stone-900">{tour.name}</h2>
              <p className="text-sm text-stone-500 flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1"><Map className="h-3 w-3" />{tour.city}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{tour.durationHours}h</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{tour.capacityPerSlot} max</span>
              </p>
            </div>
            <p className="text-sm text-stone-600">{tour.description}</p>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-stone-50 text-center"><div className="text-lg font-bold text-stone-900">{formatCurrency(tour.basePrice)}</div><div className="text-[10px] text-stone-500">Adult</div></div>
              <div className="p-3 rounded-lg bg-stone-50 text-center"><div className="text-lg font-bold text-stone-900">{tour.childPrice ? formatCurrency(tour.childPrice) : "—"}</div><div className="text-[10px] text-stone-500">Child</div></div>
              <div className="p-3 rounded-lg bg-stone-50 text-center"><div className="text-lg font-bold text-stone-900">{tour.reviewCount}</div><div className="text-[10px] text-stone-500">Reviews</div></div>
            </div>

            {itinerary.length > 0 && (
              <div>
                <h3 className="font-semibold text-stone-900 mb-2">Itinerary</h3>
                <div className="space-y-2">{itinerary.map((it: any, i: number) => (
                  <div key={i} className="flex gap-3 p-2 rounded-lg bg-stone-50">
                    <div className="text-xs font-mono text-emerald-600 font-bold w-12 shrink-0">{it.time}</div>
                    <div><div className="text-sm font-medium text-stone-900">{it.title}</div><div className="text-xs text-stone-500">{it.description}</div></div>
                  </div>
                ))}</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div><h3 className="font-semibold text-stone-900 mb-2 text-sm">Inclusions</h3><div className="space-y-1">{inclusions.map((inc: string, i: number) => <div key={i} className="text-xs text-stone-600 flex items-start gap-1"><span className="text-emerald-500">✓</span>{inc}</div>)}</div></div>
              <div><h3 className="font-semibold text-stone-900 mb-2 text-sm">Exclusions</h3><div className="space-y-1">{exclusions.map((exc: string, i: number) => <div key={i} className="text-xs text-stone-600 flex items-start gap-1"><span className="text-rose-500">✕</span>{exc}</div>)}</div></div>
            </div>

            {upcomingSlots.length > 0 && (
              <div>
                <h3 className="font-semibold text-stone-900 mb-2">Upcoming Slots</h3>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {upcomingSlots.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded-lg border text-xs">
                      <div><span className="font-medium">{formatDate(s.date)}</span> · {s.startTime}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-stone-500">{s.capacity - s.seatsBooked} left</span>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700">{s.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  )
}
