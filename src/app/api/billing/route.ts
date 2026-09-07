import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { currentTenant } from "@/lib/tenant"
import {
  billingState,
  startCheckout,
  calculateProration,
  availablePlatformGateways,
  type ProrationInfo,
} from "@/lib/billing"

function resolveOrigin(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.startsWith("http")) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/+$/, "")
  }
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
  if (host && !host.includes("127.0.0.1") && !host.includes("localhost")) {
    const proto = request.headers.get("x-forwarded-proto") || "https"
    return `${proto}://${host}`
  }
  return "https://app.fizmoh.cloud"
}

/**
 * What this workspace is on, and how to change it.
 *
 * Accounts for prorated unused balance when upgrading or downgrading.
 */

export const GET = withErrors(async () => {
  const tenant = currentTenant()
  const [plans, gateways] = await Promise.all([
    db.plan.findMany({
      where: { isPublic: true },
      orderBy: { sortOrder: "asc" },
    }),
    availablePlatformGateways(),
  ])

  if (!tenant?.tenantId) {
    return NextResponse.json({ plans, billing: null, prorations: {}, gateways, invoices: [] })
  }

  const [billing, invoices] = await Promise.all([
    billingState(tenant.tenantId),
    db.subscriptionInvoice.findMany({
      where: { tenantId: tenant.tenantId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reference: true,
        amount: true,
        currency: true,
        period: true,
        status: true,
        periodStart: true,
        periodEnd: true,
        paidAt: true,
        gatewayReference: true,
        createdAt: true,
        subscription: {
          select: {
            plan: {
              select: { name: true },
            },
          },
        },
        items: {
          select: {
            description: true,
            quantity: true,
            unitAmount: true,
          },
        },
      },
    }),
  ])
  const prorations: Record<string, { MONTHLY: ProrationInfo | null; YEARLY: ProrationInfo | null }> = {}

  await Promise.all(
    plans.map(async (p) => {
      const [monthlyProration, yearlyProration] = await Promise.all([
        calculateProration(tenant.tenantId, p.id, "MONTHLY"),
        calculateProration(tenant.tenantId, p.id, "YEARLY"),
      ])
      prorations[p.id] = { MONTHLY: monthlyProration, YEARLY: yearlyProration }
    }),
  )

  return NextResponse.json({ plans, billing, prorations, gateways, invoices })
})

export const POST = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: "No workspace in scope" }, { status: 400 })
  }
  // Changing what the business pays is not an everyday action for everyday
  // staff.
  if (tenant.role && !["OWNER", "SUPER_ADMIN", "MANAGER", "OPS_ADMIN"].includes(tenant.role)) {
    return NextResponse.json({ error: "Only an owner can change the plan" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const planId = typeof body?.planId === "string" ? body.planId : ""
  const period = body?.period === "YEARLY" ? "YEARLY" : "MONTHLY"
  const gateway = typeof body?.gateway === "string" ? body.gateway : undefined
  if (!planId) return NextResponse.json({ error: "Choose a plan" }, { status: 400 })

  const origin = resolveOrigin(request)
  const result = await startCheckout({ tenantId: tenant.tenantId, planId, period, gateway, origin })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  // No URL means the plan was free or fully covered by unused balance credit and already applied.
  return NextResponse.json({
    url: result.url ?? null,
    reference: result.reference ?? null,
    amountDue: result.amountDue ?? 0,
    gateway: result.gateway ?? null,
  })
})
