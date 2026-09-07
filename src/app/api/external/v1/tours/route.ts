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

  const tours = await withTenant({ tenantId: keyInfo.tenantId, slug: "" }, async () => {
    return db.tour.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        basePrice: true,
        childPrice: true,
        currency: true,
        city: true,
        durationHours: true,
        slots: {
          where: { date: { gte: new Date() } },
          take: 30,
          select: { id: true, date: true, startTime: true, seatsBooked: true, capacity: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  })

  return NextResponse.json({ tours })
})
