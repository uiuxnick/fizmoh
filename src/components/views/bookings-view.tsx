"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import {
  ShoppingBag, Search, Plus, Eye, Ban, CheckCircle, Phone, Mail, Pencil,
  ExternalLink, FileText, CalendarClock, ImageOff, X, Loader2, History, Trash2, AlertTriangle,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { formatCurrency, formatDate, formatDateTime, timeAgo, prettifyStatus } from "@/lib/helpers"
import { PaymentProof } from "@/components/payment-proof"
import { useApp } from "@/lib/store"

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-700",
  PAYMENT_SUBMITTED: "bg-teal-100 text-teal-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLATION_REQUESTED: "bg-orange-100 text-orange-700",
  CANCELLED: "bg-rose-100 text-rose-700",
  REFUNDED: "bg-purple-100 text-purple-700",
  NO_SHOW: "bg-stone-100 text-stone-700",
}

const CHANNEL_COLORS: Record<string, string> = {
  WEB: "bg-emerald-50 text-emerald-700", WHATSAPP: "bg-teal-50 text-teal-700", ADMIN: "bg-amber-50 text-amber-700", API: "bg-purple-50 text-purple-700",
}

const ORDER_STATUSES = [
  "PENDING_PAYMENT", "PAYMENT_SUBMITTED", "CONFIRMED",
  "CANCELLATION_REQUESTED", "COMPLETED", "CANCELLED", "REFUNDED", "NO_SHOW",
]

interface Order {
  id: string; orderNumber: string; customerName: string; customerPhone: string; customerEmail: string | null
  paxAdult: number; paxChild: number; totalAmount: number; paymentMethod: string; paymentStatus: string
  orderStatus: string; channel: string; createdAt: string; confirmedAt: string | null
  tour: { name: string }; slot: { date: string; startTime: string }; customer: { loyaltyTier: string; totalBookings: number } | null
  payments: { id: string; status: string; screenshotUrl: string | null; amount: number }[]
  vouchers: { voucherCode: string; status: string }[]
}

/** Everything `/api/orders/[id]` returns — richer than the list payload. */
interface OrderDetailData extends Order {
  pickupLocation: string | null
  specialRequests: string | null
  couponCode: string | null
  subtotal: number
  discount: number
  taxAmount: number
  cancelReason: string | null
  completedAt: string | null
  cancelledAt: string | null
  slotId: string
  tour: { id?: string; name: string; meetingPoint?: string | null; durationHours?: number | null }
  slot: { id?: string; date: string; startTime: string; endTime?: string | null; capacity?: number; seatsBooked?: number }
  payments: {
    id: string; method: string; amount: number; currency?: string; status: string
    gatewayReference: string | null; bankReference: string | null; bankName: string | null
    transferDate: string | null; screenshotUrl: string | null; fraudScore: number | null
    rejectionReason: string | null; verifierComment: string | null; createdAt: string
  }[]
  auditLogs?: { id: string; action: string; reason: string | null; createdAt: string; staff: { name: string } | null }[]
}

export default function BookingsView() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [channelFilter, setChannelFilter] = useState("all")
  const [methodFilter, setMethodFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)

  const load = () => {
    fetch(`/api/orders?limit=500`).then(r => r.json()).then(d => { setOrders(d.orders || []); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleDeleteOrder = async () => {
    if (!deletingOrder) return
    setDeletingBusy(true)
    try {
      const res = await fetch(`/api/orders/${deletingOrder.id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete order")
      }
      toast.success(data.message || `Booking ${deletingOrder.orderNumber} deleted successfully`)
      setDeletingOrder(null)
      if (selectedId === deletingOrder.id) {
        setSelectedId(null)
      }
      load()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete booking")
    } finally {
      setDeletingBusy(false)
    }
  }

  // Arriving from a notification opens the order it referred to, rather than
  // leaving the operator to find it in a list of two hundred.
  const { focus, setFocus } = useApp()
  useEffect(() => {
    if (focus?.kind !== "order") return
    setSelectedId(focus.id)
    setFocus(null)
  }, [focus, setFocus])

  const filtered = orders.filter(o => {
    const matchStatus = status === "all" || o.orderStatus === status
    const matchChannel = channelFilter === "all" || o.channel === channelFilter
    const matchMethod = methodFilter === "all" || o.paymentMethod === methodFilter
    const s = search.toLowerCase().trim()
    const matchSearch = !s ||
      o.orderNumber.toLowerCase().includes(s) ||
      o.customerName.toLowerCase().includes(s) ||
      o.customerPhone.includes(s) ||
      (o.customerEmail && o.customerEmail.toLowerCase().includes(s)) ||
      o.tour.name.toLowerCase().includes(s)

    return matchStatus && matchChannel && matchMethod && matchSearch
  })

  const totalPages = Math.ceil(filtered.length / pageSize) || 1
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const stats = {
    total: orders.length,
    confirmed: orders.filter(o => o.orderStatus === "CONFIRMED").length,
    pending: orders.filter(o => o.orderStatus === "PENDING_PAYMENT" || o.orderStatus === "PAYMENT_SUBMITTED").length,
    completed: orders.filter(o => o.orderStatus === "COMPLETED").length,
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-none space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center"><ShoppingBag className="h-5 w-5 text-emerald-600" /></div>
            Bookings &amp; Orders
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">{stats.total} total · {stats.confirmed} confirmed · {stats.pending} pending · {stats.completed} completed</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1.5" />New Booking</Button>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" /><Input placeholder="Search order #, customer, phone, email, tour..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-9 bg-white" /></div>
        <div className="grid grid-cols-3 gap-2">
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-xs font-medium text-stone-700">
            <option value="all">All Statuses</option>
            {ORDER_STATUSES.map(s => <option key={s} value={s}>{prettifyStatus(s)}</option>)}
          </select>
          <select value={channelFilter} onChange={e => { setChannelFilter(e.target.value); setPage(1) }} className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-xs font-medium text-stone-700">
            <option value="all">All Channels</option>
            <option value="WEB">Web Storefront</option>
            <option value="WHATSAPP">WhatsApp Bot</option>
            <option value="ADMIN">Admin Portal</option>
            <option value="API">REST API</option>
          </select>
          <select value={methodFilter} onChange={e => { setMethodFilter(e.target.value); setPage(1) }} className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-xs font-medium text-stone-700">
            <option value="all">All Gateways</option>
            <option value="AMWALPAY">AmwalPay</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CASH">Cash on Delivery</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-16 text-center"><ShoppingBag className="h-10 w-10 text-stone-300 mx-auto mb-3" /><p className="text-stone-500">No orders found matching your search and filter criteria</p></CardContent></Card>
      ) : (
        <Card>
          <ScrollArea className="h-[550px]">
            <div className="divide-y divide-stone-100">
              {paginated.map(o => (
                <div key={o.id} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 cursor-pointer" onClick={() => setSelectedId(o.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-stone-900">{o.orderNumber}</span>
                      <Badge className={STATUS_COLORS[o.orderStatus]}>{prettifyStatus(o.orderStatus)}</Badge>
                      <Badge variant="outline" className={CHANNEL_COLORS[o.channel]}>{o.channel}</Badge>
                      {o.payments?.some(p => p.screenshotUrl) && (
                        <Badge variant="outline" className="bg-sky-50 text-sky-700 gap-1"><FileText className="h-3 w-3" />Proof</Badge>
                      )}
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5 truncate">{o.customerName} · {o.customerPhone} · {o.tour.name}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm text-stone-900">{formatCurrency(o.totalAmount)}</div>
                    <div className="text-[10px] text-stone-400">{timeAgo(o.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-500 hover:text-stone-900" title="View details" onClick={() => setSelectedId(o.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Delete booking"
                      onClick={() => setDeletingOrder(o)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-3 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
            <div className="flex items-center gap-2">
              <span>Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} bookings</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                  className="px-2 py-1 rounded border border-stone-200 bg-white text-xs text-stone-700"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="h-7 text-xs px-2.5"
                >
                  Previous
                </Button>
                <span className="px-2 font-medium text-stone-700">Page {currentPage} of {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="h-7 text-xs px-2.5"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {selectedId && <OrderDetail orderId={selectedId} onClose={() => setSelectedId(null)} onUpdate={load} />}
      {creating && <NewBookingDialog onClose={() => setCreating(false)} onCreated={load} />}

      <Dialog open={!!deletingOrder} onOpenChange={open => !open && !deletingBusy && setDeletingOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-rose-600">
              <div className="h-9 w-9 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <DialogTitle className="text-lg font-bold text-stone-900">Delete Booking</DialogTitle>
            </div>
            <DialogDescription className="pt-2 text-stone-600 text-sm">
              Are you sure you want to permanently delete booking <strong className="text-stone-900">{deletingOrder?.orderNumber}</strong> for <strong className="text-stone-900">{deletingOrder?.customerName}</strong>?
              <br /><br />
              This will release any held or booked slots, remove associated vouchers and payment records, and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setDeletingOrder(null)}
              disabled={deletingBusy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
              onClick={handleDeleteOrder}
              disabled={deletingBusy}
            >
              {deletingBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-stone-400">{label}</div>
      <div className="text-sm text-stone-800 mt-0.5">{children}</div>
    </div>
  )
}

export function OrderDetail({ orderId, onClose, onUpdate }: { orderId: string; onClose: () => void; onUpdate: () => void }) {
  const staffUser = useApp(s => s.staffUser)
  const [order, setOrder] = useState<OrderDetailData | null>(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<string, string | number>>({})
  const [nextStatus, setNextStatus] = useState("")
  const [reason, setReason] = useState("")
  const [zoom, setZoom] = useState<string | null>(null)
  const [rescheduling, setRescheduling] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const reload = async () => {
    const res = await fetch(`/api/orders/${orderId}`)
    const data = await res.json()
    if (data.order) {
      setOrder(data.order)
      setNextStatus(data.order.orderStatus)
    }
  }
  useEffect(() => { reload() }, [orderId])

  const handleDeleteCurrentOrder = async () => {
    setDeleteBusy(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete order")
      }
      toast.success(data.message || `Booking ${order?.orderNumber} deleted successfully`)
      setConfirmDelete(false)
      onClose()
      onUpdate()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete booking")
    } finally {
      setDeleteBusy(false)
    }
  }

  // Seed the edit form from the order only when entering edit mode, so a
  // background reload never overwrites what the user is typing.
  const startEditing = () => {
    if (!order) return
    setDraft({
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail ?? "",
      paxAdult: order.paxAdult,
      paxChild: order.paxChild,
      totalAmount: order.totalAmount,
      pickupLocation: order.pickupLocation ?? "",
      specialRequests: order.specialRequests ?? "",
    })
    setEditing(true)
  }

  const patch = async (body: Record<string, unknown>, okMessage: string) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: staffUser?.id, reason, ...body }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Update failed"); return false }
      toast.success(okMessage)
      await reload()
      onUpdate()
      return true
    } catch {
      toast.error("Network error")
      return false
    } finally {
      setBusy(false)
    }
  }

  const [gatewayRef, setGatewayRef] = useState("")

  const saveEdits = async () => {
    const ok = await patch({
      ...draft,
      paxAdult: Number(draft.paxAdult),
      paxChild: Number(draft.paxChild),
      totalAmount: Number(draft.totalAmount),
    }, "Order updated")
    if (ok) setEditing(false)
  }

  const applyStatus = async () => {
    if (!order || nextStatus === order.orderStatus) return
    // Cancelling releases seats and refunds, so route it through the action
    // that does that rather than the plain status override.
    const body = nextStatus === "CANCELLED"
      ? { action: "CANCEL" }
      : { action: "SET_STATUS", orderStatus: nextStatus }
    await patch(body, `Status → ${prettifyStatus(nextStatus)}`)
  }

  if (!order) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <Card className="w-full max-w-3xl p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></Card>
      </div>
    )
  }

  const pax = order.paxAdult + order.paxChild

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="max-w-3xl w-full max-h-[92vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <ScrollArea className="h-[88vh]">
          <div className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-stone-900">{order.orderNumber}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge className={STATUS_COLORS[order.orderStatus]}>{prettifyStatus(order.orderStatus)}</Badge>
                  <Badge variant="outline" className={CHANNEL_COLORS[order.channel]}>{order.channel}</Badge>
                  <Badge variant="outline">{order.paymentMethod}</Badge>
                  <span className="text-xs text-stone-400">Created {formatDateTime(order.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {!editing && <Button variant="outline" size="sm" onClick={startEditing}><Pencil className="h-3.5 w-3.5 mr-1.5" />Edit</Button>}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                  onClick={() => setConfirmDelete(true)}
                  disabled={busy || deleteBusy}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
              </div>
            </div>

            {/* Status control — any state, because staff sometimes need to correct a wrong one. */}
            <div className="p-3 rounded-lg border bg-stone-50 flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[180px]">
                <div className="text-[10px] uppercase tracking-wide text-stone-400 mb-1">Order status</div>
                <select
                  value={nextStatus}
                  onChange={e => setNextStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-white text-sm"
                >
                  {ORDER_STATUSES.map(s => <option key={s} value={s}>{prettifyStatus(s)}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[180px]">
                <div className="text-[10px] uppercase tracking-wide text-stone-400 mb-1">Reason (logged)</div>
                <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Why this change?" className="bg-white" />
              </div>
              <Button
                onClick={applyStatus}
                disabled={busy || nextStatus === order.orderStatus}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
              </Button>
            </div>

            {editing ? (
              <div className="p-4 rounded-lg border space-y-3">
                <div className="text-sm font-semibold text-stone-900">Edit booking</div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="text-xs text-stone-500">Customer name
                    <Input className="mt-1" value={String(draft.customerName ?? "")} onChange={e => setDraft({ ...draft, customerName: e.target.value })} />
                  </label>
                  <label className="text-xs text-stone-500">Phone
                    <Input className="mt-1" value={String(draft.customerPhone ?? "")} onChange={e => setDraft({ ...draft, customerPhone: e.target.value })} />
                  </label>
                  <label className="text-xs text-stone-500">Email
                    <Input className="mt-1" value={String(draft.customerEmail ?? "")} onChange={e => setDraft({ ...draft, customerEmail: e.target.value })} />
                  </label>
                  <label className="text-xs text-stone-500">Pickup / meeting point
                    <Input className="mt-1" value={String(draft.pickupLocation ?? "")} onChange={e => setDraft({ ...draft, pickupLocation: e.target.value })} />
                  </label>
                  <label className="text-xs text-stone-500">Adults
                    <Input className="mt-1" type="number" min={1} value={String(draft.paxAdult ?? 1)} onChange={e => setDraft({ ...draft, paxAdult: e.target.value })} />
                  </label>
                  <label className="text-xs text-stone-500">Children
                    <Input className="mt-1" type="number" min={0} value={String(draft.paxChild ?? 0)} onChange={e => setDraft({ ...draft, paxChild: e.target.value })} />
                  </label>
                  <label className="text-xs text-stone-500 sm:col-span-2">Total (OMR)
                    <Input className="mt-1" type="number" step="0.001" value={String(draft.totalAmount ?? 0)} onChange={e => setDraft({ ...draft, totalAmount: e.target.value })} />
                  </label>
                  <label className="text-xs text-stone-500 sm:col-span-2">Special requests
                    <Textarea className="mt-1" rows={2} value={String(draft.specialRequests ?? "")} onChange={e => setDraft({ ...draft, specialRequests: e.target.value })} />
                  </label>
                </div>
                <p className="text-[11px] text-stone-400">
                  Changing guest counts here does not move seats on the slot — use Reschedule for that.
                </p>
                <div className="flex gap-2">
                  <Button onClick={saveEdits} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}Save changes
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-stone-50 space-y-2">
                    <Field label="Customer">
                      <div className="font-medium">{order.customerName}</div>
                      <div className="text-xs text-stone-500 flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3" />{order.customerPhone}</div>
                      {order.customerEmail && <div className="text-xs text-stone-500 flex items-center gap-1"><Mail className="h-3 w-3" />{order.customerEmail}</div>}
                    </Field>
                    {order.customer && (
                      <div className="text-xs text-stone-500">{order.customer.loyaltyTier} · {order.customer.totalBookings} bookings</div>
                    )}
                  </div>
                  <div className="p-3 rounded-lg bg-stone-50 space-y-2">
                    <Field label="Tour">
                      <div className="font-medium">{order.tour.name}</div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        {formatDate(order.slot.date)} · {order.slot.startTime}{order.slot.endTime ? `–${order.slot.endTime}` : ""}
                      </div>
                    </Field>
                    {(order.pickupLocation || order.tour.meetingPoint) && (
                      <Field label="Meeting point"><span className="text-xs">{order.pickupLocation || order.tour.meetingPoint}</span></Field>
                    )}
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setRescheduling(true)}>
                      <CalendarClock className="h-3.5 w-3.5 mr-1.5" />Reschedule
                    </Button>
                  </div>
                </div>

                <div className="p-3 rounded-lg border space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-stone-500">Adults</span><span className="font-medium">{order.paxAdult}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-stone-500">Children</span><span className="font-medium">{order.paxChild}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-stone-500">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span><span>−{formatCurrency(order.discount)}</span>
                    </div>
                  )}
                  {order.taxAmount > 0 && <div className="flex justify-between text-sm"><span className="text-stone-500">VAT</span><span>{formatCurrency(order.taxAmount)}</span></div>}
                  <div className="border-t pt-2 flex justify-between text-sm"><span className="text-stone-500">Total ({pax} {pax === 1 ? "guest" : "guests"})</span><span className="font-bold text-emerald-600">{formatCurrency(order.totalAmount)}</span></div>
                </div>

                {order.specialRequests && (
                  <div className="p-3 rounded-lg border bg-amber-50 border-amber-200">
                    <Field label="Special requests"><span className="text-xs">{order.specialRequests}</span></Field>
                  </div>
                )}
              </>
            )}

            {/* Payments — including the proof the customer sent over WhatsApp. */}
            <div className="space-y-3">
              <div className="text-sm font-semibold text-stone-900">Payments</div>
              {order.payments.length === 0 && <p className="text-xs text-stone-400">No payment recorded yet.</p>}
              {order.payments.map(p => (
                <div key={p.id} className="p-3 rounded-lg border space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-sm font-medium">{p.method === "BANK_TRANSFER" ? "Bank Transfer" : "AmwalPay"} · {formatCurrency(p.amount)}</div>
                    <Badge className={p.status === "APPROVED" || p.status === "VERIFIED" ? "bg-emerald-100 text-emerald-700" : p.status === "REJECTED" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}>
                      {prettifyStatus(p.status)}
                    </Badge>
                  </div>
                  {/*
                    * Whether the money actually arrived, said plainly.
                    *
                    * The panel showed a status chip and a "Gateway ref" that
                    * was really this order's own number, so a card payment
                    * that had cleared and one that had not looked identical.
                    */}
                  <div className={`rounded-md px-3 py-2 text-sm font-medium ${
                    p.status === "APPROVED" || p.status === "VERIFIED"
                      ? "bg-emerald-50 text-emerald-800"
                      : p.status === "REJECTED" || p.status === "FAILED"
                        ? "bg-rose-50 text-rose-800"
                        : "bg-amber-50 text-amber-900"
                  }`}>
                    {p.status === "APPROVED" || p.status === "VERIFIED"
                      ? `Paid · ${formatCurrency(p.amount)}`
                      : p.status === "REJECTED" || p.status === "FAILED"
                        ? "Not paid — payment failed or was rejected"
                        : "Not paid yet — awaiting confirmation"}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2">
                    <Field label="Transaction number">
                      {p.gatewayReference
                        ? <code className="text-xs">{p.gatewayReference}</code>
                        : <span className="text-xs text-stone-400">Not recorded</span>}
                    </Field>
                    <Field label="Order reference"><code className="text-xs">{order.orderNumber}</code></Field>
                    {p.bankReference && <Field label="Bank ref"><code className="text-xs">{p.bankReference}</code></Field>}
                    {p.bankName && <Field label="Bank">{p.bankName}</Field>}
                    {p.transferDate && <Field label="Transfer date">{formatDate(p.transferDate)}</Field>}
                    {typeof p.fraudScore === "number" && p.fraudScore > 0 && (
                      <Field label="Fraud score"><span className={p.fraudScore > 0.5 ? "text-rose-600" : "text-stone-600"}>{Math.round(p.fraudScore * 100)}%</span></Field>
                    )}
                    <Field label="Submitted">{formatDateTime(p.createdAt)}</Field>
                  </div>
                  {p.rejectionReason && <div className="text-xs text-rose-600">Rejected: {p.rejectionReason}</div>}
                  {p.verifierComment && <div className="text-xs text-stone-500">Note: {p.verifierComment}</div>}

                  <PaymentProof url={p.screenshotUrl} />

                  {p.method !== "BANK_TRANSFER" && !["APPROVED", "VERIFIED"].includes(p.status) && (
                    /*
                     * AmwalPay confirms card payments through a signed
                     * notification, which needs the Webhook API enabled on the
                     * merchant account. Until it is, the transaction number is
                     * only visible to whoever watched the payment succeed — so
                     * this lets them record it and settle the order, and the
                     * audit log marks it as a staff decision rather than
                     * gateway verification.
                     */
                    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-2">
                      <div className="text-xs font-medium text-stone-700">Record the card payment</div>
                      <p className="text-[11px] text-stone-500">
                        Paste the Payment Id from the AmwalPay receipt. This confirms the booking and sends the customer their voucher.
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <input
                          className="flex-1 min-w-[200px] rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                          placeholder="AmwalPay Payment Id"
                          value={gatewayRef}
                          onChange={e => setGatewayRef(e.target.value)}
                        />
                        <Button
                          size="sm"
                          disabled={busy || !gatewayRef.trim()}
                          onClick={() => patch(
                            { action: "SET_STATUS", orderStatus: "CONFIRMED", gatewayReference: gatewayRef.trim() },
                            "Payment recorded",
                          )}
                        >
                          Mark paid
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {order.vouchers.length > 0 && (
              <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-emerald-600">Voucher</div>
                    <code className="text-sm font-mono text-emerald-700">{order.vouchers[0].voucherCode}</code>
                  </div>
                  <Badge className="bg-emerald-200 text-emerald-700">{order.vouchers[0].status}</Badge>
                </div>
                <a
                  href={`/booking/${order.orderNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-700 underline"
                >
                  <ExternalLink className="h-3 w-3" />Open confirmation page &amp; PDF ticket
                </a>
              </div>
            )}

            {order.cancelReason && (
              <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-700">
                Cancelled {order.cancelledAt ? formatDateTime(order.cancelledAt) : ""} — {order.cancelReason}
              </div>
            )}

            {order.auditLogs && order.auditLogs.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-stone-900 flex items-center gap-1.5"><History className="h-4 w-4 text-stone-400" />History</div>
                <div className="space-y-1">
                  {order.auditLogs.map(log => (
                    <div key={log.id} className="text-xs text-stone-500 flex gap-2">
                      <span className="text-stone-400 shrink-0">{formatDateTime(log.createdAt)}</span>
                      <span className="text-stone-700">{prettifyStatus(log.action)}</span>
                      {log.staff && <span>by {log.staff.name}</span>}
                      {log.reason && <span className="italic">— {log.reason}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {order.orderStatus === "CANCELLATION_REQUESTED" && (
              <div className="p-3 rounded-lg border border-orange-200 bg-orange-50 space-y-2">
                <div className="text-sm font-semibold text-orange-800">The customer asked to cancel</div>
                <p className="text-xs text-orange-700">
                  {order.cancelReason || "No reason given."} Nothing has been cancelled and no refund has been issued — that is your decision.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={() => { if (confirm("Approve the cancellation? Seats are released and the payment is marked refunded.")) patch({ action: "CANCEL" }, "Cancellation approved") }}
                  >
                    Approve cancellation
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => patch({ action: "SET_STATUS", orderStatus: "CONFIRMED" }, "Cancellation declined")}
                  >
                    Decline, keep the booking
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1 flex-wrap">
              {order.orderStatus === "CONFIRMED" && (
                <Button onClick={() => patch({ action: "COMPLETE" }, "Order completed")} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle className="h-4 w-4 mr-1.5" />Mark completed
                </Button>
              )}
              {order.orderStatus !== "CANCELLED" && order.orderStatus !== "COMPLETED" && (
                <Button variant="destructive" disabled={busy} onClick={() => { if (confirm("Cancel this order and release the seats?")) patch({ action: "CANCEL" }, "Order cancelled") }}>
                  <Ban className="h-4 w-4 mr-1.5" />Cancel booking
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>
      </Card>

      {zoom && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-6" onClick={e => { e.stopPropagation(); setZoom(null) }}>
          <img src={zoom} alt="Payment proof" className="max-h-full max-w-full object-contain" />
        </div>
      )}

      {rescheduling && (
        <RescheduleDialog
          order={order}
          onClose={() => setRescheduling(false)}
          onDone={async () => { setRescheduling(false); await reload(); onUpdate() }}
        />
      )}

      <Dialog open={confirmDelete} onOpenChange={open => !open && !deleteBusy && setConfirmDelete(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-rose-600">
              <div className="h-9 w-9 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <DialogTitle className="text-lg font-bold text-stone-900">Delete Booking</DialogTitle>
            </div>
            <DialogDescription className="pt-2 text-stone-600 text-sm">
              Are you sure you want to permanently delete booking <strong className="text-stone-900">{order.orderNumber}</strong> for <strong className="text-stone-900">{order.customerName}</strong>?
              <br /><br />
              This will release any held or booked slots, remove associated vouchers and payment records, and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={deleteBusy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
              onClick={handleDeleteCurrentOrder}
              disabled={deleteBusy}
            >
              {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface SlotOption { id: string; date: string; startTime: string; capacity: number; seatsBooked: number; seatsHeld: number; status: string }

/** The slots endpoint returns every slot, including sold-out and past ones. */
function bookableSlots(slots: SlotOption[], pax: number, excludeId?: string) {
  const now = Date.now()
  return slots.filter(s =>
    s.id !== excludeId &&
    s.status === "OPEN" &&
    new Date(s.date).getTime() >= now - 86_400_000 &&
    s.capacity - s.seatsBooked - s.seatsHeld >= pax
  )
}

function RescheduleDialog({ order, onClose, onDone }: { order: OrderDetailData; onClose: () => void; onDone: () => void }) {
  const staffUser = useApp(s => s.staffUser)
  const [slots, setSlots] = useState<SlotOption[]>([])
  const [slotId, setSlotId] = useState("")
  const [busy, setBusy] = useState(false)
  const pax = order.paxAdult + order.paxChild

  useEffect(() => {
    if (!order.tour.id) return
    fetch(`/api/slots?tourId=${order.tour.id}`).then(r => r.json()).then(d => setSlots(d.slots || [])).catch(() => setSlots([]))
  }, [order.tour.id])

  const options = bookableSlots(slots, pax, order.slotId)

  const submit = async () => {
    setBusy(true)
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "RESCHEDULE", newSlotId: slotId, staffId: staffUser?.id }),
    })
    setBusy(false)
    if (!res.ok) { toast.error("Reschedule failed"); return }
    toast.success("Booking rescheduled")
    onDone()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={e => { e.stopPropagation(); onClose() }}>
      <Card className="w-full max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="text-sm font-semibold">Reschedule {order.orderNumber}</div>
        <p className="text-xs text-stone-500">Moves {pax} {pax === 1 ? "seat" : "seats"} off {formatDate(order.slot.date)} onto the new date.</p>
        {options.length === 0 ? (
          <p className="text-xs text-stone-400">No other slot has room for {pax} guests.</p>
        ) : (
          <select value={slotId} onChange={e => setSlotId(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-white text-sm">
            <option value="">Choose a date…</option>
            {options.map(s => (
              <option key={s.id} value={s.id}>
                {formatDate(s.date)} · {s.startTime} · {s.capacity - s.seatsBooked - s.seatsHeld} left
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-2">
          <Button onClick={submit} disabled={!slotId || busy} className="bg-emerald-600 hover:bg-emerald-700">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}Move booking
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </Card>
    </div>
  )
}

interface TourOption { id: string; name: string; basePrice: number }

function NewBookingDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [tours, setTours] = useState<TourOption[]>([])
  const [slots, setSlots] = useState<SlotOption[]>([])
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    tourId: "", slotId: "", customerName: "", customerPhone: "", customerEmail: "",
    paxAdult: 1, paxChild: 0, pickupLocation: "", specialRequests: "", paymentMethod: "BANK_TRANSFER",
  })

  useEffect(() => {
    fetch("/api/tours").then(r => r.json()).then(d => setTours(d.tours || [])).catch(() => setTours([]))
  }, [])
  useEffect(() => {
    if (!form.tourId) { setSlots([]); return }
    fetch(`/api/slots?tourId=${form.tourId}`).then(r => r.json()).then(d => setSlots(d.slots || [])).catch(() => setSlots([]))
  }, [form.tourId])

  const pax = Number(form.paxAdult) + Number(form.paxChild)
  const options = bookableSlots(slots, pax)

  const submit = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          paxAdult: Number(form.paxAdult),
          paxChild: Number(form.paxChild),
          customerEmail: form.customerEmail || undefined,
          pickupLocation: form.pickupLocation || undefined,
          specialRequests: form.specialRequests || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Could not create booking"); return }
      toast.success(`Created ${data.order?.orderNumber ?? "booking"}`)
      onCreated()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const ready = form.tourId && form.slotId && form.customerName.trim() && /^\+[1-9]\d{7,14}$/.test(form.customerPhone.replace(/[\s()-]/g, ""))

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <ScrollArea className="max-h-[88vh]">
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">New booking</div>
              <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
            </div>

            <label className="text-xs text-stone-500 block">Tour
              <select value={form.tourId} onChange={e => setForm({ ...form, tourId: e.target.value, slotId: "" })} className="mt-1 w-full px-3 py-2 rounded-lg border bg-white text-sm">
                <option value="">Choose a tour…</option>
                {tours.map(t => <option key={t.id} value={t.id}>{t.name} — {formatCurrency(t.basePrice)}</option>)}
              </select>
            </label>

            <label className="text-xs text-stone-500 block">Date
              <select value={form.slotId} onChange={e => setForm({ ...form, slotId: e.target.value })} disabled={!form.tourId} className="mt-1 w-full px-3 py-2 rounded-lg border bg-white text-sm disabled:bg-stone-100">
                <option value="">{form.tourId ? "Choose a date…" : "Pick a tour first"}</option>
                {options.map(s => (
                  <option key={s.id} value={s.id}>{formatDate(s.date)} · {s.startTime} · {s.capacity - s.seatsBooked - s.seatsHeld} left</option>
                ))}
              </select>
              {form.tourId && options.length === 0 && <span className="text-[11px] text-amber-600">No slot has room for {pax} guests.</span>}
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-stone-500">Adults
                <Input className="mt-1" type="number" min={1} value={form.paxAdult} onChange={e => setForm({ ...form, paxAdult: Number(e.target.value) })} />
              </label>
              <label className="text-xs text-stone-500">Children
                <Input className="mt-1" type="number" min={0} value={form.paxChild} onChange={e => setForm({ ...form, paxChild: Number(e.target.value) })} />
              </label>
            </div>

            <label className="text-xs text-stone-500 block">Customer name
              <Input className="mt-1" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} />
            </label>
            <label className="text-xs text-stone-500 block">Phone (with country code)
              <Input className="mt-1" placeholder="+96898821965" value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} />
            </label>
            <label className="text-xs text-stone-500 block">Email (optional)
              <Input className="mt-1" value={form.customerEmail} onChange={e => setForm({ ...form, customerEmail: e.target.value })} />
            </label>
            <label className="text-xs text-stone-500 block">Pickup location (optional)
              <Input className="mt-1" value={form.pickupLocation} onChange={e => setForm({ ...form, pickupLocation: e.target.value })} />
            </label>
            <label className="text-xs text-stone-500 block">Special requests (optional)
              <Textarea className="mt-1" rows={2} value={form.specialRequests} onChange={e => setForm({ ...form, specialRequests: e.target.value })} />
            </label>
            <label className="text-xs text-stone-500 block">Payment method
              <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg border bg-white text-sm">
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="AMWALPAY">AmwalPay (card)</option>
              </select>
            </label>

            <p className="text-[11px] text-stone-400">
              The booking is created unpaid. Confirm it from the order once payment lands.
            </p>

            <div className="flex gap-2">
              <Button onClick={submit} disabled={!ready || busy} className="bg-emerald-600 hover:bg-emerald-700">
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}Create booking
              </Button>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </div>
        </ScrollArea>
      </Card>
    </div>
  )
}
