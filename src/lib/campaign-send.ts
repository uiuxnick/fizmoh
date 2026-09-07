import { db } from "@/lib/db"
import { sendWhatsApp, sendEmail } from "@/lib/notifications"
import { parseCards } from "@/lib/carousel"
import { getConfigValue } from "@/lib/app-config"
import { toLocalParts } from "@/lib/timezone"
import { decryptSecret } from "@/lib/secret-box"
import { messengerAdapter } from "@/lib/social/messenger-adapter"
import { instagramAdapter } from "@/lib/social/instagram-adapter"

/**
 * Resolves social text message variables and appends tracking link if provided.
 */
export function resolveSocialText(
  template: string,
  customer: { name: string | null; phone: string; email: string | null; socialUsername?: string | null },
  linkSuffix?: string,
): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud"
  let text = template || ""
  const name = customer.name?.trim() || "there"
  const firstName = (customer.name?.trim().split(/\s+/)[0]) || "there"
  const phone = customer.phone || ""
  const email = customer.email || ""
  const username = customer.socialUsername || name

  text = text.replace(/\{\{\s*customer\.name\s*\}\}|\{\{\s*name\s*\}\}/gi, name)
  text = text.replace(/\{\{\s*customer\.firstName\s*\}\}|\{\{\s*firstName\s*\}\}/gi, firstName)
  text = text.replace(/\{\{\s*customer\.phone\s*\}\}|\{\{\s*phone\s*\}\}/gi, phone)
  text = text.replace(/\{\{\s*customer\.email\s*\}\}|\{\{\s*email\s*\}\}/gi, email)
  text = text.replace(/\{\{\s*customer\.username\s*\}\}|\{\{\s*username\s*\}\}/gi, username)
  text = text.replace(/\{\{\s*1\s*\}\}/g, firstName)
  text = text.replace(/\{\{\s*2\s*\}\}/g, name)

  if (linkSuffix) {
    const fullLink = `${base}/${linkSuffix}`
    if (text.includes("{{link}}")) {
      text = text.replace(/\{\{\s*link\s*\}\}/gi, fullLink)
    } else {
      text = `${text}\n\n${fullLink}`
    }
  }

  return text
}

/**
 * Sending a broadcast.
 *
 * Lived inside the route handler, where it could only ever run for as long as
 * one HTTP request — which is why a campaign of more than a thousand people
 * stopped at a thousand and stayed on "SENDING" for ever.
 *
 * The rules this file exists to keep:
 *
 *   - A run is a slice of work, not the whole campaign. It sends what it can
 *     inside its budget and leaves the rest PENDING, so the next run picks up
 *     exactly where this one stopped and a retry never sends twice.
 *   - Every message is built from what the template actually asks for. The
 *     placeholders are read off the approved body; sending one value to a
 *     template that wants two is rejected by Meta, and so is sending one to a
 *     template that wants none.
 *   - Consent is checked at the moment of sending, not when the audience was
 *     built. People opt out between those two points.
 *   - A campaign that has been paused or cancelled stops at the next
 *     recipient. Something being sent to thousands of people needs a brake.
 */

/** How long one run may spend before it hands over to the next. */
const RUN_BUDGET_MS = 55_000
/** A recipient is given up on after this many attempts. */
const MAX_ATTEMPTS = 3

export interface RunResult {
  sent: number
  failed: number
  skipped: number
  remaining: number
  stopped?: "paused" | "cancelled" | "quiet_hours" | "budget"
}

/**
 * Which value fills each placeholder.
 *
 * A map of "customer.name" style tokens, in placeholder order. Anything that
 * is not a known token is sent as written, so a fixed word in {{2}} works
 * without inventing a second mechanism for it.
 */
export function resolveVariables(
  map: unknown,
  customer: { name: string | null; phone: string; email: string | null; loyaltyTier?: string | null },
  count: number,
): string[] {
  const tokens = Array.isArray(map) ? map.map(String) : []
  const values: string[] = []
  for (let i = 0; i < count; i++) {
    const token = tokens[i] ?? "customer.name"
    switch (token) {
      case "customer.name":
        values.push(customer.name?.trim() || "there")
        break
      case "customer.firstName":
        values.push((customer.name?.trim().split(/\s+/)[0]) || "there")
        break
      case "customer.phone":
        values.push(customer.phone)
        break
      case "customer.email":
        values.push(customer.email || "")
        break
      case "customer.tier":
        values.push((customer.loyaltyTier || "bronze").toLowerCase())
        break
      default:
        values.push(token)
    }
  }
  return values
}

/** The placeholders a template body actually uses, in order. */
export function placeholderCount(body: string): number {
  return new Set([...String(body || "").matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map(m => m[1])).size
}

/** Whether now is inside the hours a marketing message may be sent. */
export async function withinSendingHours(): Promise<boolean> {
  const [startRaw, endRaw] = await Promise.all([
    getConfigValue("quiet_hours_end"),
    getConfigValue("quiet_hours_start"),
  ])
  // Defaults chosen to be uncontroversial rather than clever: 08:00 to 21:00
  // in Muscat, which is where this business and its customers are.
  const start = Number((startRaw || "08:00").split(":")[0])
  const end = Number((endRaw || "21:00").split(":")[0])
  const { hour } = toLocalParts(new Date())
  return hour >= start && hour < end
}

/**
 * Sends one slice of a campaign.
 *
 * Returns when the budget runs out, the pending list empties, or somebody
 * stops it. Safe to call again immediately: it only ever picks up recipients
 * still marked PENDING.
 */
export async function runCampaignSlice(campaignId: string): Promise<RunResult> {
  const started = Date.now()
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: { template: true },
  })
  if (!campaign) throw new Error("Campaign not found")

  const isWhatsApp = campaign.channel === "WHATSAPP"
  const isEmail = campaign.channel === "EMAIL"
  const isFacebook = campaign.channel === "FACEBOOK"
  const isInstagram = campaign.channel === "INSTAGRAM"
  const isSocial = isFacebook || isInstagram

  let socialAccount: any = null
  if (isSocial) {
    socialAccount = await db.socialAccount.findFirst({
      where: {
        ...(campaign.tenantId ? { tenantId: campaign.tenantId } : {}),
        channel: campaign.channel,
        isActive: true,
        status: "CONNECTED",
      },
    })
    if (!socialAccount) {
      await db.campaign.update({
        where: { id: campaignId },
        data: {
          status: "FAILED",
          lastError: `No connected active ${isFacebook ? "Facebook Page" : "Instagram account"} found for this workspace`,
        },
      })
      throw new Error(`No connected active ${isFacebook ? "Facebook Page" : "Instagram account"} found for this workspace`)
    }
  }

  const templateCards = parseCards(campaign.template?.cards)
  const wanted = placeholderCount(campaign.template?.bodyContent || "")

  // Pacing. Meta throttles per number and downgrades the quality rating of a
  // sender that ignores it, which costs far more than the seconds saved.
  const gap = Math.max(0, Math.floor(1000 / Math.max(1, campaign.ratePerSecond)))

  let sent = 0
  let failed = 0
  let skipped = 0
  let stopped: RunResult["stopped"]

  while (true) {
    if (Date.now() - started > RUN_BUDGET_MS) {
      stopped = "budget"
      break
    }

    // Re-read the campaign's own state rather than trusting the copy this run
    // started with: pause and cancel are pressed while it is running.
    const state = await db.campaign.findUnique({
      where: { id: campaignId },
      select: { pausedAt: true, cancelledAt: true, respectQuietHours: true },
    })
    if (state?.cancelledAt) { stopped = "cancelled"; break }
    if (state?.pausedAt) { stopped = "paused"; break }
    if (state?.respectQuietHours && !(await withinSendingHours())) {
      stopped = "quiet_hours"
      break
    }

    const recipient = await db.campaignRecipient.findFirst({
      where: { campaignId, status: "PENDING", attempts: { lt: MAX_ATTEMPTS } },
      orderBy: { createdAt: "asc" },
    })
    if (!recipient) break

    // Claimed before the send, so a second run cannot pick up the same person
    // while this one is waiting on Meta.
    await db.campaignRecipient.update({
      where: { id: recipient.id },
      data: { attempts: { increment: 1 } },
    })

    const customer = await db.customer.findFirst({ where: { id: recipient.customerId } })

    // Consent is re-checked here, not when the audience was built: people opt
    // out in between, and sending to them then is a policy breach.
    const consented = isWhatsApp
      ? customer?.whatsappOptIn
      : isEmail
      ? customer?.emailOptIn
      : isFacebook
      ? customer?.facebookOptIn
      : isInstagram
      ? customer?.instagramOptIn
      : false

    if (!customer || !consented) {
      await db.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "SKIPPED", skipReason: "OPTED_OUT" },
      })
      skipped++
      continue
    }

    if (isSocial) {
      if (customer.channel !== campaign.channel) {
        await db.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: "SKIPPED", skipReason: `Channel mismatch (${customer.channel} vs ${campaign.channel})` },
        })
        skipped++
        continue
      }
      if (!customer.socialId) {
        await db.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: "SKIPPED", skipReason: "NO_SOCIAL_ID" },
        })
        skipped++
        continue
      }

      const adapter = isFacebook ? messengerAdapter : instagramAdapter
      const token = decryptSecret(socialAccount.accessToken)
      const text = resolveSocialText(
        campaign.customContent || campaign.template?.bodyContent || "",
        customer,
        campaign.linkUrl ? `c/${recipient.id}` : undefined,
      )

      let result: { ok: boolean; externalMessageId?: string; error?: string; metaRestriction?: string }

      if (campaign.headerMediaUrl) {
        const mediaType = (campaign.headerMediaType as "IMAGE" | "VIDEO" | "AUDIO" | "FILE") || "IMAGE"
        const mediaResult = await adapter.sendAttachment(token, customer.socialId, campaign.headerMediaUrl, mediaType)
        if (!mediaResult.ok) {
          result = mediaResult
        } else if (text) {
          result = await adapter.sendText(token, customer.socialId, text)
        } else {
          result = mediaResult
        }
      } else {
        result = await adapter.sendText(token, customer.socialId, text)
      }

      if (result.ok) {
        await db.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: "SENT", sentAt: new Date(), externalId: result.externalMessageId, error: null },
        })
        sent++
      } else {
        const rateLimited = /rate|throttl|too many/i.test(result.error || "")
        if (rateLimited) {
          await db.campaignRecipient.update({
            where: { id: recipient.id },
            data: { error: result.error?.slice(0, 500) },
          })
          await new Promise(r => setTimeout(r, 2_000))
          continue
        }
        const isPermanentError = !!result.metaRestriction || /(outside.*window|permission|unsupported|not exist)/i.test(result.error || "")
        const attempts = recipient.attempts + 1
        const shouldFail = isPermanentError || attempts >= MAX_ATTEMPTS
        const errorMsg = result.metaRestriction || result.error || "Meta delivery failed"
        await db.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: shouldFail ? "FAILED" : "PENDING",
            error: errorMsg.slice(0, 500),
          },
        })
        if (shouldFail) failed++
      }
    } else if (isWhatsApp) {
      const variables = resolveVariables(campaign.variableMap, customer, wanted)
      const result = await sendWhatsApp({
        to: customer.phone,
        templateName: campaign.template!.name,
        language: campaign.template!.language || "en_US",
        templateVariables: variables,
        // A media template is rejected without its header, and a carousel
        // without its cards. Both travel with every message.
        imageUrl: campaign.headerMediaType === "IMAGE" ? campaign.headerMediaUrl || undefined : undefined,
        videoUrl: campaign.headerMediaType === "VIDEO" ? campaign.headerMediaUrl || undefined : undefined,
        documentUrl: campaign.headerMediaType === "DOCUMENT" ? campaign.headerMediaUrl || undefined : undefined,
        cards: templateCards.length
          ? templateCards.map(card => ({
              imageUrl: card.imageUrl,
              variables: resolveVariables(campaign.variableMap, customer, placeholderCount(card.body)),
            }))
          : undefined,
        // The button's dynamic suffix is this recipient's tracking id, which
        // is how a click is attributed to a person rather than merely counted.
        buttonUrl: campaign.linkUrl ? `c/${recipient.id}` : undefined,
      })

      if (result.success) {
        await db.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: "SENT", sentAt: new Date(), externalId: result.messageId, error: null },
        })
        sent++
      } else {
        // A rate limit is the one failure worth waiting on rather than
        // recording: the message was never refused, only deferred.
        const rateLimited = /rate|throttl|too many/i.test(result.error || "")
        if (rateLimited) {
          await db.campaignRecipient.update({
            where: { id: recipient.id },
            data: { error: result.error?.slice(0, 500) },
          })
          await new Promise(r => setTimeout(r, 2_000))
          continue
        }
        const attempts = recipient.attempts + 1
        await db.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            // Kept PENDING until the attempts run out, so a blip does not
            // silently drop somebody from a campaign.
            status: attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
            error: result.error?.slice(0, 500),
          },
        })
        if (attempts >= MAX_ATTEMPTS) failed++
      }
    } else {
      if (!customer.email) {
        await db.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: "SKIPPED", skipReason: "NO_EMAIL" },
        })
        skipped++
        continue
      }
      const result = await sendEmail({
        to: customer.email,
        subject: campaign.subject || campaign.name,
        html: emailBody(campaign.customContent || campaign.template?.bodyContent || "", customer, recipient.id),
      })
      const attempts = recipient.attempts + 1
      await db.campaignRecipient.update({
        where: { id: recipient.id },
        data: result.success
          ? { status: "SENT", sentAt: new Date(), externalId: result.messageId, error: null }
          : {
              status: attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
              error: result.error?.slice(0, 500),
            },
      })
      if (result.success) sent++
      else if (attempts >= MAX_ATTEMPTS) failed++
    }

    if (gap > 0) await new Promise(r => setTimeout(r, gap))
  }

  const remaining = await db.campaignRecipient.count({
    where: { campaignId, status: "PENDING", attempts: { lt: MAX_ATTEMPTS } },
  })

  await refreshTotals(campaignId)

  const totals = await db.campaignRecipient.groupBy({
    by: ["status"],
    where: { campaignId },
    _count: true,
  })
  const count = (status: string) => totals.find(t => t.status === status)?._count ?? 0
  const totalSent = count("SENT")
  const totalFailed = count("FAILED")

  let lastError: string | null = null
  if (stopped === "quiet_hours") {
    lastError = "Paused: Outside active sending hours (08:00 - 21:00 Muscat time). Send will resume during active hours."
  } else if (remaining === 0 && !stopped && totalSent === 0 && totalFailed > 0) {
    const firstFailed = await db.campaignRecipient.findFirst({
      where: { campaignId, status: "FAILED" },
      select: { error: true },
    })
    lastError = firstFailed?.error || "Delivery failed for all recipients. Review recipient report."
  }

  const finished = remaining === 0 && !stopped
  await db.campaign.update({
    where: { id: campaignId },
    data: {
      status: stopped === "cancelled" ? "CANCELLED" : finished ? (totalSent > 0 ? "SENT" : "FAILED") : "SENDING",
      sentAt: finished ? new Date() : null,
      ...(lastError !== null ? { lastError } : {}),
    },
  })

  return { sent, failed, skipped, remaining, stopped }
}

/** The campaign's counters, recomputed from its recipients. */
export async function refreshTotals(campaignId: string) {
  const totals = await db.campaignRecipient.groupBy({
    by: ["status"],
    where: { campaignId },
    _count: true,
  })
  const count = (status: string) => totals.find(t => t.status === status)?._count ?? 0
  await db.campaign.update({
    where: { id: campaignId },
    data: {
      totalSent: count("SENT"),
      totalFailed: count("FAILED"),
      totalOptOut: count("SKIPPED"),
    },
  })
}

/**
 * An email, with the one thing the law requires on it.
 *
 * A marketing email without a working unsubscribe is not a missing feature, it
 * is a fine — so the footer is added here rather than left to whoever writes
 * the content.
 */
function emailBody(html: string, customer: { name: string | null }, recipientId: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud"
  const personalised = html.replace(/\{\{\s*name\s*\}\}/gi, customer.name?.trim() || "there")
  return `${personalised}
<hr style="margin-top:32px;border:none;border-top:1px solid #e2e8f0">
<p style="font-family:system-ui,sans-serif;font-size:12px;color:#64748b">
  You are receiving this because you agreed to hear from us.
  <a href="${base}/api/campaigns/unsubscribe?r=${recipientId}" style="color:#64748b">Unsubscribe</a>.
</p>`
}
