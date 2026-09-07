"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Loader2, Building2, PauseCircle, PlayCircle, CalendarPlus, Plus,
  Trash2, Save, LogIn, Store, Pencil, KeyRound, Search, Filter,
  AlertTriangle, ShieldAlert, CheckCircle2, Ban, RefreshCw, ExternalLink,
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"

export interface TenantRow {
  id: string
  slug: string
  name: string
  status: string
  suspendedReason: string | null
  trialEndsAt: string | null
  createdAt: string
  members: number
  plan: string | null
  subscriptionStatus: string
  currentPeriodEnd: string | null
  customers: number
  orders: number
  messages: number
  timezone?: string
  currency?: string
  locale?: string
  logoUrl?: string | null
  businessName?: string
  businessPhone?: string
  businessEmail?: string
  businessAddress?: string
  businessWebsite?: string
  businessAbout?: string
}

export interface PlanOption {
  id: string
  name: string
  slug: string
  priceMonthly: number
  currency: string
  trialDays: number
  modules: string[] | null
}

function label(status: string): string {
  return { TRIALING: "Trial", ACTIVE: "Active", PAST_DUE: "Payment due", CANCELLED: "Cancelled", BANNED: "Banned", NONE: "No plan" }[status] ?? status
}

function tone(tenantStatus: string, subscription: string): string {
  if (tenantStatus === "BANNED") return "bg-red-950 text-red-200 border-red-800"
  if (tenantStatus === "SUSPENDED") return "bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-300"
  if (subscription === "ACTIVE") return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-300"
  if (subscription === "TRIALING") return "bg-sky-100 text-sky-700 hover:bg-sky-100 border-sky-300"
  if (subscription === "PAST_DUE") return "bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-300"
  return "bg-stone-100 text-stone-600 hover:bg-stone-100 border-stone-200"
}

function derive(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40)
}

function Field({
  label, hint, required, children,
}: {
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

export function TenantsPanel({
  rows,
  plans,
  busy,
  onRefresh,
  onAction,
  onOpenAs,
}: {
  rows: TenantRow[]
  plans: PlanOption[]
  busy: string | null
  onRefresh: () => void
  onAction: (id: string, body: Record<string, unknown>) => Promise<void>
  onOpenAs: (row: TenantRow, reason: string) => Promise<void>
}) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<TenantRow | null>(null)
  const [entering, setEntering] = useState<TenantRow | null>(null)
  
  // Custom dialogs for Delete, Ban, Suspend
  const [deleteTarget, setDeleteTarget] = useState<TenantRow | null>(null)
  const [banTarget, setBanTarget] = useState<TenantRow | null>(null)
  const [banReason, setBanReason] = useState("")
  const [suspendTarget, setSuspendTarget] = useState<TenantRow | null>(null)
  const [suspendReason, setSuspendReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  const filtered = rows.filter(r => {
    const matchesSearch = !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.slug.toLowerCase().includes(search.toLowerCase()) ||
      (r.businessEmail && r.businessEmail.toLowerCase().includes(search.toLowerCase()))
    
    if (!matchesSearch) return false
    if (statusFilter === "ACTIVE") return r.status === "ACTIVE"
    if (statusFilter === "SUSPENDED") return r.status === "SUSPENDED"
    if (statusFilter === "BANNED") return r.status === "BANNED"
    if (statusFilter === "TRIAL") return r.subscriptionStatus === "TRIALING"
    return true
  })

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/platform/tenants/${deleteTarget.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete workspace")
      toast.success(`Workspace "${deleteTarget.name}" deleted permanently`)
      setDeleteTarget(null)
      onRefresh()
    } catch (e: any) {
      toast.error(e.message || "Failed to delete")
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmBan = async () => {
    if (!banTarget) return
    setActionLoading(true)
    try {
      await onAction(banTarget.id, {
        action: "ban",
        reason: banReason.trim() || "Violated platform Terms of Service",
      })
      toast.success(`Workspace "${banTarget.name}" banned`)
      setBanTarget(null)
      setBanReason("")
      onRefresh()
    } catch (e: any) {
      toast.error(e.message || "Failed to ban")
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmSuspend = async () => {
    if (!suspendTarget) return
    setActionLoading(true)
    try {
      await onAction(suspendTarget.id, {
        action: "suspend",
        reason: suspendReason.trim() || "Suspended by platform administrator",
      })
      toast.success(`Workspace "${suspendTarget.name}" suspended`)
      setSuspendTarget(null)
      setSuspendReason("")
      onRefresh()
    } catch (e: any) {
      toast.error(e.message || "Failed to suspend")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by business name, slug, or email..."
              className="pl-9 text-xs bg-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs border border-stone-200 rounded-lg px-2.5 py-2 bg-white font-medium text-stone-700"
          >
            <option value="ALL">All Statuses ({rows.length})</option>
            <option value="ACTIVE">Active Workspaces</option>
            <option value="TRIAL">Trial Period</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="BANNED">Banned</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onRefresh} className="text-xs">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setCreating(true)} className="bg-emerald-600 hover:bg-emerald-700 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> New Workspace
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-2xs">
        <table className="w-full text-xs min-w-[980px]">
          <thead className="bg-stone-50/80 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="text-left px-4 py-3.5">Business & Slug</th>
              <th className="text-left px-4 py-3.5">Assigned Plan</th>
              <th className="text-left px-4 py-3.5">State & Period</th>
              <th className="text-center px-3 py-3.5">Staff</th>
              <th className="text-center px-3 py-3.5">Contacts</th>
              <th className="text-center px-3 py-3.5">Orders</th>
              <th className="text-center px-3 py-3.5">Messages</th>
              <th className="text-right px-4 py-3.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-stone-500">
                  <Building2 className="h-8 w-8 text-stone-300 mx-auto mb-2" />
                  No workspaces match the current search / filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map(row => (
                <tr key={row.id} className="hover:bg-stone-50/60 transition-colors">
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-stone-900 text-sm">{row.name}</p>
                    <p className="text-[11px] font-mono text-stone-400">{row.slug}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <select
                      value={plans.find(p => p.name === row.plan)?.id ?? ""}
                      onChange={e => onAction(row.id, { action: "plan", planId: e.target.value })}
                      className="text-xs border border-stone-200 rounded-lg px-2 py-1 bg-white font-medium text-stone-800"
                    >
                      <option value="">No Plan</option>
                      {plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge className={`${tone(row.status, row.subscriptionStatus)} text-[10px] font-bold`}>
                      {row.status === "BANNED" ? "Banned" : row.status === "SUSPENDED" ? "Suspended" : label(row.subscriptionStatus)}
                    </Badge>
                    {row.currentPeriodEnd && (
                      <p className="text-[10px] text-stone-400 mt-1">
                        renews {new Date(row.currentPeriodEnd).toLocaleDateString()}
                      </p>
                    )}
                    {row.suspendedReason && (
                      <p className="text-[10px] text-rose-600 mt-0.5 truncate max-w-[150px]" title={row.suspendedReason}>
                        {row.suspendedReason}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3.5 text-center font-semibold text-stone-700">{row.members}</td>
                  <td className="px-3 py-3.5 text-center font-semibold text-stone-700">{row.customers}</td>
                  <td className="px-3 py-3.5 text-center font-semibold text-stone-700">{row.orders}</td>
                  <td className="px-3 py-3.5 text-center font-semibold text-stone-700">{row.messages.toLocaleString()}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1.5 justify-end flex-wrap items-center">
                      <a href={`/${row.slug}`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0" title="Open public storefront">
                          <Store className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                      <Button
                        size="sm" variant="outline" disabled={busy === row.id}
                        className="h-7 w-7 p-0"
                        title="Edit Workspace Configuration"
                        onClick={() => setEditing(row)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm" disabled={busy === row.id}
                        className="bg-stone-900 hover:bg-stone-800 h-7 text-xs px-2.5"
                        title="Impersonate and open workspace console (Audited)"
                        onClick={() => setEntering(row)}
                      >
                        <LogIn className="h-3 w-3 mr-1" /> Log in as
                      </Button>
                      <Button
                        size="sm" variant="outline" disabled={busy === row.id}
                        className="h-7 w-7 p-0"
                        onClick={() => onAction(row.id, { action: "extend_trial", days: 14 })}
                        title="Extend Trial by +14 Days"
                      >
                        <CalendarPlus className="h-3.5 w-3.5" />
                      </Button>
                      
                      {row.status === "SUSPENDED" || row.status === "BANNED" ? (
                        <Button
                          size="sm" disabled={busy === row.id}
                          className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs px-2"
                          onClick={() => onAction(row.id, { action: "resume" })}
                          title="Restore and Activate Workspace"
                        >
                          <PlayCircle className="h-3 w-3 mr-1" /> Resume
                        </Button>
                      ) : (
                        <Button
                          size="sm" variant="outline" disabled={busy === row.id}
                          className="h-7 text-xs px-2 text-amber-700 hover:bg-amber-50"
                          onClick={() => setSuspendTarget(row)}
                          title="Suspend workspace access temporarily"
                        >
                          <PauseCircle className="h-3 w-3 mr-1" /> Suspend
                        </Button>
                      )}

                      {row.status !== "BANNED" && (
                        <Button
                          size="sm" variant="outline" disabled={busy === row.id}
                          className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 border-red-200"
                          onClick={() => setBanTarget(row)}
                          title="Permanent Ban"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      <Button
                        size="sm" variant="outline" disabled={busy === row.id}
                        className="h-7 w-7 p-0 text-stone-400 hover:text-rose-600 hover:border-rose-300"
                        onClick={() => setDeleteTarget(row)}
                        title="Delete Workspace permanently"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Enter Workspace Dialog ── */}
      {entering && (
        <EnterWorkspaceDialog
          tenant={entering}
          busy={busy === entering.id}
          onClose={() => setEntering(null)}
          onConfirm={reason => onOpenAs(entering, reason)}
        />
      )}

      {/* ── Edit Workspace Dialog ── */}
      {editing && (
        <EditTenantDialog
          tenant={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onRefresh() }}
        />
      )}

      {/* ── New Workspace Dialog ── */}
      <NewTenantDialog
        open={creating}
        plans={plans}
        onClose={() => setCreating(false)}
        onCreated={onRefresh}
      />

      {/* ── Suspend Confirmation Modal ── */}
      <Dialog open={!!suspendTarget} onOpenChange={v => !v && setSuspendTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-800">
              <PauseCircle className="h-5 w-5" />
              Suspend Workspace: {suspendTarget?.name}
            </DialogTitle>
            <DialogDescription>
              Suspending locks the workspace into read-only mode for its staff. Data is preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Field label="Suspension Reason" hint="Shown in the platform audit log and tenant header">
              <Input
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                placeholder="e.g. Overdue payment invoice, investigation"
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSuspendTarget(null)}>Cancel</Button>
              <Button disabled={actionLoading} onClick={handleConfirmSuspend} className="bg-amber-700 hover:bg-amber-800 text-white">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Suspension"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Ban Confirmation Modal ── */}
      <Dialog open={!!banTarget} onOpenChange={v => !v && setBanTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <ShieldAlert className="h-5 w-5" />
              Permanently Ban: {banTarget?.name}
            </DialogTitle>
            <DialogDescription>
              Banning terminates all staff access and blocks inbound/outbound messaging.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Field label="Reason for Permanent Ban" required>
              <Input
                value={banReason}
                onChange={e => setBanReason(e.target.value)}
                placeholder="e.g. WhatsApp spam abuse, chargeback fraud"
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setBanTarget(null)}>Cancel</Button>
              <Button disabled={actionLoading || !banReason.trim()} onClick={handleConfirmBan} className="bg-red-700 hover:bg-red-800 text-white">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ban Workspace"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Modal ── */}
      <Dialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
              Delete {deleteTarget?.name}?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete workspace <strong>{deleteTarget?.slug}</strong>?
              All conversations, templates, products, and bookings for this workspace will be deleted or unlinked.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              disabled={actionLoading}
              onClick={handleConfirmDelete}
              className="bg-rose-700 hover:bg-rose-800 text-white"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EnterWorkspaceDialog({
  tenant, busy, onClose, onConfirm,
}: {
  tenant: TenantRow
  busy: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState("Support assistance")

  return (
    <Dialog open onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log in as {tenant.name}</DialogTitle>
          <DialogDescription>
            You will see their inbox, customers, and bookings as their administrator.
            This session is logged in the platform and tenant audit log.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <Field label="Reason for access" hint="Recorded in the audit log beside your operator ID">
            <Input
              autoFocus
              value={reason}
              onChange={e => setReason(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && reason.trim()) onConfirm(reason.trim()) }}
              placeholder="e.g. Investigating webhook delivery failure"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className="bg-stone-900 hover:bg-stone-800"
              disabled={busy || !reason.trim()}
              onClick={() => onConfirm(reason.trim())}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <LogIn className="h-3.5 w-3.5 mr-1.5" />}
              Launch Workspace
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EditTenantDialog({
  tenant, onClose, onSaved,
}: {
  tenant: TenantRow
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: tenant.name,
    slug: tenant.slug,
    currency: tenant.currency ?? "OMR",
    timezone: tenant.timezone ?? "Asia/Muscat",
    logoUrl: tenant.logoUrl ?? "",
    businessName: tenant.businessName ?? "",
    businessPhone: tenant.businessPhone ?? "",
    businessEmail: tenant.businessEmail ?? "",
    businessAddress: tenant.businessAddress ?? "",
    businessWebsite: tenant.businessWebsite ?? "",
    businessAbout: tenant.businessAbout ?? "",
  })
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [passBusy, setPassBusy] = useState(false)

  const set = (patch: Partial<typeof form>) => setForm(current => ({ ...current, ...patch }))

  async function save() {
    setBusy(true)
    try {
      const response = await fetch(`/api/platform/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", ...form }),
      })
      const data = await response.json()
      if (!response.ok) { toast.error(data.error || "Could not save"); return }
      toast.success("Workspace settings updated")
      onSaved()
    } finally {
      setBusy(false)
    }
  }

  async function resetOwnerPassword() {
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return }
    setPassBusy(true)
    try {
      const response = await fetch(`/api/platform/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "owner_password", password }),
      })
      const data = await response.json()
      if (!response.ok) { toast.error(data.error || "Could not reset password"); return }
      setPassword("")
      toast.success("Owner password reset successfully")
    } finally {
      setPassBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure {tenant.name}</DialogTitle>
          <DialogDescription>
            {tenant.customers} contacts · {tenant.orders} orders · {tenant.messages} WhatsApp messages
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Workspace Settings</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Business name">
                <Input value={form.name} onChange={e => set({ name: e.target.value })} />
              </Field>
              <Field
                label="Shop slug / URL address"
                hint="Changing this breaks links already sent to customers."
              >
                <Input
                  value={form.slug}
                  onChange={e => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                />
              </Field>
              <Field label="Currency">
                <Input value={form.currency} onChange={e => set({ currency: e.target.value })} />
              </Field>
              <Field label="Timezone">
                <Input value={form.timezone} onChange={e => set({ timezone: e.target.value })} />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Customer-Facing Details
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Trading name">
                <Input value={form.businessName} onChange={e => set({ businessName: e.target.value })} />
              </Field>
              <Field label="Support phone">
                <Input value={form.businessPhone} onChange={e => set({ businessPhone: e.target.value })} />
              </Field>
              <Field label="Support email">
                <Input value={form.businessEmail} onChange={e => set({ businessEmail: e.target.value })} />
              </Field>
              <Field label="Website">
                <Input value={form.businessWebsite} onChange={e => set({ businessWebsite: e.target.value })} />
              </Field>
              <Field label="Address">
                <Input value={form.businessAddress} onChange={e => set({ businessAddress: e.target.value })} />
              </Field>
              <Field label="Logo URL">
                <Input value={form.logoUrl} onChange={e => set({ logoUrl: e.target.value })} />
              </Field>
            </div>
            <Field label="Business Bio & AI Prompt Context" hint="Context the AI assistant uses to answer customer inquiries.">
              <textarea
                value={form.businessAbout}
                onChange={e => set({ businessAbout: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </Field>
          </section>

          <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5" /> Emergency Password Reset for Workspace Owner
            </p>
            <p className="text-[11px] text-amber-800/90">
              Sets a new password directly for the primary administrator account.
            </p>
            <div className="flex gap-2 pt-1">
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="New password (min. 8 characters)"
                className="bg-white text-xs"
              />
              <Button variant="outline" disabled={passBusy} onClick={resetOwnerPassword} className="shrink-0 text-xs">
                {passBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Set Password"}
              </Button>
            </div>
          </section>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-xs">
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Save Workspace
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function NewTenantDialog({
  open, plans, onClose, onCreated,
}: {
  open: boolean
  plans: PlanOption[]
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({
    name: "", slug: "", ownerName: "", ownerEmail: "", ownerPhone: "",
    password: "", planId: "", address: "", website: "", about: "",
  })
  const [busy, setBusy] = useState(false)
  const [availability, setAvailability] = useState<{ available: boolean } | null>(null)

  const set = (patch: Partial<typeof form>) => setForm(current => ({ ...current, ...patch }))

  useEffect(() => {
    if (!open) return
    setForm(current =>
      current.slug && current.slug !== derive(current.name)
        ? current
        : { ...current, slug: derive(current.name) },
    )
  }, [form.name, open])

  useEffect(() => {
    if (form.slug.length < 2) { setAvailability(null); return }
    const timer = setTimeout(() => {
      fetch(`/api/signup/availability?slug=${encodeURIComponent(form.slug)}`)
        .then(r => r.json()).then(setAvailability).catch(() => setAvailability(null))
    }, 300)
    return () => clearTimeout(timer)
  }, [form.slug])

  async function submit() {
    if (!form.name || !form.ownerEmail || form.password.length < 8) {
      toast.error("Business name, owner email and a password of at least 8 characters are required.")
      return
    }
    setBusy(true)
    try {
      const response = await fetch("/api/platform/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) { toast.error(data.error || "Could not create workspace"); return }
      toast.success(`Workspace "${data.tenant.name}" created!`)
      setForm({
        name: "", slug: "", ownerName: "", ownerEmail: "", ownerPhone: "",
        password: "", planId: "", address: "", website: "", about: "",
      })
      onCreated()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
          <DialogDescription>
            Creates the tenant business account, primary administrator login, and trial subscription.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Business Details</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Business Name" required>
                <Input value={form.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. Muscat Grand Tours" />
              </Field>
              <Field
                label="Workspace Slug / URL"
                hint={form.slug ? `app.fizmoh.cloud/${form.slug}` : "Auto-generated from name"}
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={form.slug}
                    onChange={e => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                    placeholder="muscat-grand-tours"
                  />
                  {form.slug.length >= 2 && availability && (
                    <span className={`text-[11px] font-semibold shrink-0 ${availability.available ? "text-emerald-600" : "text-rose-600"}`}>
                      {availability.available ? "Available" : "Taken"}
                    </span>
                  )}
                </div>
              </Field>
              <Field label="Address">
                <Input value={form.address} onChange={e => set({ address: e.target.value })} placeholder="Muscat, Oman" />
              </Field>
              <Field label="Website">
                <Input value={form.website} onChange={e => set({ website: e.target.value })} placeholder="https://..." />
              </Field>
            </div>
            <Field
              label="Business Summary / AI Context"
              hint="Initial prompt context for WhatsApp bot inquiries"
            >
              <textarea
                value={form.about}
                onChange={e => set({ about: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-xs"
                placeholder="What they offer, key services, operating hours..."
              />
            </Field>
          </section>

          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Primary Administrator</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Admin Name">
                <Input value={form.ownerName} onChange={e => set({ ownerName: e.target.value })} placeholder="Admin Name" />
              </Field>
              <Field label="Admin Email" required>
                <Input type="email" value={form.ownerEmail} onChange={e => set({ ownerEmail: e.target.value })} placeholder="admin@example.com" />
              </Field>
              <Field label="WhatsApp Phone Number" hint="With international country code">
                <Input value={form.ownerPhone} onChange={e => set({ ownerPhone: e.target.value })} placeholder="+968 9000 0000" />
              </Field>
              <Field label="Initial Password" required hint="Must be at least 8 characters">
                <Input type="password" value={form.password} onChange={e => set({ password: e.target.value })} placeholder="••••••••" />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Select Initial Plan</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {plans.map(plan => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => set({ planId: plan.id })}
                  className={`text-left rounded-xl border p-3 transition ${
                    form.planId === plan.id
                      ? "border-emerald-500 ring-1 ring-emerald-200 bg-emerald-50/50"
                      : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <p className="font-semibold text-xs text-stone-900">{plan.name}</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    {plan.priceMonthly > 0 ? `${(plan.priceMonthly / 1000).toFixed(3)} ${plan.currency}/mo` : "Free"}
                  </p>
                  <p className="text-[10px] text-stone-400 mt-1">
                    {(plan.modules ?? []).length} modules · {plan.trialDays}-day trial
                  </p>
                </button>
              ))}
            </div>
          </section>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-xs">
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Create Workspace
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
