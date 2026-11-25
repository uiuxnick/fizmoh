import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { mobileRoute } from "@/lib/mobile-api/guard"
import { raw } from "@/lib/db"
import { hasPermission, maskPhoneNumber, resolveStaffPermissions } from "@/lib/permissions"

const AVAILABLE_LABELS = [
  "VIP", "New Lead", "Payment Pending", "Arabic Speaker", "Repeat Customer", "Complaint", "Follow Up",
]

export const OPTIONS = mobileRoute({}, async () => new NextResponse(null, { status: 204 }))

export const GET = mobileRoute({ requiredModule: "INBOX" }, async (request, _context, auth) => {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.trim()
  const tag = searchParams.get("tag")
  const channel = searchParams.get("channel")?.toUpperCase()
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "50", 10)))
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))

  const permissions = resolveStaffPermissions(
    auth.workspaceRole,
    auth.permissions && typeof auth.permissions === "object" ? auth.permissions : null,
  )
  const canViewPhone = hasPermission({ role: auth.workspaceRole, permissions }, "view_phone_numbers")

  const andClauses: any[] = [{ tenantId: auth.tenantId }]

  if (channel && ["WHATSAPP", "FACEBOOK", "INSTAGRAM"].includes(channel)) {
    andClauses.push({ channel })
  }

  if (search) {
    const qLower = search.toLowerCase()
    const workspaceLabels = await raw.label.findMany({
      where: { tenantId: auth.tenantId },
      select: { name: true },
    }).catch(() => [])
    const matchedLabels = Array.from(new Set([...AVAILABLE_LABELS, ...workspaceLabels.map(l => l.name), search]))
      .filter(l => l.toLowerCase().includes(qLower))

    andClauses.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
        ...matchedLabels.flatMap(label => [
          { tags: { array_contains: label } },
          { conversations: { some: { labels: { array_contains: label } } } },
        ]),
      ],
    })
  }

  if (tag === "__unlabeled__") {
    andClauses.push({
      AND: [
        {
          OR: [
            { tags: { equals: Prisma.DbNull } },
            { tags: { equals: Prisma.JsonNull } },
            { tags: { equals: [] } },
          ],
        },
        {
          conversations: {
            none: {
              AND: [
                { labels: { not: Prisma.DbNull } },
                { labels: { not: Prisma.JsonNull } },
                { NOT: { labels: { equals: [] } } },
              ],
            },
          },
        },
      ],
    })
  } else if (tag && tag !== "all") {
    andClauses.push({
      OR: [
        { tags: { array_contains: tag } },
        { conversations: { some: { labels: { array_contains: tag } } } },
      ],
    })
  }

  const where = { AND: andClauses }
  const [total, customers] = await Promise.all([
    raw.customer.count({ where }),
    raw.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        channel: true,
        tags: true,
        loyaltyTier: true,
        whatsappOptIn: true,
        createdAt: true,
      },
    }),
  ])

  const data = customers.map(c => ({
    ...c,
    phone: canViewPhone ? c.phone : maskPhoneNumber(c.phone, false),
  }))

  return NextResponse.json({
    data,
    pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
  })
})
