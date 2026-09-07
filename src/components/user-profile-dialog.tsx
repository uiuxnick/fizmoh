"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { User, Mail, Phone, MapPin, Lock, Camera, Loader2, Shield, Check } from "lucide-react"

interface UserProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
}

interface StaffProfile {
  id: string
  name: string
  email: string
  phone: string | null
  avatar: string | null
  address: string | null
  role: string
  isActive: boolean
}

export function UserProfileDialog({ open, onOpenChange, onUpdated }: UserProfileDialogProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<StaffProfile | null>(null)

  // Form states
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [avatar, setAvatar] = useState("")
  const [address, setAddress] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch("/api/staff/me")
      .then(r => r.json())
      .then(data => {
        if (data.staff) {
          setProfile(data.staff)
          setName(data.staff.name || "")
          setEmail(data.staff.email || "")
          setPhone(data.staff.phone || "")
          setAvatar(data.staff.avatar || "")
          setAddress(data.staff.address || "")
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [open])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    if (newPassword && !currentPassword) {
      toast.error("Please enter your current password to set a new password")
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, any> = {
        name,
        email,
        phone,
        avatar,
        address,
      }
      if (newPassword) {
        payload.currentPassword = currentPassword
        payload.newPassword = newPassword
      }

      const res = await fetch("/api/staff/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const d = await res.json()
      if (!res.ok) {
        toast.error(d.error || "Failed to update profile")
        setSaving(false)
        return
      }

      toast.success("Profile updated successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      if (onUpdated) onUpdated()
      onOpenChange(false)
    } catch {
      toast.error("Network error while updating profile")
    } finally {
      setSaving(false)
    }
  }

  const initials = name ? name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "U"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                <User className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-stone-900">User Profile & Account</DialogTitle>
                <DialogDescription className="text-xs text-stone-500">
                  Manage your personal details, profile picture, contact info, and password.
                </DialogDescription>
              </div>
            </div>
            {profile?.role && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                <Shield className="h-3 w-3 mr-1" />
                {profile.role}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="space-y-6 pt-2">
            {/* Avatar & Picture URL */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-stone-50 border border-stone-200">
              <Avatar className="h-20 w-20 border-2 border-white shadow-sm">
                {avatar ? <AvatarImage src={avatar} alt={name} /> : null}
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 w-full space-y-2">
                <Label className="text-xs font-semibold text-stone-700">Profile Picture URL</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Camera className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                    <Input
                      value={avatar}
                      onChange={e => setAvatar(e.target.value)}
                      placeholder="https://example.com/photo.jpg"
                      className="pl-9 text-xs bg-white"
                    />
                  </div>
                  {avatar && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setAvatar("")}>
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-stone-500">Provide an image URL or avatar link for your profile picture.</p>
              </div>
            </div>

            {/* Profile Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-emerald-600" /> Full Name
                </Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Ahmed Al-Balushi"
                  required
                  className="text-sm bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-teal-600" /> Email Address
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ahmed@example.om"
                  required
                  className="text-sm bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-amber-600" /> Phone Number (WhatsApp)
                </Label>
                <Input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+96891234567"
                  className="text-sm bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-rose-600" /> Office / Personal Address
                </Label>
                <Input
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="e.g. Way 2830, Building 45, Muscat, Oman"
                  className="text-sm bg-white"
                />
              </div>
            </div>

            {/* Security / Password Section */}
            <div className="border-t border-stone-200 pt-4 space-y-3">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-purple-600" /> Password Security
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-stone-700">Current Password</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="text-xs bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-stone-700">New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="text-xs bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-stone-700">Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="text-xs bg-white"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
