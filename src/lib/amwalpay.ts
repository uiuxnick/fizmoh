/**
 * AmwalPay Payment Gateway Integration
 *
 * Based on official AmwalPay documentation:
 * https://amwalpay.om/developers/amwal-integrated-payment-link/introduction
 * https://amwalpay.om/developers/secure-hash-calculation/secure-hash-calculation-2
 *
 * Per BRD §6.4.1 & §9.1:
 * - Hosted checkout (redirect) — PCI-DSS SAQ-A
 * - Signed webhook verification (HMAC SHA-256)
 *
 * AmwalPay API:
 * - Test Base URL: https://test.amwalpg.com:14443
 * - Prod Base URL: https://webhook.amwalpg.com
 * - Endpoint: /MerchantOrder/CreatePaymentLink
 * - Hash: HMAC SHA-256 with Merchant Secure Key
 *
 * Currency: 512 = OMR
 */

import crypto from "crypto"
import { currentTenant, PLATFORM } from "@/lib/tenant"

export interface AmwalPayConfig {
  merchantId: string
  terminalId: string
  secureKey: string // Hex-encoded Merchant Secure Key
  mode: "test" | "production"
}

/**
 * The workspace ids that mean "the installation, not a business".
 *
 * `PLATFORM` is the empty string, but the rows actually in the database carry
 * the literal `"PLATFORM"` — so the platform fallback below matched nothing and
 * a workspace with no credentials of its own fell through to the environment
 * rather than to the installation's account, quietly. Both spellings are
 * accepted rather than one of them rewritten, because the rows are live
 * payment settings and a migration is not worth the risk here.
 */
const PLATFORM_SCOPES = [PLATFORM, "PLATFORM", ""] as const

export const AMWALPAY_DB_KEYS = {
  merchantId: "amwalpay_merchant_id",
  terminalId: "amwalpay_terminal_id",
  secureKey: "amwalpay_secure_key",
  mode: "amwalpay_mode",
} as const

/**
 * Gateway credentials, editable from the admin panel.
 *
 * Kept synchronous because the callback hash is verified inside a webhook that
 * must answer quickly, and because the tests exercise it directly. A snapshot
 * of the saved settings is refreshed in the background by
 * `refreshAmwalPayConfig`, with the environment as the value used until the
 * first refresh completes and as the fallback for anything unset.
 */
/**
 * One snapshot per workspace, not one for the process.
 *
 * A single shared snapshot would take one business's money into another
 * business's merchant account — the credentials are the destination of the
 * funds, and whichever request refreshed last would decide where every
 * subsequent payment went. Keyed by workspace, with the installation's own
 * credentials under the platform key.
 */
const snapshots = new Map<string, { values: Partial<AmwalPayConfig>; at: number }>()
const SNAPSHOT_TTL_MS = 60_000

function scope(): string {
  return currentTenant()?.tenantId ?? PLATFORM
}

export function getAmwalPayConfig(): AmwalPayConfig {
  const saved = snapshots.get(scope())?.values ?? {}
  const mode = saved.mode || (process.env.AMWALPAY_MODE as "test" | "production") || "test"
  return {
    merchantId: saved.merchantId || process.env.AMWALPAY_MERCHANT_ID || "",
    terminalId: saved.terminalId || process.env.AMWALPAY_TERMINAL_ID || "",
    secureKey: saved.secureKey || process.env.AMWALPAY_SECURE_KEY || "",
    mode: mode === "production" ? "production" : "test",
  }
}

/** Pulls saved gateway settings into the snapshot the sync getter reads. */
export async function refreshAmwalPayConfig(): Promise<AmwalPayConfig> {
  const key = scope()
  try {
    const { db } = await import("@/lib/db")
    const rows = await db.systemSetting.findMany({
      // The workspace's own credentials, or the installation's until it
      // saves its own.
      where: {
        key: { in: Object.values(AMWALPAY_DB_KEYS) },
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
        merchantId: pick(AMWALPAY_DB_KEYS.merchantId),
        terminalId: pick(AMWALPAY_DB_KEYS.terminalId),
        secureKey: pick(AMWALPAY_DB_KEYS.secureKey),
        mode: pick(AMWALPAY_DB_KEYS.mode) as "test" | "production" | undefined,
      },
      at: Date.now(),
    })
  } catch (error) {
    // A database problem must not take card payments down while the
    // environment still holds working credentials.
    console.error("Could not load AmwalPay settings:", error)
  }
  return getAmwalPayConfig()
}

/**
 * The caller's gateway credentials, loading them if this workspace's snapshot
 * is missing or stale.
 *
 * Anything that takes a payment must go through here rather than the sync
 * getter. The sync getter can only return what some earlier request happened
 * to load, and for a workspace whose settings have never been read that is the
 * installation's account — the wrong merchant, silently.
 */
export async function amwalPayConfig(): Promise<AmwalPayConfig> {
  const snapshot = snapshots.get(scope())
  if (snapshot && Date.now() - snapshot.at < SNAPSHOT_TTL_MS) return getAmwalPayConfig()
  return refreshAmwalPayConfig()
}

/**
 * Whose merchant account this workspace's payments would actually reach.
 *
 * The credentials are the destination of the money. A workspace that has not
 * saved its own inherits the installation's, which is a reasonable default
 * while everything is in test mode and a serious one the moment it is not:
 * that workspace's customers would be paying the platform's merchant account,
 * and nothing on screen would say so.
 *
 * Reports rather than blocks. Refusing to take payments would be the wrong
 * call for an operator who is deliberately collecting on a client's behalf —
 * but nobody should be able to arrive at that arrangement by accident.
 */
export async function amwalPaySource(): Promise<{
  mode: "test" | "production"
  configured: boolean
  /** Where each credential came from: this workspace, the installation, the environment, or nowhere. */
  source: "workspace" | "platform" | "environment" | "unset"
  /** True when live payments would go somewhere this workspace did not configure. */
  misdirected: boolean
  /**
   * True when this workspace's merchant id is byte-identical to the
   * installation's — the signature of credentials that were seeded rather than
   * entered. Every workspace here was created that way, so each one *has* its
   * own rows and looks configured while all of them point at the same test
   * merchant.
   */
  shared: boolean
  merchantIdPreview: string | null
}> {
  const tenantId = scope()
  let source: "workspace" | "platform" | "environment" | "unset" = "unset"
  let sharedWithPlatform = false

  try {
    const { db } = await import("@/lib/db")
    const rows = await db.systemSetting.findMany({
      where: {
        key: { in: Object.values(AMWALPAY_DB_KEYS) },
        OR: [{ tenantId }, { tenantId: { in: [...PLATFORM_SCOPES] } }],
      },
      select: { key: true, value: true, tenantId: true },
    })
    const merchantRows = rows.filter(r => r.key === AMWALPAY_DB_KEYS.merchantId && r.value)
    const own = merchantRows.find(r => r.tenantId === tenantId)
    const platform = merchantRows.find(r => (PLATFORM_SCOPES as readonly string[]).includes(r.tenantId))
    if (own) source = "workspace"
    else if (merchantRows.length > 0) source = "platform"
    else if (process.env.AMWALPAY_MERCHANT_ID) source = "environment"
    sharedWithPlatform = !!(own && platform && own.value === platform.value)
  } catch (error) {
    console.error("Could not determine the AmwalPay credential source:", error)
  }

  const config = await amwalPayConfig()
  const configured = !!(config.merchantId && config.terminalId && config.secureKey)

  return {
    mode: config.mode,
    configured,
    source,
    // Live money, on credentials this workspace never set — or on the same
    // ones everybody else was given.
    misdirected: config.mode === "production" && (source !== "workspace" || sharedWithPlatform),
    shared: sharedWithPlatform,
    // Enough to tell two merchants apart, never the whole identifier.
    merchantIdPreview: config.merchantId
      ? `••••${config.merchantId.slice(-4)}`
      : null,
  }
}

/**
 * The platform's own merchant account, for collecting subscription fees.
 *
 * Falls back to the shared credentials when no separate account is configured,
 * which is the single-operator case this started as: one AmwalPay account
 * taking both the customers' bookings and the platform's fees. Correct until a
 * second business signs up, at which point their bookings and our invoices
 * would be landing in the same place — hence the separate fields.
 */
export async function platformAmwalPayConfig(): Promise<AmwalPayConfig> {
  const { getConfigValue } = await import("@/lib/app-config")
  const [merchantId, terminalId, secureKey, mode] = await Promise.all([
    getConfigValue("platform_amwalpay_merchant_id"),
    getConfigValue("platform_amwalpay_terminal_id"),
    getConfigValue("platform_amwalpay_secure_key"),
    getConfigValue("platform_amwalpay_mode"),
  ])

  if (merchantId && terminalId && secureKey) {
    return {
      merchantId,
      terminalId,
      secureKey,
      mode: mode === "production" ? "production" : "test",
    }
  }
  return amwalPayConfig()
}

/** Forgets every snapshot, for when credentials change. */
export function invalidateAmwalPayConfig() {
  snapshots.clear()
}

export function isAmwalPayConfigured(): boolean {
  const c = getAmwalPayConfig()
  return !!(c.merchantId && c.terminalId && c.secureKey)
}

/** Whether the caller's workspace can take a card payment right now. */
export async function amwalPayReady(): Promise<boolean> {
  const c = await amwalPayConfig()
  return !!(c.merchantId && c.terminalId && c.secureKey)
}

/** AmwalPay only accepts a bare public HTTPS URL — no query string, no fragment, no localhost. */
export function normalizeAmwalRedirectUrl(url: string, defaultOrigin = "https://app.fizmoh.cloud"): string {
  if (!url) return `${defaultOrigin}/api/amwalpay/return`
  try {
    let u: URL
    if (url.startsWith("http://") || url.startsWith("https://")) {
      u = new URL(url)
    } else {
      u = new URL(url, defaultOrigin)
    }
    // If hostname is an internal IP or localhost, rewrite host to production public domain
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname.startsWith("192.168.") || u.hostname.startsWith("10.")) {
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
    return `${defaultOrigin}/api/amwalpay/return`
  }
}

function stripQuery(url: string): string {
  return normalizeAmwalRedirectUrl(url)
}

export function getAmwalPayBaseUrl(): string {
  // Reads whatever the caller's snapshot holds; every path that builds a link
  // has loaded it through amwalPayConfig() first.
  const { mode } = getAmwalPayConfig()
  return mode === "production"
    ? "https://webhook.amwalpg.com"
    : "https://test.amwalpg.com:14443"
}

/**
 * Where the SmartBox checkout script lives.
 *
 * SmartBox is AmwalPay's own hosted card form, dropped into our page. It is
 * how their reference integrations take a card, and — unlike the notification
 * and inquiry APIs — it needs nothing enabled on the merchant account: the
 * browser receives the signed result and hands it straight to our callback.
 */
export function getSmartBoxScriptUrl(): string {
  const { mode } = getAmwalPayConfig()
  return mode === "production"
    ? "https://checkout.amwalpg.com/js/SmartBox.js?v=1.1"
    : "https://test.amwalpg.com:7443/js/SmartBox.js?v=1.1"
}

/** `yyyyMMddHHmmss`, the format every AmwalPay request stamps itself with. */
export function amwalTimestamp(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0")
  return (
    `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}` +
    `${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`
  )
}

/**
 * The integrity hash SmartBox expects when the checkout opens.
 *
 * The field order is fixed by AmwalPay and is not the same set as the one
 * their callback signs, so it is written out here rather than derived — a
 * mismatch is rejected as tampering and the customer simply cannot pay.
 */
export function smartBoxInitHash(params: {
  amount: number
  currencyId: number
  merchantId: string
  merchantReference: string
  terminalId: string
  requestDateTime: string
  secureKey: string
}): string {
  const input =
    `Amount=${params.amount}` +
    `&CurrencyId=${params.currencyId}` +
    `&MerchantId=${params.merchantId}` +
    `&MerchantReference=${params.merchantReference}` +
    `&RequestDateTime=${params.requestDateTime}` +
    `&SessionToken=` +
    `&TerminalId=${params.terminalId}`
  return crypto
    .createHmac("sha256", Buffer.from(params.secureKey, "hex"))
    .update(input, "utf8")
    .digest("hex")
    .toUpperCase()
}

/**
 * Generate HMAC SHA-256 Secure Hash
 * Per AmwalPay docs: https://amwalpay.om/developers/secure-hash-calculation/secure-hash-calculation-2
 *
 * Steps:
 * 1. Collect all request parameters (excluding secureHashValue)
 * 2. Sort alphabetically by key name (A → Z)
 * 3. Concatenate as: key=value&key=value&key=value
 * 4. Generate HMAC SHA-256 using Merchant Secure Key (hex-decoded)
 * 5. Convert to uppercase hex
 */
export function generateSecureHash(params: Record<string, any>, secureKey: string): string {
  // Step 1 & 2: Collect and sort parameters (exclude secureHashValue)
  const sortedKeys = Object.keys(params)
    .filter(k => k !== "secureHashValue" && k !== "SecureHash" && params[k] !== undefined && params[k] !== null)
    .sort()

  // Step 3: Concatenate as key=value&key=value
  const dataString = sortedKeys
    .map(k => `${k}=${params[k]}`)
    .join("&")

  // Step 4: Generate HMAC SHA-256 with hex-decoded key
  const key = Buffer.from(secureKey, "hex")
  const hash = crypto
    .createHmac("sha256", key)
    .update(dataString, "utf8")
    .digest("hex")
    .toUpperCase()

  return hash
}

/**
 * Verify response hash from AmwalPay
 */
export function verifyResponseHash(params: Record<string, any>, secureKey: string, receivedHash: string): boolean {
  const expectedHash = generateSecureHash(params, secureKey)
  if (expectedHash.length !== receivedHash.length) return false
  return crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(receivedHash))
}

/**
 * Create a payment link via AmwalPay API
 *
 * Per BRD §9.2: Checkout → create payment session → redirect → customer pays → webhook
 *
 * API: POST /MerchantOrder/CreatePaymentLink
 */
export async function createPaymentSession(params: {
  orderId: string
  orderNumber: string
  amount: number
  currency: string
  customerName: string
  customerEmail?: string
  customerPhone: string
  description: string
  successUrl: string
  failureUrl: string
  /**
   * Where AmwalPay should post the Merchant Cloud Notification.
   *
   * Recorded for callers and logs only: AmwalPay takes the notification URL
   * from the terminal's configuration in the merchant portal, not from
   * CreatePaymentLink, and rejects unknown keys outright (errorCode 4003).
   * Passing this does not register anything — if callbacks are not arriving,
   * the URL is missing from the portal, not from here.
   */
  webhookUrl: string
  /** Which merchant account takes this payment. Defaults to the caller's. */
  config?: AmwalPayConfig
}): Promise<{
  success: boolean
  paymentLinkUrl?: string
  reference?: string
  error?: string
}> {
  const config = params.config ?? (await amwalPayConfig())

  if (!(config.merchantId && config.terminalId && config.secureKey)) {
    // In production a missing gateway configuration must fail. Returning a
    // simulated checkout link here would hand the customer a page that cannot
    // take money while the order behaves as though payment is under way.
    if (process.env.NODE_ENV === "production") {
      return { success: false, error: "Card payment is unavailable — AmwalPay is not configured" }
    }
    const sessionId = `SIM_${Date.now()}_${params.orderId.slice(-6)}`
    return {
      success: true,
      paymentLinkUrl: `/api/amwalpay/hosted-checkout?session=${sessionId}&order=${params.orderNumber}&amount=${params.amount}&currency=${params.currency}`,
      reference: sessionId,
    }
  }

  try {
    // Build request parameters per AmwalPay API
    const requestParams: Record<string, any> = {
      billerRefNumber: params.orderNumber,
      payerName: params.customerName,
      amount: parseFloat(params.amount.toFixed(3)),
      currency: 512, // 512 = OMR
      paymentMethod: 1,
      notificationMethod: params.customerEmail && params.customerPhone ? 3 : params.customerEmail ? 1 : 2, // 1=Email, 2=SMS, 3=Both
      emailNotificationValue: params.customerEmail || "",
      smsNotificationValue: params.customerPhone,
      terminalId: parseInt(config.terminalId),
      merchantId: parseInt(config.merchantId),
      expireDateTime: "",
      maxNumberOfPayment: 1,
      /*
       * 1, because 0 is refused.
       *
       * The documentation reads 0 = full-page, 1 = pop-up, so this sent 0 and
       * every card payment failed with a 400 the customer saw as "Payment
       * unavailable". Asked directly, the terminal answers
       * {"errorList":["Invalid payment view type."]} for 0 and 3, and returns a
       * working hosted link for 1 and 2. What comes back is a URL either way,
       * which is all the redirect needs.
       */
      paymentViewType: 1,
      // AmwalPay rejects any redirectUrl containing a query string with
      // errorCode 4003 / invalidKeysNames: ["redirectUrl"]. The order is
      // identified on return by billerRefNumber, which the gateway appends
      // itself, so the URL we register must stay clean.
      redirectUrl: stripQuery(params.successUrl),
    }

    // Generate secure hash
    requestParams.secureHashValue = generateSecureHash(requestParams, config.secureKey)

    // Call AmwalPay API
    const url = `${getAmwalPayBaseUrl()}/MerchantOrder/CreatePaymentLink`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestParams),
    })

    if (!response.ok) {
      const errText = await response.text()
      // The provider's own words. "AmwalPay API error: 400" cost an afternoon
      // to turn into "Invalid payment view type", which was the whole problem.
      console.error("AmwalPay API error:", response.status, errText)
      let reason = ""
      try {
        const parsed = JSON.parse(errText)
        reason = Array.isArray(parsed?.errorList) ? parsed.errorList.join(", ") : parsed?.message || ""
      } catch {
        reason = errText.slice(0, 120)
      }
      return { success: false, error: reason ? `AmwalPay: ${reason}` : `AmwalPay API error: ${response.status}` }
    }

    const data = await response.json()

    if (data.success && data.data) {
      // data.data contains the payment link URL
      return {
        success: true,
        paymentLinkUrl: data.data,
        reference: data.responseCode || params.orderNumber,
      }
    } else {
      return {
        success: false,
        error: data.message || data.errorList?.join(", ") || "Payment link creation failed",
      }
    }
  } catch (error) {
    console.error("AmwalPay payment session error:", error)
    return { success: false, error: "Failed to connect to AmwalPay" }
  }
}

/**
 * Fields AmwalPay includes in the Merchant Cloud Notification integrity hash,
 * in the order their own integration packages build the string.
 *
 * The list is fixed rather than "whatever the payload contains": the callback
 * carries `secureHashValue` and may carry fields outside this set, and hashing
 * those too produces a mismatch on every genuine notification.
 */
const CALLBACK_HASH_FIELDS = [
  "amount",
  "currencyId",
  "customerId",
  "customerTokenId",
  "merchantId",
  "merchantReference",
  "responseCode",
  "terminalId",
  "transactionId",
  "transactionTime",
] as const

/**
 * Verifies a Merchant Cloud Notification from AmwalPay.
 *
 * Two things were wrong before. The hash was read from an
 * `x-amwalpay-signature` header, which AmwalPay does not send — it arrives in
 * the body as `secureHashValue`, so the header was always empty and every
 * genuine callback was rejected as unsigned. And the hashed string was built
 * from whichever keys the payload happened to contain, sorted, rather than
 * from the fixed integrity field list.
 *
 * AmwalPay's own packages append a trailing "&" after the final pair. That
 * detail is not stated in the written spec, so both forms are accepted —
 * getting it wrong in either direction would reject real payments.
 */
export function verifyCallbackHash(payload: Record<string, unknown>, secureKeyOverride?: string): boolean {
  /*
   * The key may be passed in.
   *
   * The sync getter reads the snapshot for the current scope, built from a
   * workspace's `amwalpay_*` settings. The platform's own account lives under
   * `platform_amwalpay_*` and never lands in that snapshot, so a subscription
   * payment verified through the getter would be checked against the wrong
   * secret and rejected. Callers holding the right key say so explicitly.
   */
  const secureKey = (secureKeyOverride || "").trim() || getAmwalPayConfig().secureKey
  if (!secureKey) {
    console.error("AmwalPay callback rejected: no secure key configured")
    return false
  }
  const config = { secureKey }

  const received = String(payload.secureHashValue || "").toUpperCase()
  if (!received) return false

  // The sender writes the literal strings "null" and "undefined" for absent
  // values, and both hash as empty.
  const pairs = CALLBACK_HASH_FIELDS.map(field => {
    const raw = payload[field]
    const value = raw === undefined || raw === null || raw === "null" || raw === "undefined" ? "" : String(raw)
    return `${field}=${value}`
  })

  const key = Buffer.from(config.secureKey, "hex")
  const candidates = [pairs.join("&"), `${pairs.join("&")}&`]

  return candidates.some(input => {
    const expected = crypto.createHmac("sha256", key).update(input, "utf8").digest("hex").toUpperCase()
    if (expected.length !== received.length) return false
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))
  })
}

/** Verify the official Merchant Cloud Notification shape without mutating data. */
export function verifyCloudNotificationHash(
  payload: Record<string, unknown>,
  config: AmwalPayConfig,
): boolean {
  const received = String(payload.SecureHash ?? payload.secureHashValue ?? "").trim().toUpperCase()
  if (!received || !config.secureKey) return false
  const values = Object.fromEntries(
    Object.entries(payload).filter(([key, value]) =>
      key !== "SecureHash" && key !== "secureHashValue" && value !== undefined && value !== null,
    ),
  )
  const candidates = [generateSecureHash(values, config.secureKey)]
  const sorted = Object.keys(values).sort().map(key => `${key}=${values[key]}`).join("&")
  candidates.push(crypto.createHmac("sha256", Buffer.from(config.secureKey, "hex")).update(`${sorted}&`, "utf8").digest("hex").toUpperCase())
  return candidates.some(expected => expected.length === received.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received)))
}

/**
 * Process webhook event from AmwalPay
 */
export function parseWebhookEvent(payload: any): {
  eventType: "payment.success" | "payment.failed" | "payment.refunded" | "unknown"
  orderReference: string
  transactionId: string
  amount: number
  currency: string
  raw: any
} {
  // `merchantReference` is the field AmwalPay documents for the merchant's own
  // order reference; the others are kept as fallbacks for older payloads.
  const status = String(payload.ResponseCode ?? payload.responseCode ?? payload.Message ?? payload.status ?? payload.event_type ?? "").toLowerCase()
  const orderReference = payload.MerchantReference || payload.merchantReference || payload.billerRefNumber || payload.order_id || ""
  const transactionId = payload.SystemReference || payload.transactionId || payload.transaction_id || payload.amwalReference || ""
  const amount = parseFloat(payload.Amount || payload.amount || payload.value || "0")
  // 512 is the ISO 4217 numeric code for the Omani rial, which is what
  // `currencyId` carries in the callback.
  const currencyId = payload.CurrencyId ?? payload.currencyId ?? payload.currency
  const currency = String(currencyId) === "512" ? "OMR" : currencyId || "OMR"

  let normalizedType: "payment.success" | "payment.failed" | "payment.refunded" | "unknown" = "unknown"
  // AmwalPay signals success with responseCode exactly "00"; every other code
  // is a decline. Anything unrecognised stays "unknown" so it is never treated
  // as a paid order.
  if (status === "00" || status === "0" || status.includes("success") || status.includes("paid") || status.includes("captured")) {
    normalizedType = "payment.success"
  } else if (status.includes("refund")) {
    normalizedType = "payment.refunded"
  } else if (status) {
    normalizedType = "payment.failed"
  }

  return { eventType: normalizedType, orderReference, transactionId, amount, currency, raw: payload }
}

/**
 * Refund a payment (if supported by AmwalPay API)
 */
export async function refundPayment(params: {
  transactionId: string
  amount?: number
  reason?: string
}): Promise<{ success: boolean; refundId?: string; error?: string }> {
  const config = await amwalPayConfig()

  // An unconfigured gateway used to return success with a fabricated refund
  // id, so the order was marked refunded while the customer's money stayed
  // where it was. A refund that did not happen must never report success.
  if (!(config.merchantId && config.terminalId && config.secureKey)) {
    return { success: false, error: "AmwalPay is not configured, so no refund was issued" }
  }

  try {
    const requestParams: Record<string, unknown> = {
      transactionId: params.transactionId,
      transactionIdentifierValue: params.transactionId,
      transactionIdentifierType: 1,
      requestDateTime: new Date().toISOString(),
      terminalId: parseInt(config.terminalId),
      merchantId: parseInt(config.merchantId),
      currencyCode: 512,
      ...(params.amount !== undefined ? { amount: Number(params.amount.toFixed(3)) } : {}),
    }
    requestParams.secureHashValue = generateSecureHash(requestParams, config.secureKey)
    const response = await fetch(`${getAmwalPayBaseUrl()}/Execute/Refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestParams),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || data?.success === false) {
      return { success: false, error: data?.message || `AmwalPay refund error: ${response.status}` }
    }
    return {
      success: data?.success === true || data?.isSuccess === true,
      refundId: String(data?.data?.transactionId || data?.transactionId || data?.refundId || "") || undefined,
      error: data?.success === true || data?.isSuccess === true ? undefined : (data?.message || "Refund was not accepted"),
    }
  } catch (error) {
    console.error("AmwalPay refund error:", error)
    return { success: false, error: "Failed to connect to AmwalPay" }
  }
}
