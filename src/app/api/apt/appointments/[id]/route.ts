import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { sendAptCancellationNotice, sendAptRescheduleNotice } from "@/lib/apt-whatsapp"

export const GET = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const tenant = currentTenant()
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const appointment = await db.aptAppointment.findFirst({
    where: { id, tenantId: tenant.tenantId },
    include: {
      service: true,
      provider: true,
      branch: true,
      history: { orderBy: { createdAt: "desc" } },
      answers: { include: { customField: true } },
    },
  })

  if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 })

  // Find linked customer profile if available
  let customerProfile: any = null
  if (appointment.customerId || appointment.customerPhone) {
    customerProfile = await db.customer.findFirst({
      where: {
        OR: [
          { id: appointment.customerId || "" },
          { phone: appointment.customerPhone },
        ],
      },
      select: { id: true, name: true, phone: true, email: true, tags: true },
    })
  }

  return NextResponse.json({ appointment, customerProfile })
})

export const PUT = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const tenant = currentTenant()
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const { status, action, notes, date, startTime, providerId } = body

  const existing = await db.aptAppointment.findFirst({
    where: { id, tenantId: tenant.tenantId },
    include: { service: true },
  })

  if (!existing) return NextResponse.json({ error: "Appointment not found" }, { status: 404 })

  const updateData: any = {}
  let newStatus = status || existing.status

  if (action === "CANCEL") {
    newStatus = "CANCELLED"
  } else if (action === "CONFIRM") {
    newStatus = "CONFIRMED"
  } else if (action === "COMPLETE") {
    newStatus = "COMPLETED"
  } else if (action === "NO_SHOW") {
    newStatus = "NO_SHOW"
  }

  updateData.status = newStatus

  if (notes !== undefined) updateData.notes = notes
  if (providerId !== undefined) updateData.providerId = providerId

  if (date && startTime) {
    updateData.appointmentDate = new Date(`${date}T00:00:00+04:00`)
    updateData.startTime = startTime
    const [h, m] = startTime.split(":").map(Number)
    const endMins = h * 60 + m + (existing.durationMins || 30)
    updateData.endTime = `${String(Math.floor(endMins / 60)).padStart(2, "0")}:${String(endMins % 60).padStart(2, "0")}`
    if (newStatus !== "CANCELLED") newStatus = "RESCHEDULED"
    updateData.status = newStatus
  }

  const updated = await db.aptAppointment.update({
    where: { id },
    data: updateData,
    include: { service: true, provider: true, branch: true },
  })

  if (newStatus !== existing.status || date) {
    await db.aptHistory.create({
      data: {
        tenantId: tenant.tenantId,
        appointmentId: id,
        statusFrom: existing.status,
        statusTo: newStatus,
        notes: notes || `Updated via admin action (${action || "edit"})`,
        changedBy: "ADMIN",
      },
    })
  }

  // Send WhatsApp notification on cancellation or rescheduling
  if (action === "CANCEL") {
    try {
      await sendAptCancellationNotice(existing.customerPhone, existing.reference, existing.service.name)
    } catch (e) {
      console.error("Cancel notice error:", e)
    }
  } else if (date && startTime) {
    try {
      await sendAptRescheduleNotice(existing.customerPhone, existing.reference, existing.service.name, date, startTime)
    } catch (e) {
      console.error("Reschedule notice error:", e)
    }
  }

  return NextResponse.json({ appointment: updated })
})

export const DELETE = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const tenant = currentTenant()
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  await db.aptAppointment.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
