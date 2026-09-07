import { db } from "@/lib/db"
import { alertPayload, callPayload, isApnsConfigured, sendPush } from "@/lib/apns"

/**
 * Telling the staff's phones about things.
 * Strictly tenant-isolated: queries device tokens belonging only to staff of that workspace.
 */

export interface Audience {
  /** Target workspace. Only staff belonging to this workspace receive the push. */
  tenantId?: string
  /** Only these specific people. */
  staffIds?: string[]
  /** Somebody already looking at this conversation does not need telling. */
  exceptStaffId?: string
}

async function devicesFor(audience: Audience, kind: "ALERT" | "VOIP") {
  let staffIds = audience.staffIds

  if (!staffIds && audience.tenantId) {
    try {
      const members = await db.tenantMember.findMany({
        where: { tenantId: audience.tenantId },
        select: { staffId: true },
      })
      staffIds = members.map(m => m.staffId)
      if (staffIds.length === 0) return []
    } catch {
      return []
    }
  }

  return db.deviceToken.findMany({
    where: {
      kind,
      ...(staffIds ? { staffId: { in: staffIds } } : audience.tenantId ? { staffId: "none_target" } : {}),
      ...(audience.exceptStaffId ? { NOT: { staffId: audience.exceptStaffId } } : {}),
    },
  })
}

async function drop(tokens: string[]) {
  if (tokens.length === 0) return
  await db.deviceToken.deleteMany({ where: { token: { in: tokens } } }).catch(() => {})
}

/** A message arrived. */
export async function pushMessage(params: {
  title: string
  body: string
  conversationId: string
  messageId?: string
  tenantId?: string
  audience?: Audience
}): Promise<{ sent: number; failed: number }> {
  if (!isApnsConfigured()) return { sent: 0, failed: 0 }

  const effectiveAudience: Audience = {
    ...(params.tenantId ? { tenantId: params.tenantId } : {}),
    ...(params.audience ?? {}),
  }

  const devices = await devicesFor(effectiveAudience, "ALERT")
  if (devices.length === 0) return { sent: 0, failed: 0 }

  const payload = alertPayload({
    title: params.title,
    body: params.body,
    conversationId: params.conversationId,
    messageId: params.messageId,
  })

  let sent = 0
  const dead: string[] = []

  await Promise.all(
    devices.map(async device => {
      const result = await sendPush({
        deviceToken: device.token,
        payload,
        type: "alert",
        collapseId: params.conversationId,
      })
      if (result.ok) sent++
      else if (result.expired) dead.push(device.token)
    }),
  )

  await drop(dead)
  return { sent, failed: devices.length - sent }
}

export async function pushAlert(params: {
  title: string
  body: string
  type: string
  conversationId?: string
  tenantId?: string
  audience?: Audience
}): Promise<{ sent: number }> {
  const result = await pushMessage({
    title: params.title,
    body: params.body,
    conversationId: params.conversationId ?? "",
    tenantId: params.tenantId,
    audience: params.audience,
  })
  return { sent: result.sent }
}

export async function pushIncomingCall(params: {
  callId: string
  conversationId: string
  customerName: string
  from: string
  offer: string
  tenantId?: string
  audience?: Audience
}): Promise<{ sent: number }> {
  if (!isApnsConfigured()) return { sent: 0 }

  const effectiveAudience: Audience = {
    ...(params.tenantId ? { tenantId: params.tenantId } : {}),
    ...(params.audience ?? {}),
  }

  const devices = await devicesFor(effectiveAudience, "VOIP")
  if (devices.length === 0) return { sent: 0 }

  const payload = callPayload(params)
  let sent = 0
  const dead: string[] = []

  await Promise.all(
    devices.map(async device => {
      const result = await sendPush({ deviceToken: device.token, payload, type: "voip" })
      if (result.ok) sent++
      else if (result.expired) dead.push(device.token)
    }),
  )

  await drop(dead)
  return { sent }
}
