import type { Metadata } from "next"
import { LegalPage } from "@/components/legal-page"

export const metadata: Metadata = {
  title: "Data Deletion | Fizmoh",
  description: "How to have your data deleted from Fizmoh, whichever side of it you are on.",
}

/**
 * The deletion instructions Meta requires a reachable URL for.
 *
 * Written for two audiences, because both arrive here: somebody who was
 * messaged by a business, and the business itself. Telling the first to
 * contact the second, with a way to reach us if that fails, is the honest
 * version — we hold their data on somebody else's instructions and cannot
 * pretend otherwise.
 */
export default function DataDeletionPage() {
  return (
    <LegalPage title="Data Deletion" updated="12 August 2026">
      <p>
        How to have data removed depends on whose it is. Both routes are below, and both end with
        a way to reach us if the first attempt goes nowhere.
      </p>

      <h2>If a business messaged you on WhatsApp</h2>
      <p>
        That business holds your details, not us — we run the software they used. To have them
        removed:
      </p>
      <ul>
        <li>
          <strong>Reply to the conversation</strong> with &ldquo;delete my data&rdquo;. It reaches
          the business directly and creates a record of when you asked.
        </li>
        <li>
          <strong>Or write to us</strong> at <a href="mailto:privacy@fizmoh.cloud">privacy@fizmoh.cloud</a>{" "}
          with the WhatsApp number you were messaged on and the name of the business. We will pass
          it on, and if they have not acted within thirty days we will delete it ourselves.
        </li>
      </ul>
      <p>
        Deleted means deleted: your contact record, the conversation, the media in it and any
        notes about you. Orders and payments may be kept where accounting law requires it — in
        that case only the transaction, with your contact details removed from it.
      </p>

      <h2>If you use Fizmoh to run a business</h2>
      <ul>
        <li>
          <strong>One customer:</strong> open their record and delete it. Everything attached to
          them goes with it.
        </li>
        <li>
          <strong>Your whole workspace:</strong> write to{" "}
          <a href="mailto:privacy@fizmoh.cloud">privacy@fizmoh.cloud</a> from the email address
          that owns it. We confirm before we act, because this is not reversible. You get an
          export first if you want one.
        </li>
      </ul>
      <p>
        A closed workspace is kept for thirty days and then removed from live systems; backups age
        out within a further ninety. Nothing is deleted the moment a subscription lapses — a
        business behind on a payment still owns its customer list, and finds it where it left it.
      </p>

      <h2>Facebook and WhatsApp connections</h2>
      <p>
        If you connected a WhatsApp Business account through Facebook, removing Fizmoh from your
        Business Settings on Facebook revokes our access to it immediately. That stops us
        receiving anything new; to remove what was already received, use one of the routes above.
      </p>

      <h2>How long it takes</h2>
      <p>
        We acknowledge within two working days and complete within thirty. If a request is refused
        — which happens only where the law requires us to keep something — we say which law and
        for how long.
      </p>
    </LegalPage>
  )
}
