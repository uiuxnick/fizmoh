import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { tenantOf, withTenant } from "@/lib/tenant"
import { refreshAmwalPayConfig, verifyCallbackHash } from "@/lib/amwalpay"
import { settleFromCallback } from "@/lib/amwalpay-settle"

/**
 * Where SmartBox sends the customer once the card has been processed.
 *
 * The parameters arrive on the customer's own browser, so none of them are
 * trusted on sight: they carry `secureHashValue`, an HMAC over a fixed field
 * list that only the merchant's secure key can produce. A payment counts as
 * made when that hash verifies *and* the response code is "00" — anything
 * else is treated as unpaid, whatever the query string claims.
 *
 * This is the path that does not need the Webhook API enabled. The Merchant
 * Cloud Notification remains the belt-and-braces server-to-server copy for
 * when it is, and either may arrive first: settling is idempotent.
 */
export const GET = withErrors(async (request: NextRequest) => {
  const params = new URL(request.url).searchParams
  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin

  const reference = (params.get("merchantReference") || "").trim()
  if (!reference) return NextResponse.redirect(`${base}/`, { status: 302 })

  const booking = `${base}/booking/${encodeURIComponent(reference)}`

  const collect = () => {
    const payload: Record<string, unknown> = {}
    for (const key of [
      "amount", "currencyId", "customerId", "customerTokenId",
      "merchantId", "merchantReference", "responseCode", "terminalId",
      "transactionId", "transactionTime", "secureHashValue",
    ]) {
      const value = params.get(key)
      if (value !== null) payload[key] = value
    }
    return payload
  }

  /*
   * Our own invoices settle here too.
   *
   * A subscription payment used to be settled only by the cloud notification,
   * which needs Webhook API enabled on the merchant — so it never arrived, and
   * every invoice stayed PENDING no matter how many times a workspace paid.
   * The hash is checked against the platform's merchant account rather than a
   * workspace's, because that is the account that took the money.
   */
  const { isSubscriptionReference, isAddonReference, settleInvoice, asPlatform } = await import("@/lib/billing")
  if (isSubscriptionReference(reference) || isAddonReference(reference)) {
    const done = `${base}/api/billing/return/${encodeURIComponent(reference)}`
    const payload = collect()

    const ok = await asPlatform(async () => {
      const { platformAmwalPayConfig } = await import("@/lib/amwalpay")
      const config = await platformAmwalPayConfig()
      payload.merchantId = config.merchantId
      payload.terminalId = config.terminalId
      return verifyCallbackHash(payload, config.secureKey)
    })

    if (!ok) {
      console.error("AmwalPay SmartBox subscription callback failed hash verification", { reference })
      return NextResponse.redirect(done, { status: 302 })
    }

    await settleInvoice({
      reference,
      approved: String(params.get("responseCode") || "") === "00",
      gatewayReference: String(params.get("transactionId") || ""),
    }).catch(e => console.error("Subscription settlement failed:", e))

    return NextResponse.redirect(done, { status: 302 })
  }

  const stub = await raw.order.findFirst({
    where: { orderNumber: reference },
    select: { tenantId: true },
  })
  if (!stub) return NextResponse.redirect(`${base}/`, { status: 302 })

  const tenant = await tenantOf(stub.tenantId)
  if (!tenant) return NextResponse.redirect(booking, { status: 302 })

  // The hash is checked against the merchant account that took the payment,
  // so the config has to be that workspace's before anything is verified.
  const payload: Record<string, unknown> = {}
  for (const key of [
    "amount", "currencyId", "customerId", "customerTokenId",
    "merchantId", "merchantReference", "responseCode", "terminalId",
    "transactionId", "transactionTime", "secureHashValue",
  ]) {
    const value = params.get(key)
    if (value !== null) payload[key] = value
  }

  const verified = await withTenant(tenant, async () => {
    const config = await refreshAmwalPayConfig()
    // The customer's browser does not send these; the hash covers them, so
    // they are filled from the merchant account the order belongs to.
    payload.merchantId = config.merchantId
    payload.terminalId = config.terminalId
    return verifyCallbackHash(payload)
  })

  const approved = String(params.get("responseCode") || "") === "00"

  if (!verified) {
    console.error("AmwalPay SmartBox callback failed hash verification", { reference })
    return NextResponse.redirect(booking, { status: 302 })
  }

  if (approved) {
    await settleFromCallback(reference, {
      reference: String(params.get("transactionId") || ""),
      amount: Number(params.get("amount") || 0),
    }).catch(e => console.error("SmartBox settlement failed:", e))
  } else {
    console.warn("AmwalPay SmartBox reported a declined payment", { reference, responseCode: params.get("responseCode") })
  }

  return NextResponse.redirect(booking, { status: 302 })
})
