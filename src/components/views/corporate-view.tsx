"use client"

import { useState, useEffect } from "react"
import {
  Building2, Plus, Search, Filter, Phone, MessageSquare, MapPin,
  FileText, CheckCircle2, Clock, Sparkles, ArrowUpRight, Upload,
  ExternalLink, Layers, RefreshCw, Send, ShieldCheck, Eye, HelpCircle,
  Sliders, Info, Trash2, Edit3, Printer, Share2, Copy, Check, Download,
  X, ChevronRight, FileSpreadsheet, PlusCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useApp } from "@/lib/store"

interface Quote {
  id: string
  flowName: string
  status: string
  createdAt: string
  updatedAt: string
  customerName: string
  customerPhone: string
  projectLocation: string
  productType: string
  projectDetails: string
  mediaUploads: string
  notes: string
  quotedAmount: number | null
  conversationId?: string | null
  rawAnswers?: Record<string, any>
}

interface Stats {
  total: number
  new: number
  reviewing: number
  quoted: number
  won: number
}

interface ArchitecturalProduct {
  id: string
  title: string
  subtitle: string
  desc: string
  specs: string[]
  profiles: string
  badge: string
}

interface FacilityLocation {
  id: string
  name: string
  type: string
  address: string
  desc: string
  capabilities: string
  hours: string
  mapUrl: string
  phone: string
}

interface ArchitecturalFaq {
  id: string
  q: string
  a: string
  category: string
}

interface CompanyProfile {
  companyName: string
  tagline: string
  crNumber: string
  vatNumber: string
  address: string
  phone: string
  email: string
  website: string
  currency: string
  terms: string
}

const DEFAULT_PRODUCTS: ArchitecturalProduct[] = [
  {
    id: "p1",
    title: "Thermal Break Aluminium Windows & Doors",
    subtitle: "High-Performance Sliding, Pivot & Folding Systems",
    desc: "Specially engineered with reinforced polyamide insulating bars to prevent thermal bridging in Oman's extreme summer climate. Available in minimal slim profiles, lift & slide, and bi-folding patio doors.",
    specs: ["Qualicoat Class 2 Architectural Powder Coating", "Multi-point perimeter locking", "Acoustic insulation up to 42 dB", "Air & water tightness tested"],
    profiles: "Technal, Schuco, Gutmann & Premium Omani Extrusions",
    badge: "Best Seller",
  },
  {
    id: "p2",
    title: "Double & Triple Glazed Structural Glass",
    subtitle: "Solar Control, Acoustic & Safety Glazing",
    desc: "Automated fabrication of Insulated Glass Units (IGU) utilizing high-efficiency Low-E coatings, Argon gas filling, and warm-edge spacers for minimal solar heat gain (SHGC) and ultra-low U-values.",
    specs: ["U-Value below 1.3 W/m²K", "Tempered & laminated safety glass", "Spider glass & structural point-fixed fittings", "Ceramic frit sun-shading options"],
    profiles: "Saint-Gobain, Guardian & AGC certified",
    badge: "Energy Saving",
  },
  {
    id: "p3",
    title: "Curtain Wall & Facade Systems",
    subtitle: "Commercial Envelopes & Luxury Villa Facades",
    desc: "Stick-built and unitized architectural facade systems engineered to withstand Gulf wind load dynamics, thermal expansion, and seismic requirements with seamless aesthetic glass views.",
    specs: ["Capped and semi-unitized curtain wall", "Thermal pressure plate assembly", "Integrated facade LED channels & louvers", "Full perimeter EPDM weather seals"],
    profiles: "Custom architectural profiles up to 6m spans",
    badge: "Commercial & Luxury",
  },
  {
    id: "p4",
    title: "Motorized Louvers, Pergolas & Skylights",
    subtitle: "Architectural Outdoor Living & Shading Systems",
    desc: "Heavy-duty extruded aluminium pergolas featuring motorized rotating louvers, integrated rain drainage gutters, LED lighting strips, and automated weather sensor integration.",
    specs: ["100% waterproof interlocking louvers", "Concealed structural drainage", "Somfy motorized automation", "Wind resistant up to 120 km/h"],
    profiles: "Heavy structural T6 aluminium alloys",
    badge: "Outdoor Living",
  },
  {
    id: "p5",
    title: "Glass Balustrades & Frameless Partitions",
    subtitle: "Interior Partitions, Balconies & Shower Enclosures",
    desc: "Modern minimalist glass balustrades featuring concealed bottom shoe channels, stainless steel handrails, and customized acoustic interior office partitions.",
    specs: ["12mm to 21.52mm SentryGlas laminated glass", "Tested to 1.5 kN/m line load compliance", "Zero obstructive vertical posts", "Anti-fingerprint nano coatings"],
    profiles: "Anodized Architectural Aluminium Shoes",
    badge: "Minimalist",
  },
]

const DEFAULT_LOCATIONS: FacilityLocation[] = [
  {
    id: "loc1",
    name: "Main Manufacturing Facility & Plant",
    type: "Factory",
    address: "Rusayl Industrial City, Muscat Governorate, Oman 🇴🇲",
    desc: "Advanced industrial manufacturing unit equipped with CNC automated cutting centers, double-glazing line, structural silicone sealant application, and automated crimping for thermal break profiles.",
    capabilities: "1,500+ sqm monthly output · Qualicoat Class 2 · ISO 9001 certified",
    hours: "Saturday – Thursday, 7:30 AM – 5:30 PM",
    mapUrl: "https://maps.google.com/?q=Rusayl+Industrial+City+Muscat",
    phone: "+968 2444 6000",
  },
  {
    id: "loc2",
    name: "Architectural Experience Showroom",
    type: "Showroom",
    address: "Sultan Qaboos Highway, Al Ghubrah / Azaiba, Muscat 🇴🇲",
    desc: "Full-scale working display centre where architects, interior designers, villa owners, and contractors can test actual full-height sliding systems, minimalist pivot entrance doors, automated pergolas, and acoustic glazing.",
    capabilities: "15+ live full-size mockups · Senior Architectural Estimation Engineers on-site",
    hours: "Saturday – Thursday, 8:30 AM – 1:00 PM & 4:30 PM – 8:30 PM",
    mapUrl: "https://maps.google.com/?q=Muscat+Oman",
    phone: "+968 2450 1234",
  },
]

const DEFAULT_FAQS: ArchitecturalFaq[] = [
  {
    id: "faq1",
    q: "Why are Thermal Break aluminium profiles necessary in Oman?",
    a: "Standard aluminium is an excellent thermal conductor. In Oman where ambient summer temperatures exceed 45°C, standard frames conduct heat into your villa, forcing air conditioning to work continuously and causing frame condensation. Thermal break profiles include a structural polyamide barrier that blocks heat transmission, reducing indoor cooling costs by up to 35%.",
    category: "Technical",
  },
  {
    id: "faq2",
    q: "What is the warranty on EMADI powder coating in coastal areas?",
    a: "We apply Qualicoat Class 2 Architectural Grade powder coatings with high UV and salt-spray resistance. Our coatings carry a 15 to 20-year warranty against fading, chalking, and coastal corrosion in Oman's seaside climate.",
    category: "Warranty",
  },
  {
    id: "faq3",
    q: "What is the standard fabrication and installation timeline?",
    a: "For residential villas, manufacturing requires 3 to 4 weeks following final approved site measurements and shop drawings. Installation is executed by our certified teams in coordination with your main civil contractor.",
    category: "Operations",
  },
  {
    id: "faq4",
    q: "Can clients provide their own architectural CAD or PDF drawings for estimation?",
    a: "Yes! Clients can send architectural elevations, window & door schedules, and AutoCAD or PDF files directly via our WhatsApp chatbot or through our estimation engineering desk for an itemized quotation within 24 to 48 hours.",
    category: "Quotations",
  },
  {
    id: "faq5",
    q: "Do you supply minimal slim-frame sliding glass doors?",
    a: "Yes. Our minimal sliding systems feature an ultra-slim central interlock profile of just 20mm to 25mm, recessed bottom threshold tracks flush with your interior flooring, and panoramic floor-to-ceiling glass up to 4 meters high.",
    category: "Products",
  },
]

const OMAN_WILAYATS = [
  "Muscat (Seeb)",
  "Muscat (Bawshar / Al Khuwair)",
  "Muscat (Azaiba / Ghubrah)",
  "Muscat (Mawaleh / Al Hail)",
  "Muscat (Qurum / Madinat Qaboos)",
  "Muscat (Al Amerat)",
  "Al Batinah North (Sohar)",
  "Al Batinah South (Barka)",
  "Al Batinah South (Al Rustaq)",
  "Ad Dakhiliyah (Nizwa)",
  "Dhofar (Salalah)",
  "Ash Sharqiyah (Sur)",
  "Al Dhahirah (Ibri)",
  "Al Buraimi",
  "Musandam (Khasab)",
  "Other Wilayat in Oman",
]

export default function CorporateView() {
  const { setView } = useApp()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, new: 0, reviewing: 0, quoted: 0, won: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [activeTab, setActiveTab] = useState("rfqs")

  // Catalog, locations & faqs state
  const [products, setProducts] = useState<ArchitecturalProduct[]>(DEFAULT_PRODUCTS)
  const [locations, setLocations] = useState<FacilityLocation[]>(DEFAULT_LOCATIONS)
  const [faqs, setFaqs] = useState<ArchitecturalFaq[]>(DEFAULT_FAQS)
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
    companyName: "EMADI Architectural Systems",
    tagline: "Aluminium, Structural Glass & Architectural Systems in Oman",
    crNumber: "CR-1284902",
    vatNumber: "OM1100234567",
    address: "Rusayl Industrial Estate & Al Khuwair Showroom, Muscat, Sultanate of Oman",
    phone: "+968 9123 4567",
    email: "projects@emadi.om",
    website: "https://emadi.om",
    currency: "OMR",
    terms: "1. Quotation validity: 30 days from date of issuance.\n2. Payment terms: 50% advance on confirmation, 40% on delivery of materials to site, 10% on completion of installation.\n3. Warranty: 15-20 years on Qualicoat Class 2 architectural powder coating; 5 years against hermetic seal failure in IGU double glazed units.\n4. Delivery: 3 to 4 weeks from approved shop drawings and site clearance.",
  })
  const [savingSettings, setSavingSettings] = useState(false)

  // Selected quote modal
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [editingStatus, setEditingStatus] = useState("")
  const [editingNotes, setEditingNotes] = useState("")
  const [editingAmount, setEditingAmount] = useState("")
  const [savingQuote, setSavingQuote] = useState(false)

  // Formal Quotation Print / Estimate modal
  const [quoteToPrint, setQuoteToPrint] = useState<Quote | null>(null)

  // 1. New quote modal
  const [showNewModal, setShowNewModal] = useState(false)
  const [newName, setNewName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newCompany, setNewCompany] = useState("")
  const [newLocation, setNewLocation] = useState("Muscat (Seeb)")
  const [newProduct, setNewProduct] = useState("Thermal Break Aluminium Windows & Doors")
  const [newProfileSeries, setNewProfileSeries] = useState("Technal Soleal 55 Thermal Break")
  const [newArea, setNewArea] = useState("")
  const [newDetails, setNewDetails] = useState("")
  const [newAmount, setNewAmount] = useState("")
  const [newStatus, setNewStatus] = useState("NEW")
  const [newDrawings, setNewDrawings] = useState("")
  const [newNotes, setNewNotes] = useState("")
  const [creatingQuote, setCreatingQuote] = useState(false)

  // 2. Product Modal (Add / Edit)
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ArchitecturalProduct | null>(null)
  const [prodTitle, setProdTitle] = useState("")
  const [prodSubtitle, setProdSubtitle] = useState("")
  const [prodBadge, setProdBadge] = useState("New System")
  const [prodDesc, setProdDesc] = useState("")
  const [prodSpecs, setProdSpecs] = useState("")
  const [prodProfiles, setProdProfiles] = useState("")

  // 3. Location Modal (Add / Edit)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState<FacilityLocation | null>(null)
  const [locName, setLocName] = useState("")
  const [locType, setLocType] = useState("Showroom")
  const [locAddress, setLocAddress] = useState("")
  const [locDesc, setLocDesc] = useState("")
  const [locCapabilities, setLocCapabilities] = useState("")
  const [locHours, setLocHours] = useState("")
  const [locPhone, setLocPhone] = useState("")
  const [locMapUrl, setLocMapUrl] = useState("")

  // 4. FAQ Modal (Add / Edit)
  const [showFaqModal, setShowFaqModal] = useState(false)
  const [editingFaq, setEditingFaq] = useState<ArchitecturalFaq | null>(null)
  const [faqQ, setFaqQ] = useState("")
  const [faqA, setFaqA] = useState("")
  const [faqCategory, setFaqCategory] = useState("Technical")

  // Flow status & deploy
  const [flowInstalled, setFlowInstalled] = useState(false)
  const [flowDeploying, setFlowDeploying] = useState(false)

  const loadQuotes = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "ALL") params.set("status", statusFilter)
      if (search) params.set("search", search)
      const res = await fetch(`/api/corporate/quotes?${params.toString()}`)
      const data = await res.json()
      if (data.quotes) setQuotes(data.quotes)
      if (data.stats) setStats(data.stats)
    } catch {
      toast.error("Failed to load quotation requests")
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/corporate/settings")
      if (res.ok) {
        const data = await res.json()
        if (data.products && Array.isArray(data.products) && data.products.length > 0) setProducts(data.products)
        if (data.locations && Array.isArray(data.locations) && data.locations.length > 0) setLocations(data.locations)
        if (data.faqs && Array.isArray(data.faqs) && data.faqs.length > 0) setFaqs(data.faqs)
        if (data.profile) setCompanyProfile(data.profile)
      }
    } catch {}
  }

  const saveSettingsToDb = async (updated: {
    products?: ArchitecturalProduct[]
    locations?: FacilityLocation[]
    faqs?: ArchitecturalFaq[]
    profile?: CompanyProfile
  }) => {
    setSavingSettings(true)
    try {
      const res = await fetch("/api/corporate/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: updated.products || products,
          locations: updated.locations || locations,
          faqs: updated.faqs || faqs,
          profile: updated.profile || companyProfile,
        }),
      })
      if (!res.ok) throw new Error("Could not save settings")
      toast.success("Corporate catalog updated successfully")
    } catch (e: any) {
      toast.error(e?.message || "Failed to update catalog")
    } finally {
      setSavingSettings(false)
    }
  }

  const checkFlow = async () => {
    try {
      const res = await fetch("/api/corporate/flow")
      const data = await res.json()
      setFlowInstalled(data.installed)
    } catch {}
  }

  useEffect(() => {
    loadQuotes()
    loadSettings()
    checkFlow()
  }, [statusFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadQuotes()
  }

  const deployFlow = async () => {
    setFlowDeploying(true)
    try {
      const res = await fetch("/api/corporate/flow", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Deployment failed")
      toast.success("EMADI Architectural 10-Step Flow deployed & activated!")
      setFlowInstalled(true)
    } catch (e: any) {
      toast.error(e?.message || "Failed to deploy bot flow")
    } finally {
      setFlowDeploying(false)
    }
  }

  const openQuoteDetails = (quote: Quote) => {
    setSelectedQuote(quote)
    setEditingStatus(quote.status)
    setEditingNotes(quote.notes || "")
    setEditingAmount(quote.quotedAmount ? quote.quotedAmount.toString() : "")
  }

  const saveQuoteChanges = async () => {
    if (!selectedQuote) return
    setSavingQuote(true)
    try {
      const res = await fetch("/api/corporate/quotes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedQuote.id,
          status: editingStatus,
          notes: editingNotes,
          quotedAmount: editingAmount ? parseFloat(editingAmount) : null,
        }),
      })
      if (!res.ok) throw new Error("Could not update quotation")
      toast.success("Quotation updated successfully")
      setSelectedQuote(null)
      loadQuotes()
    } catch (e: any) {
      toast.error(e?.message || "Failed to update quotation")
    } finally {
      setSavingQuote(false)
    }
  }

  const deleteQuote = async (id: string) => {
    if (!confirm("Are you sure you want to delete this quotation request?")) return
    try {
      const res = await fetch(`/api/corporate/quotes?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Quotation deleted successfully")
      if (selectedQuote?.id === id) setSelectedQuote(null)
      loadQuotes()
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete quotation")
    }
  }

  // 1. Submit Manual RFQ / Quote
  const createManualQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName || !newPhone) {
      toast.error("Please provide client name and phone number")
      return
    }
    setCreatingQuote(true)
    try {
      const scopeSummary = [
        newDetails.trim(),
        newProfileSeries ? `Profile Series: ${newProfileSeries}` : "",
        newArea ? `Scope/Area: ${newArea}` : "",
        newCompany ? `Company/Contractor: ${newCompany}` : "",
        newEmail ? `Email: ${newEmail}` : "",
      ].filter(Boolean).join(" · ")

      const res = await fetch("/api/corporate/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: newName.trim(),
          customerPhone: newPhone.trim(),
          projectLocation: newLocation,
          productType: newProduct,
          projectDetails: scopeSummary,
          drawings: newDrawings.trim(),
          notes: newNotes.trim(),
          quotedAmount: newAmount ? parseFloat(newAmount) : null,
          status: newStatus,
        }),
      })
      if (!res.ok) throw new Error("Failed to create quotation request")
      toast.success("New RFQ & estimate logged successfully")
      setShowNewModal(false)
      setNewName("")
      setNewPhone("")
      setNewEmail("")
      setNewCompany("")
      setNewArea("")
      setNewDetails("")
      setNewAmount("")
      setNewDrawings("")
      setNewNotes("")
      loadQuotes()
    } catch (e: any) {
      toast.error(e?.message || "Failed to create quote")
    } finally {
      setCreatingQuote(false)
    }
  }

  // 2. Product Management
  const openNewProductModal = () => {
    setEditingProduct(null)
    setProdTitle("")
    setProdSubtitle("")
    setProdBadge("Architectural System")
    setProdDesc("")
    setProdSpecs("Qualicoat Class 2 Architectural Powder Coating\nMulti-point perimeter locking\nAcoustic & Thermal Insulation Tested")
    setProdProfiles("Technal, Schuco, Gutmann & Premium Omani Extrusions")
    setShowProductModal(true)
  }

  const openEditProductModal = (p: ArchitecturalProduct) => {
    setEditingProduct(p)
    setProdTitle(p.title)
    setProdSubtitle(p.subtitle)
    setProdBadge(p.badge || "System")
    setProdDesc(p.desc)
    setProdSpecs(Array.isArray(p.specs) ? p.specs.join("\n") : "")
    setProdProfiles(p.profiles || "")
    setShowProductModal(true)
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prodTitle.trim()) {
      toast.error("System title is required")
      return
    }

    const specsArray = prodSpecs
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean)

    let updatedList: ArchitecturalProduct[]
    if (editingProduct) {
      updatedList = products.map(p =>
        p.id === editingProduct.id
          ? {
              ...p,
              title: prodTitle.trim(),
              subtitle: prodSubtitle.trim(),
              badge: prodBadge.trim(),
              desc: prodDesc.trim(),
              specs: specsArray,
              profiles: prodProfiles.trim(),
            }
          : p
      )
    } else {
      const newP: ArchitecturalProduct = {
        id: `p-${Date.now()}`,
        title: prodTitle.trim(),
        subtitle: prodSubtitle.trim(),
        badge: prodBadge.trim(),
        desc: prodDesc.trim(),
        specs: specsArray,
        profiles: prodProfiles.trim(),
      }
      updatedList = [...products, newP]
    }

    setProducts(updatedList)
    setShowProductModal(false)
    await saveSettingsToDb({ products: updatedList })
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this architectural system from your catalogue?")) return
    const updated = products.filter(p => p.id !== id)
    setProducts(updated)
    await saveSettingsToDb({ products: updated })
  }

  // 3. Location Management
  const openNewLocationModal = () => {
    setEditingLocation(null)
    setLocName("")
    setLocType("Showroom")
    setLocAddress("Muscat, Sultanate of Oman")
    setLocDesc("")
    setLocCapabilities("Live mockups and architectural consultants on-site")
    setLocHours("Saturday – Thursday, 8:30 AM – 1:00 PM & 4:30 PM – 8:30 PM")
    setLocPhone("+968 ")
    setLocMapUrl("https://maps.google.com/?q=Muscat+Oman")
    setShowLocationModal(true)
  }

  const openEditLocationModal = (loc: FacilityLocation) => {
    setEditingLocation(loc)
    setLocName(loc.name)
    setLocType(loc.type)
    setLocAddress(loc.address)
    setLocDesc(loc.desc)
    setLocCapabilities(loc.capabilities)
    setLocHours(loc.hours)
    setLocPhone(loc.phone)
    setLocMapUrl(loc.mapUrl)
    setShowLocationModal(true)
  }

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!locName.trim()) {
      toast.error("Facility name is required")
      return
    }

    let updatedList: FacilityLocation[]
    if (editingLocation) {
      updatedList = locations.map(l =>
        l.id === editingLocation.id
          ? {
              ...l,
              name: locName.trim(),
              type: locType,
              address: locAddress.trim(),
              desc: locDesc.trim(),
              capabilities: locCapabilities.trim(),
              hours: locHours.trim(),
              phone: locPhone.trim(),
              mapUrl: locMapUrl.trim(),
            }
          : l
      )
    } else {
      const newLoc: FacilityLocation = {
        id: `loc-${Date.now()}`,
        name: locName.trim(),
        type: locType,
        address: locAddress.trim(),
        desc: locDesc.trim(),
        capabilities: locCapabilities.trim(),
        hours: locHours.trim(),
        phone: locPhone.trim(),
        mapUrl: locMapUrl.trim(),
      }
      updatedList = [...locations, newLoc]
    }

    setLocations(updatedList)
    setShowLocationModal(false)
    await saveSettingsToDb({ locations: updatedList })
  }

  const handleDeleteLocation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this facility location?")) return
    const updated = locations.filter(l => l.id !== id)
    setLocations(updated)
    await saveSettingsToDb({ locations: updated })
  }

  // 4. FAQ Management
  const openNewFaqModal = () => {
    setEditingFaq(null)
    setFaqQ("")
    setFaqA("")
    setFaqCategory("Technical")
    setShowFaqModal(true)
  }

  const openEditFaqModal = (f: ArchitecturalFaq) => {
    setEditingFaq(f)
    setFaqQ(f.q)
    setFaqA(f.a)
    setFaqCategory(f.category || "Technical")
    setShowFaqModal(true)
  }

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!faqQ.trim() || !faqA.trim()) {
      toast.error("Question and answer are required")
      return
    }

    let updatedList: ArchitecturalFaq[]
    if (editingFaq) {
      updatedList = faqs.map(f =>
        f.id === editingFaq.id
          ? { ...f, q: faqQ.trim(), a: faqA.trim(), category: faqCategory }
          : f
      )
    } else {
      const newFaq: ArchitecturalFaq = {
        id: `faq-${Date.now()}`,
        q: faqQ.trim(),
        a: faqA.trim(),
        category: faqCategory,
      }
      updatedList = [...faqs, newFaq]
    }

    setFaqs(updatedList)
    setShowFaqModal(false)
    await saveSettingsToDb({ faqs: updatedList })
  }

  const handleDeleteFaq = async (id: string) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) return
    const updated = faqs.filter(f => f.id !== id)
    setFaqs(updated)
    await saveSettingsToDb({ faqs: updated })
  }

  // Share quote via WhatsApp
  const shareQuoteViaWhatsApp = (q: Quote) => {
    const phone = q.customerPhone ? q.customerPhone.replace(/\D/g, "") : ""
    const ref = `EMADI-RFQ-${q.id.slice(-6).toUpperCase()}`
    const amt = q.quotedAmount ? `${q.quotedAmount.toFixed(3)} OMR` : "in final estimation"
    const text = `السلام عليكم ورحمة الله وبركاته ${q.customerName}،\n\nتحية طيبة من شركة عمادي للأنظمة المعمارية والألمنيوم 🇴🇲.\n\nبخصوص طلب عرض السعر رقم (${ref}):\n• النظام المطلوب: ${q.productType}\n• الموقع: ${q.projectLocation}\n• المبلغ التقديري: ${amt}\n\nيسر فريقنا الهندسي تزويدكم بتفاصيل المواصفات الفنية وجداول الكميات. للاستفسار أو زيارة صالة العرض يسعدنا التواصل معكم.`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank")
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-sky-900 via-blue-900 to-indigo-950 text-white p-6 rounded-2xl shadow-sm border border-sky-800">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Corporate &amp; Architectural Systems</h1>
                <Badge className="bg-sky-500/20 text-sky-200 border-sky-400/30 text-[10px] font-semibold">
                  EMADI WORKFLOW
                </Badge>
              </div>
              <p className="text-xs text-sky-200">
                Aluminium, Structural Glass &amp; Architectural Systems in the Sultanate of Oman 🇴🇲
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={deployFlow}
            disabled={flowDeploying}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9 shadow-sm"
          >
            {flowDeploying ? (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            )}
            {flowInstalled ? "Re-Sync EMADI 10-Step Flow" : "Deploy EMADI 10-Step Flow"}
          </Button>

          <Button
            onClick={() => setShowNewModal(true)}
            className="bg-sky-500 hover:bg-sky-400 text-white text-xs h-9 font-semibold shadow-sm"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Log Manual RFQ
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <Card className="bg-white border-stone-200 shadow-2xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Total RFQs</div>
            <div className="text-2xl font-bold text-stone-900 mt-1">{stats.total}</div>
            <div className="text-[10px] text-stone-400 mt-0.5">All received inquiries</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-stone-200 shadow-2xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">New Inbound</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{stats.new}</div>
            <div className="text-[10px] text-stone-400 mt-0.5">Pending estimation</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-stone-200 shadow-2xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">Under Review</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{stats.reviewing}</div>
            <div className="text-[10px] text-stone-400 mt-0.5">Engineering evaluation</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-stone-200 shadow-2xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-purple-600">Quotation Sent</div>
            <div className="text-2xl font-bold text-purple-600 mt-1">{stats.quoted}</div>
            <div className="text-[10px] text-stone-400 mt-0.5">Offers in negotiation</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-stone-200 shadow-2xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Projects Won</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.won}</div>
            <div className="text-[10px] text-stone-400 mt-0.5">Contract signed</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-stone-100 p-1 rounded-xl flex-wrap h-auto">
          <TabsTrigger value="rfqs" className="text-xs font-semibold px-4 py-2">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Quotation Requests (RFQs)
          </TabsTrigger>
          <TabsTrigger value="products" className="text-xs font-semibold px-4 py-2">
            <Layers className="h-3.5 w-3.5 mr-1.5" />
            Architectural Systems Catalogue
          </TabsTrigger>
          <TabsTrigger value="locations" className="text-xs font-semibold px-4 py-2">
            <MapPin className="h-3.5 w-3.5 mr-1.5" />
            Factory &amp; Showrooms
          </TabsTrigger>
          <TabsTrigger value="faqs" className="text-xs font-semibold px-4 py-2">
            <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
            Architectural FAQs
          </TabsTrigger>
          <TabsTrigger value="workflow" className="text-xs font-semibold px-4 py-2">
            <Sliders className="h-3.5 w-3.5 mr-1.5" />
            EMADI Bot Workflow Settings
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: RFQs & Quotations ── */}
        <TabsContent value="rfqs" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-stone-200">
            <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-80">
              <div className="relative w-full">
                <Search className="h-3.5 w-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search client, phone, location..."
                  className="pl-8 h-8 text-xs bg-stone-50"
                />
              </div>
              <Button type="submit" size="sm" variant="ghost" className="h-8 text-xs">
                Filter
              </Button>
            </form>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
                <span className="text-stone-400 mr-1 hidden sm:inline">Status:</span>
                {["ALL", "NEW", "REVIEWING", "QUOTED", "WON"].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      statusFilter === st
                        ? "bg-stone-900 text-white shadow-2xs"
                        : "text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <Button
                onClick={() => setShowNewModal(true)}
                size="sm"
                className="h-8 text-xs bg-sky-600 hover:bg-sky-500 text-white font-semibold shrink-0"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                New RFQ
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-stone-400 text-xs">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-sky-600" />
              Loading architectural quotation requests...
            </div>
          ) : quotes.length === 0 ? (
            <Card className="bg-white border-stone-200 py-12 text-center shadow-2xs">
              <CardContent className="space-y-3">
                <div className="h-12 w-12 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-stone-900">No Quotation Requests Found</h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    Inbound project details, drawing uploads, and quote requests from the WhatsApp EMADI workflow will appear here automatically.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    onClick={() => setShowNewModal(true)}
                    size="sm"
                    className="bg-sky-600 hover:bg-sky-700 text-white text-xs h-8"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Log Manual RFQ
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quotes.map(q => (
                <Card
                  key={q.id}
                  className="bg-white border-stone-200 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-bold text-stone-900 truncate">
                          {q.customerName}
                        </CardTitle>
                        <CardDescription className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-stone-400 shrink-0" />
                          <span>{q.customerPhone || "No phone"}</span>
                        </CardDescription>
                      </div>
                      <Badge
                        className={`text-[10px] font-bold ${
                          q.status === "NEW"
                            ? "bg-amber-100 text-amber-800 border-amber-200"
                            : q.status === "REVIEWING"
                            ? "bg-blue-100 text-blue-800 border-blue-200"
                            : q.status === "QUOTED"
                            ? "bg-purple-100 text-purple-800 border-purple-200"
                            : q.status === "WON"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {q.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 space-y-2.5 text-xs flex-1">
                    <div className="bg-stone-50 p-2.5 rounded-lg space-y-1.5 border border-stone-100">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-500 flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-stone-400" />
                          System:
                        </span>
                        <span className="font-semibold text-stone-800 truncate max-w-[170px] text-right">
                          {q.productType}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-stone-400" />
                          Location:
                        </span>
                        <span className="font-medium text-stone-700 truncate">
                          {q.projectLocation}
                        </span>
                      </div>

                      {q.quotedAmount && (
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-stone-200">
                          <span className="text-emerald-700 font-medium">Quoted Total:</span>
                          <span className="font-bold text-emerald-700">{q.quotedAmount.toFixed(3)} OMR</span>
                        </div>
                      )}
                    </div>

                    {q.projectDetails && (
                      <p className="text-stone-600 text-[11px] line-clamp-2 italic">
                        &ldquo;{q.projectDetails}&rdquo;
                      </p>
                    )}

                    {q.mediaUploads && (
                      <div className="flex items-center gap-1 text-[10px] text-sky-700 bg-sky-50 px-2 py-1 rounded">
                        <Upload className="h-3 w-3" />
                        <span>Drawings/Media: {q.mediaUploads}</span>
                      </div>
                    )}
                  </CardContent>

                  <div className="p-4 pt-0">
                    <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                      <span className="text-[10px] text-stone-400">
                        {new Date(q.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>

                      <div className="flex items-center gap-1">
                        {q.customerPhone && (
                          <button
                            onClick={() => shareQuoteViaWhatsApp(q)}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition"
                            title="Share Quote on WhatsApp"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <Button
                          onClick={() => setQuoteToPrint(q)}
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] px-2 text-stone-600 hover:text-stone-900"
                          title="Generate Printable Quotation Letter"
                        >
                          <Printer className="h-3 w-3 mr-1" />
                          Estimate
                        </Button>
                        <Button
                          onClick={() => openQuoteDetails(q)}
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] px-2 text-sky-700 border-sky-200 hover:bg-sky-50"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Manage
                        </Button>
                        <button
                          onClick={() => deleteQuote(q.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition"
                          title="Delete Request"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 2: Architectural Products & Systems ── */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-stone-200">
            <div>
              <h2 className="text-sm font-bold text-stone-900">Architectural Systems Catalogue</h2>
              <p className="text-xs text-stone-500">
                Custom catalogue for aluminium windows, doors, facades, and structural glass in Oman.
              </p>
            </div>
            <Button
              onClick={openNewProductModal}
              size="sm"
              className="bg-sky-600 hover:bg-sky-500 text-white text-xs h-8 font-semibold shrink-0"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add New System
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map(item => (
              <Card key={item.id} className="bg-white border-stone-200 shadow-2xs flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold text-stone-900">{item.title}</CardTitle>
                      <CardDescription className="text-xs text-sky-700 font-medium mt-0.5">
                        {item.subtitle}
                      </CardDescription>
                    </div>
                    <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[10px]">
                      {item.badge}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3 text-xs flex-1">
                  <p className="text-stone-600 text-xs leading-relaxed">{item.desc}</p>
                  <div className="space-y-1 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                    <div className="text-[10px] font-bold uppercase text-stone-500">Key Specifications:</div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-stone-700">
                      {item.specs.map((s, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-[11px] text-stone-500">
                    <strong>Profiles:</strong> {item.profiles}
                  </div>
                </CardContent>
                <div className="p-4 pt-0 border-t border-stone-100 mt-2 flex items-center justify-end gap-1.5">
                  <Button
                    onClick={() => openEditProductModal(item)}
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2 text-stone-600 hover:text-stone-900"
                  >
                    <Edit3 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDeleteProduct(item.id)}
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── TAB 3: Factory & Showrooms ── */}
        <TabsContent value="locations" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-stone-200">
            <div>
              <h2 className="text-sm font-bold text-stone-900">Factory &amp; Showroom Locations</h2>
              <p className="text-xs text-stone-500">
                Manufacturing plants, fabrication workshops, and client display showrooms in Oman.
              </p>
            </div>
            <Button
              onClick={openNewLocationModal}
              size="sm"
              className="bg-sky-600 hover:bg-sky-500 text-white text-xs h-8 font-semibold shrink-0"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Facility / Branch
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {locations.map(loc => (
              <Card key={loc.id} className="bg-white border-stone-200 shadow-2xs flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold shrink-0">
                        {loc.type === "Factory" ? "🏭" : "🏢"}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-stone-900">
                          {loc.name}
                        </CardTitle>
                        <CardDescription className="text-xs text-stone-500">
                          {loc.address}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-stone-100 text-stone-700 border-stone-200 text-[10px]">
                      {loc.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-2.5 text-xs text-stone-600 flex-1">
                  {loc.desc && <p>{loc.desc}</p>}
                  <div className="bg-stone-50 p-2.5 rounded-lg space-y-1 text-[11px]">
                    {loc.capabilities && <div><strong>Capabilities:</strong> {loc.capabilities}</div>}
                    {loc.hours && <div><strong>Working Hours:</strong> {loc.hours}</div>}
                    {loc.phone && <div><strong>Phone:</strong> {loc.phone}</div>}
                  </div>
                </CardContent>
                <div className="p-4 pt-0 border-t border-stone-100 mt-2 flex items-center justify-between">
                  {loc.mapUrl ? (
                    <a
                      href={loc.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-semibold"
                    >
                      <MapPin className="h-3.5 w-3.5" /> Open in Google Maps <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : <span />}
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => openEditLocationModal(loc)}
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs px-2 text-stone-600 hover:text-stone-900"
                    >
                      <Edit3 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDeleteLocation(loc.id)}
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs px-2 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── TAB 4: Architectural FAQs ── */}
        <TabsContent value="faqs" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-stone-200">
            <div>
              <h2 className="text-sm font-bold text-stone-900">Architectural FAQs</h2>
              <p className="text-xs text-stone-500">
                Frequently asked questions on thermal breaks, powder coating warranties, and fabrication timelines in Oman.
              </p>
            </div>
            <Button
              onClick={openNewFaqModal}
              size="sm"
              className="bg-sky-600 hover:bg-sky-500 text-white text-xs h-8 font-semibold shrink-0"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add FAQ
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqs.map((faq, idx) => (
              <Card key={faq.id || idx} className="bg-white border-stone-200 shadow-2xs flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-xs font-bold text-stone-900 flex items-start gap-2">
                      <span className="text-sky-600 font-mono">Q{idx + 1}.</span>
                      <span>{faq.q}</span>
                    </CardTitle>
                    {faq.category && (
                      <Badge className="bg-stone-100 text-stone-700 border-stone-200 text-[10px] shrink-0">
                        {faq.category}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-1 text-xs text-stone-600 leading-relaxed flex-1">
                  {faq.a}
                </CardContent>
                <div className="p-4 pt-0 border-t border-stone-100 mt-2 flex items-center justify-end gap-1">
                  <Button
                    onClick={() => openEditFaqModal(faq)}
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2 text-stone-600 hover:text-stone-900"
                  >
                    <Edit3 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDeleteFaq(faq.id)}
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── TAB 5: EMADI Bot Workflow & Company Settings ── */}
        <TabsContent value="workflow" className="space-y-4">
          <Card className="bg-white border-stone-200 shadow-2xs">
            <CardHeader className="p-5 border-b border-stone-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-stone-900">
                    EMADI Customized 10-Step WhatsApp Workflow
                  </CardTitle>
                  <CardDescription className="text-xs text-stone-500">
                    Automates client intake, product selection, project location, and drawing uploads on WhatsApp.
                  </CardDescription>
                </div>
                <Badge className={flowInstalled ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                  {flowInstalled ? "Flow Active" : "Flow Ready to Deploy"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-stone-200 bg-stone-50 space-y-1.5">
                  <div className="font-semibold text-stone-800 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    10-Step Architectural Workflow Elements
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-stone-600 pt-1">
                    <li>Request a Quotation</li>
                    <li>Products and Services</li>
                    <li>Select Required Product</li>
                    <li>Submit Project Details</li>
                    <li>Customer Name and Phone Number</li>
                    <li>Project Location (Oman Wilayat)</li>
                    <li>Upload Photos, Drawings and Measurements</li>
                    <li>Factory and Showroom Locations</li>
                    <li>Contact the Sales Team</li>
                    <li>Frequently Asked Questions</li>
                  </ol>
                </div>

                <div className="p-3 rounded-lg border border-stone-200 bg-stone-50 space-y-3">
                  <div className="font-semibold text-stone-800 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    AI Assistant Name &amp; Workspace Branding
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    You can customize your AI Assistant name (e.g. &ldquo;EMADI Assistant&rdquo;) in your workspace so clients are greeted with your branded persona on WhatsApp.
                  </p>
                  <div className="pt-2">
                    <Button
                      onClick={() => setView("ai-assistant")}
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                    >
                      <Sliders className="h-3 w-3 mr-1.5" />
                      Configure AI Assistant Branding
                    </Button>
                  </div>
                </div>
              </div>

              {/* Quotation Company Profile Settings */}
              <div className="pt-4 border-t border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-stone-900">Official Quotation Letterhead &amp; Terms</h3>
                    <p className="text-[11px] text-stone-500">Used for generating PDF estimates and official WhatsApp proposals.</p>
                  </div>
                  <Button
                    onClick={() => saveSettingsToDb({ profile: companyProfile })}
                    disabled={savingSettings}
                    size="sm"
                    className="bg-sky-600 hover:bg-sky-500 text-white text-xs h-8 font-semibold"
                  >
                    {savingSettings ? "Saving..." : "Save Profile"}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <Label className="text-[11px]">Company Name</Label>
                    <Input
                      value={companyProfile.companyName}
                      onChange={e => setCompanyProfile({ ...companyProfile, companyName: e.target.value })}
                      className="h-8 text-xs mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">CR Number (Oman)</Label>
                    <Input
                      value={companyProfile.crNumber}
                      onChange={e => setCompanyProfile({ ...companyProfile, crNumber: e.target.value })}
                      className="h-8 text-xs mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">VAT Number (Oman)</Label>
                    <Input
                      value={companyProfile.vatNumber}
                      onChange={e => setCompanyProfile({ ...companyProfile, vatNumber: e.target.value })}
                      className="h-8 text-xs mt-1 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <Label className="text-[11px]">Official Phone</Label>
                    <Input
                      value={companyProfile.phone}
                      onChange={e => setCompanyProfile({ ...companyProfile, phone: e.target.value })}
                      className="h-8 text-xs mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Official Email</Label>
                    <Input
                      value={companyProfile.email}
                      onChange={e => setCompanyProfile({ ...companyProfile, email: e.target.value })}
                      className="h-8 text-xs mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Website</Label>
                    <Input
                      value={companyProfile.website}
                      onChange={e => setCompanyProfile({ ...companyProfile, website: e.target.value })}
                      className="h-8 text-xs mt-1 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[11px]">Standard Quotation Terms &amp; Warranty Policy</Label>
                  <Textarea
                    value={companyProfile.terms}
                    onChange={e => setCompanyProfile({ ...companyProfile, terms: e.target.value })}
                    className="text-xs mt-1 min-h-[70px] bg-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <span className="text-xs text-stone-500">
                  Trigger keywords: <em>quote, quotation, aluminium, glass, emadi, facade, project, عرض سعر</em>
                </span>
                <Button
                  onClick={deployFlow}
                  disabled={flowDeploying}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  {flowInstalled ? "Re-Sync Flow" : "Deploy EMADI Flow Now"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── DIALOG 1: Comprehensive Manual RFQ & Quotation Logger ── */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={createManualQuote}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-sky-600" />
                Log New Quotation Request (RFQ)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Record a phone inquiry, walk-in client, or direct estimation file for architectural aluminium &amp; glass.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Client Full Name *</Label>
                  <Input
                    required
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Eng. Abdullah Al Balushi"
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Client Phone Number *</Label>
                  <Input
                    required
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="e.g. +968 9123 4567"
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Email Address (Optional)</Label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="e.g. abdullah@example.om"
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Company / Main Contractor</Label>
                  <Input
                    value={newCompany}
                    onChange={e => setNewCompany(e.target.value)}
                    placeholder="e.g. Apex Contracting LLC"
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Project Location in Oman</Label>
                  <select
                    value={newLocation}
                    onChange={e => setNewLocation(e.target.value)}
                    className="w-full h-8 text-xs border rounded-md px-2 bg-white mt-1"
                  >
                    {OMAN_WILAYATS.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Architectural System</Label>
                  <select
                    value={newProduct}
                    onChange={e => setNewProduct(e.target.value)}
                    className="w-full h-8 text-xs border rounded-md px-2 bg-white mt-1"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.title}>{p.title}</option>
                    ))}
                    <option value="Complete Luxury Villa Package">Complete Luxury Villa Package</option>
                    <option value="Commercial Shopfront / Curtain Wall">Commercial Shopfront / Curtain Wall</option>
                    <option value="Other Custom System">Other Custom System</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Profile Series Specification</Label>
                  <Input
                    value={newProfileSeries}
                    onChange={e => setNewProfileSeries(e.target.value)}
                    placeholder="e.g. Technal Soleal 55 / Schuco AWS 65"
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Scope / Area / Openings</Label>
                  <Input
                    value={newArea}
                    onChange={e => setNewArea(e.target.value)}
                    placeholder="e.g. 14 Windows, 4 Sliding Doors (120 sqm)"
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Initial Status</Label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value)}
                    className="w-full h-8 text-xs border rounded-md px-2 bg-white mt-1"
                  >
                    <option value="NEW">NEW (Inbound)</option>
                    <option value="REVIEWING">REVIEWING (Engineering Evaluation)</option>
                    <option value="QUOTED">QUOTED (Proposal Sent)</option>
                    <option value="WON">WON (Contract Signed)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Estimated / Quoted Amount (OMR)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    placeholder="e.g. 4500.000"
                    className="h-8 text-xs mt-1 font-mono"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Drawings / CAD / PDF URL or Measurement Note</Label>
                <Input
                  value={newDrawings}
                  onChange={e => setNewDrawings(e.target.value)}
                  placeholder="e.g. Google Drive link or architectural elevation schedule notes..."
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Project Scope &amp; Customer Requirements</Label>
                <Textarea
                  value={newDetails}
                  onChange={e => setNewDetails(e.target.value)}
                  placeholder="Describe special powder coating codes, acoustic requirements, glass U-values..."
                  className="text-xs mt-1 min-h-[50px]"
                />
              </div>

              <div>
                <Label className="text-xs">Internal Estimation Notes</Label>
                <Textarea
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="Internal engineering remarks, supplier lead times, or pricing basis..."
                  className="text-xs mt-1 min-h-[45px]"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button size="sm" type="button" variant="ghost" className="text-xs" onClick={() => setShowNewModal(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" className="text-xs bg-sky-600 hover:bg-sky-700 text-white font-semibold" disabled={creatingQuote}>
                {creatingQuote ? "Creating..." : "Save RFQ & Quotation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG 2: Manage RFQ Details ── */}
      <Dialog open={!!selectedQuote} onOpenChange={open => !open && setSelectedQuote(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Manage Quotation Request</DialogTitle>
            <DialogDescription className="text-xs">
              Client: {selectedQuote?.customerName} ({selectedQuote?.customerPhone})
            </DialogDescription>
          </DialogHeader>

          {selectedQuote && (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-semibold">Location</span>
                  <span className="font-semibold text-stone-800">{selectedQuote.projectLocation}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-semibold">System</span>
                  <span className="font-semibold text-stone-800 truncate block">{selectedQuote.productType}</span>
                </div>
              </div>

              {selectedQuote.projectDetails && (
                <div>
                  <span className="text-stone-500 font-semibold block mb-0.5">Project Scope / Details</span>
                  <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200 text-stone-700 whitespace-pre-wrap">
                    {selectedQuote.projectDetails}
                  </div>
                </div>
              )}

              {selectedQuote.mediaUploads && (
                <div>
                  <span className="text-stone-500 font-semibold block mb-0.5">Drawings / Attachments Note</span>
                  <div className="bg-sky-50 text-sky-900 p-2 rounded border border-sky-100">
                    {selectedQuote.mediaUploads}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Status</Label>
                  <select
                    value={editingStatus}
                    onChange={e => setEditingStatus(e.target.value)}
                    className="w-full h-8 text-xs border rounded-md px-2 bg-white mt-1"
                  >
                    <option value="NEW">NEW</option>
                    <option value="REVIEWING">REVIEWING</option>
                    <option value="QUOTED">QUOTED</option>
                    <option value="WON">WON</option>
                    <option value="LOST">LOST</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Quoted Amount (OMR)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={editingAmount}
                    onChange={e => setEditingAmount(e.target.value)}
                    placeholder="e.g. 4500.000"
                    className="h-8 text-xs mt-1 bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Engineering / Estimation Notes</Label>
                <Textarea
                  value={editingNotes}
                  onChange={e => setEditingNotes(e.target.value)}
                  placeholder="Record glass thickness, profile series, or follow-up notes..."
                  className="text-xs mt-1 bg-white min-h-[60px]"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-stone-200">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 text-sky-700 border-sky-300"
                  onClick={() => {
                    const q = selectedQuote
                    setSelectedQuote(null)
                    setQuoteToPrint(q)
                  }}
                >
                  <Printer className="h-3 w-3 mr-1.5" />
                  Print Official Estimate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-8 text-rose-600 hover:bg-rose-50"
                  onClick={() => deleteQuote(selectedQuote.id)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete RFQ
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setSelectedQuote(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs bg-sky-600 hover:bg-sky-700 text-white font-semibold"
              onClick={saveQuoteChanges}
              disabled={savingQuote}
            >
              {savingQuote ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG 3: Add / Edit Product System ── */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveProduct}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                {editingProduct ? "Edit Architectural System" : "Add New Architectural System"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Configure profile specifications, glazing compatibility, and features for clients.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              <div>
                <Label className="text-xs">System Title *</Label>
                <Input
                  required
                  value={prodTitle}
                  onChange={e => setProdTitle(e.target.value)}
                  placeholder="e.g. Minimalist Slim Sliding Door System"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Subtitle / Category</Label>
                  <Input
                    value={prodSubtitle}
                    onChange={e => setProdSubtitle(e.target.value)}
                    placeholder="e.g. Ultra-Slim Interlock Series"
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Badge Label</Label>
                  <Input
                    value={prodBadge}
                    onChange={e => setProdBadge(e.target.value)}
                    placeholder="e.g. Premium / Best Seller"
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={prodDesc}
                  onChange={e => setProdDesc(e.target.value)}
                  placeholder="Technical overview of the system and performance in Oman..."
                  className="text-xs mt-1 min-h-[60px]"
                />
              </div>

              <div>
                <Label className="text-xs">Key Specifications (One per line)</Label>
                <Textarea
                  value={prodSpecs}
                  onChange={e => setProdSpecs(e.target.value)}
                  placeholder="Qualicoat Class 2 Coating&#10;Thermal barrier polyamide 24mm&#10;Argon gas filled IGU double glazing"
                  className="text-xs mt-1 min-h-[70px]"
                />
              </div>

              <div>
                <Label className="text-xs">Compatible Extrusion Profiles</Label>
                <Input
                  value={prodProfiles}
                  onChange={e => setProdProfiles(e.target.value)}
                  placeholder="e.g. Technal, Schuco, Gutmann & Premium Omani Extrusions"
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button size="sm" type="button" variant="ghost" className="text-xs" onClick={() => setShowProductModal(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" className="text-xs bg-sky-600 hover:bg-sky-700 text-white font-semibold">
                {editingProduct ? "Update System" : "Add to Catalogue"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG 4: Add / Edit Facility Location ── */}
      <Dialog open={showLocationModal} onOpenChange={setShowLocationModal}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveLocation}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                {editingLocation ? "Edit Facility Location" : "Add New Facility Location"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Manufacturing factories, fabrication workshops, and showroom branches.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Facility Name *</Label>
                  <Input
                    required
                    value={locName}
                    onChange={e => setLocName(e.target.value)}
                    placeholder="e.g. Sohar Branch Showroom"
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Facility Type</Label>
                  <select
                    value={locType}
                    onChange={e => setLocType(e.target.value)}
                    className="w-full h-8 text-xs border rounded-md px-2 bg-white mt-1"
                  >
                    <option value="Showroom">Showroom &amp; Display</option>
                    <option value="Factory">Manufacturing Factory</option>
                    <option value="Workshop">Fabrication Workshop</option>
                    <option value="Sales Office">Sales &amp; Estimation Office</option>
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Address &amp; Wilayat *</Label>
                <Input
                  required
                  value={locAddress}
                  onChange={e => setLocAddress(e.target.value)}
                  placeholder="e.g. Falaj Al Qabail, Sohar Industrial Area, Oman"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Description &amp; Overview</Label>
                <Textarea
                  value={locDesc}
                  onChange={e => setLocDesc(e.target.value)}
                  placeholder="Facility features, mockups displayed, or equipment..."
                  className="text-xs mt-1 min-h-[50px]"
                />
              </div>

              <div>
                <Label className="text-xs">Capabilities &amp; Certifications</Label>
                <Input
                  value={locCapabilities}
                  onChange={e => setLocCapabilities(e.target.value)}
                  placeholder="e.g. 1000 sqm capacity · ISO 9001 · Qualicoat Certified"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Working Hours</Label>
                  <Input
                    value={locHours}
                    onChange={e => setLocHours(e.target.value)}
                    placeholder="e.g. Sat - Thu, 8:00 AM - 5:00 PM"
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Phone / WhatsApp Line</Label>
                  <Input
                    value={locPhone}
                    onChange={e => setLocPhone(e.target.value)}
                    placeholder="e.g. +968 2684 1234"
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Google Maps Link</Label>
                <Input
                  value={locMapUrl}
                  onChange={e => setLocMapUrl(e.target.value)}
                  placeholder="https://maps.google.com/?q=..."
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button size="sm" type="button" variant="ghost" className="text-xs" onClick={() => setShowLocationModal(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" className="text-xs bg-sky-600 hover:bg-sky-700 text-white font-semibold">
                {editingLocation ? "Update Facility" : "Save Facility"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG 5: Add / Edit FAQ ── */}
      <Dialog open={showFaqModal} onOpenChange={setShowFaqModal}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveFaq}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                {editingFaq ? "Edit Architectural FAQ" : "Add New Architectural FAQ"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Provide grounded answers for client technical questions and AI chatbot groundings.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              <div>
                <Label className="text-xs">Question *</Label>
                <Input
                  required
                  value={faqQ}
                  onChange={e => setFaqQ(e.target.value)}
                  placeholder="e.g. Do you provide site structural calculations?"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Category</Label>
                <select
                  value={faqCategory}
                  onChange={e => setFaqCategory(e.target.value)}
                  className="w-full h-8 text-xs border rounded-md px-2 bg-white mt-1"
                >
                  <option value="Technical">Technical &amp; Engineering</option>
                  <option value="Warranty">Warranty &amp; Coatings</option>
                  <option value="Operations">Fabrication &amp; Installation</option>
                  <option value="Quotations">Quotations &amp; Estimations</option>
                  <option value="Products">Products &amp; Profiles</option>
                </select>
              </div>

              <div>
                <Label className="text-xs">Answer *</Label>
                <Textarea
                  required
                  value={faqA}
                  onChange={e => setFaqA(e.target.value)}
                  placeholder="Detailed engineering answer for client inquiries..."
                  className="text-xs mt-1 min-h-[90px]"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button size="sm" type="button" variant="ghost" className="text-xs" onClick={() => setShowFaqModal(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" className="text-xs bg-sky-600 hover:bg-sky-700 text-white font-semibold">
                {editingFaq ? "Update FAQ" : "Save FAQ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG 6: Official Quotation / Estimate Document Generator ── */}
      <Dialog open={!!quoteToPrint} onOpenChange={open => !open && setQuoteToPrint(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {quoteToPrint && (
            <div className="space-y-4">
              <div className="bg-stone-50 border border-stone-200 p-6 rounded-xl space-y-4 text-xs font-sans print:p-0 print:border-none">
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-stone-300">
                  <div>
                    <h2 className="text-base font-bold text-stone-900 tracking-tight">
                      {companyProfile.companyName}
                    </h2>
                    <p className="text-[11px] text-sky-800 font-medium">{companyProfile.tagline}</p>
                    <div className="text-[10px] text-stone-500 mt-1 space-y-0.5">
                      <div>CR: {companyProfile.crNumber} · VAT: {companyProfile.vatNumber}</div>
                      <div>{companyProfile.address}</div>
                      <div>Phone: {companyProfile.phone} · Email: {companyProfile.email}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 bg-sky-900 text-white font-bold text-[10px] rounded uppercase tracking-wider">
                      Official Quotation
                    </span>
                    <div className="text-xs font-bold text-stone-900 mt-1 font-mono">
                      #EMADI-RFQ-{quoteToPrint.id.slice(-6).toUpperCase()}
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5">
                      Date: {new Date(quoteToPrint.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-semibold">
                      Validity: 30 Days
                    </div>
                  </div>
                </div>

                {/* Client & Project Details */}
                <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded-lg border border-stone-200">
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Customer Details</span>
                    <div className="text-xs font-bold text-stone-900 mt-0.5">{quoteToPrint.customerName}</div>
                    <div className="text-xs text-stone-600 font-mono">{quoteToPrint.customerPhone}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Project Scope</span>
                    <div className="text-xs font-bold text-stone-900 mt-0.5">{quoteToPrint.productType}</div>
                    <div className="text-xs text-stone-600">{quoteToPrint.projectLocation}</div>
                  </div>
                </div>

                {/* Specifications & Items */}
                <div className="border border-stone-200 rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                        <th className="p-2.5">Item &amp; Description</th>
                        <th className="p-2.5 text-center">Unit</th>
                        <th className="p-2.5 text-right">Amount (OMR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      <tr>
                        <td className="p-2.5">
                          <div className="font-semibold text-stone-900">{quoteToPrint.productType}</div>
                          <div className="text-[11px] text-stone-500 mt-0.5">
                            {quoteToPrint.projectDetails || "Fabrication and engineering of architectural systems as per client specifications"}
                          </div>
                        </td>
                        <td className="p-2.5 text-center text-stone-600">Lump Sum</td>
                        <td className="p-2.5 text-right font-mono font-bold text-stone-900">
                          {quoteToPrint.quotedAmount ? (quoteToPrint.quotedAmount / 1.05).toFixed(3) : "TBD"}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5">
                          <div className="font-semibold text-stone-900">Hardware &amp; Perimeter EPDM Weatherseals</div>
                          <div className="text-[11px] text-stone-500 mt-0.5">
                            Qualicoat Class 2 certified architectural powder coating with multi-point perimeter locking.
                          </div>
                        </td>
                        <td className="p-2.5 text-center text-stone-600">Included</td>
                        <td className="p-2.5 text-right font-mono text-stone-500">Included</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">
                          <div className="font-semibold text-stone-900">Site Installation &amp; Delivery in Oman</div>
                          <div className="text-[11px] text-stone-500 mt-0.5">
                            Delivered to {quoteToPrint.projectLocation} and installed by certified installation teams.
                          </div>
                        </td>
                        <td className="p-2.5 text-center text-stone-600">Included</td>
                        <td className="p-2.5 text-right font-mono text-stone-500">Included</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-1.5 text-xs bg-white p-3 rounded-lg border border-stone-200">
                    <div className="flex justify-between text-stone-600">
                      <span>Subtotal (Net):</span>
                      <span className="font-mono font-semibold">
                        {quoteToPrint.quotedAmount ? (quoteToPrint.quotedAmount / 1.05).toFixed(3) : "—"} OMR
                      </span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Oman VAT (5%):</span>
                      <span className="font-mono font-semibold">
                        {quoteToPrint.quotedAmount ? (quoteToPrint.quotedAmount - (quoteToPrint.quotedAmount / 1.05)).toFixed(3) : "—"} OMR
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-stone-900 pt-1.5 border-t border-stone-200">
                      <span>Total Amount:</span>
                      <span className="font-mono text-emerald-700">
                        {quoteToPrint.quotedAmount ? `${quoteToPrint.quotedAmount.toFixed(3)} OMR` : "Pending Quote"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Terms */}
                <div className="text-[10px] text-stone-500 bg-stone-100 p-2.5 rounded-lg space-y-1">
                  <div className="font-bold text-stone-700">Terms &amp; Conditions:</div>
                  <p className="whitespace-pre-line leading-relaxed">{companyProfile.terms}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => {
                    const text = `Quotation #${quoteToPrint.id.slice(-6).toUpperCase()}\nClient: ${quoteToPrint.customerName}\nSystem: ${quoteToPrint.productType}\nLocation: ${quoteToPrint.projectLocation}\nTotal: ${quoteToPrint.quotedAmount ? quoteToPrint.quotedAmount.toFixed(3) + ' OMR' : 'Pending'}`
                    navigator.clipboard.writeText(text)
                    toast.success("Quotation text copied to clipboard")
                  }}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy Summary
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                    onClick={() => shareQuoteViaWhatsApp(quoteToPrint)}
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                    Send via WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
                    onClick={() => window.print()}
                  >
                    <Printer className="h-3.5 w-3.5 mr-1.5" />
                    Print / Save PDF
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
