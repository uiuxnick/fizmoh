import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo"
import type { MarketingPage } from "@/lib/marketing/types"

/**
 * Structured data for a Product or Industry landing page.
 *
 * Three graphs, all describing content that is genuinely on the page:
 *  - Product (products) or Service (industries)
 *  - FAQPage — only the questions actually rendered in the FAQ accordion
 *  - BreadcrumbList — matches the visible path
 *
 * Deliberately omitted: `offers`/price and `aggregateRating`. There is no
 * per-page price, and there are no real reviews — inventing either is a Google
 * structured-data violation and a common cause of manual actions. See the note
 * in components/seo-structured-data.tsx.
 */
export function MarketingJsonLd({
  page,
  variant,
}: {
  page: MarketingPage
  variant: "product" | "industry"
}) {
  const path = variant === "product" ? `/product/${page.slug}` : `/solutions/${page.slug}`
  const url = absoluteUrl(path)
  const name = page.metaTitle.en.split("|")[0].trim()
  const description = page.metaDescription.en

  const primary =
    page.schemaType === "Product"
      ? {
          "@type": "Product",
          "@id": `${url}#product`,
          name,
          description,
          url,
          category: "WhatsApp Business Software",
          brand: { "@type": "Brand", name: "Fizmoh" },
          manufacturer: { "@id": `${SITE_URL}/#organization` },
          audience: { "@type": "BusinessAudience", audienceType: "Businesses in Oman and the GCC" },
        }
      : {
          "@type": "Service",
          "@id": `${url}#service`,
          name,
          description,
          url,
          serviceType: page.primaryKeyword,
          provider: { "@id": `${SITE_URL}/#organization` },
          areaServed: ["OM", "AE", "SA", "QA", "KW", "BH"],
          availableLanguage: ["en", "ar"],
        }

  const faqPage = {
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    mainEntity: page.faqs.map(faq => ({
      "@type": "Question",
      name: faq.q.en,
      acceptedAnswer: { "@type": "Answer", text: faq.a.en },
    })),
  }

  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: variant === "product" ? "Products" : "Industries",
        item: absoluteUrl(variant === "product" ? "/features" : "/features"),
      },
      { "@type": "ListItem", position: 3, name, item: url },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", "@graph": [primary, faqPage, breadcrumb] }),
      }}
    />
  )
}
