import { ORDER_STATUS } from "@/lib/constants"
import { randomBytes } from "crypto"


export async function generateOrderNumber(): Promise<string> {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "")
  return `ORD-${date}-${randomBytes(4).toString("hex").toUpperCase()}`
}

export async function generateVoucherCode(): Promise<string> {
  // Use timestamp + random to ensure uniqueness
  const ts = Date.now().toString().slice(-6)
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, "0")
  return `VCH-${ts}${rand}`
}

export function formatCurrency(amount: number, currency = "OMR"): string {
  if (currency === "OMR") {
    return `${amount.toFixed(3)} ${currency}`
  }
  return `${amount.toFixed(2)} ${currency}`
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(d)
}

export function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING_PAYMENT: "bg-amber-100 text-amber-700 border-amber-200",
    PAYMENT_SUBMITTED: "bg-blue-100 text-blue-700 border-blue-200",
    CONFIRMED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-rose-100 text-rose-700 border-rose-200",
    REFUNDED: "bg-purple-100 text-purple-700 border-purple-200",
    NO_SHOW: "bg-stone-100 text-stone-700 border-stone-200",
  }
  return colors[status] || "bg-stone-100 text-stone-700 border-stone-200"
}

export function getPaymentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700 border-amber-200",
    SUBMITTED: "bg-blue-100 text-blue-700 border-blue-200",
    APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    PAID: "bg-emerald-100 text-emerald-700 border-emerald-200",
    REJECTED: "bg-rose-100 text-rose-700 border-rose-200",
    FAILED: "bg-rose-100 text-rose-700 border-rose-200",
    REFUNDED: "bg-purple-100 text-purple-700 border-purple-200",
  }
  return colors[status] || "bg-stone-100 text-stone-700 border-stone-200"
}

export function prettifyStatus(status: string): string {
  return status.split("_").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ")
}



export function calculateOrderPrice(basePrice: number, childPrice: number, paxAdult: number, paxChild: number, addOnsTotal: number, discount: number, vatRate = 0.05) {
  const subtotal = basePrice * paxAdult + childPrice * paxChild + addOnsTotal
  const afterDiscount = Math.max(0, subtotal - discount)
  const taxAmount = afterDiscount * vatRate
  const total = afterDiscount + taxAmount
  return { subtotal, discount, taxAmount, total }
}

