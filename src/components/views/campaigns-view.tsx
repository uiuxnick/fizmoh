"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import {
  Megaphone, Plus, Send, Mail, Calendar, Users, Eye, TrendingUp,
  CheckCircle, Clock, PauseCircle, PlayCircle, XCircle, AlertTriangle,
  ListChecks, FlaskConical, Download, Facebook, Instagram, X, Sparkles,
  Smartphone, ShieldCheck, Check, Upload, ArrowRight, MessageCircle,
  ExternalLink, Zap, Phone, Video, MoreVertical, Search, CheckCheck, Loader2,
  Lock, ArrowUpRight
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { formatDate } from "@/lib/helpers"
import { WhatsAppPreview, type PreviewButton } from "@/components/whatsapp-preview"
import { CarouselPreview } from "@/components/views/carousel-editor"
import { parseCards } from "@/lib/carousel"
import { useApp } from "@/lib/store"
import { AutomationRulesTab } from "@/components/views/social-channels-view"
import { cn } from "@/lib/utils"

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
  totalFailed?: number
  pausedAt?: string | null
  ratePerSecond?: number
  template?: { name: string; bodyContent: string }
  segment?: { name: string; contactCount: number }
  createdAt: string
}

const STATUS_CONFIG: Record<string, { color: string; icon: any }> = {
  DRAFT: { color: "bg-stone-100 text-stone-600", icon: Clock },
  SCHEDULED: { color: "bg-amber-100 text-amber-700", icon: Calendar },
  SENDING: { color: "bg-teal-100 text-teal-700", icon: Send },
  SENT: { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  FAILED: { color: "bg-rose-100 text-rose-700", icon: AlertTriangle },
  PAUSED: { color: "bg-amber-100 text-amber-800", icon: PauseCircle },
  CANCELLED: { color: "bg-stone-200 text-stone-700", icon: XCircle },
}

export default function CampaignsView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  const [sendingId, setSendingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [reportFor, setReportFor] = useState<Campaign | null>(null)
  const [testFor, setTestFor] = useState<Campaign | null>(null)

  /// Pause, resume, cancel and retry all go through one endpoint, so the
  /// screen cannot get out of step with what the sender is actually doing.
  const control = async (id: string, action: string, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/campaigns/${id}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "That did not work")
      if (action === "cancel") toast.success(`Stopped. ${data.stopped ?? 0} were not sent.`)
      else if (action === "pause") toast.success("Paused. Nothing more goes out until you resume.")
      else if (action === "retry_failed") toast.success(`Retrying ${data.retried ?? 0}.`)
      else toast.success(`${data.sent ?? 0} sent.`)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That did not work")
    } finally {
      setBusyId(null)
    }
  }

  const sendCampaign = async (id: string, name: string) => {
    if (!confirm(`Send "${name}" now? This messages every opted-in contact in the segment and cannot be undone.`)) return
    setSendingId(id)
    try {
      const res = await fetch(`/api/campaigns/${id}/send`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Send failed")
      toast.success(
        `Sent ${data.sent}${data.failed ? `, ${data.failed} failed` : ""}${data.skipped ? `, ${data.skipped} skipped` : ""}` +
        (data.remaining ? ` — ${data.remaining} queued for the next run` : ""),
      )
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed")
    } finally {
      setSendingId(null)
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/campaigns")
      const data = await res.json()
      setCampaigns(data.campaigns || [])
    } catch { toast.error("Failed to load campaigns") }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const totalSent = campaigns.reduce((s, c) => s + c.totalSent, 0)
  const totalDelivered = campaigns.reduce((s, c) => s + c.totalDelivered, 0)
  const totalRead = campaigns.reduce((s, c) => s + c.totalRead, 0)
  const totalClicked = campaigns.reduce((s, c) => s + c.totalClicked, 0)
  const deliveryRate = totalSent ? (totalDelivered / totalSent) * 100 : 0
  const openRate = totalDelivered ? (totalRead / totalDelivered) * 100 : 0
  const clickRate = totalRead ? (totalClicked / totalRead) * 100 : 0
  const { campaignChannelFilter, setCampaignChannelFilter } = useApp()

  const filteredCampaigns = campaigns.filter(c => {
    if (campaignChannelFilter === "ALL" || campaignChannelFilter === "COMMENT_TO_DM") return true
    return c.channel === campaignChannelFilter
  })

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-none space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <Megaphone className="h-5 w-5 text-amber-600" />
            </div>
            Campaigns &amp; Broadcast
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">Multi-channel broadcasting across WhatsApp, Instagram, Facebook &amp; Email</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowNew(true)}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" /> New Campaign
          </Button>
        </div>
      </div>

      {/* Channel Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-stone-100 rounded-2xl border border-stone-200/80">
        {[
          { id: "ALL" as const, label: "All Campaigns", icon: Megaphone, count: campaigns.length },
          { id: "WHATSAPP" as const, label: "WhatsApp Broadcast", icon: WhatsAppIcon, accent: "text-[#25D366]", count: campaigns.filter(c => c.channel === "WHATSAPP").length },
          { id: "INSTAGRAM" as const, label: "Instagram Direct", icon: Instagram, accent: "text-[#E1306C]", count: campaigns.filter(c => c.channel === "INSTAGRAM").length },
          { id: "FACEBOOK" as const, label: "Facebook Messenger", icon: Facebook, accent: "text-[#1877F2]", count: campaigns.filter(c => c.channel === "FACEBOOK").length },
          { id: "COMMENT_TO_DM" as const, label: "Viral Comment-to-DM", icon: MessageCircle, accent: "text-purple-500", badge: "VIRAL" },
          { id: "EMAIL" as const, label: "Email Campaigns", icon: Mail, accent: "text-teal-600", count: campaigns.filter(c => c.channel === "EMAIL").length },
        ].map(tab => {
          const active = campaignChannelFilter === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCampaignChannelFilter(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-2xs",
                active
                  ? "bg-white text-stone-900 shadow-xs border border-stone-200/90 font-bold"
                  : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
              )}
            >
              <Icon className={cn("h-4 w-4", tab.accent || (active ? "text-emerald-600" : "text-stone-400"))} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 tracking-wider">
                  {tab.badge}
                </span>
              )}
              {tab.count !== undefined && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-mono",
                  active ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-600"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {campaignChannelFilter === "COMMENT_TO_DM" ? (
        <div className="space-y-4">
          <Card className="border-purple-200 bg-gradient-to-r from-purple-50 via-indigo-50/40 to-pink-50/50 p-5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-600/20">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-purple-950">Viral Comment-to-DM Automation</h3>
                  <Badge className="bg-purple-600 text-white text-[10px] font-bold">VIRAL REELS &amp; POSTS</Badge>
                </div>
                <p className="text-xs text-purple-900 leading-relaxed max-w-3xl">
                  Automatically convert Instagram Reels &amp; Facebook post comments into private DM leads and bookings. When someone comments a keyword like <strong>“PRICE”</strong>, <strong>“DISCOUNT”</strong>, or <strong>“BOOK”</strong>, our bot instantly sends them a personalized DM containing your link or booking catalog, while posting a public reply to trigger Instagram &amp; Facebook algorithmic boosts.
                </p>
              </div>
            </div>
          </Card>
          <AutomationRulesTab defaultRuleType="COMMENT_TO_DM" defaultChannel="INSTAGRAM" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Sent", value: totalSent, icon: Send, color: "text-emerald-600 bg-emerald-50" },
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

          {/* Campaigns list */}
          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
          ) : filteredCampaigns.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
                  <Megaphone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-800 text-sm">No campaigns found</h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {campaignChannelFilter !== "ALL"
                      ? `No ${campaignChannelFilter.toLowerCase()} campaigns match your selection.`
                      : "Create your first broadcast to engage your audience!"}
                  </p>
                </div>
                <Button
                  onClick={() => setShowNew(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-xs mt-2"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {campaignChannelFilter !== "ALL"
                    ? `Create ${campaignChannelFilter === "WHATSAPP" ? "WhatsApp" : campaignChannelFilter === "INSTAGRAM" ? "Instagram Direct" : campaignChannelFilter === "FACEBOOK" ? "Facebook Messenger" : "Email"} Campaign`
                    : "Create Campaign"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredCampaigns.map(c => {
                const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.DRAFT
                const isWA = c.channel === "WHATSAPP"
                const isFB = c.channel === "FACEBOOK"
                const isIG = c.channel === "INSTAGRAM"
                const deliveryPct = c.totalSent ? (c.totalDelivered / c.totalSent) * 100 : 0
                const openPct = c.totalDelivered ? (c.totalRead / c.totalDelivered) * 100 : 0
                return (
                  <Card key={c.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                            isWA ? "bg-emerald-50 text-emerald-600" :
                            isFB ? "bg-blue-50 text-blue-600" :
                            isIG ? "bg-pink-50 text-pink-600" :
                            "bg-teal-50 text-teal-600"
                          }`}>
                            {isWA ? <WhatsAppIcon className="h-5 w-5" /> :
                             isFB ? <Facebook className="h-5 w-5" /> :
                             isIG ? <Instagram className="h-5 w-5" /> :
                             <Mail className="h-5 w-5" />}
                          </div>
                          <div>
                            <h3 className="font-semibold text-stone-900">{c.name}</h3>
                            <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                              <span>{isWA ? "WhatsApp" : isFB ? "Facebook Messenger" : isIG ? "Instagram Direct" : "Email"}</span>
                              {c.template && <><span>·</span><span>{c.template.name}</span></>}
                              {c.segment && <><span>·</span><span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.segment.contactCount} contacts</span></>}
                              {c.scheduledAt && <><span>·</span><span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(c.scheduledAt)}</span></>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={cfg.color}><cfg.icon className="h-3 w-3 mr-1" />{c.status}</Badge>
                          {/* One test message, before it goes to everybody. */}
                          {["DRAFT", "SCHEDULED", "FAILED", "CANCELLED"].includes(c.status) && (
                            <Button size="sm" variant="outline" onClick={() => setTestFor(c)}>
                              <FlaskConical className="h-3.5 w-3.5 mr-1" /> Test
                            </Button>
                          )}
                          {c.totalSent + (c.totalFailed ?? 0) > 0 && (
                            <Button size="sm" variant="outline" onClick={() => setReportFor(c)}>
                              <ListChecks className="h-3.5 w-3.5 mr-1" /> Report
                            </Button>
                          )}
                          {(c.totalFailed ?? 0) > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === c.id}
                              onClick={() => control(c.id, "retry_failed")}
                            >
                              Retry {c.totalFailed}
                            </Button>
                          )}
                          {c.status === "SENDING" && !c.pausedAt && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === c.id}
                              onClick={() => control(c.id, "pause")}
                            >
                              <PauseCircle className="h-3.5 w-3.5 mr-1" /> Pause
                            </Button>
                          )}
                          {["SENDING", "PAUSED"].includes(c.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-rose-600 border-rose-200 hover:bg-rose-50"
                              disabled={busyId === c.id}
                              onClick={() =>
                                control(
                                  c.id,
                                  "cancel",
                                  `Stop "${c.name}"? Anyone not yet messaged will not be. What has already gone cannot be recalled.`,
                                )
                              }
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Stop
                            </Button>
                          )}
                          {["DRAFT", "SCHEDULED", "SENDING", "PAUSED", "FAILED"].includes(c.status) && (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              disabled={sendingId === c.id || busyId === c.id}
                              onClick={() =>
                                c.pausedAt || c.status === "PAUSED"
                                  ? control(c.id, "resume")
                                  : sendCampaign(c.id, c.name)
                              }
                            >
                              {c.pausedAt || c.status === "PAUSED" ? (
                                <><PlayCircle className="h-3.5 w-3.5 mr-1" /> Resume</>
                              ) : (
                                <><Send className="h-3.5 w-3.5 mr-1" /> {sendingId === c.id ? "Sending…" : c.status === "SENDING" ? "Continue" : "Send now"}</>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      {c.lastError && (
                        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-[11px] text-red-700">
                          Last error: {c.lastError}
                        </div>
                      )}

                      {c.template && (
                        <p className="text-xs text-stone-600 line-clamp-2 mb-3 p-2.5 rounded-lg bg-stone-50">{c.template.bodyContent}</p>
                      )}

                      {c.totalSent > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <div className="flex justify-between text-stone-500 mb-1"><span>Sent</span><span className="font-semibold text-stone-700">{c.totalSent}</span></div>
                            <Progress value={100} className="h-1.5" />
                          </div>
                          <div>
                            <div className="flex justify-between text-stone-500 mb-1"><span>Delivered</span><span className="font-semibold text-emerald-700">{c.totalDelivered}</span></div>
                            <Progress value={deliveryPct} className="h-1.5" />
                          </div>
                          <div>
                            <div className="flex justify-between text-stone-500 mb-1"><span>Read</span><span className="font-semibold text-teal-700">{c.totalRead}</span></div>
                            <Progress value={openPct} className="h-1.5" />
                          </div>
                          <div>
                            <div className="flex justify-between text-stone-500 mb-1"><span>Clicked</span><span className="font-semibold text-amber-700">{c.totalClicked}</span></div>
                            <Progress value={c.totalRead ? (c.totalClicked / c.totalRead) * 100 : 0} className="h-1.5" />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {showNew && (
        <NewCampaignDialog
          initialChannel={campaignChannelFilter !== "ALL" && campaignChannelFilter !== "COMMENT_TO_DM" ? campaignChannelFilter : "WHATSAPP"}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load() }}
        />
      )}
      {testFor && <TestSendDialog campaign={testFor} onClose={() => setTestFor(null)} />}
      {reportFor && <RecipientReport campaign={reportFor} onClose={() => setReportFor(null)} />}
    </div>
  )
}

const CHANNELS = [
  {
    id: "WHATSAPP",
    name: "WhatsApp",
    badge: "98% Open Rate",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    desc: "Cloud API · HSM & Media",
    icon: WhatsAppIcon,
    accent: "text-[#25D366]",
    activeBorder: "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/25 shadow-emerald-500/10",
  },
  {
    id: "INSTAGRAM",
    name: "Instagram Direct",
    badge: "24h Window",
    badgeColor: "bg-pink-100 text-pink-800 border-pink-200",
    desc: "Direct DM · Story & Reels",
    icon: Instagram,
    accent: "text-[#E1306C]",
    activeBorder: "border-pink-500 bg-pink-50/50 ring-2 ring-pink-500/25 shadow-pink-500/10",
  },
  {
    id: "FACEBOOK",
    name: "Facebook Messenger",
    badge: "24h Window",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    desc: "Page Broadcast · Live Chat",
    icon: Facebook,
    accent: "text-[#1877F2]",
    activeBorder: "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/25 shadow-blue-500/10",
  },
  {
    id: "EMAIL",
    name: "Email Broadcast",
    badge: "Unlimited",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    desc: "HTML Newsletters & Offers",
    icon: Mail,
    accent: "text-teal-600",
    activeBorder: "border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/25 shadow-teal-500/10",
  },
]

function resolveSampleText(rawText: string, varMap: string[], isSoc: boolean, sample: boolean, linkUrl?: string) {
  if (!rawText) return ""
  if (!sample) return rawText
  let text = rawText
  if (isSoc) {
    text = text.replace(/\{\{\s*customer\.firstName\s*\}\}/g, "Ahmed")
    text = text.replace(/\{\{\s*customer\.name\s*\}\}/g, "Ahmed Al-Balushi")
    text = text.replace(/\{\{\s*customer\.phone\s*\}\}/g, "+968 9123 4567")
    text = text.replace(/\{\{\s*link\s*\}\}/g, linkUrl || "https://fizmoh.cloud/offer")
  } else {
    varMap.forEach((field, i) => {
      const val = field === "customer.firstName" ? "Ahmed"
        : field === "customer.phone" ? "+968 9123 4567"
        : field === "customer.tier" ? "VIP Gold"
        : "Ahmed Al-Balushi"
      text = text.replace(new RegExp(`\\{\\{\\s*${i + 1}\\s*\\}\\}`, "g"), val)
    })
  }
  return text
}

function NewCampaignDialog({
  onClose,
  onCreated,
  initialChannel = "WHATSAPP",
}: {
  onClose: () => void
  onCreated: () => void
  initialChannel?: string
}) {
  const [name, setName] = useState("")
  const [channel, setChannel] = useState(() =>
    ["WHATSAPP", "INSTAGRAM", "FACEBOOK", "EMAIL"].includes(initialChannel) ? initialChannel : "WHATSAPP",
  )
  const [templateId, setTemplateId] = useState("")
  const [customContent, setCustomContent] = useState("")
  const [templates, setTemplates] = useState<any[]>([])
  const [scheduledAt, setScheduledAt] = useState("")
  const [saving, setSaving] = useState(false)
  const [labels, setLabels] = useState<{ name: string; customers: number }[]>([])
  const [audienceLabel, setAudienceLabel] = useState("")
  const [audience, setAudience] = useState<{ count: number; totalReachable: number; sample: { id: string; name: string | null; phone: string }[] } | null>(null)
  const [countingAudience, setCountingAudience] = useState(false)
  const [sendNow, setSendNow] = useState(false)
  const [variableMap, setVariableMap] = useState<string[]>([])
  const [headerMediaUrl, setHeaderMediaUrl] = useState("")
  const [uploadingHeader, setUploadingHeader] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const [ratePerSecond, setRatePerSecond] = useState(10)
  const [respectQuietHours, setRespectQuietHours] = useState(true)
  const [previewSample, setPreviewSample] = useState(true)

  const isSocial = channel === "FACEBOOK" || channel === "INSTAGRAM"
  const isEmail = channel === "EMAIL"

  useEffect(() => {
    fetch(`/api/templates?channel=${channel}`)
      .then(r => r.json())
      .then(d => {
        const list = d.templates || []
        setTemplates(list)
        if (list.length > 0 && !templateId) {
          setTemplateId(list[0].id)
        }
      })
      .catch(() => setTemplates([]))
  }, [channel])

  useEffect(() => {
    fetch("/api/labels").then(r => r.json()).then(d => setLabels(d.labels || [])).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    setCountingAudience(true)
    const rules = audienceLabel ? [{ field: "tag", op: "contains", value: audienceLabel }] : []
    fetch("/api/campaigns/audience", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, rules }),
    })
      .then(r => r.json())
      .then(d => { if (!cancelled) setAudience(d.count === undefined ? null : d) })
      .catch(() => { if (!cancelled) setAudience(null) })
      .finally(() => { if (!cancelled) setCountingAudience(false) })
    return () => { cancelled = true }
  }, [channel, audienceLabel])

  const selectedTemplate = templates.find((t: { id: string }) => t.id === templateId)

  const placeholders = Array.from(
    new Set([...(selectedTemplate?.bodyContent || "").matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map(m => m[1])),
  ).length
  const headerType = String(selectedTemplate?.headerType || "NONE").toUpperCase()
  const needsHeaderMedia = ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType)

  useEffect(() => {
    setVariableMap(current =>
      Array.from({ length: placeholders }, (_, i) => current[i] ?? "customer.name"),
    )
  }, [placeholders, templateId])

  const handleFileUpload = async (file: File) => {
    setUploadingHeader(true)
    const form = new FormData()
    form.append("file", file)
    try {
      const res = await fetch("/api/media/upload", { method: "POST", body: form })
      const data = await res.json()
      if (res.ok && data.url) {
        setHeaderMediaUrl(data.url)
        toast.success("Header media uploaded successfully!")
      } else {
        toast.error(data.error || "Upload failed")
      }
    } catch {
      toast.error("Upload failed")
    } finally {
      setUploadingHeader(false)
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Give the campaign a name"); return }
    if (!isSocial && !isEmail && !templateId) { toast.error("Choose a template"); return }
    if (isSocial && !customContent.trim()) { toast.error("Enter a broadcast message to send"); return }
    if (isEmail && !customContent.trim()) { toast.error("Enter email content"); return }
    if (!isSocial && needsHeaderMedia && !headerMediaUrl.trim()) {
      toast.error(`This template requires a ${headerType.toLowerCase()} header`)
      return
    }
    if (sendNow && (audience?.count ?? 0) === 0) {
      toast.error("Nobody matches this audience")
      return
    }
    if (sendNow && !confirm(`Send "${name}" to ${audience?.count} ${audience?.count === 1 ? "person" : "people"} now? This cannot be undone.`)) return

    setSaving(true)
    try {
      let segmentId: string | undefined
      if (audienceLabel) {
        const segRes = await fetch("/api/segments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `Label: ${audienceLabel}`,
            channel,
            filterRules: [{ field: "tag", op: "contains", value: audienceLabel }],
          }),
        })
        if (segRes.ok) segmentId = (await segRes.json()).segment?.id
      }

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, channel,
          templateId: isSocial || isEmail ? undefined : (templateId || undefined),
          customContent: isSocial || isEmail ? customContent.trim() : undefined,
          segmentId,
          scheduledAt: scheduledAt || undefined,
          variableMap,
          headerMediaUrl: headerMediaUrl.trim() || undefined,
          headerMediaType: isSocial ? (headerMediaUrl.trim() ? "IMAGE" : undefined) : (needsHeaderMedia ? headerType : undefined),
          linkUrl: linkUrl.trim() || undefined,
          ratePerSecond,
          respectQuietHours,
        }),
      })
      if (!res.ok) { toast.error("The campaign was not created"); return }
      const created = (await res.json()).campaign

      if (sendNow) {
        const sendRes = await fetch(`/api/campaigns/${created.id}/send`, { method: "POST" })
        const body = await sendRes.json().catch(() => ({}))
        if (!sendRes.ok) {
          toast.error(body.error || "Created, but sending failed")
        } else {
          toast.success(`Sending to ${audience?.count ?? 0}`)
        }
      } else {
        toast.success(scheduledAt ? "Campaign scheduled" : "Saved as a draft")
      }
      onCreated()
    } catch {
      toast.error("The campaign was not created")
    } finally {
      setSaving(false)
    }
  }

  // Parse template buttons for preview
  let templateButtons: PreviewButton[] = []
  if (selectedTemplate) {
    try {
      const raw = typeof selectedTemplate.buttons === "string" ? JSON.parse(selectedTemplate.buttons) : []
      templateButtons = (Array.isArray(raw) ? raw : []).flatMap(
        (b: { type?: string; text?: string; url?: string }) => {
          const type = String(b?.type || "QUICK_REPLY").toUpperCase()
          if (!["QUICK_REPLY", "URL", "PHONE_NUMBER"].includes(type)) return []
          return [{ type: type as PreviewButton["type"], text: String(b?.text || ""), url: b?.url }]
        },
      )
    } catch { templateButtons = [] }
  }

  const carouselCards = selectedTemplate ? parseCards(selectedTemplate.cards) : []

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div
        className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-stone-200/80 bg-stone-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-stone-900">New Broadcast Campaign</h2>
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                  {CHANNELS.find(c => c.id === channel)?.name}
                </Badge>
              </div>
              <p className="text-xs text-stone-500">Target opted-in customers with personalized, interactive broadcasts</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full text-stone-400 hover:text-stone-700" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="flex-1 overflow-y-auto p-6 grid lg:grid-cols-12 gap-6">
          {/* Left Column: Setup & Content (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Channel Selection Cards */}
            <div>
              <Label className="text-xs font-semibold text-stone-700 mb-2 block">Choose Broadcast Channel</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {CHANNELS.map(c => {
                  const Icon = c.icon
                  const isSelected = channel === c.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setChannel(c.id)
                        setTemplateId("")
                      }}
                      className={cn(
                        "p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between shadow-2xs group",
                        isSelected
                          ? c.activeBorder
                          : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/60"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className={cn("p-1.5 rounded-xl bg-stone-100 group-hover:scale-105 transition-transform", isSelected ? "bg-white shadow-xs" : "")}>
                          <Icon className={cn("h-4 w-4", c.accent)} />
                        </div>
                        {isSelected && (
                          <div className="h-4 w-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-stone-900 leading-tight">{c.name}</div>
                        <div className="text-[10px] text-stone-500 mt-0.5 line-clamp-1">{c.desc}</div>
                      </div>
                      <span className={cn("mt-2 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md border w-fit", c.badgeColor)}>
                        {c.badge}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Campaign Identity & Audience Card */}
            <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-3.5">
              <div className="font-bold text-xs text-stone-800 flex items-center gap-1.5 uppercase tracking-wide">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                1. Campaign Details &amp; Audience
              </div>

              <div>
                <Label className="text-xs text-stone-600 font-medium">Campaign Name</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={
                    channel === "WHATSAPP" ? "e.g. Desert Safari Weekend Special" :
                    channel === "INSTAGRAM" ? "e.g. VIP Instagram Follower Flash Offer" :
                    channel === "FACEBOOK" ? "e.g. Messenger Weekend Promo" :
                    "e.g. Monthly Newsletter · Special Discounts"
                  }
                  className="mt-1 bg-white"
                />
              </div>

              <div>
                <Label className="text-xs text-stone-600 font-medium">Target Audience Segment</Label>
                <Select value={audienceLabel || "__all"} onValueChange={v => setAudienceLabel(v === "__all" ? "" : v)}>
                  <SelectTrigger className="mt-1 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">Everyone who has opted in (Broadcast list)</SelectItem>
                    {labels.map(l => (
                      <SelectItem key={l.name} value={l.name}>
                        🏷️ {l.name} · {l.customers} contacts
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Real-time Audience Reach Card */}
              <div className="rounded-xl border border-stone-200 bg-white p-3.5 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    {countingAudience ? (
                      <div className="flex items-center gap-2 text-stone-400 text-xs py-1">
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> Calculating reach...
                      </div>
                    ) : (
                      <>
                        <span className="text-2xl font-black text-stone-900 tracking-tight">{audience?.count ?? 0}</span>
                        <span className="text-xs font-semibold text-stone-600">Reachable Contacts</span>
                      </>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-stone-50 text-stone-600 font-medium border-stone-200">
                    {audience?.totalReachable ?? 0} opted in total
                  </Badge>
                </div>

                {!countingAudience && audience && (
                  <>
                    {audience.sample.length > 0 ? (
                      <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-stone-100">
                        <span className="text-[10px] text-stone-400 font-medium">Sample:</span>
                        {audience.sample.slice(0, 4).map((c, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-50 border border-stone-200 text-[11px] font-medium text-stone-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {c.name || c.phone}
                          </span>
                        ))}
                        {audience.count > 4 && (
                          <span className="text-[10px] text-stone-400 font-medium">+{audience.count - 4} more</span>
                        )}
                      </div>
                    ) : audience.count === 0 ? (
                      <p className="text-[11px] text-amber-600 font-medium pt-1 border-t border-stone-100">
                        No opted-in contacts found. Contacts must consent or interact before receiving broadcasts.
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            </div>

            {/* Message Creative & Content Card */}
            <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-3.5">
              <div className="font-bold text-xs text-stone-800 flex items-center gap-1.5 uppercase tracking-wide">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                2. Message Creative &amp; Content
              </div>

              {isSocial ? (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs text-stone-600 font-medium">Broadcast Message Text</Label>
                      <div className="flex gap-1">
                        {[
                          { tag: "{{customer.firstName}}", label: "First Name" },
                          { tag: "{{customer.name}}", label: "Full Name" },
                          { tag: "{{link}}", label: "Link" },
                        ].map(t => (
                          <button
                            key={t.tag}
                            type="button"
                            onClick={() => setCustomContent(c => c + " " + t.tag)}
                            className="text-[10px] bg-white hover:bg-stone-100 text-stone-700 font-semibold border border-stone-200 rounded-md px-2 py-0.5 shadow-2xs transition-colors"
                          >
                            +{t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      rows={4}
                      value={customContent}
                      onChange={e => setCustomContent(e.target.value)}
                      placeholder={channel === "FACEBOOK" ? "Write your Facebook broadcast message..." : "Write your Instagram Direct broadcast..."}
                      className="w-full text-sm rounded-xl border border-stone-200 p-3 bg-white focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
                    />
                  </div>

                  {/* Header Media Upload / URL */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs text-stone-600 font-medium">Media Header (Optional Image / Banner)</Label>
                      <label className="cursor-pointer text-[11px] font-semibold bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 px-2 py-0.5 rounded-md inline-flex items-center gap-1 shadow-2xs">
                        {uploadingHeader ? <Loader2 className="h-3 w-3 animate-spin text-emerald-600" /> : <Upload className="h-3 w-3" />}
                        Upload Image
                        <input
                          type="file"
                          hidden
                          disabled={uploadingHeader}
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) handleFileUpload(file)
                          }}
                          accept="image/*"
                        />
                      </label>
                    </div>
                    <Input
                      className="bg-white text-xs h-9"
                      placeholder="https://... or click Upload Image"
                      value={headerMediaUrl}
                      onChange={e => setHeaderMediaUrl(e.target.value)}
                    />
                  </div>

                  {/* Meta Policy Reminder */}
                  <div className="rounded-xl bg-blue-50/80 border border-blue-200/80 p-3 text-[11px] text-blue-900 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5 text-blue-800">
                      {channel === "FACEBOOK" ? <Facebook className="h-3.5 w-3.5 text-blue-600" /> : <Instagram className="h-3.5 w-3.5 text-pink-600" />}
                      Meta 24-Hour Messaging Policy
                    </div>
                    <p className="text-blue-700 leading-relaxed">
                      Broadcasts are delivered to followers who have interacted with your page/profile within the last 24 hours. Contacts outside this window are safely logged and skipped without account penalty.
                    </p>
                  </div>
                </div>
              ) : isEmail ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-stone-600 font-medium">Subject Line</Label>
                    <Input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Special discount exclusively for our subscribers"
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-stone-600 font-medium">Email Content (Text or HTML)</Label>
                    <textarea
                      rows={5}
                      value={customContent}
                      onChange={e => setCustomContent(e.target.value)}
                      placeholder="Write your email newsletter or announcement..."
                      className="mt-1 w-full text-sm rounded-xl border border-stone-200 p-3 bg-white focus:outline-emerald-600 shadow-2xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs text-stone-600 font-medium">WhatsApp Cloud API Template</Label>
                      {selectedTemplate && (
                        <Badge className={cn(
                          "text-[9px] font-bold px-1.5 py-0.2",
                          selectedTemplate.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        )}>
                          {selectedTemplate.status || "APPROVED"}
                        </Badge>
                      )}
                    </div>
                    <Select value={templateId} onValueChange={setTemplateId}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Select an approved template..." /></SelectTrigger>
                      <SelectContent>
                        {templates.map((t: { id: string; name: string; status?: string; category?: string }) => (
                          <SelectItem key={t.id} value={t.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{t.name}</span>
                              <span className="text-[10px] text-stone-400">({t.category || "MARKETING"})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Variable mapping cards */}
                  {placeholders > 0 && (
                    <div className="space-y-2 rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-stone-800">Dynamic Variable Mapping</Label>
                        <span className="text-[10px] text-stone-400 font-mono">{placeholders} variable{placeholders > 1 ? "s" : ""}</span>
                      </div>
                      <div className="space-y-2">
                        {Array.from({ length: placeholders }, (_, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="w-10 text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-1 rounded text-center border border-emerald-200">
                              {`{{${i + 1}}}`}
                            </span>
                            <Select
                              value={variableMap[i] ?? "customer.name"}
                              onValueChange={v =>
                                setVariableMap(m => m.map((existing, index) => (index === i ? v : existing)))
                              }
                            >
                              <SelectTrigger className="bg-stone-50 text-xs h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="customer.firstName">👤 Customer First Name (e.g. Ahmed)</SelectItem>
                                <SelectItem value="customer.name">👤 Customer Full Name (e.g. Ahmed Al-Balushi)</SelectItem>
                                <SelectItem value="customer.phone">📱 Phone Number (+968...)</SelectItem>
                                <SelectItem value="customer.tier">⭐ Loyalty Tier (e.g. VIP Gold)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Header Media Upload for WhatsApp */}
                  {needsHeaderMedia && (
                    <div className="space-y-1.5 p-3 bg-white border border-stone-200 rounded-xl shadow-2xs">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-stone-800">
                          Header {headerType.toLowerCase()} Media
                        </Label>
                        <label className="cursor-pointer text-[11px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg inline-flex items-center gap-1 shadow-xs transition-colors">
                          {uploadingHeader ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                          Upload Media
                          <input
                            type="file"
                            hidden
                            disabled={uploadingHeader}
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) handleFileUpload(file)
                            }}
                            accept="image/*,video/*,application/pdf"
                          />
                        </label>
                      </div>
                      <Input
                        value={headerMediaUrl}
                        onChange={e => setHeaderMediaUrl(e.target.value)}
                        placeholder="https://... or click Upload Media"
                        className="bg-stone-50 text-xs h-8 mt-1"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Dynamic Click Tracking Link */}
              <div>
                <Label className="text-xs text-stone-600 font-medium">Tracking Link / Call to Action (Optional)</Label>
                <Input
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  placeholder="https://app.fizmoh.cloud/tours/safari"
                  className="mt-1 bg-white"
                />
                <p className="mt-1 text-[11px] text-stone-500">
                  Redirects through Fizmoh tracking to count exact link clicks per individual contact.
                </p>
              </div>
            </div>

            {/* Delivery & Throttling Card */}
            <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-3.5">
              <div className="font-bold text-xs text-stone-800 flex items-center gap-1.5 uppercase tracking-wide">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                3. Delivery Controls &amp; Throttle
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-stone-600 font-medium">Throttle Speed (msg/sec)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={ratePerSecond}
                    onChange={e => setRatePerSecond(Number(e.target.value))}
                    className="mt-1 bg-white"
                  />
                  <p className="mt-1 text-[10px] text-stone-400">10 msg/sec is Meta recommended safe rate</p>
                </div>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-stone-200 bg-white p-2.5 shadow-2xs">
                  <input
                    type="checkbox"
                    className="mt-0.5 text-emerald-600 rounded"
                    checked={respectQuietHours}
                    onChange={e => setRespectQuietHours(e.target.checked)}
                  />
                  <span className="text-[11px] text-stone-700">
                    <span className="font-bold">Quiet Hours</span><br />
                    Pause automatically from 10 PM to 8 AM Muscat time.
                  </span>
                </label>
              </div>

              <div>
                <Label className="text-xs text-stone-600 font-medium">Schedule Broadcast (Muscat Time)</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => {
                    setScheduledAt(e.target.value)
                    if (e.target.value) setSendNow(false)
                  }}
                  className="mt-1 bg-white"
                />
                <p className="mt-1 text-[10px] text-stone-400">Leave empty to store as draft or send immediately</p>
              </div>

              <label className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all",
                sendNow
                  ? "border-emerald-500 bg-emerald-50/80 shadow-xs"
                  : "border-stone-200 bg-white hover:bg-stone-50"
              )}>
                <input
                  type="checkbox"
                  className="mt-1 text-emerald-600 rounded h-4 w-4"
                  checked={sendNow}
                  onChange={e => {
                    setSendNow(e.target.checked)
                    if (e.target.checked) setScheduledAt("")
                  }}
                />
                <div className="text-xs">
                  <span className="font-bold text-stone-900 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-emerald-600" /> Send Immediately
                  </span>
                  <p className="text-stone-500 mt-0.5">
                    Messages dispatch to all {audience?.count ?? 0} reachable contacts instantly upon creation.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Right Column: Authentic Smartphone Preview (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-start bg-stone-100/70 rounded-3xl p-4 border border-stone-200/80">
            <div className="w-full flex items-center justify-between mb-3 px-2">
              <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-stone-500" /> Live Device Mockup
              </span>
              <button
                type="button"
                onClick={() => setPreviewSample(s => !s)}
                className={cn(
                  "text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-colors",
                  previewSample ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-white text-stone-500 border-stone-200"
                )}
              >
                {previewSample ? "✨ Sample Data: ON" : "Tokens: ON"}
              </button>
            </div>

            {/* Smartphone Frame */}
            <div className="w-full max-w-[310px] rounded-[38px] bg-slate-950 p-2.5 shadow-2xl border-[3px] border-slate-700 flex flex-col">
              {/* Inner Screen */}
              <div className="rounded-[28px] overflow-hidden flex flex-col h-[520px] relative bg-stone-100 shadow-inner">
                {/* Dynamic Island / Notch */}
                <div className="h-4 w-24 bg-black rounded-full mx-auto my-1 shrink-0 flex items-center justify-end px-2">
                  <div className="h-2 w-2 rounded-full bg-slate-900 border border-slate-700" />
                </div>

                {/* Status Bar */}
                <div className="flex items-center justify-between text-[10px] font-semibold text-stone-500 px-4 py-0.5 shrink-0 select-none">
                  <span>9:41</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px]">5G</span>
                    <div className="w-4 h-2 border border-stone-400 rounded-xs p-0.2 flex items-center">
                      <div className="w-full h-full bg-stone-500 rounded-2xs" />
                    </div>
                  </div>
                </div>

                {/* Channel Header Bar */}
                {channel === "WHATSAPP" ? (
                  <div className="bg-[#075E54] text-white px-3 py-2 flex items-center justify-between shrink-0 shadow-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <ArrowRight className="h-3.5 w-3.5 rotate-180 text-white/80 shrink-0" />
                      <div className="h-7 w-7 rounded-full bg-emerald-800 flex items-center justify-center text-[10px] font-bold shrink-0 border border-emerald-400/40">
                        FZ
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate flex items-center gap-1">
                          Fizmoh Commerce
                          <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0 inline fill-emerald-400 text-white" />
                        </div>
                        <div className="text-[9px] text-emerald-200 truncate">Official Business Account</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <Video className="h-3.5 w-3.5" />
                      <Phone className="h-3 w-3" />
                      <MoreVertical className="h-3.5 w-3.5" />
                    </div>
                  </div>
                ) : channel === "INSTAGRAM" ? (
                  <div className="bg-white border-b border-stone-200 px-3 py-2 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <ArrowRight className="h-3.5 w-3.5 rotate-180 text-stone-800 shrink-0" />
                      <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 p-0.5 shrink-0">
                        <div className="h-full w-full bg-white rounded-full flex items-center justify-center text-[9px] font-bold text-stone-800">
                          FZ
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-900 truncate flex items-center gap-1">
                          fizmoh.cloud
                          <CheckCircle className="h-3 w-3 text-blue-500 shrink-0 inline fill-blue-500 text-white" />
                        </div>
                        <div className="text-[9px] text-stone-400">Instagram Direct</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-stone-600">
                      <Phone className="h-3.5 w-3.5" />
                      <Video className="h-3.5 w-3.5" />
                    </div>
                  </div>
                ) : channel === "FACEBOOK" ? (
                  <div className="bg-white border-b border-stone-200 px-3 py-2 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <ArrowRight className="h-3.5 w-3.5 rotate-180 text-stone-800 shrink-0" />
                      <div className="h-7 w-7 rounded-full bg-[#1877F2] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        f
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-900 truncate">Fizmoh Page</div>
                        <div className="text-[9px] text-emerald-600 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active Now
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-blue-600">
                      <Phone className="h-3.5 w-3.5" />
                      <Video className="h-3.5 w-3.5" />
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border-b border-stone-200 px-3 py-2 flex items-center justify-between shrink-0">
                    <div className="text-xs font-bold text-stone-800">Marketing Newsletter</div>
                    <span className="text-[10px] text-stone-400">Inbox</span>
                  </div>
                )}

                {/* Viewport Chat Area */}
                <div className={cn(
                  "flex-1 overflow-y-auto p-3 space-y-2",
                  channel === "WHATSAPP" ? "bg-[#efeae2]" : "bg-stone-50"
                )}>
                  {/* WhatsApp View */}
                  {channel === "WHATSAPP" && (
                    <>
                      <div className="flex justify-center my-1">
                        <span className="text-[9px] font-semibold bg-white/80 text-stone-600 px-2 py-0.5 rounded-full shadow-2xs">
                          TODAY
                        </span>
                      </div>

                      {selectedTemplate ? (
                        <div className="space-y-1.5 max-w-[94%]">
                          {carouselCards.length > 0 ? (
                            <CarouselPreview cards={carouselCards} bodyContent={resolveSampleText(selectedTemplate.bodyContent, variableMap, false, previewSample, linkUrl)} />
                          ) : (
                            <div className="bg-white rounded-2xl rounded-tl-xs p-3 text-stone-900 shadow-xs border border-stone-200/60">
                              {/* Header Media */}
                              {(headerMediaUrl || needsHeaderMedia) && (
                                <div className="rounded-xl overflow-hidden mb-2 max-h-36 bg-stone-100 flex items-center justify-center border border-stone-200">
                                  {headerMediaUrl ? (
                                    <img
                                      src={headerMediaUrl}
                                      alt="Header Media"
                                      className="w-full object-cover max-h-36"
                                      onError={e => (e.currentTarget.style.display = "none")}
                                    />
                                  ) : (
                                    <div className="py-6 text-center text-stone-400 text-xs flex flex-col items-center gap-1">
                                      <Upload className="h-4 w-4" />
                                      <span>Header {headerType}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Body content */}
                              <div className="text-xs whitespace-pre-wrap leading-relaxed">
                                {resolveSampleText(selectedTemplate.bodyContent, variableMap, false, previewSample, linkUrl)}
                              </div>

                              {/* Footer text */}
                              {selectedTemplate.footerContent && (
                                <div className="text-[10px] text-stone-400 mt-1.5">
                                  {selectedTemplate.footerContent}
                                </div>
                              )}

                              {/* Meta timestamp & double tick */}
                              <div className="flex items-center justify-end gap-1 text-[10px] text-stone-400 mt-1">
                                <span>10:42 AM</span>
                                <CheckCheck className="h-3 w-3 text-sky-500" />
                              </div>
                            </div>
                          )}

                          {/* Quick Reply Buttons */}
                          {templateButtons.length > 0 && (
                            <div className="space-y-1 pt-0.5">
                              {templateButtons.map((btn, idx) => (
                                <div
                                  key={idx}
                                  className="w-full py-2 px-3 bg-white text-sky-600 font-bold text-xs rounded-xl shadow-xs border border-stone-200/80 flex items-center justify-center gap-1.5"
                                >
                                  {btn.type === "URL" ? <ExternalLink className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                                  {btn.text}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-16 text-center text-xs text-stone-400 px-4">
                          Choose an approved template to see what the customer receives on WhatsApp.
                        </div>
                      )}
                    </>
                  )}

                  {/* Instagram View */}
                  {channel === "INSTAGRAM" && (
                    <div className="space-y-2 pt-4">
                      {headerMediaUrl && (
                        <div className="rounded-2xl overflow-hidden max-h-36 border border-stone-200 bg-white ml-auto max-w-[85%] shadow-xs">
                          <img src={headerMediaUrl} alt="Header" className="w-full object-cover max-h-36" onError={e => (e.currentTarget.style.display = "none")} />
                        </div>
                      )}
                      <div className="bg-[#3797F0] text-white rounded-2xl rounded-br-xs p-3.5 shadow-sm max-w-[85%] ml-auto text-xs whitespace-pre-wrap leading-relaxed">
                        {resolveSampleText(customContent || "Write your broadcast message on the left...", [], true, previewSample, linkUrl)}
                        {linkUrl && (
                          <div className="mt-2 pt-2 border-t border-white/20 text-[10px] underline break-all flex items-center gap-1">
                            <ExternalLink className="h-3 w-3 shrink-0" /> {linkUrl}
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-stone-400 text-right pr-1">10:42 AM · Sent</div>
                    </div>
                  )}

                  {/* Facebook View */}
                  {channel === "FACEBOOK" && (
                    <div className="space-y-2 pt-4">
                      {headerMediaUrl && (
                        <div className="rounded-2xl overflow-hidden max-h-36 border border-stone-200 bg-white ml-auto max-w-[85%] shadow-xs">
                          <img src={headerMediaUrl} alt="Header" className="w-full object-cover max-h-36" onError={e => (e.currentTarget.style.display = "none")} />
                        </div>
                      )}
                      <div className="bg-[#0084FF] text-white rounded-2xl rounded-br-xs p-3.5 shadow-sm max-w-[85%] ml-auto text-xs whitespace-pre-wrap leading-relaxed">
                        {resolveSampleText(customContent || "Write your Facebook broadcast message on the left...", [], true, previewSample, linkUrl)}
                        {linkUrl && (
                          <div className="mt-2 pt-2 border-t border-white/20 text-[10px] underline break-all flex items-center gap-1">
                            <ExternalLink className="h-3 w-3 shrink-0" /> {linkUrl}
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-stone-400 text-right pr-1">Delivered</div>
                    </div>
                  )}

                  {/* Email View */}
                  {channel === "EMAIL" && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200 space-y-2 text-xs">
                      <div className="border-b border-stone-100 pb-2 text-[11px] text-stone-500 space-y-0.5">
                        <div><strong className="text-stone-700">From:</strong> Fizmoh &lt;broadcast@fizmoh.cloud&gt;</div>
                        <div><strong className="text-stone-700">To:</strong> Ahmed Al-Balushi &lt;ahmed@example.com&gt;</div>
                        <div><strong className="text-stone-700">Subject:</strong> {name || "Exclusive Special Offer"}</div>
                      </div>
                      {headerMediaUrl && (
                        <img src={headerMediaUrl} alt="Banner" className="w-full rounded-xl object-cover max-h-32" onError={e => (e.currentTarget.style.display = "none")} />
                      )}
                      <div className="text-stone-800 whitespace-pre-wrap leading-relaxed pt-1">
                        {customContent || "Your newsletter or announcement body will render here."}
                      </div>
                      {linkUrl && (
                        <div className="pt-2">
                          <a href={linkUrl} target="_blank" rel="noreferrer" className="inline-block px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold">
                            View Offer →
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Simulated Input Bar */}
                <div className="bg-white border-t border-stone-200 p-2 flex items-center gap-1.5 shrink-0">
                  <div className="flex-1 bg-stone-100 rounded-full px-3 py-1.5 text-[11px] text-stone-400 flex items-center justify-between">
                    <span>Message...</span>
                  </div>
                  <div className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center text-white shrink-0 shadow-2xs",
                    channel === "WHATSAPP" ? "bg-[#075E54]" : channel === "INSTAGRAM" ? "bg-rose-500" : channel === "FACEBOOK" ? "bg-[#0084FF]" : "bg-teal-600"
                  )}>
                    <Send className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span className="font-semibold text-stone-700">{audience?.count ?? 0}</span> contacts selected
            {sendNow && <span className="text-emerald-600 font-bold">· Ready for immediate send</span>}
            {scheduledAt && <span className="text-amber-600 font-bold">· Scheduled</span>}
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || (sendNow && (audience?.count ?? 0) === 0)}
              className={cn(
                sendNow
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
                  : scheduledAt
                    ? "bg-amber-600 hover:bg-amber-700 text-white font-bold"
                    : "bg-stone-900 hover:bg-stone-800 text-white font-bold"
              )}
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Processing...</>
              ) : sendNow ? (
                <><Send className="h-4 w-4 mr-1.5" /> Send to {audience?.count ?? 0} Contacts Now</>
              ) : scheduledAt ? (
                <><Calendar className="h-4 w-4 mr-1.5" /> Schedule Broadcast</>
              ) : (
                "Save as Draft"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * One message, to yourself.
 *
 * The real send path, with the real template and the real variables — a
 * preview that renders in the browser proves nothing about what Meta will do
 * with the same template.
 */
function TestSendDialog({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const [to, setTo] = useState("")
  const [sending, setSending] = useState(false)

  const send = async () => {
    setSending(true)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || "The test was not delivered")
      toast.success("Test sent. Check the phone.")
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The test was not delivered")
    } finally {
      setSending(false)
    }
  }

  const isEmail = campaign.channel === "EMAIL"
  const isSocial = campaign.channel === "FACEBOOK" || campaign.channel === "INSTAGRAM"
  const recipientLabel = isEmail
    ? "Email address"
    : isSocial
    ? (campaign.channel === "FACEBOOK" ? "Facebook User ID / PSID" : "Instagram User ID / IGSID")
    : "WhatsApp number"
  const placeholder = isEmail
    ? "you@example.com"
    : isSocial
    ? "Enter test recipient user ID"
    : "+96890000000"

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={e => e.stopPropagation()}>
        <CardHeader><CardTitle className="text-base">Send a test</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-stone-500">
            Sends one copy of “{campaign.name}” exactly as a customer would receive it.
            Nobody on the list is messaged.
          </p>
          <div>
            <Label className="text-xs">{recipientLabel}</Label>
            <Input
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder={placeholder}
              autoFocus
            />
            {isSocial && (
              <p className="mt-1.5 text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200/70 leading-relaxed">
                <strong>Meta Policy:</strong> Can only send to contacts who messaged your {campaign.channel === "FACEBOOK" ? "Facebook Page" : "Instagram account"} within the last 24 hours. You can enter an Instagram user ID, username, or customer phone.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={sending || to.trim().length < 5}
              onClick={send}
            >
              {sending ? "Sending…" : "Send test"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Who it reached, and who it did not.
 *
 * The per-person record has always been written and never shown, so a failed
 * campaign was a number with no way to act on it. Failures are listed first,
 * with the reason, because that is the only part anybody opens this to read.
 */
function RecipientReport({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const [rows, setRows] = useState<any[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [filter, setFilter] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/campaigns/${campaign.id}/recipients${filter ? `?status=${filter}` : ""}`)
      .then(r => r.json())
      .then(d => { setRows(d.recipients || []); setCounts(d.counts || {}) })
      .catch(() => toast.error("Could not load the report"))
      .finally(() => setLoading(false))
  }, [campaign.id, filter])

  const tone: Record<string, string> = {
    SENT: "bg-emerald-100 text-emerald-700",
    FAILED: "bg-rose-100 text-rose-700",
    SKIPPED: "bg-stone-100 text-stone-600",
    PENDING: "bg-amber-100 text-amber-700",
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{campaign.name}</CardTitle>
          <div className="flex items-center gap-2">
            <a href={`/api/campaigns/${campaign.id}/recipients?format=csv`} download>
              <Button size="sm" variant="outline"><Download className="h-3.5 w-3.5 mr-1" /> CSV</Button>
            </a>
            <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 overflow-hidden flex flex-col">
          <div className="flex flex-wrap gap-2">
            {[["", "All"], ["FAILED", "Failed"], ["SENT", "Sent"], ["SKIPPED", "Skipped"], ["PENDING", "Waiting"]].map(
              ([value, label]) => (
                <Button
                  key={label}
                  size="sm"
                  variant={filter === value ? "default" : "outline"}
                  onClick={() => setFilter(value)}
                >
                  {label}
                  {value && counts[value.toLowerCase()] ? ` ${counts[value.toLowerCase()]}` : ""}
                </Button>
              ),
            )}
          </div>

          <ScrollArea className="h-[55vh] rounded-lg border">
            {loading ? (
              <div className="p-4 space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-9" />)}</div>
            ) : rows.length === 0 ? (
              <p className="p-8 text-center text-sm text-stone-500">Nothing here.</p>
            ) : (
              <table className="w-full text-xs">
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="p-2.5">
                        <div className="font-medium text-stone-900">{r.name}</div>
                        <div className="text-stone-500">{r.phone}</div>
                      </td>
                      <td className="p-2.5 text-stone-500 max-w-[45%]">
                        {/* The reason, not just the state: "failed" on its own
                            tells nobody what to do next. */}
                        {r.error || (r.skipReason ? r.skipReason.toLowerCase().replace(/_/g, " ") : "")}
                      </td>
                      <td className="p-2.5 text-right whitespace-nowrap">
                        {r.clickedAt && <Badge className="bg-purple-100 text-purple-700 mr-1">clicked</Badge>}
                        {r.readAt && !r.clickedAt && <Badge className="bg-teal-100 text-teal-700 mr-1">read</Badge>}
                        {r.deliveredAt && !r.readAt && <Badge className="bg-emerald-50 text-emerald-700 mr-1">delivered</Badge>}
                        <Badge className={tone[r.status] || ""}>{r.status.toLowerCase()}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
