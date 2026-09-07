"use client"

import React, { useState } from "react"
import {
  X,
  Printer,
  ExternalLink,
  Phone,
  MessageSquare,
  Clock,
  MapPin,
  Utensils,
  CheckCircle2,
  AlertCircle,
  ChefHat,
  Bell,
  CheckCheck,
  Ban,
  DollarSign,
  CreditCard,
  User,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react"

interface OrderDetailsDialogProps {
  order: any | null
  isOpen: boolean
  onClose: () => void
  onUpdateStatus: (orderId: string, status: string, note?: string) => Promise<void>
  onUpdatePayment: (orderId: string, paymentStatus: string, paymentMethod?: string) => Promise<void>
}

const STATUS_PIPELINE = [
  { key: "PENDING", label: "Pending", icon: Clock, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { key: "ACCEPTED", label: "Accepted", icon: CheckCircle2, color: "text-sky-600 bg-sky-50 border-sky-200" },
  { key: "PREPARING", label: "Preparing", icon: ChefHat, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { key: "READY", label: "Ready", icon: Bell, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { key: "SERVED", label: "Served", icon: Utensils, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  { key: "COMPLETED", label: "Completed", icon: CheckCheck, color: "text-slate-700 bg-slate-100 border-slate-300" },
]

export default function OrderDetailsDialog({
  order,
  isOpen,
  onClose,
  onUpdateStatus,
  onUpdatePayment,
}: OrderDetailsDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [paymentStatus, setPaymentStatus] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<string>("")

  if (!isOpen || !order) return null

  // Parse items safely
  let items: any[] = []
  try {
    items = typeof order.itemsJson === "string" ? JSON.parse(order.itemsJson) : order.itemsJson || []
  } catch {
    items = []
  }

  // Parse status history safely
  let history: any[] = []
  try {
    history = typeof order.statusHistoryJson === "string" ? JSON.parse(order.statusHistoryJson) : order.statusHistoryJson || []
  } catch {
    history = []
  }

  const currency = order.currency || "OMR"
  const currentStatus = selectedStatus || order.status || "PENDING"
  const currentPaymentStatus = paymentStatus || order.paymentStatus || "UNPAID"
  const currentPaymentMethod = paymentMethod || order.paymentMethod || "CASH"

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true)
    setSelectedStatus(newStatus)
    try {
      await onUpdateStatus(order.id, newStatus)
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePaymentChange = async (newPayStatus: string, newPayMethod?: string) => {
    setIsUpdating(true)
    setPaymentStatus(newPayStatus)
    if (newPayMethod) setPaymentMethod(newPayMethod)
    try {
      await onUpdatePayment(order.id, newPayStatus, newPayMethod || currentPaymentMethod)
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePrintDocket = () => {
    const printWindow = window.open("", "_blank", "width=400,height=600")
    if (!printWindow) return

    const itemsHtml = items.map((item) => `
      <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
        <div>
          <strong>${item.qty}x ${item.name}</strong>
          ${item.variant?.name ? `<br/><small style="color: #666;">Size: ${item.variant.name}</small>` : ""}
          ${Array.isArray(item.modifiers) && item.modifiers.length > 0 ? `<br/><small style="color: #666;">+ ${item.modifiers.map((m: any) => m.name).join(", ")}</small>` : ""}
          ${item.notes ? `<br/><small style="color: #d97706; font-style: italic;">Note: ${item.notes}</small>` : ""}
        </div>
        <div style="font-family: monospace; font-weight: bold;">
          ${currency} ${(item.price * item.qty).toFixed(2)}
        </div>
      </div>
    `).join("")

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order ${order.orderNumber || order.id.slice(-4)}</title>
        <style>
          body { font-family: monospace; padding: 15px; margin: 0; color: #000; font-size: 12px; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .title { font-size: 16px; font-weight: bold; }
          .meta { margin-top: 4px; font-size: 12px; }
          .items { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .totals { font-size: 13px; line-height: 1.5; }
          .grand { font-size: 16px; font-weight: bold; border-top: 1px dashed #000; padding-top: 6px; margin-top: 6px; }
          .footer { text-align: center; margin-top: 15px; font-size: 10px; color: #555; }
          @media print { body { width: 80mm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">KITCHEN DOCKET / RECEIPT</div>
          <div class="meta">Order: <strong>${order.orderNumber || `#${order.id.slice(-4)}`}</strong></div>
          <div class="meta">Type: <strong>${order.orderType}</strong> ${order.tableNumber ? `(Table ${order.tableNumber})` : order.roomNumber ? `(Room ${order.roomNumber})` : ""}</div>
          <div class="meta">Time: ${new Date(order.createdAt).toLocaleString()}</div>
          ${order.customerName ? `<div class="meta">Customer: ${order.customerName}</div>` : ""}
          ${order.specialNotes ? `<div style="margin-top: 6px; padding: 4px; background: #eee; font-weight: bold;">NOTE: ${order.specialNotes}</div>` : ""}
        </div>
        <div class="items">
          ${itemsHtml}
        </div>
        <div class="totals">
          <div style="display: flex; justify-content: space-between;">
            <span>Subtotal:</span>
            <span>${currency} ${(order.subtotalAmount || order.totalAmount).toFixed(2)}</span>
          </div>
          ${order.taxAmount ? `
          <div style="display: flex; justify-content: space-between;">
            <span>Tax (VAT):</span>
            <span>${currency} ${order.taxAmount.toFixed(2)}</span>
          </div>` : ""}
          <div class="grand" style="display: flex; justify-content: space-between;">
            <span>Total:</span>
            <span>${currency} ${order.totalAmount.toFixed(2)}</span>
          </div>
          <div style="margin-top: 6px; font-size: 11px;">Payment: <strong>${currentPaymentStatus}</strong> (${currentPaymentMethod})</div>
        </div>
        <div class="footer">
          Thank you! Powered by Fizmoh
        </div>
        <script>window.onload = function() { window.print(); }<\/script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  const cleanPhone = order.customerPhone ? order.customerPhone.replace(/[^0-9+]/g, "") : ""
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone.replace("+", "")}` : null

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm">
              #{order.orderNumber ? order.orderNumber.replace("#", "") : order.id.slice(-4)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  Order Details
                </h3>
                <span className="text-xs font-mono font-semibold text-slate-500">
                  {order.orderNumber || `#${order.id.slice(-4)}`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {order.orderType === "DINE_IN" && order.tableNumber
                    ? `Dine-in • Table ${order.tableNumber}`
                    : order.orderType === "ROOM_SERVICE" && order.roomNumber
                    ? `Room Service • Room ${order.roomNumber}`
                    : order.orderType}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrintDocket}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
              title="Print Kitchen Docket / Bill"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print Docket</span>
            </button>

            {order.publicToken && (
              <button
                type="button"
                onClick={() => window.open(`/order/${order.publicToken}`, "_blank")}
                className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center transition"
                title="Open Live Guest Tracking View"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Status Progression Bar */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Order Lifecycle Status</span>
              <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                currentStatus === "READY"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : currentStatus === "PREPARING"
                  ? "bg-amber-50 text-amber-700 border-amber-300"
                  : currentStatus === "PENDING"
                  ? "bg-blue-50 text-blue-700 border-blue-300"
                  : currentStatus === "COMPLETED"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-slate-100 text-slate-700 border-slate-300"
              }`}>
                {currentStatus}
              </span>
            </div>

            {/* Step Pipeline Buttons */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {STATUS_PIPELINE.map((st) => {
                const isActive = currentStatus === st.key
                const Icon = st.icon

                return (
                  <button
                    key={st.key}
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleStatusChange(st.key)}
                    className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                      isActive
                        ? "bg-slate-900 border-slate-900 text-white shadow-xs font-bold"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                    <span className="text-[11px] leading-tight">{st.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Cancel Action */}
            {currentStatus !== "CANCELLED" && currentStatus !== "COMPLETED" && (
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => {
                    if (confirm("Are you sure you want to cancel this order?")) {
                      handleStatusChange("CANCELLED")
                    }
                  }}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 hover:underline"
                >
                  <Ban className="w-3 h-3" />
                  <span>Cancel Order</span>
                </button>
              </div>
            )}
          </div>

          {/* Customer Details & Special Instructions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Customer Information</span>
              </span>
              <div className="text-sm font-bold text-slate-900">
                {order.customerName || "Guest Diner"}
              </div>

              {order.customerPhone && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs font-mono text-slate-600 font-medium">
                    {order.customerPhone}
                  </span>
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition"
                      title="Open WhatsApp Chat"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <a
                    href={`tel:${order.customerPhone}`}
                    className="p-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition"
                    title="Call Phone"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {order.customerEmail && (
                <div className="text-xs text-slate-500 truncate">
                  {order.customerEmail}
                </div>
              )}

              {order.deliveryAddress && (
                <div className="text-xs text-slate-600 pt-1 border-t border-slate-100">
                  <span className="font-semibold text-slate-700">Delivery to:</span> {order.deliveryAddress}
                </div>
              )}
            </div>

            {/* Payment Status & Method Card */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  <span>Payment Status</span>
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  currentPaymentStatus === "PAID"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}>
                  {currentPaymentStatus}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {currentPaymentStatus !== "PAID" ? (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handlePaymentChange("PAID")}
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark as Paid</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handlePaymentChange("UNPAID")}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    Mark as Unpaid
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                <span className="text-slate-500 font-medium">Method:</span>
                <select
                  value={currentPaymentMethod}
                  disabled={isUpdating}
                  onChange={(e) => handlePaymentChange(currentPaymentStatus, e.target.value)}
                  className="p-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD_AT_VENUE">Card at Venue (POS)</option>
                  <option value="AMWALPAY_ONLINE">AmwalPay Online</option>
                  <option value="PAYMOB_ONLINE">Paymob Online</option>
                  <option value="ROOM_CHARGE">Room Charge</option>
                </select>
              </div>
            </div>
          </div>

          {/* Kitchen Special Notes */}
          {order.specialNotes && (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Chef / Kitchen Instructions:</span>
                <p className="mt-0.5 text-amber-950 font-medium">{order.specialNotes}</p>
              </div>
            </div>
          )}

          {/* Itemized Dishes List */}
          <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Ordered Items ({items.reduce((s, i) => s + (i.qty || 1), 0)})
              </span>
              <span className="text-xs font-mono font-bold text-emerald-700">
                {currency} {order.totalAmount.toFixed(2)}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {items.map((item, idx) => {
                const qty = item.qty || 1
                const linePrice = typeof item.lineTotal === "number" ? item.lineTotal : (item.price || 0) * qty

                return (
                  <div key={idx} className="p-3.5 text-xs flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 font-bold font-mono text-slate-800 shrink-0">
                        {qty}x
                      </span>
                      <div className="space-y-1 min-w-0">
                        <div className="font-bold text-slate-900">
                          {item.name}
                          {item.nameAr && <span className="text-slate-400 font-normal ml-1">({item.nameAr})</span>}
                        </div>

                        {/* Variant / Size */}
                        {item.variant?.name && (
                          <div className="text-[11px] text-slate-500 font-medium">
                            Portion: <span className="text-slate-800 font-semibold">{item.variant.name}</span>
                          </div>
                        )}

                        {/* Modifiers */}
                        {Array.isArray(item.modifiers) && item.modifiers.length > 0 && (
                          <div className="text-[11px] text-slate-500 space-y-0.5">
                            {item.modifiers.map((m: any, mIdx: number) => (
                              <div key={mIdx} className="text-slate-600">
                                + {m.name} {m.price > 0 && `(${currency} ${m.price.toFixed(2)})`}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Item Note */}
                        {item.notes && (
                          <div className="text-[11px] text-amber-700 font-medium italic">
                            &ldquo;{item.notes}&rdquo;
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-slate-900">
                        {currency} {linePrice.toFixed(2)}
                      </div>
                      {qty > 1 && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          {currency} {item.price?.toFixed(2)} each
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Financial Summary */}
            <div className="p-4 bg-slate-50/70 border-t border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono">{currency} {(order.subtotalAmount || order.totalAmount).toFixed(2)}</span>
              </div>
              {order.taxAmount ? (
                <div className="flex justify-between text-slate-600">
                  <span>VAT / Tax:</span>
                  <span className="font-mono">{currency} {order.taxAmount.toFixed(2)}</span>
                </div>
              ) : null}
              {order.serviceChargeAmount ? (
                <div className="flex justify-between text-slate-600">
                  <span>Service Charge:</span>
                  <span className="font-mono">{currency} {order.serviceChargeAmount.toFixed(2)}</span>
                </div>
              ) : null}
              {order.discountAmount ? (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount:</span>
                  <span className="font-mono">-{currency} {order.discountAmount.toFixed(2)}</span>
                </div>
              ) : null}
              {order.tipAmount ? (
                <div className="flex justify-between text-slate-600">
                  <span>Tip:</span>
                  <span className="font-mono">{currency} {order.tipAmount.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Amount:</span>
                <span className="font-mono text-emerald-700">{currency} {order.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Status History Timeline */}
          {history.length > 0 && (
            <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Status Audit Log</span>
              </span>
              <div className="space-y-1.5 pt-1">
                {history.map((h, hIdx) => (
                  <div key={hIdx} className="text-xs flex items-center justify-between text-slate-500">
                    <span className="font-semibold text-slate-700">• {h.status}</span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {h.timestamp ? new Date(h.timestamp).toLocaleTimeString() : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {currentStatus === "PENDING" && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleStatusChange("PREPARING")}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <ChefHat className="w-4 h-4" />
                <span>Start Cooking</span>
              </button>
            )}

            {currentStatus === "PREPARING" && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleStatusChange("READY")}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Bell className="w-4 h-4" />
                <span>Mark as Ready</span>
              </button>
            )}

            {currentStatus === "READY" && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleStatusChange("SERVED")}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Utensils className="w-4 h-4" />
                <span>Mark as Served</span>
              </button>
            )}

            {currentStatus === "SERVED" && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleStatusChange("COMPLETED")}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Complete Order</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
