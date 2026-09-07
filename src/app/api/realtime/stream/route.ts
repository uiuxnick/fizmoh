import { NextRequest } from "next/server"
import { subscribe } from "@/lib/realtime"
import { withErrors } from "@/lib/api-handler"
import { currentTenant } from "@/lib/tenant"

/**
 * Server-sent events stream for the admin inbox.
 * Replaces 5-second polling so agents see customer messages as they arrive.
 */

// Must stay open — the default static optimisation would buffer the response.
export const dynamic = "force-dynamic"
export const maxDuration = 3600

export const GET = withErrors(async (request: NextRequest) => {
  const encoder = new TextEncoder()
  const tenantId = currentTenant()?.tenantId

  const stream = new ReadableStream({
    start(controller) {
      let closed = false
      const send = (data: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(data))
        } catch {
          closed = true
        }
      }

      send(`retry: 3000\n\n`)
      send(`event: ready\ndata: {"ok":true}\n\n`)

      const unsubscribe = subscribe(event => {
        // Strict multi-tenant isolation: only forward events belonging to this exact workspace
        if (tenantId) {
          if (event.tenantId && event.tenantId !== tenantId) {
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

      const cleanup = () => {
        if (closed) return
        closed = true
        clearInterval(heartbeat)
        unsubscribe()
        try {
          controller.close()
        } catch {
          /* already closed by the client */
        }
      }

      request.signal.addEventListener("abort", cleanup)
    },
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
