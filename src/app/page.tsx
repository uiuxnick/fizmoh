import { cookies } from "next/headers"
import MarketingHome from "@/components/marketing-home"
import AppShell from "@/components/app-shell"
import { CUSTOMER_COOKIE, STAFF_COOKIE } from "@/lib/auth"
import { SeoStructuredData } from "@/components/seo-structured-data"

export async function generateMetadata() {
  const { pageSeo } = await import("@/lib/seo-config")
  return pageSeo(
    "/",
    "Fizmoh — Official WhatsApp Business Platform & Cloud API in Oman & GCC",
    "Official Meta WhatsApp Business Cloud API platform in Oman & GCC. Multi-agent team inbox, visual AI bot builder, broadcast campaigns, CRM, website live chat widget, and AmwalPay online payments.",
  )
}

/**
 * The front door, decided on the server.
 *
 * This route used to be one client component that rendered a spinner until it
 * had hydrated *and* confirmed a session over the network. Correct for the
 * application, ruinous for the marketing site: the server sent a spinner and
 * nothing else, so the homepage had no headline, no copy and no links in its
 * HTML. Every crawler that does not execute JavaScript — and every one that
 * does it slowly, which is most of them — saw an empty page.
 *
 * The decision is now made from the session cookie before anything renders:
 *
 *  - **No cookie** → the marketing page, server-rendered, fully in the HTML.
 *  - **A cookie** → the application shell, which behaves exactly as before and
 *    still verifies the session properly against the API. The cookie's presence
 *    only chooses which UI to send; it is not treated as proof of anything.
 *
 * Nothing here trusts the cookie for authorisation. A forged or expired cookie
 * gets the app shell, whose own session check then sends the visitor to sign in.
 */
export default async function Page() {
  const jar = await cookies()
  const signedIn = jar.has(STAFF_COOKIE) || jar.has(CUSTOMER_COOKIE)

  if (!signedIn) {
    return (
      <>
        <SeoStructuredData isHomepage={true} />
        <MarketingHome />
      </>
    )
  }

  return <AppShell />
}

