/**
 * WhatsApp 24-hour session window
 *
 * Per BRD §6.5.3 and Meta messaging policy: freeform messages may only be sent
 * within 24 hours of the customer's last inbound message. Outside that window
 * the only thing Meta will deliver is an approved template.
 *
 * Every outbound path must gate on this. Sending freeform outside the window
 * does not fail loudly — Meta rejects it and the customer simply never hears
 * back, which is why this is centralised rather than checked ad hoc.
 */

import { db } from "@/lib/db"

export const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000

/** Call whenever an inbound customer message arrives — restarts the 24h clock. */
export function sessionExpiryFrom(inboundAt: Date = new Date()): Date {
  return new Date(inboundAt.getTime() + SESSION_WINDOW_MS)
}

export function isSessionOpen(sessionExpiresAt: Date | null | undefined): boolean {
  return !!sessionExpiresAt && sessionExpiresAt.getTime() > Date.now()
}

/**
 * Whether a freeform (non-template) message may be sent to this phone number.
 * Falls back to closed when we have no conversation on record — a number we've
 * never heard from has no open session by definition.
 */
export async function canSendFreeform(phone: string): Promise<boolean> {
  const conversation = await db.conversation.findFirst({
    where: { customerPhone: phone },
    orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
    select: { sessionExpiresAt: true },
  })
  return isSessionOpen(conversation?.sessionExpiresAt)
}

export async function touchSession(conversationId: string, inboundAt: Date = new Date()) {
  await db.conversation.update({
    where: { id: conversationId },
    data: { sessionExpiresAt: sessionExpiryFrom(inboundAt) },
  })
}
