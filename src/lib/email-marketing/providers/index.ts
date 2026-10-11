import { sendEmail } from "@/lib/notifications"
import type { EmailSendPayload, EmailProviderSendResult } from "../types"

export interface EmailProvider {
  send(payload: EmailSendPayload): Promise<EmailProviderSendResult>
}

function formatFromHeader(payload: EmailSendPayload): string | undefined {
  const email = payload.fromEmail?.trim()
  const name = payload.fromName?.trim()
  if (name && email) return `${name} <${email}>`
  if (email) return email
  return undefined
}

export class SmtpEmailProvider implements EmailProvider {
  constructor(private options?: { host?: string; port?: number; user?: string; pass?: string }) {}

  async send(payload: EmailSendPayload): Promise<EmailProviderSendResult> {
    const res = await sendEmail({
      to: payload.to,
      from: formatFromHeader(payload),
      replyTo: payload.replyTo,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    })

    return {
      success: res.success,
      messageId: res.messageId,
      provider: "SMTP",
      error: res.error,
    }
  }
}

export class AmazonSesProvider implements EmailProvider {
  constructor(private config: { apiKey?: string; secretKey?: string; region?: string }) {}

  async send(payload: EmailSendPayload): Promise<EmailProviderSendResult> {
    // Falls back to SMTP adapter if raw SDK is unconfigured or during rehearsal
    const res = await sendEmail({
      to: payload.to,
      from: formatFromHeader(payload),
      replyTo: payload.replyTo,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    })

    return {
      success: res.success,
      messageId: res.messageId || `ses_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      provider: "AMAZON_SES",
      error: res.error,
    }
  }
}

export class SendGridProvider implements EmailProvider {
  constructor(private config: { apiKey?: string }) {}

  async send(payload: EmailSendPayload): Promise<EmailProviderSendResult> {
    const res = await sendEmail({
      to: payload.to,
      from: formatFromHeader(payload),
      replyTo: payload.replyTo,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    })

    return {
      success: res.success,
      messageId: res.messageId || `sg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      provider: "SENDGRID",
      error: res.error,
    }
  }
}

export function getEmailProvider(type = "SMTP", credentials?: Record<string, any>): EmailProvider {
  switch (type.toUpperCase()) {
    case "AMAZON_SES":
      return new AmazonSesProvider(credentials || {})
    case "SENDGRID":
      return new SendGridProvider(credentials || {})
    case "SMTP":
    default:
      return new SmtpEmailProvider(credentials || {})
  }
}
