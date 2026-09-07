import { db, raw } from "@/lib/db"
import { encryptSecret, decryptSecret } from "@/lib/secret-box"
import { getConfigValue } from "@/lib/app-config"

/**
 * The numbers this platform can send from.
 *
 * Two ways in. Embedded Signup, where a business authorises us from inside
 * Facebook and we are handed a code to exchange — and pasting a token in by
 * hand, which is what anybody without Tech Provider approval has to do and is
 * therefore not a second-class path here.
 *
 * A token is encrypted at rest. It is the whole account: anyone holding it can
 * message that number's customers as that business.
 */

/*
 * Deliberately ahead of the rest of the codebase, which is on v21.
 *
 * The sign-up dialog is initialised at v23 because connecting a number that is
 * already running on a phone does not exist before then, and the calls that
 * flow does — `smb_app_data` for contacts and history — belong to the same
 * generation. Talking to the old version from here would mean asking a v21
 * endpoint for something only v23 knows about.
 *
 * The other Graph callers (templates, calling, catalogue) are left on v21 on
 * purpose: bumping them is a separate change with its own things to check.
 */
const GRAPH = "https://graph.facebook.com/v23.0"

export interface NumberDetails {
  displayPhone?: string
  verifiedName?: string
  qualityRating?: string
  messagingLimit?: string
  codeVerification?: string
  platformType?: string
  throughput?: string
}

/**
 * What Meta says about a number right now.
 *
 * Quality and the messaging limit are the two an operator actually needs: a
 * number that has dropped to RED is hours away from being restricted, and the
 * tier is the ceiling on how many people can be messaged in a day. Neither is
 * knowable from anything stored here, so they are always read live.
 */
export async function fetchNumberDetails(
  phoneNumberId: string,
  token: string,
): Promise<{ ok: boolean; details?: NumberDetails; error?: string }> {
  const fields = [
    "display_phone_number",
    "verified_name",
    "quality_rating",
    "messaging_limit_tier",
    "code_verification_status",
    "platform_type",
    "throughput",
  ].join(",")

  try {
    const response = await fetch(`${GRAPH}/${phoneNumberId}?fields=${fields}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    const data = await response.json()
    if (!response.ok) {
      return { ok: false, error: data?.error?.message || `Meta returned ${response.status}` }
    }
    return {
      ok: true,
      details: {
        displayPhone: data.display_phone_number,
        verifiedName: data.verified_name,
        qualityRating: data.quality_rating,
        messagingLimit: data.messaging_limit_tier,
        codeVerification: data.code_verification_status,
        platformType: data.platform_type,
        throughput: data.throughput?.level,
      },
    }
  } catch {
    return { ok: false, error: "Could not reach Meta" }
  }
}

/** The numbers on a business account, for the manual path. */
export async function fetchNumbersForWaba(wabaId: string, token: string) {
  const response = await fetch(`${GRAPH}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data?.error?.message || `Meta returned ${response.status}`)
  return (data.data ?? []) as { id: string; display_phone_number: string; verified_name: string }[]
}

/**
 * Turns the code Embedded Signup hands back into that business's token.
 *
 * The code lives for thirty seconds. Everything on this path is therefore
 * done immediately and in order, with no user interaction in between.
 */
export async function exchangeCode(code: string): Promise<{ ok: boolean; token?: string; error?: string }> {
  const [appId, appSecret] = await Promise.all([
    getConfigValue("meta_app_id"),
    getConfigValue("meta_app_secret"),
  ])
  if (!appId || !appSecret) {
    return { ok: false, error: "Add the Meta app id and secret in Settings first" }
  }

  try {
    const url = `${GRAPH}/oauth/access_token?client_id=${encodeURIComponent(appId)}` +
      `&client_secret=${encodeURIComponent(appSecret)}&code=${encodeURIComponent(code)}`
    const response = await fetch(url, { cache: "no-store" })
    const data = await response.json()
    if (!response.ok || !data.access_token) {
      return { ok: false, error: data?.error?.message || "Meta refused the code" }
    }
    return { ok: true, token: data.access_token }
  } catch {
    return { ok: false, error: "Could not reach Meta" }
  }
}

/**
 * Finds what a token was actually granted access to.
 *
 * Embedded Signup returns the business account and number ids through a
 * postMessage on the window, which arrives only if the flow ran in a popup
 * this page can still hear from — and it opens in a tab when a popup is
 * blocked. Asking Meta what the token can reach removes that dependency
 * entirely: the token itself knows which accounts it was issued for.
 */
export async function discoverFromToken(
  token: string,
  inputWabaId?: string,
  inputPhoneNumberId?: string,
): Promise<{ wabaId?: string; phoneNumberId?: string; error?: string }> {
  try {
    let appToken = token
    const [appId, appSecret] = await Promise.all([
      getConfigValue("meta_app_id"),
      getConfigValue("meta_app_secret"),
    ])
    if (appId && appSecret) {
      appToken = `${appId}|${appSecret}`
    }

    let debug = await fetch(
      `${GRAPH}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(appToken)}`,
      { cache: "no-store" },
    )
    if (!debug.ok && appToken !== token) {
      debug = await fetch(
        `${GRAPH}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`,
        { cache: "no-store" },
      )
    }

    const data = await debug.json()
    let wabaId = inputWabaId

    if (!wabaId) {
      const scopes: { scope: string; target_ids?: string[] }[] = data?.data?.granular_scopes ?? []
      wabaId = scopes
        .filter(s => s.scope?.startsWith("whatsapp_business"))
        .flatMap(s => s.target_ids ?? [])
        .find(Boolean)
    }

    if (!wabaId) {
      return { error: "That sign-up did not include a WhatsApp business account" }
    }

    const numbers = await fetchNumbersForWaba(wabaId, token)
    if (numbers.length === 0) {
      return { error: "That business account has no WhatsApp number on it yet" }
    }

    if (inputPhoneNumberId) {
      const match = numbers.find(n => n.id === inputPhoneNumberId)
      if (!match) {
        return { error: "The selected phone number is not associated with this WhatsApp business account" }
      }
      return { wabaId, phoneNumberId: inputPhoneNumberId }
    }

    /*
     * More than one number and nothing saying which.
     *
     * This is only reached when the sign-up finished somewhere its window
     * message could not reach us — a popup blocker sending it to a tab. Taking
     * the first would connect whichever number Meta happened to list first,
     * which for a business with a sales line and a support line is a coin
     * toss, and the mistake is invisible until somebody replies from the wrong
     * one. Better to say so and let them pick.
     */
    if (numbers.length > 1) {
      return {
        wabaId,
        error:
          `That business has ${numbers.length} numbers and the sign-up did not say which one to connect. ` +
          `Allow pop-ups for this site and try again, or connect it manually.`,
      }
    }
    return { wabaId, phoneNumberId: numbers[0].id }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not reach Meta" }
  }
}

/** Points the customer's business account at our webhook. */
export async function subscribeApp(wabaId: string, token: string) {
  try {
    const response = await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await response.json()
    return { ok: response.ok && data.success !== false, error: data?.error?.message }
  } catch {
    return { ok: false, error: "Could not reach Meta" }
  }
}

/**
 * Registers the number for Cloud API.
 *
 * The PIN is two-step verification for the number itself. A fixed one is
 * chosen here rather than asked for, because it is set and needed only by this
 * system — and an operator who is asked to invent one will write it on a note
 * nobody can find when the number needs re-registering.
 */
export async function registerNumber(phoneNumberId: string, token: string, pin = "635241") {
  try {
    const response = await fetch(`${GRAPH}/${phoneNumberId}/register`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", pin }),
    })
    const data = await response.json()
    // Already registered is a success as far as anybody here is concerned.
    if (!response.ok && !/already/i.test(data?.error?.message || "")) {
      return { ok: false, error: data?.error?.message || `Meta returned ${response.status}` }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: "Could not reach Meta" }
  }
}

/** Saves an account, refreshing what Meta says about it as it goes. */
export async function upsertAccount(params: {
  wabaId: string
  phoneNumberId: string
  token: string
  businessId?: string
  connectedVia: "EMBEDDED_SIGNUP" | "MANUAL"
  webhookSubscribed?: boolean
  registered?: boolean
}) {
  const live = await fetchNumberDetails(params.phoneNumberId, params.token)
  const existing = await db.whatsAppAccount.count()

  const data = {
    wabaId: params.wabaId,
    businessId: params.businessId ?? null,
    accessToken: encryptSecret(params.token),
    connectedVia: params.connectedVia,
    status: live.ok ? "CONNECTED" : "ERROR",
    lastError: live.ok ? null : live.error ?? null,
    webhookSubscribed: params.webhookSubscribed ?? false,
    registered: params.registered ?? false,
    syncedAt: new Date(),
    ...(live.details ?? {}),
  }

  return db.whatsAppAccount.upsert({
    where: { phoneNumberId: params.phoneNumberId },
    update: data,
    create: {
      ...data,
      phoneNumberId: params.phoneNumberId,
      // The first number connected becomes the one messages go out from,
      // because a platform with one account and no default sends nothing.
      isDefault: existing === 0,
    },
  })
}

/** The token for an account, decrypted for use. */
export function tokenFor(account: { accessToken: string }): string {
  return decryptSecret(account.accessToken)
}

/**
 * A token, shown the way a token should be shown.
 *
 * Enough to tell two apart and confirm which is in use, not enough to send
 * with if the screen is photographed over somebody's shoulder.
 */
export function maskToken(token: string): string {
  if (token.length <= 12) return "•".repeat(token.length)
  return `${token.slice(0, 6)}${"•".repeat(12)}${token.slice(-4)}`
}

/**
 * Which business a webhook belongs to.
 *
 * One URL receives every tenant's messages, calls and receipts, and the only
 * key in the payload that identifies the recipient is the phone number id. It
 * is looked up against the connected numbers; an unknown one resolves to
 * nothing rather than to whoever happens to be first in the table, because
 * attributing a stranger's conversation to a real business is worse than
 * dropping it.
 */
export async function tenantForPhoneNumberId(
  phoneNumberId: string | undefined | null,
): Promise<{ tenantId: string; slug: string } | null> {
  if (!phoneNumberId) return null
  /*
   * The unscoped client, deliberately.
   *
   * This function answers "which workspace owns this number", so it has to be
   * able to see every workspace's numbers — asking it from inside one would be
   * circular. It worked before only because the scoped client falls back to an
   * unscoped query when nothing is in scope, which is the same accident that
   * let the WhatsApp webhook read every business's customers. Saying it out
   * loud keeps this correct if that default is ever tightened, and stops a
   * legitimate lookup showing up in the tenancy census beside real faults.
   */
  const account = await raw.whatsAppAccount.findUnique({
    where: { phoneNumberId: String(phoneNumberId) },
    select: { tenantId: true },
  })
  if (account?.tenantId) {
    const tenant = await raw.tenant.findUnique({
      where: { id: account.tenantId },
      select: { id: true, slug: true },
    })
    if (tenant) return { tenantId: tenant.id, slug: tenant.slug }
  }

  /*
   * No connected number matches — which is the state today, because the
   * credentials still live in settings rather than as an account row.
   *
   * While exactly one business exists on this installation there is only one
   * answer it could be, and refusing would drop that business's own messages.
   * The moment a second tenant exists the guess becomes unsafe, so it stops:
   * an unattributable payload is dropped rather than handed to whoever came
   * first.
   */
  const tenants = await raw.tenant.findMany({ select: { id: true, slug: true }, take: 2 })
  if (tenants.length === 1) return { tenantId: tenants[0].id, slug: tenants[0].slug }

  /*
   * Nobody owns this number.
   *
   * Dropping the message is right — attributing a stranger's conversation to a
   * real business is worse — but doing it silently is not. A line in the log
   * is invisible; this leaves a record the platform console can show, so
   * "customers say we get no messages" has an answer that takes a second
   * rather than an afternoon.
   */
  console.error("Webhook for an unrecognised number:", phoneNumberId)
  await db.systemSetting
    .upsert({
      where: { tenantId_key: { tenantId: "", key: `unrouted_number_${phoneNumberId}` } },
      update: { value: new Date().toISOString(), type: "STRING", category: "WHATSAPP" },
      create: {
        tenantId: "",
        key: `unrouted_number_${phoneNumberId}`,
        value: new Date().toISOString(),
        type: "STRING",
        category: "WHATSAPP",
      },
    })
    .catch(() => {})
  return null
}


/**
 * Pulls a business's existing WhatsApp Business app data across.
 *
 * A number connected through coexistence keeps working on the owner's phone,
 * and everything already on that phone — their contacts and the last six
 * months of conversations — stays there unless it is asked for. Without this
 * the inbox opens empty for a business that has been talking to these same
 * customers for years, which reads as "this tool lost my history".
 *
 * Meta only accepts the request inside a 24-hour window after onboarding, and
 * the data arrives later as webhooks rather than in the response, so both
 * calls are fired immediately and their outcome is judged by what turns up.
 */
export async function requestBusinessAppData(
  phoneNumberId: string,
  token: string,
): Promise<{ contacts: boolean; history: boolean; errors: string[] }> {
  const errors: string[] = []

  const ask = async (syncType: "smb_app_state_sync" | "history") => {
    try {
      const response = await fetch(`${GRAPH}/${phoneNumberId}/smb_app_data`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", sync_type: syncType }),
      })
      const data = await response.json()
      if (!response.ok) {
        // 2593109 is the business declining to share history at the point of
        // connecting. Not an error on our side, and not worth alarming anybody.
        const code = data?.error?.code
        if (code !== 2593109) errors.push(`${syncType}: ${data?.error?.message ?? response.status}`)
        return false
      }
      return true
    } catch {
      errors.push(`${syncType}: could not reach Meta`)
      return false
    }
  }

  const contacts = await ask("smb_app_state_sync")
  const history = await ask("history")
  return { contacts, history, errors }
}
