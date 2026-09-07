"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  Loader2, Megaphone, Plus, Edit2, Trash2, Globe, Send,
  AlertTriangle, CheckCircle2, Clock, Sparkles, Wrench, Info,
  RefreshCw, X, Calendar, Users,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"

interface Announcement {
  id: string
  title: string
  body: string
  type: string
  targetAudience: string
  publishedAt: string | null
  expiresAt: string | null
  createdAt?: string
}

export function AnnouncementsPanel() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  // Create / Edit modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [type, setType] = useState("INFO")
  const [targetAudience, setTargetAudience] = useState("ALL")
  const [publishImmediately, setPublishImmediately] = useState(true)
  const [expiresAt, setExpiresAt] = useState("")
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadAnnouncements = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/platform/announcements?page=1&limit=50`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      const list = Array.isArray(data.announcements) ? data.announcements : Array.isArray(data) ? data : []
      setAnnouncements(list)
    } catch {
      setAnnouncements([])
      toast.error("Failed to load announcements")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setTitle("")
    setBody("")
    setType("INFO")
    setTargetAudience("ALL")
    setPublishImmediately(true)
    setExpiresAt("")
    setModalOpen(true)
  }

  const openEdit = (a: Announcement) => {
    setEditingId(a.id)
    setTitle(a.title)
    setBody(a.body)
    setType(a.type)
    setTargetAudience(a.targetAudience)
    setPublishImmediately(!!a.publishedAt)
    setExpiresAt(a.expiresAt ? a.expiresAt.slice(0, 10) : "")
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) {
      toast.error("Title and message body are required")
      return
    }

    setSaving(true)
    try {
      const publishedAtValue = publishImmediately ? new Date().toISOString() : null
      const expiresAtValue = expiresAt ? new Date(expiresAt).toISOString() : null

      if (editingId) {
        // Edit
        const res = await fetch(`/api/platform/announcements/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            body,
            type,
            targetAudience,
            publishedAt: publishedAtValue,
            expiresAt: expiresAtValue,
          }),
        })
        if (!res.ok) throw new Error()
        toast.success("Announcement updated successfully")
      } else {
        // Create
        const res = await fetch("/api/platform/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            body,
            type,
            targetAudience,
            publishedAt: publishedAtValue,
            expiresAt: expiresAtValue,
          }),
        })
        if (!res.ok) throw new Error()
        toast.success("Announcement published successfully")
      }
      setModalOpen(false)
      await loadAnnouncements()
    } catch {
      toast.error("Failed to save announcement")
    } finally {
      setSaving(false)
    }
  }

  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    try {
      const res = await fetch(`/api/platform/announcements/${deleteTarget.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Announcement deleted")
      setAnnouncements(prev => prev.filter(a => a.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      toast.error("Failed to delete announcement")
    } finally {
      setDeletingId(null)
    }
  }

  const handleTogglePublish = async (a: Announcement) => {
    const isPublished = a.publishedAt && new Date(a.publishedAt) <= new Date()
    try {
      const res = await fetch(`/api/platform/announcements/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publishedAt: isPublished ? null : new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(isPublished ? "Announcement reverted to draft" : "Announcement published live!")
      await loadAnnouncements()
    } catch {
      toast.error("Failed to change status")
    }
  }

  const getTypeStyle = (t: string) => {
    if (t === "INFO") return { bg: "bg-blue-50 text-blue-700 border-blue-200", icon: <Info className="h-3.5 w-3.5" /> }
    if (t === "WARNING") return { bg: "bg-amber-50 text-amber-700 border-amber-200", icon: <AlertTriangle className="h-3.5 w-3.5" /> }
    if (t === "MAINTENANCE") return { bg: "bg-stone-100 text-stone-700 border-stone-300", icon: <Wrench className="h-3.5 w-3.5" /> }
    if (t === "FEATURE") return { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <Sparkles className="h-3.5 w-3.5" /> }
    return { bg: "bg-stone-50 text-stone-700 border-stone-200", icon: <Info className="h-3.5 w-3.5" /> }
  }

  const getStatus = (pub: string | null, exp: string | null) => {
    const now = new Date()
    if (!pub || new Date(pub) > now) return { label: "Draft", color: "bg-stone-100 text-stone-600 border-stone-200" }
    if (exp && new Date(exp) < now) return { label: "Expired", color: "bg-rose-100 text-rose-700 border-rose-200" }
    return { label: "Active Live", color: "bg-emerald-100 text-emerald-800 border-emerald-300" }
  }

  const safeAnnouncements = Array.isArray(announcements) ? announcements : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-900">Platform Announcements</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Broadcast in-app notices, maintenance banners, and product updates to tenant workspaces.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadAnnouncements}
            disabled={loading}
            className="text-xs rounded-xl h-9 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={openCreate}
            className="text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 gap-1.5"
          >
            <Plus className="h-4 w-4" /> New Announcement
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading && safeAnnouncements.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-stone-200">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mx-auto" />
          <p className="text-xs text-stone-500 mt-2 font-medium">Loading broadcasts...</p>
        </div>
      ) : safeAnnouncements.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-stone-200">
          <div className="h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
            <Megaphone className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-stone-800">No announcements published</p>
            <p className="text-xs text-stone-500 mt-0.5">Create your first announcement to broadcast to all tenant workspaces.</p>
          </div>
          <Button size="sm" onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl gap-1.5 mt-2">
            <Plus className="h-3.5 w-3.5" /> Create Announcement
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {safeAnnouncements.map(a => {
            const typeStyle = getTypeStyle(a.type)
            const status = getStatus(a.publishedAt, a.expiresAt)
            return (
              <div
                key={a.id}
                className="p-5 rounded-2xl border border-stone-200 bg-white shadow-2xs space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeStyle.bg}`}>
                          {typeStyle.icon} {a.type}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.color}`}>
                          {status.label}
                        </span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          Audience: {a.targetAudience}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-stone-900 leading-snug">{a.title}</h3>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(a)}
                        className="h-7 w-7 p-0 rounded-lg text-stone-600 hover:text-stone-900"
                        title="Edit announcement"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteTarget(a)}
                        disabled={deletingId === a.id}
                        className="h-7 w-7 p-0 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                        title="Delete announcement"
                      >
                        {deletingId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-stone-700 mt-2.5 whitespace-pre-wrap leading-relaxed">
                    {a.body}
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                  <div>
                    {a.publishedAt ? (
                      <span>Published {new Date(a.publishedAt).toLocaleDateString()}</span>
                    ) : (
                      <span className="text-amber-700 font-semibold">Draft (Not visible)</span>
                    )}
                    {a.expiresAt && <span className="ml-2">· Expires {new Date(a.expiresAt).toLocaleDateString()}</span>}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTogglePublish(a)}
                    className="h-6 text-[10px] font-bold rounded-lg px-2"
                  >
                    {a.publishedAt ? "Unpublish (Draft)" : "Publish Now"}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create / Edit Modal Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg p-6 bg-white rounded-3xl border-stone-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-stone-900">
              {editingId ? "Edit Announcement" : "Create Platform Announcement"}
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Broadcast an alert banner across tenant dashboards.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Title</label>
              <Input
                placeholder="e.g. Scheduled System Maintenance Notice"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                className="text-xs rounded-xl h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Banner Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-semibold rounded-xl border border-stone-200 bg-white text-stone-800"
                >
                  <option value="INFO">Information (Blue)</option>
                  <option value="FEATURE">New Feature (Green)</option>
                  <option value="WARNING">Important Alert (Amber)</option>
                  <option value="MAINTENANCE">Maintenance (Dark)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Target Audience</label>
                <select
                  value={targetAudience}
                  onChange={e => setTargetAudience(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-semibold rounded-xl border border-stone-200 bg-white text-stone-800"
                >
                  <option value="ALL">All Workspaces (Global)</option>
                  <option value="ENTERPRISE">Enterprise Plan Only</option>
                  <option value="GROWTH">Growth Plan Only</option>
                  <option value="STARTER">Starter Plan Only</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Message Body</label>
              <textarea
                placeholder="Write the broadcast message that will appear on tenant screens..."
                rows={4}
                value={body}
                onChange={e => setBody(e.target.value)}
                required
                className="w-full p-3 text-xs rounded-xl border border-stone-200 bg-white text-stone-800 focus:outline-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Expires On (Optional)</label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                  className="text-xs rounded-xl h-9"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishImmediately}
                    onChange={e => setPublishImmediately(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>Publish immediately</span>
                </label>
              </div>
            </div>

            <DialogFooter className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {editingId ? "Save Changes" : "Publish Announcement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-700">Delete Announcement?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? It will immediately stop displaying across all tenant dashboards.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              onClick={handleDelete}
              disabled={!!deletingId}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deletingId ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Delete Permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
