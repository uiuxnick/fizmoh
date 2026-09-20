import BookDemoPage from "./page-client"
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo"

export async function generateMetadata() {
  const { pageSeo } = await import("@/lib/seo-config")
  return pageSeo(
    "/book-demo",
    "Book a Live WhatsApp Platform Demo",
    "See Fizmoh in action on a live Google Meet call: WhatsApp Cloud API, multi-agent inbox, AI bots, bookings and AmwalPay checkout.",
  )
}

export default function Page() {
  const demoUrl = absoluteUrl("/book-demo")

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${demoUrl}#service`,
    name: "1-on-1 WhatsApp Business Platform Demo & Consultation",
    serviceType: "Software Consultation & Live Demo",
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: absoluteUrl("/fizmoh-logo.png"),
    },
    areaServed: ["OM", "AE", "SA", "QA", "KW", "BH"],
    description: "Book a personalized 30-minute Google Meet consultation with a Fizmoh Solutions Architect. Explore custom WhatsApp Cloud API flows, AI bot setup, and AmwalPay integration.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "OMR",
      availability: "https://schema.org/InStock",
    },
  }

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
        name: "Book a Demo",
        item: demoUrl,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
        suppressHydrationWarning
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        suppressHydrationWarning
      />
      <BookDemoPage />
    </>
  )
}
