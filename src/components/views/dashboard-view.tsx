"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useApp } from "@/lib/store"
import { WhatsAppCatalogCard } from "@/components/views/whatsapp-catalog-card"
import { StorefrontCard } from "@/components/views/storefront-card"
import { SmartMenuCard } from "@/components/views/smart-menu-card"
import { TenantOnboardingWizard } from "@/components/views/tenant-onboarding-wizard"
import { formatCurrency, timeAgo, prettifyStatus } from "@/lib/helpers"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import {
  Wallet, ShoppingBag, Clock, Calendar, TrendingUp,
  Users, Bell, ArrowRight, CheckCircle, AlertCircle, Sparkles, Map,
  CreditCard, Megaphone, Bot, Utensils,
  Plus, FileText, Layers, MapPin, ShieldCheck, Building2,
} from "lucide-react"

interface DashboardData {
  kpis: {
    totalOrders: number
    totalRevenue: number
    pendingVerifications: number
    openConversations: number
    upcomingTours: number
    activeTours: number
    totalCustomers: number
    confirmedOrders: number
    completedOrders: number
  }
  channelStats: { channel: string; _count: number; _sum: { totalAmount: number } }[]
  statusStats: { orderStatus: string; _count: number }[]
  paymentMethodStats: { method: string; _count: number; _sum: { amount: number } }[]
  topTours: { tourId: string; _count: number; _sum: { totalAmount: number }; tour: any }[]
  revenueByDay: { date: string; label: string; revenue: number; orders: number }[]
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

function isDashboardData(value: unknown): value is DashboardData {
  if (!value || typeof value !== "object") return false
  const data = value as Partial<DashboardData>
  return !!data.kpis && typeof data.kpis === "object"
    && Array.isArray(data.channelStats)
    && Array.isArray(data.statusStats)
    && Array.isArray(data.paymentMethodStats)
    && Array.isArray(data.topTours)
    && Array.isArray(data.revenueByDay)
}

const NOTIF_ICONS: Record<string, { icon: any; color: string; bg: string }> = {
  PAYMENT_SUBMITTED: { icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
  PAYMENT_APPROVED: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  PAYMENT_REJECTED: { icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50" },
  NEW_BOOKING: { icon: ShoppingBag, color: "text-teal-600", bg: "bg-teal-50" },
}

const CHANNEL_COLORS: Record<string, string> = {
  WEB: "bg-emerald-500",
  WHATSAPP: "bg-teal-500",
  ADMIN: "bg-amber-500",
  API: "bg-purple-500",
}

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-400",
  PAYMENT_SUBMITTED: "bg-blue-400",
  CONFIRMED: "bg-emerald-500",
  COMPLETED: "bg-emerald-600",
  CANCELLED: "bg-rose-400",
  REFUNDED: "bg-purple-400",
  NO_SHOW: "bg-stone-400",
}

export default function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [features, setFeatures] = useState<any>(null)
  const [corporateQuotes, setCorporateQuotes] = useState<any[]>([])
  const [corporateStats, setCorporateStats] = useState({ total: 0, new: 0, reviewing: 0, quoted: 0, won: 0 })
  const { setView, staffUser } = useApp()
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    fetch("/api/features")
      .then(r => r.ok ? r.json() : null)
      .then(f => setFeatures(f))
      .catch(() => {})

    const loadData = async () => {
      try {
        const [dashRes, notifRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/notifications?unreadOnly=true"),
        ])
        const dashData: unknown = await dashRes.json()
        const notifData = await notifRes.json()
        if (dashRes.ok && isDashboardData(dashData)) setData(dashData)
        else setData(null)
        setNotifications(notifData.notifications || [])
      } catch (e) {
        console.error("Dashboard load error:", e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
    setNow(new Date())
    const interval = setInterval(loadData, 30000)
    const clock = setInterval(() => setNow(new Date()), 1000)
    return () => { clearInterval(interval); clearInterval(clock) }
  }, [])

  useEffect(() => {
    if (!features?.corporate) return
    fetch("/api/corporate/quotes")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.quotes) setCorporateQuotes(d.quotes)
        if (d?.stats) setCorporateStats(d.stats)
      })
      .catch(() => {})
  }, [features?.corporate])

  if (loading || !data) {
    return (
      <div className="p-4 md:p-6 lg:p-8 w-full max-w-none space-y-6">
        <Skeleton className="h-24 rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    )
  }

  const isCorporate = Boolean(features?.corporate)
  const isRestaurant = !isCorporate && (Boolean(features?.restaurant && !features?.tours) || Boolean(features?.restaurant))
  const k = data.kpis
  const maxRevenue = Math.max(...data.revenueByDay.map(d => d.revenue), 1)
  const totalChannel = data.channelStats.reduce((s, c) => s + c._count, 0) || 1
  const totalStatus = data.statusStats.reduce((s, c) => s + c._count, 0) || 1
  const greetingName = staffUser?.name ? staffUser.name.split(" ")[0] : "Admin"
  const corporateQuotedAmount = corporateQuotes.reduce((sum, q) => sum + (Number(q.quotedAmount) || 0), 0)

  const quickActions = isCorporate
    ? [
        { label: "New Quotation (RFQ)", icon: Plus, view: "corporate" as const, color: "from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600" },
        { label: "Architectural Systems", icon: Building2, view: "corporate" as const, color: "from-slate-700 to-slate-900 hover:from-slate-600 hover:to-slate-800" },
        { label: "WhatsApp Inbox", icon: WhatsAppIcon, view: "inbox" as const, color: "from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600" },
        { label: "Send Broadcast", icon: Megaphone, view: "campaigns" as const, color: "from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600" },
      ]
    : isRestaurant
    ? [
        { label: "Live Orders", icon: ShoppingBag, view: "restaurant" as const, color: "from-amber-600 to-orange-700 hover:from-amber-500 hover:to-orange-600" },
        { label: "Verify Payments", icon: CreditCard, view: "payments" as const, color: "from-amber-600 to-orange-700 hover:from-amber-500 hover:to-orange-600" },
        { label: "Send Broadcast", icon: Megaphone, view: "campaigns" as const, color: "from-rose-600 to-pink-700 hover:from-rose-500 hover:to-pink-600" },
        { label: "Open Inbox", icon: WhatsAppIcon, view: "inbox" as const, color: "from-teal-600 to-cyan-700 hover:from-teal-500 hover:to-cyan-600" },
      ]
    : [
        { label: "New Booking", icon: ShoppingBag, view: "bookings" as const, color: "from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600" },
        { label: "Verify Payments", icon: CreditCard, view: "payments" as const, color: "from-amber-600 to-orange-700 hover:from-amber-500 hover:to-orange-600" },
        { label: "Send Broadcast", icon: Megaphone, view: "campaigns" as const, color: "from-rose-600 to-pink-700 hover:from-rose-500 hover:to-pink-600" },
        { label: "Open Inbox", icon: WhatsAppIcon, view: "inbox" as const, color: "from-teal-600 to-cyan-700 hover:from-teal-500 hover:to-cyan-600" },
      ]

  const kpiCards = isCorporate
    ? [
        {
          label: "Quoted Pipeline",
          value: corporateQuotedAmount > 0 ? formatCurrency(corporateQuotedAmount) : formatCurrency(k.totalRevenue),
          icon: Wallet,
          iconColor: "text-sky-700",
          iconBg: "bg-sky-100/80 border border-sky-200/60",
          sub: `${corporateStats.quoted} quoted · ${corporateStats.won} won`,
          badge: "Pipeline",
          badgeColor: "bg-sky-100 text-sky-800",
          view: "corporate" as const,
        },
        {
          label: "Quotation Requests",
          value: corporateStats.total > 0 ? corporateStats.total.toString() : k.totalOrders.toString(),
          icon: FileText,
          iconColor: "text-blue-700",
          iconBg: "bg-blue-100/80 border border-blue-200/60",
          sub: `${corporateStats.new} new inquiries`,
          badge: "RFQs",
          badgeColor: "bg-blue-100 text-blue-800",
          view: "corporate" as const,
        },
        {
          label: "Engineering Review",
          value: corporateStats.reviewing.toString(),
          icon: Clock,
          iconColor: "text-amber-700",
          iconBg: "bg-amber-100/80 border border-amber-200/60",
          sub: corporateStats.reviewing > 0 ? "Drawings & specs review" : "All reviewed",
          pulse: corporateStats.reviewing > 0,
          badge: corporateStats.reviewing > 0 ? "Action" : "Clear",
          badgeColor: corporateStats.reviewing > 0 ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-stone-100 text-stone-600",
          view: "corporate" as const,
        },
        {
          label: "Open WhatsApp Chats",
          value: k.openConversations.toString(),
          icon: WhatsAppIcon,
          iconColor: "text-emerald-700",
          iconBg: "bg-emerald-100/80 border border-emerald-200/60",
          sub: "Customer inquiries",
          badge: "Live",
          badgeColor: "bg-emerald-100 text-emerald-800",
          view: "inbox" as const,
        },
        {
          label: "EMADI Systems Flow",
          value: "10 Steps",
          icon: Building2,
          iconColor: "text-sky-700",
          iconBg: "bg-sky-100/80 border border-sky-200/60",
          sub: "Aluminium & Glass Engine",
          badge: "Active",
          badgeColor: "bg-sky-100 text-sky-800",
          view: "corporate" as const,
        },
      ]
    : [
        { label: "Total Revenue", value: formatCurrency(k.totalRevenue), icon: Wallet, iconColor: "text-emerald-700", iconBg: "bg-emerald-100/80 border border-emerald-200/60", sub: `${k.confirmedOrders} confirmed`, badge: "Sales", badgeColor: "bg-emerald-100 text-emerald-800", view: "reports" as const },
        { label: "Total Orders", value: k.totalOrders.toString(), icon: ShoppingBag, iconColor: "text-teal-700", iconBg: "bg-teal-100/80 border border-teal-200/60", sub: `${k.completedOrders} completed`, badge: "Volume", badgeColor: "bg-teal-100 text-teal-800", view: isRestaurant ? ("restaurant" as const) : ("bookings" as const) },
        { label: "Pending Verifications", value: k.pendingVerifications.toString(), icon: Clock, iconColor: "text-amber-700", iconBg: "bg-amber-100/80 border border-amber-200/60", sub: k.pendingVerifications > 0 ? "Action required" : "All caught up", pulse: k.pendingVerifications > 0, badge: k.pendingVerifications > 0 ? "Review" : "Clear", badgeColor: k.pendingVerifications > 0 ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-stone-100 text-stone-600", view: "payments" as const },
        { label: "Open Chats", value: k.openConversations.toString(), icon: WhatsAppIcon, iconColor: "text-emerald-700", iconBg: "bg-emerald-100/80 border border-emerald-200/60", sub: "WhatsApp inbox", badge: "Live", badgeColor: "bg-emerald-100 text-emerald-800", view: "inbox" as const },
        isRestaurant
          ? { label: "Smart Menu", value: (k.completedOrders || 0).toString(), icon: Utensils, iconColor: "text-amber-700", iconBg: "bg-amber-100/80 border border-amber-200/60", sub: "Digital menu & KDS", badge: "Dining", badgeColor: "bg-amber-100 text-amber-800", view: "restaurant" as const }
          : { label: "Upcoming Tours", value: k.upcomingTours.toString(), icon: Calendar, iconColor: "text-rose-700", iconBg: "bg-rose-100/80 border border-rose-200/60", sub: "Next 24 hours", badge: "Scheduled", badgeColor: "bg-rose-100 text-rose-800", view: "tours" as const },
      ]

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-none space-y-6">
      {/* The link a business hands to customers — hidden for Corporate */}
      {!isCorporate && <StorefrontCard />}

      {/* Smart Menu & Table Ordering Quick Card — hidden for Corporate */}
      {!isCorporate && isRestaurant && <SmartMenuCard />}

      {/* Welcome + Quick Actions */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-stone-200/80 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              Welcome back, {greetingName} 👋
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1 font-medium">
              {now ? `${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} · ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Workspace</span>
            </div>
          </div>
        </div>

        {/* Quick action triggers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {quickActions.map((a, i) => (
            <button
              key={i}
              onClick={() => setView(a.view)}
              className={`flex items-center justify-center sm:justify-start gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r ${a.color} text-white text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99]`}
            >
              <a.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Tenant Setup & Onboarding Wizard */}
      <TenantOnboardingWizard
        onNavigate={v => setView(v as never)}
        conversationCount={k.openConversations}
        orderCount={k.totalOrders}
      />

      {/* KPI Cards */}
      <div data-tour="dashboard-kpis" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {kpiCards.map((card, i) => (
          <button
            key={i}
            onClick={() => setView(card.view)}
            className="text-left group focus:outline-hidden"
          >
            <Card className="rounded-2xl border-stone-200/90 bg-white hover:border-emerald-300 hover:shadow-md transition-all duration-200 h-full flex flex-col justify-between overflow-hidden">
              <CardContent className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                      <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${card.badgeColor}`}>
                      {card.badge}
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight leading-tight">
                    {card.value}
                  </div>
                  <div className="text-xs font-semibold text-stone-600 mt-0.5 truncate">
                    {card.label}
                  </div>
                </div>
                <div className="text-[11px] font-medium text-stone-400 mt-3 pt-2 border-t border-stone-100 flex items-center justify-between group-hover:text-emerald-700 transition-colors">
                  <span className="truncate">{card.sub}</span>
                  <ArrowRight className="h-3 w-3 shrink-0 ml-1 transform group-hover:translate-x-0.5 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* Revenue Chart + Channel Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card data-tour="dashboard-chart" className="lg:col-span-2 rounded-2xl border-stone-200/90 shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-3 border-b border-stone-100/80 bg-stone-50/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-stone-900">
                <div className="h-7 w-7 rounded-lg bg-emerald-100/80 flex items-center justify-center text-emerald-700">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <span>Revenue — Last 7 Days</span>
              </CardTitle>
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200/80 font-bold px-2.5 py-1 text-xs">
                {formatCurrency(data.revenueByDay.reduce((s, d) => s + d.revenue, 0))} Total
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-end justify-between gap-3 h-52">
              {data.revenueByDay.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="text-[10px] font-bold text-stone-700 opacity-0 group-hover:opacity-100 transition-opacity bg-stone-100 px-1.5 py-0.5 rounded shadow-xs">
                    {formatCurrency(day.revenue)}
                  </div>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-xl bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-400 hover:from-emerald-700 hover:to-teal-500 transition-all min-h-[6px] relative group shadow-xs cursor-pointer"
                      style={{ height: `${Math.max((day.revenue / maxRevenue) * 100, 4)}%` }}
                    >
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-full text-center">
                        <span className="text-[10px] font-bold text-stone-500">{day.orders > 0 ? day.orders : ""}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-stone-600 font-semibold">{day.label}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100 text-xs text-stone-500 font-medium">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-xs" />
                <span>Daily Sales Volume</span>
              </span>
              <span>Numbers above bars = order count</span>
            </div>
          </CardContent>
        </Card>

        <Card data-tour="dashboard-channels" className="rounded-2xl border-stone-200/90 shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-3 border-b border-stone-100/80 bg-stone-50/40">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-stone-900">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center">
                <WhatsAppIcon className="h-4.5 w-4.5" />
              </div>
              <span>Channel Split</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {/* Donut visualization */}
            <div className="relative w-36 h-36 mx-auto">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                {(() => {
                  let offset = 0
                  return data.channelStats.map((c, i) => {
                    const pct = (c._count / totalChannel) * 100
                    const dash = pct
                    const colors = ["#059669", "#0d9488", "#d97706", "#9333ea"]
                    const circle = (
                      <circle
                        key={i}
                        cx="18" cy="18" r="15.915"
                        fill="none"
                        stroke={colors[i % 4]}
                        strokeWidth="3.8"
                        strokeDasharray={`${dash} ${100 - dash}`}
                        strokeDashoffset={-offset}
                        className="transition-all duration-500"
                      />
                    )
                    offset += dash
                    return circle
                  })
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-2xl font-black text-stone-900 tracking-tight">{isCorporate ? corporateStats.total : totalChannel}</div>
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{isCorporate ? "Inquiries" : isRestaurant ? "Orders" : "Bookings"}</div>
              </div>
            </div>
            <div className="space-y-2 pt-2">
              {data.channelStats.map((c, i) => {
                const colors = ["bg-emerald-600", "bg-teal-600", "bg-amber-600", "bg-purple-600"]
                return (
                  <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-stone-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${colors[i % 4]}`} />
                      <span className="font-semibold text-stone-700">{c.channel}</span>
                    </div>
                    <div className="flex items-center gap-2.5 font-mono">
                      <span className="font-bold text-stone-900">{c._count}</span>
                      <span className="text-stone-400 text-[11px]">{formatCurrency(c._sum.totalAmount || 0)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Tours / Corporate RFQs + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {isCorporate ? (
          <Card className="rounded-2xl border-stone-200/90 shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-stone-100/80 bg-stone-50/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-stone-900">
                  <div className="h-7 w-7 rounded-lg bg-sky-100/80 flex items-center justify-center text-sky-700">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <span>Recent Quotation Requests (RFQs)</span>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView("corporate")}
                  className="text-xs text-sky-700 hover:text-sky-800 hover:bg-sky-50 font-semibold"
                >
                  Open Console <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {corporateQuotes.length === 0 ? (
                <div className="text-center py-8 text-xs text-stone-500">
                  <Building2 className="h-8 w-8 mx-auto mb-2 text-sky-500/70" />
                  <p className="font-semibold text-stone-800">No Quotation Requests Yet</p>
                  <p className="mt-1 text-stone-500">
                    Client submissions for aluminium, glass, and architectural systems will appear here.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setView("corporate")}
                    className="mt-3 text-xs border-sky-300 text-sky-700 hover:bg-sky-50"
                  >
                    View EMADI Workflow &amp; Products
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {corporateQuotes.slice(0, 5).map((q, i) => (
                    <div key={q.id || i} className="flex items-center justify-between p-3 rounded-xl bg-stone-50/70 hover:bg-stone-100/80 border border-stone-200/60 transition-colors">
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-900 truncate">{q.customerName}</span>
                          <Badge className={
                            q.status === "NEW" ? "bg-amber-100 text-amber-800 border-amber-200 text-[10px]" :
                            q.status === "REVIEWING" ? "bg-sky-100 text-sky-800 border-sky-200 text-[10px]" :
                            q.status === "QUOTED" ? "bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px]" :
                            q.status === "WON" ? "bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]" :
                            "bg-stone-100 text-stone-700 text-[10px]"
                          }>
                            {q.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-stone-500 truncate mt-0.5 font-medium">
                          {q.productType} · {q.projectLocation}
                        </div>
                        {q.customerPhone && (
                          <div className="text-[11px] text-stone-400 font-mono mt-0.5">
                            {q.customerPhone}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {q.quotedAmount ? (
                          <div className="text-xs font-bold text-emerald-700 font-mono">
                            {formatCurrency(q.quotedAmount)}
                          </div>
                        ) : (
                          <div className="text-[11px] font-semibold text-stone-400">
                            Pending Quote
                          </div>
                        )}
                        <button
                          onClick={() => setView("corporate")}
                          className="text-[11px] text-sky-600 hover:underline mt-1 block font-medium"
                        >
                          Review &amp; Quote →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl border-stone-200/90 shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-stone-100/80 bg-stone-50/40">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-stone-900">
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${isRestaurant ? "bg-amber-100/80 text-amber-700" : "bg-emerald-100/80 text-emerald-700"}`}>
                  {isRestaurant ? <Utensils className="h-4 w-4" /> : <Map className="h-4 w-4" />}
                </div>
                <span>{isRestaurant ? "Popular Dishes & Menu Performance" : "Top Performing Tours"}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {isRestaurant && data.topTours.length === 0 ? (
                <div className="text-center py-8 text-xs text-stone-500">
                  <Utensils className="h-8 w-8 mx-auto mb-2 text-amber-500/70" />
                  <p className="font-semibold text-stone-800">Live Menu Orders Tracking</p>
                  <p className="mt-1 text-stone-500">Popular dishes and customer orders will appear here automatically.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {data.topTours.slice(0, 5).map((t, i) => {
                    const maxCount = Math.max(...data.topTours.map(tt => tt._count), 1)
                    return (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-stone-50 transition-colors">
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                          i === 0 ? "bg-amber-100 text-amber-800 border border-amber-300/80" :
                          i === 1 ? "bg-slate-100 text-slate-700 border border-slate-300/80" :
                          i === 2 ? "bg-orange-100 text-orange-800 border border-orange-300/80" :
                          "bg-stone-100 text-stone-500"
                        }`}>
                          #{i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-stone-900 truncate">{t.tour?.name || (isRestaurant ? "Dish Item" : "Tour")}</span>
                            <span className="text-xs font-bold text-stone-700">{t._count} {isRestaurant ? "orders" : "bookings"}</span>
                          </div>
                          <div className="flex items-center gap-2.5 mt-1.5">
                            <div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${isRestaurant ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gradient-to-r from-emerald-500 to-teal-500"}`}
                                style={{ width: `${(t._count / maxCount) * 100}%` }}
                              />
                            </div>
                          </div>
                          <span className={`text-[11px] font-bold font-mono ${isRestaurant ? "text-amber-800" : "text-emerald-700"}`}>{formatCurrency(t._sum.totalAmount || 0)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card data-tour="dashboard-recent" className="rounded-2xl border-stone-200/90 shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-3 border-b border-stone-100/80 bg-stone-50/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-stone-900">
                <div className="h-7 w-7 rounded-lg bg-amber-100/80 flex items-center justify-center text-amber-700">
                  <Bell className="h-4 w-4" />
                </div>
                <span>Recent Notifications</span>
              </CardTitle>
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg"
                  onClick={async () => {
                    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAllRead: true }) })
                    setNotifications([])
                  }}
                >Mark all read</Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold text-stone-700">No new notifications</p>
                <p className="text-xs text-stone-400 mt-0.5">You are completely up to date</p>
              </div>
            ) : (
              <ScrollArea className="h-[250px] pr-2">
                <div className="space-y-2">
                  {notifications.slice(0, 10).map(n => {
                    const cfg = NOTIF_ICONS[n.type] || NOTIF_ICONS.NEW_BOOKING
                    return (
                      <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl bg-stone-50/70 hover:bg-stone-100/80 border border-stone-200/60 transition-colors">
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${cfg.bg}`}>
                          <cfg.icon className={`h-4 w-4 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-stone-900">{n.title}</div>
                          <div className="text-xs text-stone-600 line-clamp-2 mt-0.5">{n.message}</div>
                          <div className="text-[10px] text-stone-400 mt-1 font-medium">{timeAgo(n.createdAt)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Status / Pipeline + Payment Methods / Facilities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {isCorporate ? (
          <Card className="rounded-2xl border-stone-200/90 shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-stone-100/80 bg-stone-50/40">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-stone-900">
                <div className="h-7 w-7 rounded-lg bg-sky-100/80 flex items-center justify-center text-sky-700">
                  <Layers className="h-4 w-4" />
                </div>
                <span>Architectural RFQ Pipeline Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-3">
              {[
                { label: "New Inbound Inquiries", count: corporateStats.new, color: "bg-amber-500", pct: corporateStats.total ? (corporateStats.new / corporateStats.total) * 100 : 0 },
                { label: "Engineering Drawing Review", count: corporateStats.reviewing, color: "bg-sky-500", pct: corporateStats.total ? (corporateStats.reviewing / corporateStats.total) * 100 : 0 },
                { label: "Official Quotations Submitted", count: corporateStats.quoted, color: "bg-indigo-500", pct: corporateStats.total ? (corporateStats.quoted / corporateStats.total) * 100 : 0 },
                { label: "Contracts Won / Closed", count: corporateStats.won, color: "bg-emerald-500", pct: corporateStats.total ? (corporateStats.won / corporateStats.total) * 100 : 0 },
              ].map((s, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-stone-700 font-semibold">{s.label}</span>
                    <span className="font-bold text-stone-900 font-mono">{s.count} ({s.pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div className={`h-full rounded-full ${s.color} transition-all duration-500`} style={{ width: `${Math.max(s.pct, s.count > 0 ? 6 : 0)}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl border-stone-200/90 shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-stone-100/80 bg-stone-50/40">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-stone-900">
                <div className="h-7 w-7 rounded-lg bg-emerald-100/80 flex items-center justify-center text-emerald-700">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <span>Order Status Breakdown</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-3">
              {data.statusStats.map((s, i) => {
                const pct = (s._count / totalStatus) * 100
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-stone-700 font-semibold">{prettifyStatus(s.orderStatus)}</span>
                      <span className="font-bold text-stone-900 font-mono">{s._count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                      <div className={`h-full rounded-full ${STATUS_COLORS[s.orderStatus] || "bg-stone-400"} transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {isCorporate ? (
          <Card className="rounded-2xl border-stone-200/90 shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-stone-100/80 bg-stone-50/40">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-stone-900">
                <div className="h-7 w-7 rounded-lg bg-emerald-100/80 flex items-center justify-center text-emerald-700">
                  <MapPin className="h-4 w-4" />
                </div>
                <span>Factory &amp; Showroom Facilities</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl border bg-sky-50/60 border-sky-200/80">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-3 shadow-xs bg-sky-100 text-sky-700">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-bold text-stone-900 uppercase tracking-wide">Main Factory</div>
                  <div className="text-xs text-stone-500 mt-0.5">Rusayl Industrial Estate, Muscat</div>
                  <div className="text-xs font-semibold text-sky-800 mt-2">CNC &amp; Thermal Break Extrusions</div>
                </div>
                <div className="p-4 rounded-2xl border bg-emerald-50/60 border-emerald-200/80">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-3 shadow-xs bg-emerald-100 text-emerald-700">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-bold text-stone-900 uppercase tracking-wide">Design Showroom</div>
                  <div className="text-xs text-stone-500 mt-0.5">Al Khuwair Commercial District</div>
                  <div className="text-xs font-semibold text-emerald-800 mt-2">Full-Scale Mockups &amp; Glazing</div>
                </div>
              </div>
              <div className="mt-4 p-3.5 rounded-xl bg-sky-50/80 border border-sky-200/80 flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-sky-600 mt-0.5 shrink-0" />
                <p className="text-xs text-sky-900 leading-relaxed font-medium">
                  <strong>Oman Quality Standards:</strong> Qualicoat Class 2 certified architectural powder coating with 20-year coastal warranty.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl border-stone-200/90 shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-stone-100/80 bg-stone-50/40">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-stone-900">
                <div className="h-7 w-7 rounded-lg bg-amber-100/80 flex items-center justify-center text-amber-700">
                  <CreditCard className="h-4 w-4" />
                </div>
                <span>Payment Methods</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-2 gap-3.5">
                {data.paymentMethodStats.map((p, i) => {
                  const isBank = p.method === "BANK_TRANSFER"
                  return (
                    <div key={i} className={`p-4 rounded-2xl border ${isBank ? "bg-amber-50/60 border-amber-200/80" : "bg-teal-50/60 border-teal-200/80"}`}>
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 shadow-xs ${isBank ? "bg-amber-100 text-amber-700" : "bg-teal-100 text-teal-700"}`}>
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div className="text-xs font-bold text-stone-900 uppercase tracking-wide">{isBank ? "Bank Transfer" : "AmwalPay"}</div>
                      <div className="text-xs text-stone-500 mt-0.5">{p._count} transactions</div>
                      <div className="text-lg font-black text-stone-900 mt-2 font-mono">{formatCurrency(p._sum.amount || 0)}</div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                  <strong>Live Processing:</strong> Customer orders and automated payment verification are active across your workspace.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Meta WhatsApp Catalog & Commerce — hidden for Corporate */}
      {!isCorporate && <WhatsAppCatalogCard />}
    </div>
  )
}
