export const MAX_GROUP_PARTICIPANTS = 8
export const MAX_GROUPS_PER_NUMBER = 10_000
export const GROUP_SUBJECT_MAX_LENGTH = 128
export const GROUP_DESCRIPTION_MAX_LENGTH = 2048

export type JoinApprovalMode = "auto_approve" | "approval_required"

export const SUPPORTED_GROUP_MESSAGE_TYPES = [
  "text",
  "image",
  "document",
  "video",
  "audio",
  "template",
] as const

export type SupportedGroupMessageType = (typeof SUPPORTED_GROUP_MESSAGE_TYPES)[number]

export const UNSUPPORTED_GROUP_MESSAGE_TYPES = new Set([
  "interactive",
  "commerce",
  "order",
  "product",
  "product_list",
  "catalog_message",
  "calling",
  "call",
  "edit",
  "delete",
  "revoke",
  "disappearing",
  "view_once",
  "ephemeral",
  "reaction",
])

export type GroupParticipantStatus =
  | "invited"
  | "requested"
  | "joined"
  | "removed"
  | "rejected"

export interface MetaGroupErrorBody {
  error?: {
    message?: string
    type?: string
    code?: number
    error_subcode?: number
    fbtrace_id?: string
  }
}

export interface CreateGroupInput {
  subject: string
  description?: string
  joinApprovalMode?: JoinApprovalMode
  customerId?: string | null
  bookingId?: string | null
  createdBy?: string | null
}

export interface SendGroupMessageInput {
  type: string
  body?: string
  mediaUrl?: string
  mediaId?: string
  caption?: string
  filename?: string
  templateName?: string
  templateLang?: string
  templateVariables?: string[]
  senderWaId?: string | null
}

export interface SendInviteTemplateInput {
  to: string
  templateName?: string
  templateLang?: string
}

export class GroupFeatureError extends Error {
  status: number
  code?: string | number

  constructor(message: string, status = 400, code?: string | number) {
    super(message)
    this.name = "GroupFeatureError"
    this.status = status
    this.code = code
  }
}
