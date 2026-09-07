"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Loader2, Plus, Save, Trash2, Package, RefreshCw, Eye, EyeOff,
  AlertTriangle, CheckCircle2, Coins,
} from "lucide-react"
import { MODULE_REGISTRY } from "@/lib/module-registry"

/**
 * Plans & Add-ons management panel.
 *
 * Dedicated modal dialogs for Plan and Add-on creation, editing, and deletion.
 * Supports multi-currency specification and direct module/quota tiering.
 */

interface Plan {
  id: string
  name: string
  slug: string
  description?: string | null
  priceMonthly: number
  priceYearly: number
  currency: string
  trialDays: number
  modules: string[] | null
  limits: Record<string, number> | null
  isPublic: boolean
  sortOrder: number
  _count?: { subscriptions: number }
}

interface Addon {
  id: string
  name: string
  slug: string
  description?: string | null
  priceMonthly: number
  priceYearly: number
  currency: string
  isPublic: boolean
  sortOrder?: number
}

const ALL_MODULES = MODULE_REGISTRY.map(m => m.key)
const MODULE_LABELS = Object.fromEntries(MODULE_REGISTRY.map(m => [m.key, m.label]))
const LIMIT_FIELDS = [
  { key: "staff", label: "People" },
  { key: "contacts", label: "Contacts" },
  { key: "messagesPerMonth", label: "Messages / month" },
  { key: "numbers", label: "Numbers" },
]
const CURRENCIES = ["OMR", "USD", "AED", "SAR"]

// Minor units → major display
function Money({ label, minor, onChange }: { label: string; minor: number; onChange: (minor: number) => void }) {
  return (
    <div>
      <p className="text-xs font-medium text-stone-600 mb-1">{label}</p>
      <Input
        type="number"
        step="0.001"
        value={(minor / 1000).toString()}
        onChange={e => onChange(Math.round(Number(e.target.value) * 1000))}
      />
    </div>
  )
}

function Field({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-stone-700">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-stone-500">{hint}</p>}
    </div>
  )
}

export function PlansPanel({ onChanged }: { onChanged?: () => void }) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [addons, setAddons] = useState<Addon[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  // Create Plan dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    description: "",
    priceMonthly: "0",
    priceYearly: "0",
    trialDays: "14",
    currency: "OMR",
  })
  const [creating, setCreating] = useState(false)

  // Delete Plan dialog
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Create Add-on dialog
  const [createAddonOpen, setCreateAddonOpen] = useState(false)
  const [createAddonForm, setCreateAddonForm] = useState({
    name: "",
    slug: "",
    description: "",
    priceMonthly: "0",
    priceYearly: "0",
    currency: "OMR",
  })
  const [creatingAddon, setCreatingAddon] = useState(false)

  // Delete Add-on dialog
  const [deleteAddonTarget, setDeleteAddonTarget] = useState<Addon | null>(null)
  const [deletingAddon, setDeletingAddon] = useState(false)

  async function load() {
    const res = await fetch("/api/platform/plans")
    const data = await res.json()
    setPlans(Array.isArray(data.plans) ? data.plans : [])
    setAddons(Array.isArray(data.addons) ? data.addons : [])
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  function editPlan(id: string, patch: Partial<Plan>) {
    setPlans(curr => curr.map(p => p.id === id ? { ...p, ...patch } : p))
  }

  async function savePlan(plan: Plan) {
    setSaving(plan.id)
    try {
      const res = await fetch(`/api/platform/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: plan.name,
          description: plan.description,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          trialDays: plan.trialDays,
          currency: plan.currency,
          modules: plan.modules ?? [],
          limits: plan.limits ?? {},
          isPublic: plan.isPublic,
          sortOrder: plan.sortOrder,
        }),
      })
      if (!res.ok) { toast.error((await res.json()).error || "Could not save"); return }
      toast.success(`${plan.name} saved`)
      onChanged?.()
    } finally {
      setSaving(null)
    }
  }

  async function saveAddon(addon: Addon) {
    const res = await fetch(`/api/platform/plans/addons/${addon.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: addon.name,
        priceMonthly: addon.priceMonthly,
        priceYearly: addon.priceYearly,
        currency: addon.currency,
        isPublic: addon.isPublic,
      }),
    })
    if (!res.ok) { toast.error((await res.json()).error || "Could not save add-on"); return }
    toast.success(`${addon.name} add-on saved`)
    await load()
  }

  async function createPlan() {
    const name = createForm.name.trim()
    if (!name) { toast.error("Plan name is required"); return }
    setCreating(true)
    try {
      const slug = createForm.slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      const res = await fetch("/api/platform/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          description: createForm.description || null,
          priceMonthly: Math.round(Number(createForm.priceMonthly) * 1000),
          priceYearly: Math.round(Number(createForm.priceYearly) * 1000),
          trialDays: Number(createForm.trialDays) || 14,
          currency: createForm.currency || "OMR",
          modules: ["INBOX"],
        }),
      })
      if (!res.ok) { toast.error((await res.json()).error || "Could not create plan"); return }
      toast.success(`Plan "${name}" created`)
      setCreateOpen(false)
      setCreateForm({ name: "", slug: "", description: "", priceMonthly: "0", priceYearly: "0", trialDays: "14", currency: "OMR" })
      await load()
      onChanged?.()
    } finally {
      setCreating(false)
    }
  }

  async function createAddon() {
    const name = createAddonForm.name.trim()
    if (!name) { toast.error("Add-on name is required"); return }
    setCreatingAddon(true)
    try {
      const slug = createAddonForm.slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      const res = await fetch("/api/platform/plans/addons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          description: createAddonForm.description || null,
          priceMonthly: Math.round(Number(createAddonForm.priceMonthly) * 1000),
          priceYearly: Math.round(Number(createAddonForm.priceYearly) * 1000),
          currency: createAddonForm.currency || "OMR",
        }),
      })
      if (!res.ok) { toast.error((await res.json()).error || "Could not create add-on"); return }
      toast.success(`Add-on "${name}" created`)
      setCreateAddonOpen(false)
      setCreateAddonForm({ name: "", slug: "", description: "", priceMonthly: "0", priceYearly: "0", currency: "OMR" })
      await load()
    } finally {
      setCreatingAddon(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/platform/plans/${deleteTarget.id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.hidden) {
        toast.message(`${deleteTarget.name} has active subscribers — it was hidden from the catalogue instead of deleted.`)
      } else if (data.deleted) {
        toast.success(`${deleteTarget.name} deleted`)
      } else {
        toast.error((data.error) || "Could not remove plan")
      }
      setDeleteTarget(null)
      await load()
      onChanged?.()
    } finally {
      setDeleting(false)
    }
  }

  async function confirmDeleteAddon() {
    if (!deleteAddonTarget) return
    setDeletingAddon(true)
    try {
      const res = await fetch(`/api/platform/plans/addons/${deleteAddonTarget.id}`, { method: "DELETE" })
      if (!res.ok) {
        toast.error("Could not delete add-on")
        return
      }
      toast.success(`${deleteAddonTarget.name} deleted`)
      setDeleteAddonTarget(null)
      await load()
    } finally {
      setDeletingAddon(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-stone-900">Plans & Add-ons</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            {plans.length} plan{plans.length === 1 ? "" : "s"} · {addons.length} add-on{addons.length === 1 ? "" : "s"} · prices entered as major units (OMR)
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => load()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCreateAddonOpen(true)} className="border-stone-300">
            <Plus className="h-3.5 w-3.5 mr-1.5" />New Add-on
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-3.5 w-3.5 mr-1.5" />New Plan
          </Button>
        </div>
      </div>

      {/* Add-ons section */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-semibold text-stone-900 flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-emerald-600" /> Optional Subscription Add-ons
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">Modular extensions for extra message limits, numbers, or advanced features.</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setCreateAddonOpen(true)} className="text-emerald-700 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Add-on
          </Button>
        </div>

        {addons.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-400">
            No add-ons created yet. Click &quot;New Add-on&quot; to configure optional subscription upgrades.
          </div>
        ) : (
          <div className="space-y-3">
            {addons.map(addon => (
              <div key={addon.id} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_140px_100px_auto] items-end border-t border-stone-100 pt-3">
                <div>
                  <p className="text-sm font-bold text-stone-800">{addon.name}</p>
                  <p className="text-[11px] text-stone-400 font-mono">/{addon.slug}</p>
                </div>
                <Money label={`Monthly (${addon.currency})`} minor={addon.priceMonthly} onChange={v => setAddons(curr => curr.map(a => a.id === addon.id ? { ...a, priceMonthly: v } : a))} />
                <Money label={`Yearly (${addon.currency})`} minor={addon.priceYearly} onChange={v => setAddons(curr => curr.map(a => a.id === addon.id ? { ...a, priceYearly: v } : a))} />
                <div>
                  <p className="text-xs font-medium text-stone-600 mb-1">Currency</p>
                  <select
                    value={addon.currency}
                    onChange={e => setAddons(curr => curr.map(a => a.id === addon.id ? { ...a, currency: e.target.value } : a))}
                    className="w-full h-9 rounded-md border border-stone-200 bg-white px-2 text-xs font-semibold"
                  >
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1.5 pb-0.5">
                  <Button size="sm" variant="outline" onClick={() => setDeleteAddonTarget(addon)} className="text-rose-600 hover:text-rose-700 border-rose-200 hover:border-rose-300">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" onClick={() => saveAddon(addon)} className="bg-emerald-600 hover:bg-emerald-700">
                    <Save className="h-3.5 w-3.5 mr-1" />Save
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plans list */}
      {plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <Package className="h-8 w-8 text-stone-300 mx-auto" />
          <p className="text-sm text-stone-500 mt-3">No plans yet. Create the first one.</p>
        </div>
      ) : (
        plans.map(plan => (
          <div key={plan.id} className="rounded-2xl border border-stone-200 bg-white p-5 space-y-4 shadow-2xs">
            {/* Plan header row */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Package className="h-4 w-4 text-emerald-600 shrink-0" />
                <Input
                  value={plan.name}
                  onChange={e => editPlan(plan.id, { name: e.target.value })}
                  className="font-bold max-w-[200px]"
                />
                <span className="text-xs text-stone-400 font-mono">/{plan.slug}</span>
                {!plan.isPublic ? (
                  <Badge className="bg-stone-100 text-stone-600 border-stone-300 text-[10px]">
                    <EyeOff className="h-3 w-3 mr-1" />Hidden / Archived
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                    <Eye className="h-3 w-3 mr-1" />Active on Pricing
                  </Badge>
                )}
                {plan._count && plan._count.subscriptions > 0 && (
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                    <CheckCircle2 className="h-3 w-3 mr-1" />{plan._count.subscriptions} subscriber{plan._count.subscriptions === 1 ? "" : "s"}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer select-none bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-200">
                  <input
                    type="checkbox"
                    checked={plan.isPublic}
                    onChange={e => editPlan(plan.id, { isPublic: e.target.checked })}
                    className="rounded"
                  />
                  {plan.isPublic ? <Eye className="h-3.5 w-3.5 text-emerald-600" /> : <EyeOff className="h-3.5 w-3.5 text-stone-400" />}
                  {plan.isPublic ? "Listed on Pricing" : "Hidden / Archived"}
                </label>
                <Button size="sm" variant="outline" onClick={() => setDeleteTarget(plan)} className="text-rose-600 hover:text-rose-700 border-rose-200 hover:border-rose-300">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" disabled={saving === plan.id} onClick={() => savePlan(plan)} className="bg-emerald-600 hover:bg-emerald-700">
                  {saving === plan.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Save className="h-3.5 w-3.5 mr-1.5" />Save</>}
                </Button>
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-xs font-medium text-stone-600 mb-1">Description (shown on pricing page)</p>
              <Input
                value={plan.description ?? ""}
                onChange={e => editPlan(plan.id, { description: e.target.value })}
                placeholder="One-line description for the pricing page"
              />
            </div>

            {/* Pricing row */}
            <div className="grid gap-3 sm:grid-cols-5">
              <Money label={`Monthly (${plan.currency})`} minor={plan.priceMonthly} onChange={v => editPlan(plan.id, { priceMonthly: v })} />
              <Money label={`Yearly (${plan.currency})`} minor={plan.priceYearly} onChange={v => editPlan(plan.id, { priceYearly: v })} />
              <div>
                <p className="text-xs font-medium text-stone-600 mb-1">Currency</p>
                <select
                  value={plan.currency}
                  onChange={e => editPlan(plan.id, { currency: e.target.value })}
                  className="w-full h-9 rounded-md border border-stone-200 bg-white px-2 text-xs font-semibold"
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs font-medium text-stone-600 mb-1">Trial days</p>
                <Input
                  type="number"
                  value={plan.trialDays}
                  onChange={e => editPlan(plan.id, { trialDays: Number(e.target.value) })}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-stone-600 mb-1">Sort order</p>
                <Input
                  type="number"
                  value={plan.sortOrder}
                  onChange={e => editPlan(plan.id, { sortOrder: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Modules */}
            <div>
              <p className="text-xs font-medium text-stone-600 mb-2">Included modules</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_MODULES.map(module => {
                  const descriptor = MODULE_REGISTRY.find(m => m.key === module)
                  const alwaysIncluded = descriptor?.alwaysIncluded === true
                  const on = alwaysIncluded || (plan.modules ?? []).includes(module)
                  return (
                    <button
                      key={module}
                      type="button"
                      disabled={alwaysIncluded}
                      onClick={() => editPlan(plan.id, {
                        modules: on
                          ? (plan.modules ?? []).filter(m => m !== module)
                          : [...(plan.modules ?? []), module],
                      })}
                      title={alwaysIncluded ? "Included in every plan" : descriptor?.description}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                        on ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                      } ${alwaysIncluded ? "opacity-60 cursor-default" : "cursor-pointer"}`}
                    >
                      {MODULE_LABELS[module] || module}{alwaysIncluded ? " · Core" : ""}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Limits */}
            <div>
              <p className="text-xs font-medium text-stone-600 mb-2">Ceilings — blank means no limit</p>
              <div className="grid gap-3 sm:grid-cols-4">
                {LIMIT_FIELDS.map(field => (
                  <div key={field.key}>
                    <p className="text-[11px] text-stone-500 mb-1">{field.label}</p>
                    <Input
                      type="number"
                      value={plan.limits?.[field.key] ?? ""}
                      onChange={e => editPlan(plan.id, {
                        limits: { ...(plan.limits ?? {}), [field.key]: Number(e.target.value) },
                      })}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))
      )}

      {/* ── Create Plan Modal ── */}
      <Dialog open={createOpen} onOpenChange={v => !v && setCreateOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Plan</DialogTitle>
            <DialogDescription>
              Set the name and initial pricing. You can edit modules and limits after creating it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Plan name" required>
                <Input
                  autoFocus
                  value={createForm.name}
                  onChange={e => setCreateForm(f => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") }))}
                  placeholder="Starter"
                />
              </Field>
              <Field label="URL slug" hint="Auto-filled from name">
                <Input
                  value={createForm.slug}
                  onChange={e => setCreateForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                  placeholder="starter"
                />
              </Field>
            </div>
            <Field label="Description">
              <Input
                value={createForm.description}
                onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                placeholder="One-line description for the pricing page"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Monthly (Major units)">
                <Input type="number" step="0.001" value={createForm.priceMonthly} onChange={e => setCreateForm(f => ({ ...f, priceMonthly: e.target.value }))} />
              </Field>
              <Field label="Yearly (Major units)">
                <Input type="number" step="0.001" value={createForm.priceYearly} onChange={e => setCreateForm(f => ({ ...f, priceYearly: e.target.value }))} />
              </Field>
              <Field label="Currency">
                <select
                  value={createForm.currency}
                  onChange={e => setCreateForm(f => ({ ...f, currency: e.target.value }))}
                  className="w-full h-9 rounded-md border border-stone-200 bg-white px-2 text-xs font-semibold"
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Trial days">
                <Input type="number" value={createForm.trialDays} onChange={e => setCreateForm(f => ({ ...f, trialDays: e.target.value }))} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button disabled={creating} onClick={createPlan} className="bg-emerald-600 hover:bg-emerald-700">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create Plan</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Create Add-on Modal ── */}
      <Dialog open={createAddonOpen} onOpenChange={v => !v && setCreateAddonOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Add-on Package</DialogTitle>
            <DialogDescription>
              Create an optional add-on tier that tenants can add to their subscription.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Add-on Name" required>
                <Input
                  autoFocus
                  value={createAddonForm.name}
                  onChange={e => setCreateAddonForm(f => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") }))}
                  placeholder="Extra 10,000 Messages"
                />
              </Field>
              <Field label="Slug" hint="Auto-filled from name">
                <Input
                  value={createAddonForm.slug}
                  onChange={e => setCreateAddonForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                  placeholder="extra-10k-messages"
                />
              </Field>
            </div>
            <Field label="Description">
              <Input
                value={createAddonForm.description}
                onChange={e => setCreateAddonForm(f => ({ ...f, description: e.target.value }))}
                placeholder="High-volume messaging allowance for busy stores"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Monthly price" hint="Major units">
                <Input type="number" step="0.001" value={createAddonForm.priceMonthly} onChange={e => setCreateAddonForm(f => ({ ...f, priceMonthly: e.target.value }))} />
              </Field>
              <Field label="Yearly price" hint="Major units">
                <Input type="number" step="0.001" value={createAddonForm.priceYearly} onChange={e => setCreateAddonForm(f => ({ ...f, priceYearly: e.target.value }))} />
              </Field>
              <Field label="Currency">
                <select
                  value={createAddonForm.currency}
                  onChange={e => setCreateAddonForm(f => ({ ...f, currency: e.target.value }))}
                  className="w-full h-9 rounded-md border border-stone-200 bg-white px-2 text-xs font-semibold"
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setCreateAddonOpen(false)}>Cancel</Button>
              <Button disabled={creatingAddon} onClick={createAddon} className="bg-emerald-600 hover:bg-emerald-700">
                {creatingAddon ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create Add-on</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Plan Confirm Modal ── */}
      <Dialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
              Remove {deleteTarget?.name}?
            </DialogTitle>
            <DialogDescription>
              {deleteTarget?._count && deleteTarget._count.subscriptions > 0
                ? `${deleteTarget._count.subscriptions} workspace${deleteTarget._count.subscriptions === 1 ? " is" : "s are"} on this plan. It will be hidden from the catalogue rather than deleted — existing subscribers keep their access.`
                : "This plan has no active subscribers. It will be permanently deleted."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              disabled={deleting}
              onClick={confirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                deleteTarget?._count && deleteTarget._count.subscriptions > 0 ? "Hide from catalogue" : "Delete permanently"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Addon Confirm Modal ── */}
      <Dialog open={!!deleteAddonTarget} onOpenChange={v => !v && setDeleteAddonTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
              Delete {deleteAddonTarget?.name}?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this add-on? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteAddonTarget(null)}>Cancel</Button>
            <Button
              disabled={deletingAddon}
              onClick={confirmDeleteAddon}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deletingAddon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Add-on"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
