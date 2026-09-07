"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import {
  FileText, Image as ImageIcon, Newspaper, Plus, RefreshCw, Search, Edit, Trash2, MoreVertical,
  HelpCircle, ExternalLink, Eye, EyeOff, ChevronDown, ChevronRight, Tag, Globe, Link2,
  AlertTriangle, Lightbulb,
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { timeAgo } from "@/lib/helpers"

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type ContentType = "FAQ" | "BANNER" | "BLOG"

interface ContentItem {
  id: string
  key: string
  type: string
  value: any
  updatedAt: string
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export default function ContentView() {
  const [tab, setTab] = useState<ContentType>("FAQ")
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<ContentItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<ContentItem | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/content?type=${tab}`)
      if (!res.ok) throw new Error("Failed to load content")
      const data = await res.json()
      setItems(data.items || [])
    } catch (e: any) {
      setError(e.message || "Failed to load")
      toast.error("Failed to load content")
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { load() }, [load])

  // ---- Helpers
  const filtered = items.filter(i => {
    if (!search) return true
    const q = search.toLowerCase()
    const v = i.value || {}
    return (
      i.key.toLowerCase().includes(q) ||
      v.question?.toLowerCase().includes(q) ||
      v.answer?.toLowerCase().includes(q) ||
      v.title?.toLowerCase().includes(q) ||
      v.slug?.toLowerCase().includes(q) ||
      v.category?.toLowerCase().includes(q)
    )
  })

  const handleSave = async (data: any) => {
    // editing ? update : create
    const key = editing?.key || data._key
    if (!key) { toast.error("Key required"); return }
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          type: tab,
          value: { ...data, _key: undefined },
        }),
      })
      if (!res.ok) throw new Error("Save failed")
      toast.success(editing ? `${tab.toLowerCase()} updated` : `${tab.toLowerCase()} created`)
      setShowForm(false)
      setEditing(null)
      load()
    } catch (e: any) {
      toast.error(e.message || "Save failed")
    }
  }

  const handleDelete = async (item: ContentItem) => {
    try {
      await fetch(`/api/content?key=${encodeURIComponent(item.key)}`, { method: "DELETE" })
      toast.success("Deleted")
      setItems(prev => prev.filter(i => i.id !== item.id))
    } catch {
      toast.error("Delete failed")
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-none space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <FileText className="h-5 w-5 text-white" />
            </div>
            Content Management
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            FAQs, banners &amp; blog/SEO pages — shown on website, reusable as WhatsApp quick answers
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true) }} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1.5" /> New {tab === "FAQ" ? "FAQ" : tab === "BANNER" ? "Banner" : "Blog Post"}
        </Button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
        <Lightbulb className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
        <div className="text-xs text-emerald-800 leading-relaxed">
          <span className="font-semibold">Pro tip:</span> FAQs are auto-synced to the WhatsApp quick-answers panel
          and are searchable by chat agents using the <code className="px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 font-mono text-[10px]">/faq</code> shortcut.
          Banners appear on the homepage hero. Blog pages are SEO-optimized and indexed automatically.
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => { setTab(v as ContentType); setSearch("") }}>
        <TabsList className="bg-white h-10">
          <TabsTrigger value="FAQ" className="gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" /> FAQs
            <CountPill items={items} type="FAQ" />
          </TabsTrigger>
          <TabsTrigger value="BANNER" className="gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" /> Banners
            <CountPill items={items} type="BANNER" />
          </TabsTrigger>
          <TabsTrigger value="BLOG" className="gap-1.5">
            <Newspaper className="h-3.5 w-3.5" /> Blog / SEO
            <CountPill items={items} type="BLOG" />
          </TabsTrigger>
        </TabsList>

        {/* Search bar */}
        <div className="mt-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              placeholder={`Search ${tab.toLowerCase()}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          <Button variant="outline" size="icon" onClick={load} disabled={loading} className="bg-white">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <TabsContent value="FAQ" className="mt-4 space-y-3">
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
          ) : error ? (
            <ErrorBanner message={error} onRetry={load} />
          ) : filtered.length === 0 ? (
            <EmptyBlock label="FAQ" onCreate={() => { setEditing(null); setShowForm(true) }} hasAny={items.length > 0} onClear={() => setSearch("")} />
          ) : (
            <div className="space-y-2">
              {filtered.map(item => (
                <FaqRow
                  key={item.id}
                  item={item}
                  onEdit={() => { setEditing(item); setShowForm(true) }}
                  onDelete={() => setDeleting(item)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="BANNER" className="mt-4 space-y-3">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}</div>
          ) : error ? (
            <ErrorBanner message={error} onRetry={load} />
          ) : filtered.length === 0 ? (
            <EmptyBlock label="Banner" onCreate={() => { setEditing(null); setShowForm(true) }} hasAny={items.length > 0} onClear={() => setSearch("")} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map(item => (
                <BannerCard
                  key={item.id}
                  item={item}
                  onEdit={() => { setEditing(item); setShowForm(true) }}
                  onDelete={() => setDeleting(item)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="BLOG" className="mt-4 space-y-3">
          {loading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
          ) : error ? (
            <ErrorBanner message={error} onRetry={load} />
          ) : filtered.length === 0 ? (
            <EmptyBlock label="Blog post" onCreate={() => { setEditing(null); setShowForm(true) }} hasAny={items.length > 0} onClear={() => setSearch("")} />
          ) : (
            <div className="space-y-2">
              {filtered.map(item => (
                <BlogRow
                  key={item.id}
                  item={item}
                  onEdit={() => { setEditing(item); setShowForm(true) }}
                  onDelete={() => setDeleting(item)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create / Edit dialog */}
      {showForm && (
        <ContentFormDialog
          type={tab}
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSave={handleSave}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-600" /> Delete this {tab.toLowerCase()}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <span className="font-mono font-semibold text-stone-700">{deleting?.key}</span> from the website and WhatsApp quick-answers.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && handleDelete(deleting)}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Count pill                                                          */
/* ------------------------------------------------------------------ */

function CountPill({ items, type }: { items: ContentItem[]; type: ContentType }) {
  const count = items.length // items are already filtered by current tab
  void type
  if (count === 0) return null
  return (
    <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
      {count}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* FAQ row                                                             */
/* ------------------------------------------------------------------ */

function FaqRow({ item, onEdit, onDelete }: { item: ContentItem; onEdit: () => void; onDelete: () => void }) {
  const v = item.value || {}
  const [expanded, setExpanded] = useState(false)
  return (
    <Card className="border-stone-200 hover:border-emerald-200 hover:shadow-sm transition-all">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-0.5 h-7 w-7 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 hover:bg-emerald-100 transition-colors"
          >
            {expanded ? <ChevronDown className="h-4 w-4 text-emerald-600" /> : <ChevronRight className="h-4 w-4 text-emerald-600" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {v.category && (
                <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-[10px]">
                  <Tag className="h-2.5 w-2.5 mr-1" />{v.category}
                </Badge>
              )}
              <span className="text-[10px] text-stone-400">Updated {timeAgo(item.updatedAt)}</span>
            </div>
            <h3 className="font-semibold text-stone-900 text-sm mt-1">{v.question || "(no question)"}</h3>
            {expanded ? (
              <p className="text-sm text-stone-600 mt-2 whitespace-pre-wrap leading-relaxed">{v.answer}</p>
            ) : (
              <p className="text-sm text-stone-500 mt-1 line-clamp-2">{v.answer}</p>
            )}
            <div className="flex items-center gap-1 mt-2">
              <Badge variant="outline" className="text-[10px] font-mono text-stone-500">{item.key}</Badge>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                <WhatsAppIcon className="h-3 w-3 mr-1" /> WhatsApp-ready
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-stone-400 hover:text-stone-700">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={onEdit}><Edit className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setExpanded(!expanded)}>
                {expanded ? <EyeOff className="h-3.5 w-3.5 mr-2" /> : <Eye className="h-3.5 w-3.5 mr-2" />}
                {expanded ? "Collapse" : "Expand"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-rose-600 focus:text-rose-700 focus:bg-rose-50">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Banner card                                                         */
/* ------------------------------------------------------------------ */

function BannerCard({ item, onEdit, onDelete }: { item: ContentItem; onEdit: () => void; onDelete: () => void }) {
  const v = item.value || {}
  const [imgError, setImgError] = useState(false)
  return (
    <Card className="overflow-hidden border-stone-200 hover:shadow-md transition-all">
      {/* Image preview */}
      <div className="relative aspect-[16/7] bg-gradient-to-br from-emerald-100 via-teal-100 to-emerald-50 overflow-hidden">
        {v.imageUrl && !imgError ? (
          <img
            src={v.imageUrl}
            alt={v.title || "banner"}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-emerald-300" />
          </div>
        )}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {v.isActive ? (
            <Badge className="bg-emerald-500 text-white border-0 text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full bg-white mr-1 animate-pulse" /> Live
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-white/90 text-stone-500 border-0 text-[10px]">Hidden</Badge>
          )}
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-stone-900 text-sm truncate">{v.title || "(untitled banner)"}</h3>
        {v.link && (
          <a
            href={v.link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline mt-1 truncate max-w-full"
          >
            <Link2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{v.link}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        )}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
          <span className="text-[10px] text-stone-400">Updated {timeAgo(item.updatedAt)}</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 text-xs">
              <Edit className="h-3 w-3 mr-1" /> Edit
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Blog row                                                            */
/* ------------------------------------------------------------------ */

function BlogRow({ item, onEdit, onDelete }: { item: ContentItem; onEdit: () => void; onDelete: () => void }) {
  const v = item.value || {}
  const [expanded, setExpanded] = useState(false)
  const slug = v.slug || item.key
  return (
    <Card className="border-stone-200 hover:border-emerald-200 hover:shadow-sm transition-all">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 text-white">
            <Newspaper className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-stone-900 text-sm">{v.title || "(untitled post)"}</h3>
              {v.seoTitle && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                  <Globe className="h-2.5 w-2.5 mr-1" /> SEO
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-stone-500">
              <span className="font-mono">/{slug}</span>
              <span>·</span>
              <span>Updated {timeAgo(item.updatedAt)}</span>
              {v.content && (
                <>
                  <span>·</span>
                  <button onClick={() => setExpanded(!expanded)} className="text-emerald-600 hover:underline">
                    {expanded ? "Hide" : "Preview"} content
                  </button>
                </>
              )}
            </div>
            {expanded && v.content && (
              <div className="mt-3 p-3 rounded-lg bg-stone-50 border border-stone-100 text-xs text-stone-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {v.content}
              </div>
            )}
            {v.seoDescription && (
              <p className="text-xs text-stone-500 mt-2 line-clamp-2 italic">
                <Globe className="h-3 w-3 inline mr-1" />
                {v.seoDescription}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 text-xs">
              <Edit className="h-3 w-3 mr-1" /> Edit
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Form dialog                                                         */
/* ------------------------------------------------------------------ */

function ContentFormDialog({
  type, editing, onClose, onSave,
}: {
  type: ContentType
  editing: ContentItem | null
  onClose: () => void
  onSave: (data: any) => void
}) {
  const isEdit = !!editing
  const existing = editing?.value || {}

  // FAQ state
  const [question, setQuestion] = useState(existing.question || "")
  const [answer, setAnswer] = useState(existing.answer || "")
  const [category, setCategory] = useState(existing.category || "General")

  // Banner state
  const [bannerTitle, setBannerTitle] = useState(existing.title || "")
  const [imageUrl, setImageUrl] = useState(existing.imageUrl || "")
  const [link, setLink] = useState(existing.link || "")
  const [isActive, setIsActive] = useState(existing.isActive ?? true)

  // Blog state
  const [blogTitle, setBlogTitle] = useState(existing.title || "")
  const [slug, setSlug] = useState(existing.slug || "")
  const [content, setContent] = useState(existing.content || "")
  const [seoTitle, setSeoTitle] = useState(existing.seoTitle || "")
  const [seoDescription, setSeoDescription] = useState(existing.seoDescription || "")
  const [seoKeywords, setSeoKeywords] = useState(existing.seoKeywords || "")

  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    setSaving(true)
    try {
      if (type === "FAQ") {
        if (!question.trim()) { toast.error("Question required"); setSaving(false); return }
        if (!answer.trim()) { toast.error("Answer required"); setSaving(false); return }
        // Build the key (FAQ_<category>_<questionSlug>) if creating
        const key = editing?.key || `FAQ_${category.toUpperCase().replace(/\s+/g, "_")}_${slugify(question).slice(0, 30)}_${Date.now().toString(36)}`
        await onSave({ _key: key, question, answer, category })
      } else if (type === "BANNER") {
        if (!bannerTitle.trim()) { toast.error("Title required"); setSaving(false); return }
        const key = editing?.key || `BANNER_${slugify(bannerTitle).slice(0, 30)}_${Date.now().toString(36)}`
        await onSave({ _key: key, title: bannerTitle, imageUrl, link, isActive })
      } else {
        if (!blogTitle.trim()) { toast.error("Title required"); setSaving(false); return }
        const finalSlug = slug || slugify(blogTitle)
        const key = editing?.key || `BLOG_${finalSlug}_${Date.now().toString(36)}`
        await onSave({
          _key: key,
          title: blogTitle,
          slug: finalSlug,
          content,
          seoTitle,
          seoDescription,
          seoKeywords,
        })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
              {type === "FAQ" ? <HelpCircle className="h-4 w-4" /> : type === "BANNER" ? <ImageIcon className="h-4 w-4" /> : <Newspaper className="h-4 w-4" />}
            </div>
            {isEdit ? "Edit" : "New"} {type === "FAQ" ? "FAQ" : type === "BANNER" ? "Banner" : "Blog Post"}
          </DialogTitle>
          <DialogDescription>
            {type === "FAQ" && "Will be shown on website and synced to WhatsApp quick answers."}
            {type === "BANNER" && "Appears in the homepage hero carousel."}
            {type === "BLOG" && "SEO-optimized page with meta tags for search engines."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {type === "FAQ" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Question *</Label>
                <Input value={question} onChange={e => setQuestion(e.target.value)} placeholder="What should I bring for the desert tour?" className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Answer *</Label>
                <Textarea
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  placeholder="Bring comfortable clothes, sunscreen, a hat, and a refillable water bottle..."
                  rows={5}
                  className="bg-white resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="General / Booking / Payment / Tours" className="bg-white" />
                <div className="flex flex-wrap gap-1 mt-1">
                  {["General", "Booking", "Payment", "Tours", "Cancellation", "Safety"].map(c => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                        category === c ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-white text-stone-500 border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {type === "BANNER" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Title *</Label>
                <Input value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} placeholder="Summer Special — 20% off all desert tours" className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Image URL</Label>
                <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://... or /banners/summer.jpg" className="bg-white" />
                {imageUrl && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-stone-200 aspect-[16/7] bg-stone-50">
                    <img src={imageUrl} alt="preview" className="h-full w-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.3")} />
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Link (click-through URL)</Label>
                <Input value={link} onChange={e => setLink(e.target.value)} placeholder="/tours or https://..." className="bg-white" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-stone-50 border border-stone-100">
                <div>
                  <div className="text-sm font-medium text-stone-900">Active</div>
                  <div className="text-[11px] text-stone-500">Show on the homepage hero carousel</div>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </>
          )}

          {type === "BLOG" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Title *</Label>
                <Input value={blogTitle} onChange={e => {
                  setBlogTitle(e.target.value)
                  if (!isEdit) setSlug(slugify(e.target.value))
                }} placeholder="Top 5 Things to Do in Musandam" className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Slug (URL)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">/blog/</span>
                  <Input value={slug} onChange={e => setSlug(slugify(e.target.value))} placeholder="top-5-things-musandam" className="bg-white pl-14 font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Content (Markdown supported)</Label>
                <Textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="# Heading&#10;&#10;Write your blog post here..."
                  rows={6}
                  className="bg-white resize-none font-mono text-xs"
                />
              </div>
              <div className="pt-2 border-t border-stone-100">
                <div className="text-xs font-semibold text-stone-700 mb-2 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-amber-600" /> SEO Meta
                </div>
                <div className="space-y-2">
                  <Input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} placeholder="SEO title (50-60 chars)" className="bg-white text-xs" />
                  <Textarea value={seoDescription} onChange={e => setSeoDescription(e.target.value)} placeholder="Meta description (150-160 chars)" rows={2} className="bg-white resize-none text-xs" />
                  <Input value={seoKeywords} onChange={e => setSeoKeywords(e.target.value)} placeholder="comma, separated, keywords" className="bg-white text-xs" />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
            {isEdit ? "Save Changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Empty + error states                                                */
/* ------------------------------------------------------------------ */

function EmptyBlock({ label, onCreate, hasAny, onClear }: { label: string; onCreate: () => void; hasAny: boolean; onClear: () => void }) {
  return (
    <Card className="border-dashed border-stone-300">
      <CardContent className="py-12 flex flex-col items-center text-center">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center mb-3">
          <FileText className="h-6 w-6 text-emerald-500" />
        </div>
        <h3 className="font-semibold text-stone-900">
          {hasAny ? `No ${label.toLowerCase()}s match your search` : `No ${label.toLowerCase()}s yet`}
        </h3>
        <p className="text-sm text-stone-500 mt-1 max-w-sm">
          {hasAny
            ? "Try a different search term or clear the filter."
            : `Create your first ${label.toLowerCase()} to publish content on your website.`}
        </p>
        <div className="flex items-center gap-2 mt-4">
          {hasAny && <Button variant="outline" onClick={onClear} className="bg-white">Clear search</Button>}
          <Button onClick={onCreate} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-1.5" /> New {label}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-rose-200 bg-rose-50">
      <CardContent className="py-8 flex flex-col items-center text-center">
        <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center mb-3">
          <AlertTriangle className="h-5 w-5 text-rose-600" />
        </div>
        <h3 className="font-semibold text-rose-900">Failed to load content</h3>
        <p className="text-sm text-rose-700 mt-1">{message}</p>
        <Button onClick={onRetry} variant="outline" className="mt-3 bg-white border-rose-200 text-rose-700 hover:bg-rose-100">
          <RefreshCw className="h-4 w-4 mr-1.5" /> Try again
        </Button>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Utils                                                               */
/* ------------------------------------------------------------------ */

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60)
}
