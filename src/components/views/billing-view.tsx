"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

const MODULE_NAMES: Record<string, string> = {
  INBOX: "WhatsApp Inbox & Live Chat",
  TOURS: "Tours, Bookings & Vouchers",
  VISA: "Visa & Travel Enquiries",
  APPOINTMENTS: "Appointment Scheduling",
  BROADCAST: "WhatsApp Broadcast Campaigns",
  FLOWS: "Visual Botflow Automations",
  AI: "AI Smart Replies & OCR Analysis",
  CALLS: "Voice & VoIP Calling",
  PAYMENTS: "AmwalPay Online Card Gateway",
}

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
  const [usage, setUsage] = useState<any>(null)
  const [addonBusy, setAddonBusy] = useState<string | null>(null)

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
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                period === option
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {option === "MONTHLY" ? "Monthly billing" : "Yearly billing (Save ~20%)"}
            </button>
          ))}
        </div>
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

      {/* Current Plan & Balance Summary Card */}
      {billing && (
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
          <div className="grid gap-6 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-stone-100">
            {/* Left: Current Active Plan */}
            <div className="pr-4">
              <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Active Subscription
              </p>
              <div className="flex items-baseline gap-2 mt-1.5">
                <p className="text-xl font-bold text-stone-900">{billing.planName ?? "Free Trial"}</p>
                <Badge className={statusTone(billing.status)}>{statusLabel(billing.status)}</Badge>
              </div>
              <p className="text-sm text-stone-600 mt-1">
                {billing.price > 0
                  ? `${money(billing.price, billing.currency)} / ${billing.period === "YEARLY" ? "year" : "month"}`
                  : "Complimentary workspace"}
              </p>
            </div>

            {/* Middle: Cycle Duration & Renewal */}
            <div className="pt-4 md:pt-0 md:px-6">
              <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-sky-600" />
                Billing Cycle & Status
              </p>
              <p className="text-lg font-semibold text-stone-800 mt-1.5">
                {billing.currentPeriodEnd
                  ? new Date(billing.currentPeriodEnd).toLocaleDateString(undefined, { dateStyle: "medium" })
                  : billing.trialEndsAt
                    ? `Trial ends ${new Date(billing.trialEndsAt).toLocaleDateString()}`
                    : "Active"}
              </p>
              {billing.daysLeft !== null && (
                <p className={`text-xs mt-1 font-medium ${billing.daysLeft < 4 ? "text-rose-600" : "text-stone-500"}`}>
                  {billing.daysLeft >= 0
                    ? `${billing.daysLeft} day${billing.daysLeft === 1 ? "" : "s"} remaining in current period`
                    : `${Math.abs(billing.daysLeft)} days overdue`}
                </p>
              )}
            </div>

            {/* Right: Prorated Unused Balance */}
            <div className="pt-4 md:pt-0 md:pl-6">
              <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-emerald-600" />
                Unused Balance / Credit
              </p>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                {money(unusedBalance, billing.currency)}
              </p>
              <p className="text-xs text-stone-500 mt-1 leading-snug">
                {unusedBalance > 0
                  ? "Automatically credited toward any plan upgrade or downgrade."
                  : "No unused credit balance in the current cycle."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plan Catalogue Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-stone-900">Available Subscription Plans</h2>
          {unusedBalance > 0 && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Proration active: {money(unusedBalance, "OMR")} credit applies automatically
            </span>
          )}
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {plans.map((plan) => {
            const rawPrice = period === "YEARLY" ? plan.priceYearly : plan.priceMonthly
            const isCurrent = billing?.planSlug === plan.slug && billing?.period === period
            const proration = prorations[plan.id]?.[period] ?? null

            const isUpgrade = proration?.isUpgrade ?? false
            const isDowngrade = proration?.isDowngrade ?? false
            const netDue = proration ? proration.netDueToday : rawPrice
            const creditApplied = proration ? Math.min(rawPrice, proration.unusedCredit) : 0

            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-6 bg-white flex flex-col justify-between transition-all duration-150 shadow-sm hover:shadow-md ${
                  isCurrent
                    ? "border-emerald-500 ring-2 ring-emerald-200/70"
                    : "border-stone-200 hover:border-stone-300"
                }`}
              >
                <div>
                  {/* Plan Top Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-stone-900 text-lg">{plan.name}</h3>
                      {plan.description && (
                        <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{plan.description}</p>
                      )}
                    </div>
                    {isCurrent ? (
                      <Badge className="bg-stone-900 text-white font-semibold text-[10px] uppercase">
                        Current Plan
                      </Badge>
                    ) : isUpgrade ? (
                      <Badge className="bg-emerald-100 text-emerald-800 font-semibold text-[10px] uppercase flex items-center gap-0.5">
                        <ArrowUpRight className="h-3 w-3" />
                        Upgrade
                      </Badge>
                    ) : isDowngrade ? (
                      <Badge className="bg-amber-100 text-amber-800 font-semibold text-[10px] uppercase flex items-center gap-0.5">
                        <ArrowDownRight className="h-3 w-3" />
                        Downgrade
                      </Badge>
                    ) : null}
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="mt-4 pt-4 border-t border-stone-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-stone-900">
                        {rawPrice > 0 ? money(rawPrice, plan.currency) : "Free"}
                      </span>
                      <span className="text-xs font-medium text-stone-500">
                        /{period === "YEARLY" ? "year" : "month"}
                      </span>
                    </div>

                    {/* Prorated Credit Breakdown Pill */}
                    {!isCurrent && creditApplied > 0 && (
                      <div className="mt-3 rounded-lg bg-emerald-50/80 border border-emerald-100 p-2.5 text-xs text-emerald-900 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-stone-600">Standard rate:</span>
                          <span className="font-mono font-medium">{money(rawPrice, plan.currency)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-700 font-medium">
                          <span>Unused balance credit:</span>
                          <span className="font-mono">- {money(creditApplied, plan.currency)}</span>
                        </div>
                        <div className="flex justify-between font-bold border-t border-emerald-200/60 pt-1 text-emerald-950">
                          <span>Amount due today:</span>
                          <span className="font-mono text-sm">{money(netDue, plan.currency)}</span>
                        </div>
                        {proration && proration.creditRemaining > 0 && (
                          <div className="text-[11px] text-amber-700 font-medium pt-0.5">
                            + {money(proration.creditRemaining, plan.currency)} credit carried forward
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Modules List */}
                  <div className="mt-5 space-y-2">
                    <p className="text-[11px] uppercase tracking-wider text-stone-400 font-bold">
                      Included Modules
                    </p>
                    <ul className="space-y-1.5">
                      {(plan.modules ?? []).map((mod) => (
                        <li key={mod} className="flex items-center gap-2 text-xs text-stone-700">
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                          <span>{MODULE_NAMES[mod] ?? mod}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Plan Action CTA */}
                <div className="mt-6 pt-4 border-t border-stone-100">
                  <Button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={busy === plan.id || (isCurrent && !billing?.suspended)}
                    className={`w-full font-semibold rounded-xl transition ${
                      isCurrent
                        ? billing?.suspended
                          ? "bg-rose-600 hover:bg-rose-700 text-white"
                          : "bg-stone-100 text-stone-500 hover:bg-stone-100 cursor-default"
                        : isUpgrade
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                          : "bg-stone-900 hover:bg-stone-800 text-white"
                    }`}
                  >
                    {busy === plan.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCurrent ? (
                      billing?.suspended ? "Pay Overdue Bill" : "Current Plan"
                    ) : isUpgrade ? (
                      <>
                        <CreditCard className="h-4 w-4 mr-1.5" />
                        Upgrade ({money(netDue, plan.currency)})
                      </>
                    ) : isDowngrade ? (
                      <>
                        <ArrowDownRight className="h-4 w-4 mr-1.5" />
                        Downgrade ({netDue > 0 ? money(netDue, plan.currency) : "Free Switch"})
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-1.5" />
                        Choose {plan.name}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Usage Overview */}
      {usage && (
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-stone-900">Current Usage & Limits</h3>
            <p className="text-xs text-stone-500 mt-0.5">Resource consumption within your current billing cycle.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ["Team Staff Members", usage.staff, usage.limits?.staff],
              ["CRM Contacts", usage.contacts, usage.limits?.contacts],
              ["WhatsApp Numbers", usage.numbers, usage.limits?.numbers],
              ["Monthly Outbound Messages", usage.messagesPerMonth, usage.limits?.messagesPerMonth],
            ].map(([label, used, cap]) => (
              <div key={String(label)} className="rounded-xl bg-stone-50 p-4 border border-stone-100">
                <p className="text-xs text-stone-500 font-medium">{label}</p>
                <p className="text-lg font-bold text-stone-900 mt-1">
                  {used}
                  {cap ? <span className="text-xs font-normal text-stone-500"> / {cap}</span> : <span className="text-xs font-normal text-stone-500"> / unlimited</span>}
                </p>
                {typeof cap === "number" && cap > 0 && (
                  <div className="h-1.5 rounded-full bg-stone-200 mt-2 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        Number(used) / cap > 0.9 ? "bg-rose-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, (Number(used) / cap) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Add-Ons */}
      {addons.length > 0 && (
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-stone-900">Workspace Add-Ons</h3>
            <p className="text-xs text-stone-500 mt-0.5">Attach specialized capabilities without upgrading your base plan.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {addons.map((addon) => (
              <div
                key={addon.slug}
                className="rounded-xl border border-stone-200 p-4 flex flex-col justify-between hover:border-stone-300 transition"
              >
                <div>
                  <p className="font-semibold text-sm text-stone-900">{addon.name}</p>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">{addon.description}</p>
                </div>
                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-stone-100">
                  <p className="text-xs font-bold text-emerald-700">
                    {money(period === "YEARLY" ? addon.priceYearly : addon.priceMonthly, addon.currency)} /{" "}
                    {period === "YEARLY" ? "year" : "month"}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => handleSelectAddon(addon)}
                    disabled={addonBusy === addon.slug}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-8 px-3 text-xs"
                  >
                    {addonBusy === addon.slug ? <Loader2 className="h-3 w-3 animate-spin" /> : "Purchase Add-On"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workspace Invoices & Payment Receipts */}
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
                    (inv.subscription?.plan?.name
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
                            className="h-7 px-2.5 text-xs rounded-lg text-stone-700 font-semibold gap-1 hover:bg-stone-100"
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
                            className="h-7 px-2.5 text-xs rounded-lg text-stone-700 font-semibold gap-1 hover:bg-stone-100"
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
                            className="h-7 px-2.5 text-xs rounded-lg text-stone-700 font-semibold gap-1 hover:bg-stone-100"
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
                                className="h-7 px-2 text-[11px] rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold gap-1"
                              >
                                <CreditCard className="h-3 w-3" /> Paymob
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Pay with AmwalPay"
                                onClick={() => window.open(`/api/amwalpay/pay/${encodeURIComponent(inv.reference)}`, "_blank", "noopener")}
                                className="h-7 px-2 text-[11px] rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-bold gap-1"
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
