/**
 * Target keywords, grouped by intent and mapped to the page that answers them.
 *
 * Two decisions shape this file.
 *
 * First, the keywords live against *pages*, not against the site. Every page
 * previously emitted the same 400-term list, which tells a search engine
 * nothing about what any individual page is for — and a page that claims to be
 * about everything ranks for nothing. Each cluster below names one page, and
 * that page's title, headings and copy are what actually have to earn the
 * ranking; the meta tag alone never will.
 *
 * Second, Google has ignored `<meta name="keywords">` since 2009. It is still
 * emitted because Bing, Yandex and several regional engines do read it, and
 * those matter in this market — but it is kept short and specific per page
 * rather than exhaustive, because a 400-term tag reads as spam to the engines
 * that do parse it.
 *
 * `PRIMARY` is the term the page is genuinely trying to win. It belongs in the
 * title and the H1, and there can only be one per page.
 */

export type KeywordCluster = {
  id: string
  label: string
  /** The page this cluster is targeted at, or null when none exists yet. */
  page: string | null
  primary: string
  keywords: string[]
}

export const KEYWORD_CLUSTERS: KeywordCluster[] = [
  {
    id: "core",
    label: "Core WhatsApp marketing",
    page: "/",
    primary: "WhatsApp Business API",
    keywords: [
      "WhatsApp marketing", "WhatsApp Business", "WhatsApp Business API", "WhatsApp Cloud API",
      "WhatsApp marketing software", "WhatsApp marketing tool", "WhatsApp marketing strategy",
      "WhatsApp marketing agency", "WhatsApp marketing services", "WhatsApp marketing automation",
      "WhatsApp marketing platform", "WhatsApp bulk sender", "WhatsApp mass messaging",
      "WhatsApp marketing campaign", "WhatsApp promotional messages", "WhatsApp advertising",
      "WhatsApp Ads", "Click to WhatsApp Ads", "WhatsApp for business", "WhatsApp commerce",
    ],
  },
  {
    id: "broadcast",
    label: "Broadcasting & messaging",
    page: "/features",
    primary: "WhatsApp broadcast",
    keywords: [
      "WhatsApp broadcast", "WhatsApp broadcast list", "WhatsApp bulk messaging",
      "WhatsApp mass broadcast", "WhatsApp group messaging", "WhatsApp bulk sender tool",
      "WhatsApp SMS alternative", "WhatsApp text blast", "WhatsApp newsletter",
      "WhatsApp campaign manager", "WhatsApp message scheduler", "WhatsApp auto reply",
      "WhatsApp drip campaign", "WhatsApp sequence messaging", "WhatsApp broadcast API",
      "WhatsApp message blaster", "WhatsApp outreach tool", "WhatsApp lead broadcast",
      "WhatsApp promo blast",
    ],
  },
  {
    id: "chatbot",
    label: "Chatbots & automation",
    page: "/product/botflow-studio",
    primary: "WhatsApp chatbot",
    keywords: [
      "WhatsApp chatbot", "WhatsApp bot builder", "WhatsApp AI chatbot",
      "WhatsApp chatbot for business", "WhatsApp automated replies", "WhatsApp workflow automation",
      "WhatsApp flow builder", "WhatsApp conversational AI", "WhatsApp NLP bot",
      "WhatsApp virtual assistant", "WhatsApp self-service bot", "WhatsApp FAQ bot",
      "WhatsApp order bot", "WhatsApp booking bot", "WhatsApp support bot",
      "WhatsApp lead qualification bot", "WhatsApp chatbot integration", "WhatsApp AI agent",
      "WhatsApp GPT chatbot", "WhatsApp automation platform", "WhatsApp no-code chatbot",
    ],
  },
  {
    id: "templates",
    label: "Templates & notifications",
    page: "/product/botflow-studio",
    primary: "WhatsApp message templates",
    keywords: [
      "WhatsApp message templates", "WhatsApp template approval", "WhatsApp notification messages",
      "WhatsApp transactional messages", "WhatsApp OTP messages", "WhatsApp order confirmation",
      "WhatsApp shipping updates", "WhatsApp appointment reminders", "WhatsApp payment reminders",
      "WhatsApp abandoned cart message", "WhatsApp receipt message", "WhatsApp booking confirmation",
      "WhatsApp utility templates", "WhatsApp marketing templates", "WhatsApp authentication templates",
      "WhatsApp template categories", "WhatsApp HSM messages", "WhatsApp session messages",
      "WhatsApp 24 hour window", "WhatsApp template pricing",
    ],
  },
  {
    id: "commerce",
    label: "E-commerce & catalog",
    page: "/solutions/ecommerce-online-stores",
    primary: "WhatsApp conversational commerce",
    keywords: [
      "WhatsApp catalog", "WhatsApp product catalog", "WhatsApp shop", "WhatsApp store",
      "WhatsApp shopping cart", "WhatsApp checkout", "WhatsApp cart recovery",
      "WhatsApp order tracking", "WhatsApp e-commerce integration", "WhatsApp Shopify integration",
      "WhatsApp WooCommerce plugin", "WhatsApp product recommendations", "WhatsApp upsell messages",
      "WhatsApp cross-sell campaign", "WhatsApp order management", "WhatsApp inventory alerts",
      "WhatsApp click to buy", "WhatsApp conversational commerce",
    ],
  },
  {
    id: "payments",
    label: "Payments",
    page: "/product/payments",
    primary: "WhatsApp payments",
    keywords: [
      "WhatsApp payments", "WhatsApp Pay", "WhatsApp payment gateway Oman",
      "AmwalPay WhatsApp integration", "WhatsApp checkout", "WhatsApp receipt message",
    ],
  },
  {
    id: "engagement",
    label: "Customer engagement & support",
    page: "/product/team-inbox",
    primary: "WhatsApp shared inbox",
    keywords: [
      "WhatsApp customer engagement", "WhatsApp customer service", "WhatsApp customer support",
      "WhatsApp helpdesk", "WhatsApp live chat", "WhatsApp CRM integration",
      "WhatsApp ticketing system", "WhatsApp multi-agent inbox", "WhatsApp shared inbox",
      "WhatsApp team inbox", "WhatsApp customer retention", "WhatsApp loyalty program",
      "WhatsApp feedback survey", "WhatsApp NPS survey", "WhatsApp customer satisfaction",
      "WhatsApp personalized messaging", "WhatsApp segmentation", "WhatsApp audience targeting",
      "WhatsApp customer journey", "WhatsApp omnichannel support", "WhatsApp CRM software",
    ],
  },
  {
    id: "leadgen",
    label: "Lead generation & sales",
    page: "/product/team-inbox",
    primary: "WhatsApp lead generation",
    keywords: [
      "WhatsApp lead generation", "WhatsApp lead capture", "WhatsApp click to chat",
      "WhatsApp chat widget", "WhatsApp website widget", "WhatsApp QR code marketing",
      "WhatsApp link generator", "wa.me link", "WhatsApp landing page", "WhatsApp opt-in",
      "WhatsApp subscriber list", "WhatsApp contact list building", "WhatsApp lead nurturing",
      "WhatsApp sales funnel", "WhatsApp conversion rate", "WhatsApp sales bot",
      "WhatsApp deep link", "WhatsApp click through rate", "WhatsApp cold outreach",
      "WhatsApp B2B marketing",
    ],
  },
  {
    id: "analytics",
    label: "Analytics & optimisation",
    page: "/features",
    primary: "WhatsApp analytics",
    keywords: [
      "WhatsApp analytics", "WhatsApp campaign analytics", "WhatsApp message delivery rate",
      "WhatsApp read receipts", "WhatsApp open rate", "WhatsApp engagement rate", "WhatsApp ROI",
      "WhatsApp reporting dashboard", "WhatsApp A/B testing", "WhatsApp performance metrics",
      "WhatsApp click tracking", "WhatsApp conversion tracking", "WhatsApp attribution",
      "WhatsApp funnel analytics", "WhatsApp KPI tracking", "WhatsApp campaign optimization",
      "WhatsApp response time metrics", "WhatsApp cost per message", "WhatsApp CTR",
      "WhatsApp engagement analytics",
    ],
  },
  {
    id: "compliance",
    label: "Compliance & verification",
    page: "/docs",
    primary: "WhatsApp Business verification",
    keywords: [
      "WhatsApp Business verification", "WhatsApp Green Tick", "WhatsApp official business account",
      "WhatsApp Business Manager", "WhatsApp opt-in compliance", "WhatsApp spam policy",
      "WhatsApp quality rating", "WhatsApp phone number quality", "WhatsApp Business policy",
      "WhatsApp data privacy", "WhatsApp GDPR compliance", "WhatsApp consent management",
      "WhatsApp Meta Business Suite", "WhatsApp Business Solution Provider", "WhatsApp BSP",
      "WhatsApp Tier limits", "WhatsApp messaging limits", "WhatsApp account restrictions",
      "WhatsApp number ban prevention", "WhatsApp policy violation",
    ],
  },
  {
    id: "tools",
    label: "Tools, API & pricing",
    page: "/pricing",
    primary: "WhatsApp Business API pricing",
    keywords: [
      "WhatsApp marketing tools 2026", "best WhatsApp marketing software", "WhatsApp API providers",
      "WhatsApp Business API pricing", "WhatsApp automation tools", "WhatsApp API integration",
      "WhatsApp Zapier integration", "WhatsApp HubSpot integration", "WhatsApp Salesforce integration",
      "WhatsApp API partner", "WhatsApp SaaS platform", "WhatsApp webhook",
      "WhatsApp API documentation", "WhatsApp sandbox testing", "WhatsApp multi number management",
      "WhatsApp API for developers", "WhatsApp Business App vs API", "WhatsApp API cost",
      "WhatsApp marketing cost", "WhatsApp marketing pricing plans",
    ],
  },
  {
    id: "creative",
    label: "Content & creative formats",
    page: "/product/simulator",
    primary: "WhatsApp interactive messages",
    keywords: [
      "WhatsApp status marketing", "WhatsApp status ads", "WhatsApp voice messages marketing",
      "WhatsApp video marketing", "WhatsApp image campaigns", "WhatsApp interactive messages",
      "WhatsApp button messages", "WhatsApp list messages", "WhatsApp carousel messages",
      "WhatsApp quick replies", "WhatsApp call to action buttons", "WhatsApp rich media messages",
      "WhatsApp emoji marketing", "WhatsApp poll messages", "WhatsApp location sharing",
      "WhatsApp catalog messages", "WhatsApp flows", "WhatsApp forms", "WhatsApp survey messages",
      "WhatsApp document sharing",
    ],
  },
  {
    id: "regional",
    label: "Oman & GCC",
    page: "/",
    primary: "WhatsApp marketing Oman",
    keywords: [
      "WhatsApp marketing Oman", "WhatsApp marketing UAE", "WhatsApp marketing Saudi Arabia",
      "WhatsApp marketing GCC", "WhatsApp marketing Muscat", "WhatsApp Business Oman",
      "WhatsApp API Middle East", "WhatsApp marketing Arabic", "WhatsApp Arabic chatbot",
      "WhatsApp marketing Gulf region", "WhatsApp e-commerce GCC", "WhatsApp digital marketing Oman",
      "WhatsApp agency GCC", "WhatsApp marketing Qatar", "WhatsApp marketing Kuwait",
      "WhatsApp marketing Bahrain", "WhatsApp marketing Dubai", "WhatsApp marketing Riyadh",
    ],
  },
  {
    id: "restaurants",
    label: "Restaurants & hospitality",
    page: "/solutions/restaurants-dining",
    primary: "WhatsApp marketing for restaurants",
    keywords: [
      "WhatsApp marketing for restaurants", "WhatsApp table reservation bot",
      "WhatsApp marketing for hotels", "WhatsApp marketing for events",
      "WhatsApp delivery tracking", "WhatsApp logistics updates",
    ],
  },
  {
    id: "healthcare",
    label: "Clinics & appointments",
    page: "/solutions/clinics-hospitals-health",
    primary: "WhatsApp appointment scheduling",
    keywords: [
      "WhatsApp marketing for healthcare", "WhatsApp clinic bot", "WhatsApp booking system",
      "WhatsApp appointment scheduling", "WhatsApp marketing for salons",
      "WhatsApp marketing for fitness", "WhatsApp appointment reminders",
    ],
  },
  {
    id: "travel",
    label: "Travel & tours",
    page: "/solutions/tours-safari-musandam",
    primary: "WhatsApp marketing for travel agencies",
    keywords: [
      "WhatsApp marketing for travel agencies", "WhatsApp booking system",
      "WhatsApp booking confirmation", "WhatsApp marketing for hotels",
    ],
  },
  {
    id: "smart-menu-ordering",
    label: "Smart Menu & Restaurant QR Ordering",
    page: "/product/smart-menu-ordering",
    primary: "Restaurant QR code menu and ordering system",
    keywords: [
      "restaurant QR code menu", "smart menu ordering system", "contactless dining system",
      "live kitchen display system", "restaurant KDS Oman", "digital restaurant menu GCC",
      "AI menu scanner", "scan menu PDF to digital", "table QR ordering", "waiter call system",
      "cafe digital menu", "restaurant POS WhatsApp", "Muscat restaurant ordering",
    ],
  },
  {
    id: "broadcast-campaigns",
    label: "WhatsApp Broadcast Campaigns",
    page: "/product/broadcast-campaigns",
    primary: "WhatsApp broadcast campaigns",
    keywords: [
      "WhatsApp broadcast campaigns", "WhatsApp bulk messaging Oman", "WhatsApp blast marketing GCC",
      "WhatsApp mass messaging software", "Meta approved broadcast templates", "WhatsApp promotional campaign",
      "WhatsApp scheduled broadcast", "WhatsApp drip campaign sequence", "high delivery rate WhatsApp blast",
      "targeted WhatsApp broadcasts", "WhatsApp audience segmentation",
    ],
  },
  {
    id: "digital-vcard",
    label: "Digital vCard & NFC Business Cards",
    page: "/product/digital-vcard",
    primary: "Digital business card Oman",
    keywords: [
      "digital business card Oman", "smart NFC business card Muscat", "digital vCard QR GCC",
      "RFC 6350 vCard generator", "contactless business card", "digital visiting card with video",
      "tap to save contact NFC", "enterprise digital cards Oman", "digital profile card for teams",
    ],
  },
  {
    id: "digital-qr-reviews",
    label: "Digital QR Reviews & Reputation",
    page: "/product/digital-qr-reviews",
    primary: "Google review card Oman",
    keywords: [
      "Google review card Oman", "Google review QR card Muscat", "get 5 star Google reviews GCC",
      "AI Google review reply generator", "reputation management software Oman", "NFC Google review stand",
      "customer review booster WhatsApp", "negative feedback filter QR", "restaurant review card",
    ],
  },
  {
    id: "social-automation",
    label: "Instagram & Facebook DM Automation",
    page: "/product/facebook-instagram-automation",
    primary: "Instagram DM automation Oman",
    keywords: [
      "Instagram DM automation Oman", "Instagram story reply bot", "Facebook Messenger automation GCC",
      "Instagram auto DM comments", "lead capture Instagram Reels", "social media customer support bot",
      "omnichannel social inbox", "Meta business messaging automation",
    ],
  },
  {
    id: "contact",
    label: "Contact & Sales Desk",
    page: "/contact",
    primary: "WhatsApp Business API sales Oman",
    keywords: [
      "WhatsApp Business API sales Oman", "contact Fizmoh support", "WhatsApp Cloud API consultant Muscat",
      "WhatsApp business onboarding GCC", "Fizmoh contact phone number", "WhatsApp SaaS demo request",
    ],
  },
  {
    id: "book-demo",
    label: "Book a Demo",
    page: "/book-demo",
    primary: "Book WhatsApp platform demo",
    keywords: [
      "Book WhatsApp platform demo", "live WhatsApp Cloud API walkthrough", "Fizmoh platform demonstration",
      "WhatsApp automation consultation", "free WhatsApp business software trial",
    ],
  },
  {
    id: "signup",
    label: "Sign Up & Free Trial",
    page: "/signup",
    primary: "WhatsApp Cloud API free trial",
    keywords: [
      "WhatsApp Cloud API free trial", "create WhatsApp business account Oman", "start WhatsApp marketing free",
      "Fizmoh signup", "14 day free trial WhatsApp platform", "no credit card WhatsApp API",
    ],
  },
  {
    id: "whats-new",
    label: "Changelog & Updates",
    page: "/whats-new",
    primary: "Fizmoh updates and changelog",
    keywords: [
      "Fizmoh updates and changelog", "WhatsApp Cloud API latest features", "WhatsApp marketing software release notes",
      "new WhatsApp tools 2026", "Fizmoh platform improvements",
    ],
  },
  {
    id: "blog",
    label: "Blog & Educational Guides",
    page: "/blog",
    primary: "WhatsApp marketing guides Oman",
    keywords: [
      "WhatsApp marketing guides Oman", "WhatsApp business tutorials", "how to sell on WhatsApp GCC",
      "WhatsApp API setup step by step", "WhatsApp commerce case studies", "conversational marketing best practices",
    ],
  },
]

/**
 * Clusters with real search demand and no page to answer them.
 *
 * Listed rather than silently dropped: these are the pages worth writing next,
 * and pretending an existing page covers them would waste the keyword.
 */
export const UNCOVERED_CLUSTERS = [
  { label: "Industry pages", missing: ["real estate", "education", "banks", "insurance", "automotive", "retail"] },
  { label: "Comparison intent", missing: ["WhatsApp vs SMS marketing", "WhatsApp vs email marketing", "WhatsApp Business App vs API"] },
  { label: "Guides & how-to", missing: ["how to use WhatsApp for marketing", "WhatsApp marketing tips", "WhatsApp marketing examples", "WhatsApp marketing case study", "WhatsApp marketing checklist", "WhatsApp marketing statistics"] },
  { label: "2026 / AI trends", missing: ["AI-powered WhatsApp marketing", "WhatsApp AI agents 2026", "WhatsApp channels marketing", "WhatsApp communities marketing"] },
]

/** The keywords for one page: its own clusters, de-duplicated, primary first. */
export function keywordsForPage(path: string): string[] {
  const clean = path.replace(/\/$/, "") || "/"
  const clusters = KEYWORD_CLUSTERS.filter(c => c.page === clean)
  if (!clusters.length) return []
  const out: string[] = []
  for (const c of clusters) {
    if (!out.includes(c.primary)) out.push(c.primary)
  }
  for (const c of clusters) {
    for (const k of c.keywords) if (!out.includes(k)) out.push(k)
  }
  // Kept deliberately short. An exhaustive tag reads as spam to the engines
  // that still parse this, and Google ignores it either way.
  return out.slice(0, 30)
}

/** The single term a page is trying to win, for its title and H1. */
export function primaryKeywordForPage(path: string): string | null {
  const clean = path.replace(/\/$/, "") || "/"
  return KEYWORD_CLUSTERS.find(c => c.page === clean)?.primary ?? null
}
