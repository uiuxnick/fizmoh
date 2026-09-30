import { currentTenant } from "@/lib/tenant"
import { raw } from "@/lib/db"

/*
 * There is no default hospital.
 *
 * This used to fall back to a hardcoded tenant id — one particular customer's
 * workspace — whenever nothing else resolved. So an unconfigured deployment,
 * or a request that arrived without a session, quietly read and wrote another
 * business's patient records while looking like it was working. Failing loudly
 * is the only safe answer: a hospital serving the wrong patients is worse than
 * a hospital that is briefly unavailable.
 */

export async function resolveHospTenantId(req?: Request): Promise<string> {
  const t = currentTenant()
  if (t?.tenantId) return t.tenantId

  // Public hospital tenant can be explicitly configured via env
  const configured = process.env.HOSPITAL_PUBLIC_TENANT_ID?.trim()
  if (configured) return configured

  // Public patient booking routes run on shared hostname without workspace cookie.
  // Preserve single-hospital fallback for public patient booking, but never choose
  // an arbitrary row once multiple hospitals exist in the platform.
  const settings = await raw.hospSettings.findMany({ select: { tenantId: true }, take: 2 })
  if (settings.length === 1 && settings[0].tenantId) return settings[0].tenantId

  throw new Error(
    "403 – Access Denied: No hospital workspace context could be resolved for this request.",
  )
}

/**
 * What a chemotherapy day-care bed costs.
 *
 * Was a bare `const chemoAmt = 50.0` inside the hosted checkout, which made it
 * both unchangeable by a tenant and impossible to reuse without copying the
 * number into a second file — where the two would eventually disagree about
 * what a patient owes. Read from workspace settings, falling back to the
 * original 50 so nothing changes for anyone who has not set a price.
 */
export async function chemoPrice(): Promise<number> {
  const { getConfigValue } = await import("@/lib/app-config")
  const raw = (await getConfigValue("hospital_chemo_price")) || ""
  const parsed = Number(raw.trim())
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 50.0
}
