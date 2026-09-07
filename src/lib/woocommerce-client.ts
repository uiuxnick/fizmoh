import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"

/** Workspace ids that mean "the installation", both spellings that exist. */
const PLATFORM_SCOPES = ["", "PLATFORM"]

/**
 * The store this workspace is connected to.
 *
 * `SystemSetting` is not narrowed by the scoped client — it is the one model
 * that carries its own workspace — and this took the first row it found with
 * no workspace filter at all. So every workspace synced whichever store
 * happened to be stored first: the ten-minute cron pulled the same 52 products
 * into all three, and a second business connecting its own shop would have
 * been given somebody else's catalogue.
 *
 * The workspace's own settings win; the installation's are the fallback, which
 * is what every workspace is using today. Nothing changes for them until they
 * save their own.
 */
export async function getWcCredentials() {
  const tenantId = currentTenant()?.tenantId
  const rows = await db.systemSetting.findMany({
    where: {
      key: "WOOCOMMERCE_SETTINGS",
      OR: [
        ...(tenantId ? [{ tenantId }] : []),
        { tenantId: { in: PLATFORM_SCOPES } },
      ],
    },
    select: { value: true, tenantId: true },
  })

  const own = tenantId ? rows.find(r => r.tenantId === tenantId) : undefined
  const shared = rows.find(r => PLATFORM_SCOPES.includes(r.tenantId))
  const config = own ?? shared
  if (!config?.value) return null
  try {
    const parsed = JSON.parse(config.value)
    if (!parsed.storeUrl || !parsed.consumerKey || !parsed.consumerSecret) return null
    return {
      storeUrl: parsed.storeUrl.replace(/\/$/, ""),
      consumerKey: parsed.consumerKey,
      consumerSecret: parsed.consumerSecret,
    }
  } catch {
    return null
  }
}

export async function wcRequest(path: string, options: RequestInit = {}) {
  const creds = await getWcCredentials()
  if (!creds) throw new Error("WooCommerce credentials not configured")

  const auth = "Basic " + Buffer.from(`${creds.consumerKey}:${creds.consumerSecret}`).toString("base64")
  const url = `${creds.storeUrl}/wp-json/wc/v3/${path.replace(/^\//, "")}`

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Fizmoh-WooCommerce-Client/1.0",
      Authorization: auth,
      ...(options.headers || {}),
    },
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    throw new Error(`WooCommerce API Error (${res.status}): ${errText.slice(0, 150)}`)
  }

  return res.json()
}

export async function fetchWcProducts(params: { search?: string; category?: string; per_page?: number } = {}) {
  const query = new URLSearchParams()
  query.set("status", "publish")
  query.set("per_page", String(params.per_page || 10))
  if (params.search) query.set("search", params.search)
  if (params.category && params.category !== "all") query.set("category", params.category)

  return wcRequest(`products?${query.toString()}`)
}

export async function fetchWcProductById(id: string | number) {
  return wcRequest(`products/${id}`)
}

