// ============================================================================
// TRAINING & COURSE MANAGEMENT TYPES & SHARED UTILS (CLIENT & SERVER SAFE)
// ============================================================================

export type CourseType =
  | "Training"
  | "Workshop"
  | "Seminar"
  | "Webinar"
  | "Certification"
  | "Conference"
  | "Corporate Training"

export type TrainingMode = "In-person" | "Online" | "Hybrid"

export type CourseStatus = "DRAFT" | "PUBLISHED" | "REGISTRATION_CLOSED" | "COMPLETED" | "CANCELLED"

export type OfferType =
  | "NONE"
  | "BOGO" // Pay 1 get 1 free
  | "B2G1" // Buy 2 get 1 free
  | "PERCENT" // Percentage discount
  | "FIXED" // Fixed amount discount
  | "CORPORATE" // Tiered corporate package
  | "EARLY_BIRD" // Date-based early bird

export type RegistrationStage =
  | "NEW_LEAD"
  | "INTERESTED"
  | "REGISTRATION_STARTED"
  | "REGISTRATION_SUBMITTED"
  | "AWAITING_PAYMENT"
  | "PARTIALLY_PAID"
  | "PAYMENT_CONFIRMED"
  | "CONFIRMED"
  | "WAITLISTED"
  | "CANCELLED"
  | "ATTENDED"
  | "NO_SHOW"
  | "COMPLETED"

export type RegistrationSource =
  | "WEBSITE"
  | "WHATSAPP"
  | "QR_CODE"
  | "FACEBOOK"
  | "INSTAGRAM"
  | "GOOGLE_ADS"
  | "MANUAL"
  | "REFERRAL"
  | "API"
  | "OTHER"

export type PaymentStatus = "UNPAID" | "PENDING" | "PARTIALLY_PAID" | "PAID" | "REFUNDED" | "FAILED"
export type PaymentMethod = "PAYMENT_LINK" | "BANK_TRANSFER" | "CASH" | "CARD" | "ONLINE" | "MANUAL"

export interface CustomFormField {
  id: string
  name: string
  label: string
  type: "text" | "number" | "email" | "phone" | "dropdown" | "radio" | "checkbox" | "date" | "textarea"
  required: boolean
  options?: string[]
}

export interface CourseFAQ {
  question: string
  answer: string
}

export interface Course {
  id: string
  courseId: string // Human identifier e.g. BSC-2026-01
  tenantId: string
  slug: string
  name: string
  shortTitle: string
  category: string
  type: CourseType
  description: string
  learningObjectives: string[]
  highlights: string[]
  targetAudience: string[]
  prerequisites: string[]
  certificationDetails: string
  bannerUrl: string
  status: CourseStatus
  landingPageEnabled: boolean

  // Trainer Information
  trainerName: string
  trainerDesignation: string
  trainerBio: string
  trainerImage: string
  trainerCompany: string
  trainerEmail: string
  trainerPhone: string
  trainerSocials?: { linkedin?: string; twitter?: string; website?: string }

  // Schedule
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  startTime: string // e.g. 09:00 AM
  endTime: string // e.g. 04:00 PM
  numDays: number
  duration: string // e.g. 2 Days (14 Hours)
  timezone: string

  // Mode & Venue
  mode: TrainingMode
  venueName: string
  address: string
  city: string
  country: string
  mapUrl: string
  meetingUrl?: string

  // Capacity (optional / unlimited if null)
  maxSeats?: number | null
  availableSeats?: number | null
  reservedSeats: number
  confirmedSeats: number
  waitingList: number

  // Pricing
  standardPrice: number
  discountPrice?: number
  earlyBirdPrice?: number
  corporatePrice?: number
  groupPrice?: number
  currency: string
  taxPercent: number
  vatPercent: number
  paymentTerms: string

  // Offers
  offerType: OfferType
  offerTitle: string
  offerDescription: string
  discountPercent?: number
  discountAmount?: number
  earlyBirdDeadline?: string

  // WhatsApp Automation
  whatsappNumber?: string
  keyword?: string
  botFlowId?: string
  reminderSettings: {
    days7: boolean
    day1: boolean
    hours2: boolean
  }
  autoConfirmation: boolean
  autoCertificate: boolean

  // Certificate Template Customization
  certificateTitle?: string
  certificateSubtitle?: string
  certificateBodyText?: string
  showTrainerDesignation?: boolean
  showCourseDates?: boolean
  customCourseDates?: string
  certificateAccentColor?: string

  // Form & Content
  customFields: CustomFormField[]
  faqs: CourseFAQ[]
  termsAndConditions: string

  createdAt: string
  updatedAt: string
}

export interface AttendeeRecord {
  id: string
  attendeeNumber: number
  name: string
  email: string
  phone: string
  designation?: string
  company?: string
  isFreeSeat: boolean
  checkInStatus: "PENDING" | "CHECKED_IN"
  checkInTime?: string
  qrToken: string
  certificateId?: string
  certificateIssuedAt?: string
  certificateUrl?: string
}

export interface Registration {
  id: string
  registrationNumber: string
  tenantId: string
  courseId: string
  courseSlug: string
  courseName: string

  // Buyer
  customerName: string
  customerPhone: string
  customerWhatsApp: string
  customerEmail: string
  companyName?: string
  jobTitle?: string
  country: string
  billingAddress?: string
  notes?: string

  // Pricing & Seats
  numberOfSeats: number
  paidSeats: number
  freeSeats: number
  unitPrice: number
  subtotal: number
  discountAmount: number
  vatAmount: number
  totalAmount: number
  balanceAmount: number
  currency: string
  offerApplied?: string

  // Status & Payment
  status: RegistrationStage
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  paymentReference?: string
  paymentLink?: string
  paymentReceiptUrl?: string
  paymentProofUrl?: string
  source: RegistrationSource

  // Attendees
  attendees: AttendeeRecord[]
  customValues?: Record<string, any>

  createdAt: string
  updatedAt: string
}

export interface CertificateRecord {
  id: string // e.g. CERT-BSC-2026-XXXX
  verificationHash: string
  tenantId: string
  courseId: string
  courseName: string
  registrationId: string
  attendeeId: string
  recipientName: string
  recipientEmail: string
  issueDate: string
  trainerName: string
  trainerCompany: string
  trainerDesignation?: string
  showTrainerDesignation?: boolean
  certificateTitle?: string
  certificateSubtitle?: string
  certificateBodyText?: string
  courseDates?: string
  showCourseDates?: boolean
  durationHours: string
  credentialUrl: string
  accentColor?: string
  createdAt: string
  updatedAt?: string
}

export interface FeedbackRecord {
  id: string
  tenantId: string
  courseId: string
  registrationId?: string
  attendeeName: string
  attendeeEmail: string
  overallRating: number // 1-5
  trainerRating: number // 1-5
  contentRating: number // 1-5
  venueRating: number // 1-5
  comments: string
  recommendToOthers: boolean
  createdAt: string
}

export interface RegisterCourseInput {
  courseId: string
  customerName: string
  customerPhone: string
  customerWhatsApp?: string
  customerEmail: string
  companyName?: string
  jobTitle?: string
  country?: string
  billingAddress?: string
  notes?: string
  numberOfSeats: number
  source?: RegistrationSource
  paymentMethod?: PaymentMethod
  paymentStatus?: PaymentStatus
  status?: RegistrationStage
  paymentReceiptUrl?: string
  paymentProofUrl?: string
  attendees?: Array<{
    name: string
    email: string
    phone: string
    designation?: string
    company?: string
  }>
  customValues?: Record<string, any>
}

// ============================================================================
// DEFAULT SEED COURSE
// ============================================================================

export const SEED_COURSE_BSC: Omit<Course, "tenantId" | "createdAt" | "updatedAt"> = {
  id: "course_bsc_certified_pro_2026",
  courseId: "BSC-2026-OM",
  slug: "ai-powered-balanced-scorecard-professional",
  name: "AI-Powered Certified Balanced Scorecard Professional",
  shortTitle: "Certified BSC Professional with AI",
  category: "Strategy & Executive Leadership",
  type: "Certification",
  description:
    "Master contemporary corporate strategy formulation, KPI cascading, and automated performance scorecard execution powered by Generative AI analytics. Endorsed by Tanfidh Management Consultants for executive leaders, PMO directors, and performance managers across the GCC.",
  learningObjectives: [
    "Design robust 4-perspective Balanced Scorecards (Financial, Customer, Internal Process, Learning & Growth)",
    "Leverage Generative AI for real-time strategy mapping, objective alignment, and automated initiative prioritization",
    "Establish leading vs lagging Key Performance Indicators (KPIs) with mathematical thresholds and tolerance bands",
    "Cascade corporate scorecards across business units, departments, and individual performance contracts",
    "Integrate executive dashboards and automated WhatsApp alert triggers for performance exceptions",
  ],
  highlights: [
    "2 Full Days of Executive Masterclass & Hands-on Lab",
    "Official Certificate of Completion from Tanfidh Management Consultants",
    "Complete Strategy Automation & Balanced Scorecard Toolkit with Excel/PowerBI templates",
    "Sheraton 5-Star Gourmet Lunch & Executive Networking Reception",
    "Special Offer: Pay for 1 seat and get 1 seat FREE",
  ],
  targetAudience: [
    "Chief Executive Officers & Board Directors",
    "Strategy & Transformation Directors",
    "PMO (Project Management Office) Heads",
    "HR & Corporate Performance Managers",
    "Government & Institutional Planners in Oman & GCC",
  ],
  prerequisites: [
    "Fundamental understanding of business management or strategy planning.",
    "Laptop recommended for AI scorecard modeling lab sessions.",
  ],
  certificationDetails:
    "Certified Balanced Scorecard Professional Credential issued with unique digital cryptographic QR validation, verifiable globally online.",
  bannerUrl:
    "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1600&auto=format&fit=crop",
  status: "PUBLISHED",
  landingPageEnabled: true,

  trainerName: "Said bin Saif Al Harthi",
  trainerDesignation: "Executive Director and Senior Consultant and Trainer",
  trainerBio:
    "Said advises and trains organizations on strategy development, translation and execution, Balanced Scorecards, KPI design, cascading, dashboards and performance reviews. His work spans public and private sector assignments in Oman and Tanzania, helping leadership and departmental teams turn strategic plans into measurable actions. His training combines practical frameworks, facilitated exercises and examples drawn from consulting practice.",
  trainerImage: "/said-al-harthi.jpg",
  trainerCompany: "Tanfidh Management Consultants",
  trainerEmail: "saidalharthy@tanfidh.com",
  trainerPhone: "+968 99 355 438",
  trainerSocials: {
    website: "https://www.tanfidh.com",
  },

  startDate: "2026-10-13",
  endDate: "2026-10-14",
  startTime: "09:00 AM",
  endTime: "04:00 PM",
  numDays: 2,
  duration: "2 Days (14 Hours)",
  timezone: "Asia/Muscat (GST, UTC+4)",

  mode: "In-person",
  venueName: "Sheraton Oman Hotel",
  address: "Ruwi High Street, Financial District",
  city: "Muscat",
  country: "Sultanate of Oman",
  mapUrl: "https://maps.google.com/?q=Sheraton+Oman+Hotel+Muscat",
  meetingUrl: "",

  maxSeats: 30,
  availableSeats: 26,
  reservedSeats: 2,
  confirmedSeats: 2,
  waitingList: 0,

  standardPrice: 500,
  discountPrice: 500,
  earlyBirdPrice: 450,
  corporatePrice: 400,
  groupPrice: 420,
  currency: "OMR",
  taxPercent: 0,
  vatPercent: 5,
  paymentTerms: "100% upon confirmation via online card, AmwalPay, or corporate bank transfer with LPO.",

  offerType: "BOGO",
  offerTitle: "Pay for 1 seat, get 1 seat FREE (Buy 1 Get 1 Free)",
  offerDescription:
    "Register for 1 paid delegate and bring a colleague or team member at ZERO additional cost. Includes all training materials, 5-star lunches, and two individual certificates.",
  discountPercent: 0,
  discountAmount: 500,

  whatsappNumber: "+96892009161",
  keyword: "BSC",
  reminderSettings: {
    days7: true,
    day1: true,
    hours2: true,
  },
  autoConfirmation: true,
  autoCertificate: true,

  // Certificate template defaults
  certificateTitle: "Certificate of Completion",
  certificateSubtitle: "This is proudly presented to",
  certificateBodyText: "for successfully completing the rigorous executive requirements, masterclass sessions, and practical strategy modeling for",
  showTrainerDesignation: true,
  showCourseDates: true,
  customCourseDates: "October 14–15, 2026",
  certificateAccentColor: "amber",

  customFields: [
    {
      id: "cf_dietary",
      name: "dietaryRequirements",
      label: "Dietary Preferences or Allergies",
      type: "dropdown",
      required: false,
      options: ["None / Standard", "Vegetarian", "Vegan", "Gluten-Free", "Halal Seafood Only"],
    },
    {
      id: "cf_experience",
      name: "strategyExperience",
      label: "Years of Strategy / KPI Experience",
      type: "dropdown",
      required: false,
      options: ["0-2 years (Beginner)", "3-5 years (Intermediate)", "6-10 years (Senior)", "10+ years (Executive)"],
    },
  ],

  faqs: [
    {
      question: "How does the 'Pay for 1 seat, get 1 seat FREE' offer work?",
      answer:
        "When you purchase 1 standard seat (OMR 500), your booking automatically entitles you to register 2 participants. Both participants receive full access, executive course materials, lunches, and individual certificates upon completion.",
    },
    {
      question: "Will I receive an official certificate?",
      answer:
        "Yes! Each attendee who completes the 2-day session receives a verifiable Certificate of Completion from Tanfidh Management Consultants equipped with an online cryptographic verification QR code.",
    },
    {
      question: "What payment methods are supported?",
      answer:
        "We support direct online card checkout (Debit/Credit/AmwalPay), Corporate Bank Transfer (with immediate seat hold), and Corporate Purchase Orders (LPO).",
    },
    {
      question: "Can I substitute an attendee if someone cannot make it?",
      answer:
        "Yes, colleague substitutions are accepted free of charge up to 24 hours prior to the course start date.",
    },
  ],
  termsAndConditions:
    "Cancellations requested 14 days prior to event receive a 100% refund. Cancellations inside 14 days are non-refundable but transferable to future training cohorts or alternate colleagues. Organizer reserves the right to adjust venue or schedule with advance notification.",
}

// ============================================================================
// OFFER & PRICING ENGINE
// ============================================================================

export interface PricingCalculationResult {
  requestedSeats: number
  paidSeats: number
  freeSeats: number
  totalAttendeesAllowed: number
  unitPrice: number
  subtotal: number
  discountAmount: number
  vatAmount: number
  totalAmount: number
  offerApplied: string
  savingsDescription: string
}

export function calculateRegistrationPricing(
  course: Course,
  requestedSeats: number = 1,
  couponCode?: string,
): PricingCalculationResult {
  const seats = Math.max(1, Number(requestedSeats) || 1)
  const unitPrice = Number(course?.discountPrice && course.discountPrice > 0 ? course.discountPrice : course?.standardPrice) || 650
  const currency = course?.currency || "OMR"
  const vatRate = (Number(course?.vatPercent) || 0) / 100

  let paidSeats = seats
  let freeSeats = 0
  let discountAmount = 0
  let offerApplied = "Standard Registration"
  let savingsDescription = ""

  switch (course.offerType) {
    case "BOGO": {
      paidSeats = Math.ceil(seats / 2)
      freeSeats = paidSeats
      offerApplied = course.offerTitle || "Pay for 1 seat, get 1 seat FREE"
      const regularPriceForAttendees = (paidSeats + freeSeats) * unitPrice
      const actualCharge = paidSeats * unitPrice
      discountAmount = regularPriceForAttendees - actualCharge
      savingsDescription = `You saved ${currency} ${discountAmount.toFixed(2)} with Buy 1 Get 1 Free offer!`
      break
    }

    case "B2G1": {
      const groupsOfTwo = Math.floor(seats / 3)
      const remainder = seats % 3
      if (seats >= 3) {
        paidSeats = groupsOfTwo * 2 + remainder
        freeSeats = groupsOfTwo
      } else {
        paidSeats = seats
        freeSeats = 0
      }
      offerApplied = course.offerTitle || "Buy 2 get 1 FREE"
      discountAmount = freeSeats * unitPrice
      savingsDescription = `You received ${freeSeats} free attendee seat(s)!`
      break
    }

    case "PERCENT": {
      paidSeats = seats
      freeSeats = 0
      const pct = (course.discountPercent || 10) / 100
      discountAmount = paidSeats * unitPrice * pct
      offerApplied = course.offerTitle || `${course.discountPercent || 10}% Special Discount`
      savingsDescription = `Saved ${currency} ${discountAmount.toFixed(2)} (${(course.discountPercent || 10)}% off)`
      break
    }

    case "FIXED": {
      paidSeats = seats
      freeSeats = 0
      discountAmount = Math.min((course.discountAmount || 0) * seats, paidSeats * unitPrice)
      offerApplied = course.offerTitle || `Fixed Discount of ${currency} ${course.discountAmount}`
      savingsDescription = `Saved ${currency} ${discountAmount.toFixed(2)} total`
      break
    }

    case "CORPORATE": {
      paidSeats = seats
      freeSeats = 0
      const corpPrice = course.corporatePrice || unitPrice * 0.8
      discountAmount = seats >= 3 ? (unitPrice - corpPrice) * seats : 0
      offerApplied = seats >= 3 ? (course.offerTitle || "Corporate Volume Package") : "Standard"
      savingsDescription = seats >= 3 ? `Corporate volume rate applied (${currency} ${corpPrice} / seat)` : ""
      break
    }

    case "EARLY_BIRD": {
      paidSeats = seats
      freeSeats = 0
      const ebPrice = course.earlyBirdPrice || unitPrice * 0.85
      const isStillEarly = !course.earlyBirdDeadline || new Date(course.earlyBirdDeadline) > new Date()
      if (isStillEarly) {
        discountAmount = (unitPrice - ebPrice) * seats
        offerApplied = course.offerTitle || "Early Bird Registration Offer"
        savingsDescription = `Early bird rate applied (${currency} ${ebPrice} / seat)`
      }
      break
    }

    default: {
      paidSeats = seats
      freeSeats = 0
      discountAmount = 0
      break
    }
  }

  const subtotal = paidSeats * unitPrice
  const vatAmount = (subtotal - (course.offerType === "BOGO" || course.offerType === "B2G1" ? 0 : discountAmount)) * vatRate
  const totalAmount = Math.max(0, subtotal - (course.offerType === "BOGO" || course.offerType === "B2G1" ? 0 : discountAmount) + vatAmount)
  const totalAttendeesAllowed = paidSeats + freeSeats

  return {
    requestedSeats: seats,
    paidSeats,
    freeSeats,
    totalAttendeesAllowed,
    unitPrice,
    subtotal,
    discountAmount,
    vatAmount,
    totalAmount: Number(totalAmount.toFixed(2)),
    offerApplied,
    savingsDescription,
  }
}

export function resolveTrainingVariables(
  course: Course,
  registration?: Registration,
  attendee?: AttendeeRecord,
): Record<string, string> {
  return {
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

    customer_name: registration?.customerName || "",
    customer_mobile: registration?.customerPhone || "",
    customer_email: registration?.customerEmail || "",
    company_name: registration?.companyName || "",
    job_title: registration?.jobTitle || "",

    registration_id: registration?.registrationNumber || "",
    registration_status: registration?.status || "",
    number_of_seats: String(registration?.numberOfSeats || 1),
    paid_seats: String(registration?.paidSeats || 1),
    free_seats: String(registration?.freeSeats || 0),
    payment_status: registration?.paymentStatus || "UNPAID",
    payment_amount: registration ? `${course.currency} ${registration.totalAmount.toFixed(2)}` : "",
    balance_amount: registration ? `${course.currency} ${registration.balanceAmount.toFixed(2)}` : "",
    payment_link: registration?.paymentLink || `https://app.fizmoh.cloud/training/${course.slug}?reg=${registration?.id}`,

    attendee_name: attendee?.name || registration?.customerName || "",
    attendee_email: attendee?.email || registration?.customerEmail || "",
    attendee_phone: attendee?.phone || registration?.customerPhone || "",
    certificate_url: attendee?.certificateUrl || "",
  }
}

export function interpolateTrainingText(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    return vars[key] !== undefined ? vars[key] : match
  })
}
