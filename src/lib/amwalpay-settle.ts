import { db, raw } from "@/lib/db"
import { tenantOf, withTenant } from "@/lib/tenant"
import { amwalPayConfig, getAmwalPayBaseUrl, generateSecureHash } from "@/lib/amwalpay"
import { confirmSlotSeats, createAuditLog } from "@/lib/slots-server"
import { generateVoucherCode } from "@/lib/helpers"
import { sendOrderConfirmation } from "@/lib/notifications"

/**
 * Asks AmwalPay whether an order was actually paid.
 *
 * AmwalPay confirms a card payment by posting a signed Merchant Cloud
 * Notification. When that does not arrive — the notification URL is unset, the
 * post failed, the customer closed the tab — the order sits at "payment
 * pending" over a payment that went through, and nothing in the system can
 * tell the difference.
 *
 * So we ask, rather than wait. `/Transaction/GetByMerchantReference` is the
 * documented inquiry endpoint; it takes the merchant id and our own order
 * number, and no terminal id.
 *
 * It requires the Webhook API to be enabled on the merchant account. While it
 * is not, every call answers `WebhookApiNotEnabledForMerchant` and this
 * returns null, which leaves the order exactly as it was — the same behaviour
 * as before this existed.
 */
type GatewayTransaction = {
  id?: string
  idN?: number
  amount?: number
  totalAmount?: number
  responseCode?: string
  isCaptured?: boolean
  isRefunded?: boolean
  merchantReference?: string
}

function utcStamp(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0")
  return (
    `${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}` +
    `${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}`
  )
}

export async function fetchTransaction(merchantReference: string): Promise<GatewayTransaction | null> {
  const config = await amwalPayConfig()
  if (!(config.merchantId && config.secureKey)) return null

  const params: Record<string, unknown> = {
    merchantId: parseInt(config.merchantId),
    merchantReference,
    requestDateTime: utcStamp(),
  }
  params.secureHashValue = generateSecureHash(params, config.secureKey)

  try {
    const response = await fetch(`${getAmwalPayBaseUrl()}/Transaction/GetByMerchantReference`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(15_000),
    })
    const body = await response.json().catch(() => null)
    if (!response.ok || !body?.success) {
      // Not an error worth alarming anyone about: the usual answer today is
      // the account gate, and an order that cannot be checked is left alone.
      if (body?.message) console.warn("AmwalPay inquiry declined:", body.message, merchantReference)
      return null
    }
    const rows: GatewayTransaction[] = Array.isArray(body.data) ? body.data : []
    // A successful purchase. Refunded transactions must not settle an order.
    return rows.find(r => (r.responseCode === "00" || r.isCaptured === true) && r.isRefunded !== true) ?? null
  } catch (error) {
    console.error("AmwalPay inquiry failed:", merchantReference, error)
    return null
  }
}

/**
 * Settles an order against what the gateway says, and only that.
 *
 * Returns true only when AmwalPay confirmed the payment. Everything it does —
 * seats, voucher, confirmation message — is what the signed notification would
 * have done, so whichever arrives first wins and the other becomes a no-op.
 */
export async function settleFromGateway(orderNumber: string): Promise<boolean> {
  const stub = await raw.order.findFirst({
    where: { orderNumber },
    select: { id: true, tenantId: true, paymentStatus: true },
  })
  if (!stub || ["APPROVED", "PAID"].includes(stub.paymentStatus)) return false

  const tenant = await tenantOf(stub.tenantId)
  if (!tenant) return false

  return withTenant(tenant, async () => {
    const txn = await fetchTransaction(orderNumber)
    if (!txn) return false
    return applyPaid(stub.id, {
      reference: String(txn.id ?? txn.idN ?? ""),
      amount: Number(txn.totalAmount ?? txn.amount ?? 0),
      how: "transaction inquiry",
    })
  })
}

/**
 * Marks an order paid, once, whoever brought the news.
 *
 * The signed SmartBox callback, the transaction inquiry and the Merchant Cloud
 * Notification all end here, so a payment confirmed twice does not issue two
 * vouchers or book the seats twice — the second caller finds the work done.
 *
 * Must only be called with proof: a verified hash or the gateway's own answer.
 */
export async function applyPaid(
  orderId: string,
  opts: { reference: string; amount?: number; how: string },
): Promise<boolean> {
  const order = await db.order.findFirst({ where: { id: orderId }, include: { slot: true } })
  if (!order) return false

  // Never settle an order for less than it was sold for.
  if (opts.amount && opts.amount > 0 && Math.abs(opts.amount - order.totalAmount) > 0.01) {
    console.error("AmwalPay amount mismatch", { orderNumber: order.orderNumber, paid: opts.amount, expected: order.totalAmount })
    return false
  }

  {
    const reference = opts.reference
    await db.payment.updateMany({
      where: { orderId: order.id, status: { in: ["PENDING", "SUBMITTED"] } },
      data: { status: "APPROVED", gatewayReference: reference || undefined, verifiedAt: new Date() },
    })
    await db.order.updateMany({
      where: { id: order.id, paymentStatus: { not: "APPROVED" } },
      data: { paymentStatus: "APPROVED" },
    })

    const confirmed = await db.order.updateMany({
      where: { id: order.id, orderStatus: { not: "CONFIRMED" } },
      data: { orderStatus: "CONFIRMED", confirmedAt: new Date() },
    })

    if (confirmed.count > 0) {
      await confirmSlotSeats(order.slotId, order.paxAdult + order.paxChild).catch(() => {})
      if (!(await db.voucher.findFirst({ where: { orderId: order.id } }))) {
        await db.voucher.create({
          data: {
            orderId: order.id,
            customerId: order.customerId,
            voucherCode: await generateVoucherCode(),
            qrData: order.orderNumber,
          },
        })
      }
      void sendOrderConfirmation(order.id).catch(() => {})
    }

    await createAuditLog({
      orderId: order.id,
      action: "PAYMENT_CONFIRMED",
      entity: "ORDER",
      entityId: order.id,
      details: `Confirmed by AmwalPay ${opts.how}${reference ? ` · ${reference}` : ""}`,
    }).catch(() => {})

    return true
  }
}

/**
 * Settles an order from a SmartBox callback whose hash has already been
 * verified by the caller. Enters the order's own workspace first, because the
 * customer's browser arrives with no tenant of its own.
 */
export async function settleFromCallback(
  orderNumber: string,
  opts: { reference: string; amount?: number },
): Promise<boolean> {
  const stub = await raw.order.findFirst({
    where: { orderNumber },
    select: { id: true, tenantId: true },
  })
  if (!stub) return false
  const tenant = await tenantOf(stub.tenantId)
  if (!tenant) return false
  return withTenant(tenant, () => applyPaid(stub.id, { ...opts, how: "SmartBox callback" }))
}
