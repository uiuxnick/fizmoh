"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  Phone,
  Mail,
  Globe,
  MapPin,
  Download,
  Share2,
  Clock,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Building2,
  Sparkles,
  QrCode,
  X,
  Send,
  AlertCircle,
  Volume2,
  VolumeX,
  Link2,
  Star,
  Award,
  Heart,
  FileText,
  Calendar,
  ShoppingBag,
  Tag,
  Briefcase,
  Utensils,
  Coffee,
  Hotel,
  Plane,
  Camera,
  Video,
  Music,
  Mic,
  BookOpen,
  Gift,
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { getBusinessStatus } from "@/lib/digital-vcard/business-hours"
import { getVCardTemplate } from "@/lib/digital-vcard/templates"
import { renderCustomIcon } from "@/lib/digital-vcard/custom-icons"

export interface CustomLinkItem {
  id?: string
  label: string
  url: string
  icon?: string
  iconType?: string
  highlight?: boolean
}

export interface PublicCardProps {
  card: {
    id: string
    slug: string
    title: string
    companyName?: string | null
    tagline?: string | null
    subtitle?: string | null
    bio?: string | null
    category?: string | null
    logoUrl?: string | null
    bannerUrl?: string | null
    coverType?: string | null
    coverVideoUrl?: string | null
    serviceLayout?: string | null
    primaryColor: string
    secondaryColor: string
    accentColor: string
    themeMode: string
    cardTemplate: string
    buttonStyle: string
    mediaConfig?: any
    contactName?: string | null
    contactTitle?: string | null
    contactDept?: string | null
    mobileNumber?: string | null
    whatsappNumber?: string | null
    landlineNumber?: string | null
    email?: string | null
    altEmail?: string | null
    websiteUrl?: string | null
    addressLine1?: string | null
    addressLine2?: string | null
    building?: string | null
    street?: string | null
    area?: string | null
    city?: string | null
    state?: string | null
    postalCode?: string | null
    country?: string | null
    latitude?: number | null
    longitude?: number | null
    googleMapsUrl?: string | null
    socialLinks?: any
    customLinks?: CustomLinkItem[] | any
    crNumber?: string | null
    vatNumber?: string | null
    isCrPublic: boolean
    paymentUrl?: string | null
    amwalPayUrl?: string | null
    paymobUrl?: string | null
    bankName?: string | null
    accountName?: string | null
    accountNumber?: string | null
    iban?: string | null
    swiftCode?: string | null
    showPaymentBtn: boolean
    showBankDetails: boolean
    businessHours?: any
    timezone: string
    holidayNotice?: string | null
    isHoliday: boolean
    showEmail: boolean
    showPhone: boolean
    showWhatsapp: boolean
    showAddress: boolean
    showServices: boolean
    showGallery: boolean
    showHours: boolean
    showLeadForm: boolean
    isVerified: boolean
  }
  items: Array<{
    id: string
    type: string
    name: string
    shortDesc?: string | null
    fullDesc?: string | null
    imageUrl?: string | null
    price?: number | null
    salePrice?: number | null
    currency: string
    pricePrefix?: string | null
    priceSuffix?: string | null
    ctaLabel?: string | null
    whatsappMessage?: string | null
    externalUrl?: string | null
  }>
  gallery: Array<{
    id: string
    type: string
    url: string
    caption?: string | null
  }>
  cardUrl: string
}

export function PublicCardClient({ card, items, gallery, cardUrl }: PublicCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showHoursDropdown, setShowHoursDropdown] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [selectedService, setSelectedService] = useState<string>("")
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(true)

  // Slider reference for services carousel
  const sliderRef = useRef<HTMLDivElement>(null)

  // Get active template definition
  const template = getVCardTemplate(card.cardTemplate)

  // Lead Form State
  const [leadName, setLeadName] = useState("")
  const [leadPhone, setLeadPhone] = useState("")
  const [leadEmail, setLeadEmail] = useState("")
  const [leadMessage, setLeadMessage] = useState("")
  const [leadSubmitting, setLeadSubmitting] = useState(false)
  const [leadSuccess, setLeadSuccess] = useState(false)
  const [leadError, setLeadError] = useState<string | null>(null)

  // Track Page View on Mount
  useEffect(() => {
    fetch(`/api/card/${card.slug}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "CARD_VIEW",
        referrer: typeof document !== "undefined" ? document.referrer : "",
      }),
    }).catch(() => {})
  }, [card.slug])

  const trackEvent = (eventType: string, extra: Record<string, any> = {}) => {
    fetch(`/api/card/${card.slug}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, ...extra }),
    }).catch(() => {})
  }

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldKey)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Calculate opening hours
  const businessStatus = getBusinessStatus(
    card.businessHours,
    card.timezone,
    card.holidayNotice,
    card.isHoliday,
  )

  const primaryPhone = card.mobileNumber || card.whatsappNumber || card.landlineNumber
  const cleanWaNumber = (card.whatsappNumber || card.mobileNumber || "").replace(/[^0-9]/g, "")
  const fullAddress = [card.building, card.street, card.area, card.city, card.country]
    .filter(Boolean)
    .join(", ") || card.addressLine1 || ""

  const handleShare = async () => {
    trackEvent("SHARE_CLICK")
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: card.title,
          text: card.subtitle || `Connect with ${card.title}`,
          url: cardUrl,
        })
        return
      } catch {
        // Fallback to QR modal if user cancels
      }
    }
    setShowQrModal(true)
  }

  const scrollSlider = (direction: "left" | "right") => {
    if (!sliderRef.current) return
    const scrollAmount = 260
    sliderRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    })
  }

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLeadSubmitting(true)
    setLeadError(null)

    try {
      const res = await fetch(`/api/card/${card.slug}/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadName,
          phone: leadPhone,
          email: leadEmail,
          message: leadMessage,
          serviceInterested: selectedService,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit enquiry")
      }

      setLeadSuccess(true)
      setTimeout(() => {
        setLeadSuccess(false)
        setShowLeadModal(false)
        setLeadName("")
        setLeadPhone("")
        setLeadEmail("")
        setLeadMessage("")
      }, 3000)
    } catch (err: any) {
      setLeadError(err.message || "Something went wrong. Please try again.")
    } finally {
      setLeadSubmitting(false)
    }
  }

  // Button radius helper
  const getButtonRadius = () => {
    switch (card.buttonStyle) {
      case "pill": return "rounded-full"
      case "square": return "rounded-lg"
      case "neo3d": return "rounded-xl border-b-4 border-black/25 active:border-b-0 active:translate-y-1"
      case "glass": return "rounded-2xl backdrop-blur-md bg-white/20 border border-white/40"
      default: return "rounded-2xl"
    }
  }

  const socialIcons: Record<string, { label: string; color: string }> = {
    instagram: { label: "Instagram", color: "#E1306C" },
    facebook: { label: "Facebook", color: "#1877F2" },
    linkedin: { label: "LinkedIn", color: "#0A66C2" },
    twitter: { label: "X (Twitter)", color: "#000000" },
    tiktok: { label: "TikTok", color: "#000000" },
    youtube: { label: "YouTube", color: "#FF0000" },
    snapchat: { label: "Snapchat", color: "#FFFC00" },
    telegram: { label: "Telegram", color: "#229ED9" },
    threads: { label: "Threads", color: "#000000" },
    pinterest: { label: "Pinterest", color: "#BD081C" },
    discord: { label: "Discord", color: "#5865F2" },
    spotify: { label: "Spotify", color: "#1DB954" },
    github: { label: "GitHub", color: "#24292E" },
  }

  const isVideoCover = card.coverType === "VIDEO" && !!card.coverVideoUrl
  const isDirectVideo = isVideoCover && (card.coverVideoUrl?.includes(".mp4") || card.coverVideoUrl?.includes("/api/media/") || card.coverVideoUrl?.includes("blob:"));

  const btnRadius = getButtonRadius()

  // Media Adjustments Config
  const media = card.mediaConfig || {}

  // Cover Height calculation
  let coverHeightStyle: React.CSSProperties = {}
  let coverHeightClass = "h-48 sm:h-52"
  if (typeof media.coverHeight === "number") {
    coverHeightStyle = { height: `${media.coverHeight}px` }
    coverHeightClass = ""
  } else if (media.coverHeight === "compact") {
    coverHeightClass = "h-36 sm:h-40"
  } else if (media.coverHeight === "tall") {
    coverHeightClass = "h-64 sm:h-72"
  } else if (media.coverHeight === "hero") {
    coverHeightClass = "h-80 sm:h-96"
  } else if (media.coverHeight === "standard") {
    coverHeightClass = "h-48 sm:h-52"
  } else if (media.coverCustomHeight && typeof media.coverCustomHeight === "number") {
    coverHeightStyle = { height: `${media.coverCustomHeight}px` }
    coverHeightClass = ""
  }

  // Cover Position & Fit
  let coverPos = "center"
  if (media.coverPosition === "top") coverPos = "top"
  else if (media.coverPosition === "bottom") coverPos = "bottom"
  else if (media.coverPosition === "center") coverPos = "center"
  else if (media.coverPosition) coverPos = media.coverPosition

  const coverFit = media.coverFit || "cover"
  const coverOverlayOpacity = typeof media.coverOverlay === "number" ? media.coverOverlay / 100 : 0
  const coverBlurClass = media.coverBlur === "subtle" ? "backdrop-blur-[2px]" : media.coverBlur === "medium" ? "backdrop-blur-[6px]" : ""

  // Logo Size & Shape & Fit
  let logoSizeClass = "w-28 h-28"
  let logoSizeStyle: React.CSSProperties = {}
  if (typeof media.logoSize === "number") {
    logoSizeStyle = { width: `${media.logoSize}px`, height: `${media.logoSize}px` }
    logoSizeClass = ""
  } else if (media.logoSize === "small") {
    logoSizeClass = "w-20 h-20"
  } else if (media.logoSize === "medium") {
    logoSizeClass = "w-28 h-28"
  } else if (media.logoSize === "large") {
    logoSizeClass = "w-32 h-32"
  } else if (media.logoSize === "xlarge") {
    logoSizeClass = "w-36 h-36"
  } else if (media.logoCustomSize && typeof media.logoCustomSize === "number") {
    logoSizeStyle = { width: `${media.logoCustomSize}px`, height: `${media.logoCustomSize}px` }
    logoSizeClass = ""
  }

  let logoShapeClass = "rounded-2xl"
  if (media.logoShape === "circle") logoShapeClass = "rounded-full"
  else if (media.logoShape === "square") logoShapeClass = "rounded-lg"

  const logoFitClass = media.logoFit === "contain" ? "object-contain p-2" : "object-cover"

  // Logo Border
  let logoBorderClass = template.avatarBorder
  let logoBorderStyle: React.CSSProperties = {}
  if (media.logoBorder === "none") {
    logoBorderClass = "border-0 shadow-sm"
  } else if (media.logoBorder === "white") {
    logoBorderClass = "border-4 border-white shadow-xl ring-1 ring-black/5"
  } else if (media.logoBorder === "accent") {
    logoBorderClass = "border-4 shadow-xl ring-2 ring-black/10"
    logoBorderStyle = { borderColor: card.accentColor || "#10b981" }
  } else if (media.logoBorder === "dark") {
    logoBorderClass = "border-2 border-slate-700 bg-slate-900 shadow-2xl ring-1 ring-white/10"
  }

  // Logo Alignment & Overlap
  let logoAlignContainer = "text-center"
  if (media.logoPosition === "left") logoAlignContainer = "text-left pl-6"
  else if (media.logoPosition === "right") logoAlignContainer = "text-right pr-6"

  let logoOverlapClass = "-mt-16"
  if (media.logoOverlap === "inside") logoOverlapClass = "-mt-8"
  else if (media.logoOverlap === "below") logoOverlapClass = "mt-4"
  else if (media.logoOverlap === "overlap") logoOverlapClass = "-mt-16"

  return (
    <div className={`min-h-screen antialiased flex flex-col items-center justify-start pb-12 sm:py-8 sm:px-4 ${template.wrapperClass}`}>
      {/* Profile Card Container */}
      <div className={`w-full max-w-md overflow-hidden transition-all duration-300 ${template.cardClass}`}>
        
        {/* Cover Media (Video or Image) */}
        <div
          className={`relative ${coverHeightClass} w-full overflow-hidden bg-slate-900 transition-all duration-300`}
          style={coverHeightStyle}
        >
          {isVideoCover ? (
            isDirectVideo ? (
              <video
                src={card.coverVideoUrl!}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className={`absolute inset-0 w-full h-full ${coverFit === "contain" ? "object-contain bg-black" : "object-cover"}`}
                style={{ objectPosition: coverPos }}
              />
            ) : (
              <iframe
                src={
                  card.coverVideoUrl?.includes("youtube.com") || card.coverVideoUrl?.includes("youtu.be")
                    ? `${card.coverVideoUrl.replace("watch?v=", "embed/")}?autoplay=1&mute=1&loop=1&controls=0`
                    : card.coverVideoUrl || undefined
                }
                className="absolute inset-0 w-full h-full object-cover pointer-events-none scale-125"
                allow="autoplay; muted"
              />
            )
          ) : (
            <div
              className={`absolute inset-0 ${coverFit === "contain" ? "bg-contain bg-no-repeat" : "bg-cover"} ${template.headerBg}`}
              style={{
                backgroundImage: card.bannerUrl ? `url(${card.bannerUrl})` : undefined,
                backgroundColor: card.primaryColor || undefined,
                backgroundPosition: coverPos,
              }}
            />
          )}

          {/* Overlay Gradient */}
          <div className={`absolute inset-0 ${template.headerOverlay}`} />

          {/* Dynamic Contrast Overlay & Blur */}
          {coverOverlayOpacity > 0 && (
            <div
              className={`absolute inset-0 bg-black pointer-events-none transition-opacity ${coverBlurClass}`}
              style={{ opacity: coverOverlayOpacity }}
            />
          )}

          {/* Sound toggle for direct video */}
          {isVideoCover && isDirectVideo && (
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="absolute bottom-3 left-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-md z-10 text-xs flex items-center gap-1 shadow-md transition-all active:scale-95"
              aria-label={isMuted ? "Unmute video" : "Mute video"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span className="text-[10px] font-bold">{isMuted ? "Muted" : "Playing"}</span>
            </button>
          )}

          {/* Quick Share Button */}
          <button
            onClick={handleShare}
            aria-label="Share card"
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/80 hover:bg-white text-slate-800 backdrop-blur-md shadow-md transition-transform active:scale-95 z-10"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* QR Code Button */}
          <button
            onClick={() => {
              trackEvent("QR_SCAN")
              setShowQrModal(true)
            }}
            aria-label="Show QR Code"
            className="absolute top-4 left-4 p-2.5 rounded-full bg-white/80 hover:bg-white text-slate-800 backdrop-blur-md shadow-md transition-transform active:scale-95 z-10"
          >
            <QrCode className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Card Header & Avatar */}
        <div className={`relative px-6 pt-0 pb-6 ${logoAlignContainer}`}>
          {/* Avatar Container */}
          <div className={`relative ${logoOverlapClass} mb-3 inline-block transition-all duration-300`}>
            <div
              className={`${logoSizeClass} ${logoShapeClass} overflow-hidden bg-white flex items-center justify-center transition-all duration-300 ${logoBorderClass}`}
              style={{ ...logoSizeStyle, ...logoBorderStyle }}
            >
              {card.logoUrl ? (
                <img
                  src={card.logoUrl}
                  alt={card.title}
                  className={`w-full h-full ${logoFitClass}`}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white font-bold text-3xl"
                  style={{ backgroundColor: card.primaryColor || "#0f766e" }}
                >
                  {(card.title || "VC").slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            {card.isVerified && (
              <div
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full text-white shadow-md z-10"
                style={{ backgroundColor: card.accentColor || "#10b981" }}
                title="Verified Business"
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* Business Title & Subtitle */}
          <h1 className={`text-2xl font-black tracking-tight leading-tight ${template.titleClass}`}>
            {card.title}
          </h1>

          {card.subtitle && (
            <p className={`text-sm mt-1 leading-snug ${template.subtitleClass}`}>
              {card.subtitle}
            </p>
          )}

          {card.bio && (
            <div className={`mt-3 p-3 rounded-2xl text-xs italic leading-relaxed ${
              template.id === "midnight-navy"
                ? "bg-slate-900/90 text-amber-200/90 border border-amber-500/30"
                : template.id === "curve-emerald"
                ? "bg-emerald-50 text-emerald-900 border border-emerald-200/80 font-medium"
                : template.id === "champagne-gold"
                ? "bg-[#faf4ea] text-stone-700 border border-[#e8ded0]"
                : "bg-black/5 dark:bg-white/5 opacity-80"
            }`}>
              "{card.bio}"
            </div>
          )}

          {card.category && (
            <div className={`mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${template.badgeClass}`}>
              <Building2 className="w-3.5 h-3.5" />
              <span>{card.category}</span>
            </div>
          )}

          {/* Contact Person Details */}
          {(card.contactName || card.contactTitle) && (
            <div className="mt-3 text-xs opacity-75 font-medium">
              {card.contactName && <span className="font-bold">{card.contactName}</span>}
              {card.contactTitle && <span> · {card.contactTitle}</span>}
            </div>
          )}

          {/* Real-time Business Hours Badge */}
          {card.showHours && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setShowHoursDropdown(!showHoursDropdown)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  businessStatus.isOpenNow
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20"
                    : businessStatus.statusVariant === "holiday"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20"
                    : "bg-rose-500/10 text-rose-600 border-rose-500/30 hover:bg-rose-500/20"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    businessStatus.isOpenNow
                      ? "bg-emerald-500 animate-pulse"
                      : businessStatus.statusVariant === "holiday"
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                />
                <span>{businessStatus.statusLabel}</span>
                {showHoursDropdown ? (
                  <ChevronUp className="w-3.5 h-3.5 opacity-70" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                )}
              </button>
            </div>
          )}

          {/* Expandable Weekly Hours Schedule */}
          {card.showHours && showHoursDropdown && (
            <div className="mt-3 p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-left text-xs space-y-1.5 animate-in fade-in duration-200">
              <div className="font-bold mb-2 flex items-center justify-between opacity-80">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Working Hours ({card.timezone})
                </span>
                {businessStatus.isOpenNow && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded font-bold">
                    OPEN
                  </span>
                )}
              </div>
              {businessStatus.weeklySchedule.map((day) => (
                <div
                  key={day.day}
                  className={`flex justify-between items-center py-1 px-2 rounded ${
                    day.isToday ? "bg-black/10 dark:bg-white/10 font-bold shadow-2xs" : "opacity-80"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {day.dayName}
                    {day.isToday && <span className="text-[10px] font-extrabold text-teal-500">(Today)</span>}
                  </span>
                  <span>{day.hoursFormatted}</span>
                </div>
              ))}
            </div>
          )}

          {/* Enhanced Creative Quick Action Buttons (4 Columns) */}
          <div className="grid grid-cols-4 gap-2.5 mt-6">
            {/* WhatsApp */}
            {card.showWhatsapp && cleanWaNumber && (
              <a
                href={`https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(
                  `Hello ${card.title}, I am contacting you from your Digital Business Card.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("WHATSAPP_CLICK")}
                className={`group relative flex flex-col items-center gap-1.5 p-3 border transition-all duration-200 active:scale-95 shadow-md hover:shadow-lg ${btnRadius} ${template.actionButtonClass.whatsapp}`}
              >
                {/* Available pulse indicator */}
                <span className="absolute top-2 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform">
                  <WhatsAppIcon className="w-5 h-5 fill-current" />
                </div>
                <span className="text-[11px] font-bold tracking-tight">WhatsApp</span>
              </a>
            )}

            {/* Direct Call */}
            {card.showPhone && primaryPhone && (
              <a
                href={`tel:${primaryPhone}`}
                onClick={() => trackEvent("CALL_CLICK")}
                className={`group relative flex flex-col items-center gap-1.5 p-3 border transition-all duration-200 active:scale-95 shadow-md hover:shadow-lg ${btnRadius} ${template.actionButtonClass.call}`}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform">
                  <Phone className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold tracking-tight">Call</span>
              </a>
            )}

            {/* Save vCard Contact (.vcf) */}
            <a
              href={`/api/vcard/${card.slug}/vcf`}
              onClick={() => trackEvent("SAVE_CONTACT")}
              download
              className={`group relative flex flex-col items-center gap-1.5 p-3 border transition-all duration-200 active:scale-95 shadow-md hover:shadow-lg ${btnRadius} ${template.actionButtonClass.vcf}`}
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform">
                <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
              </div>
              <span className="text-[11px] font-bold tracking-tight">Save Contact</span>
            </a>

            {/* Directions / Map */}
            {card.showAddress && (card.googleMapsUrl || fullAddress) && (
              <a
                href={
                  card.googleMapsUrl ||
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
                }
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("MAP_CLICK")}
                className={`group relative flex flex-col items-center gap-1.5 p-3 border transition-all duration-200 active:scale-95 shadow-md hover:shadow-lg ${btnRadius} ${template.actionButtonClass.directions}`}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-600/30 group-hover:scale-105 transition-transform">
                  <MapPin className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
                <span className="text-[11px] font-bold tracking-tight">Directions</span>
              </a>
            )}
          </div>

          {/* Enhanced Primary Action Pills */}
          <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
            <a
              href={`/api/vcard/${card.slug}/vcf`}
              download
              onClick={() => trackEvent("SAVE_CONTACT")}
              className={`flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-bold transition-all active:scale-[0.98] ${btnRadius} ${template.primaryButtonClass}`}
            >
              <Download className="w-4 h-4 animate-bounce" />
              <span>Save to Phone Contacts</span>
            </a>

            {card.showLeadForm && (
              <button
                onClick={() => {
                  setSelectedService("")
                  setShowLeadModal(true)
                }}
                className={`inline-flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-bold transition-all active:scale-[0.98] ${btnRadius} ${template.secondaryButtonClass}`}
              >
                <Send className="w-4 h-4" />
                <span>Send Enquiry</span>
              </button>
            )}
          </div>
        </div>

        {/* Bio / About Us */}
        {card.bio && (
          <div className="px-6 py-4 bg-black/5 dark:bg-white/5 border-t border-black/5 dark:border-white/10">
            <h2 className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${template.sectionTitleClass}`}>
              About Us
            </h2>
            <p className="text-sm opacity-90 leading-relaxed whitespace-pre-line">
              {card.bio}
            </p>
          </div>
        )}

        {/* Featured Products & Services (Square Grid OR Slider Carousel) */}
        {card.showServices && items.length > 0 && (
          <div className="px-6 py-5 border-t border-black/5 dark:border-white/10">
            <div className="flex items-center justify-between mb-3.5">
              <h2 className={`text-sm font-black uppercase tracking-wider flex items-center gap-1.5 ${template.sectionTitleClass}`}>
                <Sparkles className="w-4 h-4 text-teal-500" />
                Services & Offerings
              </h2>
              {card.serviceLayout === "SLIDER" && items.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => scrollSlider("left")}
                    aria-label="Previous service"
                    className="p-1 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => scrollSlider("right")}
                    aria-label="Next service"
                    className="p-1 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Render based on serviceLayout ("GRID" vs "SLIDER") */}
            {card.serviceLayout === "GRID" ? (
              /* SQUARE GRID LAYOUT */
              <div className="grid grid-cols-2 gap-3">
                {items.map((item) => {
                  const bookWaText = encodeURIComponent(
                    item.whatsappMessage ||
                      `Hello, I would like to inquire about "${item.name}" from your digital business card.`
                  )
                  const bookWaUrl = `https://wa.me/${cleanWaNumber}?text=${bookWaText}`

                  return (
                    <div
                      key={item.id}
                      className={`group rounded-2xl p-2.5 flex flex-col justify-between transition-all duration-200 border ${template.serviceCardClass}`}
                    >
                      {/* Square Image Thumbnail */}
                      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 mb-2">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center opacity-40">
                            <Sparkles className="w-8 h-8" />
                          </div>
                        )}
                        {/* Price Badge Overlay */}
                        {item.price !== undefined && item.price !== null && (
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-black shadow-md">
                            {item.pricePrefix ? `${item.pricePrefix} ` : ""}
                            {Number(item.price).toFixed(2)} {item.currency}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 mb-2">
                        <h3 className="text-xs font-bold leading-tight line-clamp-1">{item.name}</h3>
                        {item.shortDesc && (
                          <p className="text-[11px] opacity-75 line-clamp-2 leading-snug">{item.shortDesc}</p>
                        )}
                      </div>

                      <div className="flex gap-1.5 pt-1">
                        <a
                          href={bookWaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackEvent("SERVICE_CLICK", { serviceId: item.id, serviceName: item.name })}
                          className="flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1 shadow-xs transition-colors"
                        >
                          <WhatsAppIcon className="w-3 h-3 fill-current" />
                          <span>Book</span>
                        </a>
                        <button
                          onClick={() => {
                            setSelectedService(item.name)
                            setShowLeadModal(true)
                          }}
                          className="py-1.5 px-2 rounded-lg text-[10px] font-semibold bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 transition-colors"
                        >
                          Info
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* HORIZONTAL SLIDER / CAROUSEL LAYOUT */
              <div
                ref={sliderRef}
                className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-none scroll-smooth"
              >
                {items.map((item) => {
                  const bookWaText = encodeURIComponent(
                    item.whatsappMessage ||
                      `Hello, I would like to inquire about "${item.name}" from your digital business card.`
                  )
                  const bookWaUrl = `https://wa.me/${cleanWaNumber}?text=${bookWaText}`

                  return (
                    <div
                      key={item.id}
                      className={`w-64 sm:w-72 shrink-0 snap-start rounded-2xl p-3.5 border transition-all duration-200 flex flex-col justify-between ${template.serviceCardClass}`}
                    >
                      <div>
                        {/* Slide Image */}
                        <div className="relative h-32 w-full rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 mb-3">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center opacity-40">
                              <Sparkles className="w-8 h-8" />
                            </div>
                          )}
                          {item.price !== undefined && item.price !== null && (
                            <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-[11px] font-black shadow-md">
                              {item.pricePrefix ? `${item.pricePrefix} ` : ""}
                              {Number(item.price).toFixed(2)} {item.currency}
                              {item.priceSuffix ? ` ${item.priceSuffix}` : ""}
                            </div>
                          )}
                        </div>

                        <h3 className="text-sm font-bold leading-tight">{item.name}</h3>
                        {item.shortDesc && (
                          <p className="text-xs opacity-75 mt-1 line-clamp-2 leading-relaxed">{item.shortDesc}</p>
                        )}
                      </div>

                      <div className="flex gap-2 pt-3 mt-2 border-t border-black/5 dark:border-white/10">
                        <a
                          href={bookWaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackEvent("SERVICE_CLICK", { serviceId: item.id, serviceName: item.name })}
                          className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5 fill-current" />
                          <span>{item.ctaLabel || "Book via WhatsApp"}</span>
                        </a>
                        <button
                          onClick={() => {
                            setSelectedService(item.name)
                            setShowLeadModal(true)
                          }}
                          className="py-2 px-3 rounded-xl text-xs font-semibold bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 transition-colors"
                        >
                          Enquire
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Gallery Section */}
        {card.showGallery && gallery.length > 0 && (
          <div className="px-6 py-5 border-t border-black/5 dark:border-white/10">
            <h2 className={`text-sm font-black uppercase tracking-wider mb-3 ${template.sectionTitleClass}`}>
              Photo Gallery
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {gallery.map((img) => (
                <div
                  key={img.id}
                  onClick={() => setSelectedImage(img.url)}
                  className="aspect-square rounded-xl overflow-hidden border border-black/10 dark:border-white/10 cursor-pointer hover:opacity-90 transition-opacity bg-black/5 dark:bg-white/5"
                >
                  <img
                    src={img.url}
                    alt={img.caption || "Gallery"}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Links Engine */}
        {card.customLinks && Array.isArray(card.customLinks) && card.customLinks.length > 0 && (
          <div className="px-6 py-5 border-t border-black/5 dark:border-white/10 space-y-2.5">
            <h2 className={`text-xs font-bold uppercase tracking-wider mb-2 ${template.sectionTitleClass}`}>
              Quick Links & Resources
            </h2>
            <div className="space-y-2">
              {card.customLinks.map((link: CustomLinkItem, idx: number) => (
                <a
                  key={link.id || idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent("CUSTOM_LINK_CLICK", { label: link.label, url: link.url })}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 active:scale-[0.99] ${
                    link.highlight
                      ? "bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-200 shadow-sm font-bold"
                      : "bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border-black/10 dark:border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center shrink-0">
                      {renderCustomIcon(link.icon)}
                    </div>
                    <span className="text-xs truncate">{link.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {link.highlight && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500 text-black">
                        FEATURED
                      </span>
                    )}
                    <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Contact Information */}
        <div className="px-6 py-5 border-t border-black/5 dark:border-white/10 space-y-2.5">
          <h2 className={`text-xs font-bold uppercase tracking-wider mb-2 ${template.sectionTitleClass}`}>
            Get In Touch
          </h2>

          {/* Mobile */}
          {card.showPhone && card.mobileNumber && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 transition-colors">
              <a
                href={`tel:${card.mobileNumber}`}
                onClick={() => trackEvent("CALL_CLICK")}
                className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-[10px] opacity-60 font-medium">Mobile</p>
                  <p className="text-xs font-bold truncate">{card.mobileNumber}</p>
                </div>
              </a>
              <button
                onClick={() => copyToClipboard(card.mobileNumber!, "mobile")}
                className="p-1.5 opacity-60 hover:opacity-100"
                title="Copy number"
              >
                {copiedField === "mobile" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* Email */}
          {card.showEmail && card.email && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 transition-colors">
              <a
                href={`mailto:${card.email}`}
                onClick={() => trackEvent("EMAIL_CLICK")}
                className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-[10px] opacity-60 font-medium">Email</p>
                  <p className="text-xs font-bold truncate">{card.email}</p>
                </div>
              </a>
              <button
                onClick={() => copyToClipboard(card.email!, "email")}
                className="p-1.5 opacity-60 hover:opacity-100"
                title="Copy email"
              >
                {copiedField === "email" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* Website */}
          {card.websiteUrl && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 transition-colors">
              <a
                href={card.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("WEBSITE_CLICK")}
                className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80"
              >
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-500 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-[10px] opacity-60 font-medium">Website</p>
                  <p className="text-xs font-bold truncate">{card.websiteUrl.replace(/^https?:\/\//, "")}</p>
                </div>
              </a>
              <a
                href={card.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 opacity-60 hover:opacity-100"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Physical Address */}
          {card.showAddress && fullAddress && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 transition-colors">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] opacity-60 font-medium">Location</p>
                  <p className="text-xs font-semibold leading-snug">{fullAddress}</p>
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(fullAddress, "address")}
                className="p-1.5 opacity-60 hover:opacity-100 self-center"
                title="Copy address"
              >
                {copiedField === "address" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        {/* Executive Corporate Identity Tiles */}
        {(template.id === "curve-emerald" || template.id === "midnight-navy" || template.id === "champagne-gold" || card.companyName) && (
          <div className="px-6 py-4 border-t border-black/5 dark:border-white/10 space-y-2">
            {card.companyName && (
              <div className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                template.id === "curve-emerald" ? "bg-emerald-950 text-white border-emerald-900" :
                template.id === "midnight-navy" ? "bg-slate-900 text-white border-slate-800" :
                template.id === "champagne-gold" ? "bg-[#fbf7f0] text-stone-900 border-[#ebdcc8]" :
                "bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10"
              }`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    template.id === "curve-emerald" ? "bg-emerald-900 text-emerald-300" :
                    template.id === "midnight-navy" ? "bg-slate-800 text-amber-400" :
                    template.id === "champagne-gold" ? "bg-[#efe5d5] text-[#b45309]" :
                    "bg-black/10 dark:bg-white/10 text-inherit"
                  }`}>
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] opacity-60 font-semibold uppercase tracking-wider">Company</p>
                    <p className="text-xs font-bold truncate">{card.companyName}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
              </div>
            )}

            {fullAddress && (
              <div className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                template.id === "curve-emerald" ? "bg-emerald-950 text-white border-emerald-900" :
                template.id === "midnight-navy" ? "bg-slate-900 text-white border-slate-800" :
                template.id === "champagne-gold" ? "bg-[#fbf7f0] text-stone-900 border-[#ebdcc8]" :
                "bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10"
              }`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    template.id === "curve-emerald" ? "bg-emerald-900 text-emerald-300" :
                    template.id === "midnight-navy" ? "bg-slate-800 text-amber-400" :
                    template.id === "champagne-gold" ? "bg-[#efe5d5] text-[#b45309]" :
                    "bg-black/10 dark:bg-white/10 text-inherit"
                  }`}>
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] opacity-60 font-semibold uppercase tracking-wider">Location</p>
                    <p className="text-xs font-bold truncate">{fullAddress}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
              </div>
            )}

            {card.websiteUrl && (
              <a
                href={card.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("WEBSITE_CLICK")}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all hover:opacity-90 ${
                  template.id === "curve-emerald" ? "bg-emerald-950 text-white border-emerald-900" :
                  template.id === "midnight-navy" ? "bg-slate-900 text-white border-slate-800" :
                  template.id === "champagne-gold" ? "bg-[#fbf7f0] text-stone-900 border-[#ebdcc8]" :
                  "bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    template.id === "curve-emerald" ? "bg-emerald-900 text-emerald-300" :
                    template.id === "midnight-navy" ? "bg-slate-800 text-amber-400" :
                    template.id === "champagne-gold" ? "bg-[#efe5d5] text-[#b45309]" :
                    "bg-black/10 dark:bg-white/10 text-inherit"
                  }`}>
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] opacity-60 font-semibold uppercase tracking-wider">Website</p>
                    <p className="text-xs font-bold truncate">{card.websiteUrl.replace(/^https?:\/\//, "")}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
              </a>
            )}
          </div>
        )}

        {/* Commercial Registration Info */}
        {card.isCrPublic && (card.crNumber || card.vatNumber) && (
          <div className="px-6 py-4 bg-black/5 dark:bg-white/5 border-t border-black/5 dark:border-white/10 text-xs">
            <h2 className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${template.sectionTitleClass}`}>
              Commercial Registration
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {card.crNumber && (
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10">
                  <span className="text-[10px] opacity-60 block">CR Number</span>
                  <span className="font-bold">{card.crNumber}</span>
                </div>
              )}
              {card.vatNumber && (
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10">
                  <span className="text-[10px] opacity-60 block">VAT Number</span>
                  <span className="font-bold">{card.vatNumber}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment & Banking */}
        {((card.showPaymentBtn && (card.paymobUrl || card.amwalPayUrl || card.paymentUrl)) || (card.showBankDetails && card.iban)) && (
          <div className="px-6 py-5 border-t border-black/5 dark:border-white/10">
            <h2 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${template.sectionTitleClass}`}>
              <CreditCard className="w-3.5 h-3.5 text-teal-500" />
              <span>Payments & Transfer</span>
            </h2>

            {/* Paymob Direct Pay */}
            {card.showPaymentBtn && card.paymobUrl && (
              <a
                href={card.paymobUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("PAYMENT_CLICK")}
                className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-white shadow-md mb-2.5 transition-all active:scale-[0.98] ${btnRadius} bg-blue-600 hover:bg-blue-700`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay Online via Paymob</span>
              </a>
            )}

            {/* AmwalPay / Direct Pay Link */}
            {card.showPaymentBtn && (card.amwalPayUrl || card.paymentUrl) && (
              <a
                href={card.amwalPayUrl || card.paymentUrl!}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("PAYMENT_CLICK")}
                className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-white shadow-md mb-3 transition-all active:scale-[0.98] ${btnRadius} bg-teal-600 hover:bg-teal-700`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay Online via {card.amwalPayUrl ? "AmwalPay" : "Card"}</span>
              </a>
            )}

            {/* Bank Details */}
            {card.showBankDetails && card.iban && (
              <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs space-y-1.5">
                {card.bankName && (
                  <div className="flex justify-between">
                    <span className="opacity-60">Bank:</span>
                    <span className="font-bold">{card.bankName}</span>
                  </div>
                )}
                {card.accountName && (
                  <div className="flex justify-between">
                    <span className="opacity-60">Account:</span>
                    <span className="font-bold">{card.accountName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-black/10 dark:border-white/10">
                  <div>
                    <span className="text-[10px] opacity-60 block">IBAN</span>
                    <span className="font-mono font-bold tracking-tight">{card.iban}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(card.iban!, "iban")}
                    className="p-1.5 rounded-lg bg-black/10 dark:bg-white/10 hover:bg-black/20"
                    title="Copy IBAN"
                  >
                    {copiedField === "iban" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Social Channels — 5 Popular Social Media Icons */}
        {(() => {
          let raw: any = card.socialLinks
          if (typeof raw === "string") {
            try {
              raw = JSON.parse(raw)
            } catch {
              raw = {}
            }
          }
          const map: Record<string, string> = {}
          if (Array.isArray(raw)) {
            for (const item of raw) {
              if (item && item.platform && item.url) {
                map[String(item.platform).toLowerCase().trim()] = String(item.url).trim()
              }
            }
          } else if (raw && typeof raw === "object") {
            for (const [k, v] of Object.entries(raw)) {
              if (typeof v === "string" && v.length > 0 && isNaN(Number(k))) {
                map[k.toLowerCase().trim()] = v.trim()
              }
            }
          }

          const popular5 = [
            {
              id: "whatsapp",
              label: "WhatsApp",
              url: map.whatsapp || (card.whatsappNumber ? `https://wa.me/${card.whatsappNumber.replace(/[^0-9]/g, "")}` : null),
              color: "#25D366",
              hoverClass: "hover:bg-[#25D366]/15 hover:border-[#25D366] hover:text-[#25D366]",
              icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.53 1.771.815 2.802.815l.006-.001c3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.586-5.768-5.78-5.768zm3.366 8.163c-.14.394-.716.729-1.026.776-.289.044-.664.077-1.921-.444-1.609-.666-2.645-2.296-2.726-2.404-.08-.108-.65-.865-.65-1.651 0-.786.41-1.173.557-1.333.14-.152.308-.19.41-.19.103 0 .205.001.294.006.095.004.222-.036.347.265.129.309.439 1.07.478 1.149.039.079.065.171.013.275-.052.104-.078.168-.155.258-.077.09-.163.201-.233.27-.078.077-.159.16-.068.316.091.156.404.667.868 1.079.597.532 1.099.697 1.255.775.156.078.247.065.339-.039.091-.104.39-.454.494-.609.104-.156.208-.13.348-.078.14.052.889.419 1.042.496.153.077.255.116.293.181.038.064.038.374-.102.768z" />
                </svg>
              ),
            },
            {
              id: "instagram",
              label: "Instagram",
              url: map.instagram || null,
              color: "#E1306C",
              hoverClass: "hover:bg-[#E1306C]/15 hover:border-[#E1306C] hover:text-[#E1306C]",
              icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              ),
            },
            {
              id: "linkedin",
              label: "LinkedIn",
              url: map.linkedin || null,
              color: "#0A66C2",
              hoverClass: "hover:bg-[#0A66C2]/15 hover:border-[#0A66C2] hover:text-[#0A66C2]",
              icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.65 1.65 0 1 0 0 3.3 1.65 1.65 0 0 0 0-3.3z" />
                </svg>
              ),
            },
            {
              id: "twitter",
              label: "X",
              url: map.twitter || map.x || null,
              color: "#000000",
              hoverClass: "hover:bg-black/15 hover:border-black/50 hover:text-black dark:hover:text-white",
              icon: (
                <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              ),
            },
            {
              id: "facebook",
              label: "Facebook",
              url: map.facebook || (map.youtube ? map.youtube : null),
              color: "#1877F2",
              hoverClass: "hover:bg-[#1877F2]/15 hover:border-[#1877F2] hover:text-[#1877F2]",
              icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              ),
            },
          ]

          const activeSocials = popular5.filter((item) => !!item.url)
          if (activeSocials.length === 0) return null

          return (
            <div className="px-6 py-5 border-t border-black/5 dark:border-white/10 text-center">
              <h2 className={`text-xs font-bold uppercase tracking-wider mb-4 ${template.sectionTitleClass}`}>
                Connect With Us
              </h2>
              <div className="flex items-center justify-center gap-3">
                {activeSocials.map((item) => (
                  <a
                    key={item.id}
                    href={item.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent("SOCIAL_CLICK", { platform: item.id })}
                    className={`w-11 h-11 rounded-full flex items-center justify-center border border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/5 transition-all duration-200 transform hover:scale-110 shadow-xs ${item.hoverClass}`}
                    title={item.label}
                    aria-label={item.label}
                  >
                    {item.icon}
                  </a>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Footer */}
        <div className={`px-6 py-4 text-center text-xs ${template.footerClass}`}>
          <p>
            Powered by{" "}
            <a
              href="https://fizmoh.cloud"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline hover:opacity-100"
            >
              Fizmoh Cloud
            </a>
          </p>
        </div>
      </div>

      {/* QR Code Dialog Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xs w-full p-6 text-center space-y-4 shadow-2xl relative text-slate-900">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Scan & Connect</h3>
              <p className="text-xs text-slate-500 mt-0.5">Scan to view and save contact on another device</p>
            </div>
            <div className="p-3 bg-white rounded-2xl border-2 border-slate-100 shadow-inner flex items-center justify-center">
              <img
                src={`/api/vcard/${card.slug}/qr?format=png&size=500`}
                alt="vCard QR"
                className="w-48 h-48 object-contain"
              />
            </div>
            <div className="flex gap-2">
              <a
                href={`/api/vcard/${card.slug}/qr?format=png&size=1000`}
                download={`${card.slug}-qr.png`}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800"
              >
                Save QR
              </a>
              <button
                onClick={() => {
                  copyToClipboard(cardUrl, "url")
                }}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-800 hover:bg-slate-200"
              >
                {copiedField === "url" ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Gallery */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-xs cursor-zoom-out"
        >
          <img
            src={selectedImage}
            alt="Expanded view"
            className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}

      {/* Direct Contact / Enquiry Modal */}
      {showLeadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-slate-900">
            <button
              onClick={() => setShowLeadModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Get In Touch</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Send an enquiry directly to {card.title}
              </p>
            </div>

            {leadSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center space-y-2">
                <Check className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold">Thank you! Your enquiry has been sent.</p>
                <p className="text-[11px] text-emerald-700">We will respond as soon as possible.</p>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-3 text-left">
                {leadError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{leadError}</span>
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    placeholder="e.g. Salim Al-Habsi"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Phone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    placeholder="+968 9123 4567"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email Address (optional)</label>
                  <input
                    type="email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    placeholder="salim@example.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Your Message</label>
                  <textarea
                    rows={3}
                    value={leadMessage}
                    onChange={(e) => setLeadMessage(e.target.value)}
                    placeholder="What would you like to know or book?"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>
                <button
                  type="submit"
                  disabled={leadSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md disabled:opacity-50 transition-colors"
                >
                  {leadSubmitting ? "Sending..." : "Submit Enquiry"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
