"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  BookOpen, Search, Plus, Trash2, Globe, FileText, MessageCircleQuestion,
  Upload, Loader2, AlertTriangle, CheckCircle2, Link2, Eye, Pencil, Copy, ExternalLink,
} from "lucide-react"
import { toast } from "sonner"

interface KnowledgeChunk {
  id: string
  content: string
  ordinal: number
}

interface Source {
  id: string; title: string; type: string; url: string | null
  status: string; error: string | null
  charCount: number; chunkCount: number; lastIndexedAt: string | null; createdAt: string
  chunks?: KnowledgeChunk[]
}

interface Passage {
  id: string; content: string; sourceTitle: string; url: string | null
  score: number; matchedBy: "keyword" | "meaning" | "both"
}

const TYPE_ICON: Record<string, React.ElementType> = {
  TEXT: FileText, FILE: Upload, URL: Link2, SITE: Globe, FAQ: MessageCircleQuestion,
}
const MATCH_STYLE: Record<string, string> = {
  both: "bg-emerald-100 text-emerald-700",
  keyword: "bg-sky-100 text-sky-700",
  meaning: "bg-violet-100 text-violet-700",
}

export default function KnowledgeView() {
  const [sources, setSources] = useState<Source[]>([])
  const [totals, setTotals] = useState({ totalChunks: 0, embedded: 0 })
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState("text")

  const [text, setText] = useState({ title: "", body: "" })
  const [faq, setFaq] = useState({ question: "", answer: "" })
  const [pageUrl, setPageUrl] = useState("")
  const [site, setSite] = useState({ url: "", maxPages: 25 })
  const fileInput = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState("")
  const [passages, setPassages] = useState<Passage[]>([])
  const [searching, setSearching] = useState(false)

  // View modal state
  const [viewSource, setViewSource] = useState<Source | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null)

  // Edit modal state
  const [editSource, setEditSource] = useState<Source | null>(null)
  const [editForm, setEditForm] = useState({ title: "", text: "" })
  const [editLoading, setEditLoading] = useState(false)
  const [editSaving, setEditSaving] = useState(false)

  const load = useCallback(() =>
    fetch("/api/knowledge")
      .then(r => r.json())
      .then(d => {
        setSources(d.sources || [])
        setTotals({ totalChunks: d.totalChunks || 0, embedded: d.embedded || 0 })
        setLoading(false)
      })
      .catch(() => setLoading(false)), [])

  useEffect(() => { load() }, [load])

  // A crawl runs behind the response, so the screen has to look again to see
  // it finish. Polling stops as soon as nothing is still working.
  useEffect(() => {
    if (!sources.some(s => s.status === "INDEXING")) return
    const timer = setInterval(load, 3000)
    return () => clearInterval(timer)
  }, [sources, load])

  const post = async (body: Record<string, unknown>) => {
    setSaving(true)
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not add that")
      toast.success(data.crawling ? "Crawling — this takes a few minutes" : `Indexed into ${data.chunks} passages`)
      setAdding(false)
      setText({ title: "", body: "" }); setFaq({ question: "", answer: "" })
      setPageUrl(""); setSite({ url: "", maxPages: 25 })
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add that")
    } finally {
      setSaving(false)
    }
  }

  const upload = async (file: File) => {
    setSaving(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/knowledge/upload", { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not read that file")
      toast.success(`Indexed into ${data.chunks} passages`)
      setAdding(false)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read that file")
    } finally {
      setSaving(false)
    }
  }

  const openView = async (source: Source) => {
    setViewLoading(true)
    setViewSource(source)
    try {
      const res = await fetch(`/api/knowledge/${source.id}`)
      const data = await res.json()
      if (data.source) {
        setViewSource(data.source)
      }
    } catch {
      toast.error("Could not load knowledge details")
    } finally {
      setViewLoading(false)
    }
  }

  const openEdit = async (source: Source) => {
    setEditLoading(true)
    setEditSource(source)
    setEditForm({ title: source.title, text: "" })
    try {
      const res = await fetch(`/api/knowledge/${source.id}`)
      const data = await res.json()
      if (data.source) {
        setEditSource(data.source)
        const combinedText = (data.source.chunks || []).map((c: KnowledgeChunk) => c.content).join("\n\n")
        setEditForm({ title: data.source.title, text: combinedText })
      }
    } catch {
      toast.error("Could not load content for editing")
    } finally {
      setEditLoading(false)
    }
  }

  const saveEdit = async () => {
    if (!editSource) return
    if (!editForm.title.trim()) { toast.error("Title cannot be empty"); return }
    setEditSaving(true)
    try {
      const res = await fetch(`/api/knowledge/${editSource.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title.trim(),
          text: editForm.text.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not update knowledge source")
      toast.success(data.chunks !== undefined ? `Updated & re-indexed into ${data.chunks} passages` : "Knowledge source updated")
      setEditSource(null)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update")
    } finally {
      setEditSaving(false)
    }
  }

  const copyChunk = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedChunkId(id)
    toast.success("Passage copied to clipboard")
    setTimeout(() => setCopiedChunkId(null), 2000)
  }

  const remove = async (source: Source) => {
    if (!confirm(`Remove "${source.title}"? The assistant will stop answering from it.`)) return
    const res = await fetch(`/api/knowledge/${source.id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("Could not remove it"); return }
    toast.success("Removed")
    load()
  }

  const runSearch = async () => {
    if (query.trim().length < 2) return
    setSearching(true)
    try {
      const res = await fetch(`/api/knowledge/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setPassages(data.passages || [])
      if ((data.passages || []).length === 0) toast.info("Nothing found — the assistant would say it needs to check")
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Knowledge base</h1>
          <Badge variant="secondary">{sources.length} sources</Badge>
          <Badge variant="outline">{totals.totalChunks} passages</Badge>
        </div>
        <Button className="ml-auto" onClick={() => setAdding(true)}>
          <Plus className="mr-1.5 h-4 w-4" />Add content
        </Button>
      </div>

      {totals.totalChunks > 0 && totals.embedded < totals.totalChunks && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {totals.totalChunks - totals.embedded} of {totals.totalChunks} passages have no embedding, so they
            are only found by exact wording. Check the OpenAI key in Settings, then re-add those sources.
          </span>
        </div>
      )}

      <div className="grid flex-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="overflow-hidden">
          <ScrollArea className="h-full">
            {loading ? (
              <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : sources.length === 0 ? (
              <div className="space-y-2 p-10 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm font-medium">Nothing indexed yet</p>
                <p className="mx-auto max-w-sm text-xs text-muted-foreground">
                  Until you add something, the assistant can only answer from tours and bookings.
                  Ask it about your cancellation policy and it will guess. Add that policy here and it will quote it.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {sources.map(source => {
                  const Icon = TYPE_ICON[source.type] || FileText
                  return (
                    <div key={source.id} className="flex items-center gap-3 p-3">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{source.title}</span>
                          {source.status === "INDEXING" && (
                            <Badge variant="outline" className="gap-1 bg-sky-50 text-sky-700">
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />working
                            </Badge>
                          )}
                          {source.status === "ERROR" && (
                            <Badge variant="outline" className="bg-rose-50 text-rose-700">failed</Badge>
                          )}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {source.chunkCount} passages
                          {source.charCount ? ` · ${(source.charCount / 1000).toFixed(1)}k characters` : ""}
                          {source.url ? ` · ${source.url}` : ""}
                        </div>
                        {source.error && <div className="mt-0.5 text-xs text-rose-600">{source.error}</div>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="View content and passages"
                          onClick={() => openView(source)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Edit title or content"
                          onClick={() => openEdit(source)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                          title="Delete source"
                          onClick={() => remove(source)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </Card>

        <Card className="flex flex-col overflow-hidden">
          <div className="border-b p-3">
            <Label className="text-xs font-medium">Try a customer question</Label>
            <p className="mb-2 text-[11px] text-muted-foreground">
              Exactly what the assistant would find before it answers.
            </p>
            <div className="flex gap-1.5">
              <Input
                placeholder="What's your cancellation policy?"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && runSearch()}
              />
              <Button size="icon" onClick={runSearch} disabled={searching}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-2 p-3">
              {passages.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  Results appear here.
                </p>
              ) : passages.map((passage, index) => (
                <div key={passage.id} className="rounded-md border p-2.5">
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground">#{index + 1}</span>
                    <Badge variant="outline" className={`text-[9px] ${MATCH_STYLE[passage.matchedBy]}`}>
                      {passage.matchedBy === "both" ? "wording + meaning"
                        : passage.matchedBy === "keyword" ? "wording" : "meaning"}
                    </Badge>
                    <span className="truncate text-[10px] text-muted-foreground">{passage.sourceTitle}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-stone-700">{passage.content.slice(0, 320)}
                    {passage.content.length > 320 ? "…" : ""}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>Add content</DialogTitle></DialogHeader>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="text">Text</TabsTrigger>
              <TabsTrigger value="faq">FAQ</TabsTrigger>
              <TabsTrigger value="file">File</TabsTrigger>
              <TabsTrigger value="web">Website</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Title</Label>
                <Input placeholder="Cancellation policy" value={text.title} onChange={e => setText({ ...text, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Content</Label>
                <Textarea rows={9} placeholder="Paste the policy, terms, or anything the assistant should know…"
                  value={text.body} onChange={e => setText({ ...text, body: e.target.value })} />
              </div>
              <Button className="w-full" disabled={saving || text.body.trim().length < 20}
                onClick={() => post({ type: "TEXT", title: text.title || "Untitled", text: text.body })}>
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Add
              </Button>
            </TabsContent>

            <TabsContent value="faq" className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Question</Label>
                <Input placeholder="Can I bring children?" value={faq.question} onChange={e => setFaq({ ...faq, question: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Answer</Label>
                <Textarea rows={5} value={faq.answer} onChange={e => setFaq({ ...faq, answer: e.target.value })} />
              </div>
              <Button className="w-full" disabled={saving || !faq.question.trim() || !faq.answer.trim()}
                onClick={() => post({ type: "FAQ", title: faq.question.slice(0, 120), question: faq.question, answer: faq.answer })}>
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Add
              </Button>
            </TabsContent>

            <TabsContent value="file" className="space-y-3 pt-3">
              <input ref={fileInput} type="file" className="hidden"
                accept=".pdf,.txt,.md,.markdown,.csv,.tsv,.json,.html,.htm,.yaml,.yml"
                onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = "" }} />
              <button onClick={() => fileInput.current?.click()} disabled={saving}
                className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 transition hover:border-emerald-400 hover:bg-emerald-50/40">
                {saving ? <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /> : <Upload className="h-7 w-7 text-muted-foreground" />}
                <span className="text-sm font-medium">{saving ? "Reading…" : "Choose a file"}</span>
                <span className="text-[11px] text-muted-foreground">PDF, text, Markdown, CSV or HTML · up to 10 MB</span>
              </button>
              <p className="text-[11px] text-muted-foreground">
                A scanned PDF has pictures of text rather than text, and cannot be read. Run it through OCR first,
                or paste the words in on the Text tab.
              </p>
            </TabsContent>

            <TabsContent value="web" className="space-y-4 pt-3">
              <div className="space-y-1.5">
                <Label className="text-xs">One page</Label>
                <div className="flex gap-1.5">
                  <Input placeholder="https://example.com/faq" value={pageUrl} onChange={e => setPageUrl(e.target.value)} />
                  <Button disabled={saving || !pageUrl.trim()} onClick={() => post({ type: "URL", url: pageUrl.trim() })}>Add</Button>
                </div>
              </div>
              <div className="space-y-1.5 border-t pt-3">
                <Label className="text-xs">Or a whole site</Label>
                <Input placeholder="https://example.com" value={site.url} onChange={e => setSite({ ...site, url: e.target.value })} />
                <div className="flex items-center gap-2">
                  <Label className="shrink-0 text-[11px] text-muted-foreground">Up to</Label>
                  <Input type="number" min={1} max={100} className="w-20" value={site.maxPages}
                    onChange={e => setSite({ ...site, maxPages: Number(e.target.value) })} />
                  <Label className="text-[11px] text-muted-foreground">pages</Label>
                </div>
                <Button className="w-full" disabled={saving || !site.url.trim()}
                  onClick={() => post({ type: "SITE", url: site.url.trim(), maxPages: site.maxPages })}>
                  {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Crawl site
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Follows internal links only, obeys robots.txt, and pauses between requests. A few minutes for 25 pages.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* View Knowledge Source Dialog */}
      <Dialog open={Boolean(viewSource)} onOpenChange={(open) => !open && setViewSource(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-lg font-semibold">{viewSource?.title || "Knowledge Source"}</DialogTitle>
              {viewSource?.status === "INDEXING" && (
                <Badge variant="outline" className="gap-1 bg-sky-50 text-sky-700">
                  <Loader2 className="h-3 w-3 animate-spin" /> Indexing
                </Badge>
              )}
              {viewSource?.status === "ERROR" && (
                <Badge variant="outline" className="bg-rose-50 text-rose-700">Failed</Badge>
              )}
              <Badge variant="secondary">{viewSource?.type}</Badge>
              <Badge variant="outline">{viewSource?.chunkCount || 0} passages</Badge>
            </div>
          </DialogHeader>

          {viewLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p className="text-xs">Loading source passages...</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {viewSource?.url && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-stone-50 rounded p-2">
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  <span className="shrink-0 font-medium">Source URL:</span>
                  <a href={viewSource.url} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">
                    {viewSource.url}
                  </a>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {viewSource?.charCount ? `${viewSource.charCount.toLocaleString()} total characters` : ""}
                  {viewSource?.lastIndexedAt ? ` · Indexed ${new Date(viewSource.lastIndexedAt).toLocaleString()}` : ""}
                </span>
                {viewSource?.chunks && viewSource.chunks.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      const allText = viewSource.chunks!.map(c => c.content).join("\n\n")
                      copyChunk(allText, "all")
                    }}
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    {copiedChunkId === "all" ? "Copied!" : "Copy all text"}
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-semibold text-stone-900">
                  Indexed Passages ({viewSource?.chunks?.length || 0})
                </Label>
                {(!viewSource?.chunks || viewSource.chunks.length === 0) ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                    No passages found for this source.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {viewSource.chunks.map((chunk, idx) => (
                      <div key={chunk.id || idx} className="rounded-lg border border-stone-200 bg-stone-50/50 p-3 text-xs leading-relaxed space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-stone-200/60 pb-1.5">
                          <span className="font-semibold text-stone-700">Passage #{idx + 1}</span>
                          <div className="flex items-center gap-2">
                            <span>{chunk.content.length} chars</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyChunk(chunk.content, chunk.id || String(idx))}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="whitespace-pre-wrap text-stone-800 font-sans">{chunk.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 flex sm:justify-between items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (viewSource) {
                  const s = viewSource
                  setViewSource(null)
                  openEdit(s)
                }
              }}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit Source
            </Button>
            <Button size="sm" onClick={() => setViewSource(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Knowledge Source Dialog */}
      <Dialog open={Boolean(editSource)} onOpenChange={(open) => !open && setEditSource(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Edit Knowledge Source</DialogTitle>
          </DialogHeader>

          {editLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p className="text-xs">Loading content...</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Title</Label>
                <Input
                  placeholder="Source title or topic"
                  value={editForm.title}
                  onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Content / Passages</Label>
                  <span className="text-[11px] text-muted-foreground">
                    {editForm.text.length.toLocaleString()} characters · ~{Math.max(1, Math.ceil(editForm.text.length / 550))} passages
                  </span>
                </div>
                <Textarea
                  rows={12}
                  className="font-mono text-xs leading-relaxed"
                  placeholder="Paste or write the document text..."
                  value={editForm.text}
                  onChange={e => setEditForm(prev => ({ ...prev, text: e.target.value }))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Saving will automatically re-chunk the text into passages and update search vectors for the AI assistant.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" disabled={editSaving} onClick={() => setEditSource(null)}>
              Cancel
            </Button>
            <Button size="sm" disabled={editSaving || !editForm.title.trim()} onClick={saveEdit}>
              {editSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save & Re-Index
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
