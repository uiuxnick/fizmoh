import { db } from "@/lib/db"
import { PLATFORM, withTenant, type TenantContext } from "@/lib/tenant"
import { createPaymentSession, platformAmwalPayConfig, type AmwalPayConfig } from "@/lib/amwalpay"
import { createPaymobIntention, platformPaymobConfig, type PaymobConfig } from "@/lib/paymob"
import { sendEmail } from "@/lib/notifications"

/**
 * The platform charging its tenants.
 *
 * Deliberately separate from everything a tenant does with money. Their
 * gateway takes their customers' payments; ours takes theirs. Sharing the code
 * path would mean a business's own merchant credentials could end up being
 * asked to collect our subscription fee, which is both wrong and, once anyone
 * notices, indefensible.
 */

/** How long a workspace keeps working after a payment is missed. */
const GRACE_DAYS = 7

/** Runs work against the platform's own scope, never a tenant's. */
export function asPlatform<T>(work: () => Promise<T>): Promise<T> {
  const context: TenantContext = { tenantId: PLATFORM, slug: "platform" }
  return withTenant(context, work)
}

/** The platform's own gateway credentials, whoever is asking. */
export async function platformGateway() {
  return asPlatform(() => platformAmwalPayConfig())
}

export type PlatformGatewayChoice = "AUTO" | "PAYMOB" | "AMWALPAY"

export interface PlatformGatewayResolution {
  active: "PAYMOB" | "AMWALPAY" | null
  paymobConfig: PaymobConfig | null
  amwalpayConfig: AmwalPayConfig | null
}

export interface AvailableGateways {
  paymob: boolean
  amwalpay: boolean
  defaultGateway: "PAYMOB" | "AMWALPAY"
  allowChoice: boolean
}

/**
 * Checks which payment gateways are ready for collecting platform subscriptions.
 * If both are configured, tenants can choose their preferred gateway at checkout.
 */
export async function availablePlatformGateways(): Promise<AvailableGateways> {
  const { getConfigValue } = await import("@/lib/app-config")
  const [preferredGateway, paymobCfg, amwalpayCfg] = await Promise.all([
    getConfigValue("platform_active_gateway"),
    platformPaymobConfig(),
    platformGateway(),
  ])

  const paymobReady = !!(paymobCfg.apiKey && paymobCfg.publicKey && paymobCfg.hmacSecret)
  const amwalpayReady = !!(amwalpayCfg.merchantId && amwalpayCfg.terminalId && amwalpayCfg.secureKey)
  const pref = (preferredGateway || process.env.PLATFORM_ACTIVE_GATEWAY || "BOTH").toUpperCase().trim()

  let defaultGateway: "PAYMOB" | "AMWALPAY" = "PAYMOB"
  if (pref === "AMWALPAY" && amwalpayReady) defaultGateway = "AMWALPAY"
  else if (paymobReady) defaultGateway = "PAYMOB"
  else if (amwalpayReady) defaultGateway = "AMWALPAY"

  const allowChoice = paymobReady && amwalpayReady && (pref === "BOTH" || pref === "AUTO" || !preferredGateway)

  return {
    paymob: paymobReady,
    amwalpay: amwalpayReady,
    defaultGateway,
    allowChoice,
  }
}

/**
 * Determines which payment gateway the platform should use to collect SaaS subscriptions.
 * If requestedGateway is supplied and configured, it honors the tenant's choice.
 */
export async function resolvePlatformGateway(requestedGateway?: string | null): Promise<PlatformGatewayResolution> {
  const { getConfigValue } = await import("@/lib/app-config")
  const [preferredGateway, paymobCfg, amwalpayCfg] = await Promise.all([
    getConfigValue("platform_active_gateway"),
    platformPaymobConfig(),
    platformGateway(),
  ])

  const paymobReady = !!(paymobCfg.apiKey && paymobCfg.publicKey && paymobCfg.hmacSecret)
  const amwalpayReady = !!(amwalpayCfg.merchantId && amwalpayCfg.terminalId && amwalpayCfg.secureKey)

  const req = (requestedGateway || "").toUpperCase().trim()
  let active: "PAYMOB" | "AMWALPAY" | null = null

  // 1. Tenant explicitly selected a gateway
  if (req === "PAYMOB" && paymobReady) {
    active = "PAYMOB"
  } else if (req === "AMWALPAY" && amwalpayReady) {
    active = "AMWALPAY"
  } else {
    // 2. Platform default configuration
    const pref = (preferredGateway || process.env.PLATFORM_ACTIVE_GATEWAY || "BOTH").toUpperCase().trim()
    if (pref === "AMWALPAY") {
      active = amwalpayReady ? "AMWALPAY" : paymobReady ? "PAYMOB" : null
    } else if (pref === "PAYMOB") {
      active = paymobReady ? "PAYMOB" : amwalpayReady ? "AMWALPAY" : null
    } else {
      // BOTH or AUTO: default to Paymob if ready, otherwise AmwalPay
      if (paymobReady) active = "PAYMOB"
      else if (amwalpayReady) active = "AMWALPAY"
    }
  }

  return {
    active,
    paymobConfig: paymobReady ? paymobCfg : null,
    amwalpayConfig: amwalpayReady ? amwalpayCfg : null,
  }
}

export interface ProrationInfo {
  isUpgrade: boolean
  isDowngrade: boolean
  isSame: boolean
  currentPlanPrice: number
  newPlanPrice: number
  unusedCredit: number
  netDueToday: number
  creditRemaining: number
  daysLeft: number
}

export interface BillingState {
  status: string
  planSlug: string | null
  planName: string | null
  price: number
  currency: string
  period: string
  trialEndsAt: Date | null
  currentPeriodEnd: Date | null
  /** Days until the workspace stops working. Negative once it has. */
  daysLeft: number | null
  suspended: boolean
  unusedCredit: number
  addons: Array<{ slug: string; name: string; quantity: number; status: string }>
  usage: { staff: number; contacts: number; numbers: number; messagesPerMonth: number; limits: Record<string, number> }
}

/** Where a workspace stands with us. */
export async function billingState(tenantId: string): Promise<BillingState | null> {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) return null

  const subscription = await db.subscription.findFirst({
    where: { tenantId, status: { not: "PENDING_PAYMENT" } },
    include: { plan: true, addons: { include: { addon: true } } },
    orderBy: { createdAt: "desc" },
  })
  const monthStart = new Date(nowStart())
  const [staff, contacts, numbers, messagesPerMonth] = await Promise.all([
    db.tenantMember.count({ where: { tenantId } }),
    db.customer.count({ where: { tenantId } }),
    db.whatsAppAccount.count({ where: { tenantId } }),
    db.message.count({ where: { tenantId, direction: "OUTBOUND", createdAt: { gte: monthStart } } }),
  ])
  const limitSource = subscription?.limitSnapshot ?? subscription?.plan.limits
  const limits = limitSource && typeof limitSource === "object" && !Array.isArray(limitSource) ? limitSource as Record<string, number> : {}

  const deadline = subscription?.currentPeriodEnd ?? tenant.trialEndsAt ?? null
  const daysLeft = deadline
    ? Math.ceil((deadline.getTime() - Date.now()) / 86_400_000)
    : null

  let unusedCredit = 0
  const now = Date.now()
  if (subscription && subscription.status === "ACTIVE" && subscription.currentPeriodEnd) {
    const periodEnd = subscription.currentPeriodEnd.getTime()
    const startedAt = subscription.startedAt.getTime()
    const totalMs = Math.max(1, periodEnd - startedAt)
    const remainingMs = Math.max(0, periodEnd - now)
    const currentPrice = subscription.period === "YEARLY" ? subscription.plan.priceYearly : subscription.plan.priceMonthly
    if (currentPrice > 0 && remainingMs > 0) {
      unusedCredit = Math.max(0, Math.round((currentPrice * remainingMs) / totalMs))
    }
  }

  return {
    status: subscription?.status ?? "NONE",
    planSlug: subscription?.plan.slug ?? null,
    planName: subscription?.plan.name ?? null,
    price: subscription
      ? subscription.period === "YEARLY"
        ? subscription.plan.priceYearly
        : subscription.plan.priceMonthly
      : 0,
    currency: subscription?.plan.currency ?? tenant.currency,
    period: subscription?.period ?? "MONTHLY",
    trialEndsAt: tenant.trialEndsAt,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    daysLeft,
    suspended: tenant.status === "SUSPENDED",
    unusedCredit,
    addons: (subscription?.addons ?? []).map(item => ({ slug: item.addon.slug, name: item.addon.name, quantity: item.quantity, status: item.status })),
    usage: { staff, contacts, numbers, messagesPerMonth, limits },
  }
}

/** Computes prorated unused balance, upgrade surcharge, or downgrade credit */
export async function calculateProration(
  tenantId: string,
  newPlanId: string,
  period: "MONTHLY" | "YEARLY" = "MONTHLY",
): Promise<ProrationInfo | null> {
  const [subscription, newPlan] = await Promise.all([
    db.subscription.findFirst({
      where: { tenantId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    }),
    db.plan.findUnique({ where: { id: newPlanId } }),
  ])
  if (!newPlan) return null

  const newPlanPrice = period === "YEARLY" ? newPlan.priceYearly : newPlan.priceMonthly
  const currentPlanPrice = subscription
    ? subscription.period === "YEARLY"
      ? subscription.plan.priceYearly
      : subscription.plan.priceMonthly
    : 0

  const now = Date.now()
  let unusedCredit = 0
  let daysLeft = 0

  if (subscription && subscription.status === "ACTIVE" && subscription.currentPeriodEnd) {
    const periodEnd = subscription.currentPeriodEnd.getTime()
    const startedAt = subscription.startedAt.getTime()
    const totalMs = Math.max(1, periodEnd - startedAt)
    const remainingMs = Math.max(0, periodEnd - now)
    daysLeft = Math.ceil(remainingMs / 86_400_000)
    if (currentPlanPrice > 0 && remainingMs > 0) {
      unusedCredit = Math.max(0, Math.round((currentPlanPrice * remainingMs) / totalMs))
    }
  }

  const isUpgrade = newPlanPrice > currentPlanPrice
  const isDowngrade = newPlanPrice < currentPlanPrice
  const isSame = subscription?.planId === newPlan.id && subscription?.period === period

  const netDueToday = Math.max(0, newPlanPrice - unusedCredit)
  const creditRemaining = Math.max(0, unusedCredit - newPlanPrice)

  return {
    isUpgrade,
    isDowngrade,
    isSame,
    currentPlanPrice,
    newPlanPrice,
    unusedCredit,
    netDueToday,
    creditRemaining,
    daysLeft,
  }
}

function nowStart() {
  const date = new Date()
  date.setDate(1); date.setHours(0, 0, 0, 0)
  return date
}

/**
 * Raises an invoice for the next period and hands back a link to pay it.
 *
 * Accounts for prorated unused balance when upgrading or downgrading.
 */
export async function startCheckout(params: {
  tenantId: string
  planId: string
  period?: "MONTHLY" | "YEARLY"
  gateway?: "PAYMOB" | "AMWALPAY" | string
  origin: string
}): Promise<{ ok: boolean; url?: string; reference?: string; amountDue?: number; gateway?: string; error?: string }> {
  const [tenant, plan] = await Promise.all([
    db.tenant.findUnique({ where: { id: params.tenantId } }),
    db.plan.findUnique({ where: { id: params.planId } }),
  ])
  if (!tenant || !plan) return { ok: false, error: "No such plan" }

  const period = params.period ?? "MONTHLY"
  const rawAmount = period === "YEARLY" ? plan.priceYearly : plan.priceMonthly
  const proration = await calculateProration(params.tenantId, params.planId, period)
  const amount = proration ? proration.netDueToday : rawAmount

  if (amount <= 0) {
    // A free plan or a downgrade fully covered by prorated balance needs no gateway.
    await activate({ tenantId: tenant.id, planId: plan.id, period })
    return { ok: true, amountDue: 0 }
  }

  // Keep the current plan untouched until the gateway confirms payment. A
  // failed or abandoned checkout must never grant the requested modules.
  await db.subscription.updateMany({ where: { tenantId: tenant.id, status: "PENDING_PAYMENT" }, data: { status: "CANCELLED", cancelledAt: new Date() } })
  const subscription = await db.subscription.create({ data: { tenantId: tenant.id, planId: plan.id, period, status: "PENDING_PAYMENT" } })
  const reference = `SUB-${subscription.id.slice(-8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`

  const invoice = await db.subscriptionInvoice.create({
    data: {
      subscriptionId: subscription.id,
      tenantId: tenant.id,
      amount,
      currency: plan.currency,
      period,
      reference,
      periodEnd: nextPeriodEnd(period),
    },
  })

  const resolution = await resolvePlatformGateway(params.gateway)
  if (!resolution.active) {
    await db.subscription.update({ where: { id: subscription.id }, data: { status: "CANCELLED", cancelledAt: new Date() } })
    await db.subscriptionInvoice.update({ where: { id: invoice.id }, data: { status: "FAILED" } })
    return { ok: false, error: "The platform gateway is not configured yet" }
  }

  const contact = await billingContact(tenant.id)

  if (resolution.active === "PAYMOB" && resolution.paymobConfig) {
    const intention = await createPaymobIntention({
      orderId: invoice.id,
      orderNumber: reference,
      amount: amount / 1000,
      currency: plan.currency,
      customerName: tenant.name,
      customerPhone: contact.phone || "+96890000000",
      customerEmail: contact.email || undefined,
      description: `${plan.name} · ${period === "YEARLY" ? "yearly" : "monthly"}`,
      successUrl: `${params.origin}/api/billing/return/${encodeURIComponent(reference)}`,
      failureUrl: `${params.origin}/api/billing/return/${encodeURIComponent(reference)}`,
      webhookUrl: `${params.origin}/api/paymob/webhook`,
      config: resolution.paymobConfig,
    })

    if (!intention.success || !intention.checkoutUrl) {
      await db.subscription.update({ where: { id: subscription.id }, data: { status: "CANCELLED", cancelledAt: new Date() } })
      await db.subscriptionInvoice.update({ where: { id: invoice.id }, data: { status: "FAILED" } })
      return { ok: false, error: intention.error || "The Paymob platform gateway would not open a payment" }
    }

    return {
      ok: true,
      url: intention.checkoutUrl,
      reference,
      gateway: "PAYMOB",
    }
  }

  // Fallback to AmwalPay
  const gateway = resolution.amwalpayConfig!
  const session = await asPlatform(() =>
    createPaymentSession({
      orderId: invoice.id,
      orderNumber: reference,
      amount: amount / 1000,
      currency: plan.currency,
      customerName: tenant.name,
      customerPhone: contact.phone,
      customerEmail: contact.email,
      description: `${plan.name} · ${period === "YEARLY" ? "yearly" : "monthly"}`,
      successUrl: `${params.origin}/api/billing/return/${reference}`,
      failureUrl: `${params.origin}/api/billing/return/${reference}`,
      webhookUrl: `${params.origin}/api/amwalpay/cloud-notification`,
      config: gateway,
    }),
  )

  if (!session.success || !session.paymentLinkUrl) {
    await db.subscription.update({ where: { id: subscription.id }, data: { status: "CANCELLED", cancelledAt: new Date() } })
    await db.subscriptionInvoice.update({
      where: { id: invoice.id },
      data: { status: "FAILED" },
    })
    return { ok: false, error: session.error || "The gateway would not open a payment" }
  }

  return { ok: true, url: `${params.origin}/api/amwalpay/pay/${encodeURIComponent(reference)}`, reference, gateway: "AMWALPAY" }
}

/** Whether a gateway reference belongs to us rather than to a tenant's order. */
export function isSubscriptionReference(reference: string): boolean {
  return /^SUB-/.test(reference.trim())
}

export function isAddonReference(reference: string): boolean { return /^ADDON-/.test(reference.trim()) }

export async function startAddonCheckout(params: {
  tenantId: string
  addonId: string
  quantity: number
  period: "MONTHLY" | "YEARLY"
  gateway?: "PAYMOB" | "AMWALPAY" | string
  origin: string
}): Promise<{ ok: boolean; url?: string | null; reference?: string; assignmentId?: string; gateway?: string; error?: string }> {
  const [tenant, addon, subscription] = await Promise.all([
    db.tenant.findUnique({ where: { id: params.tenantId } }),
    db.planAddon.findUnique({ where: { id: params.addonId } }),
    db.subscription.findFirst({ where: { tenantId: params.tenantId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } }, orderBy: { createdAt: "desc" } }),
  ])
  if (!tenant || !addon || !subscription) return { ok: false, error: "Workspace, add-on, or subscription not found" }
  const quantity = Math.min(100, Math.max(1, Math.round(params.quantity)))
  const amount = (params.period === "YEARLY" ? addon.priceYearly : addon.priceMonthly) * quantity
  const previous = await db.tenantAddon.findUnique({ where: { tenantId_addonId: { tenantId: tenant.id, addonId: addon.id } } })
  const assignment = await db.tenantAddon.upsert({ where: { tenantId_addonId: { tenantId: tenant.id, addonId: addon.id } }, create: { tenantId: tenant.id, addonId: addon.id, subscriptionId: subscription.id, quantity, status: amount > 0 ? "PENDING_PAYMENT" : "ACTIVE" }, update: { subscriptionId: subscription.id, quantity, status: amount > 0 ? "PENDING_PAYMENT" : "ACTIVE" } })
  if (amount <= 0) return { ok: true, url: null, assignmentId: assignment.id }
  const reference = `ADDON-${assignment.id}-${Date.now().toString(36).toUpperCase()}`
  const invoice = await db.subscriptionInvoice.create({ data: { subscriptionId: subscription.id, tenantId: tenant.id, amount, currency: addon.currency, period: params.period, reference, periodEnd: nextPeriodEnd(params.period) } })
  
  const resolution = await resolvePlatformGateway(params.gateway)
  if (!resolution.active) {
    await db.tenantAddon.update({ where: { id: assignment.id }, data: previous ? { status: previous.status, quantity: previous.quantity, subscriptionId: previous.subscriptionId } : { status: "CANCELLED" } })
    await db.subscriptionInvoice.update({ where: { id: invoice.id }, data: { status: "FAILED" } })
    return { ok: false, error: "The platform gateway is not configured yet" }
  }

  const contact = await billingContact(tenant.id)

  if (resolution.active === "PAYMOB" && resolution.paymobConfig) {
    const intention = await createPaymobIntention({
      orderId: invoice.id,
      orderNumber: reference,
      amount: amount / 1000,
      currency: addon.currency,
      customerName: tenant.name,
      customerPhone: contact.phone || "+96890000000",
      customerEmail: contact.email || undefined,
      description: `${addon.name} add-on`,
      successUrl: `${params.origin}/api/billing/return/${encodeURIComponent(reference)}`,
      failureUrl: `${params.origin}/api/billing/return/${encodeURIComponent(reference)}`,
      webhookUrl: `${params.origin}/api/paymob/webhook`,
      config: resolution.paymobConfig,
    })

    if (!intention.success || !intention.checkoutUrl) {
      await db.tenantAddon.update({ where: { id: assignment.id }, data: previous ? { status: previous.status, quantity: previous.quantity, subscriptionId: previous.subscriptionId } : { status: "CANCELLED" } })
      await db.subscriptionInvoice.update({ where: { id: invoice.id }, data: { status: "FAILED" } })
      return { ok: false, error: intention.error || "The Paymob platform gateway would not open a payment" }
    }
    return { ok: true, url: intention.checkoutUrl, reference, assignmentId: assignment.id, gateway: "PAYMOB" }
  }

  const gateway = resolution.amwalpayConfig!
  const session = await asPlatform(() => createPaymentSession({ orderId: invoice.id, orderNumber: reference, amount: amount / 1000, currency: addon.currency, customerName: tenant.name, customerEmail: contact.email, customerPhone: contact.phone, description: `${addon.name} add-on`, successUrl: `${params.origin}/api/billing/return/${reference}`, failureUrl: `${params.origin}/api/billing/return/${reference}`, webhookUrl: `${params.origin}/api/amwalpay/cloud-notification`, config: gateway }))
  if (!session.success || !session.paymentLinkUrl) {
    await db.tenantAddon.update({ where: { id: assignment.id }, data: previous ? { status: previous.status, quantity: previous.quantity, subscriptionId: previous.subscriptionId } : { status: "CANCELLED" } })
    await db.subscriptionInvoice.update({ where: { id: invoice.id }, data: { status: "FAILED" } })
    return { ok: false, error: session.error || "The gateway would not open a payment" }
  }
  return { ok: true, url: session.paymentLinkUrl, reference, assignmentId: assignment.id, gateway: "AMWALPAY" }
}

/**
 * Marks an invoice paid and puts the workspace back in good standing.
 *
 * Idempotent: a gateway that does not hear the right answer retries, and a
 * retry must not extend the period twice.
 */
export async function settleInvoice(params: {
  reference: string
  gatewayReference?: string
  approved: boolean
}): Promise<{ ok: boolean; tenantId?: string }> {
  const invoice = await db.subscriptionInvoice.findUnique({
    where: { reference: params.reference.trim() },
    include: { subscription: true },
  })
  if (!invoice) return { ok: false }

  if (!params.approved) {
    if (invoice.status === "PENDING") {
      await db.subscriptionInvoice.update({
        where: { id: invoice.id },
        data: { status: "FAILED", gatewayReference: params.gatewayReference ?? null },
      })
    }
    return { ok: true, tenantId: invoice.tenantId }
  }

  if (invoice.status === "PAID") return { ok: true, tenantId: invoice.tenantId }

  // Claim the invoice atomically. Gateway retries can arrive concurrently;
  // only the request that moves PENDING -> PAID may activate the subscription.
  const claimed = await db.subscriptionInvoice.updateMany({
    where: { id: invoice.id, status: "PENDING" },
    data: { status: "PAID", paidAt: new Date(), gatewayReference: params.gatewayReference ?? null },
  })
  if (claimed.count === 0) return { ok: true, tenantId: invoice.tenantId }

  if (isAddonReference(invoice.reference)) {
    const assignmentId = invoice.reference.split("-")[1]
    await db.tenantAddon.updateMany({ where: { id: assignmentId, tenantId: invoice.tenantId }, data: { status: "ACTIVE", currentPeriodEnd: invoice.periodEnd } })
    return { ok: true, tenantId: invoice.tenantId }
  }

  await activate({
    tenantId: invoice.tenantId,
    planId: invoice.subscription.planId,
    period: invoice.period as "MONTHLY" | "YEARLY",
    subscriptionId: invoice.subscriptionId,
  })

  return { ok: true, tenantId: invoice.tenantId }
}

/**
 * Trials that ran out and periods that were not renewed.
 *
 * Run daily. A workspace past its deadline goes PAST_DUE and keeps working for
 * a week: an unpaid invoice is usually a card that expired, not a business
 * that left, and cutting somebody's WhatsApp off the morning a payment fails
 * costs far more than a week of service. After the grace period it is
 * suspended — read-only, not deleted. They still own their customer list.
 */
export async function sweepSubscriptions(): Promise<{
  pastDue: number
  suspended: number
}> {
  const now = new Date()
  const graceCutoff = new Date(now.getTime() - GRACE_DAYS * 86_400_000)

  const overdue = await db.subscription.findMany({
    where: {
      status: { in: ["ACTIVE", "TRIALING"] },
      currentPeriodEnd: { lt: now },
    },
    select: { id: true, tenantId: true, plan: { select: { name: true } } },
  })
  for (const subscription of overdue) {
    await db.subscription.update({
      where: { id: subscription.id },
      data: { status: "PAST_DUE" },
    })
    await notifyBillingContact(subscription.tenantId, "Payment required", `Your ${subscription.plan.name} subscription is past due. Please update your payment to keep WhatsApp automation active.`)
  }

  /*
   * A workspace is suspended for having no paid subscription, not for having
   * an old unpaid one.
   *
   * Subscription rows accumulate: changing plan or re-subscribing leaves the
   * previous row behind, and an abandoned one stays PAST_DUE for ever. Reading
   * only that row, this suspended workspaces that had already paid — and did it
   * again on every run, so lifting the suspension by hand did not hold. What
   * decides it is whether the tenant has any subscription that is currently
   * good.
   */
  const expired = await db.subscription.findMany({
    where: { status: "PAST_DUE", currentPeriodEnd: { lt: graceCutoff } },
    select: { tenantId: true },
  })
  const expiredTenantIds = [...new Set(expired.map(s => s.tenantId))]

  for (const tenantId of expiredTenantIds) {
    const covered = await db.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ["ACTIVE", "TRIALING"] },
        OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gte: now } }],
      },
      select: { id: true },
    })
    if (covered) continue

    await db.tenant.updateMany({
      where: { id: tenantId, status: { not: "SUSPENDED" } },
      data: {
        status: "SUSPENDED",
        suspendedAt: now,
        suspendedReason: "Subscription unpaid",
      },
    })
  }

  const trialSoon = await db.tenant.findMany({ where: { trialEndsAt: { gte: now, lte: new Date(now.getTime() + 3 * 86_400_000) }, status: { in: ["ACTIVE", "TRIALING"] } }, select: { id: true, name: true, trialEndsAt: true } })
  for (const tenant of trialSoon) {
    const existing = await db.platformAuditEvent.findFirst({ where: { tenantId: tenant.id, action: "TRIAL_EXPIRY_NOTICE", createdAt: { gte: new Date(now.getTime() - 5 * 86_400_000) } } })
    if (existing) continue
    await notifyBillingContact(tenant.id, "Your Fizmoh trial is ending soon", `${tenant.name}'s Fizmoh trial ends on ${tenant.trialEndsAt?.toISOString().slice(0, 10)}. Choose a plan to keep your WhatsApp workspace active.`)
    await db.platformAuditEvent.create({ data: { tenantId: tenant.id, action: "TRIAL_EXPIRY_NOTICE", entity: "Tenant", entityId: tenant.id } })
  }

  return { pastDue: overdue.length, suspended: expired.length }
}

async function notifyBillingContact(tenantId: string, subject: string, text: string) {
  const setting = await db.systemSetting.findFirst({ where: { tenantId, key: "business_email" }, select: { value: true } })
  const email = setting?.value?.trim()
  if (!email) return

  const { getBillingAlertEmailHtml } = await import("@/lib/email-templates")
  const html = getBillingAlertEmailHtml({
    brandName: "Fizmoh Cloud",
    subject,
    message: text,
    actionUrl: "https://app.fizmoh.cloud/billing",
    warningLevel: subject.toLowerCase().includes("suspended") ? "danger" : subject.toLowerCase().includes("past due") ? "warning" : "info",
  })

  await sendEmail({ to: email, subject: `[Fizmoh] ${subject}`, text, html }).catch(() => {})
}

/** The workspace's subscription row, moved onto the chosen plan. */
async function currentOrNew(tenantId: string, planId: string, period: string) {
  const existing = await db.subscription.findFirst({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  })
  if (existing) {
    return db.subscription.update({
      where: { id: existing.id },
      data: { planId, period, moduleSnapshot: existing.moduleSnapshot ?? undefined, limitSnapshot: existing.limitSnapshot ?? undefined },
    })
  }
  return db.subscription.create({
    data: { tenantId, planId, period, status: "TRIALING" },
  })
}

export async function billingContact(tenantId: string): Promise<{ email?: string; phone: string }> {
  const [settings, owner] = await Promise.all([
    db.systemSetting.findMany({ where: { tenantId, key: { in: ["business_email", "business_phone"] } }, select: { key: true, value: true } }),
    db.tenantMember.findFirst({ where: { tenantId, role: "OWNER" }, include: { staff: { select: { email: true, phone: true } } } }),
  ])
  const values = Object.fromEntries(settings.map(row => [row.key, row.value?.trim()]))
  return {
    email: values.business_email || owner?.staff.email || undefined,
    phone: values.business_phone || owner?.staff.phone || "",
  }
}

async function activate(params: {
  tenantId: string
  planId: string
  period: "MONTHLY" | "YEARLY"
  subscriptionId?: string
}) {
  const subscription = params.subscriptionId
    ? { id: params.subscriptionId }
    : await currentOrNew(params.tenantId, params.planId, params.period)

  await db.subscription.update({
    where: { id: subscription.id },
    data: {
      planId: params.planId,
      period: params.period,
      status: "ACTIVE",
      currentPeriodEnd: nextPeriodEnd(params.period),
      cancelledAt: null,
      moduleSnapshot: (await db.plan.findUnique({ where: { id: params.planId }, select: { modules: true } }))?.modules ?? undefined,
      limitSnapshot: (await db.plan.findUnique({ where: { id: params.planId }, select: { limits: true } }))?.limits ?? undefined,
    },
  })

  // Paying lifts a suspension. Nothing else about the workspace changes.
  await db.tenant.updateMany({
    where: { id: params.tenantId },
    data: { status: "ACTIVE", suspendedAt: null, suspendedReason: null },
  })
}

function nextPeriodEnd(period: string): Date {
  const end = new Date()
  if (period === "YEARLY") end.setFullYear(end.getFullYear() + 1)
  else end.setMonth(end.getMonth() + 1)
  return end
}
