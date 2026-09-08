"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Brand } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/language-context"
import {
  Menu, X, ArrowRight, ShieldCheck,
  Globe, Video, ChevronDown, ChevronUp, ChevronRight,
  Utensils, Coffee, ShoppingBag, Shirt, Scissors, Store,
  Compass, Stethoscope, Building2, Sparkles, Inbox, Bot,
  CreditCard, Megaphone, Workflow, Layers, Smartphone, Download,
  BookOpen, PhoneCall, FileCode2, QrCode, MessageCircleQuestion,
} from "lucide-react"

function WhatsAppBrandIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.69 12.05 3.69C14.25 3.69 16.32 4.55 17.88 6.11C19.43 7.67 20.29 9.74 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15ZM16.56 14.37C16.31 14.25 15.09 13.65 14.86 13.56C14.63 13.48 14.47 13.44 14.3 13.69C14.14 13.94 13.67 14.49 13.53 14.65C13.38 14.82 13.24 14.84 12.99 14.71C12.74 14.59 11.95 14.33 11.01 13.49C10.28 12.84 9.78 12.03 9.64 11.78C9.5 11.53 9.62 11.4 9.75 11.27C9.86 11.16 10 10.98 10.12 10.84C10.25 10.7 10.29 10.59 10.37 10.43C10.45 10.26 10.41 10.12 10.35 10C10.29 9.88 9.79 8.65 9.59 8.14C9.39 7.65 9.18 7.72 9.03 7.71C8.89 7.7 8.72 7.7 8.56 7.7C8.39 7.7 8.12 7.76 7.89 8.01C7.66 8.26 7.02 8.86 7.02 10.08C7.02 11.3 7.91 12.47 8.03 12.64C8.16 12.81 9.77 15.28 12.24 16.35C12.83 16.6 13.28 16.75 13.64 16.87C14.23 17.06 14.77 17.03 15.2 16.97C15.68 16.9 16.67 16.37 16.88 15.79C17.08 15.22 17.08 14.73 17.02 14.63C16.96 14.53 16.81 14.49 16.56 14.37Z" />
    </svg>
  )
}

function FacebookBrandIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

function InstagramBrandIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  )
}

function TelegramBrandIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
    </svg>
  )
}

function WebChatBrandIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  )
}

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const { lang, toggleLang, isAr } = useLanguage()

  const dropdownRef = useRef<HTMLDivElement>(null)
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = (name: string) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    setActiveDropdown(name)
  }

  const handleMouseLeave = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
    }
    closeTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null)
    }, 180)
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    }
  }, [])

  const toggleDropdown = (name: string) => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    setActiveDropdown((prev) => (prev === name ? null : name))
  }

  // ─── 1. Platforms (Channels & Automation) ───
  const platformItems = [
    {
      titleEn: "WhatsApp",
      titleAr: "واتساب",
      descEn: "WhatsApp marketing automation for sales & support.",
      descAr: "أتمتة تسويق وخدمة عملاء واتساب للمبيعات والدعم.",
      href: "/product/team-inbox",
      icon: WhatsAppBrandIcon,
      color: "text-[#25D366] bg-[#25D366]/10",
    },
    {
      titleEn: "Facebook",
      titleAr: "فيسبوك",
      descEn: "Facebook Messenger automation for ads, comments & sales.",
      descAr: "أتمتة فيسبوك ماسنجر للإعلانات والتعليقات والمبيعات.",
      href: "/product/facebook-instagram-automation",
      icon: FacebookBrandIcon,
      color: "text-[#1877F2] bg-[#1877F2]/10",
    },
    {
      titleEn: "Instagram",
      titleAr: "إنستغرام",
      descEn: "Instagram DM automation for Reels, Stories & lead capture.",
      descAr: "أتمتة رسائل إنستغرام للريلز والقصص والتقاط العملاء.",
      href: "/product/facebook-instagram-automation",
      icon: InstagramBrandIcon,
      color: "text-[#E1306C] bg-[#E1306C]/10",
    },
    {
      titleEn: "Telegram",
      titleAr: "تيليجرام",
      descEn: "Telegram bot automation for groups, DMs, broadcasts & AI support.",
      descAr: "أتمتة بوت تيليجرام للمجموعات والرسائل والبث والدعم.",
      href: "/features",
      icon: TelegramBrandIcon,
      color: "text-[#229ED9] bg-[#229ED9]/10",
    },
    {
      titleEn: "Website Chat",
      titleAr: "شات الموقع",
      descEn: "Website chat widget automation for lead capture, AI support & handoff.",
      descAr: "ودجت شات الموقع المباشر لالتقاط العملاء والدعم والتحويل.",
      href: "/features",
      icon: WebChatBrandIcon,
      color: "text-[#0284C7] bg-[#0284C7]/10",
    },
    {
      titleEn: "Interactive Simulator",
      titleAr: "المحاكي التفاعلي",
      descEn: "Test real bot flows, menus, and buttons in live sandbox.",
      descAr: "اختبر سيناريوهات البوت والأزرار والمنيو مباشرة.",
      href: "/product/simulator",
      icon: Sparkles,
      color: "text-[#8B5CF6] bg-[#8B5CF6]/10",
    },
    {
      titleEn: "Smart Menu & KDS",
      titleAr: "المنيو الذكي وشاشة المطبخ",
      descEn: "Live kitchen display, QR contactless dining & table ordering.",
      descAr: "شاشة مطبخ حية، طلبات QR، واستيراد المنيو الذكي.",
      href: "/product/smart-menu-ordering",
      icon: Utensils,
      color: "text-[#059669] bg-[#059669]/10",
      badgeEn: "New",
      badgeAr: "جديد",
    },
    {
      titleEn: "Digital QR Reviews",
      titleAr: "مراجعات QR الرقمية",
      descEn: "AI-designed QR stands, review funnels & Google auto-reply.",
      descAr: "تصميم لافتات QR بالذكاء الاصطناعي ورد تلقائي على جوجل.",
      href: "/product/digital-qr-reviews",
      icon: QrCode,
      color: "text-[#D97706] bg-[#D97706]/10",
    },
    {
      titleEn: "Digital Business Cards",
      titleAr: "بطاقات الأعمال الذكية",
      descEn: "10+ executive themes, video covers, NFC & 1-tap phone sync.",
      descAr: "أكثر من 10 قوالب تنفيذية، أغلفة فيديو وحفظ فوري في الهاتف.",
      href: "/product/digital-vcard",
      icon: Smartphone,
      color: "text-[#4F46E5] bg-[#4F46E5]/10",
    },
  ]

  // ─── 2. Industries ───
  const industryItems = [
    {
      titleEn: "Healthcare",
      titleAr: "الرعاية الصحية",
      descEn: "Patient support, scheduling, and follow-ups.",
      descAr: "دعم المرضى، حجز المواعيد والمتابعة الطبية.",
      href: "/solutions/clinics-hospitals-health",
      icon: Stethoscope,
      color: "text-[#059669] bg-[#059669]/10",
    },
    {
      titleEn: "Finance",
      titleAr: "المالية والمصارف",
      descEn: "Lead qualification and secure support routing.",
      descAr: "تأهيل العملاء والمدفوعات الآمنة والتوجيه المالي.",
      href: "/solutions/ecommerce-online-stores",
      icon: CreditCard,
      color: "text-[#2563EB] bg-[#2563EB]/10",
    },
    {
      titleEn: "E-Commerce",
      titleAr: "المتاجر الإلكترونية",
      descEn: "Cart recovery, orders, and store support.",
      descAr: "استرجاع السلات المتروكة وتتبع الطلبات ودعم المتجر.",
      href: "/solutions/ecommerce-online-stores",
      icon: ShoppingBag,
      color: "text-[#7C3AED] bg-[#7C3AED]/10",
    },
    {
      titleEn: "Retail B2C",
      titleAr: "التجزئة والأزياء",
      descEn: "Retail support, cart recovery, and re-engagement.",
      descAr: "دعم التجزئة، العروض الجديدة ودليل المنتجات.",
      href: "/solutions/fashion-perfumes-retail",
      icon: Shirt,
      color: "text-[#0284C7] bg-[#0284C7]/10",
    },
    {
      titleEn: "Real Estate",
      titleAr: "العقارات",
      descEn: "Property leads, showings, and inquiries.",
      descAr: "عروض العقارات، معاينات الشقق واستفسارات المشترين.",
      href: "/solutions/ecommerce-online-stores",
      icon: Building2,
      color: "text-[#0D9488] bg-[#0D9488]/10",
    },
    {
      titleEn: "Restaurant",
      titleAr: "المطاعم",
      descEn: "Reservations, orders, and guest engagement.",
      descAr: "حجز الطاولات، طلبات المنيو وتجربة الضيوف.",
      href: "/solutions/restaurants-dining",
      icon: Utensils,
      color: "text-[#EA580C] bg-[#EA580C]/10",
    },
    {
      titleEn: "Education",
      titleAr: "التعليم والتدريب",
      descEn: "Admissions, counseling, and student engagement.",
      descAr: "التسجيل والقبول، الاستشارات وتواصل الطلاب.",
      href: "/solutions/ecommerce-online-stores",
      icon: BookOpen,
      color: "text-[#4F46E5] bg-[#4F46E5]/10",
    },
    {
      titleEn: "SaaS & Tech",
      titleAr: "البرمجيات والتقنية",
      descEn: "Leads, demos, onboarding, and retention.",
      descAr: "العملاء المحتملون، العروض الحية والتفعيل.",
      href: "/solutions/ecommerce-online-stores",
      icon: Workflow,
      color: "text-[#2563EB] bg-[#2563EB]/10",
    },
    {
      titleEn: "Logistics",
      titleAr: "الشحن واللوجستيات",
      descEn: "Tracking, delivery updates, and support.",
      descAr: "تتبع الشحنات، تحديثات التوصيل وإشعارات الوصول.",
      href: "/solutions/ecommerce-online-stores",
      icon: Compass,
      color: "text-[#0891B2] bg-[#0891B2]/10",
    },
    {
      titleEn: "Agencies",
      titleAr: "الوكالات والشركات",
      descEn: "Leads, consultations, and client comms.",
      descAr: "الاستشارات، إدارة العملاء والاتصالات الموحدة.",
      href: "/solutions/ecommerce-online-stores",
      icon: Layers,
      color: "text-[#9333EA] bg-[#9333EA]/10",
    },
    {
      titleEn: "Cafes & Coffee",
      titleAr: "المقاهي والكافيهات",
      descEn: "Speedy takeaway, loyalty promotions & orders.",
      descAr: "طلبات استلام سريعة، برامج ولاء ومشروبات مخصصة.",
      href: "/solutions/cafes-coffee",
      icon: Coffee,
      color: "text-[#B45309] bg-[#B45309]/10",
    },
    {
      titleEn: "Tours & Safari",
      titleAr: "السياحة والمغامرات",
      descEn: "Musandam dhows, desert camps & live seats.",
      descAr: "رحلات مسندم، مخيمات الرمال والمقاعد المباشرة.",
      href: "/solutions/tours-safari-musandam",
      icon: Compass,
      color: "text-[#E11D48] bg-[#E11D48]/10",
    },
  ]

  // ─── 3. Resources ───
  const resourceItems = [
    {
      titleEn: "Knowledgebase",
      titleAr: "قاعدة المعرفة",
      descEn: "Find answers, guides, and resources all in one place.",
      descAr: "إجابات وأدلة شاملة وكافة المصادر في مكان واحد.",
      href: "/docs",
      icon: BookOpen,
      color: "text-[#2563EB] bg-[#2563EB]/10",
    },
    {
      titleEn: "Blog",
      titleAr: "المدونة والمقالات",
      descEn: "Latest insights, tips, and updates from our team.",
      descAr: "أحدث الرؤى والنصائح وأخبار نمو التجارة.",
      href: "/blog",
      icon: FileCode2,
      color: "text-[#4F46E5] bg-[#4F46E5]/10",
    },
    {
      titleEn: "API Documentation",
      titleAr: "توثيق واجهة البرمجة",
      descEn: "Comprehensive guide to Fizmoh APIs and webhooks.",
      descAr: "دليل كامل لواجهات برمجة التطبيقات والويبهوك.",
      href: "/docs",
      icon: FileCode2,
      color: "text-[#0284C7] bg-[#0284C7]/10",
    },
    {
      titleEn: "Community & Forum",
      titleAr: "المجتمع والنقاشات",
      descEn: "Join discussions and connect with the community.",
      descAr: "انضم إلى النقاشات وتواصل مع مجتمع الأعمال.",
      href: "/contact",
      icon: Bot,
      color: "text-[#9333EA] bg-[#9333EA]/10",
    },
    {
      titleEn: "Video Tutorials",
      titleAr: "شروحات الفيديو",
      descEn: "Step-by-step videos to master features quickly.",
      descAr: "فيديوهات تطبيقية خطوة بخطوة لتعلم المميزات.",
      href: "/book-demo",
      icon: Video,
      color: "text-[#E11D48] bg-[#E11D48]/10",
    },
    {
      titleEn: "Bug Report",
      titleAr: "الإبلاغ عن خلل",
      descEn: "Report issues you experience and help us improve.",
      descAr: "أبلغ عن أي مشكلة وساعدنا في تحسين المنصة.",
      href: "/contact",
      icon: ShieldCheck,
      color: "text-[#DC2626] bg-[#DC2626]/10",
    },
    {
      titleEn: "Feature Request",
      titleAr: "اقتراح ميزة جديدة",
      descEn: "Contribute new feature ideas and help shape roadmap.",
      descAr: "شارك أفكارك وساهم في تشكيل خريطة التطوير.",
      href: "/contact",
      icon: Sparkles,
      color: "text-[#D97706] bg-[#D97706]/10",
    },
    {
      titleEn: "What's New",
      titleAr: "ما الجديد",
      descEn: "Stay updated with the latest product releases and fixes.",
      descAr: "تابع أحدث الإصدارات والميزات والتحسينات أولاً بأول.",
      href: "/whats-new",
      icon: Sparkles,
      color: "text-[#059669] bg-[#059669]/10",
      badgeEn: "v6.1",
      badgeAr: "v6.1",
    },
    {
      titleEn: "WC Plugin & Stores",
      titleAr: "تكامل المتاجر",
      descEn: "Recover sales with automated WooCommerce webhooks.",
      descAr: "استرجاع السلات بربط ويبهوك ووكومرس وشوبيفاي.",
      href: "/docs",
      icon: Layers,
      color: "text-[#0891B2] bg-[#0891B2]/10",
    },
    {
      titleEn: "Contact (Ask)",
      titleAr: "تواصل معنا",
      descEn: "Get in touch through your preferred channel.",
      descAr: "تواصل معنا عبر القناة المفضلة لديك مباشرة.",
      href: "/contact",
      icon: PhoneCall,
      color: "text-[#2563EB] bg-[#2563EB]/10",
    },
    {
      titleEn: "Support (Technical)",
      titleAr: "الدعم الفني",
      descEn: "Need assistance? Our technical experts are ready.",
      descAr: "هل تحتاج لمساعدة؟ خبراؤنا التقنيون جاهزون.",
      href: "/contact",
      icon: MessageCircleQuestion,
      color: "text-[#0284C7] bg-[#0284C7]/10",
    },
    {
      titleEn: "Priority Support",
      titleAr: "الدعم المميز VIP",
      descEn: "Dedicated support channel reserved for enterprise.",
      descAr: "قناة دعم مخصصة وسريعة لكبار العملاء والشركات.",
      href: "/contact",
      icon: Bot,
      color: "text-[#059669] bg-[#059669]/10",
    },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200/90 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-18 sm:h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" ref={dropdownRef}>
        {/* 1. Left: Brand Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2.5 transition-transform hover:scale-[1.02]">
            <Brand size="md" className="text-[#1D1D1D]" />
          </Link>
        </div>

        {/* 2. Center: BotSailor-Style Harmonious Nav Bar */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {/* Platforms ▾ */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter("platforms")}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => toggleDropdown("platforms")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13.5px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeDropdown === "platforms"
                  ? "bg-stone-100 text-stone-900 font-bold"
                  : "text-stone-700 hover:text-stone-950 hover:bg-stone-50"
              }`}
            >
              <span>{isAr ? "المنصات" : "Platforms"}</span>
              {activeDropdown === "platforms" ? (
                <ChevronUp className="h-4 w-4 text-stone-900" />
              ) : (
                <ChevronDown className="h-4 w-4 text-stone-500" />
              )}
            </button>

            {activeDropdown === "platforms" && (
              <div
                className={`absolute top-full left-1/2 -translate-x-1/2 pt-2.5 w-[860px] max-w-[calc(100vw-32px)] z-50 transition-all ${
                  isAr ? "text-right" : "text-left"
                }`}
                onMouseEnter={() => handleMouseEnter("platforms")}
                onMouseLeave={handleMouseLeave}
              >
                <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                    {platformItems.map((item, i) => (
                      <Link
                        key={i}
                        href={item.href}
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-start gap-3.5 p-2 rounded-xl hover:bg-stone-50 transition group"
                      >
                        <div className={`h-8.5 w-8.5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition ${item.color}`}>
                          <item.icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13.5px] font-bold text-stone-900 group-hover:text-blue-600 transition leading-tight">
                              {isAr ? item.titleAr : item.titleEn}
                            </span>
                            {"badgeEn" in item && item.badgeEn && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                {isAr ? item.badgeAr : item.badgeEn}
                              </span>
                            )}
                          </div>
                          <p className="text-[11.5px] text-stone-500 font-normal leading-relaxed line-clamp-2">
                            {isAr ? item.descAr : item.descEn}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>

                  <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-[12px]">
                    <Link
                      href="/whats-new"
                      onClick={() => setActiveDropdown(null)}
                      className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{isAr ? "ما الجديد في التحديث v6.1" : "Explore What's New in v6.1"}</span>
                    </Link>
                    <a
                      href="/downloads/"
                      onClick={() => setActiveDropdown(null)}
                      className="inline-flex items-center gap-1 font-bold text-stone-700 hover:text-stone-900 hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>{isAr ? "تحميل التطبيقات المرافقة" : "Download Companion Apps"}</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI Agents (Direct Nav Item) */}
          <Link
            href="/product/botflow-studio"
            className="px-3 py-1.5 rounded-lg text-[13.5px] font-semibold text-stone-700 hover:text-stone-950 hover:bg-stone-50 transition-colors whitespace-nowrap"
          >
            {isAr ? "الوكلاء الأذكياء" : "AI Agents"}
          </Link>

          {/* Industries ▾ */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter("industries")}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => toggleDropdown("industries")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13.5px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeDropdown === "industries"
                  ? "bg-stone-100 text-stone-900 font-bold"
                  : "text-stone-700 hover:text-stone-950 hover:bg-stone-50"
              }`}
            >
              <span>{isAr ? "القطاعات" : "Industries"}</span>
              {activeDropdown === "industries" ? (
                <ChevronUp className="h-4 w-4 text-stone-900" />
              ) : (
                <ChevronDown className="h-4 w-4 text-stone-500" />
              )}
            </button>

            {activeDropdown === "industries" && (
              <div
                className={`absolute top-full left-1/2 -translate-x-1/2 pt-2.5 w-[880px] max-w-[calc(100vw-32px)] z-50 transition-all ${
                  isAr ? "text-right" : "text-left"
                }`}
                onMouseEnter={() => handleMouseEnter("industries")}
                onMouseLeave={handleMouseLeave}
              >
                <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                    {industryItems.map((item, i) => (
                      <Link
                        key={i}
                        href={item.href}
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-start gap-3.5 p-2 rounded-xl hover:bg-stone-50 transition group"
                      >
                        <div className={`h-8.5 w-8.5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition ${item.color}`}>
                          <item.icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <span className="text-[13.5px] font-bold text-stone-900 group-hover:text-blue-600 transition leading-tight block">
                            {isAr ? item.titleAr : item.titleEn}
                          </span>
                          <p className="text-[11.5px] text-stone-500 font-normal leading-relaxed line-clamp-2">
                            {isAr ? item.descAr : item.descEn}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>

                  <div className="pt-4 mt-4 border-t border-stone-100">
                    <Link
                      href="/features"
                      onClick={() => setActiveDropdown(null)}
                      className="flex items-center justify-between text-[12.5px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                    >
                      <span>{isAr ? "استعراض جميع حلول القطاعات والأنشطة التجارية →" : "See all business solutions & case studies →"}</span>
                      <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Resources ▾ */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter("resources")}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => toggleDropdown("resources")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13.5px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeDropdown === "resources"
                  ? "bg-stone-100 text-stone-900 font-bold"
                  : "text-stone-700 hover:text-stone-950 hover:bg-stone-50"
              }`}
            >
              <span>{isAr ? "المصادر" : "Resources"}</span>
              {activeDropdown === "resources" ? (
                <ChevronUp className="h-4 w-4 text-stone-900" />
              ) : (
                <ChevronDown className="h-4 w-4 text-stone-500" />
              )}
            </button>

            {activeDropdown === "resources" && (
              <div
                className={`absolute top-full left-1/2 -translate-x-1/2 pt-2.5 w-[880px] max-w-[calc(100vw-32px)] z-50 transition-all ${
                  isAr ? "text-right" : "text-left"
                }`}
                onMouseEnter={() => handleMouseEnter("resources")}
                onMouseLeave={handleMouseLeave}
              >
                <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                    {resourceItems.map((item, i) => (
                      <Link
                        key={i}
                        href={item.href}
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-start gap-3.5 p-2 rounded-xl hover:bg-stone-50 transition group"
                      >
                        <div className={`h-8.5 w-8.5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition ${item.color}`}>
                          <item.icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13.5px] font-bold text-stone-900 group-hover:text-blue-600 transition leading-tight">
                              {isAr ? item.titleAr : item.titleEn}
                            </span>
                            {"badgeEn" in item && item.badgeEn && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                {isAr ? item.badgeAr : item.badgeEn}
                              </span>
                            )}
                          </div>
                          <p className="text-[11.5px] text-stone-500 font-normal leading-relaxed line-clamp-2">
                            {isAr ? item.descAr : item.descEn}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>

                  <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-[12px]">
                    <Link
                      href="/book-demo"
                      onClick={() => setActiveDropdown(null)}
                      className="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      <Video className="h-3.5 w-3.5" />
                      <span>{isAr ? "احجز جلسة تجريبية مباشرة مع فريقنا →" : "Book a 1-on-1 Product Demo with our specialists →"}</span>
                    </Link>
                    <Link
                      href="/pricing"
                      onClick={() => setActiveDropdown(null)}
                      className="inline-flex items-center gap-1 font-bold text-stone-700 hover:text-stone-900 hover:underline"
                    >
                      <span>{isAr ? "خطط الأسعار والاشتراكات" : "View Subscription Plans"}</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pricing */}
          <Link
            href="/pricing"
            className="px-3 py-1.5 rounded-lg text-[13.5px] font-semibold text-stone-700 hover:text-stone-950 hover:bg-stone-50 transition-colors whitespace-nowrap"
          >
            {isAr ? "الأسعار" : "Pricing"}
          </Link>
        </nav>

        {/* 3. Right: Action Controls */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* Language Switcher */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-bold text-stone-800 bg-stone-100 border border-stone-200 hover:bg-stone-200 transition-colors"
            title={isAr ? "Switch to English" : "التحويل إلى العربية"}
          >
            <Globe className="h-3.5 w-3.5 text-emerald-600" />
            <span>{isAr ? "English" : "العربية"}</span>
          </button>

          <Link href="/book-demo">
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-lg border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800 text-[12px] font-semibold px-3 shadow-2xs"
            >
              <Video className="h-3.5 w-3.5 text-emerald-600 mr-1" />
              {isAr ? "عرض Meet" : "Demo"}
            </Button>
          </Link>

          <Link href="/admin">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-lg text-[12.5px] text-stone-600 hover:text-stone-900 hover:bg-stone-100 font-semibold px-3"
            >
              {isAr ? "دخول" : "Sign In"}
            </Button>
          </Link>

          <Link href="/signup">
            <Button
              size="sm"
              className="h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12.5px] font-bold px-4 transition shadow-xs flex items-center gap-1.5"
            >
              <span>{isAr ? "ابدأ مجاناً" : "Sign Up Free"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11.5px] font-bold text-stone-800 bg-stone-100 border border-stone-200"
          >
            <Globe className="h-3 w-3 text-emerald-600" />
            <span>{isAr ? "EN" : "عربي"}</span>
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 text-stone-600 hover:text-stone-950 rounded-md hover:bg-stone-100"
            aria-label="Toggle Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-b border-stone-200 bg-white p-4 space-y-3 shadow-xl max-h-[85vh] overflow-y-auto">
          <div className="flex flex-col space-y-1">
            <div className="font-bold text-[11px] text-stone-400 uppercase tracking-wider px-3 pt-1">
              {isAr ? "المنصات" : "Platforms"}
            </div>
            <div className="grid grid-cols-2 gap-1 px-2 py-1">
              {platformItems.slice(0, 6).map((item, idx) => (
                <Link
                  key={idx}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 p-2 rounded-lg bg-stone-50 text-[12px] font-semibold text-stone-800"
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{isAr ? item.titleAr : item.titleEn}</span>
                </Link>
              ))}
            </div>

            <div className="font-bold text-[11px] text-stone-400 uppercase tracking-wider px-3 pt-3">
              {isAr ? "الروابط الرئيسية" : "Main Navigation"}
            </div>
            <Link
              href="/product/botflow-studio"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-[13.5px] font-medium text-stone-700 hover:text-stone-900"
            >
              <span>{isAr ? "الوكلاء الأذكياء" : "AI Agents"}</span>
            </Link>
            <Link
              href="/features"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-[13.5px] font-medium text-stone-700 hover:text-stone-900"
            >
              <span>{isAr ? "القطاعات والحلول" : "Industries & Solutions"}</span>
            </Link>
            <Link
              href="/product/simulator"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-[13.5px] font-medium text-stone-700 hover:text-stone-900"
            >
              <span>{isAr ? "المحاكي المباشر" : "Live Simulator"}</span>
            </Link>
            <Link
              href="/pricing"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-[13.5px] font-medium text-stone-700 hover:text-stone-900"
            >
              <span>{isAr ? "الأسعار" : "Pricing"}</span>
            </Link>
            <Link
              href="/blog"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-[13.5px] font-medium text-stone-700 hover:text-stone-900"
            >
              <span>{isAr ? "المدونة" : "Blog"}</span>
            </Link>
            <Link
              href="/contact"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-[13.5px] font-medium text-stone-700 hover:text-stone-900"
            >
              <span>{isAr ? "اتصل بنا" : "Contact Desk"}</span>
            </Link>
            <Link
              href="/whats-new"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-[13.5px] font-medium text-stone-700 hover:text-stone-900"
            >
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                {isAr ? "ما الجديد" : "What's New"}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10.5px] font-bold">v6.1</span>
            </Link>
          </div>

          <div className="pt-3 border-t border-stone-200 flex flex-col gap-2">
            <Link href="/book-demo" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" className="w-full h-9 rounded-lg border-stone-200 bg-stone-50 text-[12px] text-stone-800 font-medium">
                <Video className="h-3.5 w-3.5 text-emerald-600 mr-1.5" />
                {isAr ? "حجز عرض Meet" : "Book Meet Demo"}
              </Button>
            </Link>
            <div className="flex gap-2">
              <Link href="/admin" className="flex-1" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" className="w-full h-9 rounded-lg border border-stone-200 text-[12px] text-stone-800 font-medium">
                  {isAr ? "دخول" : "Sign In"}
                </Button>
              </Link>
              <Link href="/signup" className="flex-1" onClick={() => setMobileOpen(false)}>
                <Button className="w-full h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold flex items-center justify-center gap-1.5">
                  <span>{isAr ? "ابدأ مجاناً" : "Sign Up Free"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export function SiteFooter() {
  const { isAr } = useLanguage()

  return (
    <footer className="border-t border-[#E5E7EB] bg-[#F9FAFB] text-[#374151]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10">
          {/* Brand Column */}
          <div className="md:col-span-5 space-y-4">
            <Brand size="md" className="text-[#000000]" />
            <p className="text-[13.5px] text-[#374151] font-normal leading-relaxed max-w-sm">
              {isAr
                ? "منصة تشغيل واتساب الموحدة للأعمال: واجهة WhatsApp Cloud API الرسمية، صندوق وارد متعدد الموظفين، شات بوت الذكاء الاصطناعي، ومدفوعات أموال باي بالريال العماني."
                : "The operational WhatsApp Business platform: official Meta Cloud API, multi-agent CRM inbox, conversational AI botflows, and native AmwalPay card payments."}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-white text-[#111827] border border-[#D1D5DB] text-[11.5px] font-bold shadow-xs">
                <span className="h-2 w-2 rounded-full bg-[#00E785] border border-[#047857]" />
                {isAr ? "الحالة: 100% تعمل" : "All Systems Operational"}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-white text-[#111827] border border-[#D1D5DB] text-[11.5px] font-semibold shadow-xs">
                <ShieldCheck className="h-4 w-4 text-[#047857]" />
                {isAr ? "Meta Cloud Provider" : "Meta Cloud Provider"}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-[12.5px] font-extrabold uppercase tracking-wider text-[#000000]">
              {isAr ? "المنصة" : "Platform"}
            </h4>
            <ul className="space-y-2.5 text-[13.5px]">
              <li><Link href="/features" className="text-[#374151] hover:text-[#000000] font-medium transition-colors">{isAr ? "المميزات" : "Features"}</Link></li>
              <li><Link href="/product/smart-menu-ordering" className="text-[#047857] hover:text-[#000000] font-bold transition-colors">{isAr ? "المنيو الذكي والطلبات" : "Smart Menu & Ordering"}</Link></li>
              <li><Link href="/product/team-inbox" className="text-[#374151] hover:text-[#000000] font-medium transition-colors">{isAr ? "صندوق الفريق" : "Team Inbox"}</Link></li>
              <li><Link href="/product/botflow-studio" className="text-[#374151] hover:text-[#000000] font-medium transition-colors">{isAr ? "استوديو مسارات البوت" : "Botflow Studio"}</Link></li>
              <li><Link href="/product/digital-vcard" className="text-[#374151] hover:text-[#000000] font-medium transition-colors">{isAr ? "بطاقات العمل الرقمية" : "Digital Business Cards"}</Link></li>
              <li><Link href="/product/digital-qr-reviews" className="text-[#374151] hover:text-[#000000] font-medium transition-colors">{isAr ? "مراجعات QR الرقمية" : "Digital QR Reviews"}</Link></li>
              <li><Link href="/product/facebook-instagram-automation" className="text-[#374151] hover:text-[#000000] font-medium transition-colors">{isAr ? "أتمتة فيسبوك وإنستغرام" : "Facebook & Instagram"}</Link></li>
              <li><Link href="/pricing" className="text-[#374151] hover:text-[#000000] font-medium transition-colors">{isAr ? "الأسعار" : "Pricing"}</Link></li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h4 className="text-[12.5px] font-extrabold uppercase tracking-wider text-[#000000]">
              {isAr ? "القطاعات" : "Industries"}
            </h4>
            <ul className="space-y-2.5 text-[13.5px]">
              <li><Link href="/solutions/restaurants-dining" className="text-[#374151] hover:text-[#000000] font-medium transition-colors">{isAr ? "المطاعم والمقاهي" : "Restaurants & Cafes"}</Link></li>
              <li><Link href="/solutions/ecommerce-online-stores" className="text-[#374151] hover:text-[#000000] font-medium transition-colors">{isAr ? "المتاجر والتجزئة" : "Ecommerce & Retail"}</Link></li>
              <li><Link href="/solutions/tours-safari-musandam" className="text-[#374151] hover:text-[#000000] font-medium transition-colors">{isAr ? "السياحة ورحلات السفاري" : "Tours & Safari"}</Link></li>
              <li><Link href="/solutions/clinics-hospitals-health" className="text-[#374151] hover:text-[#000000] font-medium transition-colors">{isAr ? "العيادات والمستشفيات" : "Healthcare & Clinics"}</Link></li>
              <li><Link href="/solutions/salons-beauty-spas" className="text-[#374151] hover:text-[#000000] font-medium transition-colors">{isAr ? "الصالونات والسبا" : "Salons & Spas"}</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h4 className="text-[12.5px] font-extrabold uppercase tracking-wider text-[#000000]">
              {isAr ? "الشركة" : "Company"}
            </h4>
            <ul className="space-y-2.5 text-[13.5px]">
              <li><Link href="/contact" className="text-[#047857] hover:text-[#000000] font-bold transition-colors">{isAr ? "اتصل بنا" : "Contact Desk"}</Link></li>
              <li><a href="/downloads/" className="text-[#047857] hover:text-[#000000] font-bold transition-colors">{isAr ? "تحميل التطبيقات" : "Download Apps"}</a></li>
              <li><Link href="/whats-new" className="text-[#374151] hover:text-[#000000] font-medium transition-colors">{isAr ? "التحديثات" : "Changelog"}</Link></li>
              <li><Link href="/docs" className="text-[#374151] hover:text-[#000000] font-medium transition-colors">{isAr ? "المطورين" : "REST API"}</Link></li>
              <li><Link href="/privacy" className="text-[#374151] hover:text-[#000000] font-medium transition-colors">{isAr ? "الخصوصية" : "Privacy"}</Link></li>
              <li><Link href="/terms" className="text-[#374151] hover:text-[#000000] font-medium transition-colors">{isAr ? "الشروط" : "Terms"}</Link></li>
            </ul>
          </div>
        </div>

        {/* SEO Cross-Links Section */}
        <div className="mt-10 pt-6 border-t border-[#E5E7EB] grid grid-cols-2 sm:grid-cols-4 gap-6 text-[12px] text-[#4B5563]">
          <div>
            <h5 className="font-bold text-[#111827] mb-2 uppercase text-[11px] tracking-wider">
              {isAr ? "حلول عمان" : "WhatsApp Oman"}
            </h5>
            <ul className="space-y-1.5">
              <li><Link href="/whatsapp-business-api-oman" className="hover:text-emerald-700">{isAr ? "واتساب بزنس API عمان" : "WhatsApp Business API Oman"}</Link></li>
              <li><Link href="/whatsapp-automation-oman" className="hover:text-emerald-700">{isAr ? "أتمتة واتساب عمان" : "WhatsApp Automation Oman"}</Link></li>
              <li><Link href="/whatsapp-chatbot-oman" className="hover:text-emerald-700">{isAr ? "شات بوت واتساب عمان" : "WhatsApp Chatbot Oman"}</Link></li>
              <li><Link href="/whatsapp-crm-oman" className="hover:text-emerald-700">{isAr ? "واتساب CRM عمان" : "WhatsApp CRM Oman"}</Link></li>
              <li><Link href="/whatsapp-marketing-oman" className="hover:text-emerald-700">{isAr ? "تسويق واتساب عمان" : "WhatsApp Marketing Oman"}</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-[#111827] mb-2 uppercase text-[11px] tracking-wider">
              {isAr ? "المقارنات" : "Comparisons"}
            </h5>
            <ul className="space-y-1.5">
              <li><Link href="/compare/fizmoh-vs-wati" className="hover:text-emerald-700">Fizmoh vs WATI</Link></li>
              <li><Link href="/compare/fizmoh-vs-interakt" className="hover:text-emerald-700">Fizmoh vs Interakt</Link></li>
              <li><Link href="/compare/fizmoh-vs-twilio" className="hover:text-emerald-700">Fizmoh vs Twilio</Link></li>
              <li><Link href="/compare/fizmoh-vs-respond-io" className="hover:text-emerald-700">Fizmoh vs Respond.io</Link></li>
              <li><Link href="/compare/fizmoh-vs-sleekflow" className="hover:text-emerald-700">Fizmoh vs SleekFlow</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-[#111827] mb-2 uppercase text-[11px] tracking-wider">
              {isAr ? "المدن والخليج" : "GCC Locations"}
            </h5>
            <ul className="space-y-1.5">
              <li><Link href="/locations/muscat" className="hover:text-emerald-700">{isAr ? "مسقط، سلطنة عمان" : "Muscat, Oman"}</Link></li>
              <li><Link href="/locations/dubai" className="hover:text-emerald-700">{isAr ? "دبي، الإمارات" : "Dubai, UAE"}</Link></li>
              <li><Link href="/locations/riyadh" className="hover:text-emerald-700">{isAr ? "الرياض، السعودية" : "Riyadh, Saudi Arabia"}</Link></li>
              <li><Link href="/locations/doha" className="hover:text-emerald-700">{isAr ? "الدوحة، قطر" : "Doha, Qatar"}</Link></li>
              <li><Link href="/locations/kuwait-city" className="hover:text-emerald-700">{isAr ? "مدينة الكويت" : "Kuwait City"}</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-[#111827] mb-2 uppercase text-[11px] tracking-wider">
              {isAr ? "المقالات والأدلة" : "Popular Guides"}
            </h5>
            <ul className="space-y-1.5">
              <li><Link href="/blog/whatsapp-business-api-oman-guide" className="hover:text-emerald-700">{isAr ? "دليل واتساب API عمان 2026" : "WhatsApp API Oman Guide"}</Link></li>
              <li><Link href="/blog/accept-online-payments-whatsapp-oman-amwalpay" className="hover:text-emerald-700">{isAr ? "دفع أموال باي واتساب" : "AmwalPay WhatsApp Payments"}</Link></li>
              <li><Link href="/blog/restaurant-qr-code-ordering-system-oman" className="hover:text-emerald-700">{isAr ? "منيو المطاعم وKDS عمان" : "Restaurant QR Ordering"}</Link></li>
              <li><Link href="/blog/google-review-qr-code-cards-oman-reputation" className="hover:text-emerald-700">{isAr ? "بطاقات تقييمات جوجل" : "Google Review QR Cards"}</Link></li>
              <li><Link href="/blog/digital-business-cards-nfc-vcard-oman" className="hover:text-emerald-700">{isAr ? "كروت العمل الرقمية NFC" : "Digital NFC vCards"}</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#E5E7EB] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[#4B5563]">
          <p className="font-medium">© {new Date().getFullYear()} Fizmoh Cloud Platform. All rights reserved.</p>
          <div className="flex items-center gap-3 font-semibold text-[#374151]">
            <span>Meta WhatsApp Cloud API</span>
            <span>•</span>
            <span>AmwalPay Gateway</span>
            <span>•</span>
            <span>ISO 27001</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
