/**
 * WhatsApp Cloud API Service
 * Official Meta WhatsApp Business Cloud API integration
 *
 * Credentials configured in .env:
 * - WHATSAPP_ACCESS_TOKEN
 * - WHATSAPP_BUSINESS_ACCOUNT_ID
 * - WHATSAPP_PHONE_NUMBER_ID
 * - WHATSAPP_PHONE_NUMBER (+96898821965)
 * - WHATSAPP_WEBHOOK_VERIFY_TOKEN
 */

import crypto from "crypto"
import { db } from "@/lib/db"
import { decryptSecret, encryptSecret } from "@/lib/secret-box"
import { currentTenant, PLATFORM } from "@/lib/tenant"

const GRAPH_API_VERSION = "v21.0"

export type WhatsAppConfig = {
  accessToken: string
  phoneNumberId: string
  wabaId: string
  phoneNumber: string
  webhookVerifyToken: string
  appSecret: string
}
/** Which settings came from the environment vs the admin panel. */
export type ConfigSource = Record<keyof WhatsAppConfig, "env" | "db" | "unset">

// Environment wins over the database: a value baked into the deployment is
// the operator's explicit intent and should not be silently overridden by a
// stale row someone saved in the admin panel months ago.
const ENV_KEYS: Record<keyof WhatsAppConfig, string> = {
  accessToken: "WHATSAPP_ACCESS_TOKEN",
  phoneNumberId: "WHATSAPP_PHONE_NUMBER_ID",
  wabaId: "WHATSAPP_BUSINESS_ACCOUNT_ID",
  phoneNumber: "WHATSAPP_PHONE_NUMBER",
  webhookVerifyToken: "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
  appSecret: "WHATSAPP_APP_SECRET",
}

const DB_KEYS: Record<keyof WhatsAppConfig, string> = {
  accessToken: "wa_access_token",
  phoneNumberId: "wa_phone_number_id",
  wabaId: "wa_waba_id",
  phoneNumber: "wa_phone_number",
  webhookVerifyToken: "wa_webhook_verify_token",
  appSecret: "wa_app_secret",
}

// Cached so the send path doesn't hit the database on every message. Cleared
// whenever the admin panel writes new credentials.
//
// Keyed by tenant. A single shared entry would have one business's token
// answering another business's send for up to a minute — the cache is a
// process-wide singleton and requests for different workspaces share the
// process.
const cache = new Map<string, { config: WhatsAppConfig; source: ConfigSource; loadedAt: number }>()
const CACHE_TTL_MS = 60_000

/** The cache key for whoever is asking; "" is the installation itself. */
function scope(): string {
  return currentTenant()?.tenantId ?? ""
}

/** The tenant filter for a settings row, where the platform is a sentinel. */
function settingScope(): { tenantId: string } {
  return { tenantId: currentTenant()?.tenantId ?? PLATFORM }
}

/** The tenant filter for a connected account, where the platform is null. */
function accountScope(): { tenantId: string | null } {
  return { tenantId: currentTenant()?.tenantId ?? null }
}

export function invalidateWhatsAppConfigCache() {
  // Everything, not just the caller's. A credential change big enough to
  // invalidate is rare, and a stale entry left behind sends as the wrong
  // business.
  cache.clear()
}

export function getEnvConfig(): WhatsAppConfig {
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    wabaId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
    phoneNumber: process.env.WHATSAPP_PHONE_NUMBER || "",
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "",
    appSecret: process.env.WHATSAPP_APP_SECRET || "",
  }
}

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  return (await loadConfig()).config
}

export async function getWhatsAppConfigSource(): Promise<ConfigSource> {
  return (await loadConfig()).source
}

/**
 * One decrypted setting out of the rows already fetched.
 *
 * A workspace's own row wins; the installation's is what it inherits until it
 * saves one. Without that fallback every business created on an installation
 * that was configured before tenancy existed would start with no credentials
 * and silently stop sending.
 */
function byKeyFor(rows: { key: string; value: string; tenantId: string }[], key: string): string {
  const matches = rows.filter(r => r.key === key)
  const row = matches.find(r => r.tenantId !== PLATFORM) ?? matches[0]
  return row ? decryptSecret(row.value) : ""
}

/**
 * Whether a business's credentials may fall back to the installation's.
 *
 * They may not. Every business connects its own WhatsApp number, and a
 * fallback meant a new tenant appeared to be "connected" the moment they
 * signed up — to our number, showing our test line in their sidebar, with a
 * Send button that would either fail or, worse, message their customer from a
 * company they have never heard of.
 *
 * The installation's own settings still exist and still work, for the webhook
 * verification token and for anything running outside a workspace.
 */
function inheritsPlatformCredentials(): boolean {
  return !currentTenant()?.tenantId
}

async function loadConfig(): Promise<{ config: WhatsAppConfig; source: ConfigSource }> {
  const key = scope()
  const cached = cache.get(key)
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return { config: cached.config, source: cached.source }
  }

  const env = getEnvConfig()
  let rows: { key: string; value: string; tenantId: string }[] = []
  try {
    rows = await db.systemSetting.findMany({
      where: {
        key: { in: Object.values(DB_KEYS) },
        ...(inheritsPlatformCredentials()
          ? { tenantId: PLATFORM }
          // Only their own. See inheritsPlatformCredentials.
          : settingScope()),
      },
      select: { key: true, value: true, tenantId: true },
    })
  } catch (error) {
    // A database blip must not take messaging down when env vars are present.
    console.error("Could not load WhatsApp settings from database:", error)
  }

  // A number connected through this platform wins over the pasted settings.
  //
  // It was verified against Meta when it was connected and an operator chose
  // it as the default, where the settings fields are whatever was typed in
  // last — and once Embedded Signup exists, a connection that does not take
  // effect is indistinguishable from one that failed.
  try {
    const accounts = await db.whatsAppAccount.findMany({
      // The workspace's own connected number, or the one connected before
      // this installation had workspaces at all.
      where: {
        isDefault: true,
        status: "CONNECTED",
        ...(inheritsPlatformCredentials() ? {} : accountScope()),
      },
      select: {
        phoneNumberId: true, wabaId: true, businessId: true,
        accessToken: true, tenantId: true,
      },
    })
    const account = accounts.find(a => a.tenantId) ?? accounts[0]
    if (account) {
      const config: WhatsAppConfig = {
        accessToken: decryptSecret(account.accessToken),
        phoneNumberId: account.phoneNumberId,
        wabaId: account.wabaId,
        // The rest stays with the installation: the webhook is ours, not the
        // connected business's.
        phoneNumber: byKeyFor(rows, DB_KEYS.phoneNumber) || env.phoneNumber || "",
        webhookVerifyToken: byKeyFor(rows, DB_KEYS.webhookVerifyToken) || env.webhookVerifyToken || "",
        appSecret: byKeyFor(rows, DB_KEYS.appSecret) || env.appSecret || "",
      }
      const source: ConfigSource = {
        accessToken: "db", phoneNumberId: "db", wabaId: "db",
        phoneNumber: "db", webhookVerifyToken: "db", appSecret: "db",
      }
      cache.set(key, { config, source, loadedAt: Date.now() })
      return { config, source }
    }
  } catch (error) {
    // No table yet, or a database blip. The pasted settings still work.
    console.error("Could not read the connected WhatsApp account:", error)
  }

  const byKey = new Map(Object.values(DB_KEYS).map(k => [k, byKeyFor(rows, k)]))
  const config = {} as WhatsAppConfig
  const source = {} as ConfigSource

  // A value saved from the admin panel wins over the environment.
  //
  // This used to be the other way round, which made the settings screen
  // read-only in practice: production supplies these through the environment,
  // so every field was reported as env-managed and refused edits. Worse, the
  // environment the service actually reads is a file outside the release, so
  // the only way to rotate a token was to edit a file on the server — the
  // failure mode being that the panel then displays a credential that is not
  // the one in use.
  //
  // The environment now acts as the bootstrap default: it seeds a fresh
  // deployment, and anything an administrator sets afterwards takes over.
  /*
   * The environment seeds the installation, not each business.
   *
   * A tenant with nothing configured has nothing configured — that is the
   * honest answer, and it is what makes the onboarding checklist tell them to
   * connect a number instead of claiming they already have.
   */
  const inherits = inheritsPlatformCredentials()

  for (const field of Object.keys(ENV_KEYS) as (keyof WhatsAppConfig)[]) {
    const envValue = inherits ? env[field] : ""
    const dbValue = byKey.get(DB_KEYS[field]) || ""
    if (dbValue) {
      config[field] = dbValue
      source[field] = "db"
    } else if (envValue) {
      config[field] = envValue
      source[field] = "env"
    } else {
      config[field] = ""
      source[field] = "unset"
    }
  }

  cache.set(key, { config, source, loadedAt: Date.now() })
  return { config, source }
}

export async function saveWhatsAppConfig(values: Partial<WhatsAppConfig>) {
  for (const [field, value] of Object.entries(values) as [keyof WhatsAppConfig, string][]) {
    const key = DB_KEYS[field]
    if (!key) continue
    if (value === "") {
      await db.systemSetting.deleteMany({ where: { key, ...settingScope() } })
      continue
    }
    // The access token and app secret are credentials; the phone number id
    // and account id are not, and stay readable so they can be checked.
    const secret = field === "accessToken" || field === "appSecret"
    const stored = secret ? encryptSecret(value) : value
    const tenantId = currentTenant()?.tenantId ?? PLATFORM
    await db.systemSetting.upsert({
      where: { tenantId_key: { tenantId, key } },
      update: { value: stored, type: "STRING", category: "WHATSAPP" },
      create: { tenantId, key, value: stored, type: "STRING", category: "WHATSAPP" },
    })
  }
  invalidateWhatsAppConfigCache()
}

export async function isWhatsAppConfigured(): Promise<boolean> {
  const c = await getWhatsAppConfig()
  return !!(c.accessToken && c.phoneNumberId && c.wabaId)
}

/**
 * Send a text message via WhatsApp Cloud API
 */
export async function sendTextMessage(to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getWhatsAppConfig()
  if (!(await isWhatsAppConfigured())) {
    if (process.env.NODE_ENV === "production") {
      return { success: false, error: "WhatsApp is not configured" }
    }
    console.log(`💬 [WA SIMULATION] To: ${to} | Body: ${body.slice(0, 80)}`)
    return { success: true, messageId: `SIM_WA_${Date.now()}` }
  }

  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.phoneNumberId}/messages`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/[^0-9]/g, ""),
        type: "text",
        text: { body },
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      console.error("WhatsApp send error:", JSON.stringify(err))
      return { success: false, error: err.error?.message || `WhatsApp API error: ${response.status}` }
    }

    const data = await response.json()
    return { success: true, messageId: data.messages?.[0]?.id }
  } catch (error) {
    console.error("WhatsApp send error:", error)
    return { success: false, error: "Failed to send WhatsApp message" }
  }
}

/**
 * Send a template message via WhatsApp Cloud API
 * Templates must be pre-approved by Meta
 */
/** One card of a carousel template, filled in for a single send. */
export interface CarouselCardValues {
  /** Publicly reachable URL. Meta fetches the file itself. */
  imageUrl?: string
  videoUrl?: string
  /** Body placeholders for this card, in {{1}}, {{2}} order. */
  variables?: string[]
  /** The dynamic part of a card's URL button, when it has one. */
  buttonUrl?: string
}

export async function sendTemplateMessage(params: {
  to: string
  templateName: string
  language?: string
  variables?: string[]
  headerImageUrl?: string
  headerDocumentUrl?: string
  headerVideoUrl?: string
  headerDocumentName?: string
  buttonUrl?: string
  cards?: CarouselCardValues[]
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getWhatsAppConfig()
  if (!(await isWhatsAppConfigured())) {
    if (process.env.NODE_ENV === "production") {
      return { success: false, error: "WhatsApp is not configured" }
    }
    console.log(`💬 [WA SIMULATION] To: ${params.to} | Template: ${params.templateName}`)
    return { success: true, messageId: `SIM_WA_${Date.now()}` }
  }

  try {
    const components: any[] = []

    // Header component
    if (params.headerImageUrl) {
      components.push({
        type: "header",
        parameters: [{ type: "image", image: { link: params.headerImageUrl } }],
      })
    } else if (params.headerDocumentUrl) {
      components.push({
        type: "header",
        parameters: [{
          type: "document",
          // WhatsApp shows this name to the customer. Defaulting every
          // document to "voucher.pdf" mislabelled anything that was not one.
          document: { link: params.headerDocumentUrl, filename: params.headerDocumentName || "document.pdf" },
        }],
      })
    } else if (params.headerVideoUrl) {
      components.push({
        type: "header",
        parameters: [{ type: "video", video: { link: params.headerVideoUrl } }],
      })
    }

    // Body component (variables)
    if (params.variables?.length) {
      components.push({
        type: "body",
        parameters: params.variables.map(v => ({ type: "text", text: v })),
      })
    }

    // Carousel cards.
    //
    // Meta requires every card to be present and to carry the same structure
    // as the approved template — a carousel sent with one card missing its
    // media is rejected outright rather than sent short.
    if (params.cards?.length) {
      components.push({
        type: "carousel",
        cards: params.cards.map((card, index) => {
          const cardComponents: any[] = []
          if (card.imageUrl) {
            cardComponents.push({
              type: "header",
              parameters: [{ type: "image", image: { link: card.imageUrl } }],
            })
          } else if (card.videoUrl) {
            cardComponents.push({
              type: "header",
              parameters: [{ type: "video", video: { link: card.videoUrl } }],
            })
          }
          if (card.variables?.length) {
            cardComponents.push({
              type: "body",
              parameters: card.variables.map(v => ({ type: "text", text: v })),
            })
          }
          if (card.buttonUrl) {
            cardComponents.push({
              type: "button",
              sub_type: "url",
              index: 0,
              parameters: [{ type: "text", text: card.buttonUrl }],
            })
          }
          return { card_index: index, components: cardComponents }
        }),
      })
    }

    // Button URL component
    if (params.buttonUrl) {
      components.push({
        type: "button",
        sub_type: "url",
        index: 0,
        parameters: [{ type: "text", text: params.buttonUrl }],
      })
    }

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.phoneNumberId}/messages`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: params.to.replace(/[^0-9]/g, ""),
        type: "template",
        template: {
          name: params.templateName,
          language: { code: params.language || "en_US" },
          components,
        },
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      console.error("WhatsApp template send error:", JSON.stringify(err))
      return { success: false, error: err.error?.message || `WhatsApp API error: ${response.status}` }
    }

    const data = await response.json()
    return { success: true, messageId: data.messages?.[0]?.id }
  } catch (error) {
    console.error("WhatsApp template send error:", error)
    return { success: false, error: "Failed to send WhatsApp template" }
  }
}

/**
 * Send an interactive message (buttons or list)
 */
export async function sendInteractiveMessage(params: {
  to: string
  body: string
  buttons?: { id: string; title: string }[]
  list?: { title: string; sections: { title: string; rows: { id: string; title: string; description?: string }[] }[] }
  headerText?: string
  footerText?: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getWhatsAppConfig()
  if (!(await isWhatsAppConfigured())) {
    if (process.env.NODE_ENV === "production") {
      return { success: false, error: "WhatsApp is not configured" }
    }
    console.log(`💬 [WA SIMULATION] To: ${params.to} | Interactive: ${params.body.slice(0, 60)}`)
    return { success: true, messageId: `SIM_WA_${Date.now()}` }
  }


  // Meta counts list rows across every section, not per section, and rejects
  // the entire message when it goes over — the customer then sees nothing.
  // Checked here so a caller cannot silently lose a message by adding a row.
  if (params.list) {
    const rows = params.list.sections.reduce((sum, section) => sum + section.rows.length, 0)
    if (rows > 10) {
      return { success: false, error: `A WhatsApp list allows 10 rows in total; this one has ${rows}` }
    }
    if (rows === 0) {
      return { success: false, error: "A WhatsApp list needs at least one row" }
    }
  }
  if (params.buttons && params.buttons.length > 3) {
    return { success: false, error: `WhatsApp allows 3 reply buttons; this one has ${params.buttons.length}` }
  }
  try {
    const interactive: any = {
      type: params.buttons ? "button" : "list",
      body: { text: params.body },
    }

    if (params.headerText) interactive.header = { type: "text", text: params.headerText }
    if (params.footerText) interactive.footer = { text: params.footerText }

    if (params.buttons) {
      interactive.action = {
        buttons: params.buttons.map(b => ({ type: "reply", reply: { id: b.id, title: b.title } })),
      }
    } else if (params.list) {
      interactive.action = {
        button: params.list.title,
        sections: params.list.sections,
      }
    }

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.phoneNumberId}/messages`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: params.to.replace(/[^0-9]/g, ""),
        type: "interactive",
        interactive,
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      console.error("WhatsApp interactive send error:", JSON.stringify(err))
      return { success: false, error: err.error?.message || `WhatsApp API error: ${response.status}` }
    }

    const data = await response.json()
    return { success: true, messageId: data.messages?.[0]?.id }
  } catch (error) {
    console.error("WhatsApp interactive send error:", error)
    return { success: false, error: "Failed to send interactive message" }
  }
}

/**
 * Send a media message (image, document, video)
 */
/**
 * A message with a button that opens a link.
 *
 * WhatsApp has three ways to reach a web page and they are not
 * interchangeable:
 *
 *   - A bare URL in ordinary text is tappable and opens in WhatsApp's own
 *     in-app browser. Free, works anywhere, looks like a link.
 *   - This: a `cta_url` button, which looks like a button rather than a link
 *     and gets a much better tap rate. It can be sent inside the 24-hour
 *     window without a template.
 *   - A template with a URL button, which is the only one of the three that
 *     may open a conversation after 24 hours of silence.
 *
 * A `cta_url` button cannot be mixed with reply buttons in one message —
 * Meta rejects the message rather than dropping the extra button — so a
 * "Pay now" link and a "Talk to a human" reply have to be sent separately.
 *
 * The URL must be https. Meta rejects http outright, which is worth catching
 * here rather than discovering as a failed send.
 */
export async function sendCtaUrlMessage(params: {
  to: string
  body: string
  buttonText: string
  url: string
  headerText?: string
  footerText?: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getWhatsAppConfig()
  if (!(await isWhatsAppConfigured())) {
    if (process.env.NODE_ENV === "production") return { success: false, error: "WhatsApp is not configured" }
    console.log(`💬 [WA SIMULATION] To: ${params.to} | CTA: ${params.buttonText} -> ${params.url}`)
    return { success: true, messageId: `SIM_WA_${Date.now()}` }
  }

  if (!/^https:\/\//i.test(params.url)) {
    return { success: false, error: "A WhatsApp link button needs an https URL" }
  }
  // Meta truncates silently past 20 characters, which reads as a bug.
  if (params.buttonText.length > 20) {
    return { success: false, error: `Button text allows 20 characters; this one has ${params.buttonText.length}` }
  }

  try {
    const interactive: Record<string, unknown> = {
      type: "cta_url",
      body: { text: params.body },
      action: {
        name: "cta_url",
        parameters: { display_text: params.buttonText, url: params.url },
      },
    }
    if (params.headerText) interactive.header = { type: "text", text: params.headerText }
    if (params.footerText) interactive.footer = { text: params.footerText }

    const response = await fetch(`https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: params.to, type: "interactive", interactive }),
    })
    const data = await response.json()
    if (!response.ok) {
      console.error("WhatsApp CTA send error:", JSON.stringify(data))
      return { success: false, error: data.error?.message || "Send failed" }
    }
    return { success: true, messageId: data.messages?.[0]?.id }
  } catch (error) {
    console.error("WhatsApp CTA send error:", error)
    return { success: false, error: String(error) }
  }
}

export async function sendMediaMessage(params: {
  to: string
  type: "image" | "document" | "video" | "audio"
  mediaUrl: string
  caption?: string
  filename?: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getWhatsAppConfig()
  if (!(await isWhatsAppConfigured())) {
    if (process.env.NODE_ENV === "production") {
      return { success: false, error: "WhatsApp is not configured" }
    }
    console.log(`💬 [WA SIMULATION] To: ${params.to} | Media: ${params.type} - ${params.mediaUrl}`)
    return { success: true, messageId: `SIM_WA_${Date.now()}` }
  }

  try {
    const rawUrl = String(params.mediaUrl || "").trim()
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud").replace(/\/+$/, "")
    const resolvedUrl = rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
      ? rawUrl
      : `${baseUrl}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`

    const mediaObj: any = { link: resolvedUrl }
    if (params.caption) mediaObj.caption = params.caption
    if (params.filename && params.type === "document") mediaObj.filename = params.filename

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.phoneNumberId}/messages`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: params.to.replace(/[^0-9]/g, ""),
        type: params.type,
        [params.type]: mediaObj,
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      return { success: false, error: err.error?.message || `WhatsApp API error: ${response.status}` }
    }

    const data = await response.json()
    return { success: true, messageId: data.messages?.[0]?.id }
  } catch (error) {
    console.error("WhatsApp media send error:", error)
    return { success: false, error: "Failed to send media" }
  }
}

/**
 * Verify webhook signature using App Secret (HMAC-SHA256)
 * Meta sends X-Hub-Signature-256 header
 */
export async function verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
  const config = await getWhatsAppConfig()

  // Fail closed in production: the webhook route is publicly reachable (see
  // proxy.ts PUBLIC_EXACT), so this signature is the only thing standing
  // between the open internet and the conversation/order tables.
  if (!config.appSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error("WHATSAPP_APP_SECRET is not set — rejecting webhook delivery")
      return false
    }
    return true
  }

  if (!signature) return process.env.NODE_ENV !== "production"

  const expected = crypto
    .createHmac("sha256", config.appSecret)
    .update(payload)
    .digest("hex")

  const received = signature.replace("sha256=", "")

  // Hash both sides to a fixed width so the comparison is constant-time
  // regardless of what length the caller supplied.
  const expectedDigest = crypto.createHash("sha256").update(expected).digest()
  const receivedDigest = crypto.createHash("sha256").update(received).digest()
  return crypto.timingSafeEqual(expectedDigest, receivedDigest)
}

// ═══════════════════════════════════════════════════════
// TEMPLATE MANAGEMENT (Meta Business API)
// ═══════════════════════════════════════════════════════

/**
 * Create a message template on Meta
 * Per BRD §6.5.2: "Create, edit, and submit WhatsApp message templates for Meta approval"
 */
/**
 * Uploads an image to Meta and returns the handle a template needs.
 *
 * This is the step that made carousel submissions fail. A template's example
 * image is not a URL — Meta wants a handle produced by its Resumable Upload
 * API, and answers a URL with "Invalid parameter". The URL only works when
 * *sending* a message; creating the template needs the file itself.
 *
 * Three calls: start a session, push the bytes, receive the handle. The
 * session endpoint belongs to the app rather than the WhatsApp account, which
 * is why the app id is needed here and nowhere else.
 */
export async function uploadTemplateMedia(imageUrl: string): Promise<{ success: boolean; handle?: string; error?: string }> {
  const config = await getWhatsAppConfig()
  const appId = process.env.WHATSAPP_APP_ID || ""
  if (!appId) return { success: false, error: "WHATSAPP_APP_ID is not set — it is needed to upload template images" }
  if (!config.accessToken) return { success: false, error: "No WhatsApp access token" }

  let bytes: Buffer
  let contentType = "image/jpeg"
  try {
    const response = await fetch(imageUrl, { signal: AbortSignal.timeout(20_000) })
    if (!response.ok) return { success: false, error: `Could not fetch the image (HTTP ${response.status})` }
    contentType = response.headers.get("content-type")?.split(";")[0] || contentType
    bytes = Buffer.from(await response.arrayBuffer())

    /*
     * A URL that does not resolve to an image usually returns the site's own
     * HTML with a 200, and Meta accepts the upload without complaint — the
     * template is then created with a page of markup where the photograph
     * should be, and the failure only surfaces when a customer sees it.
     */
    if (!contentType.startsWith("image/")) {
      return { success: false, error: `That URL returned ${contentType}, not an image` }
    }
  } catch (error) {
    return { success: false, error: `Could not fetch the image: ${error instanceof Error ? error.message : "failed"}` }
  }

  // Meta rejects anything over 5 MB for a template example, with an error that
  // does not mention the size.
  if (bytes.length > 5 * 1024 * 1024) {
    return { success: false, error: `That image is ${(bytes.length / 1024 / 1024).toFixed(1)} MB; the limit for a template image is 5 MB` }
  }

  try {
    const start = await fetch(
      `https://graph.facebook.com/v21.0/${appId}/uploads?file_length=${bytes.length}&file_type=${encodeURIComponent(contentType)}`,
      { method: "POST", headers: { Authorization: `Bearer ${config.accessToken}` } },
    )
    const session = await start.json()
    if (!session.id) {
      return { success: false, error: `Could not start the upload: ${JSON.stringify(session.error ?? session).slice(0, 200)}` }
    }

    const upload = await fetch(`https://graph.facebook.com/v21.0/${session.id}`, {
      method: "POST",
      headers: {
        // This one call wants "OAuth", not "Bearer". Bearer is accepted
        // everywhere else in the Graph API and rejected here.
        Authorization: `OAuth ${config.accessToken}`,
        file_offset: "0",
        "Content-Type": "application/octet-stream",
      },
      body: new Uint8Array(bytes),
    })
    const result = await upload.json()
    if (!result.h) {
      return { success: false, error: `Upload failed: ${JSON.stringify(result.error ?? result).slice(0, 200)}` }
    }
    return { success: true, handle: result.h }
  } catch (error) {
    return { success: false, error: `Upload failed: ${error instanceof Error ? error.message : "unknown"}` }
  }
}

export async function createTemplate(params: {
  name: string
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION"
  language: string
  headerType?: "NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT"
  headerText?: string
  bodyText: string
  bodyVariables?: string[]
  footerText?: string
  buttons?: { type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER"; text: string; url?: string; phone?: string }[]
}): Promise<{ success: boolean; templateId?: string; status?: string; error?: string }> {
  const config = await getWhatsAppConfig()
  if (!(await isWhatsAppConfigured())) {
    return { success: false, error: "WhatsApp not configured" }
  }

  try {
    const components: any[] = []

    // Header
    if (params.headerType && params.headerType !== "NONE") {
      const header: any = { type: "HEADER", format: params.headerType }
      if (params.headerType === "TEXT" && params.headerText) {
        header.text = params.headerText
      }
      components.push(header)
    }

    // Body
    const body: any = { type: "BODY", text: params.bodyText }
    if (params.bodyVariables?.length) {
      body.example = { body_text: [params.bodyVariables] }
    }
    components.push(body)

    // Footer
    if (params.footerText) {
      components.push({ type: "FOOTER", text: params.footerText })
    }

    // Buttons
    if (params.buttons?.length) {
      components.push({
        type: "BUTTONS",
        buttons: params.buttons.map(b => {
          if (b.type === "QUICK_REPLY") return { type: "QUICK_REPLY", text: b.text }
          if (b.type === "URL") return { type: "URL", text: b.text, url: b.url || "" }
          return { type: "PHONE_NUMBER", text: b.text, phone_number: b.phone || "" }
        }),
      })
    }

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.wabaId}/message_templates`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({
        name: params.name,
        category: params.category,
        language: params.language,
        components,
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      console.error("Template creation error:", JSON.stringify(err))
      return { success: false, error: err.error?.message || `Meta API error: ${response.status}` }
    }

    const data = await response.json()
    return {
      success: true,
      templateId: data.id,
      status: data.status, // PENDING, APPROVED, REJECTED
    }
  } catch (error) {
    console.error("Template creation error:", error)
    return { success: false, error: "Failed to create template" }
  }
}

/**
 * List all templates from Meta
 * Per BRD §6.5.2: "Sync approved templates automatically from Meta Business Manager"
 */
export async function listTemplates(): Promise<{ success: boolean; templates?: any[]; error?: string }> {
  const config = await getWhatsAppConfig()
  if (!(await isWhatsAppConfigured())) {
    return { success: false, error: "WhatsApp not configured" }
  }

  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.wabaId}/message_templates?limit=250`
    const response = await fetch(url, {
      headers: { "Authorization": `Bearer ${config.accessToken}` },
    })

    if (!response.ok) {
      const err = await response.json()
      return { success: false, error: err.error?.message || `Meta API error: ${response.status}` }
    }

    const data = await response.json()
    return { success: true, templates: data.data || [] }
  } catch (error) {
    console.error("Template list error:", error)
    return { success: false, error: "Failed to list templates" }
  }
}

/**
 * Delete a template from Meta
 */
export async function deleteTemplate(templateName: string): Promise<{ success: boolean; error?: string }> {
  const config = await getWhatsAppConfig()
  if (!(await isWhatsAppConfigured())) {
    return { success: false, error: "WhatsApp not configured" }
  }

  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.wabaId}/message_templates?name=${templateName}`
    const response = await fetch(url, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${config.accessToken}` },
    })

    if (!response.ok) {
      const err = await response.json()
      return { success: false, error: err.error?.message || `Meta API error: ${response.status}` }
    }

    return { success: true }
  } catch (error) {
    console.error("Template delete error:", error)
    return { success: false, error: "Failed to delete template" }
  }
}

/**
 * Resolve a WhatsApp media id to its download URL.
 *
 * The URL is short-lived (~5 minutes) and requires the access token as a
 * bearer header — it is NOT publicly fetchable, so it cannot be handed to a
 * browser, stored as a permanent image src, or passed to a third-party API
 * that fetches by URL. Use downloadMediaBytes when you need the content.
 */
export async function downloadMedia(mediaId: string): Promise<{ success: boolean; url?: string; mimeType?: string; error?: string }> {
  const config = await getWhatsAppConfig()
  if (!(await isWhatsAppConfigured())) {
    return { success: false, error: "WhatsApp not configured" }
  }

  try {
    // Step 1: Get the media URL
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`
    const response = await fetch(url, {
      headers: { "Authorization": `Bearer ${config.accessToken}` },
    })

    if (!response.ok) {
      return { success: false, error: `Failed to get media URL: ${response.status}` }
    }

    const data = await response.json()
    return { success: true, url: data.url, mimeType: data.mime_type }
  } catch (error) {
    console.error("Media download error:", error)
    return { success: false, error: "Failed to download media" }
  }
}

/**
 * Fetch the actual bytes of a WhatsApp media object.
 *
 * Two hops: resolve the id to a URL, then fetch that URL with the access token
 * attached. The second hop needs the bearer header too — a plain fetch of the
 * URL returns 401, which is the usual reason "the image never loaded".
 */
export async function downloadMediaBytes(
  mediaId: string,
): Promise<{ success: boolean; base64?: string; mimeType?: string; error?: string }> {
  const config = await getWhatsAppConfig()
  if (!(await isWhatsAppConfigured())) {
    return { success: false, error: "WhatsApp not configured" }
  }

  const meta = await downloadMedia(mediaId)
  if (!meta.success || !meta.url) {
    return { success: false, error: meta.error || "Could not resolve media URL" }
  }

  try {
    const response = await fetch(meta.url, {
      headers: { "Authorization": `Bearer ${config.accessToken}` },
    })
    if (!response.ok) {
      return { success: false, error: `Media fetch failed: ${response.status}` }
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    // Guard against a malformed id returning something enormous — these are
    // held in memory and forwarded to the model.
    if (buffer.byteLength > 12 * 1024 * 1024) {
      return { success: false, error: "Media exceeds 12MB limit" }
    }

    return {
      success: true,
      base64: buffer.toString("base64"),
      mimeType: meta.mimeType || response.headers.get("content-type") || "application/octet-stream",
    }
  } catch (error) {
    console.error("Media bytes download error:", error)
    return { success: false, error: "Failed to download media content" }
  }
}


/**
 * Sends a pin on the map.
 *
 * Location is its own message type in the Cloud API rather than a media
 * object, which is why it is not handled by sendMediaMessage. Agents need it
 * to tell a customer where a tour departs from.
 */
export async function sendLocationMessage(params: {
  to: string
  latitude: number
  longitude: number
  name?: string
  address?: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getWhatsAppConfig()
  if (!(await isWhatsAppConfigured())) {
    if (process.env.NODE_ENV === "production") {
      return { success: false, error: "WhatsApp is not configured" }
    }
    console.log(`💬 [WA SIMULATION] To: ${params.to} | Location: ${params.latitude},${params.longitude}`)
    return { success: true, messageId: `SIM_WA_${Date.now()}` }
  }

  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.phoneNumberId}/messages`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: params.to.replace(/[^0-9]/g, ""),
        type: "location",
        location: {
          latitude: params.latitude,
          longitude: params.longitude,
          name: params.name,
          address: params.address,
        },
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return { success: false, error: err.error?.message || `WhatsApp API error: ${response.status}` }
    }

    const data = await response.json()
    return { success: true, messageId: data.messages?.[0]?.id }
  } catch (error) {
    console.error("WhatsApp location send error:", error)
    return { success: false, error: "Failed to send location" }
  }
}

/**
 * Marks the customer's message as read and shows the typing indicator.
 *
 * Without this a customer sends a message, sees nothing at all while the
 * assistant thinks — several seconds when it is looking things up — and often
 * sends it again. The two ticks turning blue and the "typing…" line are what
 * tell them somebody is there.
 *
 * Meta clears the indicator when the reply arrives, or after about 25 seconds.
 * Deliberately best-effort: a courtesy that fails must never stop the reply.
 */
export async function showTyping(messageId: string): Promise<void> {
  if (!(await isWhatsAppConfigured())) return
  const config = await getWhatsAppConfig()

  try {
    await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${config.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
        typing_indicator: { type: "text" },
      }),
    })
  } catch (error) {
    console.error("Typing indicator failed:", error)
  }
}

/**
 * Sends a Meta WhatsApp Single Product Message (SPM).
 * Displays 1 product card directly in chat linked to a Meta Commerce Catalog.
 */
export async function sendSingleProductMessage(params: {
  to: string
  catalogId: string
  productRetailerId: string
  bodyText?: string
  footerText?: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getWhatsAppConfig()
  if (!(await isWhatsAppConfigured())) {
    if (process.env.NODE_ENV === "production") {
      return { success: false, error: "WhatsApp is not configured" }
    }
    console.log(`💬 [WA SIMULATION] To: ${params.to} | Catalog Item: ${params.productRetailerId}`)
    return { success: true, messageId: `SIM_WA_CATALOG_${Date.now()}` }
  }

  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.phoneNumberId}/messages`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: params.to.replace(/[^0-9]/g, ""),
        type: "interactive",
        interactive: {
          type: "product",
          body: params.bodyText ? { text: params.bodyText } : undefined,
          footer: params.footerText ? { text: params.footerText } : undefined,
          action: {
            catalog_id: params.catalogId,
            product_retailer_id: params.productRetailerId,
          },
        },
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return { success: false, error: err.error?.message || `WhatsApp API error: ${response.status}` }
    }

    const data = await response.json()
    return { success: true, messageId: data.messages?.[0]?.id }
  } catch (error) {
    console.error("WhatsApp single product message error:", error)
    return { success: false, error: "Failed to send product message" }
  }
}

/**
 * Sends a Meta WhatsApp Multi-Product Message (MPM / Catalog Showcase).
 * Displays up to 30 items split into categories/sections.
 */
export async function sendMultiProductMessage(params: {
  to: string
  catalogId: string
  headerText: string
  bodyText: string
  footerText?: string
  sections: Array<{
    title: string
    productItems: Array<{ productRetailerId: string }>
  }>
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getWhatsAppConfig()
  if (!(await isWhatsAppConfigured())) {
    if (process.env.NODE_ENV === "production") {
      return { success: false, error: "WhatsApp is not configured" }
    }
    console.log(`💬 [WA SIMULATION] To: ${params.to} | Catalog Showcase: ${params.headerText}`)
    return { success: true, messageId: `SIM_WA_CATALOG_MULTI_${Date.now()}` }
  }

  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.phoneNumberId}/messages`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: params.to.replace(/[^0-9]/g, ""),
        type: "interactive",
        interactive: {
          type: "product_list",
          header: { type: "text", text: params.headerText },
          body: { text: params.bodyText },
          footer: params.footerText ? { text: params.footerText } : undefined,
          action: {
            catalog_id: params.catalogId,
            sections: params.sections.map((s) => ({
              title: s.title,
              product_items: s.productItems.map((item) => ({
                product_retailer_id: item.productRetailerId,
              })),
            })),
          },
        },
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return { success: false, error: err.error?.message || `WhatsApp API error: ${response.status}` }
    }

    const data = await response.json()
    return { success: true, messageId: data.messages?.[0]?.id }
  } catch (error) {
    console.error("WhatsApp multi-product message error:", error)
    return { success: false, error: "Failed to send product list message" }
  }
}

export interface WhatsAppContactPayload {
  name: {
    formatted_name: string
    first_name?: string
    last_name?: string
  }
  org?: {
    company?: string
    department?: string
    title?: string
  }
  phones?: Array<{
    phone: string
    type?: string
    wa_id?: string
  }>
  emails?: Array<{
    email: string
    type?: string
  }>
  urls?: Array<{
    url: string
    type?: string
  }>
  addresses?: Array<{
    street?: string
    city?: string
    state?: string
    zip?: string
    country?: string
    country_code?: string
    type?: string
  }>
}

/**
 * Sends a native WhatsApp Contact Card (vCard) using Meta's Cloud API contacts payload.
 */
export async function sendContactMessage(params: {
  to: string
  contact: WhatsAppContactPayload
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getWhatsAppConfig()
  if (!(await isWhatsAppConfigured())) {
    if (process.env.NODE_ENV === "production") {
      return { success: false, error: "WhatsApp is not configured" }
    }
    console.log(`💬 [WA SIMULATION] To: ${params.to} | Native Contact Card: ${params.contact.name.formatted_name}`)
    return { success: true, messageId: `SIM_WA_CONTACT_${Date.now()}` }
  }

  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.phoneNumberId}/messages`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: params.to.replace(/[^0-9]/g, ""),
        type: "contacts",
        contacts: [params.contact],
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return { success: false, error: err.error?.message || `WhatsApp API error: ${response.status}` }
    }

    const data = await response.json()
    return { success: true, messageId: data.messages?.[0]?.id }
  } catch (error) {
    console.error("WhatsApp contact message error:", error)
    return { success: false, error: "Failed to send contact card message" }
  }
}

/**
 * Sends a Digital Business Card summary message with interactive CTA buttons.
 */
export async function sendDigitalCardMessage(params: {
  to: string
  businessName: string
  cardUrl: string
  tagline?: string
  contactPhone?: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const bodyText = `📇 *${params.businessName}*\n${params.tagline ? `${params.tagline}\n\n` : "\n"}View our full digital profile, explore our services, and save our contact directly:\n🔗 ${params.cardUrl}`

  return sendTextMessage(params.to, bodyText)
}

