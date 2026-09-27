"use client"

import React, { useState, useEffect, useMemo } from "react"
import { type BuilderElement } from "@/components/views/website-builder-view"
import {
  ShoppingCart, Star, Phone, Mail, MapPin, Check, Plus, Minus,
  ChevronDown, ChevronRight, X, ArrowRight, Clock, Shield,
  Award, Sparkles, MessageSquare, Send, Zap, Users, CheckCircle2,
  ExternalLink, Heart, Share2, AlertCircle
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { toast } from "sonner"

interface PublishedSiteRendererProps {
  elements: BuilderElement[]
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

export function PublishedSiteRenderer({
  elements,
  products = [],
  brand = {},
  onSwitchToCatalog,
}: PublishedSiteRendererProps) {
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  // Interactive element states
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({})
  const [activeTabs, setActiveTabs] = useState<Record<string, number>>({})
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [carouselIndices, setCarouselIndices] = useState<Record<string, number>>({})
  const [customFormData, setCustomFormData] = useState<Record<string, Record<string, string>>>({})
  const [customFormSubmitting, setCustomFormSubmitting] = useState<Record<string, boolean>>({})

  // Checkout inputs
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"whatsapp" | "card">("whatsapp")

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

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName || !customerPhone) {
      toast.error("Please enter your name and phone number")
      return
    }

    setFormSubmitting(true)

    // Build WhatsApp order message
    const orderItemsText = cart
      .map((item) => `• ${item.name} x${item.quantity} (${item.currency} ${(item.price * item.quantity).toFixed(2)})`)
      .join("\n")

    const orderText = `🛒 *New Order from Website*\n\n*Customer:* ${customerName}\n*Phone:* ${customerPhone}\n${deliveryAddress ? `*Address:* ${deliveryAddress}\n` : ""}*Payment Preference:* ${paymentMethod === "whatsapp" ? "WhatsApp Pay / Cash" : "Card Payment"}\n\n*Items Ordered:*\n${orderItemsText}\n\n*Total:* ${activeCurrency} ${cartSubtotal.toFixed(2)}`

    const targetPhone = (brand.phone || "96890000000").replace(/[^0-9]/g, "")
    const waUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(orderText)}`

    setTimeout(() => {
      setFormSubmitting(false)
      setCheckoutOpen(false)
      setCart([])
      toast.success("Order initiated! Redirecting to WhatsApp…")
      window.open(waUrl, "_blank")
    }, 600)
  }

  const openWhatsAppInquiry = (customMsg?: string) => {
    const targetPhone = (brand.phone || "96890000000").replace(/[^0-9]/g, "")
    const text = customMsg || `Hello! I am visiting your website and would like more information.`
    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`, "_blank")
  }

  // Render individual builder element
  const renderElement = (el: BuilderElement) => {
    const p = el.props || {}

    switch (el.type) {
      // ─── Text Elements ──────────────────────────────────────
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
      case "gallery": {
        const sampleImages = [
          "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80",
          "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&q=80",
          "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80",
        ]
        return (
          <div className="my-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {sampleImages.map((img, idx) => (
              <div key={idx} className="rounded-xl overflow-hidden shadow-sm aspect-4/3 group relative">
                <img src={img} alt={`Gallery item ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
              </div>
            ))}
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
        return (
          <div className="my-4 max-w-sm rounded-2xl border border-stone-200/80 bg-white overflow-hidden shadow-md hover:shadow-lg transition-all">
            <div className="h-48 bg-stone-100 relative overflow-hidden flex items-center justify-center">
              {p.image ? (
                <img src={String(p.image)} alt={itemName} className="w-full h-full object-cover" />
              ) : (
                <ShoppingCart className="h-12 w-12 text-stone-300" />
              )}
              {p.badge && (
                <span className="absolute top-3 right-3 bg-rose-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                  {String(p.badge)}
                </span>
              )}
            </div>
            <div className="p-5">
              <h4 className="font-extrabold text-stone-900 text-lg">{itemName}</h4>
              <p className="text-xs text-stone-500 mt-1 line-clamp-2">{String(p.description || "All premium features included.")}</p>
              <div className="flex items-center justify-between mt-5 pt-3 border-t border-stone-100">
                <div>
                  <span className="text-[10px] text-stone-400 font-bold uppercase block">Price</span>
                  <span className="font-black text-emerald-700 text-xl">{itemCurrency} {itemPrice.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => addToCart({ id: el.id, name: itemName, price: itemPrice, currency: itemCurrency })}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span>{String(p.buttonText || "Add to Cart")}</span>
                </button>
              </div>
            </div>
          </div>
        )
      }

      case "product-grid": {
        const gridClass = getResponsiveGrid(p.colsDesktop, p.colsTablet, p.colsMobile, p.columns || "3")
        const displayItems = products.length > 0 ? products : [
          { id: "demo-1", name: "Horse Riding Tour", basePrice: 12, currency: activeCurrency, description: "Sunset beach ride with experienced guide." },
          { id: "demo-2", name: "Desert Safari & Camp", basePrice: 45, currency: activeCurrency, description: "Dune bashing, BBQ dinner and star watching." },
          { id: "demo-3", name: "Dolphin Watching Cruise", basePrice: 20, currency: activeCurrency, description: "2-hour coastal boat cruise around Bandar Khayran." },
        ]

        return (
          <div className="my-8 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-2xl text-stone-900">Featured Offerings</h3>
                <p className="text-xs text-stone-500">Book online or order directly via WhatsApp</p>
              </div>
              {onSwitchToCatalog && (
                <button onClick={onSwitchToCatalog} className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1">
                  View Full Catalog <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className={`grid ${gridClass} gap-5`}>
              {displayItems.map((prod) => {
                const pr = prod.basePrice ?? prod.price ?? 25
                const curr = prod.currency || activeCurrency
                return (
                  <div key={prod.id} className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between">
                    <div className="h-40 bg-stone-100 relative flex items-center justify-center overflow-hidden">
                      {prod.imageUrl ? (
                        <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                      ) : (
                        <Sparkles className="h-10 w-10 text-emerald-300" />
                      )}
                      {prod.category && (
                        <span className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-xs text-stone-800 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                          {prod.category}
                        </span>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-stone-900 text-sm">{prod.name}</h4>
                        <p className="text-xs text-stone-500 mt-1 line-clamp-2">{prod.description}</p>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100">
                        <span className="font-black text-emerald-700 text-base">{curr} {pr.toFixed(2)}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => addToCart({ id: prod.id, name: prod.name, price: pr, currency: curr, imageUrl: prod.imageUrl })}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      }

      case "product-carousel": {
        const displayItems = products.length > 0 ? products : [
          { id: "demo-c1", name: "Wahiba Sands Desert Safari", basePrice: 45, currency: activeCurrency, description: "Full-day 4x4 dune bashing with Bedouin camp & sunset dinner." },
          { id: "demo-c2", name: "Daymaniyat Islands Snorkeling", basePrice: 35, currency: activeCurrency, description: "Boat excursion with sea turtles, coral reefs & gear included." },
          { id: "demo-c3", name: "Wadi Shab & Bimmah Sinkhole", basePrice: 28, currency: activeCurrency, description: "Guided canyon hike, cave swimming, and coastal views." },
          { id: "demo-c4", name: "Jebel Akhdar Mountain Tour", basePrice: 50, currency: activeCurrency, description: "Green Mountain terrace villages, rose water distilleries & peaks." },
          { id: "demo-c5", name: "Muscat City Heritage Night Tour", basePrice: 20, currency: activeCurrency, description: "Muttrah Souq, Sultan Qaboos Grand Mosque & Al Alam Palace." },
        ]
        const currentIdx = carouselIndices[el.id] || 0
        const gridClass = getResponsiveGrid(p.colsDesktop, p.colsTablet, p.colsMobile, 4)

        const handlePrev = () => {
          setCarouselIndices(prev => ({
            ...prev,
            [el.id]: Math.max(0, currentIdx - 1)
          }))
        }
        const handleNext = () => {
          setCarouselIndices(prev => ({
            ...prev,
            [el.id]: (currentIdx + 1) >= displayItems.length ? 0 : currentIdx + 1
          }))
        }

        return (
          <div className="my-10 space-y-4">
            <div className="flex items-end justify-between">
              <div>
                {p.subtext && <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">{String(p.subtext)}</p>}
                <h3 className="font-black text-2xl sm:text-3xl text-stone-900">{String(p.heading || "Featured Collection")}</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrev}
                  disabled={currentIdx === 0}
                  className="w-8 h-8 rounded-full border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center text-stone-600 disabled:opacity-30 shadow-xs cursor-pointer"
                  title="Previous"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </button>
                <button
                  onClick={handleNext}
                  className="w-8 h-8 rounded-full border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center text-stone-600 shadow-xs cursor-pointer"
                  title="Next"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto pb-4 pt-1 scrollbar-thin scrollbar-thumb-stone-200 -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className={`grid ${gridClass} gap-4 min-w-[280px]`}>
                {displayItems.map((prod) => {
                  const pr = prod.basePrice ?? prod.price ?? 25
                  const curr = prod.currency || activeCurrency
                  return (
                    <div key={prod.id} className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between">
                      <div className="h-40 bg-stone-100 relative flex items-center justify-center overflow-hidden">
                        {prod.imageUrl ? (
                          <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <Sparkles className="h-8 w-8 text-emerald-300" />
                        )}
                        {prod.category && (
                          <span className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-xs text-stone-800 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                            {prod.category}
                          </span>
                        )}
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-stone-900 text-sm line-clamp-1">{prod.name}</h4>
                          <p className="text-xs text-stone-500 mt-1 line-clamp-2">{prod.description}</p>
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100">
                          <span className="font-black text-emerald-700 text-base">{curr} {pr.toFixed(2)}</span>
                          <button
                            onClick={() => addToCart({ id: prod.id, name: prod.name, price: pr, currency: curr, imageUrl: prod.imageUrl })}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      }

      case "image-carousel": {
        const slideUrls = String(p.slides || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80|https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80")
          .split("|")
          .map(s => s.trim())
          .filter(Boolean)
        const currentIdx = carouselIndices[el.id] || 0
        const activeSlide = slideUrls[currentIdx] || slideUrls[0]
        const sliderHeight = p.height || "420"

        const handlePrev = () => {
          setCarouselIndices(prev => ({
            ...prev,
            [el.id]: currentIdx <= 0 ? slideUrls.length - 1 : currentIdx - 1
          }))
        }
        const handleNext = () => {
          setCarouselIndices(prev => ({
            ...prev,
            [el.id]: currentIdx >= slideUrls.length - 1 ? 0 : currentIdx + 1
          }))
        }

        return (
          <div className="my-8 rounded-3xl overflow-hidden relative shadow-lg group" style={{ height: `${sliderHeight}px` }}>
            <img
              src={activeSlide}
              alt={`Slide ${currentIdx + 1}`}
              className="w-full h-full object-cover transition-all duration-700 ease-in-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

            {slideUrls.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center transition cursor-pointer"
                  title="Previous Slide"
                >
                  <ChevronRight className="h-5 w-5 rotate-180" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center transition cursor-pointer"
                  title="Next Slide"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                  {slideUrls.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCarouselIndices(prev => ({ ...prev, [el.id]: i }))}
                      className={`h-2 rounded-full transition-all cursor-pointer ${currentIdx === i ? "w-6 bg-white" : "w-2 bg-white/50"}`}
                      title={`Slide ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )
      }

      case "before-after": {
        return (
          <div className="my-8 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs space-y-4">
            <div className="text-center max-w-lg mx-auto mb-2">
              <h3 className="font-black text-2xl text-stone-900">{String(p.heading || "Proven Results & Transformation")}</h3>
              <p className="text-xs text-stone-500 mt-1">See the direct impact of our tailored services</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-stone-100 border border-stone-200 relative overflow-hidden">
                <span className="inline-block px-3 py-1 bg-stone-900 text-white text-[10px] font-black rounded-lg uppercase tracking-wider mb-3">
                  {String(p.beforeLabel || "Before")}
                </span>
                <p className="text-sm font-bold text-stone-700">Manual booking hassles & delayed replies</p>
                <p className="text-xs text-stone-500 mt-1">Customers waiting hours for WhatsApp replies, missed bookings during weekends, manual invoice paperwork.</p>
              </div>
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 relative overflow-hidden">
                <span className="inline-block px-3 py-1 bg-emerald-600 text-white text-[10px] font-black rounded-lg uppercase tracking-wider mb-3">
                  {String(p.afterLabel || "After")}
                </span>
                <p className="text-sm font-bold text-emerald-900">Instant 24/7 Automated Booking & Checkout</p>
                <p className="text-xs text-emerald-700 mt-1">Direct live catalog ordering, automated WhatsApp confirmations, 3x faster customer turnaround and instant revenue.</p>
              </div>
            </div>
          </div>
        )
      }

      case "cta-multi": {
        return (
          <div className="my-10 rounded-3xl p-8 sm:p-12 bg-gradient-to-br from-stone-900 via-stone-800 to-stone-950 text-white shadow-2xl relative overflow-hidden space-y-5">
            <div className="relative z-10 max-w-2xl space-y-3">
              {p.badge && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="h-3 w-3 text-emerald-400" />
                  <span>{String(p.badge)}</span>
                </span>
              )}
              <h3 className="text-3xl sm:text-4xl font-black leading-tight tracking-tight">{String(p.heading || "Ready to experience the best?")}</h3>
              <p className="text-stone-300 text-sm sm:text-base leading-relaxed">{String(p.subtext || "Reach out directly on WhatsApp for custom packages, or browse our complete collection.")}</p>
              <div className="flex flex-wrap gap-3 pt-3">
                <button
                  onClick={() => openWhatsAppInquiry(String(p.heading || "Inquiry from website"))}
                  className="px-6 py-3.5 bg-[#25D366] hover:bg-[#20ba5a] text-stone-950 font-black rounded-xl text-sm flex items-center gap-2 shadow-lg transition cursor-pointer"
                >
                  <WhatsAppIcon className="h-4 w-4 fill-stone-950" />
                  <span>{String(p.primaryText || "Order on WhatsApp")}</span>
                </button>
                {onSwitchToCatalog ? (
                  <button
                    onClick={onSwitchToCatalog}
                    className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-sm border border-white/20 transition cursor-pointer"
                  >
                    {String(p.secondaryText || "Explore Catalog")}
                  </button>
                ) : (
                  <button
                    onClick={() => setCartOpen(true)}
                    className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-sm border border-white/20 transition cursor-pointer"
                  >
                    {String(p.secondaryText || "View Cart & Products")}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      }

      case "custom-form": {
        const fields = String(p.fields || "Full Name,WhatsApp Phone,Email,Notes").split(",").map(f => f.trim()).filter(Boolean)
        const isSubmitting = !!customFormSubmitting[el.id]
        const currentValues = customFormData[el.id] || {}

        const handleFieldChange = (f: string, v: string) => {
          setCustomFormData(prev => ({
            ...prev,
            [el.id]: {
              ...(prev[el.id] || {}),
              [f]: v,
            }
          }))
        }

        const handleFormSubmit = (e: React.FormEvent) => {
          e.preventDefault()
          setCustomFormSubmitting(prev => ({ ...prev, [el.id]: true }))

          const lines = fields.map(f => `*${f}:* ${currentValues[f] || "N/A"}`).join("\n")
          const msg = `📝 *New Custom Form Submission*\n*Form:* ${String(p.heading || "Inquiry")}\n\n${lines}`

          const targetPhone = (brand.phone || "96890000000").replace(/[^0-9]/g, "")
          const waUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`

          setTimeout(() => {
            setCustomFormSubmitting(prev => ({ ...prev, [el.id]: false }))
            toast.success("Inquiry submitted! Launching WhatsApp…")
            window.open(waUrl, "_blank")
          }, 500)
        }

        return (
          <div className="my-8 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs max-w-xl mx-auto space-y-4">
            <div>
              <h3 className="font-black text-2xl text-stone-900">{String(p.heading || "Custom Inquiry Form")}</h3>
              <p className="text-xs text-stone-500 mt-1">Submit your request below and we will get back to you immediately.</p>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3.5">
              {fields.map((f, i) => (
                <div key={i}>
                  <label className="text-xs font-bold text-stone-700 block mb-1">{f} *</label>
                  {f.toLowerCase().includes("note") || f.toLowerCase().includes("message") ? (
                    <textarea
                      required
                      rows={3}
                      placeholder={`Enter your ${f.toLowerCase()}…`}
                      value={currentValues[f] || ""}
                      onChange={e => handleFieldChange(f, e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  ) : (
                    <input
                      required
                      type={f.toLowerCase().includes("email") ? "email" : f.toLowerCase().includes("phone") ? "tel" : "text"}
                      placeholder={`Enter your ${f.toLowerCase()}…`}
                      value={currentValues[f] || ""}
                      onChange={e => handleFieldChange(f, e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  )}
                </div>
              ))}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSubmitting ? "Sending…" : String(p.submitText || "Submit Request via WhatsApp")}</span>
              </button>
            </form>
          </div>
        )
      }

      case "logo-marquee": {
        const logos = String(p.logos || "Premium Partner|Verified Seller|Official Agency|Secure Checkout|Global Delivery")
          .split("|")
          .map(l => l.trim())
          .filter(Boolean)
        const gridClass = getResponsiveGrid(p.colsDesktop, p.colsTablet, p.colsMobile, 5)

        return (
          <div className="my-8 py-6 px-4 bg-stone-50 rounded-2xl border border-stone-200/80 text-center space-y-3">
            <p className="text-[11px] uppercase tracking-widest font-black text-stone-400">Trusted By & Certified With</p>
            <div className={`grid ${gridClass} gap-3 items-center justify-center max-w-4xl mx-auto`}>
              {logos.map((logo, i) => (
                <div key={i} className="px-3 py-2.5 bg-white rounded-xl border border-stone-200 shadow-2xs flex items-center justify-center text-xs font-bold text-stone-700">
                  {logo}
                </div>
              ))}
            </div>
          </div>
        )
      }

      case "cart-button":
        return (
          <div className="py-2">
            <button
              onClick={() => setCartOpen(true)}
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-white font-bold text-xs shadow-md transition hover:opacity-90 cursor-pointer"
              style={{ backgroundColor: String(p.bgColor || "#10B981") }}
            >
              <ShoppingCart className="h-4 w-4" />
              <span>{String(p.text || "View Cart")}</span>
              {cartCount > 0 && (
                <span className="bg-white text-emerald-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        )

      case "checkout-form":
        return (
          <div className="my-8 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-lg max-w-xl mx-auto">
            <h3 className="font-black text-2xl text-stone-900">{String(p.heading || "Complete Your Order")}</h3>
            <p className="text-xs text-stone-500 mt-1 mb-6">Enter details below to confirm booking and receive WhatsApp confirmation.</p>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Full Name *</label>
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
                <label className="text-xs font-bold text-stone-700 block mb-1">WhatsApp Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+968 9123 4567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Delivery Address or Special Notes</label>
                <textarea
                  rows={2}
                  placeholder="Hotel name, pickup spot, or notes…"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {cart.length > 0 && (
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-stone-700">
                    <span>Order Subtotal ({cartCount} items):</span>
                    <span className="text-emerald-700">{activeCurrency} {cartSubtotal.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={formSubmitting}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{formSubmitting ? "Processing…" : String(p.submitText || "Submit & Pay via WhatsApp")}</span>
              </button>
            </form>
          </div>
        )

      // ─── Marketing & Social Proof ────────────────────────────
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

      case "pricing-table":
        return (
          <div className="my-8 text-center space-y-6">
            <h3 className="font-black text-2xl text-stone-900">{String(p.heading || "Simple, Transparent Pricing")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[1, 2, 3].map((num) => {
                const isPro = num === 2
                const planName = String(p[`plan${num}` as keyof typeof p] || (num === 1 ? "Starter" : num === 2 ? "Pro" : "Enterprise"))
                const planPrice = String(p[`price${num}` as keyof typeof p] || (num === 1 ? "Free" : num === 2 ? "29" : "99"))
                return (
                  <div
                    key={num}
                    className={`p-6 rounded-3xl border-2 flex flex-col justify-between transition ${
                      isPro
                        ? "border-emerald-500 bg-emerald-50/40 shadow-lg scale-105 z-10"
                        : "border-stone-200 bg-white shadow-xs"
                    }`}
                  >
                    <div>
                      {isPro && (
                        <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider mb-2">
                          Most Popular
                        </span>
                      )}
                      <h4 className="font-bold text-stone-800 text-base">{planName}</h4>
                      <div className="my-4">
                        <span className="text-3xl font-black text-stone-900">{planPrice}</span>
                        {planPrice !== "Free" && <span className="text-xs text-stone-500"> {String(p.currency || activeCurrency)}/mo</span>}
                      </div>
                      <ul className="text-xs text-stone-600 space-y-2 text-left my-6">
                        <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> Full Access</li>
                        <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp Updates</li>
                        <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> Priority Support</li>
                      </ul>
                    </div>
                    <button
                      onClick={() => openWhatsAppInquiry(`I would like to book the ${planName} package.`)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                        isPro
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                          : "bg-stone-900 hover:bg-stone-800 text-white"
                      }`}
                    >
                      Choose {planName}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )

      case "accordion": {
        const isOpen = !!openAccordions[el.id]
        return (
          <div className="my-2 border border-stone-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <button
              onClick={() => setOpenAccordions((prev) => ({ ...prev, [el.id]: !prev[el.id] }))}
              className="w-full p-4 text-left font-bold text-sm text-stone-900 flex items-center justify-between hover:bg-stone-50 cursor-pointer"
            >
              <span>{String(p.question || "Frequently Asked Question")}</span>
              <ChevronDown className={`h-4 w-4 text-stone-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <div className="p-4 pt-0 text-xs text-stone-600 leading-relaxed border-t border-stone-100 bg-stone-50/50">
                {String(p.answer || "Answers to your common inquiries are posted right here for quick reference.")}
              </div>
            )}
          </div>
        )
      }

      case "tabs": {
        const tabList = String(p.tabs || "Overview|Features|FAQ").split("|")
        const currentTab = activeTabs[el.id] || 0
        return (
          <div className="my-6 space-y-4">
            <div className="flex border-b border-stone-200 gap-2">
              {tabList.map((tName, tIdx) => (
                <button
                  key={tIdx}
                  onClick={() => setActiveTabs((prev) => ({ ...prev, [el.id]: tIdx }))}
                  className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
                    currentTab === tIdx
                      ? "border-emerald-600 text-emerald-800"
                      : "border-transparent text-stone-400 hover:text-stone-700"
                  }`}
                >
                  {tName}
                </button>
              ))}
            </div>
            <div className="p-4 bg-stone-50 rounded-xl text-xs text-stone-600">
              Content for <strong>{tabList[currentTab]}</strong> section.
            </div>
          </div>
        )
      }

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

      case "social-links":
        return (
          <div className="my-4 flex items-center gap-3">
            <button onClick={() => openWhatsAppInquiry()} className="w-9 h-9 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:opacity-90 shadow-xs cursor-pointer">
              <WhatsAppIcon className="h-4 w-4 fill-white" />
            </button>
            <button onClick={() => window.open("https://instagram.com", "_blank")} className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-purple-600 text-white flex items-center justify-center hover:opacity-90 shadow-xs cursor-pointer">
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        )

      // ─── Layout Elements ─────────────────────────────────────
      case "divider":
        return <hr className="my-6 border-stone-200" />
      case "spacer":
        return <div style={{ height: `${p.height || 40}px` }} />

      case "container":
        return (
          <div
            className="my-4 rounded-xl border border-stone-200/60 p-6 bg-white"
            style={{ maxWidth: `${p.maxWidth || 1100}px` }}
          >
            <p className="text-xs text-stone-400 uppercase tracking-widest font-bold mb-2">Container Section</p>
          </div>
        )

      // ─── Layout & Navigation Elements ─────────────────────────
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
            <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-stone-600">
              {String(p.links || "").split("|").map((l, i) => (
                <span key={i} className="hover:text-emerald-700 transition cursor-pointer">{l.trim()}</span>
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
            </div>
          </nav>
        )

      case "card":
        return (
          <div
            key={el.id}
            className="rounded-2xl p-6 border transition shadow-xs"
            style={{
              backgroundColor: String(p.bgColor || "#ffffff"),
              borderColor: String(p.borderColor || "#E5E7EB"),
              borderRadius: `${p.borderRadius || 16}px`,
            }}
          >
            {p.title && <h4 className="font-bold text-lg text-stone-900 mb-1">{String(p.title)}</h4>}
            {p.description && <p className="text-sm text-stone-600">{String(p.description)}</p>}
          </div>
        )

      case "two-column":
        return (
          <div key={el.id} className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4">
            <div className="p-5 rounded-xl bg-stone-50 border border-stone-200">
              <h4 className="font-bold text-stone-900 mb-1">{String(p.leftHeading || "Feature One")}</h4>
              <p className="text-sm text-stone-600">{String(p.leftText || "Discover our specialized offerings and personalized service.")}</p>
            </div>
            <div className="p-5 rounded-xl bg-stone-50 border border-stone-200">
              <h4 className="font-bold text-stone-900 mb-1">{String(p.rightHeading || "Feature Two")}</h4>
              <p className="text-sm text-stone-600">{String(p.rightText || "Instant booking confirmation and continuous support via WhatsApp.")}</p>
            </div>
          </div>
        )

      case "three-column":
        return (
          <div key={el.id} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 my-4">
            {[1, 2, 3].map((col) => (
              <div key={col} className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                <h4 className="font-bold text-stone-900 text-sm mb-1">{String(p[`col${col}Heading`] || `Highlight ${col}`)}</h4>
                <p className="text-xs text-stone-600">{String(p[`col${col}Text`] || "Dedicated hospitality and authentic desert journeys.")}</p>
              </div>
            ))}
          </div>
        )

      default:
        return null
    }
  }

  const hasNavbarElement = elements.some((e) => e.type === "navbar")

  return (
    <div className="min-h-screen flex flex-col bg-white text-stone-900 relative">
      {/* Site Header - only shown if no custom navbar element was added */}
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
        </div>
      </header>
      )}

      {/* Main Drag-and-Drop Content Canvas */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-4">
        {elements.map((el) => (
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

      {/* Cart Slide-over Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end" onClick={() => setCartOpen(false)}>
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-stone-900">Your Cart</h3>
                <span className="text-xs text-stone-500">({cartCount} items)</span>
              </div>
              <button onClick={() => setCartOpen(false)} className="p-1 rounded-full hover:bg-stone-100 text-stone-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-stone-400 text-center p-6">
                  <ShoppingCart className="h-12 w-12 stroke-stone-300 mb-2" />
                  <p className="font-bold text-stone-600">Your cart is empty</p>
                  <p className="text-xs text-stone-400 mt-1">Add items from the store to begin checkout.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="font-bold text-xs text-stone-900 truncate">{item.name}</p>
                      <p className="text-xs text-emerald-700 font-extrabold mt-0.5">
                        {item.currency} {(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-white rounded-lg border border-stone-200 p-1">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-stone-100 rounded text-stone-600 cursor-pointer">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-bold px-1.5">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-stone-100 rounded text-stone-600 cursor-pointer">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-stone-200 space-y-3 bg-stone-50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-500 font-medium">Subtotal</span>
                  <span className="font-black text-emerald-800 text-base">{activeCurrency} {cartSubtotal.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => { setCartOpen(false); setCheckoutOpen(true) }}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm transition shadow flex items-center justify-center gap-2 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" onClick={() => setCheckoutOpen(false)}>
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setCheckoutOpen(false)} className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 rounded-full">
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-black text-stone-900 mb-1">Instant Checkout</h3>
            <p className="text-xs text-stone-500 mb-5">Confirm your order items and delivery details</p>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ahmed Al-Balushi"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">WhatsApp Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+968 9123 4567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Delivery Address / Booking Notes</label>
                <textarea
                  rows={2}
                  placeholder="Location or instructions…"
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
              </div>

              <button
                type="submit"
                disabled={formSubmitting}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm transition shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <WhatsAppIcon className="h-4 w-4 fill-white" />
                <span>{formSubmitting ? "Submitting Order…" : "Confirm Order on WhatsApp"}</span>
              </button>
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
