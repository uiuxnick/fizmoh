import { db, raw } from "@/lib/db"
import { tenantOf, withTenant } from "@/lib/tenant"
import { confirmSlotSeats, createAuditLog } from "@/lib/slots-server"
import { generateVoucherCode } from "@/lib/helpers"
import { sendOrderConfirmation } from "@/lib/notifications"

/**
 * Paymob Order & Payment Settlement Engine
 *
 * Atomically transitions orders to confirmed/paid status, reserves seats,
 * generates digital booking vouchers, logs audit entries, and delivers
 * instant WhatsApp / email confirmations to the customer.
 */

export interface PaymobSettleOptions {
  reference: string // Gateway transaction ID / System Reference
  amount?: number // Paid amount in major units
  currency?: string
  how?: string // Settlement mechanism (e.g. "webhook", "callback", "manual")
  raw?: any
}

/**
 * Apply payment and settle booking/order for Paymob
 */
export async function applyPaymobPaid(
  orderId: string,
  opts: PaymobSettleOptions,
): Promise<boolean> {
  const order = await db.order.findFirst({
    where: { id: orderId },
    include: { slot: true },
  })
  if (!order) return false

  // Validate amount tolerance to prevent underpayment
  if (opts.amount && opts.amount > 0 && Math.abs(opts.amount - order.totalAmount) > 0.05) {
    console.error("Paymob amount mismatch:", {
      orderNumber: order.orderNumber,
      paid: opts.amount,
      expected: order.totalAmount,
    })
    return false
  }

  const reference = opts.reference || ""

  // 1. Update Payment records
  await db.payment.updateMany({
    where: { orderId: order.id, status: { in: ["PENDING", "SUBMITTED"] } },
    data: {
      status: "APPROVED",
      gatewayReference: reference || undefined,
      verifiedAt: new Date(),
    },
  })

  // 2. Mark order payment as APPROVED
  await db.order.updateMany({
    where: { id: order.id, paymentStatus: { not: "APPROVED" } },
    data: { paymentStatus: "APPROVED" },
  })

  // 3. Confirm order status
  const confirmed = await db.order.updateMany({
    where: { id: order.id, orderStatus: { not: "CONFIRMED" } },
    data: { orderStatus: "CONFIRMED", confirmedAt: new Date() },
  })

  // 4. Reserve seats, issue voucher, send confirmation if newly confirmed
  if (confirmed.count > 0) {
    await confirmSlotSeats(order.slotId, order.paxAdult + order.paxChild).catch(err => {
      console.error("Paymob confirmSlotSeats error:", err)
    })

    const existingVoucher = await db.voucher.findFirst({ where: { orderId: order.id } })
    if (!existingVoucher) {
      await db.voucher.create({
        data: {
          orderId: order.id,
          customerId: order.customerId,
          voucherCode: await generateVoucherCode(),
          qrData: order.orderNumber,
        },
      }).catch(err => console.error("Paymob voucher create error:", err))
    }

    void sendOrderConfirmation(order.id).catch(err => {
      console.error("Paymob sendOrderConfirmation error:", err)
    })
  }

  // 5. Audit Log
  await createAuditLog({
    orderId: order.id,
    action: "PAYMENT_CONFIRMED",
    entity: "ORDER",
    entityId: order.id,
    details: `Confirmed by Paymob ${opts.how || "webhook"}${reference ? ` · ${reference}` : ""}`,
  }).catch(() => {})

  return true
}

/**
 * Settles an order or appointment from a verified Paymob transaction
 */
export async function settlePaymobTransaction(
  orderReference: string,
  opts: PaymobSettleOptions,
): Promise<{ success: boolean; entityType: "ORDER" | "APPOINTMENT" | "KITCHEN" | "SUBSCRIPTION" | "UNKNOWN" }> {
  if (!orderReference) return { success: false, entityType: "UNKNOWN" }

  // 1. Appointment Reference (APT-...)
  if (/^APT-/i.test(orderReference)) {
    const apt = await raw.aptAppointment.findFirst({
      where: { reference: orderReference },
      select: { id: true, tenantId: true, paymentStatus: true },
    })
    if (!apt) return { success: false, entityType: "APPOINTMENT" }
    if (apt.paymentStatus === "PAID") return { success: true, entityType: "APPOINTMENT" }

    const tenant = await tenantOf(apt.tenantId)
    if (!tenant) return { success: false, entityType: "APPOINTMENT" }

    return withTenant(tenant, async () => {
      await db.aptAppointment.update({
        where: { id: apt.id },
        data: {
          paymentStatus: "PAID",
          status: "CONFIRMED",
          paymentMethod: "PAYMOB_ONLINE",
        },
      })
      return { success: true, entityType: "APPOINTMENT" }
    })
  }

  // 2. Kitchen / Restaurant Order (KIT-...)
  if (/^KIT-/i.test(orderReference)) {
    const kitchenId = orderReference.replace(/^KIT-/i, "")
    const kitchen = await raw.kitchenOrder.findUnique({
      where: { id: kitchenId },
      select: { id: true, tenantId: true, paymentStatus: true },
    })
    if (!kitchen) return { success: false, entityType: "KITCHEN" }
    if (kitchen.paymentStatus === "PAID") return { success: true, entityType: "KITCHEN" }

    const tenant = await tenantOf(kitchen.tenantId)
    if (!tenant) return { success: false, entityType: "KITCHEN" }

    return withTenant(tenant, async () => {
      await db.kitchenOrder.update({
        where: { id: kitchen.id },
        data: {
          paymentStatus: "PAID",
          paymentRef: opts.reference,
        },
      })
      return { success: true, entityType: "KITCHEN" }
    })
  }

  // 3. Platform Subscription Invoice (SUB-... or ADDON-...)
  if (/^(SUB|ADDON)-/i.test(orderReference)) {
    const { settleInvoice } = await import("@/lib/billing")
    const result = await settleInvoice({
      reference: orderReference,
      gatewayReference: opts.reference,
      approved: true,
    })
    return { success: result.ok, entityType: "SUBSCRIPTION" }
  }

  // 4. Standard Tour Order
  const stub = await raw.order.findFirst({
    where: { orderNumber: orderReference },
    select: { id: true, tenantId: true },
  })
  if (!stub) return { success: false, entityType: "ORDER" }

  const tenant = await tenantOf(stub.tenantId)
  if (!tenant) return { success: false, entityType: "ORDER" }

  const settled = await withTenant(tenant, () => applyPaymobPaid(stub.id, opts))
  return { success: settled, entityType: "ORDER" }
}
