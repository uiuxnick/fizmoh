import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"
import { createAuditLog } from "@/lib/slots-server"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "PLATFORM", "MANAGER", "MARKETING"]
const AUTOMATIC_MODE_ROLES = ["OWNER", "SUPER_ADMIN", "PLATFORM"]
const CHANNELS = ["FACEBOOK", "INSTAGRAM"]
const MODES = ["MANUAL_APPROVAL", "AUTOMATIC", "DRAFT_ONLY"]
const TONES = ["professional", "friendly", "casual", "luxury", "short", "custom"]

function defaults(channel: string) {
  return {
    channel, enabled: false, dmAutoReplyEnabled: true, commentAutoReplyEnabled: false,
    mode: "MANUAL_APPROVAL", fullyAutomaticConfirmedByOwner: false,
    tone: "professional", customTone: null,
    businessHoursStart: "09:00", businessHoursEnd: "18:00", timezone: "Asia/Muscat", replyDelaySeconds: 0,
    dailyMessageLimit: 200, hourlyMessageLimit: 40,
    welcomeMessage: null, awayMessage: null, fallbackReply: null, requireApproval: true,
    businessInfo: {}, customInstructions: null, handoffKeywords: [], excludedKeywords: [],
  }
}

export const GET = withErrors(withModule("SOCIAL_INBOX", async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  const channel = new URL(request.url).searchParams.get("channel") || "FACEBOOK"
  if (!CHANNELS.includes(channel)) return NextResponse.json({ error: "Unknown channel" }, { status: 400 })

  const settings = await db.socialAutomationSettings.findUnique({ where: { tenantId_channel: { tenantId: tenant.tenantId, channel } } })
  return NextResponse.json({ settings: settings || defaults(channel) })
}))

export const PUT = withErrors(withModule("SOCIAL_INBOX", async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only marketing or workspace administrators can change automation settings" }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const channel = String(body?.channel || "")
  if (!CHANNELS.includes(channel)) return NextResponse.json({ error: "Unknown channel" }, { status: 400 })

  if (body.mode === "AUTOMATIC" && tenant.role && !AUTOMATIC_MODE_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only an owner or super admin can enable fully automatic publishing" }, { status: 403 })
  }
  // The owner-confirmation flag can only ever be set true by an owner/super
  // admin's own request — never inherited from a previous save by someone else.
  const fullyAutomaticConfirmedByOwner = body.fullyAutomaticConfirmedByOwner === true && tenant.role ? AUTOMATIC_MODE_ROLES.includes(tenant.role) : false

  const data: Record<string, unknown> = {}
  if ("fullyAutomaticConfirmedByOwner" in body) data.fullyAutomaticConfirmedByOwner = fullyAutomaticConfirmedByOwner
  if (typeof body.enabled === "boolean") data.enabled = body.enabled
  if (typeof body.dmAutoReplyEnabled === "boolean") data.dmAutoReplyEnabled = body.dmAutoReplyEnabled
  if (typeof body.commentAutoReplyEnabled === "boolean") data.commentAutoReplyEnabled = body.commentAutoReplyEnabled
  if (MODES.includes(body.mode)) data.mode = body.mode
  if (TONES.includes(body.tone)) data.tone = body.tone
  if ("customTone" in body) data.customTone = body.customTone ? String(body.customTone).slice(0, 500) : null
  for (const key of ["businessHoursStart", "businessHoursEnd"]) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body[key])) return NextResponse.json({ error: "Hours must use HH:MM" }, { status: 400 })
      data[key] = body[key]
    }
  }
  if (typeof body.timezone === "string") {
    try { new Intl.DateTimeFormat("en", { timeZone: body.timezone }).format() } catch { return NextResponse.json({ error: "Choose a valid timezone" }, { status: 400 }) }
    data.timezone = body.timezone
  }
  if (Number.isFinite(Number(body.replyDelaySeconds))) data.replyDelaySeconds = Math.max(0, Math.min(3600, Math.floor(Number(body.replyDelaySeconds))))
  if (Number.isFinite(Number(body.dailyMessageLimit))) data.dailyMessageLimit = Math.max(1, Math.min(5000, Number(body.dailyMessageLimit)))
  if (Number.isFinite(Number(body.hourlyMessageLimit))) data.hourlyMessageLimit = Math.max(1, Math.min(1000, Number(body.hourlyMessageLimit)))
  if ("welcomeMessage" in body) data.welcomeMessage = body.welcomeMessage ? String(body.welcomeMessage).slice(0, 1000) : null
  if ("awayMessage" in body) data.awayMessage = body.awayMessage ? String(body.awayMessage).slice(0, 1000) : null
  if ("fallbackReply" in body) data.fallbackReply = body.fallbackReply ? String(body.fallbackReply).slice(0, 1000) : null
  if (typeof body.requireApproval === "boolean") data.requireApproval = body.requireApproval
  if (body.businessInfo && typeof body.businessInfo === "object") data.businessInfo = body.businessInfo
  if ("customInstructions" in body) data.customInstructions = body.customInstructions ? String(body.customInstructions).slice(0, 2000) : null
  if (Array.isArray(body.handoffKeywords)) data.handoffKeywords = body.handoffKeywords.map(String).slice(0, 50)
  if (Array.isArray(body.excludedKeywords)) data.excludedKeywords = body.excludedKeywords.map(String).slice(0, 50)

  const settings = await db.socialAutomationSettings.upsert({
    where: { tenantId_channel: { tenantId: tenant.tenantId, channel } },
    create: { tenantId: tenant.tenantId, ...defaults(channel), ...data },
    update: data,
  })

  await createAuditLog({ staffId: tenant.staffId, action: "SOCIAL_SETTINGS_UPDATED", entity: "SocialAutomationSettings", entityId: settings.id, details: { channel, ...data } })
  return NextResponse.json({ settings })
}))
