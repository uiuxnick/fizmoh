import { MarketingPage } from "@/components/marketing-pages"
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo"

export async function generateMetadata() {
  const { pageSeo } = await import("@/lib/seo-config")
  return pageSeo(
    "/templates",
    "44+ Pre-Built WhatsApp Bot Flow Templates (Wati & Interakt Alternative) | Fizmoh",
    "Browse 44+ production-ready WhatsApp chatbot templates for E-Commerce, Abandoned Cart Recovery, COD Address Verification, Google Reviews 5-Star Shield, Clinics, and Tours with 1-click install."
  )
}

export default function TemplatesPage() {
  const pageUrl = absoluteUrl("/templates")

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
        name: "Bot Flow Templates",
        item: pageUrl,
      },
    ],
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Can I use these WhatsApp bot templates directly like Wati or Interakt?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Fizmoh provides 44+ pre-built, production-tested bot flow templates that can be loaded into your workspace with 1 click. You can customize text, buttons, AI instructions, and triggers without writing code.",
        },
      },
      {
        "@type": "Question",
        name: "How does the Abandoned Cart Recovery bot template work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "When a customer leaves items in their Shopify, Salla, Zid, or WooCommerce cart, the bot automatically sends a polite WhatsApp notification with a product summary and an optional 10% discount voucher with a 1-click checkout link.",
        },
      },
      {
        "@type": "Question",
        name: "How does the Cash on Delivery (COD) address verification bot reduce RTO?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The bot automatically prompts customers to confirm their delivery address, city/wilayat, and phone number via quick-reply buttons before courier dispatch. This reduces Return-to-Origin (RTO) and courier delivery failures by up to 40%.",
        },
      },
      {
        "@type": "Question",
        name: "Can I combine AI with these bot flow templates?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Every template can include AI reply nodes and Knowledge Base (RAG) lookups. When a customer asks an unscripted question, the AI answers using your uploaded documents before handing off to a human agent if needed.",
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
      <MarketingPage kind="templates" />
    </>
  )
}
