import BookDemoPage from "./page-client"

export async function generateMetadata() {
  const { pageSeo } = await import("@/lib/seo-config")
  return pageSeo(
    "/book-demo",
    "Book a Live WhatsApp Platform Demo",
    "See Fizmoh in action on a live Google Meet call: WhatsApp Cloud API, multi-agent inbox, AI bots, bookings and AmwalPay checkout.",
  )
}

export default function Page() {
  return <BookDemoPage />
}
