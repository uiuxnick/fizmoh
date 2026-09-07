import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { formatCurrency, formatDate } from "@/lib/helpers"
import { voucherPdfUrl } from "@/app/api/vouchers/[id]/pdf/route"
import { getConfigValue } from "@/lib/app-config"
import { ReturnToWhatsApp } from "@/components/return-to-whatsapp"
import { AwaitConfirmation } from "@/components/await-confirmation"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Booking confirmed",
  robots: { index: false },
}

/**
 * Post-payment landing page.
 *
 * Reachable without a login: the customer arrives straight from AmwalPay and
 * has no account. It shows only what they already know from their own booking,
 * and is keyed by the order number the gateway hands back.
 */
export default async function BookingPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>
}) {
  const { orderNumber } = await params

  const order = await db.order.findFirst({
    where: { orderNumber: decodeURIComponent(orderNumber) },
    include: { tour: true, slot: true, vouchers: true },
  })
  if (!order) notFound()

  const paid = order.paymentStatus === "APPROVED" || order.paymentStatus === "PAID"

  // The business the customer actually booked with
  let brand = ""
  let supportEmail = ""
  let businessPhone = ""

  if (order.tenantId) {
    const tenant = await db.tenant.findUnique({
      where: { id: order.tenantId },
      select: { name: true },
    })
    if (tenant?.name) brand = tenant.name
  }

  if (!brand) {
    brand = (await getConfigValue("business_name")) || "Fizmoh"
  }
  supportEmail = (await getConfigValue("business_email")) || ""
  businessPhone = (await getConfigValue("business_phone")) || ""

  const brandLine = [brand, supportEmail].filter(Boolean).join(" · ")
  const voucher = order.vouchers[0]
  const pdf = voucherPdfUrl(order.id)

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
          <div className={`px-6 py-8 text-center text-white ${paid ? "bg-emerald-600" : "bg-amber-500"}`}>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-3xl">
              {paid ? "✓" : "⏳"}
            </div>
            <h1 className="text-xl font-bold">
              {paid ? "Booking confirmed!" : "Payment pending"}
            </h1>
            <p className="mt-1 text-sm opacity-90">
              {paid
                ? "Your e-ticket is ready below"
                : "We'll confirm as soon as your payment clears"}
            </p>
          </div>

          <div className="space-y-4 p-6">
            <div className="rounded-lg bg-stone-50 p-4">
              <div className="text-[11px] uppercase tracking-wide text-stone-500">Order</div>
              <div className="font-mono text-sm font-semibold text-stone-900">{order.orderNumber}</div>
            </div>

            <dl className="space-y-3 text-sm">
              {[
                ["Tour", order.tour.name],
                ["Date", formatDate(order.slot.date)],
                ["Departure", order.slot.startTime],
                ["Guests", `${order.paxAdult} adult${order.paxAdult === 1 ? "" : "s"}${order.paxChild ? `, ${order.paxChild} child` : ""}`],
                ["Lead traveller", order.customerName],
                ["Meeting point", order.tour.meetingPoint || "Sent with your confirmation"],
                ...(voucher ? [["Voucher", voucher.voucherCode]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-stone-100 pb-2 last:border-0">
                  <dt className="shrink-0 text-stone-500">{label}</dt>
                  <dd className="text-right font-medium text-stone-900">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-4">
              <span className="text-sm text-emerald-800">Total {paid ? "paid" : "due"}</span>
              <span className="text-lg font-bold text-emerald-700">{formatCurrency(order.totalAmount)}</span>
            </div>

            {paid && (
              <a
                href={pdf}
                className="block rounded-lg bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700"
              >
                📄 Download e-ticket (PDF)
              </a>
            )}

            <p className="text-center text-xs text-stone-500">
              A copy has also been sent to your WhatsApp. Please arrive 15 minutes before departure and
              bring valid photo ID.
            </p>

            {/* Only once the money is in. Sending somebody back to the chat
                mid-payment would look like the payment had finished. */}
            {paid && businessPhone && <ReturnToWhatsApp phone={businessPhone} />}

            {/* A customer often arrives here before the gateway's webhook
                does. Rather than showing "pending" until they think to
                refresh, the page checks itself for a minute. */}
            {!paid && <AwaitConfirmation />}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-stone-400">
          {brandLine}
        </p>
      </div>
    </main>
  )
}
