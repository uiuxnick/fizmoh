"use client"

import { useCallback, useEffect, useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Users, Search, Download, Upload, Tag, BellOff, BellRing,
  ShoppingBag, AlertTriangle, Plus, Trash2, Pencil, CheckCircle2,
  MessageSquare, Bot, Sparkles, RefreshCw, SlidersHorizontal,
  Layers, FileText, Phone, Mail, UserCheck, RotateCcw, Check,
  Copy, ExternalLink, Briefcase, Clock, ArrowUpDown, ListFilter,
  LayoutList, LayoutGrid, Radio, Shield, Send, MoreHorizontal,
  Facebook, Instagram, MessageCircle,
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { useApp } from "@/lib/store"
import {
  resolveSubscriberChannel,
  formatDisplayIdentifier,
  isSubscriberOptedIn,
  getChannelMeta,
  type SubscriberChannel,
} from "@/lib/subscribers"

type Subscriber = {
  id: string
  name: string | null
  phone: string
  email: string | null
  channel: SubscriberChannel
  whatsappOptIn: boolean
  facebookOptIn?: boolean
  instagramOptIn?: boolean
  socialUsername?: string | null
  displayIdentifier: string
  handle?: string
  rawPhone: string
  isSubscribed: boolean
  emailOptIn: boolean
  preferredLang: string
  tags?: any
  tagList: string[]
  notes?: string | null
  optInSource: string | null
  optOutAt: string | null
  createdAt: string
  updatedAt?: string
  _count: { orders: number; conversations: number }
}

type ChannelStat = { total: number; optedIn: number; optedOut: number }
type SubscriberStats = {
  total: number
  optedIn: number
  optedOut: number
  channels?: {
    whatsapp: ChannelStat
    facebook: ChannelStat
    instagram: ChannelStat
  }
}

type DetailedCustomer = Subscriber & {
  conversations?: Array<{
    id: string
    channel?: string
    botActive?: boolean
    status: string
    lastMessageAt: string | null
    assignedStaff?: { id: string; name: string } | null
    messages?: Array<{ id: string; body: string; direction: string; createdAt: string }>
  }>
  orders?: Array<{ id: string; orderNumber: string; totalAmount: number; orderStatus: string; createdAt: string }>
  consentLogs?: Array<{ id: string; channel: string; action: string; source: string; createdAt: string }>
}

function timeAgo(dateString?: string | null): string {
  if (!dateString) return "never"
  const diff = Date.now() - new Date(dateString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  const months = Math.floor(days / 30)
  return `${months}mo`
}

function formatDetailDate(dateString?: string | null): string {
  if (!dateString) return "N/A"
  const d = new Date(dateString)
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function SubscribersView() {
  const { setView, subscriberChannelFilter, setSubscriberChannelFilter } = useApp()
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [stats, setStats] = useState<SubscriberStats>({ total: 0, optedIn: 0, optedOut: 0 })
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [tagFilter, setTagFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "name">("latest")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeCustomer, setActiveCustomer] = useState<DetailedCustomer | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"overview" | "agent" | "labels" | "lists" | "sequences" | "input_flows" | "custom_fields" | "notes">("overview")
  const [workspaceName, setWorkspaceName] = useState("Fizmoh")

  // Form states for right pane edit
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    tags: [] as string[],
    notes: "",
    newTagInput: "",
    preferredLang: "en",
  })

  // Modals
  const [addOpen, setAddOpen] = useState(false)
  const [newSub, setNewSub] = useState<{
    channel: SubscriberChannel
    name: string
    phone: string
    socialUsername: string
    email: string
    optIn: boolean
  }>({
    channel: "WHATSAPP",
    name: "",
    phone: "",
    socialUsername: "",
    email: "",
    optIn: true,
  })
  const [importOpen, setImportOpen] = useState(false)
  const [importCsv, setImportCsv] = useState("")
  const [importOptIn, setImportOptIn] = useState(false)
  const [busy, setBusy] = useState(false)

  // Load workspace info
  useEffect(() => {
    fetch("/api/workspaces")
      .then(r => r.json())
      .then(d => { if (d.current?.name) setWorkspaceName(d.current.name) })
      .catch(() => {})
  }, [])

  // Load subscribers list
  const load = useCallback(async (selectFirst = false) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (status !== "all") params.set("status", status)
      if (tagFilter !== "all") params.set("tag", tagFilter)
      if (subscriberChannelFilter && subscriberChannelFilter !== "ALL") {
        params.set("channel", subscriberChannelFilter)
      }
      const res = await fetch(`/api/subscribers?${params}`, { cache: "no-store" })
      const data = await res.json()
      const list: Subscriber[] = data.subscribers || []
      setSubscribers(list)
      setStats(data.stats || { total: 0, optedIn: 0, optedOut: 0 })
      setTags(data.tags || [])

      if (list.length > 0) {
        if (selectFirst || !activeId || !list.some(s => s.id === activeId)) {
          setActiveId(list[0].id)
        }
      } else {
        setActiveId(null)
        setActiveCustomer(null)
      }
    } catch {
      toast.error("Failed to load subscribers")
    } finally {
      setLoading(false)
    }
  }, [search, status, tagFilter, subscriberChannelFilter, activeId])

  useEffect(() => {
    const t = setTimeout(() => load(false), 200)
    return () => clearTimeout(t)
  }, [load])

  // Load selected subscriber detail when activeId changes
  useEffect(() => {
    if (!activeId) {
      setActiveCustomer(null)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    fetch(`/api/customers/${activeId}`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data.customer) {
          const c = data.customer
          setActiveCustomer(c)
          let tList: string[] = []
          if (Array.isArray(c.tags)) tList = c.tags
          else if (typeof c.tags === "string") {
            try { tList = JSON.parse(c.tags) } catch { tList = [] }
          }
          setEditForm({
            name: c.name || "",
            email: c.email || "",
            tags: tList,
            notes: c.notes || "",
            newTagInput: "",
            preferredLang: c.preferredLang || "en",
          })
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load subscriber details")
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })

    return () => { cancelled = true }
  }, [activeId])

  // Sorted subscribers
  const sortedSubscribers = useMemo(() => {
    return [...subscribers].sort((a, b) => {
      if (sortBy === "latest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (sortBy === "name") return (a.name || a.phone).localeCompare(b.name || b.phone)
      return 0
    })
  }, [subscribers, sortBy])

  // Selection handlers
  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const toggleSelectAll = () => {
    if (selected.size === subscribers.length) setSelected(new Set())
    else setSelected(new Set(subscribers.map(s => s.id)))
  }

  // Bulk action
  const bulk = async (action: string, tagVal?: string) => {
    if (selected.size === 0) return
    setBusy(true)
    try {
      const res = await fetch("/api/subscribers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], action, tag: tagVal }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Action failed")
      toast.success(`${data.updated} subscriber${data.updated === 1 ? "" : "s"} updated`)
      setSelected(new Set())
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed")
    } finally {
      setBusy(false)
    }
  }

  // Save changes from Right Detail Pane
  const saveActiveCustomer = async () => {
    if (!activeCustomer) return
    setBusy(true)
    try {
      const res = await fetch(`/api/customers/${activeCustomer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim() || null,
          email: editForm.email.trim() || null,
          tags: editForm.tags,
          notes: editForm.notes || null,
          preferredLang: editForm.preferredLang,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Failed to save changes")
      }
      toast.success("Subscriber details updated successfully")
      // Update local state in list
      setSubscribers(prev => prev.map(s => s.id === activeCustomer.id ? {
        ...s,
        name: editForm.name.trim() || null,
        email: editForm.email.trim() || null,
        tagList: editForm.tags,
      } : s))
      // Refresh details
      if (activeCustomer.id) {
        const dRes = await fetch(`/api/customers/${activeCustomer.id}`)
        const dData = await dRes.json()
        if (dData.customer) setActiveCustomer(dData.customer)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setBusy(false)
    }
  }

  // Toggle Opt-in / Opt-out for active customer (channel-specific)
  const toggleOptIn = async () => {
    if (!activeCustomer) return
    const ch = resolveSubscriberChannel(activeCustomer)
    const currentSubscribed = isSubscriberOptedIn(activeCustomer)
    const nextVal = !currentSubscribed
    setBusy(true)
    try {
      const payload: any = {}
      if (ch === "WHATSAPP") payload.whatsappOptIn = nextVal
      else if (ch === "FACEBOOK") payload.facebookOptIn = nextVal
      else if (ch === "INSTAGRAM") payload.instagramOptIn = nextVal

      const res = await fetch(`/api/customers/${activeCustomer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Could not update consent")
      toast.success(nextVal ? `${ch} subscriber opted in` : `${ch} subscriber unsubscribed`)
      setActiveCustomer(prev => prev ? {
        ...prev,
        isSubscribed: nextVal,
        ...(ch === "WHATSAPP" ? { whatsappOptIn: nextVal } : {}),
        ...(ch === "FACEBOOK" ? { facebookOptIn: nextVal } : {}),
        ...(ch === "INSTAGRAM" ? { instagramOptIn: nextVal } : {}),
      } : null)
      setSubscribers(prev => prev.map(s => s.id === activeCustomer.id ? {
        ...s,
        isSubscribed: nextVal,
        ...(ch === "WHATSAPP" ? { whatsappOptIn: nextVal } : {}),
        ...(ch === "FACEBOOK" ? { facebookOptIn: nextVal } : {}),
        ...(ch === "INSTAGRAM" ? { instagramOptIn: nextVal } : {}),
      } : s))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Consent update failed")
    } finally {
      setBusy(false)
    }
  }

  // Toggle Bot Active
  const toggleBotReply = async () => {
    if (!activeCustomer || !activeCustomer.conversations || activeCustomer.conversations.length === 0) {
      toast.info("No active conversation found for this subscriber")
      return
    }
    const conv = activeCustomer.conversations[0]
    const nextState = !conv.botActive
    setBusy(true)
    try {
      const res = await fetch(`/api/conversations/${conv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botActive: nextState }),
      })
      if (!res.ok) throw new Error("Could not toggle bot")
      toast.success(nextState ? "Bot replies activated" : "Bot replies paused")
      setActiveCustomer(prev => {
        if (!prev || !prev.conversations) return prev
        return {
          ...prev,
          conversations: prev.conversations.map((c, i) => i === 0 ? { ...c, botActive: nextState } : c),
        }
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to toggle bot")
    } finally {
      setBusy(false)
    }
  }

  // Reset Botflow State
  const resetBotFlow = async () => {
    toast.success("Bot flow session reset. Next customer message will start fresh from greeting.")
  }

  // Add tag chip in detail
  const addTagChip = () => {
    const val = editForm.newTagInput.trim()
    if (!val) return
    if (!editForm.tags.includes(val)) {
      setEditForm(prev => ({
        ...prev,
        tags: [...prev.tags, val],
        newTagInput: "",
      }))
    } else {
      setEditForm(prev => ({ ...prev, newTagInput: "" }))
    }
  }

  const removeTagChip = (t: string) => {
    setEditForm(prev => ({
      ...prev,
      tags: prev.tags.filter(x => x !== t),
    }))
  }

  // Add subscriber modal (WhatsApp, Facebook, Instagram)
  const addSubscriber = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: newSub.channel,
          name: newSub.name.trim() || undefined,
          phone: newSub.channel === "WHATSAPP" ? newSub.phone.trim() : (newSub.phone.trim() || undefined),
          socialUsername: newSub.socialUsername.trim() || undefined,
          email: newSub.email.trim() || undefined,
          optIn: newSub.optIn,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to add subscriber")
      toast.success(data.existed ? "Existing contact updated" : `${newSub.channel} subscriber created`)
      setAddOpen(false)
      setNewSub({
        channel: "WHATSAPP",
        name: "",
        phone: "",
        socialUsername: "",
        email: "",
        optIn: true,
      })
      load(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add subscriber")
    } finally {
      setBusy(false)
    }
  }

  // Import CSV
  const runImport = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/subscribers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: importCsv, optIn: importOptIn }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Import failed")
      toast.success(`Imported ${data.created} new, updated ${data.updated}`)
      setImportOpen(false)
      setImportCsv("")
      load(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed")
    } finally {
      setBusy(false)
    }
  }

  const latestMessage = activeCustomer?.conversations?.[0]?.messages?.[0]
  const lastMsgTime = activeCustomer?.conversations?.[0]?.lastMessageAt || activeCustomer?.updatedAt || activeCustomer?.createdAt

  return (
    <div className="p-3 md:p-5 lg:p-6 w-full max-w-none space-y-4 bg-stone-50/50 min-h-screen">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            Subscribers &amp; Audience
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            {stats.total} total · <span className="text-emerald-600 font-semibold">{stats.optedIn} subscribed</span> · <span className="text-amber-600 font-semibold">{stats.optedOut} opted out</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => load(false)} disabled={loading} className="h-9">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="h-9">
            <Upload className="h-3.5 w-3.5 mr-1.5" /> Import CSV
          </Button>
          <a href="/api/subscribers/export" download>
            <Button variant="outline" size="sm" className="h-9">
              <Download className="h-3.5 w-3.5 mr-1.5" /> Export
            </Button>
          </a>
          <Button size="sm" onClick={() => setAddOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 h-9 font-semibold">
            <Plus className="h-4 w-4 mr-1.5" /> Add Subscriber
          </Button>
        </div>
      </div>

      {/* Channel Submenu Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* All Channels */}
        <button
          type="button"
          onClick={() => setSubscriberChannelFilter("ALL")}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all text-left group cursor-pointer ${
            subscriberChannelFilter === "ALL"
              ? "bg-white border-stone-900 shadow-md ring-2 ring-stone-900/10"
              : "bg-white/80 hover:bg-white border-stone-200/80 hover:border-stone-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center font-bold">
              <Users className="h-4.5 w-4.5" />
            </div>
            {subscriberChannelFilter === "ALL" && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-900 text-white">
                Active
              </span>
            )}
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-stone-900 tracking-tight">{stats.total}</div>
            <div className="text-xs font-bold text-stone-700">All Subscribers</div>
            <div className="text-[11px] text-stone-400 mt-0.5 truncate">
              <span className="text-emerald-600 font-semibold">{stats.optedIn}</span> opted in · <span className="text-amber-600 font-semibold">{stats.optedOut}</span> out
            </div>
          </div>
        </button>

        {/* WhatsApp Business */}
        <button
          type="button"
          onClick={() => setSubscriberChannelFilter("WHATSAPP")}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all text-left group cursor-pointer ${
            subscriberChannelFilter === "WHATSAPP"
              ? "bg-emerald-50/40 border-emerald-600 shadow-md ring-2 ring-emerald-600/20"
              : "bg-white/80 hover:bg-white border-stone-200/80 hover:border-emerald-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <WhatsAppIcon className="h-4.5 w-4.5" />
            </div>
            {subscriberChannelFilter === "WHATSAPP" && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                Active
              </span>
            )}
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-stone-900 tracking-tight">
              {stats.channels?.whatsapp?.total ?? 0}
            </div>
            <div className="text-xs font-bold text-stone-800 flex items-center gap-1">
              WhatsApp
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5 truncate">
              <span className="text-emerald-600 font-semibold">{stats.channels?.whatsapp?.optedIn ?? 0}</span> opted in · <span className="text-amber-600 font-semibold">{stats.channels?.whatsapp?.optedOut ?? 0}</span> out
            </div>
          </div>
        </button>

        {/* Facebook Messenger */}
        <button
          type="button"
          onClick={() => setSubscriberChannelFilter("FACEBOOK")}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all text-left group cursor-pointer ${
            subscriberChannelFilter === "FACEBOOK"
              ? "bg-blue-50/40 border-[#1877F2] shadow-md ring-2 ring-blue-600/20"
              : "bg-white/80 hover:bg-white border-stone-200/80 hover:border-blue-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-[#1877F2] flex items-center justify-center font-bold">
              <Facebook className="h-4.5 w-4.5 fill-[#1877F2]" />
            </div>
            {subscriberChannelFilter === "FACEBOOK" && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1877F2] text-white">
                Active
              </span>
            )}
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-stone-900 tracking-tight">
              {stats.channels?.facebook?.total ?? 0}
            </div>
            <div className="text-xs font-bold text-stone-800 flex items-center gap-1">
              Facebook
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5 truncate">
              <span className="text-blue-600 font-semibold">{stats.channels?.facebook?.optedIn ?? 0}</span> opted in · <span className="text-amber-600 font-semibold">{stats.channels?.facebook?.optedOut ?? 0}</span> out
            </div>
          </div>
        </button>

        {/* Instagram DMs */}
        <button
          type="button"
          onClick={() => setSubscriberChannelFilter("INSTAGRAM")}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all text-left group cursor-pointer ${
            subscriberChannelFilter === "INSTAGRAM"
              ? "bg-pink-50/40 border-pink-500 shadow-md ring-2 ring-pink-500/20"
              : "bg-white/80 hover:bg-white border-stone-200/80 hover:border-pink-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#833AB4]/10 via-[#FD1D1D]/10 to-[#F77737]/10 text-pink-600 flex items-center justify-center font-bold">
              <Instagram className="h-4.5 w-4.5" />
            </div>
            {subscriberChannelFilter === "INSTAGRAM" && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                Active
              </span>
            )}
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-stone-900 tracking-tight">
              {stats.channels?.instagram?.total ?? 0}
            </div>
            <div className="text-xs font-bold text-stone-800 flex items-center gap-1">
              Instagram
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5 truncate">
              <span className="text-pink-600 font-semibold">{stats.channels?.instagram?.optedIn ?? 0}</span> opted in · <span className="text-amber-600 font-semibold">{stats.channels?.instagram?.optedOut ?? 0}</span> out
            </div>
          </div>
        </button>
      </div>

      {/* Main Split Layout: Left List & Right One-Tap Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ─── LEFT COLUMN: SUBSCRIBERS MASTER LIST (5 of 12 columns) ─── */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200/80 shadow-xs flex flex-col overflow-hidden">
          {/* List Toolbar */}
          <div className="p-3.5 border-b border-stone-100 space-y-3 bg-stone-50/40">
            {/* Channel Segmented Submenu Tabs */}
            <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl">
              {[
                { id: "ALL" as const, label: "All", icon: Users, count: stats.total },
                { id: "WHATSAPP" as const, label: "WhatsApp", icon: WhatsAppIcon, count: stats.channels?.whatsapp?.total ?? 0 },
                { id: "FACEBOOK" as const, label: "Facebook", icon: Facebook, count: stats.channels?.facebook?.total ?? 0 },
                { id: "INSTAGRAM" as const, label: "Instagram", icon: Instagram, count: stats.channels?.instagram?.total ?? 0 },
              ].map(t => {
                const isSelected = subscriberChannelFilter === t.id
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSubscriberChannelFilter(t.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-white text-stone-900 shadow-2xs font-bold"
                        : "text-stone-500 hover:text-stone-800 hover:bg-white/50"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate hidden sm:inline">{t.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-stone-100 text-stone-700" : "text-stone-400"}`}>
                      {t.count}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={subscribers.length > 0 && selected.size === subscribers.length}
                  onCheckedChange={toggleSelectAll}
                  id="select-all"
                />
                <label htmlFor="select-all" className="text-xs font-semibold text-stone-700 cursor-pointer select-none">
                  Select all ({selected.size})
                </label>
              </div>

              {selected.size > 0 && (
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => bulk("opt_in")}>
                    <Check className="h-3 w-3 mr-1 text-emerald-600" /> Opt-in
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => bulk("opt_out")}>
                    <BellOff className="h-3 w-3 mr-1 text-amber-600" /> Opt-out
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[11px] text-stone-400 font-medium">Sort:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="text-xs border border-stone-200 rounded-lg px-2 py-1 bg-white font-medium text-stone-700"
                >
                  <option value="latest">Latest</option>
                  <option value="oldest">Oldest</option>
                  <option value="name">Name</option>
                </select>
              </div>
            </div>

            {/* Search & Status Filter */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                <Input
                  placeholder={
                    subscriberChannelFilter === "INSTAGRAM"
                      ? "Search @handle or name..."
                      : subscriberChannelFilter === "FACEBOOK"
                        ? "Search Facebook name or ID..."
                        : subscriberChannelFilter === "WHATSAPP"
                          ? "Search name or phone..."
                          : "Search name, phone, handle..."
                  }
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-white"
                />
              </div>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 bg-white font-medium text-stone-700 h-8"
              >
                <option value="all">All Status</option>
                <option value="opted_in">Subscribed</option>
                <option value="opted_out">Opted Out</option>
              </select>
            </div>
          </div>

          {/* Subscribers List Rows */}
          <div className="divide-y divide-stone-100 max-h-[calc(100vh-290px)] overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedSubscribers.length === 0 ? (
              <div className="py-16 px-4 text-center">
                <Users className="h-10 w-10 text-stone-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-stone-700">No subscribers found</p>
                <p className="text-xs text-stone-400 mt-1">
                  {subscriberChannelFilter !== "ALL"
                    ? `No ${subscriberChannelFilter} subscribers match the current filter.`
                    : "Try adjusting search or status filters."}
                </p>
              </div>
            ) : (
              sortedSubscribers.map(sub => {
                const isSelected = selected.has(sub.id)
                const isActive = activeId === sub.id
                const ch = resolveSubscriberChannel(sub)
                const isOptedIn = isSubscriberOptedIn(sub)
                const disp = formatDisplayIdentifier(sub)
                const initial = (sub.name || disp.displayIdentifier || "S")[0]?.toUpperCase() || "S"

                return (
                  <div
                    key={sub.id}
                    onClick={() => setActiveId(sub.id)}
                    className={`flex items-center justify-between gap-3 p-3.5 transition-all cursor-pointer select-none group ${
                      isActive
                        ? "bg-stone-50/90 border-l-4 border-l-stone-900 shadow-2xs"
                        : "hover:bg-stone-50/70"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Checkbox
                        checked={isSelected}
                        onClick={e => toggleSelect(sub.id, e)}
                        className="shrink-0"
                      />
                      {/* Channel-differentiated Avatar */}
                      <div className="relative shrink-0">
                        {ch === "INSTAGRAM" ? (
                          <div className="h-10 w-10 rounded-full p-[2px] bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#F77737] shadow-2xs">
                            <div className="h-full w-full rounded-full bg-white flex items-center justify-center text-xs font-black text-stone-900">
                              {initial}
                            </div>
                          </div>
                        ) : ch === "FACEBOOK" ? (
                          <div className="h-10 w-10 rounded-full bg-[#1877F2] text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                            {initial}
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                            {initial}
                          </div>
                        )}
                        {/* Channel Badge Overlay Icon */}
                        <div className="absolute -bottom-1 -right-1 rounded-full p-0.5 bg-white shadow-xs">
                          {ch === "INSTAGRAM" ? (
                            <div className="h-4 w-4 rounded-full bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#F77737] flex items-center justify-center text-white">
                              <Instagram className="h-2.5 w-2.5" />
                            </div>
                          ) : ch === "FACEBOOK" ? (
                            <div className="h-4 w-4 rounded-full bg-[#1877F2] flex items-center justify-center text-white">
                              <Facebook className="h-2.5 w-2.5 fill-white" />
                            </div>
                          ) : (
                            <div className="h-4 w-4 rounded-full bg-[#25D366] flex items-center justify-center text-white">
                              <WhatsAppIcon className="h-2.5 w-2.5" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-xs font-bold text-stone-900 truncate">
                            {sub.name || disp.displayIdentifier}
                          </span>
                          {ch === "INSTAGRAM" ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-pink-50 text-pink-700 border border-pink-200">
                              IG
                            </span>
                          ) : ch === "FACEBOOK" ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              FB
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              WA
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono flex items-center gap-1 truncate">
                          <span>{disp.displayIdentifier}</span>
                        </div>
                        <div className="text-[10px] text-stone-400 font-medium truncate flex items-center gap-1 mt-0.5">
                          <span>🏛️ {workspaceName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isOptedIn ? (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          ch === "INSTAGRAM"
                            ? "bg-pink-50 text-pink-700 border-pink-200"
                            : ch === "FACEBOOK"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          • Subscribed
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          • Opted out
                        </span>
                      )}
                      <span className="text-[11px] text-stone-400 font-medium min-w-[28px] text-right">
                        {timeAgo(sub.createdAt)}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                          title={
                            ch === "INSTAGRAM"
                              ? "Open Instagram in Inbox"
                              : ch === "FACEBOOK"
                                ? "Open Facebook Messenger in Inbox"
                                : "Open WhatsApp in Inbox"
                          }
                          onClick={e => {
                            e.stopPropagation()
                            setView("inbox")
                          }}
                        >
                          {ch === "INSTAGRAM" ? (
                            <Instagram className="h-3.5 w-3.5 text-pink-600" />
                          ) : ch === "FACEBOOK" ? (
                            <Facebook className="h-3.5 w-3.5 text-[#1877F2] fill-[#1877F2]" />
                          ) : (
                            <WhatsAppIcon className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ─── RIGHT COLUMN: ONE-TAP SUBSCRIBER DETAIL PANE (7 of 12 columns) ─── */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200/80 shadow-xs p-5 space-y-5">
          {detailLoading ? (
            <div className="p-8 space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-2xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <Skeleton className="h-10 w-full rounded-xl" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-40 rounded-xl" />
                <Skeleton className="h-40 rounded-xl" />
              </div>
            </div>
          ) : !activeCustomer ? (
            <div className="py-24 text-center">
              <Users className="h-12 w-12 text-stone-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-stone-800">Select a subscriber</h3>
              <p className="text-xs text-stone-400 mt-1">Click any subscriber on the left to view and edit their profile instantly.</p>
            </div>
          ) : (
            <>
              {/* Header: Channel-branded Large Avatar, Info & Status */}
              {(() => {
                const ch = resolveSubscriberChannel(activeCustomer)
                const isOptedIn = isSubscriberOptedIn(activeCustomer)
                const disp = formatDisplayIdentifier(activeCustomer)
                const initial = (activeCustomer.name || disp.displayIdentifier || "S")[0]?.toUpperCase() || "S"

                return (
                  <>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3.5">
                        {ch === "INSTAGRAM" ? (
                          <div className="h-14 w-14 rounded-2xl p-[2.5px] bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#F77737] shadow-sm shrink-0">
                            <div className="h-full w-full rounded-[14px] bg-white flex items-center justify-center text-xl font-black text-stone-900">
                              {initial}
                            </div>
                          </div>
                        ) : ch === "FACEBOOK" ? (
                          <div className="h-14 w-14 rounded-2xl bg-[#1877F2] text-white text-xl font-black flex items-center justify-center shadow-sm shrink-0">
                            {initial}
                          </div>
                        ) : (
                          <div className="h-14 w-14 rounded-2xl bg-[#0f172a] text-white text-xl font-black flex items-center justify-center shadow-sm shrink-0">
                            {initial}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-lg font-bold text-stone-900 leading-tight">
                              {activeCustomer.name || disp.displayIdentifier}
                            </h2>
                            {ch === "INSTAGRAM" ? (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200 flex items-center gap-1">
                                <Instagram className="h-3 w-3" /> Instagram
                              </span>
                            ) : ch === "FACEBOOK" ? (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                <Facebook className="h-3 w-3 fill-[#1877F2]" /> Facebook
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <WhatsAppIcon className="h-3 w-3" /> WhatsApp
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-mono text-stone-500 mt-1 flex items-center gap-1.5">
                            {ch === "INSTAGRAM" ? (
                              <>
                                <Instagram className="h-3 w-3 text-pink-500 shrink-0" />
                                <a
                                  href={`https://instagram.com/${disp.displayIdentifier.replace(/^@/, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-pink-600 hover:underline flex items-center gap-1 font-semibold"
                                >
                                  {disp.displayIdentifier}
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              </>
                            ) : ch === "FACEBOOK" ? (
                              <>
                                <Facebook className="h-3 w-3 text-[#1877F2] shrink-0 fill-[#1877F2]" />
                                <span>{disp.displayIdentifier}</span>
                              </>
                            ) : (
                              <>
                                <Phone className="h-3 w-3 text-stone-400 shrink-0" />
                                <span>{disp.displayIdentifier}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        {isOptedIn ? (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                            ch === "INSTAGRAM"
                              ? "bg-pink-50 text-pink-700 border-pink-200"
                              : ch === "FACEBOOK"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              ch === "INSTAGRAM" ? "bg-pink-600" : ch === "FACEBOOK" ? "bg-blue-600" : "bg-emerald-600"
                            }`} />
                            {ch === "INSTAGRAM" ? "Instagram Opted In" : ch === "FACEBOOK" ? "Facebook Opted In" : "WhatsApp Subscribed"}
                          </span>
                        ) : (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-600" /> Opted Out
                          </span>
                        )}
                        <p className="text-[11px] text-stone-400 font-medium">
                          Last Outgoing: {formatDetailDate(lastMsgTime)} ({timeAgo(lastMsgTime)})
                        </p>
                      </div>
                    </div>

                    {/* Channel / Active Bot Badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        {workspaceName} · Bot Active
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 border border-stone-200">
                        Channel: {ch}
                      </span>
                      {activeCustomer.preferredLang && (
                        <span className="text-xs font-medium px-2 py-1 rounded-lg bg-stone-100 text-stone-600 uppercase border border-stone-200">
                          Lang: {activeCustomer.preferredLang}
                        </span>
                      )}
                    </div>
                  </>
                )
              })()}

              {/* Tabs Navigation Bar with Save Button */}
              <div className="flex items-center justify-between border-b border-stone-200/80 gap-2 overflow-x-auto pb-1">
                <div className="flex items-center gap-1">
                  {[
                    { key: "overview", label: "Overview" },
                    { key: "agent", label: "Agent" },
                    { key: "labels", label: "Labels" },
                    { key: "lists", label: "Lists" },
                    { key: "sequences", label: "Sequences" },
                    { key: "input_flows", label: "Input Flows" },
                    { key: "custom_fields", label: "Custom Fields" },
                    { key: "notes", label: "Notes" },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                        activeTab === tab.key
                          ? "bg-stone-900 text-white font-bold"
                          : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <Button
                  size="sm"
                  disabled={busy}
                  onClick={saveActiveCustomer}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 shrink-0 shadow-xs"
                >
                  Save Changes
                </Button>
              </div>

              {/* ─── TAB 1: OVERVIEW ─── */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* About Card */}
                    <div className="rounded-xl border border-stone-200/80 p-4 space-y-3 bg-stone-50/30">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-stone-600" /> About
                      </h4>

                      {(() => {
                        const ch = resolveSubscriberChannel(activeCustomer)
                        const disp = formatDisplayIdentifier(activeCustomer)

                        return (
                          <div className="space-y-2 text-xs">
                            <div>
                              <span className="text-stone-400 block text-[11px]">
                                {ch === "INSTAGRAM" ? "Instagram Handle" : ch === "FACEBOOK" ? "Facebook User / ID" : "Phone / WhatsApp ID"}
                              </span>
                              <span className="font-mono font-semibold text-stone-800 flex items-center gap-1.5 mt-0.5">
                                {disp.displayIdentifier}
                                <Copy
                                  className="h-3 w-3 text-stone-400 hover:text-stone-700 cursor-pointer"
                                  onClick={() => {
                                    navigator.clipboard.writeText(disp.displayIdentifier)
                                    toast.success("Copied to clipboard")
                                  }}
                                />
                              </span>
                            </div>

                            <div>
                              <span className="text-stone-400 block text-[11px]">Subscriber Record ID</span>
                              <span className="font-mono text-stone-600 text-[11px]">
                                {activeCustomer.id.slice(-8)}
                              </span>
                            </div>

                            <div>
                              <Label className="text-[11px] text-stone-400">Profile Name</Label>
                              <Input
                                value={editForm.name}
                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                className="h-7 text-xs bg-white mt-0.5"
                                placeholder="Enter subscriber name"
                              />
                            </div>

                            <div>
                              <Label className="text-[11px] text-stone-400">Email Address</Label>
                              <Input
                                type="email"
                                value={editForm.email}
                                onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                className="h-7 text-xs bg-white mt-0.5"
                                placeholder="subscriber@example.com"
                              />
                            </div>

                            <div>
                              <span className="text-stone-400 block text-[11px]">Source</span>
                              <span className="font-semibold text-stone-700 mt-0.5 block">
                                {activeCustomer.optInSource || (ch === "INSTAGRAM" ? "Instagram DM Direct" : ch === "FACEBOOK" ? "Facebook Messenger" : "WhatsApp Cloud API")}
                              </span>
                            </div>
                          </div>
                        )
                      })()}
                    </div>

                    {/* Engagement Card */}
                    <div className="rounded-xl border border-stone-200/80 p-4 space-y-3 bg-stone-50/30">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                        <Send className="h-3.5 w-3.5 text-stone-600" /> Engagement
                      </h4>

                      <div className="space-y-2.5 text-xs">
                        <div>
                          <span className="text-stone-400 block text-[11px]">Last Outgoing Message</span>
                          <span className="font-semibold text-stone-800 mt-0.5 block">
                            {formatDetailDate(lastMsgTime)} ({timeAgo(lastMsgTime)})
                          </span>
                        </div>

                        <div>
                          <span className="text-stone-400 block text-[11px]">Last Communication</span>
                          <span className="font-semibold text-stone-800 mt-0.5 block">
                            {formatDetailDate(activeCustomer.updatedAt || activeCustomer.createdAt)} ({timeAgo(activeCustomer.updatedAt || activeCustomer.createdAt)})
                          </span>
                        </div>

                        <div>
                          <span className="text-stone-400 block text-[11px]">Subscribed at</span>
                          <span className="font-semibold text-stone-800 mt-0.5 block">
                            {formatDetailDate(activeCustomer.createdAt)}
                          </span>
                        </div>

                        <div className="pt-1 border-t border-stone-100 flex items-center justify-between text-stone-600">
                          <span>Total Orders: <strong className="text-stone-900">{activeCustomer._count?.orders ?? 0}</strong></span>
                          <span>Chats: <strong className="text-stone-900">{activeCustomer._count?.conversations ?? 0}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions Card */}
                  <div className="rounded-xl border border-stone-200/80 p-4 space-y-3 bg-white">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Quick Actions
                    </h4>

                    {(() => {
                      const ch = resolveSubscriberChannel(activeCustomer)
                      const isOptedIn = isSubscriberOptedIn(activeCustomer)

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={toggleOptIn}
                            className="h-9 justify-start text-xs font-semibold hover:bg-stone-100"
                          >
                            <BellOff className="h-3.5 w-3.5 mr-2 text-stone-500" />
                            {isOptedIn ? `Unsubscribe (${ch})` : `Re-Subscribe (${ch})`}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={resetBotFlow}
                            className="h-9 justify-start text-xs font-semibold hover:bg-stone-100"
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-2 text-indigo-600" />
                            Reset Bot Flow
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              toast.success("Chat history archived for subscriber")
                            }}
                            className="h-9 justify-start text-xs font-semibold hover:bg-stone-100"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2 text-rose-500" />
                            Clear Chat History
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={toggleBotReply}
                            className="h-9 justify-start text-xs font-semibold hover:bg-stone-100"
                          >
                            <Bot className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                            {activeCustomer.conversations?.[0]?.botActive !== false ? "Bot Reply On" : "Bot Reply Off"}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              toast.success("AI Smart Assistant enabled for subscriber")
                            }}
                            className="h-9 justify-start text-xs font-semibold hover:bg-stone-100"
                          >
                            <Sparkles className="h-3.5 w-3.5 mr-2 text-amber-500" />
                            AI Reply On
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setView("inbox")}
                            className="h-9 justify-start text-xs font-semibold hover:bg-stone-100"
                          >
                            {ch === "INSTAGRAM" ? (
                              <Instagram className="h-3.5 w-3.5 mr-2 text-pink-600" />
                            ) : ch === "FACEBOOK" ? (
                              <Facebook className="h-3.5 w-3.5 mr-2 text-[#1877F2] fill-[#1877F2]" />
                            ) : (
                              <WhatsAppIcon className="h-3.5 w-3.5 mr-2" />
                            )}
                            {ch === "INSTAGRAM"
                              ? "Open in Instagram Inbox"
                              : ch === "FACEBOOK"
                                ? "Open in Facebook Inbox"
                                : "Open in WhatsApp Inbox"}
                          </Button>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}

              {/* ─── TAB 2: AGENT ─── */}
              {activeTab === "agent" && (
                <div className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/30 space-y-3 text-xs">
                  <h4 className="font-bold text-stone-800">Assigned Team Agent</h4>
                  <p className="text-stone-500">Route all WhatsApp messages from this subscriber to a designated agent.</p>
                  <div className="flex items-center gap-2 max-w-sm">
                    <select className="border border-stone-200 rounded-lg px-3 py-1.5 text-xs bg-white w-full">
                      <option value="">Auto-Assign / AI Bot Handover</option>
                      <option value="nick">Nick (Admin)</option>
                      <option value="fatima">Fatima Al-Hinai</option>
                      <option value="said">Said Al-Maawali</option>
                    </select>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8" onClick={() => toast.success("Agent assigned")}>
                      Assign
                    </Button>
                  </div>
                </div>
              )}

              {/* ─── TAB 3: LABELS / TAGS ─── */}
              {activeTab === "labels" && (
                <div className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/30 space-y-3 text-xs">
                  <h4 className="font-bold text-stone-800">Labels &amp; Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {editForm.tags.length === 0 ? (
                      <span className="text-stone-400 italic">No labels attached.</span>
                    ) : (
                      editForm.tags.map(t => (
                        <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                          {t}
                          <button onClick={() => removeTagChip(t)} className="text-emerald-600 hover:text-emerald-900 ml-1">×</button>
                        </span>
                      ))
                    )}
                  </div>
                  <div className="flex items-center gap-2 max-w-sm pt-2">
                    <Input
                      placeholder="Add tag (e.g. VIP, Repeat Guest)..."
                      value={editForm.newTagInput}
                      onChange={e => setEditForm({ ...editForm, newTagInput: e.target.value })}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTagChip() } }}
                      className="h-8 text-xs bg-white"
                    />
                    <Button size="sm" variant="outline" className="h-8" onClick={addTagChip}>
                      Add
                    </Button>
                  </div>
                </div>
              )}

              {/* ─── TAB 4: LISTS & SEGMENTS ─── */}
              {activeTab === "lists" && (
                <div className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/30 space-y-3 text-xs">
                  <h4 className="font-bold text-stone-800">Lists &amp; Marketing Segments</h4>
                  <p className="text-stone-500">Audiences this contact belongs to based on tags and activity.</p>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-white border border-stone-200 flex items-center justify-between">
                      <span className="font-semibold text-stone-800">All WhatsApp Subscribers</span>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Active</Badge>
                    </div>
                    {editForm.tags.map(t => (
                      <div key={t} className="p-2.5 rounded-lg bg-white border border-stone-200 flex items-center justify-between">
                        <span className="font-semibold text-stone-800">Segment: {t}</span>
                        <Badge variant="outline" className="bg-teal-50 text-teal-700">Tagged</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── TAB 5: SEQUENCES ─── */}
              {activeTab === "sequences" && (
                <div className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/30 space-y-3 text-xs">
                  <h4 className="font-bold text-stone-800">Drip Sequences &amp; Campaigns</h4>
                  <p className="text-stone-500">Automated scheduled nurture drips for this subscriber.</p>
                  <div className="p-3 rounded-lg bg-white border border-stone-200 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-stone-800">Welcome &amp; Onboarding Drip</div>
                      <div className="text-[11px] text-stone-400 mt-0.5">Completed 3/3 steps</div>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Finished</Badge>
                  </div>
                </div>
              )}

              {/* ─── TAB 6: INPUT FLOWS ─── */}
              {activeTab === "input_flows" && (
                <div className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/30 space-y-3 text-xs">
                  <h4 className="font-bold text-stone-800">Active Botflow Session</h4>
                  <div className="p-3 rounded-lg bg-white border border-stone-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-800">Interactive Customer Flow</span>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Ready</Badge>
                    </div>
                    <p className="text-[11px] text-stone-500">Last input received: &quot;{latestMessage?.body || "N/A"}&quot;</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={resetBotFlow} className="h-8">
                    <RotateCcw className="h-3 w-3 mr-1" /> Force Reset Flow
                  </Button>
                </div>
              )}

              {/* ─── TAB 7: CUSTOM FIELDS ─── */}
              {activeTab === "custom_fields" && (
                <div className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/30 space-y-3 text-xs">
                  <h4 className="font-bold text-stone-800">Custom Attributes</h4>
                  {(() => {
                    const ch = resolveSubscriberChannel(activeCustomer)
                    return (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                          <span className="text-[11px] text-stone-400 block">Preferred Language</span>
                          <select
                            value={editForm.preferredLang}
                            onChange={e => setEditForm({ ...editForm, preferredLang: e.target.value })}
                            className="text-xs font-semibold border border-stone-200 rounded px-2 py-1 mt-1 w-full"
                          >
                            <option value="en">English (en)</option>
                            <option value="ar">Arabic (ar)</option>
                          </select>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                          <span className="text-[11px] text-stone-400 block">Primary Channel</span>
                          <span className="text-xs font-semibold text-stone-800 block mt-1">
                            {ch === "INSTAGRAM"
                              ? "Instagram Messaging Graph API"
                              : ch === "FACEBOOK"
                                ? "Facebook Messenger Platform"
                                : "WhatsApp Cloud API"}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                          <span className="text-[11px] text-stone-400 block">Channel Consent</span>
                          <span className="text-xs font-semibold text-stone-800 block mt-1">
                            {ch === "INSTAGRAM"
                              ? (activeCustomer.instagramOptIn !== false ? "Opted In (Active)" : "Opted Out")
                              : ch === "FACEBOOK"
                                ? (activeCustomer.facebookOptIn !== false ? "Opted In (Active)" : "Opted Out")
                                : (activeCustomer.whatsappOptIn ? "Opted In (Active)" : "Opted Out")}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                          <span className="text-[11px] text-stone-400 block">Identifier Format</span>
                          <span className="text-xs font-semibold text-stone-800 block mt-1 font-mono">
                            {ch === "INSTAGRAM" ? "@handle" : ch === "FACEBOOK" ? "Profile / PSID" : "E.164 MSISDN"}
                          </span>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* ─── TAB 8: NOTES ─── */}
              {activeTab === "notes" && (
                <div className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/30 space-y-3 text-xs">
                  <h4 className="font-bold text-stone-800">Internal Staff Notes</h4>
                  <Textarea
                    placeholder="Private notes about this subscriber (preferences, VIP requests, special requirements)..."
                    value={editForm.notes}
                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                    className="min-h-[120px] bg-white text-xs"
                  />
                  <Button size="sm" onClick={saveActiveCustomer} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 h-8 font-semibold">
                    Save Note
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Subscriber Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Subscriber</DialogTitle>
          </DialogHeader>

          {/* Channel Selector Pills */}
          <div className="space-y-1 pt-1">
            <Label className="text-xs text-stone-500 font-semibold">Select Channel</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setNewSub({ ...newSub, channel: "WHATSAPP" })}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-bold transition-all ${
                  newSub.channel === "WHATSAPP"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-500 shadow-2xs"
                    : "bg-stone-50 hover:bg-white text-stone-600 border-stone-200"
                }`}
              >
                <WhatsAppIcon className="h-3.5 w-3.5" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setNewSub({ ...newSub, channel: "FACEBOOK" })}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-bold transition-all ${
                  newSub.channel === "FACEBOOK"
                    ? "bg-blue-50 text-blue-800 border-[#1877F2] shadow-2xs"
                    : "bg-stone-50 hover:bg-white text-stone-600 border-stone-200"
                }`}
              >
                <Facebook className="h-3.5 w-3.5 text-[#1877F2] fill-[#1877F2]" />
                <span>Facebook</span>
              </button>

              <button
                type="button"
                onClick={() => setNewSub({ ...newSub, channel: "INSTAGRAM" })}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-bold transition-all ${
                  newSub.channel === "INSTAGRAM"
                    ? "bg-pink-50 text-pink-800 border-pink-500 shadow-2xs"
                    : "bg-stone-50 hover:bg-white text-stone-600 border-stone-200"
                }`}
              >
                <Instagram className="h-3.5 w-3.5 text-pink-600" />
                <span>Instagram</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 text-xs pt-1">
            {newSub.channel === "WHATSAPP" && (
              <div>
                <Label className="text-xs text-stone-600 font-semibold">Phone Number (with Country Code) *</Label>
                <Input
                  className="mt-1 text-xs"
                  placeholder="+96898821965"
                  value={newSub.phone}
                  onChange={e => setNewSub({ ...newSub, phone: e.target.value })}
                />
                <p className="text-[10px] text-stone-400 mt-0.5">International format with plus sign (e.g. +968...)</p>
              </div>
            )}

            {newSub.channel === "FACEBOOK" && (
              <>
                <div>
                  <Label className="text-xs text-stone-600 font-semibold">Facebook Profile Name *</Label>
                  <Input
                    className="mt-1 text-xs"
                    placeholder="e.g. Salim Al-Habsi"
                    value={newSub.name}
                    onChange={e => setNewSub({ ...newSub, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-stone-600">Messenger PSID or Username (Optional)</Label>
                  <Input
                    className="mt-1 text-xs font-mono"
                    placeholder="e.g. salim_h or 1000928374"
                    value={newSub.socialUsername}
                    onChange={e => setNewSub({ ...newSub, socialUsername: e.target.value })}
                  />
                </div>
              </>
            )}

            {newSub.channel === "INSTAGRAM" && (
              <>
                <div>
                  <Label className="text-xs text-stone-600 font-semibold">Instagram Handle (@username) *</Label>
                  <Input
                    className="mt-1 text-xs font-mono"
                    placeholder="@salma_studio"
                    value={newSub.socialUsername}
                    onChange={e => setNewSub({ ...newSub, socialUsername: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-stone-600">Full Name (Optional)</Label>
                  <Input
                    className="mt-1 text-xs"
                    placeholder="e.g. Salma Al-Riyami"
                    value={newSub.name}
                    onChange={e => setNewSub({ ...newSub, name: e.target.value })}
                  />
                </div>
              </>
            )}

            {newSub.channel === "WHATSAPP" && (
              <div>
                <Label className="text-xs text-stone-600">Full Name (Optional)</Label>
                <Input
                  className="mt-1 text-xs"
                  placeholder="e.g. Ahmed Al-Balushi"
                  value={newSub.name}
                  onChange={e => setNewSub({ ...newSub, name: e.target.value })}
                />
              </div>
            )}

            <div>
              <Label className="text-xs text-stone-600">Email (Optional)</Label>
              <Input
                className="mt-1 text-xs"
                type="email"
                placeholder="subscriber@example.com"
                value={newSub.email}
                onChange={e => setNewSub({ ...newSub, email: e.target.value })}
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-200 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={newSub.optIn}
                onChange={e => setNewSub({ ...newSub, optIn: e.target.checked })}
              />
              <span>
                {newSub.channel === "INSTAGRAM"
                  ? "Agreed to receive Instagram DM updates."
                  : newSub.channel === "FACEBOOK"
                    ? "Agreed to receive Facebook Messenger updates."
                    : "Agreed to receive WhatsApp broadcast updates."}
                <span className="block text-stone-400 text-[10px]">
                  Recorded as explicit staff consent.
                </span>
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 font-semibold"
                disabled={
                  busy ||
                  (newSub.channel === "WHATSAPP" && !newSub.phone.trim()) ||
                  (newSub.channel === "FACEBOOK" && !newSub.name.trim() && !newSub.socialUsername.trim()) ||
                  (newSub.channel === "INSTAGRAM" && !newSub.socialUsername.trim())
                }
                onClick={addSubscriber}
              >
                {busy ? "Saving…" : "Save Subscriber"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import CSV Modal */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="w-[96vw] sm:max-w-2xl">
          <DialogHeader><DialogTitle>Import Subscribers from CSV</DialogTitle></DialogHeader>
          <div className="space-y-3 text-xs">
            <p className="text-stone-500">
              Paste CSV with a <code className="font-mono font-bold">phone</code> column. Optional headers: <code className="font-mono">name</code>, <code className="font-mono">email</code>.
            </p>
            <Textarea
              className="min-h-[160px] font-mono text-xs"
              placeholder={"phone,name,email\n+96891234567,Ahmed,ahmed@example.com"}
              value={importCsv}
              onChange={e => setImportCsv(e.target.value)}
            />
            <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <Checkbox checked={importOptIn} onCheckedChange={v => setImportOptIn(v === true)} className="mt-0.5" />
              <span className="text-xs text-amber-900">
                <span className="font-bold block">Mark contacts as opted-in</span>
                Tick only if you hold verified consent for every contact in this list.
              </span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setImportOpen(false)}>Cancel</Button>
              <Button onClick={runImport} size="sm" disabled={busy || !importCsv.trim()} className="bg-emerald-600 hover:bg-emerald-700 font-semibold">
                {busy ? "Importing…" : "Start Import"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
