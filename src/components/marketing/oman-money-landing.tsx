import Link from "next/link"
import { SiteHeader, SiteFooter } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Check, ArrowRight, Sparkles, ShieldCheck, Zap } from "lucide-react"

export interface OmanPageData {
  slug: string
  badge: string
  h1: string
  subheadline: string
  introHeading: string
  introText: string
  keyFeatures: { title: string; description: string }[]
  benefits: { stat: string; label: string; description: string }[]
  faqs: { q: string; a: string }[]
}

export function OmanMoneyLanding({ data }: { data: OmanPageData }) {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faqs.map(f => ({
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <SiteHeader />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="py-20 md:py-28 px-4 text-center border-b border-border/40 bg-muted/20 relative overflow-hidden">
            <div className="max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                {data.badge}
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
                {data.h1}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                {data.subheadline}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium" asChild>
                  <Link href="/signup">
                    Start 14-Day Free Trial
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/book-demo">Book a Live Demo</Link>
                </Button>
              </div>
            </div>
          </section>

          {/* Intro Context */}
          <section className="py-16 px-4 max-w-4xl mx-auto">
            <div className="p-6 md:p-8 rounded-2xl bg-card border border-border shadow-sm">
              <h2 className="text-xl md:text-2xl font-bold mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-600 shrink-0" />
                {data.introHeading}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {data.introText}
              </p>
            </div>
          </section>

          {/* Key Features Grid */}
          <section className="py-12 px-4 max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
              Built for High-Growth Businesses in Oman & the GCC
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {data.keyFeatures.map((feat, idx) => (
                <div key={idx} className="p-6 rounded-xl border border-border bg-card shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold mb-4">
                    <Check className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{feat.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Metric Benefits */}
          <section className="py-16 px-4 bg-muted/30 border-y border-border/40">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
                Measurable Impact from Day 1
              </h2>
              <div className="grid md:grid-cols-3 gap-8 text-center">
                {data.benefits.map((b, idx) => (
                  <div key={idx} className="p-6 rounded-2xl bg-card border border-border">
                    <div className="text-4xl md:text-5xl font-black text-emerald-600 mb-2">
                      {b.stat}
                    </div>
                    <div className="text-lg font-semibold mb-2">{b.label}</div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {b.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ Accordion */}
          <section className="py-16 px-4 max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {data.faqs.map((faq, idx) => (
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
                Start Transforming Your WhatsApp Operations
              </h2>
              <p className="text-lg text-emerald-100 mb-8">
                Connect your business phone number and start chatting in less than 15 minutes.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" className="bg-white text-emerald-800 hover:bg-emerald-50 font-bold" asChild>
                  <Link href="/signup">Start Free Trial</Link>
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
