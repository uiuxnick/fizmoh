import { notFound } from "next/navigation"
import { raw } from "@/lib/db"
import CustomerSiteView from "@/components/views/customer-site-view"

/**
 * A business's own website, at app.fizmoh.cloud/shop/their-address.
 *
 * This used to render a plain product grid while the full site — banner,
 * search, tour pages, cart, checkout, account, About and Contact — existed
 * only as a preview inside the dashboard, hardcoded to the first customer's
 * name and country. So the thing a business could actually send customers to
 * was the lesser of the two, and the better one was unshippable because it
 * said "Oman Adventures" on every page.
 *
 * Both are the same component now. The workspace travels in the path, and
 * everything the page renders about the business comes from that workspace's
 * own settings.
 */
export default async function ShopSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const tenant = await raw.tenant.findFirst({
    where: {
      OR: [
        { slug: slug.toLowerCase() },
        { customDomain: slug.toLowerCase() },
      ],
    },
    select: { id: true, slug: true, name: true },
  })

  if (!tenant) notFound()

  // Pre-determine on the server if this workspace is a restaurant
  const subscription = await raw.subscription.findFirst({
    where: { tenantId: tenant.id, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE", "PENDING_PAYMENT"] } },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  })
  const planSlug = (subscription?.plan?.slug || "").toLowerCase()
  const planName = (subscription?.plan?.name || "").toLowerCase()
  const planModules: string[] = Array.isArray(subscription?.moduleSnapshot)
    ? (subscription.moduleSnapshot as string[])
    : (Array.isArray(subscription?.plan?.modules) ? (subscription.plan.modules as string[]) : [])

  const hasRestModule = planModules.includes("RESTAURANT") || planSlug.includes("rest") || planName.includes("rest")
  const branchesCount = await raw.restaurantBranch.count({ where: { tenantId: tenant.id } })
  const categoriesCount = await raw.menuCategory.count({ where: { tenantId: tenant.id } })
  const setting = await raw.systemSetting.findFirst({
    where: { tenantId: tenant.id, key: "business_type" }
  })
  const isRestaurant = hasRestModule || branchesCount > 0 || categoriesCount > 0 || setting?.value === "RESTAURANT"

  return <CustomerSiteView slug={tenant.slug} initialIsRestaurant={isRestaurant} />
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tenant = await raw.tenant.findFirst({
    where: {
      OR: [
        { slug: slug.toLowerCase() },
        { customDomain: slug.toLowerCase() },
      ],
    },
    select: { name: true },
  })
  if (!tenant) return { title: "Shop Not Found", robots: { index: false } }
  // Without this the page inherited the root layout's canonical, which pointed
  // every storefront at the homepage — telling Google they were all duplicates
  // of it.
  const { absoluteUrl } = await import("@/lib/seo")
  return {
    title: tenant.name,
    alternates: { canonical: absoluteUrl(`/shop/${slug.toLowerCase()}`) },
  }
}
