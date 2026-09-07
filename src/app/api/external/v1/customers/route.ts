import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { validateApiKey } from "@/lib/api-keys"
import { withTenant } from "@/lib/tenant-context"
import { db } from "@/lib/db"

export const GET = withErrors(async (request: NextRequest) => {
  const apiKeyHeader = request.headers.get("x-api-key") || request.headers.get("authorization")
  const keyInfo = await validateApiKey(apiKeyHeader)
  if (!keyInfo) {
    return NextResponse.json({ error: "Unauthorized: Invalid or missing API key" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim()
  const stage = searchParams.get("stage")?.trim()
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
  const skip = (page - 1) * limit

  const where: any = {}
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { email: { contains: q, mode: "insensitive" } },
    ]
  }
  if (stage) {
    where.stage = stage
  }

  const result = await withTenant({ tenantId: keyInfo.tenantId, slug: "" }, async () => {
    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          stage: true,
          tags: true,
          source: true,
          whatsappOptIn: true,
          preferredLang: true,
          preferredCurrency: true,
          lastContactAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.customer.count({ where }),
    ])

    return { customers, total }
  })

  return NextResponse.json({
    success: true,
    data: result.customers,
    pagination: {
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    },
  })
})

export const POST = withErrors(async (request: NextRequest) => {
  const apiKeyHeader = request.headers.get("x-api-key") || request.headers.get("authorization")
  const keyInfo = await validateApiKey(apiKeyHeader)
  if (!keyInfo) {
    return NextResponse.json({ error: "Unauthorized: Invalid or missing API key" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const phone = body?.phone?.trim()
  const name = body?.name?.trim()
  const email = body?.email?.trim()
  const stage = body?.stage?.trim() || "NEW"
  const tags = Array.isArray(body?.tags) ? body.tags : []
  const customFields = typeof body?.customFields === "object" ? body.customFields : null

  if (!phone) {
    return NextResponse.json({ error: "Phone number ('phone') is required" }, { status: 400 })
  }

  const customer = await withTenant({ tenantId: keyInfo.tenantId, slug: "" }, async () => {
    const existing = await db.customer.findFirst({ where: { phone } })
    if (existing) {
      return db.customer.update({
        where: { id: existing.id },
        data: {
          name: name ?? existing.name,
          email: email ?? existing.email,
          stage: stage ?? existing.stage,
          tags: tags.length > 0 ? tags : (existing.tags as any),
          customFields: customFields ?? (existing.customFields as any),
          lastContactAt: new Date(),
        },
      })
    } else {
      return db.customer.create({
        data: {
          phone,
          name: name || "API Contact",
          email,
          stage,
          tags,
          customFields,
          source: body?.source || "EXTERNAL_API",
          whatsappOptIn: body?.whatsappOptIn !== false,
          optInSource: "EXTERNAL_API",
          optInAt: new Date(),
        },
      })
    }
  })

  return NextResponse.json({
    success: true,
    customer,
  })
})
