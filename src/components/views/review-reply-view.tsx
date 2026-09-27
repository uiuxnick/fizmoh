"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Loader2, Save, Sparkles, AlertTriangle, Check, RefreshCw, X, Pencil,
  Star, Clock, TrendingUp, Store, MessageSquare, Plus, Trash2, Wand2,
  Tag, RotateCcw,
} from "lucide-react"

/**
 * Review Auto-Reply — Digital QR Addons.
 *
 * Three sub-tabs mirroring the rest of this module's own tab pattern:
 * Settings, Inbox, Analytics. Every number and every review here is real —
 * fetched from /api/review-reply/*, nothing sample or hardcoded.
 */

export interface KeywordReplacement {
  search: string
  replace: string
}

export interface ReviewReplyTemplates {
  customPrompt?: string
  premiumKeywords?: string[]
  keywordReplacements?: KeywordReplacement[]
  autoKeywordsEnabled?: boolean
}

interface Settings {
  enabled: boolean; mode: string; tone: string; customTone: string | null; replyLength: string
  delayMode: string; delayMinutes: number | null; businessHoursStart: string | null; businessHoursEnd: string | null; timezone: string
  autoPublishMinRating: number; requireApprovalBelow: number
  escalationKeywords: string[]; signature: string | null; languages: string[]; excludedWords: string[]; maxRepliesPerDay: number
  templates?: ReviewReplyTemplates | null
}

const PRESETS = {
  oudWorld: {
    label: "👑 Oud & Luxury Fragrances (Oud World)",
    customPrompt:
      "You are the hospitality and fragrance concierge for {{location_name}}. Thank {{reviewer_name}} with authentic warmth, grace, and sophistication. Celebrate their sensory journey with our pure oud, bespoke perfumes, and oriental attars. Seamlessly weave in relevant keywords ({{premium_keywords}}) when appropriate, and invite them back to experience our curated fragrance collections.",
    premiumKeywords: [
      "pure oud",
      "luxury fragrances",
      "royal attar",
      "oriental perfumes",
      "bespoke scents",
      "niche perfumery",
      "signature oud blends",
    ],
    keywordReplacements: [
      { search: "product", replace: "luxury fragrance" },
      { search: "products", replace: "luxury fragrances" },
      { search: "shop", replace: "perfume boutique" },
      { search: "store", replace: "perfume boutique" },
      { search: "perfume", replace: "artisan fragrance" },
      { search: "perfumes", replace: "artisan fragrances" },
      { search: "service", replace: "warm hospitality" },
      { search: "item", replace: "luxury fragrance" },
      { search: "items", replace: "luxury fragrances" },
    ],
    signature: "— The {{location_name}} Team",
    tone: "luxury",
  },
  dining: {
    label: "🍽️ Fine Dining & Restaurants",
    customPrompt:
      "You represent {{location_name}}. Warmly thank {{reviewer_name}} for dining with us. Acknowledge their compliments on our culinary craft, ambiance, and hospitality, naturally incorporating {{premium_keywords}}.",
    premiumKeywords: [
      "culinary excellence",
      "fresh artisanal dishes",
      "signature flavors",
      "warm ambiance",
    ],
    keywordReplacements: [
      { search: "food", replace: "culinary creations" },
      { search: "staff", replace: "hospitality team" },
      { search: "shop", replace: "establishment" },
      { search: "store", replace: "establishment" },
    ],
    signature: "— The {{location_name}} Team",
    tone: "warm",
  },
  retail: {
    label: "🛍️ Luxury Retail & Boutique",
    customPrompt:
      "You represent {{location_name}}. Respond gracefully to {{reviewer_name}}, highlighting our dedication to craft, premium quality, and personalized customer care. Incorporate {{premium_keywords}} seamlessly.",
    premiumKeywords: [
      "premium craftsmanship",
      "curated collections",
      "personalized service",
      "exceptional quality",
    ],
    keywordReplacements: [
      { search: "item", replace: "curated piece" },
      { search: "items", replace: "curated collection" },
      { search: "store", replace: "boutique" },
      { search: "shop", replace: "boutique" },
    ],
    signature: "— The {{location_name}} Team",
    tone: "luxury",
  },
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
  const [syncing, setSyncing] = useState(false)
  const [previewText, setPreviewText] = useState("Amazing collection of pure oud and perfumes! Very courteous staff.")
  const [previewRating, setPreviewRating] = useState(5)
  const [previewLocation, setPreviewLocation] = useState("OUD WORLD RUWI MUSCAT OMAN")
  const [previewReviewer, setPreviewReviewer] = useState("Zubair Ahmed")
  const [previewResult, setPreviewResult] = useState<{ reply?: string; escalation?: { escalate: boolean; reason: string | null }; error?: string } | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [newKeyword, setNewKeyword] = useState("")

  const load = () => fetch("/api/review-reply/settings").then(r => r.json()).then(d => setSettings(d.settings))
  useEffect(() => { load() }, [])

  if (!settings) return <Skeleton className="h-96 rounded-xl" />

  function patch(p: Partial<Settings>) {
    setSettings(s => s ? { ...s, ...p } : s)
  }

  const templates: ReviewReplyTemplates = (settings.templates && typeof settings.templates === "object") ? settings.templates : {}

  function patchTemplates(p: Partial<ReviewReplyTemplates>) {
    setSettings(s => {
      if (!s) return s
      const current = (s.templates && typeof s.templates === "object") ? s.templates : {}
      return {
        ...s,
        templates: {
          ...current,
          ...p,
        },
      }
    })
  }

  function applyPreset(key: keyof typeof PRESETS) {
    const p = PRESETS[key]
    patch({
      tone: p.tone,
      signature: p.signature,
      templates: {
        ...templates,
        customPrompt: p.customPrompt,
        premiumKeywords: p.premiumKeywords,
        keywordReplacements: p.keywordReplacements,
        autoKeywordsEnabled: true,
      },
    })
    toast.success(`Applied ${p.label} preset! Click "Save settings" when ready.`)
  }

  function insertVariable(varTag: string) {
    const cur = templates.customPrompt || ""
    patchTemplates({ customPrompt: cur ? `${cur} ${varTag}` : varTag })
  }

  function addKeyword() {
    const trimmed = newKeyword.trim()
    if (!trimmed) return
    const current = templates.premiumKeywords || []
    if (current.includes(trimmed)) {
      setNewKeyword("")
      return
    }
    patchTemplates({ premiumKeywords: [...current, trimmed] })
    setNewKeyword("")
  }

  function removeKeyword(kw: string) {
    const current = templates.premiumKeywords || []
    patchTemplates({ premiumKeywords: current.filter(k => k !== kw) })
  }

  function addReplacementRule() {
    const current = templates.keywordReplacements || []
    patchTemplates({ keywordReplacements: [...current, { search: "", replace: "" }] })
  }

  function updateReplacementRule(index: number, field: "search" | "replace", val: string) {
    const current = [...(templates.keywordReplacements || [])]
    if (!current[index]) return
    current[index] = { ...current[index], [field]: val }
    patchTemplates({ keywordReplacements: current })
  }

  function removeReplacementRule(index: number) {
    const current = (templates.keywordReplacements || []).filter((_, i) => i !== index)
    patchTemplates({ keywordReplacements: current })
  }

  async function syncNow() {
    setSyncing(true)
    toast.info("Fetching latest reviews and running AI auto-reply...")
    try {
      const res = await fetch("/api/review-reply/sync", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Sync failed")
      const s = data.stats || {}
      toast.success(`Done! Fetched ${s.fetched || 0} reviews, generated ${s.generated || 0} AI replies, published ${s.published || 0}.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed")
    } finally {
      setSyncing(false)
    }
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
          reviewerName: previewReviewer || "A customer",
          locationName: previewLocation || "OUD WORLD RUWI MUSCAT OMAN",
          businessName: previewLocation || "OUD WORLD RUWI MUSCAT OMAN",
          tone: settings.tone, customTone: settings.customTone, replyLength: settings.replyLength,
          language: settings.languages[0] || "en", signature: settings.signature,
          excludedWords: settings.excludedWords, escalationKeywords: settings.escalationKeywords,
          customPrompt: templates.customPrompt,
          premiumKeywords: templates.premiumKeywords,
          keywordReplacements: templates.keywordReplacements,
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

  const keywordRules = templates.keywordReplacements || []
  const activeKeywords = templates.premiumKeywords || []

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-4">
      <div className="space-y-4">
        {/* Core Mode & Tone */}
        <Card>
          <CardHeader><CardTitle className="text-base">Auto-Reply Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={settings.enabled} onChange={e => patch({ enabled: e.target.checked })} className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500" />
              Enable auto-reply for this workspace
            </label>

            <div>
              <p className="text-xs font-medium text-stone-600 mb-1">Mode</p>
              <select value={settings.mode} onChange={e => patch({ mode: e.target.value })} className="w-full h-9 px-3 text-sm rounded-lg border border-stone-200 bg-white">
                <option value="MANUAL_APPROVAL">Manual approval — review and approve every reply with one click</option>
                <option value="DRAFT_ONLY">Draft only — generates AI replies, never publishes without review</option>
                <option value="AUTOMATIC">Automatic publishing — high ratings publish instantly without a click</option>
              </select>
              {settings.mode === "AUTOMATIC" && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-1.5 flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  Automatic mode publishes to Google without review for ratings at or above your threshold. 1-3 star reviews and escalated reviews always require approval.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-medium text-stone-600 mb-1">Tone</p>
                <select value={settings.tone} onChange={e => patch({ tone: e.target.value })} className="w-full h-9 px-3 text-sm rounded-lg border border-stone-200 bg-white">
                  {["luxury", "professional", "warm", "formal", "casual", "custom"].map(t => (
                    <option key={t} value={t}>{t === "luxury" ? "luxury (recommended for boutique brands)" : t}</option>
                  ))}
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
                placeholder="Describe the tone, e.g. 'refined luxury concierge for high-end Arabian perfumes and oud'"
                className="w-full text-sm border border-stone-200 rounded-lg p-2" rows={2}
              />
            )}
          </CardContent>
        </Card>

        {/* Dynamic Prompt & Premium Keywords */}
        <Card className="border-emerald-200 shadow-sm bg-gradient-to-b from-white to-emerald-50/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2 text-stone-900">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                Dynamic AI Prompt &amp; Premium SEO Keywords
              </CardTitle>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]">
                Brand Elevating
              </Badge>
            </div>
            <CardDescription className="text-xs text-stone-500">
              Personalize every review reply with your Google profile name, curated brand prompts, SEO keywords, and automatic vocabulary upgrades.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Quick Presets */}
            <div className="space-y-1.5 p-3 rounded-xl bg-stone-50 border border-stone-200/80">
              <p className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <Wand2 className="h-3.5 w-3.5 text-emerald-600" />
                Quick-Start Industry Presets:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map(key => (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => applyPreset(key)}
                    className="text-xs h-7 border-stone-300 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-800 bg-white"
                  >
                    {PRESETS[key].label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Prompt Template */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-700">Custom Brand Prompt Template</label>
                <span className="text-[11px] text-stone-400">Click a variable tag to insert</span>
              </div>

              {/* Variable Tag Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { tag: "{{location_name}}", desc: "e.g. OUD WORLD RUWI MUSCAT OMAN" },
                  { tag: "{{reviewer_name}}", desc: "Customer Name" },
                  { tag: "{{rating}}", desc: "1-5 Stars" },
                  { tag: "{{review_text}}", desc: "Customer Comment" },
                  { tag: "{{premium_keywords}}", desc: "SEO Keywords" },
                ].map(({ tag, desc }) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertVariable(tag)}
                    title={desc}
                    className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-stone-100 hover:bg-emerald-100 hover:text-emerald-800 text-stone-700 border border-stone-200 transition-colors"
                  >
                    <Tag className="h-2.5 w-2.5 opacity-60" />
                    {tag}
                  </button>
                ))}
              </div>

              <textarea
                value={templates.customPrompt || ""}
                onChange={e => patchTemplates({ customPrompt: e.target.value })}
                placeholder="e.g. You are the hospitality and fragrance concierge for {{location_name}}. Thank {{reviewer_name}} with authentic warmth, grace, and sophistication. Celebrate their sensory journey with our pure oud, bespoke perfumes, and oriental attars..."
                rows={4}
                className="w-full text-xs font-mono border border-stone-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 leading-relaxed"
              />
              <p className="text-[11px] text-stone-400">
                The AI will use your specific Google profile title for <code className="text-stone-600 bg-stone-100 px-1 rounded">{"{{location_name}}"}</code> rather than the platform workspace name.
              </p>
            </div>

            {/* Premium SEO Keywords */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-700">Premium SEO Keywords (Context-Aware Auto-Injection)</label>
                <span className="text-[11px] text-stone-400">{activeKeywords.length} active</span>
              </div>

              <div className="flex gap-2">
                <Input
                  value={newKeyword}
                  onChange={e => setNewKeyword(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addKeyword() } }}
                  placeholder="e.g. pure oud, luxury fragrances, bespoke attar (Press Enter)"
                  className="text-xs h-8"
                />
                <Button type="button" size="sm" onClick={addKeyword} variant="outline" className="h-8 text-xs shrink-0">
                  <Plus className="h-3 w-3 mr-1" /> Add Keyword
                </Button>
              </div>

              {activeKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-stone-50 border border-stone-200/60 max-h-28 overflow-y-auto">
                  {activeKeywords.map(kw => (
                    <Badge key={kw} variant="secondary" className="text-[11px] font-normal gap-1 bg-white border border-stone-200">
                      {kw}
                      <button
                        type="button"
                        onClick={() => removeKeyword(kw)}
                        className="hover:text-red-500 ml-0.5 text-stone-400"
                        title="Remove keyword"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Keyword Search & Replace Rules */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-stone-700">Keyword Auto-Search &amp; Replace (Case-Preserving)</label>
                  <p className="text-[11px] text-stone-400">
                    Automatically elevates common or generic words to premium brand vocabulary.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addReplacementRule}
                  className="h-7 text-xs gap-1 border-stone-200"
                >
                  <Plus className="h-3 w-3" /> Add Rule
                </Button>
              </div>

              {keywordRules.length === 0 ? (
                <p className="text-xs italic text-stone-400 bg-stone-50 p-2.5 rounded-lg border border-dashed border-stone-200 text-center">
                  No replacement rules configured. Click &quot;Add Rule&quot; or choose a preset above.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {keywordRules.map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={rule.search}
                        onChange={e => updateReplacementRule(idx, "search", e.target.value)}
                        placeholder="Search word (e.g. product)"
                        className="text-xs h-8 flex-1"
                      />
                      <span className="text-stone-400 text-xs font-bold">→</span>
                      <Input
                        value={rule.replace}
                        onChange={e => updateReplacementRule(idx, "replace", e.target.value)}
                        placeholder="Replace with (e.g. luxury fragrance)"
                        className="text-xs h-8 flex-1"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeReplacementRule(idx)}
                        className="h-8 w-8 text-stone-400 hover:text-red-500 hover:bg-red-50 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Timing */}
        <Card>
          <CardHeader><CardTitle className="text-base">Timing &amp; Schedule</CardTitle></CardHeader>
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

        {/* Rating & Keyword Rules */}
        <Card>
          <CardHeader><CardTitle className="text-base">Rating &amp; Safety Escalation Rules</CardTitle></CardHeader>
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
              <p className="text-[11px] text-stone-400 mt-1">Refunds, legal threats, safety issues, and discrimination are always escalated regardless of what is listed here.</p>
            </div>
          </CardContent>
        </Card>

        {/* Signature & Limits */}
        <Card>
          <CardHeader><CardTitle className="text-base">Signature &amp; Limits</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-stone-600">Signature</p>
                <button
                  type="button"
                  onClick={() => patch({ signature: "— The {{location_name}} Team" })}
                  className="text-[11px] text-emerald-700 hover:underline"
                >
                  Use &quot;— The {"{{location_name}}"} Team&quot;
                </button>
              </div>
              <Input
                value={settings.signature || ""}
                onChange={e => patch({ signature: e.target.value })}
                placeholder="Signature, e.g. '— The {{location_name}} Team'"
              />
            </div>
            <Input value={csv(settings.languages)} onChange={e => patch({ languages: parseCsv(e.target.value) })} placeholder="Reply languages, e.g. en, ar" />
            <Input value={csv(settings.excludedWords)} onChange={e => patch({ excludedWords: parseCsv(e.target.value) })} placeholder="Words the reply must never use" />
            <div>
              <p className="text-xs font-medium text-stone-600 mb-1">Maximum replies per day</p>
              <Input type="number" min={1} max={500} value={settings.maxRepliesPerDay} onChange={e => patch({ maxRepliesPerDay: Number(e.target.value) })} className="w-32" />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2">
          <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}Save settings
          </Button>
          <Button variant="outline" onClick={syncNow} disabled={syncing} className="gap-1.5 text-xs">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync &amp; Auto-Reply Now
          </Button>
        </div>
      </div>

      {/* Preview Card */}
      <Card className="h-fit sticky top-4 border-stone-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            Live Reply Preview
          </CardTitle>
          <CardDescription className="text-xs text-stone-400">
            Test how your dynamic prompt and keyword rules look before saving.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-stone-600">Location / Profile Name:</label>
            <Input
              value={previewLocation}
              onChange={e => setPreviewLocation(e.target.value)}
              placeholder="e.g. OUD WORLD RUWI MUSCAT OMAN"
              className="text-xs h-8 mt-1"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-stone-600">Reviewer Name:</label>
            <Input
              value={previewReviewer}
              onChange={e => setPreviewReviewer(e.target.value)}
              placeholder="e.g. Zubair Ahmed"
              className="text-xs h-8 mt-1"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-stone-600">Rating:</label>
            <select value={previewRating} onChange={e => setPreviewRating(Number(e.target.value))} className="w-full h-8 px-2 text-xs rounded-lg border border-stone-200 bg-white mt-1">
              {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} stars</option>)}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-stone-600">Customer Review Text:</label>
            <textarea
              value={previewText}
              onChange={e => setPreviewText(e.target.value)}
              className="w-full text-xs border border-stone-200 rounded-lg p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              rows={3}
              placeholder="Sample review text"
            />
          </div>

          <Button size="sm" variant="default" onClick={preview} disabled={previewing} className="w-full bg-emerald-600 hover:bg-emerald-700 text-xs">
            {previewing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
            Generate Live Test Reply
          </Button>

          {previewResult?.error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-2 rounded-lg">{previewResult.error}</p>}
          {previewResult?.escalation?.escalate && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">Would require approval: {previewResult.escalation.reason}</p>
          )}
          {previewResult?.reply && (
            <div className="space-y-1 pt-2">
              <span className="text-[11px] font-semibold text-emerald-800">Generated Reply:</span>
              <p className="text-xs bg-stone-50 border border-stone-200 rounded-lg p-2.5 whitespace-pre-wrap text-stone-800 leading-relaxed font-sans">
                {previewResult.reply}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Inbox ───

interface ReviewRow {
  id: string; status: string; rating: number; reviewerName: string | null; comment: string | null
  createTime: string; googleLocationId?: string; generatedText: string | null; editedText: string | null; finalText: string | null
  escalationReason: string | null; skipReason: string | null; failReason: string | null; retryCount: number
  publishedAt: string | null; alreadyRepliedOnGoogle: boolean
}

interface LocationOption {
  id: string
  name: string
  address: string | null
}

const STATUS_STYLE: Record<string, string> = {
  NEW: "bg-stone-100 text-stone-600", DRAFT: "bg-blue-50 text-blue-700", PENDING_APPROVAL: "bg-amber-50 text-amber-700",
  APPROVED: "bg-teal-50 text-teal-700", PUBLISHED: "bg-emerald-50 text-emerald-700", FAILED: "bg-red-50 text-red-700",
  SKIPPED: "bg-stone-100 text-stone-500", ESCALATED: "bg-orange-50 text-orange-700",
}

function InboxTab() {
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [selectedLocation, setSelectedLocation] = useState("")
  const [status, setStatus] = useState("")
  const [rows, setRows] = useState<ReviewRow[] | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [regeneratingAll, setRegeneratingAll] = useState(false)
  const [generatingAi, setGeneratingAi] = useState(false)

  useEffect(() => {
    fetch("/api/google-business/locations")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.locations)) {
          setLocations(d.locations)
        }
      })
      .catch(() => {})
  }, [])

  function load() {
    const params = new URLSearchParams({ page: String(page) })
    if (status) params.set("status", status)
    if (selectedLocation) params.set("locationId", selectedLocation)
    fetch(`/api/review-reply/reviews?${params}`).then(r => r.json()).then(d => {
      setRows(d.reviews || [])
      setTotalPages(d.totalPages || 1)
    }).catch(() => setRows([]))
  }
  useEffect(() => { load() }, [status, selectedLocation, page])

  async function act(id: string, action: "approve" | "retry" | "skip", text?: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/review-reply/reviews/${id}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Action failed")
      toast.success(action === "approve" ? "Published to Google" : action === "retry" ? "Retried" : "Skipped")
      setEditingId(null)
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
      toast.success("Reply saved as draft")
      setEditingId(null)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save edit")
    } finally {
      setBusyId(null)
    }
  }

  async function regenerateDraft(r: ReviewRow) {
    setBusyId(r.id)
    const locObj = locations.find(l => l.id.includes(r.googleLocationId || "") || (r.googleLocationId || "").includes(l.id))
    const locName = locObj ? locObj.name : "OUD WORLD RUWI MUSCAT OMAN"
    toast.info(`Regenerating draft for ${r.reviewerName || "customer"} using ${locName}...`)
    try {
      const res = await fetch(`/api/review-reply/reviews/${r.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "regenerate",
          locationName: locName,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Regeneration failed")
      toast.success("Draft updated with custom prompt & premium keywords!")
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Regeneration failed")
    } finally {
      setBusyId(null)
    }
  }

  async function generateAiForReview(r: ReviewRow) {
    setGeneratingAi(true)
    const locObj = locations.find(l => l.id.includes(r.googleLocationId || "") || (r.googleLocationId || "").includes(l.id))
    const locName = locObj ? locObj.name : "OUD WORLD RUWI MUSCAT OMAN"
    try {
      const res = await fetch("/api/review-reply/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewText: r.comment || "Great experience",
          rating: r.rating || 5,
          reviewerName: r.reviewerName || "Valued Customer",
          locationName: locName,
          businessName: locName,
        }),
      })
      const data = await res.json()
      if (data.reply) {
        setEditText(data.reply)
        toast.success("AI draft generated with brand tone & keywords")
      } else {
        toast.error(data.error || "Could not generate AI reply")
      }
    } catch {
      toast.error("AI generation failed")
    } finally {
      setGeneratingAi(false)
    }
  }

  async function syncNow() {
    setSyncing(true)
    const locObj = locations.find(l => l.id === selectedLocation)
    const locLabel = locObj ? locObj.name : "all locations"
    toast.info(`Fetching latest reviews for ${locLabel} and running AI auto-reply...`)
    try {
      const res = await fetch("/api/review-reply/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: selectedLocation || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Sync failed")
      const s = data.stats || {}
      toast.success(`Done! Fetched ${s.fetched || 0} reviews, generated ${s.generated || 0} AI replies, published ${s.published || 0}.`)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  async function regenerateAllDrafts() {
    const locObj = locations.find(l => l.id === selectedLocation)
    const locLabel = locObj ? locObj.name : "all connected locations"
    if (!confirm(`Are you sure you want to regenerate all unapproved review drafts for ${locLabel} using your latest custom prompt and premium keywords?`)) {
      return
    }

    setRegeneratingAll(true)
    toast.info(`Regenerating drafts for ${locLabel}...`)
    try {
      const res = await fetch("/api/review-reply/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: selectedLocation || undefined,
          regenerateDrafts: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Regeneration failed")
      const s = data.stats || {}
      toast.success(`Done! Regenerated ${s.generated || 0} drafts using custom prompt & keywords.`)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Regeneration failed")
    } finally {
      setRegeneratingAll(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Location Filter & Sync Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-stone-50 border border-stone-200 rounded-xl">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <Store className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-semibold text-stone-700 whitespace-nowrap">Google Profile:</span>
          <select
            value={selectedLocation}
            onChange={e => { setSelectedLocation(e.target.value); setPage(1) }}
            className="h-9 text-xs rounded-lg border border-stone-200 bg-white px-3 py-1 font-medium text-stone-800 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none flex-1 max-w-md truncate"
          >
            <option value="">All Connected Locations {locations.length ? `(${locations.length})` : ""}</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>
                {loc.name} {loc.address ? `(${loc.address})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={regenerateAllDrafts}
            disabled={regeneratingAll || syncing}
            className="gap-1.5 text-xs h-9 text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200"
            title="Re-run AI draft generation for all unapproved reviews using custom prompt & keywords"
          >
            {regeneratingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Regenerate Drafts
          </Button>

          <Button size="sm" variant="default" onClick={syncNow} disabled={syncing || regeneratingAll} className="gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-700">
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Sync &amp; Auto-Reply
          </Button>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {["", "PENDING_APPROVAL", "ESCALATED", "DRAFT", "APPROVED", "PUBLISHED", "FAILED", "SKIPPED"].map(s => (
            <Button key={s} size="sm" variant={status === s ? "default" : "outline"} className={status === s ? "bg-emerald-600 hover:bg-emerald-700 text-xs" : "text-xs"} onClick={() => { setStatus(s); setPage(1) }}>
              {s || "All"}
            </Button>
          ))}
        </div>
      </div>

      {!rows ? <Skeleton className="h-64 rounded-xl" /> : rows.length === 0 ? (
        <p className="text-sm text-stone-500 py-10 text-center">No reviews here.</p>
      ) : (
        <div className="space-y-3">
          {rows.map(r => {
            const locName = locations.find(l => l.id.includes(r.googleLocationId || "") || (r.googleLocationId || "").includes(l.id))?.name
            return (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-0.5 text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-400" : "text-stone-200"}`} />)}
                      </span>
                      <span className="text-xs text-stone-600 font-medium">{r.reviewerName || "Anonymous"} · {new Date(r.createTime).toLocaleDateString()}</span>
                      {locName && (
                        <Badge variant="outline" className="text-[10px] text-stone-500 border-stone-200 bg-stone-50">
                          {locName}
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${STATUS_STYLE[r.status] || ""}`}>{r.status.replace(/_/g, " ")}</Badge>
                  </div>

                  {r.comment ? (
                    <p className="text-sm text-stone-700 whitespace-pre-wrap">{r.comment}</p>
                  ) : (
                    <p className="text-xs italic text-stone-400">(Customer left a star rating with no comment)</p>
                  )}

                  {(r.escalationReason || r.skipReason || r.failReason) && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                      {r.escalationReason || r.skipReason || r.failReason}{r.retryCount ? ` · retried ${r.retryCount}x` : ""}
                    </p>
                  )}

                  {editingId === r.id ? (
                    <div className="space-y-2 pt-2 border-t border-stone-100">
                      <div className="flex items-center justify-between text-xs text-stone-500">
                        <span className="font-medium">Write or edit response:</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => generateAiForReview(r)}
                          disabled={generatingAi}
                          className="h-7 text-xs text-emerald-700 hover:text-emerald-800 gap-1"
                        >
                          {generatingAi ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          Generate with AI
                        </Button>
                      </div>
                      <textarea
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        className="w-full text-sm border border-stone-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        rows={3}
                        placeholder="Write your custom reply to this customer..."
                      />
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => act(r.id, "approve", editText)}
                          disabled={busyId === r.id || !editText.trim()}
                          className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1"
                        >
                          {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Save &amp; Publish to Google
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => saveEdit(r.id)}
                          disabled={busyId === r.id || !editText.trim()}
                          className="text-xs"
                        >
                          Save Draft
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                          className="text-xs text-stone-500"
                        >
                          <X className="h-3.5 w-3.5 mr-1" />Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    (r.finalText || r.generatedText) ? (
                      <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-medium text-stone-500">
                          <span className="flex items-center gap-1 text-emerald-700">
                            <MessageSquare className="h-3 w-3" />
                            {r.status === "PUBLISHED" ? "Published Response on Google" : r.alreadyRepliedOnGoogle ? "Response on Google" : "AI Reply Draft"}
                          </span>
                          {r.publishedAt && <span>{new Date(r.publishedAt).toLocaleString()}</span>}
                        </div>
                        <p className="text-sm text-stone-800 whitespace-pre-wrap">{r.finalText || r.generatedText}</p>
                      </div>
                    ) : null
                  )}

                  {editingId !== r.id && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditingId(r.id); setEditText(r.finalText || r.generatedText || "") }}
                        className="gap-1 text-xs"
                      >
                        <Pencil className="h-3 w-3" />
                        {(r.finalText || r.generatedText) ? (r.publishedAt || r.alreadyRepliedOnGoogle ? "Update Google Reply" : "Edit Reply") : "Write Manual Reply"}
                      </Button>

                      {!["PUBLISHED", "SKIPPED"].includes(r.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => regenerateDraft(r)}
                          disabled={busyId === r.id}
                          className="gap-1 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200"
                          title="Re-generate draft using your custom prompt and keywords"
                        >
                          {busyId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                          Regenerate AI Draft
                        </Button>
                      )}

                      {r.status === "FAILED" && (
                        <Button size="sm" onClick={() => act(r.id, "retry")} disabled={busyId === r.id} className="bg-emerald-600 hover:bg-emerald-700 text-xs">
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />Retry
                        </Button>
                      )}
                      {!["PUBLISHED", "SKIPPED", "FAILED"].includes(r.status) && (r.finalText || r.generatedText) && (
                        <Button size="sm" onClick={() => act(r.id, "approve")} disabled={busyId === r.id} className="bg-emerald-600 hover:bg-emerald-700 text-xs">
                          {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                          Approve &amp; publish
                        </Button>
                      )}
                      {!["PUBLISHED", "SKIPPED"].includes(r.status) && (
                        <Button size="sm" variant="ghost" onClick={() => act(r.id, "skip")} disabled={busyId === r.id} className="text-xs text-stone-500">
                          Skip
                        </Button>
                      )}
                    </div>
                  )}
                  {r.publishedAt && <p className="text-[11px] text-stone-400">Published to Google {new Date(r.publishedAt).toLocaleString()}</p>}
                  {r.alreadyRepliedOnGoogle && !r.publishedAt && <p className="text-[11px] text-stone-400">Already had a reply on Google before this platform saw it.</p>}
                </CardContent>
              </Card>
            )
          })}
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
