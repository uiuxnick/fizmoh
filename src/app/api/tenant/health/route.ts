import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { limitsFor, modulesFor } from "@/lib/entitlements"
import { isWhatsAppConfigured } from "@/lib/whatsapp"

export const GET = withErrors(async () => {
  const tenant = currentTenant(); if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  const tenantId = tenant.tenantId
  const [tenantRow, members, contacts, numbers, messages, flows, subscription, whatsapp, limits, modules] = await Promise.all([
    db.tenant.findUnique({ where: { id: tenantId }, select: { status: true } }),
    db.tenantMember.count({ where: { tenantId } }),
    db.customer.count({ where: { tenantId } }),
    db.whatsAppAccount.count({ where: { tenantId } }),
    db.message.count({ where: { tenantId, direction: "OUTBOUND", createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
    db.botFlow.count({ where: { tenantId, isActive: true } }),
    db.subscription.findFirst({ where: { tenantId }, include: { plan: true }, orderBy: { createdAt: "desc" } }),
    isWhatsAppConfigured(), limitsFor(tenantId), modulesFor(tenantId),
  ])
  return NextResponse.json({ status: tenantRow?.status ?? "ACTIVE", whatsapp: { configured: whatsapp, numbers }, plan: { name: subscription?.plan.name ?? null, status: subscription?.status ?? "NONE", endsAt: subscription?.currentPeriodEnd ?? null, modules, limits }, usage: { members, contacts, numbers, messagesThisMonth: messages, activeFlows: flows }, checks: { whatsapp: whatsapp && numbers > 0, team: members > 0, automation: flows > 0, billing: ["ACTIVE", "TRIALING"].includes(subscription?.status || "") } })
})
