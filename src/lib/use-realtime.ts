"use client"

import { useEffect, useRef } from "react"

export type RealtimeEvent =
  | { type: "message"; conversationId: string; direction: string; preview: string }
  | { type: "conversation"; conversationId: string }
  | { type: "call"; conversationId: string; status: string; callId: string }
  | { type: "notification"; title: string; message: string; notificationType: string }
  | { type: "typing"; conversationId: string; who: "bot" | "customer" }

/**
 * Subscribes to the server's event stream.
 *
 * EventSource reconnects on its own using the `retry` interval the server
 * sends, so there is no backoff logic here. The handler is held in a ref so a
 * caller can pass an inline closure without tearing down and re-opening the
 * connection on every render — reopening would drop events in the gap.
 */
export function useRealtime(onEvent: (event: RealtimeEvent) => void, enabled = true) {
  const handler = useRef(onEvent)
  useEffect(() => {
    handler.current = onEvent
  }, [onEvent])

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    const source = new EventSource("/api/realtime/stream")
    const forward = (raw: MessageEvent) => {
      try {
        handler.current(JSON.parse(raw.data) as RealtimeEvent)
      } catch {
        /* a malformed frame should not kill the stream */
      }
    }

    for (const type of ["message", "conversation", "call", "notification", "typing"]) {
      source.addEventListener(type, forward as EventListener)
    }

    return () => source.close()
  }, [enabled])
}
