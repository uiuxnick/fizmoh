import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { isWhatsAppGroupsEnabled } from "./service"

const GROUP_WEBHOOK_FIELDS = new Set([
  "group_lifecycle_update",
  "group_participants_update",
  "group_settings_update",
  "group_status_update",
])

export function isGroupWebhookField(field: string | undefined | null): boolean {
  return !!field && GROUP_WEBHOOK_FIELDS.has(field)
}

export function isGroupInboundMessage(msg: any): boolean {
  if (!msg || typeof msg !== "object") return false
  if (msg.group_id || msg.context?.group_id || msg.recipient_type === "group") return true
  if (typeof msg.from === "string" && msg.from.endsWith("@g.us")) return true
  return false
}

export function extractGroupMessageText(msg: any): { type: string; body: string | null; mediaRef: string | null } {
  const type = String(msg?.type || "text").toLowerCase()
  if (type === "text") {
    return { type: "text", body: msg.text?.body || "", mediaRef: null }
  }
  if (type === "image" || type === "video" || type === "document" || type === "audio") {
    const media = msg[type] || {}
    return {
      type,
      body: media.caption || `[${type}]`,
      mediaRef: media.id || media.link || null,
    }
  }
  return { type, body: `[${type}]`, mediaRef: null }
}

/**
 * Processes Meta Groups webhook events & inbound group messages.
 * Completely isolated from 1:1 conversations/tickets/bots and idempotent by wa_message_id.
 */
export async function processGroupWebhookChange(change: any): Promise<boolean> {
  if (!isWhatsAppGroupsEnabled()) return false

  const field = change?.field
  const val = change?.value || {}
  const tenantId = currentTenant()?.tenantId || null
  const phoneNumberId = val?.metadata?.phone_number_id || ""

  // 1. Group lifecycle / settings / status updates
  if (field === "group_lifecycle_update" || field === "group_settings_update" || field === "group_status_update") {
    const events = Array.isArray(val.groups) ? val.groups : val.group_id ? [val] : []
    for (const ev of events) {
      const groupId = String(ev.group_id || ev.id || "")
      if (!groupId) continue

      const eventType = String(ev.type || ev.event || "").toLowerCase()
      const isDeleted = eventType.includes("delete") || ev.status === "DELETED"

      await db.waGroup.upsert({
        where: { groupId },
        update: {
          ...(ev.subject ? { subject: ev.subject } : {}),
          ...(ev.description !== undefined ? { description: ev.description } : {}),
          ...(ev.join_approval_mode ? { joinApprovalMode: ev.join_approval_mode } : {}),
          ...(ev.invite_link ? { inviteLink: ev.invite_link } : {}),
          ...(isDeleted ? { status: "DELETED" } : {}),
        },
        create: {
          tenantId,
          groupId,
          phoneNumberId,
          subject: ev.subject || "WhatsApp Group",
          description: ev.description || null,
          joinApprovalMode: ev.join_approval_mode || "auto_approve",
          inviteLink: ev.invite_link || null,
          status: isDeleted ? "DELETED" : "ACTIVE",
        },
      })
    }
    return true
  }

  // 2. Group participants & join request updates
  if (field === "group_participants_update") {
    const events = Array.isArray(val.groups) ? val.groups : val.group_id ? [val] : []
    for (const ev of events) {
      const groupId = String(ev.group_id || ev.id || "")
      if (!groupId) continue

      const group = await db.waGroup.upsert({
        where: { groupId },
        update: {},
        create: {
          tenantId,
          groupId,
          phoneNumberId,
          subject: ev.subject || "WhatsApp Group",
          status: "ACTIVE",
        },
      })

      const participants = Array.isArray(ev.participants) ? ev.participants : []
      for (const p of participants) {
        const waId = String(p.wa_id || p.user || "").replace(/[^\d]/g, "")
        if (!waId) continue

        const action = String(p.type || p.action || ev.type || "").toLowerCase()
        const status =
          action.includes("join_request") || action === "requested" ? "requested"
          : action.includes("remove") || action.includes("leave") ? "removed"
          : action.includes("reject") ? "rejected"
          : "joined"

        await db.waGroupParticipant.upsert({
          where: { groupRef_waId: { groupRef: group.id, waId } },
          update: {
            status,
            ...(p.join_request_id ? { joinRequestId: String(p.join_request_id) } : {}),
            ...(status === "joined" ? { joinedAt: new Date() } : {}),
          },
          create: {
            tenantId: group.tenantId,
            groupRef: group.id,
            waId,
            joinRequestId: p.join_request_id ? String(p.join_request_id) : null,
            status,
            joinedAt: status === "joined" ? new Date() : null,
          },
        })
      }
    }
    return true
  }

  return false
}

export async function processInboundGroupMessage(msg: any, metadata?: any): Promise<boolean> {
  if (!isWhatsAppGroupsEnabled() || !isGroupInboundMessage(msg)) return false

  const groupId = String(msg.group_id || msg.context?.group_id || msg.from || "")
  if (!groupId) return false

  const waMessageId = msg.id ? String(msg.id) : null
  if (waMessageId) {
    const existing = await db.waGroupMessage.findUnique({ where: { waMessageId } })
    if (existing) return true // Idempotent dedupe
  }

  const tenantId = currentTenant()?.tenantId || null
  const group = await db.waGroup.upsert({
    where: { groupId },
    update: {},
    create: {
      tenantId,
      groupId,
      phoneNumberId: String(metadata?.phone_number_id || ""),
      subject: "WhatsApp Group",
      status: "ACTIVE",
    },
  })

  const { type, body, mediaRef } = extractGroupMessageText(msg)
  const senderWaId = msg.from ? String(msg.from).replace(/[^\d]/g, "") : null
  const ts = msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date()

  await db.waGroupMessage.create({
    data: {
      tenantId: group.tenantId,
      groupRef: group.id,
      waMessageId,
      senderWaId,
      direction: "INBOUND",
      type,
      body,
      mediaRef,
      status: "RECEIVED",
      timestamp: isNaN(ts.getTime()) ? new Date() : ts,
    },
  })

  return true
}
