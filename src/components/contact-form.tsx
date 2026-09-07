"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "@/context/language-context"
import {
  Send, CheckCircle2, User, Mail, Phone, Building2,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"

const INQUIRY_TYPES = [
  { en: "Sales & Enterprise Plans", ar: "المبيعات وباقات المؤسسات" },
  { en: "WhatsApp Business Integration", ar: "ربط وتكامل واتساب بزنس API" },
  { en: "Custom AI Bot Development", ar: "تطوير شات بوت ذكاء اصطناعي مخصص" },
  { en: "Healthcare & Clinic Solutions", ar: "حلول المستشفيات والمراكز الطبية" },
  { en: "Tours & Safari Booking Engine", ar: "نظام حجوزات الجولات والسياحة" },
  { en: "Agency & Partner Programs", ar: "برنامج شركاء ووكالات التسويق" },
  { en: "Technical Support & Billing", ar: "الدعم الفني والفوترة" },
  { en: "Other Inquiry", ar: "استفسار آخر" },
]

export function ContactForm() {
  const { isAr } = useLanguage()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [company, setCompany] = useState("")
  const [inquiryType, setInquiryType] = useState(INQUIRY_TYPES[0].en)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !phone.trim() || !message.trim()) {
      toast.error(isAr ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill in all required fields")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          company,
          inquiryType,
          message,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || (isAr ? "تعذر إرسال الرسالة" : "Could not submit inquiry"))
        return
      }
      setSubmitted(true)
      toast.success(isAr ? "تم استلام رسالتك بنجاح!" : "Inquiry received! We will be in touch shortly.")
    } catch {
      toast.error(isAr ? "فشل في إرسال الرسالة، يرجى المحاولة مرة أخرى" : "Failed to submit message. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className={`rounded-[16px] border border-[#E5E7EB] bg-white p-8 text-center space-y-4 shadow-sm ${isAr ? "rtl font-sans" : "ltr"}`} dir={isAr ? "rtl" : "ltr"}>
        <div className="h-14 w-14 rounded-full bg-[#00E785]/20 border border-[#00E785]/40 flex items-center justify-center mx-auto text-[#00B96A]">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div className="space-y-1.5">
          <span className="px-3 py-1 rounded-[6px] text-[11px] font-bold bg-[#00E785]/20 text-[#1D1D1D] border border-[#00E785]/40">
            {isAr ? "تم إرسال الرسالة" : "Message Sent"}
          </span>
          <h3 className="text-[18px] font-extrabold text-[#1D1D1D] mt-2">
            {isAr ? "شكراً لتواصلك معنا" : "Thank You for Contacting Us"}
          </h3>
          <p className="text-[13px] text-[#717680] max-w-sm mx-auto leading-relaxed">
            {isAr ? (
              <>
                تم استلام استفسارك بنجاح. سيقوم مهندس الحلول بمراجعة طلبك والرد على بريدك الإلكتروني{" "}
                <strong className="text-[#1D1D1D]">{email}</strong> خلال ساعات العمل.
              </>
            ) : (
              <>
                Your inquiry has been received. A solutions engineer will review your request and reply to{" "}
                <strong className="text-[#1D1D1D]">{email}</strong> within 24 hours.
              </>
            )}
          </p>
        </div>
        <div className="pt-2">
          <Button
            variant="outline"
            onClick={() => {
              setSubmitted(false)
              setMessage("")
            }}
            className="rounded-[8px] border-[#1D1D1D] bg-white text-[#1D1D1D] hover:bg-[#F2F2F2] text-[12.5px] font-semibold"
          >
            {isAr ? "إرسال استفسار آخر" : "Send Another Message"}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-[16px] border border-[#E5E7EB] bg-white p-6 sm:p-8 space-y-5 shadow-sm ${isAr ? "rtl font-sans" : "ltr"}`} dir={isAr ? "rtl" : "ltr"}>
      <div>
        <h3 className="text-[18px] font-extrabold text-[#1D1D1D]">
          {isAr ? "نموذج الاستفسارات والمبيعات" : "Send an Inquiry"}
        </h3>
        <p className="text-[13px] text-[#717680] mt-1">
          {isAr
            ? "املأ النموذج أدناه وسيتواصل معك مهندس حلول متخصص لمناقشة متطلباتك."
            : "Fill in the details below and a solutions engineer will get in touch with you."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
              {isAr ? "رقم الهاتف / واتساب *" : "Phone / WhatsApp *"}
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
              {isAr ? "اسم الشركة" : "Company Name"}
            </Label>
            <div className="relative">
              <Building2 className={`absolute ${isAr ? "right-3" : "left-3"} top-3 h-4 w-4 text-[#717680]`} />
              <Input
                placeholder={isAr ? "شركة النماء" : "Company LLC"}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={`${isAr ? "pr-9 text-right" : "pl-9 text-left"} bg-white border-[#E5E7EB] text-[#1D1D1D] h-10 rounded-[8px] text-[13px] focus:ring-[#00E785]`}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[12px] font-bold text-[#1D1D1D]">
            {isAr ? "نوع الاستفسار" : "Inquiry Category"}
          </Label>
          <select
            value={inquiryType}
            onChange={(e) => setInquiryType(e.target.value)}
            className="w-full h-10 rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#1D1D1D] focus:outline-none focus:ring-1 focus:ring-[#00E785]"
          >
            {INQUIRY_TYPES.map((type) => (
              <option key={type.en} value={type.en}>
                {isAr ? type.ar : type.en}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-[12px] font-bold text-[#1D1D1D]">
            {isAr ? "تفاصيل الرسالة *" : "Message Details *"}
          </Label>
          <Textarea
            required
            placeholder={
              isAr
                ? "يرجى توضيح حجم الرسائل المتوقع، التكاملات المطلوبة، أو أي متطلبات خاصة..."
                : "Please describe your expected volume, required integrations, or specific goals..."
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="rounded-[8px] text-[13px] min-h-24 bg-white border-[#E5E7EB] text-[#1D1D1D] focus:ring-[#00E785]"
          />
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00E785] hover:bg-[#00B96A] text-[#1D1D1D] font-bold rounded-[8px] h-11 text-[13.5px] border border-[#00B96A]/20 shadow-none cursor-pointer"
          >
            {loading ? (
              <span>{isAr ? "جاري الإرسال..." : "Submitting..."}</span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Send className="h-4 w-4" />
                {isAr ? "إرسال الاستفسار الآن" : "Submit Inquiry"}
              </span>
            )}
          </Button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11.5px] text-[#717680] pt-1">
          <ShieldCheck className="h-3.5 w-3.5 text-[#00B96A]" />
          <span>{isAr ? "بياناتك محمية بسرية تامة" : "Your data is kept strictly confidential"}</span>
        </div>
      </form>
    </div>
  )
}
