import type { MetadataRoute } from "next"
import { absoluteUrl } from "@/lib/seo"
import { db } from "@/lib/db"
import { BLOG_POSTS } from "@/lib/blog-data"
import { SOLUTION_PAGES } from "@/lib/solution-pages"
import { PRODUCT_PAGES } from "@/lib/marketing/products"
import { INDUSTRY_PAGES } from "@/lib/marketing/industries"
import { COMPARISON_PAGES } from "@/lib/marketing/comparisons"
import { LOCATION_PAGES } from "@/lib/marketing/locations"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const staticPages = [
    ["/", 1.0, "weekly"],
    ["/features", 0.9, "weekly"],
    ["/pricing", 0.9, "weekly"],
    ["/blog", 0.9, "weekly"],
    ["/book-demo", 0.8, "monthly"],
    ["/contact", 0.8, "monthly"],
    ["/docs", 0.9, "weekly"],
    ["/whats-new", 0.9, "daily"],
    ["/signup", 0.8, "monthly"],
    ["/privacy", 0.3, "yearly"],
    ["/terms", 0.3, "yearly"],
    ["/acceptable-use", 0.3, "yearly"],
    ["/cookies", 0.3, "yearly"],
    ["/data-deletion", 0.3, "yearly"],
  ] as const

  const sitemapEntries: MetadataRoute.Sitemap = staticPages.map(
    ([path, priority, changeFrequency]) => ({
      url: absoluteUrl(path),
      lastModified: now,
      changeFrequency: changeFrequency as "weekly" | "monthly" | "yearly" | "daily",
      priority,
    })
  )

  // Append all individual blog articles (English and Arabic)
  for (const post of BLOG_POSTS) {
    sitemapEntries.push({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: new Date(post.date),
      changeFrequency: "weekly",
      priority: 0.85,
    })
    sitemapEntries.push({
      url: absoluteUrl(`/blog/${post.slugAr}`),
      lastModified: new Date(post.date),
      changeFrequency: "weekly",
      priority: 0.85,
    })
  }

  try {
    const tenants = await db.tenant.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, updatedAt: true },
      take: 100,
    })

    for (const tenant of tenants) {
      if (tenant.slug) {
        sitemapEntries.push({
          url: absoluteUrl(`/shop/${tenant.slug}`),
          lastModified: tenant.updatedAt || now,
          changeFrequency: "weekly",
          priority: 0.7,
        })
      }
    }
  } catch {
    // If DB is unavailable during static analysis, return static sitemap safely
  }

  // Product, industry and comparison landing pages. Added outside the
  // try/catch above because they come from static files — a database outage
  // must not drop them from the sitemap.
  for (const page of PRODUCT_PAGES) {
    sitemapEntries.push({
      url: absoluteUrl(`/product/${page.slug}`),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    })
  }

  for (const page of INDUSTRY_PAGES) {
    sitemapEntries.push({
      url: absoluteUrl(`/solutions/${page.slug}`),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    })
  }

  // Legacy comparison pages and other verticals still served from
  // solution-pages.ts (skip any slug now owned by INDUSTRY_PAGES).
  const industrySlugs = new Set(INDUSTRY_PAGES.map(p => p.slug))
  for (const page of SOLUTION_PAGES) {
    if (industrySlugs.has(page.slug)) continue
    sitemapEntries.push({
      url: absoluteUrl(`/solutions/${page.slug}`),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.75,
    })
  }

  // Root money landing pages for Oman
  const rootMoneyPages = [
    "/whatsapp-business-api-oman",
    "/whatsapp-automation-oman",
    "/whatsapp-chatbot-oman",
    "/whatsapp-crm-oman",
    "/whatsapp-marketing-oman",
  ]
  for (const path of rootMoneyPages) {
    sitemapEntries.push({
      url: absoluteUrl(path),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.95,
    })
  }

  // Comparison landing pages
  for (const page of COMPARISON_PAGES) {
    sitemapEntries.push({
      url: absoluteUrl(`/compare/${page.slug}`),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    })
  }

  // Location landing pages
  for (const page of LOCATION_PAGES) {
    sitemapEntries.push({
      url: absoluteUrl(`/locations/${page.slug}`),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    })
  }

  return sitemapEntries
}

