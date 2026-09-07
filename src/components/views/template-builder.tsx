"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CarouselEditor } from "@/components/views/carousel-editor"
import { Wand2, Loader2 } from "lucide-react"
import { validateCarousel, type CarouselCard } from "@/lib/carousel"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Plus, Trash2, Save, Send, AlertTriangle } from "lucide-react"
import { WhatsAppPreview, type PreviewButton } from "@/components/whatsapp-preview"

/**
 * WhatsApp template builder with live preview.
 *
 * Meta's rules are enforced here rather than discovered on rejection: name
 * format, variable numbering, the leading/trailing-variable rule, per-type
 * button limits and character caps. A template that fails these is rejected by
 * the Graph API with an opaque error, so catching it in the form saves a
 * round-trip through Meta review.
 */

export type TemplateDraft = {
  id?: string
  name: string
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION"
  language: string
  headerType: "NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT"
  headerContent: string
  bodyContent: string
  footerContent: string
  buttons: PreviewButton[]
  sampleValues: string[]
  /** Carousel cards. Empty means this is an ordinary template. */
  cards: CarouselCard[]
}

export const EMPTY_DRAFT: TemplateDraft = {
  name: "",
  category: "UTILITY",
  language: "en_US",
  headerType: "NONE",
  headerContent: "",
  bodyContent: "",
  footerContent: "",
  buttons: [],
  sampleValues: [],
  cards: [],
}

const LANGUAGES = [
  { code: "en_US", label: "English (US)" },
  { code: "en_GB", label: "English (UK)" },
  { code: "ar", label: "Arabic" },
  { code: "ar_EG", label: "Arabic (Egypt)" },
  { code: "hi", label: "Hindi" },
  { code: "ur", label: "Urdu" },
]

/** Distinct {{n}} placeholders, in numeric order. */
export function variablesIn(text: string): number[] {
  const found = new Set<number>()
  for (const match of text.matchAll(/\{\{(\d+)\}\}/g)) found.add(Number(match[1]))
  return [...found].sort((a, b) => a - b)
}

export function validateTemplate(draft: TemplateDraft): string[] {
  const errors: string[] = []
  const body = draft.bodyContent.trim()

  if (!/^[a-z0-9_]{1,512}$/.test(draft.name)) {
    errors.push("Name must be lowercase letters, numbers and underscores only")
  }
  const isCarousel = draft.cards.length > 0
  if (isCarousel) {
    // Meta applies the ordinary rules to the body and its own to the cards.
    errors.push(...validateCarousel(draft.cards))
    if (draft.headerType !== "NONE") errors.push("A carousel cannot have its own header — each card carries its image")
    if (draft.category === "AUTHENTICATION") errors.push("Carousels cannot be authentication templates")
  }
  if (!body) errors.push("Body is required")
  if (body.length > 1024) errors.push(`Body is ${body.length} characters — Meta's limit is 1024`)
  if (draft.headerType === "TEXT" && draft.headerContent.length > 60) {
    errors.push("Text header is limited to 60 characters")
  }
  if (draft.footerContent.length > 60) errors.push("Footer is limited to 60 characters")

  // Meta rejects a body that starts or ends with a placeholder — it has no
  // surrounding text to anchor the substitution.
  if (/^\s*\{\{\d+\}\}/.test(body)) errors.push("Body cannot start with a variable")
  if (/\{\{\d+\}\}\s*$/.test(body)) errors.push("Body cannot end with a variable")

  const vars = variablesIn(body)
  if (vars.length > 0) {
    const expected = Array.from({ length: vars.length }, (_, i) => i + 1)
    if (vars.join(",") !== expected.join(",")) {
      errors.push(`Variables must be numbered consecutively from {{1}} — found {{${vars.join("}}, {{")}}}`)
    }
    const missingSamples = vars.filter(v => !draft.sampleValues[v - 1]?.trim())
    if (missingSamples.length > 0) {
      errors.push(`Sample values are required by Meta for {{${missingSamples.join("}}, {{")}}}`)
    }
  }

  if (draft.buttons.length > 3) errors.push("Maximum 3 buttons")
  const urlButtons = draft.buttons.filter(b => b.type === "URL")
  const phoneButtons = draft.buttons.filter(b => b.type === "PHONE_NUMBER")
  if (urlButtons.length > 2) errors.push("Maximum 2 URL buttons")
  if (phoneButtons.length > 1) errors.push("Maximum 1 phone number button")
  draft.buttons.forEach((b, i) => {
    if (!b.text.trim()) errors.push(`Button ${i + 1} needs a label`)
    if (b.text.length > 25) errors.push(`Button ${i + 1} label is over 25 characters`)
    if (b.type === "URL" && !b.url?.trim()) errors.push(`Button ${i + 1} needs a URL`)
    if (b.type === "PHONE_NUMBER" && !b.phone?.trim()) errors.push(`Button ${i + 1} needs a phone number`)
  })

  return errors
}

export function TemplateBuilder({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: TemplateDraft
  onSaved: () => void
}) {
  const [draft, setDraft] = useState<TemplateDraft>(initial || EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [aiBrief, setAiBrief] = useState("")
  const [drafting, setDrafting] = useState(false)

  // The dialog stays mounted between openings, so without this, clicking Edit
  // on a second template would show the first one's contents.
  useEffect(() => {
    if (open) setDraft(initial || EMPTY_DRAFT)
  }, [open, initial])

  const [submitting, setSubmitting] = useState(false)

  const set = <K extends keyof TemplateDraft>(key: K, value: TemplateDraft[K]) =>
    setDraft(d => ({ ...d, [key]: value }))

  const vars = useMemo(() => variablesIn(draft.bodyContent), [draft.bodyContent])
  const errors = useMemo(() => validateTemplate(draft), [draft])

  /**
   * Writes the whole template from a sentence.
   *
   * Fills the name, category, body, footer, buttons and — for a carousel — the
   * cards, so the operator starts from something complete rather than an empty
   * form. Nothing is saved: the draft lands in the form to be read and edited.
   */
  const draftWithAI = async () => {
    if (!aiBrief.trim()) { toast.error("Say what the message should do"); return }
    setDrafting(true)
    try {
      const isCarousel = draft.cards.length > 0
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: isCarousel ? "carousel" : "template",
          brief: aiBrief,
          preview: true,
          // An existing draft is revised rather than replaced.
          ...(draft.bodyContent || draft.cards.length
            ? { current: { name: draft.name, bodyContent: draft.bodyContent, cards: draft.cards } }
            : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error || "Could not draft"); return }

      const d = data.draft
      if (!d) { toast.error("The model returned nothing usable"); return }

      if (d.name) set("name", d.name)
      if (d.category) set("category", d.category)
      if (d.bodyContent) set("bodyContent", d.bodyContent)
      if (d.footerContent !== undefined) set("footerContent", d.footerContent)
      if (!isCarousel) {
        if (d.headerType) set("headerType", d.headerType)
        if (d.headerContent !== undefined) set("headerContent", d.headerContent)
        if (Array.isArray(d.buttons)) {
          set("buttons", d.buttons.map((b: Record<string, unknown>) => ({
            type: b.type === "URL" ? "URL" : b.type === "PHONE_NUMBER" ? "PHONE_NUMBER" : "QUICK_REPLY",
            text: String(b.text || "").slice(0, 20),
            ...(b.url ? { url: String(b.url) } : {}),
          })) as TemplateDraft["buttons"])
        }
        // Sample values are what Meta reviews against, so they are filled from
        // the model's own description of each variable.
        if (Array.isArray(d.variables)) set("sampleValues", d.variables.map(String))
      }
      if (Array.isArray(d.cards) && d.cards.length) {
        set("cards", d.cards.map((card: TemplateDraft["cards"][number], i: number) => ({
          ...card,
          imageUrl: card.imageUrl || draft.cards[i]?.imageUrl || "",
        })))
      }

      setAiBrief("")
      toast.success("Drafted — read it over, then save")
    } finally {
      setDrafting(false)
    }
  }

  const save = async (submitToMeta: boolean) => {
    if (errors.length > 0) {
      toast.error(errors[0])
      return
    }
    if (submitToMeta) setSubmitting(true)
    else setSaving(true)
    try {
      const payload = {
        channel: "WHATSAPP",
        name: draft.name,
        category: draft.category,
        language: draft.language,
        type: draft.cards.length > 0
          ? "CAROUSEL"
          : draft.headerType !== "NONE" && draft.headerType !== "TEXT"
            ? "MEDIA"
            : draft.buttons.length > 0
              ? "INTERACTIVE"
              : "TEXT",
        headerType: draft.headerType,
        headerContent: draft.headerType === "TEXT" ? draft.headerContent : null,
        bodyContent: draft.bodyContent,
        footerContent: draft.footerContent || null,
        buttons: draft.buttons.length ? draft.buttons : null,
        cards: draft.cards.length ? draft.cards : null,
        variables: draft.sampleValues.slice(0, vars.length),
        status: "DRAFT",
      }

      const res = await fetch(draft.id ? `/api/templates/${draft.id}` : "/api/templates", {
        method: draft.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Save failed")

      const templateId = data.template?.id || draft.id

      if (submitToMeta && templateId) {
        const submit = await fetch(`/api/templates/${templateId}/submit-to-meta`, { method: "POST" })
        const submitData = await submit.json()
        if (!submit.ok) throw new Error(submitData.error || "Meta rejected the submission")
        toast.success(
          submitData.simulation
            ? "Saved and marked pending (WhatsApp not configured)"
            : "Submitted to Meta — approval usually takes a few hours",
        )
      } else {
        toast.success("Template saved")
      }

      onSaved()
      onOpenChange(false)
      setDraft(EMPTY_DRAFT)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] sm:max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{draft.id ? "Edit template" : "New WhatsApp template"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* ─── Form ─── */}
          <div className="min-w-0 space-y-4">
            {/* One sentence in, a whole template out — name, body, footer,
                buttons, and the cards when it is a carousel. */}
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                <Wand2 className="h-3.5 w-3.5" />
                {draft.bodyContent || draft.cards.length ? "Rewrite this template with AI" : "Write this whole template with AI"}
              </div>
              <div className="flex gap-1.5">
                <Input
                  className="h-8 text-xs bg-white"
                  placeholder={draft.cards.length
                    ? "e.g. a catalogue of our three desert tours for families"
                    : "e.g. remind a customer the day before their tour, with the meeting point and time"}
                  value={aiBrief}
                  onChange={e => setAiBrief(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); draftWithAI() } }}
                />
                <Button size="sm" className="h-8 bg-amber-600 hover:bg-amber-700" onClick={draftWithAI} disabled={drafting}>
                  {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Draft"}
                </Button>
              </div>
              <p className="text-[10px] text-amber-700">
                Meta&apos;s rules are given to the model, so the draft should pass review. Nothing is saved until you press Save.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs">Template name</Label>
                <Input
                  className="mt-1 font-mono text-xs"
                  placeholder="order_confirmation"
                  value={draft.name}
                  onChange={e => set("name", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                />
              </div>
              <div>
                <Label className="text-xs">Language</Label>
                <Select value={draft.language} onValueChange={v => set("language", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={draft.category} onValueChange={v => set("category", v as any)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTILITY">Utility — order updates, reminders</SelectItem>
                    <SelectItem value="MARKETING">Marketing — offers, promotions</SelectItem>
                    <SelectItem value="AUTHENTICATION">Authentication — one-time codes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Format</Label>
                <Select
                  value={draft.cards.length > 0 ? "CAROUSEL" : "STANDARD"}
                  onValueChange={v => {
                    if (v === "CAROUSEL") {
                      // A carousel has no header of its own; each card has one.
                      set("headerType", "NONE")
                      set("cards", draft.cards.length ? draft.cards : [
                        { imageUrl: "", body: "", buttons: [{ type: "QUICK_REPLY", text: "Book now" }] },
                        { imageUrl: "", body: "", buttons: [{ type: "QUICK_REPLY", text: "Book now" }] },
                      ])
                    } else {
                      set("cards", [])
                    }
                  }}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">Standard message</SelectItem>
                    <SelectItem value="CAROUSEL">Carousel catalogue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className={draft.cards.length > 0 ? "hidden" : ""}>
                <Label className="text-xs">Header</Label>
                <Select value={draft.headerType} onValueChange={v => set("headerType", v as any)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    <SelectItem value="TEXT">Text</SelectItem>
                    <SelectItem value="IMAGE">Image</SelectItem>
                    <SelectItem value="VIDEO">Video</SelectItem>
                    <SelectItem value="DOCUMENT">Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {draft.headerType === "TEXT" && (
              <div>
                <Label className="text-xs">Header text <span className="text-stone-400">({draft.headerContent.length}/60)</span></Label>
                <Input
                  className="mt-1"
                  maxLength={60}
                  value={draft.headerContent}
                  onChange={e => set("headerContent", e.target.value)}
                />
              </div>
            )}

            <div>
              <Label className="text-xs">
                Body <span className="text-stone-400">({draft.bodyContent.length}/1024)</span>
              </Label>
              <Textarea
                className="mt-1 min-h-[140px] text-sm"
                placeholder="Dear {{1}}, your booking {{2}} is confirmed."
                value={draft.bodyContent}
                onChange={e => set("bodyContent", e.target.value)}
              />
              <p className="mt-1 text-[11px] text-stone-500">
                Use <code className="font-mono">{"{{1}}"}</code>, <code className="font-mono">{"{{2}}"}</code> for
                variables. Formatting: <code className="font-mono">*bold*</code>{" "}
                <code className="font-mono">_italic_</code> <code className="font-mono">~strike~</code>
              </p>
            </div>

            {draft.cards.length > 0 && (
              <div className="rounded-lg border p-3">
                <CarouselEditor
                  cards={draft.cards}
                  onChange={cards => set("cards", cards)}
                  bodyContent={draft.bodyContent}
                  onBodyChange={body => set("bodyContent", body)}
                />
              </div>
            )}

            {vars.length > 0 && (
              <div className="rounded-lg border bg-stone-50 p-3 space-y-2">
                <div className="text-xs font-semibold text-stone-700">
                  Sample values <span className="font-normal text-stone-500">— required by Meta for review</span>
                </div>
                {vars.map(v => (
                  <div key={v} className="flex items-center gap-2">
                    <code className="w-12 shrink-0 text-[11px] font-mono text-stone-500">{`{{${v}}}`}</code>
                    <Input
                      className="h-8 text-xs"
                      placeholder={`Example value for {{${v}}}`}
                      value={draft.sampleValues[v - 1] || ""}
                      onChange={e => {
                        const next = [...draft.sampleValues]
                        next[v - 1] = e.target.value
                        set("sampleValues", next)
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            <div>
              <Label className="text-xs">Footer <span className="text-stone-400">({draft.footerContent.length}/60)</span></Label>
              <Input
                className="mt-1"
                maxLength={60}
                placeholder="Oman Adventures"
                value={draft.footerContent}
                onChange={e => set("footerContent", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Buttons <span className="text-stone-400">(max 3)</span></Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={draft.buttons.length >= 3}
                  onClick={() => set("buttons", [...draft.buttons, { type: "QUICK_REPLY", text: "" }])}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />Add button
                </Button>
              </div>
              {draft.buttons.map((b, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border p-2">
                  <Select
                    value={b.type}
                    onValueChange={v => {
                      const next = [...draft.buttons]
                      next[i] = { ...next[i], type: v as any }
                      set("buttons", next)
                    }}
                  >
                    <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="QUICK_REPLY">Quick reply</SelectItem>
                      <SelectItem value="URL">Visit website</SelectItem>
                      <SelectItem value="PHONE_NUMBER">Call phone</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex-1 space-y-1.5">
                    <Input
                      className="h-8 text-xs"
                      placeholder="Button label"
                      maxLength={25}
                      value={b.text}
                      onChange={e => {
                        const next = [...draft.buttons]
                        next[i] = { ...next[i], text: e.target.value }
                        set("buttons", next)
                      }}
                    />
                    {b.type === "URL" && (
                      <Input
                        className="h-8 text-xs font-mono"
                        placeholder="https://…"
                        value={b.url || ""}
                        onChange={e => {
                          const next = [...draft.buttons]
                          next[i] = { ...next[i], url: e.target.value }
                          set("buttons", next)
                        }}
                      />
                    )}
                    {b.type === "PHONE_NUMBER" && (
                      <Input
                        className="h-8 text-xs font-mono"
                        placeholder="+96898821965"
                        value={b.phone || ""}
                        onChange={e => {
                          const next = [...draft.buttons]
                          next[i] = { ...next[i], phone: e.target.value }
                          set("buttons", next)
                        }}
                      />
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-stone-400 hover:text-red-600"
                    onClick={() => set("buttons", draft.buttons.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Live preview ─── */}
          <div className="space-y-3 lg:sticky lg:top-0 lg:self-start">
            <div className="text-xs font-semibold text-stone-700">Live preview</div>
            <WhatsAppPreview
              headerType={draft.headerType}
              headerContent={draft.headerContent}
              bodyContent={draft.bodyContent}
              footerContent={draft.footerContent}
              buttons={draft.buttons}
              sampleValues={draft.sampleValues}
            />

            {errors.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5" />Meta will reject this
                </div>
                <ul className="mt-1.5 space-y-0.5 text-[11px] text-amber-700">
                  {errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 border-t pt-4">
          <Button onClick={() => save(true)} disabled={submitting || errors.length > 0} className="bg-emerald-600 hover:bg-emerald-700">
            <Send className="h-4 w-4 mr-1.5" />{submitting ? "Submitting…" : "Save & submit to Meta"}
          </Button>
          <Button variant="outline" onClick={() => save(false)} disabled={saving || errors.length > 0}>
            <Save className="h-4 w-4 mr-1.5" />{saving ? "Saving…" : "Save as draft"}
          </Button>
          {errors.length > 0 && (
            <Badge variant="outline" className="ml-auto text-amber-700 border-amber-300">
              {errors.length} issue{errors.length === 1 ? "" : "s"}
            </Badge>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
