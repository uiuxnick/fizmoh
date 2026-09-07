import { withErrors } from "@/lib/api-handler"
import { resolveHospTenantId } from "@/lib/hospital"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { addDays, startOfDay, endOfDay, format } from "date-fns"

async function calcWardAvail(tenantId: string, wardType: string, date: Date, sessionId?: string) {
  const ward = await db.hospWard.findFirst({ where: { tenantId, wardType } })
  if (!ward) return { total: 0, available: 0 }
  const total = ward.totalBeds

  const confirmed = await db.hospChemoBooking.count({
    where: {
      tenantId,
      bed: { wardId: ward.id },
      bookingDate: { gte: startOfDay(date), lte: endOfDay(date) },
      ...(sessionId ? { sessionId } : {}),
      status: { notIn: ["CANCELLED", "RESCHEDULED"] },
    },
  })

  const held = await db.hospBedHold.count({
    where: {
      bed: { wardId: ward.id },
      bookingDate: { gte: startOfDay(date), lte: endOfDay(date) },
      ...(sessionId ? { sessionId } : {}),
      expiresAt: { gt: new Date() },
    },
  })

  const blocked = await db.hospBedBlock.count({
    where: {
      bed: { wardId: ward.id },
      startDatetime: { lte: endOfDay(date) },
      endDatetime: { gte: startOfDay(date) },
    },
  })

  const available = Math.max(0, total - confirmed - held - blocked)
  return { total, available, booked: confirmed, held, blocked }
}

export const GET = withErrors(async (req: NextRequest) => {
  const tenantId = await resolveHospTenantId(req)
  const url = new URL(req.url)
  const days = parseInt(url.searchParams.get("days") || "14")
  const sessionId = url.searchParams.get("sessionId") || undefined

  const results: any[] = []
  for (let i = 0; i < days; i++) {
    const date = addDays(startOfDay(new Date()), i)
    const normal = await calcWardAvail(tenantId, "NORMAL", date, sessionId)
    const special = await calcWardAvail(tenantId, "SPECIAL", date, sessionId)
    const totalAvail = normal.available + special.available
    const totalBeds = normal.total + special.total
    results.push({
      date: format(date, "yyyy-MM-dd"),
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(date, "EEE d MMM"),
      normal,
      special,
      total: totalBeds,
      available: totalAvail,
      fullyBooked: totalAvail === 0,
      limited: totalAvail > 0 && totalAvail <= 3,
    })
  }
  return NextResponse.json(results)
})
