"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  Bug, Send, CheckCircle2, Copy, Check, MessageSquare,
  AlertTriangle, Monitor, Globe, RotateCcw, ArrowRight, ShieldAlert
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

const MODULES = [
  "Team Shared Inbox",
  "WhatsApp Cloud API & Delivery",
  "Visual Botflow Studio",
  "WooCommerce & Shopify Integration",
  "AmwalPay & Card Payments",
  "Smart Menu & Live Kitchen Display (KDS)",
  "Broadcast Campaigns & Meta Templates",
  "Website Live Chat & WhatsApp Widget",
  "Digital QR Reviews & vCard",
  "Staff & Workspace Authentication",
  "Other / Infrastructure",
]

const SEVERITY_LEVELS = [
  { value: "LOW", label: "Minor", desc: "Cosmetic or minor UI glitch", color: "border-slate-200 text-slate-700 bg-slate-50/50" },
  { value: "MEDIUM", label: "Medium", desc: "Feature impaired, workaround exists", color: "border-blue-200 text-blue-800 bg-blue-50/50" },
  { value: "HIGH", label: "High", desc: "Key functionality broken for team", color: "border-amber-200 text-amber-800 bg-amber-50/50" },
  { value: "CRITICAL", label: "Critical", desc: "Blocker: payments or messaging failing", color: "border-rose-200 text-rose-800 bg-rose-50/50" },
]

export function BugReportForm() {
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState(MODULES[0])
  const [urgency, setUrgency] = useState("MEDIUM")
  const [pageUrl, setPageUrl] = useState("")
  const [browserInfo, setBrowserInfo] = useState("")
  const [stepsToReproduce, setStepsToReproduce] = useState("")
  const [expectedBehavior, setExpectedBehavior] = useState("")
  const [actualBehavior, setActualBehavior] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submittedRef, setSubmittedRef] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Auto-detect browser and environment on client
  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent
      let browser = "Unknown Browser"
      if (ua.includes("Firefox/")) browser = "Firefox"
      else if (ua.includes("Edg/")) browser = "Edge"
      else if (ua.includes("Chrome/")) browser = "Chrome"
      else if (ua.includes("Safari/")) browser = "Safari"

      let os = "Unknown OS"
      if (ua.includes("Mac OS")) os = "macOS"
      else if (ua.includes("Windows")) os = "Windows"
      else if (ua.includes("Android")) os = "Android"
      else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS"
      else if (ua.includes("Linux")) os = "Linux"

      setBrowserInfo(`${browser} on ${os}`)
      if (!pageUrl && window.location.href) {
        setPageUrl(window.location.origin)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || title.length < 3) {
      toast.error("Please enter a short summary of the issue")
      return
    }
    if (!actualBehavior.trim() && !stepsToReproduce.trim()) {
      toast.error("Please explain what happened or how to reproduce the issue")
      return
    }
    if (!name.trim()) {
      toast.error("Please enter your name")
      return
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address so we can follow up")
      return
    }

    setSubmitting(true)
    try {
      const description = [
        actualBehavior.trim() ? `**Observed Problem:**\n${actualBehavior.trim()}` : "",
        stepsToReproduce.trim() ? `**Steps to Reproduce:**\n${stepsToReproduce.trim()}` : "",
      ].filter(Boolean).join("\n\n")

      const res = await fetch("/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "BUG_REPORT",
          title,
          category,
          urgency,
          pageUrl,
          browserInfo,
          description,
          stepsToReproduce,
          expectedBehavior,
          actualBehavior,
          name,
          email,
          phone,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit bug report")
      }

      setSubmittedRef(data.reference)
      toast.success("Bug report logged with engineering!")
    } catch (err: any) {
      toast.error(err.message || "Failed to log bug report. Please try again or reach out on WhatsApp.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopy = () => {
    if (!submittedRef) return
    navigator.clipboard.writeText(submittedRef)
    setCopied(true)
    toast.success("Bug report tracking reference copied")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReset = () => {
    setSubmittedRef(null)
    setTitle("")
    setStepsToReproduce("")
    setExpectedBehavior("")
    setActualBehavior("")
    setCategory(MODULES[0])
    setUrgency("MEDIUM")
  }

  if (submittedRef) {
    return (
      <div className="rounded-3xl border border-rose-200/80 bg-gradient-to-b from-rose-50/60 to-white p-8 sm:p-12 shadow-sm text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-md shadow-rose-600/20 mb-6">
          <Bug className="h-9 w-9" />
        </div>
        <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-bold px-3 py-1 mb-4">
          Bug Report Dispatched to Engineering
        </Badge>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
          Issue Logged Successfully
        </h3>
        <p className="mt-3 max-w-xl mx-auto text-sm sm:text-base text-stone-600 leading-relaxed">
          Our engineering team has received your reproduction details. If you specified a high or critical priority, on-call engineers are notified automatically.
        </p>

        <div className="my-8 max-w-md mx-auto p-4 rounded-2xl bg-white border border-rose-200/60 shadow-inner flex items-center justify-between gap-4">
          <div className="text-left">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">Tracking Reference</span>
            <span className="font-mono font-black text-lg text-rose-700">{submittedRef}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="border-rose-200 hover:bg-rose-50 text-rose-800 gap-1.5"
          >
            {copied ? <Check className="h-4 w-4 text-rose-600" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy Code"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
          <Button
            variant="outline"
            onClick={handleReset}
            className="rounded-xl border-stone-200 gap-2 hover:bg-stone-50"
          >
            <RotateCcw className="h-4 w-4" /> Report Another Issue
          </Button>
          <a
            href={`https://wa.me/96898314456?text=${encodeURIComponent(`Urgent: Bug reference ${submittedRef} reported on app.fizmoh.cloud`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            <MessageSquare className="h-4 w-4" /> Escalate on WhatsApp
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-stone-200/80 bg-white p-6 sm:p-10 shadow-sm">
      <div className="mb-8 border-b border-stone-100 pb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 mb-3">
          <Bug className="h-3.5 w-3.5" /> Technical Issue Reporter
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          Report a Technical Problem
        </h2>
        <p className="mt-2 text-sm text-stone-600 leading-relaxed max-w-2xl">
          Please provide reproducible steps so our technical team can locate the issue quickly and roll out a fix.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
            Issue Summary <span className="text-rose-500">*</span>
          </label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Webhook delivery fails with 500 when order has coupons"
            className="h-11 rounded-xl text-sm border-stone-200 focus-visible:ring-rose-500"
            required
          />
        </div>

        {/* Module & Severity Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
              Affected Component / Feature <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full h-11 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-800 shadow-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
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
              Issue Severity / Impact
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SEVERITY_LEVELS.map(lvl => {
                const active = urgency === lvl.value
                return (
                  <button
                    key={lvl.value}
                    type="button"
                    onClick={() => setUrgency(lvl.value)}
                    className={`rounded-xl border p-2 text-left text-xs transition ${
                      active
                        ? "border-rose-600 bg-rose-50/80 font-bold text-rose-950 ring-2 ring-rose-500/20"
                        : "border-stone-200 bg-stone-50/50 text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    <span className="block font-bold">{lvl.label}</span>
                    <span className="block text-[10px] text-stone-500 mt-0.5 leading-tight">{lvl.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Page URL & Environment */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Page URL or Route <span className="text-stone-400 font-normal">(where bug occurred)</span>
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
              <Input
                value={pageUrl}
                onChange={e => setPageUrl(e.target.value)}
                placeholder="https://app.fizmoh.cloud/..."
                className="pl-9 h-10 rounded-xl text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Browser / Device Environment
            </label>
            <div className="relative">
              <Monitor className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
              <Input
                value={browserInfo}
                onChange={e => setBrowserInfo(e.target.value)}
                placeholder="e.g. Chrome 128 on macOS / Safari on iPhone"
                className="pl-9 h-10 rounded-xl text-sm"
              />
            </div>
          </div>
        </div>

        {/* Steps to Reproduce */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
            Steps to Reproduce
          </label>
          <Textarea
            value={stepsToReproduce}
            onChange={e => setStepsToReproduce(e.target.value)}
            rows={3}
            placeholder="1. Go to Inbox &#10;2. Select an incoming contact &#10;3. Click send media button &#10;4. Error 400 appears"
            className="rounded-xl text-sm border-stone-200 focus-visible:ring-rose-500 leading-relaxed font-mono text-xs"
          />
        </div>

        {/* Expected vs Actual Behavior */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              What should have happened? <span className="text-stone-400 font-normal">(Expected)</span>
            </label>
            <Textarea
              value={expectedBehavior}
              onChange={e => setExpectedBehavior(e.target.value)}
              rows={3}
              placeholder="The media file should attach and send instantly with a checkmark."
              className="rounded-xl text-sm border-stone-200 focus-visible:ring-rose-500 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              What actually happened? <span className="text-rose-500">*</span>
            </label>
            <Textarea
              value={actualBehavior}
              onChange={e => setActualBehavior(e.target.value)}
              rows={3}
              placeholder="The screen showed a red toast error: 'Delivery timeout' and no message was sent."
              className="rounded-xl text-sm border-stone-200 focus-visible:ring-rose-500 leading-relaxed"
              required
            />
          </div>
        </div>

        {/* Submitter Contact */}
        <div className="border-t border-stone-100 pt-6">
          <span className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-4">
            Reporter Information
          </span>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Your Name <span className="text-rose-500">*</span>
              </label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Fatima Al-Balushi"
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
                placeholder="fatima@enterprise.om"
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
                placeholder="+968 9988 7766"
                className="h-10 rounded-xl text-sm"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex items-center justify-between">
          <p className="text-xs text-stone-500">
            For critical outages affecting live store checkout, you can also escalate via our direct WhatsApp channel.
          </p>
          <Button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 h-11 shadow-sm gap-2"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Dispatching Bug Report...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                Submit Bug Report <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
