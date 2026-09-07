"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, TrendingUp, CreditCard, Users, PieChart } from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts"

interface RevenueData {
  mrrTrend: { month: string; amount: number }[]
  mrrTotal: number
  activeTenantsCount: number
  revenueLast30d: number
  pendingInvoices: number
}

const COLORS = ["#0F9D63", "#0d9488", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"]

export function RevenueAnalyticsPanel() {
  const [data, setData] = useState<RevenueData>({
    mrrTrend: [],
    mrrTotal: 0,
    activeTenantsCount: 0,
    revenueLast30d: 0,
    pendingInvoices: 0,
  })
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/platform/analytics")
      if (!res.ok) throw new Error()
      const d = await res.json()
      setData({
        mrrTrend: Array.isArray(d.mrrTrend) ? d.mrrTrend : [],
        mrrTotal: Number(d.mrrTotal) || 0,
        activeTenantsCount: Number(d.activeTenantsCount) || 0,
        revenueLast30d: Number(d.revenueLast30d) || 0,
        pendingInvoices: Number(d.pendingInvoices) || 0,
      })
    } catch {
      toast.error("Could not load revenue data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const arpu = data.activeTenantsCount > 0 ? data.mrrTotal / data.activeTenantsCount : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-900">Revenue Analytics</h2>
          <p className="text-xs text-stone-500 mt-0.5">Financial performance, monthly recurring revenue, and subscription trends.</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 transition self-start sm:self-auto"
        >
          <TrendingUp className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-stone-500">MRR</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-stone-900">OMR {data.mrrTotal.toFixed(1)}</div>
          <div className="text-[10px] font-semibold text-emerald-600">Monthly Recurring</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-stone-500">ARPU</span>
            <Users className="h-4 w-4 text-teal-600" />
          </div>
          <div className="text-xl font-black text-stone-900">OMR {arpu.toFixed(1)}</div>
          <div className="text-[10px] font-semibold text-teal-600">Avg Revenue Per Tenant</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-stone-500">Revenue (30d)</span>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-stone-900">OMR {(data.revenueLast30d / 1000).toFixed(1)}</div>
          <div className="text-[10px] font-semibold text-blue-600">Collected</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-stone-500">Pending</span>
            <PieChart className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-700">{data.pendingInvoices}</div>
          <div className="text-[10px] font-semibold text-amber-600">Unpaid Invoices</div>
        </div>
      </div>

      {/* MRR Trend Chart */}
      <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
        <h3 className="text-xs font-bold text-stone-700 mb-4">MRR Trend (6 months)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.mrrTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#78716c" }} />
              <YAxis tick={{ fontSize: 10, fill: "#78716c" }} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid #e7e5e4" }}
                formatter={(v: number) => [`OMR ${(v / 1000).toFixed(2)}`, "Revenue"]}
              />
              <Area type="monotone" dataKey="amount" stroke="#0F9D63" fill="#0F9D63" fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
