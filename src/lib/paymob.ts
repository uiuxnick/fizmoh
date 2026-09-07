/**
 * Paymob Payment Gateway Integration
 *
 * Based on official Paymob documentation:
 * https://developers.paymob.com/paymob-docs/getting-started/overview
 * https://developers.paymob.com/paymob-docs/developers/developer-reference/intention-api
 *
 * Supported Features:
 * - Multi-regional base endpoints (Oman, Egypt, KSA, UAE)
 * - Intention API (POST /v1/intention/)
 * - Unified Checkout hosted redirect
 * - Cryptographic HMAC SHA-512 webhook & query verification
 * - Currency-aware smallest unit (minor unit) handling
 * - Multi-tenant workspace credentials with platform fallback
 */

import crypto from "crypto"
import { currentTenant, PLATFORM } from "@/lib/tenant"

export type PaymobRegion = "oman" | "egypt" | "ksa" | "uae"

export interface PaymobConfig {
  apiKey: string // Secret Key (Bearer/Token) used in API calls
  publicKey: string // Public Key used in Unified Checkout redirect
  hmacSecret: string // HMAC Secret used to sign & verify webhooks
  region: PaymobRegion
  integrationIdCard?: string
  integrationIdWallet?: string
  mode: "test" | "production"
}

const PLATFORM_SCOPES = [PLATFORM, "PLATFORM", ""] as const

export const PAYMOB_DB_KEYS = {
  apiKey: "paymob_api_key",
  publicKey: "paymob_public_key",
  hmacSecret: "paymob_hmac_secret",
  region: "paymob_region",
  integrationIdCard: "paymob_integration_id_card",
  integrationIdWallet: "paymob_integration_id_wallet",
  mode: "paymob_mode",
} as const

export const PLATFORM_PAYMOB_DB_KEYS = {
  apiKey: "platform_paymob_api_key",
  publicKey: "platform_paymob_public_key",
  hmacSecret: "platform_paymob_hmac_secret",
  region: "platform_paymob_region",
  integrationIdCard: "platform_paymob_integration_id_card",
  integrationIdWallet: "platform_paymob_integration_id_wallet",
  mode: "platform_paymob_mode",
  activeGateway: "platform_active_gateway",
} as const

const REGIONAL_BASE_URLS: Record<PaymobRegion, string> = {
  oman: "https://oman.paymob.com",
  egypt: "https://accept.paymob.com",
  ksa: "https://ksa.paymob.com",
  uae: "https://uae.paymob.com",
}

export function getPaymobBaseUrl(region: string = "oman"): string {
  const norm = (region || "oman").toLowerCase().trim() as PaymobRegion
  return REGIONAL_BASE_URLS[norm] || REGIONAL_BASE_URLS.oman
}

/**
 * Currency minor unit factor:
 * - OMR, KWD, BHD: 3 decimal places (1 OMR = 1000 baisa)
 * - AED, SAR, EGP, USD, EUR, GBP, QAR: 2 decimal places (1 EGP = 100 piastres)
 */
export function getCurrencyDecimals(currency: string = "OMR"): number {
  const c = currency.toUpperCase().trim()
  if (c === "OMR" || c === "KWD" || c === "BHD") return 3
  return 2
}

export function toMinorUnits(amount: number, currency: string = "OMR"): number {
  const decimals = getCurrencyDecimals(currency)
  return Math.round(amount * Math.pow(10, decimals))
}

export function fromMinorUnits(minor: number, currency: string = "OMR"): number {
  const decimals = getCurrencyDecimals(currency)
  return parseFloat((minor / Math.pow(10, decimals)).toFixed(decimals))
}

/**
 * Workspace snapshots cache with 60-second TTL
 */
const snapshots = new Map<string, { values: Partial<PaymobConfig>; at: number }>()
const SNAPSHOT_TTL_MS = 60_000

function scope(): string {
  return currentTenant()?.tenantId ?? PLATFORM
}

export function getPaymobConfig(): PaymobConfig {
  const saved = snapshots.get(scope())?.values ?? {}
  const mode = saved.mode || (process.env.PAYMOB_MODE as "test" | "production") || "test"
  const rawRegion = saved.region || (process.env.PAYMOB_REGION as PaymobRegion) || "oman"
  const region: PaymobRegion = (["oman", "egypt", "ksa", "uae"].includes(rawRegion) ? rawRegion : "oman") as PaymobRegion

  return {
    apiKey: saved.apiKey || process.env.PAYMOB_API_KEY || "",
    publicKey: saved.publicKey || process.env.PAYMOB_PUBLIC_KEY || "",
    hmacSecret: saved.hmacSecret || process.env.PAYMOB_HMAC_SECRET || "",
    region,
    integrationIdCard: saved.integrationIdCard || process.env.PAYMOB_INTEGRATION_ID_CARD || "",
    integrationIdWallet: saved.integrationIdWallet || process.env.PAYMOB_INTEGRATION_ID_WALLET || "",
    mode: mode === "production" ? "production" : "test",
  }
}

/** Pulls saved Paymob settings into the snapshot cache. */
export async function refreshPaymobConfig(): Promise<PaymobConfig> {
  const key = scope()
  try {
    const { db } = await import("@/lib/db")
    const rows = await db.systemSetting.findMany({
      where: {
        key: { in: Object.values(PAYMOB_DB_KEYS) },
        OR: [{ tenantId: key }, { tenantId: { in: [...PLATFORM_SCOPES] } }],
      },
      select: { key: true, value: true, tenantId: true },
    })

    const pick = (name: string) => {
      const matches = rows.filter(r => r.key === name)
      return (matches.find(r => r.tenantId === key) ?? matches[0])?.value || undefined
    }

    snapshots.set(key, {
      values: {
        apiKey: pick(PAYMOB_DB_KEYS.apiKey),
        publicKey: pick(PAYMOB_DB_KEYS.publicKey),
        hmacSecret: pick(PAYMOB_DB_KEYS.hmacSecret),
        region: pick(PAYMOB_DB_KEYS.region) as PaymobRegion | undefined,
        integrationIdCard: pick(PAYMOB_DB_KEYS.integrationIdCard),
        integrationIdWallet: pick(PAYMOB_DB_KEYS.integrationIdWallet),
        mode: pick(PAYMOB_DB_KEYS.mode) as "test" | "production" | undefined,
      },
      at: Date.now(),
    })
  } catch (error) {
    console.error("Could not load Paymob settings from DB:", error)
  }
  return getPaymobConfig()
}

/** Resolves workspace Paymob credentials, refreshing snapshot if stale. */
export async function paymobConfig(): Promise<PaymobConfig> {
  const snapshot = snapshots.get(scope())
  if (snapshot && Date.now() - snapshot.at < SNAPSHOT_TTL_MS) return getPaymobConfig()
  return refreshPaymobConfig()
}

export function invalidatePaymobConfig() {
  snapshots.clear()
}

export function isPaymobConfigured(): boolean {
  const c = getPaymobConfig()
  return !!(c.apiKey && c.publicKey && c.hmacSecret)
}

export async function paymobReady(): Promise<boolean> {
  const c = await paymobConfig()
  return !!(c.apiKey && c.publicKey && c.hmacSecret)
}

/**
 * The platform's own Paymob merchant credentials, for collecting subscription fees and platform invoices.
 * Checked in order:
 * 1. Database platform settings (platform_paymob_*)
 * 2. Dedicated environment variables (PLATFORM_PAYMOB_*)
 * 3. General Paymob environment variables (PAYMOB_*)
 * 4. General Paymob tenant configuration
 */
export async function platformPaymobConfig(): Promise<PaymobConfig> {
  const { getConfigValue } = await import("@/lib/app-config")
  const [apiKey, publicKey, hmacSecret, regionVal, cardId, walletId, modeVal] = await Promise.all([
    getConfigValue(PLATFORM_PAYMOB_DB_KEYS.apiKey),
    getConfigValue(PLATFORM_PAYMOB_DB_KEYS.publicKey),
    getConfigValue(PLATFORM_PAYMOB_DB_KEYS.hmacSecret),
    getConfigValue(PLATFORM_PAYMOB_DB_KEYS.region),
    getConfigValue(PLATFORM_PAYMOB_DB_KEYS.integrationIdCard),
    getConfigValue(PLATFORM_PAYMOB_DB_KEYS.integrationIdWallet),
    getConfigValue(PLATFORM_PAYMOB_DB_KEYS.mode),
  ])

  const envApiKey = process.env.PLATFORM_PAYMOB_API_KEY || process.env.PAYMOB_API_KEY || ""
  const envPublicKey = process.env.PLATFORM_PAYMOB_PUBLIC_KEY || process.env.PAYMOB_PUBLIC_KEY || ""
  const envHmacSecret = process.env.PLATFORM_PAYMOB_HMAC_SECRET || process.env.PAYMOB_HMAC_SECRET || ""
  const envRegion = (process.env.PLATFORM_PAYMOB_REGION || process.env.PAYMOB_REGION || "oman") as PaymobRegion
  const envCardId = process.env.PLATFORM_PAYMOB_INTEGRATION_ID_CARD || process.env.PAYMOB_INTEGRATION_ID_CARD || ""
  const envWalletId = process.env.PLATFORM_PAYMOB_INTEGRATION_ID_WALLET || process.env.PAYMOB_INTEGRATION_ID_WALLET || ""
  const envMode = (process.env.PLATFORM_PAYMOB_MODE || process.env.PAYMOB_MODE || "test") as "test" | "production"

  const finalApiKey = apiKey || envApiKey
  const finalPublicKey = publicKey || envPublicKey
  const finalHmacSecret = hmacSecret || envHmacSecret
  const rawRegion = regionVal || envRegion
  const finalRegion: PaymobRegion = (["oman", "egypt", "ksa", "uae"].includes(rawRegion) ? rawRegion : "oman") as PaymobRegion
  const finalMode = (modeVal === "production" || envMode === "production") ? "production" : "test"

  if (finalApiKey && finalPublicKey && finalHmacSecret) {
    return {
      apiKey: finalApiKey,
      publicKey: finalPublicKey,
      hmacSecret: finalHmacSecret,
      region: finalRegion,
      integrationIdCard: cardId || envCardId,
      integrationIdWallet: walletId || envWalletId,
      mode: finalMode,
    }
  }

  // Fallback to general paymobConfig
  return paymobConfig()
}

export async function isPlatformPaymobConfigured(): Promise<boolean> {
  const c = await platformPaymobConfig()
  return !!(c.apiKey && c.publicKey && c.hmacSecret)
}

/**
 * Normalizes redirect URL to clean HTTPS endpoint.
 */
export function normalizePaymobRedirectUrl(url: string, defaultOrigin = "https://app.fizmoh.cloud"): string {
  if (!url) return `${defaultOrigin}/api/paymob/callback`
  try {
    let u: URL
    if (url.startsWith("http://") || url.startsWith("https://")) {
      u = new URL(url)
    } else {
      u = new URL(url, defaultOrigin)
    }
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname.startsWith("192.168.")) {
      const fallback = new URL(defaultOrigin)
      u.protocol = "https:"
      u.host = fallback.host
      u.port = ""
    } else if (u.protocol === "http:" && !u.hostname.includes("localhost") && !u.hostname.includes("127.0.0.1")) {
      u.protocol = "https:"
    }
    return `${u.protocol}//${u.host}${u.pathname}`
  } catch {
    const clean = url.split("?")[0].split("#")[0]
    if (clean.startsWith("/")) return `${defaultOrigin}${clean}`
    return `${defaultOrigin}/api/paymob/callback`
  }
}

/**
 * Paymob Intention Request Options
 */
export interface CreatePaymobIntentionParams {
  orderId: string
  orderNumber: string
  amount: number // in major units (e.g. 5.500 OMR or 100.00 AED)
  currency: string
  customerName: string
  customerEmail?: string
  customerPhone: string
  description?: string
  successUrl: string
  failureUrl?: string
  webhookUrl: string
  items?: Array<{
    name: string
    amount: number // major units
    description?: string
    quantity?: number
  }>
  config?: PaymobConfig
}

export interface PaymobIntentionResponse {
  success: boolean
  clientSecret?: string
  checkoutUrl?: string
  intentionId?: string
  reference?: string
  error?: string
}

/**
 * Creates a payment intention via Paymob Intention API (POST /v1/intention/)
 * Returns the client_secret and the hosted Unified Checkout URL.
 */
export async function createPaymobIntention(
  params: CreatePaymobIntentionParams,
): Promise<PaymobIntentionResponse> {
  const config = params.config ?? (await paymobConfig())

  if (!(config.apiKey && config.publicKey && config.hmacSecret)) {
    if (process.env.NODE_ENV === "production") {
      return { success: false, error: "Paymob payment gateway is not configured" }
    }
    // Simulation / sandbox fallback when testing locally without live credentials
    const simSecret = `cs_sim_${Date.now()}_${params.orderNumber}`
    const simCheckout = `/api/paymob/callback?reference=${encodeURIComponent(params.orderNumber)}&simulated=true`
    return {
      success: true,
      clientSecret: simSecret,
      checkoutUrl: simCheckout,
      intentionId: `int_sim_${Date.now()}`,
      reference: params.orderNumber,
    }
  }

  try {
    const baseUrl = getPaymobBaseUrl(config.region)
    const currency = (params.currency || "OMR").toUpperCase().trim()
    const amountMinor = toMinorUnits(params.amount, currency)

    // Collect integration IDs
    const methods: Array<number | string> = []
    if (config.integrationIdCard) {
      const cardId = parseInt(config.integrationIdCard, 10)
      methods.push(isNaN(cardId) ? config.integrationIdCard : cardId)
    }
    if (config.integrationIdWallet) {
      const walletId = parseInt(config.integrationIdWallet, 10)
      methods.push(isNaN(walletId) ? config.integrationIdWallet : walletId)
    }

    // Split customer name
    const nameParts = (params.customerName || "Customer").trim().split(" ")
    const firstName = nameParts[0] || "Valued"
    const lastName = nameParts.slice(1).join(" ") || "Customer"

    // Map line items
    const items = (params.items && params.items.length > 0)
      ? params.items.map(item => ({
          name: item.name.slice(0, 100),
          amount: toMinorUnits(item.amount, currency),
          description: (item.description || item.name).slice(0, 200),
          quantity: item.quantity || 1,
        }))
      : [
          {
            name: (params.description || `Order ${params.orderNumber}`).slice(0, 100),
            amount: amountMinor,
            description: (params.description || `Payment for ${params.orderNumber}`).slice(0, 200),
            quantity: 1,
          },
        ]

    const cleanPhone = (params.customerPhone || "+96890000000").replace(/[^0-9+]/g, "")

    const payload: Record<string, any> = {
      amount: amountMinor,
      currency: currency,
      payment_methods: methods.length > 0 ? methods : undefined,
      items,
      billing_data: {
        apartment: "NA",
        first_name: firstName,
        last_name: lastName,
        street: "NA",
        building: "NA",
        phone_number: cleanPhone,
        city: config.region === "egypt" ? "Cairo" : config.region === "ksa" ? "Riyadh" : config.region === "uae" ? "Dubai" : "Muscat",
        country: config.region === "egypt" ? "EG" : config.region === "ksa" ? "SA" : config.region === "uae" ? "AE" : "OM",
        email: params.customerEmail || `customer_${Date.now()}@fizmoh.cloud`,
        floor: "NA",
        state: "NA",
      },
      customer: {
        first_name: firstName,
        last_name: lastName,
        email: params.customerEmail || `customer_${Date.now()}@fizmoh.cloud`,
        extras: {
          orderId: params.orderId,
          orderNumber: params.orderNumber,
        },
      },
      special_reference: params.orderNumber,
      notification_url: params.webhookUrl,
      redirection_url: params.successUrl,
    }

    // Call Intention API
    const response = await fetch(`${baseUrl}/v1/intention/`, {
      method: "POST",
      headers: {
        "Authorization": `Token ${config.apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error("Paymob Intention API error:", response.status, errText)
      let parsedMsg = ""
      try {
        const errObj = JSON.parse(errText)
        parsedMsg = errObj.detail || errObj.message || (Array.isArray(errObj.error) ? errObj.error.join(", ") : "")
      } catch {
        parsedMsg = errText.slice(0, 120)
      }
      return {
        success: false,
        error: parsedMsg ? `Paymob: ${parsedMsg}` : `Paymob error: HTTP ${response.status}`,
      }
    }

    const data = await response.json()
    const clientSecret = data.client_secret || data.clientSecret
    const intentionId = data.id || data.intention_order_id || String(data.order_id || "")

    if (!clientSecret) {
      console.error("Paymob Intention response missing client_secret:", data)
      return { success: false, error: "Paymob returned an invalid response (missing client_secret)" }
    }

    // Unified Checkout redirect URL format per official docs:
    // https://<BASE_URL>/unifiedcheckout/?publicKey=<PUBLIC_KEY>&clientSecret=<CLIENT_SECRET>
    const checkoutUrl = `${baseUrl}/unifiedcheckout/?publicKey=${encodeURIComponent(config.publicKey.trim())}&clientSecret=${encodeURIComponent(clientSecret)}`

    return {
      success: true,
      clientSecret,
      checkoutUrl,
      intentionId,
      reference: params.orderNumber,
    }
  } catch (error: any) {
    console.error("Paymob createPaymobIntention error:", error)
    return { success: false, error: error?.message || "Failed to connect to Paymob" }
  }
}

/**
 * Paymob HMAC SHA-512 Verification for Transaction Webhooks
 *
 * Official key ordering for Transaction Processed Callbacks:
 * 1. amount_cents
 * 2. created_at
 * 3. currency
 * 4. error_occured
 * 5. has_parent_transaction
 * 6. id
 * 7. integration_id
 * 8. is_3d_secure
 * 9. is_auth
 * 10. is_capture
 * 11. is_refunded
 * 12. is_standalone_payment
 * 13. is_voided
 * 14. order (or order.id)
 * 15. owner
 * 16. pending
 * 17. source_data.pan
 * 18. source_data.sub_type
 * 19. source_data.type
 * 20. success
 */
export const PAYMOB_TRANSACTION_HMAC_KEYS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
] as const

/**
 * Helper to safely extract nested properties like "source_data.pan" or "order.id"
 */
function getNestedValue(obj: Record<string, any>, path: string): string {
  if (!obj || typeof obj !== "object") return ""
  const parts = path.split(".")
  let curr: any = obj
  for (const p of parts) {
    if (curr == null) return ""
    curr = curr[p]
  }
  if (curr === null || curr === undefined) return ""
  if (typeof curr === "boolean") return curr ? "true" : "false"
  if (typeof curr === "object" && curr.id !== undefined) return String(curr.id)
  return String(curr)
}

/**
 * Calculates HMAC SHA-512 for a Paymob transaction object.
 */
export function calculatePaymobTransactionHmac(obj: Record<string, any>, hmacSecret: string): string {
  const concatenated = PAYMOB_TRANSACTION_HMAC_KEYS.map(key => getNestedValue(obj, key)).join("")
  return crypto.createHmac("sha512", hmacSecret.trim()).update(concatenated, "utf8").digest("hex").toLowerCase()
}

/**
 * Verifies the HMAC SHA-512 signature of a Paymob transaction webhook callback.
 */
export function verifyPaymobWebhookHmac(
  payload: Record<string, any>,
  receivedHmac: string,
  hmacSecretOverride?: string,
): boolean {
  const secret = (hmacSecretOverride || "").trim() || getPaymobConfig().hmacSecret.trim()
  if (!secret) {
    console.error("Paymob HMAC verification failed: No HMAC secret configured")
    return false
  }

  const cleanReceived = (receivedHmac || "").trim().toLowerCase()
  if (!cleanReceived) return false

  // The webhook data is typically nested under `obj`
  const targetObj = payload.obj && typeof payload.obj === "object" ? payload.obj : payload

  const expectedHmac = calculatePaymobTransactionHmac(targetObj, secret)

  if (expectedHmac.length !== cleanReceived.length) return false
  return crypto.timingSafeEqual(Buffer.from(expectedHmac, "utf8"), Buffer.from(cleanReceived, "utf8"))
}

/**
 * Verifies Paymob redirect URL query params HMAC.
 * Query redirect sends parameters sorted lexicographically with `hmac` param.
 */
export function verifyPaymobQueryHmac(
  queryParams: Record<string, string>,
  hmacSecretOverride?: string,
): boolean {
  const secret = (hmacSecretOverride || "").trim() || getPaymobConfig().hmacSecret.trim()
  if (!secret) return false

  const receivedHmac = (queryParams.hmac || "").trim().toLowerCase()
  if (!receivedHmac) return false

  // Sort keys alphabetically excluding hmac
  const sortedKeys = Object.keys(queryParams)
    .filter(k => k.toLowerCase() !== "hmac")
    .sort()

  const concatenated = sortedKeys.map(k => queryParams[k] ?? "").join("")
  const expectedHmac = crypto.createHmac("sha512", secret).update(concatenated, "utf8").digest("hex").toLowerCase()

  if (expectedHmac.length !== receivedHmac.length) return false
  return crypto.timingSafeEqual(Buffer.from(expectedHmac, "utf8"), Buffer.from(receivedHmac, "utf8"))
}

/**
 * Parses incoming Paymob webhook into normalized internal representation.
 */
export function parsePaymobWebhook(payload: Record<string, any>): {
  eventType: "payment.success" | "payment.failed" | "payment.refunded" | "unknown"
  orderReference: string
  transactionId: string
  amount: number
  currency: string
  success: boolean
  raw: any
} {
  const obj = (payload && typeof payload.obj === "object") ? payload.obj : (payload || {})

  const isSuccess = obj.success === true || obj.success === "true"
  const isRefunded = obj.is_refunded === true || obj.is_refunded === "true"
  const isError = obj.error_occured === true || obj.error_occured === "true"

  let eventType: "payment.success" | "payment.failed" | "payment.refunded" | "unknown" = "unknown"
  if (isRefunded) {
    eventType = "payment.refunded"
  } else if (isSuccess) {
    eventType = "payment.success"
  } else if (isError || obj.pending === false) {
    eventType = "payment.failed"
  }

  // Extract merchant order reference: special_reference or merchant_order_id or order.merchant_order_id
  const orderReference =
    obj.special_reference ||
    obj.merchant_order_id ||
    (obj.order && (obj.order.merchant_order_id || obj.order.special_reference)) ||
    (obj.data && obj.data.special_reference) ||
    ""

  const transactionId = String(obj.id || obj.transaction_id || "")
  const currency = (obj.currency || "OMR").toUpperCase()
  const amountCents = Number(obj.amount_cents || obj.amount || 0)
  const amount = fromMinorUnits(amountCents, currency)

  return {
    eventType,
    orderReference,
    transactionId,
    amount,
    currency,
    success: isSuccess && !isRefunded,
    raw: payload,
  }
}
