/**
 * In-process realtime event bus for the admin inbox.
 *
 * The inbox previously polled every 5 seconds, so an agent saw a customer
 * message up to 5s late and every open tab hit the database on a timer.
 * Publishers (the webhook, the agent send route) push events here and SSE
 * subscribers forward them to connected browsers.
 *
 * This is deliberately in-process: the app runs as a single Node server, so a
 * shared emitter is enough and adds no infrastructure. If this is ever scaled
 * to multiple instances, events would only reach clients connected to the
 * instance that produced them — at that point this needs Redis pub/sub or
 * similar behind the same publish/subscribe interface.
 */

import { EventEmitter } from "events"
import { currentTenant } from "@/lib/tenant"

export type RealtimeEvent = (
  | { type: "message"; conversationId: string; direction: string; preview: string; channel?: string }
  | { type: "conversation"; conversationId: string }
  | {
      type: "call"
      conversationId: string
      status: string
      callId: string
      ringing?: boolean
      from?: string
      customerName?: string
      offer?: string
    }
  | { type: "notification"; title: string; message: string; notificationType: string }
  | { type: "typing"; conversationId: string; who: "bot" | "customer" }
  | { type: "restaurant_order"; orderId: string; status: string; tableNumber?: string; orderNumber?: string; branchId?: string; totalAmount?: number; currency?: string }
  | { type: "restaurant_waiter_call"; requestId: string; tableNumber: string; requestType: string; branchId?: string; roomNumber?: string; message?: string }
  | { type: "restaurant_bill_request"; requestId: string; tableNumber: string; branchId?: string; roomNumber?: string }
) & { tenantId?: string }

const CHANNEL = "realtime"

// Survives hot reload in development, where the module is re-evaluated.
const globalForBus = globalThis as unknown as { __wptourBus?: EventEmitter }

function bus(): EventEmitter {
  if (!globalForBus.__wptourBus) {
    const emitter = new EventEmitter()
    emitter.setMaxListeners(200)
    globalForBus.__wptourBus = emitter
  }
  return globalForBus.__wptourBus
}

export function publish(event: RealtimeEvent) {
  const activeTenantId = event.tenantId || currentTenant()?.tenantId
  bus().emit(CHANNEL, { ...event, tenantId: activeTenantId })
}

export function subscribe(handler: (event: RealtimeEvent) => void): () => void {
  bus().on(CHANNEL, handler)
  return () => bus().off(CHANNEL, handler)
}

/**
 * Writes a notification row and pushes it to connected admin tabs.
 *
 * The two were previously separate: rows were written by the payment and order
 * routes, but only the WhatsApp webhook published anything, so a payment
 * submitted through the website did not reach the bell until its next poll.
 * Callers should use this rather than `db.notification.create` directly.
 */
export async function notifyStaff(input: {
  tenantId?: string | null
  type: string
  title: string
  message: string
  forRole?: string
  /** A specific staff member, when the alert isn't for the whole role — a chat handoff already assigned to someone, say. */
  forStaffId?: string | null
  data?: unknown
}) {
  const { db } = await import("@/lib/db")
  const activeTenantId = input.tenantId ?? (input.data && typeof input.data === "object" && "tenantId" in input.data ? String((input.data as any).tenantId) : null) ?? currentTenant()?.tenantId ?? null

  // A muted alert type is still recorded, so the history stays complete — it
  // simply does not interrupt anyone.
  const { getNotificationPrefs } = await import("@/app/api/notification-prefs/route")
  const prefs = await getNotificationPrefs()
  const muted = prefs[input.type] === false

  const row = await db.notification.create({
    data: {
      tenantId: activeTenantId,
      type: input.type,
      title: input.title,
      message: input.message,
      forRole: input.forRole ?? null,
      forStaffId: input.forStaffId ?? null,
      data: input.data === undefined ? undefined : JSON.stringify(input.data),
    },
  })
  if (muted) return row

  publish({ type: "notification", title: input.title, message: input.message, notificationType: input.type, tenantId: activeTenantId ?? undefined })

  // Push is best-effort: the row and the live event have already been
  // delivered, so a push failure must not fail the caller's work.
  try {
    const [{ sendPush }, { pushAlert }] = await Promise.all([
      import("@/lib/push"),
      import("@/lib/device-push"),
    ])
    // The browser through OneSignal, the phones through Apple. Both, because
    // an agent on the road and an agent at a desk are the same alert.
    const conversationId =
      input.data && typeof input.data === "object" && "conversationId" in input.data
        ? String((input.data as Record<string, unknown>).conversationId ?? "")
        : ""
    await Promise.all([
      sendPush({ title: input.title, message: input.message }),
      pushAlert({
        title: input.title,
        body: input.message,
        type: input.type,
        conversationId: conversationId || undefined,
      }),
    ])
  } catch (error) {
    console.error("Push notification failed:", error)
  }

  return row
}
