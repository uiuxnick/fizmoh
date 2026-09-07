import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { validateApiKey } from "@/lib/api-keys"
import { withTenant } from "@/lib/tenant-context"
import { db } from "@/lib/db"

export const GET = withErrors(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params
  const apiKeyHeader = request.headers.get("x-api-key") || request.headers.get("authorization")
  const keyInfo = await validateApiKey(apiKeyHeader)
  if (!keyInfo) {
    return NextResponse.json({ error: "Unauthorized: Invalid or missing API key" }, { status: 401 })
  }

  const customer = await withTenant({ tenantId: keyInfo.tenantId, slug: "" }, async () => {
    return db.customer.findUnique({
      where: { id },
      include: {
        orders: {
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            orderStatus: true,
            paymentStatus: true,
            createdAt: true,
          },
        },
        conversations: {
          take: 1,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            status: true,
            unreadCount: true,
            lastMessageAt: true,
          },
        },
      },
    })
  })

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true, customer })
})

export const PATCH = withErrors(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params
  const apiKeyHeader = request.headers.get("x-api-key") || request.headers.get("authorization")
  const keyInfo = await validateApiKey(apiKeyHeader)
  if (!keyInfo) {
    return NextResponse.json({ error: "Unauthorized: Invalid or missing API key" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "Request body is required" }, { status: 400 })
  }

  const updated = await withTenant({ tenantId: keyInfo.tenantId, slug: "" }, async () => {
    const existing = await db.customer.findUnique({ where: { id } })
    if (!existing) return null

    return db.customer.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        email: body.email ?? existing.email,
        stage: body.stage ?? existing.stage,
        tags: Array.isArray(body.tags) ? body.tags : (existing.tags as any),
        customFields: body.customFields ?? (existing.customFields as any),
        preferredLang: body.preferredLang ?? existing.preferredLang,
        preferredCurrency: body.preferredCurrency ?? existing.preferredCurrency,
        whatsappOptIn: body.whatsappOptIn ?? existing.whatsappOptIn,
        lastContactAt: new Date(),
      },
    })
  })

  if (!updated) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true, customer: updated })
})

export const DELETE = withErrors(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params
  const apiKeyHeader = request.headers.get("x-api-key") || request.headers.get("authorization")
  const keyInfo = await validateApiKey(apiKeyHeader)
  if (!keyInfo) {
    return NextResponse.json({ error: "Unauthorized: Invalid or missing API key" }, { status: 401 })
  }

  const deleted = await withTenant({ tenantId: keyInfo.tenantId, slug: "" }, async () => {
    const existing = await db.customer.findUnique({ where: { id } })
    if (!existing) return false
    await db.customer.delete({ where: { id } })
    return true
  })

  if (!deleted) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true, message: "Customer deleted successfully" })
})
