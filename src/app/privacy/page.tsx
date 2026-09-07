import type { Metadata } from "next"
import { LegalPage } from "@/components/legal-page"

export const metadata: Metadata = {
  title: "Privacy Policy | Fizmoh",
  description: "What Fizmoh collects, why, and what you can ask us to do with it.",
}

/**
 * The platform's own privacy policy.
 *
 * This used to be one tour operator's, which was wrong twice over: it is the
 * URL Meta reviews for the app that every business on the platform sends
 * through, and it made no distinction between the data we hold about our
 * customers and the data they hold about theirs. Those are different
 * relationships with different obligations, so they are now written as such.
 */
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="12 August 2026">
      <p>
        Fizmoh is software that businesses use to talk to their customers on WhatsApp. That gives
        us two quite different relationships with personal data, and this policy keeps them apart
        because your rights depend on which one you are in.
      </p>

      <h2>Two roles, plainly stated</h2>
      <ul>
        <li>
          <strong>When you use Fizmoh</strong> — you signed up, you have an account, we bill you.
          We decide what we collect and why, so we are the controller of that data.
        </li>
        <li>
          <strong>When a business uses Fizmoh to talk to you</strong> — they chose to message you,
          they hold your details, they decide what to do with them. They are the controller; we
          are their processor, and we act on their instructions. If you want your data corrected
          or deleted, ask them first. We will help them do it, and we will act ourselves if they
          do not.
        </li>
      </ul>

      <h2>What we collect about businesses that use Fizmoh</h2>
      <ul>
        <li>The name, email address and phone number given at sign-up, and for each colleague added afterwards.</li>
        <li>What was done in the product and when — enough to answer &ldquo;who changed this&rdquo;, to bill accurately, and to investigate an abuse report.</li>
        <li>Payment records for the subscription. Card details are entered on the payment gateway&rsquo;s own pages and never reach our servers.</li>
        <li>Technical logs: IP address, browser, timestamps. Kept for security and kept briefly.</li>
      </ul>

      <h2>What we hold on a business&rsquo;s behalf</h2>
      <p>
        Whatever they put in: their customers&rsquo; names and phone numbers, the WhatsApp
        conversations, orders, payments, files sent in a chat, and notes their staff write. We do
        not sell it, mine it, or use it to train anything. We access it only to keep the service
        running, to fix a fault we have been asked to fix, or where the law requires it.
      </p>

      <h2>Who else sees it</h2>
      <ul>
        <li><strong>Meta Platforms</strong> — messages go through the WhatsApp Business Platform, so Meta processes them to deliver them. Their handling is governed by their own terms.</li>
        <li><strong>The payment gateway</strong> — card details and the amount, so a payment can be taken. We receive the result, not the card.</li>
        <li><strong>Our hosting provider</strong> — the servers this runs on, located in the region stated in your agreement.</li>
        <li><strong>An AI provider</strong>, only where a business has switched AI replies on, and only the conversation being replied to. Not used to train their models.</li>
      </ul>
      <p>Nobody else. No advertisers, no data brokers, no analytics companies.</p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Account and billing records: while you are a customer, and for seven years afterwards where tax law requires it.</li>
        <li>A workspace&rsquo;s own data: while the workspace exists. When it is closed, thirty days to export, then deletion.</li>
        <li>Technical logs: ninety days.</li>
      </ul>

      <h2>What you can ask for</h2>
      <p>
        A copy of your data, a correction, deletion, or a restriction on what we do with it. Write
        to <a href="mailto:privacy@fizmoh.cloud">privacy@fizmoh.cloud</a>. We answer within thirty
        days. If you are a customer of a business using Fizmoh, see{" "}
        <a href="/data-deletion">Data Deletion</a>, which explains how to reach both of us.
      </p>

      <h2>Security</h2>
      <p>
        Credentials — WhatsApp tokens, gateway keys — are encrypted at rest. Each workspace&rsquo;s
        data is separated at the database layer, so one business&rsquo;s query cannot return
        another&rsquo;s rows. Traffic is encrypted in transit. No system is perfect; if one of
        ours fails in a way that affects you, we will tell you what happened and what we did.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes in a way that affects you, we will say so in the product before it
        takes effect rather than quietly changing the date at the top.
      </p>
    </LegalPage>
  )
}
