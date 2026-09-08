import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo"

export async function SeoStructuredData({ isHomepage = false }: { isHomepage?: boolean } = {}) {
  if (!isHomepage) {
    const rootGraph = [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        alternateName: "منصة فيزموه لواتساب بزنس",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl("/fizmoh-logo.png"),
          width: 512,
          height: 512,
        },
        address: {
          "@type": "PostalAddress",
          addressLocality: "Muscat",
          addressCountry: "OM",
        },
        contactPoint: [
          {
            "@type": "ContactPoint",
            telephone: "+968-78836104",
            contactType: "customer service",
            areaServed: ["OM", "AE", "SA", "QA", "KW", "BH"],
            availableLanguage: ["English", "Arabic"],
          },
        ],
        sameAs: [
          "https://app.fizmoh.com",
          "https://app.fizmoh.cloud",
          "https://twitter.com/fizmohcloud",
          "https://www.linkedin.com/company/fizmoh",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/blog?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
        inLanguage: ["en-US", "ar-OM", "ar-SA", "ar-AE"],
      },
    ]

    return (
      <script
        id="ldjson-organization"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": rootGraph }) }}
        suppressHydrationWarning
      />
    )
  }

  /*
   * Prices come from the plans table, not from a literal.
   *
   * The markup advertised 15-95 OMR while the published plans were 20-50, so
   * a rich result would have quoted a price the customer could not get. Price
   * markup that disagrees with the page is both a Google structured-data
   * violation and a promise the checkout will not honour.
   *
   * Prices are stored in baisa (1 OMR = 1000), so they are divided here. If
   * the plans cannot be read, the offer block is omitted rather than guessed.
   */
  let offers: Record<string, string> | null = null
  try {
    const { raw } = await import("@/lib/db")
    const plans = await raw.plan.findMany({
      where: { isPublic: true },
      select: { priceMonthly: true },
    })
    const prices = plans
      .map(p => Number(p.priceMonthly) / 1000)
      .filter(n => Number.isFinite(n) && n > 0)
    if (prices.length) {
      offers = {
        "@type": "AggregateOffer",
        url: absoluteUrl("/pricing"),
        priceCurrency: "OMR",
        lowPrice: String(Math.min(...prices)),
        highPrice: String(Math.max(...prices)),
        offerCount: String(prices.length),
      }
    }
  } catch {
    offers = null
  }

  const homeGraph = [
    {
      "@type": "SoftwareApplication",
      name: "Fizmoh WhatsApp Business Platform",
      alternateName: "منصة فيزموه لواتساب والأتمتة السحابية",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "WhatsApp Commerce, Marketing & AI Automation Platform",
      operatingSystem: "Cloud, Web, iOS, Android",
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
      description:
        "Official WhatsApp Business Cloud API platform with multi-agent team inbox, visual AI bot builder, website live chat widget, Instagram and Facebook automation, appointment bookings, AmwalPay online payments, and CRM across Oman and the GCC.",
      ...(offers ? { offers } : {}),
      featureList: [
        "Official Meta WhatsApp Cloud API Provider",
        "Multi-Agent Shared Team Inbox with human takeover",
        "Embeddable Website Live Chat & WhatsApp Click-to-Chat Widget",
        "Instagram Direct Message & Story Mention Automation",
        "Facebook Messenger Lead Generation & Automated Replies",
        "Conversational AI Chatbot Builder supporting Gulf Arabic & English",
        "AmwalPay Online Card Checkout in Omani Rials (OMR)",
        "Smart Menu & QR Dining with Live Kitchen Display System (KDS)",
        "GPT-4o Vision AI Menu Scanner for PDF & Photo Menu Digitization",
        "Digital Business Cards (vCard) with 1-Click Phonebook Sync",
        "Digital QR Reviews Card with AI Review Response Generator",
        "Appointment & Clinic Bed Management",
        "Tours & Safari Booking Engine with PDF Vouchers",
        "Two-way WooCommerce Store Sync",
        "Multi-tenant Agency Workspace Architecture",
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How fast can I connect my WhatsApp Business number with Fizmoh?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "With official Meta Embedded Signup, you can connect your existing WhatsApp Business number in under 60 seconds with automatic token exchange.",
          },
        },
        {
          "@type": "Question",
          name: "How does the Smart Menu & QR table ordering system work for restaurants?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Diners scan branded QR codes on dining tables to browse visual menus and place orders without downloading any app. Orders route instantly to the Live Kitchen Display System (KDS) with audio chimes and timers.",
          },
        },
        {
          "@type": "Question",
          name: "Can I digitize my restaurant PDF or printed menu using AI?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, Fizmoh's GPT-4o Vision AI Menu Scanner automatically extracts dish names, descriptions, categories, and OMR prices from multi-page PDFs or mobile photos in under 2 minutes.",
          },
        },
        {
          "@type": "Question",
          name: "Does Fizmoh support online card payments in OMR via AmwalPay?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, Fizmoh integrates natively with AmwalPay for instant debit/credit card checkout in OMR with verified cryptographic webhooks.",
          },
        },
        {
          "@type": "Question",
          name: "كيف يعمل نظام المنيو الذكي وطلبات الطاولات وشاشة المطبخ KDS في المطاعم؟",
          acceptedAnswer: {
            "@type": "Answer",
            text: "يمسح الزائر رمز QR على الطاولة بهاتفه لفتح القائمة التفاعلية والطلب مباشرة بدون تطبيقات. تصل التذاكر فوراً لشاشة المطبخ الحية (KDS) مع تنبيهات صوتية ومؤقتات لتحضير الأطباق.",
          },
        },
        {
          "@type": "Question",
          name: "كيف يقوم ماسح المنيو بالذكاء الاصطناعي برقمنة قوائم الطعام من PDF والصور؟",
          acceptedAnswer: {
            "@type": "Answer",
            text: "يعتمد الماسح الذكي على نموذج GPT-4o Vision لاستخراج الأصناف والأسعار بالريال العماني والتصنيفات بدقة متناهية من ملفات PDF وصور القوائم الورقية بضغطة زر واحدة.",
          },
        },
        {
          "@type": "Question",
          name: "كيف أقبل المدفوعات الإلكترونية عبر واتساب في سلطنة عمان؟",
          acceptedAnswer: {
            "@type": "Answer",
            text: "تتكامل منصة Fizmoh مع بوابة الدفع أموال باي (AmwalPay) بالريال العماني، لإنشاء روابط دفع فورية وتأكيد العمليات آلياً بدون أي تدخل يدوي.",
          },
        },
        {
          "@type": "Question",
          name: "هل تدعم منصة Fizmoh اللهجات الخليجية واللغة العربية في الشات بوت؟",
          acceptedAnswer: {
            "@type": "Answer",
            text: "نعم، تم تدريب نماذج الذكاء الاصطناعي في Fizmoh على فهم اللهجات الخليجية (العمانية، الإماراتية، السعودية) واللغة العربية الفصحى للرد على استفسارات العملاء على مدار الساعة.",
          },
        },
        {
          "@type": "Question",
          name: "How does the Fizmoh website live chat and WhatsApp widget work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Fizmoh provides a lightweight floating widget that embeds on any website. Visitors can either chat in real-time with an AI bot / human agent, or click to transfer the conversation directly into WhatsApp.",
          },
        },
        {
          "@type": "Question",
          name: "كيف أربط شات الموقع الإلكتروني والواتساب في نافذة واحدة للزوار؟",
          acceptedAnswer: {
            "@type": "Answer",
            text: "توفر منصة فيزموه ويدجت ذكي يتيح لزوار موقعك المحادثة الحية المباشرة مع فريقك أو الانتقال بضغطة زر واحدة لتطبيق واتساب مع الاحتفاظ ببيانات العميل وسجل المحادثة كاملاً.",
          },
        },
      ],
    },
  ]

  return (
    <script
      id="ldjson-homepage"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": homeGraph }) }}
      suppressHydrationWarning
    />
  )
}

