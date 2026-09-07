import { NextRequest } from "next/server"
import { subscribe } from "@/lib/realtime"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"
export const maxDuration = 3600

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("sessionId")
  const origin = request.headers.get("origin") || "*"

  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Missing sessionId" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin },
    })
  }

  const encoder = new TextEncoder()

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
      send(`event: ready\ndata: {"ok":true,"sessionId":"${sessionId}"}\n\n`)

      const unsubscribe = subscribe(async event => {
        if (closed) return
        // Forward message and typing events for this exact conversation
        if ("conversationId" in event && event.conversationId === sessionId) {
          if (event.type === "message") {
            try {
              // Fetch latest messages to send full message payload
              const latest = await db.message.findMany({
                where: { conversationId: sessionId },
                orderBy: { createdAt: "desc" },
                take: 2,
              })
              send(`event: message\ndata: ${JSON.stringify({ messages: latest })}\n\n`)
            } catch {
              send(`event: message\ndata: ${JSON.stringify(event)}\n\n`)
            }
          } else {
            send(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
          }
        }
      })

      const heartbeat = setInterval(() => send(`: ping\n\n`), 25_000)

      const cleanup = () => {
        if (closed) return
        closed = true
        clearInterval(heartbeat)
        unsubscribe()
        try {
          controller.close()
        } catch {}
      }

      request.signal.addEventListener("abort", cleanup)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
