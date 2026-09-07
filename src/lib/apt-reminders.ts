import { db } from "@/lib/db"
import { sendAptReminder } from "@/lib/apt-whatsapp"

/**
 * Scheduled job to find due appointment reminders and send WhatsApp notifications.
 */
export async function processDueReminders() {
  const now = new Date()

  // Find due reminders
  const dueReminders = await db.aptReminder.findMany({
    where: {
      status: "PENDING",
      scheduledFor: { lte: now },
    },
    include: {
      appointment: {
        include: {
          service: true,
          provider: true,
          branch: true,
        },
      },
    },
    take: 50,
  })

  let processedCount = 0

  for (const rem of dueReminders) {
    const apt = rem.appointment
    if (!apt || apt.status === "CANCELLED" || apt.status === "COMPLETED") {
      await db.aptReminder.update({
        where: { id: rem.id },
        data: { status: "FAILED" },
      })
      continue
    }

    try {
      const dateStr = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Muscat",
        dateStyle: "medium",
      }).format(apt.appointmentDate)

      await sendAptReminder({
        phone: apt.customerPhone,
        reference: apt.reference,
        customerName: apt.customerName,
        serviceName: apt.service.name,
        providerName: apt.provider?.name,
        branchName: apt.branch?.name,
        dateStr,
        timeStr: apt.startTime,
        durationMins: apt.durationMins,
        price: apt.totalAmount,
        currency: apt.service.currency,
        meetLink: apt.meetLink,
      }, rem.reminderType)

      await db.aptReminder.update({
        where: { id: rem.id },
        data: { status: "SENT", sentAt: new Date() },
      })

      processedCount++
    } catch (e) {
      console.error(`Failed to send reminder ${rem.id}:`, e)
      await db.aptReminder.update({
        where: { id: rem.id },
        data: { status: "FAILED" },
      })
    }
  }

  // Also clean up expired slot holds
  await db.aptHold.deleteMany({
    where: { expiresAt: { lte: now } },
  })

  // Clean up expired booking sessions
  await db.aptBookingSession.deleteMany({
    where: { expiresAt: { lte: now } },
  })

  return { processedReminders: processedCount }
}
