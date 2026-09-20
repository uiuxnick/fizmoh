import WhatsNewPage from "./page-client"
import { absoluteUrl, SITE_URL } from "@/lib/seo"

export async function generateMetadata() {
  const { pageSeo } = await import("@/lib/seo-config")
  return pageSeo(
    "/whats-new",
    "What's New in Fizmoh",
    "Latest releases, features and improvements across the Fizmoh WhatsApp commerce platform.",
  )
}

export default function Page() {
  const whatsNewUrl = absoluteUrl("/whats-new")

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
        name: "What's New & Changelog",
        item: whatsNewUrl,
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
      <WhatsNewPage />
    </>
  )
}
