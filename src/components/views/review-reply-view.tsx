"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Loader2, Save, Sparkles, AlertTriangle, Check, RefreshCw, X, Pencil,
  Star, Clock, TrendingUp,
} from "lucide-react"

/**
 * Review Auto-Reply — Digital QR Addons.
 *
 * Three sub-tabs mirroring the rest of this module's own tab pattern:
 * Settings, Inbox, Analytics. Every number and every review here is real —
 * fetched from /api/review-reply/*, nothing sample or hardcoded.
 */

interface Settings {
  enabled: boolean; mode: string; tone: string; customTone: string | null; replyLength: string
  delayMode: string; delayMinutes: number | null; businessHoursStart: string | null; businessHoursEnd: string | null; timezone: string
  autoPublishMinRating: number; requireApprovalBelow: number
  escalationKeywords: string[]; signature: string | null; languages: string[]; excludedWords: string[]; maxRepliesPerDay: number
}

export default function ReviewReplyView() {
  const [tab, setTab] = useState("settings")
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="settings">Settings</TabsTrigger>
        <TabsTrigger value="inbox">Inbox</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>
      <TabsContent value="settings" className="mt-4"><SettingsTab /></TabsContent>
      <TabsContent value="inbox" className="mt-4"><InboxTab /></TabsContent>
      <TabsContent value="analytics" className="mt-4"><AnalyticsTab /></TabsContent>
    </Tabs>
  )
}

// ─── Settings ───

function SettingsTab() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saving, setSaving] = useState(false)
  const [previewText, setPreviewText] = useState("Amazing service, the staff were so friendly and the food was great!")
  const [previewRating, setPreviewRating] = useState(5)
  const [previewResult, setPreviewResult] = useState<{ reply?: string; escalation?: { escalate: boolean; reason: string | null }; error?: string } | null>(null)
  const [previewing, setPreviewing] = useState(false)

  const load = () => fetch("/api/review-reply/settings").then(r => r.json()).then(d => setSettings(d.settings))
  useEffect(() => { load() }, [])

  if (!settings) return <Skeleton className="h-96 rounded-xl" />

  function patch(p: Partial<Settings>) {
    setSettings(s => s ? { ...s, ...p } : s)
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch("/api/review-reply/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not save settings")
      setSettings(data.settings)
      toast.success("Settings saved")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save settings")
    } finally {
      setSaving(false)
    }
  }

  async function preview() {
    if (!settings) return
    setPreviewing(true)
    setPreviewResult(null)
    try {
      const res = await fetch("/api/review-reply/preview", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewText: previewText, rating: previewRating,
          tone: settings.tone, customTone: settings.customTone, replyLength: settings.replyLength,
          language: settings.languages[0] || "en", signature: settings.signature,
          excludedWords: settings.excludedWords, escalationKeywords: settings.escalationKeywords,
        }),
      })
      const data = await res.json()
      setPreviewResult(data)
    } catch {
      setPreviewResult({ error: "Could not reach the preview endpoint" })
    } finally {
      setPreviewing(false)
    }
  }

  const csv = (v: string[]) => v.join(", ")
  const parseCsv = (v: string) => v.split(",").map(s => s.trim()).filter(Boolean)

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-4">
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Auto-reply</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.enabled} onChange={e => patch({ enabled: e.target.checked })} className="h-4 w-4" />
              Enable auto-reply for this workspace
            </label>

            <div>
              <p className="text-xs font-medium text-stone-600 mb-1">Mode</p>
              <select value={settings.mode} onChange={e => patch({ mode: e.target.value })} className="w-full h-9 px-3 text-sm rounded-lg border border-stone-200 bg-white">
                <option value="MANUAL_APPROVAL">Manual approval — every reply needs a click before it posts</option>
                <option value="DRAFT_ONLY">Draft only — generates replies, never publishes on its own</option>
                <option value="AUTOMATIC">Automatic publishing — eligible ratings post without a click</option>
              </select>
              {settings.mode === "AUTOMATIC" && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-1.5 flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  Automatic mode publishes to Google without review, for ratings at or above the threshold below. 1-3 star reviews and anything flagged always still require approval. Only an owner or super admin can turn this on.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-medium text-stone-600 mb-1">Tone</p>
                <select value={settings.tone} onChange={e => patch({ tone: e.target.value })} className="w-full h-9 px-3 text-sm rounded-lg border border-stone-200 bg-white">
                  {["professional", "warm", "formal", "casual", "luxury", "custom"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs font-medium text-stone-600 mb-1">Reply length</p>
                <select value={settings.replyLength} onChange={e => patch({ replyLength: e.target.value })} className="w-full h-9 px-3 text-sm rounded-lg border border-stone-200 bg-white">
                  {["short", "medium", "detailed"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            {settings.tone === "custom" && (
              <textarea
                value={settings.customTone || ""} onChange={e => patch({ customTone: e.target.value })}
                placeholder="Describe the tone, e.g. 'like a boutique hotel concierge'"
                className="w-full text-sm border border-stone-200 rounded-lg p-2" rows={2}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Timing</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <select value={settings.delayMode} onChange={e => patch({ delayMode: e.target.value })} className="w-full h-9 px-3 text-sm rounded-lg border border-stone-200 bg-white">
              <option value="immediate">Reply immediately</option>
              <option value="delay">Delay by a fixed number of minutes</option>
              <option value="business_hours">Business hours only</option>
              <option value="custom_schedule">Custom schedule</option>
            </select>
            {settings.delayMode === "delay" && (
              <Input type="number" min={0} value={settings.delayMinutes ?? ""} onChange={e => patch({ delayMinutes: Number(e.target.value) })} placeholder="Delay in minutes" />
            )}
            {(settings.delayMode === "business_hours" || settings.delayMode === "custom_schedule") && (
              <div className="grid grid-cols-3 gap-2">
                <Input value={settings.businessHoursStart || ""} onChange={e => patch({ businessHoursStart: e.target.value })} placeholder="09:00" />
                <Input value={settings.businessHoursEnd || ""} onChange={e => patch({ businessHoursEnd: e.target.value })} placeholder="18:00" />
                <Input value={settings.timezone} onChange={e => patch({ timezone: e.target.value })} placeholder="Asia/Muscat" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Rating &amp; keyword rules</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-medium text-stone-600 mb-1">Auto-publish at/above (Automatic mode)</p>
                <select value={settings.autoPublishMinRating} onChange={e => patch({ autoPublishMinRating: Number(e.target.value) })} className="w-full h-9 px-3 text-sm rounded-lg border border-stone-200 bg-white">
                  {[3, 4, 5].map(n => <option key={n} value={n}>{n} stars</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs font-medium text-stone-600 mb-1">Always require approval below</p>
                <select value={settings.requireApprovalBelow} onChange={e => patch({ requireApprovalBelow: Number(e.target.value) })} className="w-full h-9 px-3 text-sm rounded-lg border border-stone-200 bg-white">
                  {[2, 3, 4, 5].map(n => <option key={n} value={n}>{n} stars</option>)}
                </select>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-stone-600 mb-1">Extra phrases that always require approval</p>
              <Input value={csv(settings.escalationKeywords)} onChange={e => patch({ escalationKeywords: parseCsv(e.target.value) })} placeholder="comma, separated, phrases" />
              <p className="text-[11px] text-stone-400 mt-1">Refunds, legal threats, safety issues and discrimination are always escalated regardless of what's listed here.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Reply content</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input value={settings.signature || ""} onChange={e => patch({ signature: e.target.value })} placeholder="Signature, e.g. '— The Oman Adventures Team'" />
            <Input value={csv(settings.languages)} onChange={e => patch({ languages: parseCsv(e.target.value) })} placeholder="Reply languages, e.g. en, ar" />
            <Input value={csv(settings.excludedWords)} onChange={e => patch({ excludedWords: parseCsv(e.target.value) })} placeholder="Words the reply must never use" />
            <div>
              <p className="text-xs font-medium text-stone-600 mb-1">Maximum replies per day</p>
              <Input type="number" min={1} max={500} value={settings.maxRepliesPerDay} onChange={e => patch({ maxRepliesPerDay: Number(e.target.value) })} className="w-32" />
            </div>
          </CardContent>
        </Card>

        <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}Save settings
        </Button>
      </div>

      <Card className="h-fit">
        <CardHeader><CardTitle className="text-base">Test a reply</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-[11px] text-stone-400">Test mode — this never touches Google or saves anything.</p>
          <select value={previewRating} onChange={e => setPreviewRating(Number(e.target.value))} className="w-full h-9 px-3 text-sm rounded-lg border border-stone-200 bg-white">
            {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} stars</option>)}
          </select>
          <textarea value={previewText} onChange={e => setPreviewText(e.target.value)} className="w-full text-sm border border-stone-200 rounded-lg p-2" rows={3} placeholder="Sample review text" />
          <Button size="sm" variant="outline" onClick={preview} disabled={previewing} className="w-full">
            {previewing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}Generate preview
          </Button>
          {previewResult?.error && <p className="text-xs text-red-600">{previewResult.error}</p>}
          {previewResult?.escalation?.escalate && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">Would require approval: {previewResult.escalation.reason}</p>
          )}
          {previewResult?.reply && <p className="text-sm bg-stone-50 border border-stone-200 rounded-lg p-2.5 whitespace-pre-wrap">{previewResult.reply}</p>}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Inbox ───

interface ReviewRow {
  id: string; status: string; rating: number; reviewerName: string | null; comment: string | null
  createTime: string; generatedText: string | null; editedText: string | null; finalText: string | null
  escalationReason: string | null; skipReason: string | null; failReason: string | null; retryCount: number
  publishedAt: string | null; alreadyRepliedOnGoogle: boolean
}

const STATUS_STYLE: Record<string, string> = {
  NEW: "bg-stone-100 text-stone-600", DRAFT: "bg-blue-50 text-blue-700", PENDING_APPROVAL: "bg-amber-50 text-amber-700",
  APPROVED: "bg-teal-50 text-teal-700", PUBLISHED: "bg-emerald-50 text-emerald-700", FAILED: "bg-red-50 text-red-700",
  SKIPPED: "bg-stone-100 text-stone-500", ESCALATED: "bg-orange-50 text-orange-700",
}

function InboxTab() {
  const [status, setStatus] = useState("")
  const [rows, setRows] = useState<ReviewRow[] | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  function load() {
    const params = new URLSearchParams({ page: String(page) })
    if (status) params.set("status", status)
    fetch(`/api/review-reply/reviews?${params}`).then(r => r.json()).then(d => { setRows(d.reviews || []); setTotalPages(d.totalPages || 1) })
  }
  useEffect(() => { load() }, [status, page])

  async function act(id: string, action: "approve" | "retry" | "skip", text?: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/review-reply/reviews/${id}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Action failed")
      toast.success(action === "approve" ? "Published to Google" : action === "retry" ? "Retried" : "Skipped")
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed")
    } finally {
      setBusyId(null)
    }
  }

  async function saveEdit(id: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/review-reply/reviews/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: editText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not save edit")
      toast.success("Reply updated")
      setEditingId(null)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save edit")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {["", "PENDING_APPROVAL", "ESCALATED", "DRAFT", "APPROVED", "PUBLISHED", "FAILED", "SKIPPED"].map(s => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} className={status === s ? "bg-emerald-600 hover:bg-emerald-700" : ""} onClick={() => { setStatus(s); setPage(1) }}>
            {s || "All"}
          </Button>
        ))}
      </div>

      {!rows ? <Skeleton className="h-64 rounded-xl" /> : rows.length === 0 ? (
        <p className="text-sm text-stone-500 py-10 text-center">No reviews here.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(r => (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-400" : "text-stone-200"}`} />)}
                    </span>
                    <span className="text-xs text-stone-500">{r.reviewerName || "Anonymous"} · {new Date(r.createTime).toLocaleDateString()}</span>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${STATUS_STYLE[r.status] || ""}`}>{r.status.replace(/_/g, " ")}</Badge>
                </div>

                {r.comment && <p className="text-sm text-stone-700">{r.comment}</p>}
                {(r.escalationReason || r.skipReason || r.failReason) && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    {r.escalationReason || r.skipReason || r.failReason}{r.retryCount ? ` · retried ${r.retryCount}x` : ""}
                  </p>
                )}

                {editingId === r.id ? (
                  <div className="space-y-1.5">
                    <textarea value={editText} onChange={e => setEditText(e.target.value)} className="w-full text-sm border border-stone-200 rounded-lg p-2" rows={3} />
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={() => saveEdit(r.id)} disabled={busyId === r.id} className="bg-emerald-600 hover:bg-emerald-700"><Check className="h-3.5 w-3.5 mr-1" />Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5 mr-1" />Cancel</Button>
                    </div>
                  </div>
                ) : (
                  (r.finalText || r.generatedText) && (
                    <p className="text-sm bg-stone-50 border border-stone-200 rounded-lg p-2.5 whitespace-pre-wrap">{r.finalText || r.generatedText}</p>
                  )
                )}

                {editingId !== r.id && !["PUBLISHED", "SKIPPED"].includes(r.status) && (r.finalText || r.generatedText) && (
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(r.id); setEditText(r.finalText || r.generatedText || "") }}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>
                    {r.status === "FAILED" ? (
                      <Button size="sm" onClick={() => act(r.id, "retry")} disabled={busyId === r.id} className="bg-emerald-600 hover:bg-emerald-700"><RefreshCw className="h-3.5 w-3.5 mr-1" />Retry</Button>
                    ) : (
                      <Button size="sm" onClick={() => act(r.id, "approve")} disabled={busyId === r.id} className="bg-emerald-600 hover:bg-emerald-700">
                        {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}Approve &amp; publish
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => act(r.id, "skip")} disabled={busyId === r.id}>Skip</Button>
                  </div>
                )}
                {r.publishedAt && <p className="text-[11px] text-stone-400">Published to Google {new Date(r.publishedAt).toLocaleString()}</p>}
                {r.alreadyRepliedOnGoogle && <p className="text-[11px] text-stone-400">Already had a reply on Google before this platform saw it.</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-xs text-stone-500">{page} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}

// ─── Analytics ───

interface Analytics {
  totalReviews: number; repliesGenerated: number; repliesPublished: number; repliesFailed: number
  escalated: number; pendingApproval: number; avgResponseMinutes: number | null; approvalRate: number | null
  byStarRating: { rating: number; count: number }[]
  publishedByDay: { date: string; count: number }[]
}

function AnalyticsTab() {
  const [data, setData] = useState<Analytics | null>(null)
  useEffect(() => { fetch("/api/review-reply/analytics").then(r => r.json()).then(setData).catch(() => setData(null)) }, [])
  if (!data) return <Skeleton className="h-96 rounded-xl" />

  const cards: Array<[string, number | string | null]> = [
    ["Total reviews", data.totalReviews],
    ["Replies generated", data.repliesGenerated],
    ["Replies published", data.repliesPublished],
    ["Failed", data.repliesFailed],
    ["Escalated", data.escalated],
    ["Pending approval", data.pendingApproval],
    ["Avg. response time", data.avgResponseMinutes != null ? `${data.avgResponseMinutes} min` : "—"],
    ["Approval rate", data.approvalRate != null ? `${data.approvalRate}%` : "—"],
  ]
  const maxDay = Math.max(1, ...data.publishedByDay.map(d => d.count))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-stone-500">{label}</p>
              <p className="text-2xl font-bold text-stone-900 mt-1">{value ?? "—"}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Star className="h-4 w-4" />Reviews by star rating</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[5, 4, 3, 2, 1].map(star => {
            const count = data.byStarRating.find(b => b.rating === star)?.count || 0
            const max = Math.max(1, ...data.byStarRating.map(b => b.count))
            return (
              <div key={star} className="flex items-center gap-3">
                <div className="w-14 text-xs text-stone-600 shrink-0">{star} star</div>
                <div className="flex-1 h-5 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                </div>
                <div className="w-10 text-right text-xs font-semibold text-stone-700 shrink-0">{count}</div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" />Published replies, last 30 days</CardTitle></CardHeader>
        <CardContent>
          {data.publishedByDay.length === 0 ? (
            <p className="text-sm text-stone-400 flex items-center gap-1.5"><Clock className="h-4 w-4" />No published replies yet.</p>
          ) : (
            <div className="flex items-end gap-1 h-24">
              {data.publishedByDay.map(d => (
                <div key={d.date} title={`${d.date}: ${d.count}`} className="flex-1 bg-emerald-500 rounded-t" style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: 2 }} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
