import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { PLATFORM } from "@/lib/tenant"

/**
 * Which events raise an alert.
 *
 * The settings screen had these as six switches with `defaultChecked` and no
 * handler: they moved, saved nothing, and every alert fired regardless. Staff
 * who muted something kept receiving it.
 */
const KEY = "notification_preferences"

export const NOTIFICATION_TYPES = {
  NEW_BOOKING: { label: "New booking", description: "When a booking is created on the site or over WhatsApp" },
  PAYMENT_SUBMITTED: { label: "Payment submitted", description: "When a customer uploads a transfer screenshot" },
  PAYMENT_APPROVED: { label: "Payment approved", description: "When a payment is verified and the booking confirmed" },
  NEW_MESSAGE: { label: "New WhatsApp message", description: "When a customer writes in" },
  LOW_CAPACITY: { label: "Low capacity", description: "When a departure is nearly full" },
  SLA_BREACH: { label: "Unanswered chat", description: "When a conversation goes unanswered too long" },
} as const

const DEFAULTS = Object.fromEntries(Object.keys(NOTIFICATION_TYPES).map(k => [k, true]))

export async function getNotificationPrefs(): Promise<Record<string, boolean>> {
  try {
    const row = await db.systemSetting.findFirst({ where: { key: KEY }, select: { value: true } })
    if (!row?.value) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(row.value) }
  } catch {
    // An unreadable preference must not silence alerts.
    return DEFAULTS
  }
}

export const GET = withErrors(async () => {
  const prefs = await getNotificationPrefs()
  const types = Object.entries(NOTIFICATION_TYPES).map(([key, meta]) => ({
    key, ...meta, enabled: prefs[key] !== false,
  }))
  return NextResponse.json({ types })
})

export const PUT = withErrors(async (request: NextRequest) => {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const current = await getNotificationPrefs()
  const next = { ...current }
  for (const [key, value] of Object.entries(body)) {
    if (key in NOTIFICATION_TYPES) next[key] = value === true
  }

  await db.systemSetting.upsert({
    where: { tenantId_key: { tenantId: PLATFORM, key: KEY } },
    update: { value: JSON.stringify(next), type: "JSON", category: "NOTIFICATIONS" },
    create: { key: KEY, value: JSON.stringify(next), type: "JSON", category: "NOTIFICATIONS" },
  })

  return NextResponse.json({ preferences: next })
})
