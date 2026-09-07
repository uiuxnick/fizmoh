import { z } from "zod"

// Permissive URL / path validator for uploaded media, relative paths, data URIs, and full URLs
export const flexibleMediaUrl = z.string().refine((val) => {
  if (!val || val.trim() === "") return true
  const v = val.trim()
  if (v.startsWith("/") || v.startsWith("./") || v.startsWith("data:")) return true
  if (v.startsWith("http://") || v.startsWith("https://")) return true
  try {
    new URL(v)
    return true
  } catch {
    return false
  }
}, { message: "Must be a valid web URL or media path" }).optional().nullable().or(z.literal(""))

// Permissive URL validator for website links, social channels, and payment gateways
export const flexibleWebUrl = z.string().refine((val) => {
  if (!val || val.trim() === "") return true
  const v = val.trim()
  if (v.startsWith("/") || v.startsWith("http://") || v.startsWith("https://") || v.startsWith("mailto:") || v.startsWith("tel:") || v.startsWith("whatsapp://")) return true
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(v)) return true
  try {
    new URL(v)
    return true
  } catch {
    return false
  }
}, { message: "Must be a valid URL" }).optional().nullable().or(z.literal(""))

export const socialLinksSchema = z.object({
  instagram: flexibleWebUrl,
  facebook: flexibleWebUrl,
  linkedin: flexibleWebUrl,
  twitter: flexibleWebUrl,
  tiktok: flexibleWebUrl,
  youtube: flexibleWebUrl,
  snapchat: flexibleWebUrl,
  telegram: flexibleWebUrl,
  threads: flexibleWebUrl,
  pinterest: flexibleWebUrl,
  discord: flexibleWebUrl,
  spotify: flexibleWebUrl,
  github: flexibleWebUrl,
}).partial().optional().nullable()

export const dayScheduleSchema = z.object({
  day: z.number().int().min(0).max(6),
  isOpen: z.boolean(),
  open1: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().or(z.literal("")),
  close1: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().or(z.literal("")),
  open2: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().or(z.literal("")),
  close2: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().or(z.literal("")),
})

export const customLinkItemSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1).max(100),
  url: z.string().min(1, "URL is required").refine((val) => {
    if (!val || val.trim() === "") return false
    const v = val.trim()
    if (v.startsWith("/") || v.startsWith("http://") || v.startsWith("https://") || v.startsWith("mailto:") || v.startsWith("tel:") || v.startsWith("whatsapp://")) return true
    if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(v)) return true
    try {
      new URL(v)
      return true
    } catch {
      return false
    }
  }, { message: "Must be a valid URL" }),
  icon: z.string().max(50).default("globe"),
  iconType: z.string().max(30).optional().default("lucide"),
  highlight: z.boolean().default(false),
})

export const customLinksSchema = z.array(customLinkItemSchema).optional().nullable()

export const mediaConfigSchema = z.object({
  // Cover adjustments
  coverHeight: z.union([z.string(), z.number()]).optional(),
  coverPosition: z.string().optional(),
  coverFit: z.enum(["cover", "contain"]).optional(),
  coverOverlay: z.number().min(0).max(100).optional(),
  coverBlur: z.enum(["none", "subtle", "medium"]).optional(),

  // Logo adjustments
  logoSize: z.union([z.string(), z.number()]).optional(),
  logoShape: z.enum(["circle", "rounded", "square"]).optional(),
  logoFit: z.enum(["contain", "cover"]).optional(),
  logoBorder: z.enum(["none", "white", "accent", "dark"]).optional(),
  logoPosition: z.enum(["center", "left", "right"]).optional(),
  logoOverlap: z.enum(["overlap", "inside", "below"]).optional(),
}).partial().optional().nullable()

export const vCardUpdateSchema = z.object({
  slug: z.string().min(3).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  title: z.string().min(1).max(120).optional(),
  subtitle: z.string().max(200).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),

  // Branding
  logoUrl: flexibleMediaUrl,
  bannerUrl: flexibleMediaUrl,
  coverType: z.enum(["IMAGE", "VIDEO"]).optional(),
  coverVideoUrl: flexibleMediaUrl,
  serviceLayout: z.enum(["GRID", "SLIDER"]).optional(),
  primaryColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
  secondaryColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
  accentColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
  themeMode: z.enum(["light", "dark", "system"]).optional(),
  cardTemplate: z.enum([
    "modern",
    "executive",
    "emerald",
    "sunset",
    "ocean",
    "cyber",
    "boutique",
    "frost",
    "artisan",
    "brutalist",
    "curve-emerald",
    "midnight-navy",
    "champagne-gold",
    "minimal",
    "bold",
  ]).optional(),
  buttonStyle: z.enum(["rounded", "pill", "square", "neo3d", "glass"]).optional(),
  customLinks: customLinksSchema,
  mediaConfig: mediaConfigSchema,

  // Contact
  contactName: z.string().max(120).optional().nullable(),
  contactTitle: z.string().max(120).optional().nullable(),
  contactDept: z.string().max(120).optional().nullable(),
  mobileNumber: z.string().max(30).optional().nullable(),
  whatsappNumber: z.string().max(30).optional().nullable(),
  landlineNumber: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  altEmail: z.string().email().optional().nullable().or(z.literal("")),
  websiteUrl: flexibleWebUrl,

  // Address
  addressLine1: z.string().max(200).optional().nullable(),
  addressLine2: z.string().max(200).optional().nullable(),
  building: z.string().max(100).optional().nullable(),
  street: z.string().max(100).optional().nullable(),
  area: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(60).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  googleMapsUrl: flexibleWebUrl,

  // Social
  socialLinks: socialLinksSchema,

  // Commercial
  crNumber: z.string().max(60).optional().nullable(),
  crExpiryDate: z.string().datetime().optional().nullable().or(z.literal("")),
  vatNumber: z.string().max(60).optional().nullable(),
  legalName: z.string().max(200).optional().nullable(),
  isCrPublic: z.boolean().optional(),

  // Payments
  paymentUrl: flexibleWebUrl,
  amwalPayUrl: flexibleWebUrl,
  paymobUrl: flexibleWebUrl,
  bankName: z.string().max(100).optional().nullable(),
  accountName: z.string().max(150).optional().nullable(),
  accountNumber: z.string().max(60).optional().nullable(),
  iban: z.string().max(60).optional().nullable(),
  swiftCode: z.string().max(30).optional().nullable(),
  paymentNotes: z.string().max(500).optional().nullable(),
  showPaymentBtn: z.boolean().optional(),
  showBankDetails: z.boolean().optional(),

  // Business Hours
  businessHours: z.array(dayScheduleSchema).optional().nullable(),
  timezone: z.string().max(50).optional(),
  holidayNotice: z.string().max(200).optional().nullable(),
  isHoliday: z.boolean().optional(),

  // Visibility Flags
  showEmail: z.boolean().optional(),
  showPhone: z.boolean().optional(),
  showWhatsapp: z.boolean().optional(),
  showAddress: z.boolean().optional(),
  showServices: z.boolean().optional(),
  showGallery: z.boolean().optional(),
  showHours: z.boolean().optional(),
  showLeadForm: z.boolean().optional(),

  // SEO
  metaTitle: z.string().max(120).optional().nullable(),
  metaDescription: z.string().max(300).optional().nullable(),

  // Status
  status: z.enum(["DRAFT", "PUBLISHED", "DISABLED"]).optional(),
})

export const vCardItemSchema = z.object({
  type: z.enum(["SERVICE", "PRODUCT"]).default("SERVICE"),
  name: z.string().min(1, "Name is required").max(150),
  shortDesc: z.string().max(300).optional().nullable(),
  fullDesc: z.string().max(2000).optional().nullable(),
  imageUrl: flexibleMediaUrl,
  price: z.number().min(0).optional().nullable(),
  salePrice: z.number().min(0).optional().nullable(),
  currency: z.string().default("OMR"),
  pricePrefix: z.string().max(30).optional().nullable(),
  priceSuffix: z.string().max(30).optional().nullable(),
  sku: z.string().max(50).optional().nullable(),
  sortOrder: z.number().int().default(0),
  isFeatured: z.boolean().default(true),
  isActive: z.boolean().default(true),
  ctaLabel: z.string().max(50).default("Book via WhatsApp"),
  whatsappMessage: z.string().max(500).optional().nullable(),
  externalUrl: flexibleWebUrl,
})

export const vCardGalleryItemSchema = z.object({
  type: z.enum(["IMAGE", "VIDEO"]).default("IMAGE"),
  url: flexibleMediaUrl,
  caption: z.string().max(200).optional().nullable(),
  altText: z.string().max(100).optional().nullable(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

export const publicLeadSchema = z.object({
  name: z.string().min(2, "Name is required").max(100),
  phone: z.string().min(6, "Valid phone number required").max(30),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  message: z.string().max(1000).optional().or(z.literal("")),
  serviceInterested: z.string().max(150).optional().or(z.literal("")),
})

export const publicEventSchema = z.object({
  eventType: z.enum([
    "CARD_VIEW",
    "QR_SCAN",
    "WHATSAPP_CLICK",
    "CALL_CLICK",
    "EMAIL_CLICK",
    "SAVE_CONTACT",
    "WEBSITE_CLICK",
    "MAP_CLICK",
    "PAYMENT_CLICK",
    "SOCIAL_CLICK",
    "SERVICE_CLICK",
    "SHARE_CLICK",
    "LEAD_SUBMIT",
  ]),
  itemId: z.string().optional().nullable(),
  platform: z.string().optional().nullable(),
  referrer: z.string().optional().nullable(),
  deviceType: z.string().optional().nullable(),
  browser: z.string().optional().nullable(),
  os: z.string().optional().nullable(),
})
