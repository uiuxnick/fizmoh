import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { slotsForDate, appointmentsEnabled, defaultDurationMins } from "@/lib/appointments"
import { localDateKey } from "@/lib/timezone"

/** The bookable times on a given day, and which are already gone. */
export const GET = withErrors(withModule("APPOINTMENTS", async (request: NextRequest) => {
  if (!(await appointmentsEnabled())) {
    return NextResponse.json({ error: "Appointments are turned off" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date") || localDateKey(new Date())
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Date must look like 2026-08-14" }, { status: 400 })
  }

  const slots = await slotsForDate(date)
  return NextResponse.json({
    date,
    durationMins: await defaultDurationMins(),
    slots: slots.map(s => ({ time: s.time, startsAt: s.startsAt, available: s.available, reason: s.reason })),
  })
}))
