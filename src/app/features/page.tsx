import { MarketingPage } from "@/components/marketing-pages"
export async function generateMetadata() {
  const { pageSeo } = await import("@/lib/seo-config")
  return pageSeo("/features", "WhatsApp Commerce & Automation Features", "Explore Fizmoh features for WhatsApp inboxes, AI automation, CRM, bookings, payments, hospital operations and restaurant POS.")
}
export default function FeaturesPage() { return <MarketingPage kind="features" /> }
