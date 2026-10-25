import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { sendAptCancellationNotice, sendAptRescheduleNotice } from "@/lib/apt-whatsapp"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "PLATFORM", "MANAGER"]

export const GET = withErrors(withModule("APPOINTMENTS", async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
        tenantId: tenant.tenantId,
        OR: [
          { id: appointment.customerId || "" },
          { phone: appointment.customerPhone },
        ],
      },
      select: { id: true, name: true, phone: true, email: true, tags: true },
    })
  }

  return NextResponse.json({ appointment, customerProfile })
}))

export const PUT = withErrors(withModule("APPOINTMENTS", async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (tenant.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only workspace administrators can update appointments" }, { status: 403 })
  }
  const { id } = await params

  const body = await req.json().catch(() => ({}))
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
  if (providerId !== undefined) updateData.providerId = providerId && providerId !== "default" ? providerId : null

  if (date && startTime) {
    const startOfDay = new Date(`${date}T00:00:00+04:00`)
    const endOfDay = new Date(`${date}T23:59:59+04:00`)
    const [h, m] = startTime.split(":").map(Number)
    const newStartMins = (h || 0) * 60 + (m || 0)
    const dur = existing.durationMins || 30
    const newEndMins = newStartMins + dur
    const targetProviderId = providerId !== undefined ? (providerId !== "default" ? providerId : null) : existing.providerId

    // Check collision against active appointments
    const conflicts = await db.aptAppointment.findMany({
      where: {
        tenantId: tenant.tenantId,
        id: { not: id },
        appointmentDate: { gte: startOfDay, lte: endOfDay },
        status: { notIn: ["CANCELLED", "EXPIRED", "NO_SHOW"] },
        ...(targetProviderId ? { providerId: targetProviderId } : {}),
      },
      select: { startTime: true, endTime: true },
    })

    const hasConflict = conflicts.some(c => {
      const [cStartH, cStartM] = c.startTime.split(":").map(Number)
      const [cEndH, cEndM] = (c.endTime || "23:59").split(":").map(Number)
      const cStartMins = (cStartH || 0) * 60 + (cStartM || 0)
      const cEndMins = (cEndH || 0) * 60 + (cEndM || 0)
      return newStartMins < cEndMins && newEndMins > cStartMins
    })

    if (hasConflict) {
      return NextResponse.json({ error: "The new time slot conflicts with an existing booking" }, { status: 409 })
    }

    updateData.appointmentDate = new Date(`${date}T00:00:00+04:00`)
    updateData.startTime = startTime
    updateData.endTime = `${String(Math.floor(newEndMins / 60)).padStart(2, "0")}:${String(newEndMins % 60).padStart(2, "0")}`
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
}))

export const DELETE = withErrors(withModule("APPOINTMENTS", async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (tenant.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only workspace administrators can delete appointments" }, { status: 403 })
  }
  const { id } = await params

  const existing = await db.aptAppointment.findFirst({
    where: { id, tenantId: tenant.tenantId },
  })
  if (!existing) return NextResponse.json({ error: "Appointment not found" }, { status: 404 })

  await db.aptAppointment.delete({ where: { id } })
  return NextResponse.json({ success: true })
}))
