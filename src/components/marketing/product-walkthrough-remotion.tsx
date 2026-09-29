"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Play, Pause, ChevronRight, ChevronLeft, RotateCcw,
  Sparkles, CheckCircle2, ArrowRight, ShieldCheck,
  Bot, Inbox, Utensils, CreditCard, MessageSquare,
  Zap, Eye, Volume2, Info
} from "lucide-react"
import { Button } from "@/components/ui/button"

export interface WalkthroughChapter {
  id: string
  titleEn: string
  titleAr: string
  taglineEn: string
  taglineAr: string
  badgeEn: string
  badgeAr: string
  icon: any
  imageSrc: string
  imageAlt: string
  durationSec: number
  descriptionEn: string
  descriptionAr: string
  learnMoreHref: string
  hotspots: {
    x: number // percentage
    y: number // percentage
    titleEn: string
    titleAr: string
    textEn: string
    textAr: string
  }[]
  metrics: {
    labelEn: string
    labelAr: string
    value: string
  }[]
}

const CHAPTERS: WalkthroughChapter[] = [
  {
    id: "team-inbox",
    titleEn: "Shared Team Inbox",
    titleAr: "صندوق الوارد متعدد الموظفين",
    taglineEn: "Multi-Agent Support & SLA Management",
    taglineAr: "إدارة خدمة العملاء ومؤقتات الاستجابة",
    badgeEn: "Live Operations Hub",
    badgeAr: "مركز العمليات الحية",
    icon: Inbox,
    imageSrc: "/marketing/products/team-inbox.jpg",
    imageAlt: "Fizmoh Multi-Agent WhatsApp Shared Team Inbox interface",
    durationSec: 5,
    descriptionEn:
      "Manage hundreds of incoming WhatsApp customer chats simultaneously across your support and sales departments. Features collision detection, internal team notes, 24-hour Meta SLA countdown timers, and seamless 1-tap human handover from AI.",
    descriptionAr:
      "أدر مئات محادثات واتساب الواردة في نفس اللحظة عبر فِرق المبيعات والدعم الفني. يتضمن تنبيهات منع تضارب الردود، وملاحظات داخلية للموظفين، ومؤقتات نافذة 24 ساعة، مع تحويل فوري وسلس من البوت للموظف البشري.",
    learnMoreHref: "/product/team-inbox",
    hotspots: [
      {
        x: 24,
        y: 35,
        titleEn: "Smart Agent Routing",
        titleAr: "التوزيع الذكي للموظفين",
        textEn: "Automatically assigns inquiries to available team members based on department rules.",
        textAr: "توزيع تلقائي للمحادثات على الموظفين المتاحين حسب اختصاص القسم.",
      },
      {
        x: 68,
        y: 45,
        titleEn: "Meta 24h Window Timer",
        titleAr: "مؤقت نافذة 24 ساعة الرسمية",
        textEn: "Live visual countdown prevents costly customer session expirations.",
        textAr: "عد تنازلي مرئي يمنع انتهاء نافذة المحادثة المجانية للعميل.",
      },
      {
        x: 85,
        y: 80,
        titleEn: "1-Tap Human Handover",
        titleAr: "تحويل مباشر للموظف",
        textEn: "Instantly pause the AI chatbot when a high-value customer needs human intervention.",
        textAr: "إيقاف فوري للذكاء الاصطناعي وتدخل الموظف مع حفظ سجل المحادثة كاملاً.",
      },
    ],
    metrics: [
      { labelEn: "First Response Time", labelAr: "سرعة الاستجابة الأولى", value: "< 12s" },
      { labelEn: "Concurrent Agents", labelAr: "الموظفون المتزامنون", value: "Unlimited" },
      { labelEn: "SLA Resolution", labelAr: "التزام مؤقت الخدمة", value: "99.2%" },
    ],
  },
  {
    id: "smart-menu",
    titleEn: "Smart QR Menu & KDS",
    titleAr: "المنيو الذكي وشاشة المطبخ KDS",
    taglineEn: "Contactless Dining & Kitchen Automation",
    taglineAr: "طلبات الطاولات وشاشات إعداد الوجبات",
    badgeEn: "Restaurant Engine",
    badgeAr: "محرك المطاعم والكافيهات",
    icon: Utensils,
    imageSrc: "/marketing/products/smart-menu-ordering.jpg",
    imageAlt: "Interactive QR dining menu and live Kitchen Display System",
    durationSec: 5,
    descriptionEn:
      "Diners scan branded table QR codes to view dynamic bilingual menus and place direct orders without downloading an app. Tickets route directly to the live Kitchen Display System (KDS) with audio chimes and preparation timers, reducing table turnover time by 35%.",
    descriptionAr:
      "يمسح الزائر رمز الباركود على الطاولة لاستعراض المنيو التفاعلي باللغتين والطلب فوراً بدون تطبيقات. تصل التذاكر مباشرة لشاشة المطبخ الحية (KDS) مع تنبيهات صوتية ومؤقتات زمنية، مما يسرع دوران الطاولات بنسبة 35%.",
    learnMoreHref: "/product/smart-menu-ordering",
    hotspots: [
      {
        x: 20,
        y: 28,
        titleEn: "Contactless Table QR",
        titleAr: "باركود الطاولات الذكي",
        textEn: "Dynamic URL codes tied specifically to each dining table number.",
        textAr: "رموز باركود ديناميكية مربوطة برقم الطاولة المحدد داخل الصالة.",
      },
      {
        x: 55,
        y: 60,
        titleEn: "Live Kitchen Display (KDS)",
        titleAr: "شاشة المطبخ الحية (KDS)",
        textEn: "Real-time kitchen tickets with prep timers, color alerts, and waiter call.",
        textAr: "تذاكر لحظية للمطبخ مع مؤقتات تحضير وتنبيهات ملونة واستدعاء النادل.",
      },
      {
        x: 82,
        y: 35,
        titleEn: "GPT-4o Menu Digitizer",
        titleAr: "ماسح المنيو بالذكاء الاصطناعي",
        textEn: "Digitize printed paper menus and PDFs into interactive items in under 2 minutes.",
        textAr: "تحويل المنيو الورقي وملفات PDF إلى منيو رقمي متكامل خلال دقيقتين.",
      },
    ],
    metrics: [
      { labelEn: "Table Turnover Lift", labelAr: "تسريع دوران الطاولات", value: "+35%" },
      { labelEn: "App Download Needed", labelAr: "تطبيقات مطلوبة للزبون", value: "0" },
      { labelEn: "Order Accuracy", labelAr: "دقة استلام الطلبات", value: "99.8%" },
    ],
  },
  {
    id: "botflow-studio",
    titleEn: "Botflow Studio & AI",
    titleAr: "منشئ مسارات البوت والذكاء الاصطناعي",
    taglineEn: "Visual Drag-and-Drop & Gulf Arabic NLP",
    taglineAr: "بناء بصري ذكي يفهم اللهجة الخليجية",
    badgeEn: "Conversational AI",
    badgeAr: "ذكاء اصطناعي تحادثي",
    icon: Bot,
    imageSrc: "/marketing/products/botflow-studio.jpg",
    imageAlt: "Visual drag-and-drop conversational botflow studio",
    durationSec: 5,
    descriptionEn:
      "Design sophisticated customer journeys on an infinite drag-and-drop canvas. Powered by OpenAI GPT-4o and DeepSeek-V3 fine-tuned for Omani and Gulf Arabic colloquial speech. Grounded in your knowledge base (RAG) for zero hallucinations.",
    descriptionAr:
      "صمم مسارات محادثة متطورة بسهولة على لوحة سحب وإفلات مرئية. مدعوم بنماذج GPT-4o وDeepSeek المتطورة لفهم اللهجات الخليجية والعمانية بدقة متناهية، مع استناد تام لقاعدة معرفتك الخاصة (RAG) لمنع التأليف.",
    learnMoreHref: "/product/botflow-studio",
    hotspots: [
      {
        x: 25,
        y: 40,
        titleEn: "Visual Node Canvas",
        titleAr: "لوحة العقد المرئية",
        textEn: "Connect quick replies, conditional logic, and CRM tags visually.",
        textAr: "ربط الأزرار التفاعلية والمنطق الشرطي وتصنيفات العملاء مرئياً.",
      },
      {
        x: 62,
        y: 30,
        titleEn: "Gulf Arabic Dialect NLP",
        titleAr: "معالجة اللهجات الخليجية",
        textEn: "Understands colloquial greetings, intent, and cultural phrasing natively.",
        textAr: "فهم تلقائي للتحيات والمصطلحات الدارجة والاحتياجات المحلية.",
      },
      {
        x: 78,
        y: 75,
        titleEn: "Grounded RAG Knowledge",
        titleAr: "قاعدة معرفة موثقة (RAG)",
        textEn: "Cites your uploaded PDFs, policies, and catalogs with 100% precision.",
        textAr: "إجابات دقيقة تستند حصراً إلى وثائق الشركة وقوائم الأسعار الرسمية.",
      },
    ],
    metrics: [
      { labelEn: "Routine Queries Solved", labelAr: "حل الاستفسارات المتكررة", value: "80%" },
      { labelEn: "Dialect Accuracy", labelAr: "دقة فهم اللهجات", value: "96.4%" },
      { labelEn: "Setup Time", labelAr: "وقت بناء المسار", value: "< 10 min" },
    ],
  },
  {
    id: "google-reviews",
    titleEn: "Google Review AI Responder",
    titleAr: "الرد الآلي على تقييمات جوجل",
    taglineEn: "Local SEO Keyword Injection & Sentiment Analysis",
    taglineAr: "تحليل المشاعر وتضمين الكلمات المفتاحية",
    badgeEn: "Local Map SEO",
    badgeAr: "سيو خرائط جوجل",
    icon: MessageSquare,
    imageSrc: "/marketing/products/digital-qr-reviews.jpg",
    imageAlt: "AI Auto-Reply interface for Google Business Profile reviews",
    durationSec: 5,
    descriptionEn:
      "Automatically sync and reply to Google Maps and Google Business Profile reviews in under 15 seconds. Generative AI classifies sentiment and naturally injects target commercial keywords (Muscat, Salalah, Dubai, luxury dining) to skyrocket your Google Local 3-Pack rankings.",
    descriptionAr:
      "مزامنة ورد آلي على تقييمات خرائط جوجل وملفات الأعمال خلال أقل من 15 ثانية. يصنف الذكاء الاصطناعي المشاعر ويدمج الكلمات المفتاحية المحلية تلقائياً (مسقط، صلالة، دبي، أفضل مقهى) لرفع ترتيب متجرك في الخرائط.",
    learnMoreHref: "/blog/google-my-business-ai-auto-reply-reviews-oman-uae",
    hotspots: [
      {
        x: 30,
        y: 32,
        titleEn: "Sentiment Classifier",
        titleAr: "محلل المشاعر الذكي",
        textEn: "Distinguishes 5-star praise from 1-star complaints instantly.",
        textAr: "فرز فوري للتقييمات الإيجابية والشكاوى لاتخاذ الإجراء المناسب.",
      },
      {
        x: 70,
        y: 48,
        titleEn: "Local SEO Keywords",
        titleAr: "كلمات السيو المحلي",
        textEn: "Automatically incorporates high-ranking regional search terms in the reply.",
        textAr: "تضمين طبيعي لأقوى الكلمات البحثية التجارية لدعم ترتيب الخرائط.",
      },
      {
        x: 80,
        y: 82,
        titleEn: "Escalation to WhatsApp",
        titleAr: "تحويل الشكاوى للواتساب",
        textEn: "Directs upset reviewers to private resolution before public damage spreads.",
        textAr: "توجيه العملاء غير الراضين للتواصل المباشر وحل مشكلتهم فورياً.",
      },
    ],
    metrics: [
      { labelEn: "Response Speed", labelAr: "سرعة الرد على التقييم", value: "< 15s" },
      { labelEn: "Local Map Lift", labelAr: "زيادة الظهور في الخرائط", value: "+28%" },
      { labelEn: "Owner Coverage", labelAr: "تغطية مراجعات العملاء", value: "100%" },
    ],
  },
  {
    id: "amwalpay-payments",
    titleEn: "In-Chat AmwalPay Checkout",
    titleAr: "المدفوعات التحادثية عبر أموال باي",
    taglineEn: "Native OMR Card Checkout & Signed Webhooks",
    taglineAr: "قبول بطاقات الدفع بالريال العماني وفواتير PDF",
    badgeEn: "Fintech & Payments",
    badgeAr: "التكنولوجيا المالية والمدفوعات",
    icon: CreditCard,
    imageSrc: "/marketing/products/payments.jpg",
    imageAlt: "In-chat WhatsApp card checkout with AmwalPay in Omani Rial",
    durationSec: 5,
    descriptionEn:
      "Generate hosted payment checkout links in Omani Rial (OMR) directly within the customer's WhatsApp chat. Customers pay with debit or credit cards in seconds. Encrypted webhooks automatically update order statuses and dispatch verified PDF invoices.",
    descriptionAr:
      "أنشئ روابط دفع إلكترونية مؤمنة بالريال العماني مباشرة داخل محادثة واتساب. يسدد العميل ببطاقة الخصم المباشر أو الائتمان في ثوانٍ، وتتحث حالة الطلب فورياً عبر ويبهوك مشفر مع إصدار الفاتورة الضريبية.",
    learnMoreHref: "/product/payments",
    hotspots: [
      {
        x: 35,
        y: 40,
        titleEn: "Hosted OMR Checkout",
        titleAr: "بوابة دفع بالريال العماني",
        textEn: "Native card checkout powered by AmwalPay with zero foreign exchange fees.",
        textAr: "سداد محلي بالريال العماني بدون أي رسوم تحويل عملات أجنبية.",
      },
      {
        x: 65,
        y: 65,
        titleEn: "Cryptographic Webhook",
        titleAr: "ويبهوك مؤمن ومشفر",
        textEn: "HMAC signed notifications ensure bulletproof payment verification.",
        textAr: "تأكيد فوري لحالة السداد بتوقيع رقمي يمنع أي تلاعب بالمعاملات.",
      },
      {
        x: 75,
        y: 25,
        titleEn: "Automated PDF Receipt",
        titleAr: "إصدار فواتير إلكترونية فورية",
        textEn: "Instantly stamps and sends VAT-compliant receipts upon payment.",
        textAr: "إرسال فاتورة إلكترونية معتمدة بصيغة PDF فور اكتمال الدفع.",
      },
    ],
    metrics: [
      { labelEn: "Checkout Completion", labelAr: "نسبة إتمام الدفع", value: "94.6%" },
      { labelEn: "Meta Fee Markup", labelAr: "عمولة إضافية على ميتا", value: "0%" },
      { labelEn: "Settlement Time", labelAr: "زمن التحقق من العملية", value: "Instant" },
    ],
  },
]

export function ProductWalkthroughRemotion({ isAr }: { isAr: boolean }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const [activeHotspot, setActiveHotspot] = useState<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const current = CHAPTERS[activeIdx]

  // Playhead loop adhering to Remotion timeline composition
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    const intervalMs = 50
    const stepDurationMs = current.durationSec * 1000
    const progressIncrement = (intervalMs / stepDurationMs) * 100

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveIdx((curr) => (curr + 1) % CHAPTERS.length)
          setActiveHotspot(null)
          return 0
        }
        return prev + progressIncrement
      })
    }, intervalMs)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, activeIdx, current.durationSec])

  const selectChapter = (index: number) => {
    setActiveIdx(index)
    setProgress(0)
    setActiveHotspot(null)
  }

  const togglePlay = () => setIsPlaying((p) => !p)

  const handlePrev = () => {
    setActiveIdx((curr) => (curr - 1 + CHAPTERS.length) % CHAPTERS.length)
    setProgress(0)
    setActiveHotspot(null)
  }

  const handleNext = () => {
    setActiveIdx((curr) => (curr + 1) % CHAPTERS.length)
    setProgress(0)
    setActiveHotspot(null)
  }

  return (
    <section className="relative overflow-hidden border-b border-slate-200/90 bg-gradient-to-b from-white via-slate-50/50 to-white px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-10">
        {/* Header with high contrast and badge */}
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-600/30 bg-emerald-50 px-3.5 py-1.5 text-[12.5px] font-bold text-emerald-800 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>{isAr ? "جولة المنتج التفاعلية (Remotion Video Studio)" : "Interactive Product Walkthrough Studio"}</span>
          </div>
          <h2 className="text-[34px] font-black tracking-tight text-slate-950 sm:text-[44px]">
            {isAr ? "شاهد منصة فيزموه أثناء العمل الفعلي" : "See Fizmoh in Action: 5 Core Workflows"}
          </h2>
          <p className="text-[16px] md:text-[17px] leading-relaxed text-slate-700">
            {isAr
              ? "استكشف بالصوت والصورة كيفية إدارة صندوق الوارد، وتشغيل قوائم المطاعم الذكية، وأتمتة مسارات الذكاء الاصطناعي، وتحصيل المدفوعات بالريال العماني."
              : "Experience how modern GCC businesses handle customer chats, digital QR dining, Arabic conversational AI, Google review replies, and instant card payments."}
          </p>
        </div>

        {/* Chapter Pills (Remotion Sequence Selector) */}
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
          {CHAPTERS.map((ch, idx) => {
            const Icon = ch.icon
            const isActive = idx === activeIdx
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => selectChapter(idx)}
                className={`group flex items-center gap-2.5 rounded-full px-4 py-2.5 text-[13.5px] font-bold transition-all duration-200 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  isActive
                    ? "bg-slate-950 text-white shadow-md shadow-slate-900/15"
                    : "bg-white text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-100/70"
                }`}
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                    isActive ? "bg-emerald-500 text-slate-950" : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span>{isAr ? ch.titleAr : ch.titleEn}</span>
                {isActive && (
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            )
          })}
        </div>

        {/* Video Canvas Container */}
        <div className="relative mx-auto max-w-5xl rounded-3xl border-2 border-slate-300/80 bg-slate-950 p-2 sm:p-4 shadow-2xl shadow-slate-900/20">
          {/* Top Browser / App Chrome Bar */}
          <div className="mb-3 flex items-center justify-between border-b border-slate-800/80 pb-3 px-3 text-slate-400">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-500/80" />
              <span className="h-3 w-3 rounded-full bg-amber-500/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 hidden text-[12px] font-mono font-medium text-slate-400 sm:inline">
                https://app.fizmoh.cloud/workspace/{current.id}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[12px] font-bold text-slate-300">
              <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-emerald-400 border border-emerald-500/30">
                {isAr ? current.badgeAr : current.badgeEn}
              </span>
              <span className="font-mono text-slate-400">
                0{activeIdx + 1} / 0{CHAPTERS.length}
              </span>
            </div>
          </div>

          {/* Video Scene Viewport */}
          <div className="relative aspect-16/10 w-full overflow-hidden rounded-2xl bg-slate-900">
            {/* Visual Image Screen */}
            <Image
              src={current.imageSrc}
              alt={current.imageAlt}
              fill
              className="object-cover object-top transition-transform duration-700 ease-out hover:scale-102"
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
            />

            {/* Gradient Scrim for readable overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent pointer-events-none" />

            {/* Interactive Hotspot Pins (Remotion Highlight Badges) */}
            {current.hotspots.map((spot, sIdx) => {
              const isSelected = activeHotspot === sIdx
              return (
                <div
                  key={sIdx}
                  style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                >
                  <button
                    type="button"
                    onClick={() => setActiveHotspot(isSelected ? null : sIdx)}
                    className="relative flex items-center justify-center p-2 cursor-pointer group focus-visible:outline-hidden"
                    aria-label={`Hotspot: ${spot.titleEn}`}
                  >
                    <span className="absolute h-9 w-9 rounded-full bg-emerald-500/35 animate-ping" />
                    <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[12px] shadow-lg border-2 border-white ring-2 ring-emerald-400/50 hover:bg-emerald-500 transition-colors">
                      {sIdx + 1}
                    </span>
                  </button>

                  {/* Hotspot Floating Tooltip */}
                  {isSelected && (
                    <div
                      className={`absolute bottom-full mb-2 w-64 rounded-xl border border-slate-700 bg-slate-900/95 p-3.5 text-white shadow-2xl backdrop-blur-md z-30 transition-all ${
                        spot.x > 60 ? "-right-4" : "-left-4"
                      }`}
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                        <span className="text-[12px] font-bold text-emerald-400">
                          {isAr ? spot.titleAr : spot.titleEn}
                        </span>
                        <Info className="h-3 w-3 text-slate-400" />
                      </div>
                      <p className="mt-1.5 text-[12px] leading-relaxed text-slate-300">
                        {isAr ? spot.textAr : spot.textEn}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Bottom Caption Overlay */}
            <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="max-w-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[12px] font-extrabold uppercase tracking-wider text-emerald-300 font-mono">
                    {isAr ? current.taglineAr : current.taglineEn}
                  </span>
                </div>
                <h3 className="text-[20px] sm:text-[24px] font-black text-white tracking-tight">
                  {isAr ? current.titleAr : current.titleEn}
                </h3>
                <p className="text-[13.5px] sm:text-[14.5px] text-slate-200 line-clamp-2 leading-relaxed">
                  {isAr ? current.descriptionAr : current.descriptionEn}
                </p>
              </div>

              {/* Action Link Button */}
              <div className="shrink-0">
                <Link href={current.learnMoreHref}>
                  <Button
                    size="sm"
                    className="h-10 rounded-full bg-white px-5 text-[13px] font-bold text-slate-950 hover:bg-emerald-400 hover:text-slate-950 transition-all shadow-md cursor-pointer"
                  >
                    <span>{isAr ? "استكشف هذه الميزة" : "Explore Feature"}</span>
                    <ArrowRight className={`ml-1.5 h-3.5 w-3.5 ${isAr ? "rotate-180 mr-1.5 ml-0" : ""}`} />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Timeline Controls & Scrubber (Remotion Playback Controller) */}
          <div className="mt-3 space-y-3 px-2 sm:px-3 pt-1">
            {/* Smooth Progress Bar */}
            <div
              className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800 cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const clickX = e.clientX - rect.left
                const newProgress = Math.max(0, Math.min(100, (clickX / rect.width) * 100))
                setProgress(newProgress)
              }}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Media Bar: Play/Pause, Next/Prev, Timers, Metrics */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-slate-300 text-[13px]">
              {/* Playback Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer focus-visible:outline-hidden"
                  aria-label={isPlaying ? "Pause walkthrough" : "Play walkthrough"}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Previous chapter"
                >
                  <ChevronLeft className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Next chapter"
                >
                  <ChevronRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
                </button>
                <span className="font-mono text-[12px] text-slate-400 pl-2">
                  00:0{Math.floor((progress / 100) * current.durationSec)} / 00:0{current.durationSec}
                </span>
              </div>

              {/* Verified Metrics Badges */}
              <div className="flex items-center gap-3">
                {current.metrics.map((m, mIdx) => (
                  <div
                    key={mIdx}
                    className="hidden sm:flex items-center gap-1.5 rounded-lg bg-slate-900/80 px-2.5 py-1 border border-slate-800 text-[12px]"
                  >
                    <span className="font-extrabold text-emerald-400 font-mono">{m.value}</span>
                    <span className="text-slate-400">{isAr ? m.labelAr : m.labelEn}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
