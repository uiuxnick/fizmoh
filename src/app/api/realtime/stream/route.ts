import { NextRequest, NextResponse } from "next/server"
import { subscribe } from "@/lib/realtime"
import { withErrors } from "@/lib/chat-api/legacy-guard"
import { currentTenant } from "@/lib/tenant"
import { raw } from "@/lib/db"
import { openRealtimeUpstream, forwardSseFrames } from "@/lib/chat-api/realtime-upstream"
import { legacyRecoverySince, replayLegacyConversations, recoveryPause } from "@/lib/chat-api/legacy-recovery"

/**
 * Server-sent events stream for the admin inbox.
 * Replaces 5-second polling so agents see customer messages as they arrive.
 */

// Must stay open — the default static optimisation would buffer the response.
export const dynamic = "force-dynamic"
export const maxDuration = 3600

export const GET = withErrors(async (request: NextRequest) => {
  const encoder = new TextEncoder()
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Workspace access required" }, { status: 403 })

  const recoverySince = request.nextUrl.searchParams.get("reconcile") === "ready"
    ? null : legacyRecoverySince(process.env)
  const recovery = new AbortController()
  const abortOpening = () => recovery.abort()
  request.signal.addEventListener("abort", abortOpening, { once: true })
  if (request.signal.aborted) abortOpening()
  let upstream: Response | null
  try {
    upstream = await openRealtimeUpstream(request, tenant!, recovery.signal)
  } catch {
    request.signal.removeEventListener("abort", abortOpening)
    recovery.abort()
    return NextResponse.json({ error: "Realtime connection unavailable" }, { status: 503 })
  }
  let cleanup = () => {}
  const stream = new ReadableStream({
    start(controller) {
      let closed = false
      const send = (data: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(data))
        } catch {
          cleanup()
        }
      }

      send(`retry: 3000\n\n`)
      if (!upstream) send(`event: ready\ndata: {"ok":true}\n\n`)

      const unsubscribe = upstream ? () => {} : subscribe(event => {
        // Strict multi-tenant isolation: only forward events belonging to this exact workspace
        if (tenantId) {
          if (event.tenantId !== tenantId) {
            return // Belongs to a different business workspace
          }
        } else {
          // If subscriber has no tenantId, do not leak tenant-specific events
          if (event.tenantId) {
            return
          }
        }
        send(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
      })

      // Proxies and load balancers drop idle connections; a periodic comment
      // keeps the stream alive without emitting a client-visible event.
      const heartbeat = setInterval(() => send(`: ping\n\n`), 25_000)

      cleanup = () => {
        if (closed) return
        closed = true
        recovery.abort()
        request.signal.removeEventListener("abort", cleanup)
        request.signal.removeEventListener("abort", abortOpening)
        clearInterval(heartbeat)
        unsubscribe()
        try {
          controller.close()
        } catch {
          /* already closed by the client */
        }
      }

      request.signal.addEventListener("abort", cleanup, { once: true })
      if (request.signal.aborted) cleanup()
      if (upstream?.body && !closed) {
        void forwardSseFrames(upstream.body, send, recovery.signal)
          .catch(() => { if (!closed) console.error("[realtime] Upstream stream ended unexpectedly") })
          .finally(cleanup)
      }
      // Subscribe before the read: changes during catch-up still arrive normally.
      if (recoverySince && !closed) {
        void replayLegacyConversations({
          signal: recovery.signal,
          pause: recoveryPause,
          load: (after, limit) => raw.conversation.findMany({
            where: {
              tenantId,
              ...(after ? { id: { gt: after } } : {}),
              OR: [
                { updatedAt: { gte: recoverySince } },
                { messages: { some: { createdAt: { gte: recoverySince } } } },
              ],
            },
            select: { id: true }, orderBy: { id: "asc" }, take: limit,
          }),
          send: conversationId => send(`event: conversation\ndata: ${JSON.stringify({ type: "conversation", conversationId })}\n\n`),
        }).catch(() => {
          console.error("[realtime] Legacy recovery failed; reconnect required")
          cleanup()
        })
      }
    },
    cancel() { cleanup() },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // OpenLiteSpeed buffers proxied responses by default, which would hold
      // events until the buffer fills.
      "X-Accel-Buffering": "no",
    },
  })
})
