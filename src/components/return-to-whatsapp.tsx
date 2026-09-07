"use client"

import { useEffect, useState } from "react"

/**
 * Getting the customer back to the chat after paying.
 *
 * A payment link opened from WhatsApp runs inside WhatsApp's own browser, and
 * that browser cannot be closed by the page: window.close() only works on a
 * window script opened, which this is not. Android sometimes obliges, iOS
 * never does, and a page that tries and fails leaves somebody staring at a
 * receipt with no way back.
 *
 * What does work everywhere is leaving: opening a wa.me link hands control to
 * WhatsApp itself, which brings the chat forward and drops the browser behind
 * it. That is the actual thing wanted — "close this and take me back" — and it
 * is the same gesture on both platforms.
 *
 * It runs on a short delay rather than instantly, so the customer sees that
 * the payment succeeded before the screen changes under them.
 */
export function ReturnToWhatsApp({
  phone,
  seconds = 4,
}: {
  /** The business number, digits only. */
  phone: string
  seconds?: number
}) {
  const [left, setLeft] = useState(seconds)
  const [inWhatsApp, setInWhatsApp] = useState(false)

  useEffect(() => {
    // Only auto-return when the page really is inside WhatsApp. Somebody who
    // opened the link in Chrome on a laptop should not have their browser
    // hijacked into a chat app.
    const ua = navigator.userAgent || ""
    const inside = /WhatsApp/i.test(ua)
    setInWhatsApp(inside)
    if (!inside) return

    const tick = setInterval(() => setLeft(n => Math.max(0, n - 1)), 1000)
    const go = setTimeout(() => leave(phone), seconds * 1000)
    return () => { clearInterval(tick); clearTimeout(go) }
  }, [phone, seconds])

  return (
    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
      <p className="text-sm text-emerald-900">
        {inWhatsApp
          ? left > 0
            ? `Taking you back to the chat in ${left}…`
            : "Taking you back to the chat…"
          : "Continue the conversation on WhatsApp."}
      </p>
      <button
        onClick={() => leave(phone)}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        Back to WhatsApp
      </button>
    </div>
  )
}

function leave(phone: string) {
  const number = String(phone || "").replace(/\D/g, "")
  // Closing is attempted first because it is instant where it is allowed, and
  // harmless where it is not.
  try { window.close() } catch { /* not a window we opened */ }
  window.location.href = number ? `https://wa.me/${number}` : "https://wa.me"
}
