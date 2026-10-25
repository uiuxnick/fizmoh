import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { db, raw } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { sendAptConfirmation } from "@/lib/apt-whatsapp"
import { localDateKey, fromLocal } from "@/lib/timezone"

export const GET = withErrors(withModule("APPOINTMENTS", async (req: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const status = searchParams.get("status") || "all"
  const serviceId = searchParams.get("serviceId")
  const providerId = searchParams.get("providerId")
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")

  const where: any = {}
  if (tenant.tenantId && tenant.tenantId !== "PLATFORM") {
    where.tenantId = tenant.tenantId
  }

  if (status !== "all") {
    where.status = status
  }
  if (serviceId) {
    where.serviceId = serviceId
  }
  if (providerId) {
    where.providerId = providerId
  }
  if (startDate || endDate) {
    where.appointmentDate = {}
    if (startDate) where.appointmentDate.gte = fromLocal(startDate, "00:00")
    if (endDate) where.appointmentDate.lte = fromLocal(endDate, "23:59")
  }

  if (search) {
    where.OR = [
      { reference: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { customerPhone: { contains: search, mode: "insensitive" } },
      { customerEmail: { contains: search, mode: "insensitive" } },
    ]
  }

  const client = (tenant.tenantId && tenant.tenantId !== "PLATFORM") ? db : raw
  const appointments = await client.aptAppointment.findMany({
    where,
    include: {
      service: true,
      provider: true,
      branch: true,
      history: { orderBy: { createdAt: "desc" } },
    },
    orderBy: [{ createdAt: "desc" }],
  })

  // Calculate stats for Muscat today
  const todayStr = localDateKey(new Date())
  const todayStart = fromLocal(todayStr, "00:00")
  const todayEnd = fromLocal(todayStr, "23:59")

  const stats = {
    total: appointments.length,
    today: appointments.filter(a => {
      const aDate = new Date(a.appointmentDate)
      return aDate >= todayStart && aDate <= todayEnd
    }).length,
    confirmed: appointments.filter(a => a.status === "CONFIRMED").length,
    completed: appointments.filter(a => a.status === "COMPLETED").length,
    cancelled: appointments.filter(a => a.status === "CANCELLED").length,
    noShow: appointments.filter(a => a.status === "NO_SHOW").length,
    whatsapp: appointments.filter(a => a.bookingSource === "WHATSAPP").length,
    manual: appointments.filter(a => a.bookingSource === "MANUAL" || a.bookingSource === "ADMIN" || a.bookingSource === "ADMIN_WIZARD").length,
  }

  return NextResponse.json({ appointments, stats })
}))

export const POST = withErrors(withModule("APPOINTMENTS", async (req: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const {
    customerName, customerPhone, customerEmail, serviceId, providerId,
    branchId, date, startTime, durationMins, notes, bookingSource = "ADMIN",
    sendWhatsappNotice = true, meetLink: customMeetLink,
  } = body

  if (!customerName || !customerPhone || !serviceId || !date || !startTime) {
    return NextResponse.json({ error: "Missing required fields (name, phone, service, date, time)" }, { status: 400 })
  }

  const service = await db.aptService.findFirst({ where: { id: serviceId, tenantId: tenant.tenantId } })
  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 })

  const dur = Number(durationMins) || service.durationMins || 30
  const [h, m] = startTime.split(":").map(Number)
  const newStartMins = (h || 0) * 60 + (m || 0)
  const endMins = newStartMins + dur
  const endTime = `${String(Math.floor(endMins / 60)).padStart(2, "0")}:${String(endMins % 60).padStart(2, "0")}`

  const startOfDay = fromLocal(date, "00:00")
  const endOfDay = fromLocal(date, "23:59")

  // 1. Collision check: existing confirmed/active appointments
  const existingAppts = await db.aptAppointment.findMany({
    where: {
      tenantId: tenant.tenantId,
      appointmentDate: { gte: startOfDay, lte: endOfDay },
      status: { notIn: ["CANCELLED", "EXPIRED", "NO_SHOW"] },
      ...(providerId && providerId !== "default" ? { providerId } : {}),
    },
    select: { startTime: true, endTime: true },
  })

  const hasApptConflict = existingAppts.some(apt => {
    const [aStartH, aStartM] = apt.startTime.split(":").map(Number)
    const [aEndH, aEndM] = (apt.endTime || "23:59").split(":").map(Number)
    const aStartMins = aStartH * 60 + aStartM
    const aEndMins = aEndH * 60 + aEndM
    return newStartMins < aEndMins && endMins > aStartMins
  })

  if (hasApptConflict) {
    return NextResponse.json({ error: "The selected time slot is already booked" }, { status: 409 })
  }

  // 2. Collision check: active holds by another customer
  const activeHolds = await db.aptHold.findMany({
    where: {
      tenantId: tenant.tenantId,
      slotDate: { gte: startOfDay, lte: endOfDay },
      expiresAt: { gt: new Date() },
      customerPhone: { not: customerPhone },
      ...(providerId && providerId !== "default" ? { providerId } : {}),
    },
    select: { startTime: true, endTime: true },
  })

  const hasHoldConflict = activeHolds.some(hold => {
    const [hStartH, hStartM] = hold.startTime.split(":").map(Number)
    const [hEndH, hEndM] = (hold.endTime || "23:59").split(":").map(Number)
    const hStartMins = hStartH * 60 + hStartM
    const hEndMins = hEndH * 60 + hEndM
    return newStartMins < hEndMins && endMins > hStartMins
  })

  if (hasHoldConflict) {
    return NextResponse.json({ error: "The selected time slot is currently on hold by another customer" }, { status: 409 })
  }

  const refNum = Math.floor(100000 + Math.random() * 900000)
  const reference = `APT-${new Date().getFullYear()}-${refNum}`

  const existingCustomer = await db.customer.findFirst({
    where: { phone: customerPhone, tenantId: tenant.tenantId }
  })

  const appointmentDate = fromLocal(date, startTime)
  const meetLink = customMeetLink || (service.onlineInPerson === "ONLINE" ? `https://meet.google.com/apt-${reference.toLowerCase()}` : null)

  const appointment = await db.aptAppointment.create({
    data: {
      tenantId: tenant.tenantId,
      reference,
      customerId: existingCustomer?.id,
      customerName,
      customerPhone,
      customerEmail: customerEmail || null,
      serviceId,
      providerId: providerId && providerId !== "default" ? providerId : null,
      branchId: branchId || null,
      appointmentDate,
      startTime,
      endTime,
      durationMins: dur,
      status: "CONFIRMED",
      paymentStatus: service.price > 0 ? "PENDING" : "NOT_REQUIRED",
      totalAmount: service.price || 0,
      bookingSource,
      notes: notes || null,
      meetLink,
    },
    include: {
      service: true,
      provider: true,
      branch: true,
    },
  })

  // Release any active hold by this customer
  await db.aptHold.deleteMany({
    where: { tenantId: tenant.tenantId, customerPhone },
  }).catch(() => null)

  await db.aptHistory.create({
    data: {
      tenantId: tenant.tenantId,
      appointmentId: appointment.id,
      statusTo: "CONFIRMED",
      notes: `Created via ${bookingSource}`,
      changedBy: "ADMIN",
    },
  })

  if (sendWhatsappNotice && customerPhone) {
    try {
      await sendAptConfirmation({
        phone: customerPhone,
        reference: appointment.reference,
        customerName: appointment.customerName,
        customerEmail: appointment.customerEmail,
        serviceName: service.name,
        providerName: appointment.provider?.name,
        branchName: appointment.branch?.name,
        dateStr: date,
        timeStr: startTime,
        durationMins: dur,
        price: service.price,
        currency: service.currency,
        meetLink: appointment.meetLink,
      })
    } catch (e) {
      console.error("WhatsApp notification error:", e)
    }
  }

  return NextResponse.json({ appointment }, { status: 201 })
}))
