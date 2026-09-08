"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { WhatsAppDemo, type DemoMode } from "@/components/whatsapp-demo"
import { ArrowRight, CheckCircle2, Video, Compass, Stethoscope, ShoppingBag, Sparkles } from "lucide-react"

/**
 * The rotating hero.
 *
 * One product sold to four very different businesses, so the hero argues the
 * case four times rather than once generically — and the phone beside it shows
 * that industry's actual conversation, because a slide about clinics next to a
 * marketing chat reads as a mistake.
 *
 * The rules that keep an auto-rotating hero from being an annoyance:
 *  - It stops on hover, on focus, and once anyone touches a control. Nothing
 *    is more hostile than copy that slides away mid-sentence.
 *  - It never rotates for people who asked for reduced motion, and never when
 *    the tab is hidden.
 *  - Every slide is reachable by keyboard, and the live region announces
 *    changes without stealing focus.
 *  - The headline's first line never changes, so the brand promise stays put
 *    while only the audience-specific half moves.
 */

type Slide = {
  id: DemoMode
  icon: typeof Compass
  eyebrowEn: string
  eyebrowAr: string
  leadEn: string
  leadAr: string
  bodyEn: string
  bodyAr: string
}

const SLIDES: Slide[] = [
  {
    id: "marketing",
    icon: Sparkles,
    eyebrowEn: "Agencies & Growth Teams",
    eyebrowAr: "الوكالات وفرق النمو",
    leadEn: "on WhatsApp",
    leadAr: "عبر واتساب",
    bodyEn: "Official Meta Cloud API connectivity, multi-agent CRM inbox, conversational AI in Gulf Arabic, and native AmwalPay card checkout — all in one workspace.",
    bodyAr: "اتصال رسمي بـ WhatsApp Cloud API، وصندوق وارد مشترك، وذكاء اصطناعي يفهم اللهجات الخليجية، ومدفوعات أموال باي — في مكان واحد.",
  },
  {
    id: "tours",
    icon: Compass,
    eyebrowEn: "Tours, Safari & Travel",
    eyebrowAr: "السياحة والجولات والسفاري",
    leadEn: "book seats in chat",
    leadAr: "احجز المقاعد داخل الشات",
    bodyEn: "Live seat availability, date and departure selection, deposits or full payment in Omani Rial, and a QR voucher issued the moment the card clears.",
    bodyAr: "توافر مباشر للمقاعد واختيار التاريخ والانطلاق، ودفع بالريال العماني، وقسيمة QR فور نجاح الدفع.",
  },
  {
    id: "hospital",
    icon: Stethoscope,
    eyebrowEn: "Clinics & Healthcare",
    eyebrowAr: "العيادات والمستشفيات",
    leadEn: "fill every appointment",
    leadAr: "املأ كل موعد",
    bodyEn: "Specialist selection, real-time slot availability, Google Calendar sync, and automated WhatsApp reminders that cut no-shows without a phone call.",
    bodyAr: "اختيار الأخصائي وتوافر المواعيد لحظياً ومزامنة التقويم وتذكيرات آلية تقلل الغياب دون مكالمة واحدة.",
  },
  {
    id: "retail",
    icon: ShoppingBag,
    eyebrowEn: "Retail & Ecommerce",
    eyebrowAr: "التجزئة والتجارة الإلكترونية",
    leadEn: "sell from the catalog",
    leadAr: "بِع من الكتالوج",
    bodyEn: "Two-way WooCommerce sync, an in-chat product catalog, cart management, and abandoned-cart recovery that brings the sale back on its own.",
    bodyAr: "مزامنة ووكومرس ثنائية وكتالوج داخل الشات وإدارة السلة واسترجاع السلات المتروكة تلقائياً.",
  },
]

const ROTATE_MS = 14000

export function HeroSlider({ isAr }: { isAr: boolean }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)
  const stopped = useRef(false) // set once the reader takes control

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)")
    if (!mq) return
    setReduced(mq.matches)
    const on = () => setReduced(mq.matches)
    mq.addEventListener?.("change", on)
    return () => mq.removeEventListener?.("change", on)
  }, [])

  useEffect(() => {
    if (paused || reduced || stopped.current) return
    const timer = setInterval(() => {
      // A hidden tab should not burn through the slides unseen.
      if (document.visibilityState === "visible") {
        setIndex(i => (i + 1) % SLIDES.length)
      }
    }, ROTATE_MS)
    return () => clearInterval(timer)
  }, [paused, reduced])

  const goTo = useCallback((i: number) => {
    // Once someone chooses a slide, rotation stops for good — continuing to
    // move after a deliberate choice overrides the person using the page.
    stopped.current = true
    setIndex(i)
  }, [])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") goTo((index + 1) % SLIDES.length)
    if (e.key === "ArrowLeft") goTo((index - 1 + SLIDES.length) % SLIDES.length)
  }

  const slide = SLIDES[index]

  return (
    <div
      className="grid items-center gap-x-12 gap-y-12 lg:grid-cols-12"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* ── The argument ── */}
      <div className="lg:col-span-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--mk-line)] bg-white/70 px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--mk-ink-soft)] shadow-sm backdrop-blur">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--mk-green)] opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--mk-green-deep)]" />
          </span>
          {isAr ? "مزود معتمد من Meta · WhatsApp Cloud API الرسمي · عمان والخليج" : "Official Meta WhatsApp Cloud API Provider · Oman & GCC"}
        </span>

        {/* Only the second half changes, so the page never appears to reload
            itself while someone is reading the first line. */}
        <h1 className="mk-display mt-7 text-[44px] text-[var(--mk-ink)] sm:text-[56px] lg:text-[62px]">
          {isAr ? "شغّل أعمالك بالكامل" : "Run your entire business"}
          <span key={slide.id} className="mk-slide-in block mk-gradient-text">
            {isAr ? slide.leadAr : slide.leadEn}
          </span>
        </h1>

        <div aria-live="polite" aria-atomic="true">
          <p className="mk-eyebrow mt-6 flex items-center gap-2">
            <slide.icon className="h-3.5 w-3.5 text-[var(--mk-gold)]" aria-hidden="true" />
            {isAr ? slide.eyebrowAr : slide.eyebrowEn}
          </p>
          <p key={slide.id} className="mk-slide-in mt-3 max-w-[34rem] text-[17px] leading-[1.7] text-[var(--mk-ink-soft)]">
            {isAr ? slide.bodyAr : slide.bodyEn}
          </p>
        </div>

        {/* Slide controls. Real buttons, so they are keyboard reachable and
            announce themselves — dots that are only decorative divs are not. */}
        <div
          className="mt-7 flex items-center gap-2.5"
          role="tablist"
          aria-label={isAr ? "قطاعات الأعمال" : "Industries"}
          onKeyDown={onKeyDown}
        >
          {SLIDES.map((s, i) => {
            const active = i === index
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={active}
                aria-label={isAr ? s.eyebrowAr : s.eyebrowEn}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  active
                    ? "w-10 bg-[var(--mk-ink)]"
                    : "w-4 bg-[var(--mk-line)] hover:bg-[var(--mk-muted)]"
                }`}
              />
            )
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/signup">
            <Button
              size="lg"
              className="h-12 gap-2 rounded-full bg-[var(--mk-ink)] px-7 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(12,10,9,0.5)] transition-all hover:bg-[var(--mk-gold)] hover:shadow-[0_10px_30px_-8px_rgba(161,98,7,0.6)] cursor-pointer"
            >
              {isAr ? "ابدأ التجربة المجانية — 14 يوماً" : "Start Free — 14 Days"}
              <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} aria-hidden="true" />
            </Button>
          </Link>
          <Link href="/book-demo">
            <Button
              size="lg"
              variant="outline"
              className="h-12 gap-2 rounded-full border border-[var(--mk-line)] bg-white/80 px-6 text-[15px] font-semibold text-[var(--mk-ink)] backdrop-blur transition-colors hover:border-[var(--mk-ink)] hover:bg-white cursor-pointer"
            >
              <Video className="h-4 w-4" aria-hidden="true" />
              {isAr ? "عرض Google Meet مباشر" : "Book a Live Demo"}
            </Button>
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[var(--mk-muted)]">
          {[
            isAr ? "بدون بطاقة بنكية" : "No credit card required",
            isAr ? "ربط API خلال 60 ثانية" : "60-second API setup",
          ].map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[var(--mk-green-deep)]" aria-hidden="true" />
              {item}
            </span>
          ))}
        </div>

        {/* Figures the page already stands behind, brought above the fold. */}
        <dl className="mt-9 grid max-w-lg grid-cols-3 gap-6 border-t border-[var(--mk-line)] pt-7">
          {[
            { num: "98%", labelEn: "Message open rate", labelAr: "معدل فتح الرسائل" },
            { num: "45s", labelEn: "Avg. bot response", labelAr: "متوسط رد البوت" },
            { num: "OMR", labelEn: "Direct AmwalPay payout", labelAr: "تسوية مباشرة بالريال" },
          ].map((stat, i) => (
            <div key={i}>
              <dt className="mk-display text-[30px] leading-none text-[var(--mk-ink)]">{stat.num}</dt>
              <dd className="mt-1.5 text-[12.5px] leading-snug text-[var(--mk-muted)]">
                {isAr ? stat.labelAr : stat.labelEn}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ── The product, showing this slide's industry ── */}
      <div className="lg:col-span-6">
        <div className="relative flex justify-center">
          <div
            className="pointer-events-none absolute inset-x-4 top-8 bottom-8 rounded-[2rem] bg-gradient-to-b from-[var(--mk-gold-soft)]/12 via-transparent to-[var(--mk-green)]/12 blur-2xl"
            aria-hidden="true"
          />
          <div className="relative">
            {/* The switcher is hidden because the slide dots already control
                this — two controls for one value only creates doubt. */}
            <WhatsAppDemo isAr={isAr} mode={slide.id} showSwitcher={false} />
          </div>
        </div>
      </div>
    </div>
  )
}
