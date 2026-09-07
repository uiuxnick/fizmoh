import ContactPage from "./page-client"

export async function generateMetadata() {
  const { pageSeo } = await import("@/lib/seo-config")
  return pageSeo(
    "/contact",
    "Contact Fizmoh",
    "Talk to the Fizmoh team about WhatsApp Business API onboarding, pricing, integrations and support in Oman and the GCC.",
  )
}

export default function Page() {
  return <ContactPage />
}
