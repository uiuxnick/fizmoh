"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Sparkles,
  Play,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Star,
  Users,
  Send,
  CreditCard,
  QrCode,
  Smartphone,
  MessageSquare,
  MessageCircle,
  Share2,
  Clock,
  ChevronRight,
  Download,
  Flame,
  Check,
  FileText,
  Building2,
  Compass,
  RefreshCw,
  ShoppingBag,
  BellRing,
  Award,
  Layers,
  BarChart3,
  Bot,
} from "lucide-react"

interface ShowcaseProps {
  slug: string
  isAr: boolean
}

export function ProductInteractiveShowcase({ slug, isAr }: ShowcaseProps) {
  switch (slug) {
    case "botflow-studio":
      return <BotflowStudioShowcase isAr={isAr} />
    case "smart-menu-ordering":
      return <SmartMenuShowcase isAr={isAr} />
    case "digital-qr-reviews":
      return <DigitalQrReviewsShowcase isAr={isAr} />
    case "broadcast-campaigns":
      return <BroadcastCampaignsShowcase isAr={isAr} />
    case "payments":
      return <PaymentsShowcase isAr={isAr} />
    case "digital-vcard":
      return <DigitalVcardShowcase isAr={isAr} />
    case "instagram-automation":
      return <InstagramAutomationShowcase isAr={isAr} />
    case "facebook-automation":
      return <FacebookAutomationShowcase isAr={isAr} />
    case "facebook-instagram-automation":
      return <UnifiedSocialShowcase isAr={isAr} />
    default:
      return null
  }
}

/* ========================================================================= */
/* 1. BOTFLOW STUDIO SHOWCASE                                                */
/* ========================================================================= */
function BotflowStudioShowcase({ isAr }: { isAr: boolean }) {
  const [activeStep, setActiveStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const steps = [
    {
      id: "trigger",
      type: isAr ? "مُشغّل الرسائل" : "Trigger Node",
      title: isAr ? "رسالة واردة: 'عرض الأسعار'" : "Inbound Msg: 'Pricing' or 'Catalog'",
      status: isAr ? "نشط - استماع فوري" : "Listening 24/7",
      color: "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
      detail: isAr ? "التقاط فوري خلال < 30ms عبر Meta Cloud API" : "Zero-latency Meta webhook ingestion",
    },
    {
      id: "condition",
      type: isAr ? "شرط الفحص" : "Branch Decision",
      title: isAr ? "هل العميل مسجل بالـ CRM؟" : "Customer in CRM Database?",
      status: isAr ? "استعلام Supabase / PostgreSQL" : "Verified Customer Record",
      color: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      detail: isAr ? "نعم -> توجيه لعرض VIP | لا -> رسالة ترحيبية جديدة" : "Yes -> VIP tier | No -> Onboarding flow",
    },
    {
      id: "interactive",
      type: isAr ? "إجراء تفاعلي" : "Interactive Action",
      title: isAr ? "إرسال قائمة أزرار تفاعلية" : "Send Interactive List Menu",
      status: isAr ? "3 خيارات مخصصة مع صور منتجات" : "Rich WhatsApp Buttons + Catalog",
      color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      detail: isAr ? "تضمين رابط دفع محلي بريال عماني OMR" : "Embedded OMR AmwalPay checkout URL",
    },
    {
      id: "handoff",
      type: isAr ? "تحويل بشري ذكي" : "Human Handoff",
      title: isAr ? "توجيه لموظف المبيعات المناسب" : "Route to Sales Executive (Muscat)",
      status: isAr ? "إشعار فوري في صندوق الوارد المشترك" : "Auto-assigned in Team Inbox",
      color: "border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-400",
      detail: isAr ? "حفظ سجل المحادثة مع ملخص AI" : "Preserved context with AI sentiment summary",
    },
  ]

  const runSimulation = () => {
    setIsPlaying(true)
    setActiveStep(0)
    let s = 0
    const interval = setInterval(() => {
      s += 1
      if (s >= steps.length) {
        clearInterval(interval)
        setIsPlaying(false)
      } else {
        setActiveStep(s)
      }
    }, 1200)
  }

  return (
    <section className="relative overflow-hidden border-b border-[var(--mk-line)] bg-gradient-to-b from-[var(--mk-surface)] via-[var(--mk-surface-2)] to-[var(--mk-surface)] px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Bot className="h-3.5 w-3.5" />
              {isAr ? "محرر المسارات البصري الحي" : "Interactive Botflow Visual Canvas"}
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl text-[var(--mk-ink)]">
              {isAr
                ? "صمم تدفقات ذكية دون سطر كود واحد"
                : "Engineered for complex logic, zero code required"}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[var(--mk-ink-soft)] max-w-2xl">
              {isAr
                ? "اربط مشغلات Meta الرسمية، والشروط الشرطية، ومجموعات الأزرار، وتحويل الموظفين في لوحة تفاعلية فورية."
                : "Connect triggers, branching rules, interactive WhatsApp menus, and live agent handoffs in a single fluid canvas."}
            </p>
          </div>

          <button
            onClick={runSimulation}
            disabled={isPlaying}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-emerald-700 transition cursor-pointer disabled:opacity-50"
          >
            {isPlaying ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
            {isPlaying
              ? (isAr ? "جارٍ محاكاة التنفيذ..." : "Executing Flow...")
              : (isAr ? "محاكاة تشغيل التدفق" : "Simulate Live Execution")}
          </button>
        </div>

        {/* Visual Canvas Representation */}
        <div className="relative rounded-3xl border border-[var(--mk-line)] bg-card/60 backdrop-blur-xl p-6 sm:p-10 shadow-xl overflow-hidden">
          <div className="absolute inset-0 bg-grid-slate-900/[0.04] dark:bg-grid-white/[0.02] -z-10" />

          {/* Stepper Grid */}
          <div className="grid gap-6 md:grid-cols-4 relative">
            {steps.map((step, idx) => {
              const isActive = activeStep === idx
              const isPast = activeStep > idx

              return (
                <div
                  key={step.id}
                  onClick={() => setActiveStep(idx)}
                  className={`group relative cursor-pointer rounded-2xl border p-5 transition-all duration-300 ${
                    isActive
                      ? `${step.color} shadow-lg ring-2 ring-emerald-500/30 scale-[1.02]`
                      : isPast
                      ? "border-emerald-500/30 bg-emerald-500/5 opacity-90"
                      : "border-[var(--mk-line)] bg-background/50 hover:border-foreground/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono uppercase tracking-wider font-bold opacity-75">
                      {step.type}
                    </span>
                    {isPast ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold bg-muted">
                        {idx + 1}
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-sm sm:text-base text-foreground mb-1 leading-snug">
                    {step.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-2">{step.detail}</p>

                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] font-medium">
                    <span className="text-emerald-600 dark:text-emerald-400">{step.status}</span>
                    <span className="text-muted-foreground group-hover:translate-x-0.5 transition-transform">
                      {isAr ? "عرض التفاصيل" : "Inspect"} →
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Real-time State Inspector */}
          <div className="mt-8 rounded-2xl border border-border/60 bg-muted/30 p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {isAr
                  ? `الحالة الحالية: العقدة [${steps[activeStep].id}] - زمن الاستجابة 24ms`
                  : `Active Node State: [${steps[activeStep].id}] — Latency 24ms (Meta Cloud Edge)`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/signup"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 underline underline-offset-4"
              >
                {isAr ? "افتح المحرر الكامل في لوحتك مجاناً" : "Open Full Visual Canvas in App"} →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ========================================================================= */
/* 2. SMART MENU ORDERING SHOWCASE                                           */
/* ========================================================================= */
function SmartMenuShowcase({ isAr }: { isAr: boolean }) {
  const [cart, setCart] = useState<{ id: string; name: string; price: number; count: number }[]>([
    { id: "1", name: isAr ? "شواء عماني تقليدي (لحم غنم طازج)" : "Traditional Omani Shuwa", price: 6.5, count: 1 },
    { id: "2", name: isAr ? "حلوى عمانية بالزعفران والهيل" : "Omani Halwa with Cardamom", price: 2.2, count: 1 },
  ])
  const [table, setTable] = useState("Table 04")
  const [orderSent, setOrderSent] = useState(false)

  const items = [
    { id: "1", name: isAr ? "شواء عماني تقليدي (لحم غنم طازج)" : "Traditional Omani Shuwa", price: 6.5, category: isAr ? "أطباق رئيسية" : "Mains" },
    { id: "2", name: isAr ? "حلوى عمانية بالزعفران والهيل" : "Omani Halwa with Cardamom", price: 2.2, category: isAr ? "حلويات" : "Desserts" },
    { id: "3", name: isAr ? "كرك بالزعفران والزنجبيل" : "Saffron & Ginger Karak Tea", price: 0.8, category: isAr ? "مشروبات" : "Drinks" },
    { id: "4", name: isAr ? "مجبوس روبيان صيد اليوم" : "Fresh Catch Gulf Shrimp Majboos", price: 5.8, category: isAr ? "أطباق رئيسية" : "Mains" },
  ]

  const total = cart.reduce((sum, item) => sum + item.price * item.count, 0)

  const addItem = (item: (typeof items)[0]) => {
    setCart((prev) => {
      const exist = prev.find((x) => x.id === item.id)
      if (exist) {
        return prev.map((x) => (x.id === item.id ? { ...x, count: x.count + 1 } : x))
      }
      return [...prev, { ...item, count: 1 }]
    })
  }

  const handleSendOrder = () => {
    setOrderSent(true)
    setTimeout(() => setOrderSent(false), 5000)
  }

  return (
    <section className="relative overflow-hidden border-b border-[var(--mk-line)] bg-gradient-to-b from-[var(--mk-surface-2)] to-[var(--mk-surface)] px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-3">
            <ShoppingBag className="h-3.5 w-3.5" />
            {isAr ? "نظام الطلبات الذكي للمطاعم والمقاهي" : "Zero-Friction Restaurant & Café KDS"}
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-[var(--mk-ink)]">
            {isAr
              ? "مسح QR، طلب فوري، ومزامنة فورية مع المطبخ عبر واتساب"
              : "Scan QR, Order via WhatsApp, Instant Kitchen Display (KDS)"}
          </h2>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base">
            {isAr
              ? "لا حاجة لتحميل أي تطبيق. العميل يمسح الباركود، يختار وجباته، ويصل الطلب مباشرة لشاشة المطبخ KDS مع إشعار بالريال العماني."
              : "No app downloads. Guests scan their table QR, customize dishes, and submit straight to your kitchen line with instant OMR payment."}
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Guest Table Experience */}
          <div className="lg:col-span-7 rounded-3xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  QR
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    {isAr ? "قائمة مطعم صلالة التراثي" : "Salalah Heritage Dining"}
                  </h3>
                  <span className="text-xs text-muted-foreground">{table} · Muscat, Oman</span>
                </div>
              </div>

              <select
                value={table}
                onChange={(e) => setTable(e.target.value)}
                aria-label={isAr ? "اختر رقم الطاولة" : "Select table number"}
                className="text-xs rounded-lg border border-border bg-background px-3 py-1.5 font-medium"
              >
                <option value="Table 01">{isAr ? "طاولة 01" : "Table 01"}</option>
                <option value="Table 04">{isAr ? "طاولة 04 (الحديقة)" : "Table 04 (Garden)"}</option>
                <option value="Table 12">{isAr ? "طاولة 12 (VIP)" : "Table 12 (VIP Room)"}</option>
              </select>
            </div>

            {/* Menu Items */}
            <div className="mt-5 space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/40 transition"
                >
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">{item.name}</h4>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                      {item.price.toFixed(3)} OMR
                    </span>
                  </div>
                  <button
                    onClick={() => addItem(item)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition shadow-xs"
                  >
                    + {isAr ? "إضافة" : "Add"}
                  </button>
                </div>
              ))}
            </div>

            {/* Cart Bar */}
            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground">{isAr ? "المجموع الكلي:" : "Total Order:"}</span>
                <p className="text-lg font-bold text-foreground font-mono">{total.toFixed(3)} OMR</p>
              </div>

              <button
                onClick={handleSendOrder}
                className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold transition cursor-pointer shadow-md flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {isAr ? "إرسال الطلب للمطبخ عبر واتساب" : "Send Order via WhatsApp"}
              </button>
            </div>
          </div>

          {/* Kitchen Display System (KDS) Live View */}
          <div className="lg:col-span-5 rounded-3xl border border-border bg-slate-950 text-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300">
                  {isAr ? "شاشة المطبخ المباشرة (KDS)" : "Live Kitchen KDS Display"}
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-400">POS Sync: Online</span>
            </div>

            {orderSent ? (
              <div className="my-6 p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-center animate-bounce">
                <BellRing className="h-6 w-6 mx-auto mb-1 text-emerald-400" />
                <p className="font-bold text-sm">{isAr ? "وصل طلب جديد للمطبخ!" : "NEW TICKET #1088 RECEIVED!"}</p>
                <span className="text-xs text-emerald-200 font-mono">{table} · {total.toFixed(3)} OMR · WhatsApp Verified</span>
              </div>
            ) : null}

            <div className="space-y-3 mt-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="flex justify-between items-center text-xs text-slate-400 mb-2 pb-2 border-b border-slate-800">
                  <span className="font-bold text-white">#1087 · Table 02</span>
                  <span className="text-amber-400 font-mono">4 mins ago (Cooking)</span>
                </div>
                <p className="text-xs text-slate-200">1x Majboos Lamb · 2x Karak Tea</p>
                <div className="mt-3 flex justify-between items-center text-[11px]">
                  <span className="text-emerald-400 font-mono">Paid (AmwalPay)</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">{isAr ? "قيد التحضير" : "In Prep"}</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="flex justify-between items-center text-xs text-slate-400 mb-2 pb-2 border-b border-slate-800">
                  <span className="font-bold text-white">#1086 · Table 09</span>
                  <span className="text-emerald-400 font-mono">11 mins ago (Ready)</span>
                </div>
                <p className="text-xs text-slate-200">2x Halwa Saffron · 1x Omani Coffee</p>
                <div className="mt-3 flex justify-between items-center text-[11px]">
                  <span className="text-emerald-400 font-mono">Paid (Apple Pay)</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">{isAr ? "جاهز للتقديم" : "Ready"}</span>
                </div>
              </div>
            </div>

            <p className="mt-5 text-[11px] text-slate-500 text-center">
              {isAr ? "تلقائي بالكامل: ربط مباشر مع طابعات الإيصالات الحرارية والـ POS" : "Integrated with thermal receipt printers & cloud POS systems."}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ========================================================================= */
/* 3. DIGITAL QR REVIEWS SHOWCASE                                            */
/* ========================================================================= */
function DigitalQrReviewsShowcase({ isAr }: { isAr: boolean }) {
  const [rating, setRating] = useState(5)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  return (
    <section className="relative overflow-hidden border-b border-[var(--mk-line)] bg-gradient-to-b from-[var(--mk-surface)] via-[var(--mk-surface-2)] to-[var(--mk-surface)] px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-5xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3.5 py-1 text-xs font-semibold text-yellow-600 dark:text-yellow-400 mb-3">
          <Star className="h-3.5 w-3.5 fill-current" />
          {isAr ? "بوابة التقييمات الذكية وحماية السمعة" : "Smart Review Gatekeeper & Reputation Shield"}
        </div>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-[var(--mk-ink)]">
          {isAr
            ? "حوّل التقييمات الإيجابية لخرائط Google، وحل الشكاوى سراً"
            : "Boost 5-Star Google Reviews, Resolve Negative Feedback Privately"}
        </h2>
        <p className="mt-3 text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
          {isAr
            ? "اختبر كيف تعمل المنظومة الذكية: اضغط على عدد النجوم لتشاهد التوجيه الذكي المباشر حسب رضا العميل."
            : "Click any star rating below to test the intelligent conditional routing logic live."}
        </p>

        {/* Interactive Star Selector */}
        <div className="mt-8 flex justify-center items-center gap-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => {
                setRating(star)
                setFeedbackSubmitted(false)
              }}
              className="p-2 transition-transform hover:scale-125 cursor-pointer"
              aria-label={`${star} Stars`}
            >
              <Star
                className={`h-9 w-9 sm:h-12 sm:w-12 transition-colors ${
                  star <= rating
                    ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.5)]"
                    : "text-muted-foreground/30 hover:text-muted-foreground/60"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Dynamic Branching Preview */}
        <div className="mt-8 max-w-2xl mx-auto">
          {rating >= 4 ? (
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6 sm:p-8 text-start shadow-xl animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold">
                  5★
                </div>
                <div>
                  <h4 className="font-bold text-base text-foreground">
                    {isAr ? "تحويل فوري إلى خرائط Google (Google Maps)" : "Direct Booster to Google Maps Muscat"}
                  </h4>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    {isAr ? "تم اكتشاف عميل سعيد ومتحمس" : "High sentiment detected — Maximum SEO impact"}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isAr
                  ? "يتم فتح صفحة متجرك أو مطعمك في خرائط Google مباشرة مع وضع تقييم 5 نجوم جاهزاً للنشر بضغطة زر واحدة، مما يرفع ترتيبك المحلي في مسقط وباقي المحافظات."
                  : "Guest is redirected straight to your Google Business Profile with pre-selected 5 stars and 1-tap review submission to dominate local search in Muscat."}
              </p>
              <div className="mt-5 p-3 rounded-xl bg-background border border-border flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">https://g.page/r/your-business/review</span>
                <span className="text-xs font-bold text-emerald-600">{isAr ? "توجيه تلقائي" : "Auto-Redirect"} ↗</span>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-6 sm:p-8 text-start shadow-xl animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
                  🛡️
                </div>
                <div>
                  <h4 className="font-bold text-base text-foreground">
                    {isAr ? "درع حماية السمعة: استبيان داخلي سري" : "Reputation Shield: Private Resolution Form"}
                  </h4>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    {isAr ? "منع التقييم السلبي على العلن وتحويله للمدير فوراً" : "Intercepted before reaching Google Maps"}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {isAr
                  ? "لا يتم فتح خرائط Google إطلاقاً. تفتح نافذة محادثة خاصة وسرية مع إدارة المتجر لتقديم اعتذار فوري، قسيمة تعويض، وحل المشكلة قبل خسارة العميل."
                  : "Feedback is privately routed to the General Manager's WhatsApp inbox with automated apology & voucher workflow, keeping your public Google score 4.8+."}
              </p>
              <div className="p-4 rounded-xl bg-background border border-border">
                <textarea
                  className="w-full text-xs p-2 rounded-lg border border-border bg-muted/20"
                  rows={2}
                  placeholder={isAr ? "كيف يمكننا تعويضك وتحسين تجربتك فوراً؟" : "What can our management team do to make this right?"}
                />
                <button
                  onClick={() => setFeedbackSubmitted(true)}
                  className="mt-2 w-full py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition cursor-pointer"
                >
                  {feedbackSubmitted ? (isAr ? "تم إرسال الشكوى للمدير بنجاح ✓" : "Routed to Manager WhatsApp ✓") : (isAr ? "إرسال سري للإدارة فقط" : "Submit Privately to GM")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ========================================================================= */
/* 4. BROADCAST CAMPAIGNS SHOWCASE                                           */
/* ========================================================================= */
function BroadcastCampaignsShowcase({ isAr }: { isAr: boolean }) {
  const [contacts, setContacts] = useState(5000)
  const metaPerMsg = 0.0135 // approximate official Meta rate in OMR for marketing conversation
  const fizmohMarkup = 0 // 0% markup
  const aggregatorMarkup = 0.015 // legacy aggregators take huge cut

  const fizmohCost = (contacts * metaPerMsg).toFixed(2)
  const legacyCost = (contacts * (metaPerMsg + aggregatorMarkup)).toFixed(2)
  const savings = (parseFloat(legacyCost) - parseFloat(fizmohCost)).toFixed(2)

  return (
    <section className="relative overflow-hidden border-b border-[var(--mk-line)] bg-gradient-to-b from-[var(--mk-surface-2)] to-[var(--mk-surface)] px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3.5 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400 mb-3">
            <Flame className="h-3.5 w-3.5" />
            {isAr ? "حملات البث الجماعي الرسمية بنسبة فتح 98%" : "Official Meta Cloud Broadcast Studio"}
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-[var(--mk-ink)]">
            {isAr
              ? "0% هوامش ربح إضافية · بدون حظر أرقام · سرعة تصل 1,000 رسالة/ثانية"
              : "0% Message Surcharge · Zero Number Bans · 1,000 Msgs/Sec"}
          </h2>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base">
            {isAr
              ? "على عكس الوسطاء التقليديين، فزموه لا تفرض أي سنت إضافي على أسعار ميتا الرسمية. قارن التوفير المالي الفوري بالريال العماني."
              : "Unlike legacy aggregators charging 2x-3x markups, Fizmoh charges 0% per-message commission. Calculate your savings below."}
          </p>
        </div>

        {/* Interactive Volume Slider & Savings Calculator */}
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xl">
            <h3 className="font-bold text-lg mb-2">{isAr ? "حدد حجم الجمهور المستهدف" : "Select Audience Contact Volume"}</h3>
            <p className="text-xs text-muted-foreground mb-6">
              {isAr ? "اسحب المؤشر لتقدير التكلفة الدقيقة للحملة بالريال العماني" : "Drag the slider to preview campaign throughput and OMR cost"}
            </p>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-muted-foreground">{isAr ? "عدد جهات الاتصال" : "Verified Contacts"}</span>
                <span className="text-xl font-bold text-foreground font-mono">{contacts.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="1000"
                max="50000"
                step="1000"
                value={contacts}
                onChange={(e) => setContacts(parseInt(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground mt-1 font-mono">
                <span>1,000</span>
                <span>25,000</span>
                <span>50,000</span>
              </div>
            </div>

            {/* Campaign Template Preview */}
            <div className="rounded-2xl border border-border/80 bg-muted/40 p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span className="font-mono">{isAr ? "قالب معتمد من ميتا" : "Meta Verified Template: eid_offer_om"}</span>
                <span className="text-emerald-600 font-semibold">{isAr ? "معتمد ✓" : "Approved ✓"}</span>
              </div>
              <p className="text-xs text-foreground leading-relaxed font-sans">
                {isAr
                  ? `مرحباً {{اسم_العميل}} 🌙، بمناسبة الأعياد نقدم لك خصماً حصرياً 20% في فرعنا بـ {{المدينة}}! اضغط أدناه لتأكيد حجزك.`
                  : `Salam {{customer_name}} 🌙, celebrate the season with 20% off at our Muscat branch! Tap below to claim your personalized pass.`}
              </p>
            </div>
          </div>

          {/* Pricing Comparison Card */}
          <div className="lg:col-span-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6 sm:p-8 shadow-xl">
            <h3 className="font-bold text-lg text-emerald-950 dark:text-emerald-200 mb-6 flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-600" />
              {isAr ? "مقارنة التكلفة المباشرة (عمان والخليج)" : "Transparent OMR Billing Comparison"}
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-500/30 bg-background">
                <div>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    {isAr ? "منصة فزموه (Fizmoh)" : "Fizmoh Platform (0% Surcharge)"}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">{isAr ? "سعر ميتا الرسمي النقي بدون أي رسوم خفية" : "Direct Cloud API pass-through"}</p>
                </div>
                <span className="text-2xl font-bold font-mono text-emerald-600">{fizmohCost} OMR</span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background opacity-75">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {isAr ? "الوسطاء القدامى (Aggregators)" : "Legacy Telephony Aggregators"}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">{isAr ? "رسوم إضافية وهوامش غير معلنة" : "Markups + monthly connection fees"}</p>
                </div>
                <span className="text-2xl font-bold font-mono line-through text-muted-foreground">{legacyCost} OMR</span>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-emerald-500/20 flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">{isAr ? "التوفير الصافي في هذه الحملة:" : "Net Savings This Campaign:"}</span>
                <p className="text-xs text-muted-foreground">{isAr ? "مبالغ مستردة مباشرة لأرباح شركتك" : "Instant budget retained in your bottom line"}</p>
              </div>
              <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">+{savings} OMR</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ========================================================================= */
/* 5. PAYMENTS SHOWCASE                                                      */
/* ========================================================================= */
function PaymentsShowcase({ isAr }: { isAr: boolean }) {
  const [paid, setPaid] = useState(false)

  return (
    <section className="relative overflow-hidden border-b border-[var(--mk-line)] bg-gradient-to-b from-[var(--mk-surface)] via-[var(--mk-surface-2)] to-[var(--mk-surface)] px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-3">
            <CreditCard className="h-3.5 w-3.5" />
            {isAr ? "روابط الدفع المباشرة بالريال العماني" : "AmwalPay & Apple Pay WhatsApp Checkout"}
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-[var(--mk-ink)]">
            {isAr
              ? "تحصيل الأموال مباشرة داخل المحادثة مع فواتير PDF تلقائية"
              : "Collect Payments in WhatsApp with Instant Verified PDF Invoices"}
          </h2>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base">
            {isAr
              ? "متوافق 100% مع البنك المركزي العماني (CBO)، بوابة AmwalPay، وبطاقات الخصم المباشر وبطاقات فيزا وماستركارد وأبل باي."
              : "Central Bank of Oman compliant payment links via AmwalPay with local debit card (OmanNet), Apple Pay, and instant receipt dispatch."}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Simulated WhatsApp Payment Card */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  OMR
                </div>
                <div>
                  <h4 className="font-bold text-sm">{isAr ? "فاتورة رقم #FZ-9821" : "Invoice #FZ-9821"}</h4>
                  <span className="text-xs text-muted-foreground">Fizmoh Cloud Billing · Muscat</span>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600">
                {paid ? (isAr ? "مدفوع بالكامل ✓" : "PAID ✓") : (isAr ? "في الانتظار" : "UNPAID")}
              </span>
            </div>

            <div className="my-6 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{isAr ? "الخدمة:" : "Service:"}</span>
                <span className="font-semibold text-foreground">{isAr ? "اشتراك شهري لباقة الشركات" : "Enterprise Workspace Plan"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{isAr ? "المبلغ المستحق:" : "Amount Due:"}</span>
                <span className="font-bold text-foreground font-mono text-base">25.000 OMR</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{isAr ? "بوابة الدفع:" : "Gateway:"}</span>
                <span className="font-medium text-emerald-600">AmwalPay OmanNet / Apple Pay</span>
              </div>
            </div>

            {paid ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-center animate-in zoom-in-95">
                <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-emerald-600" />
                <p className="font-bold text-sm">{isAr ? "تم إتمام الدفع بنجاح!" : "Payment Successfully Processed!"}</p>
                <span className="text-xs font-mono text-muted-foreground">Ref: AMW-2026-OM-98214 · 25.000 OMR</span>
                <button
                  onClick={() => setPaid(false)}
                  className="mt-3 text-xs text-emerald-600 underline font-semibold block mx-auto cursor-pointer"
                >
                  {isAr ? "إعادة التجربة" : "Reset Test"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => setPaid(true)}
                  className="w-full py-3 rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 hover:opacity-90 transition cursor-pointer shadow-md"
                >
                  <span>Pay with</span>
                  <span className="font-bold font-sans">Apple Pay</span>
                </button>
                <button
                  onClick={() => setPaid(true)}
                  className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 transition cursor-pointer shadow-md"
                >
                  <CreditCard className="h-4 w-4" />
                  {isAr ? "دفع 25.000 ر.ع عبر بطاقة الخصم (AmwalPay)" : "Pay 25.000 OMR with Debit / Credit Card"}
                </button>
              </div>
            )}
          </div>

          {/* Automated PDF WhatsApp Receipt Preview */}
          <div className="rounded-3xl border border-border bg-muted/30 p-6 sm:p-8 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                <FileText className="h-4 w-4 text-emerald-600" />
                {isAr ? "الإشعار التلقائي بالواتساب" : "Instant Automated WhatsApp PDF"}
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 font-bold">
                    PDF
                  </div>
                  <div>
                    <h5 className="font-semibold text-xs text-foreground">Tax_Invoice_FZ9821.pdf</h5>
                    <span className="text-[11px] text-muted-foreground">124 KB · Verified Oman QR Stamp</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isAr
                    ? "فور إتمام العملية، يُرسل النظام إيصال الدفع الرسمي بصيغة PDF للعميل مباشرة على واتساب متضمناً رمز QR المتوافق مع متطلبات جهاز الضرائب العماني."
                    : "Instantly upon confirmation, the customer receives their official stamped PDF receipt with compliance QR code directly on their WhatsApp."}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                {isAr ? "تسوية محلية فورية في حسابك البنكي بمسقط" : "Same-day settlement to your Omani bank account"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ========================================================================= */
/* 6. DIGITAL VCARD SHOWCASE                                                 */
/* ========================================================================= */
function DigitalVcardShowcase({ isAr }: { isAr: boolean }) {
  const [flipped, setFlipped] = useState(false)

  return (
    <section className="relative overflow-hidden border-b border-[var(--mk-line)] bg-gradient-to-b from-[var(--mk-surface-2)] to-[var(--mk-surface)] px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-5xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3.5 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400 mb-3">
          <Smartphone className="h-3.5 w-3.5" />
          {isAr ? "بطاقات العمل الرقمية الذكية وتقنية NFC" : "Next-Gen NFC & Digital Business Identity"}
        </div>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-[var(--mk-ink)]">
          {isAr
            ? "بطاقة عمل ذكية واحدة لكل لقاءاتك واجتماعاتك"
            : "One Touch. Zero Paper. Instant Contact Sync via WhatsApp"}
        </h2>
        <p className="mt-3 text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
          {isAr
            ? "احفظ جهات الاتصال بضغطة زر واحدة (.vcf)، افتح محادثة واتساب فورية، وشارك بطاقتك عبر Apple Wallet و Google Wallet."
            : "Share contact details (.vcf), start direct WhatsApp conversations, and add to Apple or Google Wallet with a single NFC tap."}
        </p>

        {/* Dual-Sided Interactive Card */}
        <div className="mt-10 flex flex-col items-center">
          <div
            onClick={() => setFlipped(!flipped)}
            className="w-full max-w-sm h-56 rounded-3xl p-6 border border-border shadow-2xl cursor-pointer relative overflow-hidden transition-all duration-500 hover:scale-[1.02] bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white flex flex-col justify-between text-start"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            {!flipped ? (
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-400 font-bold">
                      FIZMOH DIGITAL PASS
                    </span>
                    <h4 className="text-lg font-bold mt-1 text-white">Nick Sharma</h4>
                    <p className="text-xs text-slate-300">Co-Founder & CEO · Fizmoh Cloud</p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-bold text-xs text-white">
                    NFC
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-[11px] text-slate-400 font-mono">+968 9831 4456</span>
                    <p className="text-[10px] text-emerald-400">Muscat, Sultanate of Oman</p>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-md">
                    {isAr ? "اضغط لقلب البطاقة" : "Click to flip"} ↻
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <QrCode className="h-16 w-16 text-emerald-400 mb-2" />
                <span className="text-xs font-mono text-slate-300">https://app.fizmoh.cloud/card/nick</span>
                <p className="text-[11px] text-slate-400 mt-1">{isAr ? "امسح بالكاميرا لحفظ جهة الاتصال فوراً" : "Scan with camera to save directly to iOS / Android"}</p>
              </div>
            )}
          </div>

          {/* Quick Action Preview */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/card/nick"
              target="_blank"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition"
            >
              <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
              {isAr ? "مشاهدة بطاقة نيك الحية" : "View Live vCard Example"} ↗
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
            >
              <Download className="h-3.5 w-3.5" />
              {isAr ? "أنشئ بطاقتك الشخصية الآن" : "Create Your Business vCard"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ========================================================================= */
/* 7. INSTAGRAM AUTOMATION SHOWCASE                                          */
/* ========================================================================= */
function InstagramAutomationShowcase({ isAr }: { isAr: boolean }) {
  const [scenario, setScenario] = useState<"story" | "reel">("story")
  const [triggered, setTriggered] = useState(false)

  const handleSimulate = (s: "story" | "reel") => {
    setScenario(s)
    setTriggered(true)
    setTimeout(() => setTriggered(false), 4000)
  }

  return (
    <section className="relative overflow-hidden border-b border-[var(--mk-line)] bg-gradient-to-b from-[var(--mk-surface)] via-[var(--mk-surface-2)] to-[var(--mk-surface)] px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/20 bg-pink-500/10 px-3.5 py-1 text-xs font-semibold text-pink-600 dark:text-pink-400 mb-3">
            <MessageCircle className="h-3.5 w-3.5" />
            {isAr ? "أتمتة إنستغرام الرسمية عبر Meta Graph API" : "Official Instagram DM & Story Automation"}
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-[var(--mk-ink)]">
            {isAr
              ? "حوّل تعليقات ريلز ومنشن الستوري إلى مبيعات فورية بالـ DM"
              : "Turn Reels Comments & Story Mentions into Instant Sales via DM"}
          </h2>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base">
            {isAr
              ? "رد تلقائي فوري خلال 3 ثوانٍ برابط الشراء أو كود الخصم عندما يعلق العميل بكلمة محددة أو يذكر حسابك في الستوري."
              : "Auto-reply in 3 seconds with payment links, vouchers, and product catalogs whenever followers comment or tag your brand."}
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-center">
          {/* Interactive Trigger Selector */}
          <div className="lg:col-span-6 space-y-4">
            <div
              onClick={() => handleSimulate("story")}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                scenario === "story"
                  ? "border-pink-500/50 bg-pink-500/10 shadow-lg"
                  : "border-border bg-card hover:border-pink-500/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-pink-600 uppercase tracking-wider">
                  {isAr ? "مُشغّل 1: منشن الستوري (Story Mention)" : "Trigger 1: Story Mention Auto-Reply"}
                </span>
                <span className="text-xs font-mono text-muted-foreground">3s delay</span>
              </div>
              <h4 className="font-semibold text-sm mb-1">
                {isAr ? "العميل يذكر علامتك في ستوري إنستغرام" : "Customer tags @yourbrand in their Story"}
              </h4>
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? "إرسال رسالة شكر خاصة فورية في الـ DM مع كوبون خصم حصري."
                  : "Sends a personalized direct message thanking them + 15% VIP discount code."}
              </p>
            </div>

            <div
              onClick={() => handleSimulate("reel")}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                scenario === "reel"
                  ? "border-pink-500/50 bg-pink-500/10 shadow-lg"
                  : "border-border bg-card hover:border-pink-500/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-pink-600 uppercase tracking-wider">
                  {isAr ? "مُشغّل 2: تعليقات الريلز (Reels Comment-to-DM)" : "Trigger 2: Comment Keyword to DM"}
                </span>
                <span className="text-xs font-mono text-muted-foreground">Instant</span>
              </div>
              <h4 className="font-semibold text-sm mb-1">
                {isAr ? "العميل يعلق بكلمة 'السعر' أو 'رابط'" : "Follower comments 'PRICE' or 'LINK'"}
              </h4>
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? "إرسال رابط المنتج مباشرة في الخاص مع إعجاب تلقائي على تعليقه."
                  : "Instantly sends product catalog & AmwalPay checkout URL to their DMs."}
              </p>
            </div>
          </div>

          {/* Instagram Phone Mockup */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-sm rounded-[2.5rem] border-4 border-slate-900 bg-slate-950 p-4 text-white shadow-2xl relative">
              <div className="h-6 w-32 bg-slate-900 rounded-full mx-auto mb-4" />

              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center font-bold text-xs">
                    FZ
                  </div>
                  <div>
                    <h5 className="font-bold text-xs">fizmoh.official</h5>
                    <span className="text-[10px] text-slate-400">Active Now</span>
                  </div>
                </div>
                <span className="text-xs text-pink-400 font-mono">Meta Verified</span>
              </div>

              {/* Chat View */}
              <div className="py-6 space-y-3 min-h-[220px]">
                {scenario === "story" ? (
                  <>
                    <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-slate-800 p-3 text-xs text-slate-200">
                      <span className="text-[10px] text-pink-400 font-semibold block mb-1">
                        {isAr ? "رد على قصتك:" : "Replied to your story:"}
                      </span>
                      {isAr
                        ? "شكراً لمشاركتك معنا! 🎉 إليك كود خصم 15% حصري: OMAN15"
                        : "Thank you for tagging us! 🎉 Here is your exclusive 15% voucher: OMAN15"}
                    </div>
                    {triggered && (
                      <div className="max-w-[75%] ms-auto rounded-2xl rounded-tr-sm bg-gradient-to-r from-pink-600 to-purple-600 p-3 text-xs text-white animate-in slide-in-from-bottom-2">
                        {isAr ? "شكراً جزيلاً! جاري استخدامه الآن 😍" : "Thank you so much! Ordering now 😍"}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-slate-800 p-3 text-xs text-slate-200">
                      {isAr
                        ? "أهلاً بك! وصلتنا رسالتك بخصوص ريلز العباية الحريرية. تفضل رابط الشراء بالريال العماني:"
                        : "Salam! You commented on our Omani Halwa Reel. Here is your direct order link with free Muscat delivery:"}
                      <div className="mt-2 p-2 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-pink-400">
                        https://app.fizmoh.cloud/menu/order
                      </div>
                    </div>
                    {triggered && (
                      <div className="max-w-[75%] ms-auto rounded-2xl rounded-tr-sm bg-gradient-to-r from-pink-600 to-purple-600 p-3 text-xs text-white animate-in slide-in-from-bottom-2">
                        {isAr ? "تم الدفع عبر أبل باي، شكراً لكم!" : "Paid with Apple Pay, thanks!"}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 text-center">
                <span className="text-[10px] text-slate-400">
                  {isAr ? "رد تلقائي ذكي عبر خوادم فزموه الآمنة" : "Automated response via Fizmoh Cloud Engine"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ========================================================================= */
/* 8. FACEBOOK AUTOMATION SHOWCASE                                           */
/* ========================================================================= */
function FacebookAutomationShowcase({ isAr }: { isAr: boolean }) {
  const [adClicked, setAdClicked] = useState(false)

  return (
    <section className="relative overflow-hidden border-b border-[var(--mk-line)] bg-gradient-to-b from-[var(--mk-surface-2)] to-[var(--mk-surface)] px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-3">
            <MessageSquare className="h-3.5 w-3.5" />
            {isAr ? "إعلانات Click-to-WhatsApp ومسنجر فيسبوك" : "Meta Click-to-WhatsApp & Messenger Ad Funnel"}
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-[var(--mk-ink)]">
            {isAr
              ? "حوّل نقرات إعلانات فيسبوك مباشرة إلى محادثات واتساب مبيعات"
              : "Capture Paid Facebook Ad Traffic Directly into WhatsApp"}
          </h2>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base">
            {isAr
              ? "بدون الحاجة لصفحات هبوط معقدة. يضغط العميل على الإعلان، وتفتح محادثة واتساب موثقة فورية لحجز موعد أو إتمام شراء."
              : "Skip drop-off landing pages. Prospects tap your Facebook ad and land straight in a WhatsApp conversation with verified lead attribution."}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Simulated Facebook Feed Ad */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
                f
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">
                  {isAr ? "عقارات مسقط الفاخرة · ممول" : "Muscat Luxury Real Estate · Sponsored"}
                </h4>
                <span className="text-xs text-muted-foreground">Facebook Feed Ad · Oman</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              {isAr
                ? "فلل شاطئية حصرية في الموج مسقط بخطة سداد مرنة. اضغط وتحدث مع مستشارنا العقاري الآن عبر واتساب."
                : "Exclusive waterfront villas at Al Mouj Muscat with flexible 5-year payment plans. Chat with our licensed advisor on WhatsApp."}
            </p>

            <div className="rounded-2xl overflow-hidden border border-border/60 bg-muted/40 p-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[11px] text-muted-foreground uppercase font-mono">WHATSAPP.COM</span>
                  <h5 className="font-bold text-sm text-foreground">
                    {isAr ? "استلم بروشور الفلل وخطة الأسعار" : "Download Villa Brochure & Floorplans"}
                  </h5>
                </div>
                <button
                  onClick={() => setAdClicked(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer transition shadow-sm"
                >
                  {isAr ? "إرسال رسالة واتساب" : "Send WhatsApp"}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              {isAr ? "تتبع فوري لمصدر الحملة (UTM / Ad ID Attribution)" : "Full UTM & Meta Ad ID attribution synced to CRM"}
            </p>
          </div>

          {/* Instant Lead Ingestion State */}
          <div className="rounded-3xl border border-blue-500/30 bg-blue-500/5 p-6 sm:p-8 shadow-xl">
            <h4 className="font-bold text-base text-foreground mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              {isAr ? "ماذا يحدث عند النقر على الإعلان؟" : "Zero-Drop Lead Ingestion Workflow"}
            </h4>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-blue-500/20 bg-background text-xs">
                <span className="font-bold text-blue-600 block mb-1">
                  {isAr ? "1. التقاط رقم الهاتف الحقيقي تلقائياً" : "1. Instant Verified Phone Capture"}
                </span>
                <p className="text-muted-foreground">
                  {isAr
                    ? "لا حاجة لملء نماذج طويلة قد يضع فيها العميل أرقاماً وهمية؛ تحصل على رقم واتساب الرسمي الموثق فوراً."
                    : "No fake forms. You receive the prospect's real, verified WhatsApp number upon conversation open."}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-blue-500/20 bg-background text-xs">
                <span className="font-bold text-blue-600 block mb-1">
                  {isAr ? "2. إرسال الكتالوج وحجز الموعد آلياً" : "2. Automated Qualification & Booking"}
                </span>
                <p className="text-muted-foreground">
                  {isAr
                    ? "يرسل البوت بروشور الـ PDF ويسأل عن الميزانية وتفضيلات الموقع، ثم يحجز موعد زيارة للموقع."
                    : "The bot sends the brochure PDF, qualifies purchase budget, and schedules an in-person site tour."}
                </p>
              </div>
            </div>

            {adClicked ? (
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold text-center animate-in fade-in">
                {isAr ? "تم محاكاة النقر: تم إنشاء المحادثة وتعيينها للموظف المسؤول ✓" : "Simulation Active: Lead Created & Routed to Team Inbox ✓"}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ========================================================================= */
/* 9. UNIFIED META SUITE SHOWCASE                                            */
/* ========================================================================= */
function UnifiedSocialShowcase({ isAr }: { isAr: boolean }) {
  return (
    <section className="relative overflow-hidden border-b border-[var(--mk-line)] bg-gradient-to-b from-[var(--mk-surface-2)] to-[var(--mk-surface)] px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-5xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-3">
          <Layers className="h-3.5 w-3.5" />
          {isAr ? "منظومة ميتا الشاملة الموحدة" : "Unified Meta Omnichannel Suite"}
        </div>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-[var(--mk-ink)]">
          {isAr
            ? "واتساب، إنستغرام، وفيسبوك مسنجر في صندوق وارد موحد واحد"
            : "WhatsApp, Instagram & Facebook Unified in One Intelligent Workspace"}
        </h2>
        <p className="mt-3 text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
          {isAr
            ? "توقف عن التنقل بين 3 تطبيقات منفصلة. كل استفسارات الزبائن، والطلبات، والرسائل الخاصة تأتي إلى لوحة تحكم واحدة يديرها فريقك بالكامل."
            : "Stop jumping across apps. Manage customer enquiries, orders, and DM handoffs from a centralized team inbox."}
        </p>

        <div className="mt-10 grid sm:grid-cols-3 gap-6 text-start">
          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm hover:border-emerald-500/40 transition">
            <MessageCircle className="h-6 w-6 text-emerald-600 mb-3" />
            <h4 className="font-bold text-base mb-1">{isAr ? "واتساب بزنس كلاود" : "WhatsApp Business API"}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isAr
                ? "رسائل موثقة، قوالب معتمدة، ونسبة فتح تصل إلى 98% مع تحصيل أموال بالريال العماني."
                : "Official Green Tick verification, high-deliverability broadcast templates, and native OMR checkout."}
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm hover:border-pink-500/40 transition">
            <MessageSquare className="h-6 w-6 text-pink-600 mb-3" />
            <h4 className="font-bold text-base mb-1">{isAr ? "أتمتة إنستغرام" : "Instagram DM Studio"}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isAr
                ? "الرد الآلي على منشن القصص (Stories) وتعليقات الريلز بكلمات مفتاحية فورية."
                : "Convert story mentions and viral reel comments into sales pipelines within 3 seconds."}
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm hover:border-blue-500/40 transition">
            <Bot className="h-6 w-6 text-blue-600 mb-3" />
            <h4 className="font-bold text-base mb-1">{isAr ? "فيسبوك مسنجر" : "Facebook Messenger & Ads"}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isAr
                ? "التقاط فوري لجمهور الإعلانات الممولة بدون تسرب الزبائن في صفحات الهبوط."
                : "Direct-to-chat ad funnels with automated lead qualification and appointment scheduling."}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
