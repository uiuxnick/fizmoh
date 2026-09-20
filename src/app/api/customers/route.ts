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
  const cursor = searchParams.get("cursor")
  const pageSize = Number(searchParams.get("limit") || 50)
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100 || (cursor && !/^[a-zA-Z0-9_-]{1,128}$/.test(cursor))) {
    return NextResponse.json({ error: "Invalid pagination" }, { status: 400 })
  }
  const tier = searchParams.get("tier")

  const where: any = { tenantId: tenant.tenantId }
  if (channel) where.channel = channel
  if (tier && tier !== "all") {
    if (!["GOLD", "SILVER", "BRONZE"].includes(tier)) return NextResponse.json({ error: "Invalid tier" }, { status: 400 })
    where.loyaltyTier = tier
  }
  if (search) {
    where.OR = [
      { name: { contains: search.slice(0, 200), mode: "insensitive" } },
      { phone: { contains: search } },
      { email: { contains: search.slice(0, 200), mode: "insensitive" } },
    ]
  }

  const customers = await db.customer.findMany({
    where: { ...where, ...(cursor ? { id: { lt: cursor } } : {}) },
    include: {
      _count: { select: { orders: true, conversations: true } },
    },
    orderBy: { id: "desc" },
    take: pageSize + 1,
  })

  const total = await db.customer.count({ where })
  const page = customers.slice(0, pageSize)
  return NextResponse.json({ customers: page, total, nextCursor: customers.length > pageSize ? page.at(-1)?.id : null })
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
