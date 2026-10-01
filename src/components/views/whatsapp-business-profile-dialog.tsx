"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Building2, Camera, RefreshCw, Globe, Mail, MapPin, AlignLeft,
  CheckCircle2, AlertCircle, Sparkles, ExternalLink, Loader2
} from "lucide-react"

export interface WhatsAppProfileData {
  about?: string
  address?: string
  description?: string
  email?: string
  profilePictureUrl?: string
  websites?: string[]
  vertical?: string
}

const VERTICAL_OPTIONS = [
  { value: "PROF_SERVICES", label: "Professional Services & Consulting" },
  { value: "EDU", label: "Education & Corporate Training" },
  { value: "RETAIL", label: "Retail & E-Commerce" },
  { value: "RESTAURANT", label: "Restaurant & Hospitality" },
  { value: "HOTEL", label: "Hotels & Travel Accommodations" },
  { value: "TRAVEL", label: "Travel & Tours Tourism" },
  { value: "FINANCE", label: "Banking & Financial Services" },
  { value: "HEALTH", label: "Healthcare & Medical Clinics" },
  { value: "BEAUTY", label: "Beauty, Salon & Spa" },
  { value: "AUTO", label: "Automotive & Rentals" },
  { value: "APPAREL", label: "Fashion & Apparel" },
  { value: "GROCERY", label: "Supermarket & Grocery" },
  { value: "EVENT_PLAN", label: "Event Planning & Entertainment" },
  { value: "NONPROFIT", label: "Non-Profit & Charitable" },
  { value: "GOVT", label: "Government & Public Services" },
  { value: "OTHER", label: "Other / Commercial Enterprise" },
]

interface Props {
  open: boolean
  onClose: () => void
  accountId?: string
  displayPhone?: string | null
  verifiedName?: string | null
  onSaved?: () => void
}

export function WhatsAppBusinessProfileDialog({
  open,
  onClose,
  accountId,
  displayPhone,
  verifiedName,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [about, setAbout] = useState("")
  const [description, setDescription] = useState("")
  const [address, setAddress] = useState("")
  const [email, setEmail] = useState("")
  const [vertical, setVertical] = useState("PROF_SERVICES")
  const [website1, setWebsite1] = useState("")
  const [website2, setWebsite2] = useState("")
  const [profilePictureUrl, setProfilePictureUrl] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const url = accountId ? `/api/whatsapp/profile?accountId=${encodeURIComponent(accountId)}` : "/api/whatsapp/profile"
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok && data.success && data.profile) {
        const p = data.profile
        setAbout(p.about || "")
        setDescription(p.description || "")
        setAddress(p.address || "")
        setEmail(p.email || "")
        setVertical(p.vertical || "PROF_SERVICES")
        setProfilePictureUrl(p.profilePictureUrl || "")
        const sites = Array.isArray(p.websites) ? p.websites : []
        setWebsite1(sites[0] || "")
        setWebsite2(sites[1] || "")
      } else if (!res.ok) {
        const msg = data.error || "Could not fetch WhatsApp profile"
        if (!msg.includes("#200") && !msg.toLowerCase().includes("permission")) {
          toast.error(msg)
        }
      }
    } catch {
      toast.error("Failed to connect to WhatsApp profile API")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchProfile()
    }
  }, [open, accountId])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a valid image file (JPG or PNG)")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5 MB")
      return
    }

    setUploadingPhoto(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      if (accountId) fd.append("accountId", accountId)

      const res = await fetch("/api/whatsapp/profile", {
        method: "POST",
        body: fd,
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success("Profile photo updated on WhatsApp!")
        // Refresh profile to pick up Meta's new photo URL
        await fetchProfile()
      } else {
        const msg = data.error || "Failed to update profile photo on Meta"
        const friendly = (msg.includes("#200") || msg.toLowerCase().includes("permission"))
          ? "Meta requires phone management permissions to change profile pictures via API. You can upload it directly in Meta WhatsApp Manager."
          : msg
        toast.error(friendly)
      }
    } catch {
      toast.error("Photo upload failed")
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const websites = [website1.trim(), website2.trim()].filter(Boolean)

      const res = await fetch("/api/whatsapp/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          about: about.trim(),
          description: description.trim(),
          address: address.trim(),
          email: email.trim(),
          vertical,
          websites,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        if (data.metaSynced === false) {
          toast.warning(
            data.warning || "Profile saved in Fizmoh! Direct Meta API sync requires Phone Management in Meta Business Suite.",
            { duration: 8000 },
          )
        } else {
          toast.success("WhatsApp Business profile synced successfully!")
        }
        onSaved?.()
        onClose()
      } else {
        const msg = data.error || "Failed to save profile changes"
        const friendly = (msg.includes("#200") || msg.toLowerCase().includes("permission"))
          ? "Meta permissions error: your Meta access token requires phone management permissions in Meta Business Suite, or you can update your profile directly in WhatsApp Manager."
          : msg
        toast.error(friendly)
      }
    } catch {
      toast.error("Network error while saving profile")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-7">
        <DialogHeader className="space-y-1.5 pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-stone-900">
                  WhatsApp Business Profile
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-500">
                  Update how your business appears to customers in WhatsApp
                </DialogDescription>
              </div>
            </div>
            {verifiedName && (
              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {verifiedName}
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between pt-1">
            {displayPhone ? (
              <p className="text-xs text-stone-500 font-mono">
                Active Line: {displayPhone}
              </p>
            ) : <div />}
            <a
              href="https://business.facebook.com/wa/manage/phone-numbers/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
              title="Manage in Meta WhatsApp Manager"
            >
              <span>Meta WhatsApp Manager</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
            <p className="text-xs text-stone-500">Loading current profile...</p>
          </div>
        ) : (
          <div className="space-y-5 pt-3">
            {/* 1. Profile Picture Section */}
            <div className="flex items-center gap-4 p-4 rounded-xl border bg-stone-50/60">
              <div className="relative group shrink-0">
                <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-emerald-500/30 bg-white flex items-center justify-center shadow-xs">
                  {profilePictureUrl ? (
                    <img
                      src={profilePictureUrl}
                      alt="WhatsApp Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-9 w-9 text-stone-300" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow hover:bg-emerald-700 transition"
                  title="Upload new profile photo"
                >
                  {uploadingPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>

              <div className="space-y-1">
                <div className="text-sm font-semibold text-stone-900">
                  Business Profile Photo
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Recommended: Square JPG or PNG, at least 640×640px. Uploaded directly to Meta Resumable API.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5 mt-1"
                  disabled={uploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-3.5 w-3.5 text-stone-500" />
                  {uploadingPhoto ? "Uploading to Meta..." : "Change Photo"}
                </Button>
              </div>
            </div>

            {/* 1.5. WhatsApp Display Name & Identity */}
            <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/70 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-stone-800">
                  WhatsApp Display Name (Chat Header Name)
                </Label>
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Active on WhatsApp
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={verifiedName || "Tanfidh"}
                  disabled
                  className="bg-white font-medium text-stone-900 cursor-not-allowed text-xs"
                />
                <a
                  href="https://business.facebook.com/wa/manage/phone-numbers/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 hover:border-stone-400 shrink-0 transition"
                  title="Submit name change request in Meta WhatsApp Manager"
                >
                  <span>Edit in Meta</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Display name appears at the top of customer chats. Under Meta policy, changes require trademark and business review in <strong>Meta WhatsApp Manager</strong> (approved within 1–2 business days).
              </p>
            </div>

            {/* 1.6. Official Business Account (Green Tick / OBA) Verification */}
            <div className="p-3.5 rounded-xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/70 to-teal-50/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs font-bold text-emerald-950">
                    Official Business Account (Green Tick Badge)
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] border-emerald-300 bg-emerald-100 text-emerald-800">
                  Standard Account
                </Badge>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                The official green tick badge is granted directly by Meta to verified brands. To qualify, your business must have:
              </p>
              <ul className="text-[11px] text-stone-600 space-y-1 list-disc list-inside pl-1">
                <li>Legal entity documents verified in Meta Business Suite</li>
                <li>Two-step verification PIN active on your WhatsApp line</li>
                <li>Verifiable brand notability (e.g. news coverage, Wikipedia, or press mentions)</li>
              </ul>
              <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-emerald-200/60">
                <span className="text-[10.5px] text-stone-500">
                  Submit verification request in WhatsApp Manager:
                </span>
                <a
                  href="https://business.facebook.com/wa/manage/phone-numbers/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-2xs transition shrink-0"
                >
                  <span>Apply for Green Tick</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* 2. Status / About Line */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold text-stone-800">
                  About Status Text
                </Label>
                <span className={`text-[11px] font-mono ${about.length > 139 ? "text-rose-600 font-bold" : "text-stone-400"}`}>
                  {about.length} / 139
                </span>
              </div>
              <Input
                placeholder="e.g. AI-Powered Strategy Advisory & Executive Masterclasses"
                value={about}
                maxLength={139}
                onChange={e => setAbout(e.target.value)}
              />
              <p className="text-[11px] text-stone-500">
                Short status banner shown directly under your business name in WhatsApp chats.
              </p>
            </div>

            {/* 3. Description */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold text-stone-800">
                  Business Description / Bio
                </Label>
                <span className={`text-[11px] font-mono ${description.length > 512 ? "text-rose-600 font-bold" : "text-stone-400"}`}>
                  {description.length} / 512
                </span>
              </div>
              <Textarea
                rows={3}
                placeholder="Provide a detailed overview of your enterprise services, consulting programs, and operating hours."
                value={description}
                maxLength={512}
                onChange={e => setDescription(e.target.value)}
              />
              <p className="text-[11px] text-stone-500">
                Full business description displayed when customers view your WhatsApp business contact card.
              </p>
            </div>

            {/* 4. Industry Vertical & Public Email */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-800">
                  Industry Category (Vertical)
                </Label>
                <select
                  value={vertical}
                  onChange={e => setVertical(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {VERTICAL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-800">
                  Public Contact Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
                  <Input
                    className="pl-9 text-xs"
                    type="email"
                    placeholder="admissions@tanfidh.com"
                    value={email}
                    maxLength={128}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 5. Physical Address */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-800">
                Business Address / Headquarters
              </Label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
                <Input
                  className="pl-9 text-xs"
                  placeholder="e.g. Ruwi Financial District, Muscat, Sultanate of Oman"
                  value={address}
                  maxLength={256}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>
            </div>

            {/* 6. Websites */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-stone-800">
                Official Websites (Up to 2 URLs)
              </Label>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="relative">
                  <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
                  <Input
                    className="pl-9 text-xs"
                    placeholder="https://www.tanfidh.com"
                    value={website1}
                    maxLength={256}
                    onChange={e => setWebsite1(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
                  <Input
                    className="pl-9 text-xs"
                    placeholder="https://app.fizmoh.cloud"
                    value={website2}
                    maxLength={256}
                    onChange={e => setWebsite2(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchProfile}
            disabled={loading || saving}
            className="gap-1.5 mr-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Sync from Meta
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving to Meta...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Save Profile to WhatsApp
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
