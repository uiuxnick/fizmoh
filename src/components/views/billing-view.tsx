"use client"

import { MODULE_REGISTRY } from "@/lib/module-registry"
import { WorkspaceModulesManager } from "@/components/views/workspace-modules-manager"
import { OFFICIAL_PLANS } from "@/lib/official-plans"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import {
  Check,
  Loader2,
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Wallet,
  Calendar,
  Layers,
  ShieldCheck,
  Printer,
  Download,
  FileText,
  Receipt,
  ExternalLink,
  Boxes,
  CheckCircle2,
  EyeOff,
  ShoppingBag,
  Bot,
  Zap,
  Globe,
  Phone,
  Users,
  MessageSquare,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * Workspace Billing, Plan Subscriptions, Proration & Balance Management.
 */

interface Plan {
  id: string
  slug: string
  name: string
  description: string | null
  priceMonthly: number
  priceYearly: number
  currency: string
  trialDays: number
  modules: string[] | null
}

interface ProrationInfo {
  isUpgrade: boolean
  isDowngrade: boolean
  isSame: boolean
  currentPlanPrice: number
  newPlanPrice: number
  unusedCredit: number
  netDueToday: number
  creditRemaining: number
  daysLeft: number
}

interface Billing {
  status: string
  planSlug: string | null
  planName: string | null
  price: number
  currency: string
  period: string
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  daysLeft: number | null
  suspended: boolean
  unusedCredit: number
  addons: Array<{ slug: string; name: string; quantity: number; status: string }>
  usage: { staff: number; contacts: number; numbers: number; messagesPerMonth: number; limits: Record<string, number> }
}

const MODULE_NAMES: Record<string, string> = Object.fromEntries(MODULE_REGISTRY.map(module => [module.key, module.label]))

interface TenantInvoice {
  id: string
  reference: string
  amount: number
  currency: string
  period: string
  status: string
  periodStart: string | null
  periodEnd: string | null
  paidAt: string | null
  gatewayReference?: string | null
  createdAt: string
  subscription?: {
    plan?: {
      name: string
    }
  }
  items?: Array<{
    description: string
    quantity: number
    unitAmount: number
  }>
}

export default function BillingView() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [billing, setBilling] = useState<Billing | null>(null)
  const [invoices, setInvoices] = useState<TenantInvoice[]>([])
  const [prorations, setProrations] = useState<Record<string, { MONTHLY: ProrationInfo | null; YEARLY: ProrationInfo | null }>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [period, setPeriod] = useState<"MONTHLY" | "YEARLY">("MONTHLY")
  const [addons, setAddons] = useState<any[]>([])
  const [activeAddons, setActiveAddons] = useState<any[]>([])
  const [addonFilter, setAddonFilter] = useState<string>("ALL")
  const [usage, setUsage] = useState<any>(null)
  const [addonBusy, setAddonBusy] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"package" | "plans" | "addons" | "invoices">("package")

  // Plan change confirmation modal
  const [confirmPlan, setConfirmPlan] = useState<{ plan: Plan; proration: ProrationInfo | null } | null>(null)
  // Addon purchase confirmation modal
  const [confirmAddon, setConfirmAddon] = useState<any | null>(null)

  // Payment gateways
  const [availableGateways, setAvailableGateways] = useState<{
    paymob: boolean
    amwalpay: boolean
    defaultGateway: "PAYMOB" | "AMWALPAY"
    allowChoice: boolean
  }>({ paymob: true, amwalpay: true, defaultGateway: "PAYMOB", allowChoice: true })
  const [selectedGateway, setSelectedGateway] = useState<"PAYMOB" | "AMWALPAY">("PAYMOB")

  const [entitledModules, setEntitledModules] = useState<string[]>([])
  const [disabledModules, setDisabledModules] = useState<string[]>([])
  const [moduleToggling, setModuleToggling] = useState<string | null>(null)

  useEffect(() => {
    fetchBillingData()
  }, [])

  async function fetchBillingData() {
    try {
      const [billingResponse, addonsResponse] = await Promise.all([
        fetch("/api/billing"),
        fetch("/api/billing/addons"),
      ])
      const d = await billingResponse.json()
      const a = await addonsResponse.json()
      setPlans(d.plans || [])
      setBilling(d.billing)
      setInvoices(d.invoices || [])
      setProrations(d.prorations || {})
      setAddons(a.available || [])
      setActiveAddons(a.addons || [])
      setEntitledModules(a.entitledModules || [])
      setDisabledModules(a.disabledModules || [])
      if (d.billing) setUsage(d.billing.usage || null)
      if (d.gateways) {
        setAvailableGateways(d.gateways)
        if (d.gateways.defaultGateway) {
          setSelectedGateway(d.gateways.defaultGateway)
        }
      }
    } catch {
      toast.error("Could not load workspace billing data")
    } finally {
      setLoading(false)
    }
  }

  async function toggleModuleFromAddon(moduleKey: string, nextState: boolean) {
    setModuleToggling(moduleKey)
    try {
      const res = await fetch("/api/workspace/modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: moduleKey, enabled: nextState }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update module")

      setDisabledModules(prev => nextState ? prev.filter(m => m !== moduleKey) : [...new Set([...prev, moduleKey])])
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("fizmoh:features-updated", {
            detail: { module: moduleKey, enabled: nextState },
          })
        )
      }
      toast.success(nextState ? `Module ${moduleKey} is now ACTIVE in sidebar` : `Module ${moduleKey} turned OFF and hidden from sidebar`)
    } catch (e: any) {
      toast.error(e?.message || "Failed to toggle module")
    } finally {
      setModuleToggling(null)
    }
  }

  function handleSelectPlan(plan: Plan) {
    const proration = prorations[plan.id]?.[period] ?? null
    setConfirmPlan({ plan, proration })
  }

  async function executePlanChange() {
    if (!confirmPlan) return
    const { plan } = confirmPlan
    setBusy(plan.id)
    try {
      const response = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, period, gateway: selectedGateway }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || "Could not process plan change")
        return
      }

      setConfirmPlan(null)

      if (data.url) {
        const gwLabel = data.gateway === "PAYMOB" ? "Paymob Unified Checkout" : "AmwalPay SmartBox"
        toast.loading(`Redirecting to ${gwLabel}...`)
        window.location.href = data.url
      } else {
        toast.success(`Successfully switched to ${plan.name}`)
        await fetchBillingData()
      }
    } catch {
      toast.error("Could not reach the server")
    } finally {
      setBusy(null)
    }
  }

  function handleSelectAddon(addon: any) {
    const price = period === "YEARLY" ? addon.priceYearly : addon.priceMonthly
    if (price <= 0) {
      void executeAddonPurchase(addon.slug, selectedGateway)
    } else {
      setConfirmAddon(addon)
    }
  }

  async function executeAddonPurchase(slug: string, gatewayToUse?: "PAYMOB" | "AMWALPAY") {
    const gw = gatewayToUse || selectedGateway
    setAddonBusy(slug)
    try {
      const response = await fetch("/api/billing/addons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, period, quantity: 1, gateway: gw }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || "Could not start add-on checkout")
        return
      }
      setConfirmAddon(null)
      if (data.url) {
        const gwLabel = data.gateway === "PAYMOB" ? "Paymob Unified Checkout" : "AmwalPay SmartBox"
        toast.loading(`Redirecting to ${gwLabel}...`)
        window.location.href = data.url
      } else {
        toast.success("Add-on activated successfully")
        await fetchBillingData()
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("fizmoh:features-updated", {
              detail: { module: data.module, enabled: true },
            })
          )
        }
      }
    } catch {
      toast.error("Could not reach the server")
    } finally {
      setAddonBusy(null)
    }
  }

  async function executeAddonCancel(slug: string) {
    if (!confirm("Are you sure you want to cancel this add-on for your workspace?")) return
    setAddonBusy(slug)
    try {
      const response = await fetch(`/api/billing/addons?slug=${encodeURIComponent(slug)}`, {
        method: "DELETE",
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || "Could not cancel add-on")
        return
      }
      toast.success("Add-on cancelled successfully")
      await fetchBillingData()
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("fizmoh:features-updated", {
            detail: { module: data.module, enabled: false },
          })
        )
      }
    } catch {
      toast.error("Could not reach the server")
    } finally {
      setAddonBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <p className="text-sm text-stone-500 font-medium">Loading plan & balance data...</p>
      </div>
    )
  }

  const unusedBalance = billing?.unusedCredit ?? 0

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-none space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Layers className="h-6 w-6 text-emerald-600" />
            Plan & Subscription Billing
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Manage your workspace subscription tier, add-ons, prorated balance, and limits.
          </p>
        </div>

        {/* Billing Period Selector */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200 self-start sm:self-auto">
          {(["MONTHLY", "YEARLY"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setPeriod(option)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                period === option
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {option === "MONTHLY" ? "Monthly billing" : "Yearly billing (Save ~20-25%)"}
            </button>
          ))}
        </div>
      </div>

      {/* Top Tabs */}
      <div className="flex items-center gap-1.5 border-b border-stone-200 pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("package")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === "package"
              ? "bg-stone-900 text-white shadow-xs"
              : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Current Package &amp; Modules</span>
        </button>

        <button
          onClick={() => setActiveTab("plans")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === "plans"
              ? "bg-stone-900 text-white shadow-xs"
              : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Change Plan &amp; Pricing</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">4 Plans</span>
        </button>

        <button
          onClick={() => setActiveTab("addons")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === "addons"
              ? "bg-stone-900 text-white shadow-xs"
              : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900"
          }`}
        >
          <Boxes className="h-4 w-4" />
          <span>Add-on Marketplace</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">18 Modular</span>
        </button>

        <button
          onClick={() => setActiveTab("invoices")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === "invoices"
              ? "bg-stone-900 text-white shadow-xs"
              : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900"
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Invoices &amp; Receipts</span>
          {invoices.length > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-stone-100 text-stone-600">{invoices.length}</span>
          )}
        </button>
      </div>

      {/* Suspension Alert */}
      {billing?.suspended && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-900 text-sm">This workspace is currently restricted</p>
            <p className="text-rose-800 text-xs mt-1 leading-relaxed">
              Your subscription is past due. To re-enable full outbound WhatsApp messaging and booking modifications, please settle your subscription below.
            </p>
          </div>
        </div>
      )}

      {/* TAB 1: CURRENT PACKAGE & CAPABILITIES */}
      {activeTab === "package" && (
        <div className="space-y-6">
          {/* Current Plan & Balance Summary Card */}
          {billing && (
            <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
              <div className="grid gap-6 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-stone-100">
                {/* Left: Current Active Plan */}
                <div className="pr-4 flex flex-col justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Active Subscription
                    </p>
                    <div className="flex items-baseline gap-2 mt-1.5">
                      <p className="text-2xl font-bold text-stone-900">{billing.planName ?? "Free Trial"}</p>
                      <Badge className={statusTone(billing.status)}>{statusLabel(billing.status)}</Badge>
                    </div>
                    <p className="text-sm text-stone-600 mt-1">
                      {billing.price > 0
                        ? `${money(billing.price, billing.currency)} / ${billing.period === "YEARLY" ? "year" : "month"}`
                        : "Free tier workspace"}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-stone-100">
                    <Button
                      size="sm"
                      onClick={() => setActiveTab("plans")}
                      className="bg-stone-900 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl h-8 px-3.5 transition cursor-pointer gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                      <span>Change or Upgrade Plan</span>
                    </Button>
                  </div>
                </div>

                {/* Middle: Cycle Duration & Renewal */}
                <div className="pt-4 md:pt-0 md:px-6 flex flex-col justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-sky-600" />
                      Billing Cycle &amp; Status
                    </p>
                    <p className="text-lg font-semibold text-stone-800 mt-1.5">
                      {billing.currentPeriodEnd
                        ? new Date(billing.currentPeriodEnd).toLocaleDateString(undefined, { dateStyle: "medium" })
                        : billing.trialEndsAt
                          ? `Trial ends ${new Date(billing.trialEndsAt).toLocaleDateString()}`
                          : "Continuous Active"}
                    </p>
                    {billing.daysLeft !== null && (
                      <p className={`text-xs mt-1 font-medium ${billing.daysLeft < 4 ? "text-rose-600" : "text-stone-500"}`}>
                        {billing.daysLeft >= 0
                          ? `${billing.daysLeft} day${billing.daysLeft === 1 ? "" : "s"} remaining in current period`
                          : `${Math.abs(billing.daysLeft)} days overdue`}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center gap-2 text-xs text-stone-500">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Auto-renewal enabled</span>
                  </div>
                </div>

                {/* Right: Prorated Unused Balance */}
                <div className="pt-4 md:pt-0 md:pl-6 flex flex-col justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold flex items-center gap-1.5">
                      <Wallet className="h-4 w-4 text-emerald-600" />
                      Unused Balance / Credit
                    </p>
                    <p className="text-2xl font-black text-emerald-700 mt-1 font-mono">
                      {money(unusedBalance, billing.currency)}
                    </p>
                    <p className="text-xs text-stone-500 mt-1 leading-snug">
                      {unusedBalance > 0
                        ? "Automatically credited toward any plan upgrade or downgrade."
                        : "No unused credit balance in the current cycle."}
                    </p>
                  </div>
                  {unusedBalance > 0 && (
                    <div className="mt-4 pt-3 border-t border-stone-100">
                      <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10.5px]">
                        Applied automatically at next switch
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Real-Time Resource Usage & Gauges */}
          {usage && (
            <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-100">
                <div>
                  <h3 className="font-bold text-stone-900 flex items-center gap-2 text-base">
                    <Layers className="h-4 w-4 text-emerald-600" />
                    Current Usage &amp; Limits
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">Real-time resource consumption within your active billing period.</p>
                </div>
                <span className="text-[11px] text-stone-400 font-medium self-start sm:self-auto">Live quota counters</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: "WhatsApp Numbers",
                    used: usage.numbers ?? 0,
                    cap: usage.limits?.numbers,
                    desc: "Connected Official Channels",
                    icon: Phone,
                  },
                  {
                    label: "Subscribers & Contacts",
                    used: usage.contacts ?? 0,
                    cap: usage.limits?.contacts,
                    desc: "Audience Database Capacity",
                    icon: Users,
                  },
                  {
                    label: "Monthly Outbound Messages",
                    used: usage.messagesPerMonth ?? 0,
                    cap: usage.limits?.messagesPerMonth,
                    desc: "Broadcasts, Flows & Outbound",
                    icon: MessageSquare,
                  },
                  {
                    label: "Team Staff Members",
                    used: usage.staff ?? 0,
                    cap: usage.limits?.staff,
                    desc: "Agent & Admin Seats",
                    icon: ShieldCheck,
                  },
                ].map((item, idx) => {
                  const isUnlimited = item.cap === -1 || item.cap === null || item.cap === undefined
                  const pct = isUnlimited || !item.cap ? 0 : Math.min(100, (Number(item.used) / item.cap) * 100)
                  const IconComponent = item.icon

                  return (
                    <div key={idx} className="rounded-xl bg-stone-50/80 p-4 border border-stone-200/60 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1 text-stone-500 mb-1">
                          <span className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                            <IconComponent className="h-3.5 w-3.5 text-stone-500" />
                            {item.label}
                          </span>
                          {isUnlimited && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                              ∞ Unlimited
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1 mt-2">
                          <span className="text-2xl font-black text-stone-900 font-mono">
                            {Number(item.used).toLocaleString()}
                          </span>
                          <span className="text-xs font-medium text-stone-500">
                            {isUnlimited ? "/ ∞" : `/ ${Number(item.cap).toLocaleString()}`}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5">{item.desc}</p>
                      </div>

                      <div className="mt-4">
                        {isUnlimited ? (
                          <div className="space-y-1">
                            <div className="h-1.5 rounded-full bg-emerald-500/20 overflow-hidden">
                              <div className="h-1.5 rounded-full bg-emerald-500 w-full" />
                            </div>
                            <span className="text-[10px] text-emerald-700 font-medium">Unlimited quota enabled</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                  pct > 90 ? "bg-rose-500" : pct > 75 ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-stone-500">
                              <span>{pct.toFixed(0)}% used</span>
                              <span>{(item.cap - Number(item.used)).toLocaleString()} left</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Workspace Modules ON / OFF Manager */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
              <div>
                <h3 className="font-bold text-lg text-stone-900 flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-emerald-600" />
                  Workspace Modules &amp; Feature Controls
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Turn specific modules ON or OFF for your team. Disabled modules are hidden from your sidebar navigation without deleting your data.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("plans")}
                className="text-xs font-semibold rounded-xl text-stone-700 hover:text-emerald-700 hover:border-emerald-300 self-start sm:self-auto gap-1.5 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                Upgrade Plan for More Modules
              </Button>
            </div>

            <WorkspaceModulesManager />
          </div>
        </div>
      )}

      {/* TAB 2: CHANGE PLAN & PRICING (4 PLANS ONLY) */}
      {activeTab === "plans" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                Choose Your Workspace Plan
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Select from our 4 official tiers. Prorated balance is automatically credited when changing tiers.
              </p>
            </div>
            {unusedBalance > 0 && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5 self-start sm:self-auto">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                Proration active: {money(unusedBalance, "OMR")} credit applies automatically
              </span>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {OFFICIAL_PLANS.map((offPlan) => {
              const dbPlan = plans.find((p) => p.slug === offPlan.slug) || {
                id: offPlan.slug,
                slug: offPlan.slug,
                name: offPlan.name,
                description: offPlan.description,
                priceMonthly: offPlan.priceMonthly,
                priceYearly: offPlan.priceYearly,
                currency: offPlan.currency,
                trialDays: offPlan.trialDays,
                modules: offPlan.modules,
              }

              const rawPrice = period === "YEARLY" ? offPlan.priceYearly : offPlan.priceMonthly
              const isCurrent = billing?.planSlug === offPlan.slug && billing?.period === period
              const proration = prorations[dbPlan.id]?.[period] ?? null

              const isUpgrade = proration?.isUpgrade ?? false
              const isDowngrade = proration?.isDowngrade ?? false
              const netDue = proration ? proration.netDueToday : rawPrice
              const creditApplied = proration ? Math.min(rawPrice, proration.unusedCredit) : 0

              return (
                <div
                  key={offPlan.slug}
                  className={`rounded-2xl border p-6 bg-white flex flex-col justify-between transition-all duration-150 shadow-sm hover:shadow-md relative ${
                    isCurrent
                      ? "border-emerald-500 ring-2 ring-emerald-200/70"
                      : offPlan.isPopular
                      ? "border-emerald-300 ring-1 ring-emerald-400/40"
                      : offPlan.isAllInclusive
                      ? "border-purple-300 ring-1 ring-purple-400/40"
                      : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-stone-900 text-lg flex items-center gap-1.5">
                          {offPlan.name}
                        </h3>
                        <p className="text-xs text-stone-500 mt-1 leading-relaxed line-clamp-2">
                          {offPlan.description}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {isCurrent ? (
                          <Badge className="bg-stone-900 text-white font-semibold text-[10px] uppercase">
                            Current
                          </Badge>
                        ) : isUpgrade ? (
                          <Badge className="bg-emerald-100 text-emerald-800 font-semibold text-[10px] uppercase flex items-center gap-0.5">
                            <ArrowUpRight className="h-3 w-3" /> Upgrade
                          </Badge>
                        ) : isDowngrade ? (
                          <Badge className="bg-amber-100 text-amber-800 font-semibold text-[10px] uppercase flex items-center gap-0.5">
                            <ArrowDownRight className="h-3 w-3" /> Downgrade
                          </Badge>
                        ) : null}

                        {offPlan.isPopular && !isCurrent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white tracking-wide">
                            {offPlan.badge || "Most Popular"}
                          </span>
                        )}
                        {offPlan.isAllInclusive && !isCurrent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-600 text-white tracking-wide">
                            {offPlan.badge || "All Add-ons"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pricing Display */}
                    <div className="mt-4 pt-4 border-t border-stone-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-stone-900">
                          {rawPrice > 0 ? money(rawPrice, offPlan.currency) : "Free"}
                        </span>
                        <span className="text-xs font-medium text-stone-500">
                          /{period === "YEARLY" ? "year" : "month"}
                        </span>
                      </div>

                      {/* Proration Pill */}
                      {!isCurrent && creditApplied > 0 && (
                        <div className="mt-3 rounded-lg bg-emerald-50/80 border border-emerald-100 p-2.5 text-xs text-emerald-900 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-stone-600">Standard rate:</span>
                            <span className="font-mono font-medium">{money(rawPrice, offPlan.currency)}</span>
                          </div>
                          <div className="flex justify-between text-emerald-700 font-medium">
                            <span>Balance credit:</span>
                            <span className="font-mono">- {money(creditApplied, offPlan.currency)}</span>
                          </div>
                          <div className="flex justify-between font-bold border-t border-emerald-200/60 pt-1 text-emerald-950">
                            <span>Due today:</span>
                            <span className="font-mono text-sm">{money(netDue, offPlan.currency)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Key Limits Specs */}
                    <div className="mt-4 p-3 rounded-xl bg-stone-50 border border-stone-100 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-stone-700">
                        <span className="font-medium text-stone-500">Numbers:</span>
                        <span className="font-bold text-stone-900">{offPlan.limits.numbers} Official Number{offPlan.limits.numbers > 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center justify-between text-stone-700">
                        <span className="font-medium text-stone-500">Subscribers:</span>
                        <span className="font-bold text-stone-900">
                          {offPlan.limits.contacts === -1 ? "Unlimited (∞)" : Number(offPlan.limits.contacts).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-stone-700">
                        <span className="font-medium text-stone-500">Messages/mo:</span>
                        <span className="font-bold text-stone-900">
                          {offPlan.limits.messagesPerMonth === -1 ? "Unlimited (∞)" : Number(offPlan.limits.messagesPerMonth).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Features Checklist */}
                    <div className="mt-5 space-y-2">
                      <p className="text-[11px] uppercase tracking-wider text-stone-400 font-bold">
                        Included Features
                      </p>
                      <ul className="space-y-1.5">
                        {offPlan.featuresEn.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2 text-xs text-stone-700">
                            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]" />
                            <span className="leading-snug">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Plan Action CTA */}
                  <div className="mt-6 pt-4 border-t border-stone-100">
                    <Button
                      onClick={() => handleSelectPlan(dbPlan)}
                      disabled={busy === dbPlan.id || (isCurrent && !billing?.suspended)}
                      className={`w-full font-semibold rounded-xl transition cursor-pointer ${
                        isCurrent
                          ? billing?.suspended
                            ? "bg-rose-600 hover:bg-rose-700 text-white"
                            : "bg-stone-100 text-stone-500 hover:bg-stone-100 cursor-default"
                          : isUpgrade
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                          : offPlan.isPopular
                          ? "bg-stone-900 hover:bg-emerald-700 text-white shadow-sm"
                          : "bg-stone-900 hover:bg-stone-800 text-white"
                      }`}
                    >
                      {busy === dbPlan.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isCurrent ? (
                        billing?.suspended ? "Pay Overdue Bill" : "Current Plan"
                      ) : isUpgrade ? (
                        <>
                          <CreditCard className="h-4 w-4 mr-1.5" />
                          Upgrade ({money(netDue, offPlan.currency)})
                        </>
                      ) : isDowngrade ? (
                        <>
                          <ArrowDownRight className="h-4 w-4 mr-1.5" />
                          Downgrade ({netDue > 0 ? money(netDue, offPlan.currency) : "Free Switch"})
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-1.5" />
                          Choose {offPlan.name}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ADD-ON MARKETPLACE */}
      {activeTab === "addons" && addons.length > 0 && (
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div>
              <h3 className="font-bold text-lg text-stone-900 flex items-center gap-2">
                <Boxes className="h-5 w-5 text-emerald-600" />
                Workspace Add-Ons &amp; Integrations
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Attach modular connectors, GCC e-commerce sync, and AI capabilities without changing your base plan.
              </p>
            </div>
            {activeAddons.filter((a) => a.status === "ACTIVE").length > 0 && (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs px-2.5 py-1 self-start sm:self-auto font-medium">
                {activeAddons.filter((a) => a.status === "ACTIVE").length} Active on Workspace
              </Badge>
            )}
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap gap-1.5 pb-1">
            {[
              { id: "ALL", label: `All Add-Ons (${addons.length})` },
              { id: "ECOMMERCE", label: "Store & Commerce" },
              { id: "AI", label: "AI & Audio" },
              { id: "INTEGRATION", label: "CRM & Sheets" },
              { id: "GROWTH", label: "Growth & Reputation" },
              { id: "CORE", label: "Inbox & Team" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAddonFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  addonFilter === tab.id
                    ? "bg-stone-900 text-white shadow-xs"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {addons
              .filter((addon) => {
                if (addonFilter === "ALL") return true
                if (addonFilter === "ECOMMERCE") return ["RESTAURANT", "WOOCOMMERCE", "ECOMMERCE", "CORPORATE"].includes(addon.module)
                if (addonFilter === "AI") return ["AI", "FLOWS"].includes(addon.module)
                if (addonFilter === "INTEGRATION") return ["INTEGRATION", "CRM"].includes(addon.module)
                if (addonFilter === "GROWTH") return ["BROADCAST", "REPUTATION", "WHITE_LABEL", "DIGITAL_QR", "DIGITAL_VCARD", "SOCIAL_INBOX", "LIVE_CHAT", "WEBSITE"].includes(addon.module)
                if (addonFilter === "CORE") return ["STAFF", "INBOX", "HOSPITAL"].includes(addon.module)
                return true
              })
              .map((addon) => {
                const activeItem = activeAddons.find(
                  (a) => (a.addon?.slug === addon.slug || a.addonId === addon.id) && a.status === "ACTIVE"
                )
                const isActive = !!activeItem
                const isEntitled = Boolean(addon.module && entitledModules.includes(addon.module))
                const isDisabled = Boolean(addon.module && disabledModules.includes(addon.module))
                const isModuleActive = isEntitled && !isDisabled
                const moduleLabel = MODULE_NAMES[addon.module] || addon.module || "Add-On"

                return (
                  <div
                    key={addon.slug}
                    className={`rounded-xl border p-4.5 flex flex-col justify-between transition relative ${
                      isModuleActive
                        ? "border-emerald-300 bg-emerald-50/25 shadow-xs ring-1 ring-emerald-500/20"
                        : isDisabled
                          ? "border-amber-200 bg-amber-50/15"
                          : "border-stone-200 bg-white hover:border-stone-300 hover:shadow-xs"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10.5px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                          {moduleLabel}
                        </span>
                        <div className="flex items-center gap-2">
                          {isModuleActive ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="h-3 w-3" /> Active in Sidebar
                            </span>
                          ) : isDisabled ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded-full">
                              <EyeOff className="h-3 w-3" /> Turned OFF
                            </span>
                          ) : isActive ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="h-3 w-3" /> Active
                            </span>
                          ) : null}

                          {isEntitled && addon.module && (
                            <div className="flex items-center gap-1.5 pl-1 border-l border-stone-200">
                              {moduleToggling === addon.module ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                              ) : (
                                <Switch
                                  checked={isModuleActive}
                                  onCheckedChange={(checked) => toggleModuleFromAddon(addon.module, checked)}
                                  className="cursor-pointer scale-75 data-[state=checked]:bg-emerald-600"
                                  title={isModuleActive ? "Click to turn off and hide from sidebar" : "Click to activate and show in sidebar"}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="font-bold text-sm text-stone-900 leading-snug">{addon.name}</p>
                      <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">{addon.description}</p>

                      {/* Addon Limits & Features Pills */}
                      {addon.limits && Object.keys(addon.limits).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {addon.limits.voiceNotesPerMonth && (
                            <span className="text-[10.5px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200">
                              {addon.limits.voiceNotesPerMonth.toLocaleString()} audio/mo
                            </span>
                          )}
                          {addon.limits.sheetsLimit && (
                            <span className="text-[10.5px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200">
                              Up to {addon.limits.sheetsLimit} Google Sheets
                            </span>
                          )}
                          {addon.limits.messagesPerMonth && (
                            <span className="text-[10.5px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200">
                              +{addon.limits.messagesPerMonth.toLocaleString()} msgs/mo
                            </span>
                          )}
                          {addon.limits.subWorkspaces && (
                            <span className="text-[10.5px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200">
                              {addon.limits.subWorkspaces} Sub-Accounts
                            </span>
                          )}
                          {addon.limits.platforms && Array.isArray(addon.limits.platforms) && (
                            <span className="text-[10.5px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200">
                              {addon.limits.platforms.join(", ")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-stone-100">
                      <div>
                        <p className="text-xs font-bold text-stone-900">
                          {money(period === "YEARLY" ? addon.priceYearly : addon.priceMonthly, addon.currency)}
                          <span className="font-normal text-stone-500 text-[11px]">
                            {" "}/ {period === "YEARLY" ? "year" : "month"}
                          </span>
                        </p>
                      </div>

                      {isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => executeAddonCancel(addon.slug)}
                          disabled={addonBusy === addon.slug}
                          className="text-stone-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 text-xs h-8 px-2.5 cursor-pointer"
                        >
                          {addonBusy === addon.slug ? <Loader2 className="h-3 w-3 animate-spin" /> : "Cancel Add-On"}
                        </Button>
                      ) : isEntitled ? (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-emerald-600" />
                          Included in Plan
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleSelectAddon(addon)}
                          disabled={addonBusy === addon.slug}
                          className="bg-stone-900 hover:bg-emerald-600 text-white rounded-lg h-8 px-3 text-xs font-semibold transition cursor-pointer"
                        >
                          {addonBusy === addon.slug ? <Loader2 className="h-3 w-3 animate-spin" /> : "Purchase Add-On"}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* TAB 4: WORKSPACE INVOICES & PAYMENT RECEIPTS */}
      {activeTab === "invoices" && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
            <div>
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-600" />
                Invoices &amp; Payment Receipts
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Access, print, and download official A4 invoices for your subscription renewals and add-ons.
              </p>
            </div>
            <span className="text-xs text-stone-400 font-medium self-start sm:self-auto">
              {invoices.length} {invoices.length === 1 ? "invoice" : "invoices"}
            </span>
          </div>

          {invoices.length === 0 ? (
            <div className="py-8 text-center text-stone-400 text-xs">
              <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40 text-stone-400" />
              No invoices generated yet for this workspace.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {invoices.map((inv) => {
                    const dateStr = inv.createdAt
                      ? new Date(inv.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "-"
                    const planDesc =
                      inv.items?.[0]?.description ||
                      (inv.reference.startsWith("ADDON-") ? "Add-on purchase" : inv.subscription?.plan?.name
                        ? `${inv.subscription.plan.name} (${inv.period === "YEARLY" ? "Yearly" : "Monthly"})`
                        : "Subscription")
                    return (
                      <tr key={inv.id} className="hover:bg-stone-50/70 transition">
                        <td className="py-3 px-3 font-medium text-stone-700 whitespace-nowrap">{dateStr}</td>
                        <td className="py-3 px-3 font-mono font-bold text-stone-900 whitespace-nowrap">{inv.reference}</td>
                        <td className="py-3 px-3 text-stone-600 max-w-xs truncate">{planDesc}</td>
                        <td className="py-3 px-3 font-mono font-bold text-stone-900 whitespace-nowrap">
                          {money(inv.amount, inv.currency)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold px-2 py-0.5 border-0 ${
                              inv.status === "PAID"
                                ? "bg-emerald-100 text-emerald-800"
                                : inv.status === "PENDING"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Print in A4 */}
                            <Button
                              size="sm"
                              variant="outline"
                              title="Print in A4"
                              onClick={() => window.open(`/api/platform/invoices/${inv.id}/view?print=1`, "_blank", "noopener")}
                              className="h-7 px-2.5 text-xs rounded-lg text-stone-700 font-semibold gap-1 hover:bg-stone-100 cursor-pointer"
                            >
                              <Printer className="h-3 w-3 text-stone-600" />
                              <span>Print</span>
                            </Button>

                            {/* View Invoice */}
                            <Button
                              size="sm"
                              variant="outline"
                              title="View Invoice"
                              onClick={() => window.open(`/api/platform/invoices/${inv.id}/view`, "_blank", "noopener")}
                              className="h-7 px-2.5 text-xs rounded-lg text-stone-700 font-semibold gap-1 hover:bg-stone-100 cursor-pointer"
                            >
                              <FileText className="h-3 w-3 text-stone-600" />
                              <span>View</span>
                            </Button>

                            {/* Download PDF */}
                            <Button
                              size="sm"
                              variant="outline"
                              title="Download PDF"
                              onClick={() => {
                                const a = document.createElement("a")
                                a.href = `/api/platform/invoices/${inv.id}/pdf`
                                a.download = `${inv.reference}.pdf`
                                a.click()
                              }}
                              className="h-7 px-2.5 text-xs rounded-lg text-stone-700 font-semibold gap-1 hover:bg-stone-100 cursor-pointer"
                            >
                              <Download className="h-3 w-3 text-stone-600" />
                              <span>PDF</span>
                            </Button>

                            {/* Pay buttons if unpaid */}
                            {inv.status !== "PAID" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Pay with Paymob"
                                  onClick={() => window.open(`/api/paymob/pay/${encodeURIComponent(inv.reference)}`, "_blank", "noopener")}
                                  className="h-7 px-2 text-[11px] rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold gap-1 cursor-pointer"
                                >
                                  <CreditCard className="h-3 w-3" /> Paymob
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Pay with AmwalPay"
                                  onClick={() => window.open(`/api/amwalpay/pay/${encodeURIComponent(inv.reference)}`, "_blank", "noopener")}
                                  className="h-7 px-2 text-[11px] rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-bold gap-1 cursor-pointer"
                                >
                                  <ShieldCheck className="h-3 w-3" /> AmwalPay
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Interactive Plan Change Confirmation & Proration Breakdown Dialog */}
      <Dialog open={!!confirmPlan} onOpenChange={(open) => !open && setConfirmPlan(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-stone-900">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              Confirm Plan Switch: {confirmPlan?.plan.name}
            </DialogTitle>
            <DialogDescription className="text-stone-500 text-xs">
              Review your prorated balance and billing breakdown before proceeding.
            </DialogDescription>
          </DialogHeader>

          {confirmPlan && (
            <div className="space-y-4 py-3">
              {/* Itemized Calculation Box */}
              <div className="rounded-xl bg-stone-50 border border-stone-200/80 p-4 space-y-2.5 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>New Plan Tier ({confirmPlan.plan.name}):</span>
                  <span className="font-mono font-semibold text-stone-900">
                    {money(
                      period === "YEARLY" ? confirmPlan.plan.priceYearly : confirmPlan.plan.priceMonthly,
                      confirmPlan.plan.currency,
                    )}
                  </span>
                </div>

                {confirmPlan.proration && confirmPlan.proration.unusedCredit > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Unused Balance Applied ({confirmPlan.proration.daysLeft} days credit):</span>
                    <span className="font-mono">
                      -{" "}
                      {money(
                        Math.min(
                          period === "YEARLY" ? confirmPlan.plan.priceYearly : confirmPlan.plan.priceMonthly,
                          confirmPlan.proration.unusedCredit,
                        ),
                        confirmPlan.plan.currency,
                      )}
                    </span>
                  </div>
                )}

                <div className="border-t border-stone-200 pt-2.5 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-stone-900">Net Due Today:</span>
                  <span className="text-lg font-black text-emerald-700 font-mono">
                    {confirmPlan.proration
                      ? money(confirmPlan.proration.netDueToday, confirmPlan.plan.currency)
                      : money(
                          period === "YEARLY" ? confirmPlan.plan.priceYearly : confirmPlan.plan.priceMonthly,
                          confirmPlan.plan.currency,
                        )}
                  </span>
                </div>

                {confirmPlan.proration && confirmPlan.proration.creditRemaining > 0 && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200/70 p-2 text-amber-800 text-[11px]">
                    ℹ️ <strong>{money(confirmPlan.proration.creditRemaining, confirmPlan.plan.currency)}</strong> unused credit will remain available in your account balance for future renewals.
                  </div>
                )}
              </div>

              {/* Gateway Choice when payment is required */}
              {confirmPlan.proration && confirmPlan.proration.netDueToday > 0 && availableGateways.allowChoice && (
                <div className="space-y-2 pt-2 border-t border-stone-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-800">Select Payment Gateway</span>
                    <span className="text-[10px] text-stone-400">Choose your preferred provider</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {availableGateways.paymob && (
                      <div
                        onClick={() => setSelectedGateway("PAYMOB")}
                        className={`cursor-pointer rounded-xl p-3 border transition flex flex-col justify-between ${
                          selectedGateway === "PAYMOB"
                            ? "border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20"
                            : "border-stone-200 bg-white hover:border-stone-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                            <CreditCard className="h-4 w-4 text-blue-600" /> Paymob
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            Unified
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-1.5 leading-snug">
                          Cards, OmanNet &amp; Wallets
                        </p>
                      </div>
                    )}

                    {availableGateways.amwalpay && (
                      <div
                        onClick={() => setSelectedGateway("AMWALPAY")}
                        className={`cursor-pointer rounded-xl p-3 border transition flex flex-col justify-between ${
                          selectedGateway === "AMWALPAY"
                            ? "border-emerald-600 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20"
                            : "border-stone-200 bg-white hover:border-stone-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                            <ShieldCheck className="h-4 w-4 text-emerald-600" /> AmwalPay
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            SmartBox
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-1.5 leading-snug">
                          OMR Debit/Credit &amp; Apple Pay
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-stone-500 leading-relaxed">
                {confirmPlan.proration && confirmPlan.proration.netDueToday > 0
                  ? `You will be redirected to the secure ${selectedGateway === "PAYMOB" ? "Paymob Unified Checkout" : "AmwalPay SmartBox"} gateway to complete payment.`
                  : "Your plan will be updated immediately using your existing account credit balance."}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmPlan(null)}
              disabled={!!busy}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={executePlanChange}
              disabled={!!busy}
              className={`font-semibold rounded-xl text-white ${
                selectedGateway === "PAYMOB" ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : confirmPlan?.proration && confirmPlan.proration.netDueToday > 0 ? (
                `Proceed to ${selectedGateway === "PAYMOB" ? "Paymob" : "AmwalPay"} Checkout`
              ) : (
                "Confirm & Switch Plan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interactive Add-on Purchase & Gateway Selection Dialog */}
      <Dialog open={!!confirmAddon} onOpenChange={(open) => !open && setConfirmAddon(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-stone-900">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              Purchase Add-On: {confirmAddon?.name}
            </DialogTitle>
            <DialogDescription className="text-stone-500 text-xs">
              {confirmAddon?.description}
            </DialogDescription>
          </DialogHeader>

          {confirmAddon && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl bg-stone-50 border border-stone-200/80 p-3.5 flex justify-between items-center text-xs">
                <span className="font-medium text-stone-600">Total Due Today:</span>
                <span className="text-base font-bold text-stone-900 font-mono">
                  {money(
                    period === "YEARLY" ? confirmAddon.priceYearly : confirmAddon.priceMonthly,
                    confirmAddon.currency,
                  )} / {period === "YEARLY" ? "year" : "month"}
                </span>
              </div>

              {availableGateways.allowChoice && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-800">Select Payment Gateway</span>
                    <span className="text-[10px] text-stone-400">Choose your preferred provider</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {availableGateways.paymob && (
                      <div
                        onClick={() => setSelectedGateway("PAYMOB")}
                        className={`cursor-pointer rounded-xl p-3 border transition flex flex-col justify-between ${
                          selectedGateway === "PAYMOB"
                            ? "border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20"
                            : "border-stone-200 bg-white hover:border-stone-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                            <CreditCard className="h-4 w-4 text-blue-600" /> Paymob
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            Unified
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-1.5 leading-snug">
                          Cards, OmanNet &amp; Wallets
                        </p>
                      </div>
                    )}

                    {availableGateways.amwalpay && (
                      <div
                        onClick={() => setSelectedGateway("AMWALPAY")}
                        className={`cursor-pointer rounded-xl p-3 border transition flex flex-col justify-between ${
                          selectedGateway === "AMWALPAY"
                            ? "border-emerald-600 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20"
                            : "border-stone-200 bg-white hover:border-stone-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                            <ShieldCheck className="h-4 w-4 text-emerald-600" /> AmwalPay
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            SmartBox
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-1.5 leading-snug">
                          OMR Debit/Credit &amp; Apple Pay
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmAddon(null)}
              disabled={!!addonBusy}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={() => confirmAddon && executeAddonPurchase(confirmAddon.slug, selectedGateway)}
              disabled={!!addonBusy}
              className={`font-semibold rounded-xl text-white ${
                selectedGateway === "PAYMOB" ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {addonBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Pay via ${selectedGateway === "PAYMOB" ? "Paymob" : "AmwalPay"}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Minor units to something a person reads. OMR carries three decimals. */
function money(minor: number, currency: string): string {
  return `${(minor / 1000).toFixed(3)} ${currency}`
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    TRIALING: "Trial",
    ACTIVE: "Active",
    PAST_DUE: "Payment Due",
    CANCELLED: "Cancelled",
    NONE: "No Subscription",
  }
  return labels[status] ?? status
}

function statusTone(status: string): string {
  if (status === "ACTIVE") return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0"
  if (status === "TRIALING") return "bg-sky-100 text-sky-700 hover:bg-sky-100 border-0"
  if (status === "PAST_DUE") return "bg-amber-100 text-amber-700 hover:bg-amber-100 border-0"
  return "bg-stone-100 text-stone-600 hover:bg-stone-100 border-0"
}
