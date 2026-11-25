import { db } from "@/lib/db"
import { getWhatsAppConfig } from "@/lib/whatsapp"
import { currentTenant } from "@/lib/tenant"
import { defaultGroupsMetaClient } from "./client"
import {
  GROUP_DESCRIPTION_MAX_LENGTH,
  GROUP_SUBJECT_MAX_LENGTH,
  GroupFeatureError,
  MAX_GROUP_PARTICIPANTS,
  MAX_GROUPS_PER_NUMBER,
  SUPPORTED_GROUP_MESSAGE_TYPES,
  UNSUPPORTED_GROUP_MESSAGE_TYPES,
  type CreateGroupInput,
  type SendGroupMessageInput,
  type SendInviteTemplateInput,
} from "./types"

export function isWhatsAppGroupsEnabled(): boolean {
  return process.env.WHATSAPP_GROUPS_ENABLED === "true"
}

export function getInviteTemplateDefaults() {
  return {
    name: process.env.WHATSAPP_GROUP_INVITE_TEMPLATE_NAME || "group_invite_link",
    lang: process.env.WHATSAPP_GROUP_INVITE_TEMPLATE_LANG || "en",
  }
}

/**
 * Normalize phone number to E.164 digits only (no "+" prefix), as required by Meta Cloud API.
 */
export function normalizeE164NoPlus(phone: string): string {
  const digits = String(phone || "").replace(/[^\d]/g, "")
  if (!/^[1-9]\d{6,14}$/.test(digits)) {
    throw new GroupFeatureError(
      "Invalid phone number. Provide an international E.164 number (7-15 digits).",
      400,
      "INVALID_PHONE",
    )
  }
  return digits
}

export function assertSupportedGroupMessageType(rawType: string): void {
  const normalized = String(rawType || "").trim().toLowerCase()
  if (UNSUPPORTED_GROUP_MESSAGE_TYPES.has(normalized)) {
    throw new GroupFeatureError(
      `Message type "${normalized}" is not supported in WhatsApp Groups (interactive, commerce, calling, edit/delete, and disappearing/view-once are disallowed by Meta).`,
      400,
      "UNSUPPORTED_GROUP_MESSAGE_TYPE",
    )
  }
  if (!(SUPPORTED_GROUP_MESSAGE_TYPES as readonly string[]).includes(normalized)) {
    throw new GroupFeatureError(
      `Unsupported group message type "${normalized}". Allowed: ${SUPPORTED_GROUP_MESSAGE_TYPES.join(", ")}.`,
      400,
      "UNSUPPORTED_GROUP_MESSAGE_TYPE",
    )
  }
}

async function assertNumberEligibleForGroups(phoneNumberId: string) {
  const tenantId = currentTenant()?.tenantId || null
  const account = await db.whatsAppAccount.findFirst({
    where: {
      phoneNumberId,
      ...(tenantId ? { tenantId } : {}),
    },
    select: {
      id: true,
      platformType: true,
      connectedVia: true,
      status: true,
      qualityRating: true,
    },
  }).catch(() => null)

  if (
    (account?.platformType && /coexist|smb|whatsapp_business_app/i.test(account.platformType)) ||
    (account?.connectedVia && /coexist|smb_app/i.test(account.connectedVia))
  ) {
    throw new GroupFeatureError(
      "WhatsApp Groups API is not available for WhatsApp Business App / Coexistence numbers. An Official Business Account (OBA) on Cloud API is required.",
      403,
      "INELIGIBLE_NUMBER",
    )
  }
}

export function createGroupsService(client = defaultGroupsMetaClient) {
  return {
    async listGroups() {
      const groups = await db.waGroup.findMany({
        where: { status: "ACTIVE" },
        include: {
          participants: { orderBy: { updatedAt: "desc" } },
          _count: { select: { messages: true, participants: true } },
        },
        orderBy: { createdAt: "desc" },
      })
      return groups
    },

    async createGroup(input: CreateGroupInput) {
      const subject = String(input.subject || "").trim()
      if (!subject || subject.length > GROUP_SUBJECT_MAX_LENGTH) {
        throw new GroupFeatureError(
          `Group subject is required and must be at most ${GROUP_SUBJECT_MAX_LENGTH} characters.`,
          400,
          "INVALID_SUBJECT",
        )
      }
      const description = input.description?.trim() || undefined
      if (description && description.length > GROUP_DESCRIPTION_MAX_LENGTH) {
        throw new GroupFeatureError(
          `Group description must be at most ${GROUP_DESCRIPTION_MAX_LENGTH} characters.`,
          400,
          "INVALID_DESCRIPTION",
        )
      }

      const joinApprovalMode = input.joinApprovalMode === "approval_required"
        ? "approval_required"
        : "auto_approve"

      const config = await getWhatsAppConfig()
      if (!config.phoneNumberId || !config.accessToken) {
        throw new GroupFeatureError("WhatsApp Cloud API credentials are not configured.", 400, "MISSING_CREDENTIALS")
      }

      await assertNumberEligibleForGroups(config.phoneNumberId)

      const existingCount = await db.waGroup.count({
        where: { phoneNumberId: config.phoneNumberId, status: "ACTIVE" },
      })
      if (existingCount >= MAX_GROUPS_PER_NUMBER) {
        throw new GroupFeatureError(
          `Maximum of ${MAX_GROUPS_PER_NUMBER} active groups per business number reached.`,
          400,
          "GROUP_LIMIT_REACHED",
        )
      }

      const created = await client.createGroup({ subject, description, joinApprovalMode })
      if (!created.groupId) {
        throw new GroupFeatureError("Meta did not return a group ID.", 502, "MISSING_GROUP_ID")
      }

      let inviteLink = created.inviteLink
      if (!inviteLink) {
        inviteLink = await client.getInviteLink(created.groupId).catch(() => null)
      }

      const group = await db.waGroup.create({
        data: {
          tenantId: currentTenant()?.tenantId || null,
          groupId: created.groupId,
          phoneNumberId: created.phoneNumberId,
          subject,
          description: description || null,
          joinApprovalMode,
          inviteLink,
          status: "ACTIVE",
          customerId: input.customerId || null,
          bookingId: input.bookingId || null,
          createdBy: input.createdBy || null,
        },
        include: { participants: true },
      })

      return group
    },

    async getAndSyncGroup(id: string) {
      const group = await db.waGroup.findFirst({
        where: { OR: [{ id }, { groupId: id }] },
        include: {
          participants: { orderBy: { updatedAt: "desc" } },
          messages: { orderBy: { timestamp: "asc" }, take: 100 },
        },
      })
      if (!group) throw new GroupFeatureError("Group not found", 404, "NOT_FOUND")

      try {
        const remote = await client.getGroupInfo(group.groupId)
        const inviteLink = remote?.invite_link || group.inviteLink
        const updated = await db.waGroup.update({
          where: { id: group.id },
          data: {
            subject: remote?.subject || group.subject,
            description: remote?.description ?? group.description,
            joinApprovalMode: remote?.join_approval_mode || group.joinApprovalMode,
            inviteLink,
          },
          include: {
            participants: { orderBy: { updatedAt: "desc" } },
            messages: { orderBy: { timestamp: "asc" }, take: 100 },
          },
        })

        if (Array.isArray(remote?.participants)) {
          for (const p of remote.participants) {
            const waId = String(p?.user || p?.wa_id || "").replace(/[^\d]/g, "")
            if (!waId) continue
            await db.waGroupParticipant.upsert({
              where: { groupRef_waId: { groupRef: group.id, waId } },
              update: { status: "joined", joinedAt: new Date() },
              create: {
                tenantId: group.tenantId,
                groupRef: group.id,
                waId,
                status: "joined",
                joinedAt: new Date(),
              },
            })
          }
        }
        return updated
      } catch {
        return group
      }
    },

    async deleteGroup(id: string) {
      const group = await db.waGroup.findFirst({ where: { OR: [{ id }, { groupId: id }] } })
      if (!group) throw new GroupFeatureError("Group not found", 404, "NOT_FOUND")

      await client.deleteGroup(group.groupId)
      return db.waGroup.update({
        where: { id: group.id },
        data: { status: "DELETED" },
      })
    },

    async getInviteLink(id: string) {
      const group = await db.waGroup.findFirst({ where: { OR: [{ id }, { groupId: id }] } })
      if (!group) throw new GroupFeatureError("Group not found", 404, "NOT_FOUND")

      const link = await client.getInviteLink(group.groupId)
      if (link && link !== group.inviteLink) {
        await db.waGroup.update({ where: { id: group.id }, data: { inviteLink: link } })
      }
      return { inviteLink: link || group.inviteLink }
    },

    async resetInviteLink(id: string) {
      const group = await db.waGroup.findFirst({ where: { OR: [{ id }, { groupId: id }] } })
      if (!group) throw new GroupFeatureError("Group not found", 404, "NOT_FOUND")

      const link = await client.resetInviteLink(group.groupId)
      await db.waGroup.update({ where: { id: group.id }, data: { inviteLink: link } })
      return { inviteLink: link }
    },

    async sendInviteTemplate(id: string, input: SendInviteTemplateInput) {
      const group = await db.waGroup.findFirst({ where: { OR: [{ id }, { groupId: id }] } })
      if (!group) throw new GroupFeatureError("Group not found", 404, "NOT_FOUND")

      const activeCount = await db.waGroupParticipant.count({
        where: { groupRef: group.id, status: "joined" },
      })
      if (activeCount >= MAX_GROUP_PARTICIPANTS) {
        throw new GroupFeatureError(
          `Group already has the maximum ${MAX_GROUP_PARTICIPANTS} participants.`,
          400,
          "MAX_PARTICIPANTS_REACHED",
        )
      }

      const to = normalizeE164NoPlus(input.to)
      const inviteLink = group.inviteLink || (await client.getInviteLink(group.groupId))
      if (!inviteLink) {
        throw new GroupFeatureError("Group invite link is not available yet.", 400, "NO_INVITE_LINK")
      }

      const defaults = getInviteTemplateDefaults()
      const res = await client.sendInviteLinkTemplate({
        to,
        templateName: input.templateName || defaults.name,
        templateLang: input.templateLang || defaults.lang,
        inviteLink,
        groupSubject: group.subject,
      })

      await db.waGroupParticipant.upsert({
        where: { groupRef_waId: { groupRef: group.id, waId: to } },
        update: { status: "invited" },
        create: {
          tenantId: group.tenantId,
          groupRef: group.id,
          waId: to,
          status: "invited",
        },
      })

      return { messageId: res.messageId, to, inviteLink }
    },

    async listJoinRequests(id: string) {
      const group = await db.waGroup.findFirst({ where: { OR: [{ id }, { groupId: id }] } })
      if (!group) throw new GroupFeatureError("Group not found", 404, "NOT_FOUND")

      const remote = await client.getJoinRequests(group.groupId).catch(() => [])
      for (const req of remote) {
        const waId = String(req?.wa_id || req?.user || "").replace(/[^\d]/g, "")
        const reqId = String(req?.join_request_id || req?.id || "")
        if (!waId) continue
        await db.waGroupParticipant.upsert({
          where: { groupRef_waId: { groupRef: group.id, waId } },
          update: { status: "requested", joinRequestId: reqId || null },
          create: {
            tenantId: group.tenantId,
            groupRef: group.id,
            waId,
            joinRequestId: reqId || null,
            status: "requested",
          },
        })
      }

      return db.waGroupParticipant.findMany({
        where: { groupRef: group.id, status: "requested" },
        orderBy: { updatedAt: "desc" },
      })
    },

    async handleJoinRequests(id: string, action: "approve" | "reject", joinRequestIds: string[]) {
      const group = await db.waGroup.findFirst({ where: { OR: [{ id }, { groupId: id }] } })
      if (!group) throw new GroupFeatureError("Group not found", 404, "NOT_FOUND")
      if (!joinRequestIds.length) {
        throw new GroupFeatureError("At least one join_request_id is required.", 400, "MISSING_REQUEST_IDS")
      }

      if (action === "approve") {
        const joinedCount = await db.waGroupParticipant.count({
          where: { groupRef: group.id, status: "joined" },
        })
        if (joinedCount + joinRequestIds.length > MAX_GROUP_PARTICIPANTS) {
          throw new GroupFeatureError(
            `Cannot approve ${joinRequestIds.length} request(s): max ${MAX_GROUP_PARTICIPANTS} participants allowed (currently ${joinedCount}).`,
            400,
            "MAX_PARTICIPANTS_REACHED",
          )
        }
        const res = await client.approveJoinRequests(group.groupId, joinRequestIds)
        await db.waGroupParticipant.updateMany({
          where: { groupRef: group.id, joinRequestId: { in: joinRequestIds } },
          data: { status: "joined", joinedAt: new Date() },
        })
        return res
      } else {
        const res = await client.rejectJoinRequests(group.groupId, joinRequestIds)
        await db.waGroupParticipant.updateMany({
          where: { groupRef: group.id, joinRequestId: { in: joinRequestIds } },
          data: { status: "rejected" },
        })
        return res
      }
    },

    async removeParticipant(id: string, waIdInput: string) {
      const group = await db.waGroup.findFirst({ where: { OR: [{ id }, { groupId: id }] } })
      if (!group) throw new GroupFeatureError("Group not found", 404, "NOT_FOUND")

      const waId = normalizeE164NoPlus(waIdInput)
      const res = await client.removeParticipants(group.groupId, [waId])
      await db.waGroupParticipant.updateMany({
        where: { groupRef: group.id, waId },
        data: { status: "removed" },
      })
      return res
    },

    async listMessages(id: string) {
      const group = await db.waGroup.findFirst({ where: { OR: [{ id }, { groupId: id }] } })
      if (!group) throw new GroupFeatureError("Group not found", 404, "NOT_FOUND")

      return db.waGroupMessage.findMany({
        where: { groupRef: group.id },
        orderBy: { timestamp: "asc" },
        take: 200,
      })
    },

    async sendMessage(id: string, input: SendGroupMessageInput) {
      const group = await db.waGroup.findFirst({ where: { OR: [{ id }, { groupId: id }] } })
      if (!group) throw new GroupFeatureError("Group not found", 404, "NOT_FOUND")
      if (group.status !== "ACTIVE") {
        throw new GroupFeatureError("Cannot send messages to a deleted group.", 400, "GROUP_DELETED")
      }

      const type = String(input.type || "text").trim().toLowerCase()
      assertSupportedGroupMessageType(type)

      let metaPayload: Record<string, unknown>
      let bodyText: string | null = input.body || input.caption || null
      let mediaRef: string | null = input.mediaId || input.mediaUrl || null

      if (type === "text") {
        if (!input.body?.trim()) {
          throw new GroupFeatureError("Message text body is required.", 400, "EMPTY_BODY")
        }
        metaPayload = {
          type: "text",
          text: { preview_url: true, body: input.body.trim() },
        }
        bodyText = input.body.trim()
      } else if (type === "template") {
        if (!input.templateName?.trim()) {
          throw new GroupFeatureError("Template name is required.", 400, "MISSING_TEMPLATE")
        }
        metaPayload = {
          type: "template",
          template: {
            name: input.templateName.trim(),
            language: { code: input.templateLang || "en" },
            ...(input.templateVariables?.length
              ? {
                  components: [
                    {
                      type: "body",
                      parameters: input.templateVariables.map(v => ({ type: "text", text: v })),
                    },
                  ],
                }
              : {}),
          },
        }
        bodyText = `[Template: ${input.templateName.trim()}]`
      } else {
        if (!mediaRef) {
          throw new GroupFeatureError(`Media URL or media ID is required for ${type} messages.`, 400, "MISSING_MEDIA")
        }
        const mediaObj: Record<string, unknown> = input.mediaId ? { id: input.mediaId } : { link: input.mediaUrl }
        if (input.caption && (type === "image" || type === "video" || type === "document")) {
          mediaObj.caption = input.caption
        }
        if (input.filename && type === "document") {
          mediaObj.filename = input.filename
        }
        metaPayload = { type, [type]: mediaObj }
      }

      const sent = await client.sendGroupMessage(group.groupId, metaPayload)

      const record = await db.waGroupMessage.create({
        data: {
          tenantId: group.tenantId,
          groupRef: group.id,
          waMessageId: sent.messageId || `out_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          senderWaId: input.senderWaId || null,
          direction: "OUTBOUND",
          type,
          body: bodyText,
          mediaRef,
          status: "SENT",
          timestamp: new Date(),
        },
      })

      return record
    },
  }
}

export const groupsService = createGroupsService()
