"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import {
  History, Shield, Search, Filter, RefreshCw, Clock, User, ChevronDown, ChevronRight,
  CheckCircle, XCircle, Ban, RotateCcw, CalendarCheck, UserX, CreditCard, Undo2,
  AlertTriangle, FileJson, X, Download, Activity,
} from "lucide-react"
import { formatDateTime, timeAgo, prettifyStatus } from "@/lib/helpers"

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Staff {
  id: string
  name: string
  email: string
  role: string
  avatar?: string | null
}
interface Order {
  id: string
  orderNumber: string
  customerName: string
  tour?: { name: string } | null
}
interface Customer {
  id: string
  name: string | null
  phone: string
}
interface AuditLog {
  id: string
  staffId: string | null
  customerId: string | null
  orderId: string | null
  action: string
  entity: string
  entityId: string
  details: any
  reason: string | null
  ipAddress: string | null
  createdAt: string
  staff: Staff | null
  order: Order | null
  customer: Customer | null
}

/* ------------------------------------------------------------------ */
/* Action metadata                                                     */
/* ------------------------------------------------------------------ */

interface ActionMeta { label: string; icon: any; tone: "emerald" | "rose" | "amber" | "teal" | "purple" | "stone"; }

const ACTION_META: Record<string, ActionMeta> = {
  APPROVE_PAYMENT: { label: "Approve Payment", icon: CheckCircle, tone: "emerald" },
  REJECT_PAYMENT: { label: "Reject Payment", icon: XCircle, tone: "rose" },
  CANCEL_ORDER: { label: "Cancel Order", icon: Ban, tone: "rose" },
  REFUND: { label: "Refund", icon: RotateCcw, tone: "purple" },
  RESCHEDULE_ORDER: { label: "Reschedule Order", icon: CalendarCheck, tone: "amber" },
  COMPLETE_ORDER: { label: "Complete Order", icon: CheckCircle, tone: "emerald" },
  MARK_NO_SHOW: { label: "Mark No-Show", icon: UserX, tone: "stone" },
  AMWALPAY_PAYMENT_CONFIRMED: { label: "AmwalPay Confirmed", icon: CreditCard, tone: "emerald" },
  AMWALPAY_REFUND: { label: "AmwalPay Refund", icon: Undo2, tone: "purple" },
  MODIFY_ORDER: { label: "Modify Order", icon: Activity, tone: "amber" },
}

const TONE_STYLES: Record<string, { bg: string; text: string; border: string; ring: string; dot: string }> = {
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", ring: "ring-emerald-100", dot: "bg-emerald-500" },
  rose:     { bg: "bg-rose-50",     text: "text-rose-700",     border: "border-rose-200",     ring: "ring-rose-100",     dot: "bg-rose-500" },
  amber:    { bg: "bg-amber-50",    text: "text-amber-700",    border: "border-amber-200",    ring: "ring-amber-100",    dot: "bg-amber-500" },
  teal:     { bg: "bg-teal-50",     text: "text-teal-700",     border: "border-teal-200",     ring: "ring-teal-100",     dot: "bg-teal-500" },
  purple:   { bg: "bg-purple-50",   text: "text-purple-700",   border: "border-purple-200",   ring: "ring-purple-100",   dot: "bg-purple-500" },
  stone:    { bg: "bg-stone-100",   text: "text-stone-700",    border: "border-stone-200",    ring: "ring-stone-100",    dot: "bg-stone-500" },
}

const ROLE_GRADIENT: Record<string, string> = {
  SUPER_ADMIN: "from-purple-500 to-purple-700",
  OPS_ADMIN: "from-emerald-500 to-teal-600",
  FINANCE: "from-amber-500 to-orange-600",
  CHAT_AGENT: "from-teal-500 to-cyan-600",
  MARKETING: "from-rose-500 to-pink-600",
  GUIDE: "from-stone-500 to-stone-700",
}

function getInitials(name?: string | null) {
  if (!name) return "?"
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export default function AuditLogsView() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [actionCounts, setActionCounts] = useState<Record<string, number>>({})
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Filters
  const [action, setAction] = useState("all")
  const [entity, setEntity] = useState("all")
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (action !== "all") params.set("action", action)
      if (entity !== "all") params.set("entity", entity)
      if (search) params.set("search", search)
      if (fromDate) params.set("from", new Date(fromDate).toISOString())
      if (toDate) params.set("to", new Date(toDate + "T23:59:59").toISOString())
      params.set("limit", "200")
      const res = await fetch(`/api/audit-logs?${params}`)
      if (!res.ok) throw new Error("Failed to load audit logs")
      const data = await res.json()
      setLogs(data.logs || [])
      setTotal(data.total || 0)
      setActionCounts(data.actionCounts || {})
    } catch (e: any) {
      setError(e.message || "Failed to load")
      toast.error("Failed to load audit logs")
    } finally {
      setLoading(false)
      setLastRefresh(new Date())
    }
  }, [action, entity, search, fromDate, toDate])

  useEffect(() => { load() }, [load])

  const handleClearFilters = () => {
    setAction("all"); setEntity("all"); setSearch(""); setSearchInput("")
    setFromDate(""); setToDate("")
  }

  const hasActiveFilters = action !== "all" || entity !== "all" || search || fromDate || toDate

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-none space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <History className="h-5 w-5 text-white" />
            </div>
            Audit Logs
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Every payment approval, booking modification, and refund — with user, timestamp &amp; reason ·{" "}
            <span className="text-stone-400">Last refresh {timeAgo(lastRefresh)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportCsv(logs)} disabled={logs.length === 0} className="bg-white">
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
          <Button variant="outline" onClick={load} disabled={loading} className="bg-white">
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats / activity summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="Total Events"
          value={total}
          icon={<History className="h-4 w-4" />}
          gradient="from-emerald-500 to-teal-600"
          subtitle="Matching filters"
        />
        <SummaryCard
          label="Approvals"
          value={(actionCounts.APPROVE_PAYMENT || 0) + (actionCounts.AMWALPAY_PAYMENT_CONFIRMED || 0)}
          icon={<CheckCircle className="h-4 w-4" />}
          gradient="from-teal-500 to-emerald-600"
          subtitle="Payments approved"
        />
        <SummaryCard
          label="Rejections & Cancellations"
          value={(actionCounts.REJECT_PAYMENT || 0) + (actionCounts.CANCEL_ORDER || 0)}
          icon={<XCircle className="h-4 w-4" />}
          gradient="from-rose-500 to-red-600"
          subtitle="Payments/orders denied"
        />
        <SummaryCard
          label="Refunds"
          value={(actionCounts.REFUND || 0) + (actionCounts.AMWALPAY_REFUND || 0)}
          icon={<RotateCcw className="h-4 w-4" />}
          gradient="from-purple-500 to-fuchsia-600"
          subtitle="Money returned"
        />
      </div>

      {/* Filter bar */}
      <Card className="border-stone-200">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            {/* Search */}
            <div className="flex-1 space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <Input
                  placeholder="Entity ID, reason, or action..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") setSearch(searchInput.trim()) }}
                  className="pl-9 pr-9 bg-white"
                />
                {searchInput && (
                  <button
                    onClick={() => { setSearchInput(""); setSearch("") }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Action filter */}
            <div className="space-y-1.5 md:w-56">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Action</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {Object.entries(ACTION_META).map(([k, m]) => (
                    <SelectItem key={k} value={k}>
                      <span className="flex items-center justify-between w-full">
                        <span>{m.label}</span>
                        {actionCounts[k] ? <span className="text-[10px] text-stone-400 ml-2">{actionCounts[k]}</span> : null}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Entity filter */}
            <div className="space-y-1.5 md:w-40">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Entity</Label>
              <Select value={entity} onValueChange={setEntity}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="ORDER">Order</SelectItem>
                  <SelectItem value="PAYMENT">Payment</SelectItem>
                  <SelectItem value="TOUR">Tour</SelectItem>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                  <SelectItem value="COUPON">Coupon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date range + clear */}
          <div className="flex flex-col md:flex-row md:items-end gap-3 pt-3 border-t border-stone-100">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">From Date</Label>
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-white md:w-44" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">To Date</Label>
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-white md:w-44" />
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" onClick={handleClearFilters} className="text-stone-500 hover:text-stone-700">
                  <X className="h-3.5 w-3.5 mr-1" /> Clear filters
                </Button>
              )}
              <Button onClick={load} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                <Filter className="h-4 w-4 mr-1.5" /> Apply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : logs.length === 0 ? (
        <EmptyState hasAny={total > 0} onClear={handleClearFilters} />
      ) : (
        <Card className="border-stone-200 overflow-hidden">
          <CardContent className="p-0">
            <div className="px-5 py-3 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold text-stone-900">
                  {total} {total === 1 ? "event" : "events"}
                </span>
                <span className="text-xs text-stone-400">· newest first</span>
              </div>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" /> Live
              </Badge>
            </div>
            <ScrollArea className="max-h-[70vh]">
              <div className="relative">
                {/* Timeline vertical line */}
                <div className="absolute left-[34px] md:left-[42px] top-4 bottom-4 w-px bg-gradient-to-b from-stone-200 via-stone-200 to-transparent" />
                <div className="space-y-1 py-3">
                  {logs.map((log, idx) => (
                    <TimelineRow key={log.id} log={log} isLast={idx === logs.length - 1} />
                  ))}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Summary card                                                        */
/* ------------------------------------------------------------------ */

function SummaryCard({
  label, value, icon, gradient, subtitle,
}: { label: string; value: number; icon: React.ReactNode; gradient: string; subtitle: string }) {
  return (
    <Card className="border-stone-200">
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
/* Timeline row                                                        */
/* ------------------------------------------------------------------ */

function TimelineRow({ log, isLast }: { log: AuditLog; isLast: boolean }) {
  const meta = ACTION_META[log.action] || { label: prettifyStatus(log.action), icon: Activity, tone: "stone" as const }
  const tone = TONE_STYLES[meta.tone]
  const Icon = meta.icon
  const [expanded, setExpanded] = useState(false)

  const hasDetails = log.details && Object.keys(log.details).length > 0
  const staffGradient = log.staff ? ROLE_GRADIENT[log.staff.role] || "from-emerald-500 to-teal-600" : "from-stone-400 to-stone-600"

  return (
    <div className="relative px-4 md:px-5 py-3 hover:bg-stone-50/50 transition-colors">
      <div className="flex items-start gap-3 md:gap-4">
        {/* Icon circle on timeline */}
        <div className={`relative z-10 h-9 w-9 md:h-11 md:w-11 rounded-full ${tone.bg} ${tone.border} border-2 flex items-center justify-center shrink-0 shadow-sm`}>
          <Icon className={`h-4 w-4 md:h-5 md:w-5 ${tone.text}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`${tone.bg} ${tone.text} ${tone.border} font-semibold`}>
                  {meta.label}
                </Badge>
                <Badge variant="outline" className="text-[10px] text-stone-500">
                  {log.entity}
                </Badge>
                {log.order && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="font-mono text-xs text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded">
                          {log.order.orderNumber}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <div className="text-xs">
                          <div className="font-semibold">{log.order.customerName}</div>
                          {log.order.tour && <div className="text-stone-500">{log.order.tour.name}</div>}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              {/* Reason */}
              {log.reason && (
                <p className="text-sm text-stone-700 mt-1.5">
                  <span className="text-stone-400 text-xs uppercase tracking-wider mr-1">Reason:</span>
                  {log.reason}
                </p>
              )}

              {/* Actor */}
              <div className="flex items-center gap-2 mt-2 text-xs text-stone-500">
                {log.staff ? (
                  <>
                    <Avatar className="h-5 w-5 border border-white shadow-sm">
                      <AvatarFallback className={`bg-gradient-to-br ${staffGradient} text-white text-[9px] font-semibold`}>
                        {getInitials(log.staff.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-stone-700">{log.staff.name}</span>
                    <span className="text-stone-400">·</span>
                    <span className="text-stone-400">{prettifyStatus(log.staff.role)}</span>
                  </>
                ) : (
                  <span className="flex items-center gap-1 text-stone-400">
                    <User className="h-3 w-3" /> System
                  </span>
                )}
                <span className="text-stone-400">·</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1 cursor-default">
                        <Clock className="h-3 w-3" />
                        {timeAgo(log.createdAt)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{formatDateTime(log.createdAt)}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Entity ID */}
              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-stone-400">
                <span className="uppercase tracking-wider">Entity ID:</span>
                <code className="font-mono text-stone-500 bg-stone-50 px-1 py-0.5 rounded">{log.entityId.slice(0, 20)}{log.entityId.length > 20 ? "…" : ""}</code>
                {log.customer && (
                  <>
                    <span className="text-stone-300">·</span>
                    <span className="text-stone-400">Customer: <span className="text-stone-500">{log.customer.name || log.customer.phone}</span></span>
                  </>
                )}
              </div>

              {/* Expandable JSON */}
              {hasDetails && (
                <div className="mt-2">
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <FileJson className="h-3 w-3" />
                    {expanded ? "Hide" : "View"} details
                  </button>
                  {expanded && (
                    <pre className="mt-2 p-3 rounded-lg bg-stone-900 text-emerald-300 text-[11px] font-mono overflow-x-auto max-h-64 overflow-y-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {!isLast && <div className="ml-[50px] md:ml-[58px] mt-3 h-px bg-stone-100" />}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Empty / error states                                                */
/* ------------------------------------------------------------------ */

function EmptyState({ hasAny, onClear }: { hasAny: boolean; onClear: () => void }) {
  return (
    <Card className="border-dashed border-stone-300">
      <CardContent className="py-14 flex flex-col items-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center mb-3">
          <History className="h-7 w-7 text-emerald-500" />
        </div>
        <h3 className="font-semibold text-stone-900 text-base">
          {hasAny ? "No logs match your filters" : "No audit logs yet"}
        </h3>
        <p className="text-sm text-stone-500 mt-1 max-w-sm">
          {hasAny
            ? "Try adjusting the action, entity, date range, or search query."
            : "Once staff start approving payments, modifying bookings, or processing refunds, every action will appear here as an immutable audit trail."}
        </p>
        {hasAny && (
          <Button variant="outline" onClick={onClear} className="mt-4 bg-white">
            <X className="h-4 w-4 mr-1.5" /> Clear filters
          </Button>
        )}
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
        <h3 className="font-semibold text-rose-900">Failed to load audit logs</h3>
        <p className="text-sm text-rose-700 mt-1">{message}</p>
        <Button onClick={onRetry} variant="outline" className="mt-4 bg-white border-rose-200 text-rose-700 hover:bg-rose-100">
          <RefreshCw className="h-4 w-4 mr-1.5" /> Try again
        </Button>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* CSV export                                                          */
/* ------------------------------------------------------------------ */

function exportCsv(logs: AuditLog[]) {
  if (!logs.length) { toast.error("No logs to export"); return }
  const headers = ["Timestamp", "Action", "Entity", "Entity ID", "Staff", "Staff Role", "Order #", "Customer", "Reason", "Details"]
  const rows = logs.map(l => [
    l.createdAt,
    l.action,
    l.entity,
    l.entityId,
    l.staff?.name || "System",
    l.staff?.role || "",
    l.order?.orderNumber || "",
    l.customer?.name || l.customer?.phone || "",
    (l.reason || "").replace(/"/g, '""'),
    JSON.stringify(l.details || {}),
  ].map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))
  const csv = [headers.join(","), ...rows].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success(`Exported ${logs.length} logs to CSV`)
}
