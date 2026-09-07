"use client"

import { useState } from "react"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Calendar, Clock, Video, CheckCircle2, Copy, Check, ArrowRight,
  Sparkles, ExternalLink, ShieldCheck, Building2, User, Mail, Phone,
} from "lucide-react"
import { toast } from "sonner"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"

const INDUSTRIES = [
  "Digital Marketing Agency",
  "Hospital & Healthcare Clinic",
  "Tours & Travel Safari",
  "E-Commerce & Retail Store",
  "Restaurant & Dining POS",
  "Real Estate & Property",
  "General WhatsApp Automation",
]

const TIME_SLOTS = [
  "10:00 AM - 10:30 AM",
  "11:30 AM - 12:00 PM",
  "02:00 PM - 02:30 PM",
  "03:30 PM - 04:00 PM",
  "05:00 PM - 05:30 PM",
  "07:00 PM - 07:30 PM",
]

export function BookDemoDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [company, setCompany] = useState("")
  const [industry, setIndustry] = useState(INDUSTRIES[0])
  const [demoDate, setDemoDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split("T")[0]
  })
  const [demoTime, setDemoTime] = useState(TIME_SLOTS[0])
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [bookedResult, setBookedResult] = useState<{
    googleMeetUrl: string
    demoDate: string
    demoTime: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !phone.trim() || !company.trim()) {
      toast.error("Please fill in all required fields")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/demo/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          company,
          industry,
          demoDate,
          demoTime,
          notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Could not book demo")
        return
      }
      setBookedResult({
        googleMeetUrl: data.googleMeetUrl,
        demoDate: data.demoDate,
        demoTime: data.demoTime,
      })
      toast.success("Google Meet demo scheduled successfully!")
    } catch {
      toast.error("Failed to schedule demo. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const copyMeetUrl = () => {
    if (!bookedResult?.googleMeetUrl) return
    navigator.clipboard.writeText(bookedResult.googleMeetUrl)
    setCopied(true)
    toast.success("Google Meet link copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  const resetForm = () => {
    setBookedResult(null)
    setName("")
    setEmail("")
    setPhone("")
    setCompany("")
    setNotes("")
  }

  const googleCalLink = bookedResult
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`FizMoh Platform Demo: ${company}`)}&details=${encodeURIComponent(`Google Meet Demo with FizMoh Product Specialist.\n\nJoin Link: ${bookedResult.googleMeetUrl}\n\nIndustry: ${industry}\nAttendee: ${name} (${email})`)}&location=${encodeURIComponent(bookedResult.googleMeetUrl)}`
    : "#"

  return (
    <Dialog
      open={open}
      onOpenChange={val => {
        if (!val) resetForm()
        onOpenChange(val)
      }}
    >
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border-stone-200 bg-white rounded-3xl">
        {!bookedResult ? (
          <div>
            {/* Header */}
            <div className="bg-gradient-to-br from-stone-900 via-stone-900 to-emerald-950 text-white p-6 sm:p-7 border-b border-emerald-900/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                  <Video className="h-3.5 w-3.5" /> 1-on-1 Google Meet Demo
                </span>
                <span className="text-stone-400 text-xs">• 30 Minutes</span>
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-black text-white">
                Book a Live Platform Walkthrough
              </DialogTitle>
              <DialogDescription className="text-stone-300 text-xs sm:text-sm mt-1 leading-relaxed">
                See our WhatsApp Commerce engine, AI Bot Builder, and Multi-Tenant operations in action tailored for your business.
              </DialogDescription>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-stone-700">Full Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                    <Input
                      required
                      placeholder="e.g. Salim Al-Rawahi"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="pl-9 h-10 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-stone-700">Work Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                    <Input
                      required
                      type="email"
                      placeholder="salim@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="pl-9 h-10 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-stone-700">WhatsApp / Phone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                    <Input
                      required
                      placeholder="+968 9123 4567"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="pl-9 h-10 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-stone-700">Company Name *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                    <Input
                      required
                      placeholder="Your Company LLC"
                      value={company}
                      onChange={e => setCompany(e.target.value)}
                      className="pl-9 h-10 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-stone-700">Primary Industry / Solution</Label>
                <select
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  className="w-full h-10 rounded-xl border border-stone-200 bg-white px-3 text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {INDUSTRIES.map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-stone-700">Preferred Date *</Label>
                  <Input
                    type="date"
                    required
                    min={new Date().toISOString().split("T")[0]}
                    value={demoDate}
                    onChange={e => setDemoDate(e.target.value)}
                    className="h-10 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-stone-700">Preferred Time Slot *</Label>
                  <select
                    value={demoTime}
                    onChange={e => setDemoTime(e.target.value)}
                    className="w-full h-10 rounded-xl border border-stone-200 bg-white px-3 text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {TIME_SLOTS.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-stone-700">Specific Questions or Requirements (Optional)</Label>
                <Textarea
                  placeholder="Tell us what you'd like to see in the demo (e.g. WhatsApp Bot flow, WooCommerce integration, payment links)..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="rounded-xl text-xs resize-none"
                />
              </div>

              <div className="pt-3">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 gap-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Scheduling Google Meet...
                    </span>
                  ) : (
                    <>
                      <Video className="h-4 w-4" /> Confirm &amp; Generate Google Meet Link
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-center gap-4 text-[11px] text-stone-400 pt-1">
                <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Free Consultation</span>
                <span>•</span>
                <span>Instant Confirmation</span>
              </div>
            </form>
          </div>
        ) : (
          /* Confirmation Screen */
          <div className="p-7 text-center space-y-6">
            <div className="h-16 w-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-sm animate-in zoom-in-75 duration-200">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div className="space-y-1.5">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Demo Confirmed
              </span>
              <h3 className="text-xl font-black text-stone-900 mt-2">
                Your Google Meet Demo is Booked!
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                We have scheduled your session for <strong className="text-stone-800">{bookedResult.demoDate}</strong> at <strong className="text-stone-800">{bookedResult.demoTime}</strong>.
              </p>
            </div>

            {/* Google Meet Link Box */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-left space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
                  <Video className="h-4 w-4 text-emerald-600" /> Google Meet Video Room
                </div>
                <button
                  type="button"
                  onClick={copyMeetUrl}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy Link"}
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-stone-200 font-mono text-xs text-stone-700 select-all truncate">
                {bookedResult.googleMeetUrl}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={bookedResult.googleMeetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1"
                >
                  <Button className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" /> Join Room Now
                  </Button>
                </a>
                <a
                  href={googleCalLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full h-9 text-xs font-bold rounded-xl gap-1.5 border-stone-300">
                    <Calendar className="h-3.5 w-3.5 text-stone-600" /> Add to Calendar
                  </Button>
                </a>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  resetForm()
                  onOpenChange(false)
                }}
                className="text-xs font-semibold text-stone-600 hover:text-stone-900"
              >
                Close &amp; Back to Home
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
