"use client"

import { useEffect, useState } from "react"

/**
 * The "certified & integrated with" strip, as a continuous marquee.
 *
 * The list comes from Settings so the owner can edit it without a deploy, and
 * falls back to the built-in one when unset or malformed — a bad character in
 * a settings field must never blank out a section of the homepage.
 *
 * Marquee rules that keep it from being a nuisance:
 *  - It pauses on hover, so a name can actually be read.
 *  - It stops entirely under `prefers-reduced-motion` and lays the logos out
 *    as a static wrapped row instead; continuous movement is exactly what
 *    that setting exists to prevent.
 *  - The track is duplicated and the copy is `aria-hidden`, so the loop is
 *    seamless without a screen reader announcing every name twice.
 */

type Partner = { label: string; tag: string }

const FALLBACK: Partner[] = [
  { label: "Meta Cloud API", tag: "Verified Partner" },
  { label: "AmwalPay", tag: "Oman Gateway" },
  { label: "Central Bank Oman", tag: "CBO Compliant" },
  { label: "ISO 27001", tag: "Certified" },
  { label: "WooCommerce", tag: "Two-Way Sync" },
  { label: "Google Calendar", tag: "Meet Integration" },
]

function Card({ p }: { p: Partner }) {
  return (
    <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-[var(--mk-line)] bg-white px-4 py-2.5 shadow-sm">
      <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--mk-green)] ring-2 ring-[var(--mk-green)]/20" aria-hidden="true" />
      <div className="whitespace-nowrap">
        <p className="text-[13.5px] font-semibold text-[var(--mk-ink)]">{p.label}</p>
        {p.tag && <p className="text-[11px] text-[var(--mk-muted)]">{p.tag}</p>}
      </div>
    </div>
  )
}

export function LogoMarquee() {
  const [partners, setPartners] = useState<Partner[]>(FALLBACK)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)")
    if (mq) {
      setReduced(mq.matches)
      const on = () => setReduced(mq.matches)
      mq.addEventListener?.("change", on)
      var cleanup = () => mq.removeEventListener?.("change", on)
    }

    let live = true
    fetch("/api/config/public")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (live && Array.isArray(d?.marketingPartners) && d.marketingPartners.length) {
          setPartners(d.marketingPartners)
        }
      })
      // Keep the built-in list on any failure; this strip is decoration, and
      // a dead network must not leave a blank band across the page.
      .catch(() => {})

    return () => {
      live = false
      cleanup?.()
    }
  }, [])

  if (reduced) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3">
        {partners.map((p, i) => <Card key={i} p={p} />)}
      </div>
    )
  }

  return (
    <div
      className="group relative overflow-hidden"
      // Fade the strip out at both ends so items enter and leave rather than
      // being chopped off at the edge of the viewport.
      style={{
        maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
      }}
    >
      <div className="mk-marquee flex w-max gap-3 group-hover:[animation-play-state:paused]">
        {partners.map((p, i) => <Card key={`a-${i}`} p={p} />)}
        <div className="flex gap-3" aria-hidden="true">
          {partners.map((p, i) => <Card key={`b-${i}`} p={p} />)}
        </div>
      </div>
    </div>
  )
}
