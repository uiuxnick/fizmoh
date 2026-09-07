import { MarketingPage } from "@/components/marketing-pages"
export async function generateMetadata() {
  const { pageSeo } = await import("@/lib/seo-config")
  return pageSeo("/pricing", "Fizmoh Pricing and Plans", "Compare Fizmoh plans, included modules, usage limits and add-ons for WhatsApp commerce and business automation.")
}
export default function PricingPage() { return <MarketingPage kind="pricing" /> }
