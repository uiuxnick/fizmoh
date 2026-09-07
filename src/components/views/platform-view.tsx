"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  Loader2, Building2, TrendingUp, Users, ShieldAlert, ArrowLeft,
} from "lucide-react"
import { useApp } from "@/lib/store"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { type PlatformSection } from "@/components/platform/platform-sidebar"
import { CommandCenter } from "@/components/platform/command-center"
import { WebhooksHealthPanel } from "@/components/platform/webhooks-panel"
import { AuditLogPanel } from "@/components/platform/audit-panel"
import { RevenueAnalyticsPanel } from "@/components/platform/revenue-panel"
import { BillingSubscriptionsPanel } from "@/components/platform/billing-panel"
import { InvoicesDunningPanel } from "@/components/platform/invoices-panel"
import { WhatsAppNumbersPanel } from "@/components/platform/whatsapp-numbers-panel"
import { SupportTicketsPanel } from "@/components/platform/support-tickets-panel"
import { AnnouncementsPanel } from "@/components/platform/announcements-panel"
import { UsageLimitsPanel } from "@/components/platform/usage-panel"
import { PlansPanel } from "@/components/platform/plans-panel"
import { TenantsPanel, type TenantRow, type PlanOption } from "@/components/platform/tenants-panel"
import { PlatformAnalyticsPanel } from "@/components/platform/analytics-panel"
import { BackupsPanel } from "@/components/platform/backups-panel"
import { PlatformLeadsPanel } from "@/components/platform/leads-panel"

/**
 * Super Admin Operations Console
 *
 * Exclusively for global platform operators (tenantId === null && role === "SUPER_ADMIN").
 * Every individual section is modularized into its own dedicated full-width component.
 */

export default function PlatformView() {
  const router = useRouter()
  const { staffUser, setView } = useApp()
  const [rows, setRows] = useState<TenantRow[]>([])
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [unrouted, setUnrouted] = useState<{ phoneNumberId: string; lastSeen: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [tab, setTab] = useState<PlatformSection>("command-center")

  const getSectionFromUrl = (): PlatformSection => {
    if (typeof window === "undefined") return "command-center"
    const pathname = window.location.pathname.toLowerCase()
    const parts = pathname.split("/").filter(Boolean)
    if (parts[0] === "platform" && parts[1]) {
      return parts[1] as PlatformSection
    }
    const h = window.location.hash.replace("#", "") as PlatformSection
    if (h) return h
    return "command-center"
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTab(getSectionFromUrl())
      const handleLocationChange = () => {
        setTab(getSectionFromUrl())
      }
      window.addEventListener("popstate", handleLocationChange)
      window.addEventListener("hashchange", handleLocationChange)
      return () => {
        window.removeEventListener("popstate", handleLocationChange)
        window.removeEventListener("hashchange", handleLocationChange)
      }
    }
  }, [])

  // Calculate platform financial & resource metrics
  const activeTenants = rows.filter(r => r.status === "ACTIVE").length
  const totalMessages = rows.reduce((sum, r) => sum + (r.messages || 0), 0)
  const totalOrders = rows.reduce((sum, r) => sum + (r.orders || 0), 0)
  const totalCustomers = rows.reduce((sum, r) => sum + (r.customers || 0), 0)
  const totalMRR = rows.reduce((sum, r) => {
    if (r.subscriptionStatus !== "ACTIVE") return sum
    const plan = plans.find(p => p.name === r.plan)
    return sum + (plan ? plan.priceMonthly / 1000 : 0)
  }, 0)

  async function load() {
    if (staffUser) {
      const isPlatform = (staffUser.role === "SUPER_ADMIN" && (!staffUser.tenantId || staffUser.tenantId === "")) || staffUser.email === "uiuxnick@gmail.com"
      if (!isPlatform) {
        setDenied(true)
        setLoading(false)
        return
      }
    }
    const response = await fetch("/api/platform/tenants")
    if (response.status === 403 || !response.ok) { setDenied(true); return }
    const data = await response.json()
    setRows(data.tenants || [])
    setPlans(data.plans || [])
    setUnrouted(data.unrouted || [])
  }

  useEffect(() => { load().catch(() => toast.error("Could not load workspaces")).finally(() => setLoading(false)) }, [staffUser])

  async function openAs(row: TenantRow, reason: string) {
    setBusy(row.id)
    try {
      const response = await fetch(`/api/platform/tenants/${row.id}/impersonate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      const data = await response.json()
      if (!response.ok) { toast.error(data.error || "Could not open workspace"); return }
      router.push("/dashboard")
    } finally {
      setBusy(null)
    }
  }

  async function act(id: string, body: Record<string, unknown>) {
    setBusy(id)
    try {
      const response = await fetch(`/api/platform/tenants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) { toast.error(data.error || "Action failed"); return }
      await load()
      toast.success("Done")
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></div>

  if (denied) {
    return (
      <div className="p-12 max-w-md mx-auto text-center space-y-4">
        <div className="h-16 w-16 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto text-rose-600 shadow-sm">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-stone-900">Platform Access Restricted</h1>
          <p className="text-xs text-stone-500 leading-relaxed">
            The Platform Operations Console is strictly reserved for global platform operators (<code className="text-[11px] bg-stone-100 px-1 py-0.5 rounded font-mono">platform@fizmoh.cloud</code>). Your account is scoped to your dedicated business workspace.
          </p>
        </div>
        <div className="pt-2">
          <Button
            onClick={() => {
              setView("dashboard")
              window.history.pushState({ view: "dashboard" }, "", "/dashboard")
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Return to My Business Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1680px] p-4 sm:p-6 lg:p-8 mx-auto space-y-6">
      {/* Platform Owner Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
              Super Admin Console
            </span>
          </div>
          <h1 className="text-2xl font-black text-stone-900 mt-1">Platform Operations</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Managing {rows.length} multi-tenant workspace{rows.length === 1 ? "" : "s"} across the cloud.
          </p>
        </div>
      </div>

      {/* Top Metric Bar shown on overview/tenants tabs */}
      {(tab === "command-center" || tab === "tenants") && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-stone-400 mb-1">
              <span className="text-xs font-bold text-stone-500">Monthly Run Rate</span>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-stone-900">
              OMR {totalMRR.toFixed(1)}
            </div>
            <div className="text-[10px] font-semibold text-emerald-700 mt-0.5">
              Active Subscriptions MRR
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-stone-400 mb-1">
              <span className="text-xs font-bold text-stone-500">Active Workspaces</span>
              <Building2 className="h-4 w-4 text-teal-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-stone-900">
              {activeTenants} <span className="text-xs font-normal text-stone-400">/ {rows.length}</span>
            </div>
            <div className="text-[10px] font-semibold text-stone-500 mt-0.5">
              Active Businesses Live
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-stone-400 mb-1">
              <span className="text-xs font-bold text-stone-500">Platform Messages</span>
              <WhatsAppIcon className="h-4.5 w-4.5" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-stone-900">
              {totalMessages.toLocaleString()}
            </div>
            <div className="text-[10px] font-semibold text-stone-500 mt-0.5">
              Total WhatsApp Inbound/Outbound
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-stone-400 mb-1">
              <span className="text-xs font-bold text-stone-500">Customer Directory</span>
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-stone-900">
              {totalCustomers.toLocaleString()}
            </div>
            <div className="text-[10px] font-semibold text-stone-500 mt-0.5">
              Total Contacts & CRM Leads
            </div>
          </div>
        </div>
      )}

      {/* Render Dedicated Platform Section */}
      {tab === "command-center" && (
        <div className="space-y-8">
          <CommandCenter />
          <div className="pt-4 border-t border-stone-200">
            <div className="mb-4">
              <h2 className="text-xl font-black text-stone-900">Workspaces & Tenant Management</h2>
              <p className="text-xs text-stone-500">Live multi-tenant instances, configuration, staff, and governance controls.</p>
            </div>
            <TenantsPanel
              rows={rows}
              plans={plans}
              busy={busy}
              onRefresh={load}
              onAction={act}
              onOpenAs={openAs}
            />
          </div>
        </div>
      )}
      {tab === "leads" && <PlatformLeadsPanel />}
      {tab === "billing" && <BillingSubscriptionsPanel />}
      {tab === "invoices" && <InvoicesDunningPanel />}
      {tab === "revenue" && <RevenueAnalyticsPanel />}
      {tab === "whatsapp-numbers" && <WhatsAppNumbersPanel />}
      {tab === "whatsapp-quality" && <WhatsAppNumbersPanel />}
      {tab === "support-tickets" && <SupportTicketsPanel />}
      {tab === "announcements" && <AnnouncementsPanel />}
      {tab === "plans" && <PlansPanel onChanged={load} />}
      {tab === "usage" && <UsageLimitsPanel />}
      {tab === "webhooks" && <WebhooksHealthPanel />}
      {tab === "audit" && <AuditLogPanel />}
      {tab === "analytics" && <PlatformAnalyticsPanel />}
      {tab === "backups" && <BackupsPanel />}
      {tab === "tenants" && (
        <TenantsPanel
          rows={rows}
          plans={plans}
          busy={busy}
          onRefresh={load}
          onAction={act}
          onOpenAs={openAs}
        />
      )}
    </div>
  )
}
