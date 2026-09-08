"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Workflow,
  Video,
  Inbox,
  Megaphone,
  ShoppingBag,
  Bot,
  CalendarClock,
  CreditCard,
  Headset,
  Building2,
  Compass,
  Utensils,
  Layers,
  Globe,
  Zap,
  Lock,
  MessageSquare,
  Search,
  Activity,
  Sliders,
  Send,
  BarChart3,
  HelpCircle,
  FileCheck,
  RefreshCw,
  QrCode,
  Tag,
  Users,
  Phone,
  Smartphone,
  UserCheck,
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { WhatsAppDemo } from "@/components/whatsapp-demo"
import { SiteFooter, SiteHeader } from "@/components/site-header"
import { useLanguage } from "@/context/language-context"

type PageKind = "features" | "pricing" | "simulator" | "templates" | "appointments" | "tours" | "woocommerce" | "restaurant" | "payments" | "crm"

interface PageContent {
  eyebrowEn: string
  eyebrowAr: string
  titleEn: string
  titleAr: string
  descriptionEn: string
  descriptionAr: string
  bulletsEn: string[]
  bulletsAr: string[]
  keywordsEn: string[]
  keywordsAr: string[]
}

const CONTENT: Record<PageKind, PageContent> = {
  features: {
    eyebrowEn: "Comprehensive Enterprise Suite",
    eyebrowAr: "منظومة تشغيل متكاملة للمؤسسات",
    titleEn: "The Complete WhatsApp Operating System for Growth.",
    titleAr: "المنصة الشاملة لإدارة عمليات، تسويق، ومبيعات واتساب.",
    descriptionEn: "From official Meta Cloud API connectivity and multi-agent CRM to conversational AI bots, AmwalPay payments, and vertical industry engines.",
    descriptionAr: "من الربط الرسمي بـ Meta Cloud API وصندوق الوارد المشترك إلى شات بوت الذكاء الاصطناعي ومدفوعات أموال باي وأنظمة القطاعات المخصصة.",
    bulletsEn: [
      "Official WhatsApp Business Cloud API & Green Tick verification",
      "Multi-agent shared team inbox with human handover & smart replies",
      "No-code visual bot builder with 25+ turnkey industry templates",
      "Broadcast promotional campaigns with 98% open rates & segmentation",
      "AmwalPay Oman card checkout with verified webhook callbacks",
      "Two-way WooCommerce synchronization & native WhatsApp catalogs",
      "Multi-tenant SaaS workspace architecture with enterprise RBAC",
    ],
    bulletsAr: [
      "واجهة WhatsApp Cloud API الرسمية والتقديم على شارة التوثيق الخضراء",
      "صندوق وارد متعدد الموظفين مع تحويل سلس ودعم الردود الذكية",
      "منشئ بوت تفاعلي بدون برمجة مع أكثر من 25 قالباً تشغيلياً جاهزاً",
      "بث رسائل ترويجية جماعية بنسبة فتح 98% وتقسيم متقدم للجمهور",
      "دفع إلكتروني فوري عبر بطاقات البنك وبوابة أموال باي (OMR)",
      "مزامنة ثنائية مع ووكومرس (WooCommerce) وكتالوج واتساب المدمج",
      "بنية سحابية متعددة المستأجرين مع إدارة كاملة للصلاحيات والأمان",
    ],
    keywordsEn: ["WhatsApp Business API", "WhatsApp Cloud API", "WhatsApp multi-agent inbox", "WhatsApp chatbot", "WhatsApp marketing software", "AmwalPay", "WhatsApp CRM"],
    keywordsAr: ["واتساب بزنس", "واتساب كلاود API", "صندوق وارد متعدد الموظفين", "شات بوت واتساب", "تسويق واتساب", "أموال باي", "CRM واتساب"],
  },
  templates: {
    eyebrowEn: "25+ Ready Flow Templates",
    eyebrowAr: "25+ قالباً جاهزاً للتشغيل",
    titleEn: "Deploy Proven Conversational Flows in Under 5 Minutes.",
    titleAr: "أطلق مسارات محادثة مجربة وناجحة لشركتك خلال أقل من 5 دقائق.",
    descriptionEn: "Jumpstart WhatsApp automation with pre-configured flows for Digital Marketing Agencies, Healthcare Clinics, Safari Tours, Restaurants, and E-Commerce stores.",
    descriptionAr: "ابدأ أتمتة أعمالك بقوالب احترافية مسبقة الإعداد لوكالات التسويق، المراكز الطبية، شركات السياحة، المطاعم، والمتاجر الإلكترونية.",
    bulletsEn: [
      "Digital Marketing Agency lead qualification and proposal booking",
      "Hospital & Oncology Day Care appointment & bed scheduling",
      "Tour & Safari live availability, slot booking & voucher issuance",
      "Restaurant digital menu browsing, table reservations & kitchen orders",
      "WooCommerce abandoned cart recovery & order dispatch tracking",
    ],
    bulletsAr: [
      "تأهيل عملاء وكالات التسويق وجدولة عروض الأسعار والاجتماعات",
      "حجز مواعيد العيادات الطبية وإدارة أسرة الرعاية النهارية",
      "عرض توافر الجولات السياحية والسفاري وحجز المواعيد وإصدار القسائم",
      "استعراض منيو المطاعم، حجز الطاولات، وتوجيه طلبات التوصيل للمطبخ",
      "استرجاع السلات المتروكة في متاجر ووكومرس وتتبع مسار الشحنات",
    ],
    keywordsEn: ["WhatsApp bot builder", "no-code WhatsApp bot", "WhatsApp automation", "WhatsApp templates", "WhatsApp workflow automation"],
    keywordsAr: ["منشئ بوت واتساب", "شات بوت بدون كود", "أتمتة واتساب", "قوالب واتساب", "سير عمل واتساب"],
  },
  appointments: {
    eyebrowEn: "Appointment & Healthcare Automation",
    eyebrowAr: "أتمتة المواعيد والقطاع الصحي",
    titleEn: "Fill Calendars and Clinical Beds Automatically via WhatsApp.",
    titleAr: "املأ جداول المواعيد والأسرة الطبية آلياً عبر محادثات واتساب المباشرة.",
    descriptionEn: "Enable 24/7 self-service scheduling with real-time calendar availability, staff selection, Google Meet link generation, and automated 24-hour reminder sequences.",
    descriptionAr: "وفّر لعملائك حجز المواعيد الذاتي على مدار الساعة مع عرض التوافر اللحظي، واختيار الأخصائي، وروابط Google Meet، والتذكيرات الآلية.",
    bulletsEn: [
      "Real-time calendar slot availability with double-booking prevention",
      "Specialist and doctor profile selection with service durations",
      "Chemotherapy Day Care bed allocation (30-bed management map)",
      "Automated WhatsApp appointment confirmations and ICS calendar files",
      "Pre-appointment preparation checklists that reduce no-shows by 80%",
    ],
    bulletsAr: [
      "توافر فوري للمواعيد والفتحات الزمنية مع منع التعارض المزدوج",
      "اختيار الأخصائي أو الطبيب وتحديد مدة وتفاصيل الخدمة بدقة",
      "إدارة وتوزيع أسرة الرعاية النهارية والعلاج الكيماوي (خريطة 30 سريراً)",
      "تأكيدات فورية للموعد عبر واتساب مع ملف التقويم المباشر (ICS)",
      "إرسال تعليمات ما قبل الجلسة لخفض نسبة التخلف عن الحضور بـ 80%",
    ],
    keywordsEn: ["WhatsApp appointment booking", "WhatsApp healthcare bot", "WhatsApp clinic management", "WhatsApp calendar automation"],
    keywordsAr: ["حجز مواعيد واتساب", "بوت العيادات الطبية", "إدارة مواعيد المستشفيات", "أتمتة مواعيد واتساب"],
  },
  tours: {
    eyebrowEn: "Tour Operators & Tourism Engine",
    eyebrowAr: "محرك شركات السياحة والجولات",
    titleEn: "Direct Tour & Safari Booking with Instant Card Payments.",
    titleAr: "حجز مباشر للجولات السياحية ورحلات السفاري مع الدفع الإلكتروني الفوري.",
    descriptionEn: "Empower travelers to explore itineraries, select departure dates, complete AmwalPay card payments, and receive QR boarding vouchers directly in WhatsApp.",
    descriptionAr: "مكّن السياح من استعراض البرامج والأنشطة، وتحديد مواعيد المغادرة، وسداد الرسوم عبر أموال باي، واستلام قسيمة الحجز المشفرة (QR) فوراً.",
    bulletsEn: [
      "Interactive tour catalog with photos, inclusions, and difficulty levels",
      "Live capacity and seat availability tracking per departure slot",
      "AmwalPay OMR payment link generation with automated receipt",
      "Instant PDF QR ticket generation and Google Maps pickup links",
      "Automated 24-hour pre-trip packing reminders and weather updates",
    ],
    bulletsAr: [
      "كتالوج جولات تفاعلي يشمل الصور، المزايا المشمولة، ومستويات الصعوبة",
      "تتبع فوري للطاقة الاستيعابية والمقاعد الشاغرة لكل رحلة",
      "إنشاء روابط دفع بالريال العماني عبر أموال باي مع إيصال فوري",
      "إصدار تذكرة إلكترونية مشفرة بـ QR وإرسال موقع التجمع عبر خرائط جوجل",
      "تذكيرات آلية قبل الرحلة بـ 24 ساعة تتضمن تعليمات الطقس والتجهيزات",
    ],
    keywordsEn: ["WhatsApp tour booking", "WhatsApp safari reservations", "WhatsApp travel ticketing", "WhatsApp Oman tourism"],
    keywordsAr: ["حجز جولات سياحية واتساب", "حجز سفاري عمان واتساب", "تذاكر سياحية واتساب", "سياحة سلطنة عمان واتساب"],
  },
  woocommerce: {
    eyebrowEn: "WooCommerce & E-Commerce Integration",
    eyebrowAr: "تكامل متاجر ووكومرس والتجارة",
    titleEn: "Turn WhatsApp into Your Most Profitable Sales Channel.",
    titleAr: "حوّل واتساب إلى القناة البيعية الأكثر ربحية لمتجرك الإلكتروني.",
    descriptionEn: "Bi-directional WooCommerce catalog synchronization, in-chat shopping cart management, instant AmwalPay card checkout, and 30-minute abandoned cart recovery.",
    descriptionAr: "مزامنة ثنائية لكتالوج ووكومرس، وإدارة سلة الشراء داخل المحادثة، ودفع إلكتروني بأموال باي، واسترجاع آلي للسلات المتروكة خلال 30 دقيقة.",
    bulletsEn: [
      "Real-time product and stock synchronization with WooCommerce store",
      "Interactive multi-product catalog messages and category browsing",
      "One-click AmwalPay card checkout in OMR with instant order status update",
      "30-minute automated abandoned cart recovery sequences with 35% conversion",
      "Live order status, tracking links, and delivery dispatch updates",
    ],
    bulletsAr: [
      "مزامنة فورية للمنتجات والمخزون مع متجر ووكومرس الخاص بك",
      "رسائل كتالوج تفاعلية وتصفح مرن للأقسام والمنتجات داخل الشات",
      "دفع إلكتروني مباشر عبر أموال باي مع تحديث فوري لحالة الطلب بالمتجر",
      "أتمتة استرجاع السلات المتروكة بعد 30 دقيقة بنسبة تحويل تتجاوز 35%",
      "إرسال إشعارات الشحن الفورية ورابط تتبع مسار المندوب للعميل",
    ],
    keywordsEn: ["WhatsApp WooCommerce", "WhatsApp abandoned cart recovery", "WhatsApp ecommerce checkout", "WhatsApp product catalog"],
    keywordsAr: ["ووكومرس واتساب", "استرجاع السلات المتروكة واتساب", "دفع متجر واتساب", "كتالوج منتجات واتساب"],
  },
  restaurant: {
    eyebrowEn: "Restaurant & Dining POS Automation",
    eyebrowAr: "أتمتة المطاعم والطلبات ونقاط البيع",
    titleEn: "QR Menu Browsing, Table Bookings, and Kitchen Order Routing.",
    titleAr: "تصفح المنيو عبر الباركود، وحجز الطاولات، وتوجيه طلبات الطعام للمطبخ.",
    descriptionEn: "Streamline restaurant operations with QR code digital menus, conversational table reservations, takeaway ordering with AmwalPay card checkout, and direct kitchen routing.",
    descriptionAr: "بسّط إدارة مطعمك مع قوائم الطعام الرقمية عبر الرمز الشريطي، وحجوزات الطاولات التفاعلية، والطلب المسبق والدفع الإلكتروني عبر أموال باي.",
    bulletsEn: [
      "Table-specific QR code scanning that launches instant WhatsApp menu",
      "Category and dish customization with add-ons and dietary notes",
      "Real-time table availability and reservation confirmation",
      "Direct Kitchen Display System (KDS) order dispatch and POS sync",
      "Takeaway and delivery order placement with AmwalPay card checkout",
    ],
    bulletsAr: [
      "مسح الباركود على الطاولة لبدء المحادثة واستعراض المنيو التفاعلي",
      "تخصيص الوجبات والإضافات والملاحظات الغذائية بسهولة تامة",
      "تأكيد فوري لحجوزات الطاولات حسب التوافر في الصالة",
      "إرسال الطلبات مباشرة لشاشة المطبخ (KDS) ومزامنتها مع الكاشير",
      "دعم طلبات الاستلام والتوصيل مع الدفع الإلكتروني عبر أموال باي",
    ],
    keywordsEn: ["WhatsApp restaurant ordering", "WhatsApp food menu", "WhatsApp table booking", "WhatsApp dining POS"],
    keywordsAr: ["طلب طعام عبر واتساب", "منيو مطعم واتساب", "حجز طاولات مطاعم واتساب", "نظام نقاط بيع واتساب"],
  },
  payments: {
    eyebrowEn: "AmwalPay Online Payments (OMR)",
    eyebrowAr: "مدفوعات أموال باي بالريال العماني",
    titleEn: "Accept In-Chat Card Payments in Omani Rials Instantly.",
    titleAr: "اقبل الدفع ببطاقات البنك داخل محادثات واتساب بالريال العماني فوراً.",
    descriptionEn: "Generate secure AmwalPay hosted payment links directly in botflows and agent inboxes, with instant cryptographic webhook callbacks and automated e-receipts.",
    descriptionAr: "أنشئ روابط دفع آمنة عبر بوابة أموال باي داخل سيناريوهات البوت وصندوق الوارد، مع توثيق مشفر للإشعارات وإصدار فواتير إلكترونية.",
    bulletsEn: [
      "Direct AmwalPay gateway integration with OMR currency settlement",
      "Secure in-chat payment link insertion with unique transaction IDs",
      "Cryptographically verified webhooks for instant order status updates",
      "Automated PDF tax invoices delivered directly via WhatsApp",
      "Full transaction reporting, refunds, and reconciliation in one dashboard",
    ],
    bulletsAr: [
      "تكامل مباشر مع بوابة أموال باي العمانية والتسوية بالريال العماني",
      "إدراج روابط الدفع الآمنة داخل الشات مع رقم مرجعي فريد لكل معاملة",
      "توثيق إشعارات Webhook مشفراً لتحديث حالة الدفع والطلب لحظياً",
      "إصدار الفاتورة الضريبية الإلكترونية (PDF) وإرسالها للعميل تلقائياً",
      "تقارير شاملة للمعاملات، والمبالغ المستردة، والتسويات المالية في لوحة واحدة",
    ],
    keywordsEn: ["AmwalPay WhatsApp", "WhatsApp payment gateway", "WhatsApp OMR payments", "WhatsApp online checkout Oman"],
    keywordsAr: ["أموال باي واتساب", "بوابة دفع واتساب عمان", "مدفوعات ريال عماني واتساب", "دفع إلكتروني واتساب"],
  },
  crm: {
    eyebrowEn: "Multi-Agent Shared CRM Inbox",
    eyebrowAr: "صندوق الوارد المشترك وإدارة علاقات العملاء",
    titleEn: "One Shared WhatsApp Inbox for Your Entire Sales & Support Team.",
    titleAr: "صندوق وارد واتساب موحد لفريق المبيعات والدعم الفني بالكامل.",
    descriptionEn: "Unify customer conversations with multi-agent routing, 24-hour service window countdowns, internal team notes, canned responses, and rich customer profiles.",
    descriptionAr: "وحّد محادثات العملاء مع التوزيع الآلي على الموظفين، والعد التنازلي لنافذة الـ 24 ساعة، والملاحظات الداخلية، والردود السريعة، وسجل العميل الكامل.",
    bulletsEn: [
      "Multiple staff members answering from one official WhatsApp number",
      "Automated conversation assignment by team, skill, or round-robin",
      "Private internal staff notes invisible to the WhatsApp customer",
      "24-hour customer service window timer with automated template transition",
      "Custom contact properties, lifetime value tracking, and engagement history",
    ],
    bulletsAr: [
      "رد عدة موظفين في وقت واحد من رقم واتساب رسمي موحد",
      "توزيع آلي للمحادثات حسب القسم أو التخصص أو التناوب العادل",
      "ملاحظات داخلية خاصة بين الموظفين دون أن يراها العميل في الشات",
      "مؤقت لنافذة الـ 24 ساعة مع الانتقال الآلي للقوالب المعتمدة عند انقضائها",
      "حقول مخصصة لبيانات العميل، وتتبع القيمة الإجمالية للمشتريات وسجل التفاعل",
    ],
    keywordsEn: ["WhatsApp CRM", "WhatsApp multi-agent inbox", "WhatsApp team inbox", "WhatsApp customer support software"],
    keywordsAr: ["CRM واتساب", "صندوق وارد متعدد الموظفين", "إدارة محادثات الفريق واتساب", "برنامج خدمة عملاء واتساب"],
  },
  simulator: {
    eyebrowEn: "Live WhatsApp Interactive Simulator",
    eyebrowAr: "المحاكي التفاعلي المباشر لواتساب",
    titleEn: "Test Real-World WhatsApp Workflows in Real Time.",
    titleAr: "اختبر سيناريوهات ومسارات محادثة واتساب الحية مباشرة.",
    descriptionEn: "Click interactive buttons, test Gulf Arabic AI understanding, experience AmwalPay checkout, and preview appointment scheduling.",
    descriptionAr: "انقر على الأزرار التفاعلية، واختبر استجابة الذكاء الاصطناعي باللهجة الخليجية، وجرّب سداد أموال باي وحجز المواعيد.",
    bulletsEn: [
      "Clickable quick reply buttons and conversational AI branching",
      "Live typing indicators and instantaneous automated response simulation",
      "AmwalPay card payment summary card rendering with OMR checkout",
      "Instant industry switching: Marketing Agency, Healthcare Clinic, Safari Tours & Luxury Store",
    ],
    bulletsAr: [
      "أزرار تفاعلية وردود سريعة مع تفرعات ذكية بالذكاء الاصطناعي",
      "مؤشرات كتابة حية واستجابات فورية تحاكي المحادثة الحقيقية",
      "عرض بطاقات ملخص الدفع عبر بوابة أموال باي بالريال العماني",
      "تبديل فوري بين 4 قطاعات: وكالات التسويق، العيادات الطبية، رحلات السفاري، ومتاجر التجزئة",
    ],
    keywordsEn: ["WhatsApp bot simulator", "interactive WhatsApp demo", "WhatsApp chatbot preview", "WhatsApp live test"],
    keywordsAr: ["محاكي بوت واتساب", "تجربة شات بوت واتساب", "معاينة بوت واتساب", "اختبار واتساب مباشر"],
  },
  pricing: {
    eyebrowEn: "Transparent Plans & Pricing",
    eyebrowAr: "الأسعار والباقات الشفافة",
    titleEn: "Scale Conversations with Predictable, Flat-Rate Subscriptions.",
    titleAr: "نمّ محادثاتك ومبيعاتك باشتراكات واضحة وبدون أي رسوم خفية.",
    descriptionEn: "Every plan includes official Meta Cloud API connectivity, full platform modules, and a 14-day free trial. Zero markup on official Meta conversation rates.",
    descriptionAr: "تشمل جميع الباقات الربط الرسمي بـ Meta Cloud API، وكافة أدوات المنصة، مع 14 يوماً تجربة مجانية. بدون أي رسوم إضافية على رسوم Meta.",
    bulletsEn: [
      "14-day free trial on all plans without credit card",
      "Official Meta WhatsApp Cloud API connectivity",
      "Multi-agent shared team inbox with unlimited staff seats",
      "Visual botflow builder with generative AI & dialect support",
      "AmwalPay Oman direct online card checkout",
    ],
    bulletsAr: [
      "14 يوماً تجربة مجانية لكافة الباقات بدون بطاقة بنكية",
      "ربط مباشر ورسمي بواجهة Meta WhatsApp Cloud API",
      "صندوق وارد متعدد الموظفين مع إمكانية إضافة فريق العمل",
      "منشئ بوت تفاعلي بالذكاء الاصطناعي مع دعم اللهجات الخليجية",
      "بوابة دفع إلكتروني مباشرة عبر أموال باي في سلطنة عمان",
    ],
    keywordsEn: ["WhatsApp API pricing", "WhatsApp Business pricing", "WhatsApp marketing cost", "WhatsApp bot pricing"],
    keywordsAr: ["أسعار واتساب API", "باقات واتساب بزنس", "تكلفة تسويق واتساب", "أسعار بوت واتساب"],
  },
}

// 200+ Categorized Keywords
const KEYWORD_CLUSTERS = [
  {
    titleEn: "Core WhatsApp Business (20)",
    titleAr: "المنظومة الأساسية لواتساب بزنس",
    icon: WhatsAppIcon,
    keywordsEn: [
      "WhatsApp Business API", "WhatsApp Business Platform", "WhatsApp Cloud API", "WhatsApp Business App", "WhatsApp for Business",
      "WhatsApp API pricing", "WhatsApp Business verification", "WhatsApp green tick", "WhatsApp Business account setup", "WhatsApp catalog",
      "WhatsApp Business profile", "WhatsApp Business tools", "WhatsApp Business features", "official WhatsApp API provider", "WhatsApp BSP",
      "WhatsApp Business API integration", "WhatsApp multi-agent inbox", "WhatsApp Business number", "WhatsApp Business dashboard", "WhatsApp Business plans"
    ],
    keywordsAr: [
      "واتساب بزنس API", "منصة واتساب للأعمال", "واتساب كلاود API", "تطبيق واتساب بزنس", "واتساب للشركات",
      "أسعار واتساب API", "توثيق حساب واتساب بزنس", "علامة التوثيق الخضراء لواتساب", "إعداد حساب واتساب بزنس", "كتالوج واتساب للأعمال",
      "الملف التجاري لواتساب", "أدوات واتساب بزنس", "ميزات واتساب للأعمال", "مزود واتساب API رسمي", "مزود حلول واتساب BSP",
      "ربط وتكامل واتساب API", "صندوق وارد متعدد الموظفين", "رقم واتساب تجاري رسمي", "لوحة تحكم واتساب بزنس", "باقات واتساب للأعمال"
    ],
  },
  {
    titleEn: "WhatsApp Marketing & Broadcasts (25)",
    titleAr: "التسويق وحملات البث الجماعي",
    icon: Megaphone,
    keywordsEn: [
      "WhatsApp marketing", "WhatsApp marketing software", "WhatsApp bulk messaging", "WhatsApp broadcast messages", "WhatsApp marketing campaigns",
      "WhatsApp marketing tool", "WhatsApp mass messaging", "WhatsApp promotional messages", "WhatsApp marketing automation", "WhatsApp lead generation",
      "WhatsApp customer engagement", "WhatsApp remarketing", "WhatsApp drip campaigns", "WhatsApp newsletter", "WhatsApp marketing platform",
      "WhatsApp blast", "WhatsApp marketing strategy", "WhatsApp marketing ROI", "WhatsApp opt-in marketing", "WhatsApp promotional campaigns",
      "WhatsApp promotional broadcasts", "WhatsApp message open rate", "WhatsApp click-through rate", "WhatsApp marketing analytics", "WhatsApp audience segmentation"
    ],
    keywordsAr: [
      "تسويق عبر واتساب", "برنامج تسويق واتساب", "إرسال رسائل واتساب جماعية", "رسائل البث عبر واتساب", "حملات تسويق واتساب",
      "أداة تسويق واتساب", "إرسال رسائل واتساب بكميات كبيرة", "رسائل واتساب الترويجية", "أتمتة تسويق واتساب", "توليد عملاء محتملين عبر واتساب",
      "تفاعل العملاء على واتساب", "إعادة استهداف واتساب", "حملات التقطير عبر واتساب", "نشرة واتساب الإخبارية", "منصة تسويق واتساب",
      "إرسال رسائل واتساب دفعة واحدة", "استراتيجية تسويق واتساب", "عائد استثمار تسويق واتساب", "تسويق واتساب بموافقة العميل", "حملات ترويجية عبر واتساب",
      "بث رسائل ترويجية واتساب", "معدل فتح رسائل واتساب", "معدل النقر على رسائل واتساب", "تحليلات تسويق واتساب", "تقسيم جمهور واتساب"
    ],
  },
  {
    titleEn: "WhatsApp Chatbot & Automation (25)",
    titleAr: "الشات بوت وأتمتة الذكاء الاصطناعي",
    icon: Bot,
    keywordsEn: [
      "WhatsApp chatbot", "WhatsApp bot", "WhatsApp AI bot", "WhatsApp chatbot builder", "WhatsApp auto reply",
      "WhatsApp automated messages", "WhatsApp conversational AI", "WhatsApp bot integration", "WhatsApp bot for business", "WhatsApp customer service bot",
      "WhatsApp FAQ bot", "WhatsApp lead qualification bot", "WhatsApp interactive messages", "WhatsApp quick replies", "WhatsApp list messages",
      "WhatsApp bot templates", "WhatsApp flow builder", "WhatsApp chatbot platform", "WhatsApp chatbot pricing", "WhatsApp ChatGPT integration",
      "WhatsApp AI customer support", "WhatsApp automated responses", "WhatsApp smart replies", "WhatsApp rule-based bot", "WhatsApp NLP bot"
    ],
    keywordsAr: [
      "شات بوت واتساب", "بوت واتساب", "بوت واتساب بالذكاء الاصطناعي", "منشئ شات بوت واتساب", "رد تلقائي على واتساب",
      "رسائل واتساب التلقائية", "الذكاء الاصطناعي التفاعلي لواتساب", "ربط بوت واتساب", "بوت واتساب للأنشطة التجارية", "بوت خدمة العملاء لواتساب",
      "بوت الأسئلة الشائعة لواتساب", "بوت تأهيل العملاء المحتملين", "رسائل واتساب التفاعلية", "الردود السريعة على واتساب", "رسائل القوائم على واتساب",
      "قوالب بوت واتساب", "منشئ مسارات واتساب", "منصة شات بوت واتساب", "أسعار شات بوت واتساب", "ربط ChatGPT بواتساب",
      "دعم العملاء بالذكاء الاصطناعي لواتساب", "استجابات واتساب المؤتمتة", "الردود الذكية على واتساب", "بوت واتساب القائم على القواعد", "بوت معالجة اللغة الطبيعية لواتساب"
    ],
  },
  {
    titleEn: "WhatsApp CRM & Team Support (25)",
    titleAr: "نظام CRM وخدمة العملاء الموحدة",
    icon: Inbox,
    keywordsEn: [
      "WhatsApp CRM", "WhatsApp CRM integration", "WhatsApp customer support", "WhatsApp shared inbox", "WhatsApp team inbox",
      "WhatsApp customer service", "WhatsApp ticketing system", "WhatsApp helpdesk", "WhatsApp live chat", "WhatsApp agent routing",
      "WhatsApp 24/7 support", "WhatsApp SLA tracking", "WhatsApp agent performance", "WhatsApp customer history", "WhatsApp contact management",
      "WhatsApp omnichannel inbox", "WhatsApp multi-user access", "WhatsApp agent assignment", "WhatsApp internal notes", "WhatsApp canned responses",
      "WhatsApp customer journey", "WhatsApp customer retention", "WhatsApp NPS survey", "WhatsApp CSAT feedback", "WhatsApp customer experience"
    ],
    keywordsAr: [
      "CRM واتساب", "ربط واتساب بنظام إدارة علاقات العملاء", "دعم العملاء عبر واتساب", "صندوق بريد واتساب المشترك", "صندوق وارد الفريق لواتساب",
      "خدمة العملاء عبر واتساب", "نظام تذاكر واتساب", "مكتب مساعدة واتساب", "المحادثة المباشرة على واتساب", "توجيه المحادثات للموظفين",
      "دعم واتساب 24/7", "تتبع اتفاقية مستوى الخدمة SLA", "أداء موظفي واتساب", "سجل العميل في واتساب", "إدارة جهات اتصال واتساب",
      "صندوق وارد متعدد القنوات لواتساب", "وصول متعدد المستخدمين لواتساب", "تعيين الموظفين في واتساب", "ملاحظات داخلية في واتساب", "الردود الجاهزة على واتساب",
      "رحلة العميل عبر واتساب", "الاحتفاظ بالعملاء عبر واتساب", "استطلاع رضا العملاء NPS واتساب", "تقييم خدمة العملاء CSAT واتساب", "تجربة العميل عبر واتساب"
    ],
  },
  {
    titleEn: "Payments & Conversational Commerce (25)",
    titleAr: "المدفوعات والتجارة الإلكترونية",
    icon: CreditCard,
    keywordsEn: [
      "WhatsApp payments", "WhatsApp payment gateway", "WhatsApp pay Oman", "WhatsApp AmwalPay", "WhatsApp checkout",
      "WhatsApp e-commerce", "WhatsApp shopping", "WhatsApp catalog integration", "WhatsApp WooCommerce", "WhatsApp Shopify",
      "WhatsApp order management", "WhatsApp order tracking", "WhatsApp order confirmation", "WhatsApp abandoned cart", "WhatsApp cart recovery",
      "WhatsApp payment links", "WhatsApp in-chat checkout", "WhatsApp digital receipts", "WhatsApp invoice", "WhatsApp payment notification",
      "WhatsApp refund management", "WhatsApp cash on delivery", "WhatsApp payment API", "WhatsApp merchant account", "WhatsApp POS integration"
    ],
    keywordsAr: [
      "مدفوعات واتساب", "بوابة دفع واتساب", "واتساب باي عمان", "واتساب أموال باي", "الدفع عبر واتساب",
      "التجارة الإلكترونية عبر واتساب", "التسوق عبر واتساب", "ربط كتالوج واتساب", "واتساب ووكومرس", "واتساب شوبيفاي",
      "إدارة طلبات واتساب", "تتبع الطلبات عبر واتساب", "تأكيد الطلب عبر واتساب", "سلة التسوق المتروكة واتساب", "استرجاع السلات المتروكة واتساب",
      "روابط الدفع عبر واتساب", "الدفع داخل المحادثة واتساب", "إيصالات رقمية عبر واتساب", "فاتورة واتساب", "إشعار الدفع عبر واتساب",
      "إدارة المبالغ المستردة واتساب", "الدفع عند الاستلام واتساب", "واجهة برمجة تطبيقات مدفوعات واتساب", "حساب تاجر واتساب", "ربط نقاط البيع بواتساب"
    ],
  },
  {
    titleEn: "Appointments & Healthcare Bookings (20)",
    titleAr: "حجز المواعيد والرعاية الصحية",
    icon: CalendarClock,
    keywordsEn: [
      "WhatsApp appointment booking", "WhatsApp booking system", "WhatsApp scheduling", "WhatsApp calendar sync", "WhatsApp reminder messages",
      "WhatsApp appointment confirmation", "WhatsApp clinic booking", "WhatsApp salon booking", "WhatsApp hospital appointment", "WhatsApp doctor appointment",
      "WhatsApp tour booking", "WhatsApp hotel booking", "WhatsApp restaurant reservation", "WhatsApp table booking", "WhatsApp service scheduling",
      "WhatsApp automated reminders", "WhatsApp cancellation handling", "WhatsApp reschedule appointment", "WhatsApp Google Calendar integration", "WhatsApp booking bot"
    ],
    keywordsAr: [
      "حجز مواعيد عبر واتساب", "نظام حجز واتساب", "جدولة المواعيد عبر واتساب", "مزامنة تقويم واتساب", "رسائل تذكير واتساب",
      "تأكيد الموعد عبر واتساب", "حجز عيادة عبر واتساب", "حجز صالون عبر واتساب", "موعد مستشفى عبر واتساب", "موعد طبيب عبر واتساب",
      "حجز جولات سياحية واتساب", "حجز فندق عبر واتساب", "حجز مطعم عبر واتساب", "حجز طاولة عبر واتساب", "جدولة الخدمات عبر واتساب",
      "تذكيرات المواعيد التلقائية واتساب", "إدارة إلغاء المواعيد واتساب", "إعادة جدولة المواعيد واتساب", "ربط تقويم جوجل بواتساب", "بوت حجز المواعيد واتساب"
    ],
  },
  {
    titleEn: "Industry-Specific Solutions (25)",
    titleAr: "حلول مخصصة للقطاعات والأنشطة",
    icon: Building2,
    keywordsEn: [
      "WhatsApp for healthcare", "WhatsApp for clinics", "WhatsApp for hospitals", "WhatsApp for tourism", "WhatsApp for tour operators",
      "WhatsApp for safari tours", "WhatsApp for hotels", "WhatsApp for travel agencies", "WhatsApp for real estate", "WhatsApp for property agents",
      "WhatsApp for restaurants", "WhatsApp for cafes", "WhatsApp for food delivery", "WhatsApp for retail", "WhatsApp for ecommerce",
      "WhatsApp for education", "WhatsApp for schools", "WhatsApp for universities", "WhatsApp for automotive", "WhatsApp for car dealerships",
      "WhatsApp for insurance", "WhatsApp for banking", "WhatsApp for financial services", "WhatsApp for legal firms", "WhatsApp for digital marketing agencies"
    ],
    keywordsAr: [
      "واتساب للرعاية الصحية", "واتساب للعيادات", "واتساب للمستشفيات", "واتساب للسياحة", "واتساب لمنظمي الجولات السياحية",
      "واتساب لرحلات السفاري", "واتساب للفنادق", "واتساب لوكالات السفر", "واتساب للعقارات", "واتساب للوسطاء العقاريين",
      "واتساب للمطاعم", "واتساب للمقاهي", "واتساب لتوصيل الطعام", "واتساب لتجارة التجزئة", "واتساب للمتاجر الإلكترونية",
      "واتساب للتعليم", "واتساب للمدارس", "واتساب للجامعات", "واتساب للسيارات", "واتساب لمعارض السيارات",
      "واتساب لشركات التأمين", "واتساب للبنوك", "واتساب للخدمات المالية", "واتساب للمكاتب القانونية", "واتساب لوكالات التسويق الرقمي"
    ],
  },
  {
    titleEn: "Oman, GCC & Compliance (20)",
    titleAr: "سلطنة عمان والخليج والامتثال",
    icon: ShieldCheck,
    keywordsEn: [
      "WhatsApp API Oman", "WhatsApp Business Oman", "WhatsApp marketing Oman", "WhatsApp API UAE", "WhatsApp API Saudi Arabia",
      "WhatsApp API GCC", "WhatsApp API Middle East", "WhatsApp Arabic chatbot", "WhatsApp Arabic support", "WhatsApp RTL support",
      "WhatsApp Gulf Arabic", "WhatsApp Omani Rial payments", "WhatsApp Central Bank Oman compliance", "WhatsApp ISO 27001", "WhatsApp Meta verified partner",
      "WhatsApp official BSP Oman", "WhatsApp Cloud API hosting", "WhatsApp enterprise security", "WhatsApp data privacy GDPR", "WhatsApp business compliance"
    ],
    keywordsAr: [
      "واتساب API عمان", "واتساب بزنس عمان", "تسويق واتساب سلطنة عمان", "واتساب API الإمارات", "واتساب API السعودية",
      "واتساب API دول الخليج", "واتساب API الشرق الأوسط", "شات بوت واتساب عربي", "دعم اللغة العربية واتساب", "دعم اتجاه اليمين لليسار RTL واتساب",
      "واتساب باللهجة الخليجية", "مدفوعات واتساب بالريال العماني", "امتثال البنك المركزي العماني واتساب", "معايير أمان ISO 27001 واتساب", "شريك Meta المعتمد لواتساب",
      "مزود حلول واتساب رسمي في عمان", "استضافة واتساب كلاود API", "أمان المؤسسات لواتساب", "حماية البيانات وخصوصية GDPR واتساب", "امتثال الأعمال لواتساب"
    ],
  },
]

interface PublicPlan {
  id: string
  name: string
  slug: string
  description?: string
  currency: string
  priceMonthly: number
  priceYearly: number
  modules: string[]
  limits?: {
    messagesPerMonth?: number
    numbers?: number
    staff?: number
    contacts?: number
    [key: string]: any
  } | null
}

export function MarketingPage({ kind }: { kind: PageKind }) {
  const content = CONTENT[kind] || CONTENT.features
  const [plans, setPlans] = useState<PublicPlan[]>([])
  const [annual, setAnnual] = useState(false)
  const { lang, isAr } = useLanguage()

  useEffect(() => {
    if (kind === "pricing") {
      fetch("/api/plans/public")
        .then((res) => res.json())
        .then((data) => {
          if (data.plans) setPlans(data.plans)
        })
        .catch(() => {})
    }
  }, [kind])

  return (
    <div className={`marketing min-h-screen bg-[var(--mk-surface)] text-[var(--mk-ink)] ${isAr ? "font-sans rtl" : "ltr"}`} dir={isAr ? "rtl" : "ltr"}>
      <SiteHeader />

      <main className="overflow-hidden">
        {/* ========================================================================= */}
        {/* 1. DEDICATED TWO-COLUMN (LEFT & RIGHT) SPLIT SIMULATOR PAGE */}
        {/* ========================================================================= */}
        {kind === "simulator" ? (
          <section className="relative pt-8 pb-14 sm:pt-10 sm:pb-16 px-4 sm:px-6 bg-gradient-to-b from-[#FFF6DA]/40 via-white to-white border-b border-[var(--mk-line)]">
            <div className="mx-auto max-w-7xl">
              <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
                {/* Left Column: Information, Guidance & Interactive Controls */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] bg-[#F2F2F2] border border-[var(--mk-line)] text-[var(--mk-ink)] text-[12px] font-semibold">
                    <Sparkles className="h-3.5 w-3.5 text-[#00B96A]" />
                    <span>{isAr ? content.eyebrowAr : content.eyebrowEn}</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-extrabold tracking-tight text-[var(--mk-ink)] leading-[1.1]">
                    {isAr ? content.titleAr : content.titleEn}
                  </h1>

                  <p className="text-[15px] text-[#717680] leading-relaxed max-w-xl">
                    {isAr ? content.descriptionAr : content.descriptionEn}
                  </p>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Link href="/signup">
                      <Button size="lg" className="bg-[#00E785] hover:bg-[#00B96A] text-[var(--mk-ink)] text-[13px] font-bold rounded-[8px] px-6 h-10.5 border border-[#00B96A]/20 shadow-none">
                        {isAr ? "ابدأ التجربة المجانية (14 يوماً)" : "Start 14-Day Free Trial"}
                        <ArrowRight className={`ml-1.5 h-3.5 w-3.5 ${isAr ? "rotate-180" : ""}`} />
                      </Button>
                    </Link>
                    <Link href="/book-demo">
                      <Button size="lg" variant="outline" className="border-[#1D1D1D] bg-white text-[var(--mk-ink)] hover:bg-[#F2F2F2] rounded-[8px] px-5 h-10.5 text-[13px] font-semibold">
                        <Video className="h-4 w-4 text-[#00B96A] mr-1.5" />
                        {isAr ? "طلب عرض حي مخصص" : "Book Google Meet Demo"}
                      </Button>
                    </Link>
                  </div>

                  {/* Interactive Capabilities Grid */}
                  <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t border-[var(--mk-line)]">
                    {(isAr ? content.bulletsAr : content.bulletsEn).map((item, idx) => (
                      <div key={idx} className="rounded-[10px] border border-[var(--mk-line)] bg-[#F2F2F2] p-3.5 flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-[#00B96A] shrink-0 mt-0.5" />
                        <span className="text-[12.5px] font-medium text-[var(--mk-ink)] leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>

                  {/* Simulator Usage Instructions */}
                  <div className="rounded-[8px] border border-[var(--mk-line)] bg-white p-3 text-[12px] text-[#717680] flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#00E785] animate-pulse shrink-0" />
                    <span>
                      {isAr
                        ? "💡 تلميح: انقر على الأزرار التفاعلية أو بدّل بين القطاعات الأربعة داخل إطار الهاتف على اليمين لتجربة المسارات مباشرة."
                        : "💡 Quick Tip: Click any button or switch industry tabs inside the simulator frame on the right to interact with real flows."}
                    </span>
                  </div>

                  {/* Keyword Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(isAr ? content.keywordsAr : content.keywordsEn).map((kw) => (
                      <span key={kw} className="px-2.5 py-1 rounded-[6px] bg-[#F2F2F2] border border-[var(--mk-line)] text-[11.5px] font-medium text-[var(--mk-ink)]">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right Column: Live Interactive Device */}
                <div className="lg:col-span-5 flex justify-center">
                  <WhatsAppDemo isAr={isAr} />
                </div>
              </div>
            </div>
          </section>
        ) : kind === "features" ? (
          /* ========================================================================= */
          /* 2. DEDICATED COMPREHENSIVE FEATURES ARCHITECTURE (200+ KEYWORDS) */
          /* ========================================================================= */
          <FeaturesDetailedSuite isAr={isAr} />
        ) : kind === "pricing" ? (
          /* ========================================================================= */
          /* 3. PRICING VIEW */
          /* ========================================================================= */
          <>
            <section className="relative pt-10 pb-12 px-4 sm:px-6 bg-gradient-to-b from-[#FFF6DA]/40 via-white to-white border-b border-[var(--mk-line)]">
              <div className="relative mx-auto max-w-7xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-[6px] bg-[#F2F2F2] border border-[var(--mk-line)] text-[var(--mk-ink)] text-[12px] font-semibold">
                    {isAr ? content.eyebrowAr : content.eyebrowEn}
                  </span>
                </div>

                <div className="max-w-3xl space-y-3">
                  <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[46px] text-[var(--mk-ink)] leading-tight">
                    {isAr ? content.titleAr : content.titleEn}
                  </h1>
                  <p className="text-[15px] text-[#717680] leading-relaxed max-w-2xl">
                    {isAr ? content.descriptionAr : content.descriptionEn}
                  </p>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Link href="/signup">
                      <Button size="lg" className="bg-[#00E785] hover:bg-[#00B96A] text-[var(--mk-ink)] text-[13px] font-bold rounded-[8px] px-6 h-10.5 border border-[#00B96A]/20">
                        {isAr ? "ابدأ التجربة المجانية (14 يوماً)" : "Start 14-Day Free Trial"}
                        <ArrowRight className={`ml-1.5 h-3.5 w-3.5 ${isAr ? "rotate-180" : ""}`} />
                      </Button>
                    </Link>
                    <Link href="/book-demo">
                      <Button size="lg" variant="outline" className="border-[#1D1D1D] bg-white text-[var(--mk-ink)] hover:bg-[#F2F2F2] rounded-[8px] px-5 h-10.5 text-[13px] font-semibold">
                        {isAr ? "طلب عرض توضيحي" : "Book Google Meet Demo"}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </section>
            <Pricing plans={plans} annual={annual} setAnnual={setAnnual} isAr={isAr} />
          </>
        ) : (
          /* ========================================================================= */
          /* 4. OTHER DEDICATED VERTICAL PRODUCT PAGES */
          /* ========================================================================= */
          <>
            <section className="relative pt-10 pb-12 px-4 sm:px-6 bg-gradient-to-b from-[#FFF6DA]/40 via-white to-white border-b border-[var(--mk-line)]">
              <div className="relative mx-auto max-w-7xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-[6px] bg-[#F2F2F2] border border-[var(--mk-line)] text-[var(--mk-ink)] text-[12px] font-semibold">
                    {isAr ? content.eyebrowAr : content.eyebrowEn}
                  </span>
                </div>

                <div className="max-w-3xl space-y-3">
                  <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[46px] text-[var(--mk-ink)] leading-tight">
                    {isAr ? content.titleAr : content.titleEn}
                  </h1>
                  <p className="text-[15px] text-[#717680] leading-relaxed max-w-2xl">
                    {isAr ? content.descriptionAr : content.descriptionEn}
                  </p>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Link href="/signup">
                      <Button size="lg" className="bg-[#00E785] hover:bg-[#00B96A] text-[var(--mk-ink)] text-[13px] font-bold rounded-[8px] px-6 h-10.5 border border-[#00B96A]/20">
                        {isAr ? "ابدأ التجربة المجانية (14 يوماً)" : "Start 14-Day Free Trial"}
                        <ArrowRight className={`ml-1.5 h-3.5 w-3.5 ${isAr ? "rotate-180" : ""}`} />
                      </Button>
                    </Link>
                    <Link href="/book-demo">
                      <Button size="lg" variant="outline" className="border-[#1D1D1D] bg-white text-[var(--mk-ink)] hover:bg-[#F2F2F2] rounded-[8px] px-5 h-10.5 text-[13px] font-semibold">
                        {isAr ? "طلب عرض توضيحي" : "Book Google Meet Demo"}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </section>
            <ProductDetail kind={kind} content={content} isAr={isAr} />
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}

/**
 * COMPREHENSIVE FEATURES ARCHITECTURE
 * Covers all capabilities in detail + systematically incorporates the 200+ keyword SEO library.
 */
function FeaturesDetailedSuite({ isAr }: { isAr: boolean }) {
  return (
    <div className="space-y-12">
      {/* Hero Header */}
      <section className="relative pt-10 pb-12 sm:pt-14 sm:pb-16 px-4 sm:px-6 bg-gradient-to-b from-[#FFF6DA]/50 via-white to-white border-b border-[var(--mk-line)]">
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] bg-[#00E785]/15 border border-[#00E785]/40 text-[#047857] text-[12.5px] font-bold">
              <Layers className="h-4 w-4 text-[#047857]" />
              {isAr ? "الدليل التقني والتشغيلي الشامل للميزات" : "Enterprise Feature Matrix & Technical Capabilities"}
            </span>
          </div>

          <div className="max-w-4xl space-y-4">
            <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-black tracking-tight text-[#000000] leading-[1.1]">
              {isAr
                ? "كل ميزة صُممت لتحويل محادثات واتساب إلى نمو وأرباح مستمرة."
                : "Every Tool Engineered to Turn Conversations into High-Yield Revenue."}
            </h1>
            <p className="text-[17px] text-[var(--mk-ink-soft)] leading-relaxed max-w-3xl font-medium">
              {isAr
                ? "من الربط الرسمي بـ Meta Cloud API، وصناديق الوارد المشتركة، وروبوتات الذكاء الاصطناعي باللهجة الخليجية، إلى بوابات الدفع الإلكتروني بالريال العماني (أموال باي)، وجدولة المواعيد والأسرة الطبية، وتكامل متاجر ووكومرس."
                : "Official WhatsApp Cloud API connectivity, multi-agent CRM inboxes, colloquial Gulf Arabic AI, native AmwalPay OMR checkout, clinical bed allocation, and two-way WooCommerce catalog sync."}
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/signup">
                <Button size="lg" className="bg-[#00E785] hover:bg-[#00B96A] text-[#000000] hover:text-white text-[14px] font-extrabold rounded-[8px] px-7 h-12 border border-[#047857]/30 shadow-sm cursor-pointer">
                  {isAr ? "ابدأ التجربة المجانية (14 يوماً)" : "Start 14-Day Free Trial"}
                  <ArrowRight className={`ml-1.5 h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
                </Button>
              </Link>
              <Link href="/product/simulator">
                <Button size="lg" variant="outline" className="border-2 border-[#111827] bg-white text-[var(--mk-ink)] hover:bg-[#F3F4F6] rounded-[8px] px-6 h-12 text-[14px] font-bold shadow-xs cursor-pointer">
                  <Sparkles className="h-4 w-4 text-[#047857] mr-1.5" />
                  {isAr ? "فتح المحاكي التفاعلي المباشر" : "Open Live Interactive Simulator"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* DETAILED FEATURE MODULES (8 Deep Dives) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 space-y-10">
        {/* Module 1: Core WhatsApp Business API */}
        <div className="rounded-[16px] border border-[var(--mk-line)] bg-[#FAFAFA] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--mk-line)] pb-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-[10px] bg-[#00E785]/20 border border-[#00E785]/40 flex items-center justify-center text-[var(--mk-ink)]">
                <WhatsAppIcon className="h-6 w-6 text-[#00B96A]" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-[#00B96A] uppercase font-bold">Module 01</span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--mk-ink)]">
                  {isAr ? "واجهة WhatsApp Cloud API الرسمية وشارة التوثيق الخضراء" : "Official WhatsApp Cloud API & Meta Verification"}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-[6px] bg-white text-[var(--mk-ink)] border border-[var(--mk-line)] text-[11.5px] font-bold">
                Meta Verified BSP Architecture
              </span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2 rounded-[12px] border border-[var(--mk-line)] bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-[var(--mk-ink)] flex items-center gap-1.5">
                <CheckCircle2 className="h-4.5 w-4.5 text-[#00B96A]" />
                {isAr ? "ربط فوري عبر Meta Embedded Signup" : "Meta Embedded Signup (60s)"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "اربط رقم هاتفك التجاري مباشرة بحساب Meta Business Manager خلال 60 ثانية بدون أي تعقيدات تقنية أو أوقات انتظار طويلة."
                  : "Connect business phone numbers directly via Meta OAuth in under 60 seconds with instant WABA creation and token exchange."}
              </p>
            </div>

            <div className="space-y-2 rounded-[12px] border border-[var(--mk-line)] bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-[var(--mk-ink)] flex items-center gap-1.5">
                <ShieldCheck className="h-4.5 w-4.5 text-[#00B96A]" />
                {isAr ? "تقديم طلب شارة التوثيق الخضراء" : "Official Green Tick Verification"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "إعداد كامل للملف التجاري وتقديم مباشر لـ Meta للحصول على شارة التوثيق الخضراء الرسمية لبناء أعلى درجات الثقة مع عملائك."
                  : "Assisted submission for Official Business Account (OBA) Green Tick badge to establish supreme brand credibility."}
              </p>
            </div>

            <div className="space-y-2 rounded-[12px] border border-[var(--mk-line)] bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-[var(--mk-ink)] flex items-center gap-1.5">
                <Activity className="h-4.5 w-4.5 text-[#00B96A]" />
                {isAr ? "مراقبة جودة الرقم وحجم الإرسال" : "Quality Tier & Throughput Scaling"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "مراقبة لحظية لمؤشر جودة الرقم لدى Meta مع تصعيد تلقائي للشرائح (Tier 1: 1k, Tier 2: 10k, Tier 3: 100k, Unlimited)."
                  : "Real-time phone number health telemetry with automatic quality tier progression up to unlimited daily conversations."}
              </p>
            </div>
          </div>
        </div>

        {/* Module 2: WhatsApp Marketing & Bulk Broadcasts */}
        <div className="rounded-[16px] border border-[var(--mk-line)] bg-[#FAFAFA] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--mk-line)] pb-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-[10px] bg-[#00E785]/20 border border-[#00E785]/40 flex items-center justify-center text-[var(--mk-ink)]">
                <Megaphone className="h-6 w-6 text-[#00B96A]" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-[#00B96A] uppercase font-bold">Module 02</span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--mk-ink)]">
                  {isAr ? "التسويق وحملات البث الجماعي بنسبة فتح 98%" : "WhatsApp Marketing, Broadcasts & 98% Open Rates"}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-[6px] bg-white text-[var(--mk-ink)] border border-[var(--mk-line)] text-[11.5px] font-bold">
                High-ROI Campaign Engine
              </span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2 rounded-[12px] border border-[var(--mk-line)] bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-[var(--mk-ink)] flex items-center gap-1.5">
                <Send className="h-4.5 w-4.5 text-[#00B96A]" />
                {isAr ? "إرسال حملات جماعية رسمية معتمدة" : "Meta-Approved Broadcast Templates"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "إرسال آلاف الرسائل الترويجية والعروض الموسمية بقوالب معتمدة من Meta تدعم الصور، الفيديو، الأزرار التفاعلية، وروابط العروض."
                  : "Dispatch rich media promotional broadcasts with dynamic variables, CTA buttons, quick replies, and personalized tokens."}
              </p>
            </div>

            <div className="space-y-2 rounded-[12px] border border-[var(--mk-line)] bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-[var(--mk-ink)] flex items-center gap-1.5">
                <Sliders className="h-4.5 w-4.5 text-[#00B96A]" />
                {isAr ? "تقسيم متقدم للجمهور وحملات التقطير" : "Audience Segmentation & Drip Sequences"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "قسّم جهات الاتصال حسب الوسوم (Tags)، ومراحل العميل (Stages)، والقيمة الإجمالية، وأطلق سلاسل رسائل تنقيط تلقائية."
                  : "Target laser-focused subscriber segments by tags, purchase value, and lifecycle stages with scheduled drip triggers."}
              </p>
            </div>

            <div className="space-y-2 rounded-[12px] border border-[var(--mk-line)] bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-[var(--mk-ink)] flex items-center gap-1.5">
                <BarChart3 className="h-4.5 w-4.5 text-[#00B96A]" />
                {isAr ? "تحليلات معدل الفتح والنقر (CTR)" : "Granular Delivery & Click Analytics"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "تتبع تفصيلي لمعدلات التسليم، القراءة، النقر على الأزرار، وتحويلات الشراء المباشرة لقياس العائد على الاستثمار (ROI)."
                  : "Track real-time sent, delivered, read, and button click-through metrics with direct conversion attribution."}
              </p>
            </div>
          </div>
        </div>

        {/* Module 3: Conversational AI & Visual Botflow Studio */}
        <div className="rounded-[16px] border border-[var(--mk-line)] bg-[#FAFAFA] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--mk-line)] pb-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-[10px] bg-[#00E785]/20 border border-[#00E785]/40 flex items-center justify-center text-[var(--mk-ink)]">
                <Bot className="h-6 w-6 text-[#00B96A]" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-[#00B96A] uppercase font-bold">Module 03</span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--mk-ink)]">
                  {isAr ? "شات بوت الذكاء الاصطناعي ومنشئ المسارات المرئي" : "Conversational AI & No-Code Botflow Studio"}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-[6px] bg-white text-[var(--mk-ink)] border border-[var(--mk-line)] text-[11.5px] font-bold">
                Gulf Arabic NLP Engine
              </span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2 rounded-[12px] border border-[var(--mk-line)] bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-[var(--mk-ink)] flex items-center gap-1.5">
                <Workflow className="h-4.5 w-4.5 text-[#00B96A]" />
                {isAr ? "منشئ مسارات سحب وإفلات مرئي" : "Drag-and-Drop Visual Canvas"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "أنشئ مسارات تفاعلية معقدة مع فروع الشروط، التحقق من المدخلات، استدعاء الـ APIs، وإجراءات الدفع دون كتابة سطر كود."
                  : "Build branching logic trees with interactive message nodes, input validators, REST webhooks, and AmwalPay actions."}
              </p>
            </div>

            <div className="space-y-2 rounded-[12px] border border-[var(--mk-line)] bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-[var(--mk-ink)] flex items-center gap-1.5">
                <Sparkles className="h-4.5 w-4.5 text-[#00B96A]" />
                {isAr ? "ذكاء اصطناعي يفهم اللهجات الخليجية" : "Colloquial Gulf Arabic Understanding"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "نماذج لغوية مدربة على فهم العبارات العمانية والخليجية الدارجة والرد بإجابات دقيقة واحترافية من مستندات شركتك."
                  : "Trained on regional Gulf Arabic dialects to comprehend customer colloquialisms and answer instantly from your company docs."}
              </p>
            </div>

            <div className="space-y-2 rounded-[12px] border border-[var(--mk-line)] bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-[var(--mk-ink)] flex items-center gap-1.5">
                <Headset className="h-4.5 w-4.5 text-[#00B96A]" />
                {isAr ? "تحويل ذكي وسلس للموظف البشري" : "Smart Human Handover & Escalation"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "عندما يطلب العميل التحدث مع موظف، يقوم البوت بإيقاف الأتمتة فوراً وتوجيه المحادثة لصندوق الوارد مع تنبيه الفريق."
                  : "Seamlessly pauses automation and transfers high-intent or sensitive inquiries to available live staff with priority tagging."}
              </p>
            </div>
          </div>
        </div>

        {/* Module 4: Multi-Agent Shared CRM Team Inbox */}
        <div className="rounded-[16px] border border-[var(--mk-line)] bg-[#FAFAFA] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--mk-line)] pb-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-[10px] bg-[#00E785]/20 border border-[#00E785]/40 flex items-center justify-center text-[var(--mk-ink)]">
                <Inbox className="h-6 w-6 text-[#00B96A]" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-[#00B96A] uppercase font-bold">Module 04</span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--mk-ink)]">
                  {isAr ? "صندوق وارد موحد متعدد الموظفين (CRM)" : "Multi-Agent Shared CRM & Support Inbox"}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-[6px] bg-white text-[var(--mk-ink)] border border-[var(--mk-line)] text-[11.5px] font-bold">
                24h Window & SLA Enforced
              </span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2 rounded-[12px] border border-[var(--mk-line)] bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-[var(--mk-ink)] flex items-center gap-1.5">
                <MessageSquare className="h-4.5 w-4.5 text-[#00B96A]" />
                {isAr ? "توزيع وتعيين المحادثات آلياً" : "Round-Robin & Skill Routing"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "توزيع عادل وتلقائي للمحادثات الواردة على موظفي المبيعات والدعم الفني مع إمكانية تعيين مشرفين وملاحظات داخلية سرية."
                  : "Auto-assign incoming chats to agents by department, availability, or workload with private team-only internal notes."}
              </p>
            </div>

            <div className="space-y-2 rounded-[12px] border border-[var(--mk-line)] bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-[var(--mk-ink)] flex items-center gap-1.5">
                <CalendarClock className="h-4.5 w-4.5 text-[#00B96A]" />
                {isAr ? "عداد نافذة الـ 24 ساعة المباشر" : "24h Session Window Countdown"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "مؤقت عد تنازلي حي للوقت المتبقي لنافذة المراسلة المجانية من Meta، مع تحويل سلس للقوالب الرسمية عند انقضاء المدة."
                  : "Live countdown indicators showing customer service window status with automatic template selector fallback when expired."}
              </p>
            </div>

            <div className="space-y-2 rounded-[12px] border border-[var(--mk-line)] bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-[var(--mk-ink)] flex items-center gap-1.5">
                <Tag className="h-4.5 w-4.5 text-[#00B96A]" />
                {isAr ? "سجل العميل والردود السريعة (Canned)" : "Contact CRM Profiles & Canned Responses"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "شاهد طلبات العميل السابقة، إجمالي مدفوعاته، وسجل مواعيده، ورد بنقرة واحدة باستخدام اختصارات الردود الجاهزة."
                  : "Inspect total lifetime spend, past bookings, and custom properties alongside shortcut-driven canned snippets."}
              </p>
            </div>
          </div>
        </div>

        {/* Module 5: AmwalPay Card Payments & Commerce */}
        <div className="rounded-[16px] border border-[var(--mk-line)] bg-[#FAFAFA] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--mk-line)] pb-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-[10px] bg-[#00E785]/20 border border-[#00E785]/40 flex items-center justify-center text-[var(--mk-ink)]">
                <CreditCard className="h-6 w-6 text-[#00B96A]" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-[#00B96A] uppercase font-bold">Module 05</span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--mk-ink)]">
                  {isAr ? "مدفوعات أموال باي المباشرة والتجارة المحادثاتية" : "Native AmwalPay Card Checkout & WhatsApp Commerce"}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-[6px] bg-white text-[var(--mk-ink)] border border-[var(--mk-line)] text-[11.5px] font-bold">
                OMR Instant Settlement
              </span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2 rounded-[12px] border border-[var(--mk-line)] bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-[var(--mk-ink)] flex items-center gap-1.5">
                <CreditCard className="h-4.5 w-4.5 text-[#00B96A]" />
                {isAr ? "روابط دفع آمنة بالريال العماني" : "Hosted In-Chat Checkout (OMR)"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "أنشئ روابط دفع مشفرة مباشرة في المحادثة أو البوت ليقوم العميل بسداد الفاتورة ببطاقة الخصم أو الائتمان بالريال العماني."
                  : "Generate secure hosted checkout URLs in OMR supporting debit/credit cards with real-time webhook confirmation."}
              </p>
            </div>

            <div className="space-y-2 rounded-[12px] border border-[var(--mk-line)] bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-[var(--mk-ink)] flex items-center gap-1.5">
                <ShoppingBag className="h-4.5 w-4.5 text-[#00B96A]" />
                {isAr ? "مزامنة ووكومرس واسترجاع السلات" : "WooCommerce Sync & Cart Recovery"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "مزامنة ثنائية لحظية مع متجر ووكومرس، استعراض الكتالوج وسلة الشراء في الشات، واسترجاع السلات المتروكة آلياً."
                  : "Two-way WooCommerce store inventory sync, interactive in-chat carts, and automated 30-min abandoned cart recovery sequences."}
              </p>
            </div>

            <div className="space-y-2 rounded-[12px] border border-[var(--mk-line)] bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-[var(--mk-ink)] flex items-center gap-1.5">
                <FileCheck className="h-4.5 w-4.5 text-[#00B96A]" />
                {isAr ? "فواتير إلكترونية وإيصالات PDF فورية" : "Automated PDF Tax Invoices"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "إصدار وإرسال الفاتورة الضريبية وقسيمة الحجز المشفرة برمز QR للعميل على واتساب تلقائياً فور تأكيد عملية الدفع."
                  : "Generate and dispatch compliant PDF tax invoices and QR-coded boarding vouchers straight to the customer's chat."}
              </p>
            </div>
          </div>
        </div>

        {/* Module 6: Appointments & Clinical Beds */}
        <div className="rounded-[16px] border border-[var(--mk-line)] bg-[#FAFAFA] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--mk-line)] pb-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-[10px] bg-[#00E785]/20 border border-[#00E785]/40 flex items-center justify-center text-[var(--mk-ink)]">
                <CalendarClock className="h-6 w-6 text-[#00B96A]" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-[#00B96A] uppercase font-bold">Module 06</span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--mk-ink)]">
                  {isAr ? "أتمتة المواعيد وجدولة الأسرة الطبية بالمستشفيات" : "Appointment Scheduling & Clinical Bed Management"}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-[6px] bg-white text-[var(--mk-ink)] border border-[var(--mk-line)] text-[11.5px] font-bold">
                Google Calendar & Meet Sync
              </span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2 rounded-[12px] border border-[var(--mk-line)] bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-[var(--mk-ink)] flex items-center gap-1.5">
                <CalendarClock className="h-4.5 w-4.5 text-[#00B96A]" />
                {isAr ? "حجز ذاتي للمواعيد على مدار 24/7" : "24/7 Self-Service Booking"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "عرض التوافر اللحظي، اختيار الطبيب أو الأخصائي، وإنشاء روابط Google Meet آلياً مع تأكيد الحجز فوراً."
                  : "Live slot availability, specialist profile selection, automated Google Meet room generation, and ICS calendar invites."}
              </p>
            </div>

            <div className="space-y-2 rounded-[12px] border border-[var(--mk-line)] bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-[var(--mk-ink)] flex items-center gap-1.5">
                <Building2 className="h-4.5 w-4.5 text-[#00B96A]" />
                {isAr ? "خريطة إدارة أسرة الرعاية النهارية (30 سريراً)" : "30-Bed Chemotherapy Day Care Map"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "نظام متكامل لتوزيع أسرة جلسات العلاج الكيماوي، تتبع الجلسات المكتملة، وإرسال تعليمات ما قبل الجلسة للمريض."
                  : "Specialized clinical bed scheduler for oncology day care units with nurse allocation and pre-treatment instructions."}
              </p>
            </div>

            <div className="space-y-2 rounded-[12px] border border-[var(--mk-line)] bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-[var(--mk-ink)] flex items-center gap-1.5">
                <RefreshCw className="h-4.5 w-4.5 text-[#00B96A]" />
                {isAr ? "تذكيرات المواعيد لخفض التخلف بـ 80%" : "Automated 24h Reminders"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "إرسال تذكيرات آلية قبل الموعد بـ 24 ساعة مع أزرار التأكيد أو إعادة الجدولة لخفض نسبة التخلف عن الحضور بشكل جذري."
                  : "Scheduled WhatsApp reminders with instant confirm / reschedule quick reply buttons that slash no-shows by 80%."}
              </p>
            </div>
          </div>
        </div>

        {/* Module 7: Specialized Vertical Modules */}
        <div className="rounded-[16px] border border-[var(--mk-line)] bg-[#FAFAFA] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--mk-line)] pb-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-[10px] bg-[#00E785]/20 border border-[#00E785]/40 flex items-center justify-center text-[var(--mk-ink)]">
                <Compass className="h-6 w-6 text-[#00B96A]" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-[#00B96A] uppercase font-bold">Module 07</span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--mk-ink)]">
                  {isAr ? "وحدات تشغيلية قطاعية جاهزة (السياحة والمطاعم والوكالات)" : "Turnkey Vertical Modules (Tours, Dining & Agencies)"}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-[6px] bg-white text-[var(--mk-ink)] border border-[var(--mk-line)] text-[11.5px] font-bold">
                Ready-to-Deploy Blueprints
              </span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2 rounded-[12px] border border-[var(--mk-line)] bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-[var(--mk-ink)] flex items-center gap-1.5">
                <Compass className="h-4.5 w-4.5 text-[#00B96A]" />
                {isAr ? "حجوزات الجولات السياحية والسفاري" : "Tour & Safari Booking Engine"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "كتالوج جولات سياحية، تتبع الطاقة الاستيعابية للمقاعد، دفع إلكتروني، وإصدار تذاكر PDF برمز QR ومواقع التجمع على خرائط جوجل."
                  : "Live capacity tracking per departure slot, AmwalPay checkout, PDF QR vouchers, and automated weather / packing alerts."}
              </p>
            </div>

            <div className="space-y-2 rounded-[12px] border border-[var(--mk-line)] bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-[var(--mk-ink)] flex items-center gap-1.5">
                <Utensils className="h-4.5 w-4.5 text-[#00B96A]" />
                {isAr ? "منيو المطاعم وطلبات المطبخ المباشرة" : "Restaurant POS & QR Menus"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "مسح باركود الطاولة لبدء المحادثة واستعراض المنيو، حجز الطاولات، وتوجيه الطلبات مباشرة لشاشة المطبخ (KDS)."
                  : "Table-specific QR code scanning, dining reservations, takeaway ordering, and direct Kitchen Display System (KDS) dispatch."}
              </p>
            </div>

            <div className="space-y-2 rounded-[12px] border border-[var(--mk-line)] bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-[var(--mk-ink)] flex items-center gap-1.5">
                <Building2 className="h-4.5 w-4.5 text-[#00B96A]" />
                {isAr ? "بنية مساحات العمل متعددة المستأجرين" : "Multi-Tenant Agency Architecture"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "أدر مئات حسابات العملاء والشركات في مساحات عمل معزولة تماماً مع تقارير استخدام وصلاحيات وصول متقدمة (RBAC)."
                  : "Operate segregated client sub-workspaces with role-based access control, usage metering, and centralized supervision."}
              </p>
            </div>
          </div>
        </div>

        {/* Module 8: Security, Regional & Compliance */}
        <div className="rounded-[16px] border border-[var(--mk-line)] bg-[#FAFAFA] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--mk-line)] pb-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-[10px] bg-[#00E785]/20 border border-[#00E785]/40 flex items-center justify-center text-[var(--mk-ink)]">
                <Lock className="h-6 w-6 text-[#00B96A]" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-[#00B96A] uppercase font-bold">Module 08</span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--mk-ink)]">
                  {isAr ? "الأمان المؤسسي والامتثال لمعايير البنك المركزي وISO 27001" : "Enterprise Security, Central Bank & ISO 27001 Compliance"}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-[6px] bg-white text-[var(--mk-ink)] border border-[var(--mk-line)] text-[11.5px] font-bold">
                ISO 27001 & CBO Aligned
              </span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2 rounded-[12px] border border-[var(--mk-line)] bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-[var(--mk-ink)] flex items-center gap-1.5">
                <Lock className="h-4.5 w-4.5 text-[#00B96A]" />
                {isAr ? "تشفير كامل وعزل لقواعد البيانات" : "AES-256 Encryption & Data Isolation"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "تشفير شامل للبيانات أثناء النقل والتخزين، مع عزل بيانات كل شركة ومستأجر في نطاق مستقل تماماً."
                  : "End-to-end encryption for in-transit and at-rest payloads with row-level tenant security isolation."}
              </p>
            </div>

            <div className="space-y-2 rounded-[12px] border border-[var(--mk-line)] bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-[var(--mk-ink)] flex items-center gap-1.5">
                <ShieldCheck className="h-4.5 w-4.5 text-[#00B96A]" />
                {isAr ? "امتثال البنك المركزي العماني (CBO)" : "Oman Banking Compliance"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "تكامل متوافق مع معايير الدفع الإلكتروني للبنوك العمانية وبوابة أموال باي المعتمدة من البنك المركزي."
                  : "Full regulatory alignment with Central Bank of Oman payment processing frameworks via AmwalPay gateway."}
              </p>
            </div>

            <div className="space-y-2 rounded-[12px] border border-[var(--mk-line)] bg-white p-5 shadow-sm">
              <h3 className="text-[15px] font-bold text-[var(--mk-ink)] flex items-center gap-1.5">
                <Globe className="h-4.5 w-4.5 text-[#00B96A]" />
                {isAr ? "استضافة سحابية عالية التوافر (99.9%)" : "99.9% Uptime SLA Infrastructure"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "بنية تحتية موزعة تضمن معالجة ملايين الرسائل يومياً مع زمن استجابة منخفض جداً ودعم فني متخصص."
                  : "High-availability redundant cluster engineered to sustain high-volume enterprise broadcast spikes with zero downtime."}
              </p>
            </div>
          </div>
        </div>
      </section>


      <section className="bg-[#00E785] px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-6 text-center">
          <h2 className="mk-display text-[32px] leading-tight text-[var(--mk-ink)] sm:text-[44px]">
            {isAr
              ? "جاهز لتشغيل عمليات واتساب بالكامل؟"
              : "Ready to run your full WhatsApp operation?"}
          </h2>
          <p className="mx-auto max-w-xl text-[16px] leading-relaxed text-[var(--mk-ink)]/70">
            {isAr
              ? "ابدأ التجربة المجانية لمدة 14 يوماً بدون بطاقة بنكية، أو احجز جلسة عرض مخصصة مع مهندسي الحلول."
              : "Start your 14-day full-access trial without a credit card, or book a 1-on-1 Google Meet walkthrough with a solutions engineer."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="h-12 gap-2 rounded-[8px] bg-[#1D1D1D] px-8 text-[15px] font-bold text-white shadow-none hover:bg-black">
                {isAr ? "ابدأ التجربة المجانية (14 يوماً)" : "Start 14-Day Free Trial"}
                <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
              </Button>
            </Link>
            <Link href="/book-demo">
              <Button size="lg" variant="outline" className="h-12 gap-2 rounded-[8px] border-[#1D1D1D]/30 bg-white/20 px-6 text-[15px] font-semibold text-[var(--mk-ink)] shadow-none hover:bg-white/40">
                {isAr ? "حجز عرض Google Meet" : "Book Google Meet Demo"}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function ProductDetail({
  kind,
  content,
  isAr,
}: {
  kind: PageKind
  content: PageContent
  isAr: boolean
}) {
  const bullets = isAr ? content.bulletsAr : content.bulletsEn
  const keywords = isAr ? content.keywordsAr : content.keywordsEn

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:py-16">
      {/* Left Column: Feature Highlights */}
      <div className="rounded-[16px] border border-[var(--mk-line)] bg-[#FAFAFA] p-6 sm:p-8 space-y-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#00E785]/20 text-[var(--mk-ink)] border border-[#00E785]/40">
          <Workflow className="h-6 w-6 text-[#00B96A]" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--mk-ink)]">
          {isAr ? "كفاءة تشغيلية ومبيعات مؤتمتة" : "Enterprise Conversational Capabilities"}
        </h2>
        <p className="text-[14px] leading-relaxed text-[#717680]">
          {isAr ? content.descriptionAr : content.descriptionEn}
        </p>

        <ul className="space-y-3 pt-1">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-[13.5px] text-[var(--mk-ink)]">
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-[#00B96A] mt-0.5" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        {/* Keyword Chips */}
        <div className="pt-4 border-t border-[var(--mk-line)] flex flex-wrap gap-1.5">
          {keywords.map((kw) => (
            <span key={kw} className="px-2.5 py-1 rounded-[6px] bg-white border border-[var(--mk-line)] text-[11.5px] font-medium text-[var(--mk-ink)]">
              {kw}
            </span>
          ))}
        </div>

        <div className="pt-2">
          <Link
            href="/product/simulator"
            className="inline-flex items-center text-[13px] font-bold text-[#00B96A] hover:underline"
          >
            {isAr ? "استكشف بيئة العمل التفاعلية في المحاكي" : "Explore live workspace simulator"}
            <ChevronRight className={`ml-1 h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
          </Link>
        </div>
      </div>

      {/* Right Column: Visual Box */}
      <div className="rounded-[16px] border border-[var(--mk-line)] bg-white p-6 sm:p-8 text-[var(--mk-ink)] flex flex-col justify-between shadow-sm">
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-[#00B96A]">
            <WhatsAppIcon className="h-6 w-6" />
            <span className="text-[13px] font-bold uppercase tracking-wider">
              {isAr ? "مساحة عمل Fizmoh السحابية" : "Fizmoh Cloud Workspace"}
            </span>
          </div>

          <div className="space-y-2.5">
            {bullets.slice(0, 4).map((b, i) => (
              <div key={b} className="rounded-[10px] border border-[var(--mk-line)] bg-[#F2F2F2] p-3.5">
                <div className="flex items-center gap-3">
                  <span className="grid h-6 w-6 place-items-center rounded-[6px] bg-white text-[11px] font-bold text-[var(--mk-ink)] border border-[var(--mk-line)]">
                    {i + 1}
                  </span>
                  <span className="text-[13px] font-medium text-[var(--mk-ink)]">{b}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-[var(--mk-line)] flex items-center gap-2 text-[12px] text-[#717680]">
          <ShieldCheck className="h-4 w-4 text-[#00B96A]" />
          {isAr
            ? "بنية تحتية سحابية معتمدة ومتوافقة مع معايير Meta وISO 27001"
            : "Enterprise multi-tenant infrastructure compliant with Meta & ISO 27001"}
        </div>
      </div>
    </section>
  )
}

function Pricing({
  plans,
  annual,
  setAnnual,
  isAr,
}: {
  plans: PublicPlan[]
  annual: boolean
  setAnnual: (value: boolean) => void
  isAr: boolean
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 space-y-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wider text-[#00B96A]">
            {isAr ? "باقات واضحة بدون عمولات مخفية" : "Pricing Catalogue"}
          </p>
          <h2 className="mt-1 text-2xl sm:text-4xl font-extrabold text-[var(--mk-ink)]">
            {isAr ? "اختر الباقة المناسبة لحجم أعمالك" : "Simple, Transparent Subscription Plans"}
          </h2>
          <p className="text-[14px] text-[#717680] mt-1">
            {isAr
              ? "تشمل جميع الباقات 14 يوماً تجربة مجانية كاملة بدون الحاجة لإدخال بطاقة بنكية."
              : "Every plan includes a 14-day full feature trial. No credit card required upfront."}
          </p>
        </div>

        {/*
          * A switch showing both choices, not a button that has to be pressed
          * to discover the other one.
          *
          * The label used to promise "Annual Billing · 20% Discount" whatever
          * the plans actually cost. It was true of none of them: two saved 40%
          * and 25%, and the Starter plan's yearly price was higher than twelve
          * of its monthly ones, so the page offered a discount to customers it
          * would have charged more. The saving is worked out per plan now, from
          * the prices themselves, and shown only where there is one.
          */}
        <div
          role="radiogroup"
          aria-label={isAr ? "دورة الفوترة" : "Billing period"}
          className="inline-flex rounded-[10px] border border-[var(--mk-line)] bg-[#F2F2F2] p-1"
        >
          {([false, true] as const).map(isAnnual => (
            <button
              key={String(isAnnual)}
              type="button"
              role="radio"
              aria-checked={annual === isAnnual}
              onClick={() => setAnnual(isAnnual)}
              className={`rounded-[8px] px-4 py-2 text-[12.5px] font-bold transition cursor-pointer ${
                annual === isAnnual
                  ? "bg-white text-[var(--mk-ink)] shadow-sm"
                  : "text-[#717680] hover:text-[var(--mk-ink)]"
              }`}
            >
              {isAnnual
                ? isAr ? "سنوي" : "Yearly"
                : isAr ? "شهري" : "Monthly"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {plans.length ? (
          plans.map((plan) => {
            const price = Math.round((annual ? plan.priceYearly : plan.priceMonthly) / 1000)
            return (
              <div
                key={plan.id}
                className="rounded-[16px] border border-[var(--mk-line)] bg-white p-6 sm:p-7 flex flex-col justify-between hover:border-[#1D1D1D] transition shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-[18px] font-bold text-[var(--mk-ink)]">{plan.name}</h3>
                    <span className="px-2.5 py-1 rounded-[6px] bg-[#00E785]/20 text-[var(--mk-ink)] border border-[#00E785]/40 text-[11px] font-bold">
                      {isAr ? "تجربة 14 يوماً" : "14d Trial"}
                    </span>
                  </div>
                  <p className="mt-2 text-[13px] text-[#717680] leading-relaxed">
                    {plan.description || "Complete multi-tenant workspace with WhatsApp integration."}
                  </p>
                  <p className="mt-5 text-3xl sm:text-4xl font-extrabold text-[var(--mk-ink)]">
                    {price === 0 ? "Free" : `${plan.currency} ${price}`}
                    {price > 0 && (
                      <span className="text-[12px] font-normal text-[#717680]">
                        /{annual ? (isAr ? "سنة" : "yr") : isAr ? "شهر" : "mo"}
                      </span>
                    )}
                  </p>
                  {/* What paying yearly is actually worth on this plan, from
                      its own two prices. Silent when it saves nothing, because
                      a plan whose yearly price is higher should not be
                      advertising a discount. */}
                  {annual && (() => {
                    const twelve = plan.priceMonthly * 12
                    if (!twelve || !plan.priceYearly || plan.priceYearly >= twelve) return null
                    const saved = Math.round((1 - plan.priceYearly / twelve) * 100)
                    if (saved < 1) return null
                    return (
                      <p className="mt-1 text-[12px] font-bold text-[#00B96A]">
                        {isAr ? `توفير ${saved}% مقارنة بالشهري` : `Save ${saved}% versus monthly`}
                      </p>
                    )
                  })()}
                  {/* Plan Quotas & Assigned Limits */}
                  <div className="mt-5 pt-4 border-t border-[var(--mk-line)] space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#717680]">
                      {isAr ? "الحدود والحصص المخصصة" : "Included Quotas & Usage"}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      {/* WhatsApp Messages */}
                      <div className="rounded-[8px] bg-[#F8F9FA] p-2.5 border border-[var(--mk-line)]">
                        <div className="flex items-center gap-1.5 text-[#00B96A] font-bold">
                          <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {plan.limits?.messagesPerMonth
                              ? `${plan.limits.messagesPerMonth.toLocaleString()}`
                              : isAr ? "غير محدود" : "Unlimited"}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-[#717680] mt-0.5">
                          {isAr ? "رسائل واتساب / شهر" : "WhatsApp msgs / mo"}
                        </div>
                      </div>

                      {/* WhatsApp Numbers */}
                      <div className="rounded-[8px] bg-[#F8F9FA] p-2.5 border border-[var(--mk-line)]">
                        <div className="flex items-center gap-1.5 text-[var(--mk-ink)] font-bold">
                          <Smartphone className="h-3.5 w-3.5 text-[#00B96A] shrink-0" />
                          <span className="truncate">
                            {plan.limits?.numbers
                              ? `${plan.limits.numbers} ${isAr ? "أرقام" : plan.limits.numbers === 1 ? "Number" : "Numbers"}`
                              : isAr ? "أرقام متعددة" : "Multi-Number"}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-[#717680] mt-0.5">
                          {isAr ? "أرقام واتساب" : "WhatsApp numbers"}
                        </div>
                      </div>

                      {/* Staff Seats */}
                      <div className="rounded-[8px] bg-[#F8F9FA] p-2.5 border border-[var(--mk-line)]">
                        <div className="flex items-center gap-1.5 text-[var(--mk-ink)] font-bold">
                          <Users className="h-3.5 w-3.5 text-[#00B96A] shrink-0" />
                          <span className="truncate">
                            {plan.limits?.staff
                              ? `${plan.limits.staff} ${isAr ? "مقاعد" : "Seats"}`
                              : isAr ? "غير محدود" : "Unlimited"}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-[#717680] mt-0.5">
                          {isAr ? "مقاعد الفريق" : "Team inbox seats"}
                        </div>
                      </div>

                      {/* Contacts Storage */}
                      <div className="rounded-[8px] bg-[#F8F9FA] p-2.5 border border-[var(--mk-line)]">
                        <div className="flex items-center gap-1.5 text-[var(--mk-ink)] font-bold">
                          <UserCheck className="h-3.5 w-3.5 text-[#00B96A] shrink-0" />
                          <span className="truncate">
                            {plan.limits?.contacts
                              ? `${plan.limits.contacts >= 1000 ? `${(plan.limits.contacts / 1000).toFixed(0)}k` : plan.limits.contacts}`
                              : isAr ? "غير محدود" : "Unlimited"}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-[#717680] mt-0.5">
                          {isAr ? "جهات الاتصال" : "CRM contacts"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <ul className="mt-5 space-y-2.5 border-t border-[var(--mk-line)] pt-5">
                    {plan.modules.map((module) => (
                      <li key={module} className="flex items-center gap-2 text-[13px] text-[var(--mk-ink)]">
                        <Check className="h-4 w-4 text-[#00B96A] shrink-0" />
                        <span>{module.replace(/_/g, " ")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-7">
                  <Link href={`/signup?plan=${plan.slug}`}>
                    <Button className="w-full bg-[#00E785] hover:bg-[#00B96A] text-[var(--mk-ink)] text-[13px] font-bold rounded-[8px] h-10 border border-[#00B96A]/20">
                      {isAr ? "ابدأ التجربة المجانية" : "Start 14-Day Free Trial"}
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })
        ) : (
          <div className="rounded-[16px] border border-dashed border-[var(--mk-line)] bg-[#FAFAFA] p-10 text-center text-[13px] text-[#717680] lg:col-span-3">
            <Sparkles className="mx-auto h-6 w-6 text-[#00B96A] mb-2" />
            <p>Loading plans catalogue...</p>
          </div>
        )}
      </div>

      {/* Book Demo Banner */}
      <div className="rounded-[16px] border border-[var(--mk-line)] bg-[#F2F2F2] p-7 text-[var(--mk-ink)] flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[6px] bg-white text-[#00B96A] text-[11px] font-bold border border-[var(--mk-line)]">
            <Video className="h-3.5 w-3.5" />
            {isAr ? "عرض مخصص" : "1-on-1 Walkthrough"}
          </div>
          <h3 className="text-[18px] font-extrabold text-[var(--mk-ink)]">
            {isAr ? "هل تحتاج إلى استشارة أو إعداد مخصص لمؤسستك؟" : "Need a custom enterprise setup or consultation?"}
          </h3>
          <p className="text-[13px] text-[#717680] leading-relaxed">
            {isAr
              ? "احجز جلسة استعراض مباشرة عبر Google Meet مع فريق الحلول للتعرف على أفضل الممارسات لشركتك."
              : "Schedule a dedicated 20-minute Google Meet walkthrough with our solutions team to explore custom automations."}
          </p>
        </div>
        <Link href="/book-demo" className="shrink-0">
          <Button className="bg-[#00E785] hover:bg-[#00B96A] text-[var(--mk-ink)] font-bold text-[13px] rounded-[8px] h-10 px-5 border border-[#00B96A]/20">
            {isAr ? "حجز موعد عبر Google Meet" : "Book Google Meet Demo"}
          </Button>
        </Link>
      </div>
    </section>
  )
}
