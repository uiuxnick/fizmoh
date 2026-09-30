import { db } from "@/lib/db"
import { getTenantCourses } from "@/lib/training-service"

export type FlowRuntimeContext = {
  tenantId: string
  customerId: string
  customerPhone: string
  answers?: Record<string, any>
}

function formatCourseDates(start?: string, end?: string): string {
  if (!start) return ""
  if (!end || start === end) {
    try {
      const d = new Date(start)
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    } catch {
      return start
    }
  }
  try {
    const d1 = new Date(start)
    const d2 = new Date(end)
    const m1 = d1.toLocaleDateString("en-GB", { month: "short" })
    const m2 = d2.toLocaleDateString("en-GB", { month: "short" })
    const y1 = d1.getFullYear()
    const y2 = d2.getFullYear()
    if (m1 === m2 && y1 === y2) {
      return `${d1.getDate()}–${d2.getDate()} ${m1} ${y1}`
    }
    return `${d1.getDate()} ${m1} – ${d2.getDate()} ${m2} ${y2}`
  } catch {
    return `${start} – ${end}`
  }
}

/**
 * Loads only the current customer's live workspace data for a flow run.
 * Values are flat on purpose: they can be used directly as {{tokens}} and
 * are also safe to pass to the AI node as a small, readable context block.
 */
export async function loadFlowRuntimeData(ctx: FlowRuntimeContext): Promise<Record<string, string>> {
  const [customer, latestOrder, latestAppointment, latestRestaurantOrder, patient, defaultBank, courses] = await Promise.all([
    db.customer.findFirst({
      where: { id: ctx.customerId, tenantId: ctx.tenantId },
      select: { name: true, email: true, phone: true, stage: true, preferredLang: true, preferredCurrency: true, tags: true, customFields: true },
    }),
    db.order.findFirst({
      where: { tenantId: ctx.tenantId, customerId: ctx.customerId },
      orderBy: { createdAt: "desc" },
      select: { orderNumber: true, orderStatus: true, paymentStatus: true, totalAmount: true, createdAt: true },
    }).catch(() => null),
    db.appointment.findFirst({
      where: { tenantId: ctx.tenantId, customerId: ctx.customerId },
      orderBy: { scheduledAt: "desc" },
      select: { reference: true, status: true, scheduledAt: true, service: true, meetLink: true },
    }).catch(() => null),
    db.kitchenOrder.findFirst({
      where: { tenantId: ctx.tenantId, customerPhone: ctx.customerPhone, status: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, totalAmount: true, currency: true, createdAt: true },
    }).catch(() => null),
    db.hospPatient.findFirst({
      where: { tenantId: ctx.tenantId, OR: [{ mobile: ctx.customerPhone }, { id: ctx.customerId }] },
      orderBy: { updatedAt: "desc" },
      select: { id: true, mrn: true, fullName: true, mobile: true, email: true, dob: true, gender: true, emergContact: true },
    }).catch(() => null),
    db.bankAccount.findFirst({
      where: { tenantId: ctx.tenantId, isActive: true },
      orderBy: { isDefault: "desc" },
    }).catch(() => null),
    getTenantCourses(ctx.tenantId).catch(() => []),
  ])

  const out: Record<string, string> = {
    "customer.id": ctx.customerId,
    "customer.name": customer?.name || "",
    "customer.email": customer?.email || "",
    "customer.phone": customer?.phone || ctx.customerPhone,
    "customer.stage": customer?.stage || "",
    "customer.language": customer?.preferredLang || "en",
    "customer.currency": customer?.preferredCurrency || "OMR",
    "order.latest.number": latestOrder?.orderNumber || "",
    "order.latest.status": latestOrder?.orderStatus || "",
    "order.latest.payment_status": latestOrder?.paymentStatus || "",
    "order.latest.total": latestOrder ? String(latestOrder.totalAmount) : "",
    "order.latest.created_at": latestOrder?.createdAt?.toISOString() || "",
    "appointment.latest.reference": latestAppointment?.reference || "",
    "appointment.latest.status": latestAppointment?.status || "",
    "appointment.latest.date": latestAppointment?.scheduledAt?.toISOString() || "",
    "appointment.latest.service": latestAppointment?.service || "",
    "appointment.latest.meet_link": latestAppointment?.meetLink || "",
    "restaurant.latest.order_id": latestRestaurantOrder?.id || "",
    "restaurant.latest.status": latestRestaurantOrder?.status || "",
    "restaurant.latest.total": latestRestaurantOrder ? String(latestRestaurantOrder.totalAmount) : "",
    "restaurant.latest.currency": latestRestaurantOrder?.currency || "OMR",
    "restaurant.latest.created_at": latestRestaurantOrder?.createdAt?.toISOString() || "",
    "hospital.patient.id": patient?.id || "",
    "hospital.patient.mrn": patient?.mrn || "",
    "hospital.patient.name": patient?.fullName || "",
    "hospital.patient.mobile": patient?.mobile || "",
    "hospital.patient.email": patient?.email || "",
    "hospital.patient.dob": patient?.dob?.toISOString().slice(0, 10) || "",
    "hospital.patient.gender": patient?.gender || "",
    "hospital.patient.emergency_contact": patient?.emergContact || "",
    "bank.name": defaultBank?.bankName || "",
    "bank.account_name": defaultBank?.accountName || "",
    "bank.account_number": defaultBank?.accountNumber || "",
    "bank.iban": defaultBank?.iban || defaultBank?.accountNumber || "",
    "bank.swift": defaultBank?.swiftCode || "",
    "bank.branch": defaultBank?.branch || "",
    "bank_name": defaultBank?.bankName || "",
    "account_name": defaultBank?.accountName || "",
    "account_number": defaultBank?.accountNumber || "",
    "iban": defaultBank?.iban || defaultBank?.accountNumber || "",
  }

  const selectedCourseId = ctx.answers?.selected_course_id || ctx.answers?.course_id || ctx.answers?.chosen_course
  const selectedCourse = selectedCourseId
    ? courses.find(c =>
        c.id === selectedCourseId ||
        c.slug === selectedCourseId ||
        c.courseId === selectedCourseId ||
        c.name.toLowerCase().includes(String(selectedCourseId).toLowerCase()) ||
        String(selectedCourseId).toLowerCase().includes(c.id.toLowerCase())
      )
    : null

  const activeCourse = selectedCourse || courses.find((c) => c.status === "PUBLISHED") || courses[0]
  if (activeCourse) {
    const datesFormatted = ctx.answers?.chosen_slot || formatCourseDates(activeCourse.startDate, activeCourse.endDate) || activeCourse.startDate || ""
    out["course.id"] = activeCourse.id
    out["course.name"] = activeCourse.name
    out["course.short_title"] = activeCourse.shortTitle || activeCourse.name
    out["course.category"] = activeCourse.category || ""
    out["course.type"] = activeCourse.type || "Certification"
    out["course.description"] = activeCourse.description || ""
    out["course.trainer"] = activeCourse.trainerName || ""
    out["course.trainer_name"] = activeCourse.trainerName || ""
    out["course.trainer_designation"] = activeCourse.trainerDesignation || ""
    out["course.trainer_company"] = activeCourse.trainerCompany || ""
    out["course.trainer_bio"] = activeCourse.trainerBio || ""
    out["course.dates"] = datesFormatted
    out["course.duration"] = activeCourse.duration || `${activeCourse.numDays || 2} Days`
    out["course.venue"] = `${activeCourse.venueName || ""}${activeCourse.city ? `, ${activeCourse.city}` : ""}`
    out["course.venue_name"] = activeCourse.venueName || ""
    out["course.city"] = activeCourse.city || ""
    out["course.seats"] = `${activeCourse.availableSeats ?? 26} of ${activeCourse.maxSeats ?? 30} seats available`
    out["course.available_seats"] = String(activeCourse.availableSeats ?? "")
    out["course.max_seats"] = String(activeCourse.maxSeats ?? "")
    out["course.price"] = `${activeCourse.currency || "OMR"} ${activeCourse.standardPrice}`
    out["course_price"] = `${activeCourse.currency || "OMR"} ${activeCourse.standardPrice}`
    out["course.standard_price"] = String(activeCourse.standardPrice)
    out["course.currency"] = activeCourse.currency || "OMR"
    out["course.offer_type"] = activeCourse.offerType || "NONE"
    out["course.offer"] = activeCourse.offerType === "BOGO"
      ? "Pay for 1 seat, get 1 seat FREE (Buy 1 Get 1 Free)"
      : (activeCourse.offerTitle || activeCourse.offerDescription || "Standard Registration")
    out["course.offer_title"] = activeCourse.offerTitle || ""
    out["course.offer_description"] = activeCourse.offerDescription || ""
    out["course.banner_url"] = activeCourse.bannerUrl || "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1600&auto=format&fit=crop"
    out["course.highlights"] = (activeCourse.highlights || []).map(h => `✓ ${h}`).join("\n")
    out["course.objectives"] = (activeCourse.learningObjectives || []).map(o => `• ${o}`).join("\n")
  }

  if (Array.isArray(customer?.tags)) out["customer.tags"] = customer.tags.map(String).join(", ")
  if (patient) {
    const [nextChemo, nextDoctorAppointment] = await Promise.all([
      db.hospChemoBooking.findFirst({
        where: { tenantId: ctx.tenantId, patientId: patient.id, bookingDate: { gte: new Date() }, status: { not: "CANCELLED" } },
        orderBy: { bookingDate: "asc" },
        include: { doctor: { select: { name: true } }, bed: { select: { bedNumber: true } }, session: { select: { name: true, startTime: true, endTime: true } } },
      }).catch(() => null),
      db.hospDoctorAppointment.findFirst({
        where: { tenantId: ctx.tenantId, patientId: patient.id, appointmentDate: { gte: new Date() }, status: { not: "CANCELLED" } },
        orderBy: { appointmentDate: "asc" },
        include: { doctor: { select: { name: true } } },
      }).catch(() => null),
    ])
    out["hospital.next_booking.reference"] = nextChemo?.bookingRef || nextDoctorAppointment?.appointmentRef || ""
    out["hospital.next_booking.type"] = nextChemo ? "treatment" : nextDoctorAppointment ? "doctor appointment" : ""
    out["hospital.next_booking.date"] = (nextChemo?.bookingDate || nextDoctorAppointment?.appointmentDate)?.toISOString() || ""
    out["hospital.next_booking.status"] = nextChemo?.status || nextDoctorAppointment?.status || ""
    out["hospital.next_booking.doctor"] = nextChemo?.doctor?.name || nextDoctorAppointment?.doctor?.name || ""
    out["hospital.next_booking.bed"] = nextChemo?.bed?.bedNumber || ""
    out["hospital.next_booking.session"] = nextChemo?.session ? `${nextChemo.session.name} (${nextChemo.session.startTime}-${nextChemo.session.endTime})` : ""
  }
  if (customer?.customFields && typeof customer.customFields === "object" && !Array.isArray(customer.customFields)) {
    for (const [key, value] of Object.entries(customer.customFields as Record<string, unknown>)) {
      if (["string", "number", "boolean"].includes(typeof value)) out[`customer.custom.${key}`] = String(value)
    }
  }
  return out
}

export function runtimeContextText(values: Record<string, string>): string {
  return Object.entries(values)
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n")
    .slice(0, 5000)
}
