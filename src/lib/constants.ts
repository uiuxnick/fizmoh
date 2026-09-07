// Centralized constants for the booking platform

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  OPS_ADMIN: "OPS_ADMIN",
  FINANCE: "FINANCE",
  CHAT_AGENT: "CHAT_AGENT",
  MARKETING: "MARKETING",
  GUIDE: "GUIDE",
} as const

export const ORDER_STATUS = {
  PENDING_PAYMENT: "PENDING_PAYMENT",
  PAYMENT_SUBMITTED: "PAYMENT_SUBMITTED",
  CONFIRMED: "CONFIRMED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
  NO_SHOW: "NO_SHOW",
} as const

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const

export const PAYMENT_METHOD = {
  AMWALPAY: "AMWALPAY",
  PAYMOB: "PAYMOB",
  BANK_TRANSFER: "BANK_TRANSFER",
} as const

export const CHANNEL = {
  WEB: "WEB",
  WHATSAPP: "WHATSAPP",
  ADMIN: "ADMIN",
  API: "API",
} as const

export const SLOT_STATUS = {
  OPEN: "OPEN",
  FULL: "FULL",
  CLOSED: "CLOSED",
  BLACKOUT: "BLACKOUT",
} as const

export const MESSAGE_DIRECTION = {
  INBOUND: "INBOUND",
  OUTBOUND: "OUTBOUND",
  BOT: "BOT",
} as const

export const VOUCHER_STATUS = {
  VALID: "VALID",
  USED: "USED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const

export const TOUR_CATEGORIES = [
  "Adventure",
  "Cultural",
  "Water Sports",
  "Desert",
  "Mountain",
  "City Tour",
  "Diving",
  "Fishing",
  "Family",
  "Luxury",
] as const

export const OMANI_CITIES = [
  "Muscat",
  "Salalah",
  "Nizwa",
  "Sohar",
  "Sur",
  "Musandam",
  "Ras Al Jinz",
  "Wahiba Sands",
  "Jebel Shams",
  "Duqm",
] as const

export const VAT_RATE = 0.05 // 5% Oman VAT

export const LOYALTY_TIERS = {
  BRONZE: { min: 0, discount: 0, color: "#a16207" },
  SILVER: { min: 500, discount: 0.05, color: "#64748b" },
  GOLD: { min: 2000, discount: 0.10, color: "#ca8a04" },
} as const

export const BUSINESS_CONFIG = {
  name: "Fizmoh Support",
  tagline: "Official WhatsApp Business Platform & Cloud API in Oman & GCC",
  currency: "OMR",
  vatRate: 0.05,
  languages: ["en", "ar"],
  workingHours: {
    start: "08:00",
    end: "22:00",
  },
  supportPhone: "+968 9000 0000",
  supportEmail: "support@fizmoh.cloud",
  website: "https://app.fizmoh.cloud",
}

export const ORDER_STATUS_FLOW: Record<string, string[]> = {
  PENDING_PAYMENT: ["PAYMENT_SUBMITTED", "CANCELLED"],
  PAYMENT_SUBMITTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
  COMPLETED: [],
  CANCELLED: ["REFUNDED"],
  REFUNDED: [],
  NO_SHOW: [],
}

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ["*"],
  OPS_ADMIN: ["tours:*", "slots:*", "orders:*", "customers:read", "reports:*"],
  FINANCE: ["payments:*", "orders:read", "reports:payments"],
  CHAT_AGENT: ["inbox:*", "orders:read", "customers:read"],
  MARKETING: ["templates:*", "campaigns:*", "segments:*", "subscribers:*"],
  GUIDE: ["orders:read", "schedule:read", "checkin:*"],
}

export const SAMPLE_WA_TEMPLATES = [
  {
    name: "order_confirmation",
    category: "UTILITY",
    body: "Dear {{1}}, your booking is confirmed!\n\n🎫 Order: {{2}}\n📍 Tour: {{3}}\n📅 Date: {{4}}\n⏰ Time: {{5}}\n👥 Pax: {{6}}\n💰 Amount: {{7}} {{8}}\n\nShow this message or your QR voucher at check-in. Have a great trip!",
    variables: ["customer_name", "order_number", "tour_name", "date", "time", "pax", "amount", "currency"],
  },
  {
    name: "payment_received",
    category: "UTILITY",
    body: "Hi {{1}}, we've received your payment of {{2}} {{3}} for order {{4}}. Your booking is now being verified. You'll receive a confirmation shortly.",
    variables: ["customer_name", "amount", "currency", "order_number"],
  },
  {
    name: "payment_approved",
    category: "UTILITY",
    body: "Great news {{1}}! Your payment for order {{2}} has been approved ✅. Your booking is confirmed. Here's your voucher with QR code for check-in.",
    variables: ["customer_name", "order_number"],
  },
  {
    name: "payment_rejected",
    category: "UTILITY",
    body: "Hi {{1}}, unfortunately we couldn't verify your payment for order {{2}}. Reason: {{3}}. Please resubmit your payment or contact us at {{4}}.",
    variables: ["customer_name", "order_number", "reason", "support_contact"],
  },
  {
    name: "tour_reminder",
    category: "UTILITY",
    body: "Reminder: Your tour \"{{1}}\" is tomorrow at {{2}}. Meeting point: {{3}}. Please arrive 15 min early. Reply with your voucher QR or show this message.",
    variables: ["tour_name", "time", "meeting_point"],
  },
  {
    name: "welcome_offer",
    category: "MARKETING",
    body: "Welcome to Oman Adventures! 🐪 Enjoy 15% off your first booking with code WELCOME15. Browse our tours: {{1}}",
    variables: ["website_url"],
  },
  {
    name: "abandoned_cart",
    category: "MARKETING",
    body: "Hi {{1}}, you left \"{{2}}\" in your cart! Only {{3}} seats left for {{4}}. Complete your booking now: {{5}}",
    variables: ["customer_name", "tour_name", "seats_left", "date", "booking_url"],
  },
  {
    name: "post_tour_review",
    category: "UTILITY",
    body: "Hi {{1}}, how was your \"{{2}}\" experience? We'd love your feedback! Rate your trip: {{3}} and get 10% off your next adventure.",
    variables: ["customer_name", "tour_name", "review_url"],
  },
]
