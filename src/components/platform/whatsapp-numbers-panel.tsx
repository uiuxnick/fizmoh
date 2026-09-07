"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  Loader2, Phone, Search, RefreshCw, Edit2, CheckCircle2,
  AlertTriangle, Building2, Smartphone, ShieldCheck,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"

interface WhatsAppNumber {
  id: string
  phoneNumberId: string
  wabaId: string
  displayPhone: string | null
  verifiedName: string | null
  tenantId: string | null
  tenantName?: string | null
  qualityRating: string | null
  messagingLimit: string | null
  status: string
  connectedVia: string
  syncedAt: string | null
  messageCountLast30d?: number
}

export function WhatsAppNumbersPanel() {
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([])
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("ALL")
  const [search, setSearch] = useState("")

  // Edit / Reassign modal state
  const [selectedNumber, setSelectedNumber] = useState<WhatsAppNumber | null>(null)
  const [editTenantId, setEditTenantId] = useState("")
  const [editQuality, setEditQuality] = useState("GREEN")
  const [editLimit, setEditLimit] = useState("TIER_1K")
  const [editStatus, setEditStatus] = useState("CONNECTED")
  const [saving, setSaving] = useState(false)

  const loadNumbers = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/platform/whatsapp/numbers")
      if (!res.ok) throw new Error()
      const data = await res.json()
      const list = Array.isArray(data.numbers) ? data.numbers : Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []
      setNumbers(list)
    } catch {
      setNumbers([])
      toast.error("Failed to load WhatsApp numbers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNumbers()
    fetch("/api/platform/tenants")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.tenants)) setTenants(d.tenants.map((t: any) => ({ id: t.id, name: t.name })))
      })
      .catch(() => {})
  }, [])

  const openEdit = (n: WhatsAppNumber) => {
    setSelectedNumber(n)
    setEditTenantId(n.tenantId || "")
    setEditQuality(n.qualityRating || "GREEN")
    setEditLimit(n.messagingLimit || "TIER_1K")
    setEditStatus(n.status || "CONNECTED")
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedNumber) return
    setSaving(true)
    try {
      const res = await fetch(`/api/whatsapp/accounts/${selectedNumber.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: editTenantId || null,
          qualityRating: editQuality,
          messagingLimit: editLimit,
          status: editStatus,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success("WhatsApp number configuration updated")
      setSelectedNumber(null)
      await loadNumbers()
    } catch {
      toast.error("Failed to update number")
    } finally {
      setSaving(false)
    }
  }

  const safeNumbers = Array.isArray(numbers) ? numbers : []
  const filtered = safeNumbers.filter(n => {
    const s = search.toLowerCase()
    const matchesSearch =
      (n.displayPhone || "").toLowerCase().includes(s) ||
      (n.verifiedName || "").toLowerCase().includes(s) ||
      (n.tenantName || "").toLowerCase().includes(s) ||
      (n.phoneNumberId || "").toLowerCase().includes(s)
    const matchesFilter =
      filter === "ALL" ||
      (filter === "ASSIGNED" && n.tenantId !== null) ||
      (filter === "UNASSIGNED" && n.tenantId === null)
    return matchesSearch && matchesFilter
  })

  const getQualityDot = (q: string | null) => {
    const quality = (q || "UNKNOWN").toUpperCase()
    if (quality === "GREEN") return <div className="h-2 w-2 rounded-full bg-emerald-500" title="Green Quality" />
    if (quality === "YELLOW") return <div className="h-2 w-2 rounded-full bg-amber-500" title="Yellow Quality" />
    if (quality === "RED") return <div className="h-2 w-2 rounded-full bg-rose-500" title="Red Quality (Degraded)" />
    return <div className="h-2 w-2 rounded-full bg-stone-300" title="Unknown" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-900">WhatsApp Number Pool</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Monitor Meta Cloud API phone numbers, health ratings, message throughput, and workspace allocations.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={loadNumbers}
          disabled={loading}
          className="text-xs rounded-xl h-9 gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {/* Filters */}
        <div className="p-4 bg-stone-50/60 border-b border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
            <Input
              placeholder="Search phone number, name, or tenant..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs rounded-xl bg-white border-stone-200"
            />
          </div>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="h-9 px-3 text-xs font-semibold rounded-xl border border-stone-200 bg-white text-stone-700 w-full sm:w-auto"
          >
            <option value="ALL">All Numbers ({safeNumbers.length})</option>
            <option value="ASSIGNED">Assigned to Workspace</option>
            <option value="UNASSIGNED">Unassigned (Free Pool)</option>
          </select>
        </div>

        {loading && safeNumbers.length === 0 ? (
          <div className="py-14 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mx-auto" />
            <p className="text-xs text-stone-500 mt-2 font-medium">Loading number pool...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center space-y-2">
            <div className="h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
              <Phone className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-stone-700">No phone numbers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Phone Number</th>
                  <th className="px-4 py-3">Verified Name</th>
                  <th className="px-4 py-3">Assigned Workspace</th>
                  <th className="px-4 py-3">Quality</th>
                  <th className="px-4 py-3">Tier Limit</th>
                  <th className="px-4 py-3">30d Messages</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map(n => (
                  <tr key={n.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-mono font-bold text-stone-900">{n.displayPhone || "Unspecified"}</span>
                          <div className="text-[10px] text-stone-400 font-mono">ID: {n.phoneNumberId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-stone-700">
                      {n.verifiedName || "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      {n.tenantName ? (
                        <span className="font-bold text-stone-800 flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-stone-400" /> {n.tenantName}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Unassigned (Pool)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 font-semibold text-stone-700">
                        {getQualityDot(n.qualityRating)}
                        <span className="text-[11px]">{n.qualityRating || "UNKNOWN"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="bg-stone-100 px-2 py-0.5 rounded text-[11px] font-mono text-stone-700">
                        {n.messagingLimit || "TIER_1K"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-stone-800">
                      {(n.messageCountLast30d || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        n.status === "CONNECTED" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                      }`}>
                        {n.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(n)}
                        className="h-7 text-xs rounded-lg font-semibold gap-1"
                      >
                        <Edit2 className="h-3 w-3" /> Configure
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Configure / Reassign Number Modal */}
      {selectedNumber && (
        <Dialog open={!!selectedNumber} onOpenChange={open => !open && setSelectedNumber(null)}>
          <DialogContent className="sm:max-w-md p-6 bg-white rounded-3xl border-stone-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-stone-900">
                Configure Number: {selectedNumber.displayPhone || selectedNumber.phoneNumberId}
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-500">
                Assign this WhatsApp number to a dedicated workspace or adjust quality tier.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-4 mt-2">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Assigned Tenant Workspace</label>
                <select
                  value={editTenantId}
                  onChange={e => setEditTenantId(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-semibold rounded-xl border border-stone-200 bg-white text-stone-800"
                >
                  <option value="">Unassigned (Free in Platform Pool)</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Quality Rating</label>
                  <select
                    value={editQuality}
                    onChange={e => setEditQuality(e.target.value)}
                    className="w-full h-9 px-3 text-xs font-semibold rounded-xl border border-stone-200 bg-white text-stone-800"
                  >
                    <option value="GREEN">GREEN (Normal)</option>
                    <option value="YELLOW">YELLOW (Warning)</option>
                    <option value="RED">RED (Restricted)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Messaging Tier</label>
                  <select
                    value={editLimit}
                    onChange={e => setEditLimit(e.target.value)}
                    className="w-full h-9 px-3 text-xs font-semibold rounded-xl border border-stone-200 bg-white text-stone-800"
                  >
                    <option value="TIER_250">TIER 250 / day</option>
                    <option value="TIER_1K">TIER 1K / day</option>
                    <option value="TIER_10K">TIER 10K / day</option>
                    <option value="TIER_100K">TIER 100K / day</option>
                    <option value="UNLIMITED">UNLIMITED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Connection Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-semibold rounded-xl border border-stone-200 bg-white text-stone-800"
                >
                  <option value="CONNECTED">CONNECTED</option>
                  <option value="DISCONNECTED">DISCONNECTED</option>
                  <option value="ERROR">ERROR</option>
                </select>
              </div>

              <DialogFooter className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
                <Button type="button" variant="outline" onClick={() => setSelectedNumber(null)} className="rounded-xl text-xs">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Save Configuration
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
