"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { type BuilderElement, type WebsiteData, type WebsitePage } from "@/lib/website-builder-types"
import {
  ShoppingCart, Star, Phone, Mail, MapPin, Check, Plus, Minus,
  ChevronDown, ChevronRight, ChevronLeft, X, ArrowRight, Clock, Shield,
  Award, Sparkles, MessageSquare, Send, Zap, Users, CheckCircle2,
  ExternalLink, Heart, Share2, AlertCircle, Play, Search,
  Timer, Menu, Quote, RefreshCw, CreditCard, Lock
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { toast } from "sonner"

interface PublishedSiteRendererProps {
  elements?: BuilderElement[]
  websiteData?: WebsiteData
  products?: Array<{
    id: string
    name: string
    basePrice?: number
    price?: number
    currency?: string
    description?: string
    imageUrl?: string
    category?: string
  }>
  brand?: {
    name?: string | null
    slug?: string | null
    logoUrl?: string | null
    phone?: string | null
    email?: string | null
    address?: string | null
    primaryColor?: string | null
    accentColor?: string | null
    currency?: string | null
  }
  initialPageSlug?: string
  onSwitchToCatalog?: () => void
}

interface CartItem {
  id: string
  name: string
  price: number
  currency: string
  quantity: number
  imageUrl?: string
}

function getResponsiveGrid(
  desktop?: any,
  tablet?: any,
  mobile?: any,
  fallbackCols?: any
) {
  // Mobile: 1 or 2
  const m = String(mobile || "1")
  const mCls = m === "2" ? "grid-cols-2" : "grid-cols-1"

  // Tablet (sm): 1, 2, 3, 4
  const t = String(tablet || (fallbackCols === "2" ? "2" : "2"))
  const tCls =
    t === "1"
      ? "sm:grid-cols-1"
      : t === "3"
      ? "sm:grid-cols-3"
      : t === "4"
      ? "sm:grid-cols-4"
      : "sm:grid-cols-2"

  // Desktop (lg): 1..6
  const d = String(desktop || fallbackCols || "3")
  const dCls =
    d === "1"
      ? "lg:grid-cols-1"
      : d === "2"
      ? "lg:grid-cols-2"
      : d === "4"
      ? "lg:grid-cols-4"
      : d === "5"
      ? "lg:grid-cols-5"
      : d === "6"
      ? "lg:grid-cols-6"
      : "lg:grid-cols-3"

  return `${mCls} ${tCls} ${dCls}`
}

/**
 * Real-time ticking countdown hook for flash sales and limited-time banners
 */
function useCountdown(targetDateStr?: string) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    isExpired: boolean
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  })

  useEffect(() => {
    let target = targetDateStr ? new Date(targetDateStr).getTime() : 0
    if (isNaN(target) || target <= Date.now()) {
      // Default to 48 hours + 12 mins from now
      target = Date.now() + 48 * 3600 * 1000 + 12 * 60 * 1000
    }

    const calc = () => {
      const now = Date.now()
      const diff = Math.max(0, target - now)
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true })
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
        const minutes = Math.floor((diff / (1000 * 60)) % 60)
        const seconds = Math.floor((diff / 1000) % 60)
        setTimeLeft({ days, hours, minutes, seconds, isExpired: false })
      }
    }

    calc()
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
  }, [targetDateStr])

  return timeLeft
}

export function PublishedSiteRenderer({
  elements: initialElements,
  websiteData,
  products = [],
  brand = {},
  initialPageSlug,
  onSwitchToCatalog,
}: PublishedSiteRendererProps) {
  // ── Multi-page normalization ──────────────────────────────────────────────
  const pages = useMemo<WebsitePage[]>(() => {
    if (websiteData?.pages && websiteData.pages.length > 0) {
      return websiteData.pages
    }
    if (initialElements && initialElements.length > 0) {
      return [{ id: "home", title: "Home", slug: "home", elements: initialElements }]
    }
    return [{ id: "home", title: "Home", slug: "home", elements: [] }]
  }, [websiteData, initialElements])

  const [activePageSlug, setActivePageSlug] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search)
      const qPage = sp.get("page")
      if (qPage && pages.some((p) => p.slug === qPage.toLowerCase())) {
        return qPage.toLowerCase()
      }
    }
    return initialPageSlug || websiteData?.activePageSlug || pages[0]?.slug || "home"
  })

  // Navigate between subpages
  const navigateToPage = (slug: string) => {
    const cleanSlug = slug.toLowerCase()
    setActivePageSlug(cleanSlug)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      if (cleanSlug === "home") {
        url.searchParams.delete("page")
      } else {
        url.searchParams.set("page", cleanSlug)
      }
      window.history.pushState({}, "", url.toString())
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const currentPage = useMemo(() => {
    return pages.find((p) => p.slug === activePageSlug) || pages[0]
  }, [pages, activePageSlug])

  const elementsToRender = currentPage?.elements || []

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Interactive element states
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({})
  const [activeTabs, setActiveTabs] = useState<Record<string, number>>({})
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [carouselIndices, setCarouselIndices] = useState<Record<string, number>>({})
  const [testimonialIndices, setTestimonialIndices] = useState<Record<string, number>>({})
  const [faqSearchQueries, setFaqSearchQueries] = useState<Record<string, string>>({})
  const [customFormData, setCustomFormData] = useState<Record<string, Record<string, string>>>({})
  const [customFormSubmitting, setCustomFormSubmitting] = useState<Record<string, boolean>>({})

  // Checkout inputs
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"WHATSAPP" | "CARD_ONLINE">("WHATSAPP")

  // Cart total calculations
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart])
  const cartSubtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart])
  const activeCurrency = brand.currency || "OMR"

  const addToCart = (product: { id: string; name: string; price: number; currency?: string; imageUrl?: string }) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          currency: product.currency || activeCurrency,
          quantity: 1,
          imageUrl: product.imageUrl,
        },
      ]
    })
    toast.success(`Added ${product.name} to cart!`)
    setCartOpen(true)
  }

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.quantity + delta
            return nextQty > 0 ? { ...item, quantity: nextQty } : null
          }
          return item
        })
        .filter(Boolean) as CartItem[]
    )
  }

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName || !customerPhone) {
      toast.error("Please enter your name and phone number")
      return
    }

    setFormSubmitting(true)

    // Online Card Checkout via AmwalPay / Oman Net
    if (paymentMethod === "CARD_ONLINE") {
      try {
        const res = await fetch("/api/website-builder/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantSlug: brand.slug,
            customerName,
            customerPhone,
            customerEmail,
            deliveryAddress,
            items: cart,
            totalAmount: cartSubtotal,
            currency: activeCurrency,
            paymentMethod: "CARD_ONLINE",
          }),
        })

        const data = await res.json()
        if (data.ok && data.checkoutUrl) {
          toast.success("Redirecting to secure card checkout...")
          window.location.href = data.checkoutUrl
          return
        } else {
          toast.error(data.error || "Card checkout unavailable. Continuing via WhatsApp...")
        }
      } catch {
        toast.error("Could not initiate card payment. Switching to WhatsApp...")
      }
    }

    // Direct WhatsApp Concierge Checkout
    const phone = (brand.phone || "96890000000").replace(/[^0-9]/g, "")
    const orderItems = cart.map((i) => `• ${i.name} x${i.quantity} = ${i.currency} ${(i.price * i.quantity).toFixed(2)}`).join("\n")
    const msg = `🛍️ *NEW WEBSITE ORDER*\n\n*Customer Details:*\nName: ${customerName}\nPhone: ${customerPhone}${customerEmail ? `\nEmail: ${customerEmail}` : ""}\nAddress / Notes: ${deliveryAddress || "Not specified"}\n\n*Items Ordered:*\n${orderItems}\n\n*Total Amount:* ${activeCurrency} ${cartSubtotal.toFixed(2)}\n\n*Payment Preference:* ${paymentMethod === "CARD_ONLINE" ? "Online Card Payment" : "WhatsApp Concierge Checkout"}\n\n_Sent directly from ${brand.name || "our website"}_`

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
    window.open(waUrl, "_blank")
    setCart([])
    setCheckoutOpen(false)
    setCartOpen(false)
    setFormSubmitting(false)
    toast.success("Order dispatched to WhatsApp!")
  }

  const openWhatsAppInquiry = (customMsg?: string) => {
    const phone = (brand.phone || "96890000000").replace(/[^0-9]/g, "")
    const msg = customMsg || `Hello! I would like to inquire about your services and book via your official website (${brand.name || "Official Store"}).`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank")
  }

  // ── Render Individual Element ─────────────────────────────────────────────
  const renderElement = (el: BuilderElement): React.ReactNode => {
    const p = el.props || {}

    switch (el.type) {
      // ─── Text Elements ───────────────────────────────────────
      case "heading": {
        const align = p.align === "center" ? "text-center" : p.align === "right" ? "text-right" : "text-left"
        return (
          <div className="py-2">
            <h1
              className={`font-black text-3xl sm:text-4xl md:text-5xl tracking-tight text-stone-900 ${align}`}
              style={{ color: p.color ? String(p.color) : undefined }}
            >
              {String(p.text || "Heading")}
            </h1>
          </div>
        )
      }
      case "subheading": {
        const align = p.align === "center" ? "text-center" : p.align === "right" ? "text-right" : "text-left"
        return (
          <div className="py-1">
            <h2
              className={`font-bold text-xl sm:text-2xl text-stone-700 ${align}`}
              style={{ color: p.color ? String(p.color) : undefined }}
            >
              {String(p.text || "Subheading")}
            </h2>
          </div>
        )
      }
      case "paragraph": {
        const align = p.align === "center" ? "text-center" : p.align === "right" ? "text-right" : "text-left"
        return (
          <div className="py-2">
            <p className={`text-base text-stone-600 leading-relaxed ${align}`}>
              {String(p.text || "Enter your descriptive paragraph text here.")}
            </p>
          </div>
        )
      }
      case "quote":
        return (
          <blockquote className="my-4 border-l-4 border-emerald-600 pl-4 py-2 italic text-stone-700 bg-stone-50 rounded-r-lg">
            <p className="text-lg">"{String(p.text || "Inspiring quote text")}"</p>
            {p.author && <cite className="block text-xs font-semibold text-stone-500 mt-2 not-italic">— {String(p.author)}</cite>}
          </blockquote>
        )
      case "badge-text":
        return (
          <div className="py-1">
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-xs"
              style={{
                backgroundColor: String(p.bgColor || "#ECFDF5"),
                color: String(p.textColor || "#065F46"),
              }}
            >
              {String(p.text || "New Feature")}
            </span>
          </div>
        )

      // ─── Media Elements ──────────────────────────────────────
      case "image":
        return (
          <div className="my-4 rounded-2xl overflow-hidden shadow-md max-w-full">
            <img
              src={String(p.src || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80")}
              alt={String(p.alt || "Website image")}
              className="w-full h-auto object-cover max-h-[500px]"
            />
            {p.caption && <p className="text-center text-xs text-stone-500 mt-2">{String(p.caption)}</p>}
          </div>
        )
      case "video-embed":
        return (
          <div className="my-4 aspect-video rounded-2xl overflow-hidden bg-black shadow-lg">
            <iframe
              src={String(p.url || "https://www.youtube.com/embed/dQw4w9WgXcQ")}
              title="Video"
              className="w-full h-full border-0"
              allowFullScreen
            />
          </div>
        )

      // ─── NEW HIGH-CONVERTING BLOCK: VIDEO HERO ─────────────────────────
      case "video-hero": {
        const videoUrl = String(p.videoUrl || "https://www.youtube.com/embed/dQw4w9WgXcQ")
        const isMp4 = p.videoType === "mp4" || videoUrl.endsWith(".mp4")
        const opacity = Math.min(95, Math.max(20, parseInt(String(p.overlayOpacity || "60")))) / 100
        const minH = parseInt(String(p.minHeight || "540"))

        return (
          <div
            className="my-6 rounded-3xl relative overflow-hidden flex flex-col justify-center shadow-2xl text-center md:text-left"
            style={{ minHeight: `${minH}px` }}
          >
            {/* Background Video */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
              {isMp4 ? (
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster={p.posterUrl ? String(p.posterUrl) : undefined}
                  className="w-full h-full object-cover scale-105"
                >
                  <source src={videoUrl} type="video/mp4" />
                </video>
              ) : (
                <iframe
                  src={`${videoUrl}${videoUrl.includes("?") ? "&" : "?"}autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0`}
                  title="Hero video background"
                  className="w-[120%] h-[120%] -top-[10%] -left-[10%] absolute object-cover border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              )}
            </div>

            {/* Dark Gradient Overlay */}
            <div
              className="absolute inset-0 bg-stone-950 transition"
              style={{ opacity }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/40 to-transparent" />

            {/* Content Container */}
            <div className="relative z-10 max-w-3xl p-8 sm:p-14 space-y-5 text-white">
              {p.badge && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>{String(p.badge)}</span>
                </div>
              )}

              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tight text-white drop-shadow-md">
                {String(p.heading || "Discover the Hidden Wonders of Oman")}
              </h1>

              <p className="text-stone-200 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl drop-shadow-xs">
                {String(p.subtext || "Private desert camps, pristine coastal waters, and majestic mountain canyons tailored to your dream getaway.")}
              </p>

              <div className="pt-2 flex flex-wrap gap-3 justify-center md:justify-start">
                <button
                  onClick={() => openWhatsAppInquiry(`Hello! I'm interested in booking via your video hero: ${String(p.heading || "Package")}`)}
                  className="px-7 py-4 rounded-2xl bg-[#00E785] hover:bg-[#00B96A] text-stone-950 font-black text-sm shadow-xl transition flex items-center gap-2.5 cursor-pointer transform hover:scale-[1.02]"
                >
                  <WhatsAppIcon className="h-5 w-5 fill-stone-950" />
                  <span>{String(p.primaryBtnText || "Book on WhatsApp")}</span>
                </button>
                <button
                  onClick={() => {
                    const catalogEl = document.getElementById("website-catalog-section")
                    if (catalogEl) catalogEl.scrollIntoView({ behavior: "smooth" })
                    else setCartOpen(true)
                  }}
                  className="px-7 py-4 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm backdrop-blur-md transition border border-white/25 cursor-pointer flex items-center gap-2"
                >
                  <span>{String(p.secondaryBtnText || "View Packages")}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )
      }

      // ─── NEW HIGH-CONVERTING BLOCK: COUNTDOWN FLASH SALE ────────────────
      case "countdown-sale":
      case "countdown-timer": {
        const timer = useCountdown(p.endDate ? String(p.endDate) : undefined)
        const discountBadge = String(p.discountBadge || p.discount || "FLASH SALE — SAVE 30%")
        const bg = String(p.bgColor || "#0d1520")
        const accent = String(p.accentColor || "#10B981")

        return (
          <div
            className="my-8 rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden border border-white/10"
            style={{ backgroundColor: bg, color: "#ffffff" }}
          >
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
              {/* Left copy */}
              <div className="space-y-3 text-center lg:text-left max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-black tracking-wide uppercase">
                  <Zap className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                  <span>{discountBadge}</span>
                </div>
                <h3 className="text-2xl sm:text-4xl font-black tracking-tight">
                  {String(p.heading || "🔥 Limited Time Exclusive Offer")}
                </h3>
                <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
                  {String(p.subtext || "Lock in your dates before this promotional pricing expires. Instant WhatsApp confirmation with full refund flexibility.")}
                </p>
              </div>

              {/* Countdown Ticker Cards */}
              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-2.5 sm:gap-4">
                  {[
                    { label: "Days", val: timer.days },
                    { label: "Hours", val: timer.hours },
                    { label: "Minutes", val: timer.minutes },
                    { label: "Seconds", val: timer.seconds },
                  ].map((unit, i) => (
                    <div
                      key={i}
                      className="w-16 sm:w-20 h-20 sm:h-22 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex flex-col items-center justify-center shadow-lg transition-transform hover:scale-105"
                    >
                      <span className="font-mono font-black text-2xl sm:text-3xl text-amber-300 tracking-tight">
                        {String(unit.val).padStart(2, "0")}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-400 mt-0.5">
                        {unit.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Primary CTA */}
                <button
                  onClick={() => openWhatsAppInquiry(`Hello! I want to claim the ${discountBadge} discount before the countdown timer expires.`)}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-sm text-stone-950 transition flex items-center justify-center gap-2 shadow-lg cursor-pointer transform hover:scale-[1.02]"
                  style={{ backgroundColor: accent }}
                >
                  <WhatsAppIcon className="h-4 w-4 fill-stone-950" />
                  <span>{String(p.primaryCta || p.buttonText || "Claim Deal on WhatsApp")}</span>
                </button>
              </div>
            </div>
          </div>
        )
      }

      // ─── NEW HIGH-CONVERTING BLOCK: TESTIMONIALS SLIDER ──────────────────
      case "testimonials-slider": {
        const rawReviews = String(
          p.reviews ||
            "Ahmed Al-Harthy|Muscat, Oman|5|The desert safari and private mountain camp was unforgettable! Seamless booking via WhatsApp and incredible local guide.|https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&q=80///Sarah Jenkins|Dubai, UAE|5|Fast response, transparent pricing, and wonderful hospitality in Salalah. 10/10 experience!|https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&q=80///Rashid Al-Balushi|Salalah, Oman|5|Best corporate retreat we've organized in years. The team handled every detail flawlessly.|https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&q=80///Emily Watson|London, UK|5|Exceptional private tour to Wahiba Sands and Wadi Shab. Our guide Ali was so knowledgeable and kind!|https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&q=80"
        )
        const reviewList = rawReviews
          .split("///")
          .map((item) => {
            const parts = item.split("|")
            return {
              name: parts[0]?.trim() || "Verified Guest",
              role: parts[1]?.trim() || "Muscat, Oman",
              rating: parseInt(parts[2]?.trim() || "5"),
              text: parts[3]?.trim() || "Outstanding service and experience!",
              avatar: parts[4]?.trim() || "",
            }
          })
          .filter((r) => r.text)

        const currentIndex = testimonialIndices[el.id] || 0
        const isGrid = p.layout === "grid"

        const nextSlide = () => {
          setTestimonialIndices((prev) => ({
            ...prev,
            [el.id]: (currentIndex + 1) % reviewList.length,
          }))
        }
        const prevSlide = () => {
          setTestimonialIndices((prev) => ({
            ...prev,
            [el.id]: (currentIndex - 1 + reviewList.length) % reviewList.length,
          }))
        }

        return (
          <div className="my-10 space-y-6">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>Verified Reviews (4.9 / 5.0)</span>
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-stone-900">
                {String(p.heading || "What Our Happy Clients Say")}
              </h3>
              <p className="text-stone-500 text-xs sm:text-sm">
                {String(p.subtext || "Real reviews from over 10,000+ satisfied guests and corporate groups.")}
              </p>
            </div>

            {isGrid ? (
              // Multi-column Grid Layout
              <div className={`grid gap-5 ${getResponsiveGrid(p.colsDesktop || "3", p.colsTablet || "2", p.colsMobile || "1", "3")}`}>
                {reviewList.map((rev, idx) => (
                  <div
                    key={idx}
                    className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1 mb-3">
                        {[...Array(5)].map((_, s) => (
                          <Star
                            key={s}
                            className={`h-4 w-4 ${s < rev.rating ? "fill-amber-400 text-amber-400" : "fill-stone-200 text-stone-200"}`}
                          />
                        ))}
                      </div>
                      <p className="text-stone-700 text-sm italic leading-relaxed">
                        "{rev.text}"
                      </p>
                    </div>
                    <div className="mt-5 flex items-center gap-3 pt-4 border-t border-stone-100">
                      {rev.avatar ? (
                        <img src={rev.avatar} alt={rev.name} className="w-10 h-10 rounded-full object-cover shadow-2xs" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                          {rev.name[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-stone-900 text-xs">{rev.name}</p>
                        <p className="text-[10px] text-stone-400">{rev.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Interactive Slider Layout
              <div className="relative max-w-3xl mx-auto">
                <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-stone-50 to-white border border-stone-200 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, s) => (
                        <Star
                          key={s}
                          className={`h-5 w-5 ${s < reviewList[currentIndex]?.rating ? "fill-amber-400 text-amber-400" : "fill-stone-200 text-stone-200"}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Verified Client
                    </span>
                  </div>

                  <p className="text-stone-800 text-base sm:text-lg italic leading-relaxed min-h-[90px]">
                    "{reviewList[currentIndex]?.text}"
                  </p>

                  <div className="mt-6 flex items-center justify-between pt-5 border-t border-stone-200">
                    <div className="flex items-center gap-3">
                      {reviewList[currentIndex]?.avatar ? (
                        <img
                          src={reviewList[currentIndex]?.avatar}
                          alt={reviewList[currentIndex]?.name}
                          className="w-12 h-12 rounded-full object-cover shadow-xs"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                          {reviewList[currentIndex]?.name[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-stone-900 text-sm">{reviewList[currentIndex]?.name}</p>
                        <p className="text-xs text-stone-400">{reviewList[currentIndex]?.role}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={prevSlide}
                        className="p-2.5 rounded-full bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 shadow-xs cursor-pointer transition"
                        title="Previous Review"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={nextSlide}
                        className="p-2.5 rounded-full bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 shadow-xs cursor-pointer transition"
                        title="Next Review"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dots indicator */}
                <div className="flex justify-center gap-2 mt-4">
                  {reviewList.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setTestimonialIndices((prev) => ({ ...prev, [el.id]: i }))}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        i === currentIndex ? "w-6 bg-emerald-600" : "w-2 bg-stone-300 hover:bg-stone-400"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      }

      // ─── NEW HIGH-CONVERTING BLOCK: FAQ ACCORDION WITH SEARCH ────────────
      case "faq-accordion":
      case "faq-item": {
        const rawFaq = String(
          p.items ||
            (p.question && p.answer
              ? `${p.question}:::${p.answer}`
              : "How do I book and pay?:::You can pay securely online via credit/debit card, bank transfer, or confirm instantly on WhatsApp and pay on arrival.///What is your cancellation policy?:::Free cancellation up to 48 hours before your scheduled tour with a 100% full money-back guarantee.///Are hotel transfers included?:::Yes! Complimentary pickup and drop-off from any hotel or residence in Muscat/Salalah is included for all private tours.///Do you accommodate dietary requirements?:::Absolutely. We provide vegetarian, vegan, and halal options for all meals during camping and full-day tours. Please let us know when booking.///What should I wear on a desert safari?:::Lightweight, comfortable clothing, sunscreen, sunglasses, and a warm jacket for evening desert campfire dinners.")
        )

        const faqItems = rawFaq
          .split("///")
          .map((item) => {
            const [q, a] = item.split(":::")
            return { question: q?.trim(), answer: a?.trim() }
          })
          .filter((item) => item.question && item.answer)

        const qSearch = (faqSearchQueries[el.id] || "").toLowerCase()
        const filteredFaq = faqItems.filter(
          (f) => f.question.toLowerCase().includes(qSearch) || f.answer.toLowerCase().includes(qSearch)
        )

        const toggleAll = (expand: boolean) => {
          const updated: Record<string, boolean> = { ...openAccordions }
          faqItems.forEach((_, idx) => {
            updated[`${el.id}-${idx}`] = expand
          })
          setOpenAccordions(updated)
        }

        return (
          <div className="my-10 space-y-5 max-w-3xl mx-auto">
            {/* SEO Structured Data for Google FAQ Rich Snippets */}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: faqItems.map((f) => ({
                    "@type": "Question",
                    name: f.question,
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: f.answer,
                    },
                  })),
                }),
              }}
            />

            <div className="text-center space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold">
                FAQ & Knowledge Base
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-stone-900">
                {String(p.heading || "Frequently Asked Questions")}
              </h3>
              <p className="text-stone-500 text-xs sm:text-sm">
                {String(p.subtext || "Everything you need to know about our tours, bookings, and policies.")}
              </p>
            </div>

            {/* Interactive Search Bar */}
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  placeholder={String(p.searchPlaceholder || "Search questions (e.g. payment, refund, clothes)...")}
                  value={faqSearchQueries[el.id] || ""}
                  onChange={(e) =>
                    setFaqSearchQueries((prev) => ({ ...prev, [el.id]: e.target.value }))
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                onClick={() => toggleAll(true)}
                className="px-3 py-2.5 text-[11px] font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition cursor-pointer whitespace-nowrap"
              >
                Expand All
              </button>
              <button
                onClick={() => toggleAll(false)}
                className="px-3 py-2.5 text-[11px] font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition cursor-pointer whitespace-nowrap"
              >
                Collapse
              </button>
            </div>

            {/* Accordion list */}
            <div className="space-y-3">
              {filteredFaq.length > 0 ? (
                filteredFaq.map((item, idx) => {
                  const key = `${el.id}-${idx}`
                  const isOpen = !!openAccordions[key]
                  return (
                    <div
                      key={idx}
                      className="border border-stone-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs transition"
                    >
                      <button
                        onClick={() =>
                          setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }))
                        }
                        className="w-full p-4 sm:p-5 text-left font-bold text-sm text-stone-900 flex items-center justify-between hover:bg-stone-50/80 cursor-pointer gap-4"
                      >
                        <span className="leading-snug">{item.question}</span>
                        <ChevronDown
                          className={`h-4 w-4 text-stone-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-emerald-600" : ""}`}
                        />
                      </button>
                      {isOpen && (
                        <div className="p-4 sm:p-5 pt-0 text-xs sm:text-sm text-stone-600 leading-relaxed border-t border-stone-100 bg-stone-50/40 animate-in fade-in duration-150">
                          {item.answer}
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200 text-stone-400 text-xs">
                  No matching questions found for "{qSearch}". Try a different keyword or chat with us directly below.
                </div>
              )}
            </div>

            {/* Direct WhatsApp Concierge CTA */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <WhatsAppIcon className="h-4 w-4 fill-white" />
                </div>
                <div>
                  <p className="font-bold text-emerald-950 text-xs sm:text-sm">Still have a question?</p>
                  <p className="text-[11px] text-emerald-700">Our local guides reply on WhatsApp in under 3 minutes.</p>
                </div>
              </div>
              <button
                onClick={() => openWhatsAppInquiry("Hello! I have a question not listed in the FAQ:")}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer whitespace-nowrap"
              >
                Chat on WhatsApp →
              </button>
            </div>
          </div>
        )
      }

      // ─── Buttons & CTA ───────────────────────────────────────
      case "button":
      case "button-outline": {
        const isOutline = el.type === "button-outline"
        return (
          <div className="py-2">
            <button
              onClick={() => {
                if (p.href?.toString().startsWith("http")) window.open(String(p.href), "_blank")
                else if (p.href === "#cart") setCartOpen(true)
                else if (p.href === "#checkout") setCheckoutOpen(true)
                else openWhatsAppInquiry()
              }}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-sm cursor-pointer ${
                isOutline
                  ? "border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
              }`}
            >
              {String(p.text || "Click Here")}
            </button>
          </div>
        )
      }
      case "whatsapp-cta":
        return (
          <div className="my-4">
            <button
              onClick={() => openWhatsAppInquiry(p.message ? String(p.message) : undefined)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold rounded-2xl shadow-lg shadow-emerald-900/10 transition-all cursor-pointer"
            >
              <WhatsAppIcon className="h-5 w-5 fill-white" />
              <span>{String(p.text || "Chat with us on WhatsApp")}</span>
            </button>
          </div>
        )
      case "cta-banner":
        return (
          <div className="my-8 rounded-3xl p-8 bg-gradient-to-r from-emerald-600 to-teal-800 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <h3 className="text-2xl sm:text-3xl font-black">{String(p.heading || "Ready to experience the best?")}</h3>
              <p className="text-emerald-100 text-sm">{String(p.subtext || "Join thousands of satisfied guests today.")}</p>
            </div>
            <button
              onClick={() => openWhatsAppInquiry()}
              className="px-6 py-3 bg-white text-emerald-950 font-black rounded-xl hover:bg-stone-100 transition shadow-md shrink-0 cursor-pointer"
            >
              {String(p.buttonText || "Get Started Now")}
            </button>
          </div>
        )

      // ─── Commerce Elements ───────────────────────────────────
      case "product-card": {
        const itemPrice = parseFloat(String(p.price || "99.00"))
        const itemCurrency = String(p.currency || activeCurrency)
        const itemName = String(p.name || "Premium Package")
        const itemImage = String(p.image || "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=600&q=80")
        const itemDesc = String(p.description || "Comprehensive signature experience with full amenities and guidance.")

        return (
          <div className="my-4 rounded-3xl border border-stone-200 bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col md:flex-row">
            <div className="md:w-1/2 aspect-4/3 md:aspect-auto relative overflow-hidden bg-stone-100">
              <img src={itemImage} alt={itemName} className="w-full h-full object-cover" />
              {p.highlight && (
                <span className="absolute top-3 right-3 bg-rose-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                  Popular
                </span>
              )}
            </div>
            <div className="p-6 md:w-1/2 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">{itemName}</h3>
                <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">{itemDesc}</p>
              </div>
              <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-400 font-bold uppercase block">Price</span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-800">
                    {itemCurrency} {itemPrice.toFixed(2)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => addToCart({ id: el.id, name: itemName, price: itemPrice, currency: itemCurrency, imageUrl: itemImage })}
                    className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    <span>Add to Cart</span>
                  </button>
                  <button
                    onClick={() => openWhatsAppInquiry(`Hi! I want to book: ${itemName} (${itemCurrency} ${itemPrice})`)}
                    className="p-2.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white transition shadow-xs cursor-pointer"
                    title="Book on WhatsApp"
                  >
                    <WhatsAppIcon className="h-4 w-4 fill-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      case "product-grid": {
        const gridItems = products.length > 0 ? products : [
          { id: "1", name: "Wahiba Desert Safari & Luxury Camp", price: 120, currency: activeCurrency, imageUrl: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=600&q=80", description: "Dune bashing, camel trekking, and stargazing dinner under desert skies." },
          { id: "2", name: "Wadi Shab & Bimmah Sinkhole Tour", price: 85, currency: activeCurrency, imageUrl: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=600&q=80", description: "Hike through emerald green waters and hidden waterfall caves." },
          { id: "3", name: "Daymaniyat Islands Snorkeling Cruise", price: 65, currency: activeCurrency, imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80", description: "Swim with turtles and explore coral reefs on a private boat." },
        ]

        return (
          <div id="website-catalog-section" className="my-8 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-2xl text-stone-900">Featured Offerings</h3>
                <p className="text-xs text-stone-500">Handcrafted experiences ready for instant booking</p>
              </div>
            </div>
            <div className={`grid gap-4 ${getResponsiveGrid(p.colsDesktop || p.columns || "3", p.colsTablet || "2", p.colsMobile || "1", "3")}`}>
              {gridItems.map((prod) => (
                <div key={prod.id} className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-xs hover:shadow-lg transition flex flex-col justify-between">
                  <div className="aspect-16/10 relative overflow-hidden bg-stone-100">
                    <img src={prod.imageUrl || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80"} alt={prod.name} className="w-full h-full object-cover hover:scale-105 transition duration-500" />
                  </div>
                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-stone-900 text-sm line-clamp-1">{prod.name}</h4>
                      {prod.description && <p className="text-[11px] text-stone-500 line-clamp-2 mt-1">{prod.description}</p>}
                    </div>
                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                      <div className="font-black text-emerald-800 text-base">
                        {prod.currency || activeCurrency} {(prod.price || prod.basePrice || 0).toFixed(2)}
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => addToCart({ id: prod.id, name: prod.name, price: prod.price || prod.basePrice || 0, currency: prod.currency || activeCurrency, imageUrl: prod.imageUrl })}
                          className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                        >
                          <ShoppingCart className="h-3 w-3" />
                          <span>Add</span>
                        </button>
                        <button
                          onClick={() => openWhatsAppInquiry(`Hi! I'd like to book ${prod.name}`)}
                          className="p-1.5 rounded-lg bg-[#25D366] hover:bg-[#1EBE5D] text-white transition cursor-pointer"
                          title="WhatsApp Inquiry"
                        >
                          <WhatsAppIcon className="h-3.5 w-3.5 fill-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      }

      case "navbar":
        return (
          <nav key={el.id} className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-3.5 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs -mx-4 sm:-mx-6 -mt-6 mb-6">
            <div className="flex items-center gap-3">
              {brand.logoUrl ? (
                <img src={brand.logoUrl} alt={String(p.logo || brand.name || "Logo")} className="h-8 w-auto object-contain rounded" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                  {String(p.logo || brand.name || "B")[0]}
                </div>
              )}
              <span className="font-extrabold text-base text-stone-900 tracking-tight">
                {String(p.logo || brand.name || "Official Store")}
              </span>
            </div>

            {/* Multi-page Navigation Links */}
            <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-stone-600">
              {pages.length > 1
                ? pages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => navigateToPage(page.slug)}
                      className={`transition cursor-pointer ${
                        activePageSlug === page.slug
                          ? "text-emerald-700 font-extrabold border-b-2 border-emerald-600 pb-0.5"
                          : "text-stone-600 hover:text-emerald-700"
                      }`}
                    >
                      {page.title}
                    </button>
                  ))
                : String(p.links || "").split("|").map((l, i) => (
                    <span key={i} className="hover:text-emerald-700 transition cursor-pointer">
                      {l.trim()}
                    </span>
                  ))}
            </div>

            <div className="flex items-center gap-2">
              {onSwitchToCatalog && (
                <button
                  onClick={onSwitchToCatalog}
                  className="text-xs font-semibold text-stone-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition cursor-pointer"
                >
                  Classic Catalog
                </button>
              )}
              {p.ctaText && (
                <button
                  onClick={() => openWhatsAppInquiry()}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  <WhatsAppIcon className="h-3.5 w-3.5 fill-white" />
                  <span>{String(p.ctaText)}</span>
                </button>
              )}
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 transition cursor-pointer"
                title="Open Cart"
              >
                <ShoppingCart className="h-4 w-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
              {/* Mobile Menu Button */}
              {pages.length > 1 && (
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="md:hidden p-2 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 cursor-pointer"
                  title="Menu"
                >
                  <Menu className="h-4 w-4" />
                </button>
              )}
            </div>
          </nav>
        )

      // Fallback for other standard blocks (hero, feature-box, cards, etc.)
      case "hero-banner":
        return (
          <div
            className="my-6 rounded-3xl p-8 sm:p-14 relative overflow-hidden flex flex-col justify-center shadow-xl text-center md:text-left"
            style={{
              backgroundColor: String(p.bgColor || "#0d1520"),
              color: String(p.textColor || "#ffffff"),
              minHeight: `${p.minHeight || 420}px`,
            }}
          >
            {p.imageUrl && (
              <img
                src={String(p.imageUrl)}
                alt="Hero backdrop"
                className="absolute inset-0 w-full h-full object-cover opacity-25"
              />
            )}
            <div className="relative z-10 max-w-2xl space-y-4">
              <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-bold uppercase tracking-wider">
                {brand.name || "Official Website"}
              </span>
              <h1 className="text-3xl sm:text-5xl font-black leading-tight tracking-tight">
                {String(p.heading || "Transform Your Experience")}
              </h1>
              <p className="text-stone-300 text-sm sm:text-base leading-relaxed max-w-xl">
                {String(p.subtext || "Discover premium services, book directly with instant confirmation, and enjoy 24/7 dedicated support.")}
              </p>
              <div className="pt-2 flex flex-wrap gap-3 justify-center md:justify-start">
                <button
                  onClick={() => openWhatsAppInquiry()}
                  className="px-6 py-3.5 rounded-xl bg-[#00E785] hover:bg-[#00B96A] text-stone-950 font-black text-sm shadow-lg transition flex items-center gap-2 cursor-pointer"
                >
                  <WhatsAppIcon className="h-4 w-4 fill-stone-950" />
                  <span>{String(p.buttonText || "Get Started Free")}</span>
                </button>
                <button
                  onClick={() => setCartOpen(true)}
                  className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm backdrop-blur-xs transition border border-white/20 cursor-pointer"
                >
                  View Offerings
                </button>
              </div>
            </div>
          </div>
        )

      case "feature-box":
        return (
          <div className="p-6 rounded-2xl border border-stone-200 bg-white shadow-xs hover:shadow-md transition">
            <div className="text-3xl mb-3">{String(p.icon || "⚡")}</div>
            <h4 className="font-bold text-stone-900 text-base">{String(p.heading || "Lightning Fast")}</h4>
            <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">{String(p.text || "Experience zero downtime with automated processing.")}</p>
          </div>
        )

      case "testimonial":
        return (
          <div className="my-4 p-6 rounded-2xl border border-stone-200 bg-stone-50/80 shadow-xs relative">
            <div className="flex gap-1 text-amber-400 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400 stroke-amber-400" />
              ))}
            </div>
            <p className="text-stone-800 text-sm italic leading-relaxed">"{String(p.quote || "Outstanding experience from booking to completion!")}"</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs">
                {String(p.author || "A")[0]}
              </div>
              <div>
                <p className="font-bold text-stone-900 text-xs">{String(p.author || "Ahmed Al-Rashidi")}</p>
                <p className="text-[10px] text-stone-400">{String(p.role || "Verified Customer")}</p>
              </div>
            </div>
          </div>
        )

      case "contact-info":
        return (
          <div className="my-6 p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3">
            <h4 className="font-bold text-stone-900 text-sm">Contact Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-stone-600">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-600" />
                <span>{String(p.phone || brand.phone || "+968 9000 0000")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-emerald-600" />
                <span>{String(p.email || brand.email || "hello@business.com")}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" />
                <span>{String(p.address || brand.address || "Muscat, Sultanate of Oman")}</span>
              </div>
            </div>
          </div>
        )

      case "business-hours":
        return (
          <div className="my-4 p-5 rounded-xl bg-stone-50 border border-stone-200 text-xs">
            <div className="flex items-center gap-2 font-bold text-stone-800 mb-2">
              <Clock className="h-4 w-4 text-emerald-600" />
              <span>Working Hours</span>
            </div>
            <pre className="font-sans text-stone-600 whitespace-pre-wrap">{String(p.hours || "Mon-Fri: 9am - 6pm\nSat: 10am - 4pm\nSun: Closed")}</pre>
          </div>
        )

      case "divider":
        return <hr className="my-6 border-stone-200" />
      case "spacer":
        return <div style={{ height: `${p.height || 40}px` }} />

      default:
        return null
    }
  }

  const hasNavbarElement = elementsToRender.some((e) => e.type === "navbar")

  return (
    <div className="min-h-screen flex flex-col bg-white text-stone-900 relative">
      {/* Site Header - shown if no custom navbar element exists in the current page */}
      {!hasNavbarElement && (
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt={brand.name || "Logo"} className="h-8 w-auto object-contain rounded" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                {(brand.name || "B")[0]}
              </div>
            )}
            <span className="font-extrabold text-base text-stone-900 tracking-tight">
              {brand.name || "Official Store"}
            </span>
          </div>

          {/* Multi-page Navbar Links */}
          <div className="hidden md:flex items-center gap-4 text-xs font-bold text-stone-600">
            {pages.length > 1 &&
              pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => navigateToPage(page.slug)}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                    activePageSlug === page.slug
                      ? "bg-emerald-50 text-emerald-800 font-extrabold shadow-2xs"
                      : "hover:text-emerald-700 hover:bg-stone-50"
                  }`}
                >
                  {page.title}
                </button>
              ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {onSwitchToCatalog && (
              <button
                onClick={onSwitchToCatalog}
                className="text-xs font-semibold text-stone-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition"
              >
                Classic Catalog
              </button>
            )}

            <button
              onClick={() => openWhatsAppInquiry()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition cursor-pointer"
            >
              <WhatsAppIcon className="h-3.5 w-3.5 fill-emerald-800" />
              <span>WhatsApp Us</span>
            </button>

            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 transition cursor-pointer"
              title="Open Cart"
            >
              <ShoppingCart className="h-4 w-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {pages.length > 1 && (
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 cursor-pointer"
                title="Open Menu"
              >
                <Menu className="h-4 w-4" />
              </button>
            )}
          </div>
        </header>
      )}

      {/* Mobile Pages Drawer Modal */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-72 bg-white h-full p-6 flex flex-col justify-between shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <span className="font-extrabold text-sm text-stone-900">{brand.name || "Navigation"}</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-1">
                {pages.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      navigateToPage(p.slug)
                      setMobileMenuOpen(false)
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
                      activePageSlug === p.slug
                        ? "bg-emerald-50 text-emerald-800"
                        : "text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-4 border-t border-stone-100">
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  openWhatsAppInquiry()
                }}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2"
              >
                <WhatsAppIcon className="h-4 w-4 fill-white" />
                <span>Chat on WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Drag-and-Drop Content Canvas */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-4">
        {elementsToRender.map((el) => (
          <div key={el.id}>{renderElement(el)}</div>
        ))}
      </main>

      {/* Floating Cart Button if cart has items */}
      {cartCount > 0 && !cartOpen && (
        <div className="fixed bottom-6 right-6 z-40 animate-in fade-in slide-in-from-bottom-4">
          <button
            onClick={() => setCartOpen(true)}
            className="flex items-center gap-2.5 px-5 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-xl shadow-emerald-900/20 cursor-pointer transition transform hover:scale-105"
          >
            <ShoppingCart className="h-5 w-5" />
            <span>Cart ({cartCount})</span>
            <span className="bg-emerald-800/80 px-2 py-0.5 rounded-full text-xs">
              {activeCurrency} {cartSubtotal.toFixed(2)}
            </span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between p-6">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-black text-lg text-stone-900">Your Cart ({cartCount})</h3>
                </div>
                <button
                  onClick={() => setCartOpen(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
                    <ShoppingCart className="h-8 w-8" />
                  </div>
                  <p className="font-bold text-stone-600 text-sm">Your cart is currently empty</p>
                  <p className="text-xs text-stone-400">Browse our packages and add items to your cart</p>
                </div>
              ) : (
                <div className="divide-y divide-stone-100 max-h-[60vh] overflow-y-auto py-2">
                  {cart.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-bold text-sm text-stone-900">{item.name}</p>
                        <p className="text-xs text-emerald-700 font-semibold">
                          {item.currency} {item.price.toFixed(2)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-2 bg-stone-100 rounded-lg p-1">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-6 h-6 rounded flex items-center justify-center bg-white text-stone-700 shadow-xs cursor-pointer hover:bg-stone-50"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-6 h-6 rounded flex items-center justify-center bg-white text-stone-700 shadow-xs cursor-pointer hover:bg-stone-50"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-4 border-t border-stone-200 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-500 font-semibold">Subtotal:</span>
                  <span className="font-black text-lg text-emerald-800">
                    {activeCurrency} {cartSubtotal.toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setCartOpen(false)
                    setCheckoutOpen(true)
                  }}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-black text-xl text-stone-900">Complete Your Booking</h3>
              <button
                onClick={() => setCheckoutOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              {/* Payment Method Selector */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1.5">Choose Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("WHATSAPP")}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      paymentMethod === "WHATSAPP"
                        ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20"
                        : "border-stone-200 bg-white hover:bg-stone-50 text-stone-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="w-7 h-7 rounded-xl bg-[#25D366] flex items-center justify-center text-white shadow-2xs">
                        <WhatsAppIcon className="h-4 w-4 fill-white" />
                      </div>
                      {paymentMethod === "WHATSAPP" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    </div>
                    <div>
                      <div className="font-extrabold text-xs">WhatsApp Order</div>
                      <div className="text-[10px] text-stone-500">Concierge confirmation</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CARD_ONLINE")}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      paymentMethod === "CARD_ONLINE"
                        ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20"
                        : "border-stone-200 bg-white hover:bg-stone-50 text-stone-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="w-7 h-7 rounded-xl bg-stone-900 flex items-center justify-center text-white shadow-2xs">
                        <CreditCard className="h-4 w-4 text-white" />
                      </div>
                      {paymentMethod === "CARD_ONLINE" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    </div>
                    <div>
                      <div className="font-extrabold text-xs">Pay Online (Card)</div>
                      <div className="text-[10px] text-stone-500">AmwalPay / Oman Net</div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Salim Al-Harthy"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">WhatsApp Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="+968 9123 4567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {paymentMethod === "CARD_ONLINE" && (
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Email Address (for receipt)</label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Delivery Address / Booking Notes</label>
                <textarea
                  rows={2}
                  placeholder="Location or special requests…"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Order breakdown */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                <div className="flex justify-between font-bold text-stone-700">
                  <span>Order Total:</span>
                  <span className="text-emerald-700 font-black">{activeCurrency} {cartSubtotal.toFixed(2)}</span>
                </div>
                {paymentMethod === "CARD_ONLINE" && (
                  <div className="flex items-center gap-1 text-[11px] text-stone-500 pt-1 border-t border-stone-200/60">
                    <Lock className="h-3 w-3 text-emerald-600 shrink-0" />
                    <span>256-Bit SSL Encrypted checkout via AmwalPay Oman</span>
                  </div>
                )}
              </div>

              {paymentMethod === "CARD_ONLINE" ? (
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="w-full py-3.5 rounded-xl bg-stone-900 hover:bg-black text-white font-extrabold text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="h-4 w-4 text-emerald-400" />
                  <span>{formSubmitting ? "Initiating Secure Checkout…" : `Pay ${activeCurrency} ${cartSubtotal.toFixed(2)} Online`}</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm transition shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <WhatsAppIcon className="h-4 w-4 fill-white" />
                  <span>{formSubmitting ? "Submitting Order…" : "Confirm Order on WhatsApp"}</span>
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Site Footer */}
      <footer className="bg-stone-900 text-stone-400 text-xs py-8 px-6 border-t border-stone-800 text-center space-y-2">
        <p className="font-semibold text-stone-200">{brand.name || "Official Website"}</p>
        <p className="text-[11px] text-stone-500">Powered by Fizmoh Customer Website Engine</p>
      </footer>
    </div>
  )
}
