"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"
import { FileText, Send, Upload, Image as ImageIcon, Loader2, Layers, Check } from "lucide-react"

interface CarouselCardItem {
  imageUrl?: string
  videoUrl?: string
  body?: string
  variables?: string[]
  buttonUrl?: string
}

interface TemplateItem {
  id: string
  name: string
  category?: string
  language?: string
  type?: string
  bodyContent: string
  headerType?: string | null
  headerContent?: string | null
  variables?: string | null
  cards?: string | CarouselCardItem[] | null
}

const DEFAULT_WHATSAPP_TEMPLATES: TemplateItem[] = [
  {
    id: "tmpl_greeting",
    name: "greeting",
    category: "UTILITY",
    language: "en",
    bodyContent: "Hello {{1}}, welcome to Oman Adventures! How can our team assist you today?",
    variables: JSON.stringify(["customer_name"]),
  },
  {
    id: "tmpl_order_confirm",
    name: "order_confirmation",
    category: "TRANSACTIONAL",
    language: "en",
    bodyContent: "Thank you {{1}}! Your booking #{{2}} for {{3}} has been confirmed. Total paid: {{4}}.",
    variables: JSON.stringify(["customer_name", "order_number", "tour_name", "amount"]),
  },
  {
    id: "tmpl_tour_reminder",
    name: "tour_booking_reminder",
    category: "UTILITY",
    language: "en",
    bodyContent: "Hi {{1}}, this is a friendly reminder for your upcoming tour {{2}} scheduled on {{3}}. Pickup location: {{4}}.",
    variables: JSON.stringify(["customer_name", "tour_name", "date_time", "pickup_location"]),
  },
  {
    id: "tmpl_payment_link",
    name: "payment_reminder",
    category: "UTILITY",
    language: "en",
    bodyContent: "Dear {{1}}, your invoice for booking #{{2}} is ready. Please complete payment using this secure link: {{3}}.",
    variables: JSON.stringify(["customer_name", "order_number", "payment_link"]),
  },
]

async function uploadFile(file: File): Promise<string | null> {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch("/api/media/upload", { method: "POST", body: form })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    toast.error(data.error || "Upload failed")
    return null
  }
  return data.url
}

export function TemplatePicker({
  conversationId,
  onSent,
}: {
  conversationId: string
  onSent: () => void
}) {
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [selectedTmpl, setSelectedTmpl] = useState<TemplateItem | null>(null)
  const [varValues, setVarValues] = useState<Record<string, string>>({})
  const [headerMediaUrl, setHeaderMediaUrl] = useState("")
  const [uploadingHeader, setUploadingHeader] = useState(false)
  
  // Carousel Card Media state
  const [cardItems, setCardItems] = useState<CarouselCardItem[]>([])
  const [uploadingCardIdx, setUploadingCardIdx] = useState<number | null>(null)
  const [sending, setSending] = useState(false)

  const headerFileInput = useRef<HTMLInputElement>(null)
  const cardFileInput = useRef<HTMLInputElement>(null)
  const activeCardIdxRef = useRef<number>(0)

  const loadTemplates = () => {
    fetch("/api/templates?channel=WHATSAPP")
      .then(r => r.json())
      .then(d => {
        const fetched = d.templates || []
        if (fetched.length > 0) {
          setTemplates(fetched)
        } else {
          setTemplates(DEFAULT_WHATSAPP_TEMPLATES)
        }
      })
      .catch(() => setTemplates(DEFAULT_WHATSAPP_TEMPLATES))
  }

  useEffect(() => {
    if (open) loadTemplates()
  }, [open])

  const selectTemplate = (tmpl: TemplateItem) => {
    setSelectedTmpl(tmpl)
    setHeaderMediaUrl(tmpl.headerContent || "")

    // Detect variables like {{1}}, {{2}}
    const matches = tmpl.bodyContent.match(/\{\{(\d+)\}\}/g) || []
    const initialVars: Record<string, string> = {}
    matches.forEach(m => {
      const key = m.replace(/[\{\}]/g, "")
      initialVars[key] = ""
    })
    setVarValues(initialVars)

    // Parse carousel cards if present
    let parsedCards: CarouselCardItem[] = []
    if (tmpl.cards) {
      try {
        parsedCards = typeof tmpl.cards === "string" ? JSON.parse(tmpl.cards) : tmpl.cards
      } catch {
        parsedCards = []
      }
    }
    setCardItems(Array.isArray(parsedCards) ? parsedCards : [])
  }

  const handleHeaderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingHeader(true)
    try {
      const url = await uploadFile(file)
      if (url) {
        setHeaderMediaUrl(url)
        toast.success("Header media uploaded!")
      }
    } finally {
      setUploadingHeader(false)
      if (e.target) e.target.value = ""
    }
  }

  const handleCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const idx = activeCardIdxRef.current
    if (!file) return
    setUploadingCardIdx(idx)
    try {
      const url = await uploadFile(file)
      if (url) {
        setCardItems(prev => prev.map((c, i) => (i === idx ? { ...c, imageUrl: url } : c)))
        toast.success(`Image uploaded for Card ${idx + 1}!`)
      }
    } finally {
      setUploadingCardIdx(null)
      if (e.target) e.target.value = ""
    }
  }

  const triggerCardUpload = (index: number) => {
    activeCardIdxRef.current = index
    cardFileInput.current?.click()
  }

  const sendTemplate = async () => {
    if (!selectedTmpl) return

    // If carousel template, check all cards have an image
    if (cardItems.length > 0) {
      const missingIdx = cardItems.findIndex(c => !c.imageUrl?.trim() && !c.videoUrl?.trim())
      if (missingIdx !== -1) {
        toast.error(`Please upload an image for Carousel Card ${missingIdx + 1} before sending.`)
        return
      }
    }

    // Check header media if required
    const needsHeaderMedia =
      selectedTmpl.headerType &&
      selectedTmpl.headerType !== "NONE" &&
      selectedTmpl.headerType !== "TEXT"
    if (needsHeaderMedia && !headerMediaUrl.trim()) {
      toast.error(`Please upload or provide a ${selectedTmpl.headerType} URL for the header.`)
      return
    }

    setSending(true)

    let formattedBody = selectedTmpl.bodyContent
    const orderedVars: string[] = []
    const varKeys = Object.keys(varValues).sort((a, b) => Number(a) - Number(b))

    varKeys.forEach(k => {
      const val = varValues[k] || `{{${k}}}`
      orderedVars.push(varValues[k] || "")
      formattedBody = formattedBody.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), val)
    })

    const payloadCards = cardItems.length
      ? cardItems.map(c => ({
          imageUrl: c.imageUrl,
          videoUrl: c.videoUrl,
          variables: c.variables,
          buttonUrl: c.buttonUrl,
        }))
      : undefined

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction: "OUTBOUND",
          type: "TEMPLATE",
          templateName: selectedTmpl.name,
          templateVariables: orderedVars,
          language: selectedTmpl.language || "en",
          headerMediaUrl: headerMediaUrl.trim() || undefined,
          headerMediaType: selectedTmpl.headerType || "IMAGE",
          cards: payloadCards,
          content: formattedBody,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(`Template "${selectedTmpl.name}" sent!`)
        setOpen(false)
        setSelectedTmpl(null)
        onSent()
      } else {
        toast.error(data.error || "Failed to send template")
      }
    } catch {
      toast.error("Failed to send template")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Hidden file inputs */}
      <input ref={headerFileInput} type="file" hidden onChange={handleHeaderUpload} accept="image/*,video/*,application/pdf" />
      <input ref={cardFileInput} type="file" hidden onChange={handleCardUpload} accept="image/*,video/*" />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-stone-500 hover:text-emerald-600"
            title="Send Meta WhatsApp Template"
          >
            <FileText className="h-4 w-4" />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-[420px] max-h-[85vh] overflow-y-auto p-3">
          <div className="flex items-center justify-between border-b pb-2 mb-2">
            <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-emerald-600" />
              Meta WhatsApp Templates
            </span>
            <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200">
              Approved
            </Badge>
          </div>

          {!selectedTmpl ? (
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {templates.map(tmpl => {
                const isCarousel = tmpl.type === "CAROUSEL" || (tmpl.cards && JSON.parse(String(tmpl.cards)).length > 0)
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => selectTemplate(tmpl)}
                    className="w-full text-left p-2.5 rounded-lg border border-stone-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900 group-hover:text-emerald-700 flex items-center gap-1">
                        {tmpl.name}
                        {isCarousel && <Badge className="text-[8px] bg-purple-100 text-purple-700">Carousel</Badge>}
                      </span>
                      <span className="text-[10px] text-stone-400 uppercase">{tmpl.category || "UTILITY"}</span>
                    </div>
                    <p className="text-[11px] text-stone-600 line-clamp-2 mt-1 bg-stone-50 p-1.5 rounded font-mono text-[10px]">
                      {tmpl.bodyContent}
                    </p>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-stone-100 p-2 rounded-lg">
                <div>
                  <div className="text-xs font-bold text-stone-800 flex items-center gap-1">
                    {selectedTmpl.name}
                    {cardItems.length > 0 && <Badge className="text-[8px] bg-purple-100 text-purple-700">Carousel ({cardItems.length} cards)</Badge>}
                  </div>
                  <div className="text-[10px] text-stone-500">Language: {selectedTmpl.language || "en"}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTmpl(null)}
                  className="h-6 text-[10px] text-stone-500 hover:text-stone-800"
                >
                  Change
                </Button>
              </div>

              {/* Header Media Section */}
              {selectedTmpl.headerType && selectedTmpl.headerType !== "NONE" && (
                <div className="p-2 bg-amber-50/60 border border-amber-200 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                      <ImageIcon className="h-3.5 w-3.5 text-amber-600" />
                      Header Media ({selectedTmpl.headerType})
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => headerFileInput.current?.click()}
                      disabled={uploadingHeader}
                      className="h-6 text-[10px] bg-white gap-1"
                    >
                      {uploadingHeader ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                      Upload File
                    </Button>
                  </div>
                  <Input
                    placeholder="https://... or click Upload File"
                    value={headerMediaUrl}
                    onChange={e => setHeaderMediaUrl(e.target.value)}
                    className="h-7 text-xs bg-white"
                  />
                  {headerMediaUrl && (
                    <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                      <Check className="h-3 w-3" /> Header media ready
                    </div>
                  )}
                </div>
              )}

              {/* Body Content Preview */}
              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1">Body Preview</label>
                <div className="text-xs p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-stone-800 whitespace-pre-wrap font-sans">
                  {selectedTmpl.bodyContent}
                </div>
              </div>

              {/* Template Body Variables */}
              {Object.keys(varValues).length > 0 && (
                <div className="space-y-2 border-t pt-2">
                  <label className="text-[11px] font-semibold text-stone-700 block">Template Variables</label>
                  {Object.keys(varValues).map(key => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-emerald-700 w-12 shrink-0">{`{{${key}}}`}</span>
                      <Input
                        placeholder={`Value for {{${key}}}`}
                        value={varValues[key]}
                        onChange={e => setVarValues({ ...varValues, [key]: e.target.value })}
                        className="h-7 text-xs flex-1"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Carousel Cards Section */}
              {cardItems.length > 0 && (
                <div className="space-y-2 border-t pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-purple-600" />
                      Carousel Card Images & Media ({cardItems.length} cards)
                    </label>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {cardItems.map((card, idx) => (
                      <div key={idx} className="p-2 border rounded-lg bg-purple-50/40 border-purple-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-purple-800">Card {idx + 1}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => triggerCardUpload(idx)}
                            disabled={uploadingCardIdx === idx}
                            className="h-6 text-[10px] bg-white gap-1 border-purple-300 text-purple-700 hover:bg-purple-100"
                          >
                            {uploadingCardIdx === idx ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                            {card.imageUrl ? "Change Image" : "Upload Image"}
                          </Button>
                        </div>
                        {card.body && <p className="text-[10px] text-stone-600 line-clamp-1 italic">{card.body}</p>}
                        <Input
                          placeholder={`Card ${idx + 1} image URL (https://...)`}
                          value={card.imageUrl || ""}
                          onChange={e => {
                            const val = e.target.value
                            setCardItems(prev => prev.map((c, i) => (i === idx ? { ...c, imageUrl: val } : c)))
                          }}
                          className="h-7 text-xs bg-white"
                        />
                        {card.imageUrl ? (
                          <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                            <Check className="h-3 w-3" /> Image attached for Card {idx + 1}
                          </div>
                        ) : (
                          <div className="text-[10px] text-rose-600 font-medium">
                            ⚠️ Image required for Card {idx + 1}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={sendTemplate}
                disabled={sending || uploadingHeader || uploadingCardIdx !== null}
                className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5 mt-2"
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {sending ? "Sending Template..." : "Send Meta Template"}
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </>
  )
}
