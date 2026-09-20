import { notFound } from "next/navigation"
import Link from "next/link"
import { SiteHeader, SiteFooter } from "@/components/site-header"
import { RESOURCE_PAGES } from "@/lib/resource-pages"
import { SupportChatButton } from "@/components/support-chat-button"
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo"

export function generateStaticParams() {
  return RESOURCE_PAGES.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = RESOURCE_PAGES.find(p => p.slug === slug)
  if (!page) return {}
  const { pageSeo } = await import("@/lib/seo-config")
  const cleanTitle = page.title.replace(/\s*\|\s*Fizmoh$/i, "").trim()
  return pageSeo(`/resources/${slug}`, cleanTitle, page.description)
}

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = RESOURCE_PAGES.find(p => p.slug === slug)
  if (!page) notFound()

  const canonical = absoluteUrl(`/resources/${slug}`)

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Resources",
        item: absoluteUrl("/resources/knowledgebase"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: page.title.replace(/\s*\|\s*Fizmoh$/i, "").trim(),
        item: canonical,
      },
    ],
  }

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    description: page.description,
    url: canonical,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: absoluteUrl("/fizmoh-logo.png"),
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        suppressHydrationWarning
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
        suppressHydrationWarning
      />
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        <Link href="/resources/knowledgebase" className="text-sm font-semibold text-emerald-700 hover:underline">
          Fizmoh resources
        </Link>
        <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">{page.title}</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-stone-600">{page.description}</p>
        {page.support && (
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <SupportChatButton />
            <a
              className="font-semibold text-emerald-700 underline underline-offset-4"
              href="https://wa.me/96898314456"
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp +96898314456
            </a>
          </div>
        )}
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {page.sections.map(section => (
            <section key={section.title} className="rounded-2xl border border-stone-200 bg-white p-7 shadow-xs">
              <h2 className="text-xl font-semibold text-stone-900">{section.title}</h2>
              <p className="mt-4 leading-7 text-stone-600">{section.body}</p>
              {section.href && (
                <Link
                  href={section.href}
                  className="mt-5 inline-block font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
                >
                  {section.label}
                </Link>
              )}
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
