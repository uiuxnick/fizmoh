import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"

export const GET = withErrors(withModule("DIGITAL_VCARD", async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: "No active tenant selected" }, { status: 400 })
  }

  const card = await (db as any).businessVCard.findFirst({
    where: { tenantId: tenant.tenantId },
    select: { id: true, slug: true, status: true },
  })

  if (!card) {
    return NextResponse.json({
      metrics: {
        views: 0,
        qrScans: 0,
        saves: 0,
        whatsappClicks: 0,
        calls: 0,
        mapClicks: 0,
        paymentClicks: 0,
        leads: 0,
        conversionRate: 0,
      },
      timeSeries: [],
      deviceBreakdown: [],
    })
  }

  const { searchParams } = new URL(request.url)
  const range = searchParams.get("range") || "30d"

  let days = 30
  if (range === "7d") days = 7
  else if (range === "90d") days = 90
  else if (range === "all") days = 365

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  // Fetch events in range
  const events = await (db as any).businessVCardAnalyticsEvent.findMany({
    where: {
      cardId: card.id,
      tenantId: tenant.tenantId,
      createdAt: { gte: startDate },
    },
    select: {
      eventType: true,
      deviceType: true,
      createdAt: true,
      sessionHash: true,
    },
  })

  // Total Leads in range
  const leadsCount = await (db as any).businessVCardLead.count({
    where: {
      cardId: card.id,
      tenantId: tenant.tenantId,
      createdAt: { gte: startDate },
    },
  })

  // Calculate breakdown counts
  let views = 0
  let qrScans = 0
  let saves = 0
  let whatsappClicks = 0
  let calls = 0
  let mapClicks = 0
  let paymentClicks = 0

  const deviceMap: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0, other: 0 }
  const dailyBuckets: Record<string, { date: string; views: number; saves: number; whatsapp: number; leads: number }> = {}

  // Initialize all days in range for smooth charts
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    dailyBuckets[key] = { date: key, views: 0, saves: 0, whatsapp: 0, leads: 0 }
  }

  for (const ev of events) {
    const dayKey = ev.createdAt.toISOString().slice(0, 10)
    if (dailyBuckets[dayKey]) {
      if (ev.eventType === "CARD_VIEW") dailyBuckets[dayKey].views++
      if (ev.eventType === "SAVE_CONTACT") dailyBuckets[dayKey].saves++
      if (ev.eventType === "WHATSAPP_CLICK") dailyBuckets[dayKey].whatsapp++
    }

    if (ev.eventType === "CARD_VIEW") views++
    else if (ev.eventType === "QR_SCAN") qrScans++
    else if (ev.eventType === "SAVE_CONTACT") saves++
    else if (ev.eventType === "WHATSAPP_CLICK") whatsappClicks++
    else if (ev.eventType === "CALL_CLICK") calls++
    else if (ev.eventType === "MAP_CLICK") mapClicks++
    else if (ev.eventType === "PAYMENT_CLICK") paymentClicks++

    const dev = (ev.deviceType || "other").toLowerCase()
    if (deviceMap[dev] !== undefined) deviceMap[dev]++
    else deviceMap.other++
  }

  // Fetch leads grouped by day
  const leads = await (db as any).businessVCardLead.findMany({
    where: {
      cardId: card.id,
      tenantId: tenant.tenantId,
      createdAt: { gte: startDate },
    },
    select: { createdAt: true },
  })

  for (const l of leads) {
    const dayKey = l.createdAt.toISOString().slice(0, 10)
    if (dailyBuckets[dayKey]) {
      dailyBuckets[dayKey].leads++
    }
  }

  const timeSeries = Object.values(dailyBuckets).sort((a, b) => a.date.localeCompare(b.date))

  const totalInteractions = saves + whatsappClicks + calls + leadsCount
  const conversionRate = views > 0 ? Math.min(100, Math.round((totalInteractions / views) * 1000) / 10) : 0

  return NextResponse.json({
    metrics: {
      views,
      qrScans,
      saves,
      whatsappClicks,
      calls,
      mapClicks,
      paymentClicks,
      leads: leadsCount,
      conversionRate,
    },
    timeSeries,
    deviceBreakdown: Object.entries(deviceMap).map(([device, count]) => ({ device, count })),
  })
}))
