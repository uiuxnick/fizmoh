import { NextRequest, NextResponse } from "next/server"
import { db, raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { amwalPayConfig, platformAmwalPayConfig, verifyCloudNotificationHash } from "@/lib/amwalpay"
import { withTenant, type TenantContext } from "@/lib/tenant"
import { isAddonReference, isSubscriptionReference, settleInvoice } from "@/lib/billing"
import { confirmSlotSeats, createAuditLog } from "@/lib/slots-server"
import { generateVoucherCode, formatDate } from "@/lib/helpers"
import { sendOrderConfirmation, sendWhatsApp } from "@/lib/notifications"
import { sendAptConfirmation } from "@/lib/apt-whatsapp"
import { localDateKey } from "@/lib/timezone"
import { syncOrderToCalendar } from "@/lib/google-calendar"
import { PLATFORM } from "@/lib/tenant"

/**
 * AmwalPay's Merchant Cloud Notification.
 *
 * Supports Tour Orders (ORD-*), Appointments (APT-*), and Chemotherapy Day Care (CHEMO-*).
 */

const ACK = { message: "success", success: true }

/** Claim one signed gateway notification before any side effect. */
async function claimNotification(reference: string, body: CloudNotification): Promise<boolean> {
  const transaction = String(body.SystemReference || (body as any).TransactionId || body.AuthorizationDateTime || "").trim()
  if (!reference || !transaction) return true
  const key = `amwal_processed_${reference}_${transaction}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180)
  try {
    await raw.systemSetting.create({
      data: { tenantId: PLATFORM, key, value: new Date().toISOString(), type: "STRING", category: "PAYMENTS" },
    })
    return true
  } catch {
    // The compound unique key is the idempotency lock. A retry is already done.
    return false
  }
}

interface CloudNotification {
  MerchantId?: string | number
  TerminalId?: string | number
  AuthorizationDateTime?: string
  DateTimeLocalTrxn?: string
  SecureHash?: string
  TxnType?: string
  SystemReference?: string
  Amount?: string | number
  CurrencyId?: string | number
  Message?: string
  ResponseCode?: string
  PaidThrough?: string
  MerchantReference?: string
  UDF?: string
  [key: string]: unknown
}

export const POST = withErrors(async (request: NextRequest) => {
  const body = (await request.json().catch(() => null)) as CloudNotification | null
  if (!body) return NextResponse.json({ message: "invalid", success: false }, { status: 400 })

  const reference = String(body.MerchantReference || (body as any).merchantReference || body.UDF || "").trim()
  // Verify before any invoice, appointment, chemo booking or order is
  // changed. Browser returns and forged POSTs are not payment proof.
  let config = await platformAmwalPayConfig()
  let tenantId: string | null = null
  if (reference.startsWith("APT-")) tenantId = (await raw.aptAppointment.findFirst({ where: { reference }, select: { tenantId: true } }))?.tenantId ?? null
  else if (reference.startsWith("CHEMO-")) tenantId = (await raw.hospChemoBooking.findFirst({ where: { bookingRef: reference }, select: { tenantId: true } }))?.tenantId ?? null
  else if (reference.startsWith("ORD-")) tenantId = (await raw.order.findFirst({ where: { orderNumber: reference }, select: { tenantId: true } }))?.tenantId ?? null
  else if (reference.startsWith("KIT-")) tenantId = (await raw.kitchenOrder.findUnique({ where: { id: reference.slice(4) }, select: { tenantId: true } }))?.tenantId ?? null
  else if (isAddonReference(reference)) tenantId = (await raw.subscriptionInvoice.findUnique({ where: { reference }, select: { tenantId: true } }))?.tenantId ?? null
  if (tenantId) {
    const tenant = await raw.tenant.findUnique({ where: { id: tenantId }, select: { id: true, slug: true } })
    if (tenant) config = await withTenant({ tenantId: tenant.id, slug: tenant.slug }, () => amwalPayConfig())
  }
  const replay = request.headers.get("x-fizmoh-replay") === process.env.CRON_SECRET
  if (!replay && !verifyCloudNotificationHash(body as Record<string, unknown>, config)) {
    console.error("AmwalPay cloud notification: invalid signature", { reference })
    return NextResponse.json({ message: "invalid signature", success: false }, { status: 401 })
  }

  const approved =
    ["0", "00"].includes(String(body.ResponseCode ?? "")) ||
    /^success|approved|paid|completed$/i.test(String(body.Message ?? ""))

  if (reference && (isSubscriptionReference(reference) || isAddonReference(reference))) {
    const settled = await settleInvoice({
      reference,
      gatewayReference: String(body.SystemReference ?? ""),
      approved,
    })
    if (!settled.ok) console.error("Subscription payment for an unknown invoice:", reference)
    return NextResponse.json(ACK)
  }

  // ── Appointment Cloud Notification (APT-*) ──
  if (reference.startsWith("APT-")) {
    const apt = await db.aptAppointment.findFirst({
      where: { reference },
      include: { service: true, provider: true, branch: true },
    })
    if (apt) {
        if (approved) {
          const callbackAmount = Number(body.Amount)
          if (Number.isFinite(callbackAmount) && callbackAmount > 0 && Math.abs(callbackAmount - apt.totalAmount) > 0.01) {
            console.error("AmwalPay appointment amount mismatch", { reference, callbackAmount, expected: apt.totalAmount })
            return NextResponse.json({ message: "amount mismatch", success: false }, { status: 400 })
          }
        }
        if (!(await claimNotification(reference, body))) return NextResponse.json(ACK)
        if (approved) {
          if (apt.paymentStatus === "PAID" && apt.status === "CONFIRMED") return NextResponse.json(ACK)
        await db.aptAppointment.update({
          where: { id: apt.id },
          data: { paymentStatus: "PAID", paymentMethod: "AMWALPAY_ONLINE", status: "CONFIRMED" },
        })

        const dateStr = localDateKey(new Date(apt.appointmentDate))
        await sendAptConfirmation({
          phone: apt.customerPhone,
          reference: apt.reference,
          customerName: apt.customerName,
          customerEmail: apt.customerEmail,
          serviceName: apt.service?.name || "Consultation",
          providerName: apt.provider?.name,
          branchName: apt.branch?.name,
          dateStr,
          timeStr: apt.startTime,
          durationMins: apt.durationMins,
          price: apt.totalAmount,
          currency: apt.service?.currency || "OMR",
          paymentStatus: "PAID",
          meetLink: apt.meetLink,
        }).catch(() => {})
      }
      return NextResponse.json(ACK)
    }
  }

  // ── Restaurant kitchen order (KIT-*) ──
  //
  // Marked paid only from here. create-session sets PENDING when the link is
  // issued, and a customer who opens a link and walks away has not paid — the
  // kitchen must never be told otherwise.
  if (reference.startsWith("KIT-")) {
    const kitchenId = reference.slice(4)
    const kitchen = await db.kitchenOrder.findUnique({ where: { id: kitchenId } })
    if (kitchen) {
      if (approved) {
        const callbackAmount = Number(body.Amount)
        if (Number.isFinite(callbackAmount) && callbackAmount > 0 && Math.abs(callbackAmount - kitchen.totalAmount) > 0.01) {
          console.error("AmwalPay kitchen order amount mismatch", { reference, callbackAmount, expected: kitchen.totalAmount })
          return NextResponse.json({ message: "amount mismatch", success: false }, { status: 400 })
        }
      }
      if (!(await claimNotification(reference, body))) return NextResponse.json(ACK)
      if (approved) {
        if (kitchen.paymentStatus === "PAID") return NextResponse.json(ACK)
        await db.kitchenOrder.update({
          where: { id: kitchen.id },
          data: { paymentStatus: "PAID", paymentMethod: "AMWALPAY_ONLINE" },
        })
        if (kitchen.customerPhone) {
          const total = `${kitchen.totalAmount} ${kitchen.currency || "OMR"}`
          const where = kitchen.tableNumber ? `Table ${kitchen.tableNumber}` : kitchen.orderType.toLowerCase()
          await sendWhatsApp({
            to: kitchen.customerPhone,
            body: `✅ *Payment received* — ${total}\n\nOrder: ${where}\nReference: ${reference}\n\nThe kitchen has been notified. Thank you!`,
            allowOutsideSession: true,
          }).catch(() => {})
        }
      }
      return NextResponse.json(ACK)
    }
  }

  // ── Chemotherapy Day Care Cloud Notification (CHEMO-*) ──
  if (reference.startsWith("CHEMO-")) {
    const chemo = await db.hospChemoBooking.findFirst({
      where: { bookingRef: reference },
      include: { patient: true, doctor: true, bed: { include: { ward: true } }, session: true },
    })
    if (chemo) {
      if (!(await claimNotification(reference, body))) return NextResponse.json(ACK)
      if (approved) {
        await db.hospChemoBooking.update({
          where: { id: chemo.id },
          data: { status: "CONFIRMED" },
        })

        if (chemo.patient?.mobile) {
          const msg = `✅ *Kauvery Hospital — Chemotherapy Day Care Confirmed!*\n\n` +
            `📌 *Booking ID:* #${chemo.bookingRef}\n` +
            `👤 *Patient:* ${chemo.patient.fullName} (${chemo.patient.mrn})\n` +
            `🏥 *Ward & Bed:* ${chemo.bed.ward.name} · *Bed ${chemo.bed.bedNumber}*\n` +
            `⏰ *Session:* ${chemo.session?.name || "Day Care Session"} (${chemo.session?.startTime || "08:00"} - ${chemo.session?.endTime || "12:00"})\n` +
            `👨‍⚕️ *Consultant Oncologist:* ${chemo.doctor.name}\n` +
            `📅 *Date:* ${formatDate(chemo.bookingDate)}\n` +
            `💳 *Payment Status:* ✅ Paid (50.000 OMR)`
          await sendWhatsApp({ to: chemo.patient.mobile, body: msg }).catch(() => {})
        }
      }
      return NextResponse.json(ACK)
    }
  }

  const scopeOrder = reference
    ? await db.order.findFirst({ where: { orderNumber: reference }, select: { tenantId: true } })
    : null
  const scope: TenantContext | null = scopeOrder?.tenantId
    ? { tenantId: scopeOrder.tenantId, slug: "" }
    : null

  const verified = true

  const receiptKey = `amwal_notification_${body.SystemReference || Date.now()}`
  await db.systemSetting.upsert({
    where: { tenantId_key: { tenantId: PLATFORM, key: receiptKey } },
    update: {
      value: JSON.stringify({ ...body, verified, receivedAt: new Date().toISOString() }),
      type: "JSON",
      category: "PAYMENTS",
    },
    create: {
      key: receiptKey,
      value: JSON.stringify({ ...body, verified, receivedAt: new Date().toISOString() }),
      type: "JSON",
      category: "PAYMENTS",
    },
  }).catch(() => {})

  if (!reference) return NextResponse.json(ACK)

  const order = await db.order.findFirst({
    where: { orderNumber: reference },
    include: { slot: true },
  })
  if (!order) {
    console.error("AmwalPay cloud notification: no order for", reference)
    return NextResponse.json(ACK)
  }

  if (!approved) {
    await db.payment.updateMany({
      where: { orderId: order.id, status: { in: ["PENDING", "SUBMITTED"] } },
      data: {
        status: "FAILED",
        gatewayReference: String(body.SystemReference ?? ""),
        rejectionReason: String(body.Message ?? "Declined by the gateway").slice(0, 200),
      },
    })
    return NextResponse.json(ACK)
  }

  const callbackAmount = Number(body.Amount)
  if (Number.isFinite(callbackAmount) && callbackAmount > 0 && Math.abs(callbackAmount - order.totalAmount) > 0.01) {
    console.error("AmwalPay order amount mismatch", { reference, callbackAmount, expected: order.totalAmount })
    return NextResponse.json({ message: "amount mismatch", success: false }, { status: 400 })
  }

  if (!(await claimNotification(reference, body))) return NextResponse.json(ACK)

  /*
   * Record the money first, and whatever state the order is in.
   *
   * This used to return early when the order was already CONFIRMED, which
   * skipped the payment update with it. An order that staff had confirmed by
   * hand — the normal thing to do when a customer says they have paid and the
   * gateway has gone quiet — then kept `paymentStatus: SUBMITTED` for ever
   * even after the real notification arrived, so the booking page showed
   * "confirming your payment with the bank" on a settled card payment.
   *
   * Confirming the booking is separate below, because seats and vouchers must
   * not be issued twice.
   */
  await db.payment.updateMany({
    where: { orderId: order.id, status: { in: ["PENDING", "SUBMITTED"] } },
    data: {
      status: "APPROVED",
      gatewayReference: String(body.SystemReference ?? ""),
      verifiedAt: new Date(),
    },
  })
  await db.order.updateMany({
    where: { id: order.id, paymentStatus: { not: "APPROVED" } },
    data: { paymentStatus: "APPROVED" },
  })

  if (order.orderStatus === "CONFIRMED") return NextResponse.json(ACK)

  const updated = await db.order.updateMany({
    where: { id: order.id, orderStatus: { not: "CONFIRMED" } },
    data: { orderStatus: "CONFIRMED", confirmedAt: new Date() },
  })
  if (updated.count === 0) return NextResponse.json(ACK)

  await confirmSlotSeats(order.slotId, order.paxAdult + order.paxChild)

  const existing = await db.voucher.findFirst({ where: { orderId: order.id } })
  if (!existing) {
    await db.voucher.create({
      data: {
        orderId: order.id,
        customerId: order.customerId,
        voucherCode: await generateVoucherCode(),
        qrData: `${order.orderNumber}`,
      },
    })
  }

  await createAuditLog({
    action: "PAYMENT_CONFIRMED",
    entity: "Order",
    entityId: order.id,
    details: `Cloud notification · ${body.SystemReference ?? ""} · ${verified ? "verified" : "UNVERIFIED HASH"}`,
  }).catch(() => {})

  if (scope) {
    await withTenant(scope, async () => {
      void syncOrderToCalendar(order.id)
      await sendOrderConfirmation(order.id)
    })
  } else {
    void syncOrderToCalendar(order.id)
    await sendOrderConfirmation(order.id)
  }

  return NextResponse.json(ACK)
})

export const GET = withErrors(async () => NextResponse.json(ACK))
