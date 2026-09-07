import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { businessName } from "@/lib/app-config"

/**
 * The month's departures as an .ics file.
 *
 * Any calendar reads this — Google, Apple, Outlook — so the schedule can be
 * subscribed to without granting a third party access to the booking database.
 * A full Google Calendar sync is a heavier thing: it needs a service account
 * and write access to somebody's calendar, and it can wait until this is not
 * enough.
 */
function escape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")
}

function stamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
}

export const GET = withErrors(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get("month")
  const base = monthParam ? new Date(`${monthParam}-01T00:00:00.000Z`) : new Date()
  if (Number.isNaN(base.getTime())) return NextResponse.json({ error: "Invalid month" }, { status: 400 })

  const from = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1))
  const to = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 1))

  const slots = await db.slot.findMany({
    where: { date: { gte: from, lt: to } },
    include: {
      tour: true,
      orders: { where: { orderStatus: { notIn: ["CANCELLED", "REFUNDED"] } } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  })

  const brand = await businessName()
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${brand}//Booking Calendar//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${brand} departures`,
  ]

  for (const slot of slots) {
    if (slot.orders.length === 0) continue

    const [hours, minutes] = slot.startTime.split(":").map(Number)
    const start = new Date(slot.date)
    start.setUTCHours((hours || 0) - 4, minutes || 0, 0, 0) // Oman is UTC+4
    const end = new Date(start.getTime() + (slot.tour.durationHours || 2) * 3_600_000)

    const guests = slot.orders.reduce((sum, o) => sum + o.paxAdult + o.paxChild, 0)
    const infants = slot.orders.reduce((sum, o) => sum + o.paxInfant, 0)
    const manifest = slot.orders
      .map(o => `${o.customerName} (${o.customerPhone}) — ${o.paxAdult}A${o.paxChild ? ` ${o.paxChild}C` : ""}${o.paxInfant ? ` ${o.paxInfant}I` : ""} — ${o.orderNumber}`)
      .join("\n")

    lines.push(
      "BEGIN:VEVENT",
      `UID:${slot.id}@app.fizmoh.cloud`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${escape(`${slot.tour.name} — ${guests} guests${infants ? ` + ${infants} infants` : ""}`)}`,
      `LOCATION:${escape(slot.tour.meetingPoint || slot.tour.city)}`,
      `DESCRIPTION:${escape(manifest)}`,
      "END:VEVENT",
    )
  }

  lines.push("END:VCALENDAR")

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="departures-${from.toISOString().slice(0, 7)}.ics"`,
    },
  })
})
