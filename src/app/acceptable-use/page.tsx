import type { Metadata } from "next"
import { LegalPage } from "@/components/legal-page"

export const metadata: Metadata = {
  title: "Acceptable Use | Fizmoh",
  description: "What businesses may and may not do with Fizmoh and the WhatsApp Business Platform.",
}

/**
 * The rules a business agrees to when it sends through our WhatsApp app.
 *
 * Required in substance by Meta: a Business Solution Provider has to hold its
 * customers to WhatsApp's own commerce and messaging policies, and be able to
 * show what those customers agreed to. It is also the document we point at
 * when suspending somebody, which is a conversation that goes far better when
 * the rule was written down first.
 */
export default function AcceptableUsePage() {
  return (
    <LegalPage title="Acceptable Use Policy" updated="12 August 2026">
      <p>
        Fizmoh sends messages through the WhatsApp Business Platform. Meta&rsquo;s rules apply to
        every message that leaves this platform, and where they are stricter than ours, theirs
        win. This page is what you agree to when you use Fizmoh to message people.
      </p>

      <h2>Consent comes first</h2>
      <p>
        Only message people who have given you permission to message them on WhatsApp, on the
        number they gave you, for the purpose they gave it for. A phone number obtained from a
        purchased list, scraped from a website, or collected for something unrelated is not
        consent, and using one is grounds for immediate suspension.
      </p>
      <ul>
        <li>Make it clear who you are when you ask for permission.</li>
        <li>Keep a record of when and how permission was given.</li>
        <li>Honour an opt-out immediately, however it is worded. &ldquo;Stop&rdquo;,
          &ldquo;unsubscribe&rdquo; and &ldquo;leave me alone&rdquo; all mean the same thing.</li>
      </ul>

      <h2>What you must not send</h2>
      <ul>
        <li>Anything Meta&rsquo;s <a href="https://www.whatsapp.com/legal/commerce-policy/" rel="noopener noreferrer" target="_blank">Commerce Policy</a> prohibits — including alcohol where restricted, tobacco, weapons, drugs, supplements, live animals, adult content, gambling and medical devices.</li>
        <li>Anything Meta&rsquo;s <a href="https://www.whatsapp.com/legal/business-policy/" rel="noopener noreferrer" target="_blank">Business Messaging Policy</a> prohibits.</li>
        <li>Misleading claims, fake urgency, or offers you cannot honour.</li>
        <li>Content that impersonates another business, or that suggests WhatsApp or Meta endorses you.</li>
        <li>Messages to people who have opted out, or to numbers you cannot show consent for.</li>
      </ul>

      <h2>Quality is a shared cost</h2>
      <p>
        WhatsApp rates the quality of every sending number based on how people react to it.
        Blocks and reports lower that rating, and a number that falls far enough is restricted or
        banned by Meta — not by us, and not reversibly on request. Sending relevant messages to
        people who asked for them is the whole of the technique.
      </p>

      <h2>Your customers&rsquo; data</h2>
      <p>
        The contacts, conversations and orders inside your workspace are yours. You decide what
        goes in and what comes out; we store and process it on your behalf under our{" "}
        <a href="/privacy">Privacy Policy</a>. You are responsible for having a lawful basis for
        holding it, for answering your customers&rsquo; requests about it, and for not putting
        data in Fizmoh that you have no right to hold.
      </p>

      <h2>What happens when this is broken</h2>
      <p>
        Depending on what has happened, we may warn you, pause your sending, make your workspace
        read-only, or close it. Where a breach puts the platform&rsquo;s WhatsApp access at risk
        for every other business on it, we act first and discuss afterwards. Your data remains
        available for export for at least thirty days in every case except a legal requirement to
        remove it sooner.
      </p>

      <h2>Reporting a problem</h2>
      <p>
        If you believe a business using Fizmoh is breaking these rules, write to{" "}
        <a href="mailto:abuse@fizmoh.cloud">abuse@fizmoh.cloud</a> with the sending number and, if
        you have one, a screenshot. Reports about a specific message are answered faster than
        general complaints, because we can trace one.
      </p>
    </LegalPage>
  )
}
