"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Eye, EyeOff, Globe, Layers, Smartphone, Monitor, Tablet,
  Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Settings,
  Image, Type, Video, Link, Star, ShoppingCart, Mail, Phone, Map,
  MessageSquare, CheckSquare, ListOrdered, Quote, Minus, Code,
  AlignLeft, AlignCenter, Columns, LayoutGrid, Sparkles, Save,
  Upload, ExternalLink, ArrowRight, Undo2, Redo2, X, Palette,
  Bold, Italic, Underline, AlignRight, Timer, Users, Award,
  FileText, Zap, Heart, Share2, Clock, TrendingUp, Menu,
  ChevronRight, Search, Download, Sliders, Grid, Play, PanelLeft, RotateCcw,
} from "lucide-react"

// ─── Element Type Catalogue (50+ elements) ───────────────────────────────────

export type ElementType =
  // Text
  | "heading" | "subheading" | "paragraph" | "caption" | "quote" | "badge-text"
  // Media
  | "image" | "video-embed" | "icon" | "logo" | "gallery" | "image-carousel" | "before-after"
  // Buttons & Links
  | "button" | "button-outline" | "link" | "whatsapp-cta" | "cta-banner" | "cta-multi"
  // Forms
  | "input-field" | "textarea-field" | "select-field" | "checkbox" | "contact-form" | "custom-form"
  // Layout
  | "divider" | "spacer" | "container" | "two-column" | "three-column" | "card"
  // Navigation
  | "navbar" | "breadcrumb" | "tabs" | "accordion" | "pagination"
  // Commerce
  | "product-card" | "product-grid" | "product-carousel" | "price-tag" | "cart-button" | "checkout-form"
  | "promo-badge" | "countdown-timer"
  // Social Proof
  | "testimonial" | "rating-stars" | "review-card" | "trust-badges" | "customer-count"
  // Marketing
  | "hero-banner" | "feature-box" | "stat-counter" | "team-member" | "pricing-table"
  | "faq-item" | "timeline-item" | "newsletter-signup" | "social-links" | "logo-marquee"
  // Maps & Contact
  | "map-embed" | "contact-info" | "business-hours"

export interface BuilderElement {
  id: string
  type: ElementType
  props: Record<string, string | number | boolean>
  children?: BuilderElement[]
}

// ─── Element Definitions ────────────────────────────────────────────────────

interface ElementDef {
  type: ElementType
  label: string
  icon: any
  group: string
  defaultProps: Record<string, string | number | boolean>
  preview: string
}

const ELEMENT_DEFS: ElementDef[] = [
  // ── Text
  { type: "heading", label: "Heading", icon: Type, group: "Text", defaultProps: { text: "Your Amazing Headline", level: "h1", align: "left", color: "#111827", size: "3xl" }, preview: "H1 Title" },
  { type: "subheading", label: "Subheading", icon: Type, group: "Text", defaultProps: { text: "Section Title", level: "h2", align: "left", color: "#374151", size: "xl" }, preview: "H2 Section" },
  { type: "paragraph", label: "Paragraph", icon: AlignLeft, group: "Text", defaultProps: { text: "Write your content here. Describe your product, service, or story in compelling detail.", align: "left", color: "#6B7280", size: "base" }, preview: "Body text" },
  { type: "caption", label: "Caption", icon: AlignLeft, group: "Text", defaultProps: { text: "Small caption text", align: "center", color: "#9CA3AF", size: "sm" }, preview: "Caption" },
  { type: "quote", label: "Quote", icon: Quote, group: "Text", defaultProps: { text: "The best way to predict the future is to create it.", author: "Abraham Lincoln", style: "left-border" }, preview: "Blockquote" },
  { type: "badge-text", label: "Badge", icon: Award, group: "Text", defaultProps: { text: "NEW", color: "green" }, preview: "Badge" },
  // ── Media
  { type: "image", label: "Image", icon: Image, group: "Media", defaultProps: { src: "", alt: "Image", width: "100%", borderRadius: "8", objectFit: "cover" }, preview: "📷 Image" },
  { type: "image-carousel", label: "Image Slider", icon: Image, group: "Media", defaultProps: { slides: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80|https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80", height: "400", autoPlay: true }, preview: "🖼 Slider" },
  { type: "before-after", label: "Before / After", icon: Columns, group: "Media", defaultProps: { beforeLabel: "Before", afterLabel: "After", heading: "Real Results" }, preview: "🌓 Compare" },
  { type: "video-embed", label: "Video", icon: Play, group: "Media", defaultProps: { url: "https://www.youtube.com/embed/dQw4w9WgXcQ", height: "400", caption: "" }, preview: "▶ Video" },
  { type: "gallery", label: "Gallery", icon: Grid, group: "Media", defaultProps: { columns: "3", gap: "8", images: "" }, preview: "🖼 Gallery" },
  { type: "icon", label: "Icon", icon: Star, group: "Media", defaultProps: { name: "star", size: "48", color: "#F59E0B" }, preview: "⭐ Icon" },
  // ── Buttons
  { type: "button", label: "Button", icon: Zap, group: "Buttons", defaultProps: { text: "Get Started", href: "#", bgColor: "#10B981", textColor: "#ffffff", size: "md", align: "center", borderRadius: "8", fullWidth: false }, preview: "[ Button ]" },
  { type: "button-outline", label: "Outline Button", icon: Zap, group: "Buttons", defaultProps: { text: "Learn More", href: "#", borderColor: "#10B981", textColor: "#10B981", size: "md", align: "center", borderRadius: "8" }, preview: "[ Outline ]" },
  { type: "link", label: "Text Link", icon: Link, group: "Buttons", defaultProps: { text: "Click here", href: "#", color: "#2563EB" }, preview: "Text link →" },
  { type: "whatsapp-cta", label: "WhatsApp CTA", icon: MessageSquare, group: "Buttons", defaultProps: { text: "Chat on WhatsApp", phone: "", message: "Hello! I'd like to know more.", align: "center" }, preview: "💬 WhatsApp" },
  { type: "cta-multi", label: "Multi-CTA Block", icon: Sparkles, group: "Buttons", defaultProps: { heading: "Ready to get started?", subtext: "Chat with us on WhatsApp or explore our catalog.", primaryText: "Order on WhatsApp", secondaryText: "Explore Catalog", badge: "Instant Response" }, preview: "✨ Multi-CTA" },
  { type: "cta-banner", label: "CTA Banner", icon: ArrowRight, group: "Buttons", defaultProps: { heading: "Ready to get started?", subtext: "Join thousands of happy customers", buttonText: "Start Free Trial", buttonHref: "#", bgColor: "#10B981" }, preview: "CTA Banner" },
  // ── Forms
  { type: "input-field", label: "Input Field", icon: AlignLeft, group: "Forms", defaultProps: { label: "Your Name", placeholder: "Enter your name", required: true, type: "text" }, preview: "[ Input ]" },
  { type: "textarea-field", label: "Textarea", icon: AlignLeft, group: "Forms", defaultProps: { label: "Message", placeholder: "Write your message...", rows: "4", required: false }, preview: "[ Textarea ]" },
  { type: "select-field", label: "Dropdown", icon: ListOrdered, group: "Forms", defaultProps: { label: "Select Option", options: "Option 1\nOption 2\nOption 3" }, preview: "[ Select ▾ ]" },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare, group: "Forms", defaultProps: { label: "I agree to the terms and conditions", required: false }, preview: "☑ Checkbox" },
  { type: "contact-form", label: "Contact Form", icon: Mail, group: "Forms", defaultProps: { heading: "Get In Touch", submitText: "Send Message", successMessage: "Thank you! We'll be in touch soon." }, preview: "📧 Contact Form" },
  { type: "custom-form", label: "Custom Form", icon: FileText, group: "Forms", defaultProps: { heading: "Custom Inquiry", submitText: "Submit Request", fields: "Full Name,WhatsApp Phone,Email,Notes" }, preview: "📝 Custom Form" },
  { type: "newsletter-signup", label: "Newsletter", icon: Mail, group: "Forms", defaultProps: { heading: "Stay Updated", placeholder: "Enter your email", buttonText: "Subscribe", note: "No spam, unsubscribe anytime." }, preview: "📨 Newsletter" },
  // ── Layout
  { type: "divider", label: "Divider", icon: Minus, group: "Layout", defaultProps: { style: "solid", color: "#E5E7EB", thickness: "1", margin: "24" }, preview: "─────────" },
  { type: "spacer", label: "Spacer", icon: Minus, group: "Layout", defaultProps: { height: "40" }, preview: "[ Spacer ]" },
  { type: "container", label: "Container", icon: Columns, group: "Layout", defaultProps: { maxWidth: "1100", padding: "24", bgColor: "", borderRadius: "0" }, preview: "⬚ Container" },
  { type: "two-column", label: "2 Columns", icon: Columns, group: "Layout", defaultProps: { gap: "24", ratio: "50-50" }, preview: "| Col | Col |" },
  { type: "three-column", label: "3 Columns", icon: LayoutGrid, group: "Layout", defaultProps: { gap: "16" }, preview: "| Col | Col | Col |" },
  { type: "card", label: "Card", icon: FileText, group: "Layout", defaultProps: { padding: "24", bgColor: "#ffffff", shadow: "md", borderRadius: "12", borderColor: "#E5E7EB" }, preview: "┌─ Card ─┐" },
  // ── Navigation
  { type: "navbar", label: "Navbar", icon: Menu, group: "Navigation", defaultProps: { logo: "", links: "Home|About|Services|Contact", ctaText: "Book Now", ctaHref: "#", sticky: true, bgColor: "#ffffff" }, preview: "≡ Navbar" },
  { type: "breadcrumb", label: "Breadcrumb", icon: ChevronRight, group: "Navigation", defaultProps: { items: "Home > About > Services" }, preview: "Home › Page" },
  { type: "tabs", label: "Tabs", icon: ListOrdered, group: "Navigation", defaultProps: { tabs: "Overview|Features|Pricing|FAQ", activeTab: "0" }, preview: "[Tab1][Tab2][Tab3]" },
  { type: "accordion", label: "Accordion", icon: ChevronDown, group: "Navigation", defaultProps: { question: "How does it work?", answer: "It's simple! Just sign up and start building your page in minutes." }, preview: "▼ FAQ Item" },
  // ── Commerce
  { type: "product-card", label: "Product Card", icon: ShoppingCart, group: "Commerce", defaultProps: { name: "Premium Package", price: "99.00", currency: "OMR", image: "", description: "All features included.", buttonText: "Buy Now" }, preview: "🛍 Product" },
  { type: "product-grid", label: "Product Grid", icon: LayoutGrid, group: "Commerce", defaultProps: { columns: "3", colsDesktop: "3", colsTablet: "2", colsMobile: "1", showFilter: true, category: "" }, preview: "🛒 Grid" },
  { type: "product-carousel", label: "Product Carousel", icon: LayoutGrid, group: "Commerce", defaultProps: { heading: "Trending Products", subtext: "Swipe or scroll through our collection", colsDesktop: "4", colsTablet: "2", colsMobile: "1", autoPlay: true, category: "" }, preview: "🎠 Carousel" },
  { type: "price-tag", label: "Price Tag", icon: Award, group: "Commerce", defaultProps: { price: "49", currency: "OMR", period: "/month", highlight: false }, preview: "OMR 49/mo" },
  { type: "cart-button", label: "Add to Cart", icon: ShoppingCart, group: "Commerce", defaultProps: { text: "Add to Cart", productId: "", bgColor: "#10B981" }, preview: "🛒 Add to Cart" },
  { type: "promo-badge", label: "Promo Badge", icon: Award, group: "Commerce", defaultProps: { text: "50% OFF", color: "#DC2626", expiry: "" }, preview: "🔥 SALE" },
  { type: "countdown-timer", label: "Countdown Timer", icon: Timer, group: "Commerce", defaultProps: { endDate: "", label: "Offer ends in:", style: "boxes" }, preview: "⏱ 12:30:00" },
  { type: "checkout-form", label: "Checkout Form", icon: ShoppingCart, group: "Commerce", defaultProps: { heading: "Complete Your Order", submitText: "Pay Now", currency: "OMR" }, preview: "💳 Checkout" },
  // ── Social Proof
  { type: "testimonial", label: "Testimonial", icon: Quote, group: "Social Proof", defaultProps: { quote: "This product changed my business completely!", author: "Ahmed Al-Rashidi", role: "CEO, Tech Solutions", avatar: "", rating: "5" }, preview: "⭐ Testimonial" },
  { type: "rating-stars", label: "Star Rating", icon: Star, group: "Social Proof", defaultProps: { rating: "4.8", count: "247", label: "Customer Rating" }, preview: "★★★★★ 4.8" },
  { type: "review-card", label: "Review Card", icon: Star, group: "Social Proof", defaultProps: { reviewer: "Sarah M.", rating: "5", date: "Sep 2025", text: "Absolutely fantastic experience!" }, preview: "⭐ Review" },
  { type: "trust-badges", label: "Trust Badges", icon: CheckSquare, group: "Social Proof", defaultProps: { items: "Secure Payment|24/7 Support|Free Returns|Certified" }, preview: "✓ Trust" },
  { type: "customer-count", label: "Customer Counter", icon: Users, group: "Social Proof", defaultProps: { count: "10,000+", label: "Happy Customers", icon: "users" }, preview: "👥 10K+" },
  // ── Marketing
  { type: "hero-banner", label: "Hero Banner", icon: Sparkles, group: "Marketing", defaultProps: { heading: "Transform Your Business", subtext: "The all-in-one platform for modern businesses.", buttonText: "Get Started Free", buttonHref: "#", bgColor: "#0d1520", textColor: "#ffffff", minHeight: "500", imageUrl: "" }, preview: "🌟 Hero" },
  { type: "feature-box", label: "Feature Box", icon: Zap, group: "Marketing", defaultProps: { icon: "⚡", heading: "Lightning Fast", text: "Process thousands of requests instantly with zero downtime." }, preview: "⚡ Feature" },
  { type: "stat-counter", label: "Stat Counter", icon: TrendingUp, group: "Marketing", defaultProps: { value: "98%", label: "Satisfaction Rate", prefix: "", suffix: "%" }, preview: "98% Stat" },
  { type: "team-member", label: "Team Member", icon: Users, group: "Marketing", defaultProps: { name: "Mohammed Al-Said", role: "Founder & CEO", bio: "10+ years experience in digital innovation.", avatar: "" }, preview: "👤 Team" },
  { type: "pricing-table", label: "Pricing Table", icon: Award, group: "Marketing", defaultProps: { heading: "Simple Pricing", plan1: "Starter", price1: "Free", plan2: "Pro", price2: "29", plan3: "Enterprise", price3: "99", currency: "OMR" }, preview: "💰 Pricing" },
  { type: "faq-item", label: "FAQ Item", icon: MessageSquare, group: "Marketing", defaultProps: { question: "What makes you different?", answer: "We provide AI-powered automation that saves hours of manual work every day." }, preview: "❓ FAQ" },
  { type: "timeline-item", label: "Timeline", icon: Clock, group: "Marketing", defaultProps: { year: "2024", title: "Milestone", description: "Reached 10,000 customers across the GCC." }, preview: "◉ Timeline" },
  { type: "social-links", label: "Social Links", icon: Share2, group: "Marketing", defaultProps: { whatsapp: "", instagram: "", facebook: "", tiktok: "", twitter: "", youtube: "" }, preview: "🔗 Social" },
  { type: "logo-marquee", label: "Brand Logos", icon: LayoutGrid, group: "Marketing", defaultProps: { logos: "Premium Partner|Verified Seller|Official Agency|Secure Checkout|Global Delivery", colsDesktop: "5", colsTablet: "3", colsMobile: "2" }, preview: "🏢 Logos" },
  // ── Maps & Contact
  { type: "map-embed", label: "Google Map", icon: Map, group: "Contact", defaultProps: { lat: "23.5880", lng: "58.3829", zoom: "14", height: "400", label: "Our Location" }, preview: "📍 Map" },
  { type: "contact-info", label: "Contact Info", icon: Phone, group: "Contact", defaultProps: { phone: "+968 9000 0000", email: "hello@business.com", address: "Muscat, Oman", whatsapp: "" }, preview: "📞 Contact" },
  { type: "business-hours", label: "Business Hours", icon: Clock, group: "Contact", defaultProps: { hours: "Mon-Fri: 9am-6pm\nSat: 10am-4pm\nSun: Closed" }, preview: "🕐 Hours" },
]

const ELEMENT_GROUPS = [...new Set(ELEMENT_DEFS.map(d => d.group))]

// ─── Helper: generate unique ID ──────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9)

// ─── Element Renderer ─────────────────────────────────────────────────────────

function ElementPreview({ el, selected, onClick }: { el: BuilderElement; selected: boolean; onClick: (e: React.MouseEvent) => void }) {
  const def = ELEMENT_DEFS.find(d => d.type === el.type)
  const p = el.props

  const renderContent = () => {
    switch (el.type) {
      case "heading":
        return <div className={`font-bold text-${p.size || "3xl"} text-${p.align || "left"}`} style={{ color: String(p.color || "#111827") }}>{String(p.text)}</div>
      case "subheading":
        return <div className={`font-semibold text-${p.size || "xl"} text-${p.align || "left"}`} style={{ color: String(p.color || "#374151") }}>{String(p.text)}</div>
      case "paragraph":
        return <p className={`text-${p.size || "base"} text-${p.align || "left"} leading-relaxed`} style={{ color: String(p.color || "#6B7280") }}>{String(p.text)}</p>
      case "caption":
        return <p className="text-sm text-center text-stone-400">{String(p.text)}</p>
      case "quote":
        return (
          <blockquote className="border-l-4 border-emerald-500 pl-4 italic">
            <p className="text-stone-700">&ldquo;{String(p.text)}&rdquo;</p>
            {p.author && <footer className="text-xs text-stone-500 mt-1">— {String(p.author)}</footer>}
          </blockquote>
        )
      case "badge-text":
        return <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold bg-${p.color || "green"}-100 text-${p.color || "green"}-800`}>{String(p.text)}</span>
      case "image":
        return p.src
          ? <img src={String(p.src)} alt={String(p.alt || "")} className="w-full rounded" style={{ borderRadius: `${p.borderRadius}px` }} />
          : <div className="w-full h-40 bg-stone-100 border-2 border-dashed border-stone-300 flex items-center justify-center rounded-lg text-stone-400"><Image className="h-8 w-8" /></div>
      case "video-embed":
        return <iframe src={String(p.url)} className="w-full rounded-lg" style={{ height: `${p.height}px` }} allow="autoplay; encrypted-media" allowFullScreen />
      case "divider":
        return <hr style={{ borderColor: String(p.color || "#E5E7EB"), borderTopWidth: `${p.thickness}px`, margin: `${p.margin}px 0` }} />
      case "spacer":
        return <div style={{ height: `${p.height}px` }} />
      case "button":
        return (
          <div className={`text-${p.align || "center"}`}>
            <button className="px-6 py-3 rounded-lg font-semibold text-sm transition hover:opacity-90" style={{ background: String(p.bgColor || "#10B981"), color: String(p.textColor || "#fff"), borderRadius: `${p.borderRadius}px` }}>
              {String(p.text)}
            </button>
          </div>
        )
      case "button-outline":
        return (
          <div className="text-center">
            <button className="px-6 py-3 rounded-lg font-semibold text-sm border-2 transition hover:opacity-80" style={{ borderColor: String(p.borderColor || "#10B981"), color: String(p.textColor || "#10B981") }}>
              {String(p.text)}
            </button>
          </div>
        )
      case "whatsapp-cta":
        return (
          <div className={`text-${p.align || "center"}`}>
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white rounded-xl font-semibold text-sm shadow-sm hover:opacity-90">
              <MessageSquare className="h-4 w-4" />
              {String(p.text)}
            </button>
          </div>
        )
      case "hero-banner":
        return (
          <div className="relative rounded-xl overflow-hidden p-10 text-center" style={{ background: String(p.bgColor || "#0d1520"), minHeight: `${p.minHeight || 400}px` }}>
            {p.imageUrl && <img src={String(p.imageUrl)} className="absolute inset-0 w-full h-full object-cover opacity-30" alt="" />}
            <div className="relative z-10">
              <h2 className="text-3xl font-black text-white mb-3">{String(p.heading)}</h2>
              <p className="text-white/80 mb-6">{String(p.subtext)}</p>
              <button className="px-8 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600">{String(p.buttonText)}</button>
            </div>
          </div>
        )
      case "feature-box":
        return (
          <div className="p-5 rounded-xl border border-stone-200 bg-white">
            <div className="text-3xl mb-3">{String(p.icon)}</div>
            <h4 className="font-bold text-stone-900 mb-1">{String(p.heading)}</h4>
            <p className="text-sm text-stone-500">{String(p.text)}</p>
          </div>
        )
      case "testimonial":
        return (
          <div className="p-6 rounded-xl bg-white border border-stone-200">
            <div className="flex gap-0.5 mb-3">{Array.from({ length: Number(p.rating) }).map((_, i) => <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />)}</div>
            <p className="text-stone-700 italic mb-4">&ldquo;{String(p.quote)}&rdquo;</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-800">{String(p.author).charAt(0)}</div>
              <div>
                <p className="font-semibold text-sm text-stone-900">{String(p.author)}</p>
                <p className="text-xs text-stone-500">{String(p.role)}</p>
              </div>
            </div>
          </div>
        )
      case "contact-form":
        return (
          <div className="p-6 rounded-xl bg-white border border-stone-200">
            <h3 className="font-bold text-stone-900 mb-4">{String(p.heading)}</h3>
            <div className="space-y-3">
              <input className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" placeholder="Your Name" readOnly />
              <input className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" placeholder="Email Address" readOnly />
              <textarea className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" rows={3} placeholder="Your Message" readOnly />
              <button className="w-full bg-emerald-600 text-white rounded-lg py-2 text-sm font-semibold">{String(p.submitText)}</button>
            </div>
          </div>
        )
      case "product-card":
        return (
          <div className="rounded-xl border border-stone-200 bg-white overflow-hidden max-w-sm">
            <div className="h-40 bg-stone-100 flex items-center justify-center relative">
              {p.image ? <img src={String(p.image)} alt={String(p.name)} className="w-full h-full object-cover" /> : <ShoppingCart className="h-10 w-10 text-stone-300" />}
              {p.badge && <span className="absolute top-2 right-2 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{String(p.badge)}</span>}
            </div>
            <div className="p-4">
              <h4 className="font-bold text-stone-900">{String(p.name)}</h4>
              <p className="text-xs text-stone-500 mt-1">{String(p.description)}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="font-black text-emerald-700 text-lg">{String(p.currency)} {String(p.price)}</span>
                <button className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold">{String(p.buttonText)}</button>
              </div>
            </div>
          </div>
        )
      case "product-grid": {
        const dCols = String(p.colsDesktop || p.columns || "3")
        const tCols = String(p.colsTablet || "2")
        const mCols = String(p.colsMobile || "1")
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-black text-stone-900 text-lg">Product Grid</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded font-mono font-semibold">🖥️ {dCols} in row</span>
                  <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded font-mono font-semibold">📱 {mCols} mobile</span>
                  <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded font-mono font-semibold">💻 {tCols} tablet</span>
                </div>
              </div>
              <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full">Live Catalog</span>
            </div>
            <div className={`grid grid-cols-${dCols === "4" ? "4" : dCols === "2" ? "2" : dCols === "5" ? "5" : dCols === "6" ? "6" : "3"} gap-3`}>
              {[1, 2, 3, 4, 5, 6].slice(0, Number(dCols) * 2).map(i => (
                <div key={i} className="rounded-xl border border-stone-200 bg-white overflow-hidden p-3 space-y-2">
                  <div className="h-28 bg-stone-100 rounded-lg flex items-center justify-center text-stone-400">
                    <ShoppingCart className="h-6 w-6 opacity-40" />
                  </div>
                  <p className="font-bold text-xs text-stone-900">Featured Item #{i}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-700">OMR {(i * 15).toFixed(2)}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">Add to Cart</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      }
      case "product-carousel": {
        const dCols = String(p.colsDesktop || "4")
        return (
          <div className="space-y-3 p-4 bg-stone-50/70 rounded-2xl border border-stone-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-black text-stone-900 text-base">{String(p.heading || "Product Carousel / Slider")}</h4>
                <p className="text-xs text-stone-500">{String(p.subtext || "Swipe or scroll products")}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] bg-violet-100 text-violet-800 px-2 py-0.5 rounded-full font-bold">🖥️ {dCols} in row</span>
                <span className="text-[10px] bg-violet-100 text-violet-800 px-2 py-0.5 rounded-full font-bold">📱 {p.colsMobile || "1"} mobile</span>
                <button className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center shadow-xs"><ChevronRight className="h-3.5 w-3.5 rotate-180" /></button>
                <button className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center shadow-xs"><ChevronRight className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex-1 min-w-[180px] rounded-xl border border-stone-200 bg-white p-3 space-y-2 shadow-xs">
                  <div className="h-28 bg-stone-100 rounded-lg flex items-center justify-center text-stone-400">
                    <Sparkles className="h-6 w-6 text-emerald-300" />
                  </div>
                  <p className="font-bold text-xs text-stone-900 truncate">Trending Product #{i}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-700">OMR {(i * 22).toFixed(2)}</span>
                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded">Buy</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      }
      case "image-carousel":
        return (
          <div className="rounded-2xl overflow-hidden border border-stone-200 bg-stone-900 text-white relative h-64 flex flex-col justify-between p-6">
            <div className="flex justify-between items-center z-10">
              <span className="bg-white/20 backdrop-blur-xs text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">Banner Slider</span>
              <div className="flex gap-1.5">
                {[1, 2, 3].map(i => <div key={i} className={`w-2 h-2 rounded-full ${i === 1 ? "bg-white" : "bg-white/40"}`} />)}
              </div>
            </div>
            <div className="z-10 max-w-md space-y-1">
              <h4 className="font-black text-2xl">Visual Image Carousel</h4>
              <p className="text-xs text-stone-300">Auto-playing hero transitions with customized CTA buttons.</p>
            </div>
            <div className="flex justify-between items-center z-10">
              <button className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs">Learn More</button>
              <div className="flex gap-1">
                <span className="p-1 rounded bg-white/20"><ChevronRight className="h-4 w-4 rotate-180" /></span>
                <span className="p-1 rounded bg-white/20"><ChevronRight className="h-4 w-4" /></span>
              </div>
            </div>
          </div>
        )
      case "before-after":
        return (
          <div className="rounded-2xl border border-stone-200 overflow-hidden bg-white p-4 space-y-3">
            <h4 className="font-black text-stone-900 text-base">{String(p.heading || "Before & After Transformation")}</h4>
            <div className="grid grid-cols-2 gap-2 relative">
              <div className="h-40 bg-stone-100 rounded-xl flex items-center justify-center relative overflow-hidden">
                <span className="absolute top-2 left-2 bg-stone-900/80 text-white text-[10px] font-black px-2 py-0.5 rounded">{String(p.beforeLabel || "Before")}</span>
                <span className="text-xs text-stone-400">Original State</span>
              </div>
              <div className="h-40 bg-emerald-50 rounded-xl flex items-center justify-center relative overflow-hidden border border-emerald-200">
                <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded">{String(p.afterLabel || "After")}</span>
                <span className="text-xs text-emerald-700 font-bold">Transformed Result</span>
              </div>
            </div>
          </div>
        )
      case "cta-multi":
        return (
          <div className="rounded-3xl p-8 bg-gradient-to-r from-stone-900 to-stone-800 text-white shadow-xl space-y-4">
            {p.badge && (
              <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold uppercase">
                {String(p.badge)}
              </span>
            )}
            <h3 className="text-2xl sm:text-3xl font-black">{String(p.heading)}</h3>
            <p className="text-stone-300 text-sm">{String(p.subtext)}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button className="px-6 py-3 bg-[#25D366] text-white font-bold rounded-xl text-xs flex items-center gap-2">
                <span>💬</span>
                <span>{String(p.primaryText || "Order on WhatsApp")}</span>
              </button>
              <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs border border-white/20">
                {String(p.secondaryText || "Explore Catalog")}
              </button>
            </div>
          </div>
        )
      case "custom-form":
        return (
          <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4 max-w-xl mx-auto shadow-xs">
            <h4 className="font-black text-stone-900 text-lg">{String(p.heading || "Custom Inquiry Form")}</h4>
            <div className="space-y-3">
              {String(p.fields || "Full Name,WhatsApp Phone,Email,Notes").split(",").map((f, i) => (
                <div key={i} className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">{f.trim()}</label>
                  <input className="w-full text-xs p-2 rounded-lg border border-stone-200 bg-stone-50" placeholder={`Enter ${f.trim()}...`} readOnly />
                </div>
              ))}
              <button className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs">{String(p.submitText || "Submit Inquiry")}</button>
            </div>
          </div>
        )
      case "logo-marquee":
        return (
          <div className="py-4 space-y-2 text-center">
            <p className="text-xs uppercase tracking-widest font-bold text-stone-400">Trusted By Leading Brands</p>
            <div className="flex flex-wrap justify-center items-center gap-4 py-2">
              {String(p.logos || "Brand A|Brand B|Brand C|Brand D").split("|").map((l, i) => (
                <span key={i} className="px-4 py-2 bg-stone-100 rounded-lg text-xs font-bold text-stone-600 border border-stone-200">
                  {l.trim()}
                </span>
              ))}
            </div>
          </div>
        )
      case "cart-button":
        return (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-bold text-xs shadow" style={{ backgroundColor: String(p.bgColor || "#10B981") }}>
            <ShoppingCart className="h-3.5 w-3.5" />
            <span>{String(p.text || "View Cart")}</span>
            <span className="bg-white text-emerald-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">3</span>
          </div>
        )
      case "checkout-form":
        return (
          <div className="p-6 rounded-2xl border border-stone-200 bg-white max-w-lg mx-auto space-y-3 shadow-xs">
            <h4 className="font-black text-stone-900 text-base">{String(p.heading || "Complete Your Order")}</h4>
            <div className="space-y-2">
              <input className="w-full text-xs p-2 rounded-lg border border-stone-200" placeholder="Full Name" readOnly />
              <input className="w-full text-xs p-2 rounded-lg border border-stone-200" placeholder="WhatsApp Phone (+968...)" readOnly />
              <textarea className="w-full text-xs p-2 rounded-lg border border-stone-200" rows={2} placeholder="Delivery address or booking notes..." readOnly />
              <button className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs">{String(p.submitText || "Confirm Order on WhatsApp")}</button>
            </div>
          </div>
        )
      case "price-tag":
        return (
          <div className="inline-flex items-baseline gap-1 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            <span className="text-xs text-stone-500 font-bold">{String(p.currency || "OMR")}</span>
            <span className="text-2xl font-black text-emerald-800">{String(p.price || "49")}</span>
            <span className="text-[11px] text-stone-400">{String(p.period || "/month")}</span>
          </div>
        )
      case "promo-badge":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black text-white shadow-xs" style={{ backgroundColor: String(p.color || "#DC2626") }}>
            <span>🔥</span>
            <span>{String(p.text || "50% OFF LIMITED TIME")}</span>
          </span>
        )
      case "gallery":
        return (
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-stone-100 rounded-lg border border-stone-200 flex items-center justify-center text-xs text-stone-400">
                Gallery Image {i}
              </div>
            ))}
          </div>
        )
      case "accordion":
        return (
          <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
            <div className="p-3.5 flex justify-between items-center bg-stone-50 font-bold text-xs text-stone-800">
              <span>{String(p.question || "Accordion Question")}</span>
              <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
            </div>
            <div className="p-3 text-xs text-stone-600 border-t border-stone-100">{String(p.answer || "Accordion details here.")}</div>
          </div>
        )
      case "tabs":
        return (
          <div className="space-y-2">
            <div className="flex border-b border-stone-200 gap-2">
              {String(p.tabs || "Tab 1|Tab 2|Tab 3").split("|").map((t, idx) => (
                <span key={idx} className={`pb-1.5 px-2 text-xs font-bold border-b-2 ${idx === 0 ? "border-emerald-600 text-emerald-800" : "border-transparent text-stone-400"}`}>
                  {t}
                </span>
              ))}
            </div>
            <div className="p-3 bg-stone-50 rounded-lg text-xs text-stone-500">Active Tab Content Panel</div>
          </div>
        )
      case "breadcrumb":
        return (
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <span>Home</span>
            <ChevronRight className="h-3 w-3 text-stone-400" />
            <span>Store</span>
            <ChevronRight className="h-3 w-3 text-stone-400" />
            <span className="font-bold text-stone-800">Products</span>
          </div>
        )
      case "card":
        return (
          <div className="p-5 rounded-2xl border border-stone-200 bg-white shadow-xs space-y-2">
            <h5 className="font-bold text-sm text-stone-900">Card Container</h5>
            <p className="text-xs text-stone-500">Flexible card element for structured content, banners, and offers.</p>
          </div>
        )
      case "container":
        return (
          <div className="p-6 rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/50 text-center">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Section Container ({p.maxWidth || "1100"}px)</p>
          </div>
        )
      case "customer-count":
        return (
          <div className="inline-flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-stone-200 shadow-xs">
            <Users className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="font-black text-sm text-stone-900">{String(p.count || "10,000+")}</p>
              <p className="text-[10px] text-stone-500">{String(p.label || "Happy Customers")}</p>
            </div>
          </div>
        )
      case "input-field":
      case "textarea-field":
        return (
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 block">{String(p.label || "Input Label")}</label>
            <input className="w-full text-xs p-2 rounded-lg border border-stone-200 bg-white" placeholder={String(p.placeholder || "Enter text...")} readOnly />
          </div>
        )
      case "select-field":
        return (
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 block">{String(p.label || "Select Option")}</label>
            <div className="w-full text-xs p-2 rounded-lg border border-stone-200 bg-white flex justify-between items-center text-stone-500">
              <span>{String(p.options || "Option 1, Option 2").split(",")[0]}</span>
              <ChevronDown className="h-3 w-3" />
            </div>
          </div>
        )
      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="rounded border-stone-300 text-emerald-600" readOnly />
            <span className="text-xs text-stone-700 font-medium">{String(p.label || "I agree to terms and conditions")}</span>
          </div>
        )
      case "pricing-table":
        return (
          <div className="text-center">
            <h3 className="font-black text-2xl text-stone-900 mb-6">{String(p.heading)}</h3>
            <div className="grid grid-cols-3 gap-4">
              {[1,2,3].map(i => (
                <div key={i} className={`p-5 rounded-xl border-2 ${i===2 ? "border-emerald-500 bg-emerald-50" : "border-stone-200 bg-white"}`}>
                  <p className="font-bold text-sm text-stone-700 mb-1">{String(p[`plan${i}` as keyof typeof p])}</p>
                  <p className={`text-3xl font-black mb-1 ${i===2 ? "text-emerald-700" : "text-stone-900"}`}>{String(p[`price${i}` as keyof typeof p])}</p>
                  <p className="text-xs text-stone-500">{String(p.currency)}/mo</p>
                </div>
              ))}
            </div>
          </div>
        )
      case "stat-counter":
        return (
          <div className="text-center p-4">
            <div className="text-4xl font-black text-emerald-700">{String(p.prefix)}{String(p.value)}</div>
            <div className="text-sm text-stone-500 mt-1">{String(p.label)}</div>
          </div>
        )
      case "trust-badges":
        return (
          <div className="flex flex-wrap gap-3 justify-center">
            {String(p.items).split("|").map((item, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 bg-stone-100 px-3 py-1.5 rounded-full">
                <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />{item.trim()}
              </span>
            ))}
          </div>
        )
      case "rating-stars":
        return (
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">{Array.from({length:5}).map((_,i) => <Star key={i} className={`h-5 w-5 ${i < Math.floor(Number(p.rating)) ? "text-amber-400 fill-amber-400" : "text-stone-300"}`} />)}</div>
            <span className="font-bold text-stone-900">{String(p.rating)}</span>
            <span className="text-sm text-stone-500">({String(p.count)} reviews)</span>
          </div>
        )
      case "map-embed":
        return (
          <div className="rounded-xl overflow-hidden border border-stone-200">
            <iframe
              title="map"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(p.lng)-0.01},${Number(p.lat)-0.01},${Number(p.lng)+0.01},${Number(p.lat)+0.01}&layer=mapnik`}
              className="w-full"
              style={{ height: `${p.height || 400}px`, border: "none" }}
            />
          </div>
        )
      case "business-hours":
        return (
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
            <div className="flex items-center gap-2 font-semibold text-stone-800 mb-2"><Clock className="h-4 w-4 text-emerald-600" /> Business Hours</div>
            {String(p.hours).split("\n").map((line, i) => <p key={i} className="text-sm text-stone-600">{line}</p>)}
          </div>
        )
      case "contact-info":
        return (
          <div className="space-y-2 p-4 bg-stone-50 rounded-xl border border-stone-200">
            {p.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-emerald-600" />{String(p.phone)}</div>}
            {p.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-emerald-600" />{String(p.email)}</div>}
            {p.address && <div className="flex items-center gap-2 text-sm"><Map className="h-4 w-4 text-emerald-600" />{String(p.address)}</div>}
          </div>
        )
      case "countdown-timer":
        return (
          <div className="text-center p-4">
            <p className="text-xs text-stone-500 mb-2">{String(p.label)}</p>
            <div className="flex justify-center gap-3">
              {["00", "12", "30", "45"].map((v, i) => (
                <div key={i} className="w-14 h-14 bg-stone-900 text-white rounded-xl flex flex-col items-center justify-center">
                  <span className="font-black text-lg">{v}</span>
                  <span className="text-[9px] text-stone-400">{["Days","Hrs","Min","Sec"][i]}</span>
                </div>
              ))}
            </div>
          </div>
        )
      case "social-links":
        return (
          <div className="flex gap-3 justify-center">
            {p.instagram && <a href={`https://instagram.com/${String(p.instagram)}`} className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">IG</a>}
            {p.facebook && <a href={`https://facebook.com/${String(p.facebook)}`} className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">FB</a>}
            {p.whatsapp && <a href={`https://wa.me/${String(p.whatsapp)}`} className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center text-white text-xs font-bold">WA</a>}
            {p.tiktok && <a href={`https://tiktok.com/@${String(p.tiktok)}`} className="w-9 h-9 rounded-full bg-stone-900 flex items-center justify-center text-white text-xs font-bold">TT</a>}
            {!p.instagram && !p.facebook && !p.whatsapp && !p.tiktok && (
              <span className="text-xs text-stone-400">Configure social links in settings →</span>
            )}
          </div>
        )
      case "navbar":
        return (
          <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-stone-200 rounded-t-xl">
            <span className="font-black text-stone-900">{String(p.logo) || "Your Brand"}</span>
            <div className="flex items-center gap-6 text-sm text-stone-600">
              {String(p.links).split("|").map((l, i) => <span key={i}>{l.trim()}</span>)}
            </div>
            {p.ctaText && <button className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold">{String(p.ctaText)}</button>}
          </div>
        )
      case "two-column":
        return (
          <div className="grid grid-cols-2 gap-4 p-4 bg-stone-50 rounded-xl border-2 border-dashed border-stone-300">
            <div className="h-20 bg-white rounded-lg border border-stone-200 flex items-center justify-center text-xs text-stone-400">Left Column</div>
            <div className="h-20 bg-white rounded-lg border border-stone-200 flex items-center justify-center text-xs text-stone-400">Right Column</div>
          </div>
        )
      case "three-column":
        return (
          <div className="grid grid-cols-3 gap-3 p-4 bg-stone-50 rounded-xl border-2 border-dashed border-stone-300">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-lg border border-stone-200 flex items-center justify-center text-xs text-stone-400">Col {i}</div>)}
          </div>
        )
      case "cta-banner":
        return (
          <div className="p-8 rounded-xl text-center" style={{ background: String(p.bgColor || "#10B981") }}>
            <h3 className="text-2xl font-black text-white mb-2">{String(p.heading)}</h3>
            <p className="text-white/80 mb-5">{String(p.subtext)}</p>
            <button className="px-8 py-3 bg-white text-emerald-700 rounded-xl font-bold">{String(p.buttonText)}</button>
          </div>
        )
      case "faq-item":
        return (
          <div className="border border-stone-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-white cursor-pointer">
              <p className="font-semibold text-stone-900 text-sm">{String(p.question)}</p>
              <ChevronDown className="h-4 w-4 text-stone-400" />
            </div>
            <div className="px-5 pb-4 bg-stone-50 text-sm text-stone-600">{String(p.answer)}</div>
          </div>
        )
      case "team-member":
        return (
          <div className="text-center p-5">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3 font-black text-emerald-800 text-2xl">{String(p.name).charAt(0)}</div>
            <p className="font-bold text-stone-900">{String(p.name)}</p>
            <p className="text-xs text-emerald-600 font-semibold">{String(p.role)}</p>
            <p className="text-xs text-stone-500 mt-2">{String(p.bio)}</p>
          </div>
        )
      case "newsletter-signup":
        return (
          <div className="p-6 bg-stone-900 rounded-xl text-center">
            <h4 className="text-white font-bold mb-1">{String(p.heading)}</h4>
            <p className="text-stone-400 text-xs mb-4">{String(p.note)}</p>
            <div className="flex gap-2">
              <input className="flex-1 rounded-lg px-3 py-2 text-sm bg-stone-800 text-white border border-stone-700" placeholder={String(p.placeholder)} readOnly />
              <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold">{String(p.buttonText)}</button>
            </div>
          </div>
        )
      case "timeline-item":
        return (
          <div className="flex gap-4 items-start">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">{String(p.year).slice(-2)}</div>
              <div className="w-0.5 h-10 bg-emerald-200 mt-1" />
            </div>
            <div>
              <p className="font-bold text-stone-900 text-sm">{String(p.title)}</p>
              <p className="text-xs text-stone-500 mt-0.5">{String(p.description)}</p>
            </div>
          </div>
        )
      default:
        return (
          <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 text-sm text-stone-500 text-center">
            {def?.label || el.type}
          </div>
        )
    }
  }

  return (
    <div
      className={`relative group rounded-lg transition-all cursor-pointer ${selected ? "ring-2 ring-violet-500 ring-offset-2" : "hover:ring-1 hover:ring-stone-300"}`}
      onClick={onClick}
    >
      {/* Drag Handle + controls */}
      <div className={`absolute -top-3 right-0 hidden group-hover:flex items-center gap-1 z-10 ${selected ? "flex" : ""}`}>
        <span className="bg-violet-600 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">{def?.label}</span>
      </div>
      <div className="p-2">{renderContent()}</div>
    </div>
  )
}

// ─── Props Panel ──────────────────────────────────────────────────────────────

function PropsPanel({ el, onChange }: { el: BuilderElement | null; onChange: (id: string, props: Record<string, string | number | boolean>) => void }) {
  if (!el) return (
    <div className="flex-1 flex flex-col items-center justify-center text-stone-400 p-8 text-center">
      <Settings className="h-8 w-8 mb-3 opacity-30" />
      <p className="text-sm font-medium">Select an element</p>
      <p className="text-xs mt-1">Click any element on the canvas to edit its properties</p>
    </div>
  )

  const def = ELEMENT_DEFS.find(d => d.type === el.type)
  const p = el.props

  const set = (key: string, value: string | number | boolean) => {
    onChange(el.id, { ...p, [key]: value })
  }

  const Field = ({ k, label, type = "text", rows = 3 }: { k: string; label: string; type?: string; rows?: number }) => (
    <div className="space-y-1">
      <Label className="text-xs text-stone-500 font-semibold uppercase tracking-wide">{label}</Label>
      {type === "textarea"
        ? <Textarea value={String(p[k] ?? "")} onChange={e => set(k, e.target.value)} rows={rows} className="text-xs" />
        : <Input type={type} value={String(p[k] ?? "")} onChange={e => set(k, type === "number" ? Number(e.target.value) : e.target.value)} className="text-xs h-8" />
      }
    </div>
  )

  const ColorField = ({ k, label }: { k: string; label: string }) => (
    <div className="space-y-1">
      <Label className="text-xs text-stone-500 font-semibold uppercase tracking-wide">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={String(p[k] || "#000000")} onChange={e => set(k, e.target.value)} className="h-8 w-10 rounded border border-stone-200 cursor-pointer" />
        <Input value={String(p[k] || "")} onChange={e => set(k, e.target.value)} className="text-xs h-8 flex-1 font-mono" placeholder="#RRGGBB" />
      </div>
    </div>
  )

  const SelectField = ({ k, label, options }: { k: string; label: string; options: { value: string; label: string }[] }) => (
    <div className="space-y-1">
      <Label className="text-xs text-stone-500 font-semibold uppercase tracking-wide">{label}</Label>
      <Select value={String(p[k] ?? options[0]?.value)} onValueChange={v => set(k, v)}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  )

  const renderFields = () => {
    switch (el.type) {
      case "heading": case "subheading":
        return (<>
          <Field k="text" label="Text" />
          <SelectField k="align" label="Alignment" options={[{value:"left",label:"Left"},{value:"center",label:"Center"},{value:"right",label:"Right"}]} />
          <SelectField k="size" label="Size" options={[{value:"sm",label:"Small"},{value:"xl",label:"Medium"},{value:"2xl",label:"Large"},{value:"3xl",label:"XL"},{value:"4xl",label:"2XL"},{value:"5xl",label:"3XL"}]} />
          <ColorField k="color" label="Color" />
        </>)
      case "paragraph": case "caption":
        return (<>
          <Field k="text" label="Text" type="textarea" rows={4} />
          <SelectField k="align" label="Alignment" options={[{value:"left",label:"Left"},{value:"center",label:"Center"},{value:"right",label:"Right"}]} />
          <ColorField k="color" label="Color" />
        </>)
      case "quote":
        return (<>
          <Field k="text" label="Quote" type="textarea" />
          <Field k="author" label="Author" />
        </>)
      case "image":
        return (<>
          <Field k="src" label="Image URL" />
          <Field k="alt" label="Alt Text" />
          <Field k="borderRadius" label="Border Radius (px)" type="number" />
        </>)
      case "video-embed":
        return (<>
          <Field k="url" label="Embed URL (YouTube/Vimeo)" />
          <Field k="height" label="Height (px)" type="number" />
        </>)
      case "button": case "button-outline":
        return (<>
          <Field k="text" label="Button Text" />
          <Field k="href" label="Link URL" />
          <ColorField k="bgColor" label="Background" />
          <ColorField k="textColor" label="Text Color" />
          <SelectField k="align" label="Alignment" options={[{value:"left",label:"Left"},{value:"center",label:"Center"},{value:"right",label:"Right"}]} />
        </>)
      case "whatsapp-cta":
        return (<>
          <Field k="text" label="Button Text" />
          <Field k="phone" label="WhatsApp Number" />
          <Field k="message" label="Pre-filled Message" type="textarea" />
        </>)
      case "hero-banner":
        return (<>
          <Field k="heading" label="Heading" />
          <Field k="subtext" label="Subtext" type="textarea" />
          <Field k="buttonText" label="Button Text" />
          <Field k="buttonHref" label="Button Link" />
          <Field k="imageUrl" label="Background Image URL" />
          <ColorField k="bgColor" label="Background Color" />
          <Field k="minHeight" label="Min Height (px)" type="number" />
        </>)
      case "feature-box":
        return (<>
          <Field k="icon" label="Emoji Icon" />
          <Field k="heading" label="Heading" />
          <Field k="text" label="Body Text" type="textarea" />
        </>)
      case "testimonial":
        return (<>
          <Field k="quote" label="Quote" type="textarea" />
          <Field k="author" label="Author Name" />
          <Field k="role" label="Role / Company" />
          <SelectField k="rating" label="Rating" options={[1,2,3,4,5].map(n => ({value: String(n), label: `${n} Stars`}))} />
        </>)
      case "contact-form": case "newsletter-signup":
        return (<>
          <Field k="heading" label="Heading" />
          <Field k="submitText" label="Button Text" />
          {el.type === "newsletter-signup" && <Field k="note" label="Note Text" />}
        </>)
      case "product-card":
        return (<>
          <Field k="name" label="Product Name" />
          <Field k="description" label="Description" />
          <Field k="price" label="Price" />
          <Field k="currency" label="Currency" />
          <Field k="buttonText" label="Button Text" />
        </>)
      case "pricing-table":
        return (<>
          <Field k="heading" label="Heading" />
          <Field k="currency" label="Currency" />
          <Field k="plan1" label="Plan 1 Name" /><Field k="price1" label="Plan 1 Price" />
          <Field k="plan2" label="Plan 2 Name" /><Field k="price2" label="Plan 2 Price" />
          <Field k="plan3" label="Plan 3 Name" /><Field k="price3" label="Plan 3 Price" />
        </>)
      case "stat-counter":
        return (<>
          <Field k="value" label="Value" />
          <Field k="label" label="Label" />
          <Field k="prefix" label="Prefix" />
          <Field k="suffix" label="Suffix" />
        </>)
      case "map-embed":
        return (<>
          <Field k="lat" label="Latitude" />
          <Field k="lng" label="Longitude" />
          <Field k="height" label="Height (px)" type="number" />
        </>)
      case "contact-info":
        return (<>
          <Field k="phone" label="Phone" />
          <Field k="email" label="Email" />
          <Field k="address" label="Address" />
          <Field k="whatsapp" label="WhatsApp" />
        </>)
      case "business-hours":
        return <Field k="hours" label="Hours (one per line)" type="textarea" rows={5} />
      case "spacer":
        return <Field k="height" label="Height (px)" type="number" />
      case "divider":
        return (<>
          <ColorField k="color" label="Color" />
          <Field k="thickness" label="Thickness (px)" type="number" />
          <Field k="margin" label="Margin (px)" type="number" />
        </>)
      case "countdown-timer":
        return (<>
          <Field k="label" label="Label" />
          <Field k="endDate" label="End Date (ISO)" />
        </>)
      case "social-links":
        return (<>
          <Field k="whatsapp" label="WhatsApp Number" />
          <Field k="instagram" label="Instagram Handle" />
          <Field k="facebook" label="Facebook Page" />
          <Field k="tiktok" label="TikTok Handle" />
          <Field k="twitter" label="X / Twitter Handle" />
        </>)
      case "cta-banner":
        return (<>
          <Field k="heading" label="Heading" />
          <Field k="subtext" label="Subtext" />
          <Field k="buttonText" label="Button Text" />
          <Field k="buttonHref" label="Button Link" />
          <ColorField k="bgColor" label="Background Color" />
        </>)
      case "navbar":
        return (<>
          <Field k="logo" label="Brand / Logo Text" />
          <Field k="links" label="Nav Links (pipe separated)" />
          <Field k="ctaText" label="CTA Button Text" />
          <Field k="ctaHref" label="CTA Button Link" />
          <ColorField k="bgColor" label="Background Color" />
        </>)
      case "trust-badges":
        return <Field k="items" label="Badges (pipe separated)" />
      case "rating-stars":
        return (<>
          <Field k="rating" label="Rating (0-5)" />
          <Field k="count" label="Review Count" />
          <Field k="label" label="Label" />
        </>)
      case "faq-item":
        return (<>
          <Field k="question" label="Question" />
          <Field k="answer" label="Answer" type="textarea" />
        </>)
      case "team-member":
        return (<>
          <Field k="name" label="Name" />
          <Field k="role" label="Role" />
          <Field k="bio" label="Bio" type="textarea" />
          <Field k="avatar" label="Avatar URL" />
        </>)
      case "timeline-item":
        return (<>
          <Field k="year" label="Year / Date" />
          <Field k="title" label="Title" />
          <Field k="description" label="Description" type="textarea" />
        </>)
      case "badge-text":
        return (<>
          <Field k="text" label="Badge Text" />
          <SelectField k="color" label="Color" options={[{value:"green",label:"Green"},{value:"blue",label:"Blue"},{value:"amber",label:"Amber"},{value:"rose",label:"Rose"},{value:"purple",label:"Purple"},{value:"stone",label:"Grey"}]} />
        </>)
      case "link":
        return (<>
          <Field k="text" label="Link Text" />
          <Field k="href" label="URL" />
          <ColorField k="color" label="Color" />
        </>)
      case "whatsapp-cta":
        return (<>
          <Field k="text" label="Button Text" />
          <Field k="phone" label="Phone Number" />
          <Field k="message" label="Pre-filled Message" type="textarea" />
        </>)
      case "customer-count":
        return (<>
          <Field k="count" label="Count" />
          <Field k="label" label="Label" />
        </>)
      case "product-grid":
        return (<>
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-700">Responsive Grid Layout</p>
            <SelectField k="colsDesktop" label="🖥️ Desktop: Products per Row" options={[{ value: "1", label: "1 in row" }, { value: "2", label: "2 in row" }, { value: "3", label: "3 in row" }, { value: "4", label: "4 in row" }, { value: "5", label: "5 in row" }, { value: "6", label: "6 in row" }]} />
            <SelectField k="colsTablet" label="💻 Tablet: Products per Row" options={[{ value: "1", label: "1 in row" }, { value: "2", label: "2 in row" }, { value: "3", label: "3 in row" }, { value: "4", label: "4 in row" }]} />
            <SelectField k="colsMobile" label="📱 Mobile: Products per Row" options={[{ value: "1", label: "1 in row (Single column)" }, { value: "2", label: "2 in row (Compact dual)" }]} />
          </div>
          <Field k="category" label="Category Filter (Optional)" />
        </>)
      case "product-carousel":
        return (<>
          <Field k="heading" label="Section Heading" />
          <Field k="subtext" label="Subtext" />
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-700">Responsive Carousel View</p>
            <SelectField k="colsDesktop" label="🖥️ Desktop: Items Visible" options={[{ value: "2", label: "2 Items" }, { value: "3", label: "3 Items" }, { value: "4", label: "4 Items" }, { value: "5", label: "5 Items" }, { value: "6", label: "6 Items" }]} />
            <SelectField k="colsTablet" label="💻 Tablet: Items Visible" options={[{ value: "1", label: "1 Item" }, { value: "2", label: "2 Items" }, { value: "3", label: "3 Items" }]} />
            <SelectField k="colsMobile" label="📱 Mobile: Items Visible" options={[{ value: "1", label: "1 Item (Full swipe)" }, { value: "2", label: "2 Items (Dual)" }]} />
          </div>
          <Field k="category" label="Category Filter (Optional)" />
        </>)
      case "image-carousel":
        return (<>
          <Field k="slides" label="Slide Image URLs (Pipe separated)" type="textarea" />
          <Field k="height" label="Slider Height (px)" />
        </>)
      case "cta-multi":
        return (<>
          <Field k="badge" label="Top Badge Text" />
          <Field k="heading" label="Heading" />
          <Field k="subtext" label="Subtext" type="textarea" />
          <Field k="primaryText" label="Primary Action Text (WhatsApp)" />
          <Field k="secondaryText" label="Secondary Action Text" />
        </>)
      case "custom-form":
        return (<>
          <Field k="heading" label="Form Heading" />
          <Field k="submitText" label="Button Text" />
          <Field k="fields" label="Field Labels (Comma separated)" />
        </>)
      case "logo-marquee":
        return (<>
          <Field k="logos" label="Brand Names (Pipe separated)" type="textarea" />
          <SelectField k="colsDesktop" label="🖥️ Desktop: Logos per Row" options={[{ value: "3", label: "3 Logos" }, { value: "4", label: "4 Logos" }, { value: "5", label: "5 Logos" }, { value: "6", label: "6 Logos" }]} />
          <SelectField k="colsTablet" label="💻 Tablet: Logos per Row" options={[{ value: "2", label: "2 Logos" }, { value: "3", label: "3 Logos" }, { value: "4", label: "4 Logos" }]} />
          <SelectField k="colsMobile" label="📱 Mobile: Logos per Row" options={[{ value: "1", label: "1 Logo" }, { value: "2", label: "2 Logos" }, { value: "3", label: "3 Logos" }]} />
        </>)
      case "before-after":
        return (<>
          <Field k="heading" label="Heading" />
          <Field k="beforeLabel" label="Before Label" />
          <Field k="afterLabel" label="After Label" />
        </>)
      case "cart-button":
        return (<>
          <Field k="text" label="Button Text" />
          <ColorField k="bgColor" label="Button Color" />
        </>)
      case "checkout-form":
        return (<>
          <Field k="heading" label="Form Heading" />
          <Field k="submitText" label="Submit Button Text" />
          <Field k="currency" label="Currency" />
        </>)
      case "price-tag":
        return (<>
          <Field k="price" label="Price" />
          <Field k="currency" label="Currency" />
          <Field k="period" label="Billing Period (e.g. /mo)" />
        </>)
      case "promo-badge":
        return (<>
          <Field k="text" label="Badge Text" />
          <ColorField k="color" label="Background Color" />
        </>)
      case "accordion":
        return (<>
          <Field k="question" label="Question" />
          <Field k="answer" label="Answer" type="textarea" />
        </>)
      case "tabs":
        return <Field k="tabs" label="Tab Titles (Pipe separated)" />
      case "container":
        return (<>
          <Field k="maxWidth" label="Max Width (px)" />
          <Field k="padding" label="Padding (px)" />
          <ColorField k="bgColor" label="Background Color" />
        </>)
      case "card":
        return (<>
          <Field k="padding" label="Padding (px)" />
          <ColorField k="bgColor" label="Background Color" />
          <ColorField k="borderColor" label="Border Color" />
        </>)
      case "input-field":
      case "textarea-field":
        return (<>
          <Field k="label" label="Input Label" />
          <Field k="placeholder" label="Placeholder Text" />
        </>)
      case "select-field":
        return (<>
          <Field k="label" label="Select Label" />
          <Field k="options" label="Options (Comma separated)" />
        </>)
      case "checkbox":
        return <Field k="label" label="Checkbox Label" />
      default:
        return <p className="text-xs text-stone-400">No configurable properties for this element.</p>
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <span className="text-sm">{def?.preview}</span>
          <span className="font-bold text-sm text-stone-900">{def?.label}</span>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {renderFields()}
      </div>
    </div>
  )
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function WebsiteBuilderView() {
  const [elements, setElements] = useState<BuilderElement[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [previewMode, setPreviewMode] = useState(false)
  const [activeGroup, setActiveGroup] = useState("Text")
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishedAt, setPublishedAt] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [tenantSlug, setTenantSlug] = useState<string>("oman-adventures")

  // ── Save draft to API (with localStorage fallback)
  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/website-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elements }),
      })
      if (!res.ok) throw new Error("API save failed")
      // Mirror to localStorage for instant reload
      localStorage.setItem("wb_elements", JSON.stringify(elements))
      toast.success("Draft saved!")
    } catch {
      localStorage.setItem("wb_elements", JSON.stringify(elements))
      toast.success("Draft saved locally")
    } finally {
      setSaving(false)
    }
  }

  // ── Publish: promote draft → live
  const publish = async () => {
    setPublishing(true)
    try {
      // Save draft first
      await fetch("/api/website-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elements }),
      })
      // Then publish
      const res = await fetch("/api/website-builder/publish", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Publish failed")
      setPublishedAt(data.publishedAt)
      toast.success("🎉 Website published! It's now live on your customer site.")
    } catch (err: any) {
      toast.error(err?.message || "Publish failed")
    } finally {
      setPublishing(false)
    }
  }

  const unpublish = async () => {
    if (!confirm("Are you sure you want to unpublish? Your storefront will immediately revert to the classic booking catalog.")) return
    setPublishing(true)
    try {
      const res = await fetch("/api/website-builder/publish", { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Unpublish failed")
      setPublishedAt(null)
      toast.success("Website unpublished! Live storefront reverted to classic catalog.")
    } catch (err: any) {
      toast.error(err?.message || "Unpublish failed")
    } finally {
      setPublishing(false)
    }
  }

  // ── Load from API on mount (localStorage as instant cache)
  useEffect(() => {
    // 1. Show local cache immediately so the canvas isn't blank
    try {
      const local = localStorage.getItem("wb_elements")
      if (local) {
        const parsed = JSON.parse(local) as BuilderElement[]
        setElements(parsed)
        setHistoryStack([parsed])
      }
    } catch {}

    // 2. Fetch from API (authoritative)
    fetch("/api/website-builder")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.elements) && data.elements.length > 0) {
          setElements(data.elements)
          setHistoryStack([data.elements])
          localStorage.setItem("wb_elements", JSON.stringify(data.elements))
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true))

    // 3. Check publish status
    fetch("/api/website-builder/publish")
      .then(r => r.json())
      .then(d => { if (d.publishedAt) setPublishedAt(d.publishedAt) })
      .catch(() => {})

    // 4. Fetch tenant info
    fetch("/api/settings")
      .then(r => r.json())
      .then(d => {
        if (d.tenant_slug || d.slug) setTenantSlug(d.tenant_slug || d.slug)
      })
      .catch(() => {})
  }, [])

  const [dragOver, setDragOver] = useState<string | null>(null)
  const [dragType, setDragType] = useState<ElementType | null>(null)
  const [historyStack, setHistoryStack] = useState<BuilderElement[][]>([[]])
  const [historyIdx, setHistoryIdx] = useState(0)
  const [search, setSearch] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const canvasRef = useRef<HTMLDivElement>(null)

  const selectedEl = elements.find(e => e.id === selectedId) ?? null

  // ── History
  const pushHistory = useCallback((els: BuilderElement[]) => {
    setHistoryStack(prev => {
      const cut = prev.slice(0, historyIdx + 1)
      return [...cut, els]
    })
    setHistoryIdx(prev => prev + 1)
  }, [historyIdx])

  const undo = () => {
    if (historyIdx <= 0) return
    setHistoryIdx(prev => prev - 1)
    setElements(historyStack[historyIdx - 1])
  }
  const redo = () => {
    if (historyIdx >= historyStack.length - 1) return
    setHistoryIdx(prev => prev + 1)
    setElements(historyStack[historyIdx + 1])
  }

  // ── AI Website Builder state & generator
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiBusinessName, setAiBusinessName] = useState("")
  const [aiIndustry, setAiIndustry] = useState("ecommerce")
  const [aiStyle, setAiStyle] = useState("emerald-luxury")
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiGenerating, setAiGenerating] = useState(false)

  const generateWithAi = async () => {
    setAiGenerating(true)
    try {
      const res = await fetch("/api/website-builder/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: aiBusinessName.trim() || (tenantSlug ? tenantSlug.replace(/-/g, " ") : "Premium Brand"),
          industry: aiIndustry,
          style: aiStyle,
          prompt: aiPrompt.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Generation failed")
      if (Array.isArray(data.elements) && data.elements.length > 0) {
        setElements(data.elements)
        pushHistory(data.elements)
        localStorage.setItem("wb_elements", JSON.stringify(data.elements))
        toast.success(`✨ AI Website generated! (${data.elements.length} elements)`)
        setAiModalOpen(false)
      } else {
        toast.error("No elements returned by AI generator")
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate website")
    } finally {
      setAiGenerating(false)
    }
  }

  // ── AI Copilot In-line Edits & Translation
  const [aiChatPrompt, setAiChatPrompt] = useState("")

  const handleAiCopilotEdit = async (customPrompt?: string) => {
    const textToUse = (customPrompt || aiChatPrompt).trim()
    if (!textToUse) return
    setAiGenerating(true)
    try {
      const res = await fetch("/api/website-builder/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "edit",
          prompt: textToUse,
          currentElements: elements,
          businessName: aiBusinessName.trim() || (tenantSlug ? tenantSlug.replace(/-/g, " ") : "Premium Store"),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Edit failed")
      if (Array.isArray(data.elements) && data.elements.length > 0) {
        setElements(data.elements)
        pushHistory(data.elements)
        localStorage.setItem("wb_elements", JSON.stringify(data.elements))
        toast.success(`✨ ${data.summary || "Website updated by AI!"}`)
        setAiChatPrompt("")
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update website with AI")
    } finally {
      setAiGenerating(false)
    }
  }

  const handleAiTranslateArabic = async () => {
    setAiGenerating(true)
    try {
      const res = await fetch("/api/website-builder/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "translate_ar",
          currentElements: elements,
          businessName: aiBusinessName.trim() || (tenantSlug ? tenantSlug.replace(/-/g, " ") : "متجرنا"),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Translation failed")
      if (Array.isArray(data.elements) && data.elements.length > 0) {
        setElements(data.elements)
        pushHistory(data.elements)
        localStorage.setItem("wb_elements", JSON.stringify(data.elements))
        toast.success("🌍 تم ترجمة الموقع وتفعيل العربية بنجاح!")
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to translate website")
    } finally {
      setAiGenerating(false)
    }
  }

  // ── Add element at position
  const addElement = (type: ElementType, afterId?: string) => {
    const def = ELEMENT_DEFS.find(d => d.type === type)!
    const newEl: BuilderElement = { id: uid(), type, props: { ...def.defaultProps } }
    setElements(prev => {
      let next: BuilderElement[]
      if (afterId) {
        const idx = prev.findIndex(e => e.id === afterId)
        next = [...prev.slice(0, idx + 1), newEl, ...prev.slice(idx + 1)]
      } else {
        next = [...prev, newEl]
      }
      pushHistory(next)
      return next
    })
    setSelectedId(newEl.id)
  }

  // ── Delete element
  const deleteEl = (id: string) => {
    setElements(prev => {
      const next = prev.filter(e => e.id !== id)
      pushHistory(next)
      return next
    })
    if (selectedId === id) setSelectedId(null)
  }

  // ── Move element
  const moveEl = (id: string, dir: "up" | "down") => {
    setElements(prev => {
      const idx = prev.findIndex(e => e.id === id)
      if (idx < 0) return prev
      if (dir === "up" && idx === 0) return prev
      if (dir === "down" && idx === prev.length - 1) return prev
      const next = [...prev]
      const swap = dir === "up" ? idx - 1 : idx + 1
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      pushHistory(next)
      return next
    })
  }

  // ── Update element props
  const updateProps = (id: string, props: Record<string, string | number | boolean>) => {
    setElements(prev => {
      const next = prev.map(e => e.id === id ? { ...e, props } : e)
      pushHistory(next)
      return next
    })
  }

  // ── Drag from palette
  const handlePaletteDragStart = (type: ElementType) => {
    setDragType(type)
  }
  const handleCanvasDrop = (e: React.DragEvent, afterId?: string) => {
    e.preventDefault()
    if (dragType) {
      addElement(dragType, afterId)
      setDragType(null)
    }
    setDragOver(null)
  }



  const filteredDefs = ELEMENT_DEFS.filter(d =>
    (search ? d.label.toLowerCase().includes(search.toLowerCase()) || d.group.toLowerCase().includes(search.toLowerCase()) : d.group === activeGroup)
  )

  const viewportWidth = viewport === "mobile" ? "max-w-[390px]" : viewport === "tablet" ? "max-w-[768px]" : "max-w-full"

  return (
    <div className="flex h-full overflow-hidden bg-stone-100">
      {/* ── LEFT: Element Palette ── */}
      {sidebarOpen && !previewMode && (
        <div className="w-64 bg-white border-r border-stone-200 flex flex-col shrink-0">
          {/* Header */}
          <div className="p-3 border-b border-stone-100">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-4 w-4 text-violet-600" />
              <span className="font-bold text-sm text-stone-900">Elements</span>
              <Badge className="ml-auto text-[10px] bg-violet-100 text-violet-700 border-violet-200">{ELEMENT_DEFS.length}+</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search elements..." className="pl-8 h-7 text-xs" />
            </div>
          </div>

          {/* Group Tabs */}
          {!search && (
            <div className="border-b border-stone-100 overflow-x-auto">
              <div className="flex gap-0 p-1">
                {ELEMENT_GROUPS.map(g => (
                  <button key={g} onClick={() => setActiveGroup(g)} className={`px-2.5 py-1 rounded text-[10px] font-semibold whitespace-nowrap transition cursor-pointer ${activeGroup === g ? "bg-violet-100 text-violet-700" : "text-stone-500 hover:text-stone-700"}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Element List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredDefs.map(def => {
              const Icon = def.icon
              return (
                <div
                  key={def.type}
                  draggable
                  onDragStart={() => handlePaletteDragStart(def.type)}
                  onClick={() => addElement(def.type)}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-violet-50 cursor-pointer transition group"
                >
                  <div className="w-7 h-7 rounded-md bg-stone-100 flex items-center justify-center group-hover:bg-violet-100">
                    <Icon className="h-3.5 w-3.5 text-stone-500 group-hover:text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-700">{def.label}</p>
                    <p className="text-[10px] text-stone-400">{def.preview}</p>
                  </div>
                  <GripVertical className="h-3 w-3 text-stone-300 ml-auto opacity-0 group-hover:opacity-100" />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── CENTER: Canvas ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="h-12 bg-white border-b border-stone-200 flex items-center gap-2 px-4 shrink-0">
          <button onClick={() => setSidebarOpen(p => !p)} className="p-1.5 rounded text-stone-500 hover:bg-stone-100 transition cursor-pointer" title="Toggle sidebar">
            <PanelLeft className="h-4 w-4" />
          </button>
          <div className="w-px h-5 bg-stone-200 mx-1" />
          <button onClick={undo} disabled={historyIdx <= 0} className="p-1.5 rounded text-stone-500 hover:bg-stone-100 disabled:opacity-30 transition cursor-pointer" title="Undo"><Undo2 className="h-4 w-4" /></button>
          <button onClick={redo} disabled={historyIdx >= historyStack.length - 1} className="p-1.5 rounded text-stone-500 hover:bg-stone-100 disabled:opacity-30 transition cursor-pointer" title="Redo"><Redo2 className="h-4 w-4" /></button>
          <div className="w-px h-5 bg-stone-200 mx-1" />
          {/* Viewport selector */}
          <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5">
            {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as const).map(([v, Icon]) => (
              <button key={v} onClick={() => setViewport(v)} className={`p-1.5 rounded-md transition cursor-pointer ${viewport === v ? "bg-white shadow-xs text-violet-600" : "text-stone-500 hover:text-stone-700"}`} title={v}>
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-stone-200 mx-1" />
          <button onClick={() => setPreviewMode(p => !p)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${previewMode ? "bg-violet-100 text-violet-700" : "text-stone-600 hover:bg-stone-100"}`}>
            {previewMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {previewMode ? "Edit Mode" : "Preview"}
          </button>

          <div className="ml-auto flex items-center gap-2">
            {publishedAt ? (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-1 rounded-md border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live on Homepage
                </span>
                <a
                  href={`/shop/${tenantSlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg font-bold transition shadow-xs cursor-pointer"
                  title="Open live customer website in new tab"
                >
                  <Globe className="h-3.5 w-3.5 text-emerald-600" />
                  <span>View Live</span>
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
                <Button
                  onClick={unpublish}
                  disabled={publishing}
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 text-xs font-semibold text-rose-700 hover:text-rose-800 border-rose-200 hover:bg-rose-50 gap-1 cursor-pointer"
                  title="Revert live storefront back to classic catalog"
                >
                  <RotateCcw className="h-3 w-3 text-rose-500" />
                  <span>Unpublish</span>
                </Button>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-1 rounded-md border border-stone-200">
                Classic Storefront Active
              </span>
            )}
            <span className="text-xs text-stone-400">{elements.length} element{elements.length !== 1 ? "s" : ""}</span>
            <Button
              onClick={() => setAiModalOpen(true)}
              size="sm"
              className="h-8 px-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold gap-1.5 shadow-sm cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
              <span>AI Builder</span>
            </Button>
            <Button onClick={save} disabled={saving || publishing} size="sm" className="h-8 px-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold gap-1.5 cursor-pointer">
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save Draft"}
            </Button>
            <Button onClick={publish} disabled={publishing || saving || elements.length === 0} size="sm" className="h-8 px-3 bg-stone-900 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold gap-1.5 cursor-pointer">
              <Globe className="h-3.5 w-3.5" />
              {publishing ? "Publishing…" : "Publish"}
            </Button>
          </div>

        </div>

        {/* ── AI Copilot Bar ── */}
        <div className="bg-gradient-to-r from-violet-50/90 via-indigo-50/40 to-white border-b border-violet-100 px-4 py-2 flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-violet-700 font-bold text-xs shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-violet-600 animate-pulse" />
            <span>AI Copilot:</span>
          </div>
          <div className="flex-1 relative">
            <Input
              value={aiChatPrompt}
              onChange={e => setAiChatPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAiCopilotEdit() }}
              placeholder="e.g. Add a 20% sale banner, add customer reviews, change theme to luxury gold, add WhatsApp form..."
              className="h-7.5 px-3 bg-white border-violet-200 text-xs placeholder:text-stone-400 focus-visible:ring-violet-500 shadow-2xs"
            />
          </div>
          <Button
            size="sm"
            onClick={() => handleAiCopilotEdit()}
            disabled={aiGenerating || !aiChatPrompt.trim()}
            className="h-7.5 px-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
          >
            {aiGenerating ? "Generating…" : "Apply with AI"}
          </Button>

          <div className="hidden lg:flex items-center gap-1.5 border-l border-violet-200 pl-2">
            <button
              type="button"
              onClick={() => handleAiTranslateArabic()}
              disabled={aiGenerating}
              className="px-2 py-1 rounded bg-white hover:bg-violet-100 text-[11px] font-bold text-violet-700 border border-violet-200 transition cursor-pointer shadow-2xs"
              title="Translate entire website to Arabic"
            >
              العربية 🌍
            </button>
            <button
              type="button"
              onClick={() => handleAiCopilotEdit("Add 4 customer reviews with 5 star ratings and testimonials")}
              disabled={aiGenerating}
              className="px-2 py-1 rounded bg-white hover:bg-violet-100 text-[11px] font-semibold text-stone-600 border border-stone-200 transition cursor-pointer shadow-2xs"
            >
              + Reviews ⭐
            </button>
            <button
              type="button"
              onClick={() => handleAiCopilotEdit("Add a 25% discount flash sale countdown banner")}
              disabled={aiGenerating}
              className="px-2 py-1 rounded bg-white hover:bg-violet-100 text-[11px] font-semibold text-stone-600 border border-stone-200 transition cursor-pointer shadow-2xs"
            >
              + Flash Sale 🔥
            </button>
            <button
              type="button"
              onClick={() => handleAiCopilotEdit("Add a custom WhatsApp booking form")}
              disabled={aiGenerating}
              className="px-2 py-1 rounded bg-white hover:bg-violet-100 text-[11px] font-semibold text-stone-600 border border-stone-200 transition cursor-pointer shadow-2xs"
            >
              + WhatsApp Form 💬
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className={`mx-auto ${viewportWidth} transition-all duration-300`}>
            {elements.length === 0 && (
              <div
                className="min-h-[60vh] rounded-2xl border-2 border-dashed border-stone-300 bg-white flex flex-col items-center justify-center text-center p-12"
                onDragOver={e => { e.preventDefault(); setDragOver("canvas") }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => handleCanvasDrop(e)}
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/20 flex items-center justify-center mb-4">
                  <Sparkles className="h-7 w-7 text-violet-600" />
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-2">Build your website with AI or manually</h3>
                <p className="text-sm text-stone-500 mb-6 max-w-sm">Generate a complete high-converting storefront in seconds, or drag elements from the left panel.</p>

                <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                  <button
                    onClick={() => setAiModalOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    <span>Generate with AI</span>
                  </button>
                </div>

                <p className="text-xs text-stone-400 font-semibold uppercase tracking-wider mb-3">Or quick-start with an element:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {["hero-banner", "feature-box", "testimonial", "contact-form", "product-card"].map(t => {
                    const def = ELEMENT_DEFS.find(d => d.type === t as ElementType)!
                    return (
                      <button key={t} onClick={() => addElement(t as ElementType)} className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-violet-50 hover:text-violet-700 rounded-lg text-xs font-semibold text-stone-600 transition cursor-pointer">
                        {def.preview}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Render elements */}
            <div
              ref={canvasRef}
              className="bg-white rounded-2xl shadow-sm border border-stone-200 min-h-[200px] overflow-hidden"
              onDragOver={e => { e.preventDefault(); setDragOver("end") }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => handleCanvasDrop(e)}
            >
              {elements.map((el, idx) => (
                <div key={el.id} className="relative">
                  {/* Drop zone above */}
                  <div
                    className={`h-1 transition-all ${dragOver === `before-${el.id}` ? "h-8 bg-violet-100 border-2 border-dashed border-violet-400 rounded-lg mx-4" : ""}`}
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(`before-${el.id}`) }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={e => { e.stopPropagation(); handleCanvasDrop(e, elements[idx - 1]?.id) }}
                  />

                  {/* Element */}
                  <div className="relative px-4 py-2">
                    <ElementPreview
                      el={el}
                      selected={selectedId === el.id}
                      onClick={e => { e.stopPropagation(); if (!previewMode) setSelectedId(el.id) }}
                    />

                    {/* Controls */}
                    {selectedId === el.id && !previewMode && (
                      <div className="absolute top-0 right-6 flex items-center gap-1 z-20">
                        <button onClick={() => moveEl(el.id, "up")} disabled={idx === 0} className="p-1 rounded bg-white border border-stone-200 shadow-xs hover:bg-stone-100 disabled:opacity-30 cursor-pointer"><ChevronUp className="h-3 w-3" /></button>
                        <button onClick={() => moveEl(el.id, "down")} disabled={idx === elements.length - 1} className="p-1 rounded bg-white border border-stone-200 shadow-xs hover:bg-stone-100 disabled:opacity-30 cursor-pointer"><ChevronDown className="h-3 w-3" /></button>
                        <button onClick={() => deleteEl(el.id)} className="p-1 rounded bg-red-50 border border-red-200 shadow-xs hover:bg-red-100 text-red-600 cursor-pointer"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Bottom drop zone when canvas has elements */}
              {elements.length > 0 && (
                <div
                  className={`h-4 mx-4 mb-4 mt-2 rounded-lg transition-all ${dragOver === "end" ? "h-12 border-2 border-dashed border-violet-400 bg-violet-50" : ""}`}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver("end") }}
                  onDrop={e => handleCanvasDrop(e)}
                />
              )}
            </div>

            {/* Add element at bottom shortcut */}
            {!previewMode && elements.length > 0 && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => addElement("paragraph")}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition cursor-pointer shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Element
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Properties Panel ── */}
      {!previewMode && (
        <div className="w-72 bg-white border-l border-stone-200 flex flex-col shrink-0">
          <div className="p-3 border-b border-stone-100 flex items-center gap-2">
            <Settings className="h-4 w-4 text-stone-400" />
            <span className="font-bold text-sm text-stone-900">Properties</span>
            {selectedEl && (
              <button onClick={() => setSelectedId(null)} className="ml-auto p-0.5 text-stone-400 hover:text-stone-600 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
            )}
          </div>
          <PropsPanel el={selectedEl} onChange={updateProps} />
        </div>
      )}

      {/* ── AI Website Builder Dialog ── */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-stone-900">AI Website Builder</DialogTitle>
                <DialogDescription className="text-xs text-stone-500">
                  Generate a complete high-converting, mobile-responsive website tailored to your business in seconds.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Business Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-stone-700">Business or Brand Name</Label>
              <Input
                placeholder="e.g. Oman Adventures / Al-Bahr Cafe"
                value={aiBusinessName}
                onChange={e => setAiBusinessName(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            {/* Industry Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-stone-700">Business Industry / Type</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: "ecommerce", label: "🛍️ E-Commerce", desc: "Products, cart & offers" },
                  { id: "tours", label: "🐪 Tours & Tourism", desc: "Packages & excursions" },
                  { id: "restaurant", label: "🍽️ Restaurant & Cafe", desc: "Menus & online orders" },
                  { id: "services", label: "💼 Services & Agency", desc: "Consulting & quotes" },
                  { id: "clinic", label: "🏥 Clinic & Health", desc: "Appointments & doctors" },
                  { id: "realestate", label: "🏢 Real Estate", desc: "Properties & listings" },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAiIndustry(item.id)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      aiIndustry === item.id
                        ? "border-violet-600 bg-violet-50/60 ring-2 ring-violet-500/20"
                        : "border-stone-200 hover:border-stone-300 bg-white"
                    }`}
                  >
                    <p className="text-xs font-bold text-stone-900">{item.label}</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme & Palette */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-stone-700">Visual Theme & Style</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "emerald-luxury", label: "Emerald Luxury", desc: "Oman signature green & gold" },
                  { id: "modern-clean", label: "Modern Slate", desc: "High contrast clean tech" },
                  { id: "warm-sunset", label: "Warm Sunset", desc: "Amber & terracotta tones" },
                  { id: "dark-minimal", label: "Dark Mode", desc: "Sleek premium dark theme" },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAiStyle(item.id)}
                    className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                      aiStyle === item.id
                        ? "border-violet-600 bg-violet-50/60 ring-1 ring-violet-500"
                        : "border-stone-200 hover:border-stone-300 bg-white"
                    }`}
                  >
                    <p className="text-xs font-semibold text-stone-800">{item.label}</p>
                    <p className="text-[10px] text-stone-400">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Prompt */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-stone-700">Custom Prompt or Special Requirements (Optional)</Label>
              <Textarea
                placeholder="e.g. Focus on desert safari camping in Wahiba Sands, 2-day beach tours, WhatsApp instant booking, and showcase customer reviews from Muscat..."
                rows={3}
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                className="text-xs"
              />
              <p className="text-[10px] text-stone-400">Our AI synthesizer automatically constructs heroes, carousels, responsive product grids, testimonials, pricing, and WhatsApp checkout forms.</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAiModalOpen(false)}
              disabled={aiGenerating}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={generateWithAi}
              disabled={aiGenerating}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs gap-1.5 cursor-pointer shadow-sm"
            >
              {aiGenerating ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Synthesizing Website…</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>Generate Website</span>
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

