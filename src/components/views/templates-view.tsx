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
import { WhatsAppPreview, type PreviewButton } from "@/components/whatsapp-preview"
import { CarouselPreview } from "@/components/views/carousel-editor"
import { parseCards } from "@/lib/carousel"
import { FileText, Plus, Search, Mail, CheckCircle, Clock, XCircle, Eye, Send, RefreshCw, Pencil } from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
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
  /// JSON array of carousel cards, when this is a carousel template.
  cards?: string
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

  const [submittingMetaId, setSubmittingMetaId] = useState<string | null>(null)

  const handleSubmitToMeta = async (templateId: string) => {
    setSubmittingMetaId(templateId)
    try {
      const res = await fetch(`/api/templates/${templateId}/submit-to-meta`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Submission failed")
      toast.success(
        data.simulation
          ? "Saved and marked pending (WhatsApp simulation mode)"
          : "Submitted to Meta — approval usually takes a few hours"
      )
      load()
      if (preview && preview.id === templateId) {
        setPreview({ ...preview, status: data.template?.status || "PENDING" })
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit to Meta")
    } finally {
      setSubmittingMetaId(null)
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
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-none space-y-6">
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
                              <WhatsAppIcon className="h-4 w-4" />
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
                      {(() => {
                        let vars: string[] = []
                        if (Array.isArray(t.variables)) vars = t.variables
                        else if (typeof t.variables === "string") {
                          try { vars = JSON.parse(t.variables) } catch {}
                        }
                        if (!Array.isArray(vars) || vars.length === 0) return null
                        return (
                          <div className="flex flex-wrap gap-1">
                            {vars.slice(0, 4).map((v: string, i: number) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 font-mono">{`{{${v}}}`}</span>
                            ))}
                            {vars.length > 4 && <span className="text-[10px] text-stone-400">+{vars.length - 4}</span>}
                          </div>
                        )
                      })()}
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
                          {t.channel === "WHATSAPP" ? <WhatsAppIcon className="h-3.5 w-3.5" /> : <Mail className="h-3 w-3 text-teal-500" />}
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

      {/*
        * Preview.
        *
        * Two questions get asked of a template and they are not the same one:
        * "what will the customer see" and "what is in this thing". The dialog
        * used to stack both down one narrow column, so the phone — the answer
        * to the first, and the reason anybody opens a preview — was a small
        * thing at the top with a list of raw fields shoved underneath it.
        *
        * The phone now sits on its own beside the details, on the WhatsApp
        * wallpaper it will actually appear on, and the details are a tidy
        * summary rather than a dump of every stored column.
        */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6"
          onClick={() => setPreview(null)}
        >
          <Card
            className="w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b bg-white px-5 py-3.5 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`h-9 w-9 rounded-xl grid place-items-center shrink-0 ${
                  preview.channel === "WHATSAPP" ? "bg-emerald-50" : "bg-teal-50"
                }`}>
                  {preview.channel === "WHATSAPP"
                    ? <WhatsAppIcon className="h-5 w-5" />
                    : <Mail className="h-4.5 w-4.5 text-teal-600" />}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-stone-900 truncate">{preview.name}</p>
                  <p className="text-[11px] text-stone-500">
                    {preview.channel} · {preview.language} · {preview.category}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {preview.channel === "WHATSAPP" && (preview.status === "DRAFT" || preview.status === "REJECTED") && (
                  <Button
                    size="sm"
                    className="bg-[#00E785] hover:bg-[#00B96A] text-stone-900 font-semibold shadow-none border border-emerald-600/20"
                    disabled={submittingMetaId === preview.id}
                    onClick={() => handleSubmitToMeta(preview.id)}
                  >
                    {submittingMetaId === preview.id ? (
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Submit to Meta
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => { editTemplate(preview); setPreview(null) }}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setPreview(null)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 min-h-0 grid md:grid-cols-[minmax(0,1fr)_320px]">
              {/* What the customer sees, on the background they see it on. */}
              <div className="min-h-0 overflow-y-auto bg-[#e5ddd5] p-6 flex items-start justify-center">
                {preview.channel === "WHATSAPP" ? (() => {
                  const cards = parseCards(preview.cards)
                  if (cards.length > 0) {
                    return <CarouselPreview cards={cards} bodyContent={preview.bodyContent} />
                  }
                  const ALLOWED = ["QUICK_REPLY", "URL", "PHONE_NUMBER"] as const
                  let buttons: PreviewButton[] = []
                  try {
                    const raw = typeof preview.buttons === "string" ? JSON.parse(preview.buttons) : []
                    // A stored button type is just a string. Only the three
                    // Meta accepts are passed on; anything else is dropped
                    // rather than drawn as a button that cannot exist.
                    buttons = (Array.isArray(raw) ? raw : []).flatMap(
                      (b: { type?: string; text?: string; url?: string }) => {
                        const type = String(b?.type || "QUICK_REPLY").toUpperCase()
                        if (!ALLOWED.includes(type as (typeof ALLOWED)[number])) return []
                        return [{ type: type as (typeof ALLOWED)[number], text: String(b?.text || ""), url: b?.url }]
                      },
                    )
                  } catch { buttons = [] }
                  return (
                    <WhatsAppPreview
                      headerType={preview.headerType ?? undefined}
                      headerContent={preview.headerContent ?? undefined}
                      bodyContent={preview.bodyContent}
                      footerContent={preview.footerContent ?? undefined}
                      buttons={buttons}
                    />
                  )
                })() : (
                  <div className="w-full max-w-md rounded-xl bg-white shadow-sm border p-5">
                    {preview.emailSubject && (
                      <>
                        <p className="text-[11px] uppercase tracking-wide text-stone-400">Subject</p>
                        <p className="font-semibold text-stone-900 mt-0.5">{preview.emailSubject}</p>
                        <hr className="my-3" />
                      </>
                    )}
                    <div className="text-sm whitespace-pre-wrap text-stone-700">{preview.bodyContent}</div>
                    {preview.footerContent && (
                      <p className="mt-4 pt-3 border-t text-xs text-stone-500">{preview.footerContent}</p>
                    )}
                  </div>
                )}
              </div>

              {/* What is in it, for the person who has to fill it in. */}
              <aside className="min-h-0 overflow-y-auto border-l bg-white p-5 space-y-5">
                <Detail label="Body">
                  <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{preview.bodyContent}</p>
                </Detail>

                {preview.footerContent && (
                  <Detail label="Footer">
                    <p className="text-sm text-stone-600">{preview.footerContent}</p>
                  </Detail>
                )}

                {(() => {
                  let variables: string[] = []
                  if (Array.isArray(preview.variables)) variables = preview.variables
                  else if (typeof preview.variables === "string") {
                    try { variables = JSON.parse(preview.variables) } catch {}
                  }
                  if (!Array.isArray(variables) || variables.length === 0) return null
                  return (
                    <Detail label={`Variables (${variables.length})`}>
                      <div className="space-y-1.5">
                        {variables.map((v: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <code className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
                              {`{{${i + 1}}}`}
                            </code>
                            <span className="text-stone-600 truncate">{v}</span>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] text-stone-400">
                        Each one must be supplied when the template is sent, in this order.
                      </p>
                    </Detail>
                  )
                })()}

                {(() => {
                  let buttons: { type?: string; text?: string; url?: string }[] = []
                  if (Array.isArray(preview.buttons)) buttons = preview.buttons
                  else if (typeof preview.buttons === "string") {
                    try { buttons = JSON.parse(preview.buttons) } catch {}
                  }
                  if (!Array.isArray(buttons) || buttons.length === 0) return null
                  return (
                    <Detail label={`Buttons (${buttons.length})`}>
                      <div className="space-y-1.5">
                        {buttons.map((b, i) => (
                          <div key={i} className="flex items-center gap-2 rounded-lg border bg-stone-50 px-2.5 py-1.5">
                            <Badge variant="outline" className="text-[10px] shrink-0">{b.type}</Badge>
                            <span className="text-xs text-stone-700 truncate">{b.text}</span>
                          </div>
                        ))}
                      </div>
                    </Detail>
                  )
                })()}

                <Detail label="Status">
                  <Badge variant="outline" className="text-[11px]">{preview.status ?? "—"}</Badge>
                </Detail>
              </aside>
            </div>
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

/** One labelled block in the preview's details column. */
function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400 mb-1.5">{label}</p>
      {children}
    </div>
  )
}
