import type { Metadata } from "next"
import {
  absoluteUrl,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  KEYWORDS_AR,
  KEYWORDS_EN,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo"

/**
 * Site metadata, as the owner has configured it.
 *
 * Titles, descriptions and keywords were compiled into the bundle, so changing
 * a meta description — the single most common SEO edit there is — needed a
 * developer and a deploy. They come from Settings now, and every field falls
 * back to the value that shipped, so an empty setting is never an empty tag.
 *
 * Server-only: it reads the database, and importing it from a client component
 * would pull Prisma into the browser bundle.
 */

export type ResolvedSeo = {
  siteName: string
  title: string
  titleTemplate: string
  description: string
  keywords: string[]
  ogImage: string
  twitterHandle: string
  googleSiteVerification: string
  bingSiteVerification: string
}

/** Per-path overrides: { "/pricing": { title, description, keywords } }. */
type PageOverride = { title?: string; description?: string; keywords?: string }

async function readConfig(key: string): Promise<string> {
  try {
    const { getConfigValue } = await import("@/lib/app-config")
    return (await getConfigValue(key)) || ""
  } catch {
    // Metadata must render even when the database is unreachable; the page
    // falling back to shipped defaults beats the page failing to render.
    return ""
  }
}

function splitKeywords(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map(k => k.trim())
    .filter(Boolean)
    .slice(0, 60)
}

export async function siteSeo(): Promise<ResolvedSeo> {
  const [name, title, template, description, keywords, ogImage, twitter, googleVerify, bingVerify] = await Promise.all([
    readConfig("seo_site_name"),
    readConfig("seo_default_title"),
    readConfig("seo_title_template"),
    readConfig("seo_description"),
    readConfig("seo_keywords"),
    readConfig("seo_og_image"),
    readConfig("seo_twitter_handle"),
    readConfig("google_site_verification"),
    readConfig("bing_site_verification"),
  ])

  return {
    siteName: name || SITE_NAME,
    title: title || "Fizmoh — WhatsApp Business Platform & Cloud API in Oman & GCC",
    // "%s" is where Next puts the page's own title.
    titleTemplate: template && template.includes("%s") ? template : "%s | Fizmoh",
    description: description || DEFAULT_DESCRIPTION,
    keywords: keywords ? splitKeywords(keywords) : [...KEYWORDS_EN, ...KEYWORDS_AR],
    ogImage: ogImage || DEFAULT_OG_IMAGE,
    twitterHandle: twitter || "",
    googleSiteVerification: googleVerify || process.env.GOOGLE_SITE_VERIFICATION || "",
    bingSiteVerification: bingVerify || "",
  }
}

async function pageOverride(path: string): Promise<PageOverride | null> {
  const raw = await readConfig("seo_page_overrides")
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Record<string, PageOverride>
    if (!parsed || typeof parsed !== "object") return null
    // Accept "/pricing" and "pricing" alike — a trailing slash or a missing
    // leading one is not worth losing an override over.
    const key = path.startsWith("/") ? path : `/${path}`
    return parsed[key] ?? parsed[key.replace(/^\//, "")] ?? parsed[key.replace(/\/$/, "")] ?? null
  } catch {
    return null
  }
}

/**
 * Metadata for one page: the owner's override if there is one, otherwise the
 * title and description the page itself supplies.
 */
export async function pageSeo(
  path: string,
  fallbackTitle: string,
  fallbackDescription: string,
  image?: string,
): Promise<Metadata> {
  const [site, override] = await Promise.all([siteSeo(), pageOverride(path)])

  const title = override?.title || fallbackTitle
  const description = override?.description || fallbackDescription

  /*
   * Page-specific keywords beat the site-wide list.
   *
   * Every page emitted the same 400 terms, which says nothing about what any
   * one page is for. The cluster map narrows each page to the terms it is
   * actually trying to win; the site-wide list stays as the fallback for pages
   * with no cluster of their own. An explicit override in Settings still wins
   * over both.
   */
  const { keywordsForPage } = await import("@/lib/keyword-map")
  const mapped = keywordsForPage(path)
  const keywords = override?.keywords
    ? splitKeywords(override.keywords)
    : mapped.length
      ? mapped
      : site.keywords
  const ogImage = image || site.ogImage
  const url = absoluteUrl(path)

  /*
   * Don't brand a title that is already branded.
   *
   * Blog posts carry their own `metaTitle`, most of which already end in the
   * brand — appending the site name again produced
   * "… | Fizmoh | Fizmoh WhatsApp Business Platform".
   */
  const brand = site.siteName.split(/\s+/)[0].toLowerCase()
  const alreadyBranded = title.toLowerCase().includes(brand)
  const fullTitle = alreadyBranded ? title : `${title} | ${site.siteName}`

  return {
    // `absolute` stops the root layout's "%s | Fizmoh" template being applied
    // on top of a title that already carries the site name — otherwise every
    // page reads "Pricing | Fizmoh Platform | Fizmoh".
    title: { absolute: fullTitle },
    description,
    keywords,
    alternates: {
      canonical: url,
      languages: {
        en: url,
        ar: url,
        "x-default": url,
      },
    },
    openGraph: {
      type: "website",
      url,
      siteName: site.siteName,
      title: fullTitle,
      description,
      images: [{ url: absoluteUrl(ogImage), width: 1200, height: 630, alt: `${title} — ${site.siteName}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [absoluteUrl(ogImage)],
      ...(site.twitterHandle ? { site: site.twitterHandle, creator: site.twitterHandle } : {}),
    },
  }
}

export { SITE_URL }
