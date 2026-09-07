import { db } from "@/lib/db"

export type FlowRuntimeContext = {
  tenantId: string
  customerId: string
  customerPhone: string
}

/**
 * Loads only the current customer's live workspace data for a flow run.
 * Values are flat on purpose: they can be used directly as {{tokens}} and
 * are also safe to pass to the AI node as a small, readable context block.
 */
export async function loadFlowRuntimeData(ctx: FlowRuntimeContext): Promise<Record<string, string>> {
  const [customer, latestOrder, latestAppointment, latestRestaurantOrder, patient] = await Promise.all([
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
