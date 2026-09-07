import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { SiteHeader, SiteFooter } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { LOCATION_PAGES, locationBySlug } from "@/lib/marketing/locations"
import { absoluteUrl } from "@/lib/seo"
import { MapPin, ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react"

export function generateStaticParams() {
  return LOCATION_PAGES.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = locationBySlug(slug)
  if (!page) return {}

  const canonical = absoluteUrl(`/locations/${page.slug}`)
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

export default async function LocationPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const page = locationBySlug(slug)
  if (!page) notFound()

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `Fizmoh WhatsApp Business Platform - ${page.city}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: page.city,
      addressCountry: page.country,
    },
    priceRange: `$$ (${page.currency})`,
  }

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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <SiteHeader />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="py-20 md:py-28 px-4 text-center border-b border-border/40 bg-muted/20 relative overflow-hidden">
            <div className="max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-6">
                <MapPin className="w-3.5 h-3.5" />
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
                    Get Started Free in {page.city}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/book-demo">Book a Consultation</Link>
                </Button>
              </div>
            </div>
          </section>

          {/* Intro Context */}
          <section className="py-16 px-4 max-w-4xl mx-auto">
            <div className="p-6 md:p-8 rounded-2xl bg-card border border-border shadow-sm">
              <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                Empowering Businesses Across {page.city}, {page.country}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {page.intro}
              </p>
            </div>
          </section>

          {/* Local Highlights */}
          <section className="py-12 px-4 max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
              Why Companies in {page.city} Choose Fizmoh
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {page.localHighlights.map((hl, idx) => (
                <div key={idx} className="p-6 rounded-xl border border-border bg-card shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold mb-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{hl.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {hl.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ Accordion */}
          <section className="py-16 px-4 max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              Frequently Asked Questions for {page.city} Businesses
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
                Ready to Automate WhatsApp in {page.city}?
              </h2>
              <p className="text-lg text-emerald-100 mb-8">
                Connect your business phone number and start chatting in less than 15 minutes.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" className="bg-white text-emerald-800 hover:bg-emerald-50 font-bold" asChild>
                  <Link href="/signup">Start Free Trial</Link>
                </Button>
                <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10" asChild>
                  <Link href="/contact">Talk to Our Team</Link>
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
