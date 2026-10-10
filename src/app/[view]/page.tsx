import { notFound, redirect } from "next/navigation"
import { cookies, headers } from "next/headers"
import AppShell from "@/components/app-shell"
import { viewForPath } from "@/lib/admin-routes"
import { raw } from "@/lib/db"
import { STAFF_COOKIE, verifySession } from "@/lib/auth"
import { resolveTenant } from "@/lib/tenant"
import { modulesFor } from "@/lib/entitlements"
import { MODULE_BY_KEY, type Module } from "@/lib/module-registry"
import ModuleAccessDenied from "@/components/module-access-denied"
import CustomerSiteView from "@/components/views/customer-site-view"
import type { ViewKey } from "@/lib/store"

export const dynamic = "force-dynamic"

const VIEW_MODULE_REQUIREMENTS: Partial<Record<ViewKey, Module>> = {
  hospital: "HOSPITAL",
  restaurant: "RESTAURANT",
  tours: "TOURS",
  bookings: "TOURS",
  calendar: "TOURS",
  coupons: "TOURS",
  visa: "VISA",
  corporate: "CORPORATE",
  woocommerce: "WOOCOMMERCE",
  training: "TRAINING",
  catalog: "CATALOG",
  "website-builder": "WEBSITE",
  "cloud-bridges": "INTEGRATION",
  "white-label": "WHITE_LABEL",
  "digital-qr": "DIGITAL_QR",
  "social-channels": "SOCIAL_INBOX",
  campaigns: "BROADCAST",
  subscribers: "BROADCAST",
  appointments: "APPOINTMENTS",
}

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
  if (key) {
    const requiredModule = VIEW_MODULE_REQUIREMENTS[key]
    if (requiredModule) {
      const cookieJar = await cookies()
      const staffToken = cookieJar.get(STAFF_COOKIE)?.value
      let staffId: string | null = null
      if (staffToken) {
        const session = await verifySession(staffToken).catch(() => null)
        if (session?.staffId) staffId = session.staffId
      }

      const headerList = await headers()
      const host = headerList.get("host")
      const cookieWorkspace = cookieJar.get("fizmoh_workspace")?.value || null
      const tenant = await resolveTenant({
        host,
        staffId,
        slug: cookieWorkspace,
        trustedSlug: cookieWorkspace,
      })

      if (!staffId || !tenant) {
        redirect(`/login?returnUrl=/${clean}`)
      }

      if (tenant.role !== "PLATFORM") {
        const activeModules = await modulesFor(tenant.tenantId)
        if (!activeModules.includes(requiredModule)) {
          const modInfo = MODULE_BY_KEY[requiredModule]
          return (
            <ModuleAccessDenied
              moduleName={modInfo?.label || requiredModule}
              moduleKey={requiredModule}
              workspaceName={tenant.slug}
            />
          )
        }
      }
    }

    return <AppShell adminEntry initialView={key} />
  }

  const tenant = await raw.tenant.findFirst({
    where: {
      OR: [{ slug: clean }, { customDomain: clean }],
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
      // The public catalogue has the course-date overrides applied.  Admin
      // course management stores those overrides separately so an edit becomes
      // visible on the public academy as soon as it is saved.
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
