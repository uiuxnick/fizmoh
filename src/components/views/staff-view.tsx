"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { UserCog, Plus, Mail, Phone, Shield, CheckCircle, X, Edit, Loader2, Trash2 } from "lucide-react"
import { timeAgo } from "@/lib/helpers"

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700 border-purple-200",
  OPS_ADMIN: "bg-emerald-100 text-emerald-700 border-emerald-200",
  FINANCE: "bg-amber-100 text-amber-700 border-amber-200",
  CHAT_AGENT: "bg-teal-100 text-teal-700 border-teal-200",
  MARKETING: "bg-rose-100 text-rose-700 border-rose-200",
  GUIDE: "bg-stone-100 text-stone-700 border-stone-200",
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  OPS_ADMIN: "Ops / Booking Admin",
  FINANCE: "Finance Verifier",
  CHAT_AGENT: "Chat Agent",
  MARKETING: "Marketing Manager",
  GUIDE: "Tour Guide",
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ["Full system access"],
  OPS_ADMIN: ["Tours & Slots", "Orders", "Customers (read)"],
  FINANCE: ["Payments", "Orders (read)", "Reports (payments)"],
  CHAT_AGENT: ["WhatsApp Inbox", "Orders (read)", "Customers (read)"],
  MARKETING: ["Templates", "Campaigns", "Segments", "Subscribers"],
  GUIDE: ["Schedule (read)", "Check-in"],
}

interface Staff {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  isActive: boolean
  _count: { ordersVerified: number; conversationsOwned: number; orders: number }
  createdAt: string
}

export default function StaffView() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [invitations, setInvitations] = useState<{
    id: string; email: string; name: string | null; role: string; expiresAt: string
  }[]>([])
  const [resetting, setResetting] = useState<Staff | null>(null)
  const [editingRole, setEditingRole] = useState<Staff | null>(null)
  const [removing, setRemoving] = useState<Staff | null>(null)

  const loadInvitations = useCallback(async () => {
    const response = await fetch("/api/staff/invitations")
    if (!response.ok) return
    const data = await response.json()
    setInvitations(data.invitations ?? [])
  }, [])

  useEffect(() => { loadInvitations() }, [loadInvitations])

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/staff")
      const data = await res.json()
      setStaff(data.staff || [])
    } catch { toast.error("Failed to load staff") }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-none space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-teal-50 flex items-center justify-center">
              <UserCog className="h-5 w-5 text-teal-600" />
            </div>
            Staff &amp; Roles
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">Team members with role-based access control</p>
        </div>
        <div className="flex gap-2">
          {/* Inviting is the first option because it is the right one: the
              other path means typing somebody else's password and then having
              to tell it to them. */}
          <Button onClick={() => setInviting(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-1.5" /> Invite someone
          </Button>
          <Button variant="outline" onClick={() => setShowNew(true)}>
            Add directly
          </Button>
        </div>
      </div>

      {invitations.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Waiting to accept ({invitations.length})
          </p>
          <div className="mt-2 space-y-1.5">
            {invitations.map(invitation => (
              <div key={invitation.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-amber-900 truncate">
                  {invitation.email}
                  <span className="text-amber-700/70 text-xs ml-2">
                    {ROLE_LABELS[invitation.role] ?? invitation.role}
                  </span>
                </span>
                <button
                  onClick={async () => {
                    await fetch(`/api/staff/invitations/${invitation.id}`, { method: "DELETE" })
                    loadInvitations()
                    toast.success("Invitation withdrawn")
                  }}
                  className="text-xs text-amber-800 hover:text-amber-950 shrink-0"
                >
                  Withdraw
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(ROLE_LABELS).map(([role, label]) => (
          <Badge key={role} variant="outline" className={ROLE_COLORS[role]}>{label}</Badge>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {staff.map(s => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14 border-2 border-white shadow-sm">
                    <AvatarFallback className={`bg-gradient-to-br ${s.role === "SUPER_ADMIN" ? "from-purple-500 to-purple-700" : s.role === "FINANCE" ? "from-amber-500 to-amber-700" : s.role === "GUIDE" ? "from-stone-500 to-stone-700" : "from-emerald-500 to-teal-600"} text-white font-semibold`}>
                      {s.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-stone-900 truncate">{s.name}</h3>
                      {s.isActive ? (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Active</span>
                      ) : (
                        <span className="text-[10px] font-medium text-stone-400">Inactive</span>
                      )}
                    </div>
                    <Badge variant="outline" className={ROLE_COLORS[s.role]}>{ROLE_LABELS[s.role]}</Badge>
                    <div className="mt-2 space-y-1 text-xs text-stone-500">
                      <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{s.email}</div>
                      {s.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{s.phone}</div>}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-stone-50">
                    <div className="text-lg font-bold text-stone-900">{s._count.ordersVerified}</div>
                    <div className="text-[10px] text-stone-500">Verified</div>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-50">
                    <div className="text-lg font-bold text-stone-900">{s._count.conversationsOwned}</div>
                    <div className="text-[10px] text-stone-500">Chats</div>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-50">
                    <div className="text-lg font-bold text-stone-900">{s._count.orders}</div>
                    <div className="text-[10px] text-stone-500">Orders</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-stone-100">
                  <div className="text-[10px] font-semibold uppercase text-stone-400 mb-1.5">Permissions</div>
                  <div className="flex flex-wrap gap-1">
                    {ROLE_PERMISSIONS[s.role]?.map(p => (
                      <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">{p}</span>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex justify-between items-center gap-2 text-[11px] text-stone-400">
                  <span className="truncate">Joined {timeAgo(s.createdAt)}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingRole(s)}>
                      <Shield className="h-3 w-3 mr-1" />Role
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setResetting(s)}>
                      <Edit className="h-3 w-3 mr-1" />Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => setRemoving(s)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />Remove
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {inviting && (
        <InviteDialog
          onClose={() => setInviting(false)}
          onSent={() => { loadInvitations(); setInviting(false) }}
        />
      )}
      {showNew && <NewStaffDialog onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load() }} />}
      {resetting && <SetPasswordDialog member={resetting} onClose={() => setResetting(null)} onDone={() => { setResetting(null); load() }} />}
      {editingRole && <RoleDialog member={editingRole} onClose={() => setEditingRole(null)} onDone={() => { setEditingRole(null); load() }} />}
      {removing && <RemoveDialog member={removing} onClose={() => setRemoving(null)} onDone={() => { setRemoving(null); load() }} />}
    </div>
  )
}

function NewStaffDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState("CHAT_AGENT")
  const [password, setPassword] = useState("")
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!name || !email) { toast.error("Name and email required"); return }
    if (password.length < 10) { toast.error("Set a password of at least 10 characters"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, role, password }),
      })
      if (res.ok) { toast.success("Staff added"); onCreated() }
      else { const e = await res.json(); toast.error(e.error || "Failed") }
    } catch { toast.error("Failed") }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="max-w-md w-full" onClick={e => e.stopPropagation()}>
        <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Add Staff Member</CardTitle></CardHeader>
        <CardContent className="p-6 space-y-4">
          <div><Label className="text-xs">Full Name</Label><Input value={name} onChange={e => setName(e.target.value)} className="mt-1 bg-white" /></div>
          <div><Label className="text-xs">Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 bg-white" /></div>
          <div><Label className="text-xs">Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+968..." className="mt-1 bg-white" /></div>
          <div>
            <Label className="text-xs">Password</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 10 characters" className="mt-1 bg-white" />
            <p className="text-[11px] text-stone-400 mt-1">They sign in at /admin with their email and this password.</p>
          </div>
          <div>
            <Label className="text-xs">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="mt-1 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([r, l]) => <SelectItem key={r} value={r}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-start gap-2">
            <Shield className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs text-emerald-700">
              <div className="font-semibold mb-0.5">Permissions for {ROLE_LABELS[role]}:</div>
              <div>{ROLE_PERMISSIONS[role]?.join(", ")}</div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? "Adding..." : "Add Staff"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


/**
 * Sets a staff member's password.
 *
 * Accounts created before this screen existed were stored with a placeholder
 * that is not a valid bcrypt hash, so those people could never sign in and had
 * no recovery route. This is that route.
 */
function SetPasswordDialog({ member, onClose, onDone }: { member: Staff; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(member.name)
  const [phone, setPhone] = useState(member.phone || "")
  const [role, setRole] = useState(member.role)
  const [isActive, setIsActive] = useState(member.isActive !== false)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    // A blank password means "leave it alone", so an ordinary detail edit does
    // not force the administrator to reset someone's access.
    if (password) {
      if (password.length < 10) { toast.error("Use at least 10 characters"); return }
      if (password !== confirm) { toast.error("The two passwords do not match"); return }
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/staff/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, phone, role, isActive,
          ...(password ? { password } : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error || "Could not save"); return }
      toast.success(password ? `Saved · password set for ${name}` : "Saved")
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <CardHeader className="border-b"><CardTitle className="text-base">Edit staff member</CardTitle></CardHeader>
        <CardContent className="p-5 space-y-3">
          <div className="text-xs text-stone-500">{member.email}</div>
          <div>
            <Label className="text-xs">Name</Label>
            <Input className="mt-1 bg-white" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input className="mt-1 bg-white" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+968..." />
          </div>
          <div>
            <Label className="text-xs">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="mt-1 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([r, l]) => <SelectItem key={r} value={r}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg border">
            <div>
              <div className="text-xs font-medium text-stone-700">Account active</div>
              <div className="text-[11px] text-stone-500">Deactivating blocks sign-in without losing their history</div>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <div className="border-t pt-3">
            <Label className="text-xs">New password</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 bg-white" />
          </div>
          <div>
            <Label className="text-xs">Confirm</Label>
            <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="mt-1 bg-white" />
          </div>
          <p className="text-[11px] text-stone-400">Leave both blank to keep their current password. It is never emailed.</p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


/**
 * Inviting somebody, rather than choosing a password for them.
 *
 * The role is picked here because it is the one decision worth making
 * deliberately: it is far easier to grant the right access now than to
 * remember to take the wrong access away later.
 */
function InviteDialog({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState("CHAT_AGENT")
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState<string | null>(null)

  async function send() {
    setBusy(true)
    try {
      const response = await fetch("/api/staff/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, role }),
      })
      const data = await response.json()
      if (!response.ok) { toast.error(data.error || "Could not send it"); return }
      if (data.added) {
        toast.success("They already had an account, so they were added straight away")
        onSent()
        return
      }
      // Shown as well as emailed, because a mail server that is quietly
      // failing should not mean nobody can be invited.
      setLink(data.link)
      toast.success("Invitation sent")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-stone-900">Invite someone</h3>
        <p className="text-sm text-stone-600 mt-1">
          They choose their own password. Nothing happens until they accept.
        </p>

        {link ? (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-stone-700">
              Emailed to <strong>{email}</strong>. You can also send them this link yourself:
            </p>
            <div className="rounded-lg bg-stone-50 border p-2.5 text-xs break-all font-mono">{link}</div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { navigator.clipboard?.writeText(link); toast.success("Copied") }}
              >
                Copy link
              </Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={onSent}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Their email</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@business.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Their name (optional)</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ahmed" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Role</Label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full h-9 rounded-md border border-stone-200 bg-white px-2 text-sm"
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={busy || !/.+@.+\..+/.test(email)}
                onClick={send}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send invitation"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


/**
 * Change what a colleague is allowed to do.
 *
 * The role is the permission set — the list below each role is not decoration,
 * it is exactly what that person will be able to reach — so it is shown while
 * choosing rather than after saving.
 */
function RoleDialog({ member, onClose, onDone }: { member: Staff; onClose: () => void; onDone: () => void }) {
  const [role, setRole] = useState(member.role)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const save = async () => {
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/staff/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || "Could not change the role"); return }
      onDone()
    } catch {
      setError("Network error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={e => e.stopPropagation()}>
        <CardContent className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-stone-900">Change role</h3>
            <p className="text-sm text-stone-500">{member.name} · {member.email}</p>
          </div>

          <div className="space-y-2">
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <label
                key={key}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                  role === key ? "border-emerald-500 bg-emerald-50/50" : "border-stone-200 hover:border-stone-300"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  className="mt-1"
                  checked={role === key}
                  onChange={() => setRole(key)}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-stone-900">{label}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {(ROLE_PERMISSIONS[key] ?? []).map(p => (
                      <span key={p} className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-600">{p}</span>
                    ))}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving || role === member.role}>
              {saving ? "Saving…" : "Save role"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Remove someone's access.
 *
 * Says plainly what happens, because "delete" would be a lie: the account is
 * deactivated and unlinked from the workspace, and everything they did stays
 * attributed to them. Confirmation requires typing the name — this is not a
 * button to click by accident.
 */
function RemoveDialog({ member, onClose, onDone }: { member: Staff; onClose: () => void; onDone: () => void }) {
  const [typed, setTyped] = useState("")
  const [working, setWorking] = useState(false)
  const [error, setError] = useState("")
  const confirmed = typed.trim().toLowerCase() === member.name.trim().toLowerCase()

  const remove = async () => {
    setWorking(true)
    setError("")
    try {
      const res = await fetch(`/api/staff/${member.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || "Could not remove this person"); return }
      onDone()
    } catch {
      setError("Network error")
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={e => e.stopPropagation()}>
        <CardContent className="space-y-4 p-6">
          <div>
            <h3 className="text-lg font-semibold text-stone-900">Remove {member.name}?</h3>
            <p className="mt-1 text-sm text-stone-500">{member.email}</p>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">
            They lose access immediately and their account is deactivated. Their messages, verified
            payments and audit history stay in place, still attributed to them — nothing is erased.
          </div>

          <div>
            <label className="text-xs font-medium text-stone-600">
              Type <span className="font-semibold text-stone-900">{member.name}</span> to confirm
            </label>
            <input
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={working}>Cancel</Button>
            <Button
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={remove}
              disabled={!confirmed || working}
            >
              {working ? "Removing…" : "Remove access"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
