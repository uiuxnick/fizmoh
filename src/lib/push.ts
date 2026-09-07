import { getConfigValue } from "@/lib/app-config"
import { db } from "@/lib/db"

/**
 * Sends a push notification to staff through OneSignal.
 *
 * Used for alerts that must arrive when nobody has the panel open — a new
 * customer message at night, a payment waiting on verification.
 * Strictly tenant-isolated: if tenantId is supplied, only staff belonging
 * to that specific workspace are notified.
 */
export async function sendPush(input: {
  title: string
  message: string
  /** Where clicking the notification should land. */
  url?: string
  /** Target workspace. When supplied, resolves members to prevent cross-tenant leakage. */
  tenantId?: string
  /** Staff ids to target. Omitted means everyone belonging to the workspace. */
  staffIds?: string[]
}): Promise<{ sent: boolean; error?: string }> {
  const [appId, restKey] = await Promise.all([
    getConfigValue("onesignal_app_id"),
    getConfigValue("onesignal_rest_key"),
  ])

  if (!appId || !restKey) {
    return { sent: false, error: "Push is not configured" }
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud"

  let targetStaffIds = input.staffIds
  if (!targetStaffIds && input.tenantId) {
    try {
      const members = await db.tenantMember.findMany({
        where: { tenantId: input.tenantId },
        select: { staffId: true },
      })
      targetStaffIds = members.map(m => m.staffId)
      // If this tenant has no members registered, do NOT broadcast to other workspaces
      if (targetStaffIds.length === 0) return { sent: false }
    } catch {
      return { sent: false }
    }
  }

  try {
    const response = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${restKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        headings: { en: input.title },
        contents: { en: input.message },
        url: input.url ? `${base}${input.url}` : `${base}/whatsapp`,
        ...(targetStaffIds && targetStaffIds.length > 0
          ? { include_aliases: { external_id: targetStaffIds }, target_channel: "push" }
          : input.tenantId
            ? { include_aliases: { external_id: ["none_target"] }, target_channel: "push" }
            : { included_segments: ["Subscribed Users"] }),
      }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      console.error("OneSignal send failed:", response.status, detail.slice(0, 300))
      return { sent: false, error: `OneSignal returned ${response.status}` }
    }

    return { sent: true }
  } catch (error) {
    console.error("OneSignal send error:", error)
    return { sent: false, error: "Could not reach OneSignal" }
  }
}
