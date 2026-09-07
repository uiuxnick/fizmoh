import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

export const GET = withErrors(withModule("RESTAURANT", async () => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ reservations: [] })

  const reservations = await raw.tableReservation.findMany({
    where: { tenantId },
    include: { table: true },
    orderBy: { reservationDate: "desc" },
    take: 50,
  })

  return NextResponse.json({ reservations })
}))

export const POST = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })

  const body = await req.json()
  const { tableId, customerName, customerPhone, customerEmail, partySize, reservationDate, reservationTime, specialRequests } = body

  if (!customerName || !customerPhone || !reservationDate || !reservationTime) {
    return NextResponse.json({ error: "Name, Phone, Date, and Time are required" }, { status: 400 })
  }

  const reservation = await raw.tableReservation.create({
    data: {
      tenantId,
      tableId: tableId || null,
      customerName: String(customerName).trim(),
      customerPhone: String(customerPhone).trim(),
      customerEmail: customerEmail ? String(customerEmail).trim() : null,
      partySize: Number(partySize) || 2,
      reservationDate: new Date(reservationDate),
      reservationTime: String(reservationTime).trim(),
      status: "CONFIRMED",
      specialRequests: specialRequests ? String(specialRequests).trim() : null,
    },
  })

  if (tableId) {
    await raw.restaurantTable.updateMany({
      where: { id: tableId, tenantId },
      data: { status: "RESERVED" },
    })
  }

  return NextResponse.json({ reservation }, { status: 201 })
}))

export const PUT = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })

  const body = await req.json()
  const { id, status } = body

  if (!id || !status) return NextResponse.json({ error: "Reservation ID and status required" }, { status: 400 })

  await raw.tableReservation.updateMany({
    where: { id, tenantId },
    data: { status },
  })

  return NextResponse.json({ updated: true })
}))
