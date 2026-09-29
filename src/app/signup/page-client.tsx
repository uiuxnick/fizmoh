"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Brand } from "@/components/brand"
import { useLanguage } from "@/context/language-context"
import {
  ArrowLeft, ArrowRight, Check, Loader2, Building2, User, Lock,
  Sparkles, ShieldCheck, Zap, Globe, Layers,
} from "lucide-react"

interface PlanItem {
  id: string
  slug: string
  name: string
  description: string | null
  priceMonthly: number
  priceYearly: number
  currency: string
  trialDays: number
  modules: string[]
  limits: {
    staff?: number
    contacts?: number
    messagesPerMonth?: number
    numbers?: number
  } | null
}

const DEFAULT_PLANS: PlanItem[] = [
  {
    id: "free",
    slug: "free",
    name: "Free",
    description: "1 WhatsApp Number, 1,000 Subscribers, 1,000 Messages per month for early testing.",
    priceMonthly: 0,
    priceYearly: 0,
    currency: "OMR",
    trialDays: 14,
    modules: ["INBOX", "CRM", "SETTINGS", "STAFF", "FLOWS", "AI", "KNOWLEDGE", "DIGITAL_VCARD", "LIVE_CHAT"],
    limits: { staff: 1, contacts: 1000, messagesPerMonth: 1000, numbers: 1 },
  },
  {
    id: "basic",
    slug: "basic",
    name: "Basic",
    description: "1 Number, 100k Subscribers, 100k Messages/mo, Chatbox, Bot Flow, Broadcast, Templates & Subscribers.",
    priceMonthly: 35000,
    priceYearly: 350000,
    currency: "OMR",
    trialDays: 14,
    modules: ["INBOX", "CRM", "SETTINGS", "STAFF", "FLOWS", "AI", "KNOWLEDGE", "DIGITAL_VCARD", "LIVE_CHAT", "BROADCAST"],
    limits: { staff: 3, contacts: 100000, messagesPerMonth: 100000, numbers: 1 },
  },
  {
    id: "growth",
    slug: "growth",
    name: "Growth",
    description: "2 Numbers, Unlimited Subscribers & Messages, Chatbox, Bot Flow, Broadcast, Templates & Subscribers.",
    priceMonthly: 50000,
    priceYearly: 450000,
    currency: "OMR",
    trialDays: 14,
    modules: ["INBOX", "CRM", "SETTINGS", "STAFF", "FLOWS", "AI", "KNOWLEDGE", "DIGITAL_VCARD", "LIVE_CHAT", "BROADCAST"],
    limits: { staff: 10, contacts: -1, messagesPerMonth: -1, numbers: 2 },
  },
  {
    id: "enterprise",
    slug: "enterprise",
    name: "Enterprise",
    description: "All Add-ons & All Features Included! 5 WhatsApp Numbers, Unlimited Messages & Subscribers.",
    priceMonthly: 100000,
    priceYearly: 900000,
    currency: "OMR",
    trialDays: 14,
    modules: ["INBOX", "CRM", "SETTINGS", "STAFF", "FLOWS", "AI", "KNOWLEDGE", "DIGITAL_VCARD", "LIVE_CHAT", "BROADCAST", "RESTAURANT", "TOURS", "ECOMMERCE", "INTEGRATION", "REPUTATION", "WHITE_LABEL", "CORPORATE"],
    limits: { staff: -1, contacts: -1, messagesPerMonth: -1, numbers: 5 },
  },
]

export default function SignupPage() {
  const { isAr, toggleLang } = useLanguage()
  const searchParams = useSearchParams()
  const urlPlan = searchParams.get("plan")

  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ name: string; slug: string; planName: string } | null>(null)

  const [business, setBusiness] = useState("")
  const [slug, setSlug] = useState("")
  const [touchedSlug, setTouchedSlug] = useState(false)
  const [availability, setAvailability] = useState<{ available: boolean } | null>(null)

  const [planSlug, setPlanSlug] = useState<string>(urlPlan ? urlPlan.toLowerCase() : "")
  const [plans, setPlans] = useState<PlanItem[]>(DEFAULT_PLANS)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")

  const STEPS = [
    { id: 1, label: isAr ? "بيانات الشركة" : "Your business", icon: Building2 },
    { id: 2, label: isAr ? "اختيار الباقة" : "Choose plan", icon: Layers },
    { id: 3, label: isAr ? "بيانات المسؤول" : "About you", icon: User },
    { id: 4, label: isAr ? "كلمة المرور" : "Sign-in", icon: Lock },
  ]

  // Fetch live public plans
  useEffect(() => {
    let active = true
    fetch("/api/plans/public")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return
        if (data?.plans?.length) {
          // Filter public plans and keep core options visible
          const list: PlanItem[] = data.plans
          setPlans(list)
          if (urlPlan) {
            const matched = list.find((p) => p.slug.toLowerCase() === urlPlan.toLowerCase())
            if (matched) setPlanSlug(matched.slug)
          }
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [urlPlan])

  // Slug availability check
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
      ? Boolean(planSlug)
      : step === 3
      ? name.trim().length >= 2 && /.+@.+\..+/.test(email) && phone.trim().length >= 7
      : password.length >= 8 && Boolean(planSlug)

  const selectedPlan = plans.find((p) => p.slug.toLowerCase() === planSlug.toLowerCase()) ||
    DEFAULT_PLANS.find((p) => p.slug.toLowerCase() === planSlug.toLowerCase())

  async function submit() {
    if (!planSlug) {
      toast.error(isAr ? "يرجى اختيار باقة للاشتراك للمتابعة" : "Please choose a plan to continue")
      setStep(2)
      return
    }

    setBusy(true)
    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business, name, email, phone, password, slug, planSlug }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || (isAr ? "تعذر إنشاء مساحة العمل" : "Could not create the workspace"))
        if (/plan/i.test(data.error || "")) setStep(2)
        else if (/email/i.test(data.error || "")) setStep(3)
        else if (/address|taken/i.test(data.error || "")) setStep(1)
        return
      }
      setDone({
        name: data.workspace.name,
        slug: data.workspace.slug,
        planName: selectedPlan?.name || data.workspace.plan?.name || "14-Day Trial",
      })
    } catch {
      toast.error(isAr ? "تعذر الاتصال بالخادم" : "Could not reach the server")
    } finally {
      setBusy(false)
    }
  }

  if (done) return <Finished name={done.name} slug={done.slug} planName={done.planName} isAr={isAr} />

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

        <div className="pt-4 space-y-3">
          <div
            className="inline-flex items-center gap-3 rounded-2xl bg-white border-2 border-emerald-600/35 px-4 py-2 shadow-sm ring-4 ring-emerald-500/10"
            title={isAr ? "شريك أعمال ميتا المعتمد" : "Official Meta Business Partner"}
          >
            <Image
              src="/meta_business_partner.webp"
              alt="Official Meta Business Partner"
              width={160}
              height={48}
              className="h-9 w-auto object-contain"
              priority
            />
          </div>
          <p className="text-[12px] text-[#717680] font-medium">
            {isAr
              ? "شريك أعمال ميتا المعتمد · مدعوم رسمياً من منصة واتساب للأعمال (Meta Cloud API)."
              : "Official Meta Business Partner · Built on WhatsApp Cloud API."}
          </p>
        </div>
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
          <div className={`w-full ${step === 2 ? "max-w-md sm:max-w-lg" : "max-w-sm"} transition-all duration-200 space-y-6`}>
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
                {isAr ? `الخطوة ${step} من 4` : `Step ${step} of 4`}
              </p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#1D1D1D]">
                {step === 1
                  ? isAr ? "ما هو اسم شركتك أو نشاطك؟" : "What's your business called?"
                  : step === 2
                  ? isAr ? "اختر باقة الاشتراك المناسبة" : "Choose your plan"
                  : step === 3
                  ? isAr ? "بيانات المسؤول الرئيسي" : "Admin details"
                  : isAr ? "تعيين كلمة المرور" : "Set your password"}
              </h1>
              <p className="mt-1 text-base text-[#717680]">
                {step === 1
                  ? isAr ? "هذا الاسم سيظهر لعملائك ورابط مساحة العمل." : "This name will appear on your workspace link."
                  : step === 2
                  ? isAr ? "تشمل جميع الباقات تجربة مجانية كاملة لمدة 14 يوماً بدون بطاقة بنكية." : "All plans start with a 14-day free trial. No credit card required. Cancel anytime."
                  : step === 3
                  ? isAr ? "ستكون المسؤول الرئيسي لمساحة العمل." : "You will be the primary administrator."
                  : isAr ? "اختر كلمة مرور مكونة من 8 أحرف على الأقل." : "Choose a secure password (min 8 characters)."}
              </p>
            </div>

            <div className="space-y-4">
              {/* Step 1: Business Details */}
              {step === 1 && (
                <>
                  <Field id="signup-business" label={isAr ? "اسم الشركة / النشاط" : "Business name"}>
                    <Input id="signup-business" name="business" autoComplete="organization"
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
                      className="h-11 rounded-[8px] bg-white border-[#E5E7EB] text-[#1D1D1D] text-base focus:ring-[#00E785]"
                    />
                  </Field>
                  <Field id="signup-slug"
                    label={isAr ? "عنوان المتجر / مساحة العمل" : "Workspace link address"}
                    hint={isAr ? "الرابط المخصص لصفحة متجرك وحجوزاتك." : "Where your customers will browse and book."}
                  >
                    <div className="flex items-center rounded-[8px] border border-[#E5E7EB] bg-white overflow-hidden h-11 ltr-force shadow-xs">
                      <span className="pl-3 text-[12px] text-[#717680] shrink-0 font-mono">app.fizmoh.cloud/</span>
                      <input id="signup-slug" name="slug" aria-describedby="signup-slug-hint"
                        value={slug}
                        onChange={(e) => {
                          setTouchedSlug(true)
                          setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                        }}
                        placeholder="oman-adventures"
                        className="flex-1 min-w-0 px-1 text-base text-[#1D1D1D] outline-none bg-transparent"
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

              {/* Step 2: Choose Plan (REQUIRED) */}
              {step === 2 && (
                <div className="space-y-3">
                  <div className="space-y-2.5">
                    {plans.map((p) => {
                      const isSelected = planSlug.toLowerCase() === p.slug.toLowerCase()
                      const monthlyOmr = p.priceMonthly > 0 ? (p.priceMonthly / 1000).toFixed(0) : "0"
                      const isPopular = p.slug.toLowerCase() === "growth"
                      const isScale = p.slug.toLowerCase() === "enterprise"

                      return (
                        <div
                          key={p.slug}
                          role="button"
                          tabIndex={0}
                          onClick={() => setPlanSlug(p.slug)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              setPlanSlug(p.slug)
                            }
                          }}
                          className={`w-full text-start p-3.5 rounded-[12px] transition cursor-pointer select-none border-2 ${
                            isSelected
                              ? "border-[#00B96A] bg-[#00E785]/5 ring-2 ring-[#00B96A]/20 shadow-xs"
                              : "border-[#E5E7EB] bg-white hover:border-[#CBD5E1] hover:bg-[#FAFAFA]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`h-5 w-5 rounded-full grid place-items-center shrink-0 transition ${
                                  isSelected
                                    ? "bg-[#00B96A] text-white"
                                    : "border-2 border-[#CBD5E1] bg-white"
                                }`}
                              >
                                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-[#1D1D1D] text-[15px]">{p.name}</span>
                                  {isPopular && (
                                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#00E785]/20 text-[#00B96A] border border-[#00B96A]/30">
                                      {isAr ? "الأكثر طلباً" : "Most Popular"}
                                    </span>
                                  )}
                                  {isScale && (
                                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                                      {isAr ? "للشركات الكبرى" : "Scale & Volume"}
                                    </span>
                                  )}
                                </div>
                                {p.description && (
                                  <p className="text-[12px] text-[#717680] mt-0.5 line-clamp-1">
                                    {p.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="text-end shrink-0">
                              <div className="text-[15px] font-extrabold text-[#1D1D1D]">
                                {p.priceMonthly > 0 ? (
                                  <>
                                    <span>{monthlyOmr}</span>{" "}
                                    <span className="text-[12px] font-bold text-[#717680]">OMR</span>
                                  </>
                                ) : (
                                  <span>{isAr ? "مجاني" : "Free"}</span>
                                )}
                              </div>
                              <div className="text-[10px] font-medium text-[#717680]">
                                {isAr ? "شهرياً بعد التجربة" : "/mo after trial"}
                              </div>
                            </div>
                          </div>

                          {/* Quota Highlights */}
                          {p.limits && (
                            <div className="mt-2.5 pt-2.5 border-t border-[#E5E7EB]/80 flex items-center gap-2 flex-wrap text-[11px] text-[#717680]">
                              {p.limits.staff && (
                                <span className="inline-flex items-center gap-1 bg-[#F2F2F2] px-2 py-0.5 rounded-[6px] font-medium text-[#1D1D1D]">
                                  <User className="h-3 w-3 text-[#00B96A]" />
                                  {p.limits.staff} {isAr ? "مقاعد فريق" : "staff"}
                                </span>
                              )}
                              {p.limits.contacts && (
                                <span className="inline-flex items-center gap-1 bg-[#F2F2F2] px-2 py-0.5 rounded-[6px] font-medium text-[#1D1D1D]">
                                  <Building2 className="h-3 w-3 text-[#00B96A]" />
                                  {p.limits.contacts >= 1000 ? `${(p.limits.contacts / 1000).toFixed(0)}k` : p.limits.contacts} {isAr ? "جهة اتصال" : "contacts"}
                                </span>
                              )}
                              {p.limits.messagesPerMonth && (
                                <span className="inline-flex items-center gap-1 bg-[#F2F2F2] px-2 py-0.5 rounded-[6px] font-medium text-[#1D1D1D]">
                                  <Zap className="h-3 w-3 text-[#00B96A]" />
                                  {p.limits.messagesPerMonth >= 1000 ? `${(p.limits.messagesPerMonth / 1000).toFixed(0)}k` : p.limits.messagesPerMonth} {isAr ? "رسالة/شهر" : "msgs/mo"}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {!planSlug && (
                    <p className="text-[12px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-[8px] p-2.5 text-center">
                      {isAr ? "يرجى اختيار باقة للمتابعة للخطوة التالية" : "Please select a plan above to continue"}
                    </p>
                  )}
                </div>
              )}

              {/* Step 3: Admin Details */}
              {step === 3 && (
                <>
                  <Field id="signup-name" label={isAr ? "اسمك الكامل" : "Your name"}>
                    <Input id="signup-name" name="name" autoComplete="name"
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={isAr ? "سالم" : "Salim"}
                      className="h-11 rounded-[8px] bg-white border-[#E5E7EB] text-[#1D1D1D] text-base focus:ring-[#00E785]"
                    />
                  </Field>
                  <Field id="signup-email" label={isAr ? "البريد الإلكتروني" : "Work Email"}>
                    <Input id="signup-email" name="email" autoComplete="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@business.com"
                      className="h-11 rounded-[8px] bg-white border-[#E5E7EB] text-[#1D1D1D] text-base ltr-force focus:ring-[#00E785]"
                    />
                  </Field>
                  <Field id="signup-phone"
                    label={isAr ? "رقم واتساب *" : "WhatsApp number *"}
                    hint={isAr ? "مطلوب. سيُستخدم للتحقق وإشعارات النظام." : "Required. Used for verification and system alerts."}
                  >
                    <Input id="signup-phone" name="phone" autoComplete="tel" type="tel" aria-describedby="signup-phone-hint"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+968 …"
                      className="h-11 rounded-[8px] bg-white border-[#E5E7EB] text-[#1D1D1D] text-base ltr-force focus:ring-[#00E785]"
                    />
                  </Field>
                </>
              )}

              {/* Step 4: Password & Review */}
              {step === 4 && (
                <>
                  <Field id="signup-password"
                    label={isAr ? "كلمة المرور" : "Password"}
                    hint={isAr ? "8 أحرف على الأقل." : "At least 8 characters."}
                  >
                    <Input id="signup-password" name="password" autoComplete="new-password"
                      autoFocus
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && canContinue) submit()
                      }}
                      className="h-11 rounded-[8px] bg-white border-[#E5E7EB] text-[#1D1D1D] text-base ltr-force focus:ring-[#00E785]"
                    />
                  </Field>

                  {/* Plan Summary Card */}
                  {selectedPlan && (
                    <div className="rounded-[12px] bg-[#00E785]/10 border border-[#00B96A]/30 p-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-[#00B96A]">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>{isAr ? "الباقة المختارة" : "Selected Plan"}</span>
                        </div>
                        <p className="font-extrabold text-[#1D1D1D] text-[15px] mt-0.5">
                          {selectedPlan.name} · {selectedPlan.priceMonthly > 0 ? `${(selectedPlan.priceMonthly / 1000).toFixed(0)} OMR/mo` : (isAr ? "مجاني" : "Free")}
                        </p>
                        <p className="text-[11px] text-[#717680] mt-0.5">
                          {isAr ? "14 يوماً تجربة مجانية كاملة · بدون بطاقة بنكية" : "14-day free trial · No card required"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="text-[12px] font-bold text-[#00B96A] hover:underline shrink-0 px-2 py-1 rounded-[6px] hover:bg-[#00E785]/20 transition"
                      >
                        {isAr ? "تغيير" : "Change"}
                      </button>
                    </div>
                  )}

                  {/* Workspace Review Card */}
                  <div className="rounded-[12px] bg-[#F2F2F2] border border-[#E5E7EB] p-4 text-base space-y-1">
                    <p className="font-bold text-[#1D1D1D]">{business || (isAr ? "مساحة عملك" : "Your workspace")}</p>
                    <p className="text-[#717680] text-[12px] font-mono ltr-force">app.fizmoh.cloud/{slug || "—"}</p>
                    <p className="text-[#717680] text-[12px]">{name} · {email}</p>
                    <p className="text-[#717680] text-[12px] ltr-force">{phone}</p>
                    <p className="pt-2 text-[12px] text-[#00B96A] font-bold">
                      {isAr
                        ? "14 يوماً تجربة مجانية · بدون بطاقة بنكية · إلغاء في أي وقت"
                        : "14-day free trial · no credit card · cancel anytime"}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-2.5 pt-2">
              {step > 1 && (
                <Button variant="outline" className="h-11 rounded-[8px] border-[#1D1D1D] bg-white text-[#1D1D1D] px-3.5 hover:bg-[#F2F2F2]" onClick={() => setStep(step - 1)}>
                  <ArrowLeft className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
                </Button>
              )}
              <Button
                className="flex-1 h-11 bg-[#00E785] hover:bg-[#00B96A] text-[#1D1D1D] font-bold text-base rounded-[8px] border border-[#00B96A]/20"
                disabled={!canContinue || busy}
                onClick={() => (step === 4 ? submit() : setStep(step + 1))}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>
                    {step === 4
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
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[12px] font-bold text-[#1D1D1D]">{label}</Label>
      {children}
      {hint && <p id={`${id}-hint`} className="text-[11px] text-[#717680]">{hint}</p>}
    </div>
  )
}

function Finished({ name, slug, planName, isAr }: { name: string; slug: string; planName?: string; isAr: boolean }) {
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
          <p className="text-base text-[#717680] leading-relaxed">
            {isAr
              ? `تم إنشاء مساحة عمل "${name}" بنجاح على باقة ${planName || ""} وتفعيل 14 يوماً تجربة مجانية.`
              : `Workspace "${name}" is ready on the ${planName || ""} plan with your 14-day full feature trial.`}
          </p>
        </div>

        <div className="pt-2">
          <Link href="/admin">
            <Button className="w-full bg-[#00E785] hover:bg-[#00B96A] text-[#1D1D1D] font-bold rounded-[8px] h-11 text-base border border-[#00B96A]/20">
              {isAr ? "الدخول إلى لوحة التحكم" : "Go to Dashboard"}
              <ArrowRight className={`ml-1.5 h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
