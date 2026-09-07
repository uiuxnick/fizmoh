import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

export const PATCH = withErrors(withModule("TOURS", async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const body = await request.json()

  const data: any = {}
  if (body.status !== undefined) data.status = body.status
  if (body.capacity !== undefined) data.capacity = body.capacity
  if (body.priceOverride !== undefined) data.priceOverride = body.priceOverride
  if (body.seatsBooked !== undefined) data.seatsBooked = body.seatsBooked

  // Recompute FULL/OPEN if capacity or seats changed
  if (data.capacity !== undefined || data.seatsBooked !== undefined) {
    const existing = await db.slot.findUnique({ where: { id } })
    if (existing) {
      const cap = data.capacity ?? existing.capacity
      const booked = data.seatsBooked ?? existing.seatsBooked
      if (data.status === undefined) {
        data.status = booked >= cap ? "FULL" : "OPEN"
      }
    }
  }

  const slot = await db.slot.update({ where: { id }, data, include: { tour: true } })
  return NextResponse.json({ slot })
}))

export const DELETE = withErrors(withModule("TOURS", async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  await db.slot.delete({ where: { id } })
  return NextResponse.json({ success: true })
}))
