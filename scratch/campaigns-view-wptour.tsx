"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import {
  Megaphone, Plus, Send, Mail, MessageCircle, Calendar, Users, Eye, TrendingUp, CheckCircle, Clock,
  Sparkles, Copy, Trash2, Smartphone, Search, AlertCircle, FileText, Download, BarChart2, Loader2, X
} from "lucide-react"
import { formatDate } from "@/lib/helpers"

interface Campaign {
  id: string
  name: string
  channel: string
  status: string
  scheduledAt: string | null
  sentAt: string | null
  totalSent: number
  totalDelivered: number
  totalRead: number
  lastError?: string | null
  totalClicked: number
  totalBounced: number
  totalOptOut: number
  subject?: string | null
  customContent?: string | null
  templateId?: string | null
  segmentId?: string | null
  template?: { name: string; bodyContent: string; language?: string; status?: string }
  segment?: { name: string; contactCount: number }
  createdAt: string
}

interface Template {
  id: string
  name: string
  channel: string
  status: string
  bodyContent: string
  language?: string
}

interface Segment {
  id: string
  name: string
  channel: string
  contactCount: number
}

const STATUS_CONFIG: Record<string, { color: string; icon: any }> = {
  DRAFT: { color: "bg-stone-100 text-stone-700 border-stone-300", icon: Clock },
  SCHEDULED: { color: "bg-amber-100 text-amber-800 border-amber-300", icon: Calendar },
  SENDING: { color: "bg-teal-100 text-teal-800 border-teal-300", icon: Send },
  SENT: { color: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: CheckCircle },
  FAILED: { color: "bg-rose-100 text-rose-800 border-rose-300", icon: AlertCircle },
}

export default function CampaignsView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [reviewingCampaign, setReviewingCampaign] = useState<Campaign | null>(null)
  const [expandedAnalyticsId, setExpandedAnalyticsId] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [channelFilter, setChannelFilter] = useState("ALL")

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/campaigns")
      const data = await res.json()
      setCampaigns(data.campaigns || [])
    } catch {
      toast.error("Failed to load campaigns")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const sendCampaign = async (id: string, name: string) => {
    setSendingId(id)
    try {
      const res = await fetch(`/api/campaigns/${id}/send`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Send failed")
      toast.success(
        `Sent ${data.sent}${data.failed ? `, ${data.failed} failed` : ""}${data.skipped ? `, ${data.skipped} skipped` : ""}` +
        (data.remaining ? ` — ${data.remaining} queued for the next run` : "")
      )
      setReviewingCampaign(null)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed")
    } finally {
      setSendingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      toast.success("Campaign deleted")
      load()
    } catch {
      toast.error("Failed to delete campaign")
    }
  }

  const handleDuplicate = async (c: Campaign) => {
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${c.name} (Copy)`,
          channel: c.channel,
          templateId: c.templateId,
          segmentId: c.segmentId,
          subject: c.subject,
          customContent: c.customContent,
        }),
      })
      if (!res.ok) throw new Error("Duplicate failed")
      toast.success("Campaign duplicated as draft")
      load()
    } catch {
      toast.error("Failed to duplicate campaign")
    }
  }

  const handleExportCSV = (c: Campaign) => {
    const csv = [
      "Metric,Value",
      `Campaign Name,"${c.name}"`,
      `Channel,${c.channel}`,
      `Status,${c.status}`,
      `Total Sent,${c.totalSent}`,
      `Total Delivered,${c.totalDelivered}`,
      `Total Read,${c.totalRead}`,
      `Total Clicked,${c.totalClicked}`,
      `Total Opt Out,${c.totalOptOut}`,
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `campaign_${c.name.replace(/\s+/g, "_")}_report.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Exported CSV report")
  }

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter
    const matchesChannel = channelFilter === "ALL" || c.channel === channelFilter
    return matchesSearch && matchesStatus && matchesChannel
  })

  const totalSent = campaigns.reduce((s, c) => s + c.totalSent, 0)
  const totalDelivered = campaigns.reduce((s, c) => s + c.totalDelivered, 0)
  const totalRead = campaigns.reduce((s, c) => s + c.totalRead, 0)
  const totalClicked = campaigns.reduce((s, c) => s + c.totalClicked, 0)

  const deliveryRate = totalSent ? (totalDelivered / totalSent) * 100 : 0
  const openRate = totalDelivered ? (totalRead / totalDelivered) * 100 : 0
  const clickRate = totalRead ? (totalClicked / totalRead) * 100 : 0

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Megaphone className="h-5 w-5 text-emerald-600" />
            </div>
            Campaigns &amp; Broadcast
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">WhatsApp &amp; Email marketing campaigns with dynamic segment targeting</p>
        </div>
        <Button onClick={() => { setEditingCampaign(null); setShowNew(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-1.5" /> New Campaign
        </Button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Sent", value: totalSent.toLocaleString(), icon: Send, color: "text-emerald-600 bg-emerald-50" },
          { label: "Delivery Rate", value: `${deliveryRate.toFixed(1)}%`, icon: CheckCircle, color: "text-teal-600 bg-teal-50" },
          { label: "Open Rate", value: `${openRate.toFixed(1)}%`, icon: Eye, color: "text-amber-600 bg-amber-50" },
          { label: "Click Rate", value: `${clickRate.toFixed(1)}%`, icon: TrendingUp, color: "text-purple-600 bg-purple-50" },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xl font-bold text-stone-900">{s.value}</div>
                  <div className="text-[11px] text-stone-500">{s.label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-stone-200 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-stone-50 border-stone-200"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <div className="flex items-center rounded-lg border border-stone-200 p-0.5 bg-stone-50 text-xs">
            {["ALL", "WHATSAPP", "EMAIL"].map(ch => (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                className={`px-2.5 py-1 rounded-md transition-colors text-[11px] font-medium ${channelFilter === ch ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"}`}
              >
                {ch === "ALL" ? "All Channels" : ch}
              </button>
            ))}
          </div>
          <div className="flex items-center rounded-lg border border-stone-200 p-0.5 bg-stone-50 text-xs">
            {["ALL", "DRAFT", "SCHEDULED", "SENT", "FAILED"].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md transition-colors text-[11px] font-medium ${statusFilter === st ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"}`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Campaign List */}
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : filteredCampaigns.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Megaphone className="h-10 w-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500 text-sm">
              {searchQuery || statusFilter !== "ALL" || channelFilter !== "ALL"
                ? "No campaigns match your filters."
                : "No campaigns yet. Create your first broadcast!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCampaigns.map(c => {
            const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.DRAFT
            const isWA = c.channel === "WHATSAPP"
            const deliveryPct = c.totalSent ? (c.totalDelivered / c.totalSent) * 100 : 0
            const openPct = c.totalDelivered ? (c.totalRead / c.totalDelivered) * 100 : 0
            const isExpanded = expandedAnalyticsId === c.id

            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isWA ? "bg-emerald-50" : "bg-teal-50"}`}>
                        {isWA ? <MessageCircle className="h-5 w-5 text-emerald-600" /> : <Mail className="h-5 w-5 text-teal-600" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-stone-900">{c.name}</h3>
                          <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
                            <cfg.icon className="h-3 w-3 mr-1" />{c.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mt-0.5">
                          <span className="font-medium">{isWA ? "WhatsApp" : "Email"}</span>
                          {c.template && <><span>·</span><span>Template: {c.template.name}</span></>}
                          {c.segment ? (
                            <><span>·</span><span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.segment.name} ({c.segment.contactCount} contacts)</span></>
                          ) : (
                            <><span>·</span><span className="flex items-center gap-1"><Users className="h-3 w-3" />All Opted-In Contacts</span></>
                          )}
                          {c.scheduledAt && <><span>·</span><span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(c.scheduledAt)}</span></>}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {["DRAFT", "SCHEDULED", "SENDING", "FAILED"].includes(c.status) && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                          onClick={() => setReviewingCampaign(c)}
                        >
                          <Send className="h-3.5 w-3.5" />
                          Review &amp; Send
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 gap-1"
                        onClick={() => setExpandedAnalyticsId(isExpanded ? null : c.id)}
                      >
                        <BarChart2 className="h-3.5 w-3.5" />
                        Analytics
                      </Button>

                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Duplicate" onClick={() => handleDuplicate(c)}>
                        <Copy className="h-3.5 w-3.5 text-stone-500" />
                      </Button>

                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700" title="Delete" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {c.lastError && (
                    <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span><strong>Last error:</strong> {c.lastError}</span>
                    </div>
                  )}

                  {c.template ? (
                    <div className="text-xs text-stone-600 line-clamp-2 mb-3 p-2.5 rounded-lg bg-stone-50 border border-stone-100 flex items-start gap-2">
                      <FileText className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" />
                      <span>{c.template.bodyContent}</span>
                    </div>
                  ) : c.customContent ? (
                    <div className="text-xs text-stone-600 line-clamp-2 mb-3 p-2.5 rounded-lg bg-stone-50 border border-stone-100 flex items-start gap-2">
                      <MessageCircle className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" />
                      <span>{c.customContent}</span>
                    </div>
                  ) : null}

                  {c.totalSent > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
                      <div>
                        <div className="flex justify-between text-stone-500 mb-1"><span>Sent</span><span className="font-semibold text-stone-700">{c.totalSent}</span></div>
                        <Progress value={100} className="h-1.5" />
                      </div>
                      <div>
                        <div className="flex justify-between text-stone-500 mb-1"><span>Delivered</span><span className="font-semibold text-emerald-700">{c.totalDelivered} ({deliveryPct.toFixed(0)}%)</span></div>
                        <Progress value={deliveryPct} className="h-1.5" />
                      </div>
                      <div>
                        <div className="flex justify-between text-stone-500 mb-1"><span>Read</span><span className="font-semibold text-teal-700">{c.totalRead} ({openPct.toFixed(0)}%)</span></div>
                        <Progress value={openPct} className="h-1.5" />
                      </div>
                      <div>
                        <div className="flex justify-between text-stone-500 mb-1"><span>Clicked</span><span className="font-semibold text-amber-700">{c.totalClicked}</span></div>
                        <Progress value={c.totalRead ? (c.totalClicked / c.totalRead) * 100 : 0} className="h-1.5" />
                      </div>
                    </div>
                  )}

                  {/* Expanded Analytics Panel */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-stone-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                          <BarChart2 className="h-4 w-4 text-emerald-600" /> Campaign Breakdown & Performance
                        </h4>
                        <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => handleExportCSV(c)}>
                          <Download className="h-3 w-3" /> Export CSV Report
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-lg border bg-stone-50/50 space-y-1">
                          <div className="text-[11px] text-stone-500 font-medium">Delivery Rate</div>
                          <div className="text-lg font-bold text-emerald-700">{deliveryPct.toFixed(1)}%</div>
                          <Progress value={deliveryPct} className="h-1.5" />
                        </div>
                        <div className="p-3 rounded-lg border bg-stone-50/50 space-y-1">
                          <div className="text-[11px] text-stone-500 font-medium">Open Rate</div>
                          <div className="text-lg font-bold text-teal-700">{openPct.toFixed(1)}%</div>
                          <Progress value={openPct} className="h-1.5" />
                        </div>
                        <div className="p-3 rounded-lg border bg-stone-50/50 space-y-1">
                          <div className="text-[11px] text-stone-500 font-medium">Opt-out / Skipped</div>
                          <div className="text-lg font-bold text-stone-700">{c.totalOptOut || 0}</div>
                          <div className="text-[10px] text-stone-400">Automatic Meta compliance</div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* New / Edit Campaign Modal */}
      {showNew && (
        <NewCampaignDialog
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load() }}
        />
      )}

      {/* Review & Send Confirmation Modal */}
      {reviewingCampaign && (
        <ReviewCampaignModal
          campaign={reviewingCampaign}
          onClose={() => setReviewingCampaign(null)}
          onConfirm={() => sendCampaign(reviewingCampaign.id, reviewingCampaign.name)}
          sending={sendingId === reviewingCampaign.id}
        />
      )}
    </div>
  )
}

function ReviewCampaignModal({
  campaign,
  onClose,
  onConfirm,
  sending,
}: {
  campaign: Campaign
  onClose: () => void
  onConfirm: () => void
  sending: boolean
}) {
  const [testPhone, setTestPhone] = useState("")
  const [testSending, setTestSending] = useState(false)

  const handleTestSend = async () => {
    if (!testPhone) { toast.error("Enter a test phone or email"); return }
    setTestSending(true)
    try {
      const bodyText = campaign.customContent || campaign.template?.bodyContent || ""
      const matches = bodyText.match(/\{\{\d+\}\}/g) || []
      const paramCount = matches.length
      let variables: string[] = []
      if (paramCount > 0) {
        variables = ["User"]
        while (variables.length < paramCount) variables.push("")
      }

      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testPhone,
          type: campaign.template ? "template" : "text",
          templateName: campaign.template?.name,
          variables,
          body: campaign.customContent || campaign.template?.bodyContent,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || "Test send failed")
      toast.success(`Test message sent to ${testPhone}`)
    } catch {
      toast.error("Failed to send test message")
    } finally {
      setTestSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="max-w-md w-full" onClick={e => e.stopPropagation()}>
        <CardHeader className="border-b flex flex-row items-center justify-between py-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Send className="h-4 w-4 text-emerald-600" /> Review &amp; Send Campaign
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-5 space-y-4 text-xs">
          <div className="space-y-2 border-b pb-3">
            <div className="flex justify-between">
              <span className="text-stone-500">Campaign Name:</span>
              <span className="font-semibold text-stone-900">{campaign.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Channel:</span>
              <span className="font-semibold text-emerald-700">{campaign.channel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Target Segment:</span>
              <span className="font-semibold text-stone-900">{campaign.segment?.name || "All Opted-In Contacts"}</span>
            </div>
            {campaign.template && (
              <div className="flex justify-between">
                <span className="text-stone-500">Template:</span>
                <span className="font-semibold text-stone-900">{campaign.template.name}</span>
              </div>
            )}
          </div>

          {/* Test Send Box */}
          <div className="p-3 rounded-lg border border-stone-200 bg-stone-50 space-y-2">
            <label className="font-medium text-stone-800 flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5 text-emerald-600" /> Test Send Before Dispatch
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter phone e.g. +96890000000"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                className="h-8 text-xs bg-white"
              />
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleTestSend} disabled={testSending}>
                {testSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                Test
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={onConfirm} disabled={sending} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? "Dispatching..." : "Confirm & Dispatch"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function NewCampaignDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("")
  const [channel, setChannel] = useState("WHATSAPP")
  const [templateId, setTemplateId] = useState("")
  const [segmentId, setSegmentId] = useState("")
  const [subject, setSubject] = useState("")
  const [customContent, setCustomContent] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")

  const [templates, setTemplates] = useState<Template[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [saving, setSaving] = useState(false)

  // AI Copywriter
  const [showAi, setShowAi] = useState(false)
  const [brief, setBrief] = useState("")
  const [tone, setTone] = useState("friendly")
  const [generatingAi, setGeneratingAi] = useState(false)

  useEffect(() => {
    fetch("/api/templates").then(r => r.json()).then(d => {
      const all = d.templates || []
      setTemplates(all.filter((t: any) => t.channel === channel || !t.channel))
    })
    fetch("/api/segments").then(r => r.json()).then(d => setSegments(d.segments || []))
  }, [channel])

  const selectedTemplate = templates.find(t => t.id === templateId)

  const handleGenerateAi = async () => {
    if (!brief) { toast.error("Enter a campaign brief first"); return }
    setGeneratingAi(true)
    try {
      const res = await fetch("/api/ai/copywriter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, tone, cta: "Book now" }),
      })
      const json = await res.json()
      if (json.body) {
        setCustomContent(json.body)
        if (!name) setName(`Promo - ${brief.slice(0, 20)}`)
        toast.success("AI copy generated and applied!")
      } else {
        toast.error(json.error || "Generation failed")
      }
    } catch {
      toast.error("AI copywriter failed")
    } finally {
      setGeneratingAi(false)
    }
  }

  const handleSubmit = async () => {
    if (!name) { toast.error("Campaign name required"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          channel,
          templateId: (templateId && templateId !== "__none") ? templateId : undefined,
          segmentId: (segmentId && segmentId !== "__all") ? segmentId : undefined,
          subject: subject || undefined,
          customContent: customContent || undefined,
          scheduledAt: scheduledAt || undefined,
          status: scheduledAt ? "SCHEDULED" : "DRAFT",
        }),
      })
      if (res.ok) {
        toast.success("Campaign created successfully")
        onCreated()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to create campaign")
      }
    } catch {
      toast.error("Failed to save campaign")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <CardHeader className="border-b flex flex-row items-center justify-between py-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Plus className="h-5 w-5 text-emerald-600" /> New Campaign &amp; Broadcast
          </CardTitle>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowAi(!showAi)}>
            <Sparkles className="h-3.5 w-3.5 text-purple-600" /> AI Copywriter
          </Button>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {/* AI Copywriter Panel */}
          {showAi && (
            <div className="p-3.5 rounded-lg border border-purple-200 bg-purple-50/50 space-y-2 text-xs">
              <div className="font-semibold text-purple-900 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-purple-600" /> AI Copywriter Assistant
              </div>
              <textarea
                placeholder="Describe campaign brief (e.g. 20% off Desert Safari weekend booking)"
                value={brief}
                onChange={e => setBrief(e.target.value)}
                className="w-full h-14 p-2 rounded-md border border-purple-200 bg-white text-xs"
              />
              <div className="flex items-center justify-between">
                <select value={tone} onChange={e => setTone(e.target.value)} className="h-8 rounded border text-xs px-2 bg-white">
                  <option value="friendly">Friendly</option>
                  <option value="urgent">Urgent (FOMO)</option>
                  <option value="professional">Professional</option>
                </select>
                <Button size="sm" onClick={handleGenerateAi} disabled={generatingAi} className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1">
                  {generatingAi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Generate Copy
                </Button>
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold">Campaign Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Summer Desert Safari Promo" className="mt-1 bg-white text-xs" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="mt-1 bg-white text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Target Segment</Label>
              <Select value={segmentId} onValueChange={setSegmentId}>
                <SelectTrigger className="mt-1 bg-white text-xs">
                  <SelectValue placeholder="All Opted-In Contacts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All Opted-In Contacts</SelectItem>
                  {segments.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.contactCount || 0})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span>WhatsApp / Email Template</span>
              <span className="text-[10px] text-stone-400 font-normal">Meta compliance recommended</span>
            </Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="mt-1 bg-white text-xs"><SelectValue placeholder="Select template (or custom message)..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No template (Custom text message)</SelectItem>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.status || "APPROVED"})</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedTemplate && (
              <div className="mt-2 p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 text-xs space-y-2">
                <div className="font-semibold text-emerald-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    Template Preview ({selectedTemplate.name}):
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-white text-emerald-700 border-emerald-300">
                    {selectedTemplate.name.includes("carousel") || selectedTemplate.name === "top_oman_tours_selection" ? "CAROUSEL TEMPLATE" : "STANDARD TEMPLATE"}
                  </Badge>
                </div>
                <p className="text-stone-700 text-xs leading-relaxed">{selectedTemplate.bodyContent}</p>

                {(selectedTemplate.name.includes("carousel") || selectedTemplate.name === "top_oman_tours_selection") && (
                  <div className="pt-2 space-y-1.5 border-t border-emerald-200">
                    <div className="text-[11px] font-semibold text-stone-700 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Carousel Tour Cards (6 Cards):
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                      {[
                        { title: "Wahiba Sands Desert Safari", price: "45 OMR", img: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=300" },
                        { title: "Musandam Dhow Cruise", price: "32.5 OMR", img: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=300" },
                        { title: "Jebel Shams Rim Walk", price: "38 OMR", img: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=300" },
                        { title: "Muscat City Highlights", price: "22 OMR", img: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=300" },
                        { title: "Ras Al Jinz Turtle Watching", price: "28 OMR", img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300" },
                        { title: "Wadi Shab Swimming", price: "35 OMR", img: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=300" },
                      ].map((card, i) => (
                        <div key={i} className="min-w-[140px] max-w-[140px] rounded-lg border bg-white overflow-hidden shadow-sm shrink-0 text-center">
                          <img src={card.img} alt={card.title} className="h-20 w-full object-cover" />
                          <div className="p-2 space-y-1">
                            <div className="font-semibold text-[11px] text-stone-900 line-clamp-1">{card.title}</div>
                            <div className="text-[10px] text-emerald-700 font-bold">{card.price}</div>
                            <div className="py-1 px-2 text-[9px] bg-stone-100 text-stone-600 rounded font-medium border">Book now</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {!selectedTemplate && (
            <div>
              <Label className="text-xs font-semibold">Custom Message Body</Label>
              <textarea
                value={customContent}
                onChange={e => setCustomContent(e.target.value)}
                placeholder="Type your broadcast message text..."
                className="mt-1 w-full h-20 p-2.5 rounded-md border border-stone-200 bg-white text-xs"
              />
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold">Schedule (optional - leave empty for draft)</Label>
            <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="mt-1 bg-white text-xs" />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Creating..." : scheduledAt ? "Schedule Campaign" : "Create Draft"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
