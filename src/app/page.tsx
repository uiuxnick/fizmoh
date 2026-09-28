import { cookies, headers } from "next/headers"
import MarketingHome from "@/components/marketing-home"
import AppShell from "@/components/app-shell"
import { CUSTOMER_COOKIE, STAFF_COOKIE } from "@/lib/auth"
import { SeoStructuredData } from "@/components/seo-structured-data"
import { raw } from "@/lib/db"
import CustomerSiteView from "@/components/views/customer-site-view"

export async function generateMetadata() {
  const headerList = await headers()
  const rawHost = (headerList.get("host") || "").split(":")[0].toLowerCase()

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
  const rawHost = (headerList.get("host") || "").split(":")[0].toLowerCase()

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
      select: { id: true, slug: true, name: true },
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
      const hasRestModule = planModules.includes("RESTAURANT") || planSlug.includes("rest") || planName.includes("rest")
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

      const tours = await raw.tour.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      })

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
