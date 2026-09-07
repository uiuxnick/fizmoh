"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Brand } from "@/components/brand"
import { useLanguage } from "@/context/language-context"
import {
  ArrowLeft, ArrowRight, Check, Loader2, Building2, User, Lock,
  Sparkles, ShieldCheck, Zap, Globe,
} from "lucide-react"

export default function SignupPage() {
  const { isAr, toggleLang } = useLanguage()
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ name: string; slug: string } | null>(null)

  const [business, setBusiness] = useState("")
  const [slug, setSlug] = useState("")
  const [touchedSlug, setTouchedSlug] = useState(false)
  const [availability, setAvailability] = useState<{ available: boolean } | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")

  const STEPS = [
    { id: 1, label: isAr ? "بيانات الشركة" : "Your business", icon: Building2 },
    { id: 2, label: isAr ? "بيانات المسؤول" : "About you", icon: User },
    { id: 3, label: isAr ? "كلمة المرور" : "Sign-in", icon: Lock },
  ]

  useEffect(() => {
    if (slug.length < 2) return
    const timer = setTimeout(() => {
      fetch(`/api/signup/availability?slug=${encodeURIComponent(slug)}`)
        .then((r) => r.json())
        .then(setAvailability)
        .catch(() => setAvailability(null))
    }, 300)
    return () => clearTimeout(timer)
  }, [slug])

  const slugFree = slug.length >= 2 && availability?.available !== false
  const canContinue =
    step === 1
      ? business.trim().length >= 2 && slugFree
      : step === 2
      ? name.trim().length >= 2 && /.+@.+\..+/.test(email)
      : password.length >= 8

  async function submit() {
    setBusy(true)
    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business, name, email, phone: phone || undefined, password, slug }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || (isAr ? "تعذر إنشاء مساحة العمل" : "Could not create the workspace"))
        if (/email/i.test(data.error || "")) setStep(2)
        if (/address|taken/i.test(data.error || "")) setStep(1)
        return
      }
      setDone({ name: data.workspace.name, slug: data.workspace.slug })
    } catch {
      toast.error(isAr ? "تعذر الاتصال بالخادم" : "Could not reach the server")
    } finally {
      setBusy(false)
    }
  }

  if (done) return <Finished name={done.name} slug={done.slug} isAr={isAr} />

  return (
    <div className={`min-h-screen bg-white text-[#1D1D1D] flex ${isAr ? "rtl font-sans" : "ltr"}`} dir={isAr ? "rtl" : "ltr"}>
      {/* Left: Branding & Pitch */}
      <aside className="hidden lg:flex w-[44%] flex-col justify-between p-12 bg-gradient-to-b from-[#FFF6DA]/60 via-[#FAFAFA] to-[#F2F2F2] border-r border-[#E5E7EB]">
        <div className="flex items-center justify-between">
          <Brand href="/" size="sm" className="text-[#1D1D1D]" />
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#E5E7EB] bg-white text-[12px] font-bold text-[#1D1D1D] hover:bg-[#F2F2F2] transition shadow-xs"
          >
            <Globe className="h-3.5 w-3.5 text-[#00B96A]" />
            <span>{isAr ? "English" : "العربية"}</span>
          </button>
        </div>

        <div className="max-w-sm space-y-5">
          <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight text-[#1D1D1D]">
            {isAr ? "عملاؤك ينتظرونك على واتساب الآن." : "Your customers are already on WhatsApp."}
          </h2>
          <p className="text-[#717680] leading-relaxed text-[14px]">
            {isAr
              ? "14 يوماً تجربة مجانية، بدون بطاقة بنكية. اربط رقمك التجاري وابدأ بالرد على الرسائل خلال دقائق."
              : "Fourteen days, no card, nothing to install. Connect your number and reply to the first message this afternoon."}
          </p>
          <ul className="space-y-3 pt-2">
            {[
              {
                icon: Zap,
                text: isAr ? "صندوق وارد موحد لكل محادثات فريقك" : "One inbox for every conversation",
              },
              {
                icon: Sparkles,
                text: isAr ? "أتمتة بالذكاء الاصطناعي تجيب العملاء 24/7" : "Automations that answer while you sleep",
              },
              {
                icon: ShieldCheck,
                text: isAr ? "بياناتك مشفرة ومعزولة بأعلى معايير الأمان" : "Your data stays yours, always",
              },
            ].map((item) => (
              <li key={item.text} className="flex items-center gap-3 text-[13.5px] font-medium text-[#1D1D1D]">
                <span className="h-7 w-7 rounded-[6px] bg-white border border-[#E5E7EB] grid place-items-center shrink-0 shadow-xs">
                  <item.icon className="h-4 w-4 text-[#00B96A]" />
                </span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[12px] text-[#717680] font-medium">
          {isAr
            ? "مدعوم رسمياً من منصة واتساب للأعمال (Meta Cloud API)."
            : "Built on the official WhatsApp Business Platform."}
        </p>
      </aside>

      {/* Main Signup Form */}
      <main className="flex-1 bg-white text-[#1D1D1D] flex flex-col">
        <div className="lg:hidden border-b border-[#E5E7EB] px-5 h-14 flex items-center justify-between">
          <Brand href="/" size="sm" className="text-[#1D1D1D]" />
          <button
            onClick={toggleLang}
            className="text-[12px] font-bold text-[#1D1D1D] flex items-center gap-1 border border-[#E5E7EB] rounded-[6px] px-2.5 py-1 bg-[#F2F2F2]"
          >
            <Globe className="h-3.5 w-3.5 text-[#00B96A]" />
            {isAr ? "EN" : "عربي"}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-sm space-y-6">
            {/* Steps Progress */}
            <div className="flex items-center gap-2">
              {STEPS.map((s, index) => (
                <div key={s.id} className="flex items-center gap-2 flex-1">
                  <div
                    className={`h-8 w-8 rounded-full grid place-items-center text-[12px] font-bold shrink-0 transition ${
                      step > s.id
                        ? "bg-[#00E785] text-[#1D1D1D]"
                        : step === s.id
                        ? "bg-[#1D1D1D] text-white"
                        : "bg-[#F2F2F2] text-[#717680] border border-[#E5E7EB]"
                    }`}
                  >
                    {step > s.id ? <Check className="h-4 w-4" /> : s.id}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 rounded ${
                        step > s.id ? "bg-[#00E785]" : "bg-[#E5E7EB]"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            <div>
              <p className="text-[12px] font-bold uppercase tracking-wider text-[#00B96A]">
                {isAr ? `الخطوة ${step} من 3` : `Step ${step} of 3`}
              </p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#1D1D1D]">
                {step === 1
                  ? isAr ? "ما هو اسم شركتك أو نشاطك؟" : "What's your business called?"
                  : step === 2
                  ? isAr ? "بيانات المسؤول الرئيسي" : "Admin details"
                  : isAr ? "تعيين كلمة المرور" : "Set your password"}
              </h1>
              <p className="mt-1 text-[13px] text-[#717680]">
                {step === 1
                  ? isAr ? "هذا الاسم سيظهر لعملائك ورابط مساحة العمل." : "This name will appear on your workspace link."
                  : step === 2
                  ? isAr ? "ستكون المسؤول الرئيسي لمساحة العمل." : "You will be the primary administrator."
                  : isAr ? "اختر كلمة مرور مكونة من 8 أحرف على الأقل." : "Choose a secure password (min 8 characters)."}
              </p>
            </div>

            <div className="space-y-4">
              {step === 1 && (
                <>
                  <Field label={isAr ? "اسم الشركة / النشاط" : "Business name"}>
                    <Input
                      autoFocus
                      value={business}
                      onChange={(e) => {
                        const value = e.target.value
                        setBusiness(value)
                        if (!touchedSlug)
                          setSlug(
                            value
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-")
                              .replace(/^-+|-+$/g, "")
                              .slice(0, 40)
                          )
                        setAvailability(null)
                      }}
                      placeholder={isAr ? "مغامرات عمان" : "Oman Adventures"}
                      className="h-10 rounded-[8px] bg-white border-[#E5E7EB] text-[#1D1D1D] text-[13px] focus:ring-[#00E785]"
                    />
                  </Field>
                  <Field
                    label={isAr ? "عنوان المتجر / مساحة العمل" : "Workspace link address"}
                    hint={isAr ? "الرابط المخصص لصفحة متجرك وحجوزاتك." : "Where your customers will browse and book."}
                  >
                    <div className="flex items-center rounded-[8px] border border-[#E5E7EB] bg-white overflow-hidden h-10 ltr-force shadow-xs">
                      <span className="pl-3 text-[12px] text-[#717680] shrink-0 font-mono">app.fizmoh.cloud/</span>
                      <input
                        value={slug}
                        onChange={(e) => {
                          setTouchedSlug(true)
                          setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                        }}
                        placeholder="oman-adventures"
                        className="flex-1 min-w-0 px-1 text-[13px] text-[#1D1D1D] outline-none bg-transparent"
                      />
                      {slug.length >= 2 && availability && (
                        <span
                          className={`px-3 text-[11px] font-bold shrink-0 ${
                            availability.available ? "text-[#00B96A]" : "text-rose-600"
                          }`}
                        >
                          {availability.available ? (isAr ? "متاح" : "free") : (isAr ? "محجوز" : "taken")}
                        </span>
                      )}
                    </div>
                  </Field>
                </>
              )}

              {step === 2 && (
                <>
                  <Field label={isAr ? "اسمك الكامل" : "Your name"}>
                    <Input
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={isAr ? "سالم" : "Salim"}
                      className="h-10 rounded-[8px] bg-white border-[#E5E7EB] text-[#1D1D1D] text-[13px] focus:ring-[#00E785]"
                    />
                  </Field>
                  <Field label={isAr ? "البريد الإلكتروني" : "Work Email"}>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@business.com"
                      className="h-10 rounded-[8px] bg-white border-[#E5E7EB] text-[#1D1D1D] text-[13px] ltr-force focus:ring-[#00E785]"
                    />
                  </Field>
                  <Field
                    label={isAr ? "رقم هاتف واتساب" : "WhatsApp number"}
                    hint={isAr ? "اختياري. لتلقي رمز الدخول وإشعارات النظام." : "Optional. For verification and alerts."}
                  >
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+968 …"
                      className="h-10 rounded-[8px] bg-white border-[#E5E7EB] text-[#1D1D1D] text-[13px] ltr-force focus:ring-[#00E785]"
                    />
                  </Field>
                </>
              )}

              {step === 3 && (
                <>
                  <Field
                    label={isAr ? "كلمة المرور" : "Password"}
                    hint={isAr ? "8 أحرف على الأقل." : "At least 8 characters."}
                  >
                    <Input
                      autoFocus
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && canContinue) submit()
                      }}
                      className="h-10 rounded-[8px] bg-white border-[#E5E7EB] text-[#1D1D1D] text-[13px] ltr-force focus:ring-[#00E785]"
                    />
                  </Field>
                  <div className="rounded-[12px] bg-[#F2F2F2] border border-[#E5E7EB] p-4 text-[13px] space-y-1">
                    <p className="font-bold text-[#1D1D1D]">{business || (isAr ? "مساحة عملك" : "Your workspace")}</p>
                    <p className="text-[#717680] text-[12px] font-mono ltr-force">app.fizmoh.cloud/{slug || "—"}</p>
                    <p className="text-[#717680] text-[12px]">{name} · {email}</p>
                    <p className="pt-2 text-[12px] text-[#00B96A] font-bold">
                      {isAr
                        ? "14 يوماً تجربة مجانية · بدون بطاقة بنكية · إلغاء في أي وقت"
                        : "14-day free trial · no credit card · cancel anytime"}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              {step > 1 && (
                <Button variant="outline" className="h-10 rounded-[8px] border-[#1D1D1D] bg-white text-[#1D1D1D] px-3.5 hover:bg-[#F2F2F2]" onClick={() => setStep(step - 1)}>
                  <ArrowLeft className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
                </Button>
              )}
              <Button
                className="flex-1 h-10 bg-[#00E785] hover:bg-[#00B96A] text-[#1D1D1D] font-bold text-[13px] rounded-[8px] border border-[#00B96A]/20"
                disabled={!canContinue || busy}
                onClick={() => (step === 3 ? submit() : setStep(step + 1))}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>
                    {step === 3
                      ? isAr ? "إنشاء مساحة العمل وبدء التجربة" : "Create workspace and start trial"
                      : isAr ? "المتابعة للخطوة التالية" : "Continue"}
                  </span>
                )}
              </Button>
            </div>

            <div className="text-center pt-2">
              <Link href="/admin" className="text-[12.5px] font-medium text-[#717680] hover:text-[#1D1D1D]">
                {isAr ? "لديك حساب بالفعل؟ تسجيل الدخول" : "Already have an account? Sign in"}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[12px] font-bold text-[#1D1D1D]">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-[#717680]">{hint}</p>}
    </div>
  )
}

function Finished({ name, slug, isAr }: { name: string; slug: string; isAr: boolean }) {
  return (
    <div className={`min-h-screen bg-white text-[#1D1D1D] flex items-center justify-center p-5 ${isAr ? "rtl font-sans" : "ltr"}`} dir={isAr ? "rtl" : "ltr"}>
      <div className="w-full max-w-sm rounded-[16px] border border-[#E5E7EB] bg-white p-8 text-center space-y-4 shadow-sm">
        <div className="h-14 w-14 rounded-full bg-[#00E785]/20 border border-[#00E785]/40 flex items-center justify-center mx-auto text-[#00B96A]">
          <Check className="h-7 w-7" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-extrabold text-[#1D1D1D]">
            {isAr ? "مرحباً بك في Fizmoh!" : "Welcome to Fizmoh!"}
          </h1>
          <p className="text-[13px] text-[#717680] leading-relaxed">
            {isAr
              ? `تم إنشاء مساحة عمل "${name}" بنجاح وتفعيل 14 يوماً تجربة مجانية.`
              : `Workspace "${name}" is ready with your 14-day full feature trial.`}
          </p>
        </div>

        <div className="pt-2">
          <Link href="/admin">
            <Button className="w-full bg-[#00E785] hover:bg-[#00B96A] text-[#1D1D1D] font-bold rounded-[8px] h-10 text-[13px] border border-[#00B96A]/20">
              {isAr ? "الدخول إلى لوحة التحكم" : "Go to Dashboard"}
              <ArrowRight className={`ml-1.5 h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
