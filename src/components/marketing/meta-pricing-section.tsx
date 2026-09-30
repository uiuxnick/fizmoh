"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  CheckCircle2, ShieldCheck, Sparkles, MessageSquare, Bell, KeyRound,
  Headphones, Info, ArrowRight, Calculator, Check, X, ExternalLink
} from "lucide-react"

interface CountryRate {
  code: string
  nameEn: string
  nameAr: string
  flag: string
  currency: string
  marketing: number
  utility: number
  auth: number
  service: number
  symbol: string
}

const COUNTRY_RATES: CountryRate[] = [
  {
    code: "OM",
    nameEn: "Oman",
    nameAr: "سلطنة عُمان",
    flag: "🇴🇲",
    currency: "OMR",
    symbol: "OMR",
    marketing: 0.016,
    utility: 0.007,
    auth: 0.006,
    service: 0.007,
  },
  {
    code: "AE",
    nameEn: "United Arab Emirates",
    nameAr: "الإمارات",
    flag: "🇦🇪",
    currency: "AED",
    symbol: "AED",
    marketing: 0.142,
    utility: 0.065,
    auth: 0.060,
    service: 0.065,
  },
  {
    code: "SA",
    nameEn: "Saudi Arabia",
    nameAr: "السعودية",
    flag: "🇸🇦",
    currency: "SAR",
    symbol: "SAR",
    marketing: 0.165,
    utility: 0.082,
    auth: 0.070,
    service: 0.082,
  },
  {
    code: "QA",
    nameEn: "Qatar",
    nameAr: "قطر",
    flag: "🇶🇦",
    currency: "QAR",
    symbol: "QAR",
    marketing: 0.155,
    utility: 0.075,
    auth: 0.065,
    service: 0.075,
  },
  {
    code: "KW",
    nameEn: "Kuwait",
    nameAr: "الكويت",
    flag: "🇰🇼",
    currency: "KWD",
    symbol: "KWD",
    marketing: 0.013,
    utility: 0.006,
    auth: 0.005,
    service: 0.006,
  },
  {
    code: "BH",
    nameEn: "Bahrain",
    nameAr: "البحرين",
    flag: "🇧🇭",
    currency: "BHD",
    symbol: "BHD",
    marketing: 0.016,
    utility: 0.007,
    auth: 0.006,
    service: 0.007,
  },
  {
    code: "US",
    nameEn: "United States / Global",
    nameAr: "الولايات المتحدة / دولي",
    flag: "🌐",
    currency: "USD",
    symbol: "$",
    marketing: 0.040,
    utility: 0.019,
    auth: 0.016,
    service: 0.018,
  },
  {
    code: "IN",
    nameEn: "India",
    nameAr: "الهند",
    flag: "🇮🇳",
    currency: "INR",
    symbol: "₹",
    marketing: 0.95,
    utility: 0.38,
    auth: 0.32,
    service: 0.38,
  },
]

export function MetaPricingSection({ isAr }: { isAr: boolean }) {
  const [selectedCountry, setSelectedCountry] = useState<string>("OM")
  const [marketingCount, setMarketingCount] = useState<number>(1000)
  const [utilityCount, setUtilityCount] = useState<number>(500)
  const [serviceCount, setServiceCount] = useState<number>(1200)

  const country = COUNTRY_RATES.find(c => c.code === selectedCountry) || COUNTRY_RATES[0]

  // First 1,000 service conversations are 100% free from Meta every calendar month
  const billableServiceCount = Math.max(0, serviceCount - 1000)
  const freeServiceCount = Math.min(serviceCount, 1000)

  const marketingTotal = marketingCount * country.marketing
  const utilityTotal = utilityCount * country.utility
  const serviceTotal = billableServiceCount * country.service
  const metaTotal = marketingTotal + utilityTotal + serviceTotal

  // Competitor comparison estimate (~30% markup charged by others)
  const competitorMarkup = metaTotal * 0.30

  return (
    <div className="pt-12 border-t border-[var(--mk-line)] space-y-10">
      {/* Header & Meta Partner Strip */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div className="space-y-3 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 rounded-xl bg-white border-2 border-emerald-600/35 px-3 py-1 shadow-xs ring-2 ring-emerald-500/10">
              <Image
                src="/meta_business_partner.webp"
                alt="Official Meta Business Partner"
                width={120}
                height={36}
                className="h-7 w-auto object-contain"
              />
              <span className="text-[11.5px] font-bold text-emerald-950 border-l border-emerald-200 pl-2">
                {isAr ? "شريك أعمال ميتا المعتمد" : "Official Meta Partner"}
              </span>
            </div>
            <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[11px] font-bold">
              {isAr ? "0% عمولة إضافية على الرسائل" : "0% Markup on Meta Fees"}
            </Badge>
          </div>

          <h3 className="text-2xl sm:text-4xl font-extrabold text-[var(--mk-ink)] tracking-tight">
            {isAr
              ? "أسعار محادثات واتساب الرسمية من ميتا (بشفافية 100%)"
              : "Official Meta WhatsApp Conversation Pricing (Direct at Cost)"}
          </h3>

          <p className="text-[14px] text-[#717680] leading-relaxed">
            {isAr
              ? "تقوم منصة فزموه بتمرير الرسوم الرسمية لميتا بالكامل دون أي هوامش ربح خفية أو زيادات. تحصل كل منشأة على 1,000 محادثة خدمة مجانية شهرياً ونافذة مجانية لـ 72 ساعة لإعلانات واتساب."
              : "Fizmoh connects directly to the official Meta Cloud API with 0% markup. Every WhatsApp Business Account receives 1,000 free service conversations each month, plus a 72-hour free window for Click-to-WhatsApp ads."}
          </p>
        </div>

        {/* Country Selector Tabs */}
        <div className="shrink-0 space-y-1.5 self-start md:self-auto">
          <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            {isAr ? "اختر الدولة لعرض التسعيرة الرسمية" : "Select Region / Currency"}
          </div>
          <select
            value={selectedCountry}
            onChange={e => setSelectedCountry(e.target.value)}
            className="h-10 px-3.5 py-1.5 rounded-xl border border-[var(--mk-line)] bg-white text-xs font-bold text-stone-900 shadow-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-none cursor-pointer"
          >
            {COUNTRY_RATES.map(c => (
              <option key={c.code} value={c.code}>
                {c.flag} {isAr ? c.nameAr : c.nameEn} ({c.currency})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3 Core Meta Guarantees */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/70 to-white p-5 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-[13px]">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span>{isAr ? "1,000 محادثة مجانية شهرياً" : "1,000 Free Conversations / Mo"}</span>
          </div>
          <p className="text-[12px] text-stone-600 leading-relaxed">
            {isAr
              ? "تمنحك ميتا أول 1,000 محادثة خدمة (واردة من العملاء) مجاناً بالكامل كل شهر تقويمي لحسابك."
              : "Meta provides the first 1,000 user-initiated service conversations 100% free of charge every calendar month."}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-b from-blue-50/70 to-white p-5 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-blue-900 font-bold text-[13px]">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <span>{isAr ? "نافذة 72 ساعة مجانية للإعلانات" : "72-Hour Free Ad Window"}</span>
          </div>
          <p className="text-[12px] text-stone-600 leading-relaxed">
            {isAr
              ? "العملاء القادمون عبر إعلانات Click-to-WhatsApp على فيسبوك وإنستغرام يتحدثون مجاناً لمدة 3 أيام كاملة دون احتساب رسوم محادثة."
              : "Chats initiated via Facebook or Instagram Click-to-WhatsApp ads have zero conversation fees for 72 full hours."}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/70 to-white p-5 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-[13px]">
            <CheckCircle2 className="h-4 w-4 text-amber-600" />
            <span>{isAr ? "0% عمولة وشفافية كاملة" : "Zero Fizmoh Surcharges"}</span>
          </div>
          <p className="text-[12px] text-stone-600 leading-relaxed">
            {isAr
              ? "لا نفرض أي رسوم إضافية على الرسائل. تدفع لميتا مباشرة حسب الاستهلاك الفعلي عبر بطاقتك الائتمانية."
              : "Unlike competitors who mark up rates by 20%–50%, Fizmoh charges zero per-message markup. Pay Meta directly at cost."}
          </p>
        </div>
      </div>

      {/* Meta Conversation Category Cards (Per Selected Country) */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Marketing */}
        <div className="rounded-2xl border border-[var(--mk-line)] bg-white p-5 flex flex-col justify-between space-y-3 hover:border-emerald-500/50 transition shadow-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-100">
                {isAr ? "تسويق وعروض" : "Marketing"}
              </span>
              <MessageSquare className="h-4 w-4 text-emerald-600" />
            </div>
            <h4 className="font-bold text-[16px] text-stone-900 leading-snug">
              {isAr ? "محادثات تسويقية" : "Marketing Conversations"}
            </h4>
            <p className="text-[12px] text-[#717680] leading-relaxed">
              {isAr
                ? "الحملات الترويجية، إعلانات المنتجات الجديدة، كود الخصم، ودعوات الفعاليات."
                : "Promotional broadcasts, seasonal offers, product announcements, discount codes, and abandoned cart revivals."}
            </p>
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-baseline justify-between">
            <span className="text-xs text-stone-500">{isAr ? "لكل نافذة 24 ساعة:" : "Per 24h conversation:"}</span>
            <span className="text-base font-extrabold text-stone-900">
              {country.symbol} {country.marketing.toFixed(country.code === "OM" || country.code === "KW" || country.code === "BH" ? 3 : 3)}
            </span>
          </div>
        </div>

        {/* 2. Utility */}
        <div className="rounded-2xl border border-[var(--mk-line)] bg-white p-5 flex flex-col justify-between space-y-3 hover:border-emerald-500/50 transition shadow-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-100">
                {isAr ? "خدمية وإشعارات" : "Utility"}
              </span>
              <Bell className="h-4 w-4 text-blue-600" />
            </div>
            <h4 className="font-bold text-[16px] text-stone-900 leading-snug">
              {isAr ? "محادثات خدمية" : "Utility Conversations"}
            </h4>
            <p className="text-[12px] text-[#717680] leading-relaxed">
              {isAr
                ? "تأكيدات الحجز، إيصالات الدفع، فواتير الشراء، تحديثات التوصيل، وتنبيهات الحساب."
                : "Order tracking, payment receipts, appointment reminders, itinerary updates, and account alerts."}
            </p>
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-baseline justify-between">
            <span className="text-xs text-stone-500">{isAr ? "لكل نافذة 24 ساعة:" : "Per 24h conversation:"}</span>
            <span className="text-base font-extrabold text-stone-900">
              {country.symbol} {country.utility.toFixed(country.code === "OM" || country.code === "KW" || country.code === "BH" ? 3 : 3)}
            </span>
          </div>
        </div>

        {/* 3. Authentication */}
        <div className="rounded-2xl border border-[var(--mk-line)] bg-white p-5 flex flex-col justify-between space-y-3 hover:border-emerald-500/50 transition shadow-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-100">
                {isAr ? "أمان وتوثيق" : "Authentication"}
              </span>
              <KeyRound className="h-4 w-4 text-purple-600" />
            </div>
            <h4 className="font-bold text-[16px] text-stone-900 leading-snug">
              {isAr ? "رموز التحقق (OTP)" : "Authentication (OTP)"}
            </h4>
            <p className="text-[12px] text-[#717680] leading-relaxed">
              {isAr
                ? "رموز المرور لمرة واحدة (OTP)، التحقق بخطوتين (2FA)، واستعادة كلمات المرور بأمان."
                : "One-time passcodes (OTP), two-factor authentication codes, login verification, and account recovery."}
            </p>
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-baseline justify-between">
            <span className="text-xs text-stone-500">{isAr ? "لكل رمز تحقق:" : "Per verification:"}</span>
            <span className="text-base font-extrabold text-stone-900">
              {country.symbol} {country.auth.toFixed(country.code === "OM" || country.code === "KW" || country.code === "BH" ? 3 : 3)}
            </span>
          </div>
        </div>

        {/* 4. Service / Inbound */}
        <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-500/[0.04] to-white p-5 flex flex-col justify-between space-y-3 shadow-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                {isAr ? "خدمة عملاء (1,000 مجاناً)" : "Service · 1,000 Free"}
              </span>
              <Headphones className="h-4 w-4 text-emerald-600" />
            </div>
            <h4 className="font-bold text-[16px] text-stone-900 leading-snug">
              {isAr ? "محادثات خدمة العملاء" : "Customer Service & AI Chats"}
            </h4>
            <p className="text-[12px] text-[#717680] leading-relaxed">
              {isAr
                ? "المحادثات التي يبدأها العميل بسؤالك أو استفساره، بما في ذلك ردود روبوت الذكاء الاصطناعي."
                : "User-initiated inquiries, support requests, and AI concierge conversations. 1,000 free per month."}
            </p>
          </div>

          <div className="pt-3 border-t border-emerald-100 flex items-baseline justify-between">
            <span className="text-xs text-stone-500">{isAr ? "بعد الـ 1,000 الأولى:" : "After 1,000 free:"}</span>
            <span className="text-base font-extrabold text-emerald-700">
              {country.symbol} {country.service.toFixed(country.code === "OM" || country.code === "KW" || country.code === "BH" ? 3 : 3)}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Meta Cost Estimator */}
      <div className="rounded-3xl border border-[var(--mk-line)] bg-gradient-to-br from-stone-50 via-white to-stone-50 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-stone-900">
                {isAr ? "حاسبة تكلفة محادثات ميتا التقديرية" : "Interactive Meta Monthly Cost Estimator"}
              </h4>
              <p className="text-xs text-stone-500">
                {isAr
                  ? `الحسابات مبنية على التسعيرة الرسمية لـ ${country.nameAr} (${country.currency})`
                  : `Calculated at official Meta rates for ${country.nameEn} (${country.currency})`}
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/70 text-emerald-800 text-xs font-bold self-start sm:self-auto">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {isAr ? "تطبيق 1,000 محادثة مجانية تلقائياً" : "1,000 Free Conversations Applied"}
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-center">
          {/* Sliders / Inputs */}
          <div className="lg:col-span-7 space-y-5">
            {/* Marketing Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-stone-800">
                  {isAr ? "حملات تسويقية (رسائل ترويجية / شهر):" : "Monthly Marketing Broadcasts:"}
                </span>
                <span className="font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {marketingCount.toLocaleString()} {isAr ? "محادثة" : "chats"}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="25000"
                step="500"
                value={marketingCount}
                onChange={e => setMarketingCount(Number(e.target.value))}
                className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>

            {/* Utility Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-stone-800">
                  {isAr ? "إشعارات خدمية (فواتير، تتبع، حجوزات / شهر):" : "Monthly Utility & Order Alerts:"}
                </span>
                <span className="font-bold font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {utilityCount.toLocaleString()} {isAr ? "محادثة" : "chats"}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10000"
                step="250"
                value={utilityCount}
                onChange={e => setUtilityCount(Number(e.target.value))}
                className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Service Conversations Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-stone-800">
                  {isAr ? "استفسارات خدمة العملاء والمحادثات الواردة:" : "Monthly Inbound Customer & AI Support Chats:"}
                </span>
                <span className="font-bold font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {serviceCount.toLocaleString()} {isAr ? "محادثة" : "chats"}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10000"
                step="100"
                value={serviceCount}
                onChange={e => setServiceCount(Number(e.target.value))}
                className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <div className="text-[11px] text-stone-500 flex items-center justify-between">
                <span>{isAr ? "أول 1,000 محادثة واردة مجاناً كل شهر" : "First 1,000 inbound chats are always 100% free"}</span>
                <span className="text-emerald-600 font-semibold">
                  {freeServiceCount.toLocaleString()} {isAr ? "مجانية" : "Free"}
                </span>
              </div>
            </div>
          </div>

          {/* Result Card */}
          <div className="lg:col-span-5 rounded-2xl border-2 border-emerald-500/30 bg-white p-6 space-y-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {isAr ? "تقدير الفاتورة الرسمية لميتا" : "Estimated Official Meta Bill"}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>{isAr ? "تسويق:" : "Marketing:"}</span>
                <span className="font-mono font-semibold">{country.symbol} {marketingTotal.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>{isAr ? "خدمية:" : "Utility:"}</span>
                <span className="font-mono font-semibold">{country.symbol} {utilityTotal.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>{isAr ? `خدمة عملاء (${billableServiceCount} خاضعة للرسوم):` : `Service (${billableServiceCount} billed):`}</span>
                <span className="font-mono font-semibold">{country.symbol} {serviceTotal.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold pt-1 border-t">
                <span>{isAr ? "خصم ميتا المجاني (1,000 محادثة):" : "Meta Free Tier (1,000 chats):"}</span>
                <span>-{country.symbol} {(freeServiceCount * country.service).toFixed(3)}</span>
              </div>
            </div>

            <div className="pt-3 border-t-2 border-stone-100 flex items-baseline justify-between">
              <div>
                <div className="text-xs text-stone-500 font-medium">
                  {isAr ? "إجمالي رسوم ميتا المباشرة:" : "Total Direct Meta Fees:"}
                </div>
                <div className="text-2xl font-black text-stone-900 mt-0.5">
                  {country.symbol} {metaTotal.toFixed(3)}
                </div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200">
                {isAr ? "0% عمولة فزموه" : "Fizmoh: 0.000 OMR"}
              </Badge>
            </div>

            <div className="rounded-xl bg-emerald-50/70 p-3 border border-emerald-200/80 text-[11.5px] text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-700" />
                {isAr
                  ? `وفّرت قرابة ${country.symbol} ${competitorMarkup.toFixed(3)} مقارنة بالمنصات الأخرى!`
                  : `You save ~${country.symbol} ${competitorMarkup.toFixed(3)} vs platforms with 30% markups!`}
              </div>
              <p className="text-stone-600 text-[11px] leading-relaxed">
                {isAr
                  ? "على عكس Wati وTwilio، تدفع لميتا مباشرة عبر بطاقتك البنكية دون رسوم وسيط."
                  : "Unlike Wati or Twilio, your credit card pays Meta directly without third-party message margins."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison: Fizmoh (0% Markup) vs Competitors */}
      <div className="rounded-2xl border border-[var(--mk-line)] bg-white overflow-hidden shadow-xs">
        <div className="p-5 border-b bg-stone-50/60 flex items-center justify-between">
          <h4 className="font-bold text-sm sm:text-base text-stone-900">
            {isAr ? "مقارنة شفافية التسعير: فزموه ضد المنصات الوسيطة" : "Transparency Comparison: Fizmoh vs Aggregators"}
          </h4>
          <span className="text-xs text-emerald-700 font-semibold hidden sm:inline-block">
            {isAr ? "بدون رسوم خفية" : "No Hidden Fees"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b bg-stone-50/30 text-stone-500">
                <th className="p-3.5 font-semibold">{isAr ? "الميزة / البند" : "Feature / Pricing Policy"}</th>
                <th className="p-3.5 font-bold text-emerald-700 bg-emerald-50/40">Fizmoh (فزموه)</th>
                <th className="p-3.5 font-semibold">Wati</th>
                <th className="p-3.5 font-semibold">Interakt</th>
                <th className="p-3.5 font-semibold">Twilio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              <tr>
                <td className="p-3.5 font-medium text-stone-800">
                  {isAr ? "عمولة المنصة على رسائل ميتا" : "Platform Markup on Meta Messages"}
                </td>
                <td className="p-3.5 font-bold text-emerald-700 bg-emerald-50/40 flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600" />
                  0% (Direct at cost)
                </td>
                <td className="p-3.5 text-stone-600">20% – 30% Surcharge</td>
                <td className="p-3.5 text-stone-600">15% – 25% Surcharge</td>
                <td className="p-3.5 text-stone-600">$0.005 / msg Surcharge</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium text-stone-800">
                  {isAr ? "تمرير 1,000 محادثة مجانية شهرياً" : "Pass-through 1,000 Free Chats"}
                </td>
                <td className="p-3.5 font-bold text-emerald-700 bg-emerald-50/40 flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600" />
                  {isAr ? "نعم، بالكامل" : "100% Passed through"}
                </td>
                <td className="p-3.5 text-stone-600">Restricted on lower tiers</td>
                <td className="p-3.5 text-stone-600">Conditional</td>
                <td className="p-3.5 text-stone-600">Excluded (Twilio fee applies)</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium text-stone-800">
                  {isAr ? "امتلاك خط واتساب في حسابك الخاص (Meta WABA)" : "Direct WhatsApp Account Ownership"}
                </td>
                <td className="p-3.5 font-bold text-emerald-700 bg-emerald-50/40 flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600" />
                  {isAr ? "نعم (في حساب مدير أعمالك)" : "Yes (In your Business Manager)"}
                </td>
                <td className="p-3.5 text-stone-600">Locked to Wati BSP</td>
                <td className="p-3.5 text-stone-600">Locked to BSP</td>
                <td className="p-3.5 text-stone-600">Twilio Sub-account</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium text-stone-800">
                  {isAr ? "دعم محلي في سلطنة عمان والخليج" : "GCC Localized Billing & Support"}
                </td>
                <td className="p-3.5 font-bold text-emerald-700 bg-emerald-50/40 flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600" />
                  OMR / GCC (Local Bank Cards & Invoices)
                </td>
                <td className="p-3.5 text-stone-600">USD only (+FX fees)</td>
                <td className="p-3.5 text-stone-600">USD only (+FX fees)</td>
                <td className="p-3.5 text-stone-600">USD only (+FX fees)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
