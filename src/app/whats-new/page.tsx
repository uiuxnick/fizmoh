import WhatsNewPage from "./page-client"

export async function generateMetadata() {
  const { pageSeo } = await import("@/lib/seo-config")
  return pageSeo(
    "/whats-new",
    "What's New in Fizmoh",
    "Latest releases, features and improvements across the Fizmoh WhatsApp commerce platform.",
  )
}

export default function Page() {
  return <WhatsNewPage />
}
