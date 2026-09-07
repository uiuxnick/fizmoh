import { db } from "@/lib/db"
import { getConfigValue } from "@/lib/app-config"
import { Prisma } from "@prisma/client"
import { sendInteractiveMessage } from "@/lib/whatsapp"
import { sendWhatsApp } from "@/lib/notifications"
import { format, addDays, startOfDay, endOfDay } from "date-fns"
import { randomUUID } from "crypto"

export interface HospFlowContext {
  tenantId: string
  customerPhone: string
  conversationId?: string
  customerName?: string
}

/*
 * Where a patient has got to, stored on the conversation.
 *
 * This was a Map in process memory. Two things followed from that, both seen
 * in production: every deploy dropped patients mid-registration, and with more
 * than one app process a reply could reach a process that had never heard of
 * them. Neither failure is visible — the flow simply stops answering and the
 * message falls through to whichever handler picks it up next, which is how a
 * patient entering their name was offered SEO consultancy.
 *
 * Now a column beside bookingState, flowState and visaState, so it behaves the
 * same way they do and survives a restart. Reads are scoped by the client, so
 * one tenant cannot see another's patient part-way through a booking.
 */

export interface HospitalState {
  step: string
  data: Record<string, any>
  expiresAt: number
}

/** Thirty minutes, unchanged: a booking left this long is abandoned. */
const STATE_TTL_MS = 30 * 60 * 1000

async function conversationFor(phone: string, tenantId?: string) {
  return db.conversation.findFirst({
    where: { customerPhone: phone, ...(tenantId ? { tenantId } : {}) },
    orderBy: { lastMessageAt: "desc" },
    select: { id: true, hospitalState: true },
  })
}

export async function getHospitalState(phone: string, tenantId?: string): Promise<HospitalState | null> {
  const convo = await conversationFor(phone, tenantId)
  const raw = convo?.hospitalState
  if (!raw) return null
  try {
    const parsed = (typeof raw === "string" ? JSON.parse(raw) : raw) as HospitalState
    if (!parsed?.step || typeof parsed.expiresAt !== "number") return null
    if (parsed.expiresAt < Date.now()) {
      // Expired state is cleared on the way past rather than left to be read
      // again by every later message.
      await db.conversation.update({ where: { id: convo!.id }, data: { hospitalState: Prisma.DbNull } }).catch(() => {})
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export async function setHospitalState(
  phone: string,
  step: string,
  data: Record<string, any>,
  tenantId?: string,
): Promise<void> {
  const convo = await conversationFor(phone, tenantId)
  if (!convo) return
  await db.conversation.update({
    where: { id: convo.id },
    data: { hospitalState: { step, data, expiresAt: Date.now() + STATE_TTL_MS } },
  }).catch(() => {})
}

export async function clearHospitalState(phone: string, tenantId?: string): Promise<void> {
  const convo = await conversationFor(phone, tenantId)
  if (!convo) return
  await db.conversation.update({ where: { id: convo.id }, data: { hospitalState: Prisma.DbNull } }).catch(() => {})
}

/**
 * Handle incoming WhatsApp message for Kauvery Hospital Booking
 */
export async function handleHospitalBookingFlow(
  ctx: HospFlowContext,
  input: { text?: string; buttonId?: string }
): Promise<boolean> {
  const { tenantId, customerPhone, conversationId } = ctx
  const text = (input.text || "").trim()
  const buttonId = input.buttonId || ""
  const lower = text.toLowerCase()

  const state = await getHospitalState(customerPhone, tenantId)

  // ── TRIGGER / START FLOW ──────────────────────────────────────────────────
  const isTrigger =
    buttonId === "hosp_start" ||
    buttonId === "hosp_btn_home" ||
    ["hospital", "kauvery", "chemo", "chemotherapy", "day care", "daycare", "bed booking", "حجز سرير", "كيماوي", "مستشفى"].some(k => lower.includes(k))

  if (isTrigger && !state) {
    await clearHospitalState(customerPhone, tenantId)
    await setHospitalState(customerPhone, "HOME", {}, tenantId)
    const settings = await db.hospSettings.findUnique({ where: { tenantId } })
    const hospitalName = settings?.hospitalName || "Hospital"

    await sendInteractiveMessage({
      to: customerPhone,
      headerText: `🏥 ${hospitalName}`,
      body:
        `👋 *Welcome to ${hospitalName}*\n\n` +
        "Hi! How can we help you today?\n" +
        "Please choose an option below 👇",
      list: {
        title: "Open Hospital Menu",
        sections: [{ title: "Patient Services", rows: [
          { id: "hosp_btn_apt", title: "Doctor Appointment", description: "Book a consultation" },
          { id: "hosp_btn_chemo", title: "Chemotherapy Day Care", description: "Book a day-care bed" },
          { id: "hosp_btn_my_bookings", title: "My Bookings", description: "View active bookings" },
          { id: "hosp_btn_reschedule", title: "Reschedule / Cancel", description: "Manage an existing booking" },
          { id: "hosp_btn_contact", title: "Contact Hospital", description: "Get support from our team" },
        ] }],
      },
      footerText: `${hospitalName} · Live availability`,
    })
    return true
  }

  // ── FLOW SELECTION FROM HOME ──────────────────────────────────────────────
  if ((buttonId === "hosp_btn_chemo" || buttonId === "hosp_btn_apt") && state?.step !== "FULLY_BOOKED") {
    const flowType = buttonId === "hosp_btn_chemo" ? "CHEMO" : "APT"
    await setHospitalState(customerPhone, "PATIENT_TYPE", { flowType }, tenantId)

    await sendInteractiveMessage({
      to: customerPhone,
      body:
        "👤 *Patient Identification*\n\n" +
        "Are you an existing patient at Kauvery Hospital?\n\n" +
        "Please choose an option:",
      buttons: [
        { id: "hosp_pt_yes", title: "1️⃣ Yes, existing" },
        { id: "hosp_pt_no", title: "2️⃣ No, new patient" },
      ],
    })
    return true
  }

  // ── MY BOOKINGS ───────────────────────────────────────────────────────────
  if (buttonId === "hosp_btn_my_bookings" || buttonId === "hosp_btn_reschedule" || lower === "my bookings") {
    await setHospitalState(customerPhone, "BOOKING_LIST", {}, tenantId)
    const chemo = await db.hospChemoBooking.findMany({
      where: {
        tenantId,
        patient: { mobile: { contains: customerPhone.replace("+", "").slice(-8) } },
        status: { notIn: ["CANCELLED"] },
      },
      include: { doctor: true, bed: { include: { ward: true } }, session: true, patient: true },
      orderBy: { bookingDate: "desc" },
      take: 3,
    })

    const apts = await db.hospDoctorAppointment.findMany({
      where: {
        tenantId,
        patient: { mobile: { contains: customerPhone.replace("+", "").slice(-8) } },
        status: { notIn: ["CANCELLED"] },
      },
      include: { doctor: { include: { department: true } }, patient: true },
      orderBy: { appointmentDate: "desc" },
      take: 3,
    })

    if (chemo.length === 0 && apts.length === 0) {
      await sendInteractiveMessage({
        to: customerPhone,
        body: "ℹ️ No active bookings found for your number.\nWould you like to make a new booking?",
        buttons: [
          { id: "hosp_btn_apt", title: "🩺 Doctor Appointment" },
          { id: "hosp_btn_chemo", title: "💊 Chemotherapy" },
        ],
      })
      return true
    }

    let msg = "📋 *Your Upcoming Bookings:*\n\n"
    const rows: any[] = []
    chemo.forEach((b, i) => {
      msg += `*${i + 1}. Chemotherapy Day Care*\n`
      msg += `📅 ${format(new Date(b.bookingDate), "d MMM yyyy")}\n`
      msg += `🏥 ${b.bed.ward.name} · Bed *${b.bed.bedNumber}*\n`
      msg += `👨‍⚕️ ${b.doctor.name}\n`
      msg += `🆔 ID: ${b.bookingRef}\n`
      msg += `Status: ✅ *${b.status}*\n\n`
      rows.push({ id: `hosp_manage_chemo_${b.id}`, title: `Chemo · ${format(new Date(b.bookingDate), "d MMM")}`, description: `${b.bed.ward.name} · ${b.bed.bedNumber}` })
    })

    apts.forEach((a, i) => {
      msg += `*${chemo.length + i + 1}. Doctor Appointment*\n`
      msg += `📅 ${format(new Date(a.appointmentDate), "d MMM yyyy")} at ${a.appointmentTime}\n`
      msg += `👨‍⚕️ ${a.doctor.name} (${a.doctor.department?.name || "Consultation"})\n`
      msg += `🆔 ID: ${a.appointmentRef}\n`
      msg += `Status: ✅ *${a.status}*\n\n`
      rows.push({ id: `hosp_manage_apt_${a.id}`, title: `Appointment · ${format(new Date(a.appointmentDate), "d MMM")}`, description: `${a.doctor.name} · ${a.appointmentTime}` })
    })

    await sendInteractiveMessage({
      to: customerPhone,
      body: msg,
      list: { title: "Manage Booking", sections: [{ title: "Select a booking", rows: rows.slice(0, 10) }] },
    })
    return true
  }

  // ── BOOKING MANAGEMENT ───────────────────────────────────────────────────
  if (buttonId.startsWith("hosp_manage_chemo_") || buttonId.startsWith("hosp_manage_apt_")) {
    const type = buttonId.startsWith("hosp_manage_chemo_") ? "CHEMO" : "APT"
    const id = buttonId.replace(type === "CHEMO" ? "hosp_manage_chemo_" : "hosp_manage_apt_", "")
    if (type === "CHEMO") {
      const booking = await db.hospChemoBooking.findFirst({ where: { id, tenantId, patient: { mobile: { contains: customerPhone.replace("+", "").slice(-8) } } }, include: { patient: true, doctor: true, bed: { include: { ward: true } }, session: true } })
      if (!booking) { await sendWhatsApp({ to: customerPhone, body: "Booking not found or it does not belong to this number." }); return true }
      await setHospitalState(customerPhone, "BOOKING_DETAIL", { bookingType: type, bookingId: id }, tenantId)
      await sendInteractiveMessage({ to: customerPhone, body: `📋 *Chemotherapy Booking*\n\n🆔 ${booking.bookingRef}\n👤 ${booking.patient.fullName} (${booking.patient.mrn})\n👨‍⚕️ ${booking.doctor.name}\n📅 ${format(new Date(booking.bookingDate), "d MMM yyyy")}\n🏥 ${booking.bed.ward.name} · ${booking.bed.bedNumber}\n⏰ ${booking.session ? `${booking.session.name} · ${booking.session.startTime}-${booking.session.endTime}` : "Day care"}\n\nStatus: *${booking.status}*`, buttons: [
        { id: `hosp_cancel_${type}_${id}`, title: "❌ Cancel Booking" },
        { id: `hosp_reschedule_${type}_${id}`, title: "🔄 Reschedule" },
        { id: "hosp_btn_home", title: "🏠 Main Menu" },
      ] })
      return true
    }
    const appointment = await db.hospDoctorAppointment.findFirst({ where: { id, tenantId, patient: { mobile: { contains: customerPhone.replace("+", "").slice(-8) } } }, include: { patient: true, doctor: { include: { department: true } } } })
    if (!appointment) { await sendWhatsApp({ to: customerPhone, body: "Booking not found or it does not belong to this number." }); return true }
    await setHospitalState(customerPhone, "BOOKING_DETAIL", { bookingType: type, bookingId: id }, tenantId)
    await sendInteractiveMessage({ to: customerPhone, body: `📋 *Doctor Appointment*\n\n🆔 ${appointment.appointmentRef}\n👤 ${appointment.patient.fullName} (${appointment.patient.mrn})\n👨‍⚕️ ${appointment.doctor.name}\n🏥 ${appointment.doctor.department?.name || "Consultation"}\n📅 ${format(new Date(appointment.appointmentDate), "d MMM yyyy")} at ${appointment.appointmentTime}\n\nStatus: *${appointment.status}*`, buttons: [
      { id: `hosp_cancel_${type}_${id}`, title: "❌ Cancel Booking" },
      { id: `hosp_reschedule_${type}_${id}`, title: "🔄 Reschedule" },
      { id: "hosp_btn_home", title: "🏠 Main Menu" },
    ] })
    return true
  }

  if (buttonId.startsWith("hosp_cancel_") && !buttonId.endsWith("_yes")) {
    const [, , type, id] = buttonId.split("_")
    await setHospitalState(customerPhone, "CANCEL_CONFIRM", { bookingType: type, bookingId: id }, tenantId)
    await sendInteractiveMessage({ to: customerPhone, body: "⚠️ *Cancel this booking?*\n\nThis action will release the reserved appointment or bed.", buttons: [
      { id: "hosp_cancel_yes", title: "✅ Yes, cancel" },
      { id: "hosp_cancel_no", title: "↩️ Keep booking" },
    ] })
    return true
  }

  if (state?.step === "CANCEL_CONFIRM") {
    if (buttonId === "hosp_cancel_no") { await clearHospitalState(customerPhone, tenantId); return await showHospitalHome(ctx) }
    if (buttonId === "hosp_cancel_yes") {
      const where = { id: state.data.bookingId, tenantId, patient: { mobile: { contains: customerPhone.replace("+", "").slice(-8) } } }
      if (state.data.bookingType === "CHEMO") await db.hospChemoBooking.updateMany({ where, data: { status: "CANCELLED" } })
      else await db.hospDoctorAppointment.updateMany({ where, data: { status: "CANCELLED" } })
      await clearHospitalState(customerPhone, tenantId)
      await sendWhatsApp({ to: customerPhone, body: "✅ Your booking was cancelled successfully and the inventory has been released." })
      return true
    }
  }

  if (buttonId.startsWith("hosp_reschedule_")) {
    const [, , type, id] = buttonId.split("_")
    if (type === "CHEMO") {
      const booking = await db.hospChemoBooking.findFirst({ where: { id, tenantId, patient: { mobile: { contains: customerPhone.replace("+", "").slice(-8) } } }, include: { patient: true, doctor: true, bed: { include: { ward: true } } } })
      if (!booking) { await sendWhatsApp({ to: customerPhone, body: "Booking not found." }); return true }
      const data = { patientId: booking.patientId, patientName: booking.patient.fullName, patientMrn: booking.patient.mrn, patientMobile: booking.patient.mobile, flowType: "CHEMO", doctorId: booking.doctorId, doctorName: booking.doctor.name, rescheduleBookingId: booking.id }
      await setHospitalState(customerPhone, "SELECT_CHEMO_DATE", data, tenantId)
      return await showChemoDateList(ctx, data)
    }
    const appointment = await db.hospDoctorAppointment.findFirst({ where: { id, tenantId, patient: { mobile: { contains: customerPhone.replace("+", "").slice(-8) } } }, include: { patient: true, doctor: { include: { department: true } } } })
    if (!appointment) { await sendWhatsApp({ to: customerPhone, body: "Booking not found." }); return true }
    const data = { patientId: appointment.patientId, patientName: appointment.patient.fullName, patientMrn: appointment.patient.mrn, patientMobile: appointment.patient.mobile, flowType: "APT", doctorId: appointment.doctorId, doctorName: appointment.doctor.name, deptName: appointment.doctor.department?.name, rescheduleBookingId: appointment.id }
    await setHospitalState(customerPhone, "SELECT_APT_DATE", data, tenantId)
    await sendWhatsApp({ to: customerPhone, body: "🔄 Your current appointment will stay protected until the new slot is confirmed." })
    const dateRows: any[] = []
    for (let i = 0; i < 5; i++) {
      const d = addDays(new Date(), i)
      const slots = await getDoctorAvailableSlots(tenantId, appointment.doctorId, d)
      if (slots.length) dateRows.push({ id: `hosp_adate_${format(d, "yyyy-MM-dd")}`, title: i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(d, "EEE, d MMM"), description: `${slots.length} slots available` })
    }
    await sendInteractiveMessage({ to: customerPhone, body: `📅 Choose a new time for *${appointment.doctor.name}*`, list: { title: "New Appointment Date", sections: [{ title: "Available Dates", rows: dateRows }] } })
    return true
  }

  // ── CONTACT HOSPITAL ──────────────────────────────────────────────────────
  if (buttonId === "hosp_btn_contact" || lower === "contact hospital") {
    /*
     * The hospital's own details, not the first one we onboarded.
     *
     * This card named a specific hospital, its hotline, its oncology email
     * address and the floor its day-care wing is on — and showed all of it to
     * the patients of every other hospital using this platform. Each line is
     * printed only if that workspace has set it; the hours line is gone
     * entirely, because there is no setting it could come from and inventing
     * a hospital's opening times for it is worse than saying nothing.
     */
    const [hospName, hospPhone, hospEmail, hospAddress] = await Promise.all([
      getConfigValue("business_name"),
      getConfigValue("business_phone"),
      getConfigValue("business_email"),
      getConfigValue("business_address"),
    ])
    await sendWhatsApp({
      to: customerPhone,
      body: [
        `🏥 *${hospName.trim() || "Help & Support"}*`,
        "",
        ...(hospPhone.trim() ? [`📞 ${hospPhone.trim()}`] : []),
        ...(hospEmail.trim() ? [`📧 ${hospEmail.trim()}`] : []),
        ...(hospAddress.trim() ? [`📍 ${hospAddress.trim()}`] : []),
        "",
        "Type *hospital* anytime to return to the main menu.",
      ].join("\n"),
    })
    return true
  }

  // ── PATIENT TYPE ANSWER ───────────────────────────────────────────────────
  if (state?.step === "PATIENT_TYPE") {
    if (buttonId === "hosp_pt_yes" || lower.includes("yes") || lower.includes("exist")) {
      await setHospitalState(customerPhone, "ASK_MRN_OR_PHONE", { ...state.data }, tenantId)
      await sendWhatsApp({
        to: customerPhone,
        body:
          "Please enter your *Mobile Number* or *MRN / Patient ID* (e.g. *MRN10458*):",
      })
      return true
    } else if (buttonId === "hosp_pt_no" || lower.includes("no") || lower.includes("new")) {
      await setHospitalState(customerPhone, "NEW_PATIENT_NAME", { ...state.data }, tenantId)
      await sendWhatsApp({
        to: customerPhone,
        body: "Please enter your *Full Name* to register as a new patient:",
      })
      return true
    }
  }

  // ── ASK MRN OR PHONE ──────────────────────────────────────────────────────
  if (state?.step === "ASK_MRN_OR_PHONE" && text) {
    const inputVal = text.trim()
    const patient = await db.hospPatient.findFirst({
      where: {
        tenantId,
        OR: [
          { mrn: { equals: inputVal, mode: "insensitive" } },
          { mobile: { contains: inputVal.replace("+", "").slice(-8) } },
        ],
      },
    })

    if (patient) {
      await setHospitalState(customerPhone, "CONFIRM_PATIENT", { ...state.data, patientId: patient.id, patientName: patient.fullName, patientMrn: patient.mrn, patientMobile: patient.mobile }, tenantId)
      await sendInteractiveMessage({
        to: customerPhone,
        body:
          "We found the following patient details. Please confirm 👇\n\n" +
          `👤 *Name:* ${patient.fullName}\n` +
          `🆔 *MRN:* ${patient.mrn}\n` +
          `📞 *Mobile:* ${patient.mobile}\n`,
        buttons: [
          { id: "hosp_pt_confirm", title: "✅ Confirm" },
          { id: "hosp_pt_retry", title: "❌ Not Me" },
        ],
      })
      return true
    } else {
      await sendInteractiveMessage({
        to: customerPhone,
        body:
          `❌ We couldn't find a record for *${inputVal}*.\n\n` +
          "Would you like to try again or register as a new patient?",
        buttons: [
          { id: "hosp_pt_yes", title: "🔄 Try Again" },
          { id: "hosp_pt_no", title: "🆕 New Patient" },
        ],
      })
      return true
    }
  }

  // ── NEW PATIENT NAME ──────────────────────────────────────────────────────
  if (state?.step === "NEW_PATIENT_NAME" && text) {
    const fullName = text.trim()
    await setHospitalState(customerPhone, "NEW_PATIENT_MOBILE", { ...state.data, newFullName: fullName }, tenantId)
    await sendWhatsApp({ to: customerPhone, body: "Please enter your *Mobile Number* (including country code):" })
    return true
  }

  if (state?.step === "NEW_PATIENT_MOBILE" && text) {
    const mobile = text.replace(/[^\d+]/g, "")
    if (mobile.replace(/\D/g, "").length < 8) {
      await sendWhatsApp({ to: customerPhone, body: "Please enter a valid mobile number, for example *+968 9123 4567*." })
      return true
    }
    await setHospitalState(customerPhone, "NEW_PATIENT_DOB", { ...state.data, newMobile: mobile }, tenantId)
    await sendWhatsApp({ to: customerPhone, body: "Please enter your *Date of Birth* (DD/MM/YYYY):" })
    return true
  }

  if (state?.step === "NEW_PATIENT_DOB" && text) {
    const dob = parsePatientDob(text)
    if (!dob) {
      await sendWhatsApp({ to: customerPhone, body: "Please enter a valid date of birth in *DD/MM/YYYY* format." })
      return true
    }
    await setHospitalState(customerPhone, "REVIEW_NEW_PATIENT", { ...state.data, newDob: dob.toISOString() }, tenantId)
    await sendInteractiveMessage({
      to: customerPhone,
      headerText: "📋 Confirm Patient Details",
      body: `👤 *Name:* ${state.data.newFullName}\n📱 *Mobile:* ${state.data.newMobile}\n🎂 *Date of Birth:* ${format(dob, "d MMMM yyyy")}\n\nPlease confirm these details:`,
      buttons: [
        { id: "hosp_new_confirm", title: "✅ Confirm" },
        { id: "hosp_new_change", title: "✏️ Change Details" },
      ],
    })
    return true
  }

  if (state?.step === "REVIEW_NEW_PATIENT") {
    if (buttonId === "hosp_new_change") {
      await setHospitalState(customerPhone, "NEW_PATIENT_NAME", { flowType: state.data.flowType }, tenantId)
      await sendWhatsApp({ to: customerPhone, body: "Please enter your *Full Name* again:" })
      return true
    }
    if (buttonId === "hosp_new_confirm" || lower.includes("confirm")) {
      const existing = await db.hospPatient.findFirst({
        where: { tenantId, mobile: { contains: state.data.newMobile.replace(/\D/g, "").slice(-8) } },
      })
      const patient = existing || await db.hospPatient.create({
        data: {
          tenantId,
          mrn: `MRN${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`,
          fullName: state.data.newFullName,
          mobile: state.data.newMobile,
          dob: new Date(state.data.newDob),
        },
      })
      const patientData = { ...state.data, patientId: patient.id, patientName: patient.fullName, patientMrn: patient.mrn, patientMobile: patient.mobile }
      if (state.data.flowType === "CHEMO") return await showChemoDoctorPicker(ctx, patientData)
      return await showDeptPicker(ctx, patientData)
    }
  }

  // ── CONFIRM PATIENT ───────────────────────────────────────────────────────
  if (state?.step === "CONFIRM_PATIENT") {
    if (buttonId === "hosp_pt_confirm" || lower.includes("confirm") || lower.includes("yes")) {
      if (state.data.flowType === "CHEMO") {
        return await showChemoDoctorPicker(ctx, state.data)
      } else {
        return await showDeptPicker(ctx, state.data)
      }
    } else if (buttonId === "hosp_pt_retry" || lower.includes("not me")) {
      await setHospitalState(customerPhone, "ASK_MRN_OR_PHONE", { ...state.data }, tenantId)
      await sendWhatsApp({
        to: customerPhone,
        body: "Please enter your correct *MRN / Patient ID* or *Mobile Number*:",
      })
      return true
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FLOW A: DOCTOR APPOINTMENT FLOW
  // ══════════════════════════════════════════════════════════════════════════

  // Pick department
  if (state?.step === "SELECT_DEPT" && (buttonId.startsWith("hosp_dept_") || text)) {
    let deptId = buttonId.replace("hosp_dept_", "")
    let dept: any = null
    if (deptId) {
      dept = await db.hospDepartment.findFirst({ where: { id: deptId, tenantId } })
    } else {
      dept = await db.hospDepartment.findFirst({ where: { tenantId, name: { contains: text, mode: "insensitive" } } })
    }

    if (!dept) {
      dept = await db.hospDepartment.findFirst({ where: { tenantId, isActive: true }, orderBy: { sortOrder: "asc" } })
    }

    if (dept) {
      const doctors = await db.hospDoctor.findMany({
        where: { tenantId, departmentId: dept.id, isActive: true },
        take: 5,
      })

      if (doctors.length === 0) {
        await sendWhatsApp({ to: customerPhone, body: "No doctors currently available in this department. Please choose another department." })
        return await showDeptPicker(ctx, state.data)
      }

      await setHospitalState(customerPhone, "SELECT_APT_DOC", { ...state.data, deptId: dept.id, deptName: dept.name }, tenantId)

      const rows = doctors.map(d => ({
        id: `hosp_doc_${d.id}`,
        title: d.name,
        description: d.specialization || dept.name,
      }))

      await sendInteractiveMessage({
        to: customerPhone,
        body: `👨‍⚕️ *${dept.name} Doctors*\n\nPlease select your doctor:`,
        list: {
          title: "Select Doctor",
          sections: [{ title: "Available Doctors", rows }],
        },
      })
      return true
    }
  }

  // Pick Apt Doctor
  if (state?.step === "SELECT_APT_DOC" && (buttonId.startsWith("hosp_doc_") || text)) {
    let docId = buttonId.replace("hosp_doc_", "")
    let doctor: any = await db.hospDoctor.findFirst({
      where: { tenantId, ...(docId ? { id: docId } : { name: { contains: text, mode: "insensitive" } }) },
      include: { department: true },
    })

    if (!doctor) {
      doctor = await db.hospDoctor.findFirst({ where: { tenantId, isActive: true } })
    }

    if (doctor) {
      await setHospitalState(customerPhone, "SELECT_APT_DATE", { ...state.data, doctorId: doctor.id, doctorName: doctor.name }, tenantId)

      // Generate only dates with live schedule availability.
      const dateRows: any[] = []
      for (let i = 0; i < 5; i++) {
        const d = addDays(new Date(), i)
        const slots = await getDoctorAvailableSlots(tenantId, doctor.id, d)
        if (slots.length === 0) continue
        const dateStr = format(d, "yyyy-MM-dd")
        const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(d, "EEE, d MMM")
        dateRows.push({
          id: `hosp_adate_${dateStr}`,
          title: label,
          description: `${slots.length} consultation slot${slots.length === 1 ? "" : "s"} available`,
        })
      }

      if (dateRows.length === 0) {
        await sendWhatsApp({ to: customerPhone, body: `No appointment slots are currently available for ${doctor.name}. Please contact the hospital or try another doctor.` })
        return await showDeptPicker(ctx, state.data)
      }

      await sendInteractiveMessage({
        to: customerPhone,
        body: `📅 *Choose Appointment Date*\n\nDoctor: *${doctor.name}*\nDepartment: *${doctor.department?.name}*`,
        list: {
          title: "Choose Date",
          sections: [{ title: "Available Dates", rows: dateRows }],
        },
      })
      return true
    }
  }

  // Pick Apt Date
  if (state?.step === "SELECT_APT_DATE" && buttonId.startsWith("hosp_adate_")) {
    const dateStr = buttonId.replace("hosp_adate_", "")
    await setHospitalState(customerPhone, "SELECT_APT_TIME", { ...state.data, appointmentDate: dateStr }, tenantId)

    const slotRows = (await getDoctorAvailableSlots(tenantId, state.data.doctorId, new Date(dateStr))).map(s => ({
      id: `hosp_aslot_${s.value.replace(/[: ]/g, "_")}`,
      title: s.label,
      description: "30-min consultation",
    }))

    if (slotRows.length === 0) {
      await sendWhatsApp({ to: customerPhone, body: "That date is no longer available. Please choose another date." })
      return await showDeptPicker(ctx, state.data)
    }

    await sendInteractiveMessage({
      to: customerPhone,
      body: `⏰ *Available Time Slots*\n\nDoctor: *${state.data.doctorName}*\nDate: *${dateStr}*\n\nPlease select a time slot:`,
      list: {
        title: "Select Time",
        sections: [{ title: "Available Slots", rows: slotRows.slice(0, 10) }],
      },
    })
    return true
  }

  // Pick Apt Time & Review
  if (state?.step === "SELECT_APT_TIME" && buttonId.startsWith("hosp_aslot_")) {
    const slotRaw = buttonId.replace("hosp_aslot_", "")
    const timeStr = slotRaw.replace("_", ":").replace("_", " ")

    await setHospitalState(customerPhone, "REVIEW_APT", { ...state.data, appointmentTime: timeStr }, tenantId)

    await sendInteractiveMessage({
      to: customerPhone,
      headerText: "📋 Review Your Appointment",
      body:
        `👤 *Patient:* ${state.data.patientName}\n` +
        `🆔 *Patient ID:* ${state.data.patientMrn}\n` +
        `👨‍⚕️ *Doctor:* ${state.data.doctorName}\n` +
        `🏥 *Department:* ${state.data.deptName || "Oncology"}\n` +
        `📅 *Date:* ${state.data.appointmentDate}\n` +
        `⏰ *Time:* ${timeStr}\n\n` +
        "Please confirm your appointment 👇",
      buttons: [
        { id: "hosp_apt_confirm", title: "✅ Confirm" },
        { id: "hosp_btn_apt", title: "🔄 Change Details" },
      ],
    })
    return true
  }

  // Confirm Doctor Apt
  if (state?.step === "REVIEW_APT" && buttonId === "hosp_apt_confirm") {
    const date = new Date(state.data.appointmentDate)
    const liveSlots = await getDoctorAvailableSlots(tenantId, state.data.doctorId, date)
    const requested = liveSlots.find(s => s.value === state.data.appointmentTime)
    if (!requested) {
      await sendWhatsApp({ to: customerPhone, body: "That appointment time was just taken. Please choose another available time." })
      await setHospitalState(customerPhone, "SELECT_APT_TIME", state.data, tenantId)
      return true
    }

    const ref = `APT-${format(date, "yyMMdd")}-${randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`
    let apt: any
    try {
      apt = await db.$transaction(async tx => {
        const created = await tx.hospDoctorAppointment.create({
          data: { tenantId, appointmentRef: ref, patientId: state.data.patientId, doctorId: state.data.doctorId, appointmentDate: startOfDay(date), appointmentTime: state.data.appointmentTime, source: "WHATSAPP" },
          include: { doctor: { include: { department: true } }, patient: true },
        })
        if (state.data.rescheduleBookingId) {
          await tx.hospDoctorAppointment.updateMany({ where: { id: state.data.rescheduleBookingId, tenantId, patientId: state.data.patientId, status: { notIn: ["CANCELLED", "RESCHEDULED"] } }, data: { status: "RESCHEDULED" } })
        }
        return created
      })
    } catch {
      await sendWhatsApp({ to: customerPhone, body: "That slot is no longer available. Please choose another appointment time." })
      await setHospitalState(customerPhone, "SELECT_APT_TIME", state.data, tenantId)
      return true
    }

    await clearHospitalState(customerPhone, tenantId)

    await sendInteractiveMessage({
      to: customerPhone,
      headerText: "✅ Appointment Confirmed!",
      body:
        `👤 *Patient:* ${apt.patient.fullName}\n` +
        `👨‍⚕️ *Doctor:* ${apt.doctor.name}\n` +
        `🏥 *Department:* ${apt.doctor.department?.name || "Consultation"}\n` +
        `📅 *Date:* ${format(date, "EEEE, d MMMM yyyy")}\n` +
        `⏰ *Time:* ${apt.appointmentTime}\n\n` +
        `🆔 *Appointment ID: ${apt.appointmentRef}*\n\n` +
        "You will receive a reminder before your appointment.\n\nThank you! 🙏",
      buttons: [
        { id: "hosp_btn_my_bookings", title: "📋 View Booking" },
        { id: "hosp_btn_home", title: "🏠 Main Menu" },
      ],
    })
    return true
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FLOW B: CHEMOTHERAPY DAY CARE FLOW
  // ══════════════════════════════════════════════════════════════════════════

  // Pick Chemo Doctor
  if (state?.step === "SELECT_CHEMO_DOC" && (buttonId.startsWith("hosp_cdoc_") || text)) {
    let docId = buttonId.replace("hosp_cdoc_", "")
    let doctor: any = await db.hospDoctor.findFirst({
      where: { tenantId, ...(docId ? { id: docId } : { name: { contains: text, mode: "insensitive" } }) },
      include: { department: true },
    })

    if (!doctor) {
      doctor = await db.hospDoctor.findFirst({ where: { tenantId, isActive: true } })
    }

    if (doctor) {
      await setHospitalState(customerPhone, "SELECT_CHEMO_DATE", { ...state.data, doctorId: doctor.id, doctorName: doctor.name }, tenantId)
      return await showChemoDateList(ctx, { ...state.data, doctorId: doctor.id, doctorName: doctor.name })
    }
  }

  // Pick Chemo Date
  if (state?.step === "SELECT_CHEMO_DATE" && buttonId.startsWith("hosp_cdate_")) {
    const dateStr = buttonId.replace("hosp_cdate_", "")
    const date = new Date(dateStr)

    // Calculate live availability for this date
    const [normalWard, specialWard] = await Promise.all([
      db.hospWard.findFirst({ where: { tenantId, wardType: "NORMAL" } }),
      db.hospWard.findFirst({ where: { tenantId, wardType: "SPECIAL" } }),
    ])

    async function getAvail(ward: any) {
      if (!ward) return { total: 15, avail: 15 }
      const booked = await db.hospChemoBooking.count({
        where: { tenantId, bed: { wardId: ward.id }, bookingDate: { gte: startOfDay(date), lte: endOfDay(date) }, status: { notIn: ["CANCELLED"] } },
      })
      const held = await db.hospBedHold.count({
        where: { bed: { wardId: ward.id }, bookingDate: { gte: startOfDay(date), lte: endOfDay(date) }, expiresAt: { gt: new Date() } },
      })
      return { total: ward.totalBeds, avail: Math.max(0, ward.totalBeds - booked - held) }
    }

    const [norm, spec] = await Promise.all([getAvail(normalWard), getAvail(specialWard)])
    const totalAvail = norm.avail + spec.avail

    await setHospitalState(customerPhone, "SELECT_WARD", {
      ...state.data,
      bookingDate: dateStr,
      normalWardId: normalWard?.id,
      specialWardId: specialWard?.id,
      normAvail: norm.avail,
      specAvail: spec.avail,
    }, tenantId)

    if (totalAvail === 0) {
      await setHospitalState(customerPhone, "FULLY_BOOKED", { ...state.data, bookingDate: dateStr, doctorId: state.data.doctorId }, tenantId)
      await sendInteractiveMessage({
        to: customerPhone,
        body: `❌ *${format(date, "EEEE, d MMMM yyyy")} is fully booked.*\n\nWould you like to join the waiting list?`,
        buttons: [
          { id: "hosp_waitlist", title: "📝 Join Waiting List" },
          { id: "hosp_btn_chemo", title: "📅 Choose Another Date" },
          { id: "hosp_btn_home", title: "🏠 Main Menu" },
        ],
      })
      return true
    }

    await sendInteractiveMessage({
      to: customerPhone,
      body:
        `📅 *${format(date, "EEE, d MMM yyyy")}*\n` +
        `*${totalAvail} of 30 beds available*\n\n` +
        "Please choose a ward 👇",
      buttons: [
        { id: "hosp_ward_NORMAL", title: `1️⃣ Normal Ward (${norm.avail}/15)` },
        { id: "hosp_ward_SPECIAL", title: `2️⃣ Special Ward (${spec.avail}/15)` },
      ],
      footerText: "Kauvery Hospital Day Care",
    })
    return true
  }

  if (state?.step === "FULLY_BOOKED" && buttonId === "hosp_waitlist") {
    await setHospitalState(customerPhone, "WAITLIST_WARD", state.data, tenantId)
    await sendInteractiveMessage({ to: customerPhone, body: "Which ward would you prefer if a bed opens?", buttons: [
      { id: "hosp_wait_NORMAL", title: "Normal Ward" },
      { id: "hosp_wait_SPECIAL", title: "Special Ward" },
      { id: "hosp_wait_EITHER", title: "Either Ward" },
    ] })
    return true
  }

  if (state?.step === "FULLY_BOOKED" && buttonId === "hosp_btn_chemo") {
    return await showChemoDateList(ctx, state.data)
  }

  if (state?.step === "WAITLIST_WARD" && buttonId.startsWith("hosp_wait_")) {
    const wardType = buttonId.replace("hosp_wait_", "")
    await db.hospWaitlist.create({ data: {
      tenantId,
      patientId: state.data.patientId,
      doctorId: state.data.doctorId || null,
      preferredDate: new Date(state.data.bookingDate),
      wardType,
      mobile: customerPhone,
    } })
    await clearHospitalState(customerPhone, tenantId)
    await sendWhatsApp({ to: customerPhone, body: `✅ You have been added to the waiting list for ${format(new Date(state.data.bookingDate), "d MMM yyyy")} (${wardType === "EITHER" ? "either ward" : `${wardType.toLowerCase()} ward`}). The hospital will contact you if availability opens.` })
    return true
  }

  // Pick Ward
  if (state?.step === "SELECT_WARD" && (buttonId === "hosp_ward_NORMAL" || buttonId === "hosp_ward_SPECIAL")) {
    const wardType = buttonId === "hosp_ward_NORMAL" ? "NORMAL" : "SPECIAL"
    const ward = await db.hospWard.findFirst({ where: { tenantId, wardType } })
    const date = new Date(state.data.bookingDate)

    if (!ward) {
      await sendWhatsApp({ to: customerPhone, body: "Ward configuration error. Please contact hospital." })
      return true
    }

    // Find all beds in this ward with status
    const allBeds = await db.hospBed.findMany({
      where: { wardId: ward.id, isActive: true },
      orderBy: { bedNumber: "asc" },
      include: {
        bookings: {
          where: { bookingDate: { gte: startOfDay(date), lte: endOfDay(date) }, status: { notIn: ["CANCELLED"] } },
        },
        holds: {
          where: { bookingDate: { gte: startOfDay(date), lte: endOfDay(date) }, expiresAt: { gt: new Date() } },
        },
        blocks: {
          where: { startDatetime: { lte: endOfDay(date) }, endDatetime: { gte: startOfDay(date) } },
        },
      },
    })

    const availableBeds = allBeds.filter(b => b.bookings.length === 0 && b.holds.length === 0 && b.blocks.length === 0)

    if (availableBeds.length === 0) {
      await sendInteractiveMessage({
        to: customerPhone,
        body: `❌ No beds are currently available in *${ward.name}* for this date.`,
        buttons: [
          { id: wardType === "NORMAL" ? "hosp_ward_SPECIAL" : "hosp_ward_NORMAL", title: "Try Other Ward" },
          { id: "hosp_btn_chemo", title: "Choose Another Date" },
        ],
      })
      return true
    }

    await setHospitalState(customerPhone, "SELECT_BED", {
      ...state.data,
      wardId: ward.id,
      wardName: ward.name,
      wardType,
    }, tenantId)

    const rows = availableBeds.slice(0, 10).map(b => ({
      id: `hosp_bed_${b.id}_${b.bedNumber}`,
      title: `Bed ${b.bedNumber}`,
      description: "🟢 Available for day care",
    }))

    await sendInteractiveMessage({
      to: customerPhone,
      body:
        `🏥 *${ward.name}*\n` +
        `*${availableBeds.length} beds available*\n\n` +
        "Please select an available bed 👇",
      list: {
        title: "Select Bed",
        sections: [{ title: `${ward.name} Beds`, rows }],
      },
    })
    return true
  }

  // Pick Bed & Hold
  if (state?.step === "SELECT_BED" && buttonId.startsWith("hosp_bed_")) {
    const parts = buttonId.replace("hosp_bed_", "").split("_")
    const bedId = parts[0]
    const bedNumber = parts[1] || "Bed"
    const bed = await db.hospBed.findFirst({ where: { id: bedId, tenantId, wardId: state.data.wardId, isActive: true } })
    if (!bed) {
      await sendWhatsApp({ to: customerPhone, body: "That bed is no longer available. Please choose another bed." })
      return true
    }
    const sessions = await db.hospTreatmentSession.findMany({ where: { tenantId, isActive: true }, orderBy: { sortOrder: "asc" } })
    if (sessions.length > 1) {
      await setHospitalState(customerPhone, "SELECT_SESSION", { ...state.data, bedId, bedNumber }, tenantId)
      await sendInteractiveMessage({
        to: customerPhone,
        body: `🕐 *Choose treatment session*\n\nBed *${bedNumber}* is available.`,
        list: { title: "Select Session", sections: [{ title: "Available Sessions", rows: sessions.map(s => ({ id: `hosp_session_${s.id}`, title: s.name, description: `${s.startTime} - ${s.endTime}` })) }] },
      })
      return true
    }
    return await holdHospitalBed(ctx, state.data, bed, sessions[0] || null)
  }

  if (state?.step === "SELECT_SESSION" && buttonId.startsWith("hosp_session_")) {
    const sessionId = buttonId.replace("hosp_session_", "")
    const [bed, session] = await Promise.all([
      db.hospBed.findFirst({ where: { id: state.data.bedId, tenantId, wardId: state.data.wardId, isActive: true } }),
      db.hospTreatmentSession.findFirst({ where: { id: sessionId, tenantId, isActive: true } }),
    ])
    if (!bed || !session) {
      await clearHospitalState(customerPhone, tenantId)
      await sendWhatsApp({ to: customerPhone, body: "That bed or session is no longer available. Please start again." })
      return true
    }
    return await holdHospitalBed(ctx, state.data, bed, session)
  }

  // Confirm Chemo Booking
  if (state?.step === "REVIEW_CHEMO" && buttonId === "hosp_chemo_confirm") {
    const date = new Date(state.data.bookingDate)
    const hold = await db.hospBedHold.findFirst({
      where: {
        id: state.data.holdId,
        patientRef: customerPhone,
        expiresAt: { gt: new Date() },
        bookingDate: { gte: startOfDay(date), lte: endOfDay(date) },
        bed: { tenantId, id: state.data.bedId, wardId: state.data.wardId, isActive: true },
      },
    })
    if (!hold) {
      await clearHospitalState(customerPhone, tenantId)
      await sendWhatsApp({ to: customerPhone, body: "⏱️ Your bed hold has expired or is no longer valid. No booking was confirmed. Please start again." })
      return true
    }
    const bookingRef = `CHEMO-${format(date, "yyMMdd")}-${randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`
    let booking: any
    try {
      booking = await db.$transaction(async tx => {
        const conflict = await tx.hospChemoBooking.findFirst({
          where: { tenantId, bedId: state.data.bedId, bookingDate: { gte: startOfDay(date), lte: endOfDay(date) }, status: { notIn: ["CANCELLED", "RESCHEDULED"] }, ...(state.data.sessionId ? { sessionId: state.data.sessionId } : {}) },
        })
        if (conflict) throw new Error("BED_UNAVAILABLE")
        const created = await tx.hospChemoBooking.create({
          data: { tenantId, bookingRef, patientId: state.data.patientId, doctorId: state.data.doctorId, bedId: state.data.bedId, sessionId: state.data.sessionId || null, bookingDate: date, source: "WHATSAPP" },
          include: { patient: true, doctor: true, bed: { include: { ward: true } }, session: true },
        })
        if (state.data.rescheduleBookingId) {
          await tx.hospChemoBooking.updateMany({ where: { id: state.data.rescheduleBookingId, tenantId, patientId: state.data.patientId, status: { notIn: ["CANCELLED", "RESCHEDULED"] } }, data: { status: "RESCHEDULED" } })
        }
        await tx.hospBedHold.delete({ where: { id: hold.id } })
        return created
      })
    } catch {
      await sendWhatsApp({ to: customerPhone, body: "⚠️ Availability changed before confirmation. Your bed was not booked. Please choose another bed." })
      await clearHospitalState(customerPhone, tenantId)
      return true
    }

      await clearHospitalState(customerPhone, tenantId)

    await sendInteractiveMessage({
      to: customerPhone,
      headerText: "✅ Booking Confirmed!",
      body:
        `🎉 *Chemotherapy Day Care booking confirmed!*\n\n` +
        `👤 *Patient:* ${booking.patient.fullName}\n` +
        `👨‍⚕️ *Doctor:* ${booking.doctor.name}\n` +
        `📅 *Date:* ${format(date, "EEEE, d MMMM yyyy")}\n` +
        `🏥 *Ward:* ${booking.bed.ward.name}\n` +
        `🛏️ *Bed:* ${booking.bed.bedNumber}\n` +
        `⏰ *Session:* ${booking.session ? `${booking.session.name} (${booking.session.startTime} - ${booking.session.endTime})` : "08:00 AM - 12:00 PM"}\n\n` +
        `🆔 *Booking ID: ${booking.bookingRef}*\n\n` +
        `📋 *Instructions:*\n` +
        `• Please arrive *30 minutes* before your scheduled treatment.\n` +
        `• Bring your hospital identification / patient card.\n\n` +
        `Thank you! 🙏`,
      buttons: [
        { id: "hosp_btn_my_bookings", title: "📋 View Booking" },
        { id: "hosp_btn_contact", title: "📞 Contact Hospital" },
        { id: "hosp_btn_home", title: "🏠 Main Menu" },
      ],
    })
    return true
  }

  return false
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePatientDob(value: string): Date | null {
  const raw = value.trim()
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null
  const parts = raw.split(/[./-]/)
  const normalized = iso || (parts.length === 3 ? `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}` : null)
  if (!normalized) return null
  const date = new Date(`${normalized}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date > new Date() || date < new Date("1900-01-01")) return null
  return date
}

async function getDoctorAvailableSlots(tenantId: string, doctorId: string, date: Date) {
  const dayOfWeek = date.getDay()
  const [schedules, unavailable, booked] = await Promise.all([
    db.hospDoctorSchedule.findMany({ where: { doctorId, dayOfWeek, isActive: true }, orderBy: { startTime: "asc" } }),
    db.hospDoctorUnavailable.findFirst({ where: { doctorId, date: { gte: startOfDay(date), lte: endOfDay(date) } } }),
    db.hospDoctorAppointment.findMany({
      where: { tenantId, doctorId, appointmentDate: { gte: startOfDay(date), lte: endOfDay(date) }, status: { notIn: ["CANCELLED", "RESCHEDULED"] } },
      select: { appointmentTime: true },
    }),
  ])
  if (unavailable) return []
  const taken = new Set(booked.map(a => a.appointmentTime))
  const slots: { value: string; label: string }[] = []
  for (const schedule of schedules) {
    const [startHour, startMinute] = schedule.startTime.split(":").map(Number)
    const [endHour, endMinute] = schedule.endTime.split(":").map(Number)
    let cursor = startHour * 60 + startMinute
    const end = endHour * 60 + endMinute
    const duration = Math.max(15, schedule.appointmentDuration || 30)
    while (cursor + duration <= end) {
      const value = `${String(Math.floor(cursor / 60)).padStart(2, "0")}:${String(cursor % 60).padStart(2, "0")}`
      if (!taken.has(value)) {
        const hour = Math.floor(cursor / 60)
        const minute = cursor % 60
        const suffix = hour >= 12 ? "PM" : "AM"
        const displayHour = hour % 12 || 12
        slots.push({ value, label: `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}` })
      }
      cursor += duration
    }
  }
  return slots
}

async function holdHospitalBed(ctx: HospFlowContext, data: Record<string, any>, bed: any, session: any) {
  const date = new Date(data.bookingDate)
  const now = new Date()
  const conflict = await db.hospChemoBooking.findFirst({
    where: { tenantId: ctx.tenantId, bedId: bed.id, bookingDate: { gte: startOfDay(date), lte: endOfDay(date) }, status: { notIn: ["CANCELLED", "RESCHEDULED"] }, ...(session ? { sessionId: session.id } : {}) },
  })
  const held = await db.hospBedHold.findFirst({
    where: { bedId: bed.id, bookingDate: { gte: startOfDay(date), lte: endOfDay(date) }, expiresAt: { gt: now }, ...(session ? { sessionId: session.id } : {}) },
  })
  if (conflict || held) {
    await sendWhatsApp({ to: ctx.customerPhone, body: `⚠️ Bed ${bed.bedNumber} was just reserved. Please choose another available bed.` })
    return true
  }
  const settings = await db.hospSettings.findUnique({ where: { tenantId: ctx.tenantId } })
  const hold = await db.hospBedHold.create({
    data: {
      bedId: bed.id,
      bookingDate: date,
      sessionId: session?.id || null,
      patientRef: ctx.customerPhone,
      expiresAt: new Date(Date.now() + (settings?.holdDurationMins || 5) * 60 * 1000),
    },
  })
  await setHospitalState(ctx.customerPhone, "REVIEW_CHEMO", {
    ...data,
    bedId: bed.id,
    bedNumber: bed.bedNumber,
    holdId: hold.id,
    sessionId: session?.id || null,
    sessionName: session ? `${session.name} (${session.startTime} - ${session.endTime})` : "Day Care (08:00 - 16:00)",
  }, ctx.tenantId)
  await sendInteractiveMessage({
    to: ctx.customerPhone,
    headerText: `You selected: Bed ${bed.bedNumber}`,
    body: `⏱️ *Bed ${bed.bedNumber} is held for ${settings?.holdDurationMins || 5} minutes.*\n\n` +
      `👤 *Patient:* ${data.patientName}\n🆔 *Patient ID:* ${data.patientMrn}\n` +
      `👨‍⚕️ *Doctor:* ${data.doctorName}\n📅 *Date:* ${format(date, "EEEE, d MMMM yyyy")}\n` +
      `🏥 *Ward:* ${data.wardName}\n🛏️ *Bed:* ${bed.bedNumber}\n` +
      `⏰ *Session:* ${session ? `${session.name} (${session.startTime} - ${session.endTime})` : "Day Care (08:00 - 16:00)"}\n\nPlease review and confirm:`,
    buttons: [
      { id: "hosp_chemo_confirm", title: "✅ Confirm Booking" },
      { id: "hosp_btn_chemo", title: "🔄 Change Details" },
    ],
    footerText: `Hold expires in ${settings?.holdDurationMins || 5} minutes`,
  })
  return true
}

async function showHospitalHome(ctx: HospFlowContext) {
  const settings = await db.hospSettings.findUnique({ where: { tenantId: ctx.tenantId } })
  const hospitalName = settings?.hospitalName || "Hospital"
  await setHospitalState(ctx.customerPhone, "HOME", {}, ctx.tenantId)
  await sendInteractiveMessage({
    to: ctx.customerPhone,
    headerText: `🏥 ${hospitalName}`,
    body: `👋 *Welcome to ${hospitalName}*\n\nPlease choose a patient service:`,
    list: { title: "Open Hospital Menu", sections: [{ title: "Patient Services", rows: [
      { id: "hosp_btn_apt", title: "Doctor Appointment", description: "Book a consultation" },
      { id: "hosp_btn_chemo", title: "Chemotherapy Day Care", description: "Book a day-care bed" },
      { id: "hosp_btn_my_bookings", title: "My Bookings", description: "View active bookings" },
      { id: "hosp_btn_reschedule", title: "Reschedule / Cancel", description: "Manage an existing booking" },
      { id: "hosp_btn_contact", title: "Contact Hospital", description: "Get support" },
    ] }] },
  })
  return true
}

async function showDeptPicker(ctx: HospFlowContext, data: Record<string, any>) {
  const depts = await db.hospDepartment.findMany({
    where: { tenantId: ctx.tenantId, isActive: true },
    orderBy: { sortOrder: "asc" },
    take: 8,
  })

  await setHospitalState(ctx.customerPhone, "SELECT_DEPT", data, ctx.tenantId)

  const rows = depts.map(d => ({
    id: `hosp_dept_${d.id}`,
    title: d.name,
    description: d.description || "Specialist department",
  }))

  await sendInteractiveMessage({
    to: ctx.customerPhone,
    body: "🏥 *Select Department*\n\nPlease select the department for your appointment:",
    list: {
      title: "Select Department",
      sections: [{ title: "Departments", rows }],
    },
  })
  return true
}

async function showChemoDoctorPicker(ctx: HospFlowContext, data: Record<string, any>) {
  const doctors = await db.hospDoctor.findMany({
    where: { tenantId: ctx.tenantId, isActive: true },
    include: { department: true },
    take: 6,
  })

  await setHospitalState(ctx.customerPhone, "SELECT_CHEMO_DOC", data, ctx.tenantId)

  const rows = doctors.map(d => ({
    id: `hosp_cdoc_${d.id}`,
    title: d.name,
    description: d.department?.name || "Medical Oncology",
  }))

  await sendInteractiveMessage({
    to: ctx.customerPhone,
    body: "👨‍⚕️ *Select Doctor*\n\nWhich doctor is handling your chemotherapy treatment?",
    list: {
      title: "Select Doctor",
      sections: [{ title: "Oncology Doctors", rows }],
    },
  })
  return true
}

async function showChemoDateList(ctx: HospFlowContext, data: Record<string, any>) {
  const { tenantId, customerPhone } = ctx
  const rows: any[] = []

  for (let i = 0; i < 5; i++) {
    const d = addDays(new Date(), i)
    const dateStr = format(d, "yyyy-MM-dd")
    const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(d, "EEE, d MMM")

    const wards = await db.hospWard.findMany({ where: { tenantId, wardType: { in: ["NORMAL", "SPECIAL"] } }, select: { id: true } })
    const beds = await db.hospBed.findMany({ where: { tenantId, wardId: { in: wards.map(w => w.id) }, isActive: true }, select: { id: true } })
    const [booked, held] = await Promise.all([
      db.hospChemoBooking.count({ where: { tenantId, bedId: { in: beds.map(b => b.id) }, bookingDate: { gte: startOfDay(d), lte: endOfDay(d) }, status: { notIn: ["CANCELLED", "RESCHEDULED"] } } }),
      db.hospBedHold.count({ where: { bedId: { in: beds.map(b => b.id) }, bookingDate: { gte: startOfDay(d), lte: endOfDay(d) }, expiresAt: { gt: new Date() } } }),
    ])
    const avail = Math.max(0, beds.length - booked - held)

    rows.push({
      id: `hosp_cdate_${dateStr}`,
      title: `${label} (${avail} beds free)`,
      description: avail > 0 ? `Live availability across ${beds.length} beds` : "Fully Booked",
    })
  }

  await sendInteractiveMessage({
    to: customerPhone,
    body: "📅 *Choose Treatment Date*\n\nPlease select your preferred day care date:",
    list: {
      title: "Choose Date",
      sections: [{ title: "Next 5 Days", rows }],
    },
  })
  return true
}
