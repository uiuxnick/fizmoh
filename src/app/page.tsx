import { cookies, headers } from "next/headers"
import MarketingHome from "@/components/marketing-home"
import AppShell from "@/components/app-shell"
import { CUSTOMER_COOKIE, STAFF_COOKIE } from "@/lib/auth"
import { SeoStructuredData } from "@/components/seo-structured-data"
import { raw } from "@/lib/db"
import CustomerSiteView from "@/components/views/customer-site-view"

export async function generateMetadata() {
  const headerList = await headers()
  const rawHost = (headerList.get("x-forwarded-host") || headerList.get("host") || "").split(":")[0].toLowerCase()

  if (
    rawHost &&
    rawHost !== "localhost" &&
    rawHost !== "127.0.0.1" &&
    rawHost !== "187.127.119.207" &&
    rawHost !== "app.fizmoh.cloud" &&
    !rawHost.endsWith(".fizmoh.cloud")
  ) {
    const tenant = await raw.tenant.findFirst({
      where: { customDomain: rawHost, status: { notIn: ["CANCELLED"] } },
      select: { name: true, slug: true },
    })
    if (tenant) {
      return {
        title: tenant.name,
        alternates: { canonical: `https://${rawHost}` },
      }
    }
  }

  const { pageSeo } = await import("@/lib/seo-config")
  return pageSeo(
    "/",
    "Fizmoh — Official WhatsApp Business Platform & Cloud API in Oman & GCC",
    "Official Meta WhatsApp Business Cloud API platform in Oman & GCC. Multi-agent team inbox, visual AI bot builder, broadcast campaigns, CRM, website live chat widget, and AmwalPay online payments.",
  )
}

/**
 * The front door, decided on the server.
 *
 * If requested via a verified tenant custom domain (e.g. tours.omanadventures.com),
 * directly renders the tenant's published website and customer storefront.
 *
 * Otherwise:
 *  - No cookie → Fizmoh marketing landing page, server-rendered.
 *  - A cookie → The Fizmoh application shell.
 */
export default async function Page() {
  const headerList = await headers()
  const rawHost = (headerList.get("x-forwarded-host") || headerList.get("host") || "").split(":")[0].toLowerCase()

  // 1. Check custom domain resolution first
  if (
    rawHost &&
    rawHost !== "localhost" &&
    rawHost !== "127.0.0.1" &&
    rawHost !== "187.127.119.207" &&
    rawHost !== "app.fizmoh.cloud" &&
    !rawHost.endsWith(".fizmoh.cloud")
  ) {
    const tenant = await raw.tenant.findFirst({
      where: { customDomain: rawHost, status: { notIn: ["CANCELLED"] } },
      select: { id: true, slug: true, name: true, logoUrl: true },
    })

    if (tenant) {
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
        where: { tenantId: tenant.id, key: "business_type" },
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
              brandName={academy?.brand?.name || tenant.name}
              brandLogo={academy?.brand?.logo || tenant.logoUrl}
              contactEmail={academy?.brand?.email || undefined}
              contactPhone={academy?.brand?.phone || undefined}
              address={academy?.brand?.address || undefined}
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
  }

  // 2. Standard Fizmoh portal routing
  const jar = await cookies()
  const signedIn = jar.has(STAFF_COOKIE) || jar.has(CUSTOMER_COOKIE)

  if (!signedIn) {
    return (
      <>
        <SeoStructuredData isHomepage={true} />
        <MarketingHome />
      </>
    )
  }

  return <AppShell />
}
