import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getWhatsAppConfig, isWhatsAppConfigured } from "@/lib/whatsapp"
import { isAIConfigured } from "@/lib/ai"
import { getAIConfig } from "@/lib/ai-provider"
import { withErrors } from "@/lib/api-handler"
import { currentTenant } from "@/lib/tenant"
import { sessionFromRequest } from "@/lib/auth"
import { getConfigValue } from "@/lib/app-config"
import { amwalPaySource } from "@/lib/amwalpay"

/**
 * Configuration health for the admin WhatsApp Setup screen.
 * Reports whether each moving part is live, never the credential values.
 */

// Templates the platform sends automatically. A missing or unapproved one here
// means those messages silently fail to reach customers.
/**
 * The webhook fields this platform actually reads.
 *
 * A field that is not subscribed in the app's own Webhooks configuration
 * simply never arrives — Meta does not warn anybody, and the symptom is a
 * feature that appears to be broken here. `messages` is the inbox itself; the
 * other three are what a business's existing WhatsApp Business app sends when
 * their number is connected while staying live on their phone.
 */
const REQUIRED_WEBHOOK_FIELDS = [
  { field: "messages", why: "Incoming messages and delivery receipts" },
  { field: "history", why: "Chat history imported when a number in use is connected" },
  { field: "smb_app_state_sync", why: "Contacts imported from the owner's phone" },
  { field: "smb_message_echoes", why: "Replies the owner types on their own phone" },
]

/**
 * Which fields the app is subscribed to, asked of Meta directly.
 *
 * Uses an app access token — the app id and secret joined by a pipe — which is
 * the only credential that can read an app's own subscriptions. Never returns
 * the token or the secret, only field names.
 */
async function webhookFields(): Promise<{ subscribed: string[]; error?: string }> {
  const [appId, appSecret] = await Promise.all([
    getConfigValue("meta_app_id"),
    getConfigValue("meta_app_secret"),
  ])
  if (!appId || !appSecret) return { subscribed: [], error: "The Meta app id and secret are not set" }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v23.0/${encodeURIComponent(appId)}/subscriptions` +
        `?access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`,
      { cache: "no-store" },
    )
    const data = await response.json()
    if (!response.ok) return { subscribed: [], error: data?.error?.message || `Meta returned ${response.status}` }

    const whatsapp = (data?.data ?? []).find((o: any) => o?.object === "whatsapp_business_account")
    if (!whatsapp) return { subscribed: [], error: "This app is not subscribed to WhatsApp webhooks at all" }
    return { subscribed: (whatsapp.fields ?? []).map((f: any) => f?.name).filter(Boolean) }
  } catch {
    return { subscribed: [], error: "Could not reach Meta" }
  }
}

/**
 * What Meta says about the login configuration Embedded Signup is launched
 * with.
 *
 * When the dialog closes without handing back a code, the browser is told
 * almost nothing — the reasons live on Meta's side: a configuration that is
 * not a WhatsApp Embedded Signup one, an app still in development mode, a
 * domain missing from the allow list. This asks directly, so "the sign-up was
 * cancelled" can be checked against something.
 */
async function embeddedSignupConfig() {
  const [appId, appSecret, configId] = await Promise.all([
    getConfigValue("meta_app_id"),
    getConfigValue("meta_app_secret"),
    getConfigValue("meta_config_id"),
  ])
  if (!appId || !appSecret) return { configId: configId || null, error: "The Meta app id and secret are not set" }
  if (!configId) return { configId: null, error: "No login configuration id is set" }

  const token = `${appId}|${appSecret}`
  try {
    const [configRes, appRes] = await Promise.all([
      fetch(
        `https://graph.facebook.com/v23.0/${encodeURIComponent(configId)}` +
          `?access_token=${encodeURIComponent(token)}`,
        { cache: "no-store" },
      ),
      fetch(
        `https://graph.facebook.com/v23.0/${encodeURIComponent(appId)}` +
          `?fields=name,link,app_domains&access_token=${encodeURIComponent(token)}`,
        { cache: "no-store" },
      ),
    ])
    const config = await configRes.json()
    const app = await appRes.json()
    return {
      configId,
      // Whatever Meta returns, verbatim. Never the secret it was read with.
      config: configRes.ok ? config : { error: config?.error?.message ?? `Meta returned ${configRes.status}` },
      app: appRes.ok ? app : { error: app?.error?.message ?? `Meta returned ${appRes.status}` },
    }
  } catch {
    return { configId, error: "Could not reach Meta" }
  }
}

const REQUIRED_TEMPLATES = [
  "order_confirmation",
  "payment_received",
  "payment_rejected",
  "tour_reminder",
  "post_tour_review",
  "abandoned_cart",
]

export const GET = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const tenantId = currentTenant()?.tenantId
  if (session?.kind !== "staff" || !tenantId) return NextResponse.json({ error: "Authentication and workspace context required" }, { status: 401 })
  const config = await getWhatsAppConfig()
  const configured = await isWhatsAppConfigured()

  const whatsapp: Record<string, unknown> = {
    configured,
    appSecret: !!config.appSecret,
    phoneNumber: config.phoneNumber || null,
  }

  // Live check against Meta so the screen shows the real number state, not
  // just whether env vars happen to be set.
  if (configured) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${config.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`,
        { headers: { Authorization: `Bearer ${config.accessToken}` }, cache: "no-store" },
      )
      if (res.ok) {
        const data = await res.json()
        whatsapp.phoneNumber = data.display_phone_number
        whatsapp.verifiedName = data.verified_name
        whatsapp.qualityRating = data.quality_rating
      } else {
        const err = await res.json().catch(() => ({}))
        whatsapp.error = err?.error?.message || `Meta API error ${res.status}`
      }
    } catch {
      whatsapp.error = "Could not reach the Meta Graph API"
    }
  }

  const templates = await db.template.findMany({
    where: { tenantId, channel: "WHATSAPP" },
    select: { name: true, status: true },
  })
  const approved = new Set(templates.filter(t => t.status === "APPROVED").map(t => t.name))

  const [abandoned, reminders, reviews, campaigns] = await Promise.all([
    db.order.count({ where: { tenantId, orderStatus: "PENDING_PAYMENT", recoverySentAt: null } }),
    db.order.count({ where: { tenantId, orderStatus: "CONFIRMED", reminderSentAt: null } }),
    db.order.count({ where: { tenantId, orderStatus: "COMPLETED", reviewRequestSentAt: null } }),
    db.campaign.count({ where: { tenantId, status: "SCHEDULED" } }),
  ])

  const aiConfig = await getAIConfig()
  const aiStatus = {
    configured: await isAIConfigured(),
    provider: aiConfig.provider,
    model: aiConfig.model,
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud"

  const [fields, signup, payments] = await Promise.all([
    webhookFields(),
    embeddedSignupConfig(),
    amwalPaySource().catch(() => null),
  ])

  return NextResponse.json({
    whatsapp,
    embeddedSignup: signup,
    // Where this workspace's card payments would actually land.
    payments,
    webhooks: {
      subscribed: fields.subscribed,
      error: fields.error ?? null,
      missing: REQUIRED_WEBHOOK_FIELDS
        .filter(f => !fields.subscribed.includes(f.field))
        .map(f => ({ field: f.field, why: f.why })),
    },
    ai: aiStatus,
    cron: {
      configured: !!process.env.CRON_SECRET,
      pending: { abandoned, reminders, reviews, campaigns },
    },
    templates: {
      total: templates.length,
      approved: approved.size,
      missing: REQUIRED_TEMPLATES.filter(t => !approved.has(t)),
    },
    webhookUrl: `${baseUrl}/api/whatsapp/webhook`,
  })
})
