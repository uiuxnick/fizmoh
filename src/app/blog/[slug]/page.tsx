import BlogPostReader from "./page-client"
import { BLOG_POSTS } from "@/lib/blog-data"

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
  const base = await pageSeo(`/blog/${decoded}`, title, description, post.image)

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
  return <BlogPostReader params={params} />
}
