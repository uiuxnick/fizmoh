export type EmailPermission =
  | "email.dashboard.view"
  | "email.campaign.read"
  | "email.campaign.create"
  | "email.campaign.update"
  | "email.campaign.delete"
  | "email.campaign.send"
  | "email.campaign.schedule"
  | "email.automation.read"
  | "email.automation.manage"
  | "email.automation.publish"
  | "email.subscribers.read"
  | "email.subscribers.read_full"
  | "email.subscribers.create"
  | "email.subscribers.update"
  | "email.subscribers.delete"
  | "email.subscribers.import"
  | "email.subscribers.export"
  | "email.lists.read"
  | "email.lists.manage"
  | "email.segments.read"
  | "email.segments.manage"
  | "email.templates.read"
  | "email.templates.create"
  | "email.templates.update"
  | "email.templates.delete"
  | "email.forms.read"
  | "email.forms.manage"
  | "email.analytics.view"
  | "email.domains.read"
  | "email.domains.manage"
  | "email.settings.view"
  | "email.settings.manage"
  | "email.providers.manage"

export type BlockType =
  | "heading"
  | "text"
  | "image"
  | "button"
  | "divider"
  | "spacer"
  | "columns"
  | "social"
  | "video"
  | "logo"
  | "hero"
  | "product"
  | "coupon"
  | "menu"
  | "footer"
  | "html"

export interface EmailBlock {
  id: string
  type: BlockType
  content?: string
  contentAr?: string
  url?: string
  imageUrl?: string
  altText?: string
  style?: Record<string, string | number>
  settings?: Record<string, any>
  columns?: EmailBlock[][]
}

export interface EmailSection {
  id: string
  columnsCount: number
  backgroundColor?: string
  padding?: string
  blocks: EmailBlock[]
}

export interface EmailDesignJson {
  version: number
  theme: {
    primaryColor: string
    accentColor: string
    backgroundColor: string
    contentWidth: number
    fontFamily: string
    isRtl?: boolean
  }
  sections: EmailSection[]
}

export interface EmailSendPayload {
  to: string
  recipientName?: string
  fromName: string
  fromEmail: string
  replyTo?: string
  subject: string
  html: string
  text?: string
  headers?: Record<string, string>
  idempotencyKey?: string
}

export interface EmailProviderSendResult {
  success: boolean
  messageId?: string
  provider: string
  error?: string
}
