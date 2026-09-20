"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Users, UserCheck, UserPlus, Clock, Download, Upload, Plus, RefreshCw, Search,
  Tag, List, Sliders, MessageCircle, Mail, Phone, Edit, Trash2, CheckCircle,
  AlertTriangle, ChevronRight, User, Shield, FileText, Check, MoreHorizontal, UserX
} from "lucide-react"
import { formatDate } from "@/lib/helpers"

interface Subscriber {
  id: string
  name: string | null
  phone: string
  email: string | null
  whatsappOptIn: boolean
  emailOptIn: boolean
  optInSource: string | null
  optInAt: string | null
  tags?: string | null
  tagList: string[]
  createdAt: string
  updatedAt: string
  notes?: string | null
  preferredLang?: string | null
  _count: { orders: number; conversations: number }
}

export default function SubscribersView() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activeSub, setActiveSub] = useState<Subscriber | null>(null)
  const [profileTab, setProfileTab] = useState<"overview" | "agent" | "labels" | "lists" | "sequences" | "custom_fields" | "notes">("overview")

  // Filters
  const [search, setSearch] = useState("")
  const [channelFilter, setChannelFilter] = useState("WHATSAPP")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [labelFilter, setLabelFilter] = useState("ALL")

  // Modals
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [labelsModalOpen, setLabelsModalOpen] = useState(false)

  // Forms
  const [newSub, setNewSub] = useState({ phone: "", name: "", email: "", whatsappOptIn: true, tags: "" })
  const [editSub, setEditSub] = useState<{ id: string; name: string; phone: string; email: string; whatsappOptIn: boolean; tags: string }>({
    id: "", name: "", phone: "", email: "", whatsappOptIn: true, tags: ""
  })
  const [newTagInput, setNewTagInput] = useState("")

  const [importCsv, setImportCsv] = useState("")
  const [importOptIn, setImportOptIn] = useState(false)

  // Dropdown menus
  const [showExportImportMenu, setShowExportImportMenu] = useState(false)
  const [showManageMenu, setShowManageMenu] = useState(false)

  const loadSubscribers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      const res = await fetch(`/api/customers?${params.toString()}`)
      const data = await res.json()
      const raw: any[] = data.customers || []
      const parsed: Subscriber[] = raw.map(c => {
        let tagList: string[] = []
        if (c.tags) {
          try {
            tagList = Array.isArray(c.tags) ? c.tags : JSON.parse(c.tags)
          } catch {
            tagList = typeof c.tags === "string" ? c.tags.split(",").map(t => t.trim()) : []
          }
        }
        return { ...c, tagList }
      })
      setSubscribers(parsed)
      if (parsed.length > 0 && !activeSub) {
        setActiveSub(parsed[0])
      }
    } catch {
      toast.error("Failed to load subscribers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSubscribers() }, [])

  // All unique labels/tags across all subscribers
  const allLabels = Array.from(new Set(subscribers.flatMap(s => s.tagList)))

  const filteredSubscribers = subscribers.filter(s => {
    const matchesSearch =
      !search ||
      (s.name && s.name.toLowerCase().includes(search.toLowerCase())) ||
      s.phone.includes(search) ||
      (s.email && s.email.toLowerCase().includes(search.toLowerCase()))

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && s.whatsappOptIn) ||
      (statusFilter === "UNSUBSCRIBED" && !s.whatsappOptIn)

    const matchesLabel =
      labelFilter === "ALL" || s.tagList.includes(labelFilter)

    return matchesSearch && matchesStatus && matchesLabel
  })

  // Bulk selection
  const toggleAll = () => {
    if (selected.size === filteredSubscribers.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredSubscribers.map(s => s.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  // Create Subscriber
  const handleAddSubscriber = async () => {
    if (!newSub.phone.trim()) { toast.error("Phone number is required"); return }
    setBusy(true)
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSub.name || undefined,
          phone: newSub.phone.trim(),
          email: newSub.email || undefined,
          whatsappOptIn: newSub.whatsappOptIn,
          tags: newSub.tags ? newSub.tags.split(",").map(t => t.trim()) : [],
        }),
      })
      if (!res.ok) throw new Error("Failed to add subscriber")
      toast.success("Subscriber added")
      setAddOpen(false)
      setNewSub({ phone: "", name: "", email: "", whatsappOptIn: true, tags: "" })
      loadSubscribers()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add")
    } finally {
      setBusy(false)
    }
  }

  // Edit Subscriber
  const handleEditSubscriber = async () => {
    if (!editSub.id) return
    setBusy(true)
    try {
      const res = await fetch(`/api/customers/${editSub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editSub.name,
          phone: editSub.phone,
          email: editSub.email,
          whatsappOptIn: editSub.whatsappOptIn,
          tags: editSub.tags ? editSub.tags.split(",").map(t => t.trim()) : [],
        }),
      })
      if (!res.ok) throw new Error("Failed to update subscriber")
      toast.success("Subscriber profile updated")
      setEditOpen(false)
      loadSubscribers()
    } catch {
      toast.error("Failed to update subscriber")
    } finally {
      setBusy(false)
    }
  }

  // Add Label to Active Subscriber
  const handleAddTagToActive = async (tag: string) => {
    if (!activeSub || !tag.trim()) return
    const updatedTags = Array.from(new Set([...activeSub.tagList, tag.trim()]))
    try {
      const res = await fetch(`/api/customers/${activeSub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: updatedTags }),
      })
      if (res.ok) {
        toast.success(`Label "${tag}" added`)
        setNewTagInput("")
        loadSubscribers()
      }
    } catch {
      toast.error("Failed to add label")
    }
  }

  // Remove Label from Active Subscriber
  const handleRemoveTagFromActive = async (tagToRemove: string) => {
    if (!activeSub) return
    const updatedTags = activeSub.tagList.filter(t => t !== tagToRemove)
    try {
      const res = await fetch(`/api/customers/${activeSub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: updatedTags }),
      })
      if (res.ok) {
        toast.success(`Label "${tagToRemove}" removed`)
        loadSubscribers()
      }
    } catch {
      toast.error("Failed to remove label")
    }
  }

  // CSV Import
  const runImport = async () => {
    if (!importCsv.trim()) return
    setBusy(true)
    try {
      const res = await fetch("/api/subscribers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: importCsv, optIn: importOptIn }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Import failed")
      toast.success(`Import complete: ${data.created} created, ${data.updated} updated`)
      setImportOpen(false)
      setImportCsv("")
      loadSubscribers()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed")
    } finally {
      setBusy(false)
    }
  }

  // CSV Export
  const exportAllCsv = () => {
    const csvHeader = "Phone,Name,Email,WhatsAppOptIn,Tags,OrdersCount\n"
    const csvRows = subscribers.map(s => [
      `"${s.phone}"`,
      `"${s.name || ""}"`,
      `"${s.email || ""}"`,
      s.whatsappOptIn ? "TRUE" : "FALSE",
      `"${s.tagList.join(";")}"`,
      s._count.orders,
    ].join(",")).join("\n")

    const blob = new Blob([csvHeader + csvRows], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `subscribers_export_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${subscribers.length} subscribers`)
  }

  const activeCount = subscribers.filter(s => s.whatsappOptIn).length
  const totalCount = subscribers.length

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            Subscribers &amp; Audience
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">Manage and segment your audience across WhatsApp &amp; Email channels</p>
        </div>

        {/* Action Controls Header */}
        <div className="flex items-center gap-2">
          {/* Export/Import Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 bg-white border-stone-200"
              onClick={() => { setShowExportImportMenu(!showExportImportMenu); setShowManageMenu(false); }}
            >
              <Download className="h-3.5 w-3.5 text-stone-500" /> Export/Import <ChevronRight className="h-3 w-3 rotate-90" />
            </Button>
            {showExportImportMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white border rounded-xl shadow-lg z-20 py-1 text-xs space-y-0.5" onClick={() => setShowExportImportMenu(false)}>
                <button onClick={exportAllCsv} className="w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center gap-2 text-stone-700">
                  <Download className="h-3.5 w-3.5 text-stone-500" /> Export all as CSV
                </button>
                <button onClick={() => setImportOpen(true)} className="w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center gap-2 text-stone-700">
                  <Upload className="h-3.5 w-3.5 text-stone-500" /> Import from CSV
                </button>
                <button onClick={() => setAddOpen(true)} className="w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center gap-2 text-emerald-600 font-semibold border-t">
                  <Plus className="h-3.5 w-3.5" /> Add a Subscriber
                </button>
              </div>
            )}
          </div>

          {/* Manage Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 bg-white border-stone-200"
              onClick={() => { setShowManageMenu(!showManageMenu); setShowExportImportMenu(false); }}
            >
              <Sliders className="h-3.5 w-3.5 text-stone-500" /> Manage <ChevronRight className="h-3 w-3 rotate-90" />
            </Button>
            {showManageMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-white border rounded-xl shadow-lg z-20 py-1 text-xs space-y-0.5" onClick={() => setShowManageMenu(false)}>
                <button onClick={() => setLabelsModalOpen(true)} className="w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center gap-2 text-stone-700">
                  <Tag className="h-3.5 w-3.5 text-stone-500" /> Labels &amp; Tags
                </button>
                <button onClick={() => toast.info("Dynamic Segments available in Broadcast view")} className="w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center gap-2 text-stone-700">
                  <List className="h-3.5 w-3.5 text-stone-500" /> Segment Lists
                </button>
              </div>
            )}
          </div>

          <Button size="sm" variant="ghost" onClick={loadSubscribers} title="Refresh list">
            <RefreshCw className="h-3.5 w-3.5 text-stone-500" />
          </Button>
        </div>
      </div>

      {/* Filter Toolbar matching Screenshot 3 & 4 */}
      <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-sm space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
          <div>
            <Label className="text-[10px] text-stone-400 mb-1 block">Channel</Label>
            <select
              value={channelFilter}
              onChange={e => setChannelFilter(e.target.value)}
              className="w-full h-8 rounded-lg border border-stone-200 px-2 bg-stone-50 text-xs font-medium"
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">Email</option>
              <option value="ALL">All Channels</option>
            </select>
          </div>

          <div>
            <Label className="text-[10px] text-stone-400 mb-1 block">WhatsApp Account</Label>
            <select className="w-full h-8 rounded-lg border border-stone-200 px-2 bg-stone-50 text-xs font-medium">
              <option>Gadgets Oman (+96896749569)</option>
              <option>Oman Adventures (+15556239458)</option>
            </select>
          </div>

          <div>
            <Label className="text-[10px] text-stone-400 mb-1 block">Labels / Tags</Label>
            <select
              value={labelFilter}
              onChange={e => setLabelFilter(e.target.value)}
              className="w-full h-8 rounded-lg border border-stone-200 px-2 bg-stone-50 text-xs font-medium"
            >
              <option value="ALL">All Labels</option>
              {allLabels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div>
            <Label className="text-[10px] text-stone-400 mb-1 block">Consent Status</Label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full h-8 rounded-lg border border-stone-200 px-2 bg-stone-50 text-xs font-medium"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active (Opted in)</option>
              <option value="UNSUBSCRIBED">Unsubscribed</option>
            </select>
          </div>

          <div className="col-span-2">
            <Label className="text-[10px] text-stone-400 mb-1 block">Search Audience</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-stone-400" />
              <Input
                placeholder="Search by name, number or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-stone-50 border-stone-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-stone-900">{totalCount.toLocaleString()}</div>
              <div className="text-[11px] text-stone-500">Total Subscribers</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-teal-700">{activeCount.toLocaleString()}</div>
              <div className="text-[11px] text-stone-500">Active Subscribers ({totalCount ? Math.round((activeCount / totalCount) * 100) : 0}%)</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <List className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-purple-700">{allLabels.length}</div>
              <div className="text-[11px] text-stone-500">Active Labels / Tags</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-amber-700">{subscribers.filter(s => s._count.conversations > 0).length}</div>
              <div className="text-[11px] text-stone-500">Recently Active</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Split View: Subscribers List (Left) & Profile Drawer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Table / List Column */}
        <div className="lg:col-span-7 space-y-3">
          <Card className="bg-white">
            <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selected.size === filteredSubscribers.length && filteredSubscribers.length > 0}
                  onCheckedChange={toggleAll}
                />
                <span className="text-xs text-stone-500 font-medium">
                  {selected.size > 0 ? `${selected.size} selected` : "Select all"}
                </span>
              </div>

              {selected.size > 0 && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs text-rose-600 border-rose-200">
                    <Trash2 className="h-3 w-3 mr-1" /> Delete selected
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
              ) : filteredSubscribers.length === 0 ? (
                <div className="p-10 text-center text-xs text-stone-500">No subscribers match your search filters</div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {filteredSubscribers.map(s => {
                    const isSelected = activeSub?.id === s.id
                    return (
                      <div
                        key={s.id}
                        onClick={() => setActiveSub(s)}
                        className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isSelected ? "bg-emerald-50/60 border-l-4 border-emerald-600" : "hover:bg-stone-50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Checkbox
                            checked={selected.has(s.id)}
                            onCheckedChange={() => toggleSelect(s.id)}
                            onClick={e => e.stopPropagation()}
                          />
                          <div className="h-9 w-9 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {s.name ? s.name.charAt(0).toUpperCase() : <User className="h-4 w-4 text-stone-400" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-xs text-stone-900 truncate">{s.name || "Unknown"}</h4>
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">
                                WhatsApp
                              </Badge>
                            </div>
                            <div className="font-mono text-[11px] text-stone-500 mt-0.5">{s.phone}</div>
                            {s.tagList.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {s.tagList.map(t => (
                                  <span key={t} className="px-1.5 py-0.5 rounded text-[9px] bg-stone-100 text-stone-600">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs shrink-0">
                          {s.whatsappOptIn ? (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCircle className="h-3 w-3" /> Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] text-stone-500 font-medium bg-stone-100 px-2 py-0.5 rounded-full">
                              Opted out
                            </span>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-stone-400 hover:text-stone-700"
                            onClick={e => {
                              e.stopPropagation()
                              setEditSub({
                                id: s.id,
                                name: s.name || "",
                                phone: s.phone,
                                email: s.email || "",
                                whatsappOptIn: s.whatsappOptIn,
                                tags: s.tagList.join(", "),
                              })
                              setEditOpen(true)
                            }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Subscriber Profile Panel matching Screenshot 3 & 4 */}
        <div className="lg:col-span-5">
          <Card className="bg-white sticky top-4">
            {activeSub ? (
              <div>
                <CardHeader className="border-b p-4 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                      {activeSub.name ? activeSub.name.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-stone-900">{activeSub.name || "Subscriber Profile"}</h3>
                      <div className="font-mono text-xs text-stone-500">{activeSub.phone}</div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      setEditSub({
                        id: activeSub.id,
                        name: activeSub.name || "",
                        phone: activeSub.phone,
                        email: activeSub.email || "",
                        whatsappOptIn: activeSub.whatsappOptIn,
                        tags: activeSub.tagList.join(", "),
                      })
                      setEditOpen(true)
                    }}
                  >
                    <Edit className="h-3 w-3" /> Edit
                  </Button>
                </CardHeader>

                {/* Tabs matching Screenshot 3 & 4 */}
                <div className="flex items-center border-b px-2 bg-stone-50 text-[11px] overflow-x-auto">
                  {[
                    { id: "overview", label: "Overview" },
                    { id: "labels", label: "Labels" },
                    { id: "agent", label: "Assign Staff" },
                    { id: "notes", label: "Notes" },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setProfileTab(tab.id as any)}
                      className={`px-3 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                        profileTab === tab.id
                          ? "border-emerald-600 text-emerald-700 bg-white"
                          : "border-transparent text-stone-500 hover:text-stone-900"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <CardContent className="p-4 space-y-4 text-xs">
                  {profileTab === "overview" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border bg-stone-50">
                        <div>
                          <div className="text-[10px] text-stone-400">Total Bookings</div>
                          <div className="text-base font-bold text-stone-900">{activeSub._count.orders}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-stone-400">Chat Conversations</div>
                          <div className="text-base font-bold text-stone-900">{activeSub._count.conversations}</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between border-b pb-1.5">
                          <span className="text-stone-500">Email:</span>
                          <span className="font-medium text-stone-800">{activeSub.email || "Not provided"}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1.5">
                          <span className="text-stone-500">WhatsApp Opt-In:</span>
                          <span className="font-semibold text-emerald-700">{activeSub.whatsappOptIn ? "Opted In" : "Opted Out"}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1.5">
                          <span className="text-stone-500">Consent Source:</span>
                          <span className="text-stone-700">{activeSub.optInSource || "Direct Website"}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1.5">
                          <span className="text-stone-500">Subscribed Date:</span>
                          <span className="text-stone-700">{formatDate(activeSub.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {profileTab === "labels" && (
                    <div className="space-y-3">
                      <Label className="text-xs font-semibold">Subscriber Labels / Tags</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {activeSub.tagList.length === 0 ? (
                          <span className="text-stone-400 italic">No labels assigned yet</span>
                        ) : (
                          activeSub.tagList.map(tag => (
                            <Badge key={tag} variant="secondary" className="gap-1 pr-1 bg-stone-100 text-stone-700">
                              {tag}
                              <button onClick={() => handleRemoveTagFromActive(tag)} className="hover:text-rose-600">
                                ×
                              </button>
                            </Badge>
                          ))
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Input
                          placeholder="New label name..."
                          value={newTagInput}
                          onChange={e => setNewTagInput(e.target.value)}
                          className="h-8 text-xs bg-stone-50"
                        />
                        <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAddTagToActive(newTagInput)}>
                          Add Label
                        </Button>
                      </div>
                    </div>
                  )}

                  {profileTab === "agent" && (
                    <div className="space-y-3">
                      <Label className="text-xs font-semibold">Assign Support Staff / Agent</Label>
                      <select className="w-full h-9 rounded-lg border text-xs px-2 bg-stone-50">
                        <option>Ahmed Al-Balushi (Super Admin)</option>
                        <option>Unassigned</option>
                      </select>
                      <Button size="sm" className="bg-emerald-600 text-white text-xs" onClick={() => toast.success("Staff assigned")}>
                        Save Assignment
                      </Button>
                    </div>
                  )}

                  {profileTab === "notes" && (
                    <div className="space-y-3">
                      <Label className="text-xs font-semibold">Customer Notes</Label>
                      <Textarea placeholder="Add internal notes about this subscriber..." value={activeSub.notes || ""} className="text-xs min-h-[100px]" readOnly />
                    </div>
                  )}
                </CardContent>
              </div>
            ) : (
              <CardContent className="p-10 text-center text-xs text-stone-400">
                Select a subscriber from the table to view details
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* Add Subscriber Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-base font-bold">Add New Subscriber</DialogTitle></DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <Label className="text-stone-600">Phone (with country code)</Label>
              <Input className="mt-1 bg-white text-xs" placeholder="+96890000000" value={newSub.phone} onChange={e => setNewSub({ ...newSub, phone: e.target.value })} />
            </div>
            <div>
              <Label className="text-stone-600">Full Name</Label>
              <Input className="mt-1 bg-white text-xs" placeholder="e.g. Salim Al-Harthy" value={newSub.name} onChange={e => setNewSub({ ...newSub, name: e.target.value })} />
            </div>
            <div>
              <Label className="text-stone-600">Email Address (optional)</Label>
              <Input className="mt-1 bg-white text-xs" placeholder="salim@example.com" value={newSub.email} onChange={e => setNewSub({ ...newSub, email: e.target.value })} />
            </div>
            <div>
              <Label className="text-stone-600">Tags / Labels (comma separated)</Label>
              <Input className="mt-1 bg-white text-xs" placeholder="VIP, TourLead, Muscat" value={newSub.tags} onChange={e => setNewSub({ ...newSub, tags: e.target.value })} />
            </div>
            <label className="flex items-start gap-2 text-xs text-stone-600 pt-1">
              <Checkbox checked={newSub.whatsappOptIn} onCheckedChange={v => setNewSub({ ...newSub, whatsappOptIn: v === true })} />
              <span>Agreed to receive WhatsApp messages</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={busy || !newSub.phone.trim()} onClick={handleAddSubscriber}>
                {busy ? "Adding…" : "Add Subscriber"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Subscriber Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-base font-bold">Edit Subscriber Profile</DialogTitle></DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <Label className="text-stone-600">Phone</Label>
              <Input className="mt-1 bg-white text-xs" value={editSub.phone} onChange={e => setEditSub({ ...editSub, phone: e.target.value })} />
            </div>
            <div>
              <Label className="text-stone-600">Full Name</Label>
              <Input className="mt-1 bg-white text-xs" value={editSub.name} onChange={e => setEditSub({ ...editSub, name: e.target.value })} />
            </div>
            <div>
              <Label className="text-stone-600">Email</Label>
              <Input className="mt-1 bg-white text-xs" value={editSub.email} onChange={e => setEditSub({ ...editSub, email: e.target.value })} />
            </div>
            <div>
              <Label className="text-stone-600">Tags (comma separated)</Label>
              <Input className="mt-1 bg-white text-xs" value={editSub.tags} onChange={e => setEditSub({ ...editSub, tags: e.target.value })} />
            </div>
            <label className="flex items-start gap-2 text-xs text-stone-600 pt-1">
              <Checkbox checked={editSub.whatsappOptIn} onCheckedChange={v => setEditSub({ ...editSub, whatsappOptIn: v === true })} />
              <span>WhatsApp Opted In</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={busy} onClick={handleEditSubscriber}>
                {busy ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import CSV Modal */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="w-[96vw] sm:max-w-2xl">
          <DialogHeader><DialogTitle className="text-base font-bold">Import Subscribers from CSV</DialogTitle></DialogHeader>
          <div className="space-y-3 text-xs">
            <p className="text-stone-500">
              Needs a <code className="font-mono">phone</code> column. Optional: <code className="font-mono">name</code>, <code className="font-mono">email</code>.
            </p>
            <Textarea
              className="min-h-[160px] font-mono text-xs"
              placeholder={"phone,name,email\n+96891234567,Ahmed,ahmed@example.com"}
              value={importCsv}
              onChange={e => setImportCsv(e.target.value)}
            />
            <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <Checkbox checked={importOptIn} onCheckedChange={v => setImportOptIn(v === true)} className="mt-0.5" />
              <span className="text-amber-800">
                <span className="font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Mark these contacts as opted in
                </span>
                Only tick this if you hold recorded consent for every number in the file.
              </span>
            </label>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
              <Button onClick={runImport} disabled={busy || !importCsv.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {busy ? "Importing…" : "Import CSV"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
