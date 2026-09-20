"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { TemplateBuilder, EMPTY_DRAFT, type TemplateDraft } from "@/components/views/template-builder"
import { WhatsAppPreview } from "@/components/whatsapp-preview"
import { FileText, Plus, Search, MessageCircle, Mail, CheckCircle, Clock, XCircle, Eye, Send, RefreshCw, Pencil } from "lucide-react"
import { AIDraftButton } from "@/components/views/ai-draft"

interface Template {
  id: string
  channel: string
  name: string
  category: string
  language: string
  type: string
  bodyContent: string
  headerType?: string
  headerContent?: string
  footerContent?: string
  rejectionReason?: string | null
  metaTemplateId?: string | null
  variables?: string
  buttons?: string
  emailSubject?: string
  status: string
  _count?: { campaigns: number }
  createdAt: string
}

const CATEGORY_COLORS: Record<string, string> = {
  MARKETING: "bg-amber-100 text-amber-700 border-amber-200",
  UTILITY: "bg-emerald-100 text-emerald-700 border-emerald-200",
  AUTHENTICATION: "bg-purple-100 text-purple-700 border-purple-200",
}

const STATUS_ICONS: Record<string, any> = {
  APPROVED: { icon: CheckCircle, color: "text-emerald-600" },
  PENDING: { icon: Clock, color: "text-amber-600" },
  DRAFT: { icon: FileText, color: "text-stone-500" },
  REJECTED: { icon: XCircle, color: "text-rose-600" },
}

export default function TemplatesView() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [channel, setChannel] = useState("all")
  const [showNew, setShowNew] = useState(false)
  const [preview, setPreview] = useState<Template | null>(null)
  const [builderDraft, setBuilderDraft] = useState<TemplateDraft | undefined>(undefined)
  const [syncing, setSyncing] = useState(false)

  // Meta approves or rejects asynchronously and never calls us back, so the
  // stored status is only as fresh as the last sync.
  const syncFromMeta = async () => {
    setSyncing(true)
    try {
      const res = await fetch("/api/whatsapp/templates/sync", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Sync failed")
      toast.success(`Synced ${data.synced} templates (${data.created} new, ${data.updated} updated)`)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  const editTemplate = (t: Template) => {
    const parseJson = (v: unknown) => {
      if (Array.isArray(v)) return v
      if (typeof v === "string") { try { return JSON.parse(v) } catch { return [] } }
      return []
    }
    setBuilderDraft({
      id: t.id,
      name: t.name,
      category: (t.category as any) || "UTILITY",
      language: t.language || "en_US",
      headerType: (t.headerType as any) || "NONE",
      headerContent: t.headerContent || "",
      bodyContent: t.bodyContent || "",
      footerContent: t.footerContent || "",
      buttons: parseJson((t as any).buttons),
      sampleValues: parseJson((t as any).variables),
      cards: parseJson((t as any).cards),
    })
    setShowNew(true)
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/templates${channel !== "all" ? `?channel=${channel}` : ""}`)
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch (e) {
      toast.error("Failed to load templates")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [channel])

  const filtered = templates.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.bodyContent.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>
            Templates
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">WhatsApp &amp; Email message templates</p>
        </div>
        <div className="flex gap-2">
          <AIDraftButton kind="template" onCreated={load} />
          <Button variant="outline" onClick={syncFromMeta} disabled={syncing}>
            <RefreshCw className={"h-4 w-4 mr-1.5 " + (syncing ? "animate-spin" : "")} />
            {syncing ? "Syncing…" : "Sync from Meta"}
          </Button>
          <Button onClick={() => { setBuilderDraft(undefined); setShowNew(true) }} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-1.5" /> New Template
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger className="w-full sm:w-44 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
            <SelectItem value="EMAIL">Email</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="grid">
        <TabsList className="bg-white">
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <FileText className="h-10 w-10 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-500">No templates found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(t => {
                const StatusIcon = STATUS_ICONS[t.status]?.icon || FileText
                const statusColor = STATUS_ICONS[t.status]?.color || "text-stone-500"
                const isWA = t.channel === "WHATSAPP"
                return (
                  <Card key={t.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setPreview(t)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isWA ? (
                            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                              <MessageCircle className="h-4 w-4 text-emerald-600" />
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded-lg bg-teal-50 flex items-center justify-center">
                              <Mail className="h-4 w-4 text-teal-600" />
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-sm font-semibold leading-tight">{t.name}</CardTitle>
                            <p className="text-[11px] text-stone-500">{t.language}</p>
                          </div>
                        </div>
                        <StatusIcon className={`h-4 w-4 ${statusColor}`} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className={CATEGORY_COLORS[t.category] || "bg-stone-100"}>{t.category}</Badge>
                        <Badge variant="outline" className="bg-stone-100 text-stone-600">{t.type}</Badge>
                        {t._count?.campaigns ? <Badge variant="outline" className="bg-purple-50 text-purple-700">{t._count.campaigns} campaigns</Badge> : null}
                      </div>
                      <p className="text-xs text-stone-600 line-clamp-3 whitespace-pre-wrap">{t.bodyContent}</p>
                      {t.variables && (
                        <div className="flex flex-wrap gap-1">
                          {JSON.parse(t.variables).slice(0, 4).map((v: string, i: number) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 font-mono">{`{{${v}}}`}</span>
                          ))}
                          {JSON.parse(t.variables).length > 4 && <span className="text-[10px] text-stone-400">+{JSON.parse(t.variables).length - 4}</span>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <Card>
            <ScrollArea className="h-[600px]">
              <div className="divide-y divide-stone-100">
                {filtered.map(t => {
                  const StatusIcon = STATUS_ICONS[t.status]?.icon || FileText
                  const statusColor = STATUS_ICONS[t.status]?.color || "text-stone-500"
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 cursor-pointer" onClick={() => setPreview(t)}>
                      <StatusIcon className={`h-4 w-4 ${statusColor} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-stone-900 truncate">{t.name}</span>
                          {t.channel === "WHATSAPP" ? <MessageCircle className="h-3 w-3 text-emerald-500" /> : <Mail className="h-3 w-3 text-teal-500" />}
                        </div>
                        <p className="text-xs text-stone-500 truncate">{t.bodyContent}</p>
                      </div>
                      <Badge variant="outline" className={CATEGORY_COLORS[t.category]}>{t.category}</Badge>
                      <Badge variant="outline" className="bg-stone-100">{t.language}</Badge>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      {preview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border-stone-200" onClick={e => e.stopPropagation()}>
            <CardHeader className="border-b bg-stone-50/80 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {preview.channel === "WHATSAPP" ? <MessageCircle className="h-5 w-5 text-emerald-600" /> : <Mail className="h-5 w-5 text-teal-600" />}
                  <div>
                    <CardTitle className="text-base font-semibold">{preview.name}</CardTitle>
                    <p className="text-xs text-stone-500 flex items-center gap-2 mt-0.5">
                      <span>{preview.channel}</span> · <span>{preview.language}</span> · <Badge variant="outline" className="text-[10px] bg-stone-100">{preview.category}</Badge>
                      {(preview.name.includes("carousel") || preview.name === "top_oman_tours_selection") && (
                        <Badge className="bg-emerald-600 text-white text-[10px]">CAROUSEL TEMPLATE</Badge>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => { editTemplate(preview); setPreview(null) }}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Template
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreview(null)}>
                    <XCircle className="h-5 w-5 text-stone-400 hover:text-stone-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <ScrollArea className="max-h-[75vh]">
              <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Template Config & Metadata */}
                <div className="lg:col-span-6 space-y-4">
                  {preview.channel === "EMAIL" && preview.emailSubject && (
                    <div>
                      <Label className="text-xs text-stone-500 font-semibold">Subject Line</Label>
                      <p className="font-medium text-sm mt-1 p-2.5 rounded-lg bg-stone-50 border">{preview.emailSubject}</p>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs text-stone-500 font-semibold">Body Content Text</Label>
                    <div className="mt-1 p-3.5 rounded-xl bg-stone-50 border text-xs whitespace-pre-wrap text-stone-800 leading-relaxed">
                      {preview.bodyContent}
                    </div>
                  </div>

                  {preview.footerContent && (
                    <div>
                      <Label className="text-xs text-stone-500 font-semibold">Footer Text</Label>
                      <p className="text-xs text-stone-600 mt-1 p-2 rounded border bg-stone-50">{preview.footerContent}</p>
                    </div>
                  )}

                  {preview.variables && (
                    <div>
                      <Label className="text-xs text-stone-500 font-semibold">Template Dynamic Variables</Label>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {JSON.parse(preview.variables).map((v: string, i: number) => (
                          <code key={i} className="text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                            {`{{${i + 1}: ${v}}}`}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}

                  {preview.buttons && (
                    <div>
                      <Label className="text-xs text-stone-500 font-semibold">Configured Template Buttons</Label>
                      <div className="space-y-1.5 mt-1.5">
                        {JSON.parse(preview.buttons).map((b: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-lg border bg-stone-50 text-xs">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] bg-white font-mono">{b.type}</Badge>
                              <span className="font-medium text-stone-800">{b.text}</span>
                            </div>
                            {b.url && <span className="text-[10px] text-stone-400 font-mono truncate max-w-[140px]">{b.url}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Live WhatsApp Device & Carousel Preview */}
                <div className="lg:col-span-6 space-y-4 border-t lg:border-t-0 lg:border-l lg:pl-6 pt-4 lg:pt-0">
                  <Label className="text-xs text-stone-500 font-semibold flex items-center justify-between">
                    <span>Customer Device Live Preview</span>
                    <span className="text-[10px] text-emerald-600 font-normal">Real WhatsApp Rendering</span>
                  </Label>

                  {(preview.name.includes("carousel") || preview.name === "top_oman_tours_selection") ? (
                    <div className="rounded-2xl border border-stone-200 bg-[#e5ddd5] p-4 overflow-hidden space-y-3">
                      <div className="rounded-lg bg-white p-3 shadow-xs space-y-1">
                        <div className="text-[13px] text-stone-800">{preview.bodyContent}</div>
                        <div className="text-[10px] text-stone-400 text-right">11:25 AM</div>
                      </div>

                      <div className="text-[11px] font-semibold text-stone-700">Top Oman Tour Selection (6 Cards):</div>
                      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                        {[
                          { title: "Wahiba Sands Desert Safari", price: "45 OMR", img: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=300" },
                          { title: "Musandam Dhow Cruise", price: "32.5 OMR", img: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=300" },
                          { title: "Jebel Shams Rim Walk", price: "38 OMR", img: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=300" },
                          { title: "Muscat City Highlights", price: "22 OMR", img: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=300" },
                          { title: "Ras Al Jinz Turtle Watching", price: "28 OMR", img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300" },
                          { title: "Wadi Shab Swimming", price: "35 OMR", img: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=300" },
                        ].map((card, i) => (
                          <div key={i} className="min-w-[150px] max-w-[150px] rounded-xl border bg-white overflow-hidden shadow-sm shrink-0 text-center">
                            <img src={card.img} alt={card.title} className="h-24 w-full object-cover" />
                            <div className="p-2 space-y-1">
                              <div className="font-semibold text-xs text-stone-900 line-clamp-1">{card.title}</div>
                              <div className="text-[11px] text-emerald-700 font-bold">{card.price}</div>
                              <div className="py-1 px-2 text-[10px] bg-stone-100 text-stone-700 rounded font-medium border hover:bg-stone-200 cursor-pointer">
                                Book now
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <WhatsAppPreview
                      headerType={preview.headerType}
                      headerContent={preview.headerContent}
                      bodyContent={preview.bodyContent}
                      footerContent={preview.footerContent}
                      buttons={preview.buttons ? JSON.parse(preview.buttons) : []}
                      sampleValues={preview.variables ? JSON.parse(preview.variables) : []}
                    />
                  )}
                </div>
              </div>
            </ScrollArea>
          </Card>
        </div>
      )}

      <TemplateBuilder
        open={showNew}
        onOpenChange={setShowNew}
        initial={builderDraft}
        onSaved={load}
      />

    </div>
  )
}
