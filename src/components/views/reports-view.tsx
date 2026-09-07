"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, DollarSign, ShoppingBag, Users, BarChart3, Award, Target, Percent, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/helpers"

export default function ReportsView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Defaults to the last six months, which is what the screen always showed —
  // the difference is that the range is now a real filter rather than a label.
  const today = new Date().toISOString().slice(0, 10)
  const sixMonthsBack = (() => { const d = new Date(); d.setMonth(d.getMonth() - 6); return d.toISOString().slice(0, 10) })()
  const [from, setFrom] = useState(sixMonthsBack)
  const [to, setTo] = useState(today)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/reports?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [from, to])

  if (loading || !data) return <div className="p-6 space-y-4"><Skeleton className="h-20 rounded-xl" /><div className="grid grid-cols-3 gap-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div><Skeleton className="h-64 rounded-xl" /></div>

  const s = data.summary
  const maxRev = Math.max(...data.revenueByMonth.map((m: any) => m.revenue), 1)
  const maxCust = Math.max(...data.customerGrowth.map((m: any) => m.newCustomers), 1)
  const completionRate = s.totalBookings ? (s.completedTours / s.totalBookings) * 100 : 0
  const cancelRate = s.totalBookings ? (s.cancelledOrders / s.totalBookings) * 100 : 0

  const kpis = [
    { label: "Total Revenue", value: formatCurrency(s.totalRevenue), icon: DollarSign, color: "text-emerald-600 bg-emerald-50", sub: `${s.totalBookings} bookings` },
    { label: "Avg Order Value", value: formatCurrency(s.avgOrderValue), icon: ShoppingBag, color: "text-teal-600 bg-teal-50", sub: "per booking" },
    { label: "Web vs WhatsApp", value: `${s.webBookings} / ${s.whatsappBookings}`, icon: Users, color: "text-amber-600 bg-amber-50", sub: "channel split" },
    { label: "Completion Rate", value: `${completionRate.toFixed(0)}%`, icon: Target, color: "text-emerald-600 bg-emerald-50", sub: `${s.completedTours} completed` },
    { label: "Cancellation Rate", value: `${cancelRate.toFixed(0)}%`, icon: Percent, color: "text-rose-600 bg-rose-50", sub: `${s.cancelledOrders} cancelled` },
    { label: "Pending Payments", value: s.pendingPayments.toString(), icon: TrendingUp, color: "text-amber-600 bg-amber-50", sub: "awaiting verification" },
  ]

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-none space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
        <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center"><BarChart3 className="h-5 w-5 text-purple-600" /></div>
          Reports &amp; Analytics
        </h2>
        <p className="text-sm text-stone-500 mt-0.5">
          Performance insights · {data.range ? `${data.range.from} to ${data.range.to}` : "all time"}
        </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[11px] text-stone-500">From
            <Input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} className="mt-1 h-9 bg-white" />
          </label>
          <label className="text-[11px] text-stone-500">To
            <Input type="date" value={to} min={from} max={today} onChange={e => setTo(e.target.value)} className="mt-1 h-9 bg-white" />
          </label>
          <Button variant="outline" size="sm" className="h-9" asChild>
            <a href={`/api/reports?from=${from}&to=${to}&format=csv`} download>
              <Download className="h-3.5 w-3.5 mr-1.5" />Export CSV
            </a>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k, i) => (
          <Card key={i}><CardContent className="p-4">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-2 ${k.color}`}><k.icon className="h-[18px] w-[18px]" /></div>
            <div className="text-lg font-bold text-stone-900 leading-tight">{k.value}</div>
            <div className="text-[11px] text-stone-500">{k.label}</div>
            <div className="text-[10px] text-stone-400 mt-0.5">{k.sub}</div>
          </CardContent></Card>
        ))}
      </div>

      {/* Revenue + Customer Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" />Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-48">
              {data.revenueByMonth.map((m: any, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <div className="text-[10px] font-semibold text-stone-600 opacity-0 group-hover:opacity-100">{formatCurrency(m.revenue)}</div>
                  <div className="w-full flex-1 flex items-end"><div className="w-full rounded-t-lg bg-gradient-to-t from-emerald-500 to-teal-400 min-h-[4px]" style={{ height: `${(m.revenue / maxRev) * 100}%` }} /></div>
                  <div className="text-[10px] text-stone-500">{m.month}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-teal-600" />Customer Growth</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-48">
              {data.customerGrowth.map((m: any, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <div className="text-[10px] font-semibold text-stone-600 opacity-0 group-hover:opacity-100">{m.newCustomers}</div>
                  <div className="w-full flex-1 flex items-end"><div className="w-full rounded-t-lg bg-gradient-to-t from-teal-500 to-cyan-400 min-h-[4px]" style={{ height: `${(m.newCustomers / maxCust) * 100}%` }} /></div>
                  <div className="text-[10px] text-stone-500">{m.month}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Tours */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4 text-amber-500" />Top Performing Tours</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.topTours.slice(0, 10).map((t: any, i: number) => {
              const maxCount = Math.max(...data.topTours.map((tt: any) => tt._count), 1)
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-stone-200 text-stone-700" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-stone-100 text-stone-500"}`}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium truncate">{t.tour?.name}</span><span className="text-xs font-semibold text-stone-600">{t._count} bookings</span></div>
                    <div className="flex items-center gap-2 mt-1"><div className="flex-1 h-1.5 rounded-full bg-stone-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${(t._count / maxCount) * 100}%` }} /></div><span className="text-[10px] text-stone-400">{formatCurrency(t._sum.totalAmount || 0)}</span></div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
