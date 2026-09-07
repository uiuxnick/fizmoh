import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sendTextMessage } from "@/lib/whatsapp"
import { resolveHospTenantId } from "@/lib/hospital"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"

export const GET = withErrors(withModule("HOSPITAL", async (request: NextRequest) => {
  const tenantId = await resolveHospTenantId(request)
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start.getTime() + 2 * 86400000)

  const chemoBookings = await db.hospChemoBooking.findMany({
    where: {
      tenantId,
      bookingDate: { gte: start, lte: end },
      status: { in: ["CONFIRMED", "HOLD"] },
    },
    include: {
      patient: true,
      doctor: true,
      bed: { include: { ward: true } },
      session: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  const doctorApts = await db.hospDoctorAppointment.findMany({
    where: {
      tenantId,
      appointmentDate: { gte: start, lte: end },
      status: { in: ["CONFIRMED", "REQUESTED"] },
    },
    include: {
      patient: true,
      doctor: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  return NextResponse.json({
    chemoReminders: chemoBookings.map(c => ({
      ...c,
      bookingDate: c.bookingDate.toISOString().split("T")[0],
    })),
    doctorReminders: doctorApts.map(d => ({
      ...d,
      appointmentDate: d.appointmentDate.toISOString().split("T")[0],
    })),
    stats: {
      totalUpcoming: chemoBookings.length + doctorApts.length,
      chemo: chemoBookings.length,
      doctor: doctorApts.length,
    },
  })
}))

export const POST = withErrors(withModule("HOSPITAL", async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !["OWNER", "SUPER_ADMIN", "MANAGER"].includes(tenant.role)) {
    return NextResponse.json({ error: "Only hospital administrators can send reminders" }, { status: 403 })
  }
  const body = await request.json().catch(() => ({}))
  const { type, phone, patientName, date, time, bedNumber, doctorName, meetLink } = body

  if (!phone) {
    return NextResponse.json({ error: "Patient phone number is required" }, { status: 400 })
  }
  const patient = await db.hospPatient.findFirst({ where: { tenantId: tenant.tenantId, mobile: String(phone).trim() }, select: { id: true } })
  if (!patient) return NextResponse.json({ error: "Patient phone is not registered in this workspace" }, { status: 403 })
  const settings = await db.hospSettings.findUnique({ where: { tenantId: tenant.tenantId }, select: { hospitalName: true } })
  const hospitalName = settings?.hospitalName || "Hospital"

  let message = ""
  if (type === "chemo") {
    message = `🏥 *${hospitalName} — CHEMOTHERAPY DAY CARE REMINDER*\n\n` +
      `Dear ${patientName || "Patient"},\n` +
      `This is a reminder for your scheduled Chemotherapy Day Care session at ${hospitalName}:\n\n` +
      `📅 *Date:* ${date}\n` +
      `⏰ *Session Time:* ${time || "Morning (08:00 - 14:00)"}\n` +
      `🛏️ *Reserved Bed:* ${bedNumber || "Assigned on arrival"}\n` +
      `👨‍⚕️ *Supervising Oncologist:* ${doctorName || "Dr. Ahmed Khan"}\n\n` +
      `📋 *Pre-Medication & Checklist:*\n` +
      `1. Take your prescribed pre-medications with a light breakfast.\n` +
      `2. Drink plenty of water (1-2 liters) before arriving.\n` +
      `3. Bring your latest CBC blood test report and ID card.\n` +
      `4. Please arrive 15 minutes before your session.\n\n` +
      `📍 ${hospitalName} Oncology Day Care Reception\n`
  } else {
    message = `🩺 *${hospitalName} — DOCTOR APPOINTMENT REMINDER*\n\n` +
      `Dear ${patientName || "Patient"},\n` +
      `Your upcoming consultation with *${doctorName || "Specialist Oncologist"}* is confirmed:\n\n` +
      `📅 *Date:* ${date}\n` +
      `⏰ *Time:* ${time || "Consultation Slot"}\n` +
      (meetLink ? `🎥 *Google Meet Video Link:* ${meetLink}\n` : `📍 *Location:* ${hospitalName} Outpatient Clinic\n`) +
      `\nIf you need to reschedule, please reply to this message directly.\n` +
      `Please contact the hospital reception if you need help.`
  }

  const result = await sendTextMessage(phone, message)

  return NextResponse.json({
    ok: true,
    sent: result.success,
    message: "WhatsApp reminder sent to patient successfully!",
  })
}))
