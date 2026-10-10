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
    select: { id: true, slug: true, name: true, logoUrl: true },
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
  const restaurantAddon = await raw.tenantAddon.findFirst({
    where: {
      tenantId: tenant.id,
      status: { in: ["ACTIVE", "PAST_DUE"] },
      addon: { slug: { in: ["restaurant", "restaurant-pos", "smart-menu", "smart-menu-ordering"] } },
    },
  })
  const hasRestModule = planModules.includes("RESTAURANT") || planSlug.includes("rest") || planName.includes("rest") || Boolean(restaurantAddon)
  const branchesCount = await raw.restaurantBranch.count({ where: { tenantId: tenant.id } })
  const categoriesCount = await raw.menuCategory.count({ where: { tenantId: tenant.id } })
  const setting = await raw.systemSetting.findFirst({
    where: { tenantId: tenant.id, key: "business_type" }
  })
  const hasRestContent = branchesCount > 0 || categoriesCount > 0
  const isRestaurant = setting?.value === "RESTAURANT" || (hasRestContent && hasRestModule)

  const publishedSetting = await raw.systemSetting.findUnique({
    where: { tenantId_key: { tenantId: tenant.id, key: "website_published_json" } },
  })
  let initialPublishedWebsite: any = null
  if (publishedSetting?.value) {
    try {
      const parsed = JSON.parse(publishedSetting.value)
      if (Array.isArray(parsed) ? parsed.length > 0 : !!parsed) {
        initialPublishedWebsite = parsed
      }
    } catch {}
  }

  // Pre-determine if this workspace is training / course management
  const trainingAddon = await raw.tenantAddon.findFirst({
    where: {
      tenantId: tenant.id,
      status: { in: ["ACTIVE", "PAST_DUE"] },
      addon: { slug: { in: ["training-course-management", "training"] } },
    },
  })
  const isTrainingPlan = planSlug.includes("train") || planName.includes("train")
  const isTraining =
    tenant.slug.toLowerCase() === "tanfidh" ||
    setting?.value === "TRAINING" ||
    Boolean(trainingAddon) ||
    isTrainingPlan

  if (!initialPublishedWebsite && isTraining) {
    const { getTenantCourses } = await import("@/lib/training-service")
    const trainingCourses = await getTenantCourses(tenant.id)
    if (trainingCourses.length > 0) {
      const TrainingAcademySiteView = (await import("@/components/training/training-academy-site-view")).default
      const { getAcademy } = await import("@/lib/academy-public")
      const academy = await getAcademy(tenant.slug)

      return (
        <TrainingAcademySiteView
          slug={tenant.slug}
          courses={academy?.courses || trainingCourses}
          tenant={tenant}
          brandName={academy?.brand.name || tenant.name}
          brandLogo={academy?.brand.logo || tenant.logoUrl || null}
          contactEmail={academy?.brand.email || undefined}
          contactPhone={academy?.brand.phone || undefined}
          address={academy?.brand.address || undefined}
        />
      )
    }
  }

  let tours = await raw.tour.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  // If no native tours, check if tenant has products in WooCommerce cache
  if (tours.length === 0) {
    const wcCache = await raw.systemSetting.findFirst({
      where: { tenantId: tenant.id, key: "WOOCOMMERCE_PRODUCTS_CACHE" },
    })
    if (wcCache?.value) {
      try {
        const parsed = JSON.parse(wcCache.value)
        const productsList = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.products) ? parsed.products : [])
        if (productsList.length > 0) {
          tours = productsList.slice(0, 60).map((p: any) => ({
            id: String(p.id),
            tenantId: tenant.id,
            slug: p.slug || `product-${p.id}`,
            name: p.name,
            nameAr: null,
            description: (p.short_description || p.description || "").replace(/<[^>]*>/g, "").slice(0, 500),
            media: JSON.stringify(p.images?.map((img: any) => img.src) || []),
            basePrice: Number(p.price || p.regular_price || 0),
            childPrice: null,
            currency: "OMR",
            durationHours: 1,
            city: "Muscat",
            category: p.categories?.[0]?.name || "Products",
            featured: Boolean(p.featured),
            rating: Number(p.average_rating) || 5,
            reviewCount: Number(p.rating_count) || 1,
            status: "ACTIVE",
            createdAt: new Date(),
            updatedAt: new Date(),
          })) as any
        }
      } catch {}
    }
  }

  return (
    <CustomerSiteView
      slug={tenant.slug}
      initialIsRestaurant={isRestaurant}
      initialPublishedWebsite={initialPublishedWebsite}
      initialTours={tours}
    />
  )
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
