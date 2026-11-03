"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Users, Search, Phone, Mail, Star, Crown, Award, Tag, Pencil, Download,
  Upload, SlidersHorizontal, Layers, Plus, Loader2, Sparkles, Filter, Check,
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { formatCurrency, timeAgo } from "@/lib/helpers"
import { CustomFieldsDialog, type CustomFieldDef } from "@/components/views/custom-fields-dialog"
import { CsvImportWizard } from "@/components/views/csv-import-wizard"
import { SegmentBuilderModal } from "@/components/views/segment-builder-modal"
import { matchesSegment } from "@/lib/segments"

const TIER_COLORS: Record<string, string> = {
  BRONZE: "from-amber-700 to-amber-900",
  SILVER: "from-stone-400 to-stone-600",
  GOLD: "from-yellow-500 to-amber-600",
}
const TIER_BADGE: Record<string, string> = {
  BRONZE: "bg-amber-100 text-amber-700",
  SILVER: "bg-stone-100 text-stone-600",
  GOLD: "bg-yellow-100 text-yellow-700",
}

interface Customer {
  id: string
  name: string | null
  phone: string
  email: string | null
  preferredLang: string
  loyaltyTier: string
  loyaltyPoints: number
  totalBookings: number
  totalSpent: number
  whatsappOptIn: boolean
  emailOptIn: boolean
  tags: string | null
  customFields?: any
  createdAt: string
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

  // Pagination
  const [cursor, setCursor] = useState<string | null>(null)
  const [history, setHistory] = useState<Array<string | null>>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [refresh, setRefresh] = useState(0)
  const [loadError, setLoadError] = useState("")
  const load = () => setRefresh(value => value + 1)

  // Custom Fields & Dynamic Attributes
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([])
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false)

  // CSV Import Wizard
  const [importOpen, setImportOpen] = useState(false)

  // Dynamic Segments
  const [segments, setSegments] = useState<any[]>([])
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("all")
  const [segmentModalOpen, setSegmentModalOpen] = useState(false)
  const [editingSegment, setEditingSegment] = useState<any | null>(null)

  const loadCustomFields = () => {
    fetch("/api/custom-fields")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.fields)) setCustomFieldDefs(d.fields) })
      .catch(() => {})
  }

  const loadSegments = () => {
    fetch("/api/segments")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.segments)) setSegments(d.segments) })
      .catch(() => {})
  }

  useEffect(() => {
    loadCustomFields()
    loadSegments()
  }, [])

  const startEdit = (c: Customer) => {
    let cf: Record<string, any> = {}
    if (c.customFields && typeof c.customFields === "object") cf = { ...c.customFields }
    else if (typeof c.customFields === "string") {
      try { cf = JSON.parse(c.customFields) } catch {}
    }

    setDraft({
      name: c.name ?? "",
      email: c.email ?? "",
      preferredLang: c.preferredLang,
      loyaltyTier: c.loyaltyTier,
      whatsappOptIn: c.whatsappOptIn,
      emailOptIn: c.emailOptIn,
      tags: (() => { try { return JSON.parse(c.tags || "[]").join(", ") } catch { return c.tags || "" } })(),
      customFields: cf,
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
          customFields: draft.customFields || {},
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
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      setLoadError("")
      try {
        const query = new URLSearchParams({ search, tier, limit: "50" })
        if (cursor) query.set("cursor", cursor)
        const response = await fetch(`/api/customers?${query}`, { signal: controller.signal })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Could not load customers")
        if (controller.signal.aborted) return
        setCustomers(data.customers || [])
        setTotal(data.total || 0)
        setNextCursor(data.nextCursor || null)
      } catch (error) {
        if (!controller.signal.aborted) {
          setCustomers([])
          setNextCursor(null)
          setLoadError(error instanceof Error ? error.message : "Could not load customers")
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [search, tier, cursor, refresh])

  // Filter in memory if a saved dynamic segment is chosen
  const activeSegment = useMemo(() => {
    return selectedSegmentId !== "all" ? segments.find(s => s.id === selectedSegmentId) : null
  }, [segments, selectedSegmentId])

  const filtered = useMemo(() => {
    if (!activeSegment) return customers
    return customers.filter(c => matchesSegment(c, activeSegment))
  }, [customers, activeSegment])

  const availableTags = useMemo(() => {
    const allTags = new Set<string>()
    customers.forEach(c => {
      try {
        const t = c.tags ? JSON.parse(c.tags) : []
        if (Array.isArray(t)) t.forEach(tag => allTags.add(tag))
      } catch {}
    })
    return Array.from(allTags)
  }, [customers])

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-none space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 shadow-2xs">
              <Users className="h-5 w-5" />
            </div>
            <span>Customers &amp; CRM</span>
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            {activeSegment ? (
              <span>
                Filtering by segment <strong className="text-emerald-700">{activeSegment.name}</strong> · {filtered.length} matching
              </span>
            ) : (
              <span>{total} matching customers · {customers.length} on this page</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Custom CRM Attributes Modal */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCustomFieldsOpen(true)}
            className="h-9 text-xs font-semibold gap-1.5 border-stone-200 text-stone-700 hover:text-stone-900 shadow-2xs"
            title="Manage dynamic CRM fields (e.g. City, VIP tier, IDs)"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-teal-600" />
            <span>Custom Fields ({customFieldDefs.length})</span>
          </Button>

          {/* Import CSV Contacts */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
            className="h-9 text-xs font-semibold gap-1.5 border-stone-200 text-stone-700 hover:text-stone-900 shadow-2xs"
            title="Import customer contacts from CSV with auto column mapping"
          >
            <Upload className="h-3.5 w-3.5 text-emerald-600" />
            <span>Import CSV</span>
          </Button>

          {/* Export CSV Contacts */}
          <Button variant="outline" size="sm" asChild className="h-9 text-xs font-semibold shadow-2xs">
            <a href="/api/subscribers/export" download>
              <Download className="h-3.5 w-3.5 me-1.5" />Export CSV
            </a>
          </Button>

          {/* New Segment Button */}
          <Button
            size="sm"
            onClick={() => {
              setEditingSegment(null)
              setSegmentModalOpen(true)
            }}
            className="h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Segment</span>
          </Button>
        </div>
      </div>

      {/* Quick Segments Filter Pills Bar */}
      {segments.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <div className="flex items-center gap-1 text-[11px] font-bold text-stone-500 uppercase tracking-wider shrink-0 me-1">
            <Layers className="h-3.5 w-3.5 text-emerald-600" />
            <span>Segments:</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedSegmentId("all")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedSegmentId === "all"
                ? "bg-stone-900 text-white shadow-xs"
                : "bg-stone-100/90 text-stone-600 hover:bg-stone-200/70"
            }`}
          >
            All Contacts ({total})
          </button>
          {segments.map(seg => (
            <button
              key={seg.id}
              type="button"
              onClick={() => setSelectedSegmentId(seg.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedSegmentId === seg.id
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-stone-100/90 text-stone-600 hover:bg-stone-200/70"
              }`}
            >
              <span>{seg.name}</span>
              {typeof seg.contactCount === "number" && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedSegmentId === seg.id ? "bg-emerald-800 text-white" : "bg-stone-200 text-stone-700"
                }`}>
                  {seg.contactCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Search and Tier Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Search by name, phone, email, or tags..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCursor(null); setHistory([]); setLoading(true) }}
            aria-label="Search customers"
            className="ps-9 bg-white text-base sm:text-sm h-10 shadow-2xs"
          />
        </div>

        <select
          value={tier}
          onChange={e => { setTier(e.target.value); setCursor(null); setHistory([]); setLoading(true) }}
          aria-label="Customer tier"
          className="px-3 py-2 rounded-lg border bg-white text-sm h-10 shadow-2xs text-stone-700 font-medium"
        >
          <option value="all">All Tiers</option>
          <option value="GOLD">Gold Tier</option>
          <option value="SILVER">Silver Tier</option>
          <option value="BRONZE">Bronze Tier</option>
        </select>
      </div>

      {loadError && (
        <p role="alert" className="text-rose-700 text-xs">
          {loadError} <button onClick={load} className="underline font-bold">Retry</button>
        </p>
      )}

      {/* Grid of Customer Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed rounded-2xl">
          <CardContent className="py-16 text-center">
            <Users className="h-10 w-10 text-stone-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-stone-700">No customers found</p>
            <p className="text-xs text-stone-400 mt-0.5">Try adjusting your search criteria, tier filter, or segment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const tags = c.tags ? (() => { try { return JSON.parse(c.tags) } catch { return [] } })() : []
            let cf: Record<string, any> = {}
            if (c.customFields && typeof c.customFields === "object") cf = c.customFields
            else if (typeof c.customFields === "string") {
              try { cf = JSON.parse(c.customFields) } catch {}
            }
            const cfEntries = Object.entries(cf).filter(([_, v]) => v !== null && v !== undefined && v !== "")

            return (
              <Card
                key={c.id}
                className="hover:shadow-md transition-all cursor-pointer rounded-2xl border-stone-200/80 hover:border-emerald-300"
                onClick={() => setSelected(c)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-2xs rounded-2xl">
                      <AvatarFallback className={`bg-gradient-to-br ${TIER_COLORS[c.loyaltyTier] || "from-stone-500 to-stone-700"} text-white font-bold text-sm`}>
                        {c.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-stone-900 truncate text-sm">{c.name || "Unknown"}</h3>
                        <Badge className={`${TIER_BADGE[c.loyaltyTier] || "bg-stone-100 text-stone-700"} text-[10px] font-bold`}>
                          {c.loyaltyTier}
                        </Badge>
                      </div>
                      <div className="text-xs text-stone-500 flex items-center gap-1 mt-0.5 font-mono">
                        <Phone className="h-3 w-3 text-stone-400 shrink-0" />
                        <span>{c.phone}</span>
                      </div>
                      {c.email && (
                        <div className="text-xs text-stone-500 flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 text-stone-400 shrink-0" />
                          <span className="truncate">{c.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-stone-50 border border-stone-200/60 shadow-2xs">
                      <div className="text-sm font-black text-stone-900">{c.totalBookings}</div>
                      <div className="text-[9px] text-stone-500 font-bold uppercase">Bookings</div>
                    </div>
                    <div className="p-2 rounded-xl bg-stone-50 border border-stone-200/60 shadow-2xs">
                      <div className="text-sm font-black text-stone-900">{c.totalSpent.toFixed(0)}</div>
                      <div className="text-[9px] text-stone-500 font-bold uppercase">OMR Spent</div>
                    </div>
                    <div className="p-2 rounded-xl bg-stone-50 border border-stone-200/60 shadow-2xs">
                      <div className="text-sm font-black text-emerald-700">{c.loyaltyPoints}</div>
                      <div className="text-[9px] text-stone-500 font-bold uppercase">Points</div>
                    </div>
                  </div>

                  {/* Tags and Custom Fields Chips */}
                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                    {c.whatsappOptIn && (
                      <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-800 border-emerald-200 font-bold">
                        <WhatsAppIcon className="h-2.5 w-2.5 mr-0.5" />WA
                      </Badge>
                    )}
                    {c.emailOptIn && (
                      <Badge variant="outline" className="text-[9px] bg-teal-50 text-teal-800 border-teal-200 font-bold">
                        <Mail className="h-2.5 w-2.5 mr-0.5" />Email
                      </Badge>
                    )}
                    {tags.slice(0, 3).map((t: string) => (
                      <Badge key={t} variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200 font-medium">
                        {t}
                      </Badge>
                    ))}
                    {cfEntries.slice(0, 2).map(([k, v]) => {
                      const def = customFieldDefs.find(f => f.key === k)
                      return (
                        <Badge key={k} variant="outline" className="text-[9px] bg-stone-50 text-stone-700 border-stone-200/80 font-medium">
                          <span className="text-stone-400 me-0.5">{def?.label || k}:</span>
                          <span>{String(v)}</span>
                        </Badge>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination Footer */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          variant="outline"
          size="sm"
          disabled={loading || history.length === 0}
          onClick={() => {
            setCursor(history[history.length - 1])
            setHistory(history.slice(0, -1))
            setLoading(true)
          }}
          className="text-xs"
        >
          Previous
        </Button>
        <span className="text-xs text-stone-500 font-mono">Page {history.length + 1}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={loading || !nextCursor}
          onClick={() => {
            setHistory([...history, cursor])
            setCursor(nextCursor)
            setLoading(true)
          }}
          className="text-xs"
        >
          Next
        </Button>
      </div>

      {/* Customer Profile & Edit Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-2xs animate-in fade-in-50"
          onClick={() => { setSelected(null); setEditing(false) }}
        >
          <Card className="max-w-xl w-full max-h-[88vh] overflow-hidden rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <ScrollArea className="h-[84vh]">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
                  <Avatar className="h-16 w-16 rounded-2xl shadow-sm border border-stone-200">
                    <AvatarFallback className={`bg-gradient-to-br ${TIER_COLORS[selected.loyaltyTier] || "from-stone-500 to-stone-700"} text-white text-xl font-black`}>
                      {selected.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-stone-900 truncate">{selected.name || "Customer Profile"}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={TIER_BADGE[selected.loyaltyTier] || "bg-stone-100 text-stone-700"}>
                        {selected.loyaltyTier} · {selected.loyaltyPoints} pts
                      </Badge>
                      <span className="text-xs text-stone-400 font-mono">{selected.phone}</span>
                    </div>
                  </div>
                  {!editing && (
                    <Button variant="outline" size="sm" onClick={() => startEdit(selected)} className="h-8 text-xs font-semibold gap-1.5 shadow-2xs">
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </Button>
                  )}
                </div>

                {editing ? (
                  /* Edit Customer Profile Form */
                  <div className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200 space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="text-xs text-stone-600 font-medium block">
                        <span>Full Name</span>
                        <Input
                          className="mt-1 h-8.5 text-xs bg-white"
                          value={String(draft.name ?? "")}
                          onChange={e => setDraft({ ...draft, name: e.target.value })}
                        />
                      </label>
                      <label className="text-xs text-stone-600 font-medium block">
                        <span>Email Address</span>
                        <Input
                          className="mt-1 h-8.5 text-xs bg-white"
                          value={String(draft.email ?? "")}
                          onChange={e => setDraft({ ...draft, email: e.target.value })}
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="text-xs text-stone-600 font-medium">
                        <span>Preferred Language</span>
                        <select
                          value={String(draft.preferredLang ?? "en")}
                          onChange={e => setDraft({ ...draft, preferredLang: e.target.value })}
                          className="mt-1 w-full h-8.5 px-2.5 rounded-lg border bg-white text-xs text-stone-800"
                        >
                          <option value="en">English (en)</option>
                          <option value="ar">Arabic (العربية)</option>
                        </select>
                      </label>
                      <label className="text-xs text-stone-600 font-medium">
                        <span>Loyalty Tier</span>
                        <select
                          value={String(draft.loyaltyTier ?? "BRONZE")}
                          onChange={e => setDraft({ ...draft, loyaltyTier: e.target.value })}
                          className="mt-1 w-full h-8.5 px-2.5 rounded-lg border bg-white text-xs text-stone-800"
                        >
                          <option value="BRONZE">Bronze</option>
                          <option value="SILVER">Silver</option>
                          <option value="GOLD">Gold</option>
                        </select>
                      </label>
                    </div>

                    <label className="text-xs text-stone-600 font-medium block">
                      <span>Tags (comma-separated)</span>
                      <Input
                        className="mt-1 h-8.5 text-xs bg-white"
                        value={String(draft.tags ?? "")}
                        onChange={e => setDraft({ ...draft, tags: e.target.value })}
                        placeholder="vip, repeat-client, safari-tour"
                      />
                    </label>

                    {/* Dynamic Custom CRM Fields Editor */}
                    {customFieldDefs.length > 0 && (
                      <div className="pt-2 border-t border-stone-200/70 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                            <SlidersHorizontal className="h-3.5 w-3.5 text-teal-600" />
                            <span>Custom Attributes</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setCustomFieldsOpen(true)}
                            className="text-[11px] text-teal-700 hover:underline font-semibold"
                          >
                            + Manage Fields
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {customFieldDefs.map(def => {
                            const draftCf = (draft.customFields as Record<string, any>) || {}
                            const val = draftCf[def.key] ?? ""
                            return (
                              <label key={def.key} className="text-xs text-stone-600 font-medium block">
                                <span className="flex items-center justify-between">
                                  <span>{def.label}</span>
                                  <span className="text-[9px] uppercase font-mono text-stone-400">{def.type}</span>
                                </span>
                                {def.type === "select" && def.options ? (
                                  <select
                                    value={String(val)}
                                    onChange={e => setDraft({ ...draft, customFields: { ...draftCf, [def.key]: e.target.value } })}
                                    className="mt-1 w-full h-8.5 px-2.5 rounded-lg border bg-white text-xs text-stone-800"
                                  >
                                    <option value="">-- Select --</option>
                                    {def.options.map(opt => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                ) : def.type === "boolean" ? (
                                  <div className="flex items-center gap-2 mt-2">
                                    <Switch
                                      checked={Boolean(val)}
                                      onCheckedChange={v => setDraft({ ...draft, customFields: { ...draftCf, [def.key]: v } })}
                                    />
                                    <span className="text-xs text-stone-600">{val ? "Yes / True" : "No / False"}</span>
                                  </div>
                                ) : (
                                  <Input
                                    type={def.type === "number" ? "number" : def.type === "date" ? "date" : "text"}
                                    className="mt-1 h-8.5 text-xs bg-white"
                                    value={String(val)}
                                    placeholder={`Enter ${def.label.toLowerCase()}...`}
                                    onChange={e => setDraft({
                                      ...draft,
                                      customFields: {
                                        ...draftCf,
                                        [def.key]: def.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value,
                                      },
                                    })}
                                  />
                                )}
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-6 pt-1">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={Boolean(draft.whatsappOptIn)}
                          onCheckedChange={v => setDraft({ ...draft, whatsappOptIn: v })}
                        />
                        <span className="text-xs text-stone-700 font-medium">WhatsApp Opt-in</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={Boolean(draft.emailOptIn)}
                          onCheckedChange={v => setDraft({ ...draft, emailOptIn: v })}
                        />
                        <span className="text-xs text-stone-700 font-medium">Email Opt-in</span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                      <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="text-xs">
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveCustomer}
                        disabled={saving}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs"
                      >
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                        <span>Save Changes</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* View Customer Profile Info */
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70 shadow-2xs">
                        <div className="text-[10px] text-stone-400 font-bold uppercase">Phone</div>
                        <div className="text-xs font-semibold text-stone-900 font-mono mt-0.5">{selected.phone}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70 shadow-2xs">
                        <div className="text-[10px] text-stone-400 font-bold uppercase">Email</div>
                        <div className="text-xs font-semibold text-stone-900 mt-0.5 truncate">{selected.email || "—"}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70 shadow-2xs">
                        <div className="text-[10px] text-stone-400 font-bold uppercase">Total Bookings</div>
                        <div className="text-sm font-black text-stone-900 mt-0.5">{selected.totalBookings}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70 shadow-2xs">
                        <div className="text-[10px] text-stone-400 font-bold uppercase">Total Spent</div>
                        <div className="text-sm font-black text-emerald-700 mt-0.5">{formatCurrency(selected.totalSpent)}</div>
                      </div>
                    </div>

                    {/* Custom Attributes Section in View Mode */}
                    {(() => {
                      let cf: Record<string, any> = {}
                      if (selected.customFields && typeof selected.customFields === "object") cf = selected.customFields
                      else if (typeof selected.customFields === "string") {
                        try { cf = JSON.parse(selected.customFields) } catch {}
                      }
                      const entries = Object.entries(cf).filter(([_, v]) => v !== null && v !== undefined && v !== "")
                      if (entries.length === 0) return null

                      return (
                        <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2 shadow-2xs">
                          <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                            <SlidersHorizontal className="h-3.5 w-3.5 text-teal-600" />
                            <span>Custom CRM Attributes</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            {entries.map(([k, v]) => {
                              const def = customFieldDefs.find(f => f.key === k)
                              return (
                                <div key={k} className="p-2.5 rounded-xl bg-white border border-stone-200/70 shadow-2xs">
                                  <div className="text-[10px] text-stone-400 font-bold uppercase">{def?.label || k}</div>
                                  <div className="text-xs font-semibold text-stone-800 truncate mt-0.5">{String(v)}</div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()}

                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80">
                      <div className="text-xs font-bold text-emerald-800 mb-0.5">Unified Customer Profile</div>
                      <div className="text-[11px] text-emerald-700">
                        Combines {selected._count.orders} orders, {selected._count.conversations} WhatsApp conversations, and automated drip marketing history in one unified CRM view.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>
      )}

      {/* Dynamic Custom Fields Dialog */}
      <CustomFieldsDialog
        open={customFieldsOpen}
        onOpenChange={setCustomFieldsOpen}
        onFieldsChanged={setCustomFieldDefs}
      />

      {/* Interactive CSV Import Wizard */}
      <CsvImportWizard
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={() => {
          load()
          loadSegments()
        }}
        customFieldDefs={customFieldDefs}
      />

      {/* Dynamic Segment Builder Modal */}
      <SegmentBuilderModal
        open={segmentModalOpen}
        onOpenChange={setSegmentModalOpen}
        segment={editingSegment}
        onSaved={() => {
          loadSegments()
          load()
        }}
        onDeleted={() => {
          loadSegments()
          load()
        }}
        availableTags={availableTags}
        customFieldDefs={customFieldDefs}
      />
    </div>
  )
}
