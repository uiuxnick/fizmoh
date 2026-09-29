"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Brain, Sparkles, Check, Trash2, Plus, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface LearnedFact {
  question: string
  answer: string
  topic?: string
  confidence?: number
}

export function ChatTrainingModal({
  conversationId,
  triggerButton,
}: {
  conversationId: string
  triggerButton?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [candidates, setCandidates] = useState<LearnedFact[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)

  const analyzeChat = async () => {
    setLoading(true)
    setCandidates([])
    setHasLoaded(false)
    try {
      const res = await fetch(`/api/conversations/${conversationId}/train`)
      const data = await res.json()
      if (res.ok) {
        setCandidates(data.candidates || [])
      } else {
        toast.error(data.error || "Failed to analyze conversation")
      }
    } catch {
      toast.error("Network error analyzing conversation")
    } finally {
      setLoading(false)
      setHasLoaded(true)
    }
  }

  const handleOpen = () => {
    setOpen(true)
    analyzeChat()
  }

  const handleSaveToKnowledge = async () => {
    if (candidates.length === 0) return
    setSaving(true)
    try {
      const res = await fetch(`/api/conversations/${conversationId}/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learnings: candidates }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Successfully trained AI with ${data.chunkCount || candidates.length} new knowledge passages!`)
        setOpen(false)
      } else {
        toast.error(data.error || "Failed to save knowledge")
      }
    } catch {
      toast.error("Network error saving to knowledge base")
    } finally {
      setSaving(false)
    }
  }

  const updateCandidate = (index: number, patch: Partial<LearnedFact>) => {
    setCandidates(prev => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const removeCandidate = (index: number) => {
    setCandidates(prev => prev.filter((_, i) => i !== index))
  }

  const addManualCandidate = () => {
    setCandidates(prev => [
      ...prev,
      {
        question: "",
        answer: "",
        topic: "General",
        confidence: 1.0,
      },
    ])
  }

  return (
    <>
      {triggerButton ? (
        <div onClick={handleOpen}>{triggerButton}</div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={handleOpen}
          className="h-7 text-xs font-semibold gap-1.5 bg-gradient-to-r from-violet-50 to-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100/80 shadow-2xs"
          title="Analyze this conversation and train AI with new facts"
        >
          <Brain className="h-3.5 w-3.5 text-purple-600" />
          <span>Train AI</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <span>Train AI from Conversation</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1 text-xs">
            <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-semibold text-purple-900">Autonomous Chat Knowledge Extraction</div>
                <p className="text-purple-700/90 leading-relaxed text-[11px]">
                  The AI analyzes the full dialogue between your team and customer, strips private customer info, and extracts reusable business FAQs and facts to expand your bot&apos;s brain.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3 text-stone-400">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                <span className="text-xs font-medium text-stone-600">Reading conversation &amp; distilling facts…</span>
              </div>
            ) : hasLoaded && candidates.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-stone-200 text-center space-y-2">
                <AlertCircle className="h-6 w-6 text-stone-400 mx-auto" />
                <div className="font-semibold text-stone-700">No New Business Facts Detected</div>
                <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
                  This conversation did not contain new generalized FAQs or policies (chit-chat, greetings, or customer PII were excluded).
                </p>
                <Button size="sm" variant="outline" onClick={addManualCandidate} className="h-7 text-xs gap-1 mt-2">
                  <Plus className="h-3 w-3" /> Add Custom Q&amp;A from this Chat
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-700 text-xs">
                    Extracted Knowledge Candidates ({candidates.length})
                  </span>
                  <Button size="sm" variant="ghost" onClick={addManualCandidate} className="h-6 text-[11px] text-purple-700 hover:bg-purple-50 gap-1">
                    <Plus className="h-3 w-3" /> Add Fact
                  </Button>
                </div>

                {candidates.map((c, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2 relative group">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 text-[10px] font-semibold border-purple-200">
                          {c.topic || "Q&A"}
                        </Badge>
                        {c.confidence && (
                          <span className="text-[10px] text-emerald-600 font-medium">
                            {Math.round(c.confidence * 100)}% match confidence
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeCandidate(i)}
                        className="text-stone-300 hover:text-rose-500 transition-colors"
                        title="Remove candidate"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-stone-500 block mb-0.5">Customer Question / Trigger</label>
                      <Input
                        value={c.question}
                        onChange={e => updateCandidate(i, { question: e.target.value })}
                        placeholder="e.g. Do you deliver to Al-Seeb?"
                        className="h-7 text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-stone-500 block mb-0.5">AI Answer / Business Policy</label>
                      <Textarea
                        rows={2}
                        value={c.answer}
                        onChange={e => updateCandidate(i, { answer: e.target.value })}
                        placeholder="e.g. Yes, delivery is available from 12 PM to 10 PM daily..."
                        className="text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t flex items-center justify-between sm:justify-between">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveToKnowledge}
              disabled={saving || candidates.length === 0}
              className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-1.5"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              <span>Approve &amp; Add to Knowledge Base</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
