import { MODULE_REGISTRY, type Module } from "@/lib/module-registry"

export interface OfficialPlanDefinition {
  slug: string
  name: string
  nameAr: string
  description: string
  descriptionAr: string
  priceMonthly: number // in baisa (1000 baisa = 1 OMR)
  priceYearly: number // in baisa (1000 baisa = 1 OMR)
  currency: string
  trialDays: number
  sortOrder: number
  isPublic: boolean
  limits: {
    numbers: number
    contacts: number // -1 = Unlimited
    messagesPerMonth: number // -1 = Unlimited
    staff: number // -1 = Unlimited
    [key: string]: any
  }
  modules: Module[]
  featuresEn: string[]
  featuresAr: string[]
  badge?: string
  badgeAr?: string
  isPopular?: boolean
  isAllInclusive?: boolean
}

export const OFFICIAL_PLANS: OfficialPlanDefinition[] = [
  {
    slug: "free",
    name: "Free",
    nameAr: "المجانية",
    description: "1 WhatsApp Number, 1,000 Subscribers, and 1,000 Messages per month for early testing.",
    descriptionAr: "رقم واتساب واحد، 1,000 مشترك، و 1,000 رسالة شهرياً للاختبار والتجربة الأولية.",
    priceMonthly: 0,
    priceYearly: 0,
    currency: "OMR",
    trialDays: 14,
    sortOrder: 0,
    isPublic: true,
    limits: {
      numbers: 1,
      contacts: 1000,
      messagesPerMonth: 1000,
      staff: 1,
    },
    modules: [
      "INBOX",
      "CRM",
      "SETTINGS",
      "STAFF",
      "FLOWS",
      "AI",
      "KNOWLEDGE",
      "DIGITAL_VCARD",
      "LIVE_CHAT",
    ],
    featuresEn: [
      "1 WhatsApp Connected Number",
      "1,000 Subscribers / Contacts",
      "1,000 Outbound Messages / mo",
      "Shared Team Web Inbox",
      "Basic AI Auto-Replies",
      "Digital Business Card",
      "Website Live Chat Widget",
    ],
    featuresAr: [
      "رقم واتساب رسمي واحد متصل",
      "1,000 جهة اتصال ومشترك",
      "1,000 رسالة صادرة شهرياً",
      "صندوق وارد ويب مشترك للفريق",
      "ردود ذكاء اصطناعي أساسية",
      "بطاقة أعمال رقمية ذكية",
      "ودجت شات الموقع المباشر",
    ],
  },
  {
    slug: "basic",
    name: "Basic",
    nameAr: "الأساسية",
    description: "1 Number, 100,000 Subscribers, 100,000 Messages/mo, Chatbox, Bot Flow, Broadcast, Templates & Subscribers.",
    descriptionAr: "رقم واحد، 100,000 مشترك، 100,000 رسالة/شهر، صندوق محادثات، منشئ البوت، حملات البث، والقوالب المعتمدة.",
    priceMonthly: 35000, // 35 OMR
    priceYearly: 350000, // 350 OMR (save 70 OMR)
    currency: "OMR",
    trialDays: 14,
    sortOrder: 1,
    isPublic: true,
    limits: {
      numbers: 1,
      contacts: 100000,
      messagesPerMonth: 100000,
      staff: 3,
    },
    modules: [
      "INBOX",
      "CRM",
      "SETTINGS",
      "STAFF",
      "FLOWS",
      "AI",
      "KNOWLEDGE",
      "DIGITAL_VCARD",
      "LIVE_CHAT",
      "BROADCAST",
    ],
    featuresEn: [
      "1 Official WhatsApp API Number",
      "100,000 Subscribers Database",
      "100,000 Monthly Outbound Messages",
      "Multi-Agent Team Chatbox & Handover",
      "Visual Drag-and-Drop Bot Flow Studio",
      "Targeted Broadcast Marketing Campaigns",
      "Meta Official WhatsApp Templates Sync",
      "Smart Subscriber Segmentation & Tags",
      "Standard Core Features (Add-ons available separately)",
    ],
    featuresAr: [
      "رقم واتساب رسمي معتمد من ميتا",
      "قاعدة بيانات 100,000 مشترك وعميل",
      "100,000 رسالة تسويقية صادرة شهرياً",
      "صندوق محادثات جماعي مع تحويل يدوي",
      "استوديو مسارات البوت المرئي السلس",
      "حملات البث الجماعي والاستهداف",
      "مزامنة قوالب واتساب الرسمية المعتمدة",
      "إدارة المشتركين والتقسيم الذكي",
      "الميزات الأساسية (الإضافات متوفرة اختيارياً)",
    ],
  },
  {
    slug: "growth",
    name: "Growth",
    nameAr: "النمو المتقدم",
    description: "2 Numbers, Unlimited Subscribers, Unlimited Messages/mo, Chatbox, Bot Flow, Broadcast, Templates & Subscribers.",
    descriptionAr: "رقمان واتساب، مشتركون غير محدودين، رسائل شهرية غير محدودة، صندوق محادثات، منشئ البوت، وحملات البث المتقدمة.",
    priceMonthly: 50000, // 50 OMR
    priceYearly: 450000, // 450 OMR (save 150 OMR)
    currency: "OMR",
    trialDays: 14,
    sortOrder: 2,
    isPublic: true,
    isPopular: true,
    badge: "Most Popular",
    badgeAr: "الأكثر طلباً",
    limits: {
      numbers: 2,
      contacts: -1, // Unlimited
      messagesPerMonth: -1, // Unlimited
      staff: 10,
    },
    modules: [
      "INBOX",
      "CRM",
      "SETTINGS",
      "STAFF",
      "FLOWS",
      "AI",
      "KNOWLEDGE",
      "DIGITAL_VCARD",
      "LIVE_CHAT",
      "BROADCAST",
    ],
    featuresEn: [
      "2 Official WhatsApp API Numbers",
      "Unlimited Subscribers (No Ceiling)",
      "Unlimited Monthly Outbound Messages",
      "Multi-Agent Team Chatbox & Smart Routing",
      "Visual Drag-and-Drop Bot Flow Studio",
      "Broadcast Campaigns with High Throughput",
      "Meta Official Templates & Interactive Buttons",
      "Advanced Dynamic Segments & Auto-Sync",
      "Up to 10 Staff Agent Seats",
      "Standard Core Features (Add-ons available separately)",
    ],
    featuresAr: [
      "رقمان واتساب رسميان متزامنان",
      "مشتركون غير محدودين بدون سقف",
      "رسائل تسويقية شهرية غير محدودة",
      "صندوق محادثات ذكي وتوزيع على الموظفين",
      "استوديو البوتات والمسارات التفاعلية الكاملة",
      "حملات بث بسرعة إرسال فائقة",
      "قوالب ميتا المعتمدة بأزرار تفاعلية",
      "شرائح عملاء ديناميكية ومزامنة فورية",
      "حتى 10 مقاعد لموظفي الدعم والمبيعات",
      "الميزات الأساسية (الإضافات متوفرة اختيارياً)",
    ],
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    nameAr: "المؤسسات الشامل",
    description: "All Add-ons & All Features Included! 5 WhatsApp Numbers, Unlimited Messages, Unlimited Subscribers & Unlimited Seats.",
    descriptionAr: "جميع الإضافات وكافة المميزات مشمولة بالكامل! 5 أرقام واتساب، رسائل ومشتركون بلا حدود ودعم مخصص لكبار العملاء.",
    priceMonthly: 100000, // 100 OMR
    priceYearly: 900000, // 900 OMR (save 300 OMR)
    currency: "OMR",
    trialDays: 14,
    sortOrder: 3,
    isPublic: true,
    isAllInclusive: true,
    badge: "All Add-ons Included",
    badgeAr: "شامل جميع الإضافات",
    limits: {
      numbers: 5,
      contacts: -1,
      messagesPerMonth: -1,
      staff: -1,
    },
    // Enterprise includes every single module in MODULE_REGISTRY!
    modules: MODULE_REGISTRY.map((m) => m.key),
    featuresEn: [
      "5 Official WhatsApp API Numbers",
      "ALL 18+ Modular Add-ons Included at Zero Extra Cost",
      "Smart Menu & Table Ordering (KDS & QR Dining)",
      "Shopify & Salla GCC E-Commerce Connector",
      "Google Reviews 5-Star AI Shield & Maps Booster",
      "WhatsApp Drip Sequences & Marketing Automation",
      "Real-Time Google Sheets Bi-directional Sync",
      "AI Voice Notes & Transcriber with Arabic Audio Bot",
      "HubSpot & Zoho CRM Enterprise Connector",
      "Agency White-Label Reseller Portal & Custom Domain",
      "Corporate & Architectural Factory Systems",
      "Unlimited Subscribers & Unlimited Messages",
      "Unlimited Team Staff Seats & Dedicated VIP Account Manager",
    ],
    featuresAr: [
      "5 أرقام واتساب تجارية رسمية",
      "جميع الإضافات الـ 18 مشمولة بالكامل دون أي رسوم إضافية",
      "المنيو الذكي وشاشة المطبخ KDS وطلبات الطاولات",
      "الربط التلقائي بمتاجر شوبيفاي، سلة، وزد الخليجية",
      "درع تقييمات جوجل الذكي وحصد تقييمات 5 نجوم",
      "حملات التتابع الزمني والتقطير المؤتمت عبر واتساب",
      "مزامنة جوجل شيت اللحظية ثنائية الاتجاه",
      "تحويل الرسائل الصوتية وبوت الصوت العربي الذكي",
      "الربط مع هوب سبوت وزوهو لإدارة علاقات العملاء",
      "بوابة الوكالات المعاد تسميتها (White-Label) والنطاق الخاص",
      "أنظمة المعارض والمصانع والواجهات المعمارية",
      "مشتركون ورسائل ومقاعد موظفين بلا حدود",
      "مدير حساب مخصص ودعم فني على مدار الساعة",
    ],
  },
]

/** Slugs of the only 4 allowed public plans on the platform. */
export const ALLOWED_PLAN_SLUGS = ["free", "basic", "growth", "enterprise"] as const

