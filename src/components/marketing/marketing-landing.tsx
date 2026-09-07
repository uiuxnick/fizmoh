"use client"

import Image from "next/image"
import Link from "next/link"
import { useLanguage } from "@/context/language-context"
import { SiteFooter, SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ClientLogos } from "@/components/client-logos"
import { WhatsAppDemo } from "@/components/whatsapp-demo"
import { UseCaseIcon } from "@/components/marketing/icon-map"
import type { L, MarketingPage } from "@/lib/marketing/types"
import { ArrowRight, Check, CircleAlert, Quote } from "lucide-react"

/**
 * Shared renderer for a Product or Industry landing page.
 *
 * One H1 (the hero), then an H2 per section in document order, then H3s for
 * cards and questions — the outline a crawler reads is the outline a reader
 * sees. Everything below the hero is lazy by default; only the hero image is
 * marked priority, and every image carries width/height so nothing reflows.
 */

type Copy = {
  startTrial: string
  bookDemo: string
  problemsHeading: string
  useCasesHeading: string
  howHeading: string
  featuresHeading: string
  featureCol: string
  outcomeCol: string
  statsHeading: string
  estimate: string
  proofHeading: string
  proofNote: string
  faqHeading: string
  relatedHeading: string
  ctaHeading: string
  ctaBody: string
  simulatorHeading: string
  simulatorBody: string
}

const COPY: Record<"en" | "ar", Copy> = {
  en: {
    startTrial: "Start free — 14 days",
    bookDemo: "Book a live demo",
    problemsHeading: "What goes wrong today",
    useCasesHeading: "What you can do with it",
    howHeading: "How it works",
    featuresHeading: "Feature by feature, and what it changes",
    featureCol: "Capability",
    outcomeCol: "What it changes for the business",
    statsHeading: "The shape of it",
    estimate: "estimate",
    proofHeading: "Proof",
    proofNote:
      "The quotes below are placeholders until real, attributable client quotes replace them. The logo wall is the delivery team's client history — see the note on it.",
    faqHeading: "Questions people ask",
    relatedHeading: "Keep reading",
    ctaHeading: "See it on your own number",
    ctaBody:
      "Start a free 14-day workspace and connect your WhatsApp Business number in about a minute — or book a live Google Meet walkthrough first.",
    simulatorHeading: "Try it now, no signup",
    simulatorBody:
      "This is the real flow engine running in your browser. Tap the buttons and type a reply — nothing is sent and no number is connected.",
  },
  ar: {
    startTrial: "ابدأ مجاناً — 14 يوماً",
    bookDemo: "احجز عرضاً مباشراً",
    problemsHeading: "ما الذي يحدث خطأً اليوم",
    useCasesHeading: "ماذا يمكنك أن تفعل به",
    howHeading: "كيف يعمل",
    featuresHeading: "ميزة بميزة، وما الذي تغيّره",
    featureCol: "القدرة",
    outcomeCol: "ما الذي تغيّره للعمل",
    statsHeading: "الصورة باختصار",
    estimate: "تقدير",
    proofHeading: "الإثبات",
    proofNote:
      "الاقتباسات أدناه عناصر نائبة حتى تحلّ محلّها اقتباسات عملاء حقيقية ومنسوبة. جدار الشعارات هو سجل عملاء فريق التنفيذ — انظر الملاحظة عليه.",
    faqHeading: "أسئلة يطرحها الناس",
    relatedHeading: "تابع القراءة",
    ctaHeading: "شاهده على رقمك الخاص",
    ctaBody:
      "ابدأ مساحة عمل مجانية 14 يوماً واربط رقم واتساب بزنس في نحو دقيقة — أو احجز جولة مباشرة عبر Google Meet أولاً.",
    simulatorHeading: "جرّبه الآن، دون تسجيل",
    simulatorBody:
      "هذا محرك المسارات الحقيقي يعمل في متصفحك. انقر الأزرار واكتب رداً — لا شيء يُرسل ولا رقم مرتبط.",
  },
}

export function MarketingLanding({
  page,
  variant,
  showSimulator = false,
}: {
  page: MarketingPage
  variant: "product" | "industry"
  showSimulator?: boolean
}) {
  const { isAr } = useLanguage()
  const lang: "en" | "ar" = isAr ? "ar" : "en"
  const t = (value: L) => value[lang] || value.en
  const c = COPY[lang]

  return (
    <div
      className={`marketing min-h-screen bg-[var(--mk-surface)] text-[var(--mk-ink)] ${isAr ? "rtl" : "ltr"}`}
      dir={isAr ? "rtl" : "ltr"}
    >
      <SiteHeader />

      <main className="overflow-hidden">
        {/* ---- Hero ------------------------------------------------------ */}
        <section className="relative border-b border-[var(--mk-line)] px-4 py-16 sm:px-6 sm:py-20">
          <div className="mk-aurora" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <p className="mk-eyebrow">
                {variant === "product" ? (isAr ? "منتج" : "Product") : (isAr ? "قطاع" : "Industry")} · {t(page.eyebrow)}
              </p>
              <h1 className="mk-display mt-4 text-[34px] leading-[1.1] sm:text-[44px] lg:text-[52px]">
                {t(page.h1)}
              </h1>
              <p className="mt-5 max-w-xl text-[17px] leading-[1.7] text-[var(--mk-ink-soft)] sm:text-[18px]">
                {t(page.subheadline)}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="h-12 gap-2 rounded-full bg-[var(--mk-ink)] px-7 font-semibold text-white hover:bg-[var(--mk-gold)] cursor-pointer"
                  >
                    {c.startTrial}
                    <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} aria-hidden="true" />
                  </Button>
                </Link>
                <Link href="/book-demo">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-full border-[var(--mk-line)] px-6 font-semibold cursor-pointer"
                  >
                    {c.bookDemo}
                  </Button>
                </Link>
              </div>
              <p className="mt-4 text-[13px] text-[var(--mk-muted)]">{t(page.heroNote)}</p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-[var(--mk-line)] bg-[var(--mk-surface-2)] shadow-sm">
              {page.hero.kind === "css" ? (
                <div
                  role="img"
                  aria-label={t(page.hero.alt)}
                  className="relative flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-[var(--mk-green)]/20 via-[var(--mk-surface-2)] to-[var(--mk-gold)]/20"
                >
                  <div className="mk-aurora" aria-hidden="true" />
                  <UseCaseIcon
                    name={page.hero.icon ?? "Sparkles"}
                    className="relative h-16 w-16 text-[var(--mk-gold)]"
                  />
                </div>
              ) : (
                <Image
                  src={page.hero.src}
                  alt={t(page.hero.alt)}
                  width={page.hero.width}
                  height={page.hero.height}
                  priority
                  sizes="(max-width: 1024px) 100vw, 560px"
                  className="h-auto w-full object-cover"
                />
              )}
            </div>
          </div>
        </section>

        {/* ---- Interactive simulator (simulator product only) ---------- */}
        {showSimulator && (
          <section className="border-b border-[var(--mk-line)] bg-[var(--mk-surface-2)] px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-6xl">
              <h2 className="mk-display text-[30px] sm:text-[38px]">{c.simulatorHeading}</h2>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--mk-ink-soft)]">
                {c.simulatorBody}
              </p>
              <div className="mt-8 flex justify-center">
                <WhatsAppDemo isAr={isAr} />
              </div>
            </div>
          </section>
        )}

        {/* ---- Problems ----------------------------------------------- */}
        <section className="border-b border-[var(--mk-line)] px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="mk-display text-[30px] sm:text-[38px]">{c.problemsHeading}</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {page.problems.map((problem, i) => (
                <div key={i} className="mk-card p-6">
                  <CircleAlert className="h-5 w-5 text-[var(--mk-gold)]" aria-hidden="true" />
                  <h3 className="mt-4 text-[16px] font-semibold">{t(problem.title)}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-[var(--mk-ink-soft)]">{t(problem.body)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Use cases -------------------------------------------- */}
        <section className="border-b border-[var(--mk-line)] bg-[var(--mk-surface-2)] px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="mk-display text-[30px] sm:text-[38px]">{c.useCasesHeading}</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {page.useCases.map((useCase, i) => (
                <div key={i} className="mk-card flex flex-col p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--mk-green)]/15 text-[var(--mk-green-deep)]">
                    <UseCaseIcon name={useCase.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-[16px] font-semibold">{t(useCase.title)}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-[var(--mk-ink-soft)]">{t(useCase.body)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- How it works ---------------------------------------- */}
        <section className="border-b border-[var(--mk-line)] px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-4xl">
            <h2 className="mk-display text-[30px] sm:text-[38px]">{c.howHeading}</h2>
            <ol className="mt-10 space-y-7">
              {page.how.map((step, i) => (
                <li key={i} className="flex gap-5">
                  <span className="mk-display shrink-0 text-[26px] text-[var(--mk-gold)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-[17px] font-semibold">{t(step.title)}</h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--mk-ink-soft)]">{t(step.body)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---- Feature -> benefit --------------------------------- */}
        <section className="border-b border-[var(--mk-line)] bg-[var(--mk-surface-2)] px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="mk-display text-[30px] sm:text-[38px]">{c.featuresHeading}</h2>
            <div className="mt-10 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <caption className="sr-only">{t(page.h1)} — {c.featuresHeading}</caption>
                <thead>
                  <tr className="border-b border-[var(--mk-line)] text-[12px] uppercase tracking-wide text-[var(--mk-muted)]">
                    <th scope="col" className="w-2/5 py-3 pe-4 font-semibold">{c.featureCol}</th>
                    <th scope="col" className="py-3 font-semibold">{c.outcomeCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {page.features.map((row, i) => (
                    <tr key={i} className="border-b border-[var(--mk-line)] last:border-0 align-top">
                      <th scope="row" className="py-4 pe-4 text-[14px] font-semibold text-[var(--mk-ink)]">
                        {t(row.feature)}
                      </th>
                      <td className="py-4 text-[14px] leading-relaxed text-[var(--mk-ink-soft)]">
                        {t(row.benefit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ---- Stats band ---------------------------------------- */}
        <section className="border-b border-[var(--mk-line)] px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="mk-eyebrow">{c.statsHeading}</h2>
            <dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {page.stats.map((stat, i) => (
                <div key={i}>
                  <dt className="mk-display text-[34px] text-[var(--mk-ink)]">
                    {t(stat.value)}
                    {stat.estimate && (
                      <span className="ms-2 align-middle text-[11px] font-sans font-semibold uppercase tracking-wide text-[var(--mk-muted)]">
                        {c.estimate}
                      </span>
                    )}
                  </dt>
                  <dd className="mt-1 text-[13px] leading-snug text-[var(--mk-ink-soft)]">{t(stat.label)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ---- Social proof ------------------------------------- */}
        <section className="border-b border-[var(--mk-line)] bg-[var(--mk-surface-2)] px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="mk-display text-[30px] sm:text-[38px]">{c.proofHeading}</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {page.testimonials.map((testimonial, i) => (
                <figure key={i} className="mk-card p-6">
                  <Quote className="h-5 w-5 text-[var(--mk-gold)]" aria-hidden="true" />
                  <blockquote className="mt-3 text-[15px] leading-relaxed text-[var(--mk-ink-soft)]">
                    {t(testimonial.quote)}
                  </blockquote>
                  <figcaption className="mt-4 text-[13px] text-[var(--mk-muted)]">
                    <span className="rounded bg-[var(--mk-gold)]/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--mk-gold)]">
                      TODO
                    </span>{" "}
                    {t(testimonial.role)}
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="mt-6 max-w-3xl text-[12.5px] leading-relaxed text-[var(--mk-muted)]">{c.proofNote}</p>
          </div>
          <div className="mx-auto mt-10 max-w-6xl">
            <ClientLogos />
          </div>
        </section>

        {/* ---- FAQ --------------------------------------------- */}
        <section className="border-b border-[var(--mk-line)] px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="mk-display text-[30px] sm:text-[38px]">{c.faqHeading}</h2>
            <Accordion type="single" collapsible className="mt-8">
              {page.faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-[var(--mk-line)]">
                  <AccordionTrigger className="text-[15px] font-semibold text-[var(--mk-ink)] hover:no-underline">
                    {t(faq.q)}
                  </AccordionTrigger>
                  <AccordionContent className="text-[14px] leading-relaxed text-[var(--mk-ink-soft)]">
                    {t(faq.a)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ---- Related / internal links ----------------------- */}
        <section className="border-b border-[var(--mk-line)] bg-[var(--mk-surface-2)] px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="mk-eyebrow">{c.relatedHeading}</h2>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {page.related.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mk-line)] bg-[var(--mk-surface)] px-4 py-2 text-[13.5px] transition-colors hover:border-[var(--mk-ink)]"
                >
                  {t(link.label)}
                  <ArrowRight className={`h-3.5 w-3.5 text-[var(--mk-muted)] ${isAr ? "rotate-180" : ""}`} aria-hidden="true" />
                </Link>
              ))}
              <Link
                href={variant === "product" ? "/pricing" : "/features"}
                className="inline-flex items-center rounded-full border border-[var(--mk-line)] bg-[var(--mk-surface)] px-4 py-2 text-[13.5px] transition-colors hover:border-[var(--mk-ink)]"
              >
                {variant === "product" ? (isAr ? "الأسعار" : "Pricing") : (isAr ? "كل المميزات" : "All features")}
              </Link>
            </div>
          </div>
        </section>

        {/* ---- Bottom CTA ------------------------------------ */}
        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mk-display text-[32px] sm:text-[40px]">{c.ctaHeading}</h2>
            <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--mk-ink-soft)]">{c.ctaBody}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="h-12 gap-2 rounded-full bg-[var(--mk-ink)] px-7 font-semibold text-white hover:bg-[var(--mk-gold)] cursor-pointer"
                >
                  {c.startTrial}
                  <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/book-demo">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full border-[var(--mk-line)] px-6 font-semibold cursor-pointer"
                >
                  {c.bookDemo}
                </Button>
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[12.5px] text-[var(--mk-muted)]">
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[var(--mk-green-deep)]" aria-hidden="true" /> {isAr ? "بدون بطاقة ائتمان" : "No credit card"}</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[var(--mk-green-deep)]" aria-hidden="true" /> {isAr ? "إعداد رسمي عبر Meta" : "Official Meta setup"}</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[var(--mk-green-deep)]" aria-hidden="true" /> {isAr ? "عربي وإنجليزي" : "Arabic & English"}</span>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
