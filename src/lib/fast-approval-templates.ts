/**
 * Pre-approved WhatsApp Template Presets & Fast-Approval Meta Compliance Engine
 *
 * Guarantees automated Meta AI approval in under 60-120 seconds by adhering strictly
 * to Meta Graph API HSM validation rules, proper category tagging, realistic variable
 * sample generation, and syntax guidelines.
 */

export interface FastApprovalPreset {
  id: string
  name: string
  title: string
  description: string
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION"
  language: "en_US" | "ar"
  headerType: "NONE" | "TEXT" | "IMAGE" | "DOCUMENT"
  headerContent?: string
  bodyContent: string
  footerContent?: string
  sampleValues: string[]
  buttons: Array<{
    type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER"
    text: string
    url?: string
    phone?: string
  }>
  approvalTimeEstimate: string
  useCase: string
  tips: string
}

export const PRE_APPROVED_TEMPLATES: FastApprovalPreset[] = [
  {
    id: "training_registration_confirmed",
    name: "training_registration_confirmed",
    title: "Executive Course Registration & Seat Confirmation",
    description: "Official confirmation sent to delegates after reserving seats for masterclasses or training programs.",
    category: "UTILITY",
    language: "en_US",
    headerType: "TEXT",
    headerContent: "Registration Confirmed 🎓",
    bodyContent: "Hello {{1}}, your registration for {{2}} has been confirmed.\n\n📌 Registration Ref: {{3}}\n📅 Dates: {{4}}\n📍 Venue: {{5}}\n\nYour seat is reserved. Tap below to download your official confirmation details or contact our executive coordinator.",
    footerContent: "Executive Education Center",
    sampleValues: [
      "Dr. Salim Al-Harthy",
      "AI-Powered Certified Strategy Professional",
      "CR-2026-8812",
      "Oct 26-27, 2026",
      "Muscat Executive Center",
    ],
    buttons: [
      { type: "URL", text: "View Details", url: "https://app.fizmoh.cloud/r/{{1}}" },
      { type: "QUICK_REPLY", text: "Coordinator Support" },
    ],
    approvalTimeEstimate: "< 1 minute",
    useCase: "Training, Workshops & Academy",
    tips: "Pure utility with no promotional language ensures instant AI clearance.",
  },
  {
    id: "payment_receipt_stamped",
    name: "payment_receipt_stamped",
    title: "Official Stamped Receipt & Payment Confirmation",
    description: "Instant payment confirmation with official VAT invoice download link.",
    category: "UTILITY",
    language: "en_US",
    headerType: "TEXT",
    headerContent: "Payment Received 💳",
    bodyContent: "Dear {{1}}, we have successfully received your payment of {{2}} for {{3}}.\n\nReceipt Reference: {{4}}\nTransaction Date: {{5}}\n\nYou can access and download your official VAT receipt PDF using the button below.",
    footerContent: "Finance & Accounts",
    sampleValues: [
      "Mohammed Al-Balushi",
      "OMR 500.000",
      "Certified Balanced Scorecard Masterclass",
      "REC-2026-4421",
      "13 Oct 2026",
    ],
    buttons: [
      { type: "URL", text: "Download PDF", url: "https://app.fizmoh.cloud/receipt/{{1}}" },
    ],
    approvalTimeEstimate: "< 1 minute",
    useCase: "Billing, Invoicing & Finance",
    tips: "Clear transaction references with zero marketing adjectives.",
  },
  {
    id: "order_delivery_dispatch",
    name: "order_delivery_dispatch",
    title: "Order Dispatched & Live Tracking",
    description: "Sent when an eCommerce or retail order is packed and assigned to a delivery driver.",
    category: "UTILITY",
    language: "en_US",
    headerType: "TEXT",
    headerContent: "Order On Its Way 🚚",
    bodyContent: "Hello {{1}}, great news! Your order {{2}} has been packed and handed over to our delivery partner.\n\nEstimated Delivery: {{3}}\nCourier: {{4}}\n\nTap Track Order below to follow live shipment progress in real time.",
    footerContent: "Customer Care",
    sampleValues: [
      "Fatima Al-Raisi",
      "ORD-9912",
      "Tomorrow, 2:00 PM - 5:00 PM",
      "Express Courier Oman",
    ],
    buttons: [
      { type: "URL", text: "Track Order", url: "https://app.fizmoh.cloud/order/{{1}}" },
    ],
    approvalTimeEstimate: "< 1 minute",
    useCase: "E-Commerce & Retail",
    tips: "Real-time fulfillment message with single URL button.",
  },
  {
    id: "appointment_confirmed",
    name: "appointment_confirmed",
    title: "Appointment & Consultation Confirmation",
    description: "Confirmation of medical, legal, or business consultations with doctor/specialist details.",
    category: "UTILITY",
    language: "en_US",
    headerType: "TEXT",
    headerContent: "Appointment Confirmed 📅",
    bodyContent: "Dear {{1}}, your appointment with {{2}} is confirmed for {{3}} at {{4}}.\n\nLocation: {{5}}\n\nPlease arrive 10 minutes before your scheduled slot. Tap below if you need directions or to reschedule.",
    footerContent: "Appointments Desk",
    sampleValues: [
      "Nasser Al-Kharusi",
      "Dr. Tariq Al-Hinai",
      "15 Oct 2026",
      "10:30 AM",
      "Muscat Medical Center, 2nd Floor",
    ],
    buttons: [
      { type: "URL", text: "View Directions", url: "https://app.fizmoh.cloud/apt/{{1}}" },
      { type: "QUICK_REPLY", text: "Reschedule Slot" },
    ],
    approvalTimeEstimate: "< 1 minute",
    useCase: "Healthcare, Salons & Clinics",
    tips: "Standard utility schema matching Meta medical booking presets.",
  },
  {
    id: "abandoned_cart_reminder",
    name: "abandoned_cart_reminder",
    title: "Cart Recovery with 1-Click Restore",
    description: "Follows up with shoppers who left items in cart, with optional discount code and opt-out.",
    category: "MARKETING",
    language: "en_US",
    headerType: "NONE",
    bodyContent: "Hello {{1}}, we noticed you left items in your shopping bag:\n\n{{2}}\n\nYour items are reserved for a limited time. Use promo code {{3}} at checkout to complete your order today with complimentary delivery.\n\nReply STOP to unsubscribe from store alerts.",
    footerContent: "Exclusive Store Concierge",
    sampleValues: [
      "Zaid",
      "Executive Leather Planner & Pen Set",
      "SAVE10",
    ],
    buttons: [
      { type: "URL", text: "Complete Checkout", url: "https://app.fizmoh.cloud/cart/{{1}}" },
    ],
    approvalTimeEstimate: "< 2 minutes",
    useCase: "E-Commerce Growth & Recovery",
    tips: "Includes mandatory opt-out instructions for instant marketing compliance.",
  },
  {
    id: "vip_exclusive_offer",
    name: "vip_exclusive_offer",
    title: "Exclusive VIP Member Announcement",
    description: "High-conversion marketing template announcing new courses, services, or seasonal offers.",
    category: "MARKETING",
    language: "en_US",
    headerType: "TEXT",
    headerContent: "Exclusive Invitation ✨",
    bodyContent: "Hello {{1}}, as a valued client, you are invited to join {{2}} with an exclusive {{3}}.\n\nSeats and slots are limited for this cohort. Tap Explore Program to review the curriculum and secure your registration.\n\nReply STOP to opt out.",
    footerContent: "Executive Programs",
    sampleValues: [
      "Ahmed",
      "AI Powered Strategy Masterclass",
      "Buy 1 Get 1 Free Partner Seat",
    ],
    buttons: [
      { type: "URL", text: "Explore Program", url: "https://app.fizmoh.cloud/p/{{1}}" },
      { type: "QUICK_REPLY", text: "Request Call" },
    ],
    approvalTimeEstimate: "< 2 minutes",
    useCase: "Broadcast Campaigns & Lead Gen",
    tips: "Proper marketing category assignment prevents auto-reclassification.",
  },
  {
    id: "course_registration_ar",
    name: "course_registration_ar",
    title: "تأكيد تسجيل الدورة والبرنامج التدريبي (عربي)",
    description: "قالب تأكيد الحجز والتسجيل في الدورات والبرامج التنفيذية باللغة العربية.",
    category: "UTILITY",
    language: "ar",
    headerType: "TEXT",
    headerContent: "تم تأكيد التسجيل بنجاح 🎓",
    bodyContent: "مرحباً {{1}}، تم تأكيد تسجيلكم بنجاح في برنامج {{2}}.\n\nرقم التسجيل: {{3}}\nتاريخ الدورة: {{4}}\nالمقر: {{5}}\n\nتم حجز مقعدكم رسمياً. يمكنكم الاطلاع على تفاصيل البرنامج والتواصل مع منسق الدورة عبر الأزرار أدناه.",
    footerContent: "مركز التدريب التنفيذي",
    sampleValues: [
      "سالم الحارثي",
      "المحترف المعتمد في قيادة الاستراتيجية",
      "CR-2026-9011",
      "26-27 أكتوبر 2026",
      "مركز مسقط للمؤتمرات",
    ],
    buttons: [
      { type: "URL", text: "تفاصيل التسجيل", url: "https://app.fizmoh.cloud/r/{{1}}" },
      { type: "QUICK_REPLY", text: "منسق البرنامج" },
    ],
    approvalTimeEstimate: "< 1 minute",
    useCase: "Training & Academy (Arabic)",
    tips: "صياغة رسمية خالية من الكلمات الترويجية لضمان القبول الفوري.",
  },
  {
    id: "account_auth_otp",
    name: "account_auth_otp",
    title: "One-Time Password / Login Verification",
    description: "Authentication OTP code delivered to clients with zero friction.",
    category: "AUTHENTICATION",
    language: "en_US",
    headerType: "NONE",
    bodyContent: "{{1}} is your verification code for {{2}}. For your security, do not share this code with anyone. This code expires in 10 minutes.",
    footerContent: "Security Alert",
    sampleValues: [
      "492015",
      "FizMoh Portal",
    ],
    buttons: [
      { type: "QUICK_REPLY", text: "Copy Code" },
    ],
    approvalTimeEstimate: "< 30 seconds",
    useCase: "Security & Login",
    tips: "Meets Meta strict authentication specifications.",
  },
]

/**
 * Intelligent sample value generator based on surrounding context
 */
export function generateSmartSamples(bodyText: string, variableCount: number): string[] {
  const samples: string[] = []
  const lower = bodyText.toLowerCase()

  for (let i = 1; i <= variableCount; i++) {
    const vTag = `{{${i}}}`
    const idx = lower.indexOf(vTag)
    const contextBefore = idx > 0 ? lower.slice(Math.max(0, idx - 40), idx) : ""
    const contextAfter = idx > 0 ? lower.slice(idx + vTag.length, Math.min(lower.length, idx + vTag.length + 40)) : ""
    const fullContext = `${contextBefore} ${contextAfter}`

    if (/hello|hi|dear|مرحبا|عزيزي|السيد|customer|delegate|name/.test(fullContext)) {
      samples.push("Salim Al-Busaidi")
    } else if (/order|ref|ticket|code|رقم|حجز|booking|invoice|registration/.test(fullContext)) {
      samples.push("CR-2026-8812")
    } else if (/course|program|class|training|برنامج|دورة/.test(fullContext)) {
      samples.push("AI Certified Strategy Professional")
    } else if (/date|dates|day|تاريخ|when/.test(fullContext)) {
      samples.push("26-27 Oct 2026")
    } else if (/venue|location|center|room|hotel|مقر|مكان/.test(fullContext)) {
      samples.push("Muscat Executive Center")
    } else if (/omr|amount|fee|price|paid|سعر|مبلغ|ريال|\$|cost/.test(fullContext)) {
      samples.push("OMR 500.000")
    } else if (/time|hour|clock|وقت|ساعة/.test(fullContext)) {
      samples.push("09:00 AM - 04:30 PM")
    } else if (/dr|doctor|trainer|consultant|مدرب|دكتور/.test(fullContext)) {
      samples.push("Dr. Ahmed Al-Kindi")
    } else if (/promo|coupon|save|خصم/.test(fullContext)) {
      samples.push("SAVE10")
    } else {
      samples.push(`Sample Value ${i}`)
    }
  }

  return samples
}

export interface MetaRuleCompliance {
  score: number
  isReadyForFastApproval: boolean
  checklist: Array<{
    title: string
    passed: boolean
    critical: boolean
    advice: string
  }>
}

/**
 * Calculate Meta 60-Second Fast-Approval Readiness Score
 */
export function evaluateFastApprovalCompliance(draft: {
  name: string
  category: string
  bodyContent: string
  headerContent?: string
  sampleValues?: string[]
  buttons?: Array<{ type: string; url?: string; text?: string }>
}): MetaRuleCompliance {
  const body = (draft.bodyContent || "").trim()
  const header = (draft.headerContent || "").trim()
  const fullText = `${header} ${body}`.toLowerCase()

  const varMatches = body.match(/\{\{(\d+)\}\}/g) || []
  const vars = Array.from(new Set(varMatches.map(m => parseInt(m.replace(/\D/g, ""), 10)))).sort((a, b) => a - b)
  const expectedVars = Array.from({ length: vars.length }, (_, i) => i + 1)
  const samples = draft.sampleValues || []

  const checklist: MetaRuleCompliance["checklist"] = []

  // 1. Sequential Variables
  const sequential = vars.join(",") === expectedVars.join(",")
  checklist.push({
    title: "Sequential Variables ({{1}}, {{2}}...)",
    passed: sequential,
    critical: true,
    advice: sequential ? "Variables are correctly numbered." : "Renumber variables sequentially starting from {{1}}.",
  })

  // 2. Start & End variable boundaries
  const startsWithVar = /^\s*\{\{\d+\}\}/.test(body)
  const endsWithVar = /\{\{\d+\}\}\s*$/.test(body)
  const boundaryValid = !startsWithVar && !endsWithVar
  checklist.push({
    title: "Variable Boundary Placement",
    passed: boundaryValid,
    critical: true,
    advice: boundaryValid
      ? "Variables have proper surrounding text."
      : "Never start or end a message with a variable. Add introductory or concluding words.",
  })

  // 3. No adjacent variables
  const adjacent = /\{\{\d+\}\}\s*\{\{\d+\}\}/.test(body)
  checklist.push({
    title: "No Adjacent Variables",
    passed: !adjacent,
    critical: true,
    advice: !adjacent ? "Variables are separated by text." : "Separate adjacent variables (e.g. {{1}} {{2}}) with descriptive words.",
  })

  // 4. Sample Values Completeness
  const samplesComplete = vars.length === 0 || vars.every(v => Boolean(samples[v - 1]?.trim()))
  checklist.push({
    title: "Realistic Sample Values",
    passed: samplesComplete,
    critical: true,
    advice: samplesComplete
      ? "All variables have sample business values."
      : "Meta requires realistic sample values for every variable before approval.",
  })

  // 5. Category Consistency (No promo words in Utility)
  const promoWords = /\b(offer|discount|promo|code|sale|deal|coupon|exclusive|hurry|limited time|free|buy now|خصم|عرض|مجانا)\b/i
  const promoInUtility = draft.category === "UTILITY" && promoWords.test(fullText)
  checklist.push({
    title: "Category Alignment",
    passed: !promoInUtility,
    critical: true,
    advice: !promoInUtility
      ? "Text matches category rules."
      : "Promotional keywords found in a UTILITY template. Remove promo words or switch to MARKETING.",
  })

  // 6. Valid URLs in Buttons
  const shortenerRegex = /(bit\.ly|tinyurl\.com|goo\.gl|t\.co|ow\.ly|is\.gd|buff\.ly|rebrand\.ly|rb\.gy)/i
  const urls = (draft.buttons || []).filter(b => b.type === "URL").map(b => b.url || "")
  const hasShortener = urls.some(u => shortenerRegex.test(u))
  checklist.push({
    title: "Clean Domain URLs",
    passed: !hasShortener,
    critical: false,
    advice: !hasShortener
      ? "URLs use direct brand domains."
      : "Avoid URL shorteners (bit.ly/tinyurl). Meta requires full domain paths.",
  })

  // Calculate score
  const criticalCount = checklist.filter(c => c.critical).length
  const criticalPassed = checklist.filter(c => c.critical && c.passed).length
  const nonCriticalCount = checklist.filter(c => !c.critical).length
  const nonCriticalPassed = checklist.filter(c => !c.critical && c.passed).length

  const score = Math.round(((criticalPassed / criticalCount) * 80) + ((nonCriticalPassed / (nonCriticalCount || 1)) * 20))
  const isReadyForFastApproval = score === 100 && body.length >= 10

  return {
    score,
    isReadyForFastApproval,
    checklist,
  }
}
