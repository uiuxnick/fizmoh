import { MarketingPage } from "@/components/marketing-pages"
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo"

export async function generateMetadata() {
  const { pageSeo } = await import("@/lib/seo-config")
  return pageSeo("/pricing", "Fizmoh Pricing and Plans", "Compare Fizmoh plans, included modules, usage limits and add-ons for WhatsApp commerce and business automation.")
}

export default function PricingPage() {
  const pricingUrl = absoluteUrl("/pricing")

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Pricing & Plans",
        item: pricingUrl,
      },
    ],
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What currency are Fizmoh subscriptions billed in?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "All Fizmoh subscriptions are billed transparently in Omani Rials (OMR) without foreign exchange conversion fees. Payments can be made via local bank cards, corporate cards, or AmwalPay.",
        },
      },
      {
        "@type": "Question",
        name: "Does Fizmoh add a markup to Meta WhatsApp messaging fees?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Fizmoh passes through Meta's official WhatsApp conversation costs with 0% markup. You only pay for your software platform subscription plus official Meta messaging fees.",
        },
      },
      {
        "@type": "Question",
        name: "Is there a free trial available?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, Fizmoh provides a 14-day free trial on all plans. You can connect your WhatsApp number, test the visual botflow builder, and test the shared team inbox risk-free.",
        },
      },
      {
        "@type": "Question",
        name: "Can I upgrade or downgrade my plan at any time?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, you can upgrade, downgrade, or add modules at any time directly from the billing dashboard with automatic pro-rated billing.",
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        suppressHydrationWarning
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        suppressHydrationWarning
      />
      <MarketingPage kind="pricing" />
    </>
  )
}
