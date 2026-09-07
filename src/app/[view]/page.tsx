import { notFound } from "next/navigation"
import AppShell from "@/components/app-shell"
import { viewForPath } from "@/lib/admin-routes"
import { raw } from "@/lib/db"
import CustomerSiteView from "@/components/views/customer-site-view"

/**
 * One segment, two meanings.
 *
 * `/bookings` is an admin screen; `/oman-adventures` is a business's public
 * customer website. Both are a single path segment, so this decides between them: a known
 * admin screen wins, and anything else is looked up as a workspace address.
 *
 * Admin screens win on purpose. They are a fixed, known list, and a business
 * that signs up cannot take one — the reserved names in the sign-up form are
 * refused before a workspace can be created with one. The alternative, letting
 * a workspace shadow /settings, is a way to phish an operator with their own
 * product.
 *
 * Neither match is a real 404 rather than a silent fallback, which would make
 * a typo look like a working page.
 */
/**
 * Indexability for the two things this route serves.
 *
 * Admin screens (/dashboard, /inbox, /settings, /billing and ~40 others) were
 * returning 200 with the same title and no robots directive, so the whole
 * application shell was eligible for indexing as dozens of near-identical thin
 * pages. They are marked noindex here rather than only disallowed in
 * robots.txt: a disallowed URL can still be listed in results from external
 * links, whereas noindex removes it — and noindex requires that the page stay
 * crawlable, which is why robots.txt no longer blocks these paths.
 *
 * A workspace storefront is genuinely public, but it is reachable at both
 * /{slug} and /shop/{slug}. The canonical points at /shop/{slug} — the form
 * carried in the sitemap — so the two URLs consolidate instead of competing.
 */
export async function generateMetadata({ params }: { params: Promise<{ view: string }> }) {
  const { view } = await params
  const clean = view.toLowerCase()

  if (viewForPath(clean)) {
    return { title: "Workspace", robots: { index: false, follow: false } }
  }

  const tenant = await raw.tenant.findFirst({
    where: { OR: [{ slug: clean }, { customDomain: clean }] },
    select: { name: true, slug: true },
  })
  if (!tenant) return {}

  const { absoluteUrl } = await import("@/lib/seo")
  return {
    title: tenant.name,
    alternates: { canonical: absoluteUrl(`/shop/${tenant.slug}`) },
  }
}

export default async function SegmentPage({ params }: { params: Promise<{ view: string }> }) {
  const { view } = await params
  const clean = view.toLowerCase()

  const key = viewForPath(clean)
  if (key) return <AppShell adminEntry initialView={key} />

  const tenant = await raw.tenant.findFirst({
    where: {
      OR: [{ slug: clean }, { customDomain: clean }],
    },
    select: { slug: true },
  })
  if (!tenant) notFound()

  return <CustomerSiteView slug={tenant.slug} />
}
