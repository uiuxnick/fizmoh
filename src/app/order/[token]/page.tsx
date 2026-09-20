"use client"

import React, { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import {
  CheckCircle2,
  Clock,
  ChefHat,
  Bell,
  Utensils,
  Receipt,
  Phone,
  MessageSquare,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Sparkles,
  MapPin,
  CreditCard,
} from "lucide-react"

interface OrderDetails {
  id: string
  orderNumber: string
  status: "PENDING" | "ACCEPTED" | "PREPARING" | "READY" | "SERVED" | "COMPLETED" | "CANCELLED"
  orderType: string
  tableNumber?: string | null
  roomNumber?: string | null
  customerName?: string | null
  customerPhone?: string | null
  deliveryAddress?: string | null
  specialNotes?: string | null
  subtotalAmount: number
  taxAmount: number
  serviceChargeAmount: number
  deliveryChargeAmount: number
  discountAmount: number
  totalAmount: number
  currency: string
  paymentStatus: string
  paymentMethod?: string | null
  createdAt: string
  acceptedAt?: string | null
  preparingAt?: string | null
  readyAt?: string | null
  servedAt?: string | null
  completedAt?: string | null
  cancelledAt?: string | null
  items: Array<{
    name: string
    nameAr?: string
    price: number
    qty: number
    variant?: { name: string; price: number }
    modifiers?: Array<{ name: string; price: number }>
    notes?: string
    lineTotal?: number
  }>
  history: Array<{ status: string; timestamp: string; note?: string }>
}

export default function OrderTrackingPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const token = params?.token as string
  const paidParam = searchParams?.get("paid") === "1"

  const [orderData, setOrderData] = useState<{
    order: OrderDetails
    tenant: { name: string; slug: string; logoUrl?: string | null; currency?: string }
    branch?: { name: string; phone?: string | null; whatsapp?: string | null; address?: string | null } | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Fetch initial order data
  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/restaurant/public/order/${token}`)
      if (!res.ok) throw new Error("Order not found")
      const data = await res.json()
      setOrderData(data)
      setLoading(false)
    } catch (err: any) {
      setError(err.message || "Could not load order details")
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) return
    fetchOrder()

    let pollCount = 0
    let pollInterval: any = null
    if (paidParam) {
      pollInterval = setInterval(() => {
        pollCount++
        if (pollCount <= 5) {
          fetchOrder()
        } else {
          clearInterval(pollInterval)
        }
      }, 2000)
    }

    // Setup SSE live stream
    const eventSource = new EventSource(`/api/restaurant/stream?token=${token}`)

    eventSource.addEventListener("restaurant_order", (e) => {
      try {
        const payload = JSON.parse(e.data)
        if (payload.status || payload.paymentStatus) {
          setOrderData((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              order: {
                ...prev.order,
                ...(payload.status ? { status: payload.status } : {}),
                ...(payload.paymentStatus ? { paymentStatus: payload.paymentStatus } : {}),
              },
            }
          })
          fetchOrder()
        }
      } catch {}
    })

    return () => {
      if (pollInterval) clearInterval(pollInterval)
      eventSource.close()
    }
  }, [token, paidParam])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading your order status...</p>
        </div>
      </div>
    )
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 text-center space-y-4 shadow-md border border-slate-200">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="font-bold text-slate-900 text-lg">Order Not Found</h2>
          <p className="text-xs text-slate-500">
            We could not find active order details for this link. It may have expired or was typed incorrectly.
          </p>
        </div>
      </div>
    )
  }

  const { order, tenant, branch } = orderData
  const steps = [
    { key: "PENDING", label: "Received", desc: "Sent to kitchen" },
    { key: "ACCEPTED", label: "Accepted", desc: "Confirmed by kitchen" },
    { key: "PREPARING", label: "Preparing", desc: "Chef is cooking" },
    { key: "READY", label: "Ready", desc: "Ready for serving" },
    { key: "COMPLETED", label: "Served", desc: "Enjoy your meal!" },
  ]

  const statusIndexMap: Record<string, number> = {
    PENDING: 0,
    ACCEPTED: 1,
    PREPARING: 2,
    READY: 3,
    SERVED: 4,
    COMPLETED: 4,
    CANCELLED: -1,
  }

  const currentStepIndex = statusIndexMap[order.status] ?? 0
  const isCancelled = order.status === "CANCELLED"

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 backdrop-blur-md bg-white/95">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name} className="w-9 h-9 rounded-full object-cover border" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                {tenant.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-bold text-slate-900 text-sm">{tenant.name}</h1>
              <p className="text-xs text-slate-500">{branch?.name || "Main Dining"}</p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {order.orderNumber}
          </span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6 space-y-6">
        {/* Status Highlight Banner */}
        <div
          className={`rounded-3xl p-6 text-white text-center shadow-lg transition-all ${
            isCancelled
              ? "bg-rose-600"
              : order.status === "READY"
              ? "bg-gradient-to-br from-emerald-600 to-teal-700"
              : order.status === "PREPARING"
              ? "bg-gradient-to-br from-amber-500 to-orange-600"
              : "bg-gradient-to-br from-slate-800 to-slate-900"
          }`}
        >
          {isCancelled ? (
            <div className="space-y-2">
              <AlertCircle className="w-12 h-12 mx-auto text-rose-200" />
              <h2 className="text-xl font-extrabold">Order Cancelled</h2>
              <p className="text-xs text-rose-100">
                This order was cancelled. If you have questions, please speak with our staff.
              </p>
            </div>
          ) : order.status === "READY" ? (
            <div className="space-y-2">
              <Sparkles className="w-12 h-12 mx-auto text-amber-300 animate-bounce" />
              <h2 className="text-2xl font-black">Your Order is Ready!</h2>
              <p className="text-xs text-emerald-100 font-medium">
                {order.orderType === "TAKEAWAY"
                  ? "Please pick up your order at the counter."
                  : "Our team is delivering it to your table right now!"}
              </p>
            </div>
          ) : order.status === "PREPARING" ? (
            <div className="space-y-2">
              <ChefHat className="w-12 h-12 mx-auto text-amber-200 animate-pulse" />
              <h2 className="text-xl font-extrabold">Preparing Your Food</h2>
              <p className="text-xs text-amber-100">
                Our culinary team is crafting your dishes fresh in the kitchen.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Clock className="w-12 h-12 mx-auto text-slate-300 animate-pulse" />
              <h2 className="text-xl font-extrabold">Order Received</h2>
              <p className="text-xs text-slate-300">
                The kitchen has received your order and will confirm it shortly.
              </p>
            </div>
          )}

          {/* Location Badge */}
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 text-xs font-semibold backdrop-blur-xs">
            <Utensils className="w-3.5 h-3.5" />
            <span>
              {order.orderType === "DINE_IN" && order.tableNumber
                ? `Table ${order.tableNumber}`
                : order.orderType === "ROOM_SERVICE" && order.roomNumber
                ? `Room ${order.roomNumber}`
                : order.orderType}
            </span>
          </div>
        </div>

        {/* Multi-Step Timeline */}
        {!isCancelled && (
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
            <h3 className="font-bold text-xs uppercase tracking-wide text-slate-400 mb-4">
              Live Progress
            </h3>

            <div className="space-y-4">
              {steps.map((step, idx) => {
                const isPassed = currentStepIndex >= idx
                const isCurrent = currentStepIndex === idx

                return (
                  <div key={step.key} className="flex items-start gap-3 relative">
                    {/* Step Icon */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isPassed
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isPassed ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span className="text-xs font-bold">{idx + 1}</span>
                      )}
                    </div>

                    {/* Step Text */}
                    <div className="flex-1 min-w-0 pt-1">
                      <p
                        className={`text-xs font-bold ${
                          isCurrent
                            ? "text-emerald-700 font-extrabold"
                            : isPassed
                            ? "text-slate-900"
                            : "text-slate-400"
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-[11px] text-slate-500">{step.desc}</p>
                    </div>

                    {isCurrent && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                        Active
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Order Receipt Details */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-xs uppercase tracking-wide text-slate-800">
                Order Items ({order.items.length})
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {order.items.map((item, i) => (
              <div key={i} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <span className="text-emerald-700">{item.qty}x</span>
                    <span>{item.name}</span>
                  </div>
                  {item.variant && (
                    <p className="text-[11px] text-slate-500 pl-5">
                      Portion: {item.variant.name}
                    </p>
                  )}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <p className="text-[11px] text-slate-500 pl-5">
                      +{item.modifiers.map((m) => m.name).join(", ")}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-[10px] text-slate-400 italic pl-5">
                      "{item.notes}"
                    </p>
                  )}
                </div>
                <span className="font-mono font-bold text-slate-800">
                  {order.currency} {((item.lineTotal || item.price * item.qty) || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Pricing Breakdown */}
          <div className="bg-slate-50 rounded-2xl p-3.5 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-mono">{order.currency} {order.subtotalAmount.toFixed(2)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Discount</span>
                <span className="font-mono">-{order.currency} {order.discountAmount.toFixed(2)}</span>
              </div>
            )}
            {order.serviceChargeAmount > 0 && (
              <div className="flex justify-between">
                <span>Service Charge</span>
                <span className="font-mono">{order.currency} {order.serviceChargeAmount.toFixed(2)}</span>
              </div>
            )}
            {order.deliveryChargeAmount > 0 && (
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className="font-mono">{order.currency} {order.deliveryChargeAmount.toFixed(2)}</span>
              </div>
            )}
            {order.taxAmount > 0 && (
              <div className="flex justify-between">
                <span>VAT / Tax</span>
                <span className="font-mono">{order.currency} {order.taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-200">
              <span>Total Amount</span>
              <span className="font-mono text-emerald-700">{order.currency} {order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Status & Digital Receipt */}
          <div className="pt-2">
            {order.paymentStatus === "PAID" ? (
              <div className="rounded-2xl border border-emerald-300 bg-gradient-to-b from-emerald-50 to-white p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                      ✓
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">🎉 Thank You For Your Order!</h4>
                      <p className="text-[11px] text-emerald-800 font-medium">Payment confirmed via AmwalPay Card</p>
                    </div>
                  </div>
                  <span className="bg-emerald-600 text-white text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-bold shadow-xs">
                    PAID
                  </span>
                </div>

                {/* Receipt Details Box */}
                <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-slate-500 text-[11px] pb-1 border-b border-slate-100">
                    <span>Receipt No:</span>
                    <span className="font-mono font-bold text-slate-700">
                      REC-{order.orderNumber.replace("#", "")}-{order.id.slice(-4).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500 text-[11px]">
                    <span>Payment Method:</span>
                    <span className="font-semibold text-slate-800">
                      {order.paymentMethod === "AMWALPAY_ONLINE" ? "AmwalPay Card (Online)" : order.paymentMethod?.replace(/_/g, " ") || "Card"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500 text-[11px]">
                    <span>Amount Paid:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {order.currency} {order.totalAmount.toFixed(3)}
                    </span>
                  </div>
                </div>

                {/* Print Receipt Action */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full h-9 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Receipt className="w-3.5 h-3.5 text-slate-500" />
                  <span>Print / Save Official Receipt</span>
                </button>
              </div>
            ) : order.status !== "CANCELLED" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                  <span>Payment Status:</span>
                  <span className="font-bold text-amber-800">{order.paymentMethod ? order.paymentMethod.replace(/_/g, " ") : "UNPAID"}</span>
                </div>
                <a
                  href={`/api/amwalpay/create-session?orderId=KIT-${order.id}`}
                  className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-98 transition"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay Now Online ({order.currency} {order.totalAmount.toFixed(3)})</span>
                </a>
              </div>
            ) : null}
          </div>
        </div>

        {/* Need Assistance Action */}
        <div className="text-center">
          <p className="text-xs text-slate-400">
            Need anything else? Wave to your waiter or contact our service desk.
          </p>
          {(branch?.phone || branch?.whatsapp) && (
            <a
              href={`tel:${branch.phone || branch.whatsapp}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline mt-2"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Reception ({branch.phone || branch.whatsapp})</span>
            </a>
          )}
        </div>
      </main>
    </div>
  )
}
