"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Plus, Trash2, Copy, AlertTriangle, ImageIcon, Loader2, Sparkles, Wand2, Eye } from "lucide-react"
import {
  CAROUSEL_LIMITS, validateCarousel, type CarouselCard, type CarouselButton,
} from "@/lib/carousel"

/**
 * Builds the cards of a carousel template.
 *
 * Meta requires every card to share the same button structure, so adding a
 * button to one card adds it to all of them. Letting them drift and failing on
 * submission would waste a review cycle, which takes days.
 */
export function CarouselEditor({
  cards,
  onChange,
  bodyContent = "",
  onBodyChange,
}: {
  cards: CarouselCard[]
  onChange: (cards: CarouselCard[]) => void
  bodyContent?: string
  onBodyChange?: (body: string) => void
}) {
  const [filling, setFilling] = useState(false)
  const [refining, setRefining] = useState(false)
  const [instruction, setInstruction] = useState("")
  const [showPreview, setShowPreview] = useState(true)
  const problems = validateCarousel(cards)

  /**
   * Writes or rewrites the cards with the assistant.
   *
   * When cards already exist they are sent along with the instruction, so
   * "make them shorter" edits what is there rather than starting again and
   * losing work.
   */
  const askAI = async () => {
    if (!instruction.trim() && cards.length === 0) {
      toast.error("Say what the carousel should be about")
      return
    }
    setRefining(true)
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "carousel",
          brief: instruction || "Write a carousel showcasing our best tours",
          ...(cards.length ? { current: { bodyContent, cards } } : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error || "Could not generate"); return }

      const next = data.draft?.cards ?? []
      if (next.length === 0) { toast.error("The model returned no cards"); return }

      // Any image the model could not match is kept from the existing card
      // rather than blanked, so a refinement never loses artwork.
      onChange(next.map((card: CarouselCard, i: number) => ({
        ...card,
        imageUrl: card.imageUrl || cards[i]?.imageUrl || "",
      })))
      if (data.draft?.bodyContent && onBodyChange) onBodyChange(data.draft.bodyContent)
      setInstruction("")
      toast.success(cards.length ? "Cards rewritten" : "Carousel drafted")
    } finally {
      setRefining(false)
    }
  }

  const update = (index: number, next: Partial<CarouselCard>) =>
    onChange(cards.map((c, i) => (i === index ? { ...c, ...next } : c)))

  const addCard = () => {
    if (cards.length >= CAROUSEL_LIMITS.maxCards) {
      toast.error(`A carousel takes at most ${CAROUSEL_LIMITS.maxCards} cards`)
      return
    }
    // A new card copies the button shape of the first, because they must match.
    const shape: CarouselButton[] = cards[0]?.buttons.map(b => ({ ...b, text: b.text })) ?? [
      { type: "QUICK_REPLY", text: "Book now" },
    ]
    onChange([...cards, { imageUrl: "", body: "", buttons: shape }])
  }

  const addButtonToAll = () => {
    const count = cards[0]?.buttons.length ?? 0
    if (count >= CAROUSEL_LIMITS.maxButtons) {
      toast.error(`At most ${CAROUSEL_LIMITS.maxButtons} buttons per card`)
      return
    }
    onChange(cards.map(c => ({ ...c, buttons: [...c.buttons, { type: "QUICK_REPLY", text: "Book now" }] })))
  }

  const removeButtonFromAll = (buttonIndex: number) =>
    onChange(cards.map(c => ({ ...c, buttons: c.buttons.filter((_, i) => i !== buttonIndex) })))

  /** Fills the carousel from the live tour catalogue. */
  const fillFromTours = async () => {
    setFilling(true)
    try {
      const res = await fetch("/api/tours")
      const data = await res.json()
      const tours = (data.tours || []).slice(0, CAROUSEL_LIMITS.maxCards)
      if (tours.length === 0) { toast.error("No active tours to build from"); return }

      const shape: CarouselButton[] = cards[0]?.buttons ?? [{ type: "QUICK_REPLY", text: "Book now" }]

      onChange(tours.map((tour: Record<string, unknown>) => {
        const media = (() => {
          const raw = tour.media
          const parsed = typeof raw === "string" ? (() => { try { return JSON.parse(raw) } catch { return [] } })() : raw
          return Array.isArray(parsed) ? parsed as { url?: string }[] : []
        })()
        const price = Number(tour.basePrice || 0).toFixed(3)
        return {
          imageUrl: media.find(m => m.url)?.url ?? "",
          // Trimmed to the limit here rather than failing validation after.
          body: `${tour.name} — ${tour.durationHours}h from ${tour.city}. From ${price} OMR per adult.`.slice(0, CAROUSEL_LIMITS.bodyChars),
          buttons: shape.map(b => ({ ...b })),
        }
      }))
      toast.success(`Built ${tours.length} cards from your tours`)
    } finally {
      setFilling(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-stone-900">Carousel cards</div>
          <p className="text-[11px] text-stone-500">
            {CAROUSEL_LIMITS.minCards}–{CAROUSEL_LIMITS.maxCards} cards. Every card must carry the same buttons — Meta rejects the template otherwise.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fillFromTours} disabled={filling}>
            {filling ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-500" />}
            Build from tours
          </Button>
          <Button variant="outline" size="sm" onClick={addCard}>
            <Plus className="h-3.5 w-3.5 mr-1" />Card
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800">
          <Wand2 className="h-3.5 w-3.5" />
          {cards.length ? "Rewrite these cards with AI" : "Write this carousel with AI"}
        </div>
        <div className="flex gap-1.5">
          <Input
            className="h-8 text-xs bg-white"
            placeholder={cards.length
              ? "e.g. make them shorter, or focus on family tours"
              : "e.g. our three best desert tours, aimed at families"}
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") askAI() }}
          />
          <Button size="sm" className="h-8 bg-amber-600 hover:bg-amber-700" onClick={askAI} disabled={refining}>
            {refining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Go"}
          </Button>
        </div>
        <p className="text-[10px] text-amber-700">
          Photographs come from your tours, not the model — it cannot invent a URL that resolves.
        </p>
      </div>

      {cards.length > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-lg border bg-stone-50">
          <span className="text-[11px] text-stone-600">Buttons on every card:</span>
          {cards[0].buttons.map((button, i) => (
            <div key={i} className="flex items-center gap-1">
              <select
                value={button.type}
                onChange={e => onChange(cards.map(c => ({
                  ...c,
                  buttons: c.buttons.map((b, n) => (n === i ? { ...b, type: e.target.value as CarouselButton["type"] } : b)),
                })))}
                className="h-7 px-1.5 rounded border bg-white text-[11px]"
              >
                <option value="QUICK_REPLY">Quick reply</option>
                <option value="URL">Link</option>
              </select>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeButtonFromAll(i)}>
                <Trash2 className="h-3 w-3 text-stone-400" />
              </Button>
            </div>
          ))}
          {cards[0].buttons.length < CAROUSEL_LIMITS.maxButtons && (
            <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={addButtonToAll}>
              <Plus className="h-3 w-3 mr-1" />Add to all
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card, index) => (
          <div key={index} className="rounded-lg border overflow-hidden">
            <div className="flex items-center justify-between px-2 py-1.5 bg-stone-50 border-b">
              <Badge variant="outline" className="text-[10px]">Card {index + 1}</Badge>
              <div className="flex gap-1">
                <Button
                  variant="ghost" size="icon" className="h-6 w-6" title="Duplicate"
                  onClick={() => onChange([...cards.slice(0, index + 1), { ...card, buttons: card.buttons.map(b => ({ ...b })) }, ...cards.slice(index + 1)])}
                >
                  <Copy className="h-3 w-3 text-stone-400" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onChange(cards.filter((_, i) => i !== index))}>
                  <Trash2 className="h-3 w-3 text-stone-400" />
                </Button>
              </div>
            </div>

            <div className="p-2 space-y-2">
              {card.imageUrl
                ? <img src={card.imageUrl} alt="" className="w-full h-24 object-cover rounded bg-stone-100" />
                : <div className="w-full h-24 rounded bg-stone-100 flex items-center justify-center"><ImageIcon className="h-5 w-5 text-stone-300" /></div>}

              <Input
                className="h-8 text-xs"
                placeholder="https://…/photo.jpg"
                value={card.imageUrl}
                onChange={e => update(index, { imageUrl: e.target.value })}
              />
              <div>
                <Textarea
                  rows={2}
                  className="text-xs"
                  placeholder="What this card says"
                  value={card.body}
                  onChange={e => update(index, { body: e.target.value })}
                />
                <div className={`text-[10px] text-right ${card.body.length > CAROUSEL_LIMITS.bodyChars ? "text-rose-600" : "text-stone-400"}`}>
                  {card.body.length}/{CAROUSEL_LIMITS.bodyChars}
                </div>
              </div>

              {card.buttons.map((button, b) => (
                <div key={b} className="flex gap-1.5">
                  <Input
                    className="h-7 text-[11px]"
                    placeholder="Button label"
                    value={button.text}
                    onChange={e => update(index, {
                      buttons: card.buttons.map((x, n) => (n === b ? { ...x, text: e.target.value } : x)),
                    })}
                  />
                  {button.type === "URL" && (
                    <Input
                      className="h-7 text-[11px]"
                      placeholder="https://…"
                      value={button.url ?? ""}
                      onChange={e => update(index, {
                        buttons: card.buttons.map((x, n) => (n === b ? { ...x, url: e.target.value } : x)),
                      })}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {cards.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 hover:text-stone-900"
          >
            <Eye className="h-3.5 w-3.5" />
            {showPreview ? "Hide preview" : "Show preview"}
          </button>

          {showPreview && <CarouselPreview cards={cards} bodyContent={bodyContent} />}
        </div>
      )}

      {cards.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-xs text-stone-500">No cards yet.</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={fillFromTours} disabled={filling}>
            <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-500" />Build from your tours
          </Button>
        </div>
      )}

      {problems.length > 0 && cards.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" />Meta would reject this
          </div>
          <ul className="mt-1 space-y-0.5">
            {problems.map((problem, i) => (
              <li key={i} className="text-[11px] text-amber-700">· {problem}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}


/**
 * How the carousel will look in WhatsApp.
 *
 * Cards scroll horizontally exactly as they do on a phone, so an operator can
 * see that a card is overfull or an image is wrong before spending a Meta
 * review cycle to find out.
 */
export function CarouselPreview({ cards, bodyContent }: { cards: CarouselCard[]; bodyContent?: string }) {
  return (
    // max-w-full and min-w-0 keep the scrolling row inside whatever contains
    // it. Without them a six-card carousel widens its parent instead of
    // scrolling, and the dialog it sits in gets clipped by the viewport.
    <div className="max-w-full min-w-0 overflow-hidden rounded-xl bg-[#0b141a] p-3">
      {bodyContent && (
        <div className="max-w-[17rem] rounded-lg rounded-tl-none bg-[#202c33] px-3 py-2 mb-2">
          <p className="text-[12px] text-stone-100 whitespace-pre-wrap">{bodyContent}</p>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {cards.map((card, index) => (
          <div key={index} className="w-44 shrink-0 rounded-lg bg-[#202c33] overflow-hidden">
            {card.imageUrl
              ? <img src={card.imageUrl} alt="" className="w-full h-24 object-cover" />
              : <div className="w-full h-24 bg-[#2a3942] flex items-center justify-center">
                  <ImageIcon className="h-5 w-5 text-stone-600" />
                </div>}
            <div className="p-2">
              <p className="text-[11px] leading-snug text-stone-100 line-clamp-4">
                {card.body || <span className="text-stone-500">Card text</span>}
              </p>
            </div>
            {card.buttons.map((button, b) => (
              <div key={b} className="border-t border-white/10 py-1.5 text-center text-[11px] text-[#53bdeb]">
                {button.text || "Button"}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
