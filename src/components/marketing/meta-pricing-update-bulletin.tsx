"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Bell, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, MessageSquare,
  ArrowRight, Search, ExternalLink, HelpCircle, Layers, Smartphone, Check,
  ChevronDown, ChevronUp, DollarSign, Wallet
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface MarketRate {
  code: string
  nameEn: string
  nameAr: string
  flag: string
  marketingUsd: number
  utilityUsd: number
  authUsd: number
  serviceUsd: number
  marketingOmr: number
  utilityOmr: number
  authOmr: number
  serviceOmr: number
  isHighlighted?: boolean
}

// USD to OMR official pegged exchange rate (0.385 OMR = $1 USD)
const USD_TO_OMR = 0.385

const MARKET_RATES: MarketRate[] = [
  {
    code: "OM",
    nameEn: "Oman (Local Home Market)",
    nameAr: "سلطنة عُمان (السوق المحلي)",
    flag: "🇴🇲",
    marketingUsd: 0.0415,
    utilityUsd: 0.0155,
    authUsd: 0.0155,
    serviceUsd: 0.0155,
    marketingOmr: 0.0160,
    utilityOmr: 0.0060,
    authOmr: 0.0060,
    serviceOmr: 0.0060,
    isHighlighted: true,
  },
  {
    code: "AE",
    nameEn: "United Arab Emirates",
    nameAr: "الإمارات العربية المتحدة",
    flag: "🇦🇪",
    marketingUsd: 0.0385,
    utilityUsd: 0.0190,
    authUsd: 0.0175,
    serviceUsd: 0.0190,
    marketingOmr: 0.0148,
    utilityOmr: 0.0073,
    authOmr: 0.0067,
    serviceOmr: 0.0073,
  },
  {
    code: "SA",
    nameEn: "Saudi Arabia",
    nameAr: "المملكة العربية السعودية",
    flag: "🇸🇦",
    marketingUsd: 0.0470,
    utilityUsd: 0.0210,
    authUsd: 0.0210,
    serviceUsd: 0.0210,
    marketingOmr: 0.0181,
    utilityOmr: 0.0081,
    authOmr: 0.0081,
    serviceOmr: 0.0081,
  },
  {
    code: "KW",
    nameEn: "Kuwait",
    nameAr: "الكويت",
    flag: "🇰🇼",
    marketingUsd: 0.0385,
    utilityUsd: 0.0224,
    authUsd: 0.0224,
    serviceUsd: 0.0224,
    marketingOmr: 0.0148,
    utilityOmr: 0.0086,
    authOmr: 0.0086,
    serviceOmr: 0.0086,
  },
  {
    code: "QA",
    nameEn: "Qatar",
    nameAr: "قطر",
    flag: "🇶🇦",
    marketingUsd: 0.0410,
    utilityUsd: 0.0200,
    authUsd: 0.0200,
    serviceUsd: 0.0200,
    marketingOmr: 0.0158,
    utilityOmr: 0.0077,
    authOmr: 0.0077,
    serviceOmr: 0.0077,
  },
  {
    code: "BH",
    nameEn: "Bahrain",
    nameAr: "البحرين",
    flag: "🇧🇭",
    marketingUsd: 0.0415,
    utilityUsd: 0.0180,
    authUsd: 0.0180,
    serviceUsd: 0.0180,
    marketingOmr: 0.0160,
    utilityOmr: 0.0069,
    authOmr: 0.0069,
    serviceOmr: 0.0069,
  },
  {
    code: "US",
    nameEn: "United States / Global Rest of World",
    nameAr: "الولايات المتحدة / باقي دول العالم",
    flag: "🌐",
    marketingUsd: 0.0250,
    utilityUsd: 0.0050,
    authUsd: 0.0050,
    serviceUsd: 0.0050,
    marketingOmr: 0.0096,
    utilityOmr: 0.0019,
    authOmr: 0.0019,
    serviceOmr: 0.0019,
  },
  {
    code: "IN",
    nameEn: "India",
    nameAr: "الهند",
    flag: "🇮🇳",
    marketingUsd: 0.0108,
    utilityUsd: 0.0036,
    authUsd: 0.0018,
    serviceUsd: 0.0036,
    marketingOmr: 0.0042,
    utilityOmr: 0.0014,
    authOmr: 0.0007,
    serviceOmr: 0.0014,
  },
  {
    code: "PK",
    nameEn: "Pakistan",
    nameAr: "باكستان",
    flag: "🇵🇰",
    marketingUsd: 0.0076,
    utilityUsd: 0.0025,
    authUsd: 0.0025,
    serviceUsd: 0.0025,
    marketingOmr: 0.0029,
    utilityOmr: 0.0010,
    authOmr: 0.0010,
    serviceOmr: 0.0010,
  },
  {
    code: "LK",
    nameEn: "Sri Lanka",
    nameAr: "سريلانكا",
    flag: "🇱🇰",
    marketingUsd: 0.0070,
    utilityUsd: 0.0025,
    authUsd: 0.0025,
    serviceUsd: 0.0025,
    marketingOmr: 0.0027,
    utilityOmr: 0.0010,
    authOmr: 0.0010,
    serviceOmr: 0.0010,
  },
  {
    code: "BD",
    nameEn: "Bangladesh",
    nameAr: "بنغلاديش",
    flag: "🇧🇩",
    marketingUsd: 0.0075,
    utilityUsd: 0.0025,
    authUsd: 0.0025,
    serviceUsd: 0.0025,
    marketingOmr: 0.0029,
    utilityOmr: 0.0010,
    authOmr: 0.0010,
    serviceOmr: 0.0010,
  },
  {
    code: "EG",
    nameEn: "Egypt",
    nameAr: "مصر",
    flag: "🇪🇬",
    marketingUsd: 0.0638,
    utilityUsd: 0.0190,
    authUsd: 0.0190,
    serviceUsd: 0.0190,
    marketingOmr: 0.0246,
    utilityOmr: 0.0073,
    authOmr: 0.0073,
    serviceOmr: 0.0073,
  },
  {
    code: "MA",
    nameEn: "Morocco",
    nameAr: "المغرب",
    flag: "🇲🇦",
    marketingUsd: 0.0416,
    utilityUsd: 0.0195,
    authUsd: 0.0195,
    serviceUsd: 0.0195,
    marketingOmr: 0.0160,
    utilityOmr: 0.0075,
    authOmr: 0.0075,
    serviceOmr: 0.0075,
  },
  {
    code: "ZA",
    nameEn: "South Africa",
    nameAr: "جنوب أفريقيا",
    flag: "🇿🇦",
    marketingUsd: 0.0325,
    utilityUsd: 0.0168,
    authUsd: 0.0168,
    serviceUsd: 0.0168,
    marketingOmr: 0.0125,
    utilityOmr: 0.0065,
    authOmr: 0.0065,
    serviceOmr: 0.0065,
  },
  {
    code: "MX",
    nameEn: "Mexico",
    nameAr: "المكسيك",
    flag: "🇲🇽",
    marketingUsd: 0.0380,
    utilityUsd: 0.0160,
    authUsd: 0.0160,
    serviceUsd: 0.0160,
    marketingOmr: 0.0146,
    utilityOmr: 0.0062,
    authOmr: 0.0062,
    serviceOmr: 0.0062,
  },
  {
    code: "PE",
    nameEn: "Peru",
    nameAr: "بيرو",
    flag: "🇵🇪",
    marketingUsd: 0.0350,
    utilityUsd: 0.0145,
    authUsd: 0.0145,
    serviceUsd: 0.0145,
    marketingOmr: 0.0135,
    utilityOmr: 0.0056,
    authOmr: 0.0056,
    serviceOmr: 0.0056,
  },
  {
    code: "UA",
    nameEn: "Ukraine",
    nameAr: "أوكرانيا",
    flag: "🇺🇦",
    marketingUsd: 0.0400,
    utilityUsd: 0.0150,
    authUsd: 0.0150,
    serviceUsd: 0.0150,
    marketingOmr: 0.0154,
    utilityOmr: 0.0058,
    authOmr: 0.0058,
    serviceOmr: 0.0058,
  },
]

type CurrencyMode = "omr" | "usd" | "both"

export function MetaPricingUpdateBulletin({
  isAr = false,
  standalone = false,
}: {
  isAr?: boolean
  standalone?: boolean
}) {
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>("omr")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredRates = MARKET_RATES.filter(r => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      r.nameEn.toLowerCase().includes(q) ||
      r.nameAr.includes(q) ||
      r.code.toLowerCase().includes(q)
    )
  })

  return (
    <div
      className={`w-full max-w-5xl mx-auto rounded-3xl border border-stone-200/90 bg-[#FBFBFA] shadow-xl overflow-hidden text-stone-900 ${
        isAr ? "rtl font-sans text-right" : "ltr text-left"
      }`}
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Top Banner Bar */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-950 px-6 py-4 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-700/60 border border-emerald-500/40">
            <Bell className="h-4 w-4 text-emerald-200 animate-pulse" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              {isAr ? "تحديث رسمي وهام من منصة ميتا" : "Official Meta Platform Notice"}
            </span>
            <div className="text-xs sm:text-sm font-semibold text-white">
              {isAr ? "يسري بدءاً من 1 أكتوبر 2026" : "Effective from October 1, 2026"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-medium">
            {isAr ? "0% عمولة من فزموه · بأسعار التكلفة" : "Fizmoh: 0% Markup • Direct at Cost"}
          </span>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-6 sm:p-10 lg:p-12 space-y-8">
        {/* Badges and Title */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-200">
              WhatsApp Business Platform
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
              {isAr ? "تحديث التسعيرة" : "Pricing Update"}
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200">
              {isAr ? "ريال عُماني ودولار أمريكي" : "OMR & USD"}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-stone-950 leading-tight">
            {isAr
              ? "تحديثات تسعيرة منصة واتساب للأعمال الرسمية من ميتا — بدءاً من 1 أكتوبر 2026"
              : "WhatsApp Business Platform pricing is changing from October 1, 2026"}
          </h1>

          <p className="text-stone-600 text-sm sm:text-base leading-relaxed max-w-3xl">
            {isAr
              ? "تُجري شركة ميتا (Meta) تحديثات هامة على آلية احتساب تكاليف بعض رسائل واتساب عبر واجهة برمجة التطبيقات السحابية الرسمية (WhatsApp Cloud API)، وتدخل حيز التنفيذ بدءاً من 1 أكتوبر 2026. قد تؤثر هذه التغييرات على تكاليف محادثاتك اعتماداً على حجم الرسائل والقطاع المستهدف. إليك ملخص ما سيتغير، وجدول التسعيرة المفصل بالريال العُماني (OMR) والدولار الأمريكي (USD)."
              : "Meta is introducing changes to how certain WhatsApp messages are charged, effective October 1, 2026. These changes may impact the cost of your WhatsApp communications, depending on your messaging volume and use cases. Here's what's changing, and what it means for your business in Oman and internationally."}
          </p>
        </div>

        {/* The 45-Second Version Card */}
        <div className="rounded-2xl bg-[#0F2F24] text-white p-6 sm:p-7 shadow-lg border border-emerald-900/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-widest text-emerald-400">
                {isAr ? "الملخص السريع في 45 ثانية" : "THE 45-SECOND VERSION"}
              </h2>
            </div>

            <ul className="space-y-3 text-xs sm:text-[13.5px] leading-relaxed text-emerald-50">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>{isAr ? "رسائل الخدمة (Service Messages):" : "Service Messages"}</strong>{" "}
                  {isAr
                    ? "الرسائل المرسلة أثناء نافذة الـ 24 ساعة المفتوحة لخدمة العملاء لن تعد مجانية بالكامل بدءاً من 1 أكتوبر 2026."
                    : "sent during an open 24-hour window will no longer be free, starting October 1, 2026."}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>{isAr ? "حصة مجانية شهرية:" : "Free Monthly Tier:"}</strong>{" "}
                  {isAr
                    ? "تحصل كل منشأة على 1,000 رسالة خدمة مجانية لكل رقم هاتف تجاري في كل شهر ميلادي."
                    : "You get a free allowance of 1,000 Service Messages per business phone number, per month."}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>{isAr ? "رسائل قوالب الخدمة (Utility Templates):" : "Utility Templates:"}</strong>{" "}
                  {isAr
                    ? "قوالب الخدمة (الفواتير، الإشعارات، التتبع) المرسلة داخل نافذة الـ 24 ساعة تصبح خاضعة للرسوم الرسمية."
                    : "messages sent within the 24-hour window will also become chargeable at the standard utility rate."}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>{isAr ? "تفاوت التسعيرة حسب الدولة:" : "Market-Specific Rates:"}</strong>{" "}
                  {isAr
                    ? "تختلف التسعيرة بحسب كود دولة المستلم — مع تسعيرة مخصصة ومحدثة لسلطنة عمان ودول الخليج والأسواق العالمية."
                    : "Rates vary by market — several markets are getting separate, updated pricing."}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Key Changes Section */}
        <div className="space-y-4">
          <div className="text-xs font-black uppercase tracking-widest text-emerald-700">
            {isAr ? "أبرز التغييرات بالتفصيل" : "KEY CHANGES"}
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Card 01 */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-7 space-y-4 shadow-sm hover:border-emerald-500/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-emerald-600 font-mono">01</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {isAr ? "رسائل الخدمة" : "Service Messages"}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 leading-snug">
                {isAr ? "رسائل الخدمة تصبح خاضعة للرسوم" : "Service messages will become chargeable"}
              </h3>
              <p className="text-xs sm:text-[13px] text-stone-600 leading-relaxed">
                {isAr
                  ? "بدءاً من 1 أكتوبر 2026، لن تكون رسائل الخدمة غير المقولبة (الردود الحرة على استفسارات العملاء خلال نافذة الـ 24 ساعة) مجانية بالكامل. ستقوم ميتا باحتساب تكلفتها بنفس سعر رسائل الخدمة (Utility) المحددة لكل دولة."
                  : "Starting October 1, 2026, Service Messages sent during an open 24-hour Customer Service Window will no longer be completely free. Service Messages are non-template messages — free-form text or media replies sent by a business after a customer initiates a conversation. Meta will charge these at the same rate applicable to Utility messages for the relevant market."}
              </p>
              <div className="rounded-xl bg-stone-50 border border-stone-200/80 p-3 text-[11.5px] text-stone-700 leading-relaxed">
                <strong>{isAr ? "💡 الحصة المجانية:" : "💡 Free Allowance:"}</strong>{" "}
                {isAr
                  ? "لتخفيف العبء، تمنح ميتا 1,000 رسالة خدمة مجانية شهرياً لكل رقم هاتف تجاري. تتجدد الحصة مع بداية كل دورة فوترة ولا تُرَحّل للشهر التالي."
                  : "To provide relief, Meta will offer a free allowance of 1,000 Service Messages per business phone number per month. Messages beyond this allowance will be charged. The allowance resets with each new billing cycle and will not carry forward."}
              </div>
            </div>

            {/* Card 02 */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-7 space-y-4 shadow-sm hover:border-emerald-500/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-blue-600 font-mono">02</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  {isAr ? "قوالب الخدمة" : "Utility Templates"}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 leading-snug">
                {isAr
                  ? "قوالب الخدمة داخل نافذة الـ 24 ساعة تصبح خاضعة للرسوم"
                  : "Utility template messages within the 24-hour window will become chargeable"}
              </h3>
              <p className="text-xs sm:text-[13px] text-stone-600 leading-relaxed">
                {isAr
                  ? "كانت قوالب الخدمة (تأكيد الحجز، الفواتير، إيصالات الدفع، وتحديث الشحنة) المرسلة خلال نافذة الـ 24 ساعة المفتوحة مجانية منذ يوليو 2025. بدءاً من 1 أكتوبر 2026، ستطبق ميتا رسم رسائل Utility الرسمي حتى لو كانت نافذة خدمة العميل مفتوحة."
                  : "From October 1, 2026, Utility template messages sent during an open 24-hour Customer Service Window will also become chargeable. These messages had been free since July 2025, but Meta will now apply the applicable Utility messaging rate even when the customer service window is open."}
              </p>
              <div className="rounded-xl bg-stone-50 border border-stone-200/80 p-3 text-[11.5px] text-stone-700 leading-relaxed">
                <strong>{isAr ? "🎯 نافذة الإعلانات المجانية:" : "🎯 Free Ad Window:"}</strong>{" "}
                {isAr
                  ? "المحادثات الواردة عبر إعلانات Click-to-WhatsApp على فيسبوك وإنستغرام ما زالت تتمتع بنافذة مجانية لـ 72 ساعة بالكامل دون احتساب رسوم محادثة."
                  : "Chats initiated via Facebook or Instagram Click-to-WhatsApp ads continue to enjoy the full 72-hour free messaging window with zero conversation fees."}
              </div>
            </div>
          </div>
        </div>

        {/* What this means for your business */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-7 space-y-3">
          <div className="text-xs font-black uppercase tracking-widest text-emerald-700">
            {isAr ? "ماذا يعني هذا لنشاطك التجاري؟" : "WHAT THIS MEANS FOR YOUR BUSINESS"}
          </div>
          <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
            {isAr
              ? "بدءاً من 1 أكتوبر 2026، قد تلاحظ زيادة طفيفة في تكاليف رسائل واتساب للمؤسسات التي ترسل حجماً كبيراً من رسائل الدعم الفني أو قوالب الإشعارات الخدمية. ستعتمد التكلفة الإجمالية الفعلية على حجم مراسلاتك وتوزيعها الجغرافي. في منصة فزموه، نمرر لك تسعيرة ميتا الرسمية مباشرة بتكلفة 0% عمولة لتضمن أقل تكلفة تشغيلية ممكنة."
              : "From October 1, 2026, WhatsApp messaging costs may increase for businesses that send high volumes of Service Messages or Utility templates during an active customer service window. The actual impact will depend on factors such as your message volume, messaging categories, and the markets you communicate with. Fizmoh passes Meta's direct wholesale rates with 0% markup, ensuring you pay the absolute lowest cost in the market."}
          </p>
        </div>

        {/* Revised Market Rates Section with Currency Toggle & Search */}
        <div className="space-y-5 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-emerald-700">
                {isAr ? "جدول التسعيرة المحدث" : "REVISED MARKET RATES"}
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-stone-900 mt-1">
                {isAr
                  ? "رسوم الرسائل حسب الأسواق المختارة (سارية من 1 أكتوبر 2026)"
                  : "Per-message rates in select markets, effective October 1, 2026"}
              </h3>
              <p className="text-xs text-stone-500 mt-1 max-w-xl">
                {isAr
                  ? "جميع الأسعار معروضة بالريال العُماني (OMR) والدولار الأمريكي (USD) لكل رسالة. تنطبق رسوم الخدمة على الرسائل التي تتجاوز الـ 1,000 المجانية شهرياً."
                  : "All rates shown per message in OMR & USD. Service rate applies to Service Messages beyond your 1,000 free monthly allowance per phone number."}
              </p>
            </div>

            {/* Currency Mode Switcher */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                {isAr ? "العملة:" : "Currency:"}
              </span>
              <div className="inline-flex rounded-xl border border-stone-300 bg-white p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setCurrencyMode("omr")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    currencyMode === "omr"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  🇴🇲 OMR (عُمان)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrencyMode("usd")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    currencyMode === "usd"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  💵 USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrencyMode("both")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    currencyMode === "both"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  {isAr ? "كلاهما (OMR + USD)" : "Both (OMR + USD)"}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative max-w-sm">
            <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 ${isAr ? "right-3" : "left-3"}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isAr ? "ابحث عن الدولة أو السوق..." : "Search market or country..."}
              className={`w-full h-9 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs ${
                isAr ? "pr-9 pl-3 text-right" : "pl-9 pr-3 text-left"
              }`}
            />
          </div>

          {/* Pricing Table */}
          <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse" dir="ltr">
                <thead>
                  <tr className="bg-[#0F2F24] text-white font-bold text-[11px] uppercase tracking-wider">
                    <th className="p-3.5 pl-5">{isAr ? "السوق / الدولة" : "MARKET"}</th>
                    <th className="p-3.5 text-center">{isAr ? "تسويق (Marketing)" : "MARKETING"}</th>
                    <th className="p-3.5 text-center">{isAr ? "خدمية (Utility)" : "UTILITY"}</th>
                    <th className="p-3.5 text-center">{isAr ? "توثيق (Auth OTP)" : "AUTHENTICATION"}</th>
                    <th className="p-3.5 pr-5 text-center">{isAr ? "خدمة عملاء (Service)" : "SERVICE"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-mono">
                  {filteredRates.map((rate) => {
                    const isOm = rate.code === "OM"

                    const formatPrice = (omr: number, usd: number) => {
                      if (currencyMode === "omr") {
                        return <span className="font-bold text-stone-900">{omr.toFixed(4)} OMR</span>
                      }
                      if (currencyMode === "usd") {
                        return <span className="font-bold text-stone-900">${usd.toFixed(4)}</span>
                      }
                      return (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-bold text-stone-900">{omr.toFixed(4)} OMR</span>
                          <span className="text-[10px] text-stone-400 font-sans">(${usd.toFixed(4)})</span>
                        </div>
                      )
                    }

                    return (
                      <tr
                        key={rate.code}
                        className={`transition-colors ${
                          isOm
                            ? "bg-emerald-50/70 hover:bg-emerald-100/60 font-semibold"
                            : "hover:bg-stone-50/80"
                        }`}
                      >
                        <td className="p-3.5 pl-5 font-sans">
                          <div className="flex items-center gap-2">
                            <span className="text-lg leading-none">{rate.flag}</span>
                            <div>
                              <div className="font-bold text-stone-950 flex items-center gap-1.5">
                                <span>{isAr ? rate.nameAr : rate.nameEn}</span>
                                {isOm && (
                                  <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0">
                                    {isAr ? "عُمان" : "Local"}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-stone-400 font-mono">{rate.code}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 text-center">{formatPrice(rate.marketingOmr, rate.marketingUsd)}</td>
                        <td className="p-3.5 text-center">{formatPrice(rate.utilityOmr, rate.utilityUsd)}</td>
                        <td className="p-3.5 text-center">{formatPrice(rate.authOmr, rate.authUsd)}</td>
                        <td className="p-3.5 pr-5 text-center">
                          <div className="flex flex-col items-center">
                            {formatPrice(rate.serviceOmr, rate.serviceUsd)}
                            <span className="text-[9.5px] text-emerald-700 font-sans">
                              {isAr ? "بعد 1,000 مجانية" : "after 1k free"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {filteredRates.length === 0 && (
              <div className="p-8 text-center text-xs text-stone-500">
                {isAr ? "لم يتم العثور على دولة مطابقة للبحث." : "No markets found matching your search."}
              </div>
            )}

            <div className="p-3.5 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500">
              <span>
                {isAr
                  ? "• الأسعار خاضعة للتحديثات الدورية الرسمية من شركة ميتا. يتم احتساب رسوم الخدمة بعد استهلاك الحصة المجانية (1,000 رسالة/شهر)."
                  : "• Rates subject to periodic revision by Meta. Service rates apply to messages sent beyond your 1,000 free monthly tier."}
              </span>
              <span className="font-bold text-emerald-800">
                {isAr ? "سعر الصرف الرسمي: 1 دولار = 0.385 ريال عُماني" : "Pegged conversion: $1.00 USD = 0.385 OMR"}
              </span>
            </div>
          </div>
        </div>

        {/* What Should You Do? Section */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 space-y-4">
          <div className="text-xs font-black uppercase tracking-widest text-emerald-700">
            {isAr ? "ما الذي يتعين عليك فعله الآن؟" : "WHAT SHOULD YOU DO?"}
          </div>

          <div className="grid sm:grid-cols-3 gap-4 pt-1">
            <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-xs">
                <Wallet className="h-4 w-4 text-emerald-600" />
                <span>{isAr ? "1. مراجعة رصيد محفظة واتساب" : "1. Review Wallet Balance"}</span>
              </div>
              <p className="text-[11.5px] text-stone-600 leading-relaxed">
                {isAr
                  ? "تأكد من شحن رصيد كافٍ في محفظة واتساب أو بطاقتك الائتمانية المسجلة في مدير أعمال ميتا لتجنب تعليق المحادثات."
                  : "Review your WhatsApp wallet balance or payment card registered in Meta Business Manager to prevent delivery failures."}
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-xs">
                <Bell className="h-4 w-4 text-blue-600" />
                <span>{isAr ? "2. تفعيل تنبيه انخفاض الرصيد" : "2. Set Low Balance Alerts"}</span>
              </div>
              <p className="text-[11.5px] text-stone-600 leading-relaxed">
                {isAr
                  ? "قم بتفعيل إشعارات انخفاض الرصيد عبر البريد الإلكتروني وواتساب من خلال إعدادات فزموه لتصلك تنبيهات فورية."
                  : "Set up a low-balance alert under Settings → Email & WhatsApp Alerts in Fizmoh so you're notified before credit runs low."}
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-xs">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span>{isAr ? "3. الاستفادة من 1,000 محادثة مجانية" : "3. Leverage Free Allowance"}</span>
              </div>
              <p className="text-[11.5px] text-stone-600 leading-relaxed">
                {isAr
                  ? "استخدم ردود الذكاء الاصطناعي لحل المشكلات بكفاءة في الردود الأولى وضمان بقاء استفسارات الدعم ضمن الحصة المجانية."
                  : "Resolve inquiries efficiently with AI flows and live agents to maximize your free 1,000 monthly service messages."}
              </p>
            </div>
          </div>
        </div>

        {/* Questions Box & CTA */}
        <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-50 via-white to-emerald-50/30 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="space-y-1.5 max-w-lg">
            <h4 className="text-base sm:text-lg font-bold text-stone-950">
              {isAr ? "هل لديك استفسار حول تأثير التحديث على تكاليفك؟" : "Questions about how this affects your costs?"}
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              {isAr
                ? "تواصل مع فريق الدعم الفني المحلي في سلطنة عُمان أو مستشار الحساب لمساعدتك في تخطيط استراتيجية الرسائل وتحسين التكلفة."
                : "Reach out to our Oman support team or your Fizmoh account representative for help analyzing the exact impact on your messaging volume."}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            <Button
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl h-10 px-5 shadow-xs"
              asChild
            >
              <Link href="https://wa.me/96894002626?text=Hello%20Fizmoh%2C%20I%20have%20questions%20about%20the%20October%201%20Meta%20pricing%20updates" target="_blank">
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                {isAr ? "تواصل مع الدعم عبر واتساب" : "Connect with Support"}
              </Link>
            </Button>
            <Button
              variant="outline"
              className="border-stone-300 hover:bg-stone-100 text-stone-800 font-bold text-xs rounded-xl h-10 px-4"
              asChild
            >
              <Link href="/pricing#meta-calculator">
                <DollarSign className="h-3.5 w-3.5 mr-1" />
                {isAr ? "عرض حاسبة المحادثات" : "View Conversation Rates"}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
