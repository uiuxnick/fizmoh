export interface LocationPage {
  slug: string
  city: string
  country: string
  currency: string
  primaryKeyword: string
  keywords: string[]
  metaTitle: string
  metaDescription: string
  h1: string
  subheadline: string
  heroBadge: string
  intro: string
  localHighlights: { title: string; description: string }[]
  faqs: { q: string; a: string }[]
}

export const LOCATION_PAGES: LocationPage[] = [
  {
    slug: "muscat",
    city: "Muscat",
    country: "Oman",
    currency: "OMR",
    primaryKeyword: "WhatsApp marketing Muscat",
    keywords: [
      "WhatsApp marketing Muscat",
      "WhatsApp Business API Oman",
      "WhatsApp API provider Muscat",
      "WhatsApp automation Muscat",
      "WhatsApp CRM Oman",
      "WhatsApp chatbot Muscat",
      "AmwalPay WhatsApp Muscat",
    ],
    metaTitle: "WhatsApp Business API & Marketing in Muscat, Oman | Fizmoh",
    metaDescription:
      "Enterprise WhatsApp Cloud API provider in Muscat, Oman. Automated broadcasts, AmwalPay payment links in OMR, shared team inboxes, and verified Meta Green Tick support.",
    h1: "WhatsApp Business API & Marketing Platform in Muscat",
    subheadline:
      "Empower your Muscat business with official WhatsApp Cloud API: multi-agent customer support, AmwalPay in-chat checkout, and automated AI smart replies.",
    heroBadge: "Muscat, Sultanate of Oman",
    intro:
      "Muscat's thriving commercial sectors—from retail hubs in Seeb and Bawshar to luxury hospitality in Qurum and Al Mouj—rely heavily on WhatsApp for everyday customer interactions. Fizmoh provides a localized, Meta-compliant infrastructure engineered specifically for Muscat enterprises.",
    localHighlights: [
      {
        title: "Native AmwalPay Payments (OMR)",
        description: "Send instant payment links in Omani Rials directly in the chat. Diners and shoppers pay with debit or credit cards with instant settlement.",
      },
      {
        title: "Local Muscat Onboarding & Support",
        description: "Get dedicated assistance with Meta Business verification, Commercial Registration (CR) approval, and number migration from our local technical team.",
      },
      {
        title: "Bilingual Omani Arabic & English",
        description: "AI bots understand local dialect semantics and respond with natural tone, seamlessly handing over to your staff when required.",
      },
    ],
    faqs: [
      {
        q: "Can I connect my Muscat (+968) business phone number?",
        a: "Yes. Any mobile or landline in the Sultanate can be activated on the WhatsApp Cloud API via Fizmoh.",
      },
      {
        q: "Do you support in-person consultation in Muscat?",
        a: "Yes. Our team provides remote Google Meet demonstrations as well as on-site enterprise onboarding across the Muscat Governorate.",
      },
    ],
  },
  {
    slug: "dubai",
    city: "Dubai",
    country: "United Arab Emirates",
    currency: "AED",
    primaryKeyword: "WhatsApp Business API UAE",
    keywords: [
      "WhatsApp Business API UAE",
      "WhatsApp marketing Dubai",
      "WhatsApp automation UAE",
      "WhatsApp CRM Dubai",
      "WhatsApp Cloud API Dubai",
      "WhatsApp API Dubai",
    ],
    metaTitle: "WhatsApp Business API & Automation in Dubai, UAE | Fizmoh",
    metaDescription:
      "Leading WhatsApp Business Platform for Dubai & UAE enterprises. Scalable broadcast campaigns, high-speed multi-agent CRM, and seamless e-commerce integration.",
    h1: "Enterprise WhatsApp Business Platform in Dubai, UAE",
    subheadline:
      "Accelerate sales cycles and deliver sub-minute customer support in Dubai with official WhatsApp Cloud API automation and visual botflows.",
    heroBadge: "Dubai, United Arab Emirates",
    intro:
      "In Dubai's hyper-competitive market, speed to lead determines revenue. Fizmoh delivers real-time WhatsApp automation, instant appointment bookings, and omnichannel social DM integration across WhatsApp, Instagram, and Messenger.",
    localHighlights: [
      {
        title: "Sub-Minute Response Automation",
        description: "Instantly capture leads from Click-to-WhatsApp ads and qualify prospects before your competitors even open the email.",
      },
      {
        title: "Cross-Border GCC Scalability",
        description: "Manage UAE, Oman, and Saudi customer communication streams from one centralized enterprise dashboard.",
      },
      {
        title: "High-Volume Broadcast Engine",
        description: "Execute scheduled promotional campaigns with 99%+ delivery rates and full Meta compliance to protect your quality rating.",
      },
    ],
    faqs: [
      {
        q: "Does Fizmoh comply with UAE telecommunications guidelines?",
        a: "Yes. All messaging operates through official Meta Cloud API infrastructure with built-in opt-in compliance and consent auditing.",
      },
    ],
  },
  {
    slug: "riyadh",
    city: "Riyadh",
    country: "Saudi Arabia",
    currency: "SAR",
    primaryKeyword: "WhatsApp Business API Saudi Arabia",
    keywords: [
      "WhatsApp Business API Saudi Arabia",
      "WhatsApp marketing Riyadh",
      "WhatsApp API Riyadh",
      "WhatsApp automation Saudi Arabia",
      "WhatsApp CRM Saudi Arabia",
      "WhatsApp software GCC",
    ],
    metaTitle: "WhatsApp Business API & Cloud Platform in Riyadh, KSA | Fizmoh",
    metaDescription:
      "Scale your customer engagement in Riyadh & Saudi Arabia with official WhatsApp Cloud API. Automated bots with Saudi dialect comprehension and team inboxes.",
    h1: "WhatsApp Business Platform for Riyadh & Saudi Arabia",
    subheadline:
      "Power your customer communications with Saudi dialect-aware AI chatbots, broadcast marketing, and seamless team collaboration.",
    heroBadge: "Riyadh, Kingdom of Saudi Arabia",
    intro:
      "As Saudi Arabia accelerates digital transformation under Vision 2030, conversational commerce on WhatsApp is redefining how retail, real estate, and healthcare engage citizens and residents across Riyadh, Jeddah, and the Eastern Province.",
    localHighlights: [
      {
        title: "Saudi Dialect AI Model",
        description: "Trained on Najdi, Hijazi, and regional vocabulary for human-like conversational flows.",
      },
      {
        title: "ZATCA E-Invoicing Ready",
        description: "Send instant transactional receipts and payment links with QR codes compliant with regional tax standards.",
      },
    ],
    faqs: [
      {
        q: "How does Fizmoh support businesses across KSA?",
        a: "We provide cloud-based WhatsApp API infrastructure with multi-currency billing (SAR, OMR, AED) and fast setup.",
      },
    ],
  },
  {
    slug: "doha",
    city: "Doha",
    country: "Qatar",
    currency: "QAR",
    primaryKeyword: "WhatsApp Business API Qatar",
    keywords: [
      "WhatsApp Business API Qatar",
      "WhatsApp marketing Doha",
      "WhatsApp automation Qatar",
      "WhatsApp CRM Middle East",
    ],
    metaTitle: "WhatsApp Business API & CRM in Doha, Qatar | Fizmoh",
    metaDescription:
      "Official WhatsApp Cloud API solutions for Doha businesses. Multi-agent customer support, automated marketing, and appointment scheduling.",
    h1: "WhatsApp Business API Solutions in Doha, Qatar",
    subheadline:
      "Transform customer service and booking workflows for your Qatar enterprise with automated WhatsApp Cloud API tools.",
    heroBadge: "Doha, State of Qatar",
    intro:
      "From hospitality along West Bay to luxury retail in The Pearl, Qatari consumers demand instant, personalized responses on WhatsApp. Fizmoh provides the speed, security, and scalability required by modern businesses.",
    localHighlights: [
      {
        title: "Smart Booking & Reservations",
        description: "Automate dining and salon table bookings with real-time calendar slot holds and WhatsApp reminders.",
      },
    ],
    faqs: [
      {
        q: "Can Qatari (+974) numbers be connected?",
        a: "Yes. All GCC numbers are fully supported on the Meta Cloud API via Fizmoh.",
      },
    ],
  },
  {
    slug: "kuwait-city",
    city: "Kuwait City",
    country: "Kuwait",
    currency: "KWD",
    primaryKeyword: "WhatsApp Business API Kuwait",
    keywords: [
      "WhatsApp Business API Kuwait",
      "WhatsApp marketing Kuwait",
      "WhatsApp automation Kuwait",
      "WhatsApp CRM Kuwait",
    ],
    metaTitle: "WhatsApp Business API & Automation in Kuwait City | Fizmoh",
    metaDescription:
      "Enhance customer communications in Kuwait City with WhatsApp Cloud API. Team inboxes, automated e-commerce updates, and high-delivery broadcasts.",
    h1: "WhatsApp Business Automation in Kuwait City",
    subheadline:
      "Drive repeat orders and streamline customer service in Kuwait with enterprise WhatsApp messaging.",
    heroBadge: "Kuwait City, State of Kuwait",
    intro:
      "Kuwait has one of the highest social commerce penetration rates in the region. Fizmoh gives Kuwaiti retailers and boutiques the tools to turn WhatsApp into an automated sales machine.",
    localHighlights: [
      {
        title: "E-Commerce Order Automation",
        description: "Recover abandoned carts, send live dispatch alerts, and accept order confirmations automatically.",
      },
    ],
    faqs: [
      {
        q: "Is Fizmoh suitable for retail boutiques in Kuwait?",
        a: "Absolutely. With built-in digital catalogs and cart recovery sequences, boutique retailers see immediate ROI.",
      },
    ],
  },
  {
    slug: "manama",
    city: "Manama",
    country: "Bahrain",
    currency: "BHD",
    primaryKeyword: "WhatsApp Business API Bahrain",
    keywords: [
      "WhatsApp Business API Bahrain",
      "WhatsApp marketing Bahrain",
      "WhatsApp CRM Bahrain",
      "WhatsApp automation Bahrain",
    ],
    metaTitle: "WhatsApp Business API & Cloud CRM in Manama, Bahrain | Fizmoh",
    metaDescription:
      "Connect your Bahrain business to official WhatsApp Cloud API. Shared team inboxes, smart auto-responders, and verified Green Tick onboarding.",
    h1: "WhatsApp Business API & CRM in Manama, Bahrain",
    subheadline:
      "Scale customer support and sales operations across Bahrain with a unified WhatsApp Business platform.",
    heroBadge: "Manama, Kingdom of Bahrain",
    intro:
      "Financial services, clinics, and hospitality brands across Manama rely on Fizmoh to manage customer conversations securely and at scale.",
    localHighlights: [
      {
        title: "Multi-Agent Support Queue",
        description: "Allow your entire team to manage customer inquiries from one central WhatsApp business number.",
      },
    ],
    faqs: [
      {
        q: "Can we migrate our existing Bahraini number?",
        a: "Yes. Migration takes less than 15 minutes with zero message downtime.",
      },
    ],
  },
]

export function locationBySlug(slug: string): LocationPage | undefined {
  return LOCATION_PAGES.find(p => p.slug === slug.toLowerCase())
}
