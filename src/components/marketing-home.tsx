"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { WhatsAppDemo } from "@/components/whatsapp-demo"
import { SiteFooter, SiteHeader } from "@/components/site-header"
import { useLanguage } from "@/context/language-context"
import {
  Smartphone, Download, Laptop, Monitor,
  ArrowRight,
  Bot,
  Workflow,
  BarChart3,
  Inbox,
  ShieldCheck,
  Megaphone,
  ShoppingBag,
  Utensils,
  Headset,
  Sparkles,
  CheckCircle2,
  Globe,
  CreditCard,
  CalendarClock,
  Building2,
  Stethoscope,
  Compass,
  Zap,
  Check,
  Video,
  ChevronRight,
  Scissors,
  Coffee,
  Shirt,
  Store,
  Quote,
  Star,
  TrendingUp,
  Lock,
  MessageSquare,
  ArrowUpRight,
  Phone,
  Mail,
  MapPin,
  QrCode,
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { Reveal } from "@/components/motion-primitives"
import { HeroSlider } from "@/components/hero-slider"
import { LogoMarquee } from "@/components/logo-marquee"
import { ClientLogos } from "@/components/client-logos"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function MarketingHome() {
  const { lang, isAr } = useLanguage()
  const [activeDemo, setActiveDemo] = useState<"david" | "farida" | "aisha">("farida")

  const industries = [
    { icon: Utensils, titleEn: "Restaurants & Cafes", titleAr: "المطاعم والكافيهات", descEn: "QR menus, table booking & kitchen routing", descAr: "منيو باركود وحجز طاولات وتوجيه للمطبخ", href: "/solutions/restaurants-dining" },
    { icon: ShoppingBag, titleEn: "Ecommerce & Retail", titleAr: "التجارة الإلكترونية والتجزئة", descEn: "WooCommerce sync & abandoned cart recovery", descAr: "مزامنة ووكومرس واسترجاع السلات المتروكة", href: "/solutions/ecommerce-online-stores" },
    { icon: Stethoscope, titleEn: "Clinics & Healthcare", titleAr: "العيادات والمستشفيات", descEn: "Doctor appointments & oncology bed mapping", descAr: "مواعيد الأطباء وخرائط أسرة الرعاية", href: "/solutions/clinics-hospitals-health" },
    { icon: Compass, titleEn: "Tours & Safari", titleAr: "السياحة والجولات والسفاري", descEn: "Seat availability & AmwalPay checkout", descAr: "تتبع المقاعد ودفع إلكتروني بأموال باي", href: "/solutions/tours-safari-musandam" },
    { icon: Scissors, titleEn: "Salons & Spas", titleAr: "الصالونات ومراكز التجميل", descEn: "24/7 self-service slot booking & reminders", descAr: "حجز ذاتي 24/7 وتذكيرات آلية للعملاء", href: "/solutions/salons-beauty-spas" },
    { icon: Shirt, titleEn: "Fashion & Apparel", titleAr: "الأزياء والملابس", descEn: "In-chat catalog browsing & instant checkout", descAr: "تصفح الكتالوج والشراء الفوري داخل الشات", href: "/solutions/fashion-perfumes-retail" },
    { icon: Store, titleEn: "Grocer & Butcher", titleAr: "البقالة والملاحم", descEn: "List orders & fast local delivery dispatch", descAr: "طلبات القوائم والتوصيل المحلي السريع", href: "/solutions/supermarkets-marts" },
    { icon: Building2, titleEn: "Agencies & SaaS", titleAr: "الوكالات ومزودو الخدمات", descEn: "Multi-tenant workspaces for client management", descAr: "مساحات عمل متعددة لإدارة حسابات العملاء", href: "/features" },
  ]

  const features = [
    {
      icon: Inbox,
      titleEn: "Multi-Agent Team Inbox",
      titleAr: "صندوق وارد متعدد الموظفين",
      descEn: "Manage hundreds of WhatsApp conversations across your team with smart routing, 24h SLA timers, internal notes, and human handover.",
      descAr: "أدر مئات المحادثات عبر فريقك مع توزيع ذكي وتتبع نافذة 24 ساعة وملاحظات داخلية وتحويل سلس بين الموظفين.",
      href: "/product/team-inbox",
    },
    {
      icon: Bot,
      titleEn: "Visual No-Code Botflow Studio",
      titleAr: "منشئ مسارات البوت المرئي",
      descEn: "Design interactive conversation flows with drag-and-drop nodes, AI knowledge-base fallback, and Gulf Arabic dialect understanding.",
      descAr: "أنشئ مسارات محادثة تفاعلية بسحب وإفلات مع ذكاء اصطناعي يفهم اللهجات الخليجية بدقة فائقة.",
      href: "/product/botflow-studio",
    },
    {
      icon: Megaphone,
      titleEn: "Broadcast Marketing Campaigns",
      titleAr: "حملات البث والرسائل الترويجية",
      descEn: "Deploy targeted promotions to segmented audiences using Meta-approved templates. WhatsApp is opened far more than email (commonly cited around 90-98%), with click attribution and rate pacing built in.",
      descAr: "أرسل رسائل ترويجية مستهدفة بقوالب معتمدة من Meta؛ يُفتح واتساب أكثر بكثير من البريد (يُذكر عادة نحو 90-98%) مع قياس دقيق للنقرات ومعدلات التحويل.",
      href: "/product/broadcast-campaigns",
    },
    {
      icon: CreditCard,
      titleEn: "AmwalPay Card Payments",
      titleAr: "مدفوعات بطاقات أموال باي (OMR)",
      descEn: "Generate hosted checkout links in Omani Rial (OMR), accept debit and credit cards, and auto-issue PDF invoices on verified payment.",
      descAr: "روابط دفع بالريال العماني وقبول البطاقات البنكية مع إصدار فواتير إلكترونية وتحديث فوري لحالة الطلب.",
      href: "/product/payments",
    },
    {
      icon: Utensils,
      titleEn: "Smart Menu & QR Dining",
      titleAr: "المنيو الذكي ونظام طلبات المطاعم",
      descEn: "Interactive QR dining, live Kitchen Display System (KDS), waiter paging, and GPT-4o AI menu scanning from PDF or photos.",
      descAr: "قوائم QR تفاعلية، شاشة مطبخ حية (KDS)، استدعاء النادل، ومسح المنيو بالذكاء الاصطناعي من ملفات PDF والصور.",
      href: "/product/smart-menu-ordering",
    },
    {
      icon: Smartphone,
      titleEn: "Smart Digital Business Cards",
      titleAr: "بطاقات الأعمال الرقمية الذكية",
      descEn: "10+ executive themes, video covers, dynamic QR codes, and 1-tap phone contact synchronization via RFC 6350 vCard.",
      descAr: "أكثر من 10 تصاميم تنفيذية، أغلفة فيديو متحركة، وحفظ فوري لجهات الاتصال بنقرة واحدة بدون الحاجة لتطبيقات.",
      href: "/product/digital-vcard",
    },
    {
      icon: QrCode,
      titleEn: "Digital QR Reviews & Google Auto-Reply",
      titleAr: "مراجعات QR الرقمية والرد على جوجل",
      descEn: "AI-designed branded QR stands, 5-star customer review funnels, and automated AI reply engine to Google Business Profile reviews.",
      descAr: "لافتات QR مصممة بالذكاء الاصطناعي، ومسار تقييمات 5 نجوم، وردود ذكية تلقائية على مراجعات نشاطك في جوجل.",
      href: "/product/digital-qr-reviews",
    },
    {
      icon: CalendarClock,
      titleEn: "Appointments & Bed Booking",
      titleAr: "نظام حجز المواعيد والأسرة",
      descEn: "Live slot availability, specialist selection, Google Calendar sync, automated WhatsApp reminders, and oncology day-care bed maps.",
      descAr: "توافر مواعيد مباشر ومزامنة مع جوجل كالندر وتذكيرات آلية وجداول أسرة الرعاية الطبية.",
      href: "/solutions/clinics-hospitals-health",
    },
    {
      icon: ShoppingBag,
      titleEn: "Conversational Commerce",
      titleAr: "التجارة التحادثية المتكاملة",
      descEn: "Two-way WooCommerce sync, native in-chat product catalog, cart management, and 30-minute abandoned cart recovery sequences.",
      descAr: "مزامنة ووكومرس ثنائية وكتالوج داخل الشات واسترجاع السلات المتروكة آلياً بنسبة استرداد تتجاوز 35%.",
      href: "/solutions/ecommerce-online-stores",
    },
  ]

  const steps = [
    {
      num: "01",
      titleEn: "Connect Your Number",
      titleAr: "اربط رقمك الرسمي",
      descEn: "Link your existing business number to Meta's official WhatsApp Cloud API in under 60 seconds. No extra hardware, no new SIM required.",
      descAr: "اربط رقمك التجاري الحالي بـ WhatsApp Cloud API في أقل من 60 ثانية بدون أي تعقيدات تقنية.",
    },
    {
      num: "02",
      titleEn: "Build Your Flows",
      titleAr: "ابنِ مساراتك التشغيلية",
      descEn: "Use the visual botflow studio or pick from 25+ industry templates. Set up your team inbox, campaigns, and payment checkout in one workspace.",
      descAr: "استخدم منشئ البوت المرئي أو اختر من 25+ قالباً جاهزاً. أعدّ صندوق الوارد والحملات والمدفوعات في مساحة عمل واحدة.",
    },
    {
      num: "03",
      titleEn: "Launch & Collect Revenue",
      titleAr: "أطلق واجمع الإيرادات",
      descEn: "Go live with campaigns, chatbots, and payment links. Monitor performance in the dashboard and scale without limits.",
      descAr: "أطلق الحملات والبوت وروابط الدفع. راقب الأداء من لوحة التحكم وقم بالتوسع والنمو بلا حدود.",
    },
  ]

  const testimonials = [
    {
      quote: isAr
        ? "«أتمتة حجز رحلات السفاري بالكامل مع تحصيل المدفوعات عبر أموال باي فورياً. لا حاجة لأي مكالمة هاتفية بعد الآن.»"
        : "“Fizmoh automated our entire desert safari reservation flow with instant AmwalPay checkout. Zero phone calls needed.”",
      nameEn: "Salim Al-Harthy",
      nameAr: "سالم الحارثي",
      roleEn: "COO, Muscat Safaris",
      roleAr: "مدير العمليات، مغامرات مسقط",
      initial: "S",
    },
    {
      quote: isAr
        ? "«خفّض صندوق الوارد المشترك لـ 12 موظفاً وقت استجابة المرضى من ساعة إلى 45 ثانية مع تذكيرات المواعيد الآلية.»"
        : "“The shared team inbox slashed patient response time from 1 hour to 45 seconds. The automated reminders nearly eliminated no-shows.”",
      nameEn: "Dr. Mona Al-Balushi",
      nameAr: "د. منى البلوشي",
      roleEn: "Medical Director, Al-Enaya Clinic",
      roleAr: "المدير الطبي، مركز العناية",
      initial: "M",
    },
    {
      quote: isAr
        ? "«استرجعنا أكثر من 35% من سلات الشراء المتروكة على ووكومرس عبر رسائل واتساب الآلية خلال أول أسبوعين فقط.»"
        : "“Recovered 35% of abandoned WooCommerce carts in the first two weeks using the 30-minute WhatsApp trigger sequence.”",
      nameEn: "Tariq Al-Saadi",
      nameAr: "طارق السعدي",
      roleEn: "Head of E-Commerce",
      roleAr: "رئيس التجارة الإلكترونية",
      initial: "T",
    },
  ]

  const faqs = [
    {
      q: isAr ? "كيف يمكنني تشغيل عملي بالكامل عبر واتساب؟" : "How do I run a full business on WhatsApp?",
      a: isAr
        ? "تتيح منصة Fizmoh ربط رقم رسمي بـ WhatsApp Cloud API، وإنشاء شات بوت ذكي، وتعيين فريق المبيعات في صندوق وارد مشترك، وعرض المنتجات، وتحصيل المدفوعات عبر أموال باي."
        : "Fizmoh connects your number to the official WhatsApp Cloud API, gives you a 24/7 AI chatbot, a shared team inbox, native product catalog, and AmwalPay card checkout — so you can capture leads, book appointments, and collect revenue entirely within WhatsApp.",
    },
    {
      q: isAr ? "كيف أرسل رسائل جماعية دون حظر الرقم؟" : "How do I send bulk WhatsApp messages without getting banned?",
      a: isAr
        ? "يتم إرسال الحملات عبر واجهة WhatsApp Business API الرسمية بقوالب معتمدة من Meta للعملاء المشتركين بموافقتهم المسبقة. تضمن Fizmoh تطبيق نظام إدارة معدلات الإرسال التلقائي لحماية جودة الرقم."
        : "All broadcast messages route through the official WhatsApp Cloud API using Meta-approved templates sent to opted-in contacts only. Fizmoh enforces automated rate-throttling to protect your phone number quality rating.",
    },
    {
      q: isAr ? "كيف أقبل المدفوعات ببطاقات البنك عبر واتساب؟" : "How do I accept card payments on WhatsApp in Oman & GCC?",
      a: isAr
        ? "تتكامل Fizmoh مع بوابة الدفع أموال باي العمانية. يُنشئ النظام رابط دفع بالريال العماني، وعند السداد يتم تأكيد الطلب وإصدار الفاتورة آلياً."
        : "Fizmoh integrates directly with AmwalPay. Insert payment nodes in your botflows or generate one-click payment links from the inbox. Customers pay in OMR and orders update to PAID automatically via signed webhook.",
    },
    {
      q: isAr ? "كيف أبني شات بوت بدون كتابة كود؟" : "How do I build a WhatsApp chatbot without coding?",
      a: isAr
        ? "من خلال منشئ البوت المرئي يمكنك سحب وإفلات العقد، وتفعيل الذكاء الاصطناعي للإجابة على الأسئلة الشائعة، واختبار كل خطوة في المحاكي المباشر."
        : "Use the visual canvas to drag and drop message nodes, quick reply buttons, and decision branches. Connect generative AI to your custom knowledge base to answer inquiries in Arabic and English automatically.",
    },
    {
      q: isAr ? "ما هو نموذج تسعير واتساب Cloud API؟" : "What is the pricing model for WhatsApp Cloud API?",
      a: isAr
        ? "تفرض Meta رسوماً لكل محادثة (نافذة 24 ساعة) حسب التصنيف (تسويق، خدمات، فائدة). توفر Fizmoh باقات اشتراك شهرية وسنوية واضحة بدون هوامش إضافية على رسوم Meta."
        : "Meta charges per 24-hour conversation window based on category (Marketing, Utility, Service, Authentication). Fizmoh provides flat platform subscriptions with full tool access and zero hidden markups on Meta conversation fees.",
    },
  ]

  return (
    <div className={`marketing min-h-screen bg-[var(--mk-surface)] text-[var(--mk-ink)] ${isAr ? "rtl" : "ltr"}`} dir={isAr ? "rtl" : "ltr"}>
      <SiteHeader />

      <main>
        {/* ============================================================ */}
        {/* HERO */}
        {/* ============================================================ */}
        <section className="relative overflow-hidden border-b border-[var(--mk-line)] bg-[var(--mk-surface)] px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
          {/* Light, not imagery: two blurred blooms cost nothing to download
              and shift no layout, and they recolour with the tokens. */}
          <div className="mk-aurora" aria-hidden="true" />

          <div className="relative mx-auto max-w-7xl">
            <HeroSlider isAr={isAr} />
          </div>
        </section>

        {/* ============================================================ */}
        {/* TRUST / PARTNER BAR */}
        {/* ============================================================ */}
        <section className="border-b border-[var(--mk-line)] bg-[var(--mk-surface-2)] px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <p className="mb-4 text-center text-[11.5px] font-bold uppercase tracking-widest text-[var(--mk-muted)]">
              {isAr ? "معتمدون ومتكاملون مع" : "Certified & integrated with"}
            </p>
            <LogoMarquee />
          </div>
        </section>

        <ClientLogos />

        {/* ============================================================ */}
        {/* 6 CORE FEATURE BENTO CARDS */}
        {/* ============================================================ */}
        <section className="border-b border-[var(--mk-line)] px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl space-y-12">
            <div className="max-w-2xl space-y-3">
              <p className="text-[12px] font-extrabold uppercase tracking-widest text-[var(--mk-green-deep)]">
                {isAr ? "القدرات الأساسية" : "Core Capabilities"}
              </p>
              <h2 className="mk-display text-[38px] leading-tight tracking-tight text-[var(--mk-ink)] sm:text-[46px]">
                {isAr
                  ? "كل ما تحتاجه لإدارة\nعمليات واتساب"
                  : "Everything you need to run\nWhatsApp operations"}
              </h2>
              <p className="text-[17.5px] leading-relaxed text-[var(--mk-ink-soft)]">
                {isAr
                  ? "صندوق وارد مشترك، بوت ذكاء اصطناعي، مدفوعات، وحجوزات — في منصة واحدة متكاملة."
                  : "Shared team inbox, AI chatbot flows, payment checkout, and appointments — built into one unified platform."}
              </p>
            </div>

            <Reveal className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <Link key={i} href={f.href} className="group block h-full cursor-pointer">
                  <div className="relative flex h-full flex-col justify-between gap-6 rounded-2xl border border-stone-200/80 bg-white/95 p-7 transition-all duration-300 hover:border-emerald-500/40 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.12)] hover:-translate-y-1 backdrop-blur-sm">
                    <div className="space-y-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 transition-all duration-300 group-hover:bg-emerald-600 group-hover:border-emerald-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-emerald-500/30">
                        <f.icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-[20px] font-bold tracking-tight text-[var(--mk-ink)] group-hover:text-emerald-950 transition-colors">
                        {isAr ? f.titleAr : f.titleEn}
                      </h3>
                      <p className="text-[15px] leading-relaxed text-[var(--mk-muted)]">
                        {isAr ? f.descAr : f.descEn}
                      </p>
                    </div>
                    <span className="flex items-center gap-1.5 text-[13.5px] font-bold text-emerald-700 group-hover:text-emerald-900 group-hover:gap-2.5 transition-all">
                      {isAr ? "اكتشف المزيد" : "Learn more"}
                      <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
                    </span>
                  </div>
                </Link>
              ))}
            </Reveal>

            <div className="text-center">
              <Link href="/features">
                <Button variant="outline" className="h-11 rounded-[8px] border-2 border-[#111827] px-6 text-[14px] font-bold text-[var(--mk-ink)] hover:bg-[var(--mk-surface-2)]">
                  {isAr ? "استعراض جميع الميزات" : "Explore all features"}
                  <ArrowUpRight className={`ml-1.5 h-4 w-4 ${isAr ? "rotate-180 mr-1.5 ml-0" : ""}`} />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SPOTLIGHT: DIGITAL BUSINESS CARDS (VCARD 2.0) */}
        {/* ============================================================ */}
        <section className="relative overflow-hidden border-b border-[var(--mk-line)] bg-gradient-to-b from-[var(--mk-surface)] via-emerald-50/20 to-[var(--mk-surface-2)] px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl space-y-16">
            <div className="mx-auto max-w-3xl space-y-4 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                <span>{isAr ? "جديد · بطاقات العمل الرقمية الذكية" : "New Feature · Digital Business Cards"}</span>
              </div>
              <h2 className="mk-display text-[38px] leading-tight tracking-tight text-[var(--mk-ink)] sm:text-[48px]">
                {isAr ? "هويتك المهنية. بأسلوب راقٍ ومبتكر." : "Your Professional Identity. Elevated."}
              </h2>
              <p className="text-[17.5px] leading-relaxed text-[var(--mk-ink-soft)]">
                {isAr
                  ? "ودّع بطاقات العمل الورقية التقليدية. شارك هويتك المهنية عبر رمز QR الذكي، تقنية NFC بلمسة واحدة، أو واتساب في ثانية واحدة مع أغلفة فيديو تفاعلية، وقوالب تنفيذية فائقة الأناقة."
                  : "Say goodbye to disposable paper cards. Share your executive profile via smart QR code, 1-tap NFC, or WhatsApp in one second — featuring video covers, live WhatsApp chat leads, and 10+ handcrafted executive themes."}
              </p>
            </div>

            {/* Showcase Grid */}
            <div className="grid items-center gap-12 lg:grid-cols-12">
              {/* Left Column: 4 Core Pillars */}
              <div className="space-y-4 lg:col-span-5">
                {[
                  {
                    icon: Sparkles,
                    titleEn: "Smart vCards & 10+ Executive Themes",
                    titleAr: "بطاقات ذكية مع 10+ تصاميم تنفيذية",
                    descEn: "Stunning designs including Curve Emerald, Midnight Navy, Champagne Gold, Minimalist Monochrome, and Cyberpunk Neon tailored to your executive presence.",
                    descAr: "تصاميم راقية تشمل الزمرد المقوس، الكحلي الليلي، الذهبي الفاخر، والسايبربانك العصري لتعكس هويتك الاحترافية بأعلى جودة.",
                  },
                  {
                    icon: Smartphone,
                    titleEn: "Seamless Instant Sharing & NFC",
                    titleAr: "مشاركة فائقة السرعة ودعم NFC",
                    descEn: "1-tap .vcf contact save straight to Apple & Google Contacts, dynamic scannable QR codes, and frictionless NFC tap-to-share.",
                    descAr: "حفظ مباشر لجهات اتصال هواتف آبل وجوجل بملف vcf بنقرة واحدة، مع رموز QR تفاعلية ومشاركة NFC للمؤتمرات واللقاءات.",
                  },
                  {
                    icon: MessageSquare,
                    titleEn: "Real WhatsApp Connections & Video Covers",
                    titleAr: "تواصل مباشر عبر واتساب وأغلفة فيديو",
                    descEn: "One-click pre-filled WhatsApp chat triggers, looping MP4 hero video banners, direct calling, and integrated Google Maps navigation.",
                    descAr: "بدء محادثة واتساب فورية مع رسائل جاهزة، وخلفيات فيديو MP4 متحركة، واتصال مباشر وخرائط جوجل لموقع مكتبك.",
                  },
                  {
                    icon: BarChart3,
                    titleEn: "Endless Possibilities & Lead Analytics",
                    titleAr: "إمكانيات غير محدودة وتحليلات للزيارات",
                    descEn: "Square service portfolios, client testimonials, embedded social badges, custom URL tiles, and real-time view tracking.",
                    descAr: "معارض خدمات مربّعة، شهادات عملاء، أيقونات شبكات تواصل اجتماعي مخصصة، وإحصائيات مباشرة لعدد الزيارات والتفاعلات.",
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4 rounded-xl border border-[var(--mk-line)] bg-white p-4.5 shadow-sm transition hover:border-emerald-600">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-[16px] font-bold text-[var(--mk-ink)]">{isAr ? item.titleAr : item.titleEn}</h3>
                      <p className="text-[14px] leading-relaxed text-[var(--mk-muted)]">{isAr ? item.descAr : item.descEn}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Column: Interactive CSS Smartphone Showcase */}
              <div className="flex flex-col items-center space-y-6 lg:col-span-7">
                {/* Device Selector Tabs */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white/90 p-1.5 shadow-sm backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={() => setActiveDemo("david")}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                      activeDemo === "david"
                        ? "bg-emerald-700 text-white shadow-md"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>David Okello</span>
                    <span className="hidden sm:inline text-[10px] opacity-80">(Emerald)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDemo("farida")}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                      activeDemo === "farida"
                        ? "bg-slate-900 text-amber-300 shadow-md ring-1 ring-amber-500/50"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <span>Farida Mwaniki</span>
                    <span className="hidden sm:inline text-[10px] opacity-80">(Navy)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDemo("aisha")}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                      activeDemo === "aisha"
                        ? "bg-[#b45309] text-white shadow-md"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-amber-300" />
                    <span>Aisha Abdullahi</span>
                    <span className="hidden sm:inline text-[10px] opacity-80">(Gold)</span>
                  </button>
                </div>

                {/* Smartphone Device Frame */}
                <div className="relative w-full max-w-[390px] rounded-[48px] border-[10px] border-zinc-950 bg-zinc-950 p-2.5 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.8)] ring-1 ring-white/15 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-tr before:from-transparent before:via-white/[0.05] before:to-transparent before:pointer-events-none before:z-20">
                  {/* Speaker Island Notch */}
                  <div className="absolute left-1/2 top-4 z-30 h-5 w-28 -translate-x-1/2 rounded-full bg-black flex items-center justify-between px-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-zinc-900 ring-1 ring-zinc-800" />
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>

                  {/* Device Screen */}
                  <div className="relative overflow-hidden rounded-[36px] bg-white min-h-[540px] text-left select-none pt-7 flex flex-col justify-between">
                    {/* Demo 1: David Okello (Curve Emerald) */}
                    {activeDemo === "david" && (
                      <div className="flex flex-col h-full bg-white text-slate-900 transition-all duration-300">
                        {/* Emerald Curve Header */}
                        <div className="relative h-28 bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-900 px-5 pt-3 pb-8 text-white rounded-b-[32px] shadow-sm">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-200">
                            <span>Jjuma Global Ltd</span>
                            <span className="rounded-full bg-emerald-600/60 px-2 py-0.5 text-[10px]">Lagos, NG</span>
                          </div>
                          {/* Floating Avatar */}
                          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-emerald-800 to-emerald-950 text-xl font-black text-emerald-100 shadow-lg">
                              DO
                            </div>
                          </div>
                        </div>

                        {/* Card Identity Details */}
                        <div className="mt-10 px-5 text-center space-y-1">
                          <div className="flex items-center justify-center gap-1.5">
                            <h3 className="text-lg font-black tracking-tight text-slate-900">David Okello</h3>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 fill-emerald-100" />
                          </div>
                          <p className="text-xs font-bold text-emerald-800">Business Development Director</p>
                          <p className="text-[11px] text-slate-500">Jjuma Global Ltd</p>
                        </div>

                        {/* Bio / Tagline */}
                        <div className="mx-4 mt-3 rounded-xl bg-emerald-50/70 p-2.5 text-center border border-emerald-100">
                          <p className="text-[11px] italic leading-relaxed text-emerald-950">
                            “Driving strategic corporate expansion, sustainable partnerships, and enterprise market development.”
                          </p>
                        </div>

                        {/* Quick Action Buttons (100% SVG Vectors) */}
                        <div className="mt-3 grid grid-cols-4 gap-2 px-4">
                          {[
                            { label: "Call", icon: Phone, color: "bg-emerald-600 text-white" },
                            { label: "WhatsApp", icon: WhatsAppIcon, color: "bg-[#25D366] text-white" },
                            { label: "Email", icon: Mail, color: "bg-slate-800 text-white" },
                            { label: "Directions", icon: MapPin, color: "bg-emerald-100 text-emerald-900" },
                          ].map((btn, i) => (
                            <div key={i} className="flex flex-col items-center gap-1">
                              <div className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-xs transition-transform hover:scale-105 ${btn.color}`}>
                                <btn.icon className="h-4 w-4" />
                              </div>
                              <span className="text-[9.5px] font-semibold text-slate-600">{btn.label}</span>
                            </div>
                          ))}
                        </div>

                        {/* Corporate Tiles */}
                        <div className="mt-3 space-y-1.5 px-4">
                          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 text-xs font-semibold text-slate-800">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 text-emerald-700" />
                              <span>Jjuma Global Ltd</span>
                            </div>
                            <span className="text-[10px] text-slate-400">Company</span>
                          </div>
                          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 text-xs font-semibold text-slate-800">
                            <div className="flex items-center gap-2">
                              <Globe className="h-3.5 w-3.5 text-emerald-700" />
                              <span>www.jjumaglobal.com</span>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                          </div>
                        </div>

                        {/* 5 Popular Socials */}
                        <div className="mt-3 flex items-center justify-center gap-2 py-1">
                          {[
                            { name: "W", color: "text-[#25D366] border-[#25D366]/40" },
                            { name: "IG", color: "text-[#E1306C] border-[#E1306C]/40" },
                            { name: "in", color: "text-[#0A66C2] border-[#0A66C2]/40" },
                            { name: "𝕏", color: "text-slate-900 border-slate-400" },
                            { name: "f", color: "text-[#1877F2] border-[#1877F2]/40" },
                          ].map((s, i) => (
                            <div key={i} className={`h-7 w-7 rounded-full bg-slate-50 border flex items-center justify-center text-[10px] font-bold ${s.color}`}>
                              {s.name}
                            </div>
                          ))}
                        </div>

                        {/* Save Contact CTA */}
                        <div className="mt-auto px-4 pb-4 pt-2">
                          <Link
                            href="/card/david-okello"
                            target="_blank"
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-800 cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Save Contact (.VCF)</span>
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Demo 2: Farida Mwaniki (Midnight Navy) */}
                    {activeDemo === "farida" && (
                      <div className="flex flex-col h-full bg-[#0b1120] text-white transition-all duration-300">
                        {/* Navy Header Accent */}
                        <div className="relative h-24 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-5 pt-3 pb-6 border-b border-amber-500/20 text-center">
                          <span className="inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-amber-400">
                            Executive Consultant
                          </span>
                          {/* Floating Avatar with Amber Halo */}
                          <div className="absolute -bottom-7 left-1/2 -translate-x-1/2">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-slate-900 to-indigo-950 text-xl font-black text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                              FM
                            </div>
                          </div>
                        </div>

                        {/* Card Identity Details */}
                        <div className="mt-9 px-5 text-center space-y-1">
                          <div className="flex items-center justify-center gap-1.5">
                            <h3 className="text-lg font-black tracking-tight text-white">Farida Mwaniki</h3>
                            <CheckCircle2 className="h-4 w-4 text-amber-400 fill-amber-950" />
                          </div>
                          <p className="text-xs font-bold text-amber-400">Brand Strategist & Consultant</p>
                          <p className="text-[11px] text-slate-400">Mwaniki Consulting · Nairobi, Kenya</p>
                        </div>

                        {/* Quote Box */}
                        <div className="mx-4 mt-3 rounded-xl border border-amber-500/20 bg-slate-900/90 p-2.5 text-center shadow-inner">
                          <p className="text-[11px] italic leading-relaxed text-slate-200">
                            “Building magnetic brand identities and positioning high-growth ventures to command authority.”
                          </p>
                        </div>

                        {/* High Contrast Action Pills (100% SVG Vectors) */}
                        <div className="mt-3 grid grid-cols-3 gap-2 px-4">
                          <div className="flex items-center justify-center gap-1.5 rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 py-2 text-xs font-bold text-[#25D366]">
                            <WhatsAppIcon className="h-3.5 w-3.5" />
                            <span>Chat</span>
                          </div>
                          <div className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 py-2 text-xs font-bold text-amber-300">
                            <Phone className="h-3.5 w-3.5" />
                            <span>Call</span>
                          </div>
                          <div className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 py-2 text-xs font-bold text-slate-200">
                            <Mail className="h-3.5 w-3.5" />
                            <span>Email</span>
                          </div>
                        </div>

                        {/* Corporate Identity Tiles */}
                        <div className="mt-3 space-y-1.5 px-4">
                          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-2.5 text-xs font-semibold text-slate-200">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 text-amber-400" />
                              <span>Mwaniki Consulting</span>
                            </div>
                            <span className="text-[10px] text-slate-500">Firm</span>
                          </div>
                          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-2.5 text-xs font-semibold text-slate-200">
                            <div className="flex items-center gap-2">
                              <Globe className="h-3.5 w-3.5 text-amber-400" />
                              <span className="truncate">mwanikiconsulting.co.ke</span>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                          </div>
                        </div>

                        {/* 5 Popular Socials */}
                        <div className="mt-3 flex items-center justify-center gap-2 py-1">
                          {[
                            { name: "W", color: "text-[#25D366] border-[#25D366]/40" },
                            { name: "IG", color: "text-[#E1306C] border-[#E1306C]/40" },
                            { name: "in", color: "text-[#0A66C2] border-[#0A66C2]/40" },
                            { name: "𝕏", color: "text-white border-slate-500" },
                            { name: "f", color: "text-[#1877F2] border-[#1877F2]/40" },
                          ].map((s, i) => (
                            <div key={i} className={`h-7 w-7 rounded-full bg-slate-900 border flex items-center justify-center text-[10px] font-bold ${s.color}`}>
                              {s.name}
                            </div>
                          ))}
                        </div>

                        {/* Save Contact CTA */}
                        <div className="mt-auto px-4 pb-4 pt-2">
                          <Link
                            href="/card/farida-mwaniki"
                            target="_blank"
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 text-xs font-bold text-slate-950 shadow-[0_4px_16px_rgba(245,158,11,0.3)] transition hover:brightness-110 cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Save Contact (.VCF)</span>
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Demo 3: Aisha Abdullahi (Champagne Gold) */}
                    {activeDemo === "aisha" && (
                      <div className="flex flex-col h-full bg-[#fbf8f3] text-stone-900 transition-all duration-300">
                        {/* Champagne Luxury Banner */}
                        <div className="relative h-24 bg-gradient-to-r from-[#efe5d5] via-[#f7f0e3] to-[#e8dcce] px-5 pt-3 pb-6 border-b border-[#d8c8b4] text-center">
                          <span className="inline-block rounded-full border border-[#b45309]/30 bg-white/60 px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[#b45309]">
                            People Development
                          </span>
                          {/* Floating Avatar with Gold Ring */}
                          <div className="absolute -bottom-7 left-1/2 -translate-x-1/2">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#b45309] bg-white text-xl font-black text-[#b45309] shadow-md">
                              AA
                            </div>
                          </div>
                        </div>

                        {/* Card Identity Details */}
                        <div className="mt-9 px-5 text-center space-y-1">
                          <div className="flex items-center justify-center gap-1.5">
                            <h3 className="text-lg font-black tracking-tight text-stone-900">Aisha Abdullahi</h3>
                            <CheckCircle2 className="h-4 w-4 text-[#b45309] fill-amber-100" />
                          </div>
                          <p className="text-xs font-bold text-[#b45309]">HR & People Development Expert</p>
                          <p className="text-[11px] text-stone-500">People First Consulting · Abuja, NG</p>
                        </div>

                        {/* Bio Box */}
                        <div className="mx-4 mt-3 rounded-xl border border-[#ebdcc8] bg-white p-2.5 text-center shadow-xs">
                          <p className="text-[11px] italic leading-relaxed text-stone-700">
                            “Empowering organizations to build high-performance cultures and cultivate future-ready leadership.”
                          </p>
                        </div>

                        {/* Actions (100% SVG Vectors) */}
                        <div className="mt-3 grid grid-cols-3 gap-2 px-4">
                          <div className="flex items-center justify-center gap-1.5 rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 py-2 text-xs font-bold text-[#25D366]">
                            <WhatsAppIcon className="h-3.5 w-3.5" />
                            <span>Chat</span>
                          </div>
                          <div className="flex items-center justify-center gap-1.5 rounded-xl border border-[#b45309]/30 bg-[#b45309]/10 py-2 text-xs font-bold text-[#b45309]">
                            <Phone className="h-3.5 w-3.5" />
                            <span>Call</span>
                          </div>
                          <div className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white py-2 text-xs font-bold text-stone-800">
                            <Mail className="h-3.5 w-3.5" />
                            <span>Email</span>
                          </div>
                        </div>

                        {/* Corporate Tiles */}
                        <div className="mt-3 space-y-1.5 px-4">
                          <div className="flex items-center justify-between rounded-xl border border-[#ebdcc8] bg-white p-2.5 text-xs font-semibold text-stone-800">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 text-[#b45309]" />
                              <span>People First Consulting</span>
                            </div>
                            <span className="text-[10px] text-stone-400">HQ</span>
                          </div>
                          <div className="flex items-center justify-between rounded-xl border border-[#ebdcc8] bg-white p-2.5 text-xs font-semibold text-stone-800">
                            <div className="flex items-center gap-2">
                              <Globe className="h-3.5 w-3.5 text-[#b45309]" />
                              <span className="truncate">peoplefirst.com.ng</span>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
                          </div>
                        </div>

                        {/* 5 Popular Socials */}
                        <div className="mt-3 flex items-center justify-center gap-2 py-1">
                          {[
                            { name: "W", color: "text-[#25D366] border-[#25D366]/40" },
                            { name: "IG", color: "text-[#E1306C] border-[#E1306C]/40" },
                            { name: "in", color: "text-[#0A66C2] border-[#0A66C2]/40" },
                            { name: "𝕏", color: "text-stone-900 border-stone-400" },
                            { name: "f", color: "text-[#1877F2] border-[#1877F2]/40" },
                          ].map((s, i) => (
                            <div key={i} className={`h-7 w-7 rounded-full bg-white border flex items-center justify-center text-[10px] font-bold ${s.color}`}>
                              {s.name}
                            </div>
                          ))}
                        </div>

                        {/* Save Contact CTA */}
                        <div className="mt-auto px-4 pb-4 pt-2">
                          <Link
                            href="/card/aisha-abdullahi"
                            target="_blank"
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-950 py-2.5 text-xs font-bold text-amber-200 border border-amber-500/30 shadow-md transition hover:bg-emerald-900 cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Save Contact (.VCF)</span>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct Demo Links & Primary CTA */}
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--mk-muted)]">
                    {isAr ? "معاينة البطاقة الحية:" : "Open Live Card:"}
                  </span>
                  <Link
                    href={`/card/${activeDemo === "david" ? "david-okello" : activeDemo === "farida" ? "farida-mwaniki" : "aisha-abdullahi"}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-900 transition hover:bg-emerald-100"
                  >
                    <span>{activeDemo === "david" ? "david-okello" : activeDemo === "farida" ? "farida-mwaniki" : "aisha-abdullahi"}</span>
                    <ArrowUpRight className="h-3 w-3 text-emerald-700" />
                  </Link>
                </div>

                <div className="pt-2">
                  <Link href="/product/digital-vcard">
                    <Button className="h-12 rounded-[10px] bg-[var(--mk-green-deep)] px-8 text-[15px] font-bold text-white shadow-lg transition hover:bg-emerald-700 hover:shadow-emerald-500/25">
                      {isAr ? "اكتشف بطاقات العمل الرقمية الذكية" : "Explore Digital Business Cards"}
                      <ArrowRight className={`ml-2 h-4.5 w-4.5 ${isAr ? "rotate-180 mr-2 ml-0" : ""}`} />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* DARK STATS ROW (Optimized Contrast) */}
        {/* ============================================================ */}
        <section className="bg-[var(--mk-ink)] px-4 py-16 text-white sm:px-6">
          <div className="mx-auto max-w-7xl">
            <Reveal className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
              {[
                { num: "98%", labelEn: "WhatsApp message open rate vs 22% email", labelAr: "معدل فتح رسائل واتساب مقارنةً بـ 22% للبريد" },
                { num: "10×", labelEn: "Average campaign ROI over email marketing", labelAr: "متوسط عائد الاستثمار مقارنة بالبريد الإلكتروني" },
                { num: "45s", labelEn: "Average AI bot response SLA", labelAr: "متوسط سرعة استجابة البوت الذكي" },
                { num: "100%", labelEn: "Direct OMR bank payout via AmwalPay", labelAr: "تسوية بنكية مباشرة بالريال العماني" },
              ].map((stat, i) => (
                <div key={i} className="space-y-2">
                  <p className="text-[48px] font-black leading-none text-[#00E785] sm:text-[56px] tracking-tight">{stat.num}</p>
                  <p className="text-[13.5px] font-medium leading-snug text-[#F3F4F6]">{isAr ? stat.labelAr : stat.labelEn}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ============================================================ */}
        {/* HOW IT WORKS — 3 STEPS */}
        {/* ============================================================ */}
        <section className="border-b border-[var(--mk-line)] px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl space-y-14">
            <div className="max-w-2xl space-y-3">
              <p className="text-[12px] font-extrabold uppercase tracking-widest text-[var(--mk-green-deep)]">
                {isAr ? "طريقة الإعداد" : "How it works"}
              </p>
              <h2 className="mk-display text-[38px] text-[var(--mk-ink)] sm:text-[46px]">
                {isAr ? "جاهز للعمل خلال 10 دقائق" : "Live in under 10 minutes"}
              </h2>
              <p className="text-[17.5px] text-[var(--mk-ink-soft)]">
                {isAr
                  ? "بدون إعداد تقني معقد. ثلاث خطوات فقط لتشغيل عمليات واتساب بالكامل."
                  : "No complex technical setup. Three steps and your full WhatsApp operation is running."}
              </p>
            </div>

            <Reveal className="grid gap-6 md:grid-cols-3">
              {steps.map((step, i) => (
                <div key={i} className="relative rounded-[14px] border-2 border-[var(--mk-line)] bg-white p-7 space-y-4 hover:border-[#111827] transition shadow-sm">
                  {i < steps.length - 1 && (
                    <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 md:block ltr:block rtl:hidden">
                      <ChevronRight className="h-6 w-6 text-[var(--mk-muted)]" />
                    </div>
                  )}
                  <span className="text-[44px] font-black text-[var(--mk-green-deep)] leading-none">{step.num}</span>
                  <h3 className="text-[20px] font-bold text-[var(--mk-ink)]">
                    {isAr ? step.titleAr : step.titleEn}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-[var(--mk-muted)]">
                    {isAr ? step.descAr : step.descEn}
                  </p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ============================================================ */}
        {/* INDUSTRIES GRID */}
        {/* ============================================================ */}
        <section className="border-b border-[var(--mk-line)] bg-[var(--mk-surface-2)] px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl space-y-12">
            <div className="space-y-3 text-center">
              <p className="text-[12px] font-extrabold uppercase tracking-widest text-[var(--mk-green-deep)]">
                {isAr ? "القطاعات المدعومة" : "Industries"}
              </p>
              <h2 className="mk-display text-[38px] text-[var(--mk-ink)] sm:text-[46px]">
                {isAr ? "حلول مخصصة لكل قطاع" : "Purpose-built for every industry"}
              </h2>
              <p className="mx-auto max-w-xl text-[17.5px] text-[var(--mk-ink-soft)]">
                {isAr
                  ? "وحدات تشغيل متخصصة جاهزة للنشر الفوري — من المطاعم إلى المستشفيات إلى الوكالات."
                  : "Vertical-specific operational modules ready to deploy — from restaurants to hospitals to agencies."}
              </p>
            </div>

            <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {industries.map((ind, i) => (
                <Link key={i} href={ind.href} className="group">
                  <div className="flex h-full flex-col gap-3.5 rounded-[14px] border-2 border-[var(--mk-line)] bg-white p-5 transition-all duration-200 hover:border-[#111827] hover:shadow-md">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#00E785]/50 bg-[#00E785]/20 text-[var(--mk-green-deep)] transition-colors group-hover:bg-[#00E785] group-hover:border-[#00E785] group-hover:text-[var(--mk-ink)]">
                      <ind.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[16px] font-bold text-[var(--mk-ink)]">{isAr ? ind.titleAr : ind.titleEn}</p>
                      <p className="mt-1 text-[13px] font-medium text-[var(--mk-muted)] leading-snug">{isAr ? ind.descAr : ind.descEn}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ============================================================ */}
        {/* GCC REGIONAL ALIGNMENT */}
        {/* ============================================================ */}
        <section className="border-b border-[var(--mk-line)] px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6">
              <p className="text-[12px] font-extrabold uppercase tracking-widest text-[var(--mk-green-deep)]">
                {isAr ? "مصمم لعمان والخليج" : "Built for Oman & GCC"}
              </p>
              <h2 className="mk-display text-[38px] text-[var(--mk-ink)] sm:text-[46px]">
                {isAr
                  ? "البنية التحتية الإقليمية الصحيحة"
                  : "The right regional infrastructure"}
              </h2>
              <p className="text-[17.5px] leading-relaxed text-[var(--mk-ink-soft)]">
                {isAr
                  ? "تسوية مباشرة بالريال العماني عبر أموال باي، وذكاء اصطناعي يفهم اللهجات الخليجية، وعزل كامل لبيانات مساحات العمل."
                  : "Direct OMR settlements via AmwalPay, Gulf Arabic colloquial AI understanding, and fully isolated multi-tenant workspace architecture."}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { en: "Oman · Muscat", ar: "عُمان · مسقط" },
                  { en: "UAE · Dubai", ar: "الإمارات · دبي" },
                  { en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
                  { en: "Qatar · Doha", ar: "قطر · الدوحة" },
                  { en: "Bahrain", ar: "البحرين" },
                  { en: "Kuwait", ar: "الكويت" },
                ].map((r, i) => (
                  <div key={i} className="rounded-lg border border-[var(--mk-line)] bg-[var(--mk-surface-2)] px-3.5 py-2.5 text-center">
                    <p className="text-[13.5px] font-bold text-[var(--mk-ink)]">{isAr ? r.ar : r.en}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mk-card bg-[var(--mk-surface-2)] p-8 space-y-5">
              <h3 className="flex items-center gap-2 text-[19px] font-bold text-[var(--mk-ink)]">
                <Globe className="h-5 w-5 text-[var(--mk-green-deep)]" />
                {isAr ? "لماذا تختار Fizmoh؟" : "Why leading GCC brands choose Fizmoh"}
              </h3>
              <ul className="space-y-4">
                {[
                  {
                    en: "AmwalPay gateway with instant settlement directly into local Omani & GCC bank accounts.",
                    ar: "بوابة أموال باي مع تسوية فورية في الحسابات البنكية العمانية والخليجية المحلية.",
                  },
                  {
                    en: "AI models specifically trained on Gulf Arabic colloquial dialect intents and customer idioms.",
                    ar: "نماذج ذكاء اصطناعي مُدرَّبة على اللهجات الخليجية العامية ومفردات العملاء المحليين.",
                  },
                  {
                    en: "Ready-to-deploy operational modules for Healthcare, Safari Tours, and Dining POS.",
                    ar: "وحدات تشغيل جاهزة للعيادات والجولات السياحية والمطاعم.",
                  },
                  {
                    en: "Transparent flat subscriptions with zero markups on official Meta conversation rates.",
                    ar: "اشتراكات شفافة ثابتة بدون أي هوامش إضافية على رسوم محادثات Meta.",
                  },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-[15px]">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--mk-green-deep)]" />
                    <span className="leading-relaxed text-[var(--mk-ink-soft)] font-medium">{isAr ? item.ar : item.en}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* TESTIMONIALS */}
        {/* ============================================================ */}
        <section className="border-b border-[var(--mk-line)] bg-[var(--mk-surface-2)] px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl space-y-12">
            <div className="space-y-3 text-center">
              <p className="text-[12px] font-extrabold uppercase tracking-widest text-[var(--mk-green-deep)]">
                {isAr ? "آراء العملاء" : "Customer stories"}
              </p>
              <h2 className="mk-display text-[38px] text-[var(--mk-ink)] sm:text-[46px]">
                {isAr ? "ما يقوله عملاؤنا" : "What our customers say"}
              </h2>
            </div>

            <Reveal className="grid gap-6 md:grid-cols-3">
              {testimonials.map((t, i) => (
                <div key={i} className="flex flex-col justify-between gap-6 rounded-[14px] border-2 border-[var(--mk-line)] bg-white p-7 shadow-sm hover:border-[#111827] transition">
                  <div className="space-y-4">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, si) => (
                        <Star key={si} className="h-4.5 w-4.5 fill-[#047857] text-[var(--mk-green-deep)]" />
                      ))}
                    </div>
                    <p className="text-[15.5px] leading-relaxed text-[var(--mk-ink)] font-medium">{t.quote}</p>
                  </div>
                  <div className="flex items-center gap-3 border-t border-[var(--mk-line)] pt-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00E785]/25 text-[14px] font-extrabold text-[var(--mk-green-deep)] border border-[#00E785]">
                      {t.initial}
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-[var(--mk-ink)]">{isAr ? t.nameAr : t.nameEn}</p>
                      <p className="text-[12.5px] font-medium text-[var(--mk-muted)]">{isAr ? t.roleAr : t.roleEn}</p>
                    </div>
                  </div>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ============================================================ */}
        {/* PLATFORM COMPARISON */}
        {/* ============================================================ */}
        <section className="border-b border-[var(--mk-line)] px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl space-y-10">
            <div className="space-y-3 text-center">
              <p className="text-[12px] font-extrabold uppercase tracking-widest text-[var(--mk-green-deep)]">
                {isAr ? "مقارنة المنصات" : "Platform comparison"}
              </p>
              <h2 className="mk-display text-[38px] text-[var(--mk-ink)] sm:text-[46px]">
                {isAr
                  ? "Fizmoh مقابل المنافسين"
                  : "Fizmoh vs. the alternatives"}
              </h2>
              <p className="mx-auto max-w-lg text-[17.5px] text-[var(--mk-ink-soft)]">
                {isAr
                  ? "البديل الأقوى والأكثر اكتمالاً لـ WATI وTwilio وInterakt."
                  : "The more complete alternative to WATI, Twilio, and Interakt for the GCC market."}
              </p>
            </div>

            <div className="overflow-x-auto rounded-[14px] border-2 border-[var(--mk-line)] bg-white shadow-sm">
              <table className="w-full text-[14.5px] text-left">
                <thead className="border-b-2 border-[var(--mk-line)] bg-[var(--mk-surface-2)] text-[var(--mk-ink)]">
                  <tr>
                    <th className="p-4 font-bold text-[var(--mk-ink-soft)]">{isAr ? "الميزة" : "Feature"}</th>
                    <th className="border-x-2 border-[#047857] bg-[#00E785]/20 p-4 font-extrabold text-[var(--mk-ink)]">Fizmoh</th>
                    <th className="p-4 font-bold text-[var(--mk-ink-soft)]">WATI</th>
                    <th className="p-4 font-bold text-[var(--mk-ink-soft)]">Twilio</th>
                    <th className="p-4 font-bold text-[var(--mk-ink-soft)]">Interakt</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-[var(--mk-line)]">
                  {[
                    [isAr ? "بوابة دفع أموال باي (OMR)" : "Native AmwalPay Oman Gateway", "✅ Included", "❌ None", "❌ Custom dev", "❌ INR only"],
                    [isAr ? "شات بوت باللهجة الخليجية" : "Gulf Arabic Dialect AI Bot", "✅ Native GCC NLP", "⚠️ Basic", "❌ Raw API", "❌ EN/Hindi"],
                    [isAr ? "صندوق وارد متعدد الموظفين" : "Multi-Agent CRM Inbox", "✅ Unlimited", "⚠️ Limited seats", "❌ API only", "⚠️ Paid add-on"],
                    [isAr ? "وحدات قطاعية جاهزة" : "Ready Industry Modules", "✅ 25+ built-in", "❌ E-com only", "❌ Dev required", "❌ Shopify only"],
                    [isAr ? "مساحات عمل متعددة المستأجرين" : "Multi-Tenant Agency Workspaces", "✅ Built-in", "❌ Single account", "❌ Raw API", "❌ Single account"],
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-[var(--mk-surface-2)] transition">
                      <td className="p-4 font-bold text-[var(--mk-ink)]">{row[0]}</td>
                      <td className="border-x-2 border-[#047857] bg-[#00E785]/15 p-4 font-extrabold text-[var(--mk-ink)]">{row[1]}</td>
                      <td className="p-4 font-medium text-[var(--mk-muted)]">{row[2]}</td>
                      <td className="p-4 font-medium text-[var(--mk-muted)]">{row[3]}</td>
                      <td className="p-4 font-medium text-[var(--mk-muted)]">{row[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* DOWNLOAD OUR APPS SECTION */}
        {/* ============================================================ */}
        <section className="border-b border-[var(--mk-line)] bg-gradient-to-b from-[#F9FAFB] to-white px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl space-y-12">
            <div className="space-y-4 text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#00E785]/40 bg-[#00E785]/10 px-3.5 py-1 text-[12.5px] font-bold text-[var(--mk-green-deep)]">
                <Smartphone className="h-3.5 w-3.5 text-[#00B96A]" />
                <span>{isAr ? "التطبيقات الرسمية المعتمدة" : "Official Multi-Platform Apps"}</span>
              </div>
              <h2 className="mk-display text-[38px] text-[var(--mk-ink)] sm:text-[46px]">
                {isAr ? "حمّل تطبيقات فيزموه لجميع أجهزتك" : "Download Fizmoh for All Your Devices"}
              </h2>
              <p className="text-[16px] text-[var(--mk-muted)] leading-relaxed">
                {isAr
                  ? "أدر محادثات واتساب لعملائك من أي مكان عبر تطبيق أندرويد، أو ضاعف سرعة استجابة فريقك عبر برامج سطح المكتب لماك وويندوز."
                  : "Respond to customer chats on the move with Android, or supercharge support speeds with dedicated native clients for macOS and Windows."}
              </p>
            </div>

            <Reveal className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Android Card */}
              <div className="mk-card p-7 space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-[12px] bg-[#00E785]/20 text-[var(--mk-green-deep)] border border-[#00E785]/40 flex items-center justify-center">
                      <Smartphone className="h-6 w-6 text-[#00B96A]" />
                    </div>
                    <span className="px-2.5 py-1 rounded-[6px] bg-[#00E785]/20 text-[var(--mk-green-deep)] text-[11px] font-bold">
                      {isAr ? "تطبيق أندرويد" : "Android APK"}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-[19px] font-extrabold text-[var(--mk-ink)]">
                      {isAr ? "تطبيق أندرويد للهواتف" : "Fizmoh for Android"}
                    </h3>
                    <p className="text-[13px] text-[var(--mk-muted)] mt-1 leading-relaxed">
                      {isAr
                        ? "إشعارات دفع فورية، تصوير ومسح الإيصالات بكاميرا الهاتف، وحفظ المسودات بدون إنترنت."
                        : "Instant push alerts, camera receipt scanning, offline draft saving, and 1-tap quick replies."}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-[#F3F4F6]">
                  <a
                    href="/downloads/Fizmoh.apk"
                    className="w-full h-11 rounded-[8px] bg-[#000000] hover:bg-[#1F2937] text-white text-[13px] font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                  >
                    <Download className="h-4 w-4 text-[#00E785]" />
                    <span>{isAr ? "تحميل تطبيق Android (.apk)" : "Download Android APK"}</span>
                  </a>
                  <p className="text-center text-[11px] text-[var(--mk-muted)] font-medium">
                    {isAr ? "حجم الملف: 193 ميجابايت · متوافق مع Android 10+" : "193 MB · Compatible with Android 10+"}
                  </p>
                </div>
              </div>

              {/* macOS Card */}
              <div className="mk-card p-7 space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-[12px] bg-[var(--mk-surface-2)] text-[var(--mk-ink)] border border-[var(--mk-line)] flex items-center justify-center">
                      <Laptop className="h-6 w-6 text-[var(--mk-ink)]" />
                    </div>
                    <span className="px-2.5 py-1 rounded-[6px] bg-[var(--mk-surface-2)] text-[var(--mk-ink-soft)] text-[11px] font-bold border border-[var(--mk-line)]">
                      macOS Universal
                    </span>
                  </div>
                  <div>
                    <h3 className="text-[19px] font-extrabold text-[var(--mk-ink)]">
                      {isAr ? "برنامج سطح المكتب لماك" : "Fizmoh for macOS"}
                    </h3>
                    <p className="text-[13px] text-[var(--mk-muted)] mt-1 leading-relaxed">
                      {isAr
                        ? "أداء صاروخي لأنظمة Apple Silicon وIntel، شارة شريط القوائم، والتنبيهات الصوتية المخصصة."
                        : "Universal binary for Apple Silicon & Intel with menu-bar badges, audio alerts, and hotkeys."}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-[#F3F4F6]">
                  <a
                    href="/downloads/Fizmoh-macOS.zip"
                    className="w-full h-11 rounded-[8px] bg-[#000000] hover:bg-[#1F2937] text-white text-[13px] font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                  >
                    <Download className="h-4 w-4 text-[#00E785]" />
                    <span>{isAr ? "تحميل برنامج Mac (.zip)" : "Download for Mac (.zip)"}</span>
                  </a>
                  <p className="text-center text-[11px] text-[var(--mk-muted)] font-medium">
                    {isAr ? "حجم الملف: 117 ميجابايت · macOS 12 Monterey+" : "117 MB · macOS 12 Monterey+"}
                  </p>
                </div>
              </div>

              {/* Windows Card */}
              <div className="mk-card p-7 space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-[12px] bg-[var(--mk-surface-2)] text-[var(--mk-ink)] border border-[var(--mk-line)] flex items-center justify-center">
                      <Monitor className="h-6 w-6 text-[var(--mk-ink)]" />
                    </div>
                    <span className="px-2.5 py-1 rounded-[6px] bg-[var(--mk-surface-2)] text-[var(--mk-ink-soft)] text-[11px] font-bold border border-[var(--mk-line)]">
                      Windows 64-bit
                    </span>
                  </div>
                  <div>
                    <h3 className="text-[19px] font-extrabold text-[var(--mk-ink)]">
                      {isAr ? "برنامج سطح المكتب لويندوز" : "Fizmoh for Windows"}
                    </h3>
                    <p className="text-[13px] text-[var(--mk-muted)] mt-1 leading-relaxed">
                      {isAr
                        ? "برنامج أصلي خفيف مع إشعارات شريط المهام ودعم تعدد الموظفين والتحديثات التلقائية."
                        : "Lightweight background client with taskbar tray notifications and seamless agent switching."}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-[#F3F4F6]">
                  <a
                    href="/downloads/Fizmoh-Windows.zip"
                    className="w-full h-11 rounded-[8px] bg-[#000000] hover:bg-[#1F2937] text-white text-[13px] font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                  >
                    <Download className="h-4 w-4 text-[#00E785]" />
                    <span>{isAr ? "تحميل برنامج Windows (.zip)" : "Download for Windows (.zip)"}</span>
                  </a>
                  <p className="text-center text-[11px] text-[var(--mk-muted)] font-medium">
                    {isAr ? "حجم الملف: 62 ميجابايت · Windows 10/11 (64-bit)" : "62 MB · Windows 10/11 (64-bit)"}
                  </p>
                </div>
              </div>
            </Reveal>

            <div className="text-center pt-2">
              <a
                href="/downloads/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-white border-2 border-[var(--mk-line)] hover:border-[#000000] text-[var(--mk-ink)] text-[13.5px] font-extrabold transition shadow-xs"
              >
                <span>{isAr ? "استعراض مركز التنزيل الكامل والمواصفات" : "Open Full Download Center & Release Hashes"}</span>
                <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
              </a>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* FAQ */}
        {/* ============================================================ */}
        <section className="border-b border-[var(--mk-line)] bg-[var(--mk-surface-2)] px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-3xl space-y-10">
            <div className="space-y-3 text-center">
              <p className="text-[12px] font-extrabold uppercase tracking-widest text-[var(--mk-green-deep)]">FAQ</p>
              <h2 className="mk-display text-[38px] text-[var(--mk-ink)] sm:text-[46px]">
                {isAr ? "الأسئلة الشائعة" : "Frequently asked questions"}
              </h2>
            </div>

            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="mk-card px-5"
                >
                  <AccordionTrigger className="py-5 text-left text-[16px] font-bold text-[var(--mk-ink)] hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-[15px] leading-relaxed text-[var(--mk-ink-soft)]">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ============================================================ */}
        {/* BOTTOM CTA — Ultra High Contrast Green Band */}
        {/* ============================================================ */}
        <section className="relative overflow-hidden bg-[var(--mk-ink)] px-4 py-24 sm:px-6">
          <div className="mk-aurora opacity-70" aria-hidden="true" />
          {/*
            * The same mascot that signs off an invoice, here signing off the
            * pitch — coding on a laptop beside a call to action about the API
            * that laptop represents. Decorative and aria-hidden; clipped to
            * the section (overflow-hidden above) so it can never spill onto
            * the footer, and hidden below lg where there is no room for it
            * beside the centred copy.
            */}
          <img
            src="/invoice/footer.png"
            alt=""
            aria-hidden="true"
            width={300}
            height={293}
            loading="lazy"
            className="pointer-events-none absolute -bottom-10 right-[6%] z-0 hidden w-[220px] opacity-95 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] lg:block"
          />
          <Reveal className="relative z-10 mx-auto max-w-4xl space-y-7 text-center">
            <h2 className="mk-display text-[42px] text-white sm:text-[54px]">
              {isAr
                ? "جاهز لتحويل واتساب إلى\nأقوى قناة مبيعات لشركتك؟"
                : "Ready to make WhatsApp\nyour top revenue channel?"}
            </h2>
            <p className="mx-auto max-w-2xl text-[18px] leading-relaxed text-white/75">
              {isAr
                ? "أطلق حساب Cloud API الرسمي، وصندوق الوارد المشترك، والبوت الذكي، وبوابة أموال باي — خلال أقل من 10 دقائق."
                : "Launch your official WhatsApp Cloud API workspace, multi-agent CRM, AI chatbot, and AmwalPay gateway in under 10 minutes."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="h-13 gap-2 rounded-full bg-white px-8 text-[15.5px] font-semibold text-[var(--mk-ink)] shadow-[0_10px_30px_-10px_rgba(255,255,255,0.5)] transition-all hover:bg-[var(--mk-gold-soft)] hover:text-[var(--mk-ink)] cursor-pointer"
                >
                  {isAr ? "ابدأ التجربة المجانية — 14 يوماً" : "Start Free Trial — 14 Days"}
                  <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
                </Button>
              </Link>
              <Link href="/book-demo">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-13 gap-2 rounded-full border border-white/25 bg-white/5 px-7 text-[15.5px] font-semibold text-white backdrop-blur transition-colors hover:border-white/60 hover:bg-white/10 cursor-pointer"
                >
                  <Video className="h-4.5 w-4.5" aria-hidden="true" />
                  {isAr ? "حجز عرض Google Meet" : "Book a Live Demo"}
                </Button>
              </Link>
            </div>
            <p className="pt-1 text-[13.5px] text-white/60">
              {isAr ? "بدون بطاقة بنكية · ربط API خلال 60 ثانية · دعم فني متخصص" : "No credit card required · 60-second API setup · Dedicated onboarding support"}
            </p>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
