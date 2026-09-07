import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { MarketingLanding } from "@/components/marketing/marketing-landing"
import { MarketingJsonLd } from "@/components/marketing/marketing-jsonld"
import { PRODUCT_PAGES, productBySlug } from "@/lib/marketing/products"

/**
 * Product landing pages.
 *
 * One route, one shared template, but the copy for each product is written
 * individually in src/lib/marketing/products.ts — a shell with the product
 * name substituted is a doorway page, which Google suppresses rather than ranks.
 *
 * Statically generated (generateStaticParams + no dynamic APIs); the root
 * layout's `revalidate = 300` keeps editable SEO settings fresh via ISR.
 */

export function generateStaticParams() {
  return PRODUCT_PAGES.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = productBySlug(slug)
  if (!page) return {}

  const { pageSeo } = await import("@/lib/seo-config")
  const base = await pageSeo(
    `/product/${page.slug}`,
    page.metaTitle.en,
    page.metaDescription.en,
    page.hero.src,
  )
  return { ...base, keywords: page.keywords }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = productBySlug(slug)
  if (!page) notFound()

  return (
    <>
      <MarketingJsonLd page={page} variant="product" />
      <MarketingLanding page={page} variant="product" showSimulator={page.slug === "simulator"} />
    </>
  )
}
