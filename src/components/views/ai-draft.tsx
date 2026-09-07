"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Sparkles, Loader2, X } from "lucide-react"

/**
 * Drafts a template or a flow from a sentence.
 *
 * Whatever comes back is saved as a draft and left switched off. A model can
 * write a decent first pass, but this is a message that goes to real customers
 * and Meta rejects templates for reasons a model cannot anticipate, so a person
 * reads it before it goes anywhere.
 */
export function AIDraftButton({ kind, onCreated }: { kind: "template" | "flow"; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [brief, setBrief] = useState("")
  const [busy, setBusy] = useState(false)

  const generate = async () => {
    if (!brief.trim()) { toast.error("Describe what you want in a sentence"); return }
    setBusy(true)
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, brief }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error || "Could not generate"); return }
      toast.success(kind === "flow" ? "Flow drafted — review it, then switch it on" : "Template drafted — review it, then submit to Meta")
      setOpen(false)
      setBrief("")
      onCreated()
    } finally {
      setBusy(false)
    }
  }

  const examples = kind === "flow"
    ? "e.g. When someone asks about opening hours, tell them we run 8am–8pm daily and offer to check availability"
    : "e.g. A reminder sent the day before a tour with the meeting point and time"

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Sparkles className="h-4 w-4 mr-1.5 text-amber-500" />
        Draft with AI
      </Button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <Card className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">
                Draft a {kind === "flow" ? "bot flow" : "message template"}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
            </div>

            <Textarea
              rows={4}
              value={brief}
              onChange={e => setBrief(e.target.value)}
              placeholder={examples}
            />

            <p className="text-[11px] text-stone-400">
              Your real tours are given to the model, so it names actual products rather than inventing them.
              {kind === "flow"
                ? " The flow is saved switched off until you have read it."
                : " The template is saved as a draft — you submit it to Meta yourself."}
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={generate} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}Draft it
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
