import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { callWaiter } from "@/lib/restaurant"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tableToken, tenantSlug, requestType, message, roomNumber } = body

    let tenantId: string | null = null
    let tableId: string | null = null
    let tableNumber: string | null = null
    let branchId: string | null = null
    let resolvedRoom = roomNumber || null

    if (tableToken) {
      const table = await raw.restaurantTable.findFirst({
        where: { token: tableToken },
      })
      if (table) {
        tableId = table.id
        tableNumber = table.number
        tenantId = table.tenantId
        branchId = table.branchId
        if (table.type === "ROOM" && table.roomNumber) {
          resolvedRoom = table.roomNumber
        }
      }
    }

    if (!tenantId && tenantSlug) {
      const tenant = await raw.tenant.findUnique({
        where: { slug: tenantSlug },
        select: { id: true },
      })
      if (tenant) tenantId = tenant.id
    }

    if (!tenantId) {
      return NextResponse.json({ error: "Restaurant or Table could not be resolved" }, { status: 400 })
    }

    const result = await callWaiter({
      tenantId,
      branchId,
      tableId,
      tableNumber,
      roomNumber: resolvedRoom,
      requestType: requestType || "ASSISTANCE",
      message,
    })

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to notify staff" }, { status: 500 })
  }
}
