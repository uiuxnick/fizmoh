"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Sparkles, Send, CheckCircle2, Copy, Check, MessageSquare,
  Lightbulb, Layers, Zap, AlertCircle, ArrowRight, RotateCcw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

const MODULES = [
  "Visual Botflow Studio",
  "Team Shared Inbox",
  "WhatsApp Cloud API & Numbers",
  "WooCommerce & Shopify Store Sync",
  "AmwalPay Online Payments & Checkout",
  "Smart Menu & Restaurant Dining (KDS)",
  "Broadcast Campaigns & Segments",
  "Digital QR Reviews & vCard",
  "Website Live Chat Widget",
  "Platform API & Webhooks",
  "Other / Platform General",
]

const URGENCY_OPTIONS = [
  { value: "LOW", label: "Nice to Have", desc: "Minor convenience or polish", color: "border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50" },
  { value: "MEDIUM", label: "High Value", desc: "Saves time & boosts team efficiency", color: "border-emerald-200 hover:border-emerald-300 text-emerald-800 bg-emerald-50/50" },
  { value: "HIGH", label: "Urgent Need", desc: "Major workflow friction or bottleneck", color: "border-amber-200 hover:border-amber-300 text-amber-800 bg-amber-50/50" },
  { value: "CRITICAL", label: "Critical Blocker", desc: "Essential for core business operations", color: "border-rose-200 hover:border-rose-300 text-rose-800 bg-rose-50/50" },
]

export function FeatureRequestForm() {
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState(MODULES[0])
  const [urgency, setUrgency] = useState("MEDIUM")
  const [description, setDescription] = useState("")
  const [proposedSolution, setProposedSolution] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submittedRef, setSubmittedRef] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || title.length < 3) {
      toast.error("Please enter a descriptive feature title")
      return
    }
    if (!description.trim() || description.length < 10) {
      toast.error("Please explain what your team needs in the description")
      return
    }
    if (!name.trim()) {
      toast.error("Please enter your name")
      return
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please provide a valid work email address")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "FEATURE_REQUEST",
          title,
          category,
          urgency,
          description,
          proposedSolution,
          name,
          email,
          phone,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Submission failed")
      }

      setSubmittedRef(data.reference)
      toast.success("Feature request submitted successfully!")
    } catch (err: any) {
      toast.error(err.message || "Failed to submit feature request. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopy = () => {
    if (!submittedRef) return
    navigator.clipboard.writeText(submittedRef)
    setCopied(true)
    toast.success("Reference code copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReset = () => {
    setSubmittedRef(null)
    setTitle("")
    setDescription("")
    setProposedSolution("")
    setCategory(MODULES[0])
    setUrgency("MEDIUM")
  }

  if (submittedRef) {
    return (
      <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/70 to-white p-8 sm:p-12 shadow-sm text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 mb-6">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold px-3 py-1 mb-4">
          Feature Proposal Received
        </Badge>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
          Thank you for shaping Fizmoh!
        </h3>
        <p className="mt-3 max-w-xl mx-auto text-sm sm:text-base text-stone-600 leading-relaxed">
          Your proposal has been logged with our product team. Each request is reviewed during our weekly roadmap planning cycles.
        </p>

        <div className="my-8 max-w-md mx-auto p-4 rounded-2xl bg-white border border-emerald-200/60 shadow-inner flex items-center justify-between gap-4">
          <div className="text-left">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">Proposal Reference</span>
            <span className="font-mono font-black text-lg text-emerald-700">{submittedRef}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="border-emerald-200 hover:bg-emerald-50 text-emerald-800 gap-1.5"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy Code"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
          <Button
            variant="outline"
            onClick={handleReset}
            className="rounded-xl border-stone-200 gap-2 hover:bg-stone-50"
          >
            <RotateCcw className="h-4 w-4" /> Submit Another Idea
          </Button>
          <a
            href={`https://wa.me/96898314456?text=${encodeURIComponent(`Hi Fizmoh Team, I just submitted feature request ref: ${submittedRef}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            <MessageSquare className="h-4 w-4" /> Discuss on WhatsApp
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-stone-200/80 bg-white p-6 sm:p-10 shadow-sm">
      <div className="mb-8 border-b border-stone-100 pb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 mb-3">
          <Lightbulb className="h-3.5 w-3.5" /> Product Feedback Hub
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          Submit a Feature Request
        </h2>
        <p className="mt-2 text-sm text-stone-600 leading-relaxed max-w-2xl">
          Tell us what workflow your team is trying to achieve. Direct user proposals help us prioritize upcoming releases and bot builder capabilities.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
            Feature Title <span className="text-rose-500">*</span>
          </label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Add custom tags and notes in WhatsApp Team Inbox"
            className="h-11 rounded-xl text-sm border-stone-200 focus-visible:ring-emerald-500"
            required
          />
          <p className="mt-1.5 text-xs text-stone-500">
            A concise headline summarizing the capability you would like to see.
          </p>
        </div>

        {/* Module & Urgency Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
              Platform Module / Area <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full h-11 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {MODULES.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
              Strategic Urgency for Your Team
            </label>
            <div className="grid grid-cols-2 gap-2">
              {URGENCY_OPTIONS.map(opt => {
                const active = urgency === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setUrgency(opt.value)}
                    className={`rounded-xl border p-2 text-left text-xs transition ${
                      active
                        ? "border-emerald-600 bg-emerald-50/80 font-bold text-emerald-950 ring-2 ring-emerald-500/20"
                        : "border-stone-200 bg-stone-50/50 text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    <span className="block font-bold">{opt.label}</span>
                    <span className="block text-[10px] text-stone-500 mt-0.5 leading-tight">{opt.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Problem Statement */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
            What problem or friction does your team face today? <span className="text-rose-500">*</span>
          </label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe what your agents or customers are trying to accomplish and where the current system gets in the way..."
            className="rounded-xl text-sm border-stone-200 focus-visible:ring-emerald-500 leading-relaxed"
            required
          />
        </div>

        {/* Proposed Workflow */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
            Proposed Workflow or Ideal Solution <span className="text-stone-400 font-normal">(Optional)</span>
          </label>
          <Textarea
            value={proposedSolution}
            onChange={e => setProposedSolution(e.target.value)}
            rows={3}
            placeholder="How would you envision this button, automation trigger, or screen behaving?"
            className="rounded-xl text-sm border-stone-200 focus-visible:ring-emerald-500 leading-relaxed"
          />
        </div>

        {/* Submitter Contact Details */}
        <div className="border-t border-stone-100 pt-6">
          <span className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-4">
            Contact Information (so we can follow up with updates)
          </span>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Your Name <span className="text-rose-500">*</span>
              </label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ahmed Al-Harthy"
                className="h-10 rounded-xl text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Work Email <span className="text-rose-500">*</span>
              </label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ahmed@company.om"
                className="h-10 rounded-xl text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                WhatsApp Phone <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+968 9123 4567"
                className="h-10 rounded-xl text-sm"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex items-center justify-between">
          <p className="text-xs text-stone-500">
            We value privacy. Submissions are reviewed exclusively by the Fizmoh core team.
          </p>
          <Button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 h-11 shadow-sm gap-2"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Submitting...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                Submit Feature Proposal <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
