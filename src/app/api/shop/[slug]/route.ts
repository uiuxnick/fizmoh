import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withTenant } from "@/lib/tenant"
import { db } from "@/lib/db"
import { decryptSecret } from "@/lib/secret-box"

/**
 * A business's public shop, by workspace address.
 *
 * The one place a customer can reach a specific business without signing in.
 * Every workspace answers on the same hostname, so the address in the path is
 * the only thing that says whose shop this is — which is why everything after
 * the lookup runs inside that workspace and cannot see another's catalogue.
 *
 * The workspace itself is read with the unscoped client, because "which
 * business is this" cannot be answered from inside one.
 */
/**
 * "Tours=50+, Travellers=2.4K+" into something the page can render.
 *
 * Free text rather than four fixed fields because businesses count different
 * things: a restaurant has covers, a clinic has patients, a stable has horses.
 * Four at most, because the row is four wide and a fifth would wrap into a
 * lonely second line.
 */
function parseStats(raw: string | undefined): { label: string; value: string }[] {
  if (!raw) return []
  return raw
    .split(",")
    .map(pair => {
      const [label, ...rest] = pair.split("=")
      return { label: (label ?? "").trim(), value: rest.join("=").trim() }
    })
    .filter(s => s.label && s.value)
    .slice(0, 4)
}

export const GET = withErrors(async (
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) => {
  const { slug } = await context.params
  const cleanSlug = slug.toLowerCase()

  const tenant = await raw.tenant.findFirst({
    where: {
      OR: [{ slug: cleanSlug }, { customDomain: cleanSlug }],
    },
    select: { id: true, slug: true, name: true, customDomain: true, logoUrl: true, currency: true, status: true },
  })
  if (!tenant) return NextResponse.json({ error: "No such shop" }, { status: 404 })

  if (tenant.status === "SUSPENDED" || tenant.status === "CANCELLED") {
    return NextResponse.json({ shop: { name: tenant.name, slug: tenant.slug, closed: true }, products: [] })
  }

  const { products, branding } = await withTenant({ tenantId: tenant.id, slug: tenant.slug }, async () => {
    const tourList = await db.tour.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 60,
      select: {
        id: true, slug: true, name: true, description: true, media: true,
        basePrice: true, childPrice: true, currency: true, durationHours: true,
        city: true, category: true, featured: true, rating: true, reviewCount: true,
      },
    })
    const settings = await db.systemSetting.findMany({
      where: { tenantId: tenant.id },
    })
    /*
     * Settings are encrypted at rest, and this read was taking the stored
     * value as-is.
     *
     * Anything saved through the Settings screens goes in encrypted, so a
     * business that filled in its own name got `enc:…` on its shop's header.
     * It was invisible until now only because an unset name falls back to the
     * workspace's own. `decryptSecret` returns anything unencrypted unchanged,
     * so the older plaintext keys are unaffected.
     */
    const brandMap: Record<string, string> = {}
    for (const s of settings) brandMap[s.key] = decryptSecret(s.value)
    return { products: tourList, branding: brandMap }
  })

  return NextResponse.json({
    shop: {
      name: branding.business_name || tenant.name,
      slug: tenant.slug,
      customDomain: tenant.customDomain,
      logoUrl: branding.website_logo_url || branding.business_logo || tenant.logoUrl,
      faviconUrl: branding.website_favicon_url,
      primaryColor: branding.website_primary_color || "#0d9488",
      accentColor: branding.website_accent_color || "#f59e0b",
      title: branding.website_title,
      description: branding.website_description,
      currency: tenant.currency,
      email: branding.business_email,
      phone: branding.business_phone,
      address: branding.business_address,
      website: branding.business_website,
      /*
       * What the business chose to say on its own site.
       *
       * Every one of these is optional and none has a stand-in. A shop with no
       * story shows no story section — the alternative, which this codebase
       * did until now, is showing one business's founding year, traveller
       * count and star rating to every other business that signs up.
       */
      tagline: branding.site_tagline || null,
      hero: {
        title: branding.site_hero_title || null,
        accent: branding.site_hero_accent || null,
        subtitle: branding.site_hero_subtitle || null,
        badge: branding.site_hero_badge || null,
        image: branding.site_hero_image || null,
      },
      story: branding.site_story || null,
      mission: branding.site_mission || null,
      about: branding.business_about || null,
      stats: parseStats(branding.site_stats),
      social: {
        facebook: branding.site_facebook || null,
        instagram: branding.site_instagram || null,
        twitter: branding.site_twitter || null,
        youtube: branding.site_youtube || null,
      },
      seo: {
        googleVerification: branding.seo_google_verification || null,
        ga4Id: branding.seo_ga4_id || null,
        googleAdsId: branding.seo_google_ads_id || null,
        googleAdsLabel: branding.seo_google_ads_label || null,
        metaPixelId: branding.seo_meta_pixel_id || null,
        linkedinPartnerId: branding.seo_linkedin_partner_id || null,
        tiktokPixelId: branding.seo_tiktok_pixel_id || null,
        headCode: branding.seo_head_code || null,
        bodyCode: branding.seo_body_code || null,
        footerCode: branding.seo_footer_code || null,
      },
      closed: false,
    },
    products,
  })
})
