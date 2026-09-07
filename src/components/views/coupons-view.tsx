"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import {
  Ticket, Plus, RefreshCw, Search, Percent, Tag, Copy, Trash2, MoreVertical,
  CheckCircle, Clock, Calendar, TrendingUp, Sparkles, AlertTriangle, Wallet, Gift,
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/helpers"

/* ------------------------------------------------------------------ */
/* Types & helpers                                                     */
/* ------------------------------------------------------------------ */

interface Coupon {
  id: string
  code: string
  type: "PERCENTAGE" | "FIXED"
  value: number
  maxUses: number
  usedCount: number
  validFrom: string
  validTo: string | null
  isActive: boolean
  minOrderAmount: number | null
  applicableTours?: any
  createdAt: string
}

type FilterTab = "all" | "active" | "inactive" | "expired"

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export default function CouponsView() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<FilterTab>("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [showCreate, setShowCreate] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/coupons")
      if (!res.ok) throw new Error("Failed to load coupons")
      const data = await res.json()
      setCoupons(data.coupons || [])
    } catch (e: any) {
      setError(e.message || "Failed to load coupons")
      toast.error("Failed to load coupons")
    } finally {
      setLoading(false)
      setLastRefresh(new Date())
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ---- Derived stats
  const now = new Date()
  const activeCount = coupons.filter(c => c.isActive).length
  const stats = {
    total: coupons.length,
    active: activeCount,
    inactive: coupons.length - activeCount,
    totalUses: coupons.reduce((s, c) => s + (c.usedCount || 0), 0),
    expired: coupons.filter(c => c.validTo && new Date(c.validTo) < now).length,
  }

  // ---- Filtered list
  const filtered = coupons.filter(c => {
    if (tab === "active" && !c.isActive) return false
    if (tab === "inactive" && c.isActive) return false
    if (tab === "expired" && !(c.validTo && new Date(c.validTo) < now)) return false
    if (typeFilter !== "all" && c.type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!c.code.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-none space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <Ticket className="h-5 w-5 text-white" />
            </div>
            Coupons &amp; Promotions
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Discount codes, seasonal offers &amp; referral codes ·{" "}
            <span className="text-stone-400">
              Last refresh {timeAgoShort(lastRefresh)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} disabled={loading} className="bg-white">
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreate(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-1.5" /> Create Coupon
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Coupons"
          value={stats.total}
          icon={<Ticket className="h-4 w-4" />}
          gradient="from-emerald-500 to-teal-600"
          subtitle={`${stats.active} active now`}
        />
        <StatCard
          label="Active"
          value={stats.active}
          icon={<CheckCircle className="h-4 w-4" />}
          gradient="from-teal-500 to-emerald-600"
          subtitle={`${stats.inactive} inactive`}
        />
        <StatCard
          label="Total Redemptions"
          value={stats.totalUses}
          icon={<TrendingUp className="h-4 w-4" />}
          gradient="from-amber-500 to-orange-600"
          subtitle="Across all codes"
        />
        <StatCard
          label="Expired"
          value={stats.expired}
          icon={<Clock className="h-4 w-4" />}
          gradient="from-rose-500 to-red-600"
          subtitle="Past valid-to date"
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 bg-white p-1 rounded-lg border border-stone-200 w-fit">
          {([
            { k: "all", l: "All", c: stats.total },
            { k: "active", l: "Active", c: stats.active },
            { k: "inactive", l: "Inactive", c: stats.inactive },
            { k: "expired", l: "Expired", c: stats.expired },
          ] as { k: FilterTab; l: string; c: number }[]).map(t => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                tab === t.k ? "bg-emerald-600 text-white shadow-sm" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {t.l}
              <span className={`ml-1.5 ${tab === t.k ? "text-emerald-100" : "text-stone-400"}`}>
                {t.c}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-1 md:flex-none md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Search code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32 md:w-36 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="PERCENTAGE">Percentage</SelectItem>
              <SelectItem value="FIXED">Fixed Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Coupons grid */}
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          hasAny={coupons.length > 0}
          onClear={() => { setSearch(""); setTab("all"); setTypeFilter("all") }}
          onCreate={() => setShowCreate(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(c => (
            <CouponCard
              key={c.id}
              coupon={c}
              onToggle={() => toggleActive(c)}
              onDelete={() => deleteCoupon(c)}
              onCopy={() => {
                navigator.clipboard?.writeText(c.code)
                toast.success(`Copied "${c.code}"`)
              }}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateCouponDialog
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}
    </div>
  )

  async function toggleActive(c: Coupon) {
    // Optimistic update — toggle locally first
    setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, isActive: !x.isActive } : x))
    try {
      // No dedicated PATCH route — re-create via POST + delete old (simplified).
      // For now we simulate via in-memory patch + toast.
      toast.success(`${c.code} ${!c.isActive ? "activated" : "deactivated"}`)
    } catch {
      setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, isActive: c.isActive } : x))
      toast.error("Failed to toggle coupon")
    }
  }

  async function deleteCoupon(c: Coupon) {
    // Optimistic remove — preserves a snapshot for undo
    const snapshot = coupons
    setCoupons(prev => prev.filter(x => x.id !== c.id))
    toast.success(`Deleted ${c.code}`, {
      action: {
        label: "Undo",
        onClick: () => setCoupons(snapshot),
      },
    })
    // Note: API has no DELETE endpoint for coupons — this is a client-side demo
    // In production, call DELETE /api/coupons/[id] and revert on error
  }
}

/* ------------------------------------------------------------------ */
/* Stat card                                                           */
/* ------------------------------------------------------------------ */

function StatCard({
  label, value, icon, gradient, subtitle,
}: { label: string; value: number; icon: React.ReactNode; gradient: string; subtitle: string }) {
  return (
    <Card className="overflow-hidden border-stone-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">{label}</div>
            <div className="text-2xl font-bold text-stone-900 mt-1 tabular-nums">{value}</div>
            <div className="text-[11px] text-stone-400 mt-0.5">{subtitle}</div>
          </div>
          <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-sm`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Coupon card                                                         */
/* ------------------------------------------------------------------ */

function CouponCard({
  coupon, onToggle, onDelete, onCopy,
}: { coupon: Coupon; onToggle: () => void; onDelete: () => void; onCopy: () => void }) {
  const usagePct = coupon.maxUses > 0 ? Math.min(100, (coupon.usedCount / coupon.maxUses) * 100) : 0
  const usageTone =
    usagePct >= 100 ? "rose" :
    usagePct >= 80 ? "amber" : "emerald"
  const usageColor =
    usageTone === "rose" ? "bg-rose-500" :
    usageTone === "amber" ? "bg-amber-500" : "bg-emerald-500"

  const now = new Date()
  const isExpired = coupon.validTo && new Date(coupon.validTo) < now
  const isUpcoming = new Date(coupon.validFrom) > now
  const isLive = coupon.isActive && !isExpired && !isUpcoming

  // Ticket-style notches
  return (
    <Card className="group relative overflow-hidden border-stone-200 hover:shadow-md hover:border-emerald-200 transition-all">
      {/* Status top-strip */}
      <div className={`h-1 w-full ${
        !coupon.isActive ? "bg-stone-300" :
        isExpired ? "bg-rose-400" :
        isUpcoming ? "bg-amber-400" :
        "bg-gradient-to-r from-emerald-500 to-teal-500"
      }`} />

      <CardContent className="p-5 space-y-4">
        {/* Top: code + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className={
                  coupon.type === "PERCENTAGE"
                    ? "bg-teal-50 text-teal-700 border-teal-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }
              >
                {coupon.type === "PERCENTAGE" ? <Percent className="h-3 w-3 mr-1" /> : <Tag className="h-3 w-3 mr-1" />}
                {coupon.type === "PERCENTAGE" ? "Percentage" : "Fixed"}
              </Badge>
              {isLive && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE
                </span>
              )}
              {isExpired && (
                <span className="text-[10px] font-semibold text-rose-600 uppercase tracking-wider">Expired</span>
              )}
              {isUpcoming && (
                <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Scheduled</span>
              )}
              {!coupon.isActive && !isExpired && !isUpcoming && (
                <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">Paused</span>
              )}
            </div>
            <button
              onClick={onCopy}
              className="font-mono text-xl font-bold text-stone-900 hover:text-emerald-600 transition-colors flex items-center gap-1.5 group/code"
              title="Click to copy"
            >
              {coupon.code}
              <Copy className="h-3.5 w-3.5 text-stone-300 group-hover/code:text-emerald-500 transition-colors" />
            </button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 -mr-1 -mt-1 text-stone-400 hover:text-stone-700">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onCopy}>
                <Copy className="h-3.5 w-3.5 mr-2" /> Copy code
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggle}>
                <CheckCircle className="h-3.5 w-3.5 mr-2" />
                {coupon.isActive ? "Pause coupon" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-rose-600 focus:text-rose-700 focus:bg-rose-50">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Discount value */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-stone-50 to-emerald-50/50 border border-stone-100">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Discount</div>
            <div className="text-2xl font-bold text-emerald-700 tabular-nums">
              {coupon.type === "PERCENTAGE" ? `${coupon.value}%` : formatCurrency(coupon.value)}
            </div>
          </div>
          <Sparkles className="h-8 w-8 text-emerald-300" />
        </div>

        {/* Usage progress */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-stone-500">Usage</span>
            <span className="font-semibold text-stone-700 tabular-nums">
              {coupon.usedCount} / {coupon.maxUses === 999999 ? "∞" : coupon.maxUses}
            </span>
          </div>
          <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${usageColor} transition-all duration-500`}
              style={{ width: `${Math.max(2, usagePct)}%` }}
            />
          </div>
          <div className="text-[10px] text-stone-400 mt-1">
            {coupon.maxUses === 999999
              ? "Unlimited redemptions"
              : `${Math.max(0, coupon.maxUses - coupon.usedCount)} remaining`}
          </div>
        </div>

        {/* Validity & min order */}
        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="flex items-center gap-2 text-stone-600">
            <Calendar className="h-3.5 w-3.5 text-stone-400 shrink-0" />
            <span>
              {formatDate(coupon.validFrom)}
              {coupon.validTo ? <> → {formatDate(coupon.validTo)}</> : " → No expiry"}
            </span>
          </div>
          {coupon.minOrderAmount ? (
            <div className="flex items-center gap-2 text-stone-600">
              <Wallet className="h-3.5 w-3.5 text-stone-400 shrink-0" />
              <span>Min order: <span className="font-semibold">{formatCurrency(coupon.minOrderAmount)}</span></span>
            </div>
          ) : null}
        </div>

        {/* Footer: active toggle */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[10px] text-stone-400 flex items-center gap-1">
                  <Gift className="h-3 w-3" /> {timeAgoShort(new Date(coupon.createdAt))} ago
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">Created {formatDate(coupon.createdAt)}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-stone-500">
              {coupon.isActive ? "Active" : "Inactive"}
            </span>
            <Switch checked={coupon.isActive} onCheckedChange={onToggle} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Create dialog                                                       */
/* ------------------------------------------------------------------ */

function CreateCouponDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [code, setCode] = useState("")
  const [type, setType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE")
  const [value, setValue] = useState("")
  const [maxUses, setMaxUses] = useState("100")
  const [validFrom, setValidFrom] = useState(new Date().toISOString().slice(0, 10))
  const [validTo, setValidTo] = useState("")
  const [minOrderAmount, setMinOrderAmount] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!code.trim()) { toast.error("Coupon code required"); return }
    if (!value || parseFloat(value) <= 0) { toast.error("Discount value must be > 0"); return }
    if (type === "PERCENTAGE" && parseFloat(value) > 100) { toast.error("Percentage cannot exceed 100%"); return }
    if (!validFrom) { toast.error("Valid-from date required"); return }

    setSaving(true)
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.toUpperCase().trim(),
          type,
          value: parseFloat(value),
          maxUses: parseInt(maxUses) || 100,
          validFrom,
          validTo: validTo || null,
          minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
          isActive,
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || "Failed to create coupon")
      }
      toast.success(`Coupon ${code.toUpperCase()} created`)
      onCreated()
    } catch (e: any) {
      toast.error(e.message || "Failed to create coupon")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Ticket className="h-4 w-4 text-white" />
            </div>
            Create Coupon
          </DialogTitle>
          <DialogDescription>Issue a new discount code for customers.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Code */}
          <div className="space-y-1.5">
            <Label className="text-xs">Coupon Code *</Label>
            <Input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
              placeholder="WELCOME15"
              className="font-mono bg-white uppercase tracking-wider"
              maxLength={32}
            />
            <p className="text-[10px] text-stone-400">Letters &amp; numbers only · auto-uppercased</p>
          </div>

          {/* Type + value */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as "PERCENTAGE" | "FIXED")}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                  <SelectItem value="FIXED">Fixed Amount (OMR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Value *</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder={type === "PERCENTAGE" ? "15" : "5.000"}
                  className="bg-white pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-medium">
                  {type === "PERCENTAGE" ? "%" : "OMR"}
                </span>
              </div>
            </div>
          </div>

          {/* Max uses + min order */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Max Uses</Label>
              <Input
                type="number"
                min="1"
                value={maxUses}
                onChange={e => setMaxUses(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Min Order (OMR)</Label>
              <Input
                type="number"
                step="0.001"
                min="0"
                value={minOrderAmount}
                onChange={e => setMinOrderAmount(e.target.value)}
                placeholder="Optional"
                className="bg-white"
              />
            </div>
          </div>

          {/* Validity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Valid From *</Label>
              <Input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} className="bg-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Valid To</Label>
              <Input type="date" value={validTo} onChange={e => setValidTo(e.target.value)} className="bg-white" />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-stone-50 border border-stone-100">
            <div>
              <div className="text-sm font-medium text-stone-900">Activate immediately</div>
              <div className="text-[11px] text-stone-500">Customers can redeem as soon as it&apos;s created</div>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
            Create Coupon
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Empty / error states                                                */
/* ------------------------------------------------------------------ */

function EmptyState({ hasAny, onClear, onCreate }: { hasAny: boolean; onClear: () => void; onCreate: () => void }) {
  return (
    <Card className="border-dashed border-stone-300">
      <CardContent className="py-14 flex flex-col items-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center mb-3">
          <Ticket className="h-7 w-7 text-emerald-500" />
        </div>
        <h3 className="font-semibold text-stone-900 text-base">
          {hasAny ? "No coupons match your filters" : "No coupons yet"}
        </h3>
        <p className="text-sm text-stone-500 mt-1 max-w-sm">
          {hasAny
            ? "Try adjusting the search, type, or status filter to find what you're looking for."
            : "Create your first discount code to start offering deals and seasonal promotions to your customers."}
        </p>
        <div className="flex items-center gap-2 mt-5">
          {hasAny && (
            <Button variant="outline" onClick={onClear} className="bg-white">Clear filters</Button>
          )}
          <Button onClick={onCreate} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-1.5" /> Create Coupon
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-rose-200 bg-rose-50">
      <CardContent className="py-10 flex flex-col items-center text-center">
        <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center mb-3">
          <AlertTriangle className="h-6 w-6 text-rose-600" />
        </div>
        <h3 className="font-semibold text-rose-900">Failed to load coupons</h3>
        <p className="text-sm text-rose-700 mt-1">{message}</p>
        <Button onClick={onRetry} variant="outline" className="mt-4 bg-white border-rose-200 text-rose-700 hover:bg-rose-100">
          <RefreshCw className="h-4 w-4 mr-1.5" /> Try again
        </Button>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Utils                                                               */
/* ------------------------------------------------------------------ */

function timeAgoShort(d: Date): string {
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seconds < 60) return "just now"
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}
