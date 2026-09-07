"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "@/context/language-context"
import {
  Calendar, Clock, Video, CheckCircle2, Copy, Check, ArrowRight,
  Sparkles, ExternalLink, ShieldCheck, Building2, User, Mail, Phone,
} from "lucide-react"
import { toast } from "sonner"

const INDUSTRIES = [
  { en: "Digital Marketing Agency", ar: "وكالة تسويق رقمي" },
  { en: "Hospital & Healthcare Clinic", ar: "مستشفى أو عيادة طبية" },
  { en: "Tours & Travel Safari", ar: "مشغل جولات وسياحة وسفاري" },
  { en: "E-Commerce & Retail Store", ar: "متجر تجارة إلكترونية وتجزئة" },
  { en: "Restaurant & Dining POS", ar: "مطعم ونقاط بيع وتوصيل" },
  { en: "Real Estate & Property", ar: "تطوير ووساطة عقارية" },
  { en: "General WhatsApp Automation", ar: "أتمتة عامة لواتساب للشركات" },
]

const TIME_SLOTS = [
  "10:00 AM - 10:30 AM",
  "11:30 AM - 12:00 PM",
  "02:00 PM - 02:30 PM",
  "03:30 PM - 04:00 PM",
  "05:00 PM - 05:30 PM",
  "07:00 PM - 07:30 PM",
]

export function BookDemoDirect() {
  const { isAr } = useLanguage()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [company, setCompany] = useState("")
  const [industry, setIndustry] = useState(INDUSTRIES[0].en)
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
      toast.error(isAr ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill in all required fields")
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
        toast.error(data.error || (isAr ? "تعذر حجز الموعد" : "Could not book demo"))
        return
      }
      setBookedResult({
        googleMeetUrl: data.googleMeetUrl,
        demoDate: data.demoDate,
        demoTime: data.demoTime,
      })
      toast.success(isAr ? "تم جدولة اجتماع Google Meet بنجاح!" : "Google Meet demo scheduled successfully!")
    } catch {
      toast.error(isAr ? "فشل في جدولة الموعد، يرجى المحاولة مرة أخرى" : "Failed to schedule demo. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const copyMeetUrl = () => {
    if (!bookedResult?.googleMeetUrl) return
    navigator.clipboard.writeText(bookedResult.googleMeetUrl)
    setCopied(true)
    toast.success(isAr ? "تم نسخ رابط Google Meet!" : "Google Meet link copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  const googleCalLink = bookedResult
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`FizMoh Platform Demo: ${company}`)}&details=${encodeURIComponent(`Google Meet Demo with FizMoh Product Specialist.\n\nJoin Link: ${bookedResult.googleMeetUrl}\n\nIndustry: ${industry}\nAttendee: ${name} (${email})`)}&location=${encodeURIComponent(bookedResult.googleMeetUrl)}`
    : "#"

  return (
    <div className={`max-w-xl mx-auto bg-white rounded-[16px] border border-[#E5E7EB] shadow-sm overflow-hidden ${isAr ? "rtl font-sans" : "ltr"}`} dir={isAr ? "rtl" : "ltr"}>
      {!bookedResult ? (
        <div>
          {/* Header */}
          <div className="bg-gradient-to-b from-[#FFF6DA]/60 to-white text-[#1D1D1D] p-6 sm:p-7 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[6px] bg-[#00E785]/20 text-[#1D1D1D] text-[11px] font-bold border border-[#00E785]/40">
                <Video className="h-3.5 w-3.5 text-[#00B96A]" />
                {isAr ? "عرض توضيحي مباشر 1-on-1" : "1-on-1 Google Meet Demo"}
              </span>
              <span className="text-[#717680] text-[12px]">• {isAr ? "30 دقيقة" : "30 Minutes"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1D1D1D]">
              {isAr ? "حدد موعد العرض التوضيحي للمنصة" : "Schedule Your Platform Demo"}
            </h1>
            <p className="text-[#717680] text-[13px] mt-1.5 leading-relaxed">
              {isAr
                ? "اجتمع مباشرة مع مهندس حلول لاستكشاف مسارات تجارة واتساب المخصصة، وإعدادات روبوت الذكاء الاصطناعي لشركتك."
                : "Meet live with a product engineer to explore customized WhatsApp Commerce flows and AI Bot configurations."}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <Label className="text-[12px] font-bold text-[#1D1D1D]">
                  {isAr ? "الاسم الكامل *" : "Full Name *"}
                </Label>
                <div className="relative">
                  <User className={`absolute ${isAr ? "right-3" : "left-3"} top-3 h-4 w-4 text-[#717680]`} />
                  <Input
                    required
                    placeholder={isAr ? "سالم الرواحي" : "Salim Al-Rawahi"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`${isAr ? "pr-9 text-right" : "pl-9 text-left"} bg-white border-[#E5E7EB] text-[#1D1D1D] h-10 rounded-[8px] text-[13px] focus:ring-[#00E785]`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[12px] font-bold text-[#1D1D1D]">
                  {isAr ? "البريد الإلكتروني للعمل *" : "Work Email *"}
                </Label>
                <div className="relative">
                  <Mail className={`absolute ${isAr ? "right-3" : "left-3"} top-3 h-4 w-4 text-[#717680]`} />
                  <Input
                    required
                    type="email"
                    placeholder="salim@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${isAr ? "pr-9 text-right" : "pl-9 text-left"} bg-white border-[#E5E7EB] text-[#1D1D1D] h-10 rounded-[8px] text-[13px] focus:ring-[#00E785]`}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <Label className="text-[12px] font-bold text-[#1D1D1D]">
                  {isAr ? "رقم الهاتف / واتساب *" : "WhatsApp Number *"}
                </Label>
                <div className="relative">
                  <Phone className={`absolute ${isAr ? "right-3" : "left-3"} top-3 h-4 w-4 text-[#717680]`} />
                  <Input
                    required
                    placeholder="+968 9123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`${isAr ? "pr-9 text-right" : "pl-9 text-left"} bg-white border-[#E5E7EB] text-[#1D1D1D] h-10 rounded-[8px] text-[13px] focus:ring-[#00E785]`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[12px] font-bold text-[#1D1D1D]">
                  {isAr ? "اسم الشركة *" : "Company Name *"}
                </Label>
                <div className="relative">
                  <Building2 className={`absolute ${isAr ? "right-3" : "left-3"} top-3 h-4 w-4 text-[#717680]`} />
                  <Input
                    required
                    placeholder={isAr ? "شركة النماء" : "Your Company LLC"}
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className={`${isAr ? "pr-9 text-right" : "pl-9 text-left"} bg-white border-[#E5E7EB] text-[#1D1D1D] h-10 rounded-[8px] text-[13px] focus:ring-[#00E785]`}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[12px] font-bold text-[#1D1D1D]">
                {isAr ? "القطاع / مجال النشاط" : "Industry / Solution Focus"}
              </Label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full h-10 rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#1D1D1D] focus:outline-none focus:ring-1 focus:ring-[#00E785]"
              >
                {INDUSTRIES.map((ind) => (
                  <option key={ind.en} value={ind.en}>
                    {isAr ? ind.ar : ind.en}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <Label className="text-[12px] font-bold text-[#1D1D1D]">
                  {isAr ? "التاريخ المفضل *" : "Preferred Date *"}
                </Label>
                <Input
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  value={demoDate}
                  onChange={(e) => setDemoDate(e.target.value)}
                  className="h-10 rounded-[8px] text-[13px] bg-white border-[#E5E7EB] text-[#1D1D1D]"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[12px] font-bold text-[#1D1D1D]">
                  {isAr ? "الوقت المفضل *" : "Preferred Time Slot *"}
                </Label>
                <select
                  value={demoTime}
                  onChange={(e) => setDemoTime(e.target.value)}
                  className="w-full h-10 rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#1D1D1D] focus:outline-none focus:ring-1 focus:ring-[#00E785]"
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[12px] font-bold text-[#1D1D1D]">
                {isAr ? "ملاحظات أو استفسارات خاصة (اختياري)" : "Topics & Objectives (Optional)"}
              </Label>
              <Textarea
                placeholder={
                  isAr
                    ? "ما هي الميزات أو التكاملات المحددة التي ترغب بمناقشتها؟"
                    : "Any specific integrations, volume requirements, or questions?"
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-[8px] text-[13px] min-h-20 bg-white border-[#E5E7EB] text-[#1D1D1D] focus:ring-[#00E785]"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00E785] hover:bg-[#00B96A] text-[#1D1D1D] font-bold rounded-[8px] h-11 text-[13.5px] border border-[#00B96A]/20 mt-1 cursor-pointer"
            >
              {loading ? (
                <span>{isAr ? "جاري الجدولة..." : "Scheduling Demo..."}</span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Video className="h-4 w-4" />
                  {isAr ? "تأكيد حجز العرض التوضيحي" : "Confirm Google Meet Demo"}
                  <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
                </span>
              )}
            </Button>
          </form>
        </div>
      ) : (
        /* Confirmation */
        <div className="p-8 sm:p-10 text-center space-y-5">
          <div className="h-14 w-14 bg-[#00E785]/20 text-[#00B96A] rounded-full flex items-center justify-center mx-auto border border-[#00E785]/40">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-extrabold text-[#1D1D1D]">
              {isAr ? "تم حجز موعدك بنجاح!" : "Your Demo is Confirmed!"}
            </h2>
            <p className="text-[13px] text-[#717680] max-w-sm mx-auto leading-relaxed">
              {isAr
                ? "تم إرسال دعوة التقويم إلى بريدك الإلكتروني. سيلتقي بك أحد مهندسي الحلول في الوقت المحدد."
                : "A calendar invitation has been sent to your email. One of our engineers will meet with you at the selected time."}
            </p>
          </div>

          <div className="bg-[#F2F2F2] rounded-[12px] p-4 border border-[#E5E7EB] max-w-sm mx-auto text-left space-y-2.5">
            <div className="flex items-center justify-between text-[12px] border-b border-[#E5E7EB] pb-2">
              <span className="text-[#717680]">{isAr ? "الموعد:" : "Date & Time:"}</span>
              <span className="font-bold text-[#1D1D1D]">
                {bookedResult.demoDate} • {bookedResult.demoTime}
              </span>
            </div>
            <div className="flex items-center justify-between text-[12px] border-b border-[#E5E7EB] pb-2">
              <span className="text-[#717680]">{isAr ? "المنصة:" : "Platform:"}</span>
              <span className="font-bold text-[#00B96A] flex items-center gap-1">
                <Video className="h-3.5 w-3.5" /> Google Meet
              </span>
            </div>
            <div className="space-y-1 pt-1">
              <span className="text-[#717680] text-[11px]">{isAr ? "رابط الاجتماع:" : "Direct Link:"}</span>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={bookedResult.googleMeetUrl}
                  className="text-[12px] bg-white border-[#E5E7EB] text-[#1D1D1D] h-9 font-mono ltr-force"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyMeetUrl}
                  className="h-9 px-3 shrink-0 border-[#E5E7EB] bg-white text-[#1D1D1D] hover:bg-[#F2F2F2]"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-[#00B96A]" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={bookedResult.googleMeetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-[#00E785] hover:bg-[#00B96A] text-[#1D1D1D] text-[13px] font-bold transition border border-[#00B96A]/20"
            >
              <Video className="h-4 w-4" />
              <span>{isAr ? "فتح الغرفة الآن" : "Open Room"}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <a
              href={googleCalLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] border border-[#1D1D1D] bg-white hover:bg-[#F2F2F2] text-[#1D1D1D] text-[13px] font-semibold transition"
            >
              <Calendar className="h-4 w-4 text-[#00B96A]" />
              <span>Google Calendar</span>
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
