"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Loader2, Users, Video, MessageSquare, Clock, Search, Eye, Trash2,
  Calendar, ExternalLink, Copy, Check, RefreshCw,
} from "lucide-react"

export interface PlatformLead {
  id: string
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  answers: {
    name?: string
    email?: string
    phone?: string
    company?: string
    industry?: string
    inquiryType?: string
    demoDate?: string
    demoTime?: string
    googleMeetUrl?: string
    message?: string
    notes?: string
    source?: "WEBSITE_DEMO" | "CONTACT_FORM" | string
    submittedAt?: string
  }
}

/**
 * Dedicated Inbound Leads & Demo Bookings Panel for Platform Super Admins.
 * Allows filtering, inspecting, joining Google Meet calls, changing lead status, and deletions.
 */
export function PlatformLeadsPanel() {
  const [leads, setLeads] = useState<PlatformLead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<"ALL" | "WEBSITE_DEMO" | "CONTACT_FORM">("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [selectedLead, setSelectedLead] = useState<PlatformLead | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const loadLeads = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/platform/leads")
      if (!res.ok) throw new Error("Failed to fetch leads")
      const data = await res.json()
      setLeads(data.leads || [])
    } catch {
      toast.error("Could not load website leads")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeads()
  }, [])

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/platform/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      setLeads(prev => prev.map(l => (l.id === id ? { ...l, status } : l)))
      if (selectedLead && selectedLead.id === id) {
        setSelectedLead(prev => (prev ? { ...prev, status } : null))
      }
      toast.success("Lead status updated")
    } catch {
      toast.error("Failed to update status")
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/platform/leads/${deleteTarget}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setLeads(prev => prev.filter(l => l.id !== deleteTarget))
      if (selectedLead?.id === deleteTarget) setSelectedLead(null)
      toast.success("Lead deleted")
      setDeleteTarget(null)
    } catch {
      toast.error("Failed to delete lead")
    }
  }

  const copyMeetUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    toast.success("Google Meet link copied!")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filtered = leads.filter(l => {
    const s = l.answers || {}
    const matchesSearch =
      (s.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.phone || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.company || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.industry || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.notes || "").toLowerCase().includes(search.toLowerCase())

    const matchesType =
      typeFilter === "ALL" ||
      (typeFilter === "WEBSITE_DEMO" && s.source === "WEBSITE_DEMO") ||
      (typeFilter === "CONTACT_FORM" && s.source === "CONTACT_FORM")

    const matchesStatus = statusFilter === "ALL" || l.status === statusFilter

    return matchesSearch && matchesType && matchesStatus
  })

  const totalDemos = leads.filter(l => l.answers?.source === "WEBSITE_DEMO").length
  const totalContacts = leads.filter(l => l.answers?.source === "CONTACT_FORM").length
  const pendingActions = leads.filter(l => l.status === "SCHEDULED" || l.status === "NEW").length

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-xs font-bold text-stone-500">Total Inbound Submissions</span>
            <Users className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-900">{leads.length}</div>
          <div className="text-[10px] font-semibold text-stone-500 mt-0.5">Direct from marketing website</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-xs font-bold text-stone-500">Google Meet Demos</span>
            <Video className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-900">{totalDemos}</div>
          <div className="text-[10px] font-semibold text-purple-700 mt-0.5">1-on-1 Video Walkthroughs</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-xs font-bold text-stone-500">Contact Inquiries</span>
            <MessageSquare className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-900">{totalContacts}</div>
          <div className="text-[10px] font-semibold text-blue-700 mt-0.5">General &amp; Enterprise inquiries</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-xs font-bold text-stone-500">Action Required</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-900">{pendingActions}</div>
          <div className="text-[10px] font-semibold text-amber-700 mt-0.5">New / Scheduled leads</div>
        </div>
      </div>

      {/* Main Table & Filter Controls */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {/* Header Bar */}
        <div className="p-5 border-b border-stone-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-stone-900">Website Demos &amp; Inbound Inquiries</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Real-time Google Meet bookings and contact requests received via app.fizmoh.cloud
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={loadLeads}
              disabled={loading}
              className="text-xs rounded-xl border-stone-300 gap-1.5"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Refresh
            </Button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 bg-stone-50/60 border-b border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
            <Input
              placeholder="Search leads, name, email, company..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs rounded-xl bg-white border-stone-200"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 text-xs">
              <button
                onClick={() => setTypeFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  typeFilter === "ALL" ? "bg-emerald-600 text-white" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                All Types
              </button>
              <button
                onClick={() => setTypeFilter("WEBSITE_DEMO")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                  typeFilter === "WEBSITE_DEMO" ? "bg-purple-600 text-white" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Video className="h-3 w-3" /> Demos
              </button>
              <button
                onClick={() => setTypeFilter("CONTACT_FORM")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                  typeFilter === "CONTACT_FORM" ? "bg-blue-600 text-white" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <MessageSquare className="h-3 w-3" /> Inquiries
              </button>
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-9 px-3 text-xs font-semibold rounded-xl border border-stone-200 bg-white text-stone-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="COMPLETED">Completed</option>
              <option value="LOST">Lost</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        {loading && leads.length === 0 ? (
          <div className="py-14 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mx-auto" />
            <p className="text-xs text-stone-500 mt-2 font-medium">Loading inbound leads...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center space-y-2">
            <div className="h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
              <Users className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-stone-700">No leads match the current filters</p>
            <p className="text-xs text-stone-400">Try adjusting your search query or status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Lead Type</th>
                  <th className="px-4 py-3">Contact &amp; Business</th>
                  <th className="px-4 py-3">Details / Schedule</th>
                  <th className="px-4 py-3">Google Meet Room</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map(lead => {
                  const a = lead.answers || {}
                  const isDemo = a.source === "WEBSITE_DEMO"

                  return (
                    <tr key={lead.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        {isDemo ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <Video className="h-3 w-3" /> Meet Demo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <MessageSquare className="h-3 w-3" /> Contact Form
                          </span>
                        )}
                        <div className="text-[10px] text-stone-400 mt-1">
                          {new Date(lead.createdAt).toLocaleDateString()} {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        <div className="font-bold text-stone-900">{a.name || "Unknown"}</div>
                        <div className="text-stone-500 text-[11px] mt-0.5">{a.email}</div>
                        <div className="text-stone-600 font-mono text-[11px] mt-0.5">{a.phone}</div>
                        {a.company && (
                          <div className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md inline-block mt-1 border border-emerald-200">
                            {a.company}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 align-top max-w-[220px]">
                        {isDemo ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-[11px] font-bold text-stone-800">
                              <Calendar className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                              <span>{a.demoDate || "Date TBD"}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-stone-500 font-medium">
                              <Clock className="h-3 w-3 text-stone-400 shrink-0" />
                              <span>{a.demoTime || "Time TBD"}</span>
                            </div>
                            {a.industry && (
                              <div className="text-[10px] text-stone-500 italic">
                                Focus: {a.industry}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-[11px] font-semibold text-stone-800">
                              {a.inquiryType || "General Inquiry"}
                            </div>
                            <p className="text-[11px] text-stone-500 line-clamp-2">
                              {a.message || "No message content"}
                            </p>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        {a.googleMeetUrl ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <a
                                href={a.googleMeetUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition shadow-2xs"
                              >
                                <ExternalLink className="h-3 w-3" /> Join Meet
                              </a>
                              <button
                                type="button"
                                onClick={() => copyMeetUrl(lead.id, a.googleMeetUrl!)}
                                className="p-1 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600"
                                title="Copy Google Meet Link"
                              >
                                {copiedId === lead.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                            <div className="font-mono text-[9px] text-stone-400 truncate max-w-[130px]">
                              {a.googleMeetUrl.replace("https://", "")}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-stone-400 italic">N/A</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          lead.status === "SCHEDULED" ? "bg-purple-100 text-purple-800 border border-purple-200" :
                          lead.status === "NEW" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                          lead.status === "CONTACTED" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                          lead.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                          lead.status === "LOST" ? "bg-rose-100 text-rose-800 border border-rose-200" :
                          "bg-stone-100 text-stone-700 border border-stone-200"
                        }`}>
                          {lead.status}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 align-top text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedLead(lead)}
                          className="p-1.5 rounded-lg text-stone-700 bg-stone-100 hover:bg-stone-200 transition"
                          title="View Full Lead Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(lead.id)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                          title="Delete Lead"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Lead Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-700">Delete Inbound Lead Record?</DialogTitle>
            <DialogDescription>
              This lead record and all associated submission data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700 text-white">
              Delete Lead
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <Dialog open={!!selectedLead} onOpenChange={open => !open && setSelectedLead(null)}>
          <DialogContent className="sm:max-w-[540px] p-6 bg-white rounded-3xl border-stone-200">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                {selectedLead.answers?.source === "WEBSITE_DEMO" ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                    <Video className="h-3 w-3" /> Google Meet Demo
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Contact Us Inquiry
                  </span>
                )}
                <span className="text-[10px] text-stone-400">
                  ID: {selectedLead.id.slice(-8)}
                </span>
              </div>
              <DialogTitle className="text-xl font-bold text-stone-900">
                {selectedLead.answers?.name || "Lead Details"}
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-500">
                Received on {new Date(selectedLead.createdAt).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-stone-400">Email Address</span>
                    <p className="font-semibold text-stone-900">{selectedLead.answers?.email || "—"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-stone-400">Phone / WhatsApp</span>
                    <p className="font-semibold text-stone-900">{selectedLead.answers?.phone || "—"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200/60">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-stone-400">Company Name</span>
                    <p className="font-semibold text-stone-900">{selectedLead.answers?.company || "—"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-stone-400">Industry / Topic</span>
                    <p className="font-semibold text-stone-900">
                      {selectedLead.answers?.industry || selectedLead.answers?.inquiryType || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {selectedLead.answers?.googleMeetUrl && (
                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-950 flex items-center gap-1.5">
                      <Video className="h-4 w-4 text-purple-700" /> Google Meet Video Session
                    </span>
                    <span className="text-[11px] font-bold text-purple-800">
                      {selectedLead.answers?.demoDate} @ {selectedLead.answers?.demoTime}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-purple-200 font-mono text-[11px] select-all truncate text-purple-900">
                    {selectedLead.answers.googleMeetUrl}
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={selectedLead.answers.googleMeetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1"
                    >
                      <Button size="sm" className="w-full bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl gap-1">
                        <ExternalLink className="h-3.5 w-3.5" /> Join Room
                      </Button>
                    </a>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyMeetUrl(selectedLead.id, selectedLead.answers.googleMeetUrl!)}
                      className="text-xs font-bold rounded-xl border-purple-300"
                    >
                      {copiedId === selectedLead.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedId === selectedLead.id ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>
              )}

              {(selectedLead.answers?.message || selectedLead.answers?.notes) && (
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-stone-400">
                    Message / Special Requirements
                  </span>
                  <p className="text-stone-800 whitespace-pre-wrap leading-relaxed">
                    {selectedLead.answers?.message || selectedLead.answers?.notes}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="font-bold text-stone-700">Lead Status:</span>
                <select
                  value={selectedLead.status}
                  onChange={e => handleStatusChange(selectedLead.id, e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white font-bold text-xs"
                >
                  <option value="NEW">NEW</option>
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="CONTACTED">CONTACTED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="LOST">LOST</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
