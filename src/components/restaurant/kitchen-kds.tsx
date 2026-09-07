"use client"

import React, { useEffect, useState, useRef } from "react"
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Volume2,
  VolumeX,
  RefreshCw,
  AlertTriangle,
  Utensils,
  Maximize2,
  Minimize2,
  Filter,
  ArrowRight,
  Sparkles,
} from "lucide-react"

export interface KdsOrder {
  id: string
  orderNumber: string
  status: "PENDING" | "ACCEPTED" | "PREPARING" | "READY" | "SERVED" | "COMPLETED" | "CANCELLED"
  orderType: string
  tableNumber?: string | null
  roomNumber?: string | null
  customerName?: string | null
  specialNotes?: string | null
  totalAmount: number
  currency: string
  createdAt: string
  items: Array<{
    name: string
    nameAr?: string
    qty: number
    variant?: { name: string }
    modifiers?: Array<{ name: string }>
    notes?: string
  }>
}

export default function KitchenKds() {
  const [orders, setOrders] = useState<KdsOrder[]>([])
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "PENDING" | "PREPARING" | "READY">("ACTIVE")
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [now, setNow] = useState(Date.now())

  // Web Audio chime generator
  const playAlertChime = () => {
    if (!soundEnabled) return
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = "sine"
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime) // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15) // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + 0.4)
    } catch {}
  }

  // Load orders
  const loadOrders = async () => {
    try {
      const res = await fetch("/api/restaurant/orders?limit=50")
      if (!res.ok) return
      const data = await res.json()
      const parsed = (data.orders || []).map((o: any) => {
        let items = []
        try {
          items = JSON.parse(o.itemsJson || "[]")
        } catch {}
        return {
          id: o.id,
          orderNumber: o.orderNumber || `#${o.id.slice(-4)}`,
          status: o.status,
          orderType: o.orderType,
          tableNumber: o.tableNumber || o.table?.number,
          roomNumber: o.roomNumber,
          customerName: o.customerName,
          specialNotes: o.specialNotes,
          totalAmount: o.totalAmount,
          currency: o.currency,
          createdAt: o.createdAt,
          items,
        }
      })
      setOrders(parsed)
    } catch {}
  }

  // Initial load and SSE stream
  useEffect(() => {
    loadOrders()

    // 1-second interval to tick elapsed timers
    const timer = setInterval(() => setNow(Date.now()), 5000)

    // Setup realtime event source for staff
    const eventSource = new EventSource("/api/realtime/stream")
    eventSource.addEventListener("restaurant_order", () => {
      playAlertChime()
      loadOrders()
    })

    return () => {
      clearInterval(timer)
      eventSource.close()
    }
  }, [soundEnabled])

  // Update order status
  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      const res = await fetch("/api/restaurant/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status: nextStatus }),
      })
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus as any } : o))
        )
      }
    } catch {}
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    if (statusFilter === "ACTIVE") {
      return ["PENDING", "ACCEPTED", "PREPARING", "READY"].includes(o.status)
    }
    return o.status === statusFilter
  })

  // Timer color calculator
  const getElapsedBadge = (createdAtStr: string) => {
    const elapsedMinutes = Math.floor((now - new Date(createdAtStr).getTime()) / 60000)
    let colorClass = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    if (elapsedMinutes >= 20) {
      colorClass = "bg-rose-500/30 text-rose-300 border-rose-500/40 animate-pulse font-extrabold"
    } else if (elapsedMinutes >= 10) {
      colorClass = "bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold"
    }

    return {
      minutes: elapsedMinutes,
      badgeClass: colorClass,
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* KDS Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-wide flex items-center gap-2">
              <span>Kitchen Display System (KDS)</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                LIVE
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Active tickets: {orders.filter((o) => ["PENDING", "ACCEPTED", "PREPARING"].includes(o.status)).length}
            </p>
          </div>
        </div>

        {/* Filter Pills & Controls */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            {(["ACTIVE", "PENDING", "PREPARING", "READY"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === filter
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition ${
              soundEnabled
                ? "bg-slate-800 border-slate-700 text-emerald-400"
                : "bg-slate-900 border-slate-800 text-slate-500"
            }`}
            title={soundEnabled ? "Audio chime active" : "Audio muted"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={loadOrders}
            className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
            title="Refresh tickets"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
            title="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Orders Ticket Grid */}
      <main className="flex-1 p-6 overflow-x-auto overflow-y-auto">
        {filteredOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 py-32">
            <Utensils className="w-16 h-16 mb-4 text-slate-700" />
            <p className="text-lg font-bold text-slate-400">Kitchen Queue is Clear</p>
            <p className="text-xs text-slate-600 mt-1">
              New orders from tables, rooms, and counters will appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map((order) => {
              const timerInfo = getElapsedBadge(order.createdAt)

              return (
                <div
                  key={order.id}
                  className={`flex flex-col justify-between rounded-2xl border p-4 bg-slate-900/90 shadow-lg transition-all ${
                    order.status === "READY"
                      ? "border-emerald-600/50"
                      : order.status === "PREPARING"
                      ? "border-amber-500/50"
                      : "border-slate-800"
                  }`}
                >
                  {/* Ticket Header */}
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-lg text-white">
                            {order.orderNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] font-bold text-slate-300">
                            {order.orderType === "DINE_IN" && order.tableNumber
                              ? `Table ${order.tableNumber}`
                              : order.orderType === "ROOM_SERVICE" && order.roomNumber
                              ? `Room ${order.roomNumber}`
                              : order.orderType}
                          </span>
                        </div>
                        {order.customerName && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {order.customerName}
                          </p>
                        )}
                      </div>

                      {/* Timer Badge */}
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border font-mono ${timerInfo.badgeClass}`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{timerInfo.minutes}m</span>
                      </div>
                    </div>

                    {/* Ticket Items */}
                    <div className="space-y-3 divide-y divide-slate-800/60 pb-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="pt-2 first:pt-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-black text-emerald-400 font-mono">
                              {item.qty}x
                            </span>
                            <span className="font-bold text-sm text-slate-100 leading-snug">
                              {item.name}
                            </span>
                          </div>

                          {item.variant && (
                            <p className="text-xs text-slate-400 pl-6 font-medium">
                              Size: {item.variant.name}
                            </p>
                          )}

                          {item.modifiers && item.modifiers.length > 0 && (
                            <p className="text-xs text-amber-400 pl-6">
                              +{item.modifiers.map((m) => m.name).join(", ")}
                            </p>
                          )}

                          {item.notes && (
                            <p className="text-xs text-rose-400 font-medium italic pl-6 bg-rose-950/30 p-1 rounded-md mt-1 border border-rose-900/30">
                              Note: {item.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {order.specialNotes && (
                      <div className="mb-3 p-2 rounded-xl bg-amber-950/30 border border-amber-900/40 text-amber-300 text-xs font-medium">
                        Order Note: {order.specialNotes}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-800">
                    {order.status === "PENDING" || order.status === "ACCEPTED" ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, "PREPARING")}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                      >
                        <ChefHat className="w-4 h-4" />
                        <span>Start Cooking</span>
                      </button>
                    ) : order.status === "PREPARING" ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, "READY")}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Order Ready</span>
                      </button>
                    ) : order.status === "READY" ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, "COMPLETED")}
                        className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Mark Served</span>
                      </button>
                    ) : (
                      <div className="text-center text-xs text-slate-500 font-medium py-1">
                        Completed
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
