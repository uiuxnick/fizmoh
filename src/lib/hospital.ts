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

  // Public patient routes run on the shared hostname. A tenantId supplied in
  // the query string is caller-controlled and must never select a workspace.
  // The public hospital is configured explicitly, then resolved from the
  // hospital settings row for backwards compatibility with the existing seed.
  const configured = process.env.HOSPITAL_PUBLIC_TENANT_ID?.trim()
  if (configured) return configured

  const setting = await raw.hospSettings.findFirst({ select: { tenantId: true } })
  if (setting?.tenantId) return setting.tenantId

  throw new Error(
    "No hospital workspace could be resolved. Set HOSPITAL_PUBLIC_TENANT_ID, or configure hospital settings for the workspace.",
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
