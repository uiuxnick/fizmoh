"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Loader2, Shield, Search, Activity, Users, Building2,
  Download, RefreshCw, Eye, Calendar, Filter, Terminal,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"

interface AuditEvent {
  id: string
  tenantId: string | null
  tenantName?: string | null
  actorStaffId: string | null
  actorName: string | null
  action: string
  entity: string
  entityId: string
  reason: string | null
  metadata?: any
  createdAt: string
}

export function AuditLogPanel() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState("ALL")
  const [entityFilter, setEntityFilter] = useState("ALL")
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null)
  const limit = 50

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set("search", search)
      if (actionFilter !== "ALL") params.set("action", actionFilter)
      if (entityFilter !== "ALL") params.set("entity", entityFilter)

      const r = await fetch(`/api/platform/audit?${params}`)
      if (!r.ok) throw new Error()
      const data = await r.json()
      const list = Array.isArray(data.events) ? data.events : Array.isArray(data.data) ? data.data : []
      setEvents(list)
      setTotal(data.total || list.length || 0)
    } catch {
      toast.error("Could not load audit log")
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [page, actionFilter, entityFilter])

  const exportCSV = () => {
    if (events.length === 0) {
      toast.error("No data to export")
      return
    }
    const headers = ["ID", "Timestamp", "Actor", "Action", "Entity", "EntityID", "Tenant", "Reason"]
    const rows = events.map(e => [
      e.id,
      new Date(e.createdAt).toISOString(),
      e.actorName || e.actorStaffId || "System",
      e.action,
      e.entity,
      e.entityId,
      e.tenantId || "PLATFORM",
      `"${(e.reason || "").replace(/"/g, '""')}"`,
    ])
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `fizmoh_audit_log_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Audit log exported as CSV")
  }

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-900">Audit & Governance Trail</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Immutable platform-wide audit log tracking administrative access, tenant modifications, and security actions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={exportCSV}
            className="text-xs rounded-xl h-9 gap-1.5 font-semibold"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={load}
            disabled={loading}
            className="text-xs rounded-xl h-9 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl bg-white border border-stone-200 shadow-2xs overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 bg-stone-50/60 border-b border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
            <Input
              placeholder="Search actor, action, reason, or entity..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  setPage(1)
                  load()
                }
              }}
              className="pl-8 h-9 text-xs rounded-xl bg-white border-stone-200"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={actionFilter}
              onChange={e => {
                setActionFilter(e.target.value)
                setPage(1)
              }}
              className="h-9 px-3 text-xs font-semibold rounded-xl border border-stone-200 bg-white text-stone-700"
            >
              <option value="ALL">All Actions</option>
              <option value="IMPERSONATE">Impersonation</option>
              <option value="UPDATE_PLAN">Plan Updates</option>
              <option value="SUSPEND">Suspension</option>
              <option value="RESUME">Reactivation</option>
              <option value="BACKUP_TRIGGER">Backups</option>
              <option value="ANNOUNCEMENT">Announcements</option>
              <option value="TICKET_REPLY">Support Replies</option>
            </select>

            <select
              value={entityFilter}
              onChange={e => {
                setEntityFilter(e.target.value)
                setPage(1)
              }}
              className="h-9 px-3 text-xs font-semibold rounded-xl border border-stone-200 bg-white text-stone-700"
            >
              <option value="ALL">All Entities</option>
              <option value="TENANT">Tenant Workspace</option>
              <option value="STAFF">Staff Account</option>
              <option value="INVOICE">Invoice</option>
              <option value="ANNOUNCEMENT">Announcement</option>
              <option value="SUPPORT_TICKET">Support Ticket</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading && events.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Shield className="h-10 w-10 text-stone-300 mx-auto" />
            <p className="text-sm font-bold text-stone-700">No audit events match your criteria</p>
            <p className="text-xs text-stone-400">Try clearing filters or search terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor / Admin</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity & ID</th>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">Justification / Reason</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {events.map(ev => (
                  <tr key={ev.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="px-4 py-3.5 text-stone-500 whitespace-nowrap">
                      <div className="font-mono text-[11px]">
                        {new Date(ev.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono">
                        {new Date(ev.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-6 w-6 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-bold text-[10px]">
                          {(ev.actorName || ev.actorStaffId || "S").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-stone-800 block">
                            {ev.actorName || "Global Platform Root"}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {ev.actorStaffId ? `ID: ${ev.actorStaffId.slice(0, 8)}` : "System"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        <Activity className="h-3 w-3 text-slate-500" /> {ev.action}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-stone-700">
                      <span className="font-bold text-stone-900">{ev.entity}</span>
                      <div className="text-[10px] text-stone-400 font-mono">{ev.entityId}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      {ev.tenantId ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                          <Building2 className="h-3 w-3 text-stone-400" /> {ev.tenantName || ev.tenantId.slice(0, 10)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          GLOBAL PLATFORM
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-stone-600 max-w-xs truncate">
                      {ev.reason || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedEvent(ev)}
                        className="h-7 text-xs rounded-lg text-stone-600 hover:text-stone-900 font-semibold gap-1"
                      >
                        <Eye className="h-3 w-3" /> Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-stone-200 bg-stone-50/50">
            <span className="text-xs text-stone-500 font-medium">
              Showing page <strong className="text-stone-800">{page}</strong> of <strong className="text-stone-800">{totalPages}</strong> ({total} total records)
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 text-xs font-bold rounded-xl"
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-8 text-xs font-bold rounded-xl"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Modal Dialog */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={open => !open && setSelectedEvent(null)}>
          <DialogContent className="sm:max-w-lg p-6 bg-white rounded-3xl border-stone-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-stone-900 flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-600" />
                Audit Record Details
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-500">
                Event ID: <code className="font-mono text-[11px] text-stone-700">{selectedEvent.id}</code>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200">
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase">Action</span>
                  <p className="font-bold text-stone-900">{selectedEvent.action}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase">Timestamp</span>
                  <p className="font-mono text-stone-700">{new Date(selectedEvent.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase">Actor</span>
                  <p className="font-semibold text-stone-800">{selectedEvent.actorName || "System"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase">Target Scope</span>
                  <p className="font-semibold text-stone-800">{selectedEvent.tenantId || "GLOBAL PLATFORM"}</p>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-stone-700 block mb-1">Target Entity Reference</span>
                <div className="p-2.5 rounded-xl bg-stone-100 font-mono text-[11px] text-stone-800">
                  {selectedEvent.entity} → {selectedEvent.entityId}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-stone-700 block mb-1">Logged Reason / Description</span>
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 whitespace-pre-wrap">
                  {selectedEvent.reason || "No explicit reason was attached to this action."}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 flex justify-end border-t border-stone-100">
              <Button onClick={() => setSelectedEvent(null)} className="rounded-xl text-xs bg-stone-900 text-white">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
