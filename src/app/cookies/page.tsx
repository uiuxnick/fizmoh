import type { Metadata } from "next"
import { LegalPage } from "@/components/legal-page"

export const metadata: Metadata = {
  title: "Cookies | Fizmoh",
  description: "The cookies Fizmoh sets, and why.",
}

/**
 * What this site stores in a browser.
 *
 * Short because the list is short: Fizmoh sets no advertising or analytics
 * cookies, so there is no consent banner and nothing to opt out of.
 */
export default function CookiesPage() {
  return (
    <LegalPage title="Cookies" updated="12 August 2026">
      <p>
        Fizmoh sets three cookies, all of them necessary for the product to work. There are no
        advertising cookies, no analytics cookies and no third-party trackers, which is why you
        have not been asked to accept anything.
      </p>

      <h2>What is set</h2>
      <ul>
        <li>
          <strong>wptour_staff_session</strong> — proves you are signed in. Expires after eight
          hours. Without it you would be asked for your password on every page.
        </li>
        <li>
          <strong>wptour_customer_session</strong> — the same, for a customer checking their own
          booking. Expires after seven days.
        </li>
        <li>
          <strong>fizmoh_workspace</strong> — which workspace you are looking at, for people who
          belong to more than one. Expires after thirty days. It is a preference, not a
          permission: what you may see is checked against your membership on every request.
        </li>
      </ul>

      <h2>Clearing them</h2>
      <p>
        Signing out removes the session cookies. Clearing them in your browser is equally
        effective and signs you out. The product does not work while signed out, which is the
        intended behaviour rather than a fault.
      </p>

      <h2>What your customers&rsquo; browsers get</h2>
      <p>
        A public shop page sets no cookies at all until somebody starts a booking. Nothing on it
        reports back to us, to Meta, or to anybody else about who visited.
      </p>
    </LegalPage>
  )
}
