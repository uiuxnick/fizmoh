import { NextRequest, NextResponse } from "next/server"
import { db, raw } from "@/lib/db"
import { sendOrderConfirmation } from "@/lib/notifications"
import { verifyCallbackHash, parseWebhookEvent, refreshAmwalPayConfig } from "@/lib/amwalpay"
import { generateVoucherCode } from "@/lib/helpers"
import { confirmSlotSeats, createAuditLog } from "@/lib/slots-server"
import { refreshCustomerTotals } from "@/lib/customer-totals"
import { syncOrderToCalendar } from "@/lib/google-calendar"
import { withErrors } from "@/lib/api-handler"
import { tenantOf, withTenant } from "@/lib/tenant"
import { notifyStaff } from "@/lib/realtime"
import { sendAptConfirmation } from "@/lib/apt-whatsapp"
import { localDateKey } from "@/lib/timezone"
import { PLATFORM } from "@/lib/tenant"

/**
 * AmwalPay Webhook Handler
 *
 * Supports both Tour Orders (ORD-*) and Appointments (APT-*).
 * Verifies signed webhooks from AmwalPay -> updates payment status -> triggers confirmation.
 */
export const POST = withErrors(async (request: NextRequest) => {
  try {
    const body = await request.text()

    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(body)
    } catch {
      payload = Object.fromEntries(new URLSearchParams(body))
    }

    const event = parseWebhookEvent(payload)
    const ref = event.orderReference || ""

    // ── Handle Appointment Webhook (APT-*) ──
    if (ref.startsWith("APT-")) {
      const aptStub = await raw.aptAppointment.findFirst({
        where: { reference: ref },
        select: { tenantId: true },
      })
      if (!aptStub) {
        console.error("AmwalPay webhook: Appointment not found:", ref)
        return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
      }
      const tenant = await tenantOf(aptStub.tenantId)
      if (!tenant) return NextResponse.json({ error: "Workspace not resolved" }, { status: 404 })

      return await withTenant(tenant, async () => {
        await refreshAmwalPayConfig()

        if (!verifyCallbackHash(payload)) {
          console.error("AmwalPay callback hash verification FAILED for appointment:", ref)
          return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
        }

        const apt = await db.aptAppointment.findFirst({
          where: { reference: ref },
          include: { service: true, provider: true, branch: true },
        })

        if (!apt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 })

        if (event.amount > 0 && Math.abs(event.amount - apt.totalAmount) > 0.01) {
          return NextResponse.json({ error: "Payment amount does not match appointment" }, { status: 400 })
        }

        if (!(await claimNotification(ref, payload))) return NextResponse.json({ received: true, duplicate: true })

        if (event.eventType === "payment.success") {
          if (apt.paymentStatus === "PAID" && apt.status === "CONFIRMED") {
            return NextResponse.json({ received: true, duplicate: true })
          }
          await db.aptAppointment.update({
            where: { id: apt.id },
            data: { paymentStatus: "PAID", paymentMethod: "AMWALPAY_ONLINE", status: "CONFIRMED" },
          })
          await db.aptHistory.create({
            data: {
              tenantId: apt.tenantId,
              appointmentId: apt.id,
              statusTo: apt.status,
              notes: `Paid online via AmwalPay Webhook (Txn: ${event.transactionId})`,
              changedBy: "SYSTEM",
            },
          })

          const dateStr = localDateKey(new Date(apt.appointmentDate))
          await sendAptConfirmation({
            phone: apt.customerPhone,
            reference: apt.reference,
            customerName: apt.customerName,
            customerEmail: apt.customerEmail,
            serviceName: apt.service?.name || "Service",
            providerName: apt.provider?.name,
            branchName: apt.branch?.name,
            dateStr,
            timeStr: apt.startTime,
            durationMins: apt.durationMins,
            price: apt.totalAmount,
            currency: apt.service?.currency || "OMR",
            paymentStatus: "PAID",
            meetLink: apt.meetLink,
          })
        }
        return NextResponse.json({ received: true })
      })
    }

    // ── Handle Tour Order Webhook (ORD-*) ──
    const orderStub = await raw.order.findFirst({
      where: { orderNumber: ref },
      select: { tenantId: true },
    })
    if (!orderStub) {
      console.error("AmwalPay webhook: Order not found:", ref)
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }
    const tenant = await tenantOf(orderStub.tenantId)
    if (!tenant) return NextResponse.json({ error: "Workspace not resolved" }, { status: 404 })

    return await withTenant(tenant, async () => {
      await refreshAmwalPayConfig()

      if (!verifyCallbackHash(payload)) {
        console.error("AmwalPay callback hash verification FAILED", {
          merchantReference: payload.merchantReference,
          transactionId: payload.transactionId,
        })
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }

      const order = await db.order.findFirst({
        where: { orderNumber: ref },
        include: { tour: true, slot: true, customer: true, payments: true },
      })

      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

      if (event.amount > 0 && Math.abs(event.amount - order.totalAmount) > 0.01) {
        return NextResponse.json({ error: "Payment amount does not match order" }, { status: 400 })
      }

      if (!(await claimNotification(ref, payload))) return NextResponse.json({ received: true, duplicate: true })

      const payment = order.payments.find(p => p.method === "AMWALPAY")
      if (!payment) return NextResponse.json({ error: "Payment record not found" }, { status: 404 })

      switch (event.eventType) {
        case "payment.success": {
          await db.payment.update({
            where: { id: payment.id },
            data: {
              status: "APPROVED",
              gatewayReference: event.transactionId,
              verifiedAt: new Date(),
              webhookPayload: JSON.parse(JSON.stringify(payload)),
            },
          })

          const claimed = await db.order.updateMany({
            where: { id: order.id, orderStatus: { not: "CONFIRMED" } },
            data: { paymentStatus: "APPROVED", orderStatus: "CONFIRMED", confirmedAt: new Date() },
          })
          if (claimed.count === 0) return NextResponse.json({ received: true, duplicate: true })

          let voucherCode = (order as any).voucherCode || generateVoucherCode()

          await confirmSlotSeats(order.slotId, (order as any).guests || (order as any).totalGuests || 1)
          await refreshCustomerTotals(order.customerId)

          syncOrderToCalendar(order.id).catch(err => console.error("Google Calendar sync failed:", err))

          await createAuditLog({
            action: "PAYMENT_CONFIRMED",
            entity: "ORDER",
            entityId: order.id,
            details: { transactionId: event.transactionId, voucherCode },
          })

          notifyStaff({
            type: "ORDER_PAID",
            title: "Order Paid via AmwalPay",
            message: `${order.customerName} paid ${order.totalAmount} OMR for ${order.tour.name}`,
            data: { orderId: order.id, orderNumber: order.orderNumber },
          })

          try {
            await sendOrderConfirmation(order.id)
          } catch (e) {
            console.error("Failed to send order confirmation:", e)
          }

          return NextResponse.json({ received: true, status: "CONFIRMED" })
        }

        case "payment.failed": {
          await db.payment.update({
            where: { id: payment.id },
            data: {
              status: "DECLINED",
              gatewayReference: event.transactionId,
              webhookPayload: JSON.parse(JSON.stringify(payload)),
            },
          })
          await db.order.update({
            where: { id: order.id },
            data: { paymentStatus: "FAILED" },
          })
          return NextResponse.json({ received: true, status: "FAILED" })
        }

        default:
          return NextResponse.json({ received: true })
      }
    })
  } catch (error) {
    console.error("AmwalPay webhook error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
})

async function claimNotification(reference: string, payload: Record<string, unknown>): Promise<boolean> {
  const transaction = String(payload.transactionId || payload.SystemReference || payload.authorizationDateTime || "").trim()
  if (!reference || !transaction) return true
  const key = `amwal_processed_${reference}_${transaction}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180)
  try {
    await raw.systemSetting.create({ data: { tenantId: PLATFORM, key, value: new Date().toISOString(), type: "STRING", category: "PAYMENTS" } })
    return true
  } catch { return false }
}
