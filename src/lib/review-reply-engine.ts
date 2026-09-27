/**
 * Orchestrates the review auto-reply lifecycle for one tenant: fetch new
 * reviews, generate replies, route them per settings, publish what's due,
 * retry what failed.
 *
 * Called two ways:
 *   - `runReviewAutoReplyForTenant()` — the scheduled sweep, one call per
 *     tenant from /api/cron/route.ts's forEachTenant loop, already inside
 *     that tenant's withTenant scope so every `db.*` call here is
 *     automatically tenant-scoped by the extension in db.ts.
 *   - `approveAndPublish()` / `retryReply()` — a person clicking a button in
 *     the review inbox, resolved to a tenant via the same
 *     tenant-from-row-then-withTenant pattern the public QR routes use.
 *
 * Every write here is idempotent: a review already seen (by its unique
 * googleReviewName) is never re-created, and a reply already PUBLISHED is
 * never re-sent — the status column is the guard, checked before every
 * Google call, not just recorded after one.
 */

import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { createAuditLog } from "@/lib/slots-server"
import { listLocationReviews, publishReviewReply, isApiFailure } from "@/lib/google-business-reviews"
import { listGoogleLocations } from "@/lib/google-business-sync"
import { generateReply, detectEscalation, decideRoute, nextRetryDelayMinutes, type ReplyMode, type Tone, type ReplyLength } from "@/lib/review-reply-ai"
import { computeScheduledFor } from "@/lib/review-reply-schedule"

const MAX_PAGES_PER_LOCATION = 3 // ~150 reviews/location/run — bounded, not a full historical backfill every sweep

export interface SweepStats { fetched: number; generated: number; published: number; failed: number; skipped: number }

function todayRange(now: Date) {
  const start = new Date(now); start.setUTCHours(0, 0, 0, 0)
  const end = new Date(start.getTime() + 24 * 60 * 60_000)
  return { start, end }
}

async function loadSettings() {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return null
  return db.reviewReplySettings.findUnique({ where: { tenantId: tenant.tenantId } })
}

/**
 * Returns distinct Google locations connected via campaigns or the tenant's Google Integration.
 * If targetLocationId is provided, returns [targetLocationId].
 */
async function connectedLocations(targetLocationId?: string): Promise<string[]> {
  if (targetLocationId) return [targetLocationId]

  const locSet = new Set<string>()

  // 1. Locations from QR campaigns
  const rows = await db.qrCampaign.findMany({
    where: { googleLocationId: { not: null } },
    select: { googleLocationId: true },
    distinct: ["googleLocationId"],
  })
  for (const r of rows) {
    if (r.googleLocationId) locSet.add(r.googleLocationId)
  }

  // 2. Also query all locations under the connected Google Business account
  const tenant = currentTenant()
  if (tenant?.tenantId) {
    const integration = await db.googleIntegration.findUnique({ where: { tenantId: tenant.tenantId } })
    if (integration?.googleAccountId) {
      const res = await listGoogleLocations(integration.googleAccountId)
      if (res.ok && res.locations) {
        for (const loc of res.locations) {
          locSet.add(loc.id)
        }
      }
    }
  }

  return Array.from(locSet)
}

interface ReviewReplySettingsLike {
  enabled: boolean
  mode: string
  tone: string
  customTone: string | null
  replyLength: string
  delayMode: string
  delayMinutes: number | null
  businessHoursStart: string | null
  businessHoursEnd: string | null
  timezone: string
  autoPublishMinRating: number
  requireApprovalBelow: number
  escalationKeywords?: unknown
  signature: string | null
  languages?: unknown
  excludedWords?: unknown
  maxRepliesPerDay: number
}

async function ingestReviews(locationId: string): Promise<number> {
  let fetched = 0
  let pageToken: string | undefined
  for (let page = 0; page < MAX_PAGES_PER_LOCATION; page++) {
    const result = await listLocationReviews(locationId, pageToken)
    if (isApiFailure(result)) {
      console.error("Review fetch failed for", locationId, "-", result.error)
      break
    }
    for (const raw of result.reviews) {
      const existing = await db.googleReview.findUnique({ where: { googleReviewName: raw.name }, include: { reply: true } })
      if (existing) {
        if (raw.alreadyReplied && raw.replyComment && existing.reply && !existing.reply.finalText) {
          await db.replyLog.update({
            where: { id: existing.reply.id },
            data: { finalText: raw.replyComment },
          })
        }
        continue // already ingested — never duplicated, never re-created
      }

      const tenant = currentTenant()
      if (!tenant?.tenantId) break
      const review = await db.googleReview.create({
        data: {
          tenantId: tenant.tenantId,
          googleLocationId: locationId,
          googleReviewName: raw.name,
          reviewerName: raw.reviewerName,
          rating: raw.rating,
          comment: raw.comment,
          createTime: new Date(raw.createTime),
          updateTime: raw.updateTime ? new Date(raw.updateTime) : null,
          alreadyRepliedOnGoogle: raw.alreadyReplied,
        },
      })
      await db.replyLog.create({
        data: {
          tenantId: tenant.tenantId,
          reviewId: review.id,
          status: raw.alreadyReplied ? "SKIPPED" : "NEW",
          skipReason: raw.alreadyReplied ? "This review already has a reply on Google, made outside this platform." : null,
          finalText: raw.alreadyReplied && raw.replyComment ? raw.replyComment : null,
        },
      })
      fetched++
    }
    pageToken = result.nextPageToken || undefined
    if (!pageToken) break
  }
  return fetched
}

/** Reply-count published today, for the daily cap — computed fresh, then tracked in memory across one sweep. */
async function publishedToday(): Promise<number> {
  const { start, end } = todayRange(new Date())
  return db.replyLog.count({ where: { status: "PUBLISHED", publishedAt: { gte: start, lt: end } } })
}

async function generateForNewReviews(settings: ReviewReplySettingsLike, businessName: string): Promise<{ generated: number; published: number; failed: number }> {
  const pending = await db.replyLog.findMany({
    where: { status: "NEW" },
    include: { review: true },
    take: 100,
  })
  let generated = 0, published = 0, failed = 0
  let dailyCount = await publishedToday()
  const languages = Array.isArray(settings.languages) ? (settings.languages as string[]) : ["en"]
  const excludedWords = Array.isArray(settings.excludedWords) ? (settings.excludedWords as string[]) : []
  const extraKeywords = Array.isArray(settings.escalationKeywords) ? (settings.escalationKeywords as string[]) : []

  for (const row of pending) {
    const escalation = detectEscalation(row.review.comment, extraKeywords)
    const route = decideRoute({
      rating: row.review.rating,
      escalation,
      mode: settings.mode as ReplyMode,
      autoPublishMinRating: settings.autoPublishMinRating,
      requireApprovalBelow: settings.requireApprovalBelow,
      dailyPublishedCount: dailyCount,
      maxRepliesPerDay: settings.maxRepliesPerDay,
    })

    let text = ""
    try {
      text = await generateReply({
        reviewText: row.review.comment,
        rating: row.review.rating,
        reviewerName: row.review.reviewerName,
        businessName,
        tone: settings.tone as Tone,
        customTone: settings.customTone,
        replyLength: settings.replyLength as ReplyLength,
        language: languages[0] || "en",
        signature: settings.signature,
        excludedWords,
      })
    } catch (error) {
      console.error("Reply generation failed for review", row.review.id, "-", error)
      await db.replyLog.update({ where: { id: row.id }, data: { status: "FAILED", failReason: error instanceof Error ? error.message : "Generation failed" } })
      failed++
      continue
    }
    generated++

    const baseUpdate = { generatedText: text, finalText: text }

    if (route.action === "ESCALATED") {
      await db.replyLog.update({ where: { id: row.id }, data: { ...baseUpdate, status: "ESCALATED", escalationReason: route.reason } })
      continue
    }
    if (route.action === "DRAFT") {
      await db.replyLog.update({ where: { id: row.id }, data: { ...baseUpdate, status: "DRAFT" } })
      continue
    }
    if (route.action === "PENDING_APPROVAL") {
      await db.replyLog.update({ where: { id: row.id }, data: { ...baseUpdate, status: "PENDING_APPROVAL", escalationReason: route.reason } })
      continue
    }

    // AUTO_PUBLISH
    const scheduledFor = computeScheduledFor(new Date(), {
      delayMode: settings.delayMode as "immediate" | "delay" | "business_hours" | "custom_schedule",
      delayMinutes: settings.delayMinutes,
      businessHoursStart: settings.businessHoursStart,
      businessHoursEnd: settings.businessHoursEnd,
      timezone: settings.timezone,
    })
    await db.replyLog.update({
      where: { id: row.id },
      data: { ...baseUpdate, status: "APPROVED", approvedAt: new Date(), scheduledFor },
    })
    if (scheduledFor.getTime() <= Date.now()) {
      const ok = await publishOne(row.id, row.review.googleReviewName, text)
      if (ok) { published++; dailyCount++ } else { failed++ }
    }
  }
  return { generated, published, failed }
}

async function publishOne(replyLogId: string, googleReviewName: string, text: string): Promise<boolean> {
  const result = await publishReviewReply(googleReviewName, text)
  if (isApiFailure(result)) {
    const current = await db.replyLog.findUnique({ where: { id: replyLogId } })
    const retryCount = (current?.retryCount || 0) + 1
    const delay = nextRetryDelayMinutes(retryCount - 1)
    await db.replyLog.update({
      where: { id: replyLogId },
      data: {
        status: "FAILED",
        failReason: result.error,
        retryCount,
        nextRetryAt: delay ? new Date(Date.now() + delay * 60_000) : null,
      },
    })
    await createAuditLog({ action: "REVIEW_REPLY_FAILED", entity: "ReplyLog", entityId: replyLogId, details: { error: result.error } })
    return false
  }
  await db.replyLog.update({ where: { id: replyLogId }, data: { status: "PUBLISHED", publishedAt: new Date() } })
  await createAuditLog({ action: "REVIEW_REPLY_PUBLISHED", entity: "ReplyLog", entityId: replyLogId })
  return true
}

async function retryDueFailures(): Promise<{ published: number; failed: number }> {
  const due = await db.replyLog.findMany({
    where: { status: "FAILED", nextRetryAt: { lte: new Date() } },
    include: { review: true },
    take: 50,
  })
  let published = 0, failed = 0
  for (const row of due) {
    if (!row.finalText) continue
    const ok = await publishOne(row.id, row.review.googleReviewName, row.finalText)
    if (ok) published++; else failed++
  }
  return { published, failed }
}

async function publishDueApprovals(): Promise<{ published: number; failed: number }> {
  const due = await db.replyLog.findMany({
    where: { status: "APPROVED", scheduledFor: { lte: new Date() } },
    include: { review: true },
    take: 50,
  })
  let published = 0, failed = 0
  for (const row of due) {
    if (!row.finalText) continue
    const ok = await publishOne(row.id, row.review.googleReviewName, row.finalText)
    if (ok) published++; else failed++
  }
  return { published, failed }
}

/** The full per-tenant sweep — fetches reviews, generates AI replies, and publishes/schedules per settings. */
export async function runReviewAutoReplyForTenant(targetLocationId?: string): Promise<SweepStats> {
  const settings = await loadSettings()

  const tenant = currentTenant()
  const tenantRow = tenant?.tenantId ? await db.tenant.findUnique({ where: { id: tenant.tenantId }, select: { name: true } }) : null

  let fetched = 0
  const locations = await connectedLocations(targetLocationId)
  for (const locationId of locations) {
    fetched += await ingestReviews(locationId)
  }

  // If user explicitly disabled auto-reply in settings, reviews are fetched and shown, but we don't generate/publish
  if (settings && !settings.enabled) {
    return { fetched, generated: 0, published: 0, failed: 0, skipped: 0 }
  }

  // Safe fallback settings if tenant hasn't saved the settings form yet
  const effectiveSettings: ReviewReplySettingsLike = settings ?? {
    enabled: true,
    mode: "MANUAL_APPROVAL",
    tone: "professional",
    customTone: null,
    replyLength: "medium",
    delayMode: "immediate",
    delayMinutes: null,
    businessHoursStart: "09:00",
    businessHoursEnd: "18:00",
    timezone: "Asia/Muscat",
    autoPublishMinRating: 5,
    requireApprovalBelow: 5, // Requires approval so nothing publishes automatically without human click
    escalationKeywords: [],
    signature: tenantRow?.name ? `— The ${tenantRow.name} Team` : null,
    languages: ["en"],
    excludedWords: [],
    maxRepliesPerDay: 50,
  }

  const { generated, published: publishedNow, failed: failedNow } = await generateForNewReviews(effectiveSettings, tenantRow?.name || "")
  const dueApprovals = await publishDueApprovals()
  const retried = await retryDueFailures()

  return {
    fetched,
    generated,
    published: publishedNow + dueApprovals.published + retried.published,
    failed: failedNow + dueApprovals.failed + retried.failed,
    skipped: 0,
  }
}

/** A person clicking Approve & Publish in the inbox — always publishes immediately, ignoring delay settings, because a human just chose the moment. */
export async function approveAndPublish(replyLogId: string, staffId: string, textOverride?: string): Promise<{ ok: boolean; error?: string }> {
  const row = await db.replyLog.findUnique({ where: { id: replyLogId }, include: { review: true } })
  if (!row) return { ok: false, error: "No such reply" }
  if (row.status === "PUBLISHED" && !textOverride) return { ok: true } // already done — idempotent, not an error

  const text = textOverride?.trim() || row.finalText || row.generatedText
  if (!text) return { ok: false, error: "No reply text to publish" }

  await db.replyLog.update({
    where: { id: replyLogId },
    data: { finalText: text, editedText: textOverride?.trim() || row.editedText, status: "APPROVED", approvedByStaffId: staffId, approvedAt: new Date() },
  })
  await createAuditLog({ staffId, action: "REVIEW_REPLY_APPROVED", entity: "ReplyLog", entityId: replyLogId })

  const ok = await publishOne(replyLogId, row.review.googleReviewName, text)
  return ok ? { ok: true } : { ok: false, error: "Google publish failed — see the reply's fail reason" }
}

/** A person clicking Retry on a failed reply. */
export async function retryReply(replyLogId: string): Promise<{ ok: boolean; error?: string }> {
  const row = await db.replyLog.findUnique({ where: { id: replyLogId }, include: { review: true } })
  if (!row) return { ok: false, error: "No such reply" }
  if (row.status !== "FAILED") return { ok: false, error: "Only a failed reply can be retried" }
  const text = row.finalText || row.generatedText
  if (!text) return { ok: false, error: "No reply text to publish" }
  const ok = await publishOne(replyLogId, row.review.googleReviewName, text)
  return ok ? { ok: true } : { ok: false, error: "Google publish failed again — see the reply's fail reason" }
}
