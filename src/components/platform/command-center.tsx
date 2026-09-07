"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  TrendingUp, Building2, CreditCard, Activity, Headphones,
  Loader2, AlertTriangle, Zap, Users, Brain,
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"

interface Analytics {
  mrrTotal: number
  mrrTrend: { month: string; amount: number }[]
  activeTenantsCount: number
  totalTenantsCount: number
  tenantGrowth: { month: string; count: number }[]
  messagesLast30d: number
  messageVolume: { date: string; count: number }[]
  revenueLast30d: number
  pendingInvoices: number
  openTickets: number
  webhookFailures24h: number
  recentActivity: { id: string; action: string; entity: string; entityId: string; tenantId?: string; reason?: string; createdAt: string }[]
  topTenantsByRevenue: { tenantId: string; tenantName: string; revenue: number }[]
  aiUsage: number
}

export function CommandCenter() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/platform/analytics")
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => toast.error("Could not load analytics"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-slate-500 text-sm">
        Could not load analytics data.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-black text-stone-900">Command Center</h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Real-time platform health and business metrics.
        </p>
      </div>

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label="MRR"
          value={`OMR ${data.mrrTotal.toFixed(1)}`}
          subtitle="Monthly Recurring Revenue"
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          color="emerald"
        />
        <KpiCard
          label="Active Tenants"
          value={`${data.activeTenantsCount}`}
          subtitle={`of ${data.totalTenantsCount} total`}
          icon={<Building2 className="h-4 w-4 text-teal-600" />}
          color="teal"
        />
        <KpiCard
          label="Messages (30d)"
          value={data.messagesLast30d.toLocaleString()}
          subtitle="WhatsApp volume"
          icon={<WhatsAppIcon className="h-4 w-4" />}
          color="green"
        />
        <KpiCard
          label="Revenue (30d)"
          value={`OMR ${(data.revenueLast30d / 1000).toFixed(1)}`}
          subtitle="Paid invoices"
          icon={<CreditCard className="h-4 w-4 text-blue-600" />}
          color="blue"
        />
        <KpiCard
          label="Open Tickets"
          value={`${data.openTickets}`}
          subtitle="Awaiting response"
          icon={<Headphones className="h-4 w-4 text-amber-600" />}
          color={data.openTickets > 0 ? "amber" : "stone"}
        />
        <KpiCard
          label="AI Usage"
          value={data.aiUsage.toLocaleString()}
          subtitle="AI replies this month"
          icon={<Brain className="h-4 w-4 text-purple-600" />}
          color="purple"
        />
      </div>

      {/* Alert Cards */}
      {(data.pendingInvoices > 0 || data.webhookFailures24h > 0) && (
        <div className="flex gap-3 flex-wrap">
          {data.pendingInvoices > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              {data.pendingInvoices} pending invoice{data.pendingInvoices !== 1 ? "s" : ""}
            </div>
          )}
          {data.webhookFailures24h > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800">
              <Zap className="h-4 w-4" />
              {data.webhookFailures24h} webhook failure{data.webhookFailures24h !== 1 ? "s" : ""} (24h)
            </div>
          )}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* MRR Trend */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <h3 className="text-xs font-bold text-stone-700 mb-4">MRR Trend (6 months)</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.mrrTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#78716c" }} />
                <YAxis tick={{ fontSize: 10, fill: "#78716c" }} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid #e7e5e4" }}
                  formatter={(v: number) => [`OMR ${(v / 1000).toFixed(1)}`, "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#0F9D63"
                  fill="#0F9D63"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tenant Growth */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <h3 className="text-xs font-bold text-stone-700 mb-4">Tenant Growth (12 months)</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.tenantGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#78716c" }} />
                <YAxis tick={{ fontSize: 10, fill: "#78716c" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid #e7e5e4" }}
                />
                <Line type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Message Volume */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <h3 className="text-xs font-bold text-stone-700 mb-4">Message Volume (30 days)</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.messageVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#78716c" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "#78716c" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid #e7e5e4" }}
                />
                <Bar dataKey="count" fill="#22c55e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Tenants by Revenue */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <h3 className="text-xs font-bold text-stone-700 mb-4">Top Tenants by Revenue</h3>
          <div className="space-y-2">
            {data.topTenantsByRevenue.length === 0 ? (
              <p className="text-xs text-stone-400 py-8 text-center">No revenue data yet</p>
            ) : (
              data.topTenantsByRevenue.map((t, i) => (
                <div key={t.tenantId} className="flex items-center gap-3 text-xs">
                  <span className="text-stone-400 font-mono w-5 text-right">{i + 1}.</span>
                  <span className="font-semibold text-stone-700 flex-1 truncate">{t.tenantName}</span>
                  <span className="font-bold text-emerald-700">
                    OMR {(t.revenue / 1000).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
        <h3 className="text-xs font-bold text-stone-700 mb-4">Recent Platform Activity</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {data.recentActivity.length === 0 ? (
            <p className="text-xs text-stone-400 py-6 text-center">No recent activity</p>
          ) : (
            data.recentActivity.map(ev => (
              <div key={ev.id} className="flex items-start gap-3 text-xs py-1.5 border-b border-stone-100 last:border-0">
                <Activity className="h-3.5 w-3.5 text-stone-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-stone-700">{ev.action}</span>
                  <span className="text-stone-400"> on </span>
                  <span className="font-medium text-stone-600">{ev.entity}</span>
                  {ev.reason && (
                    <span className="text-stone-400 ml-1">— {ev.reason}</span>
                  )}
                </div>
                <span className="text-stone-400 text-[10px] shrink-0">
                  {new Date(ev.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── KPI Card ─── */
function KpiCard({
  label, value, subtitle, icon, color = "stone",
}: {
  label: string
  value: string
  subtitle: string
  icon: React.ReactNode
  color?: string
}) {
  return (
    <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
      <div className="flex items-center justify-between text-stone-400 mb-1">
        <span className="text-[11px] font-bold text-stone-500">{label}</span>
        {icon}
      </div>
      <div className="text-lg sm:text-xl font-black text-stone-900">{value}</div>
      <div className={`text-[10px] font-semibold mt-0.5 text-${color}-600`}>
        {subtitle}
      </div>
    </div>
  )
}
