import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"

export const POST = withErrors(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const tenant = currentTenant(); if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  const { id } = await context.params
  const delivery = await db.webhookDelivery.updateMany({ where: { id, tenantId: tenant.tenantId, status: { in: ["FAILED", "RETRYING", "DEAD"] } }, data: { status: "RETRYING", nextRetryAt: new Date(), lastError: null } })
  if (!delivery.count) return NextResponse.json({ error: "Retryable delivery not found" }, { status: 404 })
  return NextResponse.json({ queued: true })
})
