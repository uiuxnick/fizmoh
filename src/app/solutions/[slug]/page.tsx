import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { SiteFooter, SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { SOLUTION_PAGES, solutionBySlug } from "@/lib/solution-pages"
import { INDUSTRY_PAGES, industryBySlug } from "@/lib/marketing/industries"
import { MarketingLanding } from "@/components/marketing/marketing-landing"
import { MarketingJsonLd } from "@/components/marketing/marketing-jsonld"
import { ArrowRight, Check, CircleAlert } from "lucide-react"

/**
 * Industry and comparison landing pages.
 *
 * Two sources feed this one route:
 *  - src/lib/marketing/industries.ts — the current, bilingual industry pages
 *    (restaurants, cafes, ecommerce, fashion, salons, supermarkets, tours,
 *    clinics), rendered by the shared MarketingLanding template.
 *  - src/lib/solution-pages.ts — the earlier comparison pages (WhatsApp vs
 *    SMS/email, App vs API) and a few other verticals, kept on their original
 *    layout below.
 *
 * Every page is written per topic, not generated from a shell with the noun
 * swapped in — Google treats near-identical shell pages as doorway pages and
 * suppresses them.
 */

export function generateStaticParams() {
  const industry = INDUSTRY_PAGES.map(p => ({ slug: p.slug }))
  const legacy = SOLUTION_PAGES
    .filter(p => !industryBySlug(p.slug))
    .map(p => ({ slug: p.slug }))
  return [...industry, ...legacy]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const { pageSeo } = await import("@/lib/seo-config")

  const industry = industryBySlug(slug)
  if (industry) {
    const base = await pageSeo(
      `/solutions/${industry.slug}`,
      industry.metaTitle.en,
      industry.metaDescription.en,
      industry.hero.src,
    )
    return { ...base, keywords: industry.keywords }
  }

  const page = solutionBySlug(slug)
  if (!page) return {}
  const base = await pageSeo(`/solutions/${page.slug}`, page.metaTitle, page.metaDescription)
  return { ...base, keywords: page.keywords }
}

export default async function SolutionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const industry = industryBySlug(slug)
  if (industry) {
    return (
      <>
        <MarketingJsonLd page={industry} variant="industry" />
        <MarketingLanding page={industry} variant="industry" />
      </>
    )
  }

  const page = solutionBySlug(slug)
  if (!page) notFound()

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }

  return (
    <div className="marketing min-h-screen bg-[var(--mk-surface)] text-[var(--mk-ink)]">
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <main>
        <section className="relative overflow-hidden border-b border-[var(--mk-line)] px-4 py-20 sm:px-6">
          <div className="mk-aurora" aria-hidden="true" />
          <div className="relative mx-auto max-w-4xl">
            <p className="mk-eyebrow">{page.kind === "compare" ? "Comparison" : "Industry"}</p>
            <h1 className="mk-display mt-4 text-[42px] leading-[1.1] sm:text-[54px]">{page.h1}</h1>
            <p className="mt-6 max-w-2xl text-[18px] leading-[1.7] text-[var(--mk-ink-soft)]">{page.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup">
                <Button size="lg" className="h-12 gap-2 rounded-full bg-[var(--mk-ink)] px-7 font-semibold text-white hover:bg-[var(--mk-gold)] cursor-pointer">
                  Start free — 14 days <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/book-demo">
                <Button size="lg" variant="outline" className="h-12 rounded-full border-[var(--mk-line)] px-6 font-semibold cursor-pointer">
                  Book a live demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--mk-line)] bg-[var(--mk-surface-2)] px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="mk-display text-[34px] sm:text-[40px]">
              {page.kind === "compare" ? "What actually differs" : "What goes wrong today"}
            </h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {page.problems.map((p, i) => (
                <div key={i} className="mk-card p-6">
                  <CircleAlert className="h-5 w-5 text-[var(--mk-gold)]" aria-hidden="true" />
                  <h3 className="mt-4 text-[16px] font-semibold">{p.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-[var(--mk-ink-soft)]">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--mk-line)] px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="mk-display text-[34px] sm:text-[40px]">
              {page.kind === "compare" ? "How to choose" : "How it works"}
            </h2>
            <ol className="mt-10 space-y-6">
              {page.workflow.map((w, i) => (
                <li key={i} className="flex gap-5">
                  <span className="mk-display shrink-0 text-[28px] text-[var(--mk-gold)]">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="text-[17px] font-semibold">{w.step}</h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--mk-ink-soft)]">{w.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-b border-[var(--mk-line)] bg-[var(--mk-surface-2)] px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="mk-display text-[34px] sm:text-[40px]">What you get</h2>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {page.modules.map(m => (
                <li key={m} className="flex items-start gap-2.5 text-[15px]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mk-green-deep)]" aria-hidden="true" />
                  {m}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-b border-[var(--mk-line)] px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="mk-display text-[34px] sm:text-[40px]">Questions</h2>
            <div className="mt-8 space-y-6">
              {page.faqs.map((f, i) => (
                <div key={i} className="border-b border-[var(--mk-line)] pb-6 last:border-0">
                  <h3 className="text-[16px] font-semibold">{f.q}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[var(--mk-ink-soft)]">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <p className="mk-eyebrow">More</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {INDUSTRY_PAGES.map(p => (
                <Link
                  key={p.slug}
                  href={`/solutions/${p.slug}`}
                  className="rounded-full border border-[var(--mk-line)] px-4 py-2 text-[13.5px] transition-colors hover:border-[var(--mk-ink)]"
                >
                  {p.eyebrow.en}
                </Link>
              ))}
              {SOLUTION_PAGES.filter(p => p.slug !== page.slug && !industryBySlug(p.slug)).map(p => (
                <Link
                  key={p.slug}
                  href={`/solutions/${p.slug}`}
                  className="rounded-full border border-[var(--mk-line)] px-4 py-2 text-[13.5px] transition-colors hover:border-[var(--mk-ink)]"
                >
                  {p.title}
                </Link>
              ))}
              <Link href="/features" className="rounded-full border border-[var(--mk-line)] px-4 py-2 text-[13.5px] transition-colors hover:border-[var(--mk-ink)]">All features</Link>
              <Link href="/pricing" className="rounded-full border border-[var(--mk-line)] px-4 py-2 text-[13.5px] transition-colors hover:border-[var(--mk-ink)]">Pricing</Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
