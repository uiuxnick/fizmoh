"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import ReviewReplyView from "./review-reply-view"
import {
  QrCode, Plus, Star, TrendingUp, MessageSquareWarning, Copy, ExternalLink,
  Loader2, ScanLine, MapPin, Trash2, Download, Printer, QrCode as QrCodeIcon, X,
  Link2, Unlink, RefreshCw,
} from "lucide-react"

type Campaign = {
  id: string; name: string; description: string | null; status: string
  language: string; googleReviewUrl: string | null; ratingThreshold: number
  locationId: string | null; locationName: string | null
  googleLocationId: string | null; googleLocationName: string | null
  googleAverageRating: number | null; googleReviewCount: number | null
  googleRatingSyncedAt: string | null; googleSyncError: string | null
  qrCodeCount: number; sessionCount: number; createdAt: string
}

type GoogleLocationOption = { id: string; name: string; address: string | null }

type QrLocation = { id: string; name: string; address: string | null; campaignCount: number }

type LocationStat = {
  id: string; name: string; scans: number; uniqueScans: number; sessions: number
  googleClicks: number; privateFeedback: number; averageRating: number | null
}

type QrCodeRow = {
  id: string; label: string; token: string; isActive: boolean
  scans: number; uniqueScans: number; reviewSessions: number; googleClicks: number; conversion: number
}

type Feedback = {
  id: string; rating: number; category: string | null; feedbackText: string | null
  contactName: string | null; contactPhone: string | null; wantsCallback: boolean
  status: string; campaign: string; qrLabel: string; createdAt: string
}

type Dashboard = {
  kpis: Record<string, number | null>
  funnel: Array<{ stage: string; count: number; pct: number }>
  rates: { aiSelectionRate: number; editRate: number; confirmationRate: number }
}

/**
 * Digital QR Addons — admin surface.
 *
 * Overview / Campaigns / Approval Queue, reusing the same cards, tabs and
 * dialogs the rest of the product already uses. Every number here comes from
 * a real query in /api/digital-qr/dashboard — nothing is sample data.
 */
function exportCsv(type: string) {
  window.open(`/api/digital-qr/export?type=${type}`, "_blank", "noopener")
}

export default function DigitalQrView() {
  const [tab, setTab] = useState("overview")
  return (
    <div className="p-4 md:p-6 w-full max-w-none space-y-5">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <QrCode className="h-6 w-6 text-emerald-600" />
          <div>
            <h1 className="text-xl font-bold text-stone-900">Digital QR Addons</h1>
            <p className="text-sm text-stone-500">Smart QR Review &amp; Reputation Management</p>
          </div>
        </div>
        <div className="hidden sm:flex gap-1.5">
          {[["campaigns","Campaigns"],["qr-codes","QR Codes"],["reviews","Reviews"],["feedback","Feedback"]].map(([type,label]) => (
            <Button key={type} size="sm" variant="outline" onClick={() => exportCsv(type)} className="text-xs">
              <Download className="h-3 w-3 mr-1" />{label}
            </Button>
          ))}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns &amp; QR Codes</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="auto-reply">Review Auto-Reply</TabsTrigger>
          <TabsTrigger value="queue">Approval Queue</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><OverviewTab /></TabsContent>
        <TabsContent value="campaigns" className="mt-4"><CampaignsTab /></TabsContent>
        <TabsContent value="locations" className="mt-4"><LocationsTab /></TabsContent>
        <TabsContent value="auto-reply" className="mt-4"><ReviewReplyView /></TabsContent>
        <TabsContent value="queue" className="mt-4"><QueueTab /></TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Overview ───

function OverviewTab() {
  const [data, setData] = useState<Dashboard | null>(null)

  useEffect(() => {
    fetch("/api/digital-qr/dashboard").then(r => r.json()).then(setData).catch(() => setData(null))
  }, [])

  if (!data) return <Skeleton className="h-96 rounded-xl" />

  const cards: Array<[string, number | null | undefined, string]> = [
    ["Total QR Scans", data.kpis.totalScans, ""],
    ["Unique Scans", data.kpis.uniqueScans, ""],
    ["Active Campaigns", data.kpis.activeCampaigns, ""],
    ["Review Sessions Started", data.kpis.reviewSessionsStarted, ""],
    ["Ratings Selected", data.kpis.ratingsSelected, ""],
    ["AI Generations", data.kpis.aiGenerations, ""],
    ["Suggestions Selected", data.kpis.suggestionsSelected, ""],
    ["Reviews Confirmed", data.kpis.reviewsConfirmed, ""],
    ["Google Review Clicks", data.kpis.googleClicks, ""],
    ["Pending Feedback", data.kpis.pendingFeedback, ""],
    ["Resolved Feedback", data.kpis.resolvedFeedback, ""],
    ["Average Rating", data.kpis.averageRating, data.kpis.averageRating ? "/5" : ""],
    ["Review Conversion", data.kpis.reviewConversion, "%"],
  ]

  return (
    <div className="space-y-5">
      <GoogleBusinessCard />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(([label, value, suffix]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-stone-500">{label}</p>
              <p className="text-2xl font-bold text-stone-900 mt-1">{value ?? "—"}{value != null ? suffix : ""}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" />Conversion Funnel</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.funnel.map(step => (
            <div key={step.stage} className="flex items-center gap-3">
              <div className="w-48 text-xs text-stone-600 shrink-0">{step.stage}</div>
              <div className="flex-1 h-6 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, step.pct)}%` }} />
              </div>
              <div className="w-24 text-right text-xs font-semibold text-stone-700 shrink-0">{step.count} · {step.pct}%</div>
            </div>
          ))}
          <p className="text-[11px] text-stone-400 pt-2">
            AI selection rate {data.rates.aiSelectionRate}% · Edit rate {data.rates.editRate}% · Confirmation rate {data.rates.confirmationRate}%
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

type GoogleBusinessStatus = {
  ready: boolean; connected: boolean; email: string | null; accountName: string | null
  status: "CONNECTED" | "ERROR" | "DISCONNECTED" | null; lastError: string | null; lastSyncAt: string | null
}

/**
 * Connect a real Google account for average-rating / review-count data.
 *
 * Connecting always succeeds if the OAuth grant does — that only proves the
 * account is real, not that Google has approved this platform's separate,
 * manually-reviewed Business Profile API access request. Both states are
 * shown honestly rather than one being papered over as the other.
 */
function GoogleBusinessCard() {
  const [status, setStatus] = useState<GoogleBusinessStatus | null>(null)
  const [busy, setBusy] = useState(false)

  const load = () => fetch("/api/google-business/status").then(r => r.json()).then(setStatus).catch(() => setStatus(null))
  useEffect(() => { load() }, [])

  useEffect(() => {
    const flag = new URLSearchParams(window.location.search).get("googleBusiness")
    if (!flag) return
    if (flag === "connected") toast.success("Google account connected")
    else toast.error(`Could not connect: ${flag.replace(/_/g, " ")}`)
    window.history.replaceState({}, "", window.location.pathname)
    load()
  }, [])

  async function connect() {
    setBusy(true)
    try {
      const res = await fetch("/api/google-business/connect").then(r => r.json())
      if (res.url) window.location.href = res.url
      else toast.error(res.error || "Could not start Google connect")
    } finally {
      setBusy(false)
    }
  }

  async function disconnect() {
    setBusy(true)
    try {
      await fetch("/api/google-business/disconnect", { method: "POST" })
      toast.success("Disconnected")
      load()
    } finally {
      setBusy(false)
    }
  }

  if (!status) return null

  return (
    <Card>
      <CardContent className="p-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Star className="h-5 w-5 text-amber-500 mt-0.5" />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-stone-900">Google Business Profile</p>
              {status.connected ? (
                status.status === "ERROR"
                  ? <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700">Connected · pending Google approval</Badge>
                  : <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700">Connected</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-stone-100 text-stone-500">Not connected</Badge>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-0.5 max-w-lg">
              {status.connected
                ? status.status === "ERROR"
                  ? (status.lastError || "Signed in, but Google's Business Profile API has not approved this platform's access request yet. Locations and ratings will appear once it does.")
                  : `Signed in as ${status.email || status.accountName || "a Google account"}. Link a location on a campaign to pull its real rating.`
                : "Connect a Google account to pull real average rating and review count onto this dashboard. This never fills in the review link itself — Google does not expose that via any API."}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {status.connected ? (
            <Button size="sm" variant="ghost" onClick={disconnect} disabled={busy}>
              <Unlink className="h-3.5 w-3.5 mr-1.5" />Disconnect
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={connect} disabled={busy || !status.ready}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Link2 className="h-3.5 w-3.5 mr-1.5" />}
              Connect Google account
            </Button>
          )}
        </div>
        {!status.ready && !status.connected && (
          <p className="text-[11px] text-amber-600 w-full">Google OAuth is not configured on the server yet — ask an operator to set it up under Settings → Appointments &amp; Google Meet.</p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Campaigns & QR Codes ───

function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [googleUrl, setGoogleUrl] = useState("")
  const [locationId, setLocationId] = useState("")
  const [locations, setLocations] = useState<QrLocation[]>([])
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState<Campaign | null>(null)

  const load = () => fetch("/api/qr-campaigns").then(r => r.json()).then(d => setCampaigns(d.campaigns || [])).catch(() => setCampaigns([]))
  useEffect(() => {
    load()
    fetch("/api/qr-locations").then(r => r.json()).then(d => setLocations(d.locations || [])).catch(() => {})
  }, [])

  const create = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/qr-campaigns", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, googleReviewUrl: googleUrl || undefined, locationId: locationId || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not create campaign")
      toast.success("Campaign created")
      setCreating(false); setName(""); setGoogleUrl(""); setLocationId("")
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create campaign")
    } finally {
      setSaving(false)
    }
  }

  const setStatus = async (id: string, status: string) => {
    await fetch(`/api/qr-campaigns/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    })
    load()
  }

  if (!campaigns) return <Skeleton className="h-72 rounded-xl" />

  if (campaigns.length === 0 && !creating) {
    return (
      <Card><CardContent className="p-10 text-center">
        <QrCode className="h-10 w-10 text-stone-300 mx-auto mb-3" />
        <h3 className="font-semibold text-stone-900">No QR campaigns yet</h3>
        <p className="text-sm text-stone-500 mt-1 mb-4">Create your first QR campaign to start collecting customer feedback and reviews.</p>
        <Button onClick={() => setCreating(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1.5" />Create QR Campaign</Button>
      </CardContent></Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1.5" />New Campaign</Button>
      </div>

      {creating && (
        <Card><CardContent className="p-4 space-y-3">
          <Input placeholder="Campaign name, e.g. Main Branch — Table Reviews" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Google review link (paste your Business Profile 'write a review' URL)" value={googleUrl} onChange={e => setGoogleUrl(e.target.value)} />
          {locations.length > 0 && (
            <select
              value={locationId}
              onChange={e => setLocationId(e.target.value)}
              className="w-full h-9 px-3 text-sm rounded-lg border border-stone-200 bg-white"
            >
              <option value="">No location (single-branch business)</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
          <div className="flex gap-2">
            <Button onClick={create} disabled={saving || !name.trim()} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </CardContent></Card>
      )}

      <div className="grid gap-3">
        {campaigns.map(c => (
          <Card key={c.id} className="cursor-pointer hover:border-emerald-300" onClick={() => setOpen(c)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-stone-900">{c.name}</p>
                  <Badge className={c.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-600"}>{c.status}</Badge>
                  {c.locationName && <Badge variant="outline" className="text-[10px]"><MapPin className="h-2.5 w-2.5 mr-1" />{c.locationName}</Badge>}
                </div>
                <p className="text-xs text-stone-500 mt-0.5">{c.qrCodeCount} QR code{c.qrCodeCount === 1 ? "" : "s"} · {c.sessionCount} sessions · {c.ratingThreshold}★+ goes to Google</p>
              </div>
              <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                {c.status !== "ACTIVE" && <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "ACTIVE")}>Activate</Button>}
                {c.status === "ACTIVE" && <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "PAUSED")}>Pause</Button>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {open && <CampaignDetail campaign={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

/** Links a campaign to a connected Google location, and shows/refreshes its real rating. */
function CampaignGoogleLink({ campaign: initial }: { campaign: Campaign }) {
  const [campaign, setCampaign] = useState(initial)
  const [options, setOptions] = useState<GoogleLocationOption[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    fetch("/api/google-business/locations").then(async r => {
      const data = await r.json()
      if (!r.ok) { setLoadError(data.error || "Could not load Google locations"); return }
      setOptions(data.locations || [])
    }).catch(() => setLoadError("Could not reach Google"))
  }, [])

  async function pick(id: string) {
    const match = options?.find(o => o.id === id) || null
    const res = await fetch(`/api/qr-campaigns/${campaign.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googleLocationId: match?.id || null, googleLocationName: match?.name || null }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || "Could not link location"); return }
    setCampaign(data.campaign)
  }

  async function sync() {
    setSyncing(true)
    try {
      const res = await fetch("/api/google-business/sync", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: campaign.id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Sync failed"); return }
      toast.success("Rating synced from Google")
      setCampaign({ ...campaign, googleAverageRating: data.averageRating, googleReviewCount: data.reviewCount, googleRatingSyncedAt: new Date().toISOString(), googleSyncError: null })
    } finally {
      setSyncing(false)
    }
  }

  // No account connected at all — nothing to link yet, and no point showing a dead picker.
  if (loadError && !campaign.googleLocationId) {
    return (
      <div className="rounded-lg border border-dashed border-stone-200 p-3 text-xs text-stone-500">
        Connect a Google account on the Overview tab to link this campaign to a real location.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-stone-200 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-stone-700">Google location</span>
        {campaign.googleLocationId && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={sync} disabled={syncing}>
            {syncing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}Sync rating
          </Button>
        )}
      </div>
      <select
        value={campaign.googleLocationId || ""}
        onChange={e => pick(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border bg-white text-sm"
        disabled={!options}
      >
        <option value="">Not linked</option>
        {options?.map(o => <option key={o.id} value={o.id}>{o.name}{o.address ? ` — ${o.address}` : ""}</option>)}
      </select>
      {campaign.googleLocationId && (
        campaign.googleSyncError ? (
          <p className="text-[11px] text-amber-600">{campaign.googleSyncError}</p>
        ) : campaign.googleRatingSyncedAt ? (
          <p className="text-[11px] text-stone-500">
            <Star className="h-3 w-3 inline text-amber-500 mr-1" />
            {campaign.googleAverageRating?.toFixed(1)}/5 from {campaign.googleReviewCount} Google reviews · synced {new Date(campaign.googleRatingSyncedAt).toLocaleDateString()}
          </p>
        ) : (
          <p className="text-[11px] text-stone-400">Not synced yet — click Sync rating.</p>
        )
      )}
    </div>
  )
}

function CampaignDetail({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const [codes, setCodes] = useState<QrCodeRow[] | null>(null)
  const [label, setLabel] = useState("")
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<QrCodeRow | null>(null)

  const load = () => fetch(`/api/qr-campaigns/${campaign.id}/qr-codes`).then(r => r.json()).then(d => setCodes(d.qrCodes || []))
  useEffect(() => { load() }, [])

  const createCode = async () => {
    if (!label.trim()) return
    setCreating(true)
    try {
      const res = await fetch(`/api/qr-campaigns/${campaign.id}/qr-codes`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not create QR code")
      toast.success("QR code created")
      setLabel(""); load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create QR code")
    } finally {
      setCreating(false)
    }
  }

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/r/${token}`
    navigator.clipboard.writeText(url).then(() => toast.success("Link copied")).catch(() => toast.error(`Could not copy — the link is ${url}`))
  }

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{campaign.name}</DialogTitle></DialogHeader>

        <div className="space-y-3">
          <CampaignGoogleLink campaign={campaign} />

          <div className="flex gap-2">
            <Input placeholder="New QR placement, e.g. Table 01, Receipt" value={label} onChange={e => setLabel(e.target.value)} />
            <Button onClick={createCode} disabled={creating || !label.trim()} className="bg-emerald-600 hover:bg-emerald-700 shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {!codes ? <Skeleton className="h-32 rounded-xl" /> : codes.length === 0 ? (
            <p className="text-sm text-stone-500 py-6 text-center">No QR codes yet — add a placement above.</p>
          ) : (
            <div className="space-y-2">
              {codes.map(c => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-stone-200 p-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{c.label}</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      <ScanLine className="h-3 w-3 inline mr-1" />{c.scans} scans ({c.uniqueScans} unique) · {c.reviewSessions} sessions · {c.googleClicks} Google clicks · {c.conversion}% conversion
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => setViewing(c)}><QrCodeIcon className="h-3.5 w-3.5 mr-1" />View QR</Button>
                    <a href={`/design/${c.id}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="text-xs"><Printer className="h-3.5 w-3.5 mr-1" />Design</Button>
                    </a>
                    <Button size="sm" variant="ghost" onClick={() => copyLink(c.token)}><Copy className="h-3.5 w-3.5" /></Button>
                    <a href={`/r/${c.token}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost"><ExternalLink className="h-3.5 w-3.5" /></Button>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
      {viewing && <QrImageDialog qrCode={viewing} onClose={() => setViewing(null)} />}
    </Dialog>
  )
}

// ─── Plain QR viewer ───

function QrImageDialog({ qrCode, onClose }: { qrCode: QrCodeRow; onClose: () => void }) {
  const src = `/api/qr-codes/${qrCode.id}/image`
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{qrCode.label}</DialogTitle></DialogHeader>
        <div className="flex flex-col items-center gap-3 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`QR code for ${qrCode.label}`} className="w-56 h-56 border border-stone-200 rounded-lg" />
          <p className="text-xs text-stone-500 break-all text-center">/r/{qrCode.token}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4 mr-1.5" />Close</Button>
          <a href={src} download={`qr-${qrCode.label}.png`}>
            <Button className="bg-emerald-600 hover:bg-emerald-700"><Download className="h-4 w-4 mr-1.5" />Download PNG</Button>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Locations ───

function LocationsTab() {
  const [locations, setLocations] = useState<QrLocation[] | null>(null)
  const [stats, setStats] = useState<LocationStat[] | null>(null)
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = () => {
    fetch("/api/qr-locations").then(r => r.json()).then(d => setLocations(d.locations || [])).catch(() => setLocations([]))
    fetch("/api/digital-qr/locations").then(r => r.json()).then(d => setStats(d.locations || [])).catch(() => setStats([]))
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/qr-locations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address: address || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not add location")
      toast.success("Location added")
      setCreating(false); setName(""); setAddress("")
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add location")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm("Remove this location? Campaigns using it are kept, just un-grouped.")) return
    await fetch(`/api/qr-locations/${id}`, { method: "DELETE" })
    load()
  }

  if (!locations || !stats) return <Skeleton className="h-72 rounded-xl" />

  return (
    <div className="space-y-5">
      {locations.length === 0 && !creating ? (
        <Card><CardContent className="p-10 text-center">
          <MapPin className="h-10 w-10 text-stone-300 mx-auto mb-3" />
          <h3 className="font-semibold text-stone-900">No locations added</h3>
          <p className="text-sm text-stone-500 mt-1 mb-4">
            Single-branch business? You don&apos;t need this — campaigns work fine with no location.
            Add locations here only if you want branch-by-branch comparison.
          </p>
          <Button onClick={() => setCreating(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1.5" />Add a Location</Button>
        </CardContent></Card>
      ) : (
        <>
          <div className="flex justify-end">
            <Button onClick={() => setCreating(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1.5" />New Location</Button>
          </div>

          {creating && (
            <Card><CardContent className="p-4 space-y-3">
              <Input placeholder="Location name, e.g. Muscat — Main Branch" value={name} onChange={e => setName(e.target.value)} />
              <Input placeholder="Address (optional)" value={address} onChange={e => setAddress(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={create} disabled={saving || !name.trim()} className="bg-emerald-600 hover:bg-emerald-700">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                </Button>
                <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
              </div>
            </CardContent></Card>
          )}

          <div className="grid gap-2">
            {locations.map(l => (
              <Card key={l.id}>
                <CardContent className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-stone-900 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-emerald-600" />{l.name}</p>
                    {l.address && <p className="text-xs text-stone-500 mt-0.5">{l.address}</p>}
                    <p className="text-[11px] text-stone-400 mt-0.5">{l.campaignCount} campaign{l.campaignCount === 1 ? "" : "s"}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => remove(l.id)}><Trash2 className="h-3.5 w-3.5 text-rose-500" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" />Branch Comparison</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
                <th className="py-2 pr-3">Location</th>
                <th className="py-2 pr-3 text-right">Scans</th>
                <th className="py-2 pr-3 text-right">Unique</th>
                <th className="py-2 pr-3 text-right">Sessions</th>
                <th className="py-2 pr-3 text-right">Google Clicks</th>
                <th className="py-2 pr-3 text-right">Private Feedback</th>
                <th className="py-2 text-right">Avg Rating</th>
              </tr>
            </thead>
            <tbody>
              {stats.length === 0 ? (
                <tr><td colSpan={7} className="py-6 text-center text-stone-400">No data yet</td></tr>
              ) : stats.map(s => (
                <tr key={s.id} className="border-b border-stone-100 last:border-0">
                  <td className="py-2 pr-3 font-medium text-stone-800">{s.name}</td>
                  <td className="py-2 pr-3 text-right">{s.scans}</td>
                  <td className="py-2 pr-3 text-right">{s.uniqueScans}</td>
                  <td className="py-2 pr-3 text-right">{s.sessions}</td>
                  <td className="py-2 pr-3 text-right">{s.googleClicks}</td>
                  <td className="py-2 pr-3 text-right">{s.privateFeedback}</td>
                  <td className="py-2 text-right">{s.averageRating ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Approval Queue ───

function QueueTab() {
  const [items, setItems] = useState<Feedback[] | null>(null)

  const load = () => fetch("/api/private-feedback").then(r => r.json()).then(d => setItems(d.feedback || [])).catch(() => setItems([]))
  useEffect(() => { load() }, [])

  const setStatus = async (id: string, status: string) => {
    await fetch(`/api/private-feedback/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    })
    load()
  }

  if (!items) return <Skeleton className="h-72 rounded-xl" />

  if (items.length === 0) {
    return (
      <Card><CardContent className="p-10 text-center">
        <MessageSquareWarning className="h-10 w-10 text-stone-300 mx-auto mb-3" />
        <h3 className="font-semibold text-stone-900">No private feedback yet</h3>
        <p className="text-sm text-stone-500 mt-1">Ratings below the Google threshold will show up here instead of being sent to a public review.</p>
      </CardContent></Card>
    )
  }

  return (
    <div className="space-y-2">
      {items.map(f => (
        <Card key={f.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < f.rating ? "text-amber-400 fill-amber-400" : "text-stone-200"}`} />
                  ))}
                  <Badge variant="outline" className="text-[10px]">{f.campaign} · {f.qrLabel}</Badge>
                  <Badge className={
                    f.status === "NEW" ? "bg-rose-100 text-rose-700" :
                    f.status === "RESOLVED" || f.status === "CLOSED" ? "bg-emerald-100 text-emerald-700" :
                    "bg-amber-100 text-amber-700"
                  }>{f.status}</Badge>
                </div>
                {f.feedbackText && <p className="text-sm text-stone-700">{f.feedbackText}</p>}
                {(f.contactPhone || f.wantsCallback) && (
                  <p className="text-xs text-stone-500 mt-1">{f.contactPhone}{f.wantsCallback ? " · wants a callback" : ""}</p>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                {f.status !== "RESOLVED" && <Button size="sm" variant="outline" onClick={() => setStatus(f.id, "RESOLVED")}>Resolve</Button>}
                {f.status === "NEW" && <Button size="sm" variant="outline" onClick={() => setStatus(f.id, "IN_PROGRESS")}>Start</Button>}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
