"use client"

import Link from "next/link"
import {
  Sparkles, Rocket, Building2, Video, Workflow, CreditCard, ShieldCheck,
  ShoppingBag, Utensils, Calendar, Users, Bot, Zap, Download,
  CheckCircle2, ArrowRight, Layers, Smartphone, FileText, Code2, ShieldAlert, KeyRound, Database,
  QrCode, MessageCircleQuestion, Megaphone,
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { SiteFooter, SiteHeader } from "@/components/site-header"
import { useLanguage } from "@/context/language-context"
import { Button } from "@/components/ui/button"

interface Release {
  dateEn: string
  dateAr: string
  version: string
  titleEn: string
  titleAr: string
  badgeEn: string
  badgeAr: string
  badgeColor: string
  icon: any
  itemsEn: string[]
  itemsAr: string[]
  downloadCta?: boolean
}

const RELEASES: Release[] = [
  {
    dateEn: "8 September 2026",
    dateAr: "8 سبتمبر 2026",
    version: "v6.1.0",
    titleEn: "Omnichannel Social Broadcasts, Dual Gateways (AmwalPay & Paymob) & Official A4 Invoices with Digital Signature",
    titleAr: "حملات البث الموحدة (إنستغرام وفيسبوك)، بوابات دفع مزدوجة (أموال باي وباي موب) وفواتير A4 رسمية بتوقيع معتمد",
    badgeEn: "v6.1 Major Release",
    badgeAr: "إصدار رئيسي v6.1",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-300",
    icon: Megaphone,
    itemsEn: [
      "Omnichannel Social Campaigns: Broadcast targeted promotional announcements, rich media banners, and interactive links across WhatsApp, Facebook Messenger, and Instagram Direct from one unified dashboard.",
      "Dual Multi-Gateway Checkout: Activate AmwalPay and Paymob simultaneously so diners and clients can choose their preferred payment gateway freely, with instant automated webhook payment verification in OMR.",
      "Official A4 Tax Invoice Engine: Single-sheet pixel-perfect A4 tax invoice printouts and downloads with VAT itemization, QR authentication, and dedicated tenant settings.",
      "Authorized Digital Signature Upload: Upload official business signature and seal stamps directly from the billing & platform settings, automatically rendered on all customer invoices and receipts.",
      "Smart Meta Policy & Audience Guard: Enforces Meta's 24-hour customer messaging window with clear diagnostic error alerts, quiet-hours auto-pause, and channel-scoped audience filtering preventing delivery failures.",
      "Dedicated Campaigns Navigation: Seamless submenu navigation for Broadcast Campaigns, Audience Segments, and Message Templates across the sidebar, header, and mobile app drawer.",
    ],
    itemsAr: [
      "حملات البث الموحدة عبر منصات التواصل: إرسال إعلانات ترويجية مستهدفة، بانرات وسائط غنية، وروابط تفاعلية عبر واتساب، فيسبوك ماسنجر، وإنستغرام من لوحة تحكم واحدة.",
      "دعم بوابات دفع مزدوجة (أموال باي وباي موب): تفعيل بوابتي أموال باي وباي موب في آنٍ واحد لمنح الزبائن والمستأجرين حرية اختيار بوابة الدفع المفضلة مع تأكيد فوري بالريال العماني.",
      "نظام فواتير ضريبية A4 كاملة: طباعة وتنزيل فواتير ضريبية احترافية على ورقة A4 واحدة متوافقة مع متطلبات الضرائب مع تفاصيل ضريبة القيمة المضافة ورمز التحقق QR.",
      "رفع التوقيع والختم الرقمي المعتمد: إمكانية رفع التوقيع والختم المعتمد للشركة من إعدادات الفواتير ليظهر تلقائياً على كافة الفواتير والإيصالات الصادرة.",
      "حماية ذكية لسياسات ميتا وتوجيه جهات الاتصال: تطبيق صارم لنافذة الـ 24 ساعة لرسائل ميتا، تشخيص فوري للأخطاء، إيقاف تلقائي في الساعات المتأخرة، وتصفية دقيقة للمستلمين لمنع تعارض المنصات.",
      "قائمة فرعية مخصصة للحملات والبث: وصول فوري وسلس للحملات الإعلانية، شرائح الجمهور، وقوالب الرسائل من الشريط الجانبي وقوائم التصفح على مختلف الأجهزة.",
    ],
  },
  {
    dateEn: "7 September 2026",
    dateAr: "7 سبتمبر 2026",
    version: "v6.0.0",
    titleEn: "Smart Menu & Ordering System: Live Kitchen KDS, QR Dining, GPT-4o AI Scanner & 1-Click Magic Login",
    titleAr: "المنيو الذكي ونظام طلبات المطاعم: شاشة المطبخ KDS، طلبات QR، ماسح المنيو بالذكاء الاصطناعي والدخول بنقرة واحدة",
    badgeEn: "v6.0 Major Release",
    badgeAr: "إصدار رئيسي v6.0",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    icon: Utensils,
    itemsEn: [
      "Live Kitchen Display System (KDS): Fullscreen interactive kitchen interface for chefs with real-time audio chime alerts, automatic preparation timers, and 1-tap ticket progression (Pending → Preparing → Ready → Served).",
      "Table QR Contactless Ordering: Instant QR code generator for tables, dining halls, and outdoor terraces. Diners scan with any smartphone camera to browse visual menus, select modifiers, and submit orders directly.",
      "GPT-4o Vision AI Menu Scanner: Digitize multi-page PDF menus or mobile photos into structured digital categories, dishes, descriptions, and OMR prices in under 2 minutes.",
      "Direct System CSV Importer: Bulk import hundreds of dishes, categories, and prices directly using standard CSV templates without requiring AI credits or token usage.",
      "Instant Waiter Call & Billing Paging: Guests can tap 'Call Waiter', 'Request Water', or 'Ask for the Bill' right from the table menu, notifying waitstaff in real time.",
      "Passwordless 1-Click Magic Login: One-tap authentication directly from official HTML email notifications, giving owners and managers instant access to the kitchen dashboard.",
      "Multi-Branch & Takeaway Modes: Support multiple restaurant branches, custom dine-in/takeaway pricing, allergen tagging, and AmwalPay online card checkout.",
    ],
    itemsAr: [
      "شاشة المطبخ التفاعلية الحية (KDS): واجهة ملء الشاشة لطهاة المطبخ مع تنبيهات صوتية فورية، مؤقتات دقيقة، وتحديث حالة الطلب بلمسة واحدة (جديد ← قيد التحضير ← جاهز ← تم التقديم).",
      "طلبات الطاولات بالباركود (QR Dining): توليد رموز QR فورية لكل طاولة أو صالة أو جلسة خارجية؛ يمسح الزبون الكود بكاميرا هاتفه لطلب الوجبات فوراً بدون تحميل تطبيقات.",
      "ماسح المنيو الذكي (GPT-4o Vision): رقمنة كتيبات المنيو من ملفات PDF والصور وتحويلها آلياً إلى أصناف وأسعار بالريال العماني وفئات منسقة خلال أقل من دقيقتين.",
      "الاستيراد المباشر عبر ملفات CSV: إمكانية رفع مئات الأصناف وتحديث الأسعار دفعة واحدة بنقرة واحدة بدون الحاجة للذكاء الاصطناعي.",
      "نظام استدعاء النادل وطلب الحساب: إمكانية طلب النادل أو طلب الماء أو الفاتورة مباشرة من صفحة المنيو مع إشعار فوري لفريق الخدمة برقم الطاولة.",
      "تسجيل الدخول السحري بنقرة واحدة: دخول آمن وفوري بدون كلمات مرور مباشرة من إشعارات البريد الإلكتروني المصممة باحترافية.",
      "دعم الفروع المتعددة والدفع الإلكتروني: إدارة فروع متعددة، قوائم داخل الصالة وللسفري، وربط مباشر ببوابة أموال باي (AmwalPay) بالريال العماني.",
    ],
  },
  {
    dateEn: "6 September 2026",
    dateAr: "6 سبتمبر 2026",
    version: "v5.3.0",
    titleEn: "Smart Digital Business Cards 2.0: 10+ Executive Themes, Video Covers & WhatsApp Lead Engine",
    titleAr: "بطاقات العمل الرقمية الذكية 2.0: أكثر من 10 تصاميم تنفيذية، أغلفة فيديو ومحرك عملاء واتساب الفوري",
    badgeEn: "v5.3 Major Add-on",
    badgeAr: "إضافة رئيسية v5.3",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    icon: Sparkles,
    itemsEn: [
      "10+ Executive Themes: Choose from handcrafted design aesthetics including Curve Emerald, Midnight Navy, Champagne Gold, Cyberpunk Neon, Minimalist Monochrome, Rose Gold, Sunset Glow, and Frosted Glass.",
      "Ultra-Fast Digital Sharing: Dynamic QR code generation, 1-tap NFC chip compatibility, and instant .vcf contact card download directly into Apple Contacts and Google Contacts.",
      "Video Cover Media & Sliders: Upload high-resolution cover photos or looping MP4/WebM video hero banners to showcase your brand in motion, complete with square service showcases and interactive image sliders.",
      "Integrated WhatsApp Lead Capture: Embedded one-tap WhatsApp chat buttons with customized pre-filled greetings, inquiry form submissions, and direct phone dialers.",
      "Rich Social & Custom Profile Links: Add custom badges with FontAwesome and brand icons for LinkedIn, Instagram, X/Twitter, YouTube, GitHub, Telegram, TikTok, and corporate URLs.",
      "Enterprise Multi-Tenant Security: Role-based creation, custom vanity card slugs (app.fizmoh.cloud/card/[slug]), view counter analytics, and instant one-click vCard updates.",
    ],
    itemsAr: [
      "أكثر من 10 قوالب تنفيذية احترافية: اختر من بين تصميمات راقية تشمل الزمرد المقوس (Curve Emerald)، الكحلي الليلي (Midnight Navy)، الذهبي الفاخر (Champagne Gold)، السايبربانك، والمظهر الزجاجي العصري.",
      "مشاركة رقمية فائقة السرعة: توليد فوري لرموز QR الديناميكية، توافق كامل مع رقائق NFC بلمسة واحدة، وتنزيل ملف vcf مباشرة لجهات اتصال آبل وجوجل.",
      "أغلفة فيديو ومعارض خدمات: إمكانية رفع صور أغلفة فائقة الدقة أو فيديو MP4 متحرك في خلفية البطاقة، مع عارض خدمات مربّع وسلايدر تفاعلي جذاب.",
      "التقاط عملاء واتساب الفوري: زر تواصل مباشر عبر واتساب مع رسائل مسبقة التعبئة، ونماذج استفسار مباشرة وربط سريع برقم الهاتف.",
      "روابط اجتماعية ومخصصة غير محدودة: دعم كامل للأيقونات المخصصة وشبكات التواصل مثل لينكد إن، إنستغرام، إكس، يوتيوب، تيك توك، وتيليجرام.",
      "أمان مؤسسي وعزل للمتاجر: عناوين مخصصة لكل بطاقة (app.fizmoh.cloud/card/[slug])، عدادات مشاهدات حقيقية، وتحديث فوري للبيانات بضغطة زر واحدة.",
    ],
  },
  {
    dateEn: "4 September 2026",
    dateAr: "4 سبتمبر 2026",
    version: "v5.2.0",
    titleEn: "Facebook & Instagram Automation: Unified Inbox, AI Auto-Reply & Comment Automation",
    titleAr: "أتمتة فيسبوك وإنستغرام: صندوق موحد ورد تلقائي بالذكاء الاصطناعي وأتمتة التعليقات",
    badgeEn: "v5.2 New Add-on",
    badgeAr: "إضافة جديدة v5.2",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
    icon: MessageCircleQuestion,
    itemsEn: [
      "New paid add-on: connect a Facebook Page and an Instagram Professional account through official Meta OAuth — no scraping, no browser automation, no stored passwords, ever.",
      "Every WhatsApp, Messenger and Instagram Direct Message now lands in the same unified inbox your team already uses, with a channel badge per conversation, the same assign/label/notes tools throughout.",
      "AI auto-reply grounded only in the business information you provide — never invents a price, policy or promise, configurable tone and length per channel, and never mentions it's AI.",
      "DM automation and comment automation are switched on independently, per channel — reply to a public Facebook or Instagram comment the moment it's asked, without touching direct-message settings.",
      "Manual approval, draft-only, or fully automatic modes — fully automatic requires the workspace owner's explicit, separate confirmation, and refunds, legal threats, safety, abuse and payment issues are always escalated to a person regardless of mode.",
      "Automatic lead capture: a volunteered email or phone number in a DM becomes a lead in the same CRM WhatsApp leads already use.",
    ],
    itemsAr: [
      "إضافة مدفوعة جديدة: اربط صفحة فيسبوك وحساب إنستغرام احترافي عبر تسجيل دخول ميتا الرسمي — لا استخراج بيانات، لا أتمتة متصفح، لا كلمات مرور مخزنة أبداً.",
      "تصل الآن كل رسالة واتساب وماسنجر وإنستغرام المباشرة إلى نفس الصندوق الموحد الذي يستخدمه فريقك، مع شارة قناة لكل محادثة، ونفس أدوات التعيين والتصنيف والملاحظات في كل مكان.",
      "رد تلقائي بالذكاء الاصطناعي يعتمد فقط على معلومات نشاطك التجاري التي تقدمها — لا يخترع سعراً أو سياسة أو وعداً أبداً، بنبرة وطول قابلين للتخصيص لكل قناة، ولا يذكر أبداً أنه ذكاء اصطناعي.",
      "تُفعَّل أتمتة الرسائل المباشرة وأتمتة التعليقات بشكل مستقل لكل قناة — رد على تعليق عام على فيسبوك أو إنستغرام لحظة طرحه، دون المساس بإعدادات الرسائل المباشرة.",
      "أوضاع الموافقة اليدوية أو المسودة فقط أو التلقائي الكامل — يتطلب الوضع التلقائي الكامل تأكيداً صريحاً ومنفصلاً من مالك مساحة العمل، وتُحال دائماً مشاكل الاسترداد والتهديدات القانونية والسلامة والإساءة والدفع إلى شخص أياً كان الوضع.",
      "التقاط عملاء محتملين تلقائي: يصبح البريد الإلكتروني أو الهاتف المذكور طواعية في رسالة مباشرة عميلاً محتملاً في نفس نظام إدارة العلاقات الذي تستخدمه عملاء واتساب المحتملون.",
    ],
  },
  {
    dateEn: "4 September 2026",
    dateAr: "4 سبتمبر 2026",
    version: "v5.1.0",
    titleEn: "Digital QR Reviews, AI Print Design Editor & Google Auto-Reply",
    titleAr: "مراجعات QR الرقمية، محرر تصميم الطباعة بالذكاء الاصطناعي والرد التلقائي على جوجل",
    badgeEn: "v5.1 New Module",
    badgeAr: "وحدة جديدة v5.1",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
    icon: QrCode,
    itemsEn: [
      "Digital QR Addons: a branded QR review journey — scan, rate, and 2-4 AI-drafted review suggestions built from what the customer actually said, never invented, with the exact final text always confirmed by the customer before Google opens.",
      "Full-page AI design canvas: drag text, shapes and an AI-generated background image anywhere on a print sign, or describe a look and let AI draft the whole thing — the QR code always renders separately on top, at full error correction, never covered or distorted.",
      "Google Business Profile OAuth: connect a real Google account per workspace, encrypted tokens, disconnect/reconnect anytime, and a location picker to pull the real average rating and review count onto the dashboard.",
      "Google review auto-reply engine: a natural, specific reply drafted for every new review — manual approval, draft-only, or automatic publishing modes, configurable tone/length/language/signature, and 1-3 star reviews and anything mentioning refunds, safety, legal threats or discrimination always held for a person.",
      "Full review inbox and analytics: search, filter and paginate every review by status, edit or retry a reply, approve-and-publish with one click, and track response time, approval rate and volume by star rating — every number real, nothing sample.",
    ],
    itemsAr: [
      "إضافات QR الرقمية: مسار مراجعة بهوية علامتك — مسح، تقييم، و2-4 اقتراحات مراجعة مصاغة بالذكاء الاصطناعي من كلام العميل الفعلي، لا شيء مُختلَق أبداً، مع تأكيد العميل دائماً للنص النهائي بالضبط قبل فتح جوجل.",
      "محرر تصميم بالذكاء الاصطناعي بصفحة كاملة: اسحب النصوص والأشكال وصورة خلفية مولّدة بالذكاء الاصطناعي في أي مكان على اللافتة، أو صف الشكل ودع الذكاء الاصطناعي يصمم الكل — يبقى رمز QR يُرسم بشكل منفصل فوق كل شيء وبأعلى تصحيح خطأ، لا يُغطّى ولا يُشوَّه أبداً.",
      "ربط ملف جوجل التجاري: اتصال حساب جوجل حقيقي لكل مساحة عمل، رموز مشفّرة، فصل وإعادة ربط في أي وقت، وأداة اختيار موقع لسحب متوسط التقييم الحقيقي وعدد المراجعات إلى اللوحة.",
      "محرك الرد التلقائي على مراجعات جوجل: رد طبيعي ومحدد يُصاغ لكل مراجعة جديدة — أوضاع الموافقة اليدوية أو المسودة فقط أو النشر التلقائي، مع نبرة وطول ولغة وتوقيع قابلة للتخصيص، وتبقى تقييمات النجمة إلى ثلاث نجوم وأي إشارة لاسترداد أو سلامة أو تهديد قانوني أو تمييز بانتظار شخص دائماً.",
      "صندوق مراجعات وتحليلات كامل: بحث وتصفية وترقيم لكل مراجعة حسب الحالة، تعديل أو إعادة محاولة رد، موافقة ونشر بنقرة واحدة، ومتابعة زمن الاستجابة ونسبة الموافقة والحجم حسب تقييم النجوم — كل رقم حقيقي، لا شيء تجريبي.",
    ],
  },
  {
    dateEn: "1 September 2026",
    dateAr: "1 سبتمبر 2026",
    version: "v5.0.0",
    titleEn: "Universal AI BotFlow Importer, Dynamic Business Modules & Multi-Tenant Notification Isolation",
    titleAr: "المستورد الذكي لمخططات البوت بالذكاء الاصطناعي، الوحدات الديناميكية المتكاملة وعزل التنبيهات المؤسسي",
    badgeEn: "v5.0 Major",
    badgeAr: "تحديث رئيسي v5.0",
    badgeColor: "bg-[#00E785]/20 text-[#1D1D1D] border-[#00E785]/40",
    icon: Workflow,
    itemsEn: [
      "Universal AI BotFlow Importer: 1-click import for xitFB@0.0.1, ManyChat, and native FizMoh flow JSONs with automatic visual node mapping and auto-layout.",
      "Smart AI Opportunity Detection: Automatically scans flow content to propose AmwalPay checkout links (fee amounts), WhatsApp Call CTA buttons (phone numbers), and live tour & appointment bookings.",
      "Interactive Button Tap Resumption: Real-time webhook matching for WhatsApp interactive button and list replies (resumeFlow) maintaining seamless guided customer flows.",
      "Strict Multi-Tenant Notification Isolation: Real-time SSE stream (/api/realtime/stream) and notification centers are strictly scoped to authenticated workspaces so alerts and sounds never leak across tenants.",
      "Full Dynamic Vertical Modules: Integrated outbound actions for WooCommerce products, restaurant menus, tours, appointments, hospital bed maps, and visa inquiries.",
    ],
    itemsAr: [
      "المستورد الذكي لمخططات الشات بوت (AI): استيراد فوري بنقرة واحدة لمخططات xitFB@0.0.1 وManyChat ومخططات FizMoh مع بنائها بصرياً على لوحة العمل.",
      "كشف الفرص الديناميكية بالذكاء الاصطناعي: التعرف التلقائي على الأسعار واقتراح روابط دفع أموال باي، أرقام الهواتف لأزرار الاتصال المباشر، والأنشطة لحجز الجولات والمواعيد.",
      "استئناف مسارات الأزرار التفاعلية: دعم كامل لضغطات أزرار وقوائم واتساب مع التوجيه التلقائي للمسار الصحيح دون الخروج للمحادثة العامة.",
      "عزل تام وشامل لتنبيهات المتاجر: عزل فوري لأحداث البث الحي والتنبيهات بحيث لا يتلقى أي متجر تنبيهات أو أصوات رسائل المتاجر الأخرى.",
      "ربط الوحدات الديناميكية المتكاملة: تكامل شامل مع منتجات ووكومرس، قوائم المطاعم، وحجوزات الجولات والمواعيد والعيادات وخريطة الأسرة.",
    ],
  },
  {
    dateEn: "31 August 2026",
    dateAr: "31 أغسطس 2026",
    version: "v4.5.0",
    titleEn: "Official Multi-Platform Apps: Android APK, macOS & Windows Desktop Clients",
    titleAr: "إطلاق التطبيقات الرسمية: تطبيق أندرويد (APK) وبرامج سطح المكتب لنظامي ماك وويندوز",
    badgeEn: "Native Apps",
    badgeAr: "تطبيقات أصلية",
    badgeColor: "bg-blue-500/10 text-blue-700 border-blue-200",
    icon: Smartphone,
    downloadCta: true,
    itemsEn: [
      "Android Mobile App (.APK): Native mobile experience with real-time push notifications, offline draft caching, camera scan receipt uploads, and background sync.",
      "macOS Desktop App (.ZIP): Native Apple Silicon & Intel universal client with dock badges, system tray menu, multi-tab inbox, and instant hotkeys.",
      "Windows Desktop Client (.ZIP): Lightweight 64-bit native executable with Windows toast notifications, multi-agent switching, and auto-update channel.",
      "Dedicated App Download Center: Download the official installer packages directly from our secure CDN at /downloads.",
    ],
    itemsAr: [
      "تطبيق الهاتف للأندرويد (.APK): تطبيق أصلي يدعم إشعارات الدفع الفورية، حفظ المسودات، مسح الإيصالات بالكاميرا، والمزامنة في الخلفية.",
      "برنامج سطح المكتب لنظام ماك (.ZIP): تطبيق خفيف لأنظمة Apple Silicon وIntel مع شارة شريط القوائم واختصارات سريعة.",
      "برنامج سطح المكتب لنظام ويندوز (.ZIP): تطبيق أصلي 64-bit مع إشعارات نظام ويندوز ودعم تبديل الموظفين والمحادثات المباشرة.",
      "مركز التنزيل الرسمي: يمكنك تحميل وتثبيت جميع التطبيقات مباشرة عبر صفحة التنزيلات المعتمدة: /downloads.",
    ],
  },
  {
    dateEn: "30 August 2026",
    dateAr: "30 أغسطس 2026",
    version: "v3.2.0",
    titleEn: "Full Bilingual Website, Arabic SEO Engine & Prorated Billing",
    titleAr: "الموقع ثنائي اللغة بالكامل، محرك تحسين محركات البحث العربي، واحتساب الرصيد التناسبي للترقية",
    badgeEn: "Major Release",
    badgeAr: "تحديث رئيسي",
    badgeColor: "bg-[#00E785]/20 text-[#1D1D1D] border-[#00E785]/40",
    icon: Rocket,
    itemsEn: [
      "Full Bilingual Platform: Native English & Arabic language switcher across entire public site with authentic RTL typography.",
      "Comprehensive 200+ Keyword SEO Engine: Dedicated bilingual blog architecture covering WhatsApp Cloud API, AI Chatbots, Marketing & AmwalPay.",
      "Automated Proration & Balance Carryover: Dynamic unused credit calculations and itemized balance deductions during plan upgrades and downgrades.",
      "Official Meta WhatsApp Provider Verification: Upgraded JSON-LD structured data graph and rich Organization & SoftwareApplication schemas.",
    ],
    itemsAr: [
      "منصة ثنائية اللغة بالكامل: مبدل لغات فوري (عربي / إنجليزي) لجميع الصفحات مع خطوط عربية وتنسيق اتجاه RTL.",
      "محرك SEO يضم أكثر من 200 كلمة مفتاحية: مدونة تقنية ثنائية اللغة متخصصة في واتساب كلاود API والشات بوت والمدفوعات.",
      "احتساب الرصيد التناسبي آلياً: احتساب رصيد الأيام المتبقية وخصمه تلقائياً عند ترقية أو تغيير باقات الاشتراك.",
      "بيانات هيكلية غنية (JSON-LD): مخططات برمجية كاملة تدعم محركات البحث العالمية والخليجية.",
    ],
  },
  {
    dateEn: "29 August 2026",
    dateAr: "29 أغسطس 2026",
    version: "v2.8.0",
    titleEn: "WhatsApp Inbox Overhaul, Meta Embedded Signup & Modern Dashboard",
    titleAr: "تطوير صندوق وارد واتساب، الربط المباشر مع Meta ولوحة التحكم العصرية",
    badgeEn: "Core Suite",
    badgeAr: "المنظومة الأساسية",
    badgeColor: "bg-[#00E785]/20 text-[#1D1D1D] border-[#00E785]/40",
    icon: ShieldCheck,
    itemsEn: [
      "Official Meta Embedded Signup: Direct OAuth onboarding allowing businesses to connect their WhatsApp numbers in under 60 seconds.",
      "Authentic WhatsApp Inbox: Double-check read receipts, styled inbound/outbound tails, and subtle wallpaper backdrop.",
      "24-Hour WhatsApp Service Window Tracking: Live session countdown timer showing remaining freeform message window hours.",
      "Modern KPI Dashboard: Real-time revenue analytics, channel split charts, and quick-action gradient pills.",
    ],
    itemsAr: [
      "الربط المباشر مع Meta: ربط رقم واتساب التجاري خلال أقل من 60 ثانية عبر التوثيق التلقائي وتبادل المفاتيح.",
      "صندوق وارد حقيقي: علامات قراءة الرسائل الزرقاء (✓✓) وتصميم فقاعات المحادثة الرسمية.",
      "تتبع نافذة خدمة الـ 24 ساعة: عداد تنازلي مباشر للوقت المتبقي للمراسلة الحرة مقابل قوالب الرسائل.",
      "لوحة تحكم تفاعلية: مؤشرات أداء حية، تحليلات الإيرادات، ومخططات توزيع قنوات المبيعات.",
    ],
  },
]

export default function WhatsNewPage() {
  const { isAr } = useLanguage()

  return (
    <div className={`min-h-screen bg-white text-[#1D1D1D] ${isAr ? "rtl font-sans" : "ltr"}`} dir={isAr ? "rtl" : "ltr"}>
      <SiteHeader />

      <main className="overflow-hidden">
        {/* Header Hero */}
        <section className="relative pt-10 pb-10 sm:pt-14 sm:pb-12 px-4 sm:px-6 bg-gradient-to-b from-[#FFF6DA]/50 via-white to-white border-b border-[#E5E7EB]">
          <div className="relative mx-auto max-w-4xl text-center space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] bg-[#F2F2F2] border border-[#E5E7EB] text-[#1D1D1D] text-[12px] font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-[#00B96A]" />
              {isAr ? "سجل التحديثات والتطبيقات" : "Changelog & Native Apps"}
            </span>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#1D1D1D]">
              {isAr ? "ما الجديد في منصة Fizmoh؟" : "What's New in Fizmoh"}
            </h1>
            <p className="text-[#717680] text-[15px] max-w-xl mx-auto leading-relaxed">
              {isAr
                ? "سجل كامل بجميع الإصدارات والتحسينات وتطبيقات الهاتف وسطح المكتب لمنصة فيزموه."
                : "A chronological record of new capabilities, official native apps, and enterprise upgrades."}
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <a href="/downloads/">
                <Button className="h-10 px-5 rounded-[10px] bg-[#00E785] hover:bg-[#00B96A] text-[#1D1D1D] text-[13px] font-bold shadow-sm">
                  <Download className="h-4 w-4 mr-2" />
                  {isAr ? "تنزيل التطبيقات (Android, Mac, Win)" : "Download Apps (Android, Mac, Win)"}
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* Releases Timeline */}
        <section className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-12 space-y-5">
          {RELEASES.map((rel, idx) => (
            <article
              key={idx}
              className="rounded-[16px] border border-[#E5E7EB] bg-white p-6 sm:p-7 space-y-4 hover:border-[#1D1D1D] transition shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB] pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-[10px] bg-[#00E785]/20 border border-[#00E785]/40 flex items-center justify-center text-[#1D1D1D]">
                    <rel.icon className="h-5 w-5 text-[#00B96A]" />
                  </div>
                  <div>
                    <span className="text-[11.5px] font-mono text-[#717680]">
                      {isAr ? rel.dateAr : rel.dateEn} · {rel.version}
                    </span>
                    <h2 className="text-[17px] font-bold text-[#1D1D1D] mt-0.5">
                      {isAr ? rel.titleAr : rel.titleEn}
                    </h2>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-[6px] text-[11px] font-bold border ${rel.badgeColor}`}
                >
                  {isAr ? rel.badgeAr : rel.badgeEn}
                </span>
              </div>

              <ul className="space-y-2.5 pt-1">
                {(isAr ? rel.itemsAr : rel.itemsEn).map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2.5 text-[13px] text-[#717680] leading-relaxed">
                    <CheckCircle2 className="h-4 w-4 text-[#00B96A] shrink-0 mt-0.5" />
                    <span className="text-[#1D1D1D]">{item}</span>
                  </li>
                ))}
              </ul>

              {rel.downloadCta && (
                <div className="pt-3 border-t border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href="/downloads/Fizmoh.apk"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#F2F2F2] hover:bg-[#E5E7EB] text-[#1D1D1D] text-[12px] font-bold border border-[#E5E7EB] transition"
                    >
                      <Download className="h-3.5 w-3.5 text-[#00B96A]" />
                      Android (.apk)
                    </a>
                    <a
                      href="/downloads/Fizmoh-macOS.zip"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#F2F2F2] hover:bg-[#E5E7EB] text-[#1D1D1D] text-[12px] font-bold border border-[#E5E7EB] transition"
                    >
                      <Download className="h-3.5 w-3.5 text-[#00B96A]" />
                      macOS (.zip)
                    </a>
                    <a
                      href="/downloads/Fizmoh-Windows.zip"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#F2F2F2] hover:bg-[#E5E7EB] text-[#1D1D1D] text-[12px] font-bold border border-[#E5E7EB] transition"
                    >
                      <Download className="h-3.5 w-3.5 text-[#00B96A]" />
                      Windows (.zip)
                    </a>
                  </div>

                  <a
                    href="/downloads/"
                    className="inline-flex items-center gap-1 text-[12.5px] font-bold text-[#00B96A] hover:underline"
                  >
                    <span>{isAr ? "استعراض مركز التنزيل الكامل ←" : "Open Full Download Center →"}</span>
                  </a>
                </div>
              )}
            </article>
          ))}
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
