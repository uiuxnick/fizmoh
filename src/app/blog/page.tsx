import BlogIndexPage from "./page-client"

export async function generateMetadata() {
  const { pageSeo } = await import("@/lib/seo-config")
  return pageSeo(
    "/blog",
    "WhatsApp Business Blog & Guides",
    "Practical guides on WhatsApp Business API, automation, conversational commerce and payments for businesses in Oman and the GCC.",
  )
}

export default function Page() {
  return <BlogIndexPage />
}
