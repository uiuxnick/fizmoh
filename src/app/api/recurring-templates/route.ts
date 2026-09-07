import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"

/**
 * Recurring Schedule Templates API
 * Per BRD §6.2: "recurring schedule templates (e.g., daily 9 AM/2 PM departures)"
 *
 * Creates slots on a recurring basis (daily/weekly) for a date range
 */
export const POST = withErrors(async (request: NextRequest) => {
  const body = await request.json()
  const { tourId, startDate, endDate, times, daysOfWeek, capacity, priceOverride } = body

  const start = new Date(startDate)
  const end = new Date(endDate)
  const created: any[] = []

  const currentDate = new Date(start)
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay()
    // 0=Sun, 1=Mon, ... 6=Sat. daysOfWeek is array of numbers [0,1,2,3,4,5,6] or null for all
    if (!daysOfWeek || daysOfWeek.includes(dayOfWeek)) {
      for (const time of times) {
        const existing = await db.slot.findUnique({
          where: { tourId_date_startTime: { tourId, date: new Date(currentDate), startTime: time } },
        })
        if (!existing) {
          const isWeekend = dayOfWeek === 4 || dayOfWeek === 5 // Thu/Fri in Oman
          const slot = await db.slot.create({
            data: {
              tourId,
              date: new Date(currentDate),
              startTime: time,
              capacity: capacity || 10,
              seatsBooked: 0,
              priceOverride: priceOverride ?? (isWeekend ? null : null),
              status: "OPEN",
              isRecurring: true,
            },
          })
          created.push(slot)
        }
      }
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return NextResponse.json({ created: created.length, slots: created.slice(0, 10) }, { status: 201 })
})
