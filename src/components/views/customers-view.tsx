"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Users, Search, Phone, Mail, Star, Crown, Award, Tag, Pencil, Download, Loader2 } from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { formatCurrency, timeAgo } from "@/lib/helpers"

const TIER_COLORS: Record<string, string> = { BRONZE: "from-amber-700 to-amber-900", SILVER: "from-stone-400 to-stone-600", GOLD: "from-yellow-500 to-amber-600" }
const TIER_BADGE: Record<string, string> = { BRONZE: "bg-amber-100 text-amber-700", SILVER: "bg-stone-100 text-stone-600", GOLD: "bg-yellow-100 text-yellow-700" }

interface Customer {
  id: string; name: string | null; phone: string; email: string | null; preferredLang: string
  loyaltyTier: string; loyaltyPoints: number; totalBookings: number; totalSpent: number
  whatsappOptIn: boolean; emailOptIn: boolean; tags: string | null; createdAt: string
  _count: { orders: number; conversations: number }
}

export default function CustomersView() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [tier, setTier] = useState("all")
  const [selected, setSelected] = useState<Customer | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)

  const load = () => fetch("/api/customers").then(r => r.json()).then(d => { setCustomers(d.customers || []); setLoading(false) }).catch(() => setLoading(false))

  const startEdit = (c: Customer) => {
    setDraft({
      name: c.name ?? "",
      email: c.email ?? "",
      preferredLang: c.preferredLang,
      loyaltyTier: c.loyaltyTier,
      whatsappOptIn: c.whatsappOptIn,
      emailOptIn: c.emailOptIn,
      tags: (() => { try { return JSON.parse(c.tags || "[]").join(", ") } catch { return c.tags || "" } })(),
    })
    setEditing(true)
  }

  const saveCustomer = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch(`/api/customers/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          tags: String(draft.tags || "").split(",").map(t => t.trim()).filter(Boolean),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error || "Could not save"); return }
      toast.success("Customer updated")
      setEditing(false)
      setSelected(null)
      load()
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    fetch("/api/customers").then(r => r.json()).then(d => { setCustomers(d.customers || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const filtered = customers.filter(c =>
    (tier === "all" || c.loyaltyTier === tier) &&
    (!search || (c.name?.toLowerCase().includes(search.toLowerCase())) || c.phone.includes(search) || (c.email?.toLowerCase().includes(search.toLowerCase())))
  )

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-none space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
        <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-teal-50 flex items-center justify-center"><Users className="h-5 w-5 text-teal-600" /></div>
          Customers &amp; CRM
        </h2>
        <p className="text-sm text-stone-500 mt-0.5">{customers.length} customers · {customers.filter(c => c.loyaltyTier === "GOLD").length} Gold · {customers.filter(c => c.loyaltyTier === "SILVER").length} Silver</p>
        </div>
        {/* The CSV endpoint already existed with nothing calling it. */}
        <Button variant="outline" size="sm" asChild>
          <a href="/api/subscribers/export" download>
            <Download className="h-3.5 w-3.5 mr-1.5" />Export CSV
          </a>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" /><Input placeholder="Search by name, phone, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white" /></div>
        <select value={tier} onChange={e => setTier(e.target.value)} className="px-3 py-2 rounded-lg border bg-white text-sm">
          <option value="all">All Tiers</option><option value="GOLD">Gold</option><option value="SILVER">Silver</option><option value="BRONZE">Bronze</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-16 text-center"><Users className="h-10 w-10 text-stone-300 mx-auto mb-3" /><p className="text-stone-500">No customers found</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const tags = c.tags ? JSON.parse(c.tags) : []
            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelected(c)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm"><AvatarFallback className={`bg-gradient-to-br ${TIER_COLORS[c.loyaltyTier]} text-white font-semibold`}>{c.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "U"}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><h3 className="font-semibold text-stone-900 truncate">{c.name || "Unknown"}</h3><Badge className={TIER_BADGE[c.loyaltyTier]}>{c.loyaltyTier}</Badge></div>
                      <div className="text-xs text-stone-500 flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3" />{c.phone}</div>
                      {c.email && <div className="text-xs text-stone-500 flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</div>}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div className="p-1.5 rounded bg-stone-50"><div className="text-sm font-bold text-stone-900">{c.totalBookings}</div><div className="text-[9px] text-stone-500">Bookings</div></div>
                    <div className="p-1.5 rounded bg-stone-50"><div className="text-sm font-bold text-stone-900">{c.totalSpent.toFixed(0)}</div><div className="text-[9px] text-stone-500">OMR</div></div>
                    <div className="p-1.5 rounded bg-stone-50"><div className="text-sm font-bold text-stone-900">{c.loyaltyPoints}</div><div className="text-[9px] text-stone-500">Points</div></div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    {c.whatsappOptIn && <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700"><WhatsAppIcon className="h-3 w-3 mr-0.5" />WA</Badge>}
                    {c.emailOptIn && <Badge variant="outline" className="text-[9px] bg-teal-50 text-teal-700"><Mail className="h-2.5 w-2.5 mr-0.5" />Email</Badge>}
                    {tags.map((t: string) => <Badge key={t} variant="outline" className="text-[9px] bg-purple-50 text-purple-700">{t}</Badge>)}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setSelected(null); setEditing(false) }}>
          <Card className="max-w-lg w-full max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <ScrollArea className="h-[80vh]">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-16 w-16"><AvatarFallback className={`bg-gradient-to-br ${TIER_COLORS[selected.loyaltyTier]} text-white text-xl`}>{selected.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "U"}</AvatarFallback></Avatar>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">{selected.name}</h2>
                    <Badge className={TIER_BADGE[selected.loyaltyTier]}>{selected.loyaltyTier} · {selected.loyaltyPoints} pts</Badge>
                  </div>
                  {!editing && (
                    <Button variant="outline" size="sm" onClick={() => startEdit(selected)}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit
                    </Button>
                  )}
                </div>

                {editing && (
                  <div className="p-3 rounded-lg border space-y-3">
                    <label className="text-xs text-stone-500 block">Name
                      <Input className="mt-1" value={String(draft.name ?? "")} onChange={e => setDraft({ ...draft, name: e.target.value })} />
                    </label>
                    <label className="text-xs text-stone-500 block">Email
                      <Input className="mt-1" value={String(draft.email ?? "")} onChange={e => setDraft({ ...draft, email: e.target.value })} />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-xs text-stone-500">Language
                        <select value={String(draft.preferredLang ?? "en")} onChange={e => setDraft({ ...draft, preferredLang: e.target.value })} className="mt-1 w-full px-2 py-2 rounded-lg border bg-white text-sm">
                          <option value="en">English</option>
                          <option value="ar">Arabic</option>
                        </select>
                      </label>
                      <label className="text-xs text-stone-500">Loyalty tier
                        <select value={String(draft.loyaltyTier ?? "BRONZE")} onChange={e => setDraft({ ...draft, loyaltyTier: e.target.value })} className="mt-1 w-full px-2 py-2 rounded-lg border bg-white text-sm">
                          <option value="BRONZE">Bronze</option>
                          <option value="SILVER">Silver</option>
                          <option value="GOLD">Gold</option>
                        </select>
                      </label>
                    </div>
                    <label className="text-xs text-stone-500 block">Tags, comma separated
                      <Input className="mt-1" value={String(draft.tags ?? "")} onChange={e => setDraft({ ...draft, tags: e.target.value })} placeholder="vip, repeat" />
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch checked={Boolean(draft.whatsappOptIn)} onCheckedChange={v => setDraft({ ...draft, whatsappOptIn: v })} />
                        <span className="text-xs text-stone-600">WhatsApp opt-in</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={Boolean(draft.emailOptIn)} onCheckedChange={v => setDraft({ ...draft, emailOptIn: v })} />
                        <span className="text-xs text-stone-600">Email opt-in</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-stone-400">Turning an opt-in off stops all marketing to that channel immediately.</p>
                    <div className="flex gap-2">
                      <Button onClick={saveCustomer} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                        {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}Save
                      </Button>
                      <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-stone-50"><div className="text-[10px] text-stone-500">Phone</div><div className="text-sm font-medium">{selected.phone}</div></div>
                  <div className="p-3 rounded-lg bg-stone-50"><div className="text-[10px] text-stone-500">Email</div><div className="text-sm font-medium">{selected.email || "—"}</div></div>
                  <div className="p-3 rounded-lg bg-stone-50"><div className="text-[10px] text-stone-500">Total Bookings</div><div className="text-sm font-medium">{selected.totalBookings}</div></div>
                  <div className="p-3 rounded-lg bg-stone-50"><div className="text-[10px] text-stone-500">Total Spent</div><div className="text-sm font-medium">{formatCurrency(selected.totalSpent)}</div></div>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100"><div className="text-xs font-semibold text-emerald-700 mb-1">Unified Customer Profile</div><div className="text-[11px] text-emerald-600">Combines {selected._count.orders} orders + {selected._count.conversations} WhatsApp conversations + email history in one view.</div></div>
              </div>
            </ScrollArea>
          </Card>
        </div>
      )}
    </div>
  )
}
