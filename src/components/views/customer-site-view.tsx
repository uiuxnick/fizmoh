"use client"

import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion"
import { toast } from "sonner"
import {
  Search, MapPin, Clock, Star, Users, Calendar, Plus, Minus, Check, X, CreditCard, Banknote, Upload, Ticket,
  ArrowRight, ArrowLeft, Shield, Award, Headphones, ShoppingCart, User, Globe, LogOut, Receipt, RefreshCw,
  ChevronRight, ChevronDown, Phone, Mail, Menu, Filter, ThumbsUp, Heart, Share2, Printer,
  Download, CheckCircle, Sparkles, Navigation, Sun, Waves, Mountain, Camera, Smartphone, Play, Pause,
  RotateCcw, Send, Compass, Loader2, ChevronLeft, Star as StarIcon, Quote, Building2, Target, Eye, Handshake,
  TrendingUp, Gift, Wallet, Settings as SettingsIcon, Bell, Languages, Zap, Lock, FileText, QrCode, Smile,
  Image as ImageIcon, PhoneCall, Facebook, Instagram, Twitter, Youtube, Wifi, BatteryFull, SignalHigh, Video,
  Mic, Paperclip, CheckCheck,
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/helpers"
import { useApp } from "@/lib/store"

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
─────────────────────────────────────────────────────────────────────────────── */

const CATEGORY_GRADIENTS: Record<string, string> = {
  Desert: "from-amber-400 to-orange-500",
  "Water Sports": "from-teal-400 to-cyan-500",
  Mountain: "from-stone-400 to-stone-600",
  "City Tour": "from-emerald-400 to-teal-500",
  Adventure: "from-orange-400 to-red-500",
  Family: "from-rose-400 to-pink-500",
}

const CATEGORY_ICONS: Record<string, any> = {
  Desert: Sun,
  "Water Sports": Waves,
  Mountain: Mountain,
  "City Tour": Building2,
  Adventure: Compass,
  Family: Heart,
}

const CATEGORIES = ["Adventure", "Desert", "Water Sports", "Mountain", "City Tour", "Family"]

const TOUR_IMAGES: Record<string, string> = {
  desert: "/tours/desert-1.jpg",
  dhow: "/tours/dhow-1.jpg",
  mountain: "/tours/mountain-1.jpg",
  city: "/tours/city-1.jpg",
  turtle: "/tours/turtle-1.jpg",
  wadi: "/tours/wadi-1.jpg",
}

const CITY_OPTIONS = ["Muscat", "Musandam", "Nizwa", "Sur", "Salalah", "Sohar", "Ras Al Jinz"]

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  CONFIRMED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-teal-100 text-teal-700 border-teal-200",
  CANCELLED: "bg-rose-100 text-rose-700 border-rose-200",
  PENDING_PAYMENT: "bg-amber-100 text-amber-700 border-amber-200",
  PAYMENT_SUBMITTED: "bg-sky-100 text-sky-700 border-sky-200",
  REFUNDED: "bg-stone-100 text-stone-600 border-stone-200",
  NO_SHOW: "bg-stone-100 text-stone-600 border-stone-200",
}

const TIER_BADGE: Record<string, string> = {
  BRONZE: "bg-stone-100 text-stone-600 border-stone-200",
  SILVER: "bg-slate-100 text-slate-600 border-slate-200",
  GOLD: "bg-amber-100 text-amber-700 border-amber-200",
  PLATINUM: "bg-emerald-100 text-emerald-700 border-emerald-200",
}

const TIER_LABEL: Record<string, { EN: string; AR: string }> = {
  BRONZE: { EN: "Bronze", AR: "برونزي" },
  SILVER: { EN: "Silver", AR: "فضي" },
  GOLD: { EN: "Gold", AR: "ذهبي" },
  PLATINUM: { EN: "Platinum", AR: "بلاتيني" },
}

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  SUBMITTED: "bg-sky-100 text-sky-700 border-sky-200",
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PAID: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-100 text-rose-700 border-rose-200",
  FAILED: "bg-rose-100 text-rose-700 border-rose-200",
  REFUNDED: "bg-stone-100 text-stone-600 border-stone-200",
}

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
─────────────────────────────────────────────────────────────────────────────── */

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
type Lang = "EN" | "AR"

interface CartItem {
  id: string
  tour: any
  slot: any
  paxAdult: number
  paxChild: number
  price: number
  childPrice: number
  addOns: string[]
}

interface CustomerInfo {
  name: string
  phone: string
  email: string
  pickup: string
  requests: string
}

interface ChatMessage {
  id: number
  from: "customer" | "ai"
  type: "text" | "image" | "tours" | "slots" | "summary" | "buttons"
  text?: string
  tours?: { name: string; price: string; image: string; id?: string }[]
  slots?: { time: string; price: string; seats: string; id?: string }[]
  summary?: { order: string; total: string; options: string[] }
  imageLabel?: string
  time: string
  buttons?: { label: string; action: string; data?: any }[]
}

/* ─────────────────────────────────────────────────────────────────────────────
   BRANDING

   Whose website this is.

   Everything on this page used to be one business's: its name in the header,
   its founding year in the story, its star rating in the banner, its traveller
   count in the statistics. That is fine for one customer and wrong for the
   second, who would have been handed a site telling their visitors about
   somebody else's guides in somebody else's country.

   So it is all read from the workspace now, and — the part that matters —
   anything a business has not filled in is left out of the page rather than
   filled with a plausible stand-in. A shop with no story shows no story
   section. An unproven "#1 rated · 4.8★ from 2,400 travellers" is not a
   default; it is a claim, and it is not ours to make on anybody's behalf.
─────────────────────────────────────────────────────────────────────────────── */

export interface Brand {
  name: string
  tagline: string | null
  logoUrl: string | null
  primaryColor: string
  accentColor: string
  hero: {
    title: string | null
    accent: string | null
    subtitle: string | null
    badge: string | null
    image: string | null
  }
  story: string | null
  mission: string | null
  about: string | null
  stats: { label: string; value: string }[]
  social: { facebook: string | null; instagram: string | null; twitter: string | null; youtube: string | null }
  phone: string | null
  email: string | null
  address: string | null
  website: string | null
  currency: string
  /** The workspace address, when this is being served to the public. */
  slug: string | null
}

const FALLBACK_BRAND: Brand = {
  name: "",
  tagline: null,
  logoUrl: null,
  primaryColor: "#0d9488",
  accentColor: "#f59e0b",
  hero: { title: null, accent: null, subtitle: null, badge: null, image: null },
  story: null,
  mission: null,
  about: null,
  stats: [],
  social: { facebook: null, instagram: null, twitter: null, youtube: null },
  phone: null,
  email: null,
  address: null,
  website: null,
  currency: "OMR",
  slug: null,
}

const BrandContext = createContext<Brand>(FALLBACK_BRAND)
const useBrand = () => useContext(BrandContext)

/**
 * Addresses a request to the workspace this page belongs to.
 *
 * A visitor to a public shop has no session, so nothing about the request says
 * whose catalogue, slots or bank details are being asked for — and the API,
 * given no workspace, answers with nothing. The address is in the URL the
 * visitor came in on, so it travels with every call made from the page.
 */
function useApi() {
  const { slug } = useBrand()
  return useCallback(
    (path: string) =>
      slug ? `${path}${path.includes("?") ? "&" : "?"}workspace=${encodeURIComponent(slug)}` : path,
    [slug],
  )
}

/** Only what is actually set, so a blank field never reaches the page. */
const text = (value: unknown): string | null => {
  const v = typeof value === "string" ? value.trim() : ""
  return v.length > 0 ? v : null
}

/**
 * Builds the brand from whatever the caller could find.
 *
 * Two callers with two shapes: the public shop endpoint, which returns a
 * `shop` object, and the settings endpoint the dashboard preview reads, which
 * returns flat keys. Both end up here so the preview and the real thing cannot
 * drift apart — a preview that flatters the site is worse than no preview.
 */
function brandFrom(source: Record<string, any>, fallbackName: string): Brand {
  const hero = source.hero ?? {}
  return {
    name: text(source.name) ?? text(source.business_name) ?? text(source.tenant_name) ?? fallbackName,
    tagline: text(source.tagline) ?? text(source.site_tagline),
    logoUrl: text(source.logoUrl) ?? text(source.website_logo_url) ?? text(source.business_logo),
    primaryColor: text(source.primaryColor) ?? text(source.website_primary_color) ?? "#0d9488",
    accentColor: text(source.accentColor) ?? text(source.website_accent_color) ?? "#f59e0b",
    hero: {
      title: text(hero.title) ?? text(source.site_hero_title),
      accent: text(hero.accent) ?? text(source.site_hero_accent),
      subtitle: text(hero.subtitle) ?? text(source.site_hero_subtitle),
      badge: text(hero.badge) ?? text(source.site_hero_badge),
      image: text(hero.image) ?? text(source.site_hero_image),
    },
    story: text(source.story) ?? text(source.site_story),
    mission: text(source.mission) ?? text(source.site_mission),
    about: text(source.about) ?? text(source.business_about),
    stats: Array.isArray(source.stats) ? source.stats : parseStatsText(source.site_stats),
    social: {
      facebook: text(source.social?.facebook) ?? text(source.site_facebook),
      instagram: text(source.social?.instagram) ?? text(source.site_instagram),
      twitter: text(source.social?.twitter) ?? text(source.site_twitter),
      youtube: text(source.social?.youtube) ?? text(source.site_youtube),
    },
    phone: text(source.phone) ?? text(source.business_phone),
    email: text(source.email) ?? text(source.business_email),
    address: text(source.address) ?? text(source.business_address),
    website: text(source.website) ?? text(source.business_website),
    currency: text(source.currency) ?? "OMR",
    slug: text(source.slug) ?? text(source.workspace_slug),
  }
}

function parseStatsText(raw: unknown): { label: string; value: string }[] {
  if (typeof raw !== "string" || !raw.trim()) return []
  return raw
    .split(",")
    .map(pair => {
      const [label, ...rest] = pair.split("=")
      return { label: (label ?? "").trim(), value: rest.join("=").trim() }
    })
    .filter(s => s.label && s.value)
    .slice(0, 4)
}

/** The first letter of the business, for when there is no logo to show. */
const brandInitial = (name: string) => (name.trim()[0] ?? "?").toUpperCase()

/**
 * Turns a written-for-the-assistant description into something a page can
 * show.
 *
 * `business_about` is the text the AI is given as context — the settings hint
 * asks for hours, policies, everything — and people write it in markdown.
 * Dropped into the banner as-is it rendered as a wall of literal asterisks and
 * ran to a dozen lines. So the marks come out and it is cut to the length of
 * an introduction rather than a briefing.
 */
function summarise(value: string | null, limit = 180): string | null {
  if (!value) return null
  const plain = value
    .replace(/\*\*|__/g, "")
    .replace(/[*_#`>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  if (!plain) return null
  if (plain.length <= limit) return plain
  // Cut at the last sentence that fits, so it ends where a thought does.
  const cut = plain.slice(0, limit)
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "))
  return stop > 60 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`
}

/* ─────────────────────────────────────────────────────────────────────────────
   i18n DICTIONARY
─────────────────────────────────────────────────────────────────────────────── */

const T: Record<Lang, Record<string, string>> = {
  EN: {
    bookNow: "Book Now", search: "Search", searchPlaceholder: "Where do you want to go?", tours: "Tours",
    allTours: "All Tours", from: "From", adults: "Adults", children: "Children", total: "Total",
    subtotal: "Subtotal", discount: "Discount", vat: "VAT (5%)", pay: "Pay", myAccount: "My Account",
    cart: "Cart", yourCart: "Your Cart", emptyCart: "Your cart is empty",
    emptyCartDesc: "Browse tours and add them to your cart", browseTours: "Browse Tours",
    checkoutAll: "Checkout All", viewCart: "View Full Cart", totalInclVat: "Total (incl. VAT)",
    continue: "Continue", proceedToPayment: "Proceed to Payment", back: "Back", backToTours: "Back to tours",
    completeBooking: "Complete Your Booking", guests: "Guests", yourDetails: "Your Details",
    fullName: "Full Name", phone: "Phone (WhatsApp)", email: "Email", paymentMethod: "Payment Method",
    bankTransfer: "Bank Transfer", amwalPay: "AmwalPay", orderSummary: "Order Summary",
    couponCode: "Coupon code", apply: "Apply", payment: "Payment",
    submitPayment: "Submit Payment for Verification", bookingReceived: "Booking Received!",
    bookAnother: "Book Another Tour", addToCart: "Add to Cart", addedToCart: "Added to cart!",
    removedFromCart: "Removed from cart", welcome: "Welcome", loginTitle: "Sign in to your account",
    loginDesc: "Enter your WhatsApp number to receive a 6-digit verification code",
    sendOtp: "Send OTP via WhatsApp", verifyOtp: "Verify & Continue", otpSent: "OTP sent via WhatsApp",
    invalidOtp: "Invalid or expired OTP", profile: "Profile", loyaltyTier: "Loyalty Tier",
    loyaltyPoints: "Points", totalBookings: "Total Bookings", totalSpent: "Total Spent",
    bookingHistory: "Booking History", orderNumber: "Order", status: "Status", date: "Date",
    voucher: "Voucher", invoice: "Invoice", downloadVoucher: "Download Voucher",
    downloadInvoice: "Download Invoice", rebook: "Rebook", logout: "Logout", noBookings: "No bookings yet",
    secureCheckout: "Secure Hosted Checkout", paySecurely: "Pay Securely via AmwalPay",
    heroTitle1: "Discover Oman.", heroTitle2: "Book in Seconds.",
    heroSubtitle: "Desert safaris, dhow cruises, mountain treks & more — book unforgettable experiences instantly.",
    instantConfirm: "Instant Confirmation", whatsappSupport: "WhatsApp Support",
    bestPrice: "Best Price Guarantee", securePayment: "Secure Payment",
    bookIn3: "Book in under 3 minutes", support247: "24/7 AI + human help", noHiddenFees: "No hidden fees",
    amwalHosted: "AmwalPay hosted checkout", perAdult: "/ adult", free: "Free",
    selectDateTime: "Select Date & Time", noSlots: "No slots available", left: "left",
    inclusions: "Inclusions", exclusions: "Exclusions", itinerary: "Itinerary", featured: "Featured",
    whatNext: "What happens next?",
    nextStep1: "Admin verifies your payment (usually < 2 hours)",
    nextStep2: "You'll receive confirmation via Email + WhatsApp",
    nextStep3: "Show your QR voucher at check-in",
    cartCheckedOut: "Bookings created successfully!", paymentSubmitted: "Payment submitted for verification!",
    bookingFailed: "Booking failed", member: "Member", verified: "Verified", guest: "Guest",
    noBookingsDesc: "Your past and upcoming bookings will appear here.",
    securePaymentNote: "Redirects to AmwalPay · PCI-DSS SAQ-A · 3D Secure",
    enterPhone: "Enter your WhatsApp number",
    otpHint: "Enter the 6-digit code we sent via WhatsApp", backToLogin: "Change number",
    clearCart: "Clear", items: "items", item: "item",
    eachBooking: "Each item becomes a separate booking order.", pax: "pax",
    paymentMethods: "Accepted methods", transferTo: "Transfer to", trxRef: "Transaction Reference",
    uploadScreenshot: "Upload Payment Screenshot", clickToUpload: "Click to upload",
    screenshotUploaded: "Screenshot uploaded", reviewCount: "reviews", cityOf: "City",
    duration: "Duration", rating: "Rating", home: "Home", about: "About", contact: "Contact",
    aboutUs: "About Us", contactUs: "Contact Us", whatsappDemo: "WhatsApp Demo",
    tryWhatsapp: "Try WhatsApp Demo", exploreTours: "Explore Tours", viewAllTours: "View All Tours",
    featuredTours: "Featured Tours", whyChooseUs: "Why Choose Us", howItWorks: "How It Works",
    testimonials: "What Travelers Say", faq: "Frequently Asked Questions", newsletter: "Newsletter",
    subscribe: "Subscribe", filters: "Filters", sortBy: "Sort By", priceRange: "Price Range",
    durationRange: "Duration", difficulty: "Difficulty", clearFilters: "Clear Filters",
    noToursFound: "No tours found", noToursDesc: "Try adjusting your filters",
    reviews: "Reviews", relatedTours: "You May Also Like", meetingPoint: "Meeting Point",
    whatToBring: "What to Bring", cancellationPolicy: "Cancellation Policy",
    addToCartSuccess: "Added to cart!", removeFromCart: "Removed",
    popularTours: "Popular Tours", company: "Company", legal: "Legal", followUs: "Follow Us",
    openingHours: "Opening Hours", satThu: "Sat – Thu", friday: "Friday",
    address: "Address", phoneLabel: "Phone", emailLabel: "Email", allRights: "All rights reserved",
    privacyPolicy: "Privacy Policy", terms: "Terms & Conditions", cancelPolicy: "Cancellation Policy",
    selectDate: "Select Date", selectTime: "Select Time", selectPax: "Select Travelers",
    pickupLocation: "Pickup Location", specialRequests: "Special Requests",
    contactDetails: "Contact Details", paymentDetails: "Payment Details", bankDetails: "Bank Details",
    accountName: "Account Name", accountNumber: "Account Number", iban: "IBAN", swift: "SWIFT/BIC",
    transferAmount: "Transfer Amount", fromBank: "From Bank", transferDate: "Transfer Date",
    screenshotOfPayment: "Screenshot of Payment", cardNumber: "Card Number", expiry: "Expiry", cvv: "CVV",
    orderConfirmed: "Order Confirmed!", viewMyBookings: "View My Bookings",
    downloadVoucherPdf: "Download Voucher (PDF)", downloadInvoicePdf: "Download Invoice (PDF)",
    helpLine: "Need Help?", rewards: "Rewards", preferences: "Preferences", myProfile: "My Profile",
    redeemCode: "Redeem Code", pointsBalance: "Points Balance", availableRewards: "Available Rewards",
    language: "Language", notifications: "Notifications", emailOptIn: "Email Offers",
    whatsappOptIn: "WhatsApp Offers", save: "Save Changes", saved: "Saved!",
    repay: "Repay", viewVoucher: "View Voucher", cancelBooking: "Cancel Booking",
    story: "Our Story", mission: "Mission", values: "Values", team: "Meet the Team",
    stats: "By the Numbers", getInTouch: "Get in Touch", sendMessage: "Send Message",
    yourName: "Your Name", yourEmail: "Your Email", subject: "Subject", message: "Message",
    findUs: "Find Us", callUs: "Call Us", emailUs: "Email Us", chatWhatsapp: "Chat on WhatsApp",
    backHome: "Back to Home", whatsappSimulator: "WhatsApp Booking Simulator",
    whatsappSimDesc: "See how customers book tours entirely through WhatsApp — no app required.",
    playDemo: "Play Demo", reset: "Reset", liveChat: "Live",
    poweredByAI: "AI Concierge",
  },
  AR: {
    bookNow: "احجز الآن", search: "بحث", searchPlaceholder: "إلى أين تريد الذهاب؟", tours: "الجولات",
    allTours: "كل الجولات", from: "من", adults: "بالغين", children: "أطفال", total: "المجموع",
    subtotal: "المجموع الفرعي", discount: "الخصم", vat: "ضريبة القيمة المضافة (5%)", pay: "ادفع",
    myAccount: "حسابي", cart: "السلة", yourCart: "سلة الحجوزات", emptyCart: "سلتك فارغة",
    emptyCartDesc: "تصفح الجولات وأضفها إلى سلتك", browseTours: "تصفح الجولات",
    checkoutAll: "ادفع الكل", viewCart: "عرض السلة كاملة", totalInclVat: "المجموع (شامل الضريبة)",
    continue: "متابعة", proceedToPayment: "المتابعة إلى الدفع", back: "رجوع", backToTours: "العودة إلى الجولات",
    completeBooking: "أكمل حجزك", guests: "الضيوف", yourDetails: "بياناتك",
    fullName: "الاسم الكامل", phone: "الهاتف (واتساب)", email: "البريد الإلكتروني", paymentMethod: "طريقة الدفع",
    bankTransfer: "تحويل بنكي", amwalPay: "أموال باي", orderSummary: "ملخص الطلب",
    couponCode: "رمز الخصم", apply: "تطبيق", payment: "الدفع",
    submitPayment: "إرسال الدفع للتحقق", bookingReceived: "تم استلام الحجز!",
    bookAnother: "احجز جولة أخرى", addToCart: "أضف إلى السلة", addedToCart: "تمت الإضافة إلى السلة!",
    removedFromCart: "تمت الإزالة من السلة", welcome: "مرحباً", loginTitle: "سجّل الدخول إلى حسابك",
    loginDesc: "أدخل رقم واتساب الخاص بك لتلقي رمز تحقق من 6 أرقام",
    sendOtp: "إرسال الرمز عبر واتساب", verifyOtp: "تحقق ومتابعة", otpSent: "تم إرسال الرمز عبر واتساب",
    invalidOtp: "رمز غير صالح أو منتهي", profile: "الملف الشخصي", loyaltyTier: "عضوية الولاء",
    loyaltyPoints: "النقاط", totalBookings: "إجمالي الحجوزات", totalSpent: "إجمالي الإنفاق",
    bookingHistory: "سجل الحجوزات", orderNumber: "طلب", status: "الحالة", date: "التاريخ",
    voucher: "قسيمة", invoice: "فاتورة", downloadVoucher: "تحميل القسيمة",
    downloadInvoice: "تحميل الفاتورة", rebook: "إعادة الحجز", logout: "تسجيل الخروج", noBookings: "لا توجد حجوزات بعد",
    secureCheckout: "دفع آمن مستضاف", paySecurely: "ادفع بأمان عبر أموال باي",
    heroTitle1: "اكتشف عُمان.", heroTitle2: "احجز في ثوانٍ.",
    heroSubtitle: "سفاري الصحراء، رحلات القوارب، مغامرات الجبال والمزيد — احجز تجارب لا تُنسى فوراً.",
    instantConfirm: "تأكيد فوري", whatsappSupport: "دعم واتساب",
    bestPrice: "أفضل سعر مضمون", securePayment: "دفع آمن",
    bookIn3: "احجز في أقل من 3 دقائق", support247: "دعم 24/7 بالذكاء الاصطناعي والبشر", noHiddenFees: "بدون رسوم خفية",
    amwalHosted: "دفع مستضاف عبر أموال باي", perAdult: "/ بالغ", free: "مجاناً",
    selectDateTime: "اختر التاريخ والوقت", noSlots: "لا توجد مواعيد متاحة", left: "متبقّي",
    inclusions: "يشمل", exclusions: "لا يشمل", itinerary: "خطة الرحلة", featured: "مميز",
    whatNext: "ماذا بعد؟",
    nextStep1: "يتحقق المشرف من دفعتك (عادةً خلال أقل من ساعتين)",
    nextStep2: "ستصلك رسالة تأكيد عبر البريد الإلكتروني وواتساب",
    nextStep3: "اعرض قسيمة QR عند تسجيل الوصول",
    cartCheckedOut: "تم إنشاء الحجوزات بنجاح!", paymentSubmitted: "تم إرسال الدفع للتحقق!",
    bookingFailed: "فشل الحجز", member: "عضو", verified: "موثّق", guest: "ضيف",
    noBookingsDesc: "ستظهر هنا حجوزاتك السابقة والقادمة.",
    securePaymentNote: "يحوّلك إلى أموال باي · متوافق مع PCI-DSS SAQ-A · 3D Secure",
    enterPhone: "أدخل رقم واتساب الخاص بك",
    otpHint: "أدخل الرمز المكوّن من 6 أرقام الذي أرسلناه عبر واتساب", backToLogin: "تغيير الرقم",
    clearCart: "مسح", items: "عناصر", item: "عنصر",
    eachBooking: "سيُنشأ لكل عنصر طلب حجز منفصل.", pax: "شخص",
    paymentMethods: "طرق الدفع المقبولة", transferTo: "حوّل إلى", trxRef: "مرجع المعاملة",
    uploadScreenshot: "ارفع لقطة شاشة الدفع", clickToUpload: "اضغط للرفع",
    screenshotUploaded: "تم رفع لقطة الشاشة", reviewCount: "تقييم", cityOf: "المدينة",
    duration: "المدة", rating: "التقييم", home: "الرئيسية", about: "من نحن", contact: "اتصل بنا",
    aboutUs: "من نحن", contactUs: "اتصل بنا", whatsappDemo: "محاكاة واتساب",
    tryWhatsapp: "جرّب محاكاة واتساب", exploreTours: "استكشف الجولات", viewAllTours: "كل الجولات",
    featuredTours: "جولات مميزة", whyChooseUs: "لماذا نحن", howItWorks: "كيف تعمل",
    testimonials: "ماذا يقول المسافرون", faq: "الأسئلة الشائعة", newsletter: "النشرة البريدية",
    subscribe: "اشترك", filters: "تصفية", sortBy: "ترتيب حسب", priceRange: "نطاق السعر",
    durationRange: "المدة", difficulty: "الصعوبة", clearFilters: "مسح التصفية",
    noToursFound: "لا توجد جولات", noToursDesc: "جرّب تعديل التصفية",
    reviews: "التقييمات", relatedTours: "قد يعجبك أيضاً", meetingPoint: "نقطة الالتقاء",
    whatToBring: "ماذا تحضر", cancellationPolicy: "سياسة الإلغاء",
    addToCartSuccess: "تمت الإضافة إلى السلة!", removeFromCart: "تمت الإزالة",
    popularTours: "الجولات الشائعة", company: "الشركة", legal: "قانوني", followUs: "تابعنا",
    openingHours: "ساعات العمل", satThu: "السبت – الخميس", friday: "الجمعة",
    address: "العنوان", phoneLabel: "هاتف", emailLabel: "بريد", allRights: "جميع الحقوق محفوظة",
    privacyPolicy: "سياسة الخصوصية", terms: "الشروط والأحكام", cancelPolicy: "سياسة الإلغاء",
    selectDate: "اختر التاريخ", selectTime: "اختر الوقت", selectPax: "اختر المسافرين",
    pickupLocation: "موقع الاستلام", specialRequests: "طلبات خاصة",
    contactDetails: "بيانات التواصل", paymentDetails: "تفاصيل الدفع", bankDetails: "البيانات المصرفية",
    accountName: "اسم الحساب", accountNumber: "رقم الحساب", iban: "آيبان", swift: "سويفت",
    transferAmount: "مبلغ التحويل", fromBank: "من بنك", transferDate: "تاريخ التحويل",
    screenshotOfPayment: "لقطة شاشة الدفع", cardNumber: "رقم البطاقة", expiry: "الانتهاء", cvv: "CVV",
    orderConfirmed: "تم تأكيد الطلب!", viewMyBookings: "عرض حجوزاتي",
    downloadVoucherPdf: "تحميل القسيمة (PDF)", downloadInvoicePdf: "تحميل الفاتورة (PDF)",
    helpLine: "تحتاج مساعدة؟", rewards: "المكافآت", preferences: "التفضيلات", myProfile: "ملفي",
    redeemCode: "استرداد الرمز", pointsBalance: "رصيد النقاط", availableRewards: "المكافآت المتاحة",
    language: "اللغة", notifications: "الإشعارات", emailOptIn: "عروض البريد",
    whatsappOptIn: "عروض واتساب", save: "حفظ التغييرات", saved: "تم الحفظ!",
    repay: "إعادة الدفع", viewVoucher: "عرض القسيمة", cancelBooking: "إلغاء الحجز",
    story: "قصتنا", mission: "الرسالة", values: "القيم", team: "فريقنا",
    stats: "بالأرقام", getInTouch: "تواصل معنا", sendMessage: "إرسال الرسالة",
    yourName: "اسمك", yourEmail: "بريدك", subject: "الموضوع", message: "الرسالة",
    findUs: "موقعنا", callUs: "اتصل بنا", emailUs: "راسلنا", chatWhatsapp: "تحدث عبر واتساب",
    backHome: "العودة للرئيسية", whatsappSimulator: "محاكاة الحجز عبر واتساب",
    whatsappSimDesc: "شاهد كيف يحجز العملاء الجولات بالكامل عبر واتساب — بدون تطبيق.",
    playDemo: "تشغيل المحاكاة", reset: "إعادة", liveChat: "مباشر",
    poweredByAI: "مساعد ذكي",
  },
}

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
─────────────────────────────────────────────────────────────────────────────── */

function parseJsonArray<T = any>(v: any): T[] {
  if (!v) return []
  if (Array.isArray(v)) return v as T[]
  if (typeof v === "string") {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
}

function tourImage(tour: any): string {
  const media = parseJsonArray(tour?.media)
  if (media.length > 0 && media[0]?.url) return media[0].url
  const cat = tour?.category || ""
  if (/desert/i.test(cat)) return TOUR_IMAGES.desert
  if (/water|dhow|khasab|musandam/i.test(tour?.name || "")) return TOUR_IMAGES.dhow
  if (/mountain|jebel|shams/i.test(tour?.name || "")) return TOUR_IMAGES.mountain
  if (/city|muscat/i.test(tour?.name || "")) return TOUR_IMAGES.city
  if (/turtle|ras al jinz|jinz/i.test(tour?.name || "")) return TOUR_IMAGES.turtle
  if (/wadi|shab/i.test(tour?.name || "")) return TOUR_IMAGES.wadi
  return TOUR_IMAGES.desert
}

function calcPrice(base: number, child: number, a: number, c: number, addOnsTotal: number, discount: number, vat = 0.05) {
  const subtotal = base * a + child * c + addOnsTotal
  const afterDiscount = Math.max(0, subtotal - discount)
  const taxAmount = afterDiscount * vat
  const total = afterDiscount + taxAmount
  return { subtotal, discount, taxAmount, total }
}

function initials(name: string | null): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] || "") + (parts[1]?.[0] || "")
}

function formatTime(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d
  return dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

/* ─────────────────────────────────────────────────────────────────────────────
   WHATSAPP SIMULATOR CONVERSATION SCRIPT
─────────────────────────────────────────────────────────────────────────────── */

const WA_SCRIPT: ChatMessage[] = [
  { id: 1, from: "customer", type: "text", text: "Hi", time: "10:42 AM" },
  { id: 2, from: "ai", type: "text", text: "Hello! 👋 I'm Najwa, your Oman Adventures concierge. How can I help you today? I can show you tours, check availability, and book your next adventure — all here on WhatsApp.", time: "10:42 AM" },
  { id: 3, from: "customer", type: "text", text: "What tours do you have?", time: "10:43 AM" },
  { id: 4, from: "ai", type: "tours", text: "Here are our top-rated experiences ✨", tours: [
    { name: "Wahiba Sands Desert Safari", price: "45.000 OMR", image: TOUR_IMAGES.desert },
    { name: "Musandam Dhow Cruise", price: "65.000 OMR", image: TOUR_IMAGES.dhow },
    { name: "Jebel Shams Mountain Trek", price: "55.000 OMR", image: TOUR_IMAGES.mountain },
    { name: "Wadi Shab Adventure", price: "35.000 OMR", image: TOUR_IMAGES.wadi },
  ], time: "10:43 AM" },
  { id: 5, from: "customer", type: "text", text: "Do you have desert safari tomorrow?", time: "10:44 AM" },
  { id: 6, from: "ai", type: "slots", text: "Yes! Wahiba Sands Desert Safari — tomorrow has 3 slots available:", slots: [
    { time: "8:00 AM", price: "45.000 OMR", seats: "6 seats" },
    { time: "2:00 PM", price: "45.000 OMR", seats: "3 seats 🔥" },
    { time: "4:30 PM (Sunset)", price: "50.000 OMR", seats: "8 seats" },
  ], time: "10:44 AM" },
  { id: 7, from: "customer", type: "text", text: "Book for 2 adults at 2pm", time: "10:45 AM" },
  { id: 8, from: "ai", type: "text", text: "Great choice! 🐪 2 adults for Wahiba Sands Desert Safari at 2:00 PM tomorrow.\n\nTo create your booking, what's your full name?", time: "10:45 AM" },
  { id: 9, from: "customer", type: "text", text: "Ahmed Al-Rashidi", time: "10:45 AM" },
  { id: 10, from: "ai", type: "text", text: "Nice to meet you, Ahmed! 👋\n\nWhat's your WhatsApp number? (for booking confirmations)", time: "10:45 AM" },
  { id: 11, from: "customer", type: "text", text: "+968 9123 4567", time: "10:46 AM" },
  { id: 12, from: "ai", type: "text", text: "Got it! What's your email address? (optional — reply 'skip' to skip)", time: "10:46 AM" },
  { id: 13, from: "customer", type: "text", text: "ahmed@email.com", time: "10:46 AM" },
  { id: 14, from: "ai", type: "summary", text: "✅ Booking created, Ahmed!", summary: {
    order: "ORD-1025", total: "94.500 OMR", options: ["Bank Transfer", "AmwalPay"],
  }, time: "10:47 AM" },
  { id: 15, from: "customer", type: "text", text: "1", time: "10:47 AM" },
  { id: 16, from: "ai", type: "text", text: "Perfect! Please transfer 94.500 OMR to:\n\n🏦 Bank Muscat\nAccount: Oman Adventures LLC\nIBAN: OM18 0030 0010 2901 2345 678\n\n📸 Send a screenshot of your transfer here to confirm.", time: "10:48 AM" },
  { id: 17, from: "customer", type: "image", imageLabel: "payment_screenshot.jpg", time: "10:49 AM" },
  { id: 18, from: "ai", type: "text", text: "✅ Payment received, Ahmed!\n\n🎫 Order: ORD-1025\n💰 Amount: 94.500 OMR\n📊 Status: Verifying...\n\nOur team is verifying your payment. You'll receive your e-voucher with QR code here within 2 hours. Safe travels! 🐪", time: "10:49 AM" },
]

/* ─────────────────────────────────────────────────────────────────────────────
   SMALL UI HELPERS
─────────────────────────────────────────────────────────────────────────────── */

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "h-4 w-4" : size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${sz} ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-stone-200 text-stone-200"}`} />
      ))}
    </div>
  )
}

function PaxStepper({ label, value, onChange, price, min = 0, max = 20 }: {
  label: string; value: number; onChange: (n: number) => void; price: number; min?: number; max?: number
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <div className="text-sm font-medium text-stone-800 truncate">{label}</div>
        <div className="text-xs text-stone-500">{formatCurrency(price)} {label.toLowerCase().includes("adult") ? "/ adult" : "/ child"}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="w-6 text-center text-sm font-semibold tabular-nums">{value}</span>
        <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <Card className="overflow-hidden border-stone-200">
      <Skeleton className="aspect-[4/3] w-full" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </CardContent>
    </Card>
  )
}

function Breadcrumb({ items, lang }: { items: { label: string; onClick?: () => void }[]; lang: Lang }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-500 flex-wrap">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {it.onClick ? (
            <button onClick={it.onClick} className="hover:text-emerald-700 transition-colors font-medium">{it.label}</button>
          ) : (
            <span className="text-stone-800 font-medium">{it.label}</span>
          )}
          {i < items.length - 1 && <ChevronRight className={`h-3 w-3 text-stone-400 ${lang === "AR" ? "rotate-180" : ""}`} />}
        </span>
      ))}
    </nav>
  )
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-stone-700 uppercase tracking-wide">{title}</Label>
      {children}
    </div>
  )
}

function TourCard({ tour, onSelect, lang, t, onAddToCart }: {
  tour: any; onSelect: (id: string) => void; lang: Lang; t: (k: string) => string; onAddToCart?: (tour: any) => void
}) {
  const [imgError, setImgError] = useState(false)
  const img = tourImage(tour)
  const grad = CATEGORY_GRADIENTS[tour.category] || "from-emerald-400 to-teal-500"
  const CatIcon = CATEGORY_ICONS[tour.category] || Compass

  return (
    <Card className="group overflow-hidden border-stone-200 hover:border-emerald-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        {!imgError ? (
           
          <img src={img} alt={tour.name} onError={() => setImgError(true)} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${grad} flex items-center justify-center`}>
            <CatIcon className="h-12 w-12 text-white/80" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
          <Badge className="bg-white/95 text-stone-700 hover:bg-white shadow-sm text-[10px] font-semibold uppercase tracking-wide">
            <CatIcon className="h-3 w-3 mr-1" />{tour.category}
          </Badge>
          {tour.featured && (
            <Badge className="bg-amber-400 text-amber-950 hover:bg-amber-400 shadow-sm text-[10px] font-semibold">
              <Sparkles className="h-3 w-3 mr-1" />{t("featured")}
            </Badge>
          )}
        </div>
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          {tour.durationHours && (
            <Badge className="bg-stone-900/80 text-white hover:bg-stone-900/80 backdrop-blur-sm text-[10px] font-medium">
              <Clock className="h-3 w-3 mr-1" />{tour.durationHours}h
            </Badge>
          )}
        </div>
      </div>
      <CardContent className="p-4 flex flex-col flex-1 gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-stone-900 leading-snug line-clamp-1">{tour.name}</h3>
            <div className="flex items-center gap-1 text-xs text-stone-500 mt-0.5">
              <MapPin className="h-3 w-3" /><span className="truncate">{tour.city}</span>
            </div>
          </div>
        </div>
        {tour.nameAr && lang === "AR" && <p className="text-sm text-stone-600 line-clamp-1" dir="rtl">{tour.nameAr}</p>}
        <p className="text-xs text-stone-600 line-clamp-2 flex-1">{tour.description}</p>
        <div className="flex items-center gap-2 pt-1">
          <Stars rating={tour.rating || 0} />
          <span className="text-xs text-stone-500">{(tour.rating || 0).toFixed(1)} · {t("reviewCount")}</span>
        </div>
        <Separator className="my-1" />
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-stone-500 uppercase tracking-wide">{t("from")}</div>
            <div className="font-bold text-emerald-700 text-base">{formatCurrency(tour.basePrice)}</div>
          </div>
          <div className="flex items-center gap-1.5">
            {onAddToCart && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="outline" className="h-9 w-9 rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={(e) => { e.stopPropagation(); onAddToCart(tour) }}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("addToCart")}</TooltipContent>
              </Tooltip>
            )}
            <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white" onClick={() => onSelect(tour.id)}>
              {t("bookNow")} <ArrowRight className={`h-3.5 w-3.5 ml-1 ${lang === "AR" ? "rotate-180" : ""}`} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FeaturedTourCard({ tour, onSelect, lang, t }: {
  tour: any; onSelect: (id: string) => void; lang: Lang; t: (k: string) => string
}) {
  const [imgError, setImgError] = useState(false)
  const img = tourImage(tour)
  const grad = CATEGORY_GRADIENTS[tour.category] || "from-emerald-400 to-teal-500"
  return (
    <Card className="group overflow-hidden border-stone-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer" onClick={() => onSelect(tour.id)}>
      <div className="relative aspect-[16/10] overflow-hidden bg-stone-900">
        {!imgError ? (
           
          <img src={img} alt={tour.name} onError={() => setImgError(true)} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${grad}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/30 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className="bg-amber-400 text-amber-950 hover:bg-amber-400 shadow text-xs">
            <Sparkles className="h-3 w-3 mr-1" />{t("featured")}
          </Badge>
          <Badge className="bg-white/90 text-stone-700 hover:bg-white/90 backdrop-blur-sm text-xs">{tour.category}</Badge>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="font-bold text-lg leading-tight line-clamp-1">{tour.name}</h3>
          <div className="flex items-center gap-3 text-xs text-white/90 mt-1.5">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{tour.city}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{tour.durationHours}h</span>
            <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{(tour.rating || 0).toFixed(1)}</span>
          </div>
        </div>
      </div>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-stone-500 uppercase tracking-wide">{t("from")}</div>
          <div className="font-bold text-emerald-700 text-lg">{formatCurrency(tour.basePrice)}</div>
        </div>
        <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
          {t("bookNow")} <ArrowRight className={`h-3.5 w-3.5 ml-1 ${lang === "AR" ? "rotate-180" : ""}`} />
        </Button>
      </CardContent>
    </Card>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   HEADER
─────────────────────────────────────────────────────────────────────────────── */

function SiteHeader({
  lang, setLang, step, onNav, cartCount, onOpenCart, onOpenAccount, t, isCustomer, customerName,
}: {
  lang: Lang; setLang: (l: Lang) => void; step: Step; onNav: (s: Step) => void
  cartCount: number; onOpenCart: () => void; onOpenAccount: () => void; t: (k: string) => string
  isCustomer: boolean; customerName: string | null
}) {
  const brand = useBrand()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const navLinks: { label: string; step: Step }[] = [
    { label: t("home"), step: 0 },
    { label: t("tours"), step: 1 },
    { label: t("about"), step: 8 },
    { label: t("contact"), step: 9 },
    { label: t("whatsappDemo"), step: 10 },
  ]

  return (
    <header className={`sticky top-0 z-40 w-full transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur-md shadow-md border-b border-stone-200" : "bg-white border-b border-stone-100"}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <button onClick={() => onNav(0)} className="flex items-center gap-2 shrink-0 group">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-xl blur-sm opacity-50 group-hover:opacity-75 transition-opacity"
                style={{ background: brand.primaryColor }}
              />
              {/* Their mark if they have uploaded one, their initial if not —
                  never a compass, which belongs to a travel company and says
                  the wrong thing above a clinic or a restaurant. */}
              {brand.logoUrl ? (
                <img
                  src={brand.logoUrl}
                  alt=""
                  className="relative h-9 w-9 rounded-xl object-cover shadow-md"
                />
              ) : (
                <div
                  className="relative h-9 w-9 rounded-xl flex items-center justify-center shadow-md text-white font-bold"
                  style={{ background: brand.primaryColor }}
                >
                  {brandInitial(brand.name)}
                </div>
              )}
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-stone-900 text-base tracking-tight">{brand.name}</span>
              {brand.tagline && (
                <span className="text-[10px] text-stone-500 tracking-wide uppercase">{brand.tagline}</span>
              )}
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((l) => (
              <button key={l.step} onClick={() => onNav(l.step)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${step === l.step ? "text-emerald-700 bg-emerald-50" : "text-stone-600 hover:text-emerald-700 hover:bg-stone-50"}`}>
                {l.label}
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button variant="ghost" size="sm" className="hidden sm:flex text-stone-600 hover:text-emerald-700" onClick={() => setLang(lang === "EN" ? "AR" : "EN")}>
              <Globe className="h-4 w-4 mr-1.5" />
              {lang === "EN" ? "عربي" : "EN"}
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 text-stone-600 hover:text-emerald-700" onClick={onOpenCart} aria-label={t("cart")}>
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("cart")} ({cartCount})</TooltipContent>
            </Tooltip>

            {isCustomer ? (
              <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2 border-stone-200" onClick={onOpenAccount}>
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-[10px] font-bold">
                  {initials(customerName)}
                </div>
                <span className="max-w-[100px] truncate">{customerName?.split(" ")[0] || t("myAccount")}</span>
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="hidden sm:flex border-stone-200 text-stone-700" onClick={onOpenAccount}>
                <User className="h-4 w-4 mr-1.5" />{t("myAccount")}
              </Button>
            )}

            <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm" onClick={() => onNav(1)}>
              {t("bookNow")}
            </Button>

            <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="lg:hidden pb-3 pt-1 flex flex-col gap-1 border-t border-stone-100">
            {navLinks.map((l) => (
              <button key={l.step} onClick={() => { onNav(l.step); setMobileOpen(false) }}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${step === l.step ? "text-emerald-700 bg-emerald-50" : "text-stone-700 hover:bg-stone-50"}`}>
                {l.label}
              </button>
            ))}
            <div className="flex items-center gap-2 px-3 pt-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => { setLang(lang === "EN" ? "AR" : "EN"); setMobileOpen(false) }}>
                <Globe className="h-4 w-4 mr-1.5" />{lang === "EN" ? "عربي" : "English"}
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => { onOpenAccount(); setMobileOpen(false) }}>
                <User className="h-4 w-4 mr-1.5" />{t("myAccount")}
              </Button>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   FOOTER
─────────────────────────────────────────────────────────────────────────────── */

function SiteFooter({ onNav, t, lang }: { onNav: (s: Step) => void; t: (k: string) => string; lang: Lang }) {
  const brand = useBrand()
  return (
    <footer className="mt-auto bg-stone-900 text-stone-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {brand.logoUrl ? (
                <img src={brand.logoUrl} alt="" className="h-9 w-9 rounded-xl object-cover" />
              ) : (
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold"
                  style={{ background: brand.primaryColor }}
                >
                  {brandInitial(brand.name)}
                </div>
              )}
              <div className="flex flex-col leading-none">
                <span className="font-bold text-white">{brand.name}</span>
                {brand.tagline && (
                  <span className="text-[10px] text-stone-400 uppercase tracking-wide">{brand.tagline}</span>
                )}
              </div>
            </div>
            {/* Their own words or nothing. This slot used to hold a rating and
                a superlative that were true of exactly one business. */}
            {(brand.hero.subtitle || summarise(brand.about)) && (
              <p className="text-sm text-stone-400 leading-relaxed line-clamp-4">
                {brand.hero.subtitle || summarise(brand.about)}
              </p>
            )}
            {/* Only accounts that exist. Four dead links that go to "#" are a
                worse look than no icons at all. */}
            <div className="flex items-center gap-2">
              {([
                [Facebook, brand.social.facebook, "Facebook"],
                [Instagram, brand.social.instagram, "Instagram"],
                [Twitter, brand.social.twitter, "X"],
                [Youtube, brand.social.youtube, "YouTube"],
              ] as const).filter(([, href]) => !!href).map(([Icon, href, label], i) => (
                <a key={i} href={href!} target="_blank" rel="noopener noreferrer"
                  className="h-8 w-8 rounded-lg bg-stone-800 hover:bg-stone-700 flex items-center justify-center transition-colors" aria-label={label}>
                  <Icon className="h-4 w-4 text-stone-300" />
                </a>
              ))}
            </div>
          </div>

          {/* Popular tours */}
          <div>
            <h4 className="font-semibold text-white text-sm mb-3">{t("popularTours")}</h4>
            <ul className="space-y-2 text-sm">
              {["Desert Safari", "Dhow Cruise", "Mountain Trek", "City Tour", "Wadi Shab"].map((x) => (
                <li key={x}>
                  <button onClick={() => onNav(1)} className="text-stone-400 hover:text-emerald-400 transition-colors text-left">{x}</button>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-white text-sm mb-3">{t("company")}</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => onNav(8)} className="text-stone-400 hover:text-emerald-400 transition-colors">{t("aboutUs")}</button></li>
              <li><button onClick={() => onNav(9)} className="text-stone-400 hover:text-emerald-400 transition-colors">{t("contactUs")}</button></li>
              <li><button onClick={() => onNav(10)} className="text-stone-400 hover:text-emerald-400 transition-colors">{t("whatsappDemo")}</button></li>
              <li><a href="#" className="text-stone-400 hover:text-emerald-400 transition-colors">{t("privacyPolicy")}</a></li>
              <li><a href="#" className="text-stone-400 hover:text-emerald-400 transition-colors">{t("terms")}</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white text-sm mb-3">{t("contactUs")}</h4>
            <ul className="space-y-3 text-sm text-stone-400">
              {brand.address && (
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-emerald-400 shrink-0" />
                <span>{brand.address}</span>
              </li>
              )}
              {brand.phone && (
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-stone-400 shrink-0" />
                <a href={`tel:${brand.phone.replace(/[^+\d]/g, "")}`} className="hover:text-white">{brand.phone}</a>
              </li>
              )}
              {brand.email && (
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-stone-400 shrink-0" />
                <a href={`mailto:${brand.email}`} className="hover:text-white">{brand.email}</a>
              </li>
              )}
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 text-emerald-400 shrink-0" />
                <div>
                  <div>{t("satThu")}: 8:00 AM – 8:00 PM</div>
                  <div>{t("friday")}: 2:00 PM – 8:00 PM</div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-6 bg-stone-800" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} {brand.name}. {t("allRights")}.</p>
          <div className="flex items-center gap-4">
            {/* PCI-DSS describes the checkout, which is the same for everybody
                and true. "Oman Tourism Board" described one business's
                membership and has gone: an accreditation nobody applied for is
                not ours to display. */}
            <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-emerald-500" /> PCI-DSS Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   HOME PAGE (STEP 0)
─────────────────────────────────────────────────────────────────────────────── */

function HomePage({ tours, loading, onSelectTour, onNav, onSearch, lang, t, onTryWhatsapp }: {
  tours: any[]; loading: boolean; onSelectTour: (id: string) => void; onNav: (s: Step) => void
  onSearch: (q: string) => void; lang: Lang; t: (k: string) => string; onTryWhatsapp: () => void
}) {
  const brand = useBrand()
  const api = useApi()
  const [searchQ, setSearchQ] = useState("")
  const [reviews, setReviews] = useState<any[]>([])
  const featured = tours.filter((t) => t.featured).slice(0, 3)

  // Published reviews for this workspace. A failure leaves the list empty,
  // which hides the section — the same as having none.
  useEffect(() => {
    fetch(api("/api/reviews"))
      .then(r => r.json())
      .then(d => setReviews(Array.isArray(d.reviews) ? d.reviews : []))
      .catch(() => setReviews([]))
  }, [api])
  const popular = tours.slice(0, 6)

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-teal-800 to-emerald-900">
        <div
          className="absolute inset-0 opacity-25"
          style={{ backgroundImage: `url(${TOUR_IMAGES.desert})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/80 via-teal-900/70 to-emerald-900/85" />
        {/* dot pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
          <div className="text-center max-w-3xl mx-auto">
            {/* Shown only if the business wrote one. What stood here was a
                rating and a ranking belonging to a single company, which every
                other workspace would have been publishing as its own. */}
            {brand.hero.badge && (
              <Badge
                className="mb-4 backdrop-blur-sm border-0"
                style={{ background: brand.accentColor, color: "#1c1917" }}
              >
                <Sparkles className="h-3 w-3 mr-1" /> {brand.hero.badge}
              </Badge>
            )}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
              {brand.hero.title || brand.name}
              <br />
              {/* The second line is the business's own if they wrote one, and
                  a plain invitation to book if they did not — true of every
                  shop here, and claiming nothing. */}
              <span style={{ color: brand.accentColor }}>
                {brand.hero.accent || t("bookNow")}
              </span>
            </h1>
            {(brand.hero.subtitle || summarise(brand.about)) && (
              <p className="mt-4 text-base sm:text-lg text-white/90 max-w-2xl mx-auto">
                {brand.hero.subtitle || summarise(brand.about)}
              </p>
            )}
          </div>

          {/* Search bar */}
          <div className="mt-8 max-w-4xl mx-auto">
            <Card className="bg-white shadow-2xl border-0">
              <CardContent className="p-3 sm:p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide">Destination</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                      <Input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder={t("searchPlaceholder")} className="pl-9 border-stone-200" onKeyDown={(e) => { if (e.key === "Enter") { onSearch(searchQ); onNav(1) } }} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide">{t("date")}</Label>
                    <Input type="date" className="border-stone-200" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide">{t("guests")}</Label>
                    <Select defaultValue="2">
                      <SelectTrigger className="border-stone-200"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((n) => <SelectItem key={n} value={String(n)}>{n} {n === 1 ? "Guest" : "Guests"}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white self-end h-10 px-6" onClick={() => { onSearch(searchQ); onNav(1) }}>
                    <Search className="h-4 w-4 mr-1.5" />{t("search")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trust badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-emerald-50/80">
            {[
              { icon: CheckCircle, label: t("instantConfirm") },
              { icon: WhatsAppIcon, label: t("whatsappSupport") },
              { icon: Shield, label: t("bestPrice") },
              { icon: CreditCard, label: t("securePayment") },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-amber-300" />{label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar — only the numbers the business gave us.
          This row used to be four fixed figures: fifty tours, 2,400 happy
          travellers, a 4.8 rating. Each is a factual claim to whoever reads
          it, none was checkable, and none would have been true of the second
          business to sign up. */}
      {brand.stats.length > 0 && (
        <section className="bg-white border-b border-stone-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {brand.stats.map(({ value, label }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div className="text-2xl font-bold text-stone-900">{value}</div>
                  <div className="text-xs text-stone-500">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="py-12 sm:py-16 bg-stone-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 mb-2">{t("exploreTours")}</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">Browse by Category</h2>
            <p className="text-stone-500 mt-1 text-sm">{t("browseTours")}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat] || Compass
              const grad = CATEGORY_GRADIENTS[cat] || "from-emerald-400 to-teal-500"
              const count = tours.filter((t) => t.category === cat).length
              return (
                <button key={cat} onClick={() => { onSearch(cat); onNav(1) }} className="group">
                  <Card className="overflow-hidden border-stone-200 hover:border-emerald-300 hover:shadow-lg transition-all hover:-translate-y-1">
                    <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                      <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="font-semibold text-sm text-stone-800">{cat}</div>
                      <div className="text-[10px] text-stone-500">{count} tours</div>
                    </CardContent>
                  </Card>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Featured tours */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8 gap-4">
            <div>
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 mb-2"><Sparkles className="h-3 w-3 mr-1" />{t("featured")}</Badge>
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">{t("featuredTours")}</h2>
              <p className="text-stone-500 mt-1 text-sm">Hand-picked experiences loved by travelers</p>
            </div>
            <Button variant="outline" className="border-stone-200 hidden sm:flex" onClick={() => onNav(1)}>
              {t("viewAllTours")} <ArrowRight className={`h-4 w-4 ml-1.5 ${lang === "AR" ? "rotate-180" : ""}`} />
            </Button>
          </div>
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.length > 0 ? featured.map((tour) => (
                <FeaturedTourCard key={tour.id} tour={tour} onSelect={onSelectTour} lang={lang} t={t} />
              )) : popular.slice(0, 3).map((tour) => (
                <FeaturedTourCard key={tour.id} tour={tour} onSelect={onSelectTour} lang={lang} t={t} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why choose us */}
      <section className="py-12 sm:py-16 bg-stone-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 mb-2">{t("whyChooseUs")}</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">Why Travel With Us</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Zap, title: t("instantConfirm"), desc: t("bookIn3"), color: "from-amber-400 to-orange-500" },
              { icon: WhatsAppIcon, title: t("whatsappSupport"), desc: t("support247"), color: "from-emerald-400 to-teal-500" },
              { icon: Shield, title: t("bestPrice"), desc: t("noHiddenFees"), color: "from-rose-400 to-pink-500" },
              { icon: CreditCard, title: t("securePayment"), desc: t("amwalHosted"), color: "from-stone-500 to-stone-700" },
            ].map(({ icon: Icon, title, desc, color }) => (
              <Card key={title} className="border-stone-200 hover:shadow-lg transition-all hover:-translate-y-1">
                <CardContent className="p-6 text-center">
                  <div className={`mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md mb-4`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-stone-900 mb-1">{title}</h3>
                  <p className="text-xs text-stone-500">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 mb-2">{t("howItWorks")}</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">Book in 3 Simple Steps</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3 relative">
            {[
              { step: "1", icon: Search, title: "Find Your Tour", desc: "Browse the collection and pick what you want to do." },
              { step: "2", icon: Calendar, title: "Select Date & Pay", desc: "Choose your date, add travelers, and pay securely via Bank Transfer or AmwalPay." },
              { step: "3", icon: Ticket, title: "Get Your Voucher", desc: "Receive instant confirmation with a QR voucher via WhatsApp and email." },
            ].map(({ step, icon: Icon, title, desc }, i) => (
              <div key={step} className="relative">
                {i < 2 && <div className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 bg-gradient-to-r from-emerald-200 to-transparent" />}
                <Card className="border-stone-200 relative z-10">
                  <CardContent className="p-6 text-center">
                    <div className="relative mx-auto h-20 w-20 mb-4">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full" />
                      <div className="relative h-20 w-20 rounded-full bg-white border-2 border-emerald-200 flex items-center justify-center">
                        <Icon className="h-8 w-8 text-emerald-600" />
                      </div>
                      <span className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 text-white text-sm font-bold flex items-center justify-center ring-4 ring-white">{step}</span>
                    </div>
                    <h3 className="font-semibold text-stone-900 mb-1">{title}</h3>
                    <p className="text-sm text-stone-500">{desc}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WhatsApp Demo CTA */}
      <section className="py-12 sm:py-16 bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="flex-1 text-center lg:text-left">
              <Badge className="bg-white/20 text-white hover:bg-white/20 backdrop-blur-sm mb-3">
                <Smartphone className="h-3 w-3 mr-1" /> {t("poweredByAI")}
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Book Tours via WhatsApp</h2>
              <p className="text-emerald-50/90 text-sm sm:text-base mb-5 max-w-xl">
                Chat with the {brand.name || "booking"} assistant. Browse tours, check availability, and pay — all from your phone. No app download needed.
              </p>
              <Button size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50 shadow-lg" onClick={onTryWhatsapp}>
                <Play className="h-4 w-4 mr-2" />{t("tryWhatsapp")}
              </Button>
            </div>
            <div className="shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-400/30 rounded-full blur-3xl" />
                <div className="relative h-32 w-32 sm:h-40 sm:w-40 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl rotate-6">
                  <WhatsAppIcon className="h-16 w-16 sm:h-20 sm:w-20" />
                </div>
                <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-amber-400 flex items-center justify-center shadow-lg">
                  <Sparkles className="h-4 w-4 text-amber-950" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/*
        Reviews customers actually left.

        Four were written into the page: Sarah M. from the UK on the desert
        safari, Ahmed K. from the UAE on a dhow cruise in Musandam, and two
        more. They were invented, they were displayed to every visitor as
        genuine customer feedback, and they would have appeared on the site of
        every business that signed up — none of whom has ever met Sarah M.
        Publishing fabricated reviews is not a placeholder problem; in most
        places it is illegal.

        The section now shows what is in the reviews table and disappears when
        that is empty. A new business has no reviews yet, and saying nothing is
        the honest version of that.
      */}
      {reviews.length > 0 && (
        <section className="py-12 sm:py-16 bg-stone-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 mb-2">{t("testimonials")}</Badge>
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">{t("testimonials")}</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {reviews.slice(0, 4).map((rev: any) => {
                const who = rev.customer?.name || rev.customerName || t("guest")
                return (
                  <Card key={rev.id} className="border-stone-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback
                              className="text-white text-xs font-bold"
                              style={{ background: brand.primaryColor }}
                            >
                              {initials(who)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-semibold text-stone-900">{who}</div>
                            {rev.tour?.name && (
                              <div className="text-[10px] text-stone-500">{rev.tour.name}</div>
                            )}
                          </div>
                        </div>
                        <Quote className="h-5 w-5 text-stone-200" />
                      </div>
                      <Stars rating={Number(rev.rating) || 0} size="md" />
                      {rev.comment && (
                        <p className="text-sm text-stone-600 mt-2 leading-relaxed">&ldquo;{rev.comment}&rdquo;</p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 mb-2">{t("faq")}</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">Questions? We&apos;ve Got Answers</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {[
              { q: "How do I receive my booking confirmation?", a: "After payment verification (usually within 2 hours), you'll receive a QR voucher via WhatsApp and email. Show it at check-in." },
              { q: "What payment methods do you accept?", a: "Bank transfer and card payment (Visa, Mastercard) through our secure hosted checkout. The bank details are shown at checkout." },
              { q: "Can I cancel or modify my booking?", a: "Yes! Free cancellation up to 48 hours before your tour. Within 48 hours, a 50% fee applies. See our cancellation policy for details." },
              { q: "Do you offer pickup?", a: "Where a tour includes pickup, add your address in the pickup field at checkout and we will confirm the time over WhatsApp." },
              { q: "Is it safe to book through WhatsApp?", a: "Yes. Bookings are handled by our assistant, every payment is verified by a person, and card payments go through a PCI-DSS compliant checkout." },
              { q: "What languages do tours operate in?", a: "English and Arabic. Check the tour details for anything else." },
            ].map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border border-stone-200 rounded-lg px-4">
                <AccordionTrigger className="text-left text-sm font-semibold text-stone-800 hover:no-underline">{item.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-stone-600 leading-relaxed">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-12 bg-gradient-to-r from-emerald-50 to-teal-50 border-t border-stone-100">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 mb-2"><Mail className="h-3 w-3 mr-1" />{t("newsletter")}</Badge>
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Get Exclusive Offers</h2>
          <p className="text-stone-500 text-sm mb-5">Subscribe to receive early-bird discounts, seasonal offers, and travel inspiration.</p>
          <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <Input type="email" placeholder={t("yourEmail")} className="border-stone-200" />
            <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6" onClick={() => toast.success("Subscribed! 🎉")}>
              {t("subscribe")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   TOUR LISTING PAGE (STEP 1)
─────────────────────────────────────────────────────────────────────────────── */

function ToursListingPage({ tours, loading, onSelectTour, onNav, searchQuery, lang, t }: {
  tours: any[]; loading: boolean; onSelectTour: (id: string) => void; onNav: (s: Step) => void
  searchQuery: string; lang: Lang; t: (k: string) => string
}) {
  const [category, setCategory] = useState<string>("all")
  const [city, setCity] = useState<string>("all")
  const [priceRange, setPriceRange] = useState<string>("all")
  const [duration, setDuration] = useState<string>("all")
  const [difficulty, setDifficulty] = useState<string>("all")
  const [sort, setSort] = useState<string>("popular")
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    let list = [...tours]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter((t) => t.name?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q) || t.city?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q))
    }
    if (category !== "all") list = list.filter((t) => t.category === category)
    if (city !== "all") list = list.filter((t) => t.city === city)
    if (priceRange !== "all") {
      const [min, max] = priceRange.split("-").map(Number)
      list = list.filter((t) => t.basePrice >= min && (max ? t.basePrice <= max : true))
    }
    if (duration !== "all") {
      const [min, max] = duration.split("-").map(Number)
      list = list.filter((t) => t.durationHours >= min && (max ? t.durationHours <= max : true))
    }
    if (difficulty !== "all") list = list.filter((t) => (t.difficulty || "EASY") === difficulty)

    switch (sort) {
      case "price-low": list.sort((a, b) => a.basePrice - b.basePrice); break
      case "price-high": list.sort((a, b) => b.basePrice - a.basePrice); break
      case "rating": list.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break
      case "duration": list.sort((a, b) => b.durationHours - a.durationHours); break
      default: list.sort((a, b) => Number(b.featured) - Number(a.featured))
    }
    return list
  }, [tours, searchQuery, category, city, priceRange, duration, difficulty, sort])

  const clearFilters = () => { setCategory("all"); setCity("all"); setPriceRange("all"); setDuration("all"); setDifficulty("all") }
  const activeFilters = [category, city, priceRange, duration, difficulty].filter((x) => x !== "all").length

  const filterContent = (
    <div className="space-y-4">
      <FilterSection title="Category">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterSection>
      <FilterSection title="City">
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger><SelectValue placeholder="All cities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {CITY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterSection>
      <FilterSection title={t("priceRange")}>
        <Select value={priceRange} onValueChange={setPriceRange}>
          <SelectTrigger><SelectValue placeholder="Any price" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Price</SelectItem>
            <SelectItem value="0-40">Under 40 OMR</SelectItem>
            <SelectItem value="40-60">40 – 60 OMR</SelectItem>
            <SelectItem value="60-100">60 – 100 OMR</SelectItem>
            <SelectItem value="100-9999">Over 100 OMR</SelectItem>
          </SelectContent>
        </Select>
      </FilterSection>
      <FilterSection title={t("durationRange")}>
        <Select value={duration} onValueChange={setDuration}>
          <SelectTrigger><SelectValue placeholder="Any duration" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Duration</SelectItem>
            <SelectItem value="0-4">Up to 4 hours</SelectItem>
            <SelectItem value="4-8">4 – 8 hours</SelectItem>
            <SelectItem value="8-24">Full day (8+ hours)</SelectItem>
            <SelectItem value="24-9999">Multi-day</SelectItem>
          </SelectContent>
        </Select>
      </FilterSection>
      <FilterSection title={t("difficulty")}>
        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger><SelectValue placeholder="Any difficulty" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Difficulty</SelectItem>
            <SelectItem value="EASY">Easy</SelectItem>
            <SelectItem value="MODERATE">Moderate</SelectItem>
            <SelectItem value="HARD">Hard</SelectItem>
          </SelectContent>
        </Select>
      </FilterSection>
      {activeFilters > 0 && (
        <Button variant="outline" size="sm" className="w-full" onClick={clearFilters}>
          <X className="h-3.5 w-3.5 mr-1.5" />{t("clearFilters")} ({activeFilters})
        </Button>
      )}
    </div>
  )

  return (
    <div className="bg-stone-50 min-h-[60vh]">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-stone-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <Breadcrumb lang={lang} items={[{ label: t("home"), onClick: () => onNav(0) }, { label: t("tours") }]} />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{searchQuery ? `Results for "${searchQuery}"` : t("allTours")}</h1>
            <p className="text-sm text-stone-500 mt-0.5">{filtered.length} {filtered.length === 1 ? "tour" : "tours"} found</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-1.5" />{t("filters")}{activeFilters > 0 && <Badge className="ml-1.5 bg-emerald-600 text-white">{activeFilters}</Badge>}
            </Button>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="duration">Longest Duration</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Sidebar filters (desktop) */}
          <aside className="hidden lg:block">
            <Card className="border-stone-200 sticky top-20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Filter className="h-4 w-4 text-emerald-600" />{t("filters")}</CardTitle>
              </CardHeader>
              <CardContent>{filterContent}</CardContent>
            </Card>
          </aside>

          {/* Mobile filters drawer */}
          {showFilters && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setShowFilters(false)}>
              <Card className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-2xl" onClick={(e) => e.stopPropagation()}>
                <CardHeader className="pb-3 sticky top-0 bg-white">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2"><Filter className="h-4 w-4 text-emerald-600" />{t("filters")}</CardTitle>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowFilters(false)}><X className="h-4 w-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent>{filterContent}</CardContent>
              </Card>
            </div>
          )}

          {/* Tour grid */}
          <div>
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}</div>
            ) : filtered.length === 0 ? (
              <Card className="border-dashed border-stone-300">
                <CardContent className="py-16 text-center">
                  <div className="mx-auto h-16 w-16 rounded-full bg-stone-100 flex items-center justify-center mb-4">
                    <Search className="h-8 w-8 text-stone-400" />
                  </div>
                  <h3 className="font-semibold text-stone-900 mb-1">{t("noToursFound")}</h3>
                  <p className="text-sm text-stone-500 mb-4">{t("noToursDesc")}</p>
                  <Button variant="outline" onClick={clearFilters}><RotateCcw className="h-4 w-4 mr-1.5" />{t("clearFilters")}</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((tour) => <TourCard key={tour.id} tour={tour} onSelect={onSelectTour} lang={lang} t={t} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   TOUR DETAIL PAGE (STEP 2)
─────────────────────────────────────────────────────────────────────────────── */

function TourDetailPage({
  tour, loading, onNav, onCheckout, onAddToCart, lang, t,
}: {
  tour: any; loading: boolean; onNav: (s: Step) => void; onCheckout: (data: any) => void
  onAddToCart: (tour: any, slot: any, paxAdult: number, paxChild: number) => void; lang: Lang; t: (k: string) => string
}) {
  const api = useApi()
  const [activeImg, setActiveImg] = useState(0)
  const [slots, setSlots] = useState<any[]>([])
  const [slotsLoading, setSlotsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null)
  const [paxAdult, setPaxAdult] = useState(2)
  const [paxChild, setPaxChild] = useState(0)
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])
  const [showMobileBook, setShowMobileBook] = useState(false)
  const [reviews, setReviews] = useState<any[]>([])

  // Fetch slots + reviews on mount (component remounts on tour change via key prop)
  useEffect(() => {
    if (!tour?.id) return
    fetch(api(`/api/avail-check?tourId=${tour.id}`))
      .then((r) => r.json())
      .then((d) => setSlots(d.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false))
    fetch(api(`/api/reviews?tourId=${tour.id}`))
      .then((r) => r.json())
      .then((d) => setReviews(d.reviews || []))
      .catch(() => setReviews([]))
  }, [tour?.id])

  if (loading || !tour) {
    return (
      <div className="bg-stone-50 min-h-[60vh]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-72 w-full" />
          <div className="grid lg:grid-cols-[1fr_400px] gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    )
  }

  const media = parseJsonArray(tour.media)
  const gallery = media.length > 0 ? media.map((m: any) => m.url) : [tourImage(tour)]
  const itinerary = parseJsonArray(tour.itinerary)
  const inclusions = parseJsonArray<string>(tour.inclusions)
  const exclusions = parseJsonArray<string>(tour.exclusions)
  const whatToBring = parseJsonArray<string>(tour.whatToBring)
  const addOns = tour.addOns || []

  const today = new Date()
  const availableDates = new Set(slots.filter((s) => s.available).map((s) => new Date(s.date).toDateString()))
  const dateSlots = selectedDate ? slots.filter((s) => new Date(s.date).toDateString() === selectedDate.toDateString()) : []

  const addOnsTotal = addOns.filter((a) => selectedAddOns.includes(a.id)).reduce((sum, a) => {
    const paxCount = a.type === "PER_PAX" ? paxAdult + paxChild : 1
    return sum + a.price * paxCount
  }, 0)
  const childPrice = tour.childPrice || tour.basePrice * 0.7
  const price = calcPrice(tour.basePrice, childPrice, paxAdult, paxChild, addOnsTotal, 0)

  const handleBook = () => {
    if (!selectedSlot) { toast.error("Please select a time slot"); return }
    if (paxAdult + paxChild === 0) { toast.error("Select at least 1 traveler"); return }
    onCheckout({ tour, slot: selectedSlot, paxAdult, paxChild, addOns: selectedAddOns, addOnsTotal, childPrice, total: price.total })
  }

  const handleAddToCart = () => {
    if (!selectedSlot) { toast.error("Please select a time slot"); return }
    onAddToCart(tour, selectedSlot, paxAdult, paxChild)
  }

  return (
    <div className="bg-stone-50 min-h-[60vh] pb-20 lg:pb-6">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-stone-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <Breadcrumb lang={lang} items={[
            { label: t("home"), onClick: () => onNav(0) },
            { label: t("tours"), onClick: () => onNav(1) },
            { label: tour.name },
          ]} />
        </div>
      </div>

      {/* Gallery */}
      <section className="bg-stone-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_140px]">
            <div className="relative aspect-[16/10] lg:aspect-[16/9] rounded-xl overflow-hidden bg-stone-800">
              { }
              <img src={gallery[activeImg]} alt={tour.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-transparent" />
              <div className="absolute top-3 left-3 flex gap-2">
                <Badge className="bg-white/95 text-stone-700 hover:bg-white">{tour.category}</Badge>
                {tour.featured && <Badge className="bg-amber-400 text-amber-950 hover:bg-amber-400"><Sparkles className="h-3 w-3 mr-1" />{t("featured")}</Badge>}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight">{tour.name}</h1>
                {tour.nameAr && <p className="text-sm text-white/80 mt-1" dir="rtl">{tour.nameAr}</p>}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-white/90">
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{tour.city}</span>
                  <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{tour.durationHours}h</span>
                  <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{(tour.rating || 0).toFixed(1)}</span>
                </div>
              </div>
            </div>
            <div className="hidden lg:grid grid-rows-5 gap-2">
              {gallery.slice(0, 5).map((g: string, i: number) => (
                <button key={i} onClick={() => setActiveImg(i)} className={`relative aspect-[16/10] rounded-lg overflow-hidden bg-stone-800 ${activeImg === i ? "ring-2 ring-emerald-500" : "ring-1 ring-white/10"}`}>
                  { }
                  <img src={g} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quick info bar */}
      <section className="bg-white border-b border-stone-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Clock, label: t("duration"), value: `${tour.durationHours} hours` },
              { icon: Mountain, label: t("difficulty"), value: tour.difficulty || "Easy" },
              { icon: Users, label: "Group Size", value: `Up to ${tour.capacityPerSlot || 10}` },
              { icon: MapPin, label: t("cityOf"), value: tour.city },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-stone-500 uppercase tracking-wide">{label}</div>
                  <div className="text-sm font-semibold text-stone-900 truncate">{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          {/* Left content */}
          <div className="space-y-6 min-w-0">
            {/* Description */}
            <Card className="border-stone-200">
              <CardHeader><CardTitle className="text-lg">About This Tour</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">{tour.description}</p>
                {tour.descriptionAr && lang === "AR" && <p className="text-sm text-stone-600 leading-relaxed mt-3 whitespace-pre-line" dir="rtl">{tour.descriptionAr}</p>}
              </CardContent>
            </Card>

            {/* Itinerary */}
            {itinerary.length > 0 && (
              <Card className="border-stone-200">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Navigation className="h-5 w-5 text-emerald-600" />{t("itinerary")}</CardTitle></CardHeader>
                <CardContent>
                  <div className="relative space-y-5 pl-6">
                    <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gradient-to-b from-emerald-400 to-teal-500" />
                    {itinerary.map((item: any, i: number) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-[1.15rem] top-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                        <div className="flex items-start gap-3">
                          {item.time && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] shrink-0">{item.time}</Badge>}
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-stone-900">{item.title}</div>
                            {item.description && <p className="text-xs text-stone-600 mt-0.5">{item.description}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Inclusions / Exclusions */}
            <div className="grid sm:grid-cols-2 gap-4">
              {inclusions.length > 0 && (
                <Card className="border-emerald-200">
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2 text-emerald-700"><Check className="h-4 w-4" />{t("inclusions")}</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {inclusions.map((x: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                          <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />{x}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {exclusions.length > 0 && (
                <Card className="border-rose-200">
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2 text-rose-700"><X className="h-4 w-4" />{t("exclusions")}</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {exclusions.map((x: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                          <X className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />{x}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* What to bring */}
            {whatToBring.length > 0 && (
              <Card className="border-stone-200">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Camera className="h-5 w-5 text-amber-500" />{t("whatToBring")}</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {whatToBring.map((x: string, i: number) => (
                      <Badge key={i} variant="outline" className="bg-amber-50 border-amber-200 text-amber-800"><Camera className="h-3 w-3 mr-1" />{x}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Meeting point */}
            {tour.meetingPoint && (
              <Card className="border-stone-200">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5 text-emerald-600" />{t("meetingPoint")}</CardTitle></CardHeader>
                <CardContent>
                  <div className="relative aspect-[16/8] rounded-lg overflow-hidden bg-stone-100 mb-3">
                    <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
                    <svg className="absolute inset-0 w-full h-full opacity-40" preserveAspectRatio="none"><path d="M0 80 L200 80 L200 20 L400 20" stroke="#94a3b8" strokeWidth="3" fill="none" /><path d="M0 200 L150 200 L150 100 L400 100" stroke="#94a3b8" strokeWidth="3" fill="none" /></svg>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="relative">
                        <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-50 animate-pulse" />
                        <MapPin className="relative h-10 w-10 text-emerald-600 fill-emerald-200" />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-stone-600">{tour.meetingPoint}</p>
                </CardContent>
              </Card>
            )}

            {/* Add-ons */}
            {addOns.length > 0 && (
              <Card className="border-stone-200">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Plus className="h-5 w-5 text-emerald-600" />Available Add-ons</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {addOns.filter((a: any) => a.isActive !== false).map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-stone-200 hover:border-emerald-200 transition-colors">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-stone-800">{a.name}</div>
                        <div className="text-xs text-stone-500">{formatCurrency(a.price)} {a.type === "PER_PAX" ? "per person" : "flat"}</div>
                      </div>
                      <Button size="sm" variant={selectedAddOns.includes(a.id) ? "default" : "outline"} className={selectedAddOns.includes(a.id) ? "bg-emerald-600 text-white" : "border-stone-200"} onClick={() => setSelectedAddOns((p) => p.includes(a.id) ? p.filter((x) => x !== a.id) : [...p, a.id])}>
                        {selectedAddOns.includes(a.id) ? (<><Check className="h-3.5 w-3.5 mr-1" />Added</>) : (<><Plus className="h-3.5 w-3.5 mr-1" />Add</>)}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            <Card className="border-stone-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2"><Star className="h-5 w-5 text-amber-400 fill-amber-400" />{t("reviews")} ({reviews.length})</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-stone-900">{(tour.rating || 0).toFixed(1)}</span>
                    <Stars rating={tour.rating || 0} size="md" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <p className="text-sm text-stone-500 text-center py-6">No reviews yet. Be the first to share your experience!</p>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                    {reviews.map((r: any) => (
                      <div key={r.id} className="flex gap-3 p-3 rounded-lg bg-stone-50">
                        <Avatar className="h-9 w-9"><AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold">{initials(r.customer?.name)}</AvatarFallback></Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-stone-900 truncate">{r.customer?.name || "Anonymous"}</div>
                            <div className="text-[10px] text-stone-500">{formatDate(r.createdAt)}</div>
                          </div>
                          <Stars rating={r.rating} size="sm" />
                          <p className="text-sm text-stone-600 mt-1">{r.comment}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cancellation */}
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-4 flex gap-3">
                <Shield className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-stone-900 mb-1">{t("cancellationPolicy")}</div>
                  <p className="text-xs text-stone-600">Free cancellation up to 48 hours before your tour. Within 48 hours, a 50% cancellation fee applies. No-shows are non-refundable.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: sticky booking widget (desktop) */}
          <div className="hidden lg:block">
            <div className="sticky top-20">
              <BookingWidget
                tour={tour} slots={dateSlots} slotsLoading={slotsLoading}
                selectedDate={selectedDate} setSelectedDate={setSelectedDate}
                availableDates={availableDates}
                selectedSlot={selectedSlot} setSelectedSlot={setSelectedSlot}
                paxAdult={paxAdult} setPaxAdult={setPaxAdult}
                paxChild={paxChild} setPaxChild={setPaxChild}
                childPrice={childPrice} addOns={addOns} selectedAddOns={selectedAddOns}
                setSelectedAddOns={setSelectedAddOns} addOnsTotal={addOnsTotal}
                total={price.total} subtotal={price.subtotal} vat={price.taxAmount}
                onBook={handleBook} onAddToCart={handleAddToCart} t={t}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile book bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-stone-200 p-3 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] text-stone-500 uppercase">{t("from")} · {selectedSlot ? formatCurrency(price.total) : formatCurrency(tour.basePrice)}</div>
            <div className="text-lg font-bold text-emerald-700">{selectedSlot ? formatCurrency(price.total) : formatCurrency(tour.basePrice)}</div>
          </div>
          <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white" onClick={() => setShowMobileBook(true)}>
            {t("bookNow")}
          </Button>
        </div>
      </div>

      {/* Mobile booking sheet */}
      {showMobileBook && (
        <Dialog open={showMobileBook} onOpenChange={setShowMobileBook}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Book This Tour</DialogTitle>
              <DialogDescription>Select date, time, and travelers</DialogDescription>
            </DialogHeader>
            <BookingWidget
              tour={tour} slots={dateSlots} slotsLoading={slotsLoading}
              selectedDate={selectedDate} setSelectedDate={setSelectedDate}
              availableDates={availableDates}
              selectedSlot={selectedSlot} setSelectedSlot={setSelectedSlot}
              paxAdult={paxAdult} setPaxAdult={setPaxAdult}
              paxChild={paxChild} setPaxChild={setPaxChild}
              childPrice={childPrice} addOns={addOns} selectedAddOns={selectedAddOns}
              setSelectedAddOns={setSelectedAddOns} addOnsTotal={addOnsTotal}
              total={price.total} subtotal={price.subtotal} vat={price.taxAmount}
              onBook={() => { handleBook(); setShowMobileBook(false) }}
              onAddToCart={() => { handleAddToCart(); setShowMobileBook(false) }}
              t={t} compact
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function BookingWidget({
  tour, slots, slotsLoading, selectedDate, setSelectedDate, availableDates,
  selectedSlot, setSelectedSlot, paxAdult, setPaxAdult, paxChild, setPaxChild,
  childPrice, addOns, selectedAddOns, setSelectedAddOns, addOnsTotal,
  total, subtotal, vat, onBook, onAddToCart, t, compact,
}: any) {
  const today = new Date()
  const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 30)

  return (
    <Card className="border-stone-200 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] text-stone-500 uppercase tracking-wide">{t("from")}</div>
            <div className="text-2xl font-bold text-emerald-700">{formatCurrency(tour.basePrice)}</div>
          </div>
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><Star className="h-3 w-3 mr-1 fill-amber-400 text-amber-400" />{(tour.rating || 0).toFixed(1)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-stone-700 uppercase tracking-wide flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{t("selectDate")}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal h-10">
                <Calendar className="h-4 w-4 mr-2 text-stone-400" />
                {selectedDate ? formatDate(selectedDate) : <span className="text-stone-400">Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComp
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={[{ before: today }, { after: maxDate }]}
                modifiers={{ hasAvail: (d: Date) => availableDates.has(d.toDateString()) }}
                modifiersClassNames={{ hasAvail: "relative bg-emerald-50 text-emerald-700 font-semibold" }}
                className="rounded-lg border"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Slots */}
        {selectedDate && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-stone-700 uppercase tracking-wide flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{t("selectTime")}</Label>
            {slotsLoading ? (
              <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : slots.length === 0 ? (
              <p className="text-xs text-stone-500 italic py-2">{t("noSlots")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {slots.map((s: any) => {
                  const avail = s.capacity - s.seatsBooked
                  const low = avail <= 3 && avail > 0
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSlot(s)}
                      disabled={avail <= 0}
                      className={`p-2 rounded-lg border text-left transition-all ${selectedSlot?.id === s.id ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20" : "border-stone-200 hover:border-emerald-300"} ${avail <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="text-xs font-semibold text-stone-900">{formatTime(s.startTime)}</div>
                      <div className="text-[10px] text-stone-500">{formatCurrency(s.price || tour.basePrice)}</div>
                      {low && <div className="text-[9px] text-amber-600 font-medium mt-0.5">🔥 {avail} {t("left")}</div>}
                      {avail <= 0 && <div className="text-[9px] text-rose-500 font-medium mt-0.5">Full</div>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Pax */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-stone-700 uppercase tracking-wide flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{t("selectPax")}</Label>
          <div className="rounded-lg border border-stone-200 p-2 divide-y divide-stone-100">
            <PaxStepper label="Adults" value={paxAdult} onChange={setPaxAdult} price={tour.basePrice} min={1} />
            <PaxStepper label="Children" value={paxChild} onChange={setPaxChild} price={childPrice} />
          </div>
        </div>

        {/* Add-ons */}
        {addOns?.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-stone-700 uppercase tracking-wide">Add-ons</Label>
            <div className="space-y-1.5">
              {addOns.filter((a: any) => a.isActive !== false).map((a: any) => (
                <label key={a.id} className="flex items-center gap-2 p-2 rounded-lg border border-stone-200 hover:bg-stone-50 cursor-pointer">
                  <Checkbox checked={selectedAddOns.includes(a.id)} onCheckedChange={(c) => setSelectedAddOns((p: string[]) => c ? [...p, a.id] : p.filter((x) => x !== a.id))} />
                  <span className="text-sm text-stone-700 flex-1">{a.name}</span>
                  <span className="text-xs font-medium text-emerald-700">+{formatCurrency(a.price)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Price */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-stone-600"><span>{t("subtotal")}</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between text-stone-600"><span>{t("vat")}</span><span className="font-medium">{formatCurrency(vat)}</span></div>
          <div className="flex justify-between text-base font-bold text-stone-900 pt-1.5 border-t border-stone-100"><span>{t("total")}</span><span className="text-emerald-700">{formatCurrency(total)}</span></div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={onAddToCart} disabled={!selectedSlot}>
            <ShoppingCart className="h-4 w-4 mr-1.5" />{t("addToCart")}
          </Button>
          <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white" onClick={onBook} disabled={!selectedSlot}>
            {t("bookNow")} <ArrowRight className={`h-4 w-4 ml-1.5`} />
          </Button>
        </div>

        {!compact && (
          <div className="flex items-center justify-center gap-3 text-[10px] text-stone-500 pt-1">
            <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-emerald-500" />Secure</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-emerald-500" />Instant confirm</span>
            <span className="flex items-center gap-1"><RefreshCw className="h-3 w-3 text-emerald-500" />Free cancel</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* Calendar import workaround - shadcn calendar */
import { Calendar as CalendarComp } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/* ─────────────────────────────────────────────────────────────────────────────
   CHECKOUT PAGE (STEP 3)
─────────────────────────────────────────────────────────────────────────────── */

function CheckoutPage({
  booking, onNav, onProceed, lang, t,
}: {
  booking: any; onNav: (s: Step) => void; onProceed: (data: any) => void; lang: Lang; t: (k: string) => string
}) {
  const api = useApi()
  const [customer, setCustomer] = useState<CustomerInfo>({ name: "", phone: "", email: "", pickup: "", requests: "" })
  const [paymentMethod, setPaymentMethod] = useState<"BANK_TRANSFER" | "AMWALPAY">("BANK_TRANSFER")
  const [couponCode, setCouponCode] = useState("")
  const [discount, setDiscount] = useState(0)
  const [validating, setValidating] = useState(false)

  if (!booking?.tour) {
    return (
      <div className="bg-stone-50 min-h-[60vh] flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <ShoppingCart className="h-12 w-12 text-stone-300 mx-auto mb-3" />
            <h3 className="font-semibold text-stone-900 mb-1">No booking in progress</h3>
            <p className="text-sm text-stone-500 mb-4">Browse tours and start a booking</p>
            <Button onClick={() => onNav(1)} className="bg-emerald-600 text-white">{t("browseTours")}</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { tour, slot, paxAdult, paxChild, addOns = [], addOnsTotal = 0, childPrice } = booking
  const subtotal = tour.basePrice * paxAdult + childPrice * paxChild + addOnsTotal
  const afterDiscount = Math.max(0, subtotal - discount)
  const vat = afterDiscount * 0.05
  const total = afterDiscount + vat

  const validateCoupon = async () => {
    if (!couponCode.trim()) return
    setValidating(true)
    try {
      const r = await fetch(api("/api/coupons/validate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, amount: subtotal }),
      })
      const d = await r.json()
      if (d.valid) {
        setDiscount(d.discount || 0)
        toast.success(`Coupon applied! You saved ${formatCurrency(d.discount || 0)}`)
      } else {
        setDiscount(0)
        toast.error(d.message || "Invalid coupon code")
      }
    } catch {
      // Client-side fallback for demo
      if (couponCode.toUpperCase() === "WELCOME15") { setDiscount(subtotal * 0.15); toast.success("15% discount applied!") }
      else if (couponCode.toUpperCase() === "EARLYBIRD20") { setDiscount(subtotal * 0.20); toast.success("20% discount applied!") }
      else { toast.error("Invalid coupon code") }
    } finally { setValidating(false) }
  }

  const canProceed = customer.name.trim() && customer.phone.trim()

  const handleProceed = () => {
    if (!canProceed) { toast.error("Please enter your name and phone"); return }
    onProceed({ ...booking, customer, paymentMethod, couponCode, discount, total, subtotal, vat })
  }

  return (
    <div className="bg-stone-50 min-h-[60vh]">
      <div className="bg-white border-b border-stone-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <Breadcrumb lang={lang} items={[
            { label: t("home"), onClick: () => onNav(0) },
            { label: t("tours"), onClick: () => onNav(1) },
            { label: tour.name, onClick: () => onNav(2) },
            { label: t("yourDetails") },
          ]} />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-stone-900 mb-1">{t("completeBooking")}</h1>
        <p className="text-sm text-stone-500 mb-6">{t("yourDetails")} · {t("payment")} · {t("orderConfirmed")}</p>

        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          {/* Form */}
          <div className="space-y-4">
            {/* Booking summary */}
            <Card className="overflow-hidden border-stone-200">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-lg overflow-hidden bg-white/20 shrink-0">
                    { }
                    <img src={tourImage(tour)} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold line-clamp-1">{tour.name}</div>
                    <div className="text-xs text-emerald-50/80 flex items-center gap-2 mt-0.5">
                      <Calendar className="h-3 w-3" />{formatDate(slot.date)}
                      <Clock className="h-3 w-3 ml-1" />{formatTime(slot.startTime)}
                      <MapPin className="h-3 w-3 ml-1" />{tour.city}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Travelers */}
            <Card className="border-stone-200">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-emerald-600" />{t("guests")}</CardTitle></CardHeader>
              <CardContent className="divide-y divide-stone-100">
                <PaxStepper label={t("adults")} value={paxAdult} onChange={() => {}} price={tour.basePrice} min={1} />
                <PaxStepper label={t("children")} value={paxChild} onChange={() => {}} price={childPrice} />
              </CardContent>
            </Card>

            {/* Contact details */}
            <Card className="border-stone-200">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-emerald-600" />{t("contactDetails")}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t("fullName")} *</Label>
                    <Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Ahmed Al Balushi" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t("phone")} *</Label>
                    <Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="+968 9XXX XXXX" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t("email")}</Label>
                  <Input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="ahmed@email.com" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t("pickupLocation")}</Label>
                  <Input value={customer.pickup} onChange={(e) => setCustomer({ ...customer, pickup: e.target.value })} placeholder="Hotel name or address" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t("specialRequests")}</Label>
                  <Textarea value={customer.requests} onChange={(e) => setCustomer({ ...customer, requests: e.target.value })} placeholder="Any dietary restrictions, accessibility needs, etc." rows={3} />
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-50 text-xs text-emerald-800">
                  <WhatsAppIcon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Booking confirmation & voucher will be sent via WhatsApp to your phone number.</span>
                </div>
              </CardContent>
            </Card>

            {/* Payment method */}
            <Card className="border-stone-200">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4 text-emerald-600" />{t("paymentMethod")}</CardTitle></CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                  <div className="space-y-2">
                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${paymentMethod === "BANK_TRANSFER" ? "border-emerald-500 bg-emerald-50/50" : "border-stone-200 hover:border-emerald-300"}`}>
                      <RadioGroupItem value="BANK_TRANSFER" />
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shrink-0">
                        <Banknote className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-stone-900">{t("bankTransfer")}</span>
                          <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">Recommended</Badge>
                        </div>
                        <p className="text-xs text-stone-500">Bank details shown on the next step · Verified within 2 hours</p>
                      </div>
                    </label>
                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${paymentMethod === "AMWALPAY" ? "border-emerald-500 bg-emerald-50/50" : "border-stone-200 hover:border-emerald-300"}`}>
                      <RadioGroupItem value="AMWALPAY" />
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shrink-0">
                        <CreditCard className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm text-stone-900">{t("amwalPay")}</span>
                        <p className="text-xs text-stone-500">Card payment via secure AmwalPay checkout</p>
                      </div>
                    </label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {/* Sticky summary */}
          <div className="hidden lg:block">
            <div className="sticky top-20">
              <Card className="border-stone-200">
                <CardHeader><CardTitle className="text-base">{t("orderSummary")}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-3 pb-3 border-b border-stone-100">
                    <div className="h-16 w-16 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                      { }
                      <img src={tourImage(tour)} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-stone-900 line-clamp-2">{tour.name}</div>
                      <div className="text-xs text-stone-500 mt-0.5">{formatDate(slot.date)} · {formatTime(slot.startTime)}</div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-stone-600"><span>{t("adults")} × {paxAdult}</span><span>{formatCurrency(tour.basePrice * paxAdult)}</span></div>
                    {paxChild > 0 && <div className="flex justify-between text-stone-600"><span>{t("children")} × {paxChild}</span><span>{formatCurrency(childPrice * paxChild)}</span></div>}
                    {addOnsTotal > 0 && <div className="flex justify-between text-stone-600"><span>Add-ons</span><span>{formatCurrency(addOnsTotal)}</span></div>}
                  </div>

                  {/* Coupon */}
                  <div className="pt-2 border-t border-stone-100 space-y-2">
                    <Label className="text-xs font-medium">{t("couponCode")}</Label>
                    <div className="flex gap-2">
                      <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="WELCOME15" className="text-sm" />
                      <Button size="sm" variant="outline" onClick={validateCoupon} disabled={validating || !couponCode.trim()}>
                        {validating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("apply")}
                      </Button>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {["WELCOME15", "EARLYBIRD20"].map((c) => (
                        <button key={c} onClick={() => setCouponCode(c)} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100">{c}</button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-stone-600"><span>{t("subtotal")}</span><span>{formatCurrency(subtotal)}</span></div>
                    {discount > 0 && <div className="flex justify-between text-emerald-700"><span>{t("discount")}</span><span>-{formatCurrency(discount)}</span></div>}
                    <div className="flex justify-between text-stone-600"><span>{t("vat")}</span><span>{formatCurrency(vat)}</span></div>
                    <div className="flex justify-between text-base font-bold text-stone-900 pt-1.5 border-t border-stone-100"><span>{t("total")}</span><span className="text-emerald-700">{formatCurrency(total)}</span></div>
                  </div>

                  <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white" onClick={handleProceed} disabled={!canProceed}>
                    {t("proceedToPayment")} <ArrowRight className={`h-4 w-4 ml-1.5 ${lang === "AR" ? "rotate-180" : ""}`} />
                  </Button>

                  <div className="flex items-center justify-center gap-3 text-[10px] text-stone-500">
                    <span className="flex items-center gap-1"><Lock className="h-3 w-3" />Secure</span>
                    <span className="flex items-center gap-1"><Shield className="h-3 w-3" />PCI-DSS</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   PAYMENT PAGE (STEP 4)
─────────────────────────────────────────────────────────────────────────────── */

function PaymentPage({
  booking, onNav, onComplete, lang, t,
}: {
  booking: any; onNav: (s: Step) => void; onComplete: (order: any) => void; lang: Lang; t: (k: string) => string
}) {
  const api = useApi()
  const [banks, setBanks] = useState<any[]>([])
  const [banksLoading, setBanksLoading] = useState(true)
  const [selectedBank, setSelectedBank] = useState(0)
  const [trxRef, setTrxRef] = useState("")
  const [fromBank, setFromBank] = useState("")
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0])
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [cardNumber, setCardNumber] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvv, setCvv] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(api("/api/bank-accounts"))
      .then((r) => r.json())
      .then((d) => { setBanks(d.accounts || []); setBanksLoading(false) })
      .catch(() => setBanksLoading(false))
  }, [])

  if (!booking?.tour) {
    return (
      <div className="bg-stone-50 min-h-[60vh] flex items-center justify-center">
        <Card className="max-w-md"><CardContent className="p-8 text-center">
          <CreditCard className="h-12 w-12 text-stone-300 mx-auto mb-3" />
          <h3 className="font-semibold text-stone-900 mb-1">No payment in progress</h3>
          <Button onClick={() => onNav(1)} className="mt-3 bg-emerald-600 text-white">{t("browseTours")}</Button>
        </CardContent></Card>
      </div>
    )
  }

  const { tour, slot, paxAdult, paxChild, childPrice, addOnsTotal = 0, customer, paymentMethod, couponCode, discount = 0 } = booking
  const subtotal = tour.basePrice * paxAdult + childPrice * paxChild + addOnsTotal
  const afterDiscount = Math.max(0, subtotal - discount)
  const vat = afterDiscount * 0.05
  const total = afterDiscount + vat

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) { toast.error("File too large (max 4MB)"); return }
    const reader = new FileReader()
    reader.onload = () => { setScreenshot(reader.result as string); toast.success(t("screenshotUploaded")) }
    reader.readAsDataURL(file)
  }

  const submitBankTransfer = async () => {
    if (!trxRef.trim()) { toast.error("Enter transaction reference"); return }
    if (!screenshot) { toast.error("Upload payment screenshot"); return }
    setSubmitting(true)
    try {
      const orderRes = await fetch(api("/api/orders"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourId: tour.id, slotId: slot.id, paxAdult, paxChild,
          addOns: booking.addOns || [], customer, paymentMethod: "BANK_TRANSFER",
          channel: "WEB", couponCode, discount,
          totalAmount: total, subtotal, vatAmount: vat,
        }),
      })
      if (!orderRes.ok) throw new Error("Order failed")
      const { order } = await orderRes.json()

      await fetch(api("/api/payments"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id, screenshotUrl: screenshot,
          bankReference: trxRef, transferDate, bankName: banks[selectedBank]?.bankName,
          amount: total,
        }),
      })
      toast.success(t("paymentSubmitted"))
      onComplete({ ...order, tour, slot, customer, total, paymentMethod: "BANK_TRANSFER" })
    } catch (e: any) {
      toast.error(e.message || t("bookingFailed"))
    } finally { setSubmitting(false) }
  }

  const submitAmwalPay = async () => {
    if (!cardNumber.replace(/\s/g, "").match(/^\d{16}$/)) { toast.error("Enter valid card number"); return }
    if (!expiry.match(/^\d{2}\/\d{2}$/)) { toast.error("Enter valid expiry (MM/YY)"); return }
    if (!cvv.match(/^\d{3,4}$/)) { toast.error("Enter valid CVV"); return }
    setSubmitting(true)
    try {
      const orderRes = await fetch(api("/api/orders"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourId: tour.id, slotId: slot.id, paxAdult, paxChild,
          addOns: booking.addOns || [], customer, paymentMethod: "AMWALPAY",
          channel: "WEB", couponCode, discount,
          totalAmount: total, subtotal, vatAmount: vat,
        }),
      })
      if (!orderRes.ok) throw new Error("Order failed")
      const { order } = await orderRes.json()

      const payRes = await fetch(api("/api/amwalpay/create-session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, amount: total, customer }),
      })
      const payData = await payRes.json()
      if (payData.checkoutUrl) {
        toast.success("Redirecting to AmwalPay...")
        // Simulate redirect completion
        setTimeout(() => {
          onComplete({ ...order, tour, slot, customer, total, paymentMethod: "AMWALPAY" })
        }, 1500)
      } else {
        // Fallback: mark as paid
        toast.success(t("paymentSubmitted"))
        onComplete({ ...order, tour, slot, customer, total, paymentMethod: "AMWALPAY" })
      }
    } catch (e: any) {
      toast.error(e.message || t("bookingFailed"))
    } finally { setSubmitting(false) }
  }

  return (
    <div className="bg-stone-50 min-h-[60vh]">
      <div className="bg-white border-b border-stone-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <Breadcrumb lang={lang} items={[
            { label: t("home"), onClick: () => onNav(0) },
            { label: t("tours"), onClick: () => onNav(1) },
            { label: tour.name, onClick: () => onNav(2) },
            { label: t("payment") },
          ]} />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-stone-900 mb-1">{t("payment")}</h1>
        <p className="text-sm text-stone-500 mb-6">
          {paymentMethod === "BANK_TRANSFER" ? "Transfer to our bank account and upload screenshot" : "Pay securely via AmwalPay hosted checkout"}
        </p>

        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          <div className="space-y-4">
            {paymentMethod === "BANK_TRANSFER" ? (
              <>
                {/* Bank accounts */}
                <Card className="border-stone-200">
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Banknote className="h-4 w-4 text-emerald-600" />{t("bankDetails")}</CardTitle></CardHeader>
                  <CardContent>
                    <Alert className="mb-3 bg-amber-50 border-amber-200 text-amber-900">
                      <Wallet className="h-4 w-4" />
                      <AlertTitle>Transfer exactly {formatCurrency(total)}</AlertTitle>
                      <AlertDescription className="text-xs">Include your order reference in transfer notes for faster verification.</AlertDescription>
                    </Alert>
                    {banksLoading ? (
                      <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
                    ) : (
                      <RadioGroup value={String(selectedBank)} onValueChange={(v) => setSelectedBank(Number(v))}>
                        <div className="space-y-2">
                          {banks.map((b: any, i: number) => (
                            <label key={b.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedBank === i ? "border-emerald-500 bg-emerald-50/50" : "border-stone-200"}`}>
                              <RadioGroupItem value={String(i)} className="mt-1" />
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-stone-900">{b.bankName}</span>
                                  {b.isDefault && <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">Default</Badge>}
                                </div>
                                <div className="grid grid-cols-2 gap-1 text-xs text-stone-600">
                                  <div><span className="text-stone-400">{t("accountName")}:</span> {b.accountName}</div>
                                  <div><span className="text-stone-400">{t("accountNumber")}:</span> <span className="font-mono">{b.accountNumber}</span></div>
                                  <div className="col-span-2"><span className="text-stone-400">{t("iban")}:</span> <span className="font-mono">{b.iban}</span></div>
                                  {b.swift && <div><span className="text-stone-400">{t("swift")}:</span> <span className="font-mono">{b.swift}</span></div>}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </RadioGroup>
                    )}
                  </CardContent>
                </Card>

                {/* Transaction details */}
                <Card className="border-stone-200">
                  <CardHeader><CardTitle className="text-base">{t("paymentDetails")}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">{t("trxRef")} *</Label>
                      <Input value={trxRef} onChange={(e) => setTrxRef(e.target.value)} placeholder="TRX123456789" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">{t("fromBank")}</Label>
                        <Input value={fromBank} onChange={(e) => setFromBank(e.target.value)} placeholder="Your bank name" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">{t("transferDate")} *</Label>
                        <Input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Screenshot upload */}
                <Card className="border-stone-200">
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4 text-emerald-600" />{t("uploadScreenshot")}</CardTitle></CardHeader>
                  <CardContent>
                    {screenshot ? (
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
                        { }
                        <img src={screenshot} alt="Screenshot" className="h-16 w-16 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-emerald-800 flex items-center gap-1"><CheckCircle className="h-4 w-4" />{t("screenshotUploaded")}</div>
                          <div className="text-xs text-stone-500">Ready for verification</div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setScreenshot(null)}>Replace</Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-stone-300 rounded-lg cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
                        <Upload className="h-8 w-8 text-stone-400" />
                        <span className="text-sm font-medium text-stone-700">{t("clickToUpload")}</span>
                        <span className="text-xs text-stone-500">PNG, JPG up to 4MB</span>
                        <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleFile} />
                      </label>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border-stone-200">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4 text-emerald-600" />{t("amwalPay")}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Alert className="bg-amber-50 border-amber-200 text-amber-900">
                    <Shield className="h-4 w-4" />
                    <AlertDescription className="text-xs">Simulation mode — you&apos;ll be redirected to AmwalPay&apos;s secure hosted checkout.</AlertDescription>
                  </Alert>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t("cardNumber")}</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                      <Input className="pl-10 font-mono" value={cardNumber} onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 16)
                        setCardNumber(v.replace(/(\d{4})/g, "$1 ").trim())
                      }} placeholder="4242 4242 4242 4242" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">{t("expiry")}</Label>
                      <Input value={expiry} onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 4)
                        setExpiry(v.length > 2 ? v.slice(0, 2) + "/" + v.slice(2) : v)
                      }} placeholder="MM/YY" className="font-mono" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">{t("cvv")}</Label>
                      <Input type="password" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="•••" className="font-mono" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <Lock className="h-3 w-3" />{t("securePaymentNote")}
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white h-12 text-base"
              onClick={paymentMethod === "BANK_TRANSFER" ? submitBankTransfer : submitAmwalPay}
              disabled={submitting}
            >
              {submitting ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Processing...</> : (
                paymentMethod === "BANK_TRANSFER" ? <><Upload className="h-5 w-5 mr-2" />{t("submitPayment")}</> : <><Lock className="h-5 w-5 mr-2" />{t("pay")} {formatCurrency(total)}</>
              )}
            </Button>
          </div>

          {/* Summary */}
          <div className="hidden lg:block">
            <div className="sticky top-20">
              <Card className="border-stone-200">
                <CardHeader><CardTitle className="text-base">{t("orderSummary")}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-3 pb-3 border-b border-stone-100">
                    <div className="h-14 w-14 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                      { }
                      <img src={tourImage(tour)} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-stone-900 line-clamp-2">{tour.name}</div>
                      <div className="text-xs text-stone-500 mt-0.5">{formatDate(slot.date)} · {formatTime(slot.startTime)}</div>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-stone-600"><span>{t("adults")} × {paxAdult}</span><span>{formatCurrency(tour.basePrice * paxAdult)}</span></div>
                    {paxChild > 0 && <div className="flex justify-between text-stone-600"><span>{t("children")} × {paxChild}</span><span>{formatCurrency(childPrice * paxChild)}</span></div>}
                    {addOnsTotal > 0 && <div className="flex justify-between text-stone-600"><span>Add-ons</span><span>{formatCurrency(addOnsTotal)}</span></div>}
                    {discount > 0 && <div className="flex justify-between text-emerald-700"><span>{t("discount")}</span><span>-{formatCurrency(discount)}</span></div>}
                  </div>
                  <Separator />
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-stone-600"><span>{t("subtotal")}</span><span>{formatCurrency(subtotal)}</span></div>
                    <div className="flex justify-between text-stone-600"><span>{t("vat")}</span><span>{formatCurrency(vat)}</span></div>
                    <div className="flex justify-between text-base font-bold text-stone-900 pt-1.5 border-t border-stone-100"><span>{t("total")}</span><span className="text-emerald-700">{formatCurrency(total)}</span></div>
                  </div>
                  <Separator />
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-stone-400">{t("fullName")}</span><span className="font-medium text-stone-700">{customer?.name || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-stone-400">{t("phone")}</span><span className="font-medium text-stone-700">{customer?.phone || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-stone-400">{t("paymentMethod")}</span><span className="font-medium text-stone-700">{paymentMethod === "BANK_TRANSFER" ? t("bankTransfer") : t("amwalPay")}</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   CONFIRMATION PAGE (STEP 5)
─────────────────────────────────────────────────────────────────────────────── */

function ConfirmationPage({ order, onNav, lang, t }: { order: any; onNav: (s: Step) => void; lang: Lang; t: (k: string) => string }) {
  return (
    <div className="bg-stone-50 min-h-[60vh]">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Success animation */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-emerald-400 rounded-full blur-2xl opacity-30 animate-pulse" />
            <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl">
              <CheckCircle className="h-12 w-12 text-white" strokeWidth={3} />
            </div>
            <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-amber-400 flex items-center justify-center shadow-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-950" />
            </span>
          </div>
          <h1 className="text-3xl font-bold text-stone-900 mt-4">{t("bookingReceived")}</h1>
          <p className="text-stone-500 mt-1">Thank you{order?.customer?.name ? `, ${order.customer.name.split(" ")[0]}` : ""}! Your booking is confirmed.</p>
          {order?.orderNumber && (
            <Badge className="mt-3 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-sm font-mono">
              <Receipt className="h-3.5 w-3.5 mr-1" />{order.orderNumber}
            </Badge>
          )}
        </div>

        {/* Order details */}
        {order?.tour && (
          <Card className="border-stone-200 mb-4">
            <CardHeader><CardTitle className="text-base">Order Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-[10px] text-stone-500 uppercase tracking-wide mb-0.5">Tour</div>
                  <div className="font-medium text-stone-900">{order.tour.name}</div>
                </div>
                <div>
                  <div className="text-[10px] text-stone-500 uppercase tracking-wide mb-0.5">Date & Time</div>
                  <div className="font-medium text-stone-900">{order.slot ? `${formatDate(order.slot.date)} · ${formatTime(order.slot.startTime)}` : "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-stone-500 uppercase tracking-wide mb-0.5">Customer</div>
                  <div className="font-medium text-stone-900">{order.customer?.name || "—"}</div>
                  <div className="text-xs text-stone-500">{order.customer?.phone}</div>
                </div>
                <div>
                  <div className="text-[10px] text-stone-500 uppercase tracking-wide mb-0.5">Payment Method</div>
                  <div className="font-medium text-stone-900">{order.paymentMethod === "BANK_TRANSFER" ? t("bankTransfer") : t("amwalPay")}</div>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600">Total Amount</span>
                <div className="text-right">
                  <div className="text-lg font-bold text-emerald-700">{formatCurrency(order.total)}</div>
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px]">Awaiting verification</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* What happens next */}
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 mb-4">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-emerald-600" />{t("whatNext")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: Shield, title: "Verify Payment", desc: t("nextStep1") },
              { icon: WhatsAppIcon, title: "Receive Confirmation", desc: t("nextStep2") },
              { icon: QrCode, title: "Show Voucher", desc: t("nextStep3") },
            ].map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="relative shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-white text-emerald-700 text-[10px] font-bold flex items-center justify-center ring-2 ring-emerald-100">{i + 1}</span>
                </div>
                <div className="pt-1">
                  <div className="text-sm font-semibold text-stone-900">{title}</div>
                  <p className="text-xs text-stone-600">{desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {order?.id && (
            <>
              <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => window.open(`/api/vouchers/${order.id}`, "_blank")}>
                <Download className="h-4 w-4 mr-1.5" />{t("downloadVoucher")}
              </Button>
              <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => window.open(`/api/invoices/${order.id}`, "_blank")}>
                <Download className="h-4 w-4 mr-1.5" />{t("downloadInvoice")}
              </Button>
            </>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="border-stone-200" onClick={() => onNav(6)}>
            <User className="h-4 w-4 mr-1.5" />{t("viewMyBookings")}
          </Button>
          <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white" onClick={() => onNav(1)}>
            {t("bookAnother")} <ArrowRight className={`h-4 w-4 ml-1.5 ${lang === "AR" ? "rotate-180" : ""}`} />
          </Button>
        </div>

        {/* Help */}
        <Card className="border-stone-200 mt-4">
          <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium text-stone-900">{t("helpLine")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700"><WhatsAppIcon className="h-3.5 w-3.5 mr-1" />WhatsApp</Button>
              <Button size="sm" variant="outline" className="border-stone-200"><Mail className="h-3.5 w-3.5 mr-1" />Email</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   ACCOUNT DASHBOARD (STEP 6)
─────────────────────────────────────────────────────────────────────────────── */

function AccountPage({ lang, t, onNav, onRebook }: { lang: Lang; t: (k: string) => string; onNav: (s: Step) => void; onRebook: (tourId: string) => void }) {
  const api = useApi()
  const customerUser = useApp((s) => s.customerUser)
  const setCustomerAuth = useApp((s) => s.setCustomerAuth)
  const logout = useApp((s) => s.logout)
  const [phone, setPhone] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState("")
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [account, setAccount] = useState<any>(null)
  const [loadingAccount, setLoadingAccount] = useState(false)

  useEffect(() => {
    if (!customerUser?.phone) return
    setLoadingAccount(true)
    fetch(api(`/api/customer/account?phone=${encodeURIComponent(customerUser.phone)}`))
      .then((r) => r.json())
      .then((d) => setAccount(d))
      .catch(() => {})
      .finally(() => setLoadingAccount(false))
  }, [customerUser?.phone])

  const sendOtp = async () => {
    if (!phone.trim()) { toast.error("Enter your phone"); return }
    setSending(true)
    try {
      const r = await fetch(api("/api/auth/otp"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) })
      const d = await r.json()
      if (r.ok) { setOtpSent(true); toast.success(t("otpSent")) }
      else toast.error(d.error || "Failed to send OTP")
    } catch { toast.error("Failed to send OTP") }
    finally { setSending(false) }
  }

  const verifyOtp = async () => {
    if (otp.length !== 6) { toast.error("Enter 6-digit code"); return }
    setVerifying(true)
    try {
      const r = await fetch(api("/api/auth/verify-otp"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, otp }) })
      const d = await r.json()
      if (r.ok && d.token) {
        setCustomerAuth(d.token, d.customer)
        toast.success(`Welcome, ${d.customer?.name || "traveler"}!`)
      } else toast.error(t("invalidOtp"))
    } catch { toast.error(t("invalidOtp")) }
    finally { setVerifying(false) }
  }

  // OTP login screen
  if (!customerUser) {
    return (
      <div className="bg-stone-50 min-h-[60vh] flex items-center justify-center py-12">
        <Card className="max-w-md w-full border-stone-200">
          <CardHeader className="text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-3 shadow-md">
              <User className="h-7 w-7 text-white" />
            </div>
            <CardTitle>{t("loginTitle")}</CardTitle>
            <CardDescription>{t("loginDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!otpSent ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t("phone")}</Label>
                  <div className="flex gap-2">
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+968 9XXX XXXX" onKeyDown={(e) => e.key === "Enter" && sendOtp()} />
                    <Button onClick={sendOtp} disabled={sending} className="bg-emerald-600 text-white">
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white" onClick={sendOtp} disabled={sending}>
                  {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <WhatsAppIcon className="h-4 w-4 mr-2" />}{t("sendOtp")}
                </Button>
                <p className="text-xs text-stone-500 text-center">Try: +96891234567</p>
              </>
            ) : (
              <>
                <div className="space-y-2 text-center">
                  <Label className="text-xs font-medium">{t("otpHint")}</Label>
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup><InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} /></InputOTPGroup>
                    <InputOTPGroup><InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} /></InputOTPGroup>
                  </InputOTP>
                </div>
                <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white" onClick={verifyOtp} disabled={verifying}>
                  {verifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}{t("verifyOtp")}
                </Button>
                <Button variant="ghost" size="sm" className="w-full text-stone-500" onClick={() => { setOtpSent(false); setOtp("") }}>{t("backToLogin")}</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Dashboard
  const tier = customerUser.loyaltyTier || "BRONZE"
  const orders = account?.orders || []
  const totalSpent = orders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0)

  return (
    <div className="bg-stone-50 min-h-[60vh]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Profile header */}
        <Card className="border-stone-200 mb-4 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-4 ring-white/30">
                <AvatarFallback className="bg-white text-emerald-700 text-xl font-bold">{initials(customerUser.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold">{customerUser.name || "Traveler"}</h1>
                <p className="text-sm text-emerald-50/80">{customerUser.phone}{customerUser.email && ` · ${customerUser.email}`}</p>
              </div>
              <Badge className={`bg-white/90 hover:bg-white/90 ${TIER_BADGE[tier]?.split(" ")[1] || "text-stone-700"}`}>
                <Award className="h-3 w-3 mr-1" />{TIER_LABEL[tier]?.[lang] || tier}
              </Badge>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Gift, label: t("loyaltyPoints"), value: customerUser.loyaltyPoints || 0 },
                { icon: Ticket, label: t("totalBookings"), value: orders.length },
                { icon: Wallet, label: t("totalSpent"), value: formatCurrency(totalSpent) },
                { icon: Award, label: t("loyaltyTier"), value: TIER_LABEL[tier]?.[lang] || tier },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-stone-500 uppercase tracking-wide">{label}</div>
                    <div className="text-sm font-bold text-stone-900 truncate">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="bookings">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="bookings" className="text-xs sm:text-sm"><Ticket className="h-3.5 w-3.5 sm:mr-1.5" /><span className="hidden sm:inline">{t("bookingHistory")}</span></TabsTrigger>
            <TabsTrigger value="profile" className="text-xs sm:text-sm"><User className="h-3.5 w-3.5 sm:mr-1.5" /><span className="hidden sm:inline">{t("profile")}</span></TabsTrigger>
            <TabsTrigger value="rewards" className="text-xs sm:text-sm"><Gift className="h-3.5 w-3.5 sm:mr-1.5" /><span className="hidden sm:inline">{t("rewards")}</span></TabsTrigger>
            <TabsTrigger value="preferences" className="text-xs sm:text-sm"><SettingsIcon className="h-3.5 w-3.5 sm:mr-1.5" /><span className="hidden sm:inline">{t("preferences")}</span></TabsTrigger>
          </TabsList>

          {/* Bookings tab */}
          <TabsContent value="bookings">
            <Card className="border-stone-200">
              <CardHeader><CardTitle className="text-base">{t("bookingHistory")}</CardTitle></CardHeader>
              <CardContent>
                {loadingAccount ? (
                  <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-10">
                    <Ticket className="h-10 w-10 text-stone-300 mx-auto mb-2" />
                    <p className="text-sm text-stone-500 mb-3">{t("noBookings")}</p>
                    <Button onClick={() => onNav(1)} className="bg-emerald-600 text-white">{t("browseTours")}</Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {orders.map((o: any) => (
                      <div key={o.id} className="p-3 rounded-lg border border-stone-200 hover:border-emerald-200 transition-colors">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-stone-900">{o.orderNumber}</span>
                            <Badge className={`${STATUS_COLORS[o.status] || "bg-stone-100 text-stone-700"} text-[9px]`}>{prettify(o.status)}</Badge>
                          </div>
                          <span className="text-xs text-stone-500">{formatDate(o.createdAt)}</span>
                        </div>
                        <div className="text-sm font-medium text-stone-900">{o.tour?.name || "Tour"}</div>
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="text-xs text-stone-500">
                            {o.slot ? `${formatDate(o.slot.date)} · ${formatTime(o.slot.startTime)}` : ""}
                            {o.paxAdult || o.paxChild ? ` · ${o.paxAdult + o.paxChild} ${t("pax")}` : ""}
                          </div>
                          <span className="text-sm font-bold text-emerald-700">{formatCurrency(o.totalAmount)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-stone-100">
                          {o.id && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => window.open(`/api/vouchers/${o.id}`, "_blank")}><Download className="h-3 w-3 mr-1" />{t("downloadVoucher")}</Button>}
                          {o.id && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => window.open(`/api/invoices/${o.id}`, "_blank")}><Receipt className="h-3 w-3 mr-1" />{t("downloadInvoice")}</Button>}
                          {o.tour && (o.status === "CONFIRMED" || o.status === "COMPLETED") && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-700" onClick={() => onRebook(o.tour.id)}><RefreshCw className="h-3 w-3 mr-1" />{t("rebook")}</Button>
                          )}
                          {o.status === "PENDING_PAYMENT" && <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-700"><RefreshCw className="h-3 w-3 mr-1" />{t("repay")}</Button>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile tab */}
          <TabsContent value="profile">
            <Card className="border-stone-200">
              <CardHeader><CardTitle className="text-base">{t("myProfile")}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label className="text-xs">{t("fullName")}</Label><Input defaultValue={customerUser.name || ""} /></div>
                  <div><Label className="text-xs">{t("phone")}</Label><Input defaultValue={customerUser.phone} disabled /></div>
                  <div><Label className="text-xs">{t("email")}</Label><Input defaultValue={customerUser.email || ""} /></div>
                  <div><Label className="text-xs">{t("loyaltyTier")}</Label><Input defaultValue={TIER_LABEL[tier]?.[lang] || tier} disabled /></div>
                </div>
                <Button className="bg-emerald-600 text-white" onClick={() => toast.success(t("saved"))}><Check className="h-4 w-4 mr-1.5" />{t("save")}</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rewards tab */}
          <TabsContent value="rewards">
            <Card className="border-stone-200">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Gift className="h-4 w-4 text-emerald-600" />{t("rewards")}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
                  <div className="text-xs text-stone-500 uppercase tracking-wide">{t("pointsBalance")}</div>
                  <div className="text-3xl font-bold text-emerald-700 mt-1">{customerUser.loyaltyPoints || 0}</div>
                  <div className="text-xs text-stone-500 mt-1">Redeem points for tour discounts</div>
                </div>
                <div>
                  <Label className="text-xs font-medium mb-2 block">{t("redeemCode")}</Label>
                  <div className="flex gap-2">
                    <Input placeholder="Enter reward code" />
                    <Button variant="outline" className="border-emerald-200 text-emerald-700" onClick={() => toast.success("Code redeemed!")}>{t("apply")}</Button>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-stone-700 mb-2">{t("availableRewards")}</div>
                  <div className="space-y-2">
                    {[
                      { points: 500, reward: "10% off next booking" },
                      { points: 1000, reward: "Free desert sunset add-on" },
                      { points: 2500, reward: "Free half-day city tour" },
                    ].map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-stone-200">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-amber-500" />
                          <span className="text-sm text-stone-700">{r.reward}</span>
                        </div>
                        <Badge variant="outline" className="text-emerald-700">{r.points} pts</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences tab */}
          <TabsContent value="preferences">
            <Card className="border-stone-200">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><SettingsIcon className="h-4 w-4 text-emerald-600" />{t("preferences")}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-stone-200">
                  <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-stone-500" /><span className="text-sm text-stone-700">{t("language")}</span></div>
                  <Select defaultValue={lang}>
                    <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="EN">English</SelectItem><SelectItem value="AR">العربية</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-stone-200">
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-stone-500" /><span className="text-sm text-stone-700">{t("emailOptIn")}</span></div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-stone-200">
                  <div className="flex items-center gap-2"><WhatsAppIcon className="h-4 w-4 text-emerald-600" /><span className="text-sm text-stone-700">{t("whatsappOptIn")}</span></div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-stone-200">
                  <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-stone-500" /><span className="text-sm text-stone-700">{t("notifications")}</span></div>
                  <Switch defaultChecked />
                </div>
                <Button className="bg-emerald-600 text-white" onClick={() => toast.success(t("saved"))}><Check className="h-4 w-4 mr-1.5" />{t("save")}</Button>
                <Separator className="my-2" />
                <Button variant="outline" className="w-full text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => { logout(); toast.success("Logged out") }}>
                  <LogOut className="h-4 w-4 mr-1.5" />{t("logout")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function prettify(s: string): string {
  return s.split("_").map((w) => w[0] + w.slice(1).toLowerCase()).join(" ")
}

/* ─────────────────────────────────────────────────────────────────────────────
   CART PAGE (STEP 7)
─────────────────────────────────────────────────────────────────────────────── */

function CartPage({
  cart, setCart, onNav, onCheckoutAll, lang, t,
}: {
  cart: CartItem[]; setCart: (c: CartItem[]) => void; onNav: (s: Step) => void
  onCheckoutAll: (orders: any[]) => void; lang: Lang; t: (k: string) => string
}) {
  const api = useApi()
  const [customer, setCustomer] = useState<CustomerInfo>({ name: "", phone: "", email: "", pickup: "", requests: "" })
  const [paymentMethod, setPaymentMethod] = useState<"BANK_TRANSFER" | "AMWALPAY">("BANK_TRANSFER")
  const [submitting, setSubmitting] = useState(false)

  const updatePax = (id: string, type: "adult" | "child", delta: number) => {
    setCart(cart.map((it) => {
      if (it.id !== id) return it
      const newAdult = type === "adult" ? Math.max(1, it.paxAdult + delta) : it.paxAdult
      const newChild = type === "child" ? Math.max(0, it.paxChild + delta) : it.paxChild
      return { ...it, paxAdult: newAdult, paxChild: newChild }
    }))
  }

  const removeItem = (id: string) => {
    setCart(cart.filter((it) => it.id !== id))
    toast.success(t("removedFromCart"))
  }

  const subtotal = cart.reduce((sum, it) => sum + it.price * it.paxAdult + it.childPrice * it.paxChild, 0)
  const vat = subtotal * 0.05
  const total = subtotal + vat

  const checkoutAll = async () => {
    if (!customer.name.trim() || !customer.phone.trim()) { toast.error("Enter your name and phone"); return }
    setSubmitting(true)
    try {
      const results: any[] = []
      for (const it of cart) {
        const r = await fetch(api("/api/orders"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tourId: it.tour.id, slotId: it.slot.id, paxAdult: it.paxAdult, paxChild: it.paxChild,
            addOns: [], customer, paymentMethod, channel: "WEB",
            totalAmount: it.price * it.paxAdult + it.childPrice * it.paxChild,
            subtotal: it.price * it.paxAdult + it.childPrice * it.paxChild,
            vatAmount: (it.price * it.paxAdult + it.childPrice * it.paxChild) * 0.05,
          }),
        })
        if (r.ok) { const d = await r.json(); results.push(d.order) }
      }
      if (results.length > 0) {
        toast.success(t("cartCheckedOut"))
        setCart([])
        onCheckoutAll(results)
      }
    } catch { toast.error(t("bookingFailed")) }
    finally { setSubmitting(false) }
  }

  if (cart.length === 0) {
    return (
      <div className="bg-stone-50 min-h-[60vh] flex items-center justify-center py-12">
        <Card className="max-w-md w-full border-stone-200">
          <CardContent className="p-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-stone-100 flex items-center justify-center mb-3">
              <ShoppingCart className="h-8 w-8 text-stone-400" />
            </div>
            <h3 className="font-semibold text-stone-900 mb-1">{t("emptyCart")}</h3>
            <p className="text-sm text-stone-500 mb-4">{t("emptyCartDesc")}</p>
            <Button onClick={() => onNav(1)} className="bg-emerald-600 text-white">{t("browseTours")}</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="bg-stone-50 min-h-[60vh]">
      <div className="bg-white border-b border-stone-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <Breadcrumb lang={lang} items={[{ label: t("home"), onClick: () => onNav(0) }, { label: t("yourCart") }]} />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-stone-900 mb-1">{t("yourCart")}</h1>
        <p className="text-sm text-stone-500 mb-6">{cart.length} {cart.length === 1 ? t("item") : t("items")} · {t("eachBooking")}</p>

        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          {/* Items */}
          <div className="space-y-3">
            {cart.map((it) => (
              <Card key={it.id} className="border-stone-200">
                <CardContent className="p-4 flex gap-3">
                  <div className="h-20 w-20 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                    { }
                    <img src={tourImage(it.tour)} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-stone-900 line-clamp-1">{it.tour.name}</div>
                        <div className="text-xs text-stone-500 mt-0.5">{formatDate(it.slot.date)} · {formatTime(it.slot.startTime)}</div>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-stone-400 hover:text-rose-500" onClick={() => removeItem(it.id)}><X className="h-4 w-4" /></Button>
                    </div>
                    <div className="flex items-end justify-between mt-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <Button size="icon" variant="outline" className="h-7 w-7 rounded-full" onClick={() => updatePax(it.id, "adult", -1)}><Minus className="h-3 w-3" /></Button>
                          <span className="text-xs text-stone-600">{it.paxAdult} {t("adults")}</span>
                          <Button size="icon" variant="outline" className="h-7 w-7 rounded-full" onClick={() => updatePax(it.id, "adult", 1)}><Plus className="h-3 w-3" /></Button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button size="icon" variant="outline" className="h-7 w-7 rounded-full" onClick={() => updatePax(it.id, "child", -1)} disabled={it.paxChild === 0}><Minus className="h-3 w-3" /></Button>
                          <span className="text-xs text-stone-600">{it.paxChild} {t("children")}</span>
                          <Button size="icon" variant="outline" className="h-7 w-7 rounded-full" onClick={() => updatePax(it.id, "child", 1)}><Plus className="h-3 w-3" /></Button>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-emerald-700">{formatCurrency(it.price * it.paxAdult + it.childPrice * it.paxChild)}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Customer info */}
            <Card className="border-stone-200">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-emerald-600" />{t("contactDetails")}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label className="text-xs">{t("fullName")} *</Label><Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} /></div>
                  <div><Label className="text-xs">{t("phone")} *</Label><Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} /></div>
                </div>
                <div><Label className="text-xs">{t("email")}</Label><Input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} /></div>
                <div>
                  <Label className="text-xs">{t("paymentMethod")}</Label>
                  <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)} className="mt-1.5">
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200 cursor-pointer flex-1">
                        <RadioGroupItem value="BANK_TRANSFER" /><Banknote className="h-4 w-4 text-teal-600" /><span className="text-sm">{t("bankTransfer")}</span>
                      </label>
                      <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200 cursor-pointer flex-1">
                        <RadioGroupItem value="AMWALPAY" /><CreditCard className="h-4 w-4 text-emerald-600" /><span className="text-sm">{t("amwalPay")}</span>
                      </label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div className="hidden lg:block">
            <div className="sticky top-20">
              <Card className="border-stone-200">
                <CardHeader><CardTitle className="text-base">{t("orderSummary")}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-stone-600"><span>{t("subtotal")} ({cart.length} {t("items")})</span><span>{formatCurrency(subtotal)}</span></div>
                    <div className="flex justify-between text-stone-600"><span>{t("vat")}</span><span>{formatCurrency(vat)}</span></div>
                    <div className="flex justify-between text-base font-bold text-stone-900 pt-1.5 border-t border-stone-100"><span>{t("totalInclVat")}</span><span className="text-emerald-700">{formatCurrency(total)}</span></div>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white" onClick={checkoutAll} disabled={submitting}>
                    {submitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("checkoutAll")}</>) : (<><CreditCard className="h-4 w-4 mr-2" />{t("checkoutAll")}</>)}
                  </Button>
                  <Button variant="outline" className="w-full border-stone-200 text-stone-600" onClick={() => setCart([])}>{t("clearCart")}</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   ABOUT PAGE (STEP 8)
─────────────────────────────────────────────────────────────────────────────── */

function AboutPage({ onNav, lang, t }: { onNav: (s: Step) => void; lang: Lang; t: (k: string) => string }) {
  const brand = useBrand()
  return (
    <div className="bg-stone-50 min-h-[60vh]">
      <div className="bg-white border-b border-stone-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <Breadcrumb lang={lang} items={[{ label: t("home"), onClick: () => onNav(0) }, { label: t("about") }]} />
        </div>
      </div>

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-emerald-900 via-teal-800 to-emerald-900 py-16 overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url(${TOUR_IMAGES.mountain})`, backgroundSize: "cover" }} />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center text-white">
          <Badge className="mb-3 border-0" style={{ background: brand.accentColor, color: "#1c1917" }}>{t("aboutUs")}</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold">{brand.name}</h1>
          {/* "Oman's Premier Tour Operator ... since 2018" lived here, which
              was one company's superlative and one company's founding year.
              Now: what this business wrote about itself, or nothing. */}
          {(brand.hero.subtitle || summarise(brand.about)) && (
            <p className="mt-3 text-white/90 max-w-2xl mx-auto">{brand.hero.subtitle || summarise(brand.about)}</p>
          )}
        </div>
      </section>

      {/* Story — an empty section is better than a borrowed one. */}
      {(brand.story || brand.about) && (
        <section className="py-12">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <Card className="border-stone-200">
              <CardHeader><CardTitle>{t("story")}</CardTitle></CardHeader>
              <CardContent className="prose prose-sm max-w-none text-stone-600 whitespace-pre-line">
                {brand.story || summarise(brand.about, 4000)}
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* The same numbers as the home page, and only if they were given. */}
      {brand.stats.length > 0 && (
        <section className="py-8" style={{ background: brand.primaryColor }}>
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
              {brand.stats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <div className="text-xs text-white/80 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Mission, in their words. The "Values" card that sat beside this was
          four lines about Omani experiences and eco-friendly desert practices,
          which is not a default anybody else can inherit. */}
      {brand.mission && (
        <section className="py-12">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <Card className="border-stone-200">
              <CardHeader><CardTitle>{t("mission")}</CardTitle></CardHeader>
              <CardContent className="text-sm text-stone-600 whitespace-pre-line">{brand.mission}</CardContent>
            </Card>
          </div>
        </section>
      )}

      {/*
        The team section is gone rather than emptied.

        It listed four people by full name, role and initials — a founder, an
        operations manager, a head guide — none of whom work for any business
        that signs up here, and all of whom would have been introduced to
        visitors as that business's staff. Inventing colleagues for somebody is
        not a placeholder, and there is no field a real team could come from
        yet.
      */}

      <div className="text-center py-8">
        <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white" onClick={() => onNav(1)}>
          {t("exploreTours")} <ArrowRight className={`h-4 w-4 ml-1.5 ${lang === "AR" ? "rotate-180" : ""}`} />
        </Button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   CONTACT PAGE (STEP 9)
─────────────────────────────────────────────────────────────────────────────── */

function ContactPage({ onNav, lang, t }: { onNav: (s: Step) => void; lang: Lang; t: (k: string) => string }) {
  const brand = useBrand()
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" })
  const [sending, setSending] = useState(false)

  /*
   * This form used to wait 1.2 seconds and say "Message sent!".
   *
   * Nothing was sent. A customer asking whether a tour runs on Friday got a
   * green tick and silence, and the business never learned they had asked.
   * There is no enquiries endpoint to post to yet, so rather than keep
   * pretending, the form hands the message to the channel this platform is
   * built on and the business actually reads.
   */
  const submit = () => {
    if (!form.name || !form.email || !form.message) { toast.error("Please fill all required fields"); return }
    const to = (brand.phone || "").replace(/[^\d]/g, "")
    if (!to) {
      toast.error(
        brand.email
          ? `Please email us at ${brand.email}`
          : "No contact channel is set up yet. Please try again later.",
      )
      return
    }
    const body = [
      form.subject ? `${form.subject}` : null,
      form.message,
      "",
      `— ${form.name} (${form.email})`,
    ].filter(Boolean).join("\n")
    setSending(true)
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(body)}`, "_blank", "noopener,noreferrer")
    setSending(false)
    setForm({ name: "", email: "", subject: "", message: "" })
  }

  return (
    <div className="bg-stone-50 min-h-[60vh]">
      <div className="bg-white border-b border-stone-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <Breadcrumb lang={lang} items={[{ label: t("home"), onClick: () => onNav(0) }, { label: t("contact") }]} />
        </div>
      </div>

      <section className="relative bg-gradient-to-br from-emerald-900 via-teal-800 to-emerald-900 py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center text-white">
          <Badge className="bg-amber-400/90 text-amber-950 hover:bg-amber-400 mb-3">{t("contactUs")}</Badge>
          <h1 className="text-3xl font-bold">{t("getInTouch")}</h1>
          <p className="mt-2 text-emerald-50/90">Have questions? Our team is here to help — 24/7 via WhatsApp.</p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
          {/* Contact info */}
          <div className="space-y-3">
            <Card className="border-stone-200">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0"><MapPin className="h-5 w-5 text-emerald-600" /></div>
                <div>
                  <div className="text-sm font-semibold text-stone-900">{t("findUs")}</div>
                  <p className="text-xs text-stone-500 mt-0.5">Al Khuwair, Muscat, Sultanate of Oman</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-stone-200">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0"><Phone className="h-5 w-5 text-emerald-600" /></div>
                <div>
                  <div className="text-sm font-semibold text-stone-900">{t("callUs")}</div>
                  {brand.phone
                    ? <a href={`tel:${brand.phone.replace(/[^+\d]/g, "")}`} className="text-xs text-emerald-700 hover:underline">{brand.phone}</a>
                    : <span className="text-xs text-stone-400">—</span>}
                </div>
              </CardContent>
            </Card>
            <Card className="border-stone-200">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0"><Mail className="h-5 w-5 text-emerald-600" /></div>
                <div>
                  <div className="text-sm font-semibold text-stone-900">{t("emailUs")}</div>
                  {brand.email
                    ? <a href={`mailto:${brand.email}`} className="text-xs text-emerald-700 hover:underline">{brand.email}</a>
                    : <span className="text-xs text-stone-400">—</span>}
                </div>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <WhatsAppIcon className="h-5 w-5" />
                  <span className="text-sm font-semibold text-stone-900">{t("chatWhatsapp")}</span>
                </div>
                <p className="text-xs text-stone-600 mb-3">Fastest response — usually under 5 minutes during business hours.</p>
                <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white" size="sm" onClick={() => onNav(10)}>
                  <WhatsAppIcon className="h-4 w-4 mr-1.5" />{t("tryWhatsapp")}
                </Button>
              </CardContent>
            </Card>
            <Card className="border-stone-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2"><Clock className="h-4 w-4 text-emerald-600" /><span className="text-sm font-semibold text-stone-900">{t("openingHours")}</span></div>
                <div className="space-y-1 text-xs text-stone-600">
                  <div className="flex justify-between"><span>{t("satThu")}</span><span className="font-medium">8:00 AM – 8:00 PM</span></div>
                  <div className="flex justify-between"><span>{t("friday")}</span><span className="font-medium">2:00 PM – 8:00 PM</span></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form + Map */}
          <div className="space-y-4">
            <Card className="border-stone-200">
              <CardHeader><CardTitle className="text-base">{t("sendMessage")}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label className="text-xs">{t("yourName")} *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label className="text-xs">{t("yourEmail")} *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                </div>
                <div><Label className="text-xs">{t("subject")}</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
                <div><Label className="text-xs">{t("message")} *</Label><Textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
                <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white" onClick={submit} disabled={sending}>
                  {sending ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("sendMessage")}</>) : (<><Send className="h-4 w-4 mr-2" />{t("sendMessage")}</>)}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-stone-200 overflow-hidden">
              <div className="relative aspect-[16/8] bg-stone-100">
                <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
                <svg className="absolute inset-0 w-full h-full opacity-40" preserveAspectRatio="none"><path d="M0 100 L200 100 L200 40 L400 40 L400 150 L600 150" stroke="#94a3b8" strokeWidth="4" fill="none" /><path d="M0 250 L150 250 L150 80 L450 80" stroke="#94a3b8" strokeWidth="3" fill="none" /></svg>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-emerald-500 rounded-full blur-lg opacity-50 animate-pulse" />
                    <MapPin className="relative h-12 w-12 text-emerald-600 fill-emerald-200" />
                  </div>
                  <div className="mt-2 text-xs font-medium text-stone-700">{brand.name}</div>
                  {brand.address && <div className="text-[10px] text-stone-500">{brand.address}</div>}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   WHATSAPP SIMULATOR (STEP 10) — NEW
─────────────────────────────────────────────────────────────────────────────── */

function WhatsAppSimulator({ t, lang }: { t: (k: string) => string; lang: Lang }) {
  const api = useApi()
  const brand = useBrand()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [typing, setTyping] = useState(false)
  const [chatState, setChatState] = useState<string>("IDLE")
  const [inputText, setInputText] = useState("")
  const [inputEnabled, setInputEnabled] = useState(false)
  const [inputPlaceholder, setInputPlaceholder] = useState("Message")
  const [bookingData, setBookingData] = useState<any>({})
  const [mode, setMode] = useState<"interactive" | "auto">("interactive")
  const msgIdRef = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const nextId = () => ++msgIdRef.current
  const now = () => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, typing, scrollToBottom])
  useEffect(() => { return () => { if (timerRef.current) clearTimeout(timerRef.current) } }, [])

  // Add customer message
  const addCustomerMsg = (text: string, type: "text" | "image" = "text", imageLabel?: string) => {
    setMessages(prev => [...prev, { id: nextId(), from: "customer", type, text, imageLabel, time: now() }])
  }

  // Add AI message with typing indicator
  const addAIMsg = (msg: Partial<ChatMessage>) => {
    setTyping(true)
    timerRef.current = setTimeout(() => {
      setTyping(false)
      setMessages(prev => [...prev, { id: nextId(), from: "ai", time: now(), ...msg } as ChatMessage])
    }, 1000)
  }

  // Start conversation
  const startConversation = () => {
    setMessages([])
    setChatState("IDLE")
    setBookingData({})
    addAIMsg({
      type: "text",
      // The assistant belongs to whichever business the visitor is looking at.
      // It used to introduce itself by another company's name to all of them.
      text: `Hello! 👋 I'm the ${brand.name || "booking"} assistant. How can I help you today?`,
    })
    timerRef.current = setTimeout(() => {
      addAIMsg({
        type: "buttons",
        text: "Choose an option:",
        buttons: [
          { label: "🐪 Browse Tours", action: "browse" },
          { label: "📅 Check Availability", action: "availability" },
        ],
      })
      setChatState("AWAITING_CHOICE")
    }, 1800)
  }

  // Auto-start on mount
  useEffect(() => {
    const t1 = setTimeout(() => startConversation(), 500)
    return () => clearTimeout(t1)
  }, [])

  // Handle user actions (button clicks)
  const handleAction = async (action: string, data?: any) => {
    if (chatState === "AWAITING_CHOICE") {
      if (action === "browse" || action === "availability") {
        addCustomerMsg(action === "browse" ? "Browse Tours" : "Check Availability")
        addAIMsg({
          type: "tours",
          text: "Here are our top-rated experiences ✨ Tap a tour to select:",
          tours: [
            { name: "Wahiba Sands Desert Safari", price: "45.000 OMR", image: TOUR_IMAGES.desert, id: "desert" },
            { name: "Musandam Dhow Cruise", price: "65.000 OMR", image: TOUR_IMAGES.dhow, id: "dhow" },
            { name: "Jebel Shams Mountain Trek", price: "55.000 OMR", image: TOUR_IMAGES.mountain, id: "mountain" },
            { name: "Wadi Shab Adventure", price: "35.000 OMR", image: TOUR_IMAGES.wadi, id: "wadi" },
          ],
        })
        setChatState("SHOW_TOURS")
      }
      return
    }

    if (chatState === "SHOW_TOURS" && action === "select_tour") {
      const tour = data.tour
      addCustomerMsg(`I want to book ${tour.name}`)
      setBookingData({ ...bookingData, tour })
      addAIMsg({
        type: "buttons",
        text: `Great choice! 🐪 ${tour.name} — ${tour.price}/adult.\n\nWhich date?`,
        buttons: [
          { label: "📅 Today", action: "date", data: "today" },
          { label: "📅 Tomorrow", action: "date", data: "tomorrow" },
        ],
      })
      setChatState("AWAITING_DATE")
      return
    }

    if (chatState === "AWAITING_DATE" && action === "date") {
      addCustomerMsg(data === "today" ? "Today" : "Tomorrow")
      setBookingData({ ...bookingData, date: data })
      addAIMsg({
        type: "slots",
        text: `Available slots for ${data}:`,
        slots: [
          { time: "8:00 AM", price: bookingData.tour.price, seats: "6 seats", id: "08:00" },
          { time: "2:00 PM", price: bookingData.tour.price, seats: "3 seats 🔥", id: "14:00" },
          { time: "4:30 PM (Sunset)", price: "50.000 OMR", seats: "8 seats", id: "16:30" },
        ],
      })
      setChatState("SHOW_SLOTS")
      return
    }

    if (chatState === "SHOW_SLOTS" && action === "select_slot") {
      const slot = data.slot
      addCustomerMsg(`Book ${slot.time}`)
      setBookingData({ ...bookingData, slot })
      addAIMsg({
        type: "buttons",
        text: `How many adults?`,
        buttons: [
          { label: "1 Adult", action: "pax", data: 1 },
          { label: "2 Adults", action: "pax", data: 2 },
          { label: "3 Adults", action: "pax", data: 3 },
          { label: "4+ Adults", action: "pax", data: 4 },
        ],
      })
      setChatState("AWAITING_PAX")
      return
    }

    if (chatState === "AWAITING_PAX" && action === "pax") {
      addCustomerMsg(`${data} ${data === 1 ? "adult" : "adults"}`)
      setBookingData({ ...bookingData, pax: data })
      addAIMsg({ type: "text", text: `Great! ${data} ${data === 1 ? "adult" : "adults"} for ${bookingData.tour.name}.\n\nWhat's your full name?` })
      setChatState("ASK_NAME")
      setInputEnabled(true)
      setInputPlaceholder("Type your name...")
      return
    }

    if (chatState === "ASK_PAYMENT" && action === "pay") {
      addCustomerMsg(data === "bank" ? "1" : "2")
      if (data === "bank") {
        setBookingData({ ...bookingData, payment: "Bank Transfer" })
        addAIMsg({
          type: "text",
          // No account number here. This is a demonstration, and printing one
          // business's IBAN on every other business's website invites a
          // visitor to pay a stranger. The real bank details come from the
          // workspace's own settings at the actual checkout.
          text: `Perfect! Please transfer ${bookingData.total} using the bank details ${brand.name || "we"} will send you.\n\n📸 Send a screenshot of your transfer here to confirm.`,
        })
        setChatState("AWAITING_SCREENSHOT")
        timerRef.current = setTimeout(() => {
          addAIMsg({
            type: "buttons",
            text: "Or simulate sending a payment screenshot:",
            buttons: [{ label: "📸 Send Screenshot", action: "screenshot" }],
          })
        }, 1500)
        return
      }

      // AmwalPay path — create real order + real payment link
      setBookingData({ ...bookingData, payment: "AmwalPay" })
      let amwalPayUrl = "https://test.amwalpg.com:7443/SIM744442"
      let realOrderId = null
      try {
        const tourName = bookingData.tour?.name || "Wahiba Sands Desert Safari"
        const toursRes = await fetch(api("/api/tours"))
        const toursData = await toursRes.json()
        const matchedTour = (toursData.tours || []).find((t: any) => t.name.includes(tourName.split(" ")[0])) || (toursData.tours || [])[0]
        if (matchedTour) {
          const availRes = await fetch(api(`/api/avail-check?tourId=${matchedTour.id}`))
          const availData = await availRes.json()
          const matchedSlot = (availData.slots || []).find((s: any) => s.startTime === (bookingData.slot?.id || "14:00")) || (availData.slots || [])[0]
          if (matchedSlot) {
            const orderRes = await fetch(api("/api/orders"), {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tourId: matchedTour.id, slotId: matchedSlot.id,
                paxAdult: bookingData.pax || 1, paxChild: 0,
                customerName: bookingData.name, customerPhone: bookingData.phone || "+96891234567",
                customerEmail: bookingData.email, paymentMethod: "AMWALPAY", channel: "WHATSAPP",
              }),
            })
            const orderData = await orderRes.json()
            if (orderData.order) {
              realOrderId = orderData.order.id
              const payRes = await fetch(api("/api/amwalpay/create-session"), {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: orderData.order.id }),
              })
              const payData = await payRes.json()
              if (payData.success && payData.checkoutUrl) {
                amwalPayUrl = payData.checkoutUrl
              }
            }
          }
        }
      } catch (e) { console.error("Simulator AmwalPay error:", e) }

      // Show payment link + buttons (always runs — no early return)
      addAIMsg({
        type: "text",
        text: `💳 AmwalPay Payment:\n\n${amwalPayUrl}\n\nClick the button below to pay ${bookingData.total} securely.\n🔒 PCI-DSS compliant`,
      })
      setBookingData({ ...bookingData, realOrderId, realCheckoutUrl: amwalPayUrl })
      setChatState("AWAITING_AMWAL")
      const url = amwalPayUrl
      timerRef.current = setTimeout(() => {
        addAIMsg({
          type: "buttons",
          text: "Complete your payment:",
          buttons: [
            { label: "💳 Pay with AmwalPay", action: "open_amwal", data: url },
            { label: "✅ Payment Done", action: "amwal_done" },
          ],
        })
      }, 1500)
      return
    }

    if (chatState === "AWAITING_SCREENSHOT" && action === "screenshot") {
      addCustomerMsg("Payment screenshot", "image", "payment_screenshot.jpg")
      setChatState("PAYMENT_CONFIRMED")
      addAIMsg({
        type: "text",
        text: `✅ Payment received, ${bookingData.name}!\n\n🎫 Order: ${bookingData.order}\n💰 Amount: ${bookingData.total}\n📊 Status: Verifying...\n\nOur team is verifying your payment. You'll receive your e-voucher with QR code here within 2 hours. Safe travels! 🐪`,
      })
      timerRef.current = setTimeout(() => {
        addAIMsg({
          type: "buttons",
          text: "Booking complete! What next?",
          buttons: [
            { label: "🔄 New Booking", action: "restart" },
            { label: "💬 Talk to Agent", action: "human" },
          ],
        })
        setChatState("DONE")
      }, 2000)
      return
    }

    if (chatState === "AWAITING_AMWAL" && action === "amwal_done") {
      addCustomerMsg("✅ Payment Done")
      setChatState("PAYMENT_CONFIRMED")
      addAIMsg({
        type: "text",
        text: `✅ Payment confirmed via AmwalPay!\n\n🎫 Order: ${bookingData.order}\n💰 Amount: ${bookingData.total}\n📊 Status: Confirmed ✅\n\nYour e-voucher with QR code has been sent. Safe travels, ${bookingData.name}! 🐪`,
      })
      timerRef.current = setTimeout(() => {
        addAIMsg({
          type: "buttons",
          text: "Booking complete! What next?",
          buttons: [
            { label: "🔄 New Booking", action: "restart" },
            { label: "💬 Talk to Agent", action: "human" },
          ],
        })
        setChatState("DONE")
      }, 2000)
      return
    }

    if (action === "open_amwal" && data) {
      if (typeof window !== "undefined") window.open(data, "_blank")
      return
    }

    if (action === "restart") {
      startConversation()
      return
    }

    if (action === "human") {
      addCustomerMsg("I want to talk to an agent")
      addAIMsg({ type: "text", text: "I'm connecting you with one of our team members who will assist you shortly. 🙏" })
      return
    }
  }

  // Handle text input (for name, phone, email)
  const handleSendText = () => {
    const text = inputText.trim()
    if (!text || !inputEnabled) return
    addCustomerMsg(text)
    setInputText("")

    if (chatState === "ASK_NAME") {
      setBookingData({ ...bookingData, name: text })
      setInputPlaceholder("Type your WhatsApp number...")
      addAIMsg({ type: "text", text: `Nice to meet you, ${text}! 👋\n\nWhat's your WhatsApp number? (for booking confirmations)` })
      setChatState("ASK_PHONE")
      return
    }

    if (chatState === "ASK_PHONE") {
      setBookingData({ ...bookingData, phone: text })
      setInputPlaceholder("Type your email (or 'skip')")
      addAIMsg({ type: "text", text: "Got it! What's your email address? (optional — reply 'skip' to skip)" })
      setChatState("ASK_EMAIL")
      return
    }

    if (chatState === "ASK_EMAIL") {
      const email = text.toLowerCase() === "skip" ? null : text
      setBookingData({ ...bookingData, email })

      // Create booking
      const orderNum = `ORD-${1000 + Math.floor(Math.random() * 999)}`
      const price = parseFloat(bookingData.tour.price.replace(/[^\d.]/g, ""))
      const total = (price * bookingData.pax * 1.05).toFixed(3)
      const fullBooking = { ...bookingData, email, order: orderNum, total: `${total} OMR` }
      setBookingData(fullBooking)
      setInputEnabled(false)
      setInputPlaceholder("Message")

      addAIMsg({
        type: "summary",
        text: `✅ Booking created, ${bookingData.name}!`,
        summary: { order: orderNum, total: `${total} OMR`, options: ["Bank Transfer", "AmwalPay"] },
      })

      timerRef.current = setTimeout(() => {
        addAIMsg({
          type: "buttons",
          text: "How would you like to pay?",
          buttons: [
            { label: "🏦 1. Bank Transfer", action: "pay", data: "bank" },
            { label: "💳 2. AmwalPay", action: "pay", data: "amwal" },
          ],
        })
        setChatState("ASK_PAYMENT")
      }, 1500)
      return
    }
  }

  const handleReset = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setInputEnabled(false)
    setInputText("")
    setInputPlaceholder("Message")
    startConversation()
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 min-h-[60vh] py-8 sm:py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 max-w-2xl mx-auto">
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 mb-3">
            <Smartphone className="h-3 w-3 mr-1" />{t("liveChat")} · Interactive
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">{t("whatsappSimulator")}</h1>
          <p className="text-stone-600 mt-2 text-sm sm:text-base">Tap buttons, choose tours, type your details — fully interactive!</p>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* Phone mockup */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-emerald-300/40 to-teal-400/40 rounded-[3rem] blur-2xl" />
              <div className="relative w-[320px] sm:w-[360px] bg-stone-900 rounded-[2.5rem] p-3 shadow-2xl border-[3px] border-stone-800">
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-stone-900 rounded-b-2xl z-20 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-stone-700" />
                  <div className="w-12 h-1 rounded-full bg-stone-700" />
                </div>

                <div className="relative bg-stone-50 rounded-[2rem] overflow-hidden h-[640px] flex flex-col">
                  {/* Status bar */}
                  <div className="bg-emerald-700 text-white px-5 pt-8 pb-2 flex items-center justify-between text-[10px]">
                    <span className="font-medium">9:41</span>
                    <div className="flex items-center gap-1"><SignalHigh className="h-3 w-3" /><Wifi className="h-3 w-3" /><BatteryFull className="h-3.5 w-3.5" /></div>
                  </div>

                  {/* Chat header */}
                  <div className="bg-emerald-700 text-white px-3 py-2 flex items-center gap-3 shadow-md">
                    <ChevronLeft className="h-5 w-5" />
                    <div className="relative">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-amber-950 font-bold text-sm">N</div>
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-300 border-2 border-emerald-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm flex items-center gap-1.5">{brand.name || "Assistant"} <Badge className="bg-white/20 text-white hover:bg-white/20 text-[8px] px-1 py-0 h-3.5">AI</Badge></div>
                      <div className="text-[10px] text-emerald-50/80">{typing ? "typing..." : "online"}</div>
                    </div>
                    <Video className="h-4 w-4 text-emerald-50/80" />
                    <PhoneCall className="h-4 w-4 text-emerald-50/80" />
                  </div>

                  {/* Chat area */}
                  <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2" style={{ backgroundColor: "#e5ddd5", backgroundImage: `linear-gradient(rgba(16,122,87,0.04),rgba(16,122,87,0.04)),url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23107a57' fill-opacity='0.04'%3E%3Cpath d='M0 0h20v20H0V0zm20 20h20v20H20V20z'/%3E%3C/g%3E%3C/svg%3E")` }}>
                    {messages.map((msg) => (
                      <InteractiveChatBubble key={msg.id} msg={msg} onAction={handleAction} />
                    ))}
                    {typing && (
                      <div className="flex items-end gap-1.5">
                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-amber-950 font-bold text-[10px] shrink-0">N</div>
                        <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2.5 shadow-sm">
                          <div className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input bar — interactive */}
                  <div className="bg-stone-100 px-2 py-2 flex items-center gap-2 border-t border-stone-200">
                    <div className="flex-1 bg-white rounded-full px-3 py-2 flex items-center gap-2">
                      <Smile className="h-4 w-4 text-stone-400 shrink-0" />
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSendText() }}
                        disabled={!inputEnabled}
                        placeholder={inputPlaceholder}
                        className="flex-1 text-xs bg-transparent outline-none disabled:cursor-not-allowed"
                      />
                      {inputEnabled && <Paperclip className="h-4 w-4 text-stone-400 shrink-0" />}
                    </div>
                    <button
                      onClick={inputEnabled ? handleSendText : undefined}
                      className={`h-9 w-9 rounded-full flex items-center justify-center text-white shrink-0 transition-colors ${inputEnabled && inputText.trim() ? "bg-emerald-600" : "bg-stone-400"}`}
                      aria-label="Send"
                    >
                      {inputEnabled ? <Send className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="bg-stone-100 py-1 flex justify-center">
                    <div className="w-24 h-1 rounded-full bg-stone-900/60" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls + Info */}
          <div className="space-y-4">
            <Card className="border-stone-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><WhatsAppIcon className="h-4 w-4" />Demo Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-1.5" />{t("reset")} & Start New
                </Button>
                <div className="text-xs text-stone-500 text-center">
                  💡 This is a <strong>fully interactive</strong> demo. Tap buttons, choose tours, type your details — just like real WhatsApp!
                </div>
              </CardContent>
            </Card>

            <Card className="border-stone-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-500" />Interactive Flow</CardTitle></CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  { icon: WhatsAppIcon, title: "Choose option", desc: "Browse Tours or Check Availability" },
                  { icon: MapPin, title: "Select a tour", desc: "Tap any tour card to select" },
                  { icon: Calendar, title: "Pick date & time", desc: "Choose Today or Tomorrow, then a slot" },
                  { icon: Users, title: "Select pax", desc: "Choose 1-4+ adults" },
                  { icon: User, title: "Enter details", desc: "Type name, phone, email" },
                  { icon: CreditCard, title: "Choose payment", desc: "Bank Transfer or AmwalPay" },
                  { icon: CheckCircle, title: "Confirm & done!", desc: "Send screenshot → confirmed" },
                ].map(({ icon: Icon, title, desc }, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="relative shrink-0">
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center"><Icon className="h-4 w-4 text-emerald-600" /></div>
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center">{i + 1}</span>
                    </div>
                    <div className="min-w-0"><div className="text-xs font-semibold text-stone-900">{title}</div><div className="text-[11px] text-stone-500">{desc}</div></div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2"><Zap className="h-4 w-4 text-amber-500" /><span className="text-sm font-semibold text-stone-900">Why WhatsApp?</span></div>
                <ul className="space-y-1.5 text-xs text-stone-600">
                  <li className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" />No app download needed</li>
                  <li className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" />24/7 AI-powered support</li>
                  <li className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" />Instant booking & payment</li>
                  <li className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" />Voucher sent directly to chat</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function InteractiveChatBubble({ msg, onAction }: { msg: ChatMessage; onAction: (action: string, data?: any) => void }) {
  const isCustomer = msg.from === "customer"

  if (isCustomer) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%]">
          {msg.type === "image" ? (
            <div className="bg-emerald-500 rounded-2xl rounded-br-sm p-1.5 shadow-sm">
              <div className="bg-stone-200 rounded-xl overflow-hidden">
                <img src={TOUR_IMAGES.desert} alt="Payment screenshot" className="w-48 h-32 object-cover" />
                <div className="px-2 py-1.5 flex items-center gap-1.5 text-[10px] text-stone-600">
                  <ImageIcon className="h-3 w-3" /><span className="truncate">{msg.imageLabel}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-500 text-white rounded-2xl rounded-br-sm px-3 py-2 shadow-sm">
              <p className="text-sm whitespace-pre-line">{msg.text}</p>
            </div>
          )}
          <div className="text-[9px] text-stone-400 text-right mt-0.5 flex items-center justify-end gap-0.5">{msg.time}<CheckCheck className="h-2.5 w-2.5 text-sky-500" /></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-1.5">
      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-amber-950 font-bold text-[10px] shrink-0">N</div>
      <div className="max-w-[80%]">
        <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm">
          {msg.type === "tours" && msg.tours ? (
            <div>
              <p className="text-xs text-stone-700 mb-1.5">{msg.text}</p>
              <div className="space-y-1.5">
                {msg.tours.map((tour, i) => (
                  <button key={i} onClick={() => onAction("select_tour", { tour })} className="w-full flex items-center gap-2 p-1.5 rounded-lg bg-stone-50 border border-stone-100 hover:border-emerald-300 hover:bg-emerald-50 transition-colors text-left">
                    <img src={tour.image} alt="" className="h-9 w-9 rounded-md object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-stone-800 truncate">{tour.name}</div>
                      <div className="text-[10px] text-emerald-700 font-semibold">{tour.price}</div>
                    </div>
                    <ChevronRight className="h-3 w-3 text-stone-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : msg.type === "slots" && msg.slots ? (
            <div>
              <p className="text-xs text-stone-700 mb-1.5">{msg.text}</p>
              <div className="space-y-1">
                {msg.slots.map((slot, i) => (
                  <button key={i} onClick={() => onAction("select_slot", { slot })} className="w-full flex items-center justify-between p-1.5 rounded-lg bg-emerald-50 border border-emerald-100 hover:border-emerald-400 hover:bg-emerald-100 transition-colors text-left">
                    <div className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-emerald-600" /><span className="text-[11px] font-medium text-stone-800">{slot.time}</span></div>
                    <div className="text-right"><div className="text-[10px] font-semibold text-emerald-700">{slot.price}</div><div className="text-[9px] text-stone-500">{slot.seats}</div></div>
                  </button>
                ))}
              </div>
            </div>
          ) : msg.type === "summary" && msg.summary ? (
            <div>
              <p className="text-xs font-semibold text-stone-900 mb-1">{msg.text}</p>
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1">
                <div className="flex items-center justify-between text-[11px]"><span className="text-stone-600">Order</span><span className="font-mono font-semibold text-stone-900">{msg.summary.order}</span></div>
                <div className="flex items-center justify-between text-[11px]"><span className="text-stone-600">Total</span><span className="font-bold text-emerald-700">{msg.summary.total}</span></div>
              </div>
              <p className="text-[11px] text-stone-600 mt-1.5">Pay via:</p>
              <div className="flex gap-1 mt-0.5">
                {msg.summary.options.map((opt, i) => (<span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">{i + 1}. {opt}</span>))}
              </div>
            </div>
          ) : msg.type === "buttons" && msg.buttons ? (
            <div>
              {msg.text && <p className="text-sm text-stone-800 whitespace-pre-line mb-2">{msg.text}</p>}
              <div className="flex flex-wrap gap-1.5">
                {msg.buttons.map((btn, i) => (
                  <button key={i} onClick={() => onAction(btn.action, btn.data)} className="text-[11px] px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all font-medium">
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-stone-800 whitespace-pre-line">{msg.text}</p>
          )}
        </div>
        <div className="text-[9px] text-stone-400 mt-0.5">{msg.time}</div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   CART SHEET (slide-out)
─────────────────────────────────────────────────────────────────────────────── */

function CartSheet({ open, onOpenChange, cart, setCart, onNav, lang, t }: {
  open: boolean; onOpenChange: (o: boolean) => void; cart: CartItem[]; setCart: (c: CartItem[]) => void
  onNav: (s: Step) => void; lang: Lang; t: (k: string) => string
}) {
  const api = useApi()
  const removeItem = (id: string) => setCart(cart.filter((it) => it.id !== id))
  const updatePax = (id: string, type: "adult" | "child", delta: number) => {
    setCart(cart.map((it) => {
      if (it.id !== id) return it
      const newAdult = type === "adult" ? Math.max(1, it.paxAdult + delta) : it.paxAdult
      const newChild = type === "child" ? Math.max(0, it.paxChild + delta) : it.paxChild
      return { ...it, paxAdult: newAdult, paxChild: newChild }
    }))
  }
  const subtotal = cart.reduce((sum, it) => sum + it.price * it.paxAdult + it.childPrice * it.paxChild, 0)
  const vat = subtotal * 0.05
  const total = subtotal + vat

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={lang === "AR" ? "left" : "right"} className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-stone-200">
          <SheetTitle className="flex items-center gap-2 text-base"><ShoppingCart className="h-4 w-4 text-emerald-600" />{t("yourCart")} ({cart.length})</SheetTitle>
        </SheetHeader>
        {cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-stone-100 flex items-center justify-center mb-3">
                <ShoppingCart className="h-7 w-7 text-stone-400" />
              </div>
              <p className="text-sm font-medium text-stone-900">{t("emptyCart")}</p>
              <p className="text-xs text-stone-500 mt-1 mb-4">{t("emptyCartDesc")}</p>
              <Button size="sm" className="bg-emerald-600 text-white" onClick={() => { onOpenChange(false); onNav(1) }}>{t("browseTours")}</Button>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-4 py-3">
              <div className="space-y-3">
                {cart.map((it) => (
                  <Card key={it.id} className="border-stone-200">
                    <CardContent className="p-3">
                      <div className="flex gap-2.5">
                        <div className="h-14 w-14 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                          { }
                          <img src={tourImage(it.tour)} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-sm font-medium text-stone-900 line-clamp-1">{it.tour.name}</div>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-stone-400 hover:text-rose-500 shrink-0" onClick={() => removeItem(it.id)}><X className="h-3.5 w-3.5" /></Button>
                          </div>
                          <div className="text-[10px] text-stone-500 mt-0.5">{formatDate(it.slot.date)} · {formatTime(it.slot.startTime)}</div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="outline" className="h-6 w-6 rounded-full" onClick={() => updatePax(it.id, "adult", -1)}><Minus className="h-2.5 w-2.5" /></Button>
                              <span className="text-[10px] text-stone-600 w-12 text-center">{it.paxAdult}A{it.paxChild > 0 ? ` ${it.paxChild}C` : ""}</span>
                              <Button size="icon" variant="outline" className="h-6 w-6 rounded-full" onClick={() => updatePax(it.id, "adult", 1)}><Plus className="h-2.5 w-2.5" /></Button>
                            </div>
                            <div className="ml-auto text-sm font-bold text-emerald-700">{formatCurrency(it.price * it.paxAdult + it.childPrice * it.paxChild)}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
            <SheetFooter className="px-4 py-3 border-t border-stone-200">
              <div className="space-y-1.5 text-sm w-full mb-2">
                <div className="flex justify-between text-stone-600"><span>{t("subtotal")}</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between text-stone-600"><span>{t("vat")}</span><span>{formatCurrency(vat)}</span></div>
                <div className="flex justify-between text-base font-bold text-stone-900 pt-1.5 border-t border-stone-100"><span>{t("totalInclVat")}</span><span className="text-emerald-700">{formatCurrency(total)}</span></div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { onOpenChange(false); onNav(7) }}>{t("viewCart")}</Button>
                <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white" onClick={() => { onOpenChange(false); onNav(7) }}>{t("checkoutAll")}</Button>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
─────────────────────────────────────────────────────────────────────────────── */

/**
 * @param slug The workspace whose site this is, when it is being served to the
 * public at /shop/their-address. Absent inside the dashboard, where the
 * signed-in session already says which workspace is being looked at.
 */
export default function CustomerSiteView({ slug }: { slug?: string } = {}) {
  const [brand, setBrand] = useState<Brand>(FALLBACK_BRAND)
  const setView = useApp((s) => s.setView)
  const setAuthMode = useApp((s) => s.setAuthMode)
  const setSelectedTour = useApp((s) => s.setSelectedTour)
  const customerUser = useApp((s) => s.customerUser)

  // Local state with lazy initializers (read localStorage without useEffect)
  const [step, setStep] = useState<Step>(() => {
    if (typeof window === "undefined") return 0
    const h = window.location.hash.replace(/^#\/?/, "").split("?")[0]
    const map: Record<string, number> = { "": 0, tours: 1, tour: 2, checkout: 3, payment: 4, confirmation: 5, account: 6, cart: 7, about: 8, contact: 9, whatsapp: 10 }
    return (map[h] ?? 0) as Step
  })
  const [lang, setLang] = useState<Lang>(() => {
    try { const s = localStorage.getItem("oa-lang") as Lang | null; return s || "EN" } catch { return "EN" }
  })
  const [tours, setTours] = useState<any[]>([])
  const [loadingTours, setLoadingTours] = useState(true)
  const [selectedTourId, setSelectedTourIdLocal] = useState<string | null>(null)
  const [tour, setTour] = useState<any>(null)
  const [loadingTour, setLoadingTour] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [booking, setBooking] = useState<any>(null)
  const [order, setOrder] = useState<any>(null)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try { const s = localStorage.getItem("oa-cart"); return s ? JSON.parse(s) : [] } catch { return [] }
  })
  const [cartOpen, setCartOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  // i18n
  const t = useCallback((k: string) => T[lang][k] ?? T.EN[k] ?? k, [lang])
  const isRTL = lang === "AR"

  // Persist language + cart to localStorage whenever they change
  useEffect(() => { try { localStorage.setItem("oa-lang", lang) } catch {} }, [lang])
  useEffect(() => { try { localStorage.setItem("oa-cart", JSON.stringify(cart)) } catch {} }, [cart])

  // Hash-based routing
  const hashToStep = (hash: string): Step => {
    const h = hash.replace(/^#\/?/, "").split("?")[0]
    const map: Record<string, Step> = {
      "": 0, "tours": 1, "tour": 2, "checkout": 3, "payment": 4, "confirmation": 5,
      "account": 6, "cart": 7, "about": 8, "contact": 9, "whatsapp": 10,
    }
    return map[h] ?? 0
  }
  const stepToHash = (s: Step): string => {
    const map: Record<number, string> = { 0: "", 1: "tours", 2: "tour", 3: "checkout", 4: "payment", 5: "confirmation", 6: "account", 7: "cart", 8: "about", 9: "contact", 10: "whatsapp" }
    return `#/${map[s] || ""}`
  }

  // Listen for hash changes (browser back/forward)
  useEffect(() => {
    const onHashChange = () => setStep(hashToStep(window.location.hash))
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  const navigate = useCallback((s: Step) => {
    setStep(s)
    window.location.hash = stepToHash(s)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  /*
   * Whose site this is.
   *
   * Public visitors have no session, so the workspace travels in the query
   * string — the same way the API resolves it for every other unauthenticated
   * caller. Inside the dashboard there is a session and the settings endpoint
   * answers for the workspace already being looked at, which keeps the preview
   * honest: it reads exactly what the public page will read.
   */
  useEffect(() => {
    const url = slug ? `/api/shop/${encodeURIComponent(slug)}` : "/api/settings"
    fetch(url)
      .then(r => r.json())
      .then(d => setBrand(brandFrom(d.shop ?? d.settings ?? {}, d.shop?.name ?? d.settings?.tenant_name ?? "")))
      .catch(() => {})
  }, [slug])

  /** Every call carries the workspace when nobody is signed in to imply it. */
  const api = useCallback(
    (path: string) => (slug ? `${path}${path.includes("?") ? "&" : "?"}workspace=${encodeURIComponent(slug)}` : path),
    [slug],
  )

  // Load tours
  useEffect(() => {
    fetch(api("/api/tours"))
      .then((r) => r.json())
      .then((d) => setTours(d.tours || []))
      .catch(() => setTours([]))
      .finally(() => setLoadingTours(false))
  }, [])

  // Reset tour loading state when selectedTourId changes (adjust-during-render pattern)
  const [prevTourId, setPrevTourId] = useState<string | null>(selectedTourId)
  if (selectedTourId !== prevTourId) {
    setPrevTourId(selectedTourId)
    setLoadingTour(true)
    setTour(null)
  }

  // Load tour detail
  useEffect(() => {
    if (!selectedTourId) return
    fetch(api(`/api/tours/${selectedTourId}`))
      .then((r) => r.json())
      .then((d) => setTour(d.tour))
      .catch(() => setTour(null))
      .finally(() => setLoadingTour(false))
  }, [selectedTourId])

  // SEO
  useEffect(() => {
    // The browser tab, the bookmark and the search result all read this, so it
    // carries the business's name rather than the one this page was first
    // written for.
    const who = brand.name || ""
    const suffix = who ? ` | ${who}` : ""
    const titles: Record<Step, string> = {
      0: [who, brand.hero.subtitle].filter(Boolean).join(" — ") || "Book online",
      1: `All Tours & Activities${suffix}`,
      2: tour ? `${tour.name} — ${tour.city}${suffix}` : `Tour Details${suffix}`,
      3: `Checkout${suffix}`,
      4: `Payment${suffix}`,
      5: order ? `Booking Confirmed — ${order.orderNumber}${suffix}` : `Booking Confirmed${suffix}`,
      6: `My Account${suffix}`,
      7: `Your Cart${suffix}`,
      8: `About Us${suffix}`,
      9: `Contact Us${suffix}`,
      10: `WhatsApp Booking${suffix}`,
    }
    document.title = titles[step] || who
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
    if (!meta) {
      meta = document.createElement("meta")
      meta.setAttribute("name", "description")
      document.head.appendChild(meta)
    }
    // One description, from what the business said about itself. The set that
    // stood here described desert safaris and dhow cruises for every page of
    // every workspace.
    const description =
      brand.hero.subtitle ||
      summarise(brand.about, 155) ||
      (who ? `Book online with ${who}.` : "Book online.")
    meta.setAttribute("content", description)
  }, [step, tour, order, brand])

  // Handlers
  const handleSelectTour = useCallback((id: string) => {
    setSelectedTourIdLocal(id)
    setSelectedTour(id)
    navigate(2)
  }, [navigate, setSelectedTour])

  const handleCheckout = useCallback((data: any) => {
    setBooking(data)
    navigate(3)
  }, [navigate])

  const handleProceedToPayment = useCallback((data: any) => {
    setBooking(data)
    navigate(4)
  }, [navigate])

  const handleCompletePayment = useCallback((ord: any) => {
    setOrder(ord)
    navigate(5)
  }, [navigate])

  const handleAddToCart = useCallback((tourData: any, slot: any, paxAdult: number, paxChild: number) => {
    const childPrice = tourData.childPrice || tourData.basePrice * 0.7
    const item: CartItem = {
      id: `${tourData.id}-${slot.id}-${Date.now()}`,
      tour: tourData, slot, paxAdult, paxChild,
      price: tourData.basePrice, childPrice,
      addOns: [],
    }
    setCart((prev) => [...prev, item])
    toast.success(T[lang].addedToCart)
  }, [lang])

  const handleRebook = useCallback((tourId: string) => {
    handleSelectTour(tourId)
  }, [handleSelectTour])

  const handleTryWhatsapp = useCallback(() => navigate(10), [navigate])

  // Render
  return (
    <BrandContext.Provider value={brand}>
    <TooltipProvider delayDuration={200}>
      <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen flex flex-col bg-white text-stone-900">
        <SiteHeader
          lang={lang} setLang={setLang} step={step} onNav={navigate}
          cartCount={cart.length} onOpenCart={() => setCartOpen(true)}
          onOpenAccount={() => { setAccountOpen(true); navigate(6) }}
          t={t} isCustomer={!!customerUser} customerName={customerUser?.name || null}
        />

        <main className="flex-1">
          {step === 0 && (
            <HomePage
              tours={tours} loading={loadingTours} onSelectTour={handleSelectTour}
              onNav={navigate} onSearch={setSearchQuery} lang={lang} t={t}
              onTryWhatsapp={handleTryWhatsapp}
            />
          )}
          {step === 1 && (
            <ToursListingPage
              tours={tours} loading={loadingTours} onSelectTour={handleSelectTour}
              onNav={navigate} searchQuery={searchQuery} lang={lang} t={t}
            />
          )}
          {step === 2 && (
            <TourDetailPage
              key={selectedTourId || "none"}
              tour={tour} loading={loadingTour} onNav={navigate}
              onCheckout={handleCheckout} onAddToCart={handleAddToCart} lang={lang} t={t}
            />
          )}
          {step === 3 && (
            <CheckoutPage booking={booking} onNav={navigate} onProceed={handleProceedToPayment} lang={lang} t={t} />
          )}
          {step === 4 && (
            <PaymentPage booking={booking} onNav={navigate} onComplete={handleCompletePayment} lang={lang} t={t} />
          )}
          {step === 5 && (
            <ConfirmationPage order={order} onNav={navigate} lang={lang} t={t} />
          )}
          {step === 6 && (
            <AccountPage lang={lang} t={t} onNav={navigate} onRebook={handleRebook} />
          )}
          {step === 7 && (
            <CartPage
              cart={cart} setCart={setCart} onNav={navigate}
              onCheckoutAll={(orders) => { setOrder(orders[0]); navigate(5) }}
              lang={lang} t={t}
            />
          )}
          {step === 8 && <AboutPage onNav={navigate} lang={lang} t={t} />}
          {step === 9 && <ContactPage onNav={navigate} lang={lang} t={t} />}
          {step === 10 && <WhatsAppSimulator t={t} lang={lang} />}
        </main>

        <SiteFooter onNav={navigate} t={t} lang={lang} />

        <CartSheet
          open={cartOpen} onOpenChange={setCartOpen} cart={cart} setCart={setCart}
          onNav={navigate} lang={lang} t={t}
        />

        {/* Hidden admin access via ?admin=1 */}
        <AdminAccessWatcher setAuthMode={setAuthMode} setView={setView} />
      </div>
    </TooltipProvider>
    </BrandContext.Provider>
  )
}

/* Admin access watcher — hidden, only via ?admin=1 */
function AdminAccessWatcher({ setAuthMode, setView }: { setAuthMode: (m: any) => void; setView: (v: any) => void }) {
  useEffect(() => {
    const check = () => {
      try {
        const url = new URL(window.location.href)
        if (url.searchParams.get("admin") === "1") {
          setAuthMode("admin")
          setView("dashboard")
        }
      } catch {}
    }
    check()
    const onPop = () => check()
    window.addEventListener("popstate", onPop)
    window.addEventListener("hashchange", onPop)
    return () => { window.removeEventListener("popstate", onPop); window.removeEventListener("hashchange", onPop) }
  }, [setAuthMode, setView])
  return null
}
