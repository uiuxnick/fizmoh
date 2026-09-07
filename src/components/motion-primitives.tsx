"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

/**
 * Scroll reveals for the marketing site.
 *
 * Built on the rule that **content must never depend on JavaScript to be
 * visible**. An earlier version used framer-motion's `whileInView`, whose
 * resting state is `opacity: 0` — when the viewport observer failed to fire,
 * the entire page rendered blank while every element was still in the DOM.
 * A marketing site that is invisible is worse than one that does not animate.
 *
 * So the hidden state is only ever applied *after* mount, by JavaScript that
 * has already proven it runs, and three separate guarantees bring it back:
 *
 *  1. Server-rendered markup carries no hidden state at all, so the page is
 *     readable before hydration and with JavaScript switched off.
 *  2. A timeout reveals everything regardless, so a failed or unsupported
 *     IntersectionObserver degrades to "visible", never to "hidden".
 *  3. `prefers-reduced-motion` skips the effect entirely rather than playing
 *     a shortened version of it.
 *
 * Only opacity and transform are animated — animating layout properties
 * janks on the mid-range phones most of this audience browses on.
 */

const REVEAL_FAILSAFE_MS = 1200

function useReveal(disabled = false) {
  const ref = useRef<HTMLDivElement>(null)
  // `armed` is false during server render and the first client paint, which is
  // what keeps the un-hydrated page visible.
  const [armed, setArmed] = useState(false)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

    if (disabled || reduced || typeof IntersectionObserver === "undefined") {
      setShown(true)
      return
    }

    const el = ref.current
    if (!el) return

    setArmed(true)

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setShown(true)
          observer.disconnect()
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
    )
    observer.observe(el)

    // Whatever else happens, this content becomes visible.
    const failsafe = setTimeout(() => setShown(true), REVEAL_FAILSAFE_MS)

    return () => {
      observer.disconnect()
      clearTimeout(failsafe)
    }
  }, [disabled])

  const hidden = armed && !shown
  return { ref, hidden }
}

export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  const { ref, hidden } = useReveal()

  return (
    <div
      ref={ref}
      className={className}
      data-reveal=""
      style={{
        opacity: hidden ? 0 : 1,
        transform: hidden ? `translate3d(0, ${y}px, 0)` : "translate3d(0, 0, 0)",
        transition: `opacity 620ms cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 620ms cubic-bezier(0.22,1,0.36,1) ${delay}s`,
        willChange: hidden ? "opacity, transform" : undefined,
      }}
    >
      {children}
    </div>
  )
}
