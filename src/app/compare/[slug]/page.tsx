import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { SiteHeader, SiteFooter } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { COMPARISON_PAGES, comparisonBySlug } from "@/lib/marketing/comparisons"
import { absoluteUrl } from "@/lib/seo"
import { Check, X, ArrowRight, ShieldCheck, Zap, Sparkles } from "lucide-react"

export function generateStaticParams() {
  return COMPARISON_PAGES.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = comparisonBySlug(slug)
  if (!page) return {}

  const canonical = absoluteUrl(`/compare/${page.slug}`)
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    keywords: page.keywords,
    alternates: {
      canonical,
    },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url: canonical,
      type: "website",
      images: [{ url: absoluteUrl("/marketing/products/team-inbox.jpg"), width: 1200, height: 630 }],
    },
  }
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const page = comparisonBySlug(slug)
  if (!page) notFound()

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  }

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Fizmoh WhatsApp Business Platform",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Cloud, Web, iOS, Android",
    offers: {
      "@type": "Offer",
      price: "19.00",
      priceCurrency: "OMR",
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <SiteHeader />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="py-20 md:py-28 px-4 text-center border-b border-border/40 bg-muted/20 relative overflow-hidden">
            <div className="max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                {page.heroBadge}
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6">
                {page.h1}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                {page.subheadline}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium" asChild>
                  <Link href="/signup">
                    Start 14-Day Free Trial
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/book-demo">Book a Live Walkthrough</Link>
                </Button>
              </div>
            </div>
          </section>

          {/* Intro Context */}
          <section className="py-16 px-4 max-w-4xl mx-auto">
            <div className="p-6 md:p-8 rounded-2xl bg-card border border-border shadow-sm">
              <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-600" />
                Why Make the Switch to Fizmoh in Oman?
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {page.intro}
              </p>
            </div>
          </section>

          {/* Head-to-Head Comparison Table */}
          <section className="py-12 px-4 max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              Head-to-Head Feature Comparison
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="p-4 md:p-5 font-semibold text-foreground">Capability</th>
                    <th className="p-4 md:p-5 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                      Fizmoh Platform
                    </th>
                    <th className="p-4 md:p-5 font-semibold text-muted-foreground">
                      {page.competitorName}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {page.features.map((row, idx) => (
                    <tr key={idx} className={row.highlight ? "bg-emerald-500/[0.03]" : ""}>
                      <td className="p-4 md:p-5 font-medium text-sm md:text-base">
                        {row.feature}
                      </td>
                      <td className="p-4 md:p-5 text-sm md:text-base font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/5">
                        <div className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{row.fizmoh}</span>
                        </div>
                      </td>
                      <td className="p-4 md:p-5 text-sm md:text-base text-muted-foreground">
                        <div className="flex items-start gap-2">
                          <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <span>{row.competitor}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Key Advantages */}
          <section className="py-16 px-4 max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
              The Fizmoh Difference for GCC Enterprises
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {page.advantages.map((adv, idx) => (
                <div key={idx} className="p-6 rounded-xl border border-border bg-card shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold mb-4">
                    {idx + 1}
                  </div>
                  <h3 className="font-bold text-lg mb-2">{adv.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {adv.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ Accordion */}
          <section className="py-16 px-4 max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {page.faqs.map((faq, idx) => (
                <AccordionItem key={idx} value={`item-${idx}`}>
                  <AccordionTrigger className="text-left font-semibold">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          {/* CTA Banner */}
          <section className="py-20 px-4 bg-emerald-600 text-white text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
                Ready to Upgrade Your WhatsApp Operations?
              </h2>
              <p className="text-lg text-emerald-100 mb-8">
                Migrate in minutes with zero downtime. Connect your Omani phone number to Fizmoh today.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" className="bg-white text-emerald-800 hover:bg-emerald-50 font-bold" asChild>
                  <Link href="/signup">Get Started Free (14 Days)</Link>
                </Button>
                <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10" asChild>
                  <Link href="/pricing">View Pricing Plans</Link>
                </Button>
              </div>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  )
}
