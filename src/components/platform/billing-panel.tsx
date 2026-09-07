"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  Loader2, Search, Building2, Eye, CreditCard, Edit2, CheckCircle2,
  Calendar, RefreshCw, AlertTriangle, ShieldCheck, ShieldAlert,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"

interface Plan {
  id: string
  name: string
  slug: string
  priceMonthly: number
}

interface TenantSubscription {
  id: string
  name: string
  slug: string
  status: string
  plan: string | null
  subscriptionStatus: string
  currentPeriodEnd: string | null
  trialEndsAt: string | null
  amount: number
}

// The PATCH route dispatches on body.action and answers an unknown one with
// 400 {"error":...}. Surfacing that text is what turns "Failed to update
// subscription" back into something diagnosable.
async function errorFrom(res: Response, fallback: string) {
  const body = await res.json().catch(() => null)
  return (body && typeof body.error === "string" && body.error) || fallback
}

export function BillingSubscriptionsPanel() {
  const [tenants, setTenants] = useState<TenantSubscription[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [sortField, setSortField] = useState<"name" | "amount">("name")

  // Edit / Modify Modal
  const [selectedTenant, setSelectedTenant] = useState<TenantSubscription | null>(null)
  const [editPlanId, setEditPlanId] = useState("")
  const [editSubStatus, setEditSubStatus] = useState("")
  const [trialDaysToAdd, setTrialDaysToAdd] = useState(14)
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/platform/tenants")
      if (!res.ok) throw new Error()
      const data = await res.json()
      const rawTenants = Array.isArray(data.tenants) ? data.tenants : []
      const rawPlans = Array.isArray(data.plans) ? data.plans : []
      setPlans(rawPlans)

      const mapped: TenantSubscription[] = rawTenants.map((t: any) => {
        const matchingPlan = rawPlans.find((p: any) => p.name === t.plan)
        return {
          id: t.id,
          name: t.name,
          slug: t.slug,
          status: t.status || "ACTIVE",
          plan: t.plan || "None",
          subscriptionStatus: t.subscriptionStatus || "INACTIVE",
          currentPeriodEnd: t.currentPeriodEnd,
          trialEndsAt: t.trialEndsAt,
          amount: matchingPlan ? matchingPlan.priceMonthly / 1000 : 0,
        }
      })
      setTenants(mapped)
    } catch {
      setTenants([])
      toast.error("Failed to load subscription data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const openEdit = (t: TenantSubscription) => {
    setSelectedTenant(t)
    const currentPlan = plans.find(p => p.name === t.plan)
    setEditPlanId(currentPlan?.id || plans[0]?.id || "")
    setEditSubStatus(t.subscriptionStatus)
    setTrialDaysToAdd(14)
  }

  const handleUpdateSubscription = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTenant) return
    setSaving(true)
    try {
      const res = await fetch(`/api/platform/tenants/${selectedTenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "plan",
          planId: editPlanId,
          subscriptionStatus: editSubStatus,
        }),
      })
      if (!res.ok) throw new Error(await errorFrom(res, "Failed to update subscription"))
      toast.success("Subscription updated successfully")
      setSelectedTenant(null)
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update subscription")
    } finally {
      setSaving(false)
    }
  }

  const handleExtendTrial = async () => {
    if (!selectedTenant) return
    setSaving(true)
    try {
      const res = await fetch(`/api/platform/tenants/${selectedTenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "extend_trial",
          days: Number(trialDaysToAdd),
        }),
      })
      if (!res.ok) throw new Error(await errorFrom(res, "Failed to extend trial"))
      toast.success(`Trial extended by ${trialDaysToAdd} days`)
      setSelectedTenant(null)
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to extend trial")
    } finally {
      setSaving(false)
    }
  }

  const safeTenants = Array.isArray(tenants) ? tenants : []
  const filtered = safeTenants
    .filter(t => {
      const s = search.toLowerCase()
      const matchesSearch = (t.name || "").toLowerCase().includes(s) || (t.plan || "").toLowerCase().includes(s)
      const matchesStatus = statusFilter === "ALL" || t.subscriptionStatus === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      if (sortField === "name") return (a.name || "").localeCompare(b.name || "")
      return b.amount - a.amount
    })

  const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase()
    if (s === "TRIALING") return "bg-blue-100 text-blue-800 border-blue-200"
    if (s === "ACTIVE") return "bg-emerald-100 text-emerald-800 border-emerald-300"
    if (s === "PAST_DUE") return "bg-amber-100 text-amber-800 border-amber-300 font-bold"
    if (s === "CANCELLED") return "bg-rose-100 text-rose-800 border-rose-300"
    return "bg-stone-100 text-stone-700 border-stone-200"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-900">Subscriptions & Billing</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage tenant subscription tiers, billing status, and trial extensions.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={loadData}
          disabled={loading}
          className="text-xs rounded-xl h-9 gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {/* Filters */}
        <div className="p-4 bg-stone-50/60 border-b border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
            <Input
              placeholder="Search tenant name or plan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs rounded-xl bg-white border-stone-200"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-9 px-3 text-xs font-semibold rounded-xl border border-stone-200 bg-white text-stone-700 w-full sm:w-auto"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="TRIALING">Trialing</option>
              <option value="PAST_DUE">Past Due</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select
              value={sortField}
              onChange={e => setSortField(e.target.value as "name" | "amount")}
              className="h-9 px-3 text-xs font-semibold rounded-xl border border-stone-200 bg-white text-stone-700 w-full sm:w-auto"
            >
              <option value="name">Sort by Name</option>
              <option value="amount">Sort by Amount (MRR)</option>
            </select>
          </div>
        </div>

        {loading && safeTenants.length === 0 ? (
          <div className="py-14 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mx-auto" />
            <p className="text-xs text-stone-500 mt-2 font-medium">Loading subscription records...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center space-y-2">
            <div className="h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
              <Building2 className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-stone-700">No subscriptions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Tenant Workspace</th>
                  <th className="px-4 py-3">Plan Tier</th>
                  <th className="px-4 py-3">Billing Status</th>
                  <th className="px-4 py-3">Monthly Price</th>
                  <th className="px-4 py-3">Period / Trial End</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-stone-900">{t.name}</div>
                      <div className="text-[10px] text-stone-400 font-mono">/{t.slug}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md">
                        {t.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(t.subscriptionStatus)}`}>
                        {t.subscriptionStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-stone-900">
                      OMR {t.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-stone-600">
                      {t.currentPeriodEnd
                        ? new Date(t.currentPeriodEnd).toLocaleDateString()
                        : t.trialEndsAt
                        ? `Trial: ${new Date(t.trialEndsAt).toLocaleDateString()}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(t)}
                        className="h-7 text-xs rounded-lg font-semibold gap-1"
                      >
                        <Edit2 className="h-3 w-3" /> Edit Subscription
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Subscription Modal */}
      {selectedTenant && (
        <Dialog open={!!selectedTenant} onOpenChange={open => !open && setSelectedTenant(null)}>
          <DialogContent className="sm:max-w-lg p-6 bg-white rounded-3xl border-stone-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-stone-900">
                Modify Subscription: {selectedTenant.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-500">
                Change pricing plan, update status, or grant a trial extension.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdateSubscription} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Assigned Plan</label>
                  <select
                    value={editPlanId}
                    onChange={e => setEditPlanId(e.target.value)}
                    className="w-full h-9 px-3 text-xs font-semibold rounded-xl border border-stone-200 bg-white text-stone-800"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (OMR {(p.priceMonthly / 1000).toFixed(1)}/mo)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Billing Status</label>
                  <select
                    value={editSubStatus}
                    onChange={e => setEditSubStatus(e.target.value)}
                    className="w-full h-9 px-3 text-xs font-semibold rounded-xl border border-stone-200 bg-white text-stone-800"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="TRIALING">TRIALING</option>
                    <option value="PAST_DUE">PAST_DUE (Overdue)</option>
                    <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>

              {/* Trial Extension Helper */}
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Extend Trial Period
                  </span>
                  <span className="text-[10px] text-blue-700">
                    Current end: {selectedTenant.trialEndsAt ? new Date(selectedTenant.trialEndsAt).toLocaleDateString() : "No trial"}
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={trialDaysToAdd}
                    onChange={e => setTrialDaysToAdd(Number(e.target.value))}
                    className="w-24 h-8 text-xs bg-white"
                  />
                  <span className="text-xs text-blue-800 font-medium">days</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleExtendTrial}
                    disabled={saving}
                    className="ml-auto h-8 text-xs font-bold bg-white text-blue-800 hover:bg-blue-100"
                  >
                    Apply Trial Extension
                  </Button>
                </div>
              </div>

              <DialogFooter className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
                <Button type="button" variant="outline" onClick={() => setSelectedTenant(null)} className="rounded-xl text-xs">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Save Subscription
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
