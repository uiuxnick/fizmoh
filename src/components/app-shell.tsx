"use client"

import { NotificationCenter } from "@/components/notification-center"

import { useApp, type ViewKey } from "@/lib/store"
import { pathForView, viewForPath } from "@/lib/admin-routes"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  LayoutDashboard, Map, ShoppingBag, CreditCard,
  FileText, Megaphone, Users, UserCog, Workflow, BarChart3, Settings,
  Building2, Globe, Bell, Menu, CalendarDays, CalendarClock, StampIcon, BookOpen, Sparkles, ShieldCheck, LogOut, Ticket, Newspaper, History, User, Shield, Smartphone, Utensils, Code2, Database, Video,
  Headphones, Activity, Gauge, Receipt, QrCode, Share2, Contact2,
  Facebook, Instagram, ChevronDown, ChefHat, Store, ExternalLink, Mail, MessageCircle,
} from "lucide-react"
import { SessionGuard } from "@/components/session-guard"
import { Brand } from "@/components/brand"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"

const ViewRouter = dynamic(() => import("@/components/view-router"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin" />
        <p className="text-sm text-stone-500">Loading...</p>
      </div>
    </div>
  ),
})

// The staff sign-in screen. The older login-page carried a customer-facing
// storefront login beside it, which the platform no longer has a use for.
const StaffLogin = dynamic(() => import("@/components/staff-login").then(m => m.StaffLogin), { ssr: false })
const Onboarding = dynamic(() => import("@/components/onboarding").then(m => m.Onboarding), { ssr: false })
const OnboardingBanner = dynamic(() => import("@/components/onboarding").then(m => m.OnboardingBanner), { ssr: false })
const PlatformAnnouncementBanner = dynamic(() => import("@/components/announcement-banner").then(m => m.PlatformAnnouncementBanner), { ssr: false })
// Server-rendered on purpose. This is the public marketing page: with
// ssr:false a crawler — and anyone on a slow connection — received an empty
// document, so the one page whose job is to be found could not be indexed.
const MarketingHome = dynamic(() => import("@/components/marketing-home"))

export interface SubmenuItem {
  key: string
  label: string
  icon?: any
  emoji?: string
  channel?: "ALL" | "WHATSAPP" | "FACEBOOK" | "INSTAGRAM"
  campaignChannel?: "ALL" | "WHATSAPP" | "FACEBOOK" | "INSTAGRAM" | "EMAIL" | "COMMENT_TO_DM"
  accent?: string
  badge?: string
  tab?: string
  path?: string
}

interface NavItem {
  key: ViewKey
  label: string
  icon: any
  group: string
  /**
   * Only shown when this section is switched on for the business and included
   * in its plan. The endpoint answers both questions as one boolean, because
   * from the sidebar's point of view they are the same question.
   */
  feature?: "appointments" | "visa" | "tours" | "broadcast" | "flows" | "ai" | "knowledge" | "calls" | "payments" | "platform" | "hospital" | "restaurant" | "catalog" | "woocommerce" | "content" | "reports" | "digital_qr" | "digital_vcard" | "social_inbox" | "live_chat"
  badge?: string
  accent?: string
  hash?: string
  path?: string
  submenu?: SubmenuItem[]
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { key: "customer-site", label: "Customer Website", icon: Globe, group: "Overview", accent: "text-teal-600" },
  { key: "tours", label: "Tours & Slots", icon: Map, group: "Operations", feature: "tours" },
  {
    key: "restaurant",
    label: "Smart Menu & Ordering",
    icon: Utensils,
    group: "Operations",
    accent: "text-amber-500",
    badge: "New",
    submenu: [
      { key: "rest-overview", label: "Overview", tab: "overview", emoji: "📊", icon: LayoutDashboard, accent: "text-emerald-400" },
      { key: "rest-kds", label: "Live Kitchen (KDS)", tab: "kitchen", path: "/dashboard/addons/smart-menu-ordering/kitchen", emoji: "👨‍🍳", icon: ChefHat, accent: "text-rose-400", badge: "LIVE" },
      { key: "rest-menus", label: "Digital Menus", tab: "menu", emoji: "📖", icon: BookOpen, accent: "text-amber-400" },
      { key: "rest-dishes", label: "Dishes & Pricing", tab: "menu", emoji: "🍽️", icon: Utensils, accent: "text-orange-400" },
      { key: "rest-tables", label: "Tables & QR Codes", tab: "tables", emoji: "🪑", icon: QrCode, accent: "text-emerald-400" },
      { key: "rest-orders", label: "Live Orders", tab: "orders", emoji: "🛍️", icon: ShoppingBag, accent: "text-indigo-400" },
      { key: "rest-waiter", label: "Waiter Calls", tab: "waiter_requests", emoji: "🔔", icon: Bell, accent: "text-teal-400" },
      { key: "rest-ai", label: "AI Menu Scanner", tab: "ai_import", emoji: "✨", icon: Sparkles, accent: "text-purple-400", badge: "AI" },
      { key: "rest-branches", label: "Branches", tab: "branches", emoji: "🏪", icon: Store, accent: "text-blue-400" },
    ],
  },
  { key: "bookings", label: "Bookings & Orders", icon: ShoppingBag, group: "Operations", feature: "tours" },
  { key: "calendar", label: "Booking Calendar", icon: CalendarDays, group: "Operations", feature: "tours" },
  { key: "appointments", label: "Appointments", icon: CalendarClock, group: "Operations", feature: "appointments" },
  { key: "hospital", label: "Hospital", icon: Building2, group: "Operations", feature: "hospital", accent: "text-blue-600" },
  { key: "visa", label: "Visa Assistance", icon: StampIcon, group: "Operations", feature: "visa" },
  { key: "payments", label: "Payment Verification", icon: CreditCard, group: "Operations", badge: "queue", feature: "payments" },
  { key: "inbox", label: "WhatsApp Inbox", icon: WhatsAppIcon, group: "WhatsApp Commerce", accent: "text-emerald-600" },
  { key: "catalog", label: "Catalog & Products", icon: ShoppingBag, group: "WhatsApp Commerce", accent: "text-purple-600", feature: "catalog" },
  { key: "woocommerce", label: "WooCommerce Store", icon: ShoppingBag, group: "WhatsApp Commerce", accent: "text-indigo-600", feature: "woocommerce" },
  { key: "ai-assistant", label: "AI Assistant", icon: Sparkles, group: "WhatsApp Commerce", accent: "text-amber-600", feature: "ai" },
  { key: "knowledge", label: "Knowledge Base", icon: BookOpen, group: "WhatsApp Commerce", feature: "knowledge" },
  { key: "bot-builder", label: "Bot & Automation", icon: Workflow, group: "WhatsApp Commerce", accent: "text-emerald-600", feature: "flows" },
  { key: "whatsapp-numbers", label: "Numbers", icon: Smartphone, group: "WhatsApp Commerce" },
  { key: "whatsapp-setup", label: "Setup & Guide", icon: ShieldCheck, group: "WhatsApp Commerce" },
  { key: "templates", label: "Templates", icon: FileText, group: "Marketing" },
  {
    key: "campaigns",
    label: "Campaigns & Broadcast",
    icon: Megaphone,
    group: "Marketing",
    feature: "broadcast",
    submenu: [
      { key: "camp-all", label: "All Campaigns", campaignChannel: "ALL", icon: Megaphone },
      { key: "camp-whatsapp", label: "WhatsApp Broadcast", campaignChannel: "WHATSAPP", icon: WhatsAppIcon, accent: "text-[#25D366]" },
      { key: "camp-instagram", label: "Instagram Direct", campaignChannel: "INSTAGRAM", icon: Instagram, accent: "text-[#E1306C]" },
      { key: "camp-facebook", label: "Facebook Messenger", campaignChannel: "FACEBOOK", icon: Facebook, accent: "text-[#1877F2]" },
      { key: "camp-comment", label: "Viral Comment-to-DM", campaignChannel: "COMMENT_TO_DM", icon: MessageCircle, accent: "text-purple-400", badge: "VIRAL" },
      { key: "camp-email", label: "Email Campaigns", campaignChannel: "EMAIL", icon: Mail, accent: "text-teal-400" },
    ],
  },
  {
    key: "subscribers",
    label: "Subscribers",
    icon: Users,
    group: "Marketing",
    feature: "broadcast",
    submenu: [
      { key: "sub-all", label: "All Subscribers", channel: "ALL", icon: Users },
      { key: "sub-whatsapp", label: "WhatsApp", channel: "WHATSAPP", icon: WhatsAppIcon, accent: "text-[#25D366]" },
      { key: "sub-facebook", label: "Facebook", channel: "FACEBOOK", icon: Facebook, accent: "text-[#1877F2]" },
      { key: "sub-instagram", label: "Instagram", channel: "INSTAGRAM", icon: Instagram, accent: "text-[#E1306C]" },
    ],
  },
  { key: "coupons", label: "Coupons & Promotions", icon: Ticket, group: "Marketing" },
  { key: "content", label: "Content Management", icon: Newspaper, group: "Marketing", feature: "content" },
  { key: "digital-qr", label: "Digital QR Addons", icon: QrCode, group: "Marketing", accent: "text-emerald-600", feature: "digital_qr" },
  { key: "digital-vcard", label: "Digital Business Card", icon: Contact2, group: "Marketing", accent: "text-cyan-500", feature: "digital_vcard" },
  { key: "live-chat", label: "Website Chat Widget", icon: MessageCircle, group: "Marketing", accent: "text-emerald-500", badge: "Addon", feature: "live_chat" },
  { key: "customers", label: "Customers & CRM", icon: Users, group: "People" },
  { key: "staff", label: "Staff & Roles", icon: UserCog, group: "People" },
  { key: "reports", label: "Reports & Analytics", icon: BarChart3, group: "Insights", feature: "reports" },
  { key: "settings", label: "Settings", icon: Settings, group: "Insights" },
  { key: "audit-logs", label: "Audit Logs", icon: History, group: "Insights" },
  { key: "billing", label: "Plan & Billing", icon: CreditCard, group: "Insights" },
  // Only drawn for whoever runs the installation; the endpoint refuses everyone else.
  { key: "platform", label: "Tenants", icon: Building2, group: "Platform", feature: "platform" },
]

/** Whose workspace this is, read from their own settings. */
function WorkspaceName() {
  const [workspace, setWorkspace] = useState<{ name: string; slug: string } | null>(null)
  useEffect(() => {
    fetch("/api/workspaces")
      .then(r => r.json())
      .then(d => setWorkspace(d.current ?? null))
      .catch(() => {})
  }, [])
  if (!workspace) return null
  return (
    <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700/70 text-slate-200 shadow-2xs">
      <Building2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
      <span className="text-xs font-semibold truncate">{workspace.name}</span>
      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 ml-auto shrink-0" />
    </div>
  )
}

/** The screens worth a permanent place in the header. */
const QUICK_LINKS: ViewKey[] = ["dashboard", "inbox", "customers", "bookings"]

function NavButton({
  item,
  active,
  onClick,
  onSubmenuClick,
  onCampaignSubmenuClick,
  activeChannel,
  activeCampaignChannel,
  activeTab,
  onTabClick,
  pendingCount,
  unreadCount,
}: {
  item: NavItem
  active: boolean
  onClick: () => void
  onSubmenuClick?: (channel: "ALL" | "WHATSAPP" | "FACEBOOK" | "INSTAGRAM") => void
  onCampaignSubmenuClick?: (channel: "ALL" | "WHATSAPP" | "FACEBOOK" | "INSTAGRAM" | "EMAIL" | "COMMENT_TO_DM") => void
  activeChannel?: string
  activeCampaignChannel?: string
  activeTab?: string
  onTabClick?: (tab: string) => void
  pendingCount?: number
  unreadCount?: number
}) {
  const [expanded, setExpanded] = useState(active)
  useEffect(() => {
    if (active && item.submenu) setExpanded(true)
  }, [active, item.submenu])

  const Icon = item.icon
  const count = item.key === "payments" ? (pendingCount ?? 0) : item.key === "inbox" ? (unreadCount ?? 0) : 0
  const targetPath = item.path || (pathForView(item.key) + (item.hash || ""))
  const hasSubmenu = Boolean(item.submenu && item.submenu.length > 0)

  return (
    <div className="space-y-0.5">
      <a
        href={targetPath}
        onClick={e => {
          e.preventDefault()
          if (hasSubmenu) {
            setExpanded(prev => !prev)
          }
          window.history.pushState({ view: item.key }, "", targetPath)
          window.dispatchEvent(new PopStateEvent("popstate"))
          if (item.hash && typeof window !== "undefined") {
            window.dispatchEvent(new HashChangeEvent("hashchange"))
          }
          onClick()
        }}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all group relative",
          active && !hasSubmenu
            ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/60 font-bold"
            : active && hasSubmenu
              ? "bg-slate-800/90 text-white font-bold border border-slate-700/60"
              : "text-slate-300 hover:bg-slate-800/80 hover:text-white",
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-105", active ? "text-white" : item.accent ? item.accent.replace("text-emerald-600", "text-emerald-400").replace("text-purple-600", "text-purple-400").replace("text-indigo-600", "text-indigo-400").replace("text-amber-600", "text-amber-400").replace("text-teal-600", "text-teal-400").replace("text-blue-600", "text-blue-400") : "text-slate-400 group-hover:text-emerald-400")} />
        <span className="flex-1 text-left truncate">{item.label}</span>
        {item.badge && (
          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 tracking-wider shrink-0 mr-0.5 shadow-2xs">
            {item.badge}
          </span>
        )}
        {count > 0 && (
          <span
            className={cn(
              "min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center font-mono shadow-2xs",
              active
                ? "bg-white text-emerald-950 font-black"
                : item.key === "payments"
                  ? "bg-amber-950/80 text-amber-300 border border-amber-800/80"
                  : "bg-emerald-950/80 text-emerald-300 border border-emerald-800/80",
            )}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
        {hasSubmenu && (
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-slate-400 transition-transform duration-200 shrink-0",
              expanded ? "rotate-180 text-emerald-400" : ""
            )}
          />
        )}
      </a>

      {hasSubmenu && expanded && (
        <div className="pl-3 pr-1 py-1 space-y-1 ml-2.5 border-l-2 border-slate-700/60 animate-in fade-in slide-in-from-top-1 duration-150">
          {item.submenu!.map(sub => {
            const SubIcon = sub.icon || Users
            const isSubActive = active && (
              sub.tab ? activeTab === sub.tab :
              sub.campaignChannel ? (activeCampaignChannel || "ALL") === sub.campaignChannel :
              sub.channel ? (activeChannel || "ALL") === sub.channel : false
            )
            return (
              <button
                key={sub.key}
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  if (sub.path) {
                    window.open(sub.path, "_blank")
                    return
                  }
                  if (sub.campaignChannel) {
                    onCampaignSubmenuClick?.(sub.campaignChannel)
                  }
                  if (sub.channel) {
                    onSubmenuClick?.(sub.channel)
                  }
                  if (sub.tab) {
                    onTabClick?.(sub.tab)
                  }
                  onClick()
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left group/sub",
                  isSubActive
                    ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-2xs"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {sub.emoji ? (
                    <span className="text-xs shrink-0 leading-none group-hover/sub:scale-110 transition-transform">{sub.emoji}</span>
                  ) : (
                    <SubIcon className={cn("h-3.5 w-3.5 shrink-0 transition-colors", sub.accent || (isSubActive ? "text-emerald-400" : "text-slate-400 group-hover/sub:text-slate-200"))} />
                  )}
                  <span className="truncate">{sub.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                  {sub.badge && (
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.2 rounded shadow-2xs leading-tight",
                      sub.badge === "LIVE" ? "bg-rose-500/25 text-rose-300 border border-rose-500/40 animate-pulse" : sub.badge === "VIRAL" ? "bg-purple-500/25 text-purple-300 border border-purple-500/40" : "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40"
                    )}>
                      {sub.badge}
                    </span>
                  )}
                  {sub.path && (
                    <ExternalLink className="h-3 w-3 text-slate-400 group-hover/sub:text-slate-200 shrink-0" />
                  )}
                  {isSubActive && !sub.badge && !sub.path && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 shrink-0" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * Real WhatsApp connection state.
 */
function WhatsAppStatusCard() {
  const [health, setHealth] = useState<{ configured?: boolean; phoneNumber?: string | null; error?: string } | null>(null)

  useEffect(() => {
    const check = () => fetch("/api/whatsapp/health")
      .then(r => r.json())
      .then(d => setHealth(d.whatsapp || {}))
      .catch(() => setHealth({ error: "Status unavailable" }))
    check()
    const timer = setInterval(check, 120000)
    return () => clearInterval(timer)
  }, [])

  const broken = !health || !health.configured || Boolean(health.error)
  const tone = broken
    ? "bg-rose-950/40 border-rose-900/60 text-rose-200"
    : "bg-slate-800/90 border-slate-700/80 text-slate-200"

  return (
    <div className={`px-3 py-2.5 rounded-xl ${tone} border shadow-2xs`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="relative flex h-2 w-2">
          {!broken && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${broken ? "bg-rose-500" : "bg-emerald-400"}`} />
        </span>
        <span className={`text-[11px] font-bold tracking-tight ${broken ? "text-rose-400" : "text-emerald-400"}`}>
          {!health ? "Checking WhatsApp…" : broken ? "WhatsApp Offline" : "WhatsApp Active"}
        </span>
      </div>
      <p className="text-[10px] text-slate-400 font-medium leading-snug truncate">
        {!health
          ? "Contacting Meta…"
          : health.error
            ? health.error
            : health.configured
              ? (health.phoneNumber || "Cloud API connected")
              : "Not configured — open Setup"}
      </p>
    </div>
  )
}

function SidebarContent({ onNavigate, onLogout, staffName, staffRole }: { onNavigate?: () => void; onLogout: () => void; staffName: string; staffRole: string }) {
  const { view, setView, subscriberChannelFilter, setSubscriberChannelFilter, campaignChannelFilter, setCampaignChannelFilter } = useApp()
  const [pendingCount, setPendingCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [features, setFeatures] = useState<Record<string, boolean> | null>(null)
  const [currentPath, setCurrentPath] = useState("")
  const [restaurantTab, setRestaurantTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search)
      return p.get("tab") || "overview"
    }
    return "overview"
  })

  useEffect(() => {
    fetch("/api/features").then(r => r.json()).then(setFeatures).catch(() => {})
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentPath(window.location.pathname)
      const onPop = () => {
        setCurrentPath(window.location.pathname)
        const p = new URLSearchParams(window.location.search)
        const t = p.get("tab")
        if (t) setRestaurantTab(t)
      }
      window.addEventListener("popstate", onPop)
      const onTab = (e: any) => {
        if (e?.detail) setRestaurantTab(e.detail)
      }
      window.addEventListener("restaurant-tab", onTab)
      return () => {
        window.removeEventListener("popstate", onPop)
        window.removeEventListener("restaurant-tab", onTab)
      }
    }
  }, [])

  useEffect(() => {
    const f = async () => {
      try {
        const [p, n] = await Promise.all([fetch("/api/payments?status=SUBMITTED"), fetch("/api/notifications?unreadOnly=true")])
        if (p.ok) { const d = await p.json(); setPendingCount(d.payments?.length || 0) }
        if (n.ok) { const d = await n.json(); setUnreadCount(d.notifications?.length || 0) }
      } catch {}
    }
    f(); const i = setInterval(f, 15000); return () => clearInterval(i)
  }, [])

  const isPlatformOperator = features?.platform === true
  const items: NavItem[] = isPlatformOperator
    ? [
        { key: "platform" as ViewKey, label: "Command Center", icon: LayoutDashboard, group: "Overview", accent: "text-emerald-600", path: "/platform/command-center" },
        { key: "platform" as ViewKey, label: "All Workspaces", icon: Building2, group: "Tenants & Workspaces", accent: "text-teal-600", path: "/platform/tenants" },
        { key: "platform" as ViewKey, label: "Website Demos & Leads", icon: Video, group: "Tenants & Workspaces", accent: "text-purple-600", path: "/platform/leads" },
        { key: "platform" as ViewKey, label: "Subscriptions & Billing", icon: CreditCard, group: "Billing & Revenue", accent: "text-indigo-600", path: "/platform/billing" },
        { key: "platform" as ViewKey, label: "Invoices & Dunning", icon: Receipt, group: "Billing & Revenue", accent: "text-blue-600", path: "/platform/invoices" },
        { key: "platform" as ViewKey, label: "Revenue Analytics", icon: BarChart3, group: "Billing & Revenue", accent: "text-emerald-600", path: "/platform/revenue" },
        { key: "platform" as ViewKey, label: "WhatsApp Number Pool", icon: Smartphone, group: "Infrastructure", accent: "text-emerald-600", path: "/platform/whatsapp-numbers" },
        { key: "platform" as ViewKey, label: "Usage & Limits", icon: Gauge, group: "Infrastructure", accent: "text-amber-600", path: "/platform/usage" },
        { key: "platform" as ViewKey, label: "Webhooks & Health", icon: Activity, group: "Infrastructure", accent: "text-rose-600", path: "/platform/webhooks" },
        { key: "platform" as ViewKey, label: "Support Tickets", icon: Headphones, group: "Platform Ops", accent: "text-amber-600", path: "/platform/support-tickets" },
        { key: "platform" as ViewKey, label: "Announcements", icon: Megaphone, group: "Platform Ops", accent: "text-purple-600", path: "/platform/announcements" },
        { key: "platform" as ViewKey, label: "Plans & Modules", icon: ShoppingBag, group: "Platform Ops", accent: "text-indigo-600", path: "/platform/plans" },
        { key: "platform" as ViewKey, label: "Audit & Governance", icon: History, group: "Security & Governance", accent: "text-stone-600", path: "/platform/audit" },
        { key: "platform" as ViewKey, label: "Analytics, SEO & Pixels", icon: Code2, group: "Security & Governance", accent: "text-blue-600", path: "/platform/analytics" },
        { key: "platform" as ViewKey, label: "Database & Backups", icon: Database, group: "Security & Governance", accent: "text-amber-600", path: "/platform/backups" },
        { key: "settings" as ViewKey, label: "Global Platform Settings", icon: Settings, group: "Security & Governance", accent: "text-stone-600", path: "/settings" },
      ]
    : NAV_ITEMS.filter(i => {
        if (i.key === "platform") return false
        return !i.feature || features === null || features[i.feature]
      })
  const groups = [...new Set(items.map(i => i.group))]

  return (
    <div className="flex flex-col h-full bg-[#0d1520] text-slate-100">
      {/* Brand & Workspace Area */}
      <div className="px-4 py-4 border-b border-slate-800/80 bg-[#0b111a]">
        <Brand href={isPlatformOperator ? "/platform" : "/dashboard"} size="md" className="text-white" />
        {isPlatformOperator ? (
          <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 shadow-2xs">
            <Shield className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold truncate">Platform Console</span>
            <span className="ml-auto text-[9px] font-black uppercase text-emerald-300 bg-emerald-900/80 px-1.5 py-0.5 rounded-full border border-emerald-700">
              ROOT
            </span>
          </div>
        ) : (
          <WorkspaceName />
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3.5 space-y-4">
        {groups.map(g => (
          <div key={g}>
            <div className="px-2.5 mb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">{g}</div>
            <div className="space-y-0.5">
              {items.filter(i => i.group === g).map(item => {
                const isActive = item.path
                  ? currentPath === item.path || (item.path === "/platform/command-center" && currentPath === "/platform")
                  : view === item.key
                return (
                  <NavButton
                    key={item.label}
                    item={item}
                    active={isActive}
                    activeChannel={subscriberChannelFilter}
                    activeCampaignChannel={campaignChannelFilter}
                    activeTab={item.key === "restaurant" ? restaurantTab : undefined}
                    onTabClick={(tab) => {
                      setRestaurantTab(tab)
                      if (typeof window !== "undefined") {
                        const url = new URL(window.location.href)
                        url.pathname = "/restaurant"
                        url.searchParams.set("tab", tab)
                        window.history.pushState({ view: "restaurant" }, "", url.toString())
                        window.dispatchEvent(new CustomEvent("restaurant-tab", { detail: tab }))
                      }
                    }}
                    onSubmenuClick={(channel) => {
                      setSubscriberChannelFilter(channel)
                      setView(item.key)
                      onNavigate?.()
                    }}
                    onCampaignSubmenuClick={(channel) => {
                      setCampaignChannelFilter(channel)
                      setView(item.key)
                      onNavigate?.()
                    }}
                    onClick={() => {
                      setView(item.key)
                      if (item.path) {
                        setCurrentPath(item.path)
                        if (typeof window !== "undefined") {
                          window.history.pushState({ view: item.key }, "", item.path)
                          window.dispatchEvent(new Event("popstate"))
                        }
                      }
                      onNavigate?.()
                    }}
                    pendingCount={pendingCount}
                    unreadCount={unreadCount}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-slate-800/80 space-y-2 bg-[#0b111a]">
        {!isPlatformOperator && <WhatsAppStatusCard />}
        <a
          href="/whats-new"
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-emerald-300 transition-colors"
        >
          <div className="flex items-center gap-2 truncate">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">What&apos;s New</span>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/80">
            v3.0
          </span>
        </a>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-rose-950/40 hover:text-rose-300 transition-colors"
        >
          <div className="flex items-center gap-2 truncate">
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Sign Out ({staffName.split(" ")[0]})</span>
          </div>
          <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 border-slate-700 bg-slate-800 text-slate-300">
            {staffRole.replace("_", " ")}
          </Badge>
        </button>
      </div>
    </div>
  )
}


/**
 * Which business the screen is showing, for somebody who belongs to more than
 * one.
 *
 * Draws nothing at all when there is only one, which is almost everybody. A
 * control that never has a second option is furniture.
 */
function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] = useState<{ slug: string; name: string }[]>([])
  const [current, setCurrent] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/workspaces")
      .then(r => r.json())
      .then(d => { setWorkspaces(d.workspaces || []); setCurrent(d.current?.slug ?? null) })
      .catch(() => {})
  }, [])

  if (workspaces.length < 2) return null

  return (
    <select
      value={current ?? ""}
      onChange={async e => {
        const slug = e.target.value
        const response = await fetch("/api/workspaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        })
        if (!response.ok) return
        // A full reload rather than a state change: every screen already
        // loaded is showing the other workspace's data.
        window.location.reload()
      }}
      className="hidden sm:block text-xs font-medium border border-stone-200 rounded-lg px-2.5 py-1.5 bg-white text-stone-700"
    >
      {workspaces.map(workspace => (
        <option key={workspace.slug} value={workspace.slug}>{workspace.name}</option>
      ))}
    </select>
  )
}


/**
 * A standing reminder that this is not your own workspace.
 *
 * An operator who forgets where they are will eventually reply to a customer,
 * delete a tour or change a setting in somebody else's business. The bar is
 * deliberately loud and cannot be dismissed — the moment it can be, it will
 * be, and then it protects nobody.
 */
function ImpersonationBar() {
  const router = useRouter()
  const [inside, setInside] = useState<{ name: string; slug: string } | null>(null)

  useEffect(() => {
    fetch("/api/workspaces")
      .then(r => r.json())
      .then(d => { if (d.visiting && d.current) setInside(d.current) })
      .catch(() => {})
  }, [])

  if (!inside) return null

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <span className="font-semibold truncate">
        You are inside {inside.name}. Everything you do here is theirs, and this visit is in their audit log.
      </span>
      <button
        onClick={async () => {
          await fetch(`/api/platform/tenants/${inside.slug}/impersonate`, { method: "DELETE" }).catch(() => {})
          router.push("/platform")
        }}
        className="shrink-0 rounded-lg bg-amber-950/10 hover:bg-amber-950/20 px-3 py-1 font-semibold"
      >
        Leave
      </button>
    </div>
  )
}

import { UserProfileDialog } from "@/components/user-profile-dialog"

function HeaderBar({ onMenuClick, staffName, staffRole }: { onMenuClick: () => void; staffName: string; staffRole: string }) {
  const { view, setView } = useApp()
  const [now, setNow] = useState<Date | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [features, setFeatures] = useState<Record<string, boolean> | null>(null)

  useEffect(() => {
    fetch("/api/features").then(r => r.json()).then(setFeatures).catch(() => {})
  }, [])

  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const isPlatform = features?.platform === true
  const item = NAV_ITEMS.find(i => i.key === view)
  const Icon = isPlatform
    ? view === "platform" ? Building2 : view === "audit-logs" ? History : Settings
    : item?.icon || LayoutDashboard
  const headerTitle = isPlatform
    ? view === "platform" ? "Platform Operations Console" : view === "audit-logs" ? "System Audit Logs" : "Global Platform Settings"
    : item?.label || "Dashboard"
  const initials = staffName.split(" ").map(n => n[0]).join("").slice(0, 2)

  const quickLinks: { key: ViewKey; label: string; icon: any; path: string }[] = isPlatform
    ? [
        { key: "platform", label: "Workspaces", icon: Building2, path: "/platform/tenants" },
        { key: "platform", label: "Audit Logs", icon: History, path: "/platform/audit" },
        { key: "settings", label: "Platform Settings", icon: Settings, path: "/settings" },
      ]
    : QUICK_LINKS.map(link => {
        const it = NAV_ITEMS.find(i => i.key === link)
        return it ? { key: it.key, label: it.label.split(" ")[0], icon: it.icon, path: pathForView(it.key) } : null
      }).filter(Boolean) as { key: ViewKey; label: string; icon: any; path: string }[]

  return (
    <>
      <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-4 md:px-6 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}><Menu className="h-5 w-5" /></Button>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-2xs">
              <Icon className="h-[18px] w-[18px] text-emerald-600" />
            </div>
            <div>
              <h1 className="font-bold text-stone-900 text-base md:text-lg leading-tight">{headerTitle}</h1>
              {now && <p className="text-[11px] text-stone-500 hidden sm:block">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</p>}
            </div>
          </div>
        </div>

        {/* Quick Navigation Links */}
        <nav className="hidden xl:flex items-center gap-1 mr-1">
          {quickLinks.map(link => {
            const Icon = link.icon
            return (
              <a
                key={link.label}
                href={link.path}
                onClick={e => {
                  e.preventDefault()
                  setView(link.key)
                  if (typeof window !== "undefined") {
                    window.history.pushState({ view: link.key }, "", link.path)
                    window.dispatchEvent(new Event("popstate"))
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer",
                  view === link.key ? "bg-stone-100 text-stone-900 shadow-2xs font-bold" : "text-stone-500 hover:text-stone-900 hover:bg-stone-50",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {link.label}
              </a>
            )
          })}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <WorkspaceSwitcher />
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[11px] font-medium text-emerald-700">System Online</span></div>
          <NotificationCenter />
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-2.5 pl-2 md:pl-3 border-l border-stone-200 hover:bg-stone-50 p-1.5 rounded-xl transition-all cursor-pointer text-left"
            title="Edit My Profile"
          >
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">{initials}</div>
            <div className="hidden md:block"><div className="text-sm font-semibold text-stone-900 leading-tight">{staffName}</div><div className="text-[11px] text-stone-500">{staffRole}</div></div>
          </button>
        </div>
      </header>
      <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  )
}

export default function AppShell({ adminEntry = false, initialView }: { adminEntry?: boolean; initialView?: ViewKey }) {
  const { sidebarOpen, setSidebarOpen, authMode, staffUser, customerUser, logout, setView, setAuthMode, setStaffAuth, view } = useApp()
  const [hydrated, setHydrated] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  // Null until asked. Rendering the panel and then replacing it with a setup
  // screen a moment later is worse than waiting for the answer.
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null)
  const [setupDismissed, setSetupDismissed] = useState(false)

  useEffect(() => {
    if (authMode !== "admin" || !staffUser) return
    fetch("/api/onboarding")
      .then(r => r.json())
      .then(d => setNeedsSetup(Boolean(d.applies) && !d.ready))
      .catch(() => setNeedsSetup(false))
  }, [authMode, staffUser])

  // Always verify active session on mount and restore staff auth state
  useEffect(() => {
    let active = true
    fetch("/api/staff/me", { cache: "no-store" })
      .then(async response => {
        if (response.ok) {
          const data = await response.json()
          if (data.staff && active) {
            setStaffAuth("", data.staff)
            setSessionReady(true)
            const isPlatform = (data.staff.role === "SUPER_ADMIN" && (!data.staff.tenantId || data.staff.tenantId === "")) || data.staff.email === "uiuxnick@gmail.com"
            if (!initialView || initialView === "dashboard" || initialView === "customer-site" || initialView === "platform") {
              if (isPlatform && initialView === "platform") {
                setView("platform")
              } else if (isPlatform && !initialView) {
                setView("platform")
              } else {
                setView("dashboard")
              }
            }
          }
        } else {
          if (active) {
            setSessionReady(true)
            if (authMode === "admin" && response.status === 401) {
              logout()
            }
          }
        }
      })
      .catch(() => {
        if (active) setSessionReady(true)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    setHydrated(true)
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search)
      if (p.get("signed_in") === "1") {
        toast.success("Signed in successfully with 1-Click Login!")
        p.delete("signed_in")
        const newSearch = p.toString() ? `?${p.toString()}` : ""
        window.history.replaceState({}, "", window.location.pathname + newSearch)
      }
    }
  }, [])

  // Reached via /admin — switch into admin mode so the staff login renders
  // instead of the customer site if unauthenticated.
  useEffect(() => {
    if (adminEntry && authMode !== "admin") {
      setAuthMode("admin")
      if (initialView) {
        const isPlatform = (staffUser?.role === "SUPER_ADMIN" && (!staffUser?.tenantId || staffUser?.tenantId === "")) || staffUser?.email === "uiuxnick@gmail.com"
        if (initialView === "platform" && !isPlatform) {
          setView("dashboard")
        } else {
          setView(initialView)
        }
      }
    }
  }, [adminEntry, authMode, setAuthMode, setView, initialView, staffUser])

  /*
   * Leaving the staff area gives the public address back to the public site.
   *
   * `authMode` is persisted, so once /admin had set it to "admin" it stayed
   * that way — and the root page renders the sign-in screen whenever the mode
   * is "admin" with nobody signed in. So after one visit to /admin, going back
   * to app.fizmoh.cloud showed the login form for ever and the marketing site
   * became unreachable in that browser, with nothing on screen explaining why.
   *
   * Only when nobody is signed in: a staff member who is signed in and opens
   * the bare address still lands in their dashboard, which is where they were
   * going.
   */
  useEffect(() => {
    if (!adminEntry && !staffUser && authMode === "admin") {
      setAuthMode(null)
    }
  }, [adminEntry, staffUser, authMode, setAuthMode])

  // Landing on deep links selects that screen
  useEffect(() => {
    if (initialView && authMode === "admin") {
      const isPlatform = (staffUser?.role === "SUPER_ADMIN" && (!staffUser?.tenantId || staffUser?.tenantId === "")) || staffUser?.email === "uiuxnick@gmail.com"
      if (initialView === "platform" && !isPlatform) {
        setView("dashboard")
      } else {
        setView(initialView)
      }
    }
  }, [initialView, authMode, staffUser, setView])

  // Back and forward move between screens rather than leaving the app.
  useEffect(() => {
    if (authMode !== "admin" || typeof window === "undefined") return
    const onPop = () => {
      const key = viewForPath(window.location.pathname)
      if (key) {
        const isPlatform = (staffUser?.role === "SUPER_ADMIN" && (!staffUser?.tenantId || staffUser?.tenantId === "")) || staffUser?.email === "uiuxnick@gmail.com"
        if (key === "platform" && !isPlatform) {
          setView("dashboard")
        } else {
          setView(key)
        }
      }
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [authMode, setView, staffUser])

  // Older links used a hash route such as /#/whatsapp. Translate one to its
  // real path on arrival rather than dropping the visitor on the dashboard.
  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash) return
    const key = viewForPath(window.location.hash)
    if (!key) return
    setView(key)
    window.history.replaceState({ view: key }, "", pathForView(key))
  }, [setView])

  // Show nothing during hydration to prevent mismatch
  if (!hydrated || !sessionReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <div className="h-8 w-8 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin" />
      </div>
    )
  }

  // Route unauthenticated admin entries to staff login
  if (authMode === "login" || (authMode === "admin" && !staffUser)) {
    return <StaffLogin />
  }

  /*
   * A workspace that cannot yet send anything.
   *
   * Shown once, on arrival, until their own number is connected. Dropping
   * somebody into a dashboard of zeroes leaves them to work out for themselves
   * why nothing happens, and most conclude the product is broken rather than
   * unfinished. They can dismiss it and look around; the banner stays.
   */
  /*
   * Only on the way in, never on the way to fixing it.
   *
   * The gate used to apply to every admin route, so pressing "Connect a
   * number" navigated to /numbers and was met by the same checklist again —
   * the address changed, the screen did not, and the setup could never be
   * completed. It belongs on the landing screen alone; every other page
   * carries the banner instead.
   */
  const landing = !initialView || initialView === "dashboard"
  if (authMode === "admin" && staffUser && needsSetup === true && !setupDismissed && landing) {
    return <Onboarding staffName={staffUser.name} onSkip={() => setSetupDismissed(true)} />
  }

  // Admin logged in → show admin panel
  if (authMode === "admin" && staffUser) {
    if (!sessionReady) {
      return (
        <div className="flex h-screen items-center justify-center bg-stone-50">
          <div className="h-8 w-8 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin" />
        </div>
      )
    }
    return (
      <div className="flex h-screen bg-stone-50 overflow-hidden">
        <SessionGuard />
        <aside className="hidden lg:flex w-72 shrink-0 border-r border-slate-800 bg-[#0d1520] h-full overflow-hidden">
          <SidebarContent onLogout={() => { logout(); setView("customer-site") }} staffName={staffUser.name} staffRole={staffUser.role} />
        </aside>
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-72 p-0 h-full">
            <SidebarContent onNavigate={() => setSidebarOpen(false)} onLogout={() => { logout(); setView("customer-site") }} staffName={staffUser.name} staffRole={staffUser.role} />
          </SheetContent>
        </Sheet>
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <ImpersonationBar />
          <PlatformAnnouncementBanner />
          <OnboardingBanner onOpen={() => setSetupDismissed(false)} />
          <HeaderBar onMenuClick={() => setSidebarOpen(true)} staffName={staffUser.name} staffRole={staffUser.role} />
          <main className={cn("flex-1 min-h-0 flex flex-col relative", (view === "inbox" || view === "ai-assistant") ? "overflow-hidden" : "overflow-y-auto")}>
            <ViewRouter />
          </main>
        </div>
      </div>
    )
  }

  /*
   * Nobody signed in.
   *
   * This used to open one tour operator's storefront, which made the platform
   * look like that company's website rather than something another company
   * could sign up to. Their storefront still exists — it is reached from
   * inside their workspace — but the front door is now the product's own.
   */
  if (!staffUser && !customerUser) {
    return <MarketingHome />
  }

  return (
    <div className="h-screen bg-stone-50 overflow-hidden">
      <main className="h-full overflow-y-auto">
        <ViewRouter />
      </main>
    </div>
  )
}
