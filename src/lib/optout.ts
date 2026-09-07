/**
 * Opt-out / consent handling
 *
 * Per BRD §6.5.3 (manage opt-out automatically per WhatsApp/Meta policy) and
 * §7 (PDPL/GDPR-compliant consent log).
 *
 * Meta requires that a customer who asks to stop hearing from you actually
 * stops hearing from you — failing to honour STOP is a policy violation that
 * puts the number's quality rating and the WABA itself at risk.
 */

import { db } from "@/lib/db"

const OPT_OUT_KEYWORDS = [
  "stop", "unsubscribe", "cancel subscription", "opt out", "optout",
  "remove me", "no more messages", "leave me alone",
  // Arabic
  "توقف", "الغاء الاشتراك", "إلغاء الاشتراك", "ايقاف",
]

const OPT_IN_KEYWORDS = ["start", "subscribe", "resume", "opt in", "optin", "اشتراك", "ابدأ"]

function normalise(text: string): string {
  return text.trim().toLowerCase().replace(/[.!،,؛;]+$/g, "")
}

export function isOptOutMessage(text: string): boolean {
  const t = normalise(text)
  return OPT_OUT_KEYWORDS.some(k => t === k || t.startsWith(`${k} `))
}

export function isOptInMessage(text: string): boolean {
  const t = normalise(text)
  return OPT_IN_KEYWORDS.some(k => t === k || t.startsWith(`${k} `))
}

export async function recordOptOut(customerId: string, reason = "CUSTOMER_KEYWORD") {
  await db.customer.update({
    where: { id: customerId },
    data: { whatsappOptIn: false, optOutAt: new Date(), optOutReason: reason },
  })
  await writeConsentLog(customerId, "OPT_OUT", reason)
}

export async function recordOptIn(customerId: string, source = "WHATSAPP_INBOUND") {
  await db.customer.update({
    where: { id: customerId },
    data: {
      whatsappOptIn: true,
      optInSource: source,
      optInAt: new Date(),
      optOutAt: null,
      optOutReason: null,
    },
  })
  await writeConsentLog(customerId, "OPT_IN", source)
}

/**
 * Records the consent change itself, not just its result.
 *
 * The customer row holds the current state — opted in or not — and that is
 * what messaging checks. It is not evidence. When somebody asks why they were
 * messaged after saying STOP, or a regulator asks to see consent, the answer
 * has to be a dated record of each change, and a flag that was overwritten
 * cannot provide one.
 *
 * Best-effort: a failure here must not stop an opt-out taking effect. Being
 * unable to write the note is not a reason to keep messaging somebody who
 * asked you not to.
 */
async function writeConsentLog(customerId: string, action: "OPT_IN" | "OPT_OUT", source: string) {
  try {
    await db.consentLog.create({
      data: { customerId, channel: "WHATSAPP", type: "MARKETING", action, source },
    })
  } catch (error) {
    console.error("Could not write the consent log:", error)
  }
}

export const OPT_OUT_CONFIRMATION =
  "You've been unsubscribed and won't receive further marketing messages. Reply START at any time to resubscribe. We'll still message you about bookings you've already made."

export const OPT_IN_CONFIRMATION =
  "You're subscribed again — welcome back! 🐪 Reply STOP at any time to unsubscribe."
