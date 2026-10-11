import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant-context"
import { PLATFORM } from "@/lib/tenant"

/**
 * Which events raise an alert.
 *
 * The settings screen had these as six switches with `defaultChecked` and no
 * handler: they moved, saved nothing, and every alert fired regardless. Staff
 * who muted something kept receiving it.
 */
export const KEY = "notification_preferences"

export const NOTIFICATION_TYPES = {
  NEW_BOOKING: { label: "New booking", description: "When a booking is created on the site or over WhatsApp" },
  PAYMENT_SUBMITTED: { label: "Payment submitted", description: "When a customer uploads a transfer screenshot" },
  PAYMENT_APPROVED: { label: "Payment approved", description: "When a payment is verified and the booking confirmed" },
  NEW_MESSAGE: { label: "New WhatsApp message", description: "When a customer writes in" },
  LOW_CAPACITY: { label: "Low capacity", description: "When a departure is nearly full" },
  SLA_BREACH: { label: "Unanswered chat", description: "When a conversation goes unanswered too long" },
} as const

const DEFAULTS = Object.fromEntries(Object.keys(NOTIFICATION_TYPES).map(k => [k, true]))

export async function getNotificationPrefs(tenantIdOverride?: string): Promise<Record<string, boolean>> {
  const tenantId = tenantIdOverride ?? currentTenant()?.tenantId ?? PLATFORM
  try {
    const row = await db.systemSetting.findUnique({
      where: { tenantId_key: { tenantId, key: KEY } },
      select: { value: true },
    })
    if (!row?.value) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(row.value) }
  } catch {
    // An unreadable preference must not silence alerts.
    return DEFAULTS
  }
}

