import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"
import { createAuditLog } from "@/lib/slots-server"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "MANAGER", "MARKETING"]
/** Only these can flip mode to AUTOMATIC — full unattended publishing to a public review is not a routine settings change. */
const AUTOMATIC_MODE_ROLES = ["OWNER", "SUPER_ADMIN"]

const MODES = ["MANUAL_APPROVAL", "AUTOMATIC", "DRAFT_ONLY"]
const TONES = ["professional", "warm", "formal", "casual", "luxury", "custom"]
const LENGTHS = ["short", "medium", "detailed"]
const DELAY_MODES = ["immediate", "delay", "business_hours", "custom_schedule"]

/**
 * Shown to a workspace that has never opened this screen — filled in and
 * switched on, so "Save settings" alone is enough to go live, rather than
 * making an operator assemble a working configuration from blank fields.
 *
 * This is what a first visit *shows*, not what silently happens in the
 * background: nothing is written to the database, and no tenant already
 * using the platform has this pushed onto them, until a person with
 * permission actually opens Settings and clicks Save — the AUTOMATIC-mode
 * role check below still applies at that point. Turning this on for every
 * existing tenant's real Google listing without any of them asking for it
 * is a different, much bigger decision than defaulting a form.
 */
const DEFAULTS = {
  enabled: true, mode: "AUTOMATIC",
  tone: "professional", customTone: null, replyLength: "medium",
  delayMode: "immediate", delayMinutes: null, businessHoursStart: "09:00", businessHoursEnd: "18:00", timezone: "Asia/Muscat",
  // 1-3 star reviews still always require approval, per spec — a friendlier
  // default is not the same as removing the one rule the whole module exists
  // to enforce.
  autoPublishMinRating: 4, requireApprovalBelow: 4,
  escalationKeywords: [], signature: null, languages: ["en"], templates: {}, excludedWords: [], maxRepliesPerDay: 50,
}

export const GET = withErrors(withModule("DIGITAL_QR", async () => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })

  const settings = await db.reviewReplySettings.findUnique({ where: { tenantId: tenant.tenantId } })
  if (settings) return NextResponse.json({ settings })

  const tenantRow = await db.tenant.findUnique({ where: { id: tenant.tenantId }, select: { name: true } })
  return NextResponse.json({
    settings: { ...DEFAULTS, signature: tenantRow?.name ? `— The ${tenantRow.name} Team` : null },
  })
}))

export const PUT = withErrors(withModule("DIGITAL_QR", async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only marketing or workspace administrators can change review auto-reply settings" }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  if (body.mode === "AUTOMATIC" && tenant.role && !AUTOMATIC_MODE_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only an owner or super admin can enable fully automatic publishing" }, { status: 403 })
  }

  const data: Record<string, unknown> = {}
  if (typeof body.enabled === "boolean") data.enabled = body.enabled
  if (MODES.includes(body.mode)) data.mode = body.mode
  if (TONES.includes(body.tone)) data.tone = body.tone
  if ("customTone" in body) data.customTone = body.customTone ? String(body.customTone).slice(0, 500) : null
  if (LENGTHS.includes(body.replyLength)) data.replyLength = body.replyLength
  if (DELAY_MODES.includes(body.delayMode)) data.delayMode = body.delayMode
  if ("delayMinutes" in body) data.delayMinutes = Number.isFinite(Number(body.delayMinutes)) ? Math.max(0, Number(body.delayMinutes)) : null
  if (typeof body.businessHoursStart === "string") data.businessHoursStart = body.businessHoursStart.slice(0, 5)
  if (typeof body.businessHoursEnd === "string") data.businessHoursEnd = body.businessHoursEnd.slice(0, 5)
  if (typeof body.timezone === "string") data.timezone = body.timezone.slice(0, 60)
  if ([1, 2, 3, 4, 5].includes(Number(body.autoPublishMinRating))) data.autoPublishMinRating = Number(body.autoPublishMinRating)
  if ([1, 2, 3, 4, 5].includes(Number(body.requireApprovalBelow))) data.requireApprovalBelow = Number(body.requireApprovalBelow)
  if (Array.isArray(body.escalationKeywords)) data.escalationKeywords = body.escalationKeywords.map(String).slice(0, 50)
  if ("signature" in body) data.signature = body.signature ? String(body.signature).slice(0, 300) : null
  if (Array.isArray(body.languages) && body.languages.length) data.languages = body.languages.map(String).slice(0, 10)
  if (body.templates && typeof body.templates === "object") data.templates = body.templates
  if (Array.isArray(body.excludedWords)) data.excludedWords = body.excludedWords.map(String).slice(0, 100)
  if (Number.isFinite(Number(body.maxRepliesPerDay))) data.maxRepliesPerDay = Math.max(1, Math.min(500, Number(body.maxRepliesPerDay)))

  const settings = await db.reviewReplySettings.upsert({
    where: { tenantId: tenant.tenantId },
    create: { tenantId: tenant.tenantId, ...DEFAULTS, ...data },
    update: data,
  })

  await createAuditLog({
    staffId: tenant.staffId, action: "REVIEW_REPLY_SETTINGS_UPDATED", entity: "ReviewReplySettings", entityId: settings.id,
    details: data,
  })

  return NextResponse.json({ settings })
}))
