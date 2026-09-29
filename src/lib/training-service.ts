import { db, raw } from "@/lib/db"
import { PLATFORM } from "@/lib/tenant"
import { sendWhatsApp } from "@/lib/flow-delivery"
import * as crypto from "node:crypto"

export * from "./training-types"

import {
  type Course,
  type Registration,
  type CertificateRecord,
  type FeedbackRecord,
  type AttendeeRecord,
  type RegisterCourseInput,
  type RegistrationStage,
  type PaymentStatus,
  type PaymentMethod,
  type RegistrationSource,
  SEED_COURSE_BSC,
  calculateRegistrationPricing,
} from "./training-types"


// ============================================================================
// DATA STORAGE & RETRIEVAL HELPERS
// ============================================================================

const COURSES_SETTING_KEY = "training_course_catalog"
const REGISTRATIONS_SETTING_KEY = "training_registrations"
const CERTIFICATES_SETTING_KEY = "training_certificates"
const FEEDBACK_SETTING_KEY = "training_feedback"

/**
 * Fetch all courses for a tenant, automatically seeding default sample course if empty
 */
export async function getTenantCourses(tenantId: string): Promise<Course[]> {
  const tid = tenantId || PLATFORM
  const setting = await db.systemSetting.findFirst({
    where: { key: COURSES_SETTING_KEY, tenantId: tid },
  })

  let courses: Course[] = []
  if (setting?.value) {
    try {
      courses = JSON.parse(setting.value)
    } catch {
      courses = []
    }
  }

  if (courses.length === 0) {
    // Seed default sample course
    const now = new Date().toISOString()
    const seededCourse: Course = {
      ...SEED_COURSE_BSC,
      tenantId: tid,
      createdAt: now,
      updatedAt: now,
    }
    courses = [seededCourse]

    await db.systemSetting.upsert({
      where: { tenantId_key: { tenantId: tid, key: COURSES_SETTING_KEY } },
      update: { value: JSON.stringify(courses), type: "JSON", category: "TRAINING" },
      create: { tenantId: tid, key: COURSES_SETTING_KEY, value: JSON.stringify(courses), type: "JSON", category: "TRAINING" },
    })
  }

  return courses
}

/**
 * Find single course by ID or slug
 */
export async function getCourseByIdOrSlug(tenantId: string, idOrSlug: string): Promise<Course | null> {
  const courses = await getTenantCourses(tenantId)
  return courses.find(c => c.id === idOrSlug || c.slug === idOrSlug || c.courseId === idOrSlug) || null
}

/**
 * Save or update a course
 */
export async function saveTenantCourse(tenantId: string, courseData: Partial<Course>): Promise<Course> {
  const tid = tenantId || PLATFORM
  const existing = await getTenantCourses(tid)
  const now = new Date().toISOString()

  const id = courseData.id || `course_${Date.now()}`
  const slug =
    courseData.slug ||
    (courseData.name || "course")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

  const courseId = courseData.courseId || `CRS-${Date.now().toString().slice(-4)}`

  const fullCourse: Course = {
    id,
    courseId,
    tenantId: tid,
    slug,
    name: courseData.name || "Untitled Course",
    shortTitle: courseData.shortTitle || courseData.name || "Course",
    category: courseData.category || "General",
    type: courseData.type || "Training",
    description: courseData.description || "",
    learningObjectives: Array.isArray(courseData.learningObjectives) ? courseData.learningObjectives : [],
    highlights: Array.isArray(courseData.highlights) ? courseData.highlights : [],
    targetAudience: Array.isArray(courseData.targetAudience) ? courseData.targetAudience : [],
    prerequisites: Array.isArray(courseData.prerequisites) ? courseData.prerequisites : [],
    certificationDetails: courseData.certificationDetails || "Certificate of Completion",
    bannerUrl: courseData.bannerUrl || SEED_COURSE_BSC.bannerUrl,
    status: courseData.status || "PUBLISHED",
    landingPageEnabled: courseData.landingPageEnabled !== false,

    trainerName: courseData.trainerName || "Lead Instructor",
    trainerDesignation: courseData.trainerDesignation || "Senior Consultant",
    trainerBio: courseData.trainerBio || "",
    trainerImage: courseData.trainerImage || SEED_COURSE_BSC.trainerImage,
    trainerCompany: courseData.trainerCompany || "Training Institute",
    trainerEmail: courseData.trainerEmail || "",
    trainerPhone: courseData.trainerPhone || "",
    trainerSocials: courseData.trainerSocials || {},

    startDate: courseData.startDate || "2026-10-13",
    endDate: courseData.endDate || "2026-10-14",
    startTime: courseData.startTime || "09:00 AM",
    endTime: courseData.endTime || "04:00 PM",
    numDays: courseData.numDays || 2,
    duration: courseData.duration || "2 Days",
    timezone: courseData.timezone || "Asia/Muscat (GST, UTC+4)",

    mode: courseData.mode || "In-person",
    venueName: courseData.venueName || "Muscat Executive Center",
    address: courseData.address || "Ruwi, Muscat",
    city: courseData.city || "Muscat",
    country: courseData.country || "Oman",
    mapUrl: courseData.mapUrl || "",
    meetingUrl: courseData.meetingUrl || "",

    maxSeats: Number(courseData.maxSeats) || 30,
    availableSeats: Number(courseData.availableSeats ?? courseData.maxSeats ?? 30),
    reservedSeats: Number(courseData.reservedSeats) || 0,
    confirmedSeats: Number(courseData.confirmedSeats) || 0,
    waitingList: Number(courseData.waitingList) || 0,

    standardPrice: Number(courseData.standardPrice) || 500,
    discountPrice: courseData.discountPrice ? Number(courseData.discountPrice) : undefined,
    earlyBirdPrice: courseData.earlyBirdPrice ? Number(courseData.earlyBirdPrice) : undefined,
    corporatePrice: courseData.corporatePrice ? Number(courseData.corporatePrice) : undefined,
    groupPrice: courseData.groupPrice ? Number(courseData.groupPrice) : undefined,
    currency: courseData.currency || "OMR",
    taxPercent: Number(courseData.taxPercent) || 0,
    vatPercent: Number(courseData.vatPercent) || 5,
    paymentTerms: courseData.paymentTerms || "Full payment upon registration.",

    offerType: courseData.offerType || "NONE",
    offerTitle: courseData.offerTitle || "",
    offerDescription: courseData.offerDescription || "",
    discountPercent: courseData.discountPercent ? Number(courseData.discountPercent) : undefined,
    discountAmount: courseData.discountAmount ? Number(courseData.discountAmount) : undefined,
    earlyBirdDeadline: courseData.earlyBirdDeadline,

    whatsappNumber: courseData.whatsappNumber || "+96892009161",
    keyword: courseData.keyword || "COURSE",
    botFlowId: courseData.botFlowId,
    reminderSettings: courseData.reminderSettings || { days7: true, day1: true, hours2: true },
    autoConfirmation: courseData.autoConfirmation !== false,
    autoCertificate: courseData.autoCertificate !== false,

    customFields: Array.isArray(courseData.customFields) ? courseData.customFields : [],
    faqs: Array.isArray(courseData.faqs) ? courseData.faqs : [],
    termsAndConditions: courseData.termsAndConditions || "",

    createdAt: courseData.createdAt || now,
    updatedAt: now,
  }

  const index = existing.findIndex(c => c.id === id)
  if (index >= 0) {
    existing[index] = fullCourse
  } else {
    existing.push(fullCourse)
  }

  await db.systemSetting.upsert({
    where: { tenantId_key: { tenantId: tid, key: COURSES_SETTING_KEY } },
    update: { value: JSON.stringify(existing), type: "JSON", category: "TRAINING" },
    create: { tenantId: tid, key: COURSES_SETTING_KEY, value: JSON.stringify(existing), type: "JSON", category: "TRAINING" },
  })

  return fullCourse
}

/**
 * Delete a course
 */
export async function deleteTenantCourse(tenantId: string, id: string): Promise<boolean> {
  const tid = tenantId || PLATFORM
  const existing = await getTenantCourses(tid)
  const filtered = existing.filter(c => c.id !== id)

  await db.systemSetting.upsert({
    where: { tenantId_key: { tenantId: tid, key: COURSES_SETTING_KEY } },
    update: { value: JSON.stringify(filtered), type: "JSON", category: "TRAINING" },
    create: { tenantId: tid, key: COURSES_SETTING_KEY, value: JSON.stringify(filtered), type: "JSON", category: "TRAINING" },
  })

  return true
}

// ============================================================================
// REGISTRATION MANAGEMENT & CRM INTEGRATION
// ============================================================================

export async function getTenantRegistrations(tenantId: string): Promise<Registration[]> {
  const tid = tenantId || PLATFORM
  const setting = await db.systemSetting.findFirst({
    where: { key: REGISTRATIONS_SETTING_KEY, tenantId: tid },
  })

  if (!setting?.value) return []
  try {
    return JSON.parse(setting.value)
  } catch {
    return []
  }
}

/**
 * Save registrations list
 */
async function persistRegistrations(tenantId: string, list: Registration[]) {
  const tid = tenantId || PLATFORM
  await db.systemSetting.upsert({
    where: { tenantId_key: { tenantId: tid, key: REGISTRATIONS_SETTING_KEY } },
    update: { value: JSON.stringify(list), type: "JSON", category: "TRAINING" },
    create: { tenantId: tid, key: REGISTRATIONS_SETTING_KEY, value: JSON.stringify(list), type: "JSON", category: "TRAINING" },
  })
}


/**
 * Register a delegate or corporate group for a course.
 * Performs:
 * 1. Course lookup and seat capacity validation
 * 2. Offer & BOGO calculation (e.g. 1 seat with BOGO -> 1 paid + 1 free = 2 attendees)
 * 3. Individual attendee list generation with unique secure QR tokens
 * 4. Contact de-duplication in CRM `Customer` database
 * 5. Seat decrementation & reservation in course catalog
 * 6. Registration record persistence
 */
export async function createCourseRegistration(
  tenantId: string,
  input: RegisterCourseInput,
): Promise<{ registration: Registration; course: Course }> {
  const tid = tenantId || PLATFORM
  const course = await getCourseByIdOrSlug(tid, input.courseId)
  if (!course) {
    throw new Error(`Course not found: ${input.courseId}`)
  }

  // 1. Calculate pricing & seats breakdown
  const pricing = calculateRegistrationPricing(course, input.numberOfSeats)

  // Validate seat capacity
  if (course.availableSeats < pricing.totalAttendeesAllowed) {
    // If capacity exceeded, allow waitlist status
    if (course.availableSeats <= 0) {
      // Course is full
      throw new Error(`Course is fully booked. Only ${course.availableSeats} seat(s) remaining.`)
    }
  }

  const now = new Date().toISOString()
  const regId = `reg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const regNumber = `REG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`

  // 2. Build Attendees roster
  const attendees: AttendeeRecord[] = []
  const inputAttendees = input.attendees || []

  // Ensure first attendee defaults to the primary buyer if not supplied
  const totalAttendees = pricing.totalAttendeesAllowed
  for (let i = 0; i < totalAttendees; i++) {
    const isFree = i >= pricing.paidSeats
    const attendeeInput = inputAttendees[i]
    const qrToken = `att_${crypto.randomBytes(12).toString("hex")}`

    let name = attendeeInput?.name?.trim()
    let email = attendeeInput?.email?.trim()
    let phone = attendeeInput?.phone?.trim()
    let designation = attendeeInput?.designation?.trim()
    let company = attendeeInput?.company?.trim() || input.companyName?.trim()

    if (i === 0 && !name) {
      name = input.customerName
      email = input.customerEmail
      phone = input.customerPhone
      designation = input.jobTitle
    } else if (!name) {
      name = `Attendee ${i + 1} (${isFree ? "Free Guest" : "Delegate"})`
      email = input.customerEmail
      phone = input.customerPhone
    }

    attendees.push({
      id: `att_${Date.now()}_${i + 1}`,
      attendeeNumber: i + 1,
      name,
      email: email || "",
      phone: phone || input.customerPhone,
      designation: designation || "",
      company: company || "",
      isFreeSeat: isFree,
      checkInStatus: "PENDING",
      qrToken,
    })
  }

  const initialStatus: RegistrationStage =
    input.paymentMethod === "CASH" || input.paymentMethod === "MANUAL"
      ? "REGISTRATION_SUBMITTED"
      : "AWAITING_PAYMENT"

  const registration: Registration = {
    id: regId,
    registrationNumber: regNumber,
    tenantId: tid,
    courseId: course.id,
    courseSlug: course.slug,
    courseName: course.name,

    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerWhatsApp: input.customerWhatsApp || input.customerPhone,
    customerEmail: input.customerEmail,
    companyName: input.companyName,
    jobTitle: input.jobTitle,
    country: input.country || "Oman",
    billingAddress: input.billingAddress,
    notes: input.notes,

    numberOfSeats: pricing.totalAttendeesAllowed,
    paidSeats: pricing.paidSeats,
    freeSeats: pricing.freeSeats,
    unitPrice: pricing.unitPrice,
    subtotal: pricing.subtotal,
    discountAmount: pricing.discountAmount,
    vatAmount: pricing.vatAmount,
    totalAmount: pricing.totalAmount,
    balanceAmount: pricing.totalAmount,
    currency: course.currency,
    offerApplied: pricing.offerApplied,

    status: initialStatus,
    paymentStatus: "UNPAID",
    paymentMethod: input.paymentMethod || "PAYMENT_LINK",
    source: input.source || "WEBSITE",

    attendees,
    customValues: input.customValues || {},
    createdAt: now,
    updatedAt: now,
  }

  // 3. Persist registration
  const allRegistrations = await getTenantRegistrations(tid)
  allRegistrations.unshift(registration)
  await persistRegistrations(tid, allRegistrations)

  // 4. Update Course Seats
  const updatedCourse = {
    ...course,
    reservedSeats: course.reservedSeats + pricing.totalAttendeesAllowed,
    availableSeats: Math.max(0, course.availableSeats - pricing.totalAttendeesAllowed),
    updatedAt: now,
  }
  await saveTenantCourse(tid, updatedCourse)

  // 5. CRM Customer De-duplication
  try {
    await upsertCrmCustomer(tid, {
      name: input.customerName,
      phone: input.customerPhone,
      email: input.customerEmail,
      company: input.companyName,
      courseName: course.name,
      courseSlug: course.slug,
      source: input.source || "TRAINING",
      amount: pricing.totalAmount,
    })
  } catch (crmErr) {
    console.error("[training] Error syncing with CRM customer:", crmErr)
  }

  return { registration, course: updatedCourse }
}

/**
 * Sync contact with CRM `Customer` table
 */
async function upsertCrmCustomer(
  tenantId: string,
  params: {
    name: string
    phone: string
    email: string
    company?: string
    courseName: string
    courseSlug: string
    source: string
    amount: number
  },
) {
  const cleanPhone = params.phone.replace(/[^0-9+]/g, "")
  if (!cleanPhone) return

  const existing = await raw.customer.findFirst({
    where: {
      phone: cleanPhone,
      ...(tenantId ? { tenantId } : {}),
    },
  })

  const courseTag = `course:${params.courseSlug}`
  const trainingTag = "training-participant"

  if (existing) {
    const existingTags = Array.isArray(existing.tags) ? (existing.tags as string[]) : []
    const newTags = Array.from(new Set([...existingTags, trainingTag, courseTag]))

    await raw.customer.update({
      where: { id: existing.id },
      data: {
        name: existing.name || params.name,
        email: existing.email || params.email,
        tags: newTags,
        totalBookings: { increment: 1 },
        totalSpent: { increment: params.amount },
        lastContactAt: new Date(),
      },
    })
  } else {
    await raw.customer.create({
      data: {
        tenantId,
        name: params.name,
        phone: cleanPhone,
        email: params.email,
        channel: "WHATSAPP",
        source: params.source,
        tags: [trainingTag, courseTag],
        totalBookings: 1,
        totalSpent: params.amount,
        stage: "CUSTOMER",
      },
    })
  }
}

/**
 * Update registration status / payment
 */
export async function updateRegistrationStatus(
  tenantId: string,
  registrationId: string,
  updates: Partial<Registration>,
): Promise<Registration | null> {
  const tid = tenantId || PLATFORM
  const all = await getTenantRegistrations(tid)
  const index = all.findIndex(r => r.id === registrationId)
  if (index < 0) return null

  const current = all[index]
  const updated: Registration = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  // Handle seat transition if payment confirms
  if (updates.paymentStatus === "PAID" && current.paymentStatus !== "PAID") {
    updated.status = "CONFIRMED"
    updated.balanceAmount = 0

    // Transition reserved seats to confirmed seats
    const course = await getCourseByIdOrSlug(tid, current.courseId)
    if (course) {
      const confirmedSeats = course.confirmedSeats + current.numberOfSeats
      const reservedSeats = Math.max(0, course.reservedSeats - current.numberOfSeats)
      await saveTenantCourse(tid, {
        ...course,
        confirmedSeats,
        reservedSeats,
      })
    }
  }

  all[index] = updated
  await persistRegistrations(tid, all)
  return updated
}

// ============================================================================
// ATTENDANCE & QR CHECK-IN
// ============================================================================

export interface CheckInResult {
  success: boolean
  message: string
  attendee?: AttendeeRecord
  registration?: Registration
  course?: Course
  alreadyCheckedIn?: boolean
}

/**
 * Process check-in by Attendee QR Token
 */
export async function processAttendeeCheckIn(tenantId: string, qrToken: string): Promise<CheckInResult> {
  const tid = tenantId || PLATFORM
  const allRegistrations = await getTenantRegistrations(tid)

  for (const reg of allRegistrations) {
    const attendee = reg.attendees.find(a => a.qrToken === qrToken || a.id === qrToken)
    if (attendee) {
      if (attendee.checkInStatus === "CHECKED_IN") {
        const course = await getCourseByIdOrSlug(tid, reg.courseId)
        return {
          success: true,
          alreadyCheckedIn: true,
          message: `${attendee.name} was already checked in on ${new Date(attendee.checkInTime!).toLocaleTimeString()}.`,
          attendee,
          registration: reg,
          course: course || undefined,
        }
      }

      // Mark checked in
      const now = new Date().toISOString()
      attendee.checkInStatus = "CHECKED_IN"
      attendee.checkInTime = now
      reg.status = "ATTENDED"
      reg.updatedAt = now

      await persistRegistrations(tid, allRegistrations)
      const course = await getCourseByIdOrSlug(tid, reg.courseId)

      return {
        success: true,
        alreadyCheckedIn: false,
        message: `Welcome ${attendee.name}! Attendance verified successfully.`,
        attendee,
        registration: reg,
        course: course || undefined,
      }
    }
  }

  return {
    success: false,
    message: "Invalid or unrecognized attendee check-in token.",
  }
}

// ============================================================================
// CERTIFICATE MANAGEMENT
// ============================================================================

export async function getTenantCertificates(tenantId: string): Promise<CertificateRecord[]> {
  const tid = tenantId || PLATFORM
  const setting = await db.systemSetting.findFirst({
    where: { key: CERTIFICATES_SETTING_KEY, tenantId: tid },
  })

  if (!setting?.value) return []
  try {
    return JSON.parse(setting.value)
  } catch {
    return []
  }
}

export async function issueAttendeeCertificate(
  tenantId: string,
  registrationId: string,
  attendeeId: string,
): Promise<CertificateRecord> {
  const tid = tenantId || PLATFORM
  const allRegistrations = await getTenantRegistrations(tid)
  const reg = allRegistrations.find(r => r.id === registrationId)
  if (!reg) throw new Error("Registration not found")

  const attendee = reg.attendees.find(a => a.id === attendeeId)
  if (!attendee) throw new Error("Attendee not found")

  const course = await getCourseByIdOrSlug(tid, reg.courseId)
  if (!course) throw new Error("Course not found")

  const certId = `CERT-${course.courseId || "CRS"}-${Math.floor(100000 + Math.random() * 900000)}`
  const verificationHash = crypto.createHash("sha256").update(`${certId}:${attendee.name}:${course.name}`).digest("hex").slice(0, 16)
  const now = new Date().toISOString()

  const certificate: CertificateRecord = {
    id: certId,
    verificationHash,
    tenantId: tid,
    courseId: course.id,
    courseName: course.name,
    registrationId: reg.id,
    attendeeId: attendee.id,
    recipientName: attendee.name,
    recipientEmail: attendee.email || reg.customerEmail,
    issueDate: now.slice(0, 10),
    trainerName: course.trainerName,
    trainerCompany: course.trainerCompany,
    durationHours: course.duration,
    credentialUrl: `https://app.fizmoh.cloud/training/verify-certificate/${certId}`,
    createdAt: now,
  }

  // Update attendee record with certificate info
  attendee.certificateId = certId
  attendee.certificateIssuedAt = now
  attendee.certificateUrl = certificate.credentialUrl
  await persistRegistrations(tid, allRegistrations)

  // Persist to certificates catalog
  const certificates = await getTenantCertificates(tid)
  certificates.unshift(certificate)

  await db.systemSetting.upsert({
    where: { tenantId_key: { tenantId: tid, key: CERTIFICATES_SETTING_KEY } },
    update: { value: JSON.stringify(certificates), type: "JSON", category: "TRAINING" },
    create: { tenantId: tid, key: CERTIFICATES_SETTING_KEY, value: JSON.stringify(certificates), type: "JSON", category: "TRAINING" },
  })

  return certificate
}

export async function verifyCertificateById(certId: string): Promise<CertificateRecord | null> {
  const setting = await db.systemSetting.findFirst({
    where: { key: CERTIFICATES_SETTING_KEY },
  })
  if (!setting?.value) return null
  try {
    const list: CertificateRecord[] = JSON.parse(setting.value)
    return list.find(c => c.id === certId || c.verificationHash === certId) || null
  } catch {
    return null
  }
}

// ============================================================================
// FEEDBACK & REVIEWS
// ============================================================================

export async function getTenantFeedback(tenantId: string, courseId?: string): Promise<FeedbackRecord[]> {
  const tid = tenantId || PLATFORM
  const setting = await db.systemSetting.findFirst({
    where: { key: FEEDBACK_SETTING_KEY, tenantId: tid },
  })

  if (!setting?.value) return []
  try {
    const list: FeedbackRecord[] = JSON.parse(setting.value)
    return courseId ? list.filter(f => f.courseId === courseId) : list
  } catch {
    return []
  }
}

export async function submitCourseFeedback(tenantId: string, feedback: Omit<FeedbackRecord, "id" | "tenantId" | "createdAt">): Promise<FeedbackRecord> {
  const tid = tenantId || PLATFORM
  const existing = await getTenantFeedback(tid)
  const now = new Date().toISOString()

  const record: FeedbackRecord = {
    ...feedback,
    id: `fb_${Date.now()}`,
    tenantId: tid,
    createdAt: now,
  }

  existing.unshift(record)

  await db.systemSetting.upsert({
    where: { tenantId_key: { tenantId: tid, key: FEEDBACK_SETTING_KEY } },
    update: { value: JSON.stringify(existing), type: "JSON", category: "TRAINING" },
    create: { tenantId: tid, key: FEEDBACK_SETTING_KEY, value: JSON.stringify(existing), type: "JSON", category: "TRAINING" },
  })

  return record
}

// ============================================================================
// WHATSAPP DYNAMIC VARIABLES RESOLVER
// ============================================================================

/**
 * Resolves all required WhatsApp flow & message template variables for course communications
 */
export function resolveTrainingVariables(
  course: Course,
  registration?: Registration,
  attendee?: AttendeeRecord,
): Record<string, string> {
  return {
    // Course variables
    course_name: course.name,
    course_id: course.courseId,
    course_date: `${course.startDate} to ${course.endDate}`,
    course_start_date: course.startDate,
    course_end_date: course.endDate,
    course_time: `${course.startTime} - ${course.endTime}`,
    course_duration: course.duration,
    course_location: `${course.venueName}, ${course.city}, ${course.country}`,
    course_map_url: course.mapUrl || "",
    course_price: `${course.currency} ${course.standardPrice}`,
    course_offer: course.offerTitle || "Standard Rate",
    available_seats: String(course.availableSeats),
    trainer_name: course.trainerName,
    trainer_designation: course.trainerDesignation,

    // Customer / Buyer variables
    customer_name: registration?.customerName || "",
    customer_mobile: registration?.customerPhone || "",
    customer_email: registration?.customerEmail || "",
    company_name: registration?.companyName || "",
    job_title: registration?.jobTitle || "",

    // Registration variables
    registration_id: registration?.registrationNumber || "",
    registration_status: registration?.status || "",
    number_of_seats: String(registration?.numberOfSeats || 1),
    paid_seats: String(registration?.paidSeats || 1),
    free_seats: String(registration?.freeSeats || 0),
    payment_status: registration?.paymentStatus || "UNPAID",
    payment_amount: registration ? `${course.currency} ${registration.totalAmount.toFixed(2)}` : "",
    balance_amount: registration ? `${course.currency} ${registration.balanceAmount.toFixed(2)}` : "",
    payment_link: registration?.paymentLink || `https://app.fizmoh.cloud/training/${course.slug}?reg=${registration?.id}`,

    // Attendee variables
    attendee_name: attendee?.name || registration?.customerName || "",
    attendee_email: attendee?.email || registration?.customerEmail || "",
    attendee_phone: attendee?.phone || registration?.customerPhone || "",
    certificate_url: attendee?.certificateUrl || "",
  }
}

/**
 * Helper to interpolate any string with {{variable}} placeholders
 */
export function interpolateTrainingText(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    return vars[key] !== undefined ? vars[key] : match
  })
}
