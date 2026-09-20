import BlogPostReader from "./page-client"
import { BLOG_POSTS } from "@/lib/blog-data"
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo"

/**
 * Every article carries its own title, description and keywords.
 *
 * The posts already held `metaTitle`, `metaDescription` and `keywords` — the
 * fields were written and then never used, so all fifty-odd article URLs
 * shared the homepage's title and description. To a search engine that reads
 * as one page duplicated many times, which is close to the worst thing a blog
 * can do to itself.
 *
 * Arabic slugs resolve to the Arabic copy, so the two language versions do not
 * compete with each other either.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  const post = BLOG_POSTS.find(p => p.slug === decoded || p.slugAr === decoded)
  if (!post) return {}

  const isAr = post.slugAr === decoded && post.slug !== decoded
  const title = (isAr ? post.metaTitleAr : post.metaTitle) || (isAr ? post.h1Ar : post.h1)
  const description = (isAr ? post.metaDescriptionAr : post.metaDescription) || ""
  const keywords = (isAr ? post.keywordsAr : post.keywords) || []

  const { pageSeo } = await import("@/lib/seo-config")

  const enUrl = absoluteUrl(`/blog/${encodeURIComponent(post.slug)}`)
  const arUrl = post.slugAr ? absoluteUrl(`/blog/${encodeURIComponent(post.slugAr)}`) : `${enUrl}?lang=ar`
  const canonical = isAr && post.slugAr ? arUrl : enUrl

  const base = await pageSeo(`/blog/${decoded}`, title, description, post.image, {
    canonical,
    languages: {
      en: enUrl,
      ar: arUrl,
      "x-default": enUrl,
    },
  })

  return {
    ...base,
    // The post's own keywords, not the site-wide list.
    ...(keywords.length ? { keywords } : {}),
    openGraph: {
      ...(base.openGraph as object),
      type: "article",
      publishedTime: post.date,
    },
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  const post = BLOG_POSTS.find(p => p.slug === decoded || p.slugAr === decoded)

  if (!post) {
    return <BlogPostReader params={params} />
  }

  const isAr = post.slugAr === decoded && post.slug !== decoded
  const canonical = isAr && post.slugAr
    ? absoluteUrl(`/blog/${encodeURIComponent(post.slugAr)}`)
    : absoluteUrl(`/blog/${encodeURIComponent(post.slug)}`)

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: (isAr ? post.h1Ar : post.h1) || post.metaTitle,
    alternativeHeadline: isAr ? post.metaTitleAr : post.metaTitle,
    description: (isAr ? post.metaDescriptionAr : post.metaDescription) || "",
    image: absoluteUrl(post.image || "/fizmoh-logo.png"),
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Person",
      name: (isAr ? post.author.nameAr : post.author.name) || "Nick Sharma",
      jobTitle: (isAr ? post.author.roleAr : post.author.role) || "Solutions Architect",
      description: (isAr ? post.author.bioAr : post.author.bio) || undefined,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/fizmoh-logo.png"),
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical,
    },
    inLanguage: isAr ? "ar" : "en-US",
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: isAr ? "الرئيسية" : "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: isAr ? "المدونة" : "Blog",
        item: absoluteUrl("/blog"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: (isAr ? post.h1Ar : post.h1) || post.metaTitle,
        item: canonical,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        suppressHydrationWarning
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        suppressHydrationWarning
      />
      <BlogPostReader params={params} />
    </>
  )
}
