import { NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { getConfigValue } from "@/lib/app-config"

/**
 * The handful of settings the browser legitimately needs.
 *
 * A OneSignal App ID is public by design — it ships in the page script of every
 * site that uses it. The REST key is not, and is never read here.
 */
/**
 * The partner strip, as the owner typed it.
 *
 * Anything malformed is ignored rather than thrown: a stray character in a
 * settings field must not take the homepage down, and the page falls back to
 * its built-in list when this returns nothing.
 */
function parsePartners(raw: string): { label: string; tag: string }[] | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const rows = parsed
      .map((v: unknown) => {
        const o = v as { label?: unknown; tag?: unknown }
        return { label: String(o?.label ?? "").trim().slice(0, 60), tag: String(o?.tag ?? "").trim().slice(0, 60) }
      })
      .filter(v => v.label)
    return rows.length ? rows.slice(0, 24) : null
  } catch {
    return null
  }
}

export const GET = withErrors(async () => {
  const [
    appId,
    safariWebId,
    metaAppId,
    metaConfigId,
    gaId,
    gtmId,
    googleSiteVerification,
    metaPixelId,
    customHeadScripts,
    customBodyScripts,
    googleClientId,
    marketingPartners,
  ] = await Promise.all([
    getConfigValue("onesignal_app_id"),
    getConfigValue("onesignal_safari_id"),
    getConfigValue("meta_app_id"),
    getConfigValue("meta_config_id"),
    getConfigValue("google_analytics_id"),
    getConfigValue("google_tag_manager_id"),
    getConfigValue("google_site_verification"),
    getConfigValue("meta_pixel_id"),
    getConfigValue("custom_head_scripts"),
    getConfigValue("custom_body_scripts"),
    // The OAuth client id, which is public by design: it is in the page source
    // of every site that offers "sign in with Google". The secret beside it in
    // settings is never read here.
    getConfigValue("google_oauth_client_id"),
    // The homepage partner strip, editable in Settings. Public by nature —
    // it is printed on the homepage either way.
    getConfigValue("marketing_partners"),
  ])
  return NextResponse.json({
    onesignal: { appId, safariWebId },
    marketingPartners: parsePartners(marketingPartners),
    metaAppId,
    metaConfigId,
    googleClientId: googleClientId || process.env.GOOGLE_OAUTH_CLIENT_ID || null,
    analytics: {
      gaId: gaId || process.env.NEXT_PUBLIC_GA_ID || null,
      gtmId: gtmId || process.env.NEXT_PUBLIC_GTM_ID || null,
      googleSiteVerification: googleSiteVerification || process.env.GOOGLE_SITE_VERIFICATION || null,
      metaPixelId: metaPixelId || process.env.NEXT_PUBLIC_META_PIXEL_ID || null,
      customHeadScripts: customHeadScripts || null,
      customBodyScripts: customBodyScripts || null,
    },
  })
})
