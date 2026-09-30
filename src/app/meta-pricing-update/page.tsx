import MetaPricingUpdateClient from "./page-client"
import { absoluteUrl, SITE_URL } from "@/lib/seo"

export async function generateMetadata() {
  const { pageSeo } = await import("@/lib/seo-config")
  return pageSeo(
    "/meta-pricing-update",
    "Meta WhatsApp Business Platform Pricing Updates (Oct 1, 2026) | OMR & USD Rates",
    "Official Meta WhatsApp Business Platform pricing changes effective October 1, 2026. Service messages, utility templates, 1,000 free tier, and revised market rates in Omani Rials (OMR) and USD.",
  )
}

export default function MetaPricingUpdatePage() {
  const updateUrl = absoluteUrl("/meta-pricing-update")

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
        name: "Pricing",
        item: `${SITE_URL}/pricing`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Meta Pricing Updates (Oct 1, 2026)",
        item: updateUrl,
      },
    ],
  }

  const newsArticleSchema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: "WhatsApp Business Platform Pricing Changing from October 1, 2026",
    description: "Official Meta WhatsApp Business Platform pricing changes effective October 1, 2026. Service messages, utility templates, 1,000 free monthly tier, and per-message rates in OMR and USD.",
    datePublished: "2026-09-30T12:00:00+04:00",
    dateModified: "2026-09-30T21:00:00+04:00",
    author: {
      "@type": "Organization",
      name: "Fizmoh Platform",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Fizmoh",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
      },
    },
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleSchema) }}
        suppressHydrationWarning
      />
      <MetaPricingUpdateClient />
    </>
  )
}
