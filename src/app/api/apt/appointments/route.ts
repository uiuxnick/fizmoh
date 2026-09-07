import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { db, raw } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { sendAptConfirmation } from "@/lib/apt-whatsapp"
import { localDateKey, fromLocal } from "@/lib/timezone"

export const GET = withErrors(async (req: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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
})

export const POST = withErrors(async (req: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const {
    customerName, customerPhone, customerEmail, serviceId, providerId,
    branchId, date, startTime, durationMins, notes, bookingSource = "ADMIN",
    sendWhatsappNotice = true,
  } = body

  if (!customerName || !customerPhone || !serviceId || !date || !startTime) {
    return NextResponse.json({ error: "Missing required fields (name, phone, service, date, time)" }, { status: 400 })
  }

  const service = await db.aptService.findFirst({ where: { id: serviceId, tenantId: tenant.tenantId } })
  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 })

  const dur = Number(durationMins) || service.durationMins || 30
  const [h, m] = startTime.split(":").map(Number)
  const endMins = h * 60 + m + dur
  const endTime = `${String(Math.floor(endMins / 60)).padStart(2, "0")}:${String(endMins % 60).padStart(2, "0")}`

  const refNum = Math.floor(100000 + Math.random() * 900000)
  const reference = `APT-${new Date().getFullYear()}-${refNum}`

  const existingCustomer = await db.customer.findFirst({ where: { phone: customerPhone } })

  const appointmentDate = fromLocal(date, startTime)

  const appointment = await db.aptAppointment.create({
    data: {
      tenantId: tenant.tenantId,
      reference,
      customerId: existingCustomer?.id,
      customerName,
      customerPhone,
      customerEmail,
      serviceId,
      providerId: providerId || null,
      branchId: branchId || null,
      appointmentDate,
      startTime,
      endTime,
      durationMins: dur,
      status: "CONFIRMED",
      paymentStatus: service.price > 0 ? "PENDING" : "NOT_REQUIRED",
      totalAmount: service.price || 0,
      bookingSource,
      notes,
    },
    include: {
      service: true,
      provider: true,
      branch: true,
    },
  })

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
        serviceName: service.name,
        providerName: appointment.provider?.name,
        branchName: appointment.branch?.name,
        dateStr: date,
        timeStr: startTime,
        durationMins: dur,
        price: service.price,
        currency: service.currency,
      })
    } catch (e) {
      console.error("WhatsApp notification error:", e)
    }
  }

  return NextResponse.json({ appointment }, { status: 201 })
})
