"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Loader2, Activity, RefreshCw, AlertTriangle, CheckCircle2, Clock,
  Skull, RotateCcw, Eye,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"

interface Delivery {
  id: string
  tenantId: string | null
  provider: string
  eventType: string
  externalId: string | null
  status: string
  attempts: number
  nextRetryAt: string | null
  lastError: string | null
  receivedAt: string
  processedAt: string | null
}

const STATUS_STYLES: Record<string, { color: string; icon: React.ReactNode }> = {
  RECEIVED: { color: "bg-blue-100 text-blue-800", icon: <Clock className="h-3 w-3" /> },
  PROCESSED: { color: "bg-emerald-100 text-emerald-800", icon: <CheckCircle2 className="h-3 w-3" /> },
  FAILED: { color: "bg-rose-100 text-rose-800", icon: <AlertTriangle className="h-3 w-3" /> },
  RETRYING: { color: "bg-amber-100 text-amber-800", icon: <RotateCcw className="h-3 w-3" /> },
  DEAD: { color: "bg-stone-200 text-stone-800", icon: <Skull className="h-3 w-3" /> },
}

export function WebhooksHealthPanel() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("ALL")
  const [detail, setDetail] = useState<Delivery | null>(null)
  const [retrying, setRetrying] = useState<string | null>(null)

  async function load() {
    try {
      const r = await fetch("/api/webhooks/deliveries?limit=100")
      if (!r.ok) throw new Error()
      const data = await r.json()
      setDeliveries(Array.isArray(data.deliveries) ? data.deliveries : Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [])
    } catch {
      toast.error("Could not load webhook deliveries")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = filter === "ALL" ? deliveries : deliveries.filter(d => d.status === filter)

  const counts = {
    total: deliveries.length,
    processed: deliveries.filter(d => d.status === "PROCESSED").length,
    failed: deliveries.filter(d => d.status === "FAILED").length,
    retrying: deliveries.filter(d => d.status === "RETRYING").length,
    dead: deliveries.filter(d => d.status === "DEAD").length,
  }
  const successRate = counts.total > 0 ? ((counts.processed / counts.total) * 100).toFixed(1) : "N/A"

  async function retry(id: string) {
    setRetrying(id)
    try {
      const r = await fetch(`/api/webhooks/deliveries/${id}/retry`, { method: "POST" })
      if (!r.ok) throw new Error()
      toast.success("Retry queued")
      await load()
    } catch {
      toast.error("Could not retry delivery")
    } finally {
      setRetrying(null)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-stone-900">Webhooks & Health</h2>
        <p className="text-xs text-stone-500 mt-0.5">Monitor webhook delivery status and retry failures.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs text-center">
          <div className="text-lg font-black text-stone-900">{successRate}%</div>
          <div className="text-[10px] font-semibold text-emerald-600">Success Rate</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs text-center">
          <div className="text-lg font-black text-stone-900">{counts.total}</div>
          <div className="text-[10px] font-semibold text-stone-500">Total</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs text-center">
          <div className="text-lg font-black text-rose-600">{counts.failed}</div>
          <div className="text-[10px] font-semibold text-rose-600">Failed</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs text-center">
          <div className="text-lg font-black text-amber-600">{counts.retrying}</div>
          <div className="text-[10px] font-semibold text-amber-600">Retrying</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs text-center">
          <div className="text-lg font-black text-stone-600">{counts.dead}</div>
          <div className="text-[10px] font-semibold text-stone-500">Dead Letter</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {["ALL", "PROCESSED", "FAILED", "RETRYING", "DEAD", "RECEIVED"].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
              filter === s ? "bg-emerald-600 text-white" : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            {s.toLowerCase().replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-stone-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/50">
                <th className="text-left px-4 py-3 font-bold text-stone-600">Provider</th>
                <th className="text-left px-4 py-3 font-bold text-stone-600">Event Type</th>
                <th className="text-left px-4 py-3 font-bold text-stone-600">Status</th>
                <th className="text-left px-4 py-3 font-bold text-stone-600">Attempts</th>
                <th className="text-left px-4 py-3 font-bold text-stone-600">Received</th>
                <th className="text-left px-4 py-3 font-bold text-stone-600">Error</th>
                <th className="text-right px-4 py-3 font-bold text-stone-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-stone-400">No deliveries found</td></tr>
              ) : filtered.map(d => {
                const style = STATUS_STYLES[d.status] || STATUS_STYLES.RECEIVED
                return (
                  <tr key={d.id} className="border-b border-stone-100 hover:bg-stone-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-stone-700">{d.provider}</td>
                    <td className="px-4 py-3 text-stone-600 font-mono text-[11px]">{d.eventType}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${style.color}`}>
                        {style.icon} {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{d.attempts}</td>
                    <td className="px-4 py-3 text-stone-500">
                      {new Date(d.receivedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-rose-600 truncate max-w-48">{d.lastError || "—"}</td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setDetail(d)} className="h-7 w-7 p-0">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {(d.status === "FAILED" || d.status === "DEAD") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => retry(d.id)}
                          disabled={retrying === d.id}
                          className="h-7 w-7 p-0"
                        >
                          {retrying === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Webhook Delivery Detail</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="font-bold text-stone-500">Provider:</span> {detail.provider}</div>
                <div><span className="font-bold text-stone-500">Event:</span> {detail.eventType}</div>
                <div><span className="font-bold text-stone-500">Status:</span> {detail.status}</div>
                <div><span className="font-bold text-stone-500">Attempts:</span> {detail.attempts}</div>
                <div><span className="font-bold text-stone-500">External ID:</span> {detail.externalId || "—"}</div>
                <div><span className="font-bold text-stone-500">Next Retry:</span> {detail.nextRetryAt ? new Date(detail.nextRetryAt).toLocaleString() : "—"}</div>
              </div>
              {detail.lastError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                  <p className="font-bold text-rose-700 mb-1">Last Error</p>
                  <p className="text-rose-600 font-mono text-[11px] break-all">{detail.lastError}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
