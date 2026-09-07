"use client"

import React, { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  QrCode,
  Plus,
  TrendingUp,
  Copy,
  ExternalLink,
  Loader2,
  MapPin,
  Trash2,
  Download,
  Check,
  Save,
  Eye,
  Globe,
  Phone,
  Mail,
  Clock,
  CreditCard,
  Building2,
  Sparkles,
  Share2,
  ShieldCheck,
  User,
  Sliders,
  Image as ImageIcon,
  Smartphone,
  RefreshCw,
  Upload,
  Video,
  Play,
  LayoutGrid,
  SlidersHorizontal,
  Palette,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Edit2,
  Link as LinkIcon,
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { PublicCardClient } from "@/components/digital-vcard/public-card-client"
import { TEMPLATE_LIST, getVCardTemplate } from "@/lib/digital-vcard/templates"
import { POPULAR_ICONS, SOCIAL_PLATFORMS, renderCustomIcon } from "@/lib/digital-vcard/custom-icons"

const BUTTON_STYLE_OPTIONS = [
  { id: "rounded", label: "Classic Rounded", desc: "Smooth 12px corners, balanced shadow" },
  { id: "pill", label: "Sleek Stadium Pill", desc: "Full stadium curves, app CTA feel" },
  { id: "square", label: "Sharp Modern", desc: "Crisp architectural corners, minimal aesthetic" },
  { id: "neo3d", label: "3D Tactile Neo", desc: "High-contrast border with physical drop-shadow" },
  { id: "glass", label: "Frosted Glass", desc: "Backdrop blur glassmorphism with subtle glow" },
]

export default function DigitalVCardView() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [card, setCard] = useState<any>(null)
  const [services, setServices] = useState<any[]>([])
  const [gallery, setGallery] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [analyticsRange, setAnalyticsRange] = useState("30d")
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  // Upload States & Refs
  const fileInputLogoRef = useRef<HTMLInputElement>(null)
  const fileInputCoverRef = useRef<HTMLInputElement>(null)
  const fileInputVideoRef = useRef<HTMLInputElement>(null)
  const fileInputServiceRef = useRef<HTMLInputElement>(null)

  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadingServiceImg, setUploadingServiceImg] = useState(false)

  // Service Modal State
  const [serviceModalOpen, setServiceModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<any>(null)
  const [serviceName, setServiceName] = useState("")
  const [serviceShortDesc, setServiceShortDesc] = useState("")
  const [servicePrice, setServicePrice] = useState("")
  const [serviceSalePrice, setServiceSalePrice] = useState("")
  const [serviceCurrency, setServiceCurrency] = useState("OMR")
  const [serviceImageUrl, setServiceImageUrl] = useState("")
  const [serviceCtaLabel, setServiceCtaLabel] = useState("Book via WhatsApp")
  const [serviceWaMessage, setServiceWaMessage] = useState("")
  const [serviceSubmitting, setServiceSubmitting] = useState(false)

  // Custom Link Modal State
  const [customLinkModalOpen, setCustomLinkModalOpen] = useState(false)
  const [editingLinkIndex, setEditingLinkIndex] = useState<number | null>(null)
  const [linkFormLabel, setLinkFormLabel] = useState("")
  const [linkFormUrl, setLinkFormUrl] = useState("")
  const [linkFormIcon, setLinkFormIcon] = useState("globe")
  const [linkFormHighlight, setLinkFormHighlight] = useState(false)
  const [iconCategoryFilter, setIconCategoryFilter] = useState<string>("all")

  // Gallery Modal State
  const [galleryModalOpen, setGalleryModalOpen] = useState(false)
  const [galleryUrl, setGalleryUrl] = useState("")
  const [galleryCaption, setGalleryCaption] = useState("")
  const [gallerySubmitting, setGallerySubmitting] = useState(false)

  // Load Initial Card & Data
  const loadCardData = async () => {
    setLoading(true)
    try {
      const [cardRes, analyticsRes] = await Promise.all([
        fetch("/api/addons/digital-vcard/vcard"),
        fetch(`/api/addons/digital-vcard/analytics?range=${analyticsRange}`),
      ])

      if (cardRes.ok) {
        const cardData = await cardRes.json()
        setCard(cardData.card)
        setServices(cardData.card?.items || [])
        setGallery(cardData.card?.gallery || [])
      } else {
        toast.error("Failed to load digital business card details")
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json()
        setAnalytics(analyticsData)
      }
    } catch {
      toast.error("Network error while connecting to server")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCardData()
  }, [])

  // Load analytics when range changes
  useEffect(() => {
    if (!card) return
    setAnalyticsLoading(true)
    fetch(`/api/addons/digital-vcard/analytics?range=${analyticsRange}`)
      .then((r) => r.json())
      .then((data) => setAnalytics(data))
      .catch(() => {})
      .finally(() => setAnalyticsLoading(false))
  }, [analyticsRange])

  // Save Card Updates
  const handleSaveCard = async (patch?: Record<string, any>) => {
    setSaving(true)
    try {
      const payload = patch || card
      const res = await fetch("/api/addons/digital-vcard/vcard", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        let errorMsg = data.error || "Failed to update business card"
        if (data.details?.fieldErrors) {
          const fieldEntries = Object.entries(data.details.fieldErrors)
          if (fieldEntries.length > 0) {
            const [field, errs] = fieldEntries[0]
            errorMsg = `${field}: ${(errs as string[]).join(", ")}`
          }
        }
        throw new Error(errorMsg)
      }

      setCard(data.card)
      toast.success("Digital business card updated successfully")
    } catch (err: any) {
      toast.error(err.message || "Could not save card settings")
    } finally {
      setSaving(false)
    }
  }

  // Media Config Helper
  const mediaConfig = card?.mediaConfig || {}
  const updateMediaConfig = (patch: Record<string, any>) => {
    const updated = { ...(card?.mediaConfig || {}), ...patch }
    setCard({ ...card, mediaConfig: updated })
  }

  // File Upload Helper
  const handleFileUpload = async (
    file: File,
    onSuccess: (url: string) => void,
    setLoadingState: (loading: boolean) => void
  ) => {
    if (!file) return
    setLoadingState(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Upload failed")
      }
      onSuccess(data.url)
      toast.success("File uploaded successfully")
    } catch (err: any) {
      toast.error(err.message || "Could not upload file")
    } finally {
      setLoadingState(false)
    }
  }

  // Toggle Publish Status
  const togglePublishStatus = async () => {
    if (!card) return
    const nextStatus = card.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"
    const updated = { ...card, status: nextStatus }
    setCard(updated)
    await handleSaveCard(updated)
  }

  // Service Item CRUD
  const openNewServiceModal = () => {
    setEditingService(null)
    setServiceName("")
    setServiceShortDesc("")
    setServicePrice("")
    setServiceSalePrice("")
    setServiceCurrency(card?.currency || "OMR")
    setServiceImageUrl("")
    setServiceCtaLabel("Book via WhatsApp")
    setServiceWaMessage("")
    setServiceModalOpen(true)
  }

  const openEditServiceModal = (item: any) => {
    setEditingService(item)
    setServiceName(item.name)
    setServiceShortDesc(item.shortDesc || "")
    setServicePrice(item.price ? String(item.price) : "")
    setServiceSalePrice(item.salePrice ? String(item.salePrice) : "")
    setServiceCurrency(item.currency || "OMR")
    setServiceImageUrl(item.imageUrl || "")
    setServiceCtaLabel(item.ctaLabel || "Book via WhatsApp")
    setServiceWaMessage(item.whatsappMessage || "")
    setServiceModalOpen(true)
  }

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault()
    setServiceSubmitting(true)

    const payload = {
      name: serviceName,
      shortDesc: serviceShortDesc || null,
      price: servicePrice ? parseFloat(servicePrice) : null,
      salePrice: serviceSalePrice ? parseFloat(serviceSalePrice) : null,
      currency: serviceCurrency,
      imageUrl: serviceImageUrl || null,
      ctaLabel: serviceCtaLabel || "Book via WhatsApp",
      whatsappMessage: serviceWaMessage || null,
    }

    try {
      if (editingService) {
        const res = await fetch(`/api/addons/digital-vcard/services/${editingService.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error("Failed to update service")
        const data = await res.json()
        setServices(services.map((s) => (s.id === editingService.id ? data.item : s)))
        toast.success("Service updated")
      } else {
        const res = await fetch("/api/addons/digital-vcard/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error("Failed to create service")
        const data = await res.json()
        setServices([...services, data.item])
        toast.success("Service created")
      }
      setServiceModalOpen(false)
    } catch (err: any) {
      toast.error(err.message || "Error saving service item")
    } finally {
      setServiceSubmitting(false)
    }
  }

  const handleDeleteService = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return
    try {
      const res = await fetch(`/api/addons/digital-vcard/services/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete service")
      setServices(services.filter((s) => s.id !== id))
      toast.success("Service deleted")
    } catch {
      toast.error("Failed to delete service")
    }
  }

  // Custom Links Management
  const openAddCustomLinkModal = () => {
    setEditingLinkIndex(null)
    setLinkFormLabel("")
    setLinkFormUrl("")
    setLinkFormIcon("globe")
    setLinkFormHighlight(false)
    setIconCategoryFilter("all")
    setCustomLinkModalOpen(true)
  }

  const openEditCustomLinkModal = (index: number) => {
    const list = Array.isArray(card.customLinks) ? card.customLinks : []
    const item = list[index]
    if (!item) return
    setEditingLinkIndex(index)
    setLinkFormLabel(item.label || "")
    setLinkFormUrl(item.url || "")
    setLinkFormIcon(item.icon || "globe")
    setLinkFormHighlight(Boolean(item.highlight))
    setIconCategoryFilter("all")
    setCustomLinkModalOpen(true)
  }

  const handleSaveCustomLink = (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkFormLabel.trim() || !linkFormUrl.trim()) {
      toast.error("Please provide both a label and a valid URL")
      return
    }

    let finalUrl = linkFormUrl.trim()
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = `https://${finalUrl}`
    }

    const currentLinks = Array.isArray(card.customLinks) ? [...card.customLinks] : []
    const linkObj = {
      id: editingLinkIndex !== null ? currentLinks[editingLinkIndex]?.id || `link_${Date.now()}` : `link_${Date.now()}`,
      label: linkFormLabel.trim(),
      url: finalUrl,
      icon: linkFormIcon,
      iconType: "lucide",
      highlight: linkFormHighlight,
    }

    if (editingLinkIndex !== null) {
      currentLinks[editingLinkIndex] = linkObj
    } else {
      currentLinks.push(linkObj)
    }

    setCard({ ...card, customLinks: currentLinks })
    setCustomLinkModalOpen(false)
    toast.success(editingLinkIndex !== null ? "Custom link updated" : "Custom link added")
  }

  const handleDeleteCustomLink = (index: number) => {
    const currentLinks = Array.isArray(card.customLinks) ? [...card.customLinks] : []
    currentLinks.splice(index, 1)
    setCard({ ...card, customLinks: currentLinks })
    toast.success("Link removed")
  }

  const handleMoveCustomLink = (index: number, direction: "up" | "down") => {
    const currentLinks = Array.isArray(card.customLinks) ? [...card.customLinks] : []
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= currentLinks.length) return
    const temp = currentLinks[index]
    currentLinks[index] = currentLinks[targetIndex]
    currentLinks[targetIndex] = temp
    setCard({ ...card, customLinks: currentLinks })
  }

  // Social Links Handler
  const handleSocialChange = (platform: string, value: string) => {
    const current = { ...(card.socialLinks || {}) }
    if (!value.trim()) {
      delete current[platform]
    } else {
      current[platform] = value.trim()
    }
    setCard({ ...card, socialLinks: current })
  }

  // Gallery CRUD
  const handleAddGalleryItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setGallerySubmitting(true)
    try {
      const res = await fetch("/api/addons/digital-vcard/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: galleryUrl,
          caption: galleryCaption || null,
        }),
      })
      if (!res.ok) throw new Error("Failed to add image")
      const data = await res.json()
      setGallery([...gallery, data.item])
      toast.success("Image added to gallery")
      setGalleryModalOpen(false)
      setGalleryUrl("")
      setGalleryCaption("")
    } catch {
      toast.error("Failed to add gallery image")
    } finally {
      setGallerySubmitting(false)
    }
  }

  const handleDeleteGalleryItem = async (id: string) => {
    try {
      const res = await fetch(`/api/addons/digital-vcard/gallery?id=${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete image")
      setGallery(gallery.filter((g) => g.id !== id))
      toast.success("Image removed")
    } catch {
      toast.error("Failed to delete image")
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!card) {
    return (
      <div className="p-12 text-center">
        <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">No Business Card Initialized</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
          Could not load the digital card for this workspace. Click initialize to generate your workspace card.
        </p>
        <Button onClick={loadCardData} className="gap-2 bg-teal-600 hover:bg-teal-700">
          <RefreshCw className="w-4 h-4" />
          Initialize Digital Card
        </Button>
      </div>
    )
  }

  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/card/${card.slug}`
    : `https://app.fizmoh.cloud/card/${card.slug}`

  const filteredIcons = POPULAR_ICONS.filter((icon) =>
    iconCategoryFilter === "all" ? true : icon.category === iconCategoryFilter
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Hidden File Inputs for Direct Native Media Upload */}
      <input
        type="file"
        ref={fileInputLogoRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            handleFileUpload(
              file,
              (url) => setCard({ ...card, logoUrl: url }),
              setUploadingLogo
            )
          }
        }}
      />
      <input
        type="file"
        ref={fileInputCoverRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            handleFileUpload(
              file,
              (url) => setCard({ ...card, bannerUrl: url, coverType: "IMAGE" }),
              setUploadingCover
            )
          }
        }}
      />
      <input
        type="file"
        ref={fileInputVideoRef}
        accept="video/mp4,video/3gpp,video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            handleFileUpload(
              file,
              (url) => setCard({ ...card, coverVideoUrl: url, coverType: "VIDEO" }),
              setUploadingVideo
            )
          }
        }}
      />
      <input
        type="file"
        ref={fileInputServiceRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            handleFileUpload(
              file,
              (url) => setServiceImageUrl(url),
              setUploadingServiceImg
            )
          }
        }}
      />

      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Digital Business Card
            </h1>
            <Badge
              variant="outline"
              className={
                card.status === "PUBLISHED"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-bold"
                  : "bg-amber-50 text-amber-700 border-amber-300 font-bold"
              }
            >
              {card.status}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Smart vCard profile, dynamic QR code, 10 visual templates, video cover, and WhatsApp lead engine.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(publicUrl)
              toast.success("Card link copied to clipboard")
            }}
            className="gap-1.5 text-xs font-semibold"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Link</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-1.5 text-xs font-semibold"
          >
            <a href={`/card/${card.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Live Card</span>
            </a>
          </Button>

          <Button
            variant={card.status === "PUBLISHED" ? "secondary" : "default"}
            size="sm"
            onClick={togglePublishStatus}
            disabled={saving}
            className={`gap-1.5 text-xs font-bold ${
              card.status === "PUBLISHED"
                ? "bg-slate-100 hover:bg-slate-200 text-slate-800"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            }`}
          >
            {card.status === "PUBLISHED" ? "Unpublish Card" : "Publish Live"}
          </Button>

          <Button
            onClick={() => handleSaveCard()}
            disabled={saving}
            size="sm"
            className="gap-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Changes</span>
          </Button>
        </div>
      </div>

      {/* Main Two-Column Layout: Editor Tabs on Left, Live Phone Mockup on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Multi-tab settings (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto pb-1 -mb-1 no-scrollbar">
              <TabsList className="inline-flex min-w-full flex-wrap sm:flex-nowrap h-auto p-1.5 bg-slate-100/90 rounded-2xl gap-1 border border-slate-200/60 shadow-xs">
                <TabsTrigger value="overview" className="text-xs px-2.5 py-2 font-semibold whitespace-nowrap shrink-0 flex-1">Overview</TabsTrigger>
                <TabsTrigger value="templates" className="text-xs px-2.5 py-2 font-semibold whitespace-nowrap shrink-0 flex-1">Templates (10)</TabsTrigger>
                <TabsTrigger value="profile" className="text-xs px-2.5 py-2 font-semibold whitespace-nowrap shrink-0 flex-1">Profile</TabsTrigger>
                <TabsTrigger value="branding" className="text-xs px-2.5 py-2 font-semibold whitespace-nowrap shrink-0 flex-1">Branding & Media</TabsTrigger>
                <TabsTrigger value="services" className="text-xs px-2.5 py-2 font-semibold whitespace-nowrap shrink-0 flex-1">Services</TabsTrigger>
                <TabsTrigger value="links" className="text-xs px-2.5 py-2 font-semibold whitespace-nowrap shrink-0 flex-1">Social & Links</TabsTrigger>
                <TabsTrigger value="contact" className="text-xs px-2.5 py-2 font-semibold whitespace-nowrap shrink-0 flex-1">Contact</TabsTrigger>
                <TabsTrigger value="hours" className="text-xs px-2.5 py-2 font-semibold whitespace-nowrap shrink-0 flex-1">Hours</TabsTrigger>
                <TabsTrigger value="payments" className="text-xs px-2.5 py-2 font-semibold whitespace-nowrap shrink-0 flex-1">Payments</TabsTrigger>
                <TabsTrigger value="analytics" className="text-xs px-2.5 py-2 font-semibold whitespace-nowrap shrink-0 flex-1">Analytics</TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: OVERVIEW */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="shadow-2xs">
                  <CardContent className="p-4 text-left">
                    <span className="text-[11px] font-bold uppercase text-slate-400">Total Views</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">
                      {analytics?.metrics?.views ?? 0}
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-2xs">
                  <CardContent className="p-4 text-left">
                    <span className="text-[11px] font-bold uppercase text-slate-400">Contact Saves</span>
                    <p className="text-2xl font-black text-indigo-600 mt-1">
                      {analytics?.metrics?.saves ?? 0}
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-2xs">
                  <CardContent className="p-4 text-left">
                    <span className="text-[11px] font-bold uppercase text-slate-400">WhatsApp Clicks</span>
                    <p className="text-2xl font-black text-emerald-600 mt-1">
                      {analytics?.metrics?.whatsappClicks ?? 0}
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-2xs">
                  <CardContent className="p-4 text-left">
                    <span className="text-[11px] font-bold uppercase text-slate-400">Call Clicks</span>
                    <p className="text-2xl font-black text-blue-600 mt-1">
                      {analytics?.metrics?.calls ?? 0}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Info & Public URL Card */}
              <Card className="shadow-2xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <span>Public Card Link & Slug</span>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      /{card.slug}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Your public link is accessible worldwide. You can change your vanity handle anytime.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        value={card.slug || ""}
                        onChange={(e) => setCard({ ...card, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                        placeholder="my-company-card"
                        className="font-mono text-xs pl-32"
                      />
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono pointer-events-none">
                        app.fizmoh.cloud/card/
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSaveCard({ slug: card.slug })}
                      disabled={saving}
                      className="text-xs font-bold bg-teal-600 hover:bg-teal-700"
                    >
                      Update Slug
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Template & Media Overview Banner */}
              <Card className="shadow-2xs bg-gradient-to-br from-teal-50/50 via-slate-50 to-indigo-50/40 border-teal-100">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shrink-0">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Active Theme: {getVCardTemplate(card.cardTemplate).name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Cover Media: <span className="font-semibold text-teal-700">{card.coverType === "VIDEO" ? "🎬 Video Loop" : "🖼️ Cover Photo"}</span> • Service Mode: <span className="font-semibold text-indigo-700">{card.serviceLayout === "GRID" ? "Square Grid" : "Horizontal Slider"}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveTab("templates")}
                      className="text-xs font-bold"
                    >
                      Browse Templates
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setActiveTab("branding")}
                      className="text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white"
                    >
                      Manage Media
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: 10 VCARD TEMPLATES GALLERY */}
            <TabsContent value="templates" className="space-y-4 mt-4">
              <Card className="shadow-2xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Palette className="w-4 h-4 text-teal-600" />
                        Choose Card Template (10 Distinct Themes)
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Select a design theme that reflects your industry. Each template includes custom typography, visual elevations, hero treatments, and contrast modes.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-teal-50 text-teal-800 border-teal-300 font-mono text-xs">
                      {card.cardTemplate?.toUpperCase() || "MODERN"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {TEMPLATE_LIST.map((tpl) => {
                      const isSelected = (card.cardTemplate || "modern").toLowerCase() === tpl.id.toLowerCase()
                      return (
                        <div
                          key={tpl.id}
                          onClick={() => {
                            setCard({ ...card, cardTemplate: tpl.id })
                            toast.success(`Switched to "${tpl.name}" template (Live Preview updated)`)
                          }}
                          className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between ${
                            isSelected
                              ? "border-teal-600 bg-teal-50/30 shadow-md ring-2 ring-teal-500/20"
                              : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60 shadow-2xs"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-900">{tpl.name}</span>
                                <Badge
                                  variant="secondary"
                                  className={`text-[9px] font-bold px-1.5 py-0 uppercase ${
                                    tpl.theme === "dark"
                                      ? "bg-slate-900 text-white"
                                      : tpl.id === "brutalist"
                                      ? "bg-yellow-300 text-black border border-black"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {tpl.id}
                                </Badge>
                              </div>

                              {isSelected ? (
                                <div className="flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                                  <span>Active</span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-semibold hover:text-teal-600">Select</span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-600 mb-3 line-clamp-2">
                              {tpl.description}
                            </p>
                          </div>

                          {/* Color Palette Swatches */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-1.5">
                              {tpl.previewColors.map((color, cIdx) => (
                                <span
                                  key={cIdx}
                                  className="w-4 h-4 rounded-full border border-black/10 shadow-2xs"
                                  style={{ backgroundColor: color }}
                                  title={color}
                                />
                              ))}
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500 italic">
                              {tpl.tagline}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Tip: Changes reflect immediately in the live phone preview on the right.
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleSaveCard()}
                      disabled={saving}
                      className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold"
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: PROFILE IDENTITY */}
            <TabsContent value="profile" className="space-y-4 mt-4">
              <Card className="shadow-2xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">Business & Professional Identity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Company / Trading Name *</label>
                      <Input
                        value={card.companyName || ""}
                        onChange={(e) => setCard({ ...card, companyName: e.target.value })}
                        placeholder="e.g. Muscat Marine Adventures"
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Card Main Title *</label>
                      <Input
                        value={card.title || ""}
                        onChange={(e) => setCard({ ...card, title: e.target.value })}
                        placeholder="e.g. Muscat Marine Adventures LLC"
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Tagline / Subtitle</label>
                      <Input
                        value={card.subtitle || ""}
                        onChange={(e) => setCard({ ...card, subtitle: e.target.value })}
                        placeholder="e.g. Premium Yacht Charters & Dolphin Tours"
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Business Category / Industry</label>
                      <Input
                        value={card.category || ""}
                        onChange={(e) => setCard({ ...card, category: e.target.value })}
                        placeholder="e.g. Tourism & Water Sports"
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Bio / About Business</label>
                    <Textarea
                      rows={3}
                      value={card.bio || ""}
                      onChange={(e) => setCard({ ...card, bio: e.target.value })}
                      placeholder="Share a compelling 2-3 sentence overview of what your company offers..."
                      className="text-xs"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: BRANDING, MEDIA (LOGO / COVER PHOTO / VIDEO) & BUTTON STYLES */}
            <TabsContent value="branding" className="space-y-4 mt-4">
              {/* Media Uploads Card */}
              <Card className="shadow-2xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-teal-600" />
                    Media Uploads: Logo & Cover Banner
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Upload your high-resolution business logo and choose either a static banner photo or an eye-catching looping MP4 video.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 pt-0">
                  {/* Logo Section */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold text-slate-800 block">Company Logo</label>
                        <p className="text-[11px] text-slate-500">Square or circular logo, recommended 400x400px (PNG, JPG, WebP)</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingLogo}
                        onClick={() => fileInputLogoRef.current?.click()}
                        className="gap-1.5 text-xs font-semibold bg-white"
                      >
                        {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-teal-600" />}
                        <span>{uploadingLogo ? "Uploading..." : "Upload Logo"}</span>
                      </Button>
                    </div>

                    <div className="flex items-center gap-3">
                      {card.logoUrl ? (
                        <div className="relative w-16 h-16 rounded-2xl border-2 border-slate-200 bg-white p-1 flex items-center justify-center overflow-hidden shadow-xs shrink-0">
                          <img src={card.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => setCard({ ...card, logoUrl: "" })}
                            className="absolute top-0.5 right-0.5 p-1 bg-black/60 hover:bg-red-600 text-white rounded-full transition-colors"
                            title="Remove logo"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 shrink-0">
                          <ImageIcon className="w-5 h-5 mb-0.5" />
                          <span className="text-[9px]">No Logo</span>
                        </div>
                      )}

                      <div className="flex-1">
                        <Input
                          value={card.logoUrl || ""}
                          onChange={(e) => setCard({ ...card, logoUrl: e.target.value })}
                          placeholder="Or paste external image URL (https://...)"
                          className="text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cover Banner Media (Image or Video) */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-bold text-slate-800 block">Cover Media Header</label>
                        <p className="text-[11px] text-slate-500">Choose between a static cover image or a dynamic looping MP4 video cover.</p>
                      </div>

                      {/* Cover Type Switcher */}
                      <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setCard({ ...card, coverType: "IMAGE" })}
                          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                            (card.coverType || "IMAGE") === "IMAGE"
                              ? "bg-teal-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Photo Banner</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCard({ ...card, coverType: "VIDEO" })}
                          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                            card.coverType === "VIDEO"
                              ? "bg-teal-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Video Loop</span>
                        </button>
                      </div>
                    </div>

                    {/* Image Banner Controls */}
                    {(!card.coverType || card.coverType === "IMAGE") && (
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700">Banner Photo File</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingCover}
                            onClick={() => fileInputCoverRef.current?.click()}
                            className="gap-1.5 text-xs font-semibold bg-white"
                          >
                            {uploadingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-teal-600" />}
                            <span>{uploadingCover ? "Uploading..." : "Upload Cover Photo"}</span>
                          </Button>
                        </div>

                        {card.bannerUrl ? (
                          <div className="relative h-28 w-full rounded-xl border border-slate-200 bg-slate-100 overflow-hidden shadow-inner">
                            <img src={card.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setCard({ ...card, bannerUrl: "" })}
                              className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-600 text-white rounded-lg transition-colors"
                              title="Remove banner"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="h-20 w-full rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 text-xs">
                            No cover photo uploaded (Default template gradients apply)
                          </div>
                        )}

                        <Input
                          value={card.bannerUrl || ""}
                          onChange={(e) => setCard({ ...card, bannerUrl: e.target.value })}
                          placeholder="Or paste external banner image URL..."
                          className="text-xs font-mono"
                        />
                      </div>
                    )}

                    {/* Video Banner Controls */}
                    {card.coverType === "VIDEO" && (
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700">MP4 Cover Video File</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingVideo}
                            onClick={() => fileInputVideoRef.current?.click()}
                            className="gap-1.5 text-xs font-semibold bg-white"
                          >
                            {uploadingVideo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-teal-600" />}
                            <span>{uploadingVideo ? "Uploading..." : "Upload MP4 Video"}</span>
                          </Button>
                        </div>

                        {card.coverVideoUrl ? (
                          <div className="relative h-44 w-full rounded-xl border border-slate-800 bg-black overflow-hidden shadow-inner">
                            <video
                              src={card.coverVideoUrl}
                              autoPlay
                              muted
                              loop
                              playsInline
                              controls
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setCard({ ...card, coverVideoUrl: "" })}
                              className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-600 text-white rounded-lg transition-colors z-10"
                              title="Remove video"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="h-28 w-full rounded-xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
                            <Video className="w-6 h-6 mb-1 text-teal-600" />
                            <span className="font-semibold text-slate-600">No cover video set</span>
                            <span className="text-[10px] text-slate-400">Upload a 5-15s looping MP4 clip to showcase your venue, tours, or portfolio.</span>
                          </div>
                        )}

                        <Input
                          value={card.coverVideoUrl || ""}
                          onChange={(e) => setCard({ ...card, coverVideoUrl: e.target.value })}
                          placeholder="Or paste direct video URL (e.g. https://.../video.mp4)"
                          className="text-xs font-mono"
                        />
                        <p className="text-[10px] text-slate-500 italic">
                          ℹ️ Video auto-plays muted in a continuous loop on your public vCard with an instant sound toggle for visitors.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Media Adjustments: Sizing, Cropping & Focal Point */}
              <Card className="shadow-2xs border-teal-500/30 bg-gradient-to-b from-white to-teal-50/20">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                      <Sliders className="w-4 h-4 text-teal-600" />
                      Media Adjust: Size, Crop, Frame & Focal Point
                    </CardTitle>
                    <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-teal-800 bg-teal-100/80 border border-teal-300 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                      Instant Live Preview
                    </span>
                  </div>
                  <CardDescription className="text-xs text-slate-600">
                    Fine-tune the height, focal position, fit mode, border styles, and scaling of your logo and cover media. Changes reflect immediately on your live card preview.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 pt-0">
                  {/* 1. COVER BANNER ADJUSTMENTS */}
                  <div className="p-4 bg-white border border-slate-200/90 rounded-2xl space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-100">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Cover Media Adjustments</h4>
                          <p className="text-[11px] text-slate-500">Header height, vertical focal alignment, scaling, and contrast overlay.</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          updateMediaConfig({
                            coverHeight: "standard",
                            coverCustomHeight: 210,
                            coverPosition: "center",
                            coverFit: "cover",
                            coverOverlay: 0,
                            coverBlur: "none",
                          })
                          toast.success("Cover adjustments reset to defaults")
                        }}
                        className="h-7 text-[11px] text-slate-500 hover:text-slate-800"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" /> Reset Cover
                      </Button>
                    </div>

                    {/* Cover Height */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700">Cover Height</label>
                        <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                          {mediaConfig.coverHeight === "compact" ? "Compact (150px)" :
                           mediaConfig.coverHeight === "tall" ? "Tall (280px)" :
                           mediaConfig.coverHeight === "hero" ? "Hero (350px)" :
                           typeof mediaConfig.coverCustomHeight === "number" ? `${mediaConfig.coverCustomHeight}px` :
                           "Standard (210px)"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: "compact", label: "Compact", px: 150 },
                          { id: "standard", label: "Standard", px: 210 },
                          { id: "tall", label: "Tall", px: 280 },
                          { id: "hero", label: "Hero", px: 350 },
                        ].map((h) => {
                          const isSelected = (!mediaConfig.coverHeight && h.id === "standard") || mediaConfig.coverHeight === h.id || mediaConfig.coverCustomHeight === h.px
                          return (
                            <button
                              key={h.id}
                              type="button"
                              onClick={() => updateMediaConfig({ coverHeight: h.id, coverCustomHeight: h.px })}
                              className={`py-1.5 px-2 text-xs font-semibold rounded-xl border transition-all ${
                                isSelected
                                  ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {h.label}
                            </button>
                          )
                        })}
                      </div>
                      {/* Micro Slider */}
                      <div className="flex items-center gap-3 pt-1">
                        <span className="text-[10px] font-mono text-slate-400">120px</span>
                        <input
                          type="range"
                          min="120"
                          max="400"
                          step="10"
                          value={mediaConfig.coverCustomHeight || 210}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            updateMediaConfig({ coverHeight: "custom", coverCustomHeight: val })
                          }}
                          className="flex-1 accent-teal-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                        />
                        <span className="text-[10px] font-mono text-slate-400">400px</span>
                      </div>
                    </div>

                    {/* Cover Focal Position (Vertical Alignment) */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700">Vertical Focal Position (Reposition without cropping)</label>
                        <span className="text-[11px] font-bold text-slate-600 capitalize">
                          {mediaConfig.coverPosition || "center"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "top", label: "Top (0%)", desc: "Show upper area" },
                          { id: "center", label: "Center (50%)", desc: "Balanced center" },
                          { id: "bottom", label: "Bottom (100%)", desc: "Show lower area" },
                        ].map((pos) => {
                          const isSelected = (!mediaConfig.coverPosition && pos.id === "center") || mediaConfig.coverPosition === pos.id
                          return (
                            <button
                              key={pos.id}
                              type="button"
                              onClick={() => updateMediaConfig({ coverPosition: pos.id })}
                              className={`py-2 px-2 text-xs font-semibold rounded-xl border text-center transition-all ${
                                isSelected
                                  ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              <div>{pos.label}</div>
                              <div className={`text-[10px] mt-0.5 ${isSelected ? "text-teal-100" : "text-slate-500"}`}>{pos.desc}</div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Cover Fit & Darkness Overlay */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                      {/* Cover Fit */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700 block">Cover Fit Mode</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: "cover", label: "Cover (Fill)", desc: "Crop edges to fill header" },
                            { id: "contain", label: "Contain (Fit)", desc: "Show entire banner" },
                          ].map((fit) => {
                            const isSelected = (!mediaConfig.coverFit && fit.id === "cover") || mediaConfig.coverFit === fit.id
                            return (
                              <button
                                key={fit.id}
                                type="button"
                                onClick={() => updateMediaConfig({ coverFit: fit.id })}
                                className={`p-2 rounded-xl border text-left transition-all ${
                                  isSelected
                                    ? "bg-teal-50 border-teal-600 text-teal-900 font-bold"
                                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                <div className="text-xs">{fit.label}</div>
                                <div className="text-[10px] text-slate-500">{fit.desc}</div>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Darkness Overlay Slider */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-700">Contrast Overlay</label>
                          <span className="text-[11px] font-bold text-slate-600">{mediaConfig.coverOverlay || 0}%</span>
                        </div>
                        <div className="flex items-center gap-3 pt-1">
                          <span className="text-[10px] font-mono text-slate-400">0%</span>
                          <input
                            type="range"
                            min="0"
                            max="80"
                            step="10"
                            value={mediaConfig.coverOverlay || 0}
                            onChange={(e) => updateMediaConfig({ coverOverlay: Number(e.target.value) })}
                            className="flex-1 accent-teal-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-slate-400">80%</span>
                        </div>
                        <p className="text-[10px] text-slate-500 italic">Adds dark tint to boost contrast on bright photos.</p>
                      </div>
                    </div>
                  </div>

                  {/* 2. LOGO & AVATAR ADJUSTMENTS */}
                  <div className="p-4 bg-white border border-slate-200/90 rounded-2xl space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-100">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Company Logo & Avatar Adjustments</h4>
                          <p className="text-[11px] text-slate-500">Scale dimensions, shape contour, containment (prevent cutoff), and frame styling.</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          updateMediaConfig({
                            logoSize: "medium",
                            logoCustomSize: 112,
                            logoShape: "rounded",
                            logoFit: "cover",
                            logoBorder: "white",
                            logoPosition: "center",
                            logoOverlap: "overlap",
                          })
                          toast.success("Logo adjustments reset to defaults")
                        }}
                        className="h-7 text-[11px] text-slate-500 hover:text-slate-800"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" /> Reset Logo
                      </Button>
                    </div>

                    {/* Logo Dimensions / Size */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700">Logo Size</label>
                        <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                          {mediaConfig.logoSize === "small" ? "Small (80px)" :
                           mediaConfig.logoSize === "large" ? "Large (128px)" :
                           mediaConfig.logoSize === "xlarge" ? "Extra Large (144px)" :
                           typeof mediaConfig.logoCustomSize === "number" ? `${mediaConfig.logoCustomSize}px` :
                           "Medium (112px)"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: "small", label: "Small", px: 80 },
                          { id: "medium", label: "Medium", px: 112 },
                          { id: "large", label: "Large", px: 128 },
                          { id: "xlarge", label: "Extra Large", px: 144 },
                        ].map((s) => {
                          const isSelected = (!mediaConfig.logoSize && s.id === "medium") || mediaConfig.logoSize === s.id || mediaConfig.logoCustomSize === s.px
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => updateMediaConfig({ logoSize: s.id, logoCustomSize: s.px })}
                              className={`py-1.5 px-2 text-xs font-semibold rounded-xl border transition-all ${
                                isSelected
                                  ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {s.label}
                            </button>
                          )
                        })}
                      </div>
                      {/* Micro Slider */}
                      <div className="flex items-center gap-3 pt-1">
                        <span className="text-[10px] font-mono text-slate-400">64px</span>
                        <input
                          type="range"
                          min="64"
                          max="160"
                          step="8"
                          value={mediaConfig.logoCustomSize || 112}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            updateMediaConfig({ logoSize: "custom", logoCustomSize: val })
                          }}
                          className="flex-1 accent-teal-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                        />
                        <span className="text-[10px] font-mono text-slate-400">160px</span>
                      </div>
                    </div>

                    {/* Shape & Fit Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                      {/* Shape */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700 block">Logo Frame Shape</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: "rounded", label: "Squircle", class: "rounded-xl" },
                            { id: "circle", label: "Circle", class: "rounded-full" },
                            { id: "square", label: "Square", class: "rounded-md" },
                          ].map((shape) => {
                            const isSelected = (!mediaConfig.logoShape && shape.id === "rounded") || mediaConfig.logoShape === shape.id
                            return (
                              <button
                                key={shape.id}
                                type="button"
                                onClick={() => updateMediaConfig({ logoShape: shape.id })}
                                className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                                  isSelected
                                    ? "bg-teal-50 border-teal-600 text-teal-900 font-bold shadow-xs"
                                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                <div className={`w-5 h-5 bg-slate-300 border border-slate-400 ${shape.class}`} />
                                <span className="text-[11px]">{shape.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Object Fit (Contain vs Cover) */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700 block">Image Scale & Containment</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: "contain", label: "Contain (Padded)", desc: "Best for business logos; never cuts text" },
                            { id: "cover", label: "Cover (Full Bleed)", desc: "Fills entire frame; best for portraits" },
                          ].map((fit) => {
                            const isSelected = (!mediaConfig.logoFit && fit.id === "cover") || mediaConfig.logoFit === fit.id
                            return (
                              <button
                                key={fit.id}
                                type="button"
                                onClick={() => updateMediaConfig({ logoFit: fit.id })}
                                className={`p-2 rounded-xl border text-left transition-all ${
                                  isSelected
                                    ? "bg-teal-50 border-teal-600 text-teal-900 font-bold shadow-xs"
                                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                <div className="text-xs">{fit.label}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">{fit.desc}</div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Border & Alignment */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                      {/* Frame Border */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700 block">Frame Bezel & Border</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: "white", label: "Clean White Bezel" },
                            { id: "accent", label: "Brand Accent Ring" },
                            { id: "dark", label: "Obsidian Bezel" },
                            { id: "none", label: "Minimal (No Border)" },
                          ].map((b) => {
                            const isSelected = (!mediaConfig.logoBorder && b.id === "white") || mediaConfig.logoBorder === b.id
                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => updateMediaConfig({ logoBorder: b.id })}
                                className={`py-1.5 px-2 text-xs font-semibold rounded-xl border text-center transition-all ${
                                  isSelected
                                    ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                {b.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Horizontal Alignment */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700 block">Logo Alignment</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: "left", label: "Left" },
                            { id: "center", label: "Center" },
                            { id: "right", label: "Right" },
                          ].map((align) => {
                            const isSelected = (!mediaConfig.logoPosition && align.id === "center") || mediaConfig.logoPosition === align.id
                            return (
                              <button
                                key={align.id}
                                type="button"
                                onClick={() => updateMediaConfig({ logoPosition: align.id })}
                                className={`py-2 px-1 text-xs font-semibold rounded-xl border text-center transition-all ${
                                  isSelected
                                    ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                {align.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Creative Button Styles & Elevation */}
              <Card className="shadow-2xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Creative Action Button Styles
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Customize the physical appearance, border radius, and elevation of primary action buttons ([WhatsApp], [Call], [Save Contact]).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {BUTTON_STYLE_OPTIONS.map((style) => {
                      const isSelected = (card.buttonStyle || "rounded") === style.id
                      return (
                        <div
                          key={style.id}
                          onClick={() => {
                            setCard({ ...card, buttonStyle: style.id })
                            toast.success(`Button style set to "${style.label}"`)
                          }}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected
                              ? "border-teal-600 bg-teal-50/40 shadow-sm"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-900">{style.label}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />}
                          </div>
                          <p className="text-[11px] text-slate-500">{style.desc}</p>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Colors & Visibility */}
              <Card className="shadow-2xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">Accent Colors & Theme</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Primary Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={card.primaryColor || "#0f766e"}
                          onChange={(e) => setCard({ ...card, primaryColor: e.target.value })}
                          className="w-9 h-9 rounded-lg border p-0.5 cursor-pointer shrink-0"
                        />
                        <Input
                          value={card.primaryColor || "#0f766e"}
                          onChange={(e) => setCard({ ...card, primaryColor: e.target.value })}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Secondary Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={card.secondaryColor || "#0284c7"}
                          onChange={(e) => setCard({ ...card, secondaryColor: e.target.value })}
                          className="w-9 h-9 rounded-lg border p-0.5 cursor-pointer shrink-0"
                        />
                        <Input
                          value={card.secondaryColor || "#0284c7"}
                          onChange={(e) => setCard({ ...card, secondaryColor: e.target.value })}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Accent Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={card.accentColor || "#10b981"}
                          onChange={(e) => setCard({ ...card, accentColor: e.target.value })}
                          className="w-9 h-9 rounded-lg border p-0.5 cursor-pointer shrink-0"
                        />
                        <Input
                          value={card.accentColor || "#10b981"}
                          onChange={(e) => setCard({ ...card, accentColor: e.target.value })}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Display Sections Controls */}
              <Card className="shadow-2xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-slate-500" />
                    Display Sections
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-0">
                  {[
                    { key: "showWhatsapp", label: "WhatsApp Button" },
                    { key: "showPhone", label: "Phone Call" },
                    { key: "showEmail", label: "Email Address" },
                    { key: "showAddress", label: "Physical Address" },
                    { key: "showServices", label: "Services Section" },
                    { key: "showGallery", label: "Photo Gallery" },
                    { key: "showHours", label: "Business Hours" },
                    { key: "showLeadForm", label: "Enquiry Form" },
                  ].map((toggle) => (
                    <label
                      key={toggle.key}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 text-xs font-semibold"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(card[toggle.key])}
                        onChange={(e) => setCard({ ...card, [toggle.key]: e.target.checked })}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                      />
                      <span>{toggle.label}</span>
                    </label>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 5: SERVICES & PRODUCTS (SQUARE GRID VS SLIDER) */}
            <TabsContent value="services" className="space-y-4 mt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Services & Offerings</h3>
                  <p className="text-xs text-slate-500">Showcase your tour packages, menu items, consultations, or merchandise.</p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Layout Switcher: Slider vs Square Grid */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setCard({ ...card, serviceLayout: "SLIDER" })
                        toast.success("Services view set to Horizontal Slider")
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        (card.serviceLayout || "SLIDER") === "SLIDER"
                          ? "bg-white text-teal-700 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Slider</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCard({ ...card, serviceLayout: "GRID" })
                        toast.success("Services view set to Square Grid")
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        card.serviceLayout === "GRID"
                          ? "bg-white text-teal-700 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Square Grid</span>
                    </button>
                  </div>

                  <Button
                    size="sm"
                    onClick={openNewServiceModal}
                    className="gap-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Service</span>
                  </Button>
                </div>
              </div>

              {services.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <p className="text-xs text-slate-500 mb-3">No services or packages added yet.</p>
                  <Button size="sm" variant="outline" onClick={openNewServiceModal} className="text-xs gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Add First Service
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services.map((svc) => (
                    <Card key={svc.id} className="shadow-2xs overflow-hidden">
                      <div className="flex items-start gap-3 p-3">
                        {svc.imageUrl ? (
                          <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                            <img src={svc.imageUrl} alt={svc.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{svc.name}</h4>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{svc.shortDesc || "No description"}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs font-black text-teal-700">
                              {svc.price ? `${svc.currency || "OMR"} ${svc.price}` : "Free / Contact"}
                            </span>
                            {svc.salePrice && (
                              <span className="text-[10px] text-slate-400 line-through">
                                {svc.currency} {svc.salePrice}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                            onClick={() => openEditServiceModal(svc)}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteService(svc.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB 6: SOCIAL PROFILES & CUSTOM URLS */}
            <TabsContent value="links" className="space-y-4 mt-4">
              {/* Custom URLs Section */}
              <Card className="shadow-2xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-teal-600" />
                        Custom URLs & Featured Resources
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Add direct links to your PDF brochures, TripAdvisor reviews, reservation platforms, menus, or branch portals.
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      onClick={openAddCustomLinkModal}
                      className="gap-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Custom Link</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {(!card.customLinks || !Array.isArray(card.customLinks) || card.customLinks.length === 0) ? (
                    <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl">
                      <p className="text-xs text-slate-500 mb-2">No custom links added yet.</p>
                      <Button size="sm" variant="outline" onClick={openAddCustomLinkModal} className="text-xs">
                        + Add First Link
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {card.customLinks.map((link: any, idx: number) => (
                        <div
                          key={link.id || idx}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 shadow-2xs gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200/60">
                              {renderCustomIcon(link.icon, "w-4 h-4")}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900 truncate">{link.label}</span>
                                {link.highlight && (
                                  <Badge className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-0">
                                    FEATURED
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 font-mono truncate">{link.url}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={idx === 0}
                              onClick={() => handleMoveCustomLink(idx, "up")}
                              className="h-7 w-7 text-slate-400 hover:text-slate-700"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={idx === card.customLinks.length - 1}
                              onClick={() => handleMoveCustomLink(idx, "down")}
                              className="h-7 w-7 text-slate-400 hover:text-slate-700"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditCustomLinkModal(idx)}
                              className="h-7 w-7 text-slate-500 hover:text-slate-900"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteCustomLink(idx)}
                              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Social Channels Section */}
              <Card className="shadow-2xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-teal-600" />
                    Social Media Channels
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Link your active profiles to display modern social badges on your card.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SOCIAL_PLATFORMS.map((platform) => {
                      const val = (card.socialLinks || {})[platform.id] || ""
                      return (
                        <div key={platform.id} className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: platform.color }} />
                            <span>{platform.name}</span>
                          </label>
                          <Input
                            value={val}
                            onChange={(e) => handleSocialChange(platform.id, e.target.value)}
                            placeholder={platform.placeholder}
                            className="text-xs"
                          />
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 7: CONTACT & LOCATION */}
            <TabsContent value="contact" className="space-y-4 mt-4">
              <Card className="shadow-2xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">Phone Numbers & Channels</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        WhatsApp Number * (with country code)
                      </label>
                      <Input
                        value={card.whatsappNumber || ""}
                        onChange={(e) => setCard({ ...card, whatsappNumber: e.target.value })}
                        placeholder="+96898821965"
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Mobile Phone Number
                      </label>
                      <Input
                        value={card.mobileNumber || ""}
                        onChange={(e) => setCard({ ...card, mobileNumber: e.target.value })}
                        placeholder="+96898821965"
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Primary Email</label>
                      <Input
                        type="email"
                        value={card.email || ""}
                        onChange={(e) => setCard({ ...card, email: e.target.value })}
                        placeholder="info@company.com"
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Website URL</label>
                      <Input
                        type="url"
                        value={card.websiteUrl || ""}
                        onChange={(e) => setCard({ ...card, websiteUrl: e.target.value })}
                        placeholder="https://company.com"
                        className="text-xs"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-2xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">Physical Address & Maps</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Address Line 1</label>
                    <Input
                      value={card.addressLine1 || ""}
                      onChange={(e) => setCard({ ...card, addressLine1: e.target.value })}
                      placeholder="e.g. Al-Khuwair South, Way 3521"
                      className="text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">City</label>
                      <Input
                        value={card.city || ""}
                        onChange={(e) => setCard({ ...card, city: e.target.value })}
                        placeholder="Muscat"
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">State / Province</label>
                      <Input
                        value={card.state || ""}
                        onChange={(e) => setCard({ ...card, state: e.target.value })}
                        placeholder="Muscat Governorate"
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Country</label>
                      <Input
                        value={card.country || "Oman"}
                        onChange={(e) => setCard({ ...card, country: e.target.value })}
                        placeholder="Oman"
                        className="text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Google Maps Link</label>
                    <Input
                      value={card.googleMapsUrl || ""}
                      onChange={(e) => setCard({ ...card, googleMapsUrl: e.target.value })}
                      placeholder="https://maps.google.com/?q=..."
                      className="text-xs"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 8: BUSINESS HOURS */}
            <TabsContent value="hours" className="space-y-4 mt-4">
              <Card className="shadow-2xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    Weekly Business Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 pt-0">
                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(
                    (dayName, dayIdx) => {
                      const currentSched = (card.businessHours || []).find((s: any) => s.day === dayIdx) || {
                        day: dayIdx,
                        isOpen: true,
                        open1: "08:00",
                        close1: "17:00",
                      }
                      return (
                        <div
                          key={dayIdx}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/70"
                        >
                          <div className="w-28 flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={Boolean(currentSched.isOpen)}
                              onChange={(e) => {
                                const newHours = (card.businessHours || []).map((h: any) =>
                                  h.day === dayIdx ? { ...h, isOpen: e.target.checked } : h
                                )
                                setCard({ ...card, businessHours: newHours })
                              }}
                              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                            />
                            <span className="text-xs font-bold text-slate-800">{dayName}</span>
                          </div>

                          {currentSched.isOpen ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={currentSched.open1 || "08:00"}
                                onChange={(e) => {
                                  const newHours = (card.businessHours || []).map((h: any) =>
                                    h.day === dayIdx ? { ...h, open1: e.target.value } : h
                                  )
                                  setCard({ ...card, businessHours: newHours })
                                }}
                                className="w-28 text-xs h-8"
                              />
                              <span className="text-xs text-slate-400">to</span>
                              <Input
                                type="time"
                                value={currentSched.close1 || "17:00"}
                                onChange={(e) => {
                                  const newHours = (card.businessHours || []).map((h: any) =>
                                    h.day === dayIdx ? { ...h, close1: e.target.value } : h
                                  )
                                  setCard({ ...card, businessHours: newHours })
                                }}
                                className="w-28 text-xs h-8"
                              />
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-xs text-slate-400 bg-slate-100">
                              Closed
                            </Badge>
                          )}
                        </div>
                      )
                    }
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 9: PAYMENTS & BANKING */}
            <TabsContent value="payments" className="space-y-4 mt-4">
              <Card className="shadow-2xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-slate-500" />
                    Payment Gateways & Direct Bank Transfer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Amwal Pay Checkout URL</label>
                      <Input
                        value={card.amwalPayUrl || ""}
                        onChange={(e) => setCard({ ...card, amwalPayUrl: e.target.value })}
                        placeholder="https://pay.amwalpay.com/..."
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Paymob Checkout URL</label>
                      <Input
                        value={card.paymobUrl || ""}
                        onChange={(e) => setCard({ ...card, paymobUrl: e.target.value })}
                        placeholder="https://accept.paymob.com/unifiedcheckout/..."
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Direct Payment Link</label>
                      <Input
                        value={card.paymentUrl || ""}
                        onChange={(e) => setCard({ ...card, paymentUrl: e.target.value })}
                        placeholder="https://checkout.stripe.com/..."
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border space-y-3">
                    <h4 className="text-xs font-bold text-slate-800">Bank Wire Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Bank Name</label>
                        <Input
                          value={card.bankName || ""}
                          onChange={(e) => setCard({ ...card, bankName: e.target.value })}
                          placeholder="e.g. Bank Muscat"
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Account Name</label>
                        <Input
                          value={card.accountName || ""}
                          onChange={(e) => setCard({ ...card, accountName: e.target.value })}
                          placeholder="e.g. Acme Tours LLC"
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">IBAN Number</label>
                        <Input
                          value={card.iban || ""}
                          onChange={(e) => setCard({ ...card, iban: e.target.value })}
                          placeholder="OM..."
                          className="text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">SWIFT / BIC Code</label>
                        <Input
                          value={card.swiftCode || ""}
                          onChange={(e) => setCard({ ...card, swiftCode: e.target.value })}
                          placeholder="BMUSOMRX..."
                          className="text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 10: ANALYTICS & EVENTS */}
            <TabsContent value="analytics" className="space-y-4 mt-4">
              <Card className="shadow-2xs">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      Interaction Analytics
                    </CardTitle>
                  </div>
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                    {["7d", "30d", "90d"].map((range) => (
                      <button
                        key={range}
                        onClick={() => setAnalyticsRange(range)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                          analyticsRange === range ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {analyticsLoading ? (
                    <div className="p-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-slate-50 rounded-xl border text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Total Views</span>
                        <p className="text-xl font-black text-slate-900 mt-1">{analytics?.metrics?.views ?? 0}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400">VCF Saves</span>
                        <p className="text-xl font-black text-indigo-600 mt-1">{analytics?.metrics?.saves ?? 0}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400">WhatsApp Leads</span>
                        <p className="text-xl font-black text-emerald-600 mt-1">{analytics?.metrics?.whatsappClicks ?? 0}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Live Phone Mockup Preview (4 cols on lg, 4 on xl) */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-6 self-start">
          <div className="p-3 bg-slate-900 rounded-3xl shadow-2xl border-4 border-slate-800">
            <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-bold text-slate-400 border-b border-slate-800 mb-2">
              <span className="flex items-center gap-1.5 text-teal-400">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Live Preview
              </span>
              <span>iPhone 15 Pro</span>
            </div>

            {/* Scrollable Phone Screen Container */}
            <div className="h-[640px] overflow-y-auto rounded-2xl bg-white shadow-inner scrollbar-thin">
              <PublicCardClient
                card={{
                  ...card,
                  isVerified: true,
                }}
                items={services}
                gallery={gallery}
                cardUrl={publicUrl}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Service Modal Dialog */}
      <Dialog open={serviceModalOpen} onOpenChange={setServiceModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingService ? "Edit Service" : "Add New Service"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveService} className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Service Name *</label>
              <Input
                required
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="e.g. Full Day Desert Safari"
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Short Description</label>
              <Textarea
                rows={2}
                value={serviceShortDesc}
                onChange={(e) => setServiceShortDesc(e.target.value)}
                placeholder="Brief summary of this package..."
                className="text-xs resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Price</label>
                <Input
                  type="number"
                  step="0.001"
                  value={servicePrice}
                  onChange={(e) => setServicePrice(e.target.value)}
                  placeholder="0.000"
                  className="text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Sale / Discount Price</label>
                <Input
                  type="number"
                  step="0.001"
                  value={serviceSalePrice}
                  onChange={(e) => setServiceSalePrice(e.target.value)}
                  placeholder="0.000"
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Image</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingServiceImg}
                  onClick={() => fileInputServiceRef.current?.click()}
                  className="h-7 text-[11px] gap-1 px-2"
                >
                  {uploadingServiceImg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  <span>{uploadingServiceImg ? "Uploading..." : "Upload Image"}</span>
                </Button>
              </div>
              <Input
                type="url"
                value={serviceImageUrl}
                onChange={(e) => setServiceImageUrl(e.target.value)}
                placeholder="https://.../photo.jpg"
                className="text-xs"
              />
              {serviceImageUrl && (
                <div className="mt-2 h-20 w-full rounded-lg border overflow-hidden bg-slate-50">
                  <img src={serviceImageUrl} alt="Service preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Pre-filled WhatsApp Message</label>
              <Input
                value={serviceWaMessage}
                onChange={(e) => setServiceWaMessage(e.target.value)}
                placeholder="e.g. Hello, I would like to book the Desert Safari..."
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setServiceModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={serviceSubmitting}
                className="text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white"
              >
                {serviceSubmitting ? "Saving..." : "Save Service"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Custom Link Modal Dialog with Icon Picker */}
      <Dialog open={customLinkModalOpen} onOpenChange={setCustomLinkModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingLinkIndex !== null ? "Edit Custom Link" : "Add Custom Link"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveCustomLink} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Link Title / Label *</label>
              <Input
                required
                value={linkFormLabel}
                onChange={(e) => setLinkFormLabel(e.target.value)}
                placeholder="e.g. Download PDF Brochure or TripAdvisor Reviews"
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Destination URL *</label>
              <Input
                required
                type="text"
                value={linkFormUrl}
                onChange={(e) => setLinkFormUrl(e.target.value)}
                placeholder="https://..."
                className="text-xs"
              />
            </div>

            {/* Icon Picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Choose Icon</label>
                <div className="flex gap-1">
                  {["all", "general", "commerce", "hospitality", "media"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setIconCategoryFilter(cat)}
                      className={`text-[10px] px-2 py-0.5 rounded capitalize font-medium ${
                        iconCategoryFilter === cat
                          ? "bg-teal-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                {filteredIcons.map((ico) => {
                  const isSelected = linkFormIcon === ico.id
                  return (
                    <button
                      key={ico.id}
                      type="button"
                      onClick={() => setLinkFormIcon(ico.id)}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-center ${
                        isSelected
                          ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                      title={ico.label}
                    >
                      <div className="mb-1">{renderCustomIcon(ico.id, "w-4 h-4")}</div>
                      <span className="text-[9px] truncate max-w-[55px]">{ico.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Highlight Toggle */}
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-amber-50/40 cursor-pointer">
              <input
                type="checkbox"
                checked={linkFormHighlight}
                onChange={(e) => setLinkFormHighlight(e.target.checked)}
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Feature / Highlight this link</span>
                <span className="text-[11px] text-slate-500">
                  Adds a glowing pulse border and FEATURED badge on your public vCard to draw attention.
                </span>
              </div>
            </label>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCustomLinkModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white"
              >
                {editingLinkIndex !== null ? "Update Link" : "Add Link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
