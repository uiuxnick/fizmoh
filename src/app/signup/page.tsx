import SignupPage from "./page-client"

export async function generateMetadata() {
  const { pageSeo } = await import("@/lib/seo-config")
  return pageSeo(
    "/signup",
    "Start Your Free 14-Day Trial",
    "Create a Fizmoh workspace and connect your official WhatsApp Business number. No credit card required, 60-second API setup.",
  )
}

export default function Page() {
  return <SignupPage />
}
