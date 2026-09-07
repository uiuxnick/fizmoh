import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withinLimit, limitReached } from "@/lib/entitlements"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant } from "@/lib/tenant"

export const GET = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const tenant = currentTenant()
  if (session?.kind !== "staff" || !tenant?.tenantId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const channel = searchParams.get("channel")
  const search = searchParams.get("search")

  const where: any = { tenantId: tenant.tenantId }
  if (channel) where.channel = channel
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } },
    ]
  }

  const customers = await db.customer.findMany({
    where,
    include: {
      _count: { select: { orders: true, conversations: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ customers })
})

export const POST = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const tenant = currentTenant()
  if (session?.kind !== "staff" || !tenant?.tenantId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  // Contacts are what a plan is priced on, so the ceiling is enforced where one is added by hand. A customer who writes in is never turned away — see the webhook.
  const room = await withinLimit("contacts")
  if (!room.ok) return limitReached("contacts", room.used, room.cap)

  const body = await request.json()
  const existing = await db.customer.findFirst({ where: { tenantId: tenant.tenantId, phone: body.phone } })
  if (existing) return NextResponse.json({ customer: existing })

  const customer = await db.customer.create({
    data: {
      name: body.name,
      phone: body.phone,
      tenantId: tenant.tenantId,
      email: body.email,
      preferredLang: body.preferredLang || "en",
      whatsappOptIn: body.whatsappOptIn ?? true,
      emailOptIn: body.emailOptIn ?? false,
      tags: body.tags ? JSON.stringify(body.tags) : undefined,
    },
  })
  return NextResponse.json({ customer }, { status: 201 })
})
