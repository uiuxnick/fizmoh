import { db } from "@/lib/db"
import { generateAvailableSlots, holdSlot, releaseHolds } from "@/lib/apt-slots"
import { sendAptConfirmation } from "@/lib/apt-whatsapp"
import { sendInteractiveMessage } from "@/lib/whatsapp"
import { sendWhatsApp } from "@/lib/notifications"
import { localDateKey } from "@/lib/timezone"

export interface AptFlowContext {
  tenantId: string
  customerPhone: string
  conversationId?: string
  customerName?: string
}

const SESSION_TTL_MINS = 30

export async function getBookingSession(tenantId: string, phone: string) {
  return db.aptBookingSession.findUnique({
    where: { tenantId_customerPhone: { tenantId, customerPhone: phone } },
  })
}

export async function setBookingSession(tenantId: string, phone: string, step: string, data: Record<string, any>, conversationId?: string) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MINS * 60 * 1000)
  return db.aptBookingSession.upsert({
    where: { tenantId_customerPhone: { tenantId, customerPhone: phone } },
    create: {
      tenantId,
      customerPhone: phone,
      conversationId,
      step,
      dataJson: JSON.stringify(data),
      expiresAt,
    },
    update: {
      step,
      dataJson: JSON.stringify(data),
      expiresAt,
    },
  })
}

export async function clearBookingSession(tenantId: string, phone: string) {
  await releaseHolds(tenantId, phone)
  return db.aptBookingSession.deleteMany({
    where: { tenantId, customerPhone: phone },
  })
}

/**
 * Handle incoming WhatsApp appointment trigger or interaction.
 *
 * Sequence requested by user:
 * 1. Ask for Patient Name
 * 2. Ask for Patient Email
 * 3. Send Service Picker (interactive list/buttons)
 * 4. Pick Date & Time Slot
 * 5. Confirm Booking Details card
 * 6. User clicks Confirm -> Save to backend DB & dashboard + generate Google Meet link
 * 7. Send message with "💳 Pay Now" and "🏥 Pay at Hospital" buttons
 * 8. Show full confirmation & saved in appointment dashboard
 */
export async function handleAptBookingFlow(ctx: AptFlowContext, input: { text?: string; buttonId?: string }): Promise<boolean> {
  const { tenantId, customerPhone, conversationId } = ctx
  const text = (input.text || "").trim()
  const buttonId = input.buttonId || ""

  // ── VIEW DETAILS ANYTIME ──────────────────────────────────────────────────
  if (
    buttonId.startsWith("apt_view_") ||
    buttonId === "apt_view_details" ||
    ["view details", "my appointment", "my booking", "details", "تفاصيل الحجز"].includes(text.toLowerCase())
  ) {
    let aptRef = buttonId.replace("apt_view_", "")
    let apt: any = null

    if (aptRef && aptRef !== "details") {
      apt = await db.aptAppointment.findFirst({
        where: { reference: aptRef, tenantId },
        include: { service: true, provider: true, branch: true },
      })
    }

    if (!apt) {
      apt = await db.aptAppointment.findFirst({
        where: { customerPhone, tenantId },
        include: { service: true, provider: true, branch: true },
        orderBy: { createdAt: "desc" },
      })
    }

    if (!apt) {
      await sendWhatsApp({
        to: customerPhone,
        body: "ℹ️ No appointment record found for your number. Type *appointment* to book a new appointment!",
      })
      return true
    }

    const dateStr = localDateKey(new Date(apt.appointmentDate))
    const price = apt.totalAmount
    const currency = apt.service?.currency || "OMR"
    const paymentUrl = price > 0 ? `https://app.fizmoh.cloud/api/amwalpay/hosted-checkout?ref=${apt.reference}&amount=${price}` : null

    await sendAptConfirmation({
      phone: customerPhone,
      reference: apt.reference,
      customerName: apt.customerName,
      customerEmail: apt.customerEmail,
      serviceName: apt.service?.name || "Service",
      providerName: apt.provider?.name,
      branchName: apt.branch?.name,
      dateStr,
      timeStr: apt.startTime,
      durationMins: apt.durationMins,
      price,
      currency,
      paymentStatus: apt.paymentStatus,
      paymentUrl,
      meetLink: apt.meetLink,
    })
    return true
  }

  // ── HANDLE PAYMENT CHOICE BUTTON REPLIES ─────────────────────────────────
  if (buttonId.startsWith("apt_pay_hospital_")) {
    const ref = buttonId.replace("apt_pay_hospital_", "")
    const apt = await db.aptAppointment.findFirst({
      where: { reference: ref, tenantId },
      include: { service: true, provider: true },
    })

    if (apt) {
      await db.aptAppointment.update({
        where: { id: apt.id },
        data: { paymentStatus: "PAY_AT_HOSPITAL", paymentMethod: "CASH_AT_CLINIC" },
      })
      await db.aptHistory.create({
        data: {
          tenantId,
          appointmentId: apt.id,
          statusTo: apt.status,
          notes: "Customer selected Pay at Hospital option",
          changedBy: "CUSTOMER",
        },
      })

      const dateStr = localDateKey(new Date(apt.appointmentDate))
      await sendWhatsApp({
        to: customerPhone,
        body:
          `🏥 *Payment Option Confirmed: Pay at Hospital*\n\n` +
          `Your appointment *#${apt.reference}* for *${apt.service?.name}* on *${dateStr} at ${apt.startTime}* is confirmed.\n` +
          `Please present yourself at the clinic reception upon arrival to complete payment (${apt.totalAmount} ${apt.service?.currency || "OMR"}).\n\n` +
          (apt.meetLink ? `🎥 *Google Meet Link:* ${apt.meetLink}\n\n` : "") +
          `Thank you for booking with us!`,
      })
    }
    return true
  }

  if (buttonId.startsWith("apt_pay_online_")) {
    const ref = buttonId.replace("apt_pay_online_", "")
    const apt = await db.aptAppointment.findFirst({
      where: { reference: ref, tenantId },
      include: { service: true },
    })

    if (apt) {
      const payUrl = `https://app.fizmoh.cloud/api/amwalpay/hosted-checkout?ref=${apt.reference}&amount=${apt.totalAmount}`
      const { sendCtaUrlMessage } = await import("@/lib/whatsapp")
      await sendCtaUrlMessage({
        to: customerPhone,
        body:
          `💳 *AmwalPay Online Payment Gateway*\n\n` +
          `Ref: *#${apt.reference}*\n` +
          `Amount: *${apt.totalAmount} ${apt.service?.currency || "OMR"}*\n\n` +
          `Tap the button below to pay securely via AmwalPay inside WhatsApp:`,
        buttonText: "Pay Online Now",
        url: payUrl,
      })
    }
    return true
  }

  let session = await getBookingSession(tenantId, customerPhone)
  let sessionData: Record<string, any> = {}

  if (session && session.expiresAt > new Date()) {
    try {
      sessionData = JSON.parse(session.dataJson || "{}")
    } catch {
      sessionData = {}
    }
  } else {
    session = null
  }

  // Check trigger words if no active session
  const lowerText = text.toLowerCase()
  const isAptTrigger = ["start_apt", "appointment", "doctor", "consultation", "session", "clinic", "salon", "service", "book appointment", "حجز موعد", "موعد"].some(w => lowerText.includes(w))

  if (!session && !isAptTrigger && !buttonId.startsWith("apt_")) {
    return false
  }

  // ── STEP 1: PROMPT FOR PATIENT NAME FIRST ─────────────────────────────────
  if (!session || buttonId === "apt_reset" || (isAptTrigger && !buttonId)) {
    await setBookingSession(tenantId, customerPhone, "PATIENT_NAME", {}, conversationId)
    await sendWhatsApp({
      to: customerPhone,
      body: `👤 *Book an Appointment*\n\nPlease reply with the **Patient's Full Name**:`,
    })
    return true
  }

  // ── STEP 2: PATIENT NAME RECEIVED -> PROMPT FOR EMAIL ─────────────────────
  if (session.step === "PATIENT_NAME") {
    const patientName = text || ctx.customerName || "Patient"
    sessionData.patientName = patientName

    await setBookingSession(tenantId, customerPhone, "PATIENT_EMAIL", sessionData, conversationId)

    await sendWhatsApp({
      to: customerPhone,
      body: `📧 Thank you, *${patientName}*!\n\nPlease reply with the **Patient's Email Address** (or send *skip*):`,
    })
    return true
  }

  // ── STEP 3: PATIENT EMAIL RECEIVED -> SHOW SERVICE PICKER ──────────────────
  if (session.step === "PATIENT_EMAIL") {
    const patientEmail = (text && text.toLowerCase() !== "skip" && text.includes("@")) ? text.trim() : null
    sessionData.patientEmail = patientEmail

    const services = await db.aptService.findMany({
      where: { tenantId, status: "ACTIVE", isBookingEnabled: true, isWhatsappEnabled: true },
      take: 10,
    })

    if (services.length === 0) {
      await sendWhatsApp({ to: customerPhone, body: "Sorry, no appointment services are currently available for online booking." })
      return true
    }

    await setBookingSession(tenantId, customerPhone, "SERVICE", sessionData, conversationId)

    if (services.length <= 3) {
      const buttons = services.map(s => ({
        id: `apt_svc_${s.id}`,
        title: s.name.length > 20 ? s.name.slice(0, 17) + "..." : s.name,
      }))
      await sendInteractiveMessage({
        to: customerPhone,
        body: `💆 *Select Service / Therapy*\n\nHi *${sessionData.patientName}*, please select a service:`,
        buttons,
      })
    } else {
      const rows = services.map(s => ({
        id: `apt_svc_${s.id}`,
        title: s.name.length > 24 ? s.name.slice(0, 21) + "..." : s.name,
        description: `${s.durationMins}m · ${s.price > 0 ? `${s.price} ${s.currency}` : "Free"}`,
      }))
      const list = {
        title: "Select Service",
        sections: [{ title: "Available Services", rows }],
      }
      await sendInteractiveMessage({
        to: customerPhone,
        body: `💆 *Select Service / Therapy*\n\nHi *${sessionData.patientName}*, please select a service:`,
        list,
      })
    }
    return true
  }

  // ── STEP 4: SERVICE SELECTED -> CHECK PROVIDER OR GO TO DATE ──────────────
  if (buttonId.startsWith("apt_svc_")) {
    const serviceId = buttonId.replace("apt_svc_", "")
    const service = await db.aptService.findFirst({ where: { id: serviceId, tenantId } })

    if (!service) {
      await sendWhatsApp({ to: customerPhone, body: "Service not found. Please try again." })
      return true
    }

    sessionData.serviceId = service.id
    sessionData.serviceName = service.name
    sessionData.durationMins = service.durationMins
    sessionData.price = service.price
    sessionData.currency = service.currency

    // Check if service has multiple providers
    const providers = await db.aptProvider.findMany({
      where: { tenantId, status: "ACTIVE", providerServices: { some: { serviceId: service.id } } },
      take: 10,
    })

    if (providers.length > 1) {
      await setBookingSession(tenantId, customerPhone, "PROVIDER", sessionData, conversationId)
      const buttons = providers.slice(0, 3).map(p => ({
        id: `apt_prv_${p.id}`,
        title: p.name.length > 20 ? p.name.slice(0, 17) + "..." : p.name,
      }))
      await sendInteractiveMessage({
        to: customerPhone,
        body: `👨‍⚕️ Select a provider for *${service.name}*:`,
        buttons,
      })
      return true
    } else if (providers.length === 1) {
      sessionData.providerId = providers[0].id
      sessionData.providerName = providers[0].name
    }

    // Move to Date selection
    await setBookingSession(tenantId, customerPhone, "DATE", sessionData, conversationId)

    const todayStr = localDateKey(new Date())
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = localDateKey(tomorrow)

    const dateButtons = [
      { id: `apt_dt_${todayStr}`, title: "Today" },
      { id: `apt_dt_${tomorrowStr}`, title: "Tomorrow" },
    ]

    await sendInteractiveMessage({
      to: customerPhone,
      body: `📅 Service: *${service.name}*\n\nPlease select a date for your appointment (or reply YYYY-MM-DD):`,
      buttons: dateButtons,
    })
    return true
  }

  // Handle Provider Selection
  if (buttonId.startsWith("apt_prv_")) {
    const prvId = buttonId.replace("apt_prv_", "")
    if (prvId !== "any") {
      const provider = await db.aptProvider.findFirst({ where: { id: prvId, tenantId } })
      if (provider) {
        sessionData.providerId = provider.id
        sessionData.providerName = provider.name
      }
    }

    await setBookingSession(tenantId, customerPhone, "DATE", sessionData, conversationId)
    const todayStr = localDateKey(new Date())
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = localDateKey(tomorrow)

    const dateButtons = [
      { id: `apt_dt_${todayStr}`, title: "Today" },
      { id: `apt_dt_${tomorrowStr}`, title: "Tomorrow" },
    ]

    await sendInteractiveMessage({
      to: customerPhone,
      body: `📅 Selected: *${sessionData.serviceName}* ${sessionData.providerName ? `with *${sessionData.providerName}*` : ""}\n\nPlease select a date:`,
      buttons: dateButtons,
    })
    return true
  }

  // ── STEP 5: DATE SELECTION ──────────────────────────────────────────────────
  if (session.step === "DATE" || buttonId.startsWith("apt_dt_")) {
    let dateSelected = ""
    if (buttonId.startsWith("apt_dt_")) {
      dateSelected = buttonId.replace("apt_dt_", "")
    } else if (text && /^\d{4}-\d{2}-\d{2}$/.test(text.trim())) {
      dateSelected = text.trim()
    }

    if (!dateSelected) {
      await sendWhatsApp({ to: customerPhone, body: "Please select a valid date (e.g. tap *Today*, *Tomorrow*, or send *2026-08-18*)." })
      return true
    }

    sessionData.date = dateSelected

    // Generate available slots for date
    const slots = await generateAvailableSlots({
      tenantId,
      serviceId: sessionData.serviceId,
      date: dateSelected,
      providerId: sessionData.providerId,
    })

    const availableSlots = slots.filter(s => s.available)

    if (availableSlots.length === 0) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = localDateKey(tomorrow)

      await sendInteractiveMessage({
        to: customerPhone,
        body: `Sorry, no available slots remaining for *${dateSelected}* (past working hours or fully booked).\n\nPlease select another date:`,
        buttons: [
          { id: `apt_dt_${tomorrowStr}`, title: "Tomorrow" },
          { id: "apt_reset", title: "🔄 Start Over" },
        ],
      })
      return true
    }

    await setBookingSession(tenantId, customerPhone, "TIME", sessionData, conversationId)

    // Send slots as interactive list or buttons
    if (availableSlots.length <= 3) {
      const slotButtons = availableSlots.map(s => ({
        id: `apt_tm_${s.time}`,
        title: s.time,
      }))
      await sendInteractiveMessage({
        to: customerPhone,
        body: `⏰ Available times on *${dateSelected}* for *${sessionData.serviceName}*:`,
        buttons: slotButtons,
      })
    } else {
      const rows = availableSlots.slice(0, 10).map(s => ({
        id: `apt_tm_${s.time}`,
        title: s.time,
        description: `Duration: ${sessionData.durationMins} mins`,
      }))
      const list = {
        title: "Choose Time",
        sections: [{ title: "Select Time Slot", rows }],
      }
      await sendInteractiveMessage({
        to: customerPhone,
        body: `⏰ Available times on *${dateSelected}* for *${sessionData.serviceName}*:`,
        list,
      })
    }
    return true
  }

  // ── STEP 6: TIME SLOT SELECTION -> MOVE TO CONFIRM ───────────────────────
  if (session.step === "TIME" || buttonId.startsWith("apt_tm_")) {
    let timeSelected = ""
    if (buttonId.startsWith("apt_tm_")) {
      timeSelected = buttonId.replace("apt_tm_", "")
    } else if (text && /^\d{1,2}:\d{2}$/.test(text.trim())) {
      timeSelected = text.trim().padStart(5, "0")
    }

    if (!timeSelected) {
      await sendWhatsApp({ to: customerPhone, body: "Please select a valid time slot from the options." })
      return true
    }

    sessionData.startTime = timeSelected

    // Calculate endTime
    const [h, m] = timeSelected.split(":").map(Number)
    const endMins = h * 60 + m + (sessionData.durationMins || 30)
    const endH = Math.floor(endMins / 60)
    const endM = endMins % 60
    sessionData.endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`

    // Hold slot
    await holdSlot(
      tenantId,
      sessionData.serviceId,
      sessionData.date,
      sessionData.startTime,
      sessionData.endTime,
      customerPhone,
      sessionData.providerId
    )

    await setBookingSession(tenantId, customerPhone, "CONFIRM", sessionData, conversationId)

    // Show Confirmation Card
    const priceText = sessionData.price > 0 ? `${sessionData.price} ${sessionData.currency}` : "Free"
    const summary =
      `📋 *Confirm Your Booking Details*\n\n` +
      `👤 *Patient Name:* ${sessionData.patientName || "Patient"}\n` +
      (sessionData.patientEmail ? `📧 *Email:* ${sessionData.patientEmail}\n` : "") +
      `💆 *Service Name:* ${sessionData.serviceName}\n` +
      (sessionData.providerName ? `👨‍⚕️ *Provider:* ${sessionData.providerName}\n` : "") +
      `📅 *Date:* ${sessionData.date}\n` +
      `⏰ *Time:* ${sessionData.startTime} - ${sessionData.endTime}\n` +
      `💰 *Fee:* ${priceText}\n\n` +
      `Your slot is held for 10 minutes. Tap *Confirm Booking* below!`

    const buttons = [
      { id: "apt_do_confirm", title: "✅ Confirm Booking" },
      { id: "apt_reset", title: "❌ Start Over" },
    ]

    await sendInteractiveMessage({
      to: customerPhone,
      body: summary,
      buttons,
    })
    return true
  }

  // ── STEP 7: USER CLICKS CONFIRM BOOKING -> SAVE DB & SEND PAYMENT BUTTONS ──
  if (buttonId === "apt_do_confirm" && session.step === "CONFIRM") {
    const refNum = Math.floor(100000 + Math.random() * 900000)
    const reference = `APT-${new Date().getFullYear()}-${refNum}`

    const patientName = sessionData.patientName || ctx.customerName || "Patient"
    const patientEmail = sessionData.patientEmail || null

    // Link or create customer
    let existingCustomer = await db.customer.findFirst({
      where: { phone: customerPhone },
    })

    if (!existingCustomer) {
      existingCustomer = await db.customer.create({
        data: {
          tenantId,
          phone: customerPhone,
          name: patientName,
          email: patientEmail,
        },
      })
    }

    const aptDate = new Date(`${sessionData.date}T00:00:00+04:00`)
    const price = sessionData.price || 0
    const meetLink = `https://meet.google.com/apt-${reference.toLowerCase().replace(/[^a-z0-9]/g, "")}`

    // Create Appointment record in database
    const appointment = await db.aptAppointment.create({
      data: {
        tenantId,
        reference,
        customerId: existingCustomer?.id,
        customerName: patientName,
        customerPhone,
        customerEmail: patientEmail || existingCustomer?.email,
        serviceId: sessionData.serviceId,
        providerId: sessionData.providerId,
        appointmentDate: aptDate,
        startTime: sessionData.startTime,
        endTime: sessionData.endTime,
        durationMins: sessionData.durationMins || 30,
        status: "CONFIRMED",
        paymentStatus: price > 0 ? "PENDING" : "NOT_REQUIRED",
        totalAmount: price,
        bookingSource: "WHATSAPP",
        conversationId,
        meetLink,
      },
    })

    // Create History entry
    await db.aptHistory.create({
      data: {
        tenantId,
        appointmentId: appointment.id,
        statusFrom: null,
        statusTo: "CONFIRMED",
        notes: "Created via WhatsApp interactive booking flow with patient details",
        changedBy: "CUSTOMER",
      },
    })

    // Clear session & slot holds
    await clearBookingSession(tenantId, customerPhone)

    // Send confirmation message with Pay Now and Pay at Hospital buttons
    const priceText = price > 0 ? `${price} ${sessionData.currency || "OMR"}` : "Free"
    const confirmBody =
      `🎉 *Appointment Saved & Confirmed!*\n\n` +
      `📌 *Reference:* #${reference}\n` +
      `👤 *Patient Name:* ${patientName}\n` +
      (patientEmail ? `📧 *Email:* ${patientEmail}\n` : "") +
      `💆 *Service Name:* ${sessionData.serviceName}\n` +
      (sessionData.providerName ? `👨‍⚕️ *Provider:* ${sessionData.providerName}\n` : "") +
      `📅 *Date:* ${sessionData.date}\n` +
      `⏰ *Time:* ${sessionData.startTime} - ${sessionData.endTime}\n` +
      `💰 *Fee:* ${priceText}\n` +
      `🎥 *Google Meet Link:* ${meetLink}\n\n` +
      `Please select your payment method below:`

    const buttons = price > 0
      ? [
          { id: `apt_pay_online_${reference}`, title: "💳 Pay Now" },
          { id: `apt_pay_hospital_${reference}`, title: "🏥 Pay at Hospital" },
          { id: `apt_view_${reference}`, title: "📋 View Details" },
        ]
      : [
          { id: `apt_view_${reference}`, title: "📋 View Details" },
        ]

    await sendInteractiveMessage({
      to: customerPhone,
      body: confirmBody,
      buttons,
      headerText: "Booking Details",
    })

    return true
  }

  return false
}
