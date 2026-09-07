"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  Loader2, Search, Headphones, AlertTriangle, Send, Plus,
  CheckCircle2, Clock, MessageSquare, Lock, Globe, User, Building2,
  RefreshCw, X, ChevronRight,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"

interface Reply {
  id: string
  ticketId: string
  staffId: string
  staffName?: string
  body: string
  isInternal: boolean
  createdAt: string
}

interface Ticket {
  id: string
  reference: string
  subject: string
  body: string
  tenantId: string | null
  tenantName?: string | null
  priority: string
  status: string
  channel: string
  createdById: string
  creatorName?: string
  assignedStaffId?: string | null
  assigneeName?: string | null
  createdAt: string
  resolvedAt?: string | null
  replies?: Reply[]
}

export function SupportTicketsPanel() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [priorityFilter, setPriorityFilter] = useState("ALL")
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [fetchingDetail, setFetchingDetail] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [isInternalReply, setIsInternalReply] = useState(false)
  const [sendingReply, setSendingReply] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Create ticket dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newSubject, setNewSubject] = useState("")
  const [newBody, setNewBody] = useState("")
  const [newPriority, setNewPriority] = useState("MEDIUM")
  const [newTenantId, setNewTenantId] = useState("")
  const [newChannel, setNewChannel] = useState("PLATFORM")

  const loadTickets = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/platform/support/tickets?page=${page}&limit=50`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      const list = Array.isArray(data.tickets) ? data.tickets : Array.isArray(data) ? data : []
      setTickets(list)
    } catch {
      setTickets([])
      toast.error("Failed to load tickets")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
    fetch("/api/platform/tenants")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.tenants)) setTenants(d.tenants.map((t: any) => ({ id: t.id, name: t.name })))
      })
      .catch(() => {})
  }, [page])

  const openTicketDetail = async (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setFetchingDetail(true)
    try {
      const res = await fetch(`/api/platform/support/tickets/${ticket.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.ticket) {
          setSelectedTicket(data.ticket)
        }
      }
    } catch {
      // Keep selected ticket as fallback
    } finally {
      setFetchingDetail(false)
    }
  }

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return
    setSendingReply(true)
    try {
      const res = await fetch(`/api/platform/support/tickets/${selectedTicket.id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: replyText,
          isInternal: isInternalReply,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(isInternalReply ? "Internal note added" : "Reply sent")
      setReplyText("")
      setIsInternalReply(false)
      await openTicketDetail(selectedTicket)
    } catch {
      toast.error("Could not send reply")
    } finally {
      setSendingReply(false)
    }
  }

  const handleUpdateTicket = async (updates: Partial<Ticket>) => {
    if (!selectedTicket) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/platform/support/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error()
      toast.success("Ticket updated")
      setSelectedTicket(prev => prev ? { ...prev, ...updates } : null)
      await loadTickets()
    } catch {
      toast.error("Failed to update ticket")
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubject.trim() || !newBody.trim()) {
      toast.error("Subject and description are required")
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/platform/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: newSubject,
          body: newBody,
          priority: newPriority,
          tenantId: newTenantId || null,
          channel: newChannel,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success("Ticket created successfully")
      setCreateOpen(false)
      setNewSubject("")
      setNewBody("")
      setNewPriority("MEDIUM")
      setNewTenantId("")
      await loadTickets()
    } catch {
      toast.error("Failed to create ticket")
    } finally {
      setCreating(false)
    }
  }

  const safeTickets = Array.isArray(tickets) ? tickets : []
  const filtered = safeTickets.filter(t => {
    const s = search.toLowerCase()
    const matchesSearch = (t.subject || "").toLowerCase().includes(s) || (t.reference || "").toLowerCase().includes(s)
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter
    const matchesPriority = priorityFilter === "ALL" || t.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })

  const getPriorityBadge = (p: string) => {
    if (p === "LOW") return "bg-slate-100 text-slate-700 border-slate-200"
    if (p === "MEDIUM") return "bg-blue-100 text-blue-800 border-blue-200"
    if (p === "HIGH") return "bg-amber-100 text-amber-800 border-amber-200"
    if (p === "URGENT") return "bg-rose-100 text-rose-800 border-rose-200 font-black"
    return "bg-stone-100 text-stone-700 border-stone-200"
  }

  const getStatusBadge = (s: string) => {
    if (s === "OPEN") return "bg-emerald-100 text-emerald-800"
    if (s === "IN_PROGRESS") return "bg-blue-100 text-blue-800"
    if (s === "WAITING") return "bg-amber-100 text-amber-800"
    if (s === "RESOLVED") return "bg-slate-100 text-slate-700"
    if (s === "CLOSED") return "bg-stone-200 text-stone-600"
    return "bg-stone-100 text-stone-700"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-900">Support Tickets</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage customer support inquiries, assign tickets, and communicate with tenants.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadTickets}
            disabled={loading}
            className="text-xs rounded-xl h-9 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 gap-1.5"
          >
            <Plus className="h-4 w-4" /> Create Ticket
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="text-xs font-bold text-stone-500">Open Tickets</div>
          <div className="text-xl font-black text-emerald-700 mt-1">
            {safeTickets.filter(t => t.status === "OPEN").length}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="text-xs font-bold text-stone-500">In Progress</div>
          <div className="text-xl font-black text-blue-700 mt-1">
            {safeTickets.filter(t => t.status === "IN_PROGRESS").length}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="text-xs font-bold text-stone-500">Waiting for Tenant</div>
          <div className="text-xl font-black text-amber-700 mt-1">
            {safeTickets.filter(t => t.status === "WAITING").length}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="text-xs font-bold text-stone-500">Resolved</div>
          <div className="text-xl font-black text-stone-700 mt-1">
            {safeTickets.filter(t => t.status === "RESOLVED" || t.status === "CLOSED").length}
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {/* Filters */}
        <div className="p-4 bg-stone-50/60 border-b border-stone-200/80 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
            <Input
              placeholder="Search by ticket reference (e.g. FZ-0001) or subject..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs rounded-xl bg-white border-stone-200"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-9 px-3 text-xs font-semibold rounded-xl border border-stone-200 bg-white text-stone-700 w-full sm:w-auto"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING">Waiting</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="h-9 px-3 text-xs font-semibold rounded-xl border border-stone-200 bg-white text-stone-700 w-full sm:w-auto"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>

        {loading && safeTickets.length === 0 ? (
          <div className="py-14 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mx-auto" />
            <p className="text-xs text-stone-500 mt-2 font-medium">Loading tickets...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center space-y-2">
            <div className="h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
              <Headphones className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-stone-700">No support tickets found</p>
            <p className="text-xs text-stone-400">Create a new ticket or adjust search filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Workspace / Tenant</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map(t => (
                  <tr
                    key={t.id}
                    onClick={() => openTicketDetail(t)}
                    className="hover:bg-emerald-50/40 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3.5 font-mono font-bold text-stone-900">{t.reference}</td>
                    <td className="px-4 py-3.5 font-semibold text-stone-800 max-w-xs truncate">{t.subject}</td>
                    <td className="px-4 py-3.5 text-stone-600 font-medium">
                      {t.tenantName || (t.tenantId ? `${t.tenantId.slice(0, 8)}…` : <span className="text-emerald-700 font-bold">Platform Global</span>)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityBadge(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadge(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-stone-500 uppercase font-mono text-[10px]">{t.channel}</td>
                    <td className="px-4 py-3.5 text-stone-500 whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-700 font-bold gap-1">
                        View & Reply <ChevronRight className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket View & Edit Dialog */}
      {selectedTicket && (
        <Dialog open={!!selectedTicket} onOpenChange={open => !open && setSelectedTicket(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-6 bg-white rounded-3xl border-stone-200">
            <DialogHeader className="border-b border-stone-100 pb-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md">
                    {selectedTicket.reference}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityBadge(selectedTicket.priority)}`}>
                    {selectedTicket.priority}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTicket.status}
                    onChange={e => handleUpdateTicket({ status: e.target.value })}
                    disabled={updatingStatus}
                    className="h-8 px-2.5 text-xs font-bold rounded-lg border border-stone-200 bg-white text-stone-800"
                  >
                    <option value="OPEN">Status: OPEN</option>
                    <option value="IN_PROGRESS">Status: IN PROGRESS</option>
                    <option value="WAITING">Status: WAITING</option>
                    <option value="RESOLVED">Status: RESOLVED</option>
                    <option value="CLOSED">Status: CLOSED</option>
                  </select>
                  <select
                    value={selectedTicket.priority}
                    onChange={e => handleUpdateTicket({ priority: e.target.value })}
                    disabled={updatingStatus}
                    className="h-8 px-2.5 text-xs font-bold rounded-lg border border-stone-200 bg-white text-stone-800"
                  >
                    <option value="LOW">Priority: LOW</option>
                    <option value="MEDIUM">Priority: MEDIUM</option>
                    <option value="HIGH">Priority: HIGH</option>
                    <option value="URGENT">Priority: URGENT</option>
                  </select>
                </div>
              </div>
              <DialogTitle className="text-lg font-black text-stone-900">{selectedTicket.subject}</DialogTitle>
              <DialogDescription className="text-xs text-stone-500 flex items-center gap-3 mt-1">
                <span>Workspace: <strong className="text-stone-700">{selectedTicket.tenantName || "Global Platform"}</strong></span>
                <span>Created: {new Date(selectedTicket.createdAt).toLocaleString()}</span>
              </DialogDescription>
            </DialogHeader>

            {/* Conversation Body & Replies */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {/* Original Message */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <div className="flex items-center justify-between text-[11px] text-stone-500 font-bold mb-2">
                  <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Initial Request</span>
                  <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-stone-800 whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.body || "No details provided."}
                </p>
              </div>

              {/* Replies Thread */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider text-[10px]">
                  Communication Thread ({selectedTicket.replies?.length || 0})
                </h4>

                {fetchingDetail ? (
                  <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin text-stone-400 mx-auto" /></div>
                ) : (!selectedTicket.replies || selectedTicket.replies.length === 0) ? (
                  <div className="text-xs text-stone-400 text-center py-4 bg-stone-50/50 rounded-xl border border-stone-100 italic">
                    No replies or notes on this ticket yet.
                  </div>
                ) : (
                  selectedTicket.replies.map(r => (
                    <div
                      key={r.id}
                      className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                        r.isInternal
                          ? "bg-amber-50/80 border-amber-200 text-amber-950"
                          : "bg-white border-stone-200 text-stone-800 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-[10px]">
                        <span className="flex items-center gap-1">
                          {r.isInternal ? <Lock className="h-3 w-3 text-amber-600" /> : <MessageSquare className="h-3 w-3 text-emerald-600" />}
                          {r.staffName || "Staff Member"}
                          {r.isInternal && <span className="text-amber-700 font-black ml-1">[INTERNAL NOTE]</span>}
                        </span>
                        <span className="text-stone-400 font-normal">{new Date(r.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed text-xs">{r.body}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Reply Input Box */}
            <div className="border-t border-stone-100 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-stone-700">Add Reply or Internal Note</label>
                <label className="flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternalReply}
                    onChange={e => setIsInternalReply(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                  />
                  <span className="text-[11px] font-semibold text-amber-800">Internal operator note (hidden from tenant)</span>
                </label>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={isInternalReply ? "Write an internal note..." : "Write a response to the tenant..."}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendReply() } }}
                  className="flex-1 text-xs rounded-xl h-9"
                />
                <Button
                  size="sm"
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyText.trim()}
                  className={`rounded-xl text-white text-xs font-bold gap-1.5 h-9 ${
                    isInternalReply ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {sendingReply ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {isInternalReply ? "Save Note" : "Send Reply"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Ticket Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg p-6 bg-white rounded-3xl border-stone-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-stone-900">Create Support Ticket</DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Open a new support ticket for a tenant workspace or internal platform issue.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTicket} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Subject</label>
              <Input
                placeholder="e.g. WhatsApp Template Verification Issue"
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                required
                className="text-xs rounded-xl h-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Workspace</label>
                <select
                  value={newTenantId}
                  onChange={e => setNewTenantId(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-medium rounded-xl border border-stone-200 bg-white text-stone-800"
                >
                  <option value="">Global Platform (No Tenant)</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-medium rounded-xl border border-stone-200 bg-white text-stone-800"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Description / Problem Details</label>
              <textarea
                placeholder="Describe the issue in detail..."
                rows={4}
                value={newBody}
                onChange={e => setNewBody(e.target.value)}
                required
                className="w-full p-3 text-xs rounded-xl border border-stone-200 bg-white text-stone-800 focus:outline-emerald-500"
              />
            </div>
            <DialogFooter className="pt-2 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
              >
                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Create Ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
