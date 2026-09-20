import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { subscribe } from "@/lib/realtime"
import { withErrors } from "@/lib/api-handler"
import { canReceiveRestaurantOrder } from "@/lib/restaurant-stream-scope"

export const dynamic = "force-dynamic"
export const maxDuration = 3600

export const GET = withErrors(async (request: NextRequest) => {
  const encoder = new TextEncoder()
  const { searchParams } = new URL(request.url)
  const orderToken = searchParams.get("token")
  const tableToken = searchParams.get("tableToken")

  let targetOrderId: string | null = null
  let targetTenantId: string | null = null
  let targetTableId: string | null = null

  if (orderToken) {
    const order = await raw.kitchenOrder.findFirst({
      where: { publicToken: orderToken },
      select: { id: true, tenantId: true },
    })
    if (order) {
      targetOrderId = order.id
      targetTenantId = order.tenantId
    }
  } else if (tableToken) {
    const table = await raw.restaurantTable.findFirst({
      where: { token: tableToken },
      select: { id: true, tenantId: true },
    })
    if (table) {
      targetTenantId = table.tenantId
      targetTableId = table.id
    }
  }

  if (!targetTenantId || (!targetOrderId && !targetTableId)) {
    return NextResponse.json({ error: "Valid tracking token required" }, { status: 401 })
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
      send(`event: ready\ndata: {"ok":true}\n\n`)

      const unsubscribe = subscribe((event) => {
        // Multi-tenant check
        if (event.tenantId !== targetTenantId) {
          return
        }

        if (event.type === "restaurant_order") {
          // If customer is tracking specific order
          if (!canReceiveRestaurantOrder({ tenantId: targetTenantId, orderId: targetOrderId, tableId: targetTableId }, event)) {
            return
          }
          send(`event: restaurant_order\ndata: ${JSON.stringify(event)}\n\n`)
        }
      })

      const heartbeat = setInterval(() => send(`: ping\n\n`), 25_000)

      cleanup = () => {
        if (closed) return
        closed = true
        request.signal.removeEventListener("abort", cleanup)
        clearInterval(heartbeat)
        unsubscribe()
        try {
          controller.close()
        } catch {}
      }

      request.signal.addEventListener("abort", cleanup, { once: true })
      if (request.signal.aborted) cleanup()
    },
    cancel() { cleanup() },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
})
