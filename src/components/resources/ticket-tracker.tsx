"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Search, CheckCircle2, Clock, MessageSquare, AlertCircle,
  ExternalLink, Sparkles, Lightbulb, Bug, Headphones, Loader2
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface TrackedTicket {
  reference: string
  subject: string
  status: string
  priority: string
  channel: string
  createdAt: string
  resolvedAt: string | null
  replies: Array<{
    id: string
    body: string
    createdAt: string
  }>
}

export function TicketTracker({ defaultRef = "" }: { defaultRef?: string }) {
  const [refInput, setRefInput] = useState(defaultRef)
  const [loading, setLoading] = useState(false)
  const [ticket, setTicket] = useState<TrackedTicket | null>(null)
  const [searched, setSearched] = useState(false)

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanRef = refInput.trim().toUpperCase()
    if (!cleanRef || cleanRef.length < 5) {
      toast.error("Please enter a valid reference code (e.g. FR-XXXX-XXXX or BUG-XXXX-XXXX)")
      return
    }

    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/feedback/track?ref=${encodeURIComponent(cleanRef)}`)
      const data = await res.json()
      if (!res.ok) {
        setTicket(null)
        toast.error(data.error || "No ticket found with this reference code")
        return
      }
      setTicket(data.ticket)
    } catch {
      setTicket(null)
      toast.error("Could not check ticket status. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const getStatusStep = (status: string) => {
    if (status === "RESOLVED" || status === "CLOSED") return 4
    if (status === "IN_PROGRESS") return 3
    if (status === "WAITING") return 2
    return 1 // OPEN
  }

  const getChannelBadge = (channel: string, subject: string) => {
    if (channel === "FEATURE_REQUEST" || subject.startsWith("[Feature Request]")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
          <Lightbulb className="h-3 w-3 text-purple-600" /> Feature Request
        </span>
      )
    }
    if (channel === "BUG_REPORT" || subject.startsWith("[Bug Report]")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <Bug className="h-3 w-3 text-rose-600" /> Bug Report
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-700 border border-stone-200">
        <Headphones className="h-3 w-3 text-stone-500" /> Support Ticket
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search Box */}
      <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Enter tracking reference (e.g. FR-9182-AB34 or BUG-4019-CD21)..."
            value={refInput}
            onChange={e => setRefInput(e.target.value)}
            className="pl-10 h-11 text-sm rounded-2xl bg-white border-stone-200 uppercase font-mono tracking-wider"
          />
        </div>
        <Button
          type="submit"
          disabled={loading || !refInput.trim()}
          className="h-11 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm gap-2 shrink-0 shadow-xs"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Check Status
        </Button>
      </form>

      {/* Ticket Details Result */}
      {ticket && (
        <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black px-2.5 py-0.5 rounded-lg bg-stone-100 text-stone-900 border border-stone-200">
                  {ticket.reference}
                </span>
                {getChannelBadge(ticket.channel, ticket.subject)}
              </div>
              <h3 className="text-xl font-black text-stone-900 mt-2">{ticket.subject}</h3>
              <p className="text-xs text-stone-500">
                Submitted on {new Date(ticket.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            <a
              href={`https://wa.me/96898314456?text=${encodeURIComponent(`Hello, I would like an update on my ticket ${ticket.reference}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition self-start sm:self-auto shrink-0"
            >
              <MessageSquare className="h-3.5 w-3.5" /> WhatsApp Support
            </a>
          </div>

          {/* Progress Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">Resolution Progress</h4>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { step: 1, label: "Received", desc: "Logged in queue" },
                { step: 2, label: "Under Review", desc: "Triaged by team" },
                { step: 3, label: "In Development", desc: "Engineering working" },
                { step: 4, label: "Resolved", desc: "Live in production" },
              ].map(s => {
                const currentStep = getStatusStep(ticket.status)
                const isComplete = currentStep >= s.step
                const isCurrent = currentStep === s.step
                return (
                  <div
                    key={s.step}
                    className={`p-3 rounded-2xl border transition-all ${
                      isComplete
                        ? isCurrent
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                          : "bg-stone-50 border-emerald-200 text-emerald-800"
                        : "bg-stone-50/50 border-stone-200/60 text-stone-400"
                    }`}
                  >
                    <div className="flex items-center justify-center mb-1">
                      {isComplete ? (
                        <CheckCircle2 className={`h-4 w-4 ${isCurrent ? "text-emerald-600 animate-pulse" : "text-emerald-500"}`} />
                      ) : (
                        <Clock className="h-4 w-4 text-stone-300" />
                      )}
                    </div>
                    <div className="text-xs font-black">{s.label}</div>
                    <div className="text-[10px] hidden sm:block opacity-75">{s.desc}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Public Engineering Updates / Thread */}
          {ticket.replies.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Official Updates from Fizmoh Engineering ({ticket.replies.length})
              </h4>
              <div className="space-y-3">
                {ticket.replies.map(r => (
                  <div key={r.id} className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-stone-500 text-[11px]">
                      <span className="font-bold text-stone-700 flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-emerald-600" /> Fizmoh Platform Team
                      </span>
                      <span>{new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-stone-800 whitespace-pre-wrap leading-relaxed">{r.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {searched && !loading && !ticket && (
        <div className="p-8 rounded-3xl border border-stone-200 bg-stone-50 text-center space-y-2">
          <AlertCircle className="h-8 w-8 text-stone-400 mx-auto" />
          <h4 className="text-sm font-bold text-stone-800">No ticket found</h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Please verify the reference code format. Example formats: <code className="bg-stone-200 px-1.5 py-0.5 rounded text-stone-800 font-mono">FR-XXXX-XXXX</code> or <code className="bg-stone-200 px-1.5 py-0.5 rounded text-stone-800 font-mono">BUG-XXXX-XXXX</code>.
          </p>
        </div>
      )}
    </div>
  )
}
