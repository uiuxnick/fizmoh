import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant } from "@/lib/tenant"
import { NextRequest, NextResponse } from "next/server"
import {
  getWhatsAppConfig,
  getWhatsAppConfigSource,
  saveWhatsAppConfig,
  isWhatsAppConfigured,
  type WhatsAppConfig,
} from "@/lib/whatsapp"

/**
 * WhatsApp credential configuration for the admin panel.
 *
 * Secrets are write-only: GET reports whether each one is set and where it came
 * from, never the value.
 *
 * A value saved here overrides the environment. That is deliberate — rotating a
 * token previously meant editing a file on the server, and the file the service
 * actually reads is not the one in the release directory, so the panel could
 * display a credential that was not the one in use.
 */

const SECRET_FIELDS: (keyof WhatsAppConfig)[] = ["accessToken", "appSecret"]
const EDITABLE: (keyof WhatsAppConfig)[] = [
  "accessToken",
  "phoneNumberId",
  "wabaId",
  "phoneNumber",
  "webhookVerifyToken",
  "appSecret",
]

function mask(value: string): string {
  if (!value) return ""
  if (value.length <= 8) return "••••"
  return `${value.slice(0, 4)}••••${value.slice(-4)}`
}

export const GET = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const tenant = currentTenant()
  if (session?.kind !== "staff" || !tenant?.tenantId) {
    return NextResponse.json({ error: "Authentication and workspace context required" }, { status: 401 })
  }
  const config = await getWhatsAppConfig()
  const source = await getWhatsAppConfigSource()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud"

  const fields: Record<string, { set: boolean; source: string; value?: string; masked?: string; envManaged: boolean }> = {}
  for (const field of EDITABLE) {
    const isSecret = SECRET_FIELDS.includes(field)
    fields[field] = {
      set: !!config[field],
      source: source[field],
      envManaged: source[field] === "env",
      // Non-secret identifiers are shown in full so the operator can check
      // them against Meta Business Manager at a glance.
      ...(isSecret ? { masked: mask(config[field]) } : { value: config[field] }),
    }
  }

  return NextResponse.json({
    fields,
    live: await isWhatsAppConfigured(),
    inboundReady: !!config.appSecret,
    webhookUrl: `${baseUrl}/api/whatsapp/webhook`,
  })
})

export const PUT = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const tenant = currentTenant()
  if (session?.kind !== "staff" || !tenant?.tenantId) {
    return NextResponse.json({ error: "Authentication and workspace context required" }, { status: 401 })
  }
  if (tenant.role && !["OWNER", "SUPER_ADMIN", "MANAGER"].includes(tenant.role)) {
    return NextResponse.json({ error: "Only workspace administrators can update WhatsApp settings" }, { status: 403 })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const updates: Partial<WhatsAppConfig> = {}
  const rejected: string[] = []

  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    const field = key as keyof WhatsAppConfig
    if (!EDITABLE.includes(field)) continue
    if (typeof value !== "string") continue
    // A blank submission means "leave this alone" rather than "clear it", so a
    // form that shows a masked secret can be saved without wiping it.
    if (!value.trim()) continue
    updates[field] = value.trim()
  }

  // Saved values now take precedence over the environment, so an edit here
  // actually changes what the system uses. Previously an env-supplied field
  // was refused, which meant every field in production was refused.

  if (Object.keys(updates).length > 0) {
    await saveWhatsAppConfig(updates)
  }

  const config = await getWhatsAppConfig()
  return NextResponse.json({
    saved: Object.keys(updates),
    rejected,
    live: await isWhatsAppConfigured(),
    inboundReady: !!config.appSecret,
  })
})
