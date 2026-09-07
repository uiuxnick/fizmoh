"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  TrendingUp, Users, MessageSquare, Activity, ShieldCheck, AlertTriangle,
  RefreshCw, Loader2, Sparkles, DollarSign, Building2, Radio, CheckCircle2,
  Calendar, Layers, Zap, Globe
} from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts"
import { ConfigPanel } from "@/components/views/config-panel"

export function PlatformAnalyticsPanel() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeSubTab, setActiveSubTab] = useState<"metrics" | "webmaster">("metrics")

  const loadMetrics = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/platform/analytics")
      if (!res.ok) throw new Error("Failed to load analytics")
      const json = await res.json()
      setData(json)
    } catch {
      toast.error("Could not fetch platform analytics")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMetrics()
  }, [])

  const safeArray = (arr: any) => Array.isArray(arr) ? arr : []

  return (
    <div className="space-y-6">
      {/* Header & Sub-tab Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-stone-900">Platform Intelligence & System Telemetry</h2>
            <p className="text-xs text-stone-500">
              Live observability, MRR growth, WhatsApp message volumes, and infrastructure health metrics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab("metrics")}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSubTab === "metrics" ? "bg-white text-stone-900 shadow-xs font-bold" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              System Metrics
            </button>
            <button
              onClick={() => setActiveSubTab("webmaster")}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSubTab === "webmaster" ? "bg-white text-stone-900 shadow-xs font-bold" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              SEO &amp; Webmaster
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={loadMetrics}
            disabled={loading}
            className="text-xs rounded-xl"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
            Refresh
          </Button>
        </div>
      </div>

      {activeSubTab === "webmaster" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-600" /> Google Analytics &amp; Meta Pixel Configuration
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Configure Google Tag Manager, GA4 Measurement IDs, Google Search Console site verification, and Meta Pixel.
            </p>
          </div>
          <ConfigPanel />
        </div>
      ) : loading && !data ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-stone-200">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
          <p className="text-xs text-stone-500 mt-2 font-medium">Aggregating multi-tenant database telemetry...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-stone-400 mb-1">
                <span className="text-xs font-bold text-stone-500">Total Run Rate (MRR)</span>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-stone-900">
                OMR {Number(data?.mrrTotal || 0).toFixed(1)}
              </div>
              <div className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                Active monthly subscriptions
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-stone-400 mb-1">
                <span className="text-xs font-bold text-stone-500">WhatsApp Messages (30d)</span>
                <MessageSquare className="h-4 w-4 text-teal-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-stone-900">
                {Number(data?.messagesLast30d || 0).toLocaleString()}
              </div>
              <div className="text-[10px] font-semibold text-stone-500 mt-0.5">
                Across all tenant inboxes
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-stone-400 mb-1">
                <span className="text-xs font-bold text-stone-500">Active Workspaces</span>
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-stone-900">
                {data?.activeTenantsCount ?? 0} <span className="text-xs font-normal text-stone-400">/ {data?.totalTenantsCount ?? 0}</span>
              </div>
              <div className="text-[10px] font-semibold text-stone-500 mt-0.5">
                Live operating businesses
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-stone-400 mb-1">
                <span className="text-xs font-bold text-stone-500">System Webhook Health</span>
                <Zap className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-stone-900">
                {data?.webhookFailures24h === 0 ? "100%" : `${data?.webhookFailures24h} errs`}
              </div>
              <div className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                {data?.webhookFailures24h === 0 ? "Zero delivery errors (24h)" : "Webhook dead-letter retries"}
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* MRR & Revenue Trend */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Subscription Invoiced Revenue</h3>
                  <p className="text-[11px] text-stone-500">Monthly billing history in OMR</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">Past 6 Months</Badge>
              </div>
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={safeArray(data?.mrrTrend)}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={m => m ? new Date(m).toLocaleDateString([], { month: "short" }) : ""}
                      fontSize={11}
                      stroke="#94a3b8"
                    />
                    <YAxis
                      tickFormatter={val => `${val / 1000} OMR`}
                      fontSize={11}
                      stroke="#94a3b8"
                    />
                    <Tooltip
                      formatter={(val: any) => [`${(Number(val) / 1000).toFixed(3)} OMR`, "Invoiced Revenue"]}
                      labelFormatter={m => new Date(m).toLocaleDateString([], { month: "long", year: "numeric" })}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Daily WhatsApp Traffic */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Daily WhatsApp Message Volume</h3>
                  <p className="text-[11px] text-stone-500">Inbound customer messages &amp; broadcast replies (30d)</p>
                </div>
                <Badge className="bg-teal-100 text-teal-800 text-[10px] font-bold">30 Days</Badge>
              </div>
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={safeArray(data?.messageVolume)}>
                    <defs>
                      <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={d => d ? new Date(d).toLocaleDateString([], { day: "numeric", month: "short" }) : ""}
                      fontSize={11}
                      stroke="#94a3b8"
                    />
                    <YAxis fontSize={11} stroke="#94a3b8" />
                    <Tooltip
                      formatter={(val: any) => [Number(val).toLocaleString(), "Messages"]}
                      labelFormatter={d => new Date(d).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
                    />
                    <Area type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMsg)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top Workspaces & Activity Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Top Tenants by Commerce Volume */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Top Workspaces by Processed Volume</h3>
                  <p className="text-[11px] text-stone-500">Ranked by verified checkout payments (AmwalPay)</p>
                </div>
              </div>

              <div className="divide-y divide-stone-100">
                {safeArray(data?.topTenantsByRevenue).length === 0 ? (
                  <div className="py-8 text-center text-xs text-stone-400">
                    No payment volume recorded yet
                  </div>
                ) : (
                  safeArray(data?.topTenantsByRevenue).slice(0, 5).map((t: any, idx: number) => (
                    <div key={t.tenantId || idx} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="h-6 w-6 rounded-full bg-stone-100 text-stone-700 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-stone-900">{t.tenantName}</p>
                          <p className="text-[10px] text-stone-400 font-mono">{t.tenantId?.slice(0, 12)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-emerald-700">
                          OMR {(Number(t.revenue || 0) / 1000).toFixed(3)}
                        </p>
                        <p className="text-[10px] text-stone-400">Verified GMV</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Operational Summary */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-stone-900">Infrastructure &amp; Compliance Status</h3>
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-stone-900">PostgreSQL Database Clusters</p>
                      <p className="text-[10px] text-stone-500">Multi-tenant isolation &amp; automatic connection pooling</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Operational</Badge>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-stone-900">Meta WhatsApp Cloud Webhooks</p>
                      <p className="text-[10px] text-stone-500">Inbound message parsing &amp; bot flow trigger workers</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Connected</Badge>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-stone-900">AmwalPay OMR Payment Gateway</p>
                      <p className="text-[10px] text-stone-500">SHA-256 signed callback verification &amp; webhook retries</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Active</Badge>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-stone-900">Pending Support &amp; Billing Invoices</p>
                      <p className="text-[10px] text-stone-500">{data?.openTickets ?? 0} open tickets · {data?.pendingInvoices ?? 0} pending invoices</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 text-[10px]">In Sync</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
