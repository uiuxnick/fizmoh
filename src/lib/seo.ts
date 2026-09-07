import type { Metadata } from "next"

export const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://app.fizmoh.cloud"

export const ALT_SITE_URL = "https://app.fizmoh.com"
export const SITE_NAME = "Fizmoh WhatsApp Business Platform"
export const DEFAULT_DESCRIPTION =
  "Official WhatsApp Business Cloud API platform in Oman & GCC. Multi-agent team inbox, visual AI bot builder, broadcast campaigns, CRM, website live chat widget, Instagram & Facebook automation, and AmwalPay online payments."
export const DEFAULT_OG_IMAGE = "/fizmoh-logo-light.png"

export const KEYWORDS_EN = [
  // Brand & Domain
  "Fizmoh", "Fizmoh Cloud", "app.fizmoh.com", "app.fizmoh.cloud", "Fizmoh Support", "Fizmoh WhatsApp Platform",
  // Official Meta Cloud API & Verification
  "WhatsApp Business API", "WhatsApp Business Platform", "WhatsApp Cloud API", "WhatsApp Business App",
  "WhatsApp for Business", "WhatsApp API pricing", "WhatsApp Business verification", "WhatsApp green tick",
  "WhatsApp Business account setup", "WhatsApp catalog", "WhatsApp Business profile", "WhatsApp Business tools",
  "WhatsApp Business features", "official WhatsApp API provider", "WhatsApp BSP", "WhatsApp Business API integration",
  "Meta Cloud Provider Oman", "Meta verified partner Oman", "WhatsApp BSP GCC", "official WhatsApp partner Middle East",
  "WhatsApp multi-agent inbox", "WhatsApp Business number", "WhatsApp Business dashboard", "WhatsApp Business plans",
  // Omnichannel & Addons (Live Chat, Social, Cards, Reviews)
  "website live chat widget", "WhatsApp live chat widget", "live chat WhatsApp button", "web chat widget with WhatsApp",
  "floating WhatsApp widget website", "website visitor live chat", "Instagram DM automation", "Instagram story reply bot",
  "Facebook Messenger automation", "Telegram business bot Oman", "digital vCard QR Oman", "NFC digital business card Muscat",
  "digital QR reviews Google Oman", "Google review card WhatsApp", "AI review reply generator",
  // Marketing, Broadcasting & Drip Campaigns
  "WhatsApp marketing", "WhatsApp marketing software", "WhatsApp bulk messaging", "WhatsApp broadcast messages",
  "WhatsApp marketing campaigns", "WhatsApp marketing tool", "WhatsApp mass messaging", "WhatsApp promotional messages",
  "WhatsApp marketing automation", "WhatsApp lead generation", "WhatsApp customer engagement", "WhatsApp remarketing",
  "WhatsApp drip campaigns", "WhatsApp opt-in marketing", "WhatsApp template messages", "WhatsApp marketing agency",
  "WhatsApp marketing strategy", "WhatsApp marketing for small business", "WhatsApp marketing for ecommerce",
  "WhatsApp marketing platform", "WhatsApp click to chat ads", "WhatsApp ads integration", "WhatsApp marketing ROI",
  "WhatsApp segmentation", "WhatsApp list building", "WhatsApp commerce", "WhatsApp shopping", "WhatsApp store",
  "WhatsApp checkout", "WhatsApp payments", "WhatsApp order management", "WhatsApp product catalog", "sell on WhatsApp",
  "WhatsApp shop link", "WhatsApp cart", "WhatsApp storefront", "WhatsApp ecommerce platform", "WhatsApp order tracking",
  "WhatsApp invoicing", "WhatsApp POS", "buy on WhatsApp", "WhatsApp product listing", "WhatsApp payment gateway",
  "WhatsApp abandoned cart recovery", "WhatsApp sales channel", "WhatsApp chatbot", "WhatsApp AI chatbot",
  "WhatsApp automation", "WhatsApp AI assistant", "AI WhatsApp agent", "WhatsApp auto reply", "WhatsApp bot builder",
  "no-code WhatsApp bot", "WhatsApp workflow automation", "WhatsApp AI customer service", "WhatsApp AI sales agent",
  "conversational AI WhatsApp", "WhatsApp chatbot builder", "WhatsApp business automation software",
  "AI-powered WhatsApp marketing", "WhatsApp NLP bot", "WhatsApp voice bot", "WhatsApp chatbot for business",
  "WhatsApp customer support automation", "WhatsApp FAQ bot", "WhatsApp appointment bot", "WhatsApp order bot",
  "WhatsApp lead qualification bot", "smart WhatsApp replies", "generative AI WhatsApp", "WhatsApp booking system",
  "WhatsApp appointment booking", "book appointment via WhatsApp", "WhatsApp reservation system", "WhatsApp scheduling tool",
  "WhatsApp calendar booking", "WhatsApp booking bot", "salon booking WhatsApp", "clinic appointment WhatsApp",
  "WhatsApp booking confirmation", "WhatsApp reminder messages", "WhatsApp no-show reduction", "WhatsApp slot booking",
  "WhatsApp booking widget", "tour booking WhatsApp", "WhatsApp payment link", "WhatsApp pay",
  "WhatsApp payment integration", "accept payments on WhatsApp", "WhatsApp invoicing tool", "WhatsApp POS system",
  "WhatsApp payment gateway GCC", "WhatsApp payment link generator", "WhatsApp online payments",
  "WhatsApp merchant account", "WhatsApp billing automation", "WhatsApp recurring payments", "WhatsApp CRM",
  "WhatsApp CRM integration", "WhatsApp customer database", "WhatsApp contact management", "WhatsApp sales CRM",
  "WhatsApp pipeline management", "WhatsApp customer profiles", "WhatsApp CRM software", "WhatsApp lead management",
  "WhatsApp ticketing system", "WhatsApp helpdesk", "WhatsApp support inbox", "WhatsApp shared inbox",
  "WhatsApp team inbox", "WhatsApp multi-user access", "multi-tenant WhatsApp platform", "WhatsApp SaaS platform",
  "WhatsApp workspace", "WhatsApp business operations platform", "all-in-one WhatsApp platform",
  "WhatsApp white label solution", "WhatsApp reseller platform", "cloud-based WhatsApp platform",
  "WhatsApp platform for agencies", "enterprise WhatsApp solution", "WhatsApp business suite",
  "unified commerce platform WhatsApp",
  // Regional & GCC localized
  "WhatsApp marketing Oman", "WhatsApp marketing GCC", "WhatsApp business Muscat", "WhatsApp commerce Gulf",
  "WhatsApp marketing UAE", "WhatsApp marketing Dubai", "WhatsApp marketing Abu Dhabi",
  "WhatsApp marketing Saudi Arabia", "WhatsApp marketing Riyadh", "WhatsApp marketing Jeddah",
  "WhatsApp marketing Qatar", "WhatsApp marketing Doha", "WhatsApp marketing Bahrain", "WhatsApp marketing Manama",
  "WhatsApp marketing Kuwait", "WhatsApp API provider Oman", "digital growth agency Oman",
  "WhatsApp business solutions Oman", "Arabic WhatsApp chatbot", "WhatsApp payments Oman", "GCC ecommerce WhatsApp",
  "AmwalPay WhatsApp gateway Oman", "BenefitPay WhatsApp", "Mada WhatsApp payments", "Apple Pay WhatsApp",
  // Industry specific
  "WhatsApp marketing for restaurants", "restaurant QR code menu", "smart menu ordering system",
  "live kitchen display system", "restaurant KDS Oman", "contactless dining GCC", "AI menu scanner PDF",
  "table QR ordering", "waiter call system WhatsApp", "digital restaurant menu Muscat", "restaurant POS online payments",
  "WhatsApp marketing for real estate", "WhatsApp property inquiries", "WhatsApp marketing for retail",
  "WhatsApp marketing for travel agencies", "WhatsApp tour booking Oman", "Musandam dhow cruise booking WhatsApp",
  "Wahiba Sands desert safari WhatsApp", "Salalah Khareef tour booking WhatsApp",
  "WhatsApp marketing for clinics", "hospital appointment WhatsApp Oman", "WhatsApp patient reminder bot",
  "WhatsApp marketing for salons", "beauty salon booking WhatsApp GCC",
  "WhatsApp marketing for hotels", "WhatsApp marketing for gyms", "WhatsApp for tour operators", "WhatsApp for logistics",
  "WhatsApp for education", "WhatsApp for automotive dealers", "WhatsApp for insurance", "WhatsApp for banks",
  "WhatsApp for fashion brands", "WhatsApp for events", "WhatsApp for delivery services",
  "WhatsApp for professional services", "WhatsApp for startups", "WhatsApp for SMEs",
  // Competitors & Alternatives
  "WhatsApp Business API vs WhatsApp Business App", "best WhatsApp API provider", "WhatsApp CRM alternatives",
  "Twilio WhatsApp alternative", "WATI alternative", "WATI alternative GCC", "Interakt alternative",
  "AiSensy alternative", "Zoko alternative", "Respond.io alternative",
  "best WhatsApp marketing software", "WhatsApp API pricing comparison", "WhatsApp automation tools comparison",
  "cheapest WhatsApp Business API", "how to run a business on WhatsApp", "how to sell products on WhatsApp",
  "how to automate WhatsApp business", "how to set up WhatsApp API", "how to send bulk WhatsApp messages legally",
  "how to build a WhatsApp chatbot", "how to accept payments on WhatsApp", "how to book appointments via WhatsApp",
  "is WhatsApp Business API free"
]

export const KEYWORDS_AR = [
  // العلامة التجارية والنطاق
  "فيزموه", "منصة فيزموه", "واتساب فيزموه", "دعم فيزموه", "تطبيق فيزموه", "كلاود فيزموه",
  // واتساب السحابي والتوثيق
  "واتساب بزنس", "واجهة برمجة تطبيقات واتساب", "واتساب كلاود API", "تطبيق واتساب للأعمال",
  "واتساب للشركات", "أسعار واتساب API", "توثيق واتساب بزنس", "العلامة الخضراء واتساب",
  "إنشاء حساب واتساب بزنس", "كتالوج واتساب", "ملف واتساب التجاري", "أدوات واتساب بزنس",
  "مميزات واتساب بزنس", "مزود واتساب الرسمي", "شريك حلول واتساب", "دمج واتساب بزنس API",
  "مزود خدمة واتساب المعتمد في عمان", "توثيق حساب واتساب بزنس عمان", "شريك ميتا السحابي عمان",
  "صندوق وارد متعدد الموظفين واتساب", "رقم واتساب بزنس", "لوحة تحكم واتساب بزنس", "باقات واتساب بزنس",
  // شات الموقع والقنوات الاجتماعية والإضافات
  "شات الموقع الإلكتروني لايف شات", "ودجت واتساب للموقع", "زر واتساب للموقع", "شات بوت الموقع وواتساب",
  "أتمتة إنستغرام دايراكت", "رد تلقائي ستوري إنستغرام", "أتمتة فيسبوك ماسنجر", "بوت تيليجرام للشركات عمان",
  "بطاقة عمل رقمية NFC عمان", "بطاقة مراجعات جوجل بالباركود", "مولد ردود التقييمات بالذكاء الاصطناعي",
  // التسويق والبث والحملات
  "تسويق واتساب", "برنامج تسويق واتساب", "رسائل واتساب جماعية", "بث رسائل واتساب",
  "حملات تسويق واتساب", "أداة تسويق واتساب", "إرسال رسائل جماعية واتساب", "رسائل ترويجية واتساب",
  "أتمتة تسويق واتساب", "جذب عملاء عبر واتساب", "تفاعل العملاء واتساب", "إعادة استهداف واتساب",
  "حملات تنقيط واتساب", "تسويق واتساب بالموافقة", "رسائل قوالب واتساب", "وكالة تسويق واتساب",
  "استراتيجية تسويق واتساب", "تسويق واتساب للمشاريع الصغيرة", "تسويق واتساب للتجارة الإلكترونية",
  "منصة تسويق واتساب", "إعلانات انقر للمحادثة واتساب", "ربط إعلانات واتساب", "عائد استثمار تسويق واتساب",
  "تقسيم العملاء واتساب", "بناء قوائم عملاء واتساب", "تجارة واتساب", "تسوق عبر واتساب", "متجر واتساب",
  "الدفع عبر واتساب", "مدفوعات واتساب", "إدارة الطلبات واتساب", "كتالوج المنتجات واتساب", "البيع عبر واتساب",
  "رابط متجر واتساب", "سلة الشراء واتساب", "واجهة متجر واتساب", "منصة تجارة إلكترونية واتساب",
  "تتبع الطلبات واتساب", "الفوترة عبر واتساب", "نقاط بيع واتساب", "الشراء عبر واتساب", "عرض المنتجات واتساب",
  "بوابة دفع واتساب", "استرجاع السلة المهجورة واتساب", "قناة مبيعات واتساب", "بوت واتساب",
  "شات بوت ذكاء اصطناعي واتساب", "أتمتة واتساب", "مساعد ذكاء اصطناعي واتساب", "وكيل ذكاء اصطناعي واتساب",
  "الرد التلقائي واتساب", "منشئ بوت واتساب", "بوت واتساب بدون برمجة", "أتمتة سير العمل واتساب",
  "خدمة عملاء ذكاء اصطناعي واتساب", "وكيل مبيعات ذكاء اصطناعي واتساب", "ذكاء اصطناعي محادثي واتساب",
  "منشئ شات بوت واتساب", "برنامج أتمتة أعمال واتساب", "تسويق واتساب بالذكاء الاصطناعي",
  "بوت واتساب لمعالجة اللغة الطبيعية", "بوت صوتي واتساب", "شات بوت واتساب للشركات",
  "أتمتة دعم العملاء واتساب", "بوت الأسئلة الشائعة واتساب", "بوت حجز المواعيد واتساب", "بوت الطلبات واتساب",
  "بوت تأهيل العملاء المحتملين واتساب", "ردود ذكية واتساب", "ذكاء اصطناعي توليدي واتساب",
  "نظام حجز عبر واتساب", "حجز المواعيد عبر واتساب", "حجز موعد بواسطة واتساب", "نظام الحجوزات واتساب",
  "أداة جدولة واتساب", "حجز عبر تقويم واتساب", "بوت الحجز واتساب", "حجز صالون عبر واتساب",
  "حجز موعد عيادة واتساب", "تأكيد الحجز واتساب", "رسائل تذكير واتساب", "تقليل عدم الحضور واتساب",
  "حجز الفترات الزمنية واتساب", "أداة حجز مدمجة واتساب", "حجز الجولات السياحية واتساب",
  "رابط دفع واتساب", "الدفع عبر واتساب", "دمج المدفوعات واتساب", "قبول المدفوعات على واتساب",
  "أداة الفوترة واتساب", "نظام نقاط البيع واتساب", "بوابة دفع واتساب الخليج", "منشئ روابط الدفع واتساب",
  "مدفوعات إلكترونية واتساب", "حساب تاجر واتساب", "أتمتة الفوترة واتساب", "مدفوعات متكررة واتساب",
  "بوابة أموال باي واتساب عمان", "مدفوعات مدى واتساب", "بنفت البحرين واتساب",
  "نظام إدارة علاقات العملاء واتساب", "دمج CRM مع واتساب", "قاعدة بيانات العملاء واتساب",
  "إدارة جهات الاتصال واتساب", "نظام مبيعات واتساب", "إدارة مسار المبيعات واتساب", "ملفات العملاء واتساب",
  "برنامج CRM واتساب", "إدارة العملاء المحتملين واتساب", "نظام تذاكر الدعم واتساب", "مكتب المساعدة واتساب",
  "صندوق دعم واتساب", "صندوق وارد مشترك واتساب", "صندوق وارد جماعي واتساب", "وصول متعدد المستخدمين واتساب",
  "منصة واتساب متعددة المستأجرين", "منصة SaaS لواتساب", "مساحة عمل واتساب", "منصة عمليات الأعمال واتساب",
  "منصة واتساب شاملة", "حل واتساب بعلامة بيضاء", "منصة واتساب لإعادة البيع", "منصة واتساب سحابية",
  "منصة واتساب للوكالات", "حل واتساب للمؤسسات", "مجموعة أدوات أعمال واتساب", "منصة تجارة موحدة واتساب",
  // الكلمات الإقليمية والخليجية
  "تسويق واتساب عمان", "تسويق واتساب الخليج", "واتساب بزنس مسقط", "تجارة واتساب الخليج",
  "تسويق واتساب الإمارات", "تسويق واتساب دبي", "تسويق واتساب أبوظبي",
  "تسويق واتساب السعودية", "تسويق واتساب الرياض", "تسويق واتساب جدة",
  "تسويق واتساب قطر", "تسويق واتساب الدوحة", "تسويق واتساب البحرين", "تسويق واتساب المنامة",
  "تسويق واتساب الكويت", "مزود واتساب API عمان", "وكالة نمو رقمي عمان", "حلول واتساب للأعمال عمان",
  "شات بوت واتساب باللغة العربية", "مدفوعات واتساب عمان", "تجارة إلكترونية واتساب الخليج",
  // القطاعات والصناعات
  "تسويق واتساب للمطاعم", "منيو رقمي للمطاعم", "نظام طلبات الطاولات بالباركود", "شاشة المطبخ KDS",
  "ماسح المنيو بالذكاء الاصطناعي", "طلبات طعام بدون تلامس عمان", "استدعاء النادل إلكترونياً",
  "منيو كافيه بالباركود", "نظام نقاط بيع المطاعم واتساب",
  "تسويق واتساب للعقارات", "تسويق واتساب للتجزئة", "تسويق واتساب لوكالات السفر",
  "حجز رحلات سفاري عمان واتساب", "حجز رحلات بحرية مسندم واتساب", "حجز رحلات خريف صلالة واتساب",
  "تسويق واتساب للعيادات", "حجز مواعيد المستشفيات والعيادات واتساب", "تذكير مواعيد المرضى واتساب",
  "تسويق واتساب لصالونات التجميل", "حجز صالونات التجميل والسبا الخليج",
  "تسويق واتساب للفنادق", "تسويق واتساب للنوادي الرياضية", "واتساب لمشغلي الجولات السياحية", "واتساب للخدمات اللوجستية",
  "واتساب للتعليم", "واتساب لوكلاء السيارات", "واتساب للتأمين", "واتساب للبنوك", "واتساب لعلامات الأزياء",
  "واتساب للفعاليات", "واتساب لخدمات التوصيل", "واتساب للخدمات المهنية", "واتساب للشركات الناشئة",
  "واتساب للمشاريع الصغيرة والمتوسطة",
  // المقارنات والبدائل
  "واتساب بزنس API مقابل تطبيق واتساب بزنس", "أفضل مزود واتساب API", "بدائل CRM واتساب",
  "بديل تويليو واتساب", "بديل WATI", "بديل واتي في الخليج", "بديل Interakt", "بديل AiSensy", "بديل Zoko",
  "أفضل برنامج تسويق واتساب", "مقارنة أسعار واتساب API", "مقارنة أدوات أتمتة واتساب", "أرخص واتساب بزنس API",
  "كيفية إدارة عمل تجاري عبر واتساب", "كيفية بيع المنتجات عبر واتساب", "كيفية أتمتة واتساب للأعمال",
  "كيفية إعداد واتساب API", "كيفية إرسال رسائل جماعية عبر واتساب بشكل قانوني", "كيفية إنشاء بوت واتساب",
  "كيفية قبول المدفوعات عبر واتساب", "كيفية حجز المواعيد عبر واتساب", "هل واتساب بزنس API مجاني"
]

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString()
}

export function pageMetadata(
  title: string,
  description: string,
  path: string,
  image = DEFAULT_OG_IMAGE,
): Metadata {
  const url = absoluteUrl(path)
  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    keywords: [...KEYWORDS_EN, ...KEYWORDS_AR],
    alternates: {
      canonical: url,
      languages: {
        en: url,
        ar: url,
        "x-default": url,
      },
    },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [{ url: absoluteUrl(image), width: 1200, height: 630, alt: `${title} — ${SITE_NAME}` }],
    },
    twitter: { card: "summary_large_image", title: `${title} | ${SITE_NAME}`, description, images: [absoluteUrl(image)] },
  }
}
