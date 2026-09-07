import type { Metadata } from "next"
import { LegalPage } from "@/components/legal-page"

export const metadata: Metadata = {
  title: "Terms of Service | Fizmoh",
  description: "The agreement between Fizmoh and the businesses that use it.",
}

/** The agreement with the businesses that use the platform. */
export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="12 August 2026">
      <p>
        These terms apply between Fizmoh and the business using it. Creating a workspace accepts
        them. If you are accepting on behalf of a company, you are confirming you may.
      </p>

      <h2>What we provide</h2>
      <p>
        Software for messaging customers on WhatsApp, taking bookings and payments, and
        automating replies. We provide the software and keep it running. We are not a party to
        anything you sell, and we do not handle your customers&rsquo; money — that goes to your
        own merchant account, through your own gateway.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Keep your sign-in details to yourself, and give each colleague their own.</li>
        <li>Everything done under your account is your responsibility, including by people you invited.</li>
        <li>Tell us promptly if you think somebody else has access.</li>
      </ul>

      <h2>What you may send</h2>
      <p>
        Messaging is governed by our <a href="/acceptable-use">Acceptable Use Policy</a> and by
        Meta&rsquo;s own policies, which apply to every message that leaves this platform. Where
        they conflict with these terms, they win — we cannot agree on Meta&rsquo;s behalf to
        something Meta forbids.
      </p>

      <h2>Paying for it</h2>
      <ul>
        <li>Trials last as stated at sign-up and need no card. Nothing is charged automatically when one ends.</li>
        <li>Subscriptions are billed in advance for the period chosen, in the currency shown.</li>
        <li>A missed payment does not switch anything off immediately. Your workspace keeps working for a week, then becomes read-only until it is paid.</li>
        <li>Read-only means read-only: you keep everything, can still see it and can still export it.</li>
        <li>Prices can change with thirty days&rsquo; notice, never mid-period.</li>
        <li>Part-months are not refunded. Cancel before renewal and you keep the rest of the period you paid for.</li>
      </ul>

      <h2>Your data</h2>
      <p>
        Your customers, conversations, orders and files remain yours. We claim no ownership and
        make no other use of them. We hold them on your behalf under our{" "}
        <a href="/privacy">Privacy Policy</a>, and you can export or delete them at any time.
      </p>

      <h2>Availability</h2>
      <p>
        We aim to keep the service up and will say so honestly when it is not. We depend on
        Meta&rsquo;s WhatsApp platform, on payment gateways and on hosting providers, and an
        outage in any of them is an outage here. We do not promise uninterrupted service, and we
        do not charge for a month we could not deliver.
      </p>

      <h2>Ending it</h2>
      <ul>
        <li><strong>You:</strong> stop paying, or ask us to close the workspace. Export first — after thirty days it is gone.</li>
        <li><strong>Us:</strong> for a serious breach of the Acceptable Use Policy, for non-payment beyond the grace period, or where continuing would put the platform&rsquo;s WhatsApp access at risk for everybody else. Except where the law forbids it, you get notice and time to export.</li>
      </ul>

      <h2>Liability</h2>
      <p>
        We are liable for what we get wrong, up to the amount you paid us in the twelve months
        before the problem. We are not liable for lost profits or lost business, for what you sent
        your customers, or for a decision Meta made about your WhatsApp account. Nothing here
        limits liability that cannot lawfully be limited.
      </p>

      <h2>Governing law</h2>
      <p>
        The laws of the Sultanate of Oman, and its courts. Write to{" "}
        <a href="mailto:support@fizmoh.cloud">support@fizmoh.cloud</a> before writing to a lawyer —
        most of what reaches us is a misunderstanding we can fix the same day.
      </p>
    </LegalPage>
  )
}
