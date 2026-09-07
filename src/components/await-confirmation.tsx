"use client"

import { useEffect, useState } from "react"

/**
 * The gap between paying and the gateway telling us.
 *
 * A customer's browser comes back the instant the card clears; AmwalPay's
 * webhook arrives a moment later, and sometimes a good deal later. Showing
 * "payment pending" and leaving it there makes a successful payment look
 * failed, and the customer messages support about money they have already
 * paid.
 *
 * So the page checks itself, briefly, and stops — a page that reloads for ever
 * is worse than one that admits it does not know yet.
 */
export function AwaitConfirmation({ seconds = 60 }: { seconds?: number }) {
  const [waited, setWaited] = useState(0)

  useEffect(() => {
    if (waited >= seconds) return
    const timer = setTimeout(() => {
      setWaited(w => w + 5)
      window.location.reload()
    }, 5000)
    return () => clearTimeout(timer)
  }, [waited, seconds])

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
      <p className="text-sm text-amber-900">
        {waited < seconds
          ? "Confirming your payment with the bank…"
          : "Your payment is still being confirmed."}
      </p>
      <p className="mt-1 text-xs text-amber-700">
        {waited < seconds
          ? "This page updates on its own."
          : "It usually clears within a few minutes. We will message you on WhatsApp as soon as it does."}
      </p>
    </div>
  )
}
